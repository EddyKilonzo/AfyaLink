"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { SYNC_INTERVAL_MS } from "@/lib/config";
import { getDb, getMeta } from "@/lib/db";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { syncPendingReports, type SyncRunResult } from "./sync-engine";

export interface QueueCounts {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
}

interface SyncContextValue {
  online: boolean;
  isSyncing: boolean;
  counts: QueueCounts;
  lastResult: SyncRunResult | null;
  lastSyncAt: string | null;
  storageError: string | null;
  syncNow: () => Promise<void>;
}

const EMPTY_COUNTS: QueueCounts = { pending: 0, syncing: 0, synced: 0, failed: 0 };
const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Drives synchronization. Triggers: app start, connectivity regained, tab
 * becoming visible/focused, and a periodic timer while pending work exists.
 * Background Sync is not relied on because many target browsers lack it.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const online = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncRunResult | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const ownerId = status === "authenticated" ? (user?.id ?? null) : null;
  const ownerRef = useRef(ownerId);
  useEffect(() => {
    ownerRef.current = ownerId;
  }, [ownerId]);

  const counts =
    useLiveQuery(async () => {
      if (!ownerId) return EMPTY_COUNTS;
      try {
        const rows = await getDb().reports.where("ownerId").equals(ownerId).toArray();
        const next = { ...EMPTY_COUNTS };
        for (const row of rows) next[row.syncState] += 1;
        return next;
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : "Offline storage is unavailable.");
        return EMPTY_COUNTS;
      }
    }, [ownerId]) ?? EMPTY_COUNTS;

  const run = useCallback(async (force: boolean) => {
    const owner = ownerRef.current;
    if (!owner) return;
    setIsSyncing(true);
    try {
      const result = await syncPendingReports(owner, { force });
      setLastResult(result);
      setLastSyncAt((await getMeta<string>("lastSyncAt")) ?? null);
    } catch (error) {
      setLastResult({
        attempted: 0,
        synced: 0,
        failed: 0,
        skipped: null,
        error: error instanceof Error ? error.message : "Sync failed unexpectedly.",
      });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Startup and whenever the signed-in user or connectivity changes.
  useEffect(() => {
    if (ownerId && online) void run(true);
  }, [ownerId, online, run]);

  // App becomes active again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void run(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [run]);

  // Periodic retry (respects per-report backoff) while work is outstanding.
  const hasWork = counts.pending + counts.failed > 0;
  useEffect(() => {
    if (!hasWork || !online) return;
    const timer = window.setInterval(() => void run(false), SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasWork, online, run]);

  const syncNow = useCallback(() => run(true), [run]);

  const value = useMemo(
    () => ({ online, isSyncing, counts, lastResult, lastSyncAt, storageError, syncNow }),
    [online, isSyncing, counts, lastResult, lastSyncAt, storageError, syncNow],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used inside <SyncProvider>.");
  return ctx;
}
