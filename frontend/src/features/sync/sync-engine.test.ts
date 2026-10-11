import { getDb } from "@/lib/db";
import { json, mockFetch } from "@/test/fetch-mock";
import type { ReportPayload } from "@/types";
import { discardLocalReport, purgeSyncedReports, retryReport, saveReportLocally, syncPendingReports } from "./sync-engine";

const OWNER = "user-1";

function payload(id: string, overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    id,
    category: "DISEASE_CASE",
    conditionName: "Malaria",
    severity: "MODERATE",
    casesCount: 2,
    ageGroup: "MIXED",
    observedAt: "2026-10-10T08:00:00.000Z",
    clientCreatedAt: "2026-10-10T08:05:00.000Z",
    ...overrides,
  };
}

/** Answers POST /sync with a per-item status chosen by the test. */
function syncServer(statusFor: (id: string) => "created" | "duplicate" | "rejected") {
  return mockFetch({
    "POST /sync": ({ body }) => {
      const reports = (body as { reports: ReportPayload[] }).reports;
      return json({
        status: "SUCCESS",
        summary: { received: reports.length, created: 0, duplicates: 0, rejected: 0 },
        results: reports.map((r) => {
          const status = statusFor(r.id);
          return status === "rejected" ? { id: r.id, status, reason: "Invalid fields: casesCount" } : { id: r.id, status };
        }),
        serverTime: new Date().toISOString(),
      });
    },
  });
}

const stateOf = async (id: string) => (await getDb().reports.get(id))?.syncState;

beforeEach(async () => {
  await getDb().reports.clear();
  await getDb().meta.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  const { getDb, __resetDb } = await import("@/lib/db");
  const db = getDb();
  if (db && db.close) db.close();
  __resetDb();
});

describe("sync engine", () => {
  it("saves locally as pending without touching the network", async () => {
    const net = mockFetch({});
    await saveReportLocally(OWNER, payload("r1"));
    expect(await stateOf("r1")).toBe("pending");
    expect(net.fetchMock).not.toHaveBeenCalled();
  });

  it("marks reports synced only when the server answers created or duplicate", async () => {
    await saveReportLocally(OWNER, payload("new"));
    await saveReportLocally(OWNER, payload("dup"));
    syncServer((id) => (id === "new" ? "created" : "duplicate"));

    const result = await syncPendingReports(OWNER, { force: true });
    expect(result).toMatchObject({ attempted: 2, synced: 2, failed: 0 });
    expect(await stateOf("new")).toBe("synced");
    expect(await stateOf("dup")).toBe("synced");
  });

  it("sends only API fields (no local bookkeeping)", async () => {
    await saveReportLocally(OWNER, payload("r1", { locationId: 3 }));
    const net = syncServer(() => "created");
    await syncPendingReports(OWNER, { force: true });
    const sent = (net.callsTo("POST", "/sync")[0]?.body as { reports: Record<string, unknown>[] }).reports[0];
    expect(sent).toMatchObject({ id: "r1", locationId: 3 });
    for (const key of ["ownerId", "syncState", "attempts", "lastError", "retryable", "nextAttemptAt"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });

  it("does not auto-retry a validation rejection, but a manual retry re-queues it", async () => {
    await saveReportLocally(OWNER, payload("bad"));
    syncServer(() => "rejected");
    await syncPendingReports(OWNER, { force: true });

    const failed = await getDb().reports.get("bad");
    expect(failed).toMatchObject({ syncState: "failed", retryable: false, lastError: "Invalid fields: casesCount" });

    const net = syncServer(() => "created");
    expect((await syncPendingReports(OWNER, { force: true })).skipped).toBe("nothing-to-sync");
    expect(net.fetchMock).not.toHaveBeenCalled();

    await retryReport("bad");
    await syncPendingReports(OWNER, { force: true });
    expect(await stateOf("bad")).toBe("synced");
  });

  it("keeps reports pending when the server cannot be reached", async () => {
    await saveReportLocally(OWNER, payload("r1"));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const result = await syncPendingReports(OWNER, { force: true });
    expect(result.error).toMatch(/Cannot reach/);
    const report = await getDb().reports.get("r1");
    expect(report).toMatchObject({ syncState: "pending", attempts: 1, retryable: true });
    expect(report?.nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it("stops on 401 without marking reports failed", async () => {
    await saveReportLocally(OWNER, payload("r1"));
    mockFetch({ "POST /sync": () => json({ statusCode: 401, message: "Session expired." }, 401) });
    const result = await syncPendingReports(OWNER, { force: true });
    expect(result.skipped).toBe("unauthenticated");
    expect(await stateOf("r1")).toBe("pending");
  });

  it("only syncs the signed-in user's reports", async () => {
    await saveReportLocally(OWNER, payload("mine"));
    await saveReportLocally("someone-else", payload("theirs"));
    const net = syncServer(() => "created");
    await syncPendingReports(OWNER, { force: true });
    const ids = (net.callsTo("POST", "/sync")[0]?.body as { reports: ReportPayload[] }).reports.map((r) => r.id);
    expect(ids).toEqual(["mine"]);
    expect(await stateOf("theirs")).toBe("pending");
  });

  it("is idempotent across retries: the same report ID is sent again, never a new one", async () => {
    await saveReportLocally(OWNER, payload("r1"));
    mockFetch({ "POST /sync": () => json({ statusCode: 503, message: "Database unavailable." }, 503) });
    await syncPendingReports(OWNER, { force: true });
    const net = syncServer(() => "duplicate");
    await syncPendingReports(OWNER, { force: true });
    expect((net.callsTo("POST", "/sync")[0]?.body as { reports: ReportPayload[] }).reports[0]?.id).toBe("r1");
    expect(await stateOf("r1")).toBe("synced");
    expect(await getDb().reports.count()).toBe(1);
  });
});

describe("local clean-up", () => {
  it("purges only this user's synced reports on sign-out", async () => {
    await saveReportLocally(OWNER, payload("synced"));
    await saveReportLocally(OWNER, payload("unsent"));
    await saveReportLocally("other", payload("other-synced"));
    await getDb().reports.where("id").anyOf(["synced", "other-synced"]).modify({ syncState: "synced" });

    await purgeSyncedReports(OWNER);
    expect(await getDb().reports.get("synced")).toBeUndefined();
    expect(await stateOf("unsent")).toBe("pending");
    expect(await stateOf("other-synced")).toBe("synced");
  });

  it("discards unsent reports but refuses synced ones and other users' reports", async () => {
    await saveReportLocally(OWNER, payload("unsent"));
    await saveReportLocally(OWNER, payload("done"));
    await saveReportLocally("other", payload("theirs"));
    await getDb().reports.update("done", { syncState: "synced" });

    await discardLocalReport("unsent", OWNER);
    expect(await getDb().reports.get("unsent")).toBeUndefined();
    await expect(discardLocalReport("done", OWNER)).rejects.toThrow(/not been sent/);
    await discardLocalReport("theirs", OWNER);
    expect(await stateOf("theirs")).toBe("pending");
  });
});
