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
 * Brute-force protection on top of the per-IP rate limit, with two counters:
 *
 * - per account + client IP: locks after `maxLoginFailures` (default 5), so a
 *   guesser from one address is stopped quickly without locking the real user
 *   out from their own device;
 * - per account from any IP: locks after `accountMaxFailures` (default 25), so
 *   a distributed attack is still stopped.
 *
 * State is in memory: per instance and reset on restart. Use a shared store
 * (e.g. Redis) when running multiple API instances.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, AttemptRecord>();
  private readonly pairMax: number;
  private readonly accountMax: number;
  private readonly windowMs: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const auth = config.get('auth', { infer: true });
    this.pairMax = auth.maxLoginFailures;
    this.accountMax = auth.accountMaxFailures;
    this.windowMs = auth.lockoutMinutes * 60_000;
  }

  /** Throws 429 while the account is locked for this client or for everyone. */
  assertNotLocked(email: string, ip: string | null, now = Date.now()): void {
    for (const key of [pairKey(email, ip), accountKey(email)]) {
      const record = this.attempts.get(key);
      if (record && record.lockedUntil > now) {
        throw new HttpException(
          'Too many failed sign-in attempts. Please wait and try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  recordFailure(email: string, ip: string | null, now = Date.now()): void {
    this.prune(now);
    this.bump(pairKey(email, ip), this.pairMax, now);
    this.bump(accountKey(email), this.accountMax, now);
  }

  /** A correct password proves the caller is the user, so both counters reset. */
  recordSuccess(email: string, ip: string | null): void {
    this.attempts.delete(pairKey(email, ip));
    this.attempts.delete(accountKey(email));
  }

  private bump(key: string, max: number, now: number): void {
    const record = this.attempts.get(key);
    if (!record || now - record.firstFailureAt > this.windowMs) {
      this.attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: max <= 1 ? now + this.windowMs : 0 });
      return;
    }
    record.failures += 1;
    if (record.failures >= max) record.lockedUntil = now + this.windowMs;
  }

  private prune(now: number): void {
    if (this.attempts.size < MAX_TRACKED) return;
    for (const [key, record] of this.attempts) {
      if (record.lockedUntil < now && now - record.firstFailureAt > this.windowMs) this.attempts.delete(key);
    }
  }
}

function pairKey(email: string, ip: string | null): string {
  return `pair:${email}|${ip ?? 'unknown'}`;
}

function accountKey(email: string): string {
  return `account:${email}`;
}
