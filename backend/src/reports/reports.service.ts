import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthReport } from '../database/entities/health-report.entity.js';
import { UserRole } from '../database/entities/user.entity.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsQueryDto } from './dto/list-reports.dto.js';

export type UpsertOutcome = 'created' | 'duplicate';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(HealthReport) private readonly reports: Repository<HealthReport>,
    private readonly db: DatabaseService,
  ) {}

  async list(user: SessionUser, query: ListReportsQueryDto): Promise<Paginated<HealthReport>> {
    try {
      this.db.assertReady();
      const qb = this.reports.createQueryBuilder('r').orderBy('r.observedAt', 'DESC');

      // CHVs only ever see their own reports; admins see everything.
      if (user.role !== UserRole.ADMIN) qb.andWhere('r.chvId = :chvId', { chvId: user.id });
      if (query.category) qb.andWhere('r.category = :category', { category: query.category });
      if (query.severity) qb.andWhere('r.severity = :severity', { severity: query.severity });
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

  private resolveExisting(user: SessionUser, existing: HealthReport) {
    if (existing.chvId !== user.id) {
      throw new ConflictException('A report with this ID already exists.');
    }
    return { outcome: 'duplicate' as const, report: existing };
  }
}
