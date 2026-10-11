import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SessionRevocationService } from '../../auth/session-revocation.service.js';
import { UserRole } from '../../database/entities/user.entity.js';
import type { SessionState, UsersService } from '../../users/users.service.js';
import { SessionGuard } from './session.guard.js';

const SECRET = 'x'.repeat(48);
const USER_ID = '6f1c1c1e-2b7a-4a3e-9a51-1f0e2d3c4b5a';

function ctx(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  const jwt = new JwtService({ secret: SECRET, verifyOptions: { algorithms: ['HS256'] } });
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
  let state: SessionState | null;
  let revocations: SessionRevocationService;
  let guard: SessionGuard;

  const sign = (claims: Record<string, unknown> = {}) =>
    jwt.signAsync(
      { sub: USER_ID, role: UserRole.CHV, email: 'chv@afyalink.test', iatMs: Date.now(), ...claims },
      { jwtid: 'session-1', expiresIn: 60 },
    );
  const run = async (token: string) => {
    const request: Record<string, unknown> = { cookies: { afya_session: token } };
    await guard.canActivate(ctx(request));
    return request.user as { id: string; role: UserRole };
  };

  beforeEach(() => {
    state = { role: UserRole.CHV, isActive: true, tokensValidAfter: null };
    revocations = new SessionRevocationService();
    const users = { getSessionState: vi.fn(async () => state) } as unknown as UsersService;
    guard = new SessionGuard(reflector, jwt, revocations, users);
  });

  it('accepts a valid session and attaches the user', async () => {
    expect(await run(await sign())).toMatchObject({ id: USER_ID, role: UserRole.CHV });
  });

  it('takes the role from the database, not the token', async () => {
    state = { role: UserRole.CHV, isActive: true, tokensValidAfter: null };
    const user = await run(await sign({ role: UserRole.ADMIN }));
    expect(user.role).toBe(UserRole.CHV);
  });

  it('rejects a missing cookie, a bad signature and a revoked session', async () => {
    await expect(guard.canActivate(ctx({ cookies: {} }))).rejects.toThrow(UnauthorizedException);
    const forged = await new JwtService({ secret: 'y'.repeat(48) }).signAsync({ sub: USER_ID }, { jwtid: 'a' });
    await expect(run(forged)).rejects.toThrow(/expired or invalid/);
    const token = await sign();
    revocations.revoke('session-1', Date.now() + 60_000);
    await expect(run(token)).rejects.toThrow(/has ended/);
  });

  it('rejects sessions of deactivated or deleted users', async () => {
    const token = await sign();
    state = { role: UserRole.CHV, isActive: false, tokensValidAfter: null };
    await expect(run(token)).rejects.toThrow(/no longer active/);
    state = null;
    await expect(run(token)).rejects.toThrow(/no longer active/);
  });

  it('rejects sessions issued before tokens_valid_after, to the millisecond', async () => {
    const issuedAt = Date.now();
    const token = await sign({ iatMs: issuedAt });
    state = { role: UserRole.CHV, isActive: true, tokensValidAfter: new Date(issuedAt + 1) };
    await expect(run(token)).rejects.toThrow(/no longer valid/);
    state = { role: UserRole.CHV, isActive: true, tokensValidAfter: new Date(issuedAt) };
    await expect(run(token)).resolves.toBeDefined();
  });
});
