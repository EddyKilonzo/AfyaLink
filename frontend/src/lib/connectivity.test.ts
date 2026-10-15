import { json, mockFetch } from "@/test/fetch-mock";

// Both modules keep state at module level: load fresh copies per test.
async function load() {
  vi.resetModules();
  const connectivity = await import("./connectivity");
  const { api } = await import("./api");
  return { ...connectivity, api };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("connectivity", () => {
  it("marks the server unreachable when a request cannot connect, and reachable again on any response", async () => {
    const { api, getReachable, subscribeReachable, reportReachable } = await load();
    vi.useFakeTimers(); // keep the background probe from firing mid-test
    vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal("document", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const changes: (boolean | null)[] = [];
    const unsubscribe = subscribeReachable(() => changes.push(getReachable()));

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api("/reports")).rejects.toMatchObject({ kind: "network" });
    expect(getReachable()).toBe(false);

    // A 404 still proves the server answered.
    mockFetch({ "GET /reports/x": () => json({ message: "Not found" }, 404) });
    await expect(api("/reports/x")).rejects.toMatchObject({ status: 404 });
    expect(getReachable()).toBe(true);

    reportReachable(true); // unchanged: no extra notification
    expect(changes).toEqual([false, true]);
    unsubscribe();
  });

  it("probes the API's own health endpoint, not the page origin", async () => {
    const { probeNow, getReachable } = await load();
    vi.stubGlobal("navigator", { onLine: true });
    const net = mockFetch({ "GET /health": () => json({ status: "ok" }) });
    await probeNow();
    expect(net.callsTo("GET", "/health")).toHaveLength(1);
    expect(getReachable()).toBe(true);
  });

  it("reports unreachable without probing when the browser is offline", async () => {
    const { probeNow, getReachable } = await load();
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await probeNow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getReachable()).toBe(false);
  });
});
