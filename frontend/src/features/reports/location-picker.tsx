"use client";

import dynamic from "next/dynamic";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapPinned } from "lucide-react";
import { cx } from "@/components/ui/cx";

/** Default marker: a pin in AfyaLink green. */
export const PIN_ICON: L.IconOptions = {
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
};

const KENYA_CENTER: LatLngTuple = [-1.2, 36.8];

/** Leaflet needs `window`, so the map is loaded lazily only in the browser. */
const MapInner = dynamic<{ center: LatLngTuple; latitude?: number; longitude?: number; onPick: (lat: number, lng: number) => void; icon: L.IconOptions; className: string }>(
  () => import("./location-picker-map").then((m) => m.default),
  { ssr: false },
);

/**
 * A small, tap-to-pin map for the report form. Renders only in the browser;
 * SSR would break on `window`/`document`.
 */
export function LocationPicker({
  latitude,
  longitude,
  onPick,
  className = "h-56",
}: {
  latitude?: number;
  longitude?: number;
  onPick: (lat: number, lng: number) => void;
  className?: string;
}) {
  // Render a placeholder during SSR; the map swaps in once mounted.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const center: LatLngTuple =
    latitude !== undefined && longitude !== undefined ? [latitude, longitude] : KENYA_CENTER;

  if (!ready) {
    return (
      <div className={cx("relative overflow-hidden rounded-2xl bg-sunken ring-1 ring-inset ring-line", className)} aria-hidden>
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="grid h-full place-items-center">
          <div className="flex flex-col items-center gap-2 text-muted">
            <span className="grid size-9 place-items-center rounded-xl bg-surface ring-1 ring-inset ring-line">
              <MapPinned className="size-5 text-brand-600" aria-hidden />
            </span>
            <span className="text-sm font-medium">Loading map…</span>
          </div>
        </div>
      </div>
    );
  }

  return <MapInner center={center} latitude={latitude} longitude={longitude} onPick={onPick} icon={PIN_ICON} className={className} />;
}