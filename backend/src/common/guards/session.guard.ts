import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { SessionPayload } from '../../auth/auth.service.js';
import { SessionRevocationService } from '../../auth/session-revocation.service.js';
import { SESSION_COOKIE } from '../constants.js';
import { IS_PUBLIC_KEY, type AuthenticatedRequest } from '../decorators/auth.decorators.js';

/**
 * Global guard: every route requires a valid, non-revoked session cookie
 * unless marked @Public(). The JWT lives only in an HTTP-only cookie, never in
 * JS-accessible storage.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly revocations: SessionRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Authentication required.');

    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      throw new UnauthorizedException('Session expired or invalid.');
    }
    if (this.revocations.isRevoked(payload.jti)) {
      throw new UnauthorizedException('Session has ended. Please sign in again.');
    }

    request.user = { id: payload.sub, role: payload.role, email: payload.email };
    return true;
  }
}
