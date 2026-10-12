"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, type MapContainerProps } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cx } from "@/components/ui/cx";

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface HeatLayerProps {
  points: HeatPoint[];
  radius?: number;
  maxOpacity?: number;
  minOpacity?: number;
  blur?: number;
  gradient?: Record<number, string>;
  className?: string;
}

interface StampCache {
  [radius: number]: HTMLCanvasElement;
}

const DEFAULT_GRADIENT: Record<number, string> = {
  0.0: "rgba(183,230,209,0)",
  0.25: "rgba(183,230,209,0.75)",
  0.5: "rgba(29,138,112,0.82)",
  0.75: "rgba(243,182,106,0.88)",
  1.0: "rgba(196,61,75,0.92)",
};

const stampCache: StampCache = {};

function getStamp(radius: number): HTMLCanvasElement {
  if (stampCache[radius]) return stampCache[radius];
  
  const canvas = document.createElement("canvas");
  const size = radius * 2;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  stampCache[radius] = canvas;
  return canvas;
}

function getPalette(gradient: Record<number, string>): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [offset, color] of Object.entries(gradient)) {
    grad.addColorStop(parseFloat(offset), color);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

function scaleMax(points: HeatPoint[]): number {
  if (points.length === 0) return 1;
  const sorted = points.map((p) => p.weight).sort((a, b) => a - b);
  return Math.max(sorted[Math.floor((sorted.length - 1) * 0.9)] ?? 1, 1);
}

export function HeatmapLayer({ 
  points, 
  radius = 30, 
  maxOpacity = 0.9, 
  minOpacity = 0.12,
  gradient = DEFAULT_GRADIENT,
  className,
}: HeatLayerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible] = useState(true);

  const palette = useMemo(() => getPalette(gradient), [gradient]);
  const maxWeight = useMemo(() => scaleMax(points), [points]);

  const redraw = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !visible) return;

    const size = map.getSize();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.round(size.x * ratio);
    const targetHeight = Math.round(size.y * ratio);
    
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length === 0) return;

    const zoom = map.getZoom();
    const dynamicRadius = Math.round(Math.min(Math.max(radius + (zoom - 6) * 5, 16), 80) * ratio);
    const brush = getStamp(dynamicRadius);

    for (const point of points) {
      const p = map.latLngToContainerPoint([point.lat, point.lng]);
      const alpha = Math.min(maxOpacity, Math.max(minOpacity, point.weight / maxWeight));
      ctx.globalAlpha = alpha;
      ctx.drawImage(brush, p.x * ratio - dynamicRadius, p.y * ratio - dynamicRadius);
    }

    // Apply gradient colorization
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = pixels[i] ?? 0;
      if (alpha === 0) continue;
      const j = Math.floor((alpha / 255) * 1020); // 255 * 4
      pixels[i - 3] = palette[j] ?? 0;
      pixels[i - 2] = palette[j + 1] ?? 0;
      pixels[i - 1] = palette[j + 2] ?? 0;
      pixels[i] = palette[j + 3] ?? 0;
    }
    ctx.putImageData(image, 0, 0);
  }, [points, radius, maxOpacity, minOpacity, visible, maxWeight, palette]);

  useEffect(() => {
    if (!mapRef.current || !canvasRef.current) return;
    redraw();
  }, [redraw]);

  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    map.getPanes().overlayPane.appendChild(canvas);
    canvas.style.pointerEvents = "auto";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = "200";

    map.on("moveend zoomend resize", redraw);
    redraw();

    return () => {
      map.off("moveend zoomend resize", redraw);
      canvas.remove();
    };
  }, [redraw]);

  return <canvas ref={canvasRef} className={cx("leaflet-zoom-hide afya-heat", className ?? "")} style={{ pointerEvents: "none" }} />;
}

export interface HeatmapMapProps extends Omit<MapContainerProps, "children"> {
  points: HeatPoint[];
  heatmapProps?: Omit<HeatLayerProps, "points">;
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
}

const KENYA_CENTER: [number, number] = [0.2, 37.9];

export function HeatmapMap({ 
  points, 
  heatmapProps = {}, 
  showHeatmap = true,
  center = KENYA_CENTER,
  zoom = 6,
  className = "h-[60dvh] min-h-80",
  ...mapProps
}: HeatmapMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={true}
      touchZoom={true}
      doubleClickZoom={true}
      zoomControl={true}
      attributionControl
      className={cx("w-full", className)}
      {...mapProps}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showHeatmap && points.length > 0 && (
        <HeatmapLayer points={points} {...heatmapProps} />
      )}
    </MapContainer>
  );
}

export function HeatLegend({ 
  gradient = DEFAULT_GRADIENT,
  minLabel = "Low",
  maxLabel = "High",
  className,
}: {
  gradient?: Record<number, string>;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
}) {
  const stops = Object.entries(gradient).sort(([a], [b]) => parseFloat(a) - parseFloat(b));
  
  return (
    <div className={cx("flex items-center gap-2.5 text-xs text-muted", className ?? "")} aria-label="Heat legend">
      <span>{minLabel}</span>
      <div className="flex h-2 w-32 overflow-hidden rounded-full ring-1 ring-inset ring-black/5" aria-hidden>
        {stops.slice(0, -1).map(([offset, color], i) => (
          <span 
            key={offset} 
            className="flex-1" 
            style={{ 
              background: `linear-gradient(90deg, ${color}, ${stops[i + 1]?.[1] || color})`,
            }} 
          />
        ))}
      </div>
      <span>{maxLabel}</span>
    </div>
  );
}

export function AnimatedHeatmap({ 
  points, 
  duration = 1000,
  className,
}: {
  points: HeatPoint[];
  duration?: number;
  className?: string;
}) {
  const [animatedPoints, setAnimatedPoints] = useState<HeatPoint[]>([]);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (points.length === 0) return;
    
    // Animate points in waves
    const animate = () => {
      setPhase((prev) => (prev + 1) % points.length);
      setAnimatedPoints(points.slice(0, phase + 1));
    };

    const interval = setInterval(animate, duration / points.length);
    return () => clearInterval(interval);
  }, [points, duration, phase]);

  return <HeatmapLayer points={animatedPoints} className={className} />;
}