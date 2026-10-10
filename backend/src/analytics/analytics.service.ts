import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthReport } from '../database/entities/health-report.entity.js';
import { UserRole } from '../database/entities/user.entity.js';

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

  private async buildSummary(user: SessionUser, days: number) {
    this.db.assertReady();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scoped = (): SelectQueryBuilder<HealthReport> => {
      const qb = this.reports.createQueryBuilder('r').where('r.observedAt >= :since', { since });
      if (user.role !== UserRole.ADMIN) qb.andWhere('r.chvId = :chvId', { chvId: user.id });
      return qb;
    };

    const [totals, byCategory, bySeverity, byDay, topConditions] = await Promise.all([
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
    ]);

    return {
      scope: user.role === UserRole.ADMIN ? 'all' : 'own',
      periodDays: days,
      since: since.toISOString(),
      totals: { reports: Number(totals?.reports ?? 0), cases: Number(totals?.cases ?? 0) },
      byCategory: byCategory.map((r) => ({ category: r.category, count: Number(r.count) })),
      bySeverity: bySeverity.map((r) => ({ severity: r.severity, count: Number(r.count) })),
      byDay: byDay.map((r) => ({
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
        count: Number(r.count),
      })),
      topConditions: topConditions.map((r) => ({ condition: r.condition, cases: Number(r.cases) })),
    };
  }
}
