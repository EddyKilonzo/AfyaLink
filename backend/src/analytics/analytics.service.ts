import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthReport, ReportStatus } from '../database/entities/health-report.entity.js';
import { UserRole } from '../database/entities/user.entity.js';
import type { MapQueryDto } from './dto/analytics-query.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MAP_POINTS = 2000;

interface RawMapPoint {
  id: string;
  category: string;
  conditionName: string;
  severity: string;
  casesCount: number | string;
  status: string;
  observedAt: Date | string;
  county: string | null;
  ward: string | null;
  latitude: number | string;
  longitude: number | string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(HealthReport) private readonly reports: Repository<HealthReport>,
    private readonly db: DatabaseService,
  ) {}

  /** Aggregated counts only; no individual report content leaves this endpoint. */
  async summary(user: SessionUser, days: number) {
    try {
      return await this.buildSummary(user, days);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Analytics summary');
    }
  }

  /**
   * Map points. Free-text notes, symptoms and the reporting CHV are left out:
   * the map only needs what, how severe, how many, where and when.
   */
  async map(user: SessionUser, query: MapQueryDto) {
    try {
      return await this.buildMap(user, query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Analytics map');
    }
  }

  private scoped(user: SessionUser, since: Date): SelectQueryBuilder<HealthReport> {
    const qb = this.reports.createQueryBuilder('r').where('r.observedAt >= :since', { since });
    if (user.role !== UserRole.ADMIN) qb.andWhere('r.chvId = :chvId', { chvId: user.id });
    return qb;
  }

  private async buildSummary(user: SessionUser, days: number) {
    this.db.assertReady();
    const since = new Date(Date.now() - days * DAY_MS);
    const scoped = () => this.scoped(user, since);

    const [totals, byCategory, bySeverity, byDay, topConditions, byStatus, byCounty] = await Promise.all([
      scoped()
        .select('COUNT(*)', 'reports')
        .addSelect('COALESCE(SUM(r.casesCount), 0)', 'cases')
        .getRawOne<{ reports: string; cases: string }>(),
      scoped()
        .select('r.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('r.category')
        .getRawMany<{ category: string; count: string }>(),
      scoped()
        .select('r.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .groupBy('r.severity')
        .getRawMany<{ severity: string; count: string }>(),
      scoped()
        .select('DATE(r.observedAt)', 'day')
        .addSelect('COUNT(*)', 'count')
        .groupBy('day')
        .orderBy('day', 'ASC')
        .getRawMany<{ day: string | Date; count: string }>(),
      scoped()
        .select('r.conditionName', 'condition')
        .addSelect('SUM(r.casesCount)', 'cases')
        .groupBy('r.conditionName')
        .orderBy('cases', 'DESC')
        .limit(5)
        .getRawMany<{ condition: string; cases: string }>(),
      scoped()
        .select('r.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('r.status')
        .getRawMany<{ status: string; count: string }>(),
      scoped()
        .leftJoin('r.location', 'l')
        .select('l.county', 'county')
        .addSelect('COUNT(*)', 'reports')
        .addSelect('COALESCE(SUM(r.casesCount), 0)', 'cases')
        .groupBy('l.county')
        .orderBy('cases', 'DESC')
        .getRawMany<{ county: string | null; reports: string; cases: string }>(),
    ]);
    const statusCounts = byStatus.map((r) => ({ status: r.status, count: Number(r.count) }));

    return {
      scope: user.role === UserRole.ADMIN ? 'all' : 'own',
      periodDays: days,
      since: since.toISOString(),
      totals: { reports: Number(totals?.reports ?? 0), cases: Number(totals?.cases ?? 0) },
      byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.count) })),
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: Number(r.count) })),
      byStatus: statusCounts,
      pendingReview: statusCounts.find((r) => r.status === ReportStatus.SUBMITTED)?.count ?? 0,
      byDay: byDay.map((r) => ({
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
        count: Number(r.count),
      })),
      topConditions: topConditions.map((r) => ({ condition: r.condition, cases: Number(r.cases) })),
      byCounty: byCounty.map((r) => ({
        county: r.county ?? 'Unassigned',
        reports: Number(r.reports),
        cases: Number(r.cases),
      })),
    };
  }

  private async buildMap(user: SessionUser, query: MapQueryDto) {
    this.db.assertReady();
    const since = new Date(Date.now() - query.days * DAY_MS);
    const qb = this.scoped(user, since)
      .leftJoin('r.location', 'l')
      .select('r.id', 'id')
      .addSelect('r.category', 'category')
      .addSelect('r.conditionName', 'conditionName')
      .addSelect('r.severity', 'severity')
      .addSelect('r.casesCount', 'casesCount')
      .addSelect('r.status', 'status')
      .addSelect('r.observedAt', 'observedAt')
      .addSelect('l.county', 'county')
      .addSelect('l.ward', 'ward')
      .addSelect('COALESCE(r.latitude, l.latitude)', 'latitude')
      .addSelect('COALESCE(r.longitude, l.longitude)', 'longitude')
      .andWhere('COALESCE(r.latitude, l.latitude) IS NOT NULL')
      .andWhere('COALESCE(r.longitude, l.longitude) IS NOT NULL')
      .orderBy('r.observedAt', 'DESC')
      .limit(MAX_MAP_POINTS + 1);
    if (query.category) qb.andWhere('r.category = :category', { category: query.category });
    if (query.severity) qb.andWhere('r.severity = :severity', { severity: query.severity });

    const rows = await qb.getRawMany<RawMapPoint>();
    return {
      scope: user.role === UserRole.ADMIN ? 'all' : 'own',
      periodDays: query.days,
      since: since.toISOString(),
      truncated: rows.length > MAX_MAP_POINTS,
      points: rows.slice(0, MAX_MAP_POINTS).map((r) => ({
        id: r.id,
        category: r.category,
        conditionName: r.conditionName,
        severity: r.severity,
        casesCount: Number(r.casesCount),
        status: r.status,
        observedAt: new Date(r.observedAt).toISOString(),
        county: r.county,
        ward: r.ward,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      })),
    };
  }
}
