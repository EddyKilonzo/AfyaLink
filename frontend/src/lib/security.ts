import type { User, UserRole } from "@/types";

/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  CHV: "/dashboard",
  ADMIN: "/admin",
};

/** Paths only some roles may open. The API enforces the same rules on every call. */
const ROLE_PREFIXES: { prefix: string; roles: UserRole[] }[] = [{ prefix: "/admin", roles: ["ADMIN"] }];

export function canAccessPath(path: string, role: UserRole): boolean {
  const rule = ROLE_PREFIXES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`));
  return !rule || rule.roles.includes(role);
}

/**
 * Validates a `?next=` value before redirecting to it after sign-in.
 * Only same-origin, absolute paths are allowed: no `//host`, `/\host`,
 * schemes, control characters, or a path the role cannot open.
 */
export function safeNextPath(next: string | null | undefined, user: Pick<User, "role">): string {
  const fallback = HOME_BY_ROLE[user.role];
  if (!next || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f\u007f]/.test(next)) {
    return fallback;
  }
  try {
    const url = new URL(next, "http://afyalink.invalid");
    if (url.origin !== "http://afyalink.invalid") return fallback;
    if (url.pathname === "/login" || !canAccessPath(url.pathname, user.role)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** `/login?next=<current path>` for redirecting anonymous visitors. */
export function loginUrlFor(pathname: string, search = ""): string {
  if (!pathname || pathname === "/login") return "/login";
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route params are user input: check IDs before putting them in API paths. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
