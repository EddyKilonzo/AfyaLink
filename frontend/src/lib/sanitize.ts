/**
 * Input sanitization.
 *
 * The API re-validates everything, but user-typed strings still reach the
 * DOM (labels, notes, condition names) and must never carry markup. These
 * helpers strip anything that is not plain text before it is rendered.
 *
 * - `text()` is for anything that becomes visible text (conditions, notes).
 * - `attr()` is for values that land in an attribute (ids, classes, hrefs).
 * - `id()` is stricter: a slug-like identifier only.
 */

/** Strip all HTML and control characters; collapse whitespace. */
export function sanitizeText(input: unknown, maxLen = 2000): string {
  if (input == null) return "";
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ") // control chars
    .replace(/<[^>]*>/g, "") // any tag
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** For values used in attributes: keep alphanumerics, dash, underscore, dot, @, +, space. */
export function sanitizeAttr(input: unknown, maxLen = 120): string {
  if (input == null) return "";
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[^A-Za-z0-9 _\-.@+/]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Slug-like identifier: lowercase alphanumerics, dash, underscore only. */
export function sanitizeId(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

/** Sanitize a list of strings (symptoms). */
export function sanitizeList(input: unknown, maxItems = 20, maxLen = 60): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((s) => sanitizeText(s, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}