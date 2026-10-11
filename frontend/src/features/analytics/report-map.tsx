"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS, type MapPoint, type ReportSeverity } from "@/types";
import { SEVERITY_COLORS } from "./colors";
import { HeatLayer, type HeatPoint } from "./heat-layer";

export type MapMode = "markers" | "heat";

const KENYA_CENTER: [number, number] = [0.2, 37.9];
const SEVERITY_WEIGHT: Record<ReportSeverity, number> = { LOW: 1, MODERATE: 1.6, HIGH: 2.4, CRITICAL: 3.4 };

/** Radius grows with case count, capped so clusters stay readable. */
function radiusFor(cases: number): number {
  return Math.min(6 + Math.sqrt(cases) * 2.2, 22);
}

function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const fitted = useRef("");
  useEffect(() => {
    // Refit only when the set of points changes, not on every render.
    const key = points.map((p) => p.id).join(",");
    if (points.length === 0 || key === fitted.current) return;
    fitted.current = key;
    const bounds: LatLngBoundsExpression = points.map((p) => [p.latitude, p.longitude]);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 11, animate: true });
  }, [map, points]);
  return null;
}

function Heat({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const heatPoints = useMemo<HeatPoint[]>(
    () => points.map((p) => ({ lat: p.latitude, lng: p.longitude, weight: p.casesCount * SEVERITY_WEIGHT[p.severity] })),
    [points],
  );
  const layer = useRef<HeatLayer | null>(null);

  useEffect(() => {
    layer.current = new HeatLayer(heatPoints).addTo(map);
    return () => {
      layer.current?.remove();
      layer.current = null;
    };
    // Create once per map; point updates go through setPoints below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    layer.current?.setPoints(heatPoints);
  }, [heatPoints]);

  return null;
}

/**
 * Client-only (Leaflet touches `window`): load through `next/dynamic` with
 * `ssr: false`. Popups show aggregate, non-identifying fields only.
 */
export default function ReportMap({
  points,
  mode = "markers",
  className = "h-[60dvh] min-h-80",
  interactive = true,
}: {
  points: MapPoint[];
  mode?: MapMode;
  className?: string;
  /** False for small previews: no scroll/drag capture inside a page. */
  interactive?: boolean;
}) {
  return (
    <MapContainer
      center={KENYA_CENTER}
      zoom={6}
      scrollWheelZoom={false}
      dragging={interactive}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      attributionControl
      className={`w-full ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPoints points={points} />
      {mode === "heat" ? (
        <Heat points={points} />
      ) : (
        points.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={radiusFor(p.casesCount)}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: SEVERITY_COLORS[p.severity], fillOpacity: 0.82 }}
          >
            {interactive && (
              <Popup>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{p.conditionName}</p>
                <p style={{ color: "#687873", margin: 0 }}>
                  {CATEGORY_LABELS[p.category]}, {SEVERITY_LABELS[p.severity].toLowerCase()} severity
                </p>
                <p style={{ margin: "6px 0 0" }}>
                  {p.casesCount} {p.casesCount === 1 ? "case" : "cases"}, {STATUS_LABELS[p.status].toLowerCase()}
                </p>
                <p style={{ color: "#687873", margin: 0 }}>
                  {[p.ward, p.county].filter(Boolean).join(", ") || "Area not recorded"}, {formatDate(p.observedAt)}
                </p>
              </Popup>
            )}
          </CircleMarker>
        ))
      )}
    </MapContainer>
  );
}
