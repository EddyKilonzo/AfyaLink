import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { CsrfService } from '../../auth/csrf.service.js';
import type { AppConfig } from '../../config/configuration.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../constants.js';
import { SKIP_CSRF_KEY } from '../decorators/auth.decorators.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie-authenticated requests.
 * The client fetches a token from GET /api/auth/csrf (which also sets it in an
 * HTTP-only cookie), keeps it in memory, and echoes it in the X-CSRF-Token
 * header on every state-changing request. The request passes only when:
 *   1. the Origin header, if present, is an allowed origin;
 *   2. the header equals the cookie (double submit); and
 *   3. the token's HMAC is bound to the request's current session (see CsrfService).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly csrf: CsrfService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
    if (
      !cookieToken ||
      typeof headerToken !== 'string' ||
      !safeEqual(cookieToken, headerToken) ||
      !this.csrf.verify(headerToken, await this.csrf.bindingFor(request))
    ) {
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
