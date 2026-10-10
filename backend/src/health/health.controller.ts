import { Controller, Get, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly db: DatabaseService) {}

  /** Always 200 while the process is up; `database` reports MySQL readiness separately. */
  @Public()
  @SkipThrottle()
  @Get()
  check() {
    try {
      return {
        status: 'ok',
        service: 'afyalink-backend',
        database: this.db.status,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /health');
    }
  }
}
