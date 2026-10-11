import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ANONYMOUS_BINDING, CsrfService } from '../../auth/csrf.service.js';
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
  const SECRET = 's'.repeat(48);
  const config = {
    get: (key: string) => (key === 'corsOrigins' ? ['http://localhost:3000'] : { jwtSecret: SECRET }),
  } as unknown as ConfigService<AppConfig, true>;
  const jwt = new JwtService({ secret: SECRET });
  const csrf = new CsrfService(config, jwt);
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
  const guard = new CsrfGuard(reflector, config, csrf);

  const post = (token: string, extra: Record<string, unknown> = {}) => ({
    method: 'POST',
    headers: { 'x-csrf-token': token, ...(extra.headers as object) },
    cookies: { afya_csrf: token, ...(extra.cookies as object) },
  });

  it('allows safe methods without a token', async () => {
    expect(await guard.canActivate(ctx({ method: 'GET', headers: {}, cookies: {} }))).toBe(true);
  });

  it('allows POST with a signed anonymous token when there is no session', async () => {
    expect(await guard.canActivate(ctx(post(csrf.issue(ANONYMOUS_BINDING))))).toBe(true);
  });

  it('rejects a header that does not match the cookie', async () => {
    const token = csrf.issue(ANONYMOUS_BINDING);
    const req = { ...post(token), headers: { 'x-csrf-token': csrf.issue(ANONYMOUS_BINDING) } };
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(ForbiddenException);
  });

  it('rejects matching but unsigned values (a planted cookie)', async () => {
    await expect(guard.canActivate(ctx(post('abc.def')))).rejects.toThrow(ForbiddenException);
  });

  it('binds the token to the session: an anonymous token fails once signed in', async () => {
    const session = await jwt.signAsync({ sub: 'u1' }, { jwtid: 'session-1' });
    const anonymous = csrf.issue(ANONYMOUS_BINDING);
    await expect(
      guard.canActivate(ctx(post(anonymous, { cookies: { afya_session: session } }))),
    ).rejects.toThrow(ForbiddenException);
    const bound = csrf.issue('session-1');
    expect(await guard.canActivate(ctx(post(bound, { cookies: { afya_session: session } })))).toBe(true);
  });

  it('rejects a token minted for a different session', async () => {
    const session = await jwt.signAsync({ sub: 'u1' }, { jwtid: 'session-1' });
    const other = csrf.issue('session-2');
    await expect(
      guard.canActivate(ctx(post(other, { cookies: { afya_session: session } }))),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects POST from an unknown origin even with a valid token', async () => {
    const req = post(csrf.issue(ANONYMOUS_BINDING), { headers: { origin: 'https://evil.example' } });
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(ForbiddenException);
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
