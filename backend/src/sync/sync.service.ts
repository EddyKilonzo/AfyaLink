import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { SyncLog, SyncStatus } from '../database/entities/sync-log.entity.js';
import { UserRole } from '../database/entities/user.entity.js';
import { CreateReportDto } from '../reports/dto/create-report.dto.js';
import { ReportsService } from '../reports/reports.service.js';
import type { ListSyncLogsQueryDto, SyncItemResult, SyncRequestDto } from './dto/sync-request.dto.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly reports: ReportsService,
    private readonly db: DatabaseService,
    @InjectRepository(SyncLog) private readonly syncLogs: Repository<SyncLog>,
  ) {}

  /**
   * Accepts a batch of offline-created reports. Each item gets its own result;
   * the client marks a report as synced only when the server answers
   * `created` or `duplicate`, so retries never produce duplicate rows.
   */
  async sync(user: SessionUser, body: SyncRequestDto) {
    try {
      return await this.runBatch(user, body);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Sync batch');
    }
  }

  /** Sync audit history, newest first. CHVs see their own; admins see all or one user's. */
  async logs(user: SessionUser, query: ListSyncLogsQueryDto): Promise<Paginated<SyncLog>> {
    try {
      this.db.assertReady();
      const userId = user.role === UserRole.ADMIN ? query.userId : user.id;
      const [items, total] = await this.syncLogs.findAndCount({
        where: userId ? { userId } : {},
        order: { startedAt: 'DESC' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      });
      return paginate(items, total, query.page, query.limit);
    } catch (error) {
      throw toHttpException(error, this.logger, 'List sync logs');
    }
  }

  private async runBatch(user: SessionUser, body: SyncRequestDto) {
    this.db.assertReady();
    const startedAt = new Date();
    const results: SyncItemResult[] = [];

    for (const raw of body.reports) {
      results.push(await this.syncOne(user, raw));
    }

    const count = (status: SyncItemResult['status']) =>
      results.filter((r) => r.status === status).length;
    const created = count('created');
    const duplicates = count('duplicate');
    const rejected = count('rejected');

    const status =
      rejected === 0 ? SyncStatus.SUCCESS : rejected === results.length ? SyncStatus.FAILED : SyncStatus.PARTIAL;

    try {
      await this.syncLogs.insert({
        userId: user.id,
        deviceId: body.deviceId ?? null,
        receivedCount: results.length,
        createdCount: created,
        duplicateCount: duplicates,
        rejectedCount: rejected,
        status,
        startedAt,
        completedAt: new Date(),
      });
    } catch (error) {
      // An audit-log failure must not make the client resend reports that were saved.
      this.logger.warn(`Could not write sync log (${errorCode(error) ?? 'UNKNOWN'}).`);
    }

    return {
      status,
      summary: { received: results.length, created, duplicates, rejected },
      results,
      serverTime: new Date().toISOString(),
    };
  }

  private async syncOne(user: SessionUser, raw: Record<string, unknown>): Promise<SyncItemResult> {
    const id = typeof raw.id === 'string' ? raw.id.slice(0, 36) : null;
    try {
      const dto = plainToInstance(CreateReportDto, raw);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      if (errors.length > 0) {
        const fields = errors.map((e) => e.property).join(', ');
        return { id, status: 'rejected', reason: `Invalid fields: ${fields}` };
      }

      const { outcome } = await this.reports.createIdempotent(user, dto);
      return { id, status: outcome };
    } catch (error) {
      if (error instanceof ConflictException) {
        return { id, status: 'rejected', reason: 'Report ID belongs to another user.' };
      }
      if (error instanceof BadRequestException) {
        // Messages are fixed server strings (policy or constraint), never echoed input.
        return { id, status: 'rejected', reason: error.message };
      }
      // Infrastructure errors (DB down, 503) abort the batch so the client retries later.
      throw error;
    }
  }
}
