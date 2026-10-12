"use client";

import { ChevronRight, ClipboardCheck, FileSearch, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Masonry, MasonryItem } from "@/components/masonry";
import { Stagger, StaggerItem } from "@/components/motion";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState, FilterSelect, LoadingState, PageHeader, Panel, ReviewStatusBadge, SeverityBadge } from "@/components/ui";
import { Segmented } from "@/components/ui/segmented";
import { useAnalyticsSummary } from "@/features/analytics/hooks";
import { ReviewActions } from "@/features/reports/report-detail-screen";
import { useServerReports } from "@/features/reports/hooks";
import { CategoryIcon } from "@/features/reports/report-row";
import { formatRelative } from "@/lib/format";
import { CATEGORY_LABELS, REPORT_SEVERITIES, SEVERITY_LABELS, type ReportSeverity, type ReportStatus, type ServerReport } from "@/types";
import { ReportCard } from "@/features/reports/report-card";

type Tab = ReportStatus | "ALL";

export function AdminReportsScreen() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("SUBMITTED");
  const [severity, setSeverity] = useState<ReportSeverity | "">("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const reports = useServerReports({ page, limit: 20, status: tab === "ALL" ? undefined : tab, severity: severity || undefined });
  const summary = useAnalyticsSummary(365);
  const waiting = summary.data?.pendingReview;

  const renderList = (items: ServerReport[], hrefFor: (id: string) => string) =>
    view === "grid" ? (
      <Masonry cols={{ default: 1, sm: 2, lg: 3 }} gap={3} itemClass="contents">
        {items.map((item) => (
          <MasonryItem key={item.id}>
            <ReportCard report={item} source="server" href={hrefFor(item.id)} view="grid" />
          </MasonryItem>
        ))}
      </Masonry>
    ) : (
      <Stagger className="space-y-3">
        {items.map((r) => (
          <StaggerItem key={r.id}>
            <article className="press-lift rounded-[var(--radius-xl)] bg-surface p-4 shadow-[var(--shadow-ring),var(--shadow-xs)] transition-[background-color,transform,box-shadow] duration-[var(--duration-micro)] hover:bg-sunken hover:shadow-[var(--shadow-ring),var(--shadow-sm)] sm:p-5">
              <Link href={`/reports/${r.id}`} className="group flex items-start gap-3 sm:gap-4">
                <CategoryIcon category={r.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="truncate font-semibold text-ink group-hover:underline">{r.conditionName}</h2>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-muted">
                    {CATEGORY_LABELS[r.category]}, {r.casesCount} {r.casesCount === 1 ? "case" : "cases"}, observed {formatRelative(r.observedAt)}
                  </p>
                </div>
                <ReviewStatusBadge status={r.status} />
                <ChevronRight className="mt-2 size-4 shrink-0 text-muted/60 max-sm:hidden" aria-hidden />
              </Link>
              {r.status !== "ACTIONED" && (
                <div className="mt-3 border-t border-line pt-3 sm:ml-14">
                  <ReviewActions report={r} onDone={reports.reload} compact />
                </div>
              )}
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    );

  return (
    <>
      <PageHeader
        title="Report review"
        description="Check each report, then mark it reviewed or actioned. Reports only move forward."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Review status"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          className="max-sm:w-full max-sm:[&>label]:flex-1"
          options={[
            { value: "SUBMITTED", label: <>To review{waiting ? <span className="rounded-full bg-amber px-1.5 text-[0.6875rem] text-brand-950">{waiting}</span> : null}</> },
            { value: "REVIEWED", label: "Reviewed" },
            { value: "ACTIONED", label: "Actioned" },
            { value: "ALL", label: "All" },
          ]}
        />
        <FilterSelect
          label="Severity"
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value as ReportSeverity | "");
            setPage(1);
          }}
        >
          <option value="">All severities</option>
          {REPORT_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABELS[s]}
            </option>
          ))}
        </FilterSelect>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-sunken p-0.5 text-muted" role="group" aria-label="View mode">
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
            className="grid size-8 place-items-center rounded-md transition-colors"
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
            className="grid size-8 place-items-center rounded-md transition-colors"
            aria-label="List view"
          >
            <List className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {reports.error && !reports.data ? (
        <ErrorState message={reports.error} onRetry={reports.reload} />
      ) : !reports.data ? (
        <Panel className="p-5">
          <LoadingState rows={5} label="Loading reports" />
        </Panel>
      ) : reports.data.items.length === 0 ? (
        <Panel>
          {tab === "SUBMITTED" && !severity ? (
            <EmptyState icon={ClipboardCheck} title="You're all caught up" description="No reports are waiting for review." />
          ) : (
            <EmptyState icon={FileSearch} title="No reports match" description="Try another status or severity." />
          )}
        </Panel>
      ) : (
        <div className="space-y-5">
          {renderList((reports.data?.items as ServerReport[]) ?? [], (id) => `/reports/${id}`)}
          <Pagination page={reports.data} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}
