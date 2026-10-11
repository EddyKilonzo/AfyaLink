import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';
import { LoginAttemptsService } from './login-attempts.service.js';

describe('LoginAttemptsService', () => {
  const config = {
    get: () => ({ maxLoginFailures: 3, accountMaxFailures: 6, lockoutMinutes: 15 }),
  } as unknown as ConfigService<AppConfig, true>;
  const email = 'chv@afyalink.test';
  const attacker = '203.0.113.9';
  const owner = '198.51.100.7';

  it('locks an account for one client after the per-client limit', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    service.recordFailure(email, attacker, now);
    service.recordFailure(email, attacker, now);
    expect(() => service.assertNotLocked(email, attacker, now)).not.toThrow();
    service.recordFailure(email, attacker, now);
    expect(() => service.assertNotLocked(email, attacker, now)).toThrow(HttpException);
  });

  it('does not lock the real user out when one other client guesses', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    for (let i = 0; i < 3; i++) service.recordFailure(email, attacker, now);
    expect(() => service.assertNotLocked(email, attacker, now)).toThrow(HttpException);
    expect(() => service.assertNotLocked(email, owner, now)).not.toThrow();
  });

  it('locks the account for everyone under a distributed attack', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    for (let i = 0; i < 6; i++) service.recordFailure(email, `203.0.113.${i}`, now);
    expect(() => service.assertNotLocked(email, owner, now)).toThrow(HttpException);
  });

  it('unlocks after the lockout window', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    for (let i = 0; i < 6; i++) service.recordFailure(email, attacker, now);
    expect(() => service.assertNotLocked(email, attacker, now + 16 * 60_000)).not.toThrow();
  });

  it('clears both counters after a successful login', () => {
    const service = new LoginAttemptsService(config);
    service.recordFailure(email, owner);
    service.recordFailure(email, owner);
    service.recordSuccess(email, owner);
    service.recordFailure(email, owner);
    expect(() => service.assertNotLocked(email, owner)).not.toThrow();
  });
});
