import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { currentIp, currentRequestId } from '../common/request-context.js';
import { DatabaseService } from '../database/database.service.js';
import {
  AuditLog,
  type AuditAction,
  type AuditDetails,
  type AuditTargetType,
} from '../database/entities/audit-log.entity.js';
import type { ListAuditLogsQueryDto } from './dto/list-audit-logs.dto.js';

export interface AuditEntry {
  actorId?: string | null;
  targetType?: AuditTargetType;
  targetId?: string | number | null;
  details?: AuditDetails;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Records an action after it succeeded (or, for sign-in, failed). Best
   * effort: a failed audit write is logged loudly but never undoes or blocks
   * the action itself, which has already been committed.
   */
  async record(action: AuditAction, entry: AuditEntry = {}): Promise<void> {
    try {
      this.db.assertReady();
      await this.logs.insert({
        action,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId == null ? null : String(entry.targetId),
        ipAddress: currentIp()?.slice(0, 45) ?? null,
        requestId: currentRequestId() ?? null,
        details: entry.details ?? null,
      });
    } catch (error) {
      this.logger.error(`AUDIT WRITE FAILED for ${action} (${errorCode(error) ?? 'UNKNOWN'}).`);
    }
  }

  async list(query: ListAuditLogsQueryDto): Promise<Paginated<AuditLog>> {
    try {
      this.db.assertReady();
      const qb = this.logs.createQueryBuilder('a').orderBy('a.createdAt', 'DESC').addOrderBy('a.id', 'DESC');
      if (query.action) qb.andWhere('a.action = :action', { action: query.action });
      if (query.actorId) qb.andWhere('a.actorId = :actorId', { actorId: query.actorId });
      if (query.targetId) qb.andWhere('a.targetId = :targetId', { targetId: query.targetId });
      if (query.from) qb.andWhere('a.createdAt >= :from', { from: new Date(query.from) });
      if (query.to) qb.andWhere('a.createdAt <= :to', { to: new Date(query.to) });
      const [items, total] = await qb
        .skip((query.page - 1) * query.limit)
        .take(query.limit)
        .getManyAndCount();
      return paginate(items, total, query.page, query.limit);
    } catch (error) {
      throw toHttpException(error, this.logger, 'List audit logs');
    }
  }
}
