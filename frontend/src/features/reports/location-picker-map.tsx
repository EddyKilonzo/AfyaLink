"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { cx } from "@/components/ui/cx";

/** Leaflet needs `window`, so this is loaded lazily via `next/dynamic`. */
export type LocationPickerMapProps = {
  center: LatLngTuple;
  latitude?: number;
  longitude?: number;
  onPick: (lat: number, lng: number) => void;
  className: string;
};

/** Branded pin in forest green, replacing the default Leaflet marker so exports
 * and screenshots stay on brand. The SVG lives in the page DOM, so the colour
 * tokens from globals.css resolve. Built once; Leaflet reuses the options. */
const BRANDED_PIN = L.divIcon({
  className: "afyalink-pin",
  html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M16 44C16 44 4 29.4 4 18.4 4 8.2 10.7 0 16 0C21.3 0 28 8.2 28 18.4 28 29.4 16 44 16 44Z" fill="var(--color-brand-600)" stroke="#fff" stroke-width="2.5"/>
    <circle cx="16" cy="18" r="6" fill="#fff"/>
    <circle cx="16" cy="18" r="2.5" fill="var(--color-brand-600)"/>
  </svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  tooltipAnchor: [0, -44],
});

const MAP_LABEL =
  "Interactive map. Tap to drop a pin. Arrow keys pan, plus and minus zoom, Enter drops a pin at the centre.";

export default function LocationPickerMap(props: LocationPickerMapProps) {
  const { center, latitude, longitude, onPick, className } = props;
  const [tilesLoading, setTilesLoading] = useState(true);

  return (
    // Leaflet's keyboard handler makes its own container the single tab stop
    // (arrows pan, +/- zoom); the wrapper only draws the focus ring for it.
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl ring-1 ring-inset ring-line focus-within:ring-[3px] focus-within:ring-brand-500/35",
        "[&_.leaflet-container]:outline-none",
        className,
      )}
    >
      <MapContainer center={center} zoom={13} zoomControl doubleClickZoom={false} keyboard className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer nofollow">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ loading: () => setTilesLoading(true), load: () => setTilesLoading(false) }}
        />
        {latitude !== undefined && longitude !== undefined && (
          <>
            <Marker position={[latitude, longitude]} icon={BRANDED_PIN} />
            <FollowPin latitude={latitude} longitude={longitude} />
          </>
        )}
        <Pinner onPick={onPick} />
      </MapContainer>
      {tilesLoading && (
        <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-sunken/70" aria-hidden>
          <span className="flex items-center gap-2 text-sm font-medium text-muted">
            <Loader2 className="size-4 animate-spin" /> Loading map…
          </span>
        </div>
      )}
    </div>
  );
}

/** MapContainer only reads `center` on mount, so a pin set from outside the
 * map (e.g. "Use my location") would land off-screen. Bring it into view and
 * zoom to street level; taps on the map are already visible, so they never move it. */
function FollowPin({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    const target = L.latLng(latitude, longitude);
    if (map.getBounds().contains(target)) return;
    map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.8 });
  }, [map, latitude, longitude]);
  return null;
}

/** Drops a pin wherever the user taps — or at the centre on Enter/Space, so
 * keyboard users can pick a spot too — then reports the coordinates up. */
function Pinner({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  const pick = (lat: number, lng: number) => onPick(Number(lat.toFixed(6)), Number(lng.toFixed(6)));

  useEffect(() => {
    map.getContainer().setAttribute("aria-label", MAP_LABEL);
  }, [map]);

  useMapEvents({
    click(e) {
      pick(e.latlng.lat, e.latlng.lng);
    },
    keydown(e) {
      if (e.originalEvent.key !== "Enter" && e.originalEvent.key !== " ") return;
      e.originalEvent.preventDefault();
      const c = map.getCenter();
      pick(c.lat, c.lng);
    },
  });
  return null;
}
