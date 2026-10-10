import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { AppConfig } from '../../config/configuration.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../constants.js';
import { SKIP_CSRF_KEY } from '../decorators/auth.decorators.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF protection for cookie-authenticated requests.
 * The client fetches a token from GET /api/auth/csrf (which also sets it in an
 * HTTP-only cookie), keeps it in memory, and echoes it in the X-CSRF-Token
 * header on every state-changing request. A cross-site attacker can make the
 * browser send the cookie but cannot read the token to set the header.
 * The Origin header, when present, must also be an allowed origin.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const origin = request.headers.origin;
    if (origin && !this.config.get('corsOrigins', { infer: true }).includes(origin)) {
      throw new ForbiddenException('Origin not allowed.');
    }

    const cookieToken = (request.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];
    const headerToken = request.headers[CSRF_HEADER];
    if (!cookieToken || typeof headerToken !== 'string' || !safeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException('Invalid or missing CSRF token.');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
