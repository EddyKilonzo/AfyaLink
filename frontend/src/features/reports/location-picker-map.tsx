"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngTuple } from "leaflet";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
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

export default function LocationPickerMap(props: LocationPickerMapProps) {
  const { center, latitude, longitude, onPick, icon, className } = props;
  return (
    <div className={cx("overflow-hidden rounded-2xl ring-1 ring-inset ring-line", className)}>
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        doubleClickZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude !== undefined && longitude !== undefined && (
          <Marker position={[latitude, longitude]} icon={new L.Icon(icon)} />
        )}
        <Pinner onPick={onPick} />
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