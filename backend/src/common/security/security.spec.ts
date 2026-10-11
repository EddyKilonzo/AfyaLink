import { randomBytes } from 'node:crypto';
import { open, seal } from './secret-box.js';
import { base32Decode, base32Encode, otpauthUrl, totpAt, verifyTotp } from './totp.js';

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 appendix B, SHA-1 key "12345678901234567890": T=59 s -> 94287082 (8 digits) -> 287082.
  const rfcSecret = Buffer.from('12345678901234567890');

  it('matches the RFC 6238 test vector', () => {
    expect(totpAt(rfcSecret, Math.floor(59 / 30))).toBe('287082');
    expect(totpAt(rfcSecret, Math.floor(1111111109 / 30))).toBe('081804');
  });

  it('round-trips base32', () => {
    const secret = randomBytes(20);
    expect(base32Decode(base32Encode(secret)).equals(secret)).toBe(true);
    expect(base32Encode(rfcSecret)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('accepts the current and adjacent steps only', () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, step), now)).toBe(step);
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, step + 1), now)).toBe(step + 1);
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, step + 2), now)).toBeNull();
  });

  it('rejects malformed codes', () => {
    expect(verifyTotp(rfcSecret, '12345')).toBeNull();
    expect(verifyTotp(rfcSecret, 'abcdef')).toBeNull();
  });

  it('builds an otpauth URL authenticator apps understand', () => {
    const url = otpauthUrl(rfcSecret, 'chv@afyalink.test');
    expect(url).toMatch(/^otpauth:\/\/totp\/AfyaLink:chv%40afyalink\.test\?/);
    expect(url).toContain('secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(url).toContain('period=30');
  });
});

describe('secret box (AES-256-GCM)', () => {
  const key = randomBytes(32);
  const secret = Buffer.from('totp-seed');

  it('round-trips with the same key and context', () => {
    expect(open(seal(secret, key, 'user-1'), key, 'user-1').equals(secret)).toBe(true);
  });

  it('uses a fresh IV each time', () => {
    expect(seal(secret, key, 'user-1')).not.toBe(seal(secret, key, 'user-1'));
  });

  it('fails for another user, another key, or a tampered value', () => {
    const sealed = seal(secret, key, 'user-1');
    expect(() => open(sealed, key, 'user-2')).toThrow();
    expect(() => open(sealed, randomBytes(32), 'user-1')).toThrow();
    const parts = sealed.split('.');
    parts[3] = Buffer.from('x').toString('base64url') + parts[3].slice(2);
    expect(() => open(parts.join('.'), key, 'user-1')).toThrow();
  });
});
