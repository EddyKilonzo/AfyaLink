import { vi } from "vitest";

export interface MockCall {
  url: string;
  method: string;
  headers: Headers;
  body: unknown;
}

type Handler = (call: MockCall) => Response | Promise<Response>;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * Replaces global fetch. Routes are matched by "METHOD /path" (path after /api).
 * `/auth/csrf` answers with a token unless a route overrides it.
 */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: MockCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    const call = { url, method, headers, body };
    calls.push(call);
    const path = new URL(url).pathname.replace(/^\/api/, "");
    const handler = routes[`${method} ${path}`] ?? (path === "/auth/csrf" ? () => json({ csrfToken: "csrf-1" }) : undefined);
    if (!handler) throw new Error(`Unexpected request ${method} ${path}`);
    return handler(call);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock, callsTo: (method: string, path: string) => calls.filter((c) => c.method === method && c.url.endsWith(path)) };
}
