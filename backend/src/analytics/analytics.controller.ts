import { Controller, Get, Logger, Query } from '@nestjs/common';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { AnalyticsService } from './analytics.service.js';
import { MapQueryDto, SummaryQueryDto } from './dto/analytics-query.dto.js';

/** ADMIN: all reports. CHV: own reports only. `days` must be 1-365 (default 30). */
@Controller('analytics')
@Roles(UserRole.CHV, UserRole.ADMIN)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  async summary(@CurrentUser() user: SessionUser, @Query() query: SummaryQueryDto) {
    try {
      return await this.analytics.summary(user, query.days);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /analytics/summary');
    }
  }

  /** Report points for the disease map; uses the location's coordinates when the report has none. */
  @Get('map')
  async map(@CurrentUser() user: SessionUser, @Query() query: MapQueryDto) {
    try {
      return await this.analytics.map(user, query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /analytics/map');
    }
  }
}
