import Link from "next/link";
import type { ReactNode } from "react";
import { ReviewStatusBadge, SeverityBadge, SyncStateBadge } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { formatRelative } from "@/lib/format";
import type { LocalReport } from "@/lib/db";
import type { ServerReport, ReportStatus } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { CategoryIcon } from "./report-row";

/** One report rendered as a card. `grid` is the bento-style default; `list` is a single row. */
export function ReportCard({
  report,
  source,
  href,
  view = "grid",
  trailing,
}: {
  report: ServerReport | LocalReport;
  source: "server" | "local";
  href?: string;
  view?: "grid" | "list";
  trailing?: ReactNode;
}) {
  const isServer = source === "server";
  const status = isServer ? (report as ServerReport).status : (report as LocalReport).syncState;
  const meta = `${CATEGORY_LABELS[report.category]}, ${report.casesCount} ${report.casesCount === 1 ? "case" : "cases"}, ${formatRelative(report.observedAt)}`;

  const content = (
    <>
      <div className={cx("flex items-start gap-3", view === "list" && "w-full")}>
        <CategoryIcon category={report.category} className={cx(view === "grid" ? "size-11" : "size-10")} />
        <div className="min-w-0 flex-1">
          <p className={cx("truncate text-sm font-semibold tracking-tight text-ink", view === "grid" ? "text-[0.95rem]" : "text-[0.925rem]")}>
            {report.conditionName}
          </p>
          <p className="mt-0.5 truncate text-[0.75rem] text-muted">{meta}</p>
          <div className={cx("mt-2 flex flex-wrap items-center gap-1.5", view === "list" && "mt-1")}>
            <SeverityBadge severity={report.severity} />
            {isServer ? (
              <ReviewStatusBadge status={status as ReportStatus} />
            ) : (
              <SyncStateBadge state={status as "pending" | "syncing" | "synced" | "failed"} />
            )}
          </div>
        </div>
      </div>
      {trailing}
      {href && (
        <span className={cx("text-muted/50 transition-all duration-[var(--duration-micro)] group-hover:translate-x-0.5", view === "grid" ? "absolute right-3 top-3" : "ml-auto")}>
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 7h10M7 7l5 5-5 5" />
          </svg>
        </span>
      )}
    </>
  );

  const card = cx(
    "group relative overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-ring),var(--shadow-sm)] transition-all duration-[var(--duration-ui)] ease-[var(--ease-out)] will-change-transform",
    view === "grid"
      ? "block p-4 hover:bg-sunken hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
      : "flex items-center gap-3 px-4 py-3 hover:bg-sunken hover:shadow-[var(--shadow-card)]",
    href && "cursor-pointer",
  );

  return href ? (
    <Link href={href} className={card}>
      {content}
    </Link>
  ) : (
    <div className={card}>{content}</div>
  );
}

/** Segmented control: grid vs list. */
export function ViewToggle({ value, onChange }: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-sunken p-0.5 text-muted" role="group" aria-label="View mode">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        className={cx(
          "grid size-8 place-items-center rounded-md transition-all duration-[var(--duration-micro)] ease-[var(--ease-out)]",
          value === "grid" ? "bg-surface text-ink shadow-[var(--shadow-ring),var(--shadow-xs)]" : "hover:text-ink hover:bg-surface/50",
        )}
        aria-label="Grid view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={cx(
          "grid size-8 place-items-center rounded-md transition-all duration-[var(--duration-micro)] ease-[var(--ease-out)]",
          value === "list" ? "bg-surface text-ink shadow-[var(--shadow-ring),var(--shadow-xs)]" : "hover:text-ink hover:bg-surface/50",
        )}
        aria-label="List view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
          <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
          <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}