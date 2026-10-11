import { api, ApiError, toErrorMessage } from "@/lib/api";
import { SYNC_BATCH_SIZE } from "@/lib/config";
import { getDb, getDeviceId, setMeta, type LocalReport } from "@/lib/db";
import type { ReportPayload, SyncResponse } from "@/types";

export interface SyncRunResult {
  attempted: number;
  synced: number;
  failed: number;
  skipped: "offline" | "busy" | "nothing-to-sync" | "unauthenticated" | null;
  error?: string;
}

const BASE_BACKOFF_MS = 15_000;
const MAX_BACKOFF_MS = 30 * 60_000;
// A report stuck in `syncing` longer than this (tab closed mid-request) is reset.
const STALE_SYNCING_MS = 2 * 60_000;

let running: Promise<SyncRunResult> | null = null;

function backoff(attempts: number): number {
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
  return Date.now() + delay + Math.floor(Math.random() * 5_000);
}

function toPayload(report: LocalReport): ReportPayload {
  // Send only API fields; local bookkeeping never leaves the device.
  return {
    id: report.id,
    category: report.category,
    conditionName: report.conditionName,
    severity: report.severity,
    casesCount: report.casesCount,
    ageGroup: report.ageGroup,
    symptoms: report.symptoms?.length ? report.symptoms : undefined,
    notes: report.notes || undefined,
    locationId: report.locationId,
    latitude: report.latitude,
    longitude: report.longitude,
    observedAt: report.observedAt,
    clientCreatedAt: report.clientCreatedAt,
  };
}

/** Saves a new report locally as `pending`. Never touches the network. */
export async function saveReportLocally(ownerId: string, payload: ReportPayload): Promise<LocalReport> {
  const record: LocalReport = {
    ...payload,
    ownerId,
    syncState: "pending",
    attempts: 0,
    lastError: null,
    nextAttemptAt: 0,
    retryable: true,
    updatedAt: Date.now(),
    syncedAt: null,
  };
  try {
    await getDb().reports.add(record);
    return record;
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      throw new Error("This device is out of storage space. Free up space, then try saving again.");
    }
    throw new Error(`Could not save the report on this device: ${toErrorMessage(error)}`);
  }
}

/** Resets reports left in `syncing` by an interrupted run (e.g. tab closed mid-upload). */
export async function recoverInterruptedSyncs(): Promise<void> {
  try {
    const cutoff = Date.now() - STALE_SYNCING_MS;
    await getDb()
      .reports.where("syncState")
      .equals("syncing")
      .filter((r) => r.updatedAt < cutoff)
      .modify({ syncState: "pending", updatedAt: Date.now() });
  } catch (error) {
    console.warn("[AfyaLink] Could not recover interrupted syncs.", error);
  }
}

/** Manually re-queue a failed report (clears backoff, allows non-retryable ones). */
export async function retryReport(id: string): Promise<void> {
  await getDb().reports.update(id, {
    syncState: "pending",
    nextAttemptAt: 0,
    retryable: true,
    lastError: null,
    updatedAt: Date.now(),
  });
}

/**
 * Deletes a report that never reached the server (e.g. rejected by validation).
 * Refuses synced or in-flight reports so server data is never orphaned locally.
 */
export async function discardLocalReport(id: string, ownerId: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.reports, async () => {
    const report = await db.reports.get(id);
    if (!report || report.ownerId !== ownerId) return;
    if (report.syncState === "synced" || report.syncState === "syncing") {
      throw new Error("Only reports that have not been sent can be discarded.");
    }
    await db.reports.delete(id);
  });
}

/**
 * Removes this user's already-confirmed reports from the device (on sign-out),
 * so health data does not linger on shared phones. Unsynced work is kept.
 */
export async function purgeSyncedReports(ownerId: string): Promise<void> {
  try {
    await getDb().reports.where("[ownerId+syncState]").equals([ownerId, "synced"]).delete();
  } catch (error) {
    console.warn("[AfyaLink] Could not clear synced reports from this device.", error);
  }
}

/**
 * Uploads this user's due `pending`/`failed` reports in batches.
 * A report becomes `synced` only when the server answers `created` or
 * `duplicate`; the server's idempotency on report ID makes retries safe.
 * Concurrent calls share one run.
 */
export function syncPendingReports(ownerId: string, options: { force?: boolean } = {}): Promise<SyncRunResult> {
  running ??= runSync(ownerId, options.force ?? false).finally(() => {
    running = null;
  });
  return running;
}

async function runSync(ownerId: string, force: boolean): Promise<SyncRunResult> {
  const result: SyncRunResult = { attempted: 0, synced: 0, failed: 0, skipped: null };

  if (typeof navigator !== "undefined" && !navigator.onLine) return { ...result, skipped: "offline" };

  let db;
  try {
    db = getDb();
  } catch (error) {
    return { ...result, skipped: null, error: toErrorMessage(error) };
  }

  await recoverInterruptedSyncs();

  const now = Date.now();
  let due: LocalReport[];
  try {
    due = await db.reports
      .where("ownerId")
      .equals(ownerId)
      .filter(
        (r) =>
          (r.syncState === "pending" || (r.syncState === "failed" && r.retryable)) &&
          (force || r.nextAttemptAt <= now),
      )
      .toArray();
  } catch (error) {
    return { ...result, error: `Could not read the offline queue: ${toErrorMessage(error)}` };
  }
  if (due.length === 0) return { ...result, skipped: "nothing-to-sync" };

  const deviceId = await getDeviceId();

  for (let i = 0; i < due.length; i += SYNC_BATCH_SIZE) {
    const batch = due.slice(i, i + SYNC_BATCH_SIZE);
    const ids = batch.map((r) => r.id);
    result.attempted += batch.length;

    try {
      await db.reports.where("id").anyOf(ids).modify({ syncState: "syncing", updatedAt: Date.now() });
    } catch (error) {
      return { ...result, error: `Could not update the offline queue: ${toErrorMessage(error)}` };
    }

    let response: SyncResponse;
    try {
      response = await api<SyncResponse>("/sync", {
        method: "POST",
        body: JSON.stringify({ deviceId, reports: batch.map(toPayload) }),
        timeoutMs: 30_000,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      const unauthenticated = error instanceof ApiError && error.isUnauthorized;
      // Nothing was confirmed: put the whole batch back. Network/server errors
      // keep the report `pending`; others become `failed` with backoff.
      await markBatchUnconfirmed(batch, message, error instanceof ApiError && !error.isRetryable && !unauthenticated);
      if (unauthenticated) return { ...result, skipped: "unauthenticated", error: message };
      result.failed += batch.length;
      return { ...result, error: message };
    }

    await applyResults(batch, response, result);
  }

  await setMeta("lastSyncAt", new Date().toISOString());
  return result;
}

async function markBatchUnconfirmed(batch: LocalReport[], message: string, asFailed: boolean): Promise<void> {
  try {
    await getDb().transaction("rw", getDb().reports, async () => {
      for (const report of batch) {
        const attempts = report.attempts + 1;
        await getDb().reports.update(report.id, {
          syncState: asFailed ? "failed" : "pending",
          attempts,
          lastError: message,
          nextAttemptAt: backoff(attempts),
          updatedAt: Date.now(),
        });
      }
    });
  } catch (error) {
    console.warn("[AfyaLink] Could not record sync failure locally.", error);
  }
}

async function applyResults(batch: LocalReport[], response: SyncResponse, result: SyncRunResult): Promise<void> {
  const byId = new Map(response.results.filter((r) => r.id).map((r) => [r.id as string, r]));
  const db = getDb();

  try {
    await db.transaction("rw", db.reports, async () => {
      for (const report of batch) {
        const outcome = byId.get(report.id);
        if (outcome && (outcome.status === "created" || outcome.status === "duplicate")) {
          await db.reports.update(report.id, {
            syncState: "synced",
            lastError: null,
            syncedAt: Date.now(),
            updatedAt: Date.now(),
          });
          result.synced += 1;
        } else {
          const attempts = report.attempts + 1;
          await db.reports.update(report.id, {
            syncState: "failed",
            attempts,
            // Server validation rejections need a user edit; do not auto-retry them.
            retryable: !outcome,
            lastError: outcome?.reason ?? "The server did not confirm this report.",
            nextAttemptAt: backoff(attempts),
            updatedAt: Date.now(),
          });
          result.failed += 1;
        }
      }
    });
  } catch (error) {
    // The server has the reports; a later run will see them as `duplicate` and mark them synced.
    console.warn("[AfyaLink] Could not record sync results locally.", error);
  }
}
