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
/** How long a liveness probe result is reused, so frequent health checks stay cheap. */
const PING_TTL_MS = 5_000;

/**
 * Owns the database connection lifecycle. The TypeORM DataSource is created with
 * `manualInitialization`, so the API boots (and /api/health answers) even when
 * the database is missing; connection attempts continue in the background and every
 * database-backed endpoint calls `assertReady()` to return a clean 503 instead.
 */
@Injectable()
export class DatabaseService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private state: DatabaseState;
  private retryTimer: NodeJS.Timeout | null = null;
  private lastPing: { at: number; ok: boolean } | null = null;
  private pinging: Promise<boolean> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    // State is derived from `dataSource.isInitialized` (see `status`), so it can
    // never be stale relative to the real connection. The initial value here is
    // only a hint before the bootstrap hook runs.
    this.state = this.dataSource.isInitialized ? 'connected' : 'not_configured';
  }

  onApplicationBootstrap(): void {
    const db = this.config.get('db', { infer: true });
    if (!db.configured) {
      this.state = 'not_configured';
      this.logger.warn(
        'Database is not configured (DB_HOST, DB_NAME, DB_USER). Database-backed endpoints will return 503.',
      );
      return;
    }
    this.state = 'connecting';
    void this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try {
      if (this.dataSource.isInitialized) await this.dataSource.destroy();
    } catch (error) {
      const dialect = this.config.get('db.dialect', { infer: true });
      this.logger.warn(`Error while closing ${dialect} connection (${(error as { code?: string }).code ?? 'UNKNOWN'}).`);
    }
  }

  get status(): DatabaseState {
    // Derived from the real connection rather than a stale flag, so the health
    // endpoint can never report "connecting" after the constructor has run.
    if (this.dataSource.isInitialized) return 'connected';
    return this.state;
  }

  /**
   * Live status for /api/health. `isInitialized` stays true after the server
   * goes away (the pool just fails its next query), so once connected this
   * runs a cheap `SELECT 1`, reusing the result for a few seconds.
   */
  async liveStatus(): Promise<DatabaseState> {
    if (!this.dataSource.isInitialized) return this.state;
    if (this.lastPing && Date.now() - this.lastPing.at < PING_TTL_MS) {
      return this.lastPing.ok ? 'connected' : 'unavailable';
    }
    this.pinging ??= this.dataSource
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false)
      .then((ok) => {
        this.lastPing = { at: Date.now(), ok };
        this.pinging = null;
        return ok;
      });
    return (await this.pinging) ? 'connected' : 'unavailable';
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
      await this.dataSource.initialize();
      this.state = 'connected';
      const dialect = this.config.get('db.dialect', { infer: true });
      this.logger.log(`Connected to ${dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'}.`);
    } catch (error) {
      // `dataSource.isInitialized` is still false, so `status` reports
      // 'unavailable' and the next retry will try again.
      this.state = 'unavailable';
      // Log only the driver error code; messages can echo connection details.
      const code = (error as { code?: string }).code ?? 'UNKNOWN';
      const dialect = this.config.get('db.dialect', { infer: true });
      this.logger.warn(`${dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'} connection failed (${code}). Retrying in ${RETRY_INTERVAL_MS / 1000}s.`);
      this.retryTimer = setTimeout(() => void this.connect(), RETRY_INTERVAL_MS);
      this.retryTimer.unref();
    }
  }
}
