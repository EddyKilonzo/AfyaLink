import type { ApiErrorBody } from "@/types";
import { API_URL } from "./config";
import { reportReachable } from "./connectivity";

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

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** The server's request ID, for quoting in support requests. */
  get requestId(): string | undefined {
    const body = this.details as Partial<ApiErrorBody> | undefined;
    return typeof body?.requestId === "string" ? body.requestId : undefined;
  }

  /** Per-field validation messages (400), when the server sent a list. */
  get messages(): string[] {
    const body = this.details as Partial<ApiErrorBody> | undefined;
    if (Array.isArray(body?.message)) return body.message.filter((m): m is string => typeof m === "string");
    return [this.message];
  }
}

export type ApiRequestInit = RequestInit & { timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 15_000;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// A 401 from these means "wrong credentials", not "your session ended".
const CREDENTIAL_PATHS = ["/auth/login"];

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

/** Stores the fresh token returned by login and change-password (avoids an extra round trip). */
export function setCsrfToken(token: string | null | undefined): void {
  if (token) csrfToken = token;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

// Session-expiry notification: lets the auth provider react to a 401 from any call.
type UnauthorizedListener = (path: string) => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized(path: string): void {
  if (CREDENTIAL_PATHS.some((p) => path.startsWith(p))) return;
  for (const listener of unauthorizedListeners) {
    try {
      listener(path);
    } catch (error) {
      console.warn("[AfyaLink] Unauthorized listener failed.", error);
    }
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

/** Performs the fetch with cookie, CSRF header and timeout; returns the raw response. */
async function send(path: string, init: ApiRequestInit, withCsrf: boolean): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (withCsrf && UNSAFE_METHODS.has(method)) headers.set("X-CSRF-Token", await getCsrfToken());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // Honour a caller's abort signal as well as the timeout.
  const onCallerAbort = () => controller.abort();
  init.signal?.addEventListener("abort", onCallerAbort, { once: true });

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    reportReachable(true);
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (init.signal?.aborted) throw error;
      reportReachable(false);
      throw new ApiError("The server took too long to respond.", 0, "timeout");
    }
    reportReachable(false);
    throw new ApiError("Cannot reach the AfyaLink server. Check your connection.", 0, "network");
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", onCallerAbort);
  }
}

async function failFrom(path: string, response: Response): Promise<never> {
  let body: unknown = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error body (e.g. a proxy page); fall back to the status text.
  }
  if (response.status === 401) notifyUnauthorized(path);
  throw new ApiError(messageFrom(body, `Request failed (${response.status}).`), response.status, "http", body);
}

async function request<T>(path: string, init: ApiRequestInit, withCsrf: boolean): Promise<T> {
  const response = await send(path, init, withCsrf);
  if (!response.ok) return failFrom(path, response);
  if (response.status === 204) return undefined as T;

  try {
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new ApiError("The server sent an unreadable response.", response.status, "parse");
  }
}

function isCsrfFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && /csrf/i.test(error.message);
}

/**
 * Calls the AfyaLink API with the session cookie and CSRF header attached.
 * Retries once with a fresh CSRF token if the server rejects the old one
 * (for example after an API restart or a sign-in on another tab).
 */
export async function api<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, init, true);
  } catch (error) {
    if (!isCsrfFailure(error)) throw error;
    await getCsrfToken(true);
    return request<T>(path, init, true);
  }
}

/** Shorthand for JSON bodies. */
export function apiJson<T>(path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown, init: ApiRequestInit = {}): Promise<T> {
  return api<T>(path, { ...init, method, body: body === undefined ? undefined : JSON.stringify(body) });
}

/** Shorthand for FormData bodies (file uploads). */
export function apiForm<T>(path: string, formData: FormData, init: ApiRequestInit = {}): Promise<T> {
  return api<T>(path, { ...init, method: "POST", body: formData });
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

function filenameFrom(disposition: string | null, fallback: string): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  // Keep only safe characters; the name comes from a header.
  const name = match?.[1]?.replace(/[^A-Za-z0-9._-]/g, "_");
  return name || fallback;
}

/** GET a file (e.g. the CSV export) as a Blob. Errors are parsed like `api()`. */
export async function apiDownload(path: string, fallbackName: string, init: ApiRequestInit = {}): Promise<DownloadedFile> {
  const response = await send(path, { ...init, method: "GET", timeoutMs: init.timeoutMs ?? 60_000 }, false);
  if (!response.ok) return failFrom(path, response);
  return { blob: await response.blob(), filename: filenameFrom(response.headers.get("Content-Disposition"), fallbackName) };
}

/** Triggers a browser download for a Blob without leaving an object URL behind. */
export function saveFile({ blob, filename }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Builds `?a=1&b=2`, skipping undefined, null and empty values. */
export function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/** Encodes a single path segment (IDs from URLs or user input). */
export function seg(value: string | number): string {
  return encodeURIComponent(String(value));
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const generic = error.message.startsWith("Request failed (");
    if (error.isRateLimited && generic) return "Too many attempts. Please wait a moment and try again.";
    if (error.status === 503 && generic) return "The server is temporarily unavailable. Please try again shortly.";
    if (error.status >= 500 && error.status !== 503) {
      return error.requestId ? `Something went wrong on the server (ref ${error.requestId}).` : "Something went wrong on the server.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
