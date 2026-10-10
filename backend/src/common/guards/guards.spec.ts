import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { AppConfig } from '../../config/configuration.js';
import { UserRole } from '../../database/entities/user.entity.js';
import { CsrfGuard } from './csrf.guard.js';
import { RolesGuard } from './roles.guard.js';

function ctx(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const config = { get: () => ['http://localhost:3000'] } as unknown as ConfigService<AppConfig, true>;
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
  const guard = new CsrfGuard(reflector, config);

  it('allows safe methods without a token', () => {
    expect(guard.canActivate(ctx({ method: 'GET', headers: {}, cookies: {} }))).toBe(true);
  });

  it('allows POST when header matches cookie', () => {
    const req = { method: 'POST', headers: { 'x-csrf-token': 'abc' }, cookies: { afya_csrf: 'abc' } };
    expect(guard.canActivate(ctx(req))).toBe(true);
  });

  it('rejects POST with a mismatched token', () => {
    const req = { method: 'POST', headers: { 'x-csrf-token': 'abd' }, cookies: { afya_csrf: 'abc' } };
    expect(() => guard.canActivate(ctx(req))).toThrow(ForbiddenException);
  });

  it('rejects POST from an unknown origin even with a valid token', () => {
    const req = {
      method: 'POST',
      headers: { 'x-csrf-token': 'abc', origin: 'https://evil.example' },
      cookies: { afya_csrf: 'abc' },
    };
    expect(() => guard.canActivate(ctx(req))).toThrow(ForbiddenException);
  });
});

describe('RolesGuard', () => {
  const reflectorFor = (roles: UserRole[] | undefined) =>
    ({ getAllAndOverride: () => roles }) as unknown as Reflector;

  it('allows routes without role metadata', () => {
    expect(new RolesGuard(reflectorFor(undefined)).canActivate(ctx({}))).toBe(true);
  });

  it('allows a user with a permitted role', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN]));
    expect(guard.canActivate(ctx({ user: { id: '1', role: UserRole.ADMIN } }))).toBe(true);
  });

  it('forbids a CHV on an admin-only route', () => {
    const guard = new RolesGuard(reflectorFor([UserRole.ADMIN]));
    expect(() => guard.canActivate(ctx({ user: { id: '1', role: UserRole.CHV } }))).toThrow(
      ForbiddenException,
    );
  });
});
