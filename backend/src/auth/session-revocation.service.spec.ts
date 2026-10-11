import type { Repository } from 'typeorm';
import type { DatabaseService } from '../database/database.service.js';
import type { RevokedSession } from '../database/entities/revoked-session.entity.js';
import { SessionRevocationService } from './session-revocation.service.js';

/** In-memory stand-in for the revoked_sessions table. */
function fakeRepo() {
  const rows = new Map<string, Date>();
  const execute = vi.fn(async () => undefined);
  let pending: { jti: string; expiresAt: Date } | null = null;
  const builder = {
    insert: () => builder,
    values: (v: { jti: string; expiresAt: Date }) => {
      pending = v;
      return builder;
    },
    orIgnore: () => builder,
    execute: vi.fn(async () => {
      if (pending && !rows.has(pending.jti)) rows.set(pending.jti, pending.expiresAt);
      return execute();
    }),
  };
  return {
    rows,
    createQueryBuilder: () => builder,
    delete: vi.fn(async () => undefined),
    findOne: vi.fn(async ({ where }: { where: { jti: string } }) => {
      const expiresAt = rows.get(where.jti);
      return expiresAt && expiresAt.getTime() > Date.now() ? { jti: where.jti, expiresAt } : null;
    }),
  };
}

describe('SessionRevocationService', () => {
  const db = { isReady: true, assertReady: vi.fn() } as unknown as DatabaseService;

  it('treats revoked and ID-less tokens as revoked until expiry', async () => {
    const service = new SessionRevocationService(fakeRepo() as unknown as Repository<RevokedSession>, db);
    await service.revoke('abc', 'user-1', Date.now() + 60_000);
    expect(await service.isRevoked('abc')).toBe(true);
    expect(await service.isRevoked('other')).toBe(false);
    expect(await service.isRevoked(undefined)).toBe(true);
  });

  it('persists revocations so a restarted instance still rejects the session', async () => {
    const repo = fakeRepo();
    const first = new SessionRevocationService(repo as unknown as Repository<RevokedSession>, db);
    await first.revoke('abc', 'user-1', Date.now() + 60_000);

    const afterRestart = new SessionRevocationService(repo as unknown as Repository<RevokedSession>, db);
    expect(await afterRestart.isRevoked('abc')).toBe(true);
  });

  it('caches "not revoked" briefly, but its own revocations apply at once', async () => {
    const repo = fakeRepo();
    const service = new SessionRevocationService(repo as unknown as Repository<RevokedSession>, db);
    const now = Date.now();
    expect(await service.isRevoked('abc', now)).toBe(false);
    expect(await service.isRevoked('abc', now + 1_000)).toBe(false);
    expect(repo.findOne).toHaveBeenCalledTimes(1);

    await service.revoke('abc', 'user-1', now + 60_000);
    expect(await service.isRevoked('abc', now + 2_000)).toBe(true);
  });

  it('keeps protecting this instance when the database write fails', async () => {
    const repo = fakeRepo();
    repo.createQueryBuilder = () => {
      throw Object.assign(new Error('down'), { code: 'ECONNREFUSED' });
    };
    const service = new SessionRevocationService(repo as unknown as Repository<RevokedSession>, db);
    await service.revoke('abc', 'user-1', Date.now() + 60_000);
    expect(await service.isRevoked('abc')).toBe(true);
  });
});
