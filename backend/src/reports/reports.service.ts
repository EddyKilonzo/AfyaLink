import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository, type SelectQueryBuilder } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthReport, ReportStatus } from '../database/entities/health-report.entity.js';
import { Location } from '../database/entities/location.entity.js';
import { User, UserRole } from '../database/entities/user.entity.js';
import { toCsv, type CsvCell } from './csv.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsQueryDto } from './dto/list-reports.dto.js';
import type { UpdateReportDto } from './dto/update-report.dto.js';
import type { UpdateReportStatusDto } from './dto/update-report-status.dto.js';

/** A CHV can correct their own report while it is SUBMITTED and younger than this. */
export const REPORT_EDIT_WINDOW_HOURS = 72;
export const MAX_EXPORT_ROWS = 10_000;

const EXPORT_COLUMNS = [
  'id', 'observedAt', 'receivedAt', 'category', 'conditionName', 'severity', 'casesCount', 'ageGroup',
  'symptoms', 'notes', 'status', 'chvId', 'locationId', 'county', 'subCounty', 'ward', 'latitude',
  'longitude', 'reviewedById', 'reviewedAt', 'reviewNote',
];

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
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  async list(user: SessionUser, query: ListReportsQueryDto): Promise<Paginated<HealthReport>> {
    try {
      const qb = this.filtered(user, query);
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

      // A retry is answered before the location policy, so a report saved
      // earlier still syncs as "duplicate" even if the CHV has since moved.
      const existing = await this.reports.findOne({ where: { id: dto.id } });
      if (existing) return this.resolveExisting(user, existing);
      if (dto.locationId) await this.assertLocationAllowed(user, dto.locationId);

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

  /**
   * CHV correction of their own report, allowed while it is still SUBMITTED
   * and within REPORT_EDIT_WINDOW_HOURS of receipt. The conditional UPDATE
   * closes the race with an admin reviewing it at the same moment.
   * Returns the changed field names (for the audit log).
   */
  async updateOwn(
    user: SessionUser,
    id: string,
    dto: UpdateReportDto,
  ): Promise<{ report: HealthReport; fields: string[] }> {
    try {
      this.db.assertReady();
      const changes: Partial<HealthReport> = {};
      if (dto.category != null) changes.category = dto.category;
      if (dto.conditionName != null) changes.conditionName = dto.conditionName;
      if (dto.severity != null) changes.severity = dto.severity;
      if (dto.casesCount != null) changes.casesCount = dto.casesCount;
      if (dto.ageGroup != null) changes.ageGroup = dto.ageGroup;
      if (dto.observedAt != null) changes.observedAt = new Date(dto.observedAt);
      if (dto.symptoms !== undefined) changes.symptoms = dto.symptoms?.map((s) => s.trim()).filter(Boolean) ?? null;
      if (dto.notes !== undefined) changes.notes = dto.notes?.trim() || null;
      if (dto.locationId !== undefined) changes.locationId = dto.locationId;
      if (dto.latitude !== undefined) changes.latitude = dto.latitude === null ? null : dto.latitude.toFixed(6);
      if (dto.longitude !== undefined) changes.longitude = dto.longitude === null ? null : dto.longitude.toFixed(6);
      const fields = Object.keys(changes);
      if (fields.length === 0) throw new BadRequestException('No changes supplied.');
      if (dto.locationId) await this.assertLocationAllowed(user, dto.locationId);

      const cutoff = new Date(Date.now() - REPORT_EDIT_WINDOW_HOURS * 60 * 60 * 1000);
      const result = await this.reports.update(
        { id, chvId: user.id, status: ReportStatus.SUBMITTED, receivedAt: MoreThanOrEqual(cutoff) },
        changes,
      );
      if (!result.affected) {
        const current = await this.reports.findOne({ where: { id } });
        if (!current || current.chvId !== user.id) throw new NotFoundException('Report not found.');
        if (current.status !== ReportStatus.SUBMITTED) {
          throw new ConflictException(`Report is already ${current.status} and can no longer be edited.`);
        }
        throw new ConflictException(`Reports can only be edited within ${REPORT_EDIT_WINDOW_HOURS} hours of submission.`);
      }
      return { report: await this.reports.findOneOrFail({ where: { id } }), fields };
    } catch (error) {
      throw toHttpException(error, this.logger, 'Update report');
    }
  }

  /**
   * ADMIN CSV export with the same filters as the list. Free-text cells are
   * neutralised against spreadsheet formula injection (see csv.ts).
   */
  async exportCsv(admin: SessionUser, query: ListReportsQueryDto): Promise<{ csv: string; rows: number }> {
    try {
      const reports = await this.filtered(admin, query)
        .leftJoinAndSelect('r.location', 'l')
        .limit(MAX_EXPORT_ROWS + 1)
        .getMany();
      if (reports.length > MAX_EXPORT_ROWS) {
        throw new BadRequestException(`Export is limited to ${MAX_EXPORT_ROWS} rows; narrow the filters.`);
      }
      const rows: CsvCell[][] = reports.map((r) => [
        r.id,
        r.observedAt.toISOString(),
        r.receivedAt.toISOString(),
        r.category,
        r.conditionName,
        r.severity,
        r.casesCount,
        r.ageGroup,
        r.symptoms?.join('; ') ?? null,
        r.notes,
        r.status,
        r.chvId,
        r.locationId,
        r.location?.county ?? null,
        r.location?.subCounty ?? null,
        r.location?.ward ?? null,
        r.latitude === null ? null : Number(r.latitude),
        r.longitude === null ? null : Number(r.longitude),
        r.reviewedById,
        r.reviewedAt?.toISOString() ?? null,
        r.reviewNote,
      ]);
      return { csv: toCsv(EXPORT_COLUMNS, rows), rows: rows.length };
    } catch (error) {
      throw toHttpException(error, this.logger, 'Export reports');
    }
  }

  /** Shared list/export filtering. CHVs are always limited to their own reports. */
  private filtered(user: SessionUser, query: ListReportsQueryDto): SelectQueryBuilder<HealthReport> {
    if (query.from && query.to && Date.parse(query.from) > Date.parse(query.to)) {
      throw new BadRequestException('"from" must not be later than "to".');
    }
    this.db.assertReady();
    const qb = this.reports.createQueryBuilder('r').orderBy('r.observedAt', 'DESC');
    if (user.role !== UserRole.ADMIN) qb.andWhere('r.chvId = :chvId', { chvId: user.id });
    else if (query.chvId) qb.andWhere('r.chvId = :chvId', { chvId: query.chvId });
    if (query.category) qb.andWhere('r.category = :category', { category: query.category });
    if (query.severity) qb.andWhere('r.severity = :severity', { severity: query.severity });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.locationId) qb.andWhere('r.locationId = :locationId', { locationId: query.locationId });
    if (query.from) qb.andWhere('r.observedAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('r.observedAt <= :to', { to: new Date(query.to) });
    return qb;
  }

  /**
   * Location policy: a CHV with an assigned location may only report for
   * locations in the same county. Admins and CHVs without an assignment are
   * not restricted.
   */
  private async assertLocationAllowed(user: SessionUser, locationId: number): Promise<void> {
    const target = await this.locations.findOne({ where: { id: locationId } });
    if (!target) throw new BadRequestException('Unknown location.');
    if (user.role !== UserRole.CHV) return;
    const assigned = await this.users.findOne({ where: { id: user.id }, relations: { location: true } });
    const county = assigned?.location?.county;
    if (county && county !== target.county) {
      throw new BadRequestException('Location is outside your assigned county.');
    }
  }

  private resolveExisting(user: SessionUser, existing: HealthReport) {
    if (existing.chvId !== user.id) {
      throw new ConflictException('A report with this ID already exists.');
    }
    return { outcome: 'duplicate' as const, report: existing };
  }
}
