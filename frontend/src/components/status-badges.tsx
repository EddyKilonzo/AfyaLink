import { CheckCircle2, CircleAlert, Clock, RefreshCw } from "lucide-react";
import type { LocalSyncState } from "@/lib/db";
import { SEVERITY_LABELS, type ReportSeverity } from "@/types";
import { cx } from "./ui";

const SYNC_STYLES: Record<LocalSyncState, { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-pending-bg text-pending", Icon: Clock },
  syncing: { label: "Syncing", className: "bg-syncing-bg text-syncing", Icon: RefreshCw },
  synced: { label: "Synced", className: "bg-synced-bg text-synced", Icon: CheckCircle2 },
  failed: { label: "Failed", className: "bg-failed-bg text-failed", Icon: CircleAlert },
};

export function SyncStateBadge({ state }: { state: LocalSyncState }) {
  const { label, className, Icon } = SYNC_STYLES[state];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", className)}>
      <Icon className={cx("size-3", state === "syncing" && "animate-spin")} aria-hidden />
      {label}
    </span>
  );
}

const SEVERITY_DOT: Record<ReportSeverity, string> = {
  LOW: "bg-sev-low",
  MODERATE: "bg-sev-moderate",
  HIGH: "bg-sev-high",
  CRITICAL: "bg-sev-critical",
};

export function SeverityBadge({ severity }: { severity: ReportSeverity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
      <span className={cx("size-2 rounded-full", SEVERITY_DOT[severity])} aria-hidden />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
