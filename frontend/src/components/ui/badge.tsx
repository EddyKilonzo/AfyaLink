import { CheckCircle2, CircleAlert, CircleDashed, Clock, CloudOff, FileClock, RefreshCw, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { SEVERITY_LABELS, STATUS_LABELS, type ReportSeverity, type ReportStatus } from "@/types";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "brand" | "amber" | "success" | "error" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-muted ring-1 ring-inset ring-line",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70 shadow-[0_1px_2px_rgb(20_108_90/0.08)]",
  amber: "bg-amber-soft text-amber-ink ring-1 ring-inset ring-amber/40 shadow-[0_1px_2px_rgb(243_182_106/0.2)]",
  success: "bg-synced-bg text-synced ring-1 ring-inset ring-synced/15 shadow-[0_1px_2px_rgb(26_110_74/0.12)]",
  error: "bg-failed-bg text-failed ring-1 ring-inset ring-failed/15 shadow-[0_1px_2px_rgb(196_61_75/0.12)]",
  info: "bg-syncing-bg text-syncing ring-1 ring-inset ring-syncing/15 shadow-[0_1px_2px_rgb(34_96_159/0.12)]",
};

export function Badge({ tone = "neutral", icon, children, className }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold ring-1 ring-inset [&_svg]:size-3.5 transition-all duration-[var(--duration-micro)] ease-[var(--ease-out)]",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Every connectivity and sync state, each with an icon and words (never colour alone). */
export type StatusState = "online" | "offline" | "pending" | "syncing" | "synced" | "failed" | "draft";

const STATES: Record<StatusState, { label: string; tone: BadgeTone; Icon: typeof Clock }> = {
  online: { label: "Online", tone: "success", Icon: Wifi },
  offline: { label: "Offline", tone: "amber", Icon: CloudOff },
  pending: { label: "Waiting to sync", tone: "amber", Icon: Clock },
  syncing: { label: "Syncing", tone: "info", Icon: RefreshCw },
  synced: { label: "Synced", tone: "success", Icon: CheckCircle2 },
  failed: { label: "Not sent", tone: "error", Icon: CircleAlert },
  draft: { label: "Draft", tone: "neutral", Icon: FileClock },
};

export function StatusIndicator({ state, label, className }: { state: StatusState; label?: string; className?: string }) {
  const { label: fallback, tone, Icon } = STATES[state];
  return (
    <Badge tone={tone} className={className} icon={<Icon className={cx(state === "syncing" && "animate-spin")} aria-hidden />}>
      {label ?? fallback}
    </Badge>
  );
}

/** Local queue state of a report on this device. */
export function SyncStateBadge({ state }: { state: "pending" | "syncing" | "synced" | "failed" }) {
  return <StatusIndicator state={state} />;
}

const SEVERITY_DOT: Record<ReportSeverity, string> = {
  LOW: "bg-sev-low",
  MODERATE: "bg-sev-moderate",
  HIGH: "bg-sev-high",
  CRITICAL: "bg-sev-critical",
};

export function SeverityBadge({ severity, className }: { severity: ReportSeverity; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-xs font-semibold text-ink transition-all duration-[var(--duration-micro)]", className)}>
      <span className={cx("size-2 rounded-full ring-2 ring-white shadow-[0_0_0_3px_var(--shadow-glow)]", SEVERITY_DOT[severity])} aria-hidden />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

const REVIEW_TONE: Record<ReportStatus, BadgeTone> = { SUBMITTED: "neutral", REVIEWED: "info", ACTIONED: "success" };
const REVIEW_ICON: Record<ReportStatus, typeof Clock> = { SUBMITTED: CircleDashed, REVIEWED: Clock, ACTIONED: CheckCircle2 };

/** Server-side review status (not to be confused with local sync state). */
export function ReviewStatusBadge({ status }: { status: ReportStatus }) {
  const Icon = REVIEW_ICON[status];
  return (
    <Badge tone={REVIEW_TONE[status]} icon={<Icon className={cx(status === "SUBMITTED" && "animate-pulse-soft")} aria-hidden />}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
