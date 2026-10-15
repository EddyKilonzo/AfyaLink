import { Activity, Apple, Baby, ChevronRight, Droplets, FileText, Flower2, HeartPulse, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ReviewStatusBadge, SeverityBadge, SyncStateBadge } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { formatRelative } from "@/lib/format";
import type { LocalReport } from "@/lib/db";
import { CATEGORY_LABELS, type ReportCategory, type ServerReport } from "@/types";

export const CATEGORY_ICONS: Record<ReportCategory, LucideIcon> = {
  DISEASE_CASE: Activity,
  MATERNAL_HEALTH: HeartPulse,
  CHILD_HEALTH: Baby,
  NUTRITION: Apple,
  WATER_SANITATION: Droplets,
  DEATH: Flower2,
  OTHER: FileText,
};

export function CategoryIcon({ category, className }: { category: ReportCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-colors duration-[var(--duration-micro)] group-hover:bg-brand-100", className)}>
      <Icon className="size-[18px]" aria-hidden />
    </span>
  );
}

/**
 * One report in a list. Server reports link to their detail page; reports
 * still on the device show their sync state instead of a review status.
 */
export function ReportRow({
  report,
  source,
  href,
  trailing,
}: {
  report: ServerReport | LocalReport;
  source: "server" | "local";
  href?: string;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <CategoryIcon category={report.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{report.conditionName}</p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
          {CATEGORY_LABELS[report.category]}, {report.casesCount} {report.casesCount === 1 ? "case" : "cases"}, {formatRelative(report.observedAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <SeverityBadge severity={report.severity} className="max-sm:hidden" />
        {source === "local" ? (
          <SyncStateBadge state={(report as LocalReport).syncState} />
        ) : (
          <ReviewStatusBadge status={(report as ServerReport).status} />
        )}
      </div>
      {trailing}
      {href && <ChevronRight className="size-4 shrink-0 text-muted/60 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden />}
    </>
  );

  const className = "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-[background-color,transform,box-shadow] duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] hover:bg-sunken hover:shadow-[var(--shadow-ring)] active:scale-[0.992] sm:gap-4 sm:px-4";
  return href ? (
    <Link href={href} className={cx(className, "press-lift focus-ring")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
