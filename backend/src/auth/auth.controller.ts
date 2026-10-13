import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuditService } from '../audit/audit.service.js';
import { CSRF_COOKIE, SESSION_COOKIE } from '../common/constants.js';
import {
  CurrentUser,
  Public,
  type SessionUser,
} from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import type { AppConfig } from '../config/configuration.js';
import { MailService } from '../mail/mail.service.js';
import type { AccountEmail } from '../mail/mail.templates.js';
import { AuthService } from './auth.service.js';
import { ANONYMOUS_BINDING, CsrfService } from './csrf.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MfaCodeDto, MfaDisableDto, MfaSetupDto } from './dto/mfa.dto.js';
import { MfaService } from './mfa.service.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
    private readonly mfa: MfaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * Issues a CSRF token bound to the current session (or to "anonymous"):
   * set in an HTTP-only cookie and returned for the client to echo in X-CSRF-Token.
   */
  @Public()
  @Get('csrf')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getCsrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return { csrfToken: this.setCsrfCookie(res, await this.csrf.bindingFor(req)) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /auth/csrf');
    }
  }

  /** Returns the user and a new CSRF token bound to the new session. */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const { token, jti, user } = await this.auth.login(dto.email, dto.password, dto.otp);
      this.setSessionCookie(res, token);
      return { user, csrfToken: this.setCsrfCookie(res, jti) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/login');
    }
  }

  /** Clears the session and replaces the CSRF cookie with an anonymous one. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      await this.auth.logout(sessionCookie(req));
      res.clearCookie(SESSION_COOKIE, this.cookieOptions());
      this.setCsrfCookie(res, ANONYMOUS_BINDING);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/logout');
    }
  }

  /** Signs the caller out on every device ("I lost my phone"). */
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async logoutAll(
    @CurrentUser() session: SessionUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    try {
      await this.auth.logoutAll(session, sessionCookie(req));
      await this.notify(session, { kind: 'signed_out_everywhere' });
      res.clearCookie(SESSION_COOKIE, this.cookieOptions());
      this.setCsrfCookie(res, ANONYMOUS_BINDING);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/logout-all');
    }
  }

  @Get('me')
  async me(@CurrentUser() session: SessionUser) {
    try {
      return { user: await this.auth.me(session) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /auth/me');
    }
  }

  /** Requires the current password. Signs out every other session and issues a new cookie. */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() session: SessionUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { token, jti, user } = await this.auth.changePassword(
        session,
        sessionCookie(req),
        dto.currentPassword,
        dto.newPassword,
      );
      this.setSessionCookie(res, token);
      this.mail.notifyAccount(user, { kind: 'password_changed' });
      return { user, csrfToken: this.setCsrfCookie(res, jti) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/change-password');
    }
  }

  @Post('profile/picture')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadProfilePicture(
    @CurrentUser() session: SessionUser,
    @UploadedFile() file: Express.Multer.File,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded.');
      }
      const user = await this.auth.updateProfilePicture(session, file);
      return { user, csrfToken: this.setCsrfCookie(res, session.id) };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/profile/picture');
    }
  }

  /** Step 1 of two-factor enrolment: returns a secret and otpauth:// URL for an authenticator app. */
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async mfaSetup(@CurrentUser() session: SessionUser, @Body() dto: MfaSetupDto) {
    try {
      return await this.mfa.setup(session.id, dto.password);
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/mfa/setup');
    }
  }

  /** Step 2: confirms the app works by submitting a current code. */
  @Post('mfa/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async mfaEnable(@CurrentUser() session: SessionUser, @Body() dto: MfaCodeDto): Promise<void> {
    try {
      await this.mfa.enable(session.id, dto.code);
      await this.audit.record('auth.mfa_enable', { actorId: session.id, targetType: 'user', targetId: session.id });
      await this.notify(session, { kind: 'mfa_enabled' });
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/mfa/enable');
    }
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async mfaDisable(@CurrentUser() session: SessionUser, @Body() dto: MfaDisableDto): Promise<void> {
    try {
      await this.mfa.disable(session.id, dto.password, dto.code);
      await this.audit.record('auth.mfa_disable', { actorId: session.id, targetType: 'user', targetId: session.id });
      await this.notify(session, { kind: 'mfa_disabled' });
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/mfa/disable');
    }
  }

  /** Security notice to the account owner. Never fails the request it follows. */
  private async notify(session: SessionUser, event: AccountEmail): Promise<void> {
    try {
      this.mail.notifyAccount(await this.auth.me(session), event);
    } catch {
      this.logger.warn(`Could not load user for ${event.kind} email.`);
    }
  }

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.config.get('auth', { infer: true }).sessionTtlSeconds * 1000,
    });
  }

  private setCsrfCookie(res: Response, binding: string): string {
    const csrfToken = this.csrf.issue(binding);
    res.cookie(CSRF_COOKIE, csrfToken, this.cookieOptions());
    return csrfToken;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('auth', { infer: true }).cookieSecure,
      sameSite: 'lax',
      path: '/',
    };
  }
}

function sessionCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}
