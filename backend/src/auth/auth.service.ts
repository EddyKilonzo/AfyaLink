import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { BCRYPT_ROUNDS } from '../common/constants.js';
import type { SessionUser } from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import type { User } from '../database/entities/user.entity.js';
import { toPublicUser, UsersService, type PublicUser } from '../users/users.service.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { SessionRevocationService } from './session-revocation.service.js';

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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly attempts: LoginAttemptsService,
    private readonly revocations: SessionRevocationService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
    try {
      this.attempts.assertNotLocked(email);

      const user = await this.users.findByEmailWithPassword(email);
      const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid || !user.isActive) {
        this.attempts.recordFailure(email);
        // Same message for unknown email, wrong password and inactive account.
        throw new UnauthorizedException('Invalid email or password.');
      }

      this.attempts.recordSuccess(email);
      await this.users.recordLogin(user.id);
      return { token: await this.issueToken(user), user: toPublicUser(user) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'Login');
    }
  }

  /** Revokes the session token (if valid) so the cookie cannot be replayed after logout. */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);
      if (payload.jti && payload.exp) this.revocations.revoke(payload.jti, payload.exp * 1000);
    } catch {
      // Expired or invalid token: nothing to revoke. Logout still clears the cookie.
    }
  }

  /**
   * Changes the caller's password. Every existing session of the user (on any
   * device) stops working; the caller gets a fresh session token back.
   */
  async changePassword(
    session: SessionUser,
    currentToken: string | undefined,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ token: string; user: PublicUser }> {
    try {
      await this.users.changeOwnPassword(session.id, currentPassword, newPassword);
      await this.logout(currentToken);
      const user = await this.users.findById(session.id);
      if (!user || !user.isActive) throw new UnauthorizedException('Account is no longer active.');
      return { token: await this.issueToken(user), user: toPublicUser(user) };
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

  private issueToken(user: Pick<User, 'id' | 'role' | 'email'>): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email, iatMs: Date.now() },
      { jwtid: randomUUID() },
    );
  }
}
