"use client";

import { CheckCircle2, CircleAlert, Clock, CloudOff, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { EASE_OUT } from "@/components/motion";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import { plural } from "@/lib/format";

type Summary = { key: string; label: string; tone: string; Icon: typeof Clock; spin?: boolean };

/** One honest sentence about this device's queue. "Synced" only after server confirmation. */
export function useSyncSummary(): Summary & { unsynced: number } {
  const { online, isSyncing, counts } = useSync();
  const { offlineSession } = useAuth();
  const unsynced = counts.pending + counts.failed + counts.syncing;

  if (!online || offlineSession)
    return { key: "offline", label: unsynced ? `Offline, ${unsynced} saved` : "Offline", tone: "bg-amber-soft text-amber-ink ring-amber/40", Icon: CloudOff, unsynced };
  if (isSyncing) return { key: "syncing", label: "Syncing", tone: "bg-syncing-bg text-syncing ring-syncing/15", Icon: RefreshCw, spin: true, unsynced };
  if (counts.failed) return { key: "failed", label: `${counts.failed} not sent`, tone: "bg-failed-bg text-failed ring-failed/15", Icon: CircleAlert, unsynced };
  if (counts.pending) return { key: "pending", label: `${counts.pending} waiting`, tone: "bg-amber-soft text-amber-ink ring-amber/40", Icon: Clock, unsynced };
  return { key: "synced", label: "All synced", tone: "bg-synced-bg text-synced ring-synced/15", Icon: CheckCircle2, unsynced };
}

/** Compact, always-visible queue state. Links to the Sync page. */
export function SyncStatusPill({ className }: { className?: string }) {
  const s = useSyncSummary();
  return (
    <Link
      href="/sync"
      aria-label={`Sync status: ${s.label}. Open sync page.`}
      className={cx(
        "inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors duration-[var(--duration-ui)]",
        s.tone,
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={s.key + s.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="inline-flex items-center gap-1.5"
        >
          <s.Icon className={cx("size-3.5", s.spin && "animate-spin")} aria-hidden />
          {s.label}
        </motion.span>
      </AnimatePresence>
    </Link>
  );
}

/** Full-width notice while the device is offline. Animates its height in and out. */
export function ConnectivityBanner() {
  const { online } = useSync();
  const { offlineSession } = useAuth();
  const show = !online || offlineSession;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT }}
          className="overflow-hidden border-b border-amber/40 bg-amber-soft"
        >
          <p className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 py-2.5 text-[0.8125rem] leading-snug text-amber-ink sm:px-6 lg:px-10">
            <CloudOff className="mt-px size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">You&apos;re offline.</strong> New reports are saved on this device and sync automatically when you
              reconnect.
            </span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Turns finished sync runs into toasts. Fires only on results the server
 * actually returned; silent when there was nothing to send.
 */
export function SyncNotifier() {
  const { lastResult } = useSync();
  const toast = useToast();
  const seen = useRef(lastResult);

  useEffect(() => {
    if (!lastResult || lastResult === seen.current) return;
    seen.current = lastResult;
    if (lastResult.synced > 0) {
      toast.success(`${plural(lastResult.synced, "report")} synced`, "The server confirmed receipt.");
    }
    if (lastResult.failed > 0) {
      toast.error(`${plural(lastResult.failed, "report")} not sent`, lastResult.error ?? "Open Sync to see why and retry.");
    } else if (lastResult.error && lastResult.skipped !== "offline" && lastResult.skipped !== "unauthenticated") {
      toast.error("Sync didn't finish", lastResult.error);
    }
  }, [lastResult, toast]);

  return null;
}
