import Dexie, { type EntityTable } from "dexie";
import type { ReportPayload, User } from "@/types";

/** Local lifecycle of a report on this device. */
export type LocalSyncState = "pending" | "syncing" | "synced" | "failed";

export interface LocalReport extends ReportPayload {
  /** User the report belongs to; only that user's session may sync it. */
  ownerId: string;
  syncState: LocalSyncState;
  attempts: number;
  lastError: string | null;
  /** Epoch ms before which automatic retries are skipped (backoff). */
  nextAttemptAt: number;
  /** Rejections from server validation are not retried automatically. */
  retryable: boolean;
  updatedAt: number;
  syncedAt: number | null;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

/**
 * IndexedDB schema (via Dexie). Reports live here from the moment they are
 * saved, survive reloads, and are only marked `synced` after the server
 * confirms them.
 */
class AfyaLinkDB extends Dexie {
  reports!: EntityTable<LocalReport, "id">;
  meta!: EntityTable<MetaRecord, "key">;

  constructor() {
    super("afyalink");
    this.version(1).stores({
      reports: "id, ownerId, syncState, [ownerId+syncState], nextAttemptAt, clientCreatedAt",
      meta: "key",
    });
  }
}

let instance: AfyaLinkDB | null = null;

/** Test hook: drop the cached connection so the next getDb() reopens fresh. */
export function __resetDb() {
  instance = null;
}

/** Lazily opened so server rendering never touches IndexedDB. */
export function getDb(): AfyaLinkDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("Offline storage is not available in this browser.");
  }
  instance ??= new AfyaLinkDB();
  return instance;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  try {
    const record = await getDb().meta.get(key);
    return record?.value as T | undefined;
  } catch (error) {
    console.warn(`[AfyaLink] Could not read local setting "${key}".`, error);
    return undefined;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  try {
    await getDb().meta.put({ key, value });
  } catch (error) {
    console.warn(`[AfyaLink] Could not save local setting "${key}".`, error);
  }
}

export async function deleteMeta(key: string): Promise<void> {
  try {
    await getDb().meta.delete(key);
  } catch (error) {
    console.warn(`[AfyaLink] Could not remove local setting "${key}".`, error);
  }
}

/** Stable per-device identifier (not a secret) sent with sync batches for auditing. */
export async function getDeviceId(): Promise<string> {
  const existing = await getMeta<string>("deviceId");
  if (existing) return existing;
  const id = `dev-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  await setMeta("deviceId", id);
  return id;
}

/** Non-secret profile cached so a CHV can keep recording while offline. */
export const cachedProfile = {
  get: () => getMeta<User>("profile"),
  set: (user: User) => setMeta("profile", user),
  clear: () => deleteMeta("profile"),
};
