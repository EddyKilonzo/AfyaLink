import L from "leaflet";

export interface HeatPoint {
  lat: number;
  lng: number;
  /** Relative intensity (any positive number; normalised per draw). */
  weight: number;
}

/** Transparent → mint → forest → amber → alert red, as alpha (0–1) stops. */
const STOPS: [number, string][] = [
  [0.0, "rgba(183,230,209,0)"],
  [0.25, "rgba(183,230,209,0.75)"],
  [0.5, "rgba(29,138,112,0.82)"],
  [0.75, "rgba(243,182,106,0.88)"],
  [1.0, "rgba(196,61,75,0.92)"],
];

let palette: Uint8ClampedArray | null = null;

/** 256-entry RGBA lookup built once from the stops above. */
function getPalette(): Uint8ClampedArray {
  if (palette) return palette;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const [offset, color] of STOPS) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  palette = ctx.getImageData(0, 0, 256, 1).data;
  return palette;
}

/** Soft radial "stamp" drawn once per radius and reused for every point. */
function stamp(radius: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const size = radius * 2;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** 90th-percentile weight, so one large outbreak does not wash out everything else. */
function scaleMax(points: HeatPoint[]): number {
  if (points.length === 0) return 1;
  const sorted = points.map((p) => p.weight).sort((a, b) => a - b);
  return Math.max(sorted[Math.floor((sorted.length - 1) * 0.9)] ?? 1, 1);
}

/**
 * A lightweight density layer drawn on one canvas in the overlay pane.
 * Redraws after pans and zooms; hidden during the zoom animation.
 */
export class HeatLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private host: L.Map | null = null;

  constructor(private points: HeatPoint[]) {
    super();
  }

  setPoints(points: HeatPoint[]): void {
    this.points = points;
    this.redraw();
  }

  onAdd(map: L.Map): this {
    this.host = map;
    this.canvas = L.DomUtil.create("canvas", "leaflet-zoom-hide afya-heat") as HTMLCanvasElement;
    this.canvas.style.pointerEvents = "none";
    map.getPanes().overlayPane.appendChild(this.canvas);
    map.on("moveend zoomend resize", this.redraw, this);
    this.redraw();
    return this;
  }

  onRemove(map: L.Map): this {
    map.off("moveend zoomend resize", this.redraw, this);
    this.canvas?.remove();
    this.canvas = null;
    this.host = null;
    return this;
  }

  private redraw(): void {
    const map = this.host;
    const canvas = this.canvas;
    if (!map || !canvas) return;

    const size = map.getSize();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.x * ratio);
    canvas.height = Math.round(size.y * ratio);
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.points.length === 0) return;

    // Radius grows with zoom so clusters stay readable at every scale.
    const radius = Math.round(Math.min(Math.max(14 + (map.getZoom() - 6) * 7, 16), 64) * ratio);
    const brush = stamp(radius);
    const max = scaleMax(this.points);

    for (const point of this.points) {
      const p = map.latLngToContainerPoint([point.lat, point.lng]);
      ctx.globalAlpha = Math.min(1, Math.max(0.12, point.weight / max));
      ctx.drawImage(brush, p.x * ratio - radius, p.y * ratio - radius);
    }

    // Colourise: the alpha of each pixel picks a colour from the palette.
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const lut = getPalette();
    for (let i = 3; i < pixels.length; i += 4) {
      const alpha = pixels[i] ?? 0;
      if (alpha === 0) continue;
      const j = alpha * 4;
      pixels[i - 3] = lut[j] ?? 0;
      pixels[i - 2] = lut[j + 1] ?? 0;
      pixels[i - 1] = lut[j + 2] ?? 0;
      pixels[i] = lut[j + 3] ?? 0;
    }
    ctx.putImageData(image, 0, 0);
  }
}
