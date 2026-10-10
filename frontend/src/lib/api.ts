import { API_URL } from "./config";

/**
 * Error thrown for every failed API call. `kind` lets callers decide what to
 * do without parsing messages: `network` means the server was never reached
 * (offline, DNS, CORS, timeout), so the request is safe to retry later.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: "network" | "timeout" | "http" | "parse",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isRetryable(): boolean {
    return this.kind === "network" || this.kind === "timeout" || this.status === 503 || this.status === 429 || this.status >= 500;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// The CSRF token is kept in memory only. It is not a credential on its own:
// it must match the HTTP-only cookie the API set alongside it.
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;
  csrfRequest ??= request<{ csrfToken: string }>("/auth/csrf", { method: "GET" }, false)
    .then((res) => {
      csrfToken = res.csrfToken;
      return res.csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit & { timeoutMs?: number }, withCsrf: boolean): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (withCsrf && UNSAFE_METHODS.has(method)) headers.set("X-CSRF-Token", await getCsrfToken());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The server took too long to respond.", 0, "timeout");
    }
    throw new ApiError("Cannot reach the AfyaLink server. Check your connection.", 0, "network");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    if (response.ok) throw new ApiError("The server sent an unreadable response.", response.status, "parse");
  }

  if (!response.ok) {
    throw new ApiError(messageFrom(body, `Request failed (${response.status}).`), response.status, "http", body);
  }
  return body as T;
}

/**
 * Calls the AfyaLink API with the session cookie and CSRF header attached.
 * Retries once with a fresh CSRF token if the server rejects the old one
 * (for example after an API restart).
 */
export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  try {
    return await request<T>(path, init, true);
  } catch (error) {
    const isCsrfFailure =
      error instanceof ApiError && error.status === 403 && /csrf/i.test(error.message);
    if (!isCsrfFailure) throw error;
    await getCsrfToken(true);
    return request<T>(path, init, true);
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
