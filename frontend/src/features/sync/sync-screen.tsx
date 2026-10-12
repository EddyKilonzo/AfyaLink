"use client";

import { CheckCircle2, CircleAlert, Clock, CloudOff, History, RefreshCw, RotateCcw, Server, Smartphone, Trash2, UploadCloud } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { EASE_OUT, Stagger, StaggerItem } from "@/components/motion";
import { Pagination } from "@/components/pagination";
import { Badge, Button, EmptyState, ErrorState, IconButton, PageHeader, Panel, PanelHeader } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useConfirm } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useSyncLogs } from "@/features/admin/hooks";
import { useAuth } from "@/features/auth/auth-context";
import { useLocalReports } from "@/features/reports/hooks";
import { ReportRow } from "@/features/reports/report-row";
import type { LocalReport } from "@/lib/db";
import { formatDateTime, formatRelative, plural } from "@/lib/format";
import { toErrorMessage } from "@/lib/api";
import { useSync } from "./sync-context";
import { discardLocalReport, retryReport } from "./sync-engine";

export function SyncScreen() {
  const { online, isSyncing, counts, lastSyncAt, storageError, syncNow } = useSync();
  const local = useLocalReports();
  const failed = (local ?? []).filter((r) => r.syncState === "failed");
  const waiting = (local ?? []).filter((r) => r.syncState === "pending" || r.syncState === "syncing");

  return (
    <>
      <PageHeader
        title="Sync & offline"
        description="Reports are saved on this device first. They're marked synced only after the server confirms them."
        action={
          <Button onClick={() => void syncNow()} loading={isSyncing} disabled={!online} icon={<RefreshCw className="size-4 transition-transform duration-500 ease-[var(--ease-out)] group-hover:rotate-180" aria-hidden />} className="group max-sm:w-full">
            {online ? "Sync now" : "Offline"}
          </Button>
        }
      />

      <Pipeline />

      <p className="mt-3 text-[0.8125rem] text-muted">
        {lastSyncAt ? <>Last sync {formatRelative(lastSyncAt)} ({formatDateTime(lastSyncAt)})</> : "This device hasn't synced yet."}
        {counts.synced > 0 && <> {plural(counts.synced, "confirmed report")} kept here until you sign out.</>}
      </p>

      {storageError && <ErrorState className="mt-4" message={storageError} />}

      <div className="mt-6 space-y-6">
        {failed.length > 0 && (
          <QueueGroup
            tone="error"
            title={`Not sent (${failed.length})`}
            description="The server didn't accept these. Check the reason, then retry or discard."
          >
            <Stagger className="space-y-0.5">
              {failed.map((r) => (
                <StaggerItem key={r.id}>
                  <FailedRow report={r} />
                </StaggerItem>
              ))}
            </Stagger>
          </QueueGroup>
        )}

        <QueueGroup
          tone="amber"
          title={`Waiting to sync (${waiting.length})`}
          description={online ? "These upload automatically. Retries back off so a weak signal isn't drained." : "These upload automatically when you're back online."}
        >
          {waiting.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing waiting" description="Every report on this device has reached the server." className="py-8" />
          ) : (
            <Stagger className="space-y-0.5">
              {waiting.map((r) => (
                <StaggerItem key={r.id}>
                  <ReportRow report={r} source="local" />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </QueueGroup>

        <SyncHistory />
      </div>
    </>
  );
}

/** Device → upload → server, reflecting the real queue. */
function Pipeline() {
  const { online, isSyncing, counts } = useSync();
  const onDevice = counts.pending + counts.failed + counts.syncing;
  const link = !online ? "offline" : isSyncing ? "active" : "idle";

  return (
    <Panel className="p-4 sm:p-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <Node
          icon={<Smartphone className="size-5" aria-hidden />}
          title="This device"
          value={plural(onDevice, "report")}
          sub={onDevice ? "Saved, not yet confirmed" : "Nothing waiting"}
          tone={counts.failed ? "error" : onDevice ? "amber" : "brand"}
        />
        <Connector state={link} />
        <Node
          icon={<Server className="size-5" aria-hidden />}
          title="AfyaLink server"
          value={online ? "Reachable" : "Out of reach"}
          sub={online ? (isSyncing ? "Receiving reports" : "Ready") : "Waiting for a connection"}
          tone={online ? "brand" : "amber"}
        />
      </div>
    </Panel>
  );
}

function Node({ icon, title, value, sub, tone }: { icon: ReactNode; title: string; value: string; sub: string; tone: "brand" | "amber" | "error" }) {
  const toneClass = { brand: "bg-brand-50 text-brand-600 ring-brand-100", amber: "bg-amber-soft text-amber-ink ring-amber/40", error: "bg-failed-bg text-failed ring-failed/15" }[tone];
  return (
    <div className="min-w-0 rounded-2xl bg-sunken p-3 sm:p-4">
      <span className={cx("grid size-10 place-items-center rounded-xl ring-1 ring-inset", toneClass)}>{icon}</span>
      <p className="mt-3 text-xs font-medium text-muted">{title}</p>
      <p className="truncate text-[0.9375rem] font-semibold text-ink sm:text-base">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}

/** The link between device and server; moving dots only while an upload is really running. */
function Connector({ state }: { state: "offline" | "active" | "idle" }) {
  const label = state === "offline" ? "No connection" : state === "active" ? "Uploading" : "Connected";
  return (
    <div className="flex w-12 flex-col items-center gap-2 sm:w-28" role="img" aria-label={label}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
        {state === "idle" && <div className="absolute inset-0 bg-brand-200" />}
        {state === "offline" && <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-amber" />}
        {state === "active" &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute top-0 h-full w-1/3 rounded-full bg-brand-500"
              initial={{ x: "-100%" }}
              animate={{ x: "300%" }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, delay: i * 0.45 }}
            />
          ))}
      </div>
      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-muted">
        {state === "offline" ? <CloudOff className="size-3" aria-hidden /> : state === "active" ? <UploadCloud className="size-3" aria-hidden /> : <CheckCircle2 className="size-3" aria-hidden />}
        <span className="max-sm:hidden">{label}</span>
      </span>
    </div>
  );
}

function QueueGroup({ tone, title, description, children }: { tone: "error" | "amber"; title: string; description: string; children: ReactNode }) {
  const Icon = tone === "error" ? CircleAlert : Clock;
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Icon className={cx("size-4", tone === "error" ? "text-failed" : "text-amber-ink")} aria-hidden />
            {title}
          </span>
        }
        description={description}
      />
      <div className="p-2 pt-3 sm:p-3">{children}</div>
    </Panel>
  );
}

function FailedRow({ report }: { report: LocalReport }) {
  const { user } = useAuth();
  const { syncNow } = useSync();
  const confirm = useConfirm();
  const toast = useToast();

  async function retry() {
    await retryReport(report.id);
    toast.info("Retrying", report.conditionName);
    void syncNow();
  }

  async function discard() {
    if (!user) return;
    const ok = await confirm({
      title: "Discard this report?",
      description: `“${report.conditionName}” never reached the server. Discarding deletes it from this device for good.`,
      confirmLabel: "Discard report",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await discardLocalReport(report.id, user.id);
      toast.success("Report discarded");
    } catch (error) {
      toast.error("Couldn't discard", toErrorMessage(error));
    }
  }

  return (
    <motion.div layout transition={{ duration: 0.24, ease: EASE_OUT }} className="rounded-2xl">
      <ReportRow
        report={report}
        source="local"
        trailing={
          <span className="flex shrink-0 gap-1">
            <IconButton label="Retry" variant="outline" onClick={() => void retry()}>
              <RotateCcw aria-hidden />
            </IconButton>
            <IconButton label="Discard" variant="ghost" onClick={() => void discard()} className="hover:bg-failed-bg hover:text-failed">
              <Trash2 aria-hidden />
            </IconButton>
          </span>
        }
      />
      {report.lastError && (
        <p className="mx-3 mb-2 rounded-xl bg-failed-bg px-3 py-2 text-[0.8125rem] text-failed sm:ml-[4.25rem]">
          {report.lastError}
          {report.attempts > 0 && <span className="text-failed/80"> ({plural(report.attempts, "attempt")})</span>}
        </p>
      )}
    </motion.div>
  );
}

function SyncHistory() {
  const [page, setPage] = useState(1);
  const logs = useSyncLogs({ page, limit: 8 });
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            <History className="size-4 text-muted" aria-hidden /> Server history
          </span>
        }
        description="Each upload batch, as recorded by the server (counts only)"
      />
      <div className="p-2 pt-3 sm:p-3">
        <AsyncBoundary state={logs} isEmpty={(d) => d.items.length === 0} empty={{ icon: History, title: "No uploads recorded yet" }}>
          {(d) => (
            <>
              <ul className="divide-y divide-line">
                {d.items.map((log) => (
                  <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                    <span>
                      <span className="font-medium text-ink">{formatRelative(log.startedAt)}</span>
                      <span className="block text-xs text-muted">{formatDateTime(log.startedAt)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={log.status === "SUCCESS" ? "success" : log.status === "PARTIAL" ? "amber" : "error"}>
                        {log.status === "SUCCESS" ? "Accepted" : log.status === "PARTIAL" ? "Partly accepted" : "Rejected"}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted">
                        {log.createdCount} new, {log.duplicateCount} repeat, {log.rejectedCount} rejected
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-2">
                <Pagination page={d} onPageChange={setPage} />
              </div>
            </>
          )}
        </AsyncBoundary>
      </div>
    </Panel>
  );
}
