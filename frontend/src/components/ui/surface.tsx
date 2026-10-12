import { AlertTriangle, FlaskConical, Inbox, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp } from "@/components/motion";
import { Button } from "./button";
import { cx } from "./cx";

export type PanelVariant = "raised" | "plain" | "sunken" | "brand" | "outline" | "elevated";

const PANEL: Record<PanelVariant, string> = {
  // Default working surface: white, hairline ring, soft lift.
  raised: "bg-surface shadow-[var(--shadow-card)]",
  plain: "bg-surface",
  // Recessed areas inside a raised panel (filters, secondary info).
  sunken: "bg-sunken",
  // Dense brand surface for the one thing that should stand out.
  brand: "bg-brand-900 text-white shadow-[var(--shadow-lg)]",
  outline: "border border-line bg-transparent",
  // Premium elevated surface with deeper shadow for important content
  elevated: "bg-surface shadow-[var(--shadow-card-hover)]",
};

/** A surface. Pick the variant by purpose; do not wrap every block in one. */
export function Panel({
  variant = "raised",
  className,
  children,
  as = "section",
  ...rest
}: {
  variant?: PanelVariant;
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside";
  "aria-labelledby"?: string;
}) {
  const Component = as;
  return (
    <Component
      {...rest}
      className={cx(
        "rounded-[var(--radius-xl)] transition-all duration-[var(--duration-ui)] ease-[var(--ease-out)]",
        PANEL[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}

/** @deprecated Use Panel. Kept so older imports still compile. */
export const Card = Panel;

export function PanelHeader({ title, description, action, id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
      <div className="min-w-0">
        <h2 id={id} className="text-h3 text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium text-brand-600">{eyebrow}</div>}
        <h1 className="text-h1 text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/**
 * A metric. Numbers count up once when they first load; `null` shows a
 * skeleton so layout never jumps.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string | null | undefined;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "brand" | "amber" | "error";
  className?: string;
}) {
  const iconTone = {
    default: "bg-brand-50 text-brand-600",
    brand: "bg-brand-600 text-white",
    amber: "bg-amber-soft text-amber-ink",
    error: "bg-failed-bg text-failed",
  }[tone];
  return (
    <div className={cx("relative overflow-hidden rounded-[var(--radius-xl)] bg-surface p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-[var(--duration-ui)] ease-[var(--ease-out)] sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-label">{label}</p>
        {Icon && (
          <span className={cx("grid size-8 shrink-0 place-items-center rounded-[10px]", iconTone)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-metric text-ink">
        {value === null || value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : typeof value === "number" ? (
          <CountUp value={value} />
        ) : (
          value
        )}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "block animate-pulse rounded-md bg-sunken",
        className,
      )}
    />
  );
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cx("flex items-center justify-center gap-2.5 py-10 text-sm text-muted", className)}>
      <Loader2 className="size-[18px] animate-spin text-brand-500" aria-hidden />
      {label}…
    </div>
  );
}

/** Placeholder rows shaped like the content they stand in for. */
export function LoadingState({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 p-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  illustration,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  /** Optional spot illustration (e.g. `<EmptyInbox className="w-32" />`); replaces the icon tile when given. */
  illustration?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center gap-2 px-6 py-12 text-center", className)}>
      {illustration ? (
        <div className="mb-2 flex justify-center" aria-hidden>
          {illustration}
        </div>
      ) : (
        <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-500 ring-1 ring-brand-100">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <p className="text-h3 text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-start gap-3 rounded-[var(--radius-lg)] bg-failed-bg p-4 text-sm text-failed ring-1 ring-inset ring-failed/15 sm:flex-row sm:items-center transition-all duration-[var(--duration-ui)]",
        className,
      )}
    >
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <p className="flex-1 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="size-3.5" aria-hidden />}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Marks synthetic content so it is never mistaken for live data. */
export function DemoBadge({ label = "Demo data", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-amber bg-amber-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-ink",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/** Definition list for record details. */
export function DataList({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cx("divide-y divide-line", className)}>
      {rows.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(7rem,38%)_1fr] gap-4 py-3 text-sm">
          <dt className="text-muted">{key}</dt>
          <dd className="min-w-0 break-words font-medium text-ink">{value ?? <span className="font-normal text-muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
