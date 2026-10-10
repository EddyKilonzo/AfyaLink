import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { SessionRevocationService } from './session-revocation.service.js';

describe('LoginAttemptsService', () => {
  const config = {
    get: () => ({ maxLoginFailures: 3, lockoutMinutes: 15 }),
  } as unknown as ConfigService<AppConfig, true>;
  const email = 'chv@afyalink.test';

  it('locks an account after the configured number of failures', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    service.recordFailure(email, now);
    service.recordFailure(email, now);
    expect(() => service.assertNotLocked(email, now)).not.toThrow();
    service.recordFailure(email, now);
    expect(() => service.assertNotLocked(email, now)).toThrow(HttpException);
  });

  it('unlocks after the lockout window', () => {
    const service = new LoginAttemptsService(config);
    const now = Date.now();
    for (let i = 0; i < 3; i++) service.recordFailure(email, now);
    expect(() => service.assertNotLocked(email, now + 16 * 60_000)).not.toThrow();
  });

  it('clears failures after a successful login', () => {
    const service = new LoginAttemptsService(config);
    service.recordFailure(email);
    service.recordFailure(email);
    service.recordSuccess(email);
    service.recordFailure(email);
    expect(() => service.assertNotLocked(email)).not.toThrow();
  });
});

describe('SessionRevocationService', () => {
  it('treats revoked and ID-less tokens as revoked until expiry', () => {
    const service = new SessionRevocationService();
    service.revoke('abc', Date.now() + 60_000);
    expect(service.isRevoked('abc')).toBe(true);
    expect(service.isRevoked('other')).toBe(false);
    expect(service.isRevoked(undefined)).toBe(true);
  });
});
