"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { cx } from "@/components/ui/cx";

/** Leaflet needs `window`, so this is loaded lazily via `next/dynamic`. */
export type LocationPickerMapProps = {
  center: LatLngTuple;
  latitude?: number;
  longitude?: number;
  onPick: (lat: number, lng: number) => void;
  icon: L.IconOptions;
  className: string;
};

/** Branded pin — a forest-green circle with a white dot, replacing the default
 * Leaflet marker so exports and screenshots stay on brand. */
function brandedPin(): L.DivIcon {
  return L.divIcon({
    className: "afyalink-pin",
    html: `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 44C16 44 4 29.4 4 18.4 4 8.2 10.7 0 16 0C21.3 0 28 8.2 28 18.4 28 29.4 16 44 16 44Z" fill="#146C5A" stroke="#fff" stroke-width="2.5"/>
      <circle cx="16" cy="18" r="6" fill="#fff"/>
      <circle cx="16" cy="18" r="2.5" fill="#146C5A"/>
    </svg>`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    tooltipAnchor: [0, -44],
  });
}

export default function LocationPickerMap(props: LocationPickerMapProps) {
  const { center, latitude, longitude, onPick, className } = props;
  return (
    <div
      className={cx(
        "overflow-hidden rounded-2xl ring-1 ring-inset ring-line outline-none focus-within:shadow-[var(--shadow-glow)]",
        className,
      )}
      tabIndex={0}
      aria-label="Interactive map. Tap to drop a pin. Arrow keys to pan, plus and minus to zoom."
    >
      <MapContainer
        center={center}
        zoom={13}
        zoomControl
        doubleClickZoom={false}
        keyboard
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer nofollow">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude !== undefined && longitude !== undefined && (
          <Marker position={[latitude, longitude]} icon={brandedPin()} />
        )}
        <Pinner onPick={onPick} />
        <KeyboardPan />
      </MapContainer>
    </div>
  );
}

/** Drops a pin wherever the user taps, then reports the coordinates up. */
function Pinner({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

/** Arrow keys pan, plus/minus zoom, so the map is usable without a pointer. */
function KeyboardPan() {
  const map = useMap();
  useMapEvents({
    keydown(e) {
      // react-leaflet's LeafletKeyboardEvent is a thin wrapper; pull the native
      // event off it so we can read `key` and call preventDefault.
      const native = (e as unknown as { original?: KeyboardEvent }).original ?? (e as unknown as KeyboardEvent);
      const step = 0.005;
      const zoomStep = 1;
      const center = map.getCenter();
      switch (native.key) {
        case "ArrowUp":
          map.setView([center.lat + step, center.lng], map.getZoom(), { animate: true });
          break;
        case "ArrowDown":
          map.setView([center.lat - step, center.lng], map.getZoom(), { animate: true });
          break;
        case "ArrowLeft":
          map.setView([center.lat, center.lng - step], map.getZoom(), { animate: true });
          break;
        case "ArrowRight":
          map.setView([center.lat, center.lng + step], map.getZoom(), { animate: true });
          break;
        case "+":
        case "=":
          map.setZoom(map.getZoom() + zoomStep);
          break;
        case "-":
        case "_":
          map.setZoom(map.getZoom() - zoomStep);
          break;
        case "Home":
          map.setView(center, Math.min(map.getZoom() + 2, 18), { animate: true });
          break;
        case "End":
          map.setView(center, Math.max(map.getZoom() - 2, 0), { animate: true });
          break;
        default:
          return;
      }
      native.preventDefault?.();
    },
  });
  return null;
}