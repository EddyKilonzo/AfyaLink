import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { BCRYPT_ROUNDS } from '../common/constants.js';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import { currentIp } from '../common/request-context.js';
import type { User } from '../database/entities/user.entity.js';
import { toPublicUser, UsersService, type PublicUser } from '../users/users.service.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { MfaService } from './mfa.service.js';
import { SessionRevocationService } from './session-revocation.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';

// Compared against when the email is unknown so response timing does not
// reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('afyalink-timing-equaliser', BCRYPT_ROUNDS);

export interface SessionPayload {
  sub: string;
  role: SessionUser['role'];
  email: string;
  jti?: string;
  iat?: number;
  /** Issue time in milliseconds, compared with users.tokens_valid_after. */
  iatMs?: number;
  exp?: number;
}

/** A newly issued session: the cookie value and its session ID (for binding the CSRF token). */
export interface IssuedSession {
  token: string;
  jti: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly attempts: LoginAttemptsService,
    private readonly revocations: SessionRevocationService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Password sign-in, plus a one-time code when the account has two-factor
   * enabled. Unknown email, wrong password and inactive account all get the
   * same message. A missing code is reported only after a correct password.
   */
  async login(email: string, password: string, otp?: string): Promise<IssuedSession> {
    const ip = currentIp();
    try {
      this.attempts.assertNotLocked(email, ip);

      const user = await this.users.findByEmailWithPassword(email);
      const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid || !user.isActive) {
        await this.fail(email, ip, user?.id ?? null, 'invalid_credentials');
        throw new UnauthorizedException('Invalid email or password.');
      }

      if (user.mfaEnabled) {
        if (!otp) throw new UnauthorizedException('One-time code required.');
        if (!(await this.mfa.verifyForLogin(user.id, otp))) {
          await this.fail(email, ip, user.id, 'invalid_otp');
          throw new UnauthorizedException('Invalid one-time code.');
        }
      }

      this.attempts.recordSuccess(email, ip);
      await this.users.recordLogin(user.id);
      await this.audit.record('auth.login', { actorId: user.id, targetType: 'user', targetId: user.id });
      return await this.issue(user);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Login');
    }
  }

  /** Revokes the session token (if valid) so the cookie cannot be replayed after logout. */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      return; // Expired or invalid token: nothing to revoke. Logout still clears the cookie.
    }
    if (payload.jti && payload.exp) await this.revocations.revoke(payload.jti, payload.sub, payload.exp * 1000);
  }

  /** Ends every session of the caller, on every device, including this one. */
  async logoutAll(session: SessionUser, token: string | undefined): Promise<void> {
    try {
      await this.users.endAllSessions(session.id);
      await this.logout(token);
      await this.audit.record('auth.logout_all', { actorId: session.id, targetType: 'user', targetId: session.id });
    } catch (error) {
      throw toHttpException(error, this.logger, 'Logout everywhere');
    }
  }

  /**
   * Changes the caller's password. Every existing session of the user (on any
   * device) stops working; the caller gets a fresh session back.
   */
  async changePassword(
    session: SessionUser,
    currentToken: string | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<IssuedSession> {
    try {
      await this.users.changeOwnPassword(session.id, currentPassword, newPassword);
      await this.logout(currentToken);
      const user = await this.users.findById(session.id);
      if (!user || !user.isActive) throw new UnauthorizedException('Account is no longer active.');
      await this.audit.record('auth.password_change', { actorId: user.id, targetType: 'user', targetId: user.id });
      return await this.issue(user);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Change password');
    }
  }

  async me(session: SessionUser): Promise<PublicUser> {
    try {
      const user = await this.users.findById(session.id);
      if (!user || !user.isActive) throw new UnauthorizedException('Account is no longer active.');
      return toPublicUser(user);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Load current user');
    }
  }

  async updateProfilePicture(
    session: SessionUser,
    file: Express.Multer.File,
  ): Promise<PublicUser> {
    try {
      const folder = `afyalink/users/${session.id}/avatar`;
      const publicId = `avatar-${session.id}`;
      const result = await this.cloudinary.uploadImage(file, folder, publicId);
      const avatarUrl = result.secure_url;
      return await this.users.updateAvatar(session.id, avatarUrl);
    } catch (error) {
      throw toHttpException(error, this.logger, 'Update profile picture');
    }
  }

  private async fail(email: string, ip: string | null, userId: string | null, reason: string): Promise<void> {
    this.attempts.recordFailure(email, ip);
    // The attempted email is not stored: for unknown accounts it may be someone's real address.
    await this.audit.record('auth.login_failed', {
      targetType: userId ? 'user' : undefined,
      targetId: userId,
      details: { reason },
    });
  }

  private async issue(user: User): Promise<IssuedSession> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email, iatMs: Date.now() },
      { jwtid: jti },
    );
    return { token, jti, user: toPublicUser(user) };
  }
}
