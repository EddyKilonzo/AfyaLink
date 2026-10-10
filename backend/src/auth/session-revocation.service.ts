import { Injectable } from '@nestjs/common';

/**
 * Remembers session IDs (JWT `jti`) that were logged out, until they expire,
 * so a copied session cookie stops working after logout.
 * In-memory: per instance and cleared on restart; move to a shared store
 * (e.g. Redis or a MySQL table) for multi-instance deployments.
 */
@Injectable()
export class SessionRevocationService {
  private readonly revoked = new Map<string, number>();

  revoke(jti: string, expiresAtMs: number): void {
    this.prune();
    this.revoked.set(jti, expiresAtMs);
  }

  isRevoked(jti: string | undefined): boolean {
    if (!jti) return true; // tokens without an ID are not issued by this API
    const expiresAt = this.revoked.get(jti);
    return expiresAt !== undefined && expiresAt > Date.now();
  }

  private prune(): void {
    const now = Date.now();
    for (const [jti, expiresAt] of this.revoked) {
      if (expiresAt <= now) this.revoked.delete(jti);
    }
  }
}
