import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';

interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
}

const MAX_TRACKED = 10_000;

/**
 * Per-account brute-force protection, complementing the per-IP rate limit.
 * After N failed logins within the lockout window the account is locked for
 * that window. State is in memory: it resets on restart and is per instance;
 * use a shared store (e.g. Redis) when running multiple API instances.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const auth = config.get('auth', { infer: true });
    this.maxFailures = auth.maxLoginFailures;
    this.windowMs = auth.lockoutMinutes * 60_000;
  }

  /** Throws 429 while the account is locked. */
  assertNotLocked(email: string, now = Date.now()): void {
    const record = this.attempts.get(email);
    if (record && record.lockedUntil > now) {
      throw new HttpException(
        'Too many failed sign-in attempts. Please wait and try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(email: string, now = Date.now()): void {
    this.prune(now);
    const record = this.attempts.get(email);
    if (!record || now - record.firstFailureAt > this.windowMs) {
      this.attempts.set(email, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
      return;
    }
    record.failures += 1;
    if (record.failures >= this.maxFailures) record.lockedUntil = now + this.windowMs;
  }

  recordSuccess(email: string): void {
    this.attempts.delete(email);
  }

  private prune(now: number): void {
    if (this.attempts.size < MAX_TRACKED) return;
    for (const [key, record] of this.attempts) {
      if (record.lockedUntil < now && now - record.firstFailureAt > this.windowMs) this.attempts.delete(key);
    }
  }
}
