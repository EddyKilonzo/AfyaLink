import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { ListSyncLogsQueryDto, SyncRequestDto } from './dto/sync-request.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
@Roles(UserRole.CHV, UserRole.ADMIN)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async sync(@CurrentUser() user: SessionUser, @Body() body: SyncRequestDto) {
    try {
      return await this.syncService.sync(user, body);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /sync');
    }
  }

  @Get('logs')
  async logs(@CurrentUser() user: SessionUser, @Query() query: ListSyncLogsQueryDto) {
    try {
      return await this.syncService.logs(user, query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /sync/logs');
    }
  }
}
