"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Flame,
  Globe,
  Landmark,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Stagger, StaggerItem } from "@/components/motion";
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, PanelHeader, Skeleton, StatCard } from "@/components/ui";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { DailyReportsChart, RankedBarChart } from "@/features/analytics/charts";
import { useAnalyticsSummary, useMapPoints } from "@/features/analytics/hooks";
import { MapLegend, MapView } from "@/features/analytics/map-view";
import type { MapMode } from "@/features/analytics/report-map";
import { useServerReports } from "@/features/reports/hooks";
import { ReportRow } from "@/features/reports/report-row";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/types";
import { useExportReports } from "./hooks";

const PERIODS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 365, label: "1y" },
];

export function AdminOverviewScreen() {
  const [days, setDays] = useState(30);
  const summary = useAnalyticsSummary(days);
  const exporter = useExportReports();
  const toast = useToast();
  const s = summary.data;

  async function exportCsv() {
    const filename = await exporter.run({ from: s?.since });
    if (filename) toast.success("Export ready", `${filename} has been downloaded.`);
  }

  useEffect(() => {
    if (exporter.error) toast.error("Export failed", exporter.error);
  }, [exporter.error, toast]);

return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Overview"
        description="Reports from every county, as received by the server."
        action={
          <>
            <Segmented label="Period" size="sm" value={days} onChange={setDays} options={PERIODS} />
            <Button variant="outline" size="sm" loading={exporter.pending} onClick={() => void exportCsv()} icon={<Download className="size-4" aria-hidden />}>
              Export CSV
            </Button>
          </>
        }
      />

      {summary.error && !s && <ErrorState message={summary.error} onRetry={summary.reload} />}

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/admin/reports" className="group rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/35">
          <StatCard
            label="Awaiting review"
            value={s?.pendingReview ?? null}
            icon={ClipboardCheck}
            tone="brand"
            hint={<span className="inline-flex items-center gap-1 font-semibold text-brand-700">Open queue <ArrowRight className="size-3 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden /></span>}
            className="press-lift h-full"
          />
        </Link>
        <StatCard label="Reports" value={s?.totals.reports ?? null} icon={FileText} hint={`Last ${days} days`} />
        <StatCard label="Cases" value={s?.totals.cases ?? null} icon={Activity} hint={`Last ${days} days`} />
        <StatCard label="Counties reporting" value={s?.byCounty.length ?? null} icon={Landmark} hint="With at least one report" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="Reports over time" description={`Reports received per day, last ${days} days`} />
          <div className="px-3 pb-4 pt-4 sm:px-5">
            {s ? <DailyReportsChart byDay={s.byDay} since={s.since} days={s.periodDays} compact={days <= 7} height={260} /> : <Skeleton className="h-64 w-full rounded-xl" />}
          </div>
        </Panel>
        <Panel variant="elevated">
          <PanelHeader title="Where it matters" description="Counties with the most reports" />
          <div className="px-5 pb-5 pt-4">
            {s ? (
              s.byCounty.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No reports in this period.</p>
              ) : (
                <div className="space-y-3">
                  {s.byCounty.slice(0, 5).map((c, i) => (
                    <div key={c.county} className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{c.county}</p>
                        <p className="text-xs text-muted">{c.reports} reports</p>
                      </div>
                      <BarChart3 className="size-4 text-muted" aria-hidden />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <LoadingState rows={5} />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown title="By category" description="Number of reports" loading={!s} empty={s?.byCategory.length === 0}>
          {s && <RankedBarChart ariaLabel="Reports by category" valueName="Reports" data={s.byCategory.map((c) => ({ label: CATEGORY_LABELS[c.category], value: c.count }))} />}
        </Breakdown>
        <Breakdown title="By county" description="Number of reports" loading={!s} empty={s?.byCounty.length === 0}>
          {s && <RankedBarChart ariaLabel="Reports by county" valueName="Reports" data={s.byCounty.map((c) => ({ label: c.county, value: c.reports }))} />}
        </Breakdown>
        <Breakdown title="Top conditions" description="Total cases reported" loading={!s} empty={s?.topConditions.length === 0}>
          {s && <RankedBarChart ariaLabel="Cases by condition" valueName="Cases" data={s.topConditions.map((c) => ({ label: c.condition, value: c.cases }))} />}
        </Breakdown>
        <Breakdown title="Review progress" description="Reports by review status" loading={!s} empty={s?.byStatus.length === 0}>
          {s && <RankedBarChart ariaLabel="Reports by review status" valueName="Reports" data={s.byStatus.map((c) => ({ label: STATUS_LABELS[c.status], value: c.count }))} />}
        </Breakdown>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <GeoPanel days={days} />
        <div className="grid gap-6">
          <RecentSubmissions />
          <NetworkPanel s={s} />
        </div>
      </div>
    </div>
  );
}

function Breakdown({ title, description, loading, empty, children }: { title: string; description: string; loading: boolean; empty?: boolean; children: ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <div className="px-4 pb-5 pt-4 sm:px-6">
        {loading ? <Skeleton className="h-40 w-full rounded-xl" /> : empty ? <p className="py-8 text-center text-sm text-muted">No reports in this period.</p> : children}
      </div>
    </Panel>
  );
}

function NetworkPanel({ s }: { s: ReturnType<typeof useAnalyticsSummary>["data"] }) {
  const counties = s?.byCounty.length ?? 0;
  const reviewed = s?.byStatus.find((x) => x.status === "REVIEWED")?.count ?? 0;
  const submitted = s?.byStatus.find((x) => x.status === "SUBMITTED")?.count ?? 0;
  return (
    <Panel>
      <PanelHeader title="Network" description="Reach of reporting in this period" />
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="rounded-xl bg-sunken p-4">
          <Globe className="size-5 text-brand-600" aria-hidden />
          <p className="mt-2 text-metric text-ink">{counties || "—"}</p>
          <p className="text-xs text-muted">Counties reached</p>
        </div>
        <div className="rounded-xl bg-sunken p-4">
          <Users className="size-5 text-brand-600" aria-hidden />
          <p className="mt-2 text-metric text-ink">{s?.byCounty.length ?? "—"}</p>
          <p className="text-xs text-muted">Wards mapped</p>
        </div>
        <div className="rounded-xl bg-sunken p-4">
          <Building2 className="size-5 text-brand-600" aria-hidden />
          <p className="mt-2 text-metric text-ink">{submitted || "—"}</p>
          <p className="text-xs text-muted">Awaiting review</p>
        </div>
        <div className="rounded-xl bg-sunken p-4">
          <CheckCircle2 className="size-5 text-brand-600" aria-hidden />
          <p className="mt-2 text-metric text-ink">{reviewed || "—"}</p>
          <p className="text-xs text-muted">Reviewed</p>
        </div>
      </div>
    </Panel>
  );
}

function GeoPanel({ days }: { days: number }) {
  const [mode, setMode] = useState<MapMode>("heat");
  const map = useMapPoints({ days });
  return (
    <Panel className="flex flex-col overflow-hidden">
      <PanelHeader
        title="Geographic distribution"
        description={map.data ? `${map.data.points.length.toLocaleString()} mapped reports` : "Loading locations"}
        action={
          <Segmented
            label="Map view"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "heat", label: <><Flame aria-hidden /> Heat</> },
              { value: "markers", label: <><MapPin aria-hidden /> Markers</> },
            ]}
          />
        }
      />
      <div className="relative h-80 border-y border-line">
        {map.error && !map.data ? (
          <div className="p-4">
            <ErrorState message={map.error} onRetry={map.reload} />
          </div>
        ) : map.data ? (
          <MapView points={map.data.points} mode={mode} className="h-full" />
        ) : (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <MapLegend mode={mode} />
        <Link href="/maps" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
          Full map
        </Link>
      </div>
    </Panel>
  );
}

function RecentSubmissions() {
  const reports = useServerReports({ page: 1, limit: 6 });
  return (
    <Panel>
      <PanelHeader
        title="Recent submissions"
        action={
          <Link href="/admin/reports" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Review <ArrowRight className="size-3.5 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      />
      <div className="p-2 pt-3 sm:p-3">
        {reports.error && !reports.data ? (
          <div className="p-2">
            <ErrorState message={reports.error} onRetry={reports.reload} />
          </div>
        ) : !reports.data ? (
          <div className="p-3">
            <LoadingState rows={4} />
          </div>
        ) : reports.data.items.length === 0 ? (
          <EmptyState icon={FileText} title="No reports yet" description="Reports appear here as volunteers sync them." />
        ) : (
          <Stagger className="space-y-0.5">
            {reports.data.items.map((r) => (
              <StaggerItem key={r.id}>
                <ReportRow report={r} source="server" href={`/reports/${r.id}`} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </Panel>
  );
}
