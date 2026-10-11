"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";
import { REPORT_SEVERITIES, SEVERITY_LABELS } from "@/types";
import { SEVERITY_COLORS } from "./colors";
import type { MapMode } from "./report-map";

/** Leaflet needs `window`, so the map renders only in the browser. */
export const MapView = dynamic(() => import("./report-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-64 w-full rounded-none" />,
});

export function MapLegend({ mode }: { mode: MapMode }) {
  if (mode === "heat") {
    return (
      <div className="flex items-center gap-2.5 text-xs text-muted" aria-label="Heat legend: low to high case density">
        <span>Fewer cases</span>
        <span className="flex h-2 w-28 overflow-hidden rounded-full ring-1 ring-inset ring-black/5" aria-hidden>
          {["#b7e6d1", "#1d8a70", "#f3b66a", "#c43d4b"].map((c) => (
            <span key={c} className="flex-1" style={{ background: c }} />
          ))}
        </span>
        <span>More cases</span>
      </div>
    );
  }
  return (
    <ul aria-label="Severity legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {REPORT_SEVERITIES.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-2 ring-white" style={{ background: SEVERITY_COLORS[s] }} aria-hidden />
          {SEVERITY_LABELS[s]}
        </li>
      ))}
      <li>Larger circle, more cases</li>
    </ul>
  );
}
