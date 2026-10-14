/**
 * External-link hardening. Internal links stay plain: they are same-origin and
 * not a leak vector. External links get:
 *  - `rel="noopener noreferrer nofollow"` — stops reverse tabnabbing and
 *    stops search engines from ranking partner pages we never asked for.
 *  - `target="_blank"` is implied by noopener (kept explicit for clarity).
 *
 * This is a soft layer on top of the Content-Security-Policy, which is the
 * real enforcement: `default-src 'self'` plus `connect-src` to our own API and
 * the tile provider means the browser refuses to load scripts or XHR data from
 * anywhere else, so an obfuscated link is only decoration.
 */
export function externalRel(extra?: string): string {
  const base = "noopener noreferrer nofollow";
  return extra ? `${base} ${extra}` : base;
}

/** True when a URL points off our own origin. */
export function isExternal(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return u.origin !== (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  } catch {
    return false; // relative path — treat as internal
  }
}