import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { errorCode, toHttpException } from '../common/errors/handle-error.js';
import { DatabaseService } from '../database/database.service.js';
import { User } from '../database/entities/user.entity.js';

export type PublicUser = Pick<
  User,
  'id' | 'fullName' | 'email' | 'phone' | 'role' | 'locationId' | 'isActive' | 'lastLoginAt'
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
    lastLoginAt: user.lastLoginAt,
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  /** Best effort: a failed timestamp update must never block a valid login. */
  async recordLogin(id: string): Promise<void> {
    try {
      await this.users.update({ id }, { lastLoginAt: new Date() });
    } catch (error) {
      this.logger.warn(`Could not record login time (${errorCode(error) ?? 'UNKNOWN'}).`);
    }
  }

  async list(page: number, limit: number): Promise<{ items: PublicUser[]; total: number }> {
    try {
      this.db.assertReady();
      const [rows, total] = await this.users.findAndCount({
        order: { fullName: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { items: rows.map(toPublicUser), total };
    } catch (error) {
      throw toHttpException(error, this.logger, 'List users');
    }
  }
}
