import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/**
 * AES-256-GCM encryption for small secrets stored in MySQL (e.g. TOTP seeds).
 * Output: `v1.<iv>.<tag>.<ciphertext>` (base64url). The `context` string is
 * bound as additional authenticated data (we pass the user ID), so a ciphertext
 * copied onto another user's row fails to decrypt.
 */
export function seal(plaintext: Buffer, key: Buffer, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join('.');
}

/** Throws if the value was tampered with, was sealed for another context, or the key differs. */
export function open(sealed: string, key: Buffer, context: string): Buffer {
  const [version, iv, tag, ciphertext] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) throw new Error('Unsupported sealed value.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]);
}
