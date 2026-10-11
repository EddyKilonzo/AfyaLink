import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { toHttpException } from '../common/errors/handle-error.js';
import { open, seal } from '../common/security/secret-box.js';
import { generateTotpSecret, otpauthUrl, base32Encode, verifyTotp } from '../common/security/totp.js';
import type { AppConfig } from '../config/configuration.js';
import { DatabaseService } from '../database/database.service.js';
import { User } from '../database/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';

/**
 * Optional TOTP two-factor sign-in (any authenticator app).
 * Flow: setup (password required) -> scan the otpauth URL -> enable with a
 * code -> every later sign-in needs a code. Secrets are encrypted at rest and
 * each code can be used only once.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly key: Buffer;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly usersService: UsersService,
    private readonly db: DatabaseService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.key = config.get('auth', { infer: true }).mfaKey;
  }

  /** Starts enrolment: stores a new (not yet active) secret and returns it for the authenticator app. */
  async setup(userId: string, password: string): Promise<{ secret: string; otpauthUrl: string }> {
    try {
      const user = await this.loadWithSecrets(userId);
      await this.assertPassword(user, password);
      if (user.mfaEnabled) throw new ConflictException('Two-factor sign-in is already enabled.');

      const secret = generateTotpSecret();
      await this.users.update(
        { id: userId },
        { mfaSecret: seal(secret, this.key, userId), mfaLastStep: null },
      );
      return { secret: base32Encode(secret), otpauthUrl: otpauthUrl(secret, user.email) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'Set up two-factor');
    }
  }

  async enable(userId: string, code: string): Promise<void> {
    try {
      const user = await this.loadWithSecrets(userId);
      if (user.mfaEnabled) throw new ConflictException('Two-factor sign-in is already enabled.');
      if (!user.mfaSecret) throw new BadRequestException('Start two-factor setup first.');
      if (!(await this.consumeCode(user, code))) throw new BadRequestException('Invalid one-time code.');
      await this.users.update({ id: userId }, { mfaEnabled: true });
      this.usersService.invalidateSession(userId);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Enable two-factor');
    }
  }

  async disable(userId: string, password: string, code: string): Promise<void> {
    try {
      const user = await this.loadWithSecrets(userId);
      await this.assertPassword(user, password);
      if (!user.mfaEnabled) throw new BadRequestException('Two-factor sign-in is not enabled.');
      if (!(await this.consumeCode(user, code))) throw new BadRequestException('Invalid one-time code.');
      await this.clear(userId);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Disable two-factor');
    }
  }

  /** ADMIN recovery for a lost device. Also ends the user's sessions. */
  async reset(userId: string): Promise<void> {
    try {
      this.db.assertReady();
      if (!(await this.users.existsBy({ id: userId }))) throw new NotFoundException('User not found.');
      await this.clear(userId, new Date());
    } catch (error) {
      throw toHttpException(error, this.logger, 'Reset two-factor');
    }
  }

  /** For sign-in: true only for a valid, not previously used code. */
  async verifyForLogin(userId: string, code: string): Promise<boolean> {
    const user = await this.loadWithSecrets(userId);
    return user.mfaEnabled && (await this.consumeCode(user, code));
  }

  private async consumeCode(user: User, code: string): Promise<boolean> {
    if (!user.mfaSecret) return false;
    let secret: Buffer;
    try {
      secret = open(user.mfaSecret, this.key, user.id);
    } catch {
      // Wrong key (e.g. MFA_ENCRYPTION_KEY changed) or tampered value. Fail closed.
      this.logger.error('Stored two-factor secret could not be decrypted.');
      return false;
    }
    const step = verifyTotp(secret, code);
    if (step === null) return false;

    // Atomic: only one request can claim a given step, so a code is single-use.
    const result = await this.users
      .createQueryBuilder()
      .update(User)
      .set({ mfaLastStep: String(step) })
      .where('id = :id', { id: user.id })
      .andWhere('(mfa_last_step IS NULL OR mfa_last_step < :step)', { step })
      .execute();
    return result.affected === 1;
  }

  private async clear(userId: string, endSessionsAt?: Date): Promise<void> {
    await this.users.update(
      { id: userId },
      {
        mfaEnabled: false,
        mfaSecret: null,
        mfaLastStep: null,
        ...(endSessionsAt ? { tokensValidAfter: endSessionsAt } : {}),
      },
    );
    this.usersService.invalidateSession(userId);
  }

  private async loadWithSecrets(userId: string): Promise<User> {
    this.db.assertReady();
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.mfaSecret', 'user.mfaLastStep'])
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user || !user.isActive) throw new UnauthorizedException('Account is no longer active.');
    return user;
  }

  private async assertPassword(user: User, password: string): Promise<void> {
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect.');
    }
  }
}
