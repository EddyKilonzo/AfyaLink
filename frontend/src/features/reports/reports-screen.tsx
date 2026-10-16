"use client";

import { FilePlus2, FileSearch, FileText, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { Stagger, StaggerItem } from "@/components/motion";
import { Masonry, MasonryItem } from "@/components/masonry";
import { Pagination } from "@/components/pagination";
import { Button, ButtonLink, EmptyState, ErrorState, FilterSelect, LoadingState, PageHeader, Panel } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { formatDateTime } from "@/lib/format";
import { openPrintablePdf } from "@/lib/pdf-generator";
import { CATEGORY_LABELS, REPORT_CATEGORIES, REPORT_STATUSES, STATUS_LABELS, type ReportCategory, type ReportStatus } from "@/types";
import { useReportsFeed } from "./hooks";
import { ReportCard } from "./report-card";
import { reportStats, reportTable, severityBars, type PdfReportRow } from "./report-pdf";
import { ReportRow } from "./report-row";

export function ReportsScreen() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [exportingPdf, setExportingPdf] = useState(false);
  const feed = useReportsFeed({ page, limit: 20, category: category || undefined, status: status || undefined });
  const { user } = useAuth();
  const toast = useToast();
  const filtered = Boolean(category || status);
  const local = feed.items.filter((i) => i.source === "local");
  const server = feed.items.filter((i) => i.source === "server");

  async function exportPdf() {
    if (!user) return;
    setExportingPdf(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const rows: PdfReportRow[] = feed.items.map((i) => ({
        conditionName: i.report.conditionName,
        category: i.report.category,
        severity: i.report.severity,
        casesCount: i.report.casesCount,
        observedAt: i.observedAt,
        status: i.source === "server" ? i.report.status : undefined,
      }));
      const waiting = rows.filter((r) => !r.status).length;
      openPrintablePdf(
        {
          title: "My health reports",
          subtitle: `${rows.length.toLocaleString()} report(s)${filtered ? " matching your filters" : ""} · ${user.fullName}`,
          kind: "Personal summary",
          generatedAt: formatDateTime(new Date().toISOString()),
          generatedBy: user.fullName,
          role: user.role === "CHV" ? "Community Health Volunteer" : user.role,
        },
        [
          reportStats(rows, [{ label: "Waiting to sync", value: waiting.toLocaleString(), hint: waiting ? "Saved on this device" : "All on the server" }]),
          severityBars(rows),
          ...(filtered
            ? [
                {
                  heading: "Filters",
                  rows: [
                    { label: "Category", value: category ? CATEGORY_LABELS[category] : "All" },
                    { label: "Status", value: status ? STATUS_LABELS[status] : "Any" },
                  ],
                },
              ]
            : []),
          reportTable(rows),
        ],
        `my-reports-${stamp}.pdf`,
      );
      toast.success("PDF opened", "Save it from the print dialog as PDF.");
    } catch (e) {
      toast.error("PDF failed", e instanceof Error ? e.message : "Try again later.");
    } finally {
      setExportingPdf(false);
    }
  }

  const renderList = (items: typeof feed.items, hrefFor: (id: string) => string) =>
    view === "grid" ? (
      <Masonry cols={{ default: 1, sm: 2, lg: 3 }} gap={1} itemClass="contents">
        {items.map((item) => (
          <MasonryItem key={item.id}>
            <ReportCard report={item.report} source={item.source} href={hrefFor(item.id)} view="grid" />
          </MasonryItem>
        ))}
      </Masonry>
    ) : (
      <Stagger className="space-y-0.5">
        {items.map((item) => (
          <StaggerItem key={item.id}>
            <ReportRow report={item.report} source={item.source} href={hrefFor(item.id)} />
          </StaggerItem>
        ))}
      </Stagger>
    );

  return (
    <>
      <PageHeader
        title="My reports"
        description="Everything you've recorded. Reports still on this device stay at the top until the server confirms them."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              loading={exportingPdf}
              onClick={() => void exportPdf()}
              icon={<FileText className="size-4" aria-hidden />}
            >
              Export PDF
            </Button>
            <ButtonLink href="/reports/new" icon={<FilePlus2 className="size-4" aria-hidden />} className="max-sm:w-full">
              New report
            </ButtonLink>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as ReportCategory | "");
            setPage(1);
          }}
          className="max-sm:flex-1"
        >
          <option value="">All categories</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Review status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReportStatus | "");
            setPage(1);
          }}
          className="max-sm:flex-1"
        >
          <option value="">Any status</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
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

      {feed.error && <ErrorState className="mb-4" message={`Reports on the server couldn't be loaded. ${feed.error}`} onRetry={feed.reload} />}

      {feed.loading && feed.items.length === 0 ? (
        <Panel className="p-5">
          <LoadingState rows={5} label="Loading reports" />
        </Panel>
      ) : feed.items.length === 0 ? (
        <Panel>
          {filtered ? (
            <EmptyState icon={FileSearch} title="No reports match" description="Try a different category or status." />
          ) : (
            <EmptyState
              icon={FilePlus2}
              title="No reports yet"
              description="Reports you record appear here, whether or not you're online."
              action={<ButtonLink href="/reports/new">Record your first report</ButtonLink>}
            />
          )}
        </Panel>
      ) : (
        <div className="space-y-5">
          {local.length > 0 && (
            <Panel variant="sunken" className="p-2 ring-1 ring-inset ring-amber/40">
              <h2 className="px-3 pb-1 pt-2 text-sm font-semibold text-amber-ink">On this device, not yet confirmed by the server</h2>
              {renderList(local, () => "/sync")}
            </Panel>
          )}
          {server.length > 0 && (
            <Panel className="p-2">
              {renderList(server, (id) => `/reports/${id}`)}
              {feed.page && (
                <div className="px-2 pb-2">
                  <Pagination page={feed.page} onPageChange={setPage} />
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </>
  );
}