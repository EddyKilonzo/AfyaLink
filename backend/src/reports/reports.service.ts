import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthReport, ReportStatus } from '../database/entities/health-report.entity.js';
import { UserRole } from '../database/entities/user.entity.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsQueryDto } from './dto/list-reports.dto.js';
import type { UpdateReportStatusDto } from './dto/update-report-status.dto.js';

export type UpsertOutcome = 'created' | 'duplicate';

/** Statuses a report may be in for an ADMIN to move it to the key status. */
const ALLOWED_FROM: Record<ReportStatus.REVIEWED | ReportStatus.ACTIONED, ReportStatus[]> = {
  [ReportStatus.REVIEWED]: [ReportStatus.SUBMITTED],
  [ReportStatus.ACTIONED]: [ReportStatus.SUBMITTED, ReportStatus.REVIEWED],
};

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(HealthReport) private readonly reports: Repository<HealthReport>,
    private readonly db: DatabaseService,
  ) {}

  async list(user: SessionUser, query: ListReportsQueryDto): Promise<Paginated<HealthReport>> {
    try {
      if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to)) {
        throw new BadRequestException('"from" must not be later than "to".');
      }
      this.db.assertReady();
      const qb = this.reports.createQueryBuilder('r').orderBy('r.observedAt', 'DESC');

      // CHVs only ever see their own reports; admins see everything (optionally one CHV's).
      if (user.role !== UserRole.ADMIN) qb.andWhere('r.chvId = :chvId', { chvId: user.id });
      else if (query.chvId) qb.andWhere('r.chvId = :chvId', { chvId: query.chvId });
      if (query.category) qb.andWhere('r.category = :category', { category: query.category });
      if (query.severity) qb.andWhere('r.severity = :severity', { severity: query.severity });
      if (query.status) qb.andWhere('r.status = :status', { status: query.status });
      if (query.locationId) qb.andWhere('r.locationId = :locationId', { locationId: query.locationId });
      if (query.from) qb.andWhere('r.observedAt >= :from', { from: new Date(query.from) });
      if (query.to) qb.andWhere('r.observedAt <= :to', { to: new Date(query.to) });

      const [items, total] = await qb
        .skip((query.page - 1) * query.limit)
        .take(query.limit)
        .getManyAndCount();
      return paginate(items, total, query.page, query.limit);
    } catch (error) {
      throw toHttpException(error, this.logger, 'List reports');
    }
  }

  async findOne(user: SessionUser, id: string): Promise<HealthReport> {
    try {
      this.db.assertReady();
      const report = await this.reports.findOne({ where: { id } });
      // Respond 404 (not 403) for other CHVs' reports so IDs cannot be probed.
      if (!report || (user.role !== UserRole.ADMIN && report.chvId !== user.id)) {
        throw new NotFoundException('Report not found.');
      }
      return report;
    } catch (error) {
      throw toHttpException(error, this.logger, 'Find report');
    }
  }

  /**
   * Idempotent create keyed on the client-generated report ID.
   * - New ID: inserted, outcome `created`.
   * - ID already stored for the same CHV: treated as a retry, outcome `duplicate`.
   * - ID already stored for a different CHV: rejected with 409.
   */
  async createIdempotent(
    user: SessionUser,
    dto: CreateReportDto,
  ): Promise<{ outcome: UpsertOutcome; report: HealthReport }> {
    try {
      this.db.assertReady();

      const existing = await this.reports.findOne({ where: { id: dto.id } });
      if (existing) return this.resolveExisting(user, existing);

      const entity = this.reports.create({
        id: dto.id,
        chvId: user.id,
        locationId: dto.locationId ?? null,
        category: dto.category,
        conditionName: dto.conditionName.trim(),
        severity: dto.severity,
        casesCount: dto.casesCount,
        ageGroup: dto.ageGroup,
        symptoms: dto.symptoms?.map((s) => s.trim()).filter(Boolean) ?? null,
        notes: dto.notes?.trim() || null,
        latitude: dto.latitude !== undefined ? dto.latitude.toFixed(6) : null,
        longitude: dto.longitude !== undefined ? dto.longitude.toFixed(6) : null,
        observedAt: new Date(dto.observedAt),
        clientCreatedAt: new Date(dto.clientCreatedAt),
      });

      try {
        await this.reports.insert(entity);
      } catch (error) {
        // Two concurrent retries can both pass the lookup; the primary key decides.
        if (errorCode(error) !== 'ER_DUP_ENTRY') throw error;
        const winner = await this.reports.findOneOrFail({ where: { id: dto.id } });
        return this.resolveExisting(user, winner);
      }

      const saved = await this.reports.findOneOrFail({ where: { id: dto.id } });
      return { outcome: 'created', report: saved };
    } catch (error) {
      throw toHttpException(error, this.logger, 'Create report');
    }
  }

  /**
   * ADMIN review. The conditional UPDATE makes the transition atomic: two
   * admins acting at once cannot move a report backwards or overwrite each other.
   */
  async updateStatus(admin: SessionUser, id: string, dto: UpdateReportStatusDto): Promise<HealthReport> {
    try {
      this.db.assertReady();
      const result = await this.reports.update(
        { id, status: In(ALLOWED_FROM[dto.status]) },
        {
          status: dto.status,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          reviewNote: dto.reviewNote || null,
        },
      );
      if (!result.affected) {
        const current = await this.reports.findOne({ where: { id } });
        if (!current) throw new NotFoundException('Report not found.');
        throw new ConflictException(`Report is already ${current.status} and cannot move to ${dto.status}.`);
      }
      return await this.reports.findOneOrFail({ where: { id } });
    } catch (error) {
      throw toHttpException(error, this.logger, 'Update report status');
    }
  }

  private resolveExisting(user: SessionUser, existing: HealthReport) {
    if (existing.chvId !== user.id) {
      throw new ConflictException('A report with this ID already exists.');
    }
    return { outcome: 'duplicate' as const, report: existing };
  }
}
