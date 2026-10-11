import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { BCRYPT_ROUNDS } from '../common/constants.js';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { paginate, type Paginated } from '../common/dto/pagination.dto.js';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { escapeLike } from '../common/validation/validators.js';
import { DatabaseService } from '../database/database.service.js';
import { User, UserRole } from '../database/entities/user.entity.js';
import type { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto.js';

export type PublicUser = Pick<
  User,
  'id' | 'fullName' | 'email' | 'phone' | 'role' | 'locationId' | 'isActive' | 'mfaEnabled' | 'lastLoginAt'
>;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    locationId: user.locationId,
    isActive: user.isActive,
    mfaEnabled: user.mfaEnabled,
    lastLoginAt: user.lastLoginAt,
  };
}

/** What the session guard needs to know about a user on every request. */
export interface SessionState {
  role: UserRole;
  isActive: boolean;
  tokensValidAfter: Date | null;
}

const SESSION_CACHE_TTL_MS = 10_000;
const SESSION_CACHE_MAX = 5_000;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  /**
   * Short-lived cache so the session guard does not query MySQL on every
   * request. Entries are dropped immediately when this instance changes a
   * user; per instance, so use a shared store when running several instances.
   */
  private readonly sessionCache = new Map<string, { state: SessionState | null; expiresAt: number }>();

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly db: DatabaseService,
  ) {}

  /** Includes the password hash; for authentication only. */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    try {
      this.db.assertReady();
      return await this.users
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.email = :email', { email: email.toLowerCase() })
        .getOne();
    } catch (error) {
      throw toHttpException(error, this.logger, 'Find user by email');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      this.db.assertReady();
      return await this.users.findOne({ where: { id } });
    } catch (error) {
      throw toHttpException(error, this.logger, 'Find user by id');
    }
  }

  /** Current role/active flag/password-change time, or null when the user no longer exists. */
  async getSessionState(id: string, now = Date.now()): Promise<SessionState | null> {
    const cached = this.sessionCache.get(id);
    if (cached && cached.expiresAt > now) return cached.state;
    try {
      this.db.assertReady();
      const user = await this.users.findOne({
        where: { id },
        select: { id: true, role: true, isActive: true, tokensValidAfter: true },
      });
      const state = user
        ? { role: user.role, isActive: user.isActive, tokensValidAfter: user.tokensValidAfter }
        : null;
      if (this.sessionCache.size >= SESSION_CACHE_MAX) this.sessionCache.clear();
      this.sessionCache.set(id, { state, expiresAt: now + SESSION_CACHE_TTL_MS });
      return state;
    } catch (error) {
      throw toHttpException(error, this.logger, 'Load session state');
    }
  }

  /** Best effort: a failed timestamp update must never block a valid login. */
  async recordLogin(id: string): Promise<void> {
    try {
      await this.users.update({ id }, { lastLoginAt: new Date() });
    } catch (error) {
      this.logger.warn(`Could not record login time (${errorCode(error) ?? 'UNKNOWN'}).`);
    }
  }

  async list(query: ListUsersQueryDto): Promise<Paginated<PublicUser>> {
    try {
      this.db.assertReady();
      const qb = this.users.createQueryBuilder('u').orderBy('u.fullName', 'ASC');
      if (query.role) qb.andWhere('u.role = :role', { role: query.role });
      if (query.isActive !== undefined) qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
      if (query.q) {
        // Columns use a case-insensitive collation; backslash is MySQL's default LIKE escape.
        const pattern = `%${escapeLike(query.q)}%`;
        qb.andWhere('(u.fullName LIKE :pattern OR u.email LIKE :pattern)', { pattern });
      }
      const [rows, total] = await qb
        .skip((query.page - 1) * query.limit)
        .take(query.limit)
        .getManyAndCount();
      return paginate(rows.map(toPublicUser), total, query.page, query.limit);
    } catch (error) {
      throw toHttpException(error, this.logger, 'List users');
    }
  }

  async getPublic(id: string): Promise<PublicUser> {
    try {
      const user = await this.findById(id);
      if (!user) throw new NotFoundException('User not found.');
      return toPublicUser(user);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Get user');
    }
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    try {
      this.db.assertReady();
      const id = randomUUID();
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      try {
        await this.users.insert({
          id,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone ?? null,
          role: dto.role,
          locationId: dto.locationId ?? null,
          passwordHash,
          isActive: true,
        });
      } catch (error) {
        if (errorCode(error) === 'ER_DUP_ENTRY') throw new ConflictException('A user with this email already exists.');
        throw error;
      }
      return toPublicUser(await this.users.findOneOrFail({ where: { id } }));
    } catch (error) {
      throw toHttpException(error, this.logger, 'Create user');
    }
  }

  /** ADMIN edit. An admin cannot deactivate or demote themselves, so the system always keeps one admin in reach. */
  async update(admin: SessionUser, id: string, dto: UpdateUserDto): Promise<PublicUser> {
    try {
      this.db.assertReady();
      if (id === admin.id && (dto.isActive === false || (dto.role && dto.role !== UserRole.ADMIN))) {
        throw new ForbiddenException('You cannot deactivate or demote your own account.');
      }
      const user = await this.users.findOne({ where: { id } });
      if (!user) throw new NotFoundException('User not found.');

      const changes: Partial<User> = {};
      if (dto.fullName != null) changes.fullName = dto.fullName;
      if (dto.phone !== undefined) changes.phone = dto.phone;
      if (dto.role != null) changes.role = dto.role;
      if (dto.locationId !== undefined) changes.locationId = dto.locationId;
      if (dto.isActive != null) changes.isActive = dto.isActive;
      if (Object.keys(changes).length === 0) throw new BadRequestException('No changes supplied.');
      // Deactivation and role changes end existing sessions, so reactivating
      // the account later does not revive them.
      if (changes.isActive === false || (changes.role && changes.role !== user.role)) {
        changes.tokensValidAfter = new Date();
      }

      await this.users.update({ id }, changes);
      this.invalidateSession(id);
      return toPublicUser(await this.users.findOneOrFail({ where: { id } }));
    } catch (error) {
      throw toHttpException(error, this.logger, 'Update user');
    }
  }

  /** ADMIN reset of another user's password. Ends all of that user's sessions. */
  async resetPassword(admin: SessionUser, id: string, password: string): Promise<void> {
    try {
      if (id === admin.id) {
        throw new ForbiddenException('Use POST /api/auth/change-password for your own account.');
      }
      this.db.assertReady();
      const exists = await this.users.existsBy({ id });
      if (!exists) throw new NotFoundException('User not found.');
      await this.setPassword(id, password);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Reset password');
    }
  }

  /** Self-service change; the current password must be supplied. Returns the change time. */
  async changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<Date> {
    try {
      this.db.assertReady();
      const user = await this.users
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id })
        .getOne();
      if (!user || !user.isActive) throw new ForbiddenException('Account is no longer active.');
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new BadRequestException('Current password is incorrect.');
      }
      if (currentPassword === newPassword) {
        throw new BadRequestException('New password must be different from the current password.');
      }
      return await this.setPassword(id, newPassword);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Change password');
    }
  }

  /** Ends every existing session of the user (tokens issued before now are rejected). */
  async endAllSessions(id: string): Promise<void> {
    try {
      this.db.assertReady();
      await this.users.update({ id }, { tokensValidAfter: new Date() });
      this.invalidateSession(id);
    } catch (error) {
      throw toHttpException(error, this.logger, 'End all sessions');
    }
  }

  invalidateSession(id: string): void {
    this.sessionCache.delete(id);
  }

  private async setPassword(id: string, password: string): Promise<Date> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const changedAt = new Date();
    await this.users.update({ id }, { passwordHash, tokensValidAfter: changedAt });
    this.invalidateSession(id);
    return changedAt;
  }
}
