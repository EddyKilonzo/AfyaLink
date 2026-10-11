import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { SESSION_COOKIE } from '../common/constants.js';
import type { AppConfig } from '../config/configuration.js';
import type { SessionPayload } from './auth.service.js';

/** Binding used when the request has no valid session (e.g. the login form). */
export const ANONYMOUS_BINDING = 'anonymous';

/**
 * Session-bound CSRF tokens (OWASP "signed double-submit cookie").
 *
 * A token is `<nonce>.<HMAC(key, nonce | binding)>`, where the binding is the
 * session ID (JWT `jti`) of the request's session cookie, or "anonymous". A
 * request passes only if the X-CSRF-Token header equals the CSRF cookie AND
 * the HMAC matches the current session. So an attacker who manages to plant
 * cookies (e.g. from a sibling subdomain) still cannot produce a token that
 * works with the victim's session, because they don't have the key.
 *
 * Sign-in, password change and logout change the session, so they issue a
 * fresh token. Clients that hold an old token get 403 and fetch a new one.
 */
@Injectable()
export class CsrfService {
  private readonly key: Buffer;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly jwt: JwtService,
  ) {
    const secret = config.get('auth', { infer: true }).jwtSecret;
    this.key = Buffer.from(hkdfSync('sha256', secret, '', 'afyalink-csrf-key', 32));
  }

  issue(binding: string): string {
    const nonce = randomBytes(24).toString('base64url');
    return `${nonce}.${this.mac(nonce, binding)}`;
  }

  verify(token: string, binding: string): boolean {
    const dot = token.indexOf('.');
    if (dot <= 0 || dot === token.length - 1 || token.length > 200) return false;
    const expected = Buffer.from(this.mac(token.slice(0, dot), binding));
    const actual = Buffer.from(token.slice(dot + 1));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /** The session ID of a validly signed session cookie, else the anonymous binding. */
  async bindingFor(request: Request): Promise<string> {
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) return ANONYMOUS_BINDING;
    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);
      return payload.jti ?? ANONYMOUS_BINDING;
    } catch {
      return ANONYMOUS_BINDING;
    }
  }

  private mac(nonce: string, binding: string): string {
    return createHmac('sha256', this.key).update(`${nonce}|${binding}`).digest('base64url');
  }
}
