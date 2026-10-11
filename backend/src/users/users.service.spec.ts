import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import type { DatabaseService } from '../database/database.service.js';
import { UserRole, type User } from '../database/entities/user.entity.js';
import { UsersService } from './users.service.js';

const ADMIN: SessionUser = { id: 'admin-1', role: UserRole.ADMIN, email: 'admin@afyalink.test' };

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'chv-1',
    fullName: 'Demo CHV',
    email: 'chv@afyalink.test',
    phone: null,
    role: UserRole.CHV,
    locationId: null,
    isActive: true,
    lastLoginAt: null,
    tokensValidAfter: null,
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  const db = { assertReady: vi.fn() } as unknown as DatabaseService;
  let stored: User;
  let repo: { findOne: ReturnType<typeof vi.fn>; findOneOrFail: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let service: UsersService;

  beforeEach(() => {
    stored = fakeUser();
    repo = {
      findOne: vi.fn(async () => stored),
      findOneOrFail: vi.fn(async () => stored),
      update: vi.fn(async (_where: unknown, changes: Partial<User>) => {
        stored = { ...stored, ...changes };
      }),
    };
    service = new UsersService(repo as unknown as Repository<User>, db);
  });

  it('stops an admin deactivating or demoting themselves', async () => {
    await expect(service.update(ADMIN, ADMIN.id, { isActive: false })).rejects.toThrow(ForbiddenException);
    await expect(service.update(ADMIN, ADMIN.id, { role: UserRole.CHV })).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('ends existing sessions when a user is deactivated or changes role', async () => {
    await service.update(ADMIN, 'chv-1', { isActive: false });
    expect(stored.tokensValidAfter).toBeInstanceOf(Date);

    stored = fakeUser();
    await service.update(ADMIN, 'chv-1', { role: UserRole.ADMIN });
    expect(stored.tokensValidAfter).toBeInstanceOf(Date);
  });

  it('keeps sessions for harmless profile edits', async () => {
    await service.update(ADMIN, 'chv-1', { phone: '+254700000001', role: UserRole.CHV });
    expect(stored.tokensValidAfter).toBeNull();
  });

  it('ignores null for required fields but clears nullable ones', async () => {
    stored = fakeUser({ phone: '+254700000001', locationId: 3 });
    await service.update(ADMIN, 'chv-1', { fullName: null as unknown as string, phone: null, locationId: null });
    expect(stored).toMatchObject({ fullName: 'Demo CHV', phone: null, locationId: null });
  });

  it('returns 404 for an unknown user', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.update(ADMIN, 'missing', { phone: null })).rejects.toThrow(NotFoundException);
  });

  it('refuses an admin resetting their own password through the admin route', async () => {
    await expect(service.resetPassword(ADMIN, ADMIN.id, 'Another1234pass')).rejects.toThrow(ForbiddenException);
  });

  it('caches session state briefly and drops it when the user changes', async () => {
    const now = Date.now();
    await service.getSessionState('chv-1', now);
    await service.getSessionState('chv-1', now + 1_000);
    expect(repo.findOne).toHaveBeenCalledTimes(1);

    await service.update(ADMIN, 'chv-1', { isActive: false });
    const state = await service.getSessionState('chv-1', now + 2_000);
    expect(state?.isActive).toBe(false);
  });
});
