import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { AppConfig } from '../config/configuration.js';

export type DatabaseState = 'not_configured' | 'connecting' | 'connected' | 'unavailable';

const RETRY_INTERVAL_MS = 15_000;

/**
 * Owns the MySQL connection lifecycle. The TypeORM DataSource is created with
 * `manualInitialization`, so the API boots (and /api/health answers) even when
 * MySQL is missing; connection attempts continue in the background and every
 * database-backed endpoint calls `assertReady()` to return a clean 503 instead.
 */
@Injectable()
export class DatabaseService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private state: DatabaseState = 'connecting';
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onApplicationBootstrap(): void {
    const db = this.config.get('db', { infer: true });
    if (!db.configured) {
      this.state = 'not_configured';
      this.logger.warn(
        'MySQL is not configured (DB_HOST, DB_NAME, DB_USER). Database-backed endpoints will return 503.',
      );
      return;
    }
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try {
      if (this.dataSource.isInitialized) await this.dataSource.destroy();
    } catch (error) {
      this.logger.warn(`Error while closing MySQL connection (${(error as { code?: string }).code ?? 'UNKNOWN'}).`);
    }
  }

  get status(): DatabaseState {
    return this.state;
  }

  get isReady(): boolean {
    return this.dataSource.isInitialized;
  }

  assertReady(): void {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException(
        this.state === 'not_configured'
          ? 'Database is not configured on the server.'
          : 'Database is temporarily unavailable. Please retry shortly.',
      );
    }
  }

  private async connect(): Promise<void> {
    try {
      this.state = 'connecting';
      await this.dataSource.initialize();
      this.state = 'connected';
      this.logger.log('Connected to MySQL.');
    } catch (error) {
      this.state = 'unavailable';
      // Log only the driver error code; messages can echo connection details.
      const code = (error as { code?: string }).code ?? 'UNKNOWN';
      this.logger.warn(`MySQL connection failed (${code}). Retrying in ${RETRY_INTERVAL_MS / 1000}s.`);
      this.retryTimer = setTimeout(() => void this.connect(), RETRY_INTERVAL_MS);
      this.retryTimer.unref();
    }
  }
}
