import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { CSRF_COOKIE, SESSION_COOKIE } from '../common/constants.js';
import {
  CurrentUser,
  Public,
  type SessionUser,
} from '../common/decorators/auth.decorators.js';
import { toHttpException } from '../common/errors/handle-error.js';
import type { AppConfig } from '../config/configuration.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Issues a CSRF token: set in an HTTP-only cookie and returned for the client to echo in X-CSRF-Token. */
  @Public()
  @Get('csrf')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  csrf(@Res({ passthrough: true }) res: Response) {
    try {
      const csrfToken = randomBytes(32).toString('base64url');
      res.cookie(CSRF_COOKIE, csrfToken, this.cookieOptions());
      return { csrfToken };
    } catch (error) {
      throw toHttpException(error, this.logger, 'GET /auth/csrf');
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const { token, user } = await this.auth.login(dto.email, dto.password);
      res.cookie(SESSION_COOKIE, token, {
        ...this.cookieOptions(),
        maxAge: this.config.get('auth', { infer: true }).sessionTtlSeconds * 1000,
      });
      return { user };
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/login');
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
      await this.auth.logout(token);
      res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    } catch (error) {
      throw toHttpException(error, this.logger, 'POST /auth/logout');
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

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get('auth', { infer: true }).cookieSecure,
      sameSite: 'lax',
      path: '/',
    };
  }
}
