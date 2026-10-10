import { Controller, DefaultValuePipe, Get, Logger, ParseIntPipe, Query } from '@nestjs/common';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analytics: AnalyticsService) {}

  /** ADMIN: all reports. CHV: own reports only. `days` is clamped to 1-365. */
  @Get('summary')
  @Roles(UserRole.CHV, UserRole.ADMIN)
  async summary(
    @CurrentUser() user: SessionUser,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    try {
      return await this.analytics.summary(user, Math.min(Math.max(days, 1), 365));
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /analytics/summary');
    }
  }
}
