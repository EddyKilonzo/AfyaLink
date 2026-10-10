import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Roles, type SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { SyncRequestDto } from './dto/sync-request.dto.js';
import { SyncService } from './sync.service.js';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles(UserRole.CHV, UserRole.ADMIN)
  async sync(@CurrentUser() user: SessionUser, @Body() body: SyncRequestDto) {
    try {
      return await this.syncService.sync(user, body);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /sync');
    }
  }
}
