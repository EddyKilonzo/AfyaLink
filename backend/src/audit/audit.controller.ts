import { Controller, Get, Logger, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { UserRole } from '../database/entities/user.entity.js';
import { AuditService } from './audit.service.js';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto.js';

/** Read-only view of the audit trail. There is deliberately no write, update or delete route. */
@Controller('audit-logs')
@Roles(UserRole.ADMIN)
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(@Query() query: ListAuditLogsQueryDto) {
    try {
      return await this.audit.list(query);
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /audit-logs');
    }
  }
}
