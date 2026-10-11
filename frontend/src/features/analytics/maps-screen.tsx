"use client";

import { Flame, MapPinned, MapPin, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, FilterSelect, PageHeader, Panel, SeverityBadge } from "@/components/ui";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { formatRelative } from "@/lib/format";
import { CATEGORY_LABELS, REPORT_CATEGORIES, REPORT_SEVERITIES, SEVERITY_LABELS, type ReportCategory, type ReportSeverity } from "@/types";
import { PERIOD_OPTIONS, useMapPoints } from "./hooks";
import { MapLegend, MapView } from "./map-view";
import type { MapMode } from "./report-map";

export function MapsScreen() {
  const [days, setDays] = useState<number>(30);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [severity, setSeverity] = useState<ReportSeverity | "">("");
  const [mode, setMode] = useState<MapMode>("markers");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const map = useMapPoints({ days, category: category || undefined, severity: severity || undefined });
  const points = map.data?.points ?? [];
  const activeFilters = Number(Boolean(category)) + Number(Boolean(severity));

  const filters = (
    <>
      <FilterSelect label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
        {PERIOD_OPTIONS.map((d) => (
          <option key={d} value={d}>
            Last {d} days
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value as ReportCategory | "")}>
        <option value="">All categories</option>
        {REPORT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as ReportSeverity | "")}>
        <option value="">All severities</option>
        {REPORT_SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABELS[s]}
          </option>
        ))}
      </FilterSelect>
    </>
  );

  return (
    <>
      <PageHeader
        title="Disease map"
        description="Where reports came from. Notes, symptoms and who reported are never shown here."
        action={
          <Segmented
            label="Map view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "markers", label: <><MapPin aria-hidden /> Markers</> },
              { value: "heat", label: <><Flame aria-hidden /> Heat</> },
            ]}
          />
        }
      />

      <Panel className="overflow-hidden">
        {/* Filters: inline from tablet up, a sheet on phones */}
        <div className="flex items-center gap-2 border-b border-line px-3 py-3 sm:px-4">
          <div className="hidden flex-wrap gap-2 sm:flex">{filters}</div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line-strong bg-surface px-3 text-sm font-semibold shadow-xs sm:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> Filters
            {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[0.6875rem] text-white">{activeFilters}</span>}
          </button>
          <p className="ml-auto text-right text-[0.8125rem] text-muted" aria-live="polite">
            {map.data ? (
              <>
                <span className="font-semibold text-ink">{points.length.toLocaleString()}</span> {points.length === 1 ? "location" : "locations"}
                {map.data.truncated && <span className="max-sm:hidden">, newest 2,000 shown</span>}
              </>
            ) : map.loading ? (
              "Loading…"
            ) : null}
          </p>
        </div>

        <div className="relative h-[calc(100dvh-17rem)] min-h-[22rem] md:h-[min(68dvh,40rem)]">
          {map.error && !map.data ? (
            <div className="p-4">
              <ErrorState message={map.error} onRetry={map.reload} />
            </div>
          ) : map.data && points.length === 0 ? (
            <EmptyState icon={MapPinned} title="Nothing to map yet" description="No reports with a location match these filters. Try a longer period." className="h-full justify-center" />
          ) : (
            <MapView points={points} mode={mode} className="h-full" />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <MapLegend mode={mode} />
          {map.data && <p className="text-xs text-muted">{map.data.scope === "own" ? "Showing your reports" : "Showing all reports"}</p>}
        </div>
      </Panel>

      {points.length > 0 && (
        <details className="group mt-4 rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-ring),var(--shadow-xs)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold sm:px-5">
            List view
            <span className="text-xs font-normal text-muted group-open:hidden">Every location as text</span>
          </summary>
          <ul className="max-h-96 divide-y divide-line overflow-auto border-t border-line">
            {points.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{p.conditionName}</span>
                  <span className="block truncate text-xs text-muted">
                    {p.casesCount} {p.casesCount === 1 ? "case" : "cases"}, {[p.ward, p.county].filter(Boolean).join(", ") || "area not recorded"}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <SeverityBadge severity={p.severity} />
                  <span className="text-xs text-muted">{formatRelative(p.observedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter the map">
        <div className="grid gap-3 px-2 pb-2 [&_select]:min-h-12">{filters}</div>
      </Sheet>
    </>
  );
}
