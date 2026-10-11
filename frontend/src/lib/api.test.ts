import { json, mockFetch } from "@/test/fetch-mock";

// api.ts keeps the CSRF token in module state: load a fresh copy per test.
async function loadApi() {
  vi.resetModules();
  return import("./api");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api()", () => {
  it("sends cookies and a CSRF header on unsafe methods only", async () => {
    const { api } = await loadApi();
    const net = mockFetch({ "GET /reports": () => json({ items: [] }), "POST /reports": () => json({ ok: true }, 201) });
    await api("/reports");
    await api("/reports", { method: "POST", body: "{}" });

    const [get] = net.callsTo("GET", "/reports");
    const [post] = net.callsTo("POST", "/reports");
    expect(get?.headers.has("X-CSRF-Token")).toBe(false);
    expect(post?.headers.get("X-CSRF-Token")).toBe("csrf-1");
    expect(net.fetchMock.mock.calls.every(([, init]) => init?.credentials === "include")).toBe(true);
  });

  it("refreshes the CSRF token once and retries on a CSRF 403", async () => {
    const { api } = await loadApi();
    let attempts = 0;
    let csrf = 0;
    mockFetch({
      "GET /auth/csrf": () => json({ csrfToken: `csrf-${++csrf}` }),
      "POST /sync": ({ headers }) => {
        attempts++;
        return headers.get("X-CSRF-Token") === "csrf-2" ? json({ ok: true }) : json({ statusCode: 403, message: "Invalid or missing CSRF token." }, 403);
      },
    });
    await expect(api("/sync", { method: "POST", body: "{}" })).resolves.toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it("reuses the token returned by login instead of fetching one", async () => {
    const { api, setCsrfToken } = await loadApi();
    const net = mockFetch({ "POST /reports": () => json({}) });
    setCsrfToken("from-login");
    await api("/reports", { method: "POST", body: "{}" });
    expect(net.callsTo("GET", "/auth/csrf")).toHaveLength(0);
    expect(net.callsTo("POST", "/reports")[0]?.headers.get("X-CSRF-Token")).toBe("from-login");
  });

  it("notifies session listeners on 401, except for wrong sign-in credentials", async () => {
    const { api, onUnauthorized, ApiError } = await loadApi();
    mockFetch({
      "GET /reports": () => json({ statusCode: 401, message: "Session expired." }, 401),
      "POST /auth/login": () => json({ statusCode: 401, message: "Invalid email or password." }, 401),
    });
    const listener = vi.fn();
    onUnauthorized(listener);

    await expect(api("/reports")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledWith("/reports");
    await expect(api("/auth/login", { method: "POST", body: "{}" })).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("classifies network failures as retryable", async () => {
    const { api } = await loadApi();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(api("/health")).rejects.toMatchObject({ kind: "network", isRetryable: true });
  });

  it("exposes validation messages and the request ID", async () => {
    const { api, ApiError, toErrorMessage } = await loadApi();
    mockFetch({
      "POST /users": () => json({ statusCode: 400, message: ["email must be an email", "role is invalid"], requestId: "req-1" }, 400),
      "GET /boom": () => json({ statusCode: 500, message: "Internal server error", requestId: "req-9" }, 500),
    });
    const error = await api("/users", { method: "POST", body: "{}" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).messages).toEqual(["email must be an email", "role is invalid"]);
    expect(toErrorMessage(await api("/boom").catch((e: unknown) => e))).toBe("Something went wrong on the server (ref req-9).");
  });
});

describe("toQuery / apiDownload", () => {
  it("skips empty values and encodes the rest", async () => {
    const { toQuery } = await loadApi();
    expect(toQuery({ q: "a&b", page: 1, role: undefined, x: "", y: null, ok: false })).toBe("?q=a%26b&page=1&ok=false");
    expect(toQuery({})).toBe("");
  });

  it("sanitises the downloaded filename from Content-Disposition", async () => {
    const { apiDownload } = await loadApi();
    mockFetch({
      "GET /reports/export": () =>
        new Response("id\r\n", { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="../../evil name.csv"' } }),
    });
    const file = await apiDownload("/reports/export", "fallback.csv");
    expect(file.filename).toBe(".._.._evil_name.csv");
    expect(await file.blob.text()).toBe("id\r\n");
  });
});
