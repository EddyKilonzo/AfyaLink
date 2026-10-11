import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import { errorCode } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { RevokedSession } from '../database/entities/revoked-session.entity.js';

const NOT_REVOKED_CACHE_MS = 10_000;
const MAX_CACHE = 10_000;
const PRUNE_EVERY = 100;

/**
 * Remembers session IDs (JWT `jti`) that were logged out, until they expire,
 * so a copied session cookie stops working after logout. Revocations are
 * stored in MySQL (`revoked_sessions`), so they survive restarts and are seen
 * by every API instance. This instance's own revocations take effect
 * immediately; "not revoked" answers are cached for 10 s, which bounds how
 * long another instance's logout can take to propagate.
 */
@Injectable()
export class SessionRevocationService {
  private readonly logger = new Logger(SessionRevocationService.name);
  private readonly revoked = new Map<string, number>();
  private readonly notRevokedUntil = new Map<string, number>();
  private revocationsSincePrune = 0;

  constructor(
    @InjectRepository(RevokedSession) private readonly sessions: Repository<RevokedSession>,
    private readonly db: DatabaseService,
  ) {}

  async revoke(jti: string, userId: string, expiresAtMs: number): Promise<void> {
    this.remember(jti, expiresAtMs);
    try {
      this.db.assertReady();
      await this.sessions
        .createQueryBuilder()
        .insert()
        .values({ jti, userId, expiresAt: new Date(expiresAtMs) })
        .orIgnore()
        .execute();
      if (++this.revocationsSincePrune >= PRUNE_EVERY) {
        this.revocationsSincePrune = 0;
        await this.sessions.delete({ expiresAt: LessThan(new Date()) });
      }
    } catch (error) {
      // The in-memory entry still protects this instance until restart.
      this.logger.error(`Could not persist session revocation (${errorCode(error) ?? 'UNKNOWN'}).`);
    }
  }

  async isRevoked(jti: string | undefined, now = Date.now()): Promise<boolean> {
    if (!jti) return true; // tokens without an ID are not issued by this API
    const expiresAt = this.revoked.get(jti);
    if (expiresAt !== undefined) {
      if (expiresAt > now) return true;
      this.revoked.delete(jti);
    }
    if ((this.notRevokedUntil.get(jti) ?? 0) > now) return false;
    // Without a database the session guard's user lookup answers 503 anyway.
    if (!this.db.isReady) return false;

    const row = await this.sessions.findOne({
      where: { jti, expiresAt: MoreThan(new Date(now)) },
      select: { jti: true, expiresAt: true },
    });
    if (row) {
      this.remember(jti, row.expiresAt.getTime());
      return true;
    }
    if (this.notRevokedUntil.size >= MAX_CACHE) this.notRevokedUntil.clear();
    this.notRevokedUntil.set(jti, now + NOT_REVOKED_CACHE_MS);
    return false;
  }

  private remember(jti: string, expiresAtMs: number): void {
    if (this.revoked.size >= MAX_CACHE) {
      const now = Date.now();
      for (const [key, expiry] of this.revoked) if (expiry <= now) this.revoked.delete(key);
    }
    this.revoked.set(jti, expiresAtMs);
    this.notRevokedUntil.delete(jti);
  }
}
