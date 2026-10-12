import type { ReactNode } from "react";
import { Check, CheckCircle2, CircleAlert, Clock, Loader2 } from "lucide-react";
import { cx } from "@/components/ui/cx";

export type StatusMarkTone =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "draft"
  | "success"
  | "error"
  | "info"
  | "warning"
  | "loading";

const CONFIG: Record<StatusMarkTone, { icon: typeof Check; ring: string; fill: string; spin?: boolean }> = {
  pending: { icon: Clock, ring: "ring-amber/40", fill: "bg-amber-soft text-amber-ink" },
  syncing: { icon: Loader2, ring: "ring-syncing/40", fill: "bg-syncing-bg text-syncing", spin: true },
  synced: { icon: CheckCircle2, ring: "ring-synced/30", fill: "bg-synced-bg text-synced" },
  failed: { icon: CircleAlert, ring: "ring-failed/40", fill: "bg-failed-bg text-failed" },
  draft: { icon: Clock, ring: "ring-line", fill: "bg-sunken text-muted" },
  success: { icon: CheckCircle2, ring: "ring-success/30", fill: "bg-synced-bg text-synced" },
  error: { icon: CircleAlert, ring: "ring-error/40", fill: "bg-failed-bg text-failed" },
  info: { icon: Clock, ring: "ring-syncing/40", fill: "bg-syncing-bg text-syncing" },
  warning: { icon: Clock, ring: "ring-amber/40", fill: "bg-amber-soft text-amber-ink" },
  loading: { icon: Loader2, ring: "ring-brand-400/40", fill: "bg-brand-50 text-brand-600", spin: true },
};

/**
 * A compact status mark: icon in a ring, with optional pulse for live states.
 * Use it inline next to labels or as a row prefix.
 */
export function StatusMark({
  tone,
  label,
  className,
  spin,
  pulse,
}: {
  tone: StatusMarkTone;
  label?: string;
  className?: string;
  spin?: boolean;
  pulse?: boolean;
}) {
  const c = CONFIG[tone];
  const Icon = c.icon;
  const shouldSpin = spin ?? c.spin;
  return (
    <span
      role="status"
      aria-label={label}
      className={cx("inline-flex items-center gap-2", className)}
    >
      <span
        className={cx(
          "grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-inset",
          c.fill,
          c.ring,
          shouldSpin && "animate-spin",
          pulse && "animate-pulse",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </span>
  );
}

/** A thin horizontal status line: label + mark + optional trailing content. */
export function StatusLine({
  tone,
  label,
  trailing,
  className,
}: {
  tone: StatusMarkTone;
  label: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <StatusMark tone={tone} />
      <span className="text-sm text-ink">{label}</span>
      <span className="ml-auto text-xs text-muted">{trailing}</span>
    </div>
  );
}