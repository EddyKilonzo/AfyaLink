import { useId } from "react";
import { cx } from "@/components/ui/cx";

/** Fixed honeycomb behind every page (rendered once in the root layout). */
export function PageTexture() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <HexTexture variant="page" />
    </div>
  );
}

/**
 * Hexagonal "vault" background texture: a fine honeycomb in brand ink with a
 * handful of cells that glow slowly (static under reduced motion). Pure SVG,
 * no JavaScript, decorative only.
 */

// Pointy-top hexagon, circumradius R. Tile = width √3·R, height 3R (two rows offset).
const R = 22;
const W = Math.sqrt(3) * R;
const H = 3 * R;

function hexPath(cx0: number, cy0: number, r = R): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx0 + r * Math.cos(a)).toFixed(2)},${(cy0 + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

// Cells that light up, as (column, row) in hex-grid coordinates, with stagger delays.
const GLOW_CELLS: [number, number, number][] = [
  [3, 1, 0],
  [6, 2, 1.6],
  [9, 1, 3.1],
  [12, 3, 0.8],
  [5, 4, 2.4],
  [15, 2, 4],
  [10, 5, 1.2],
  [1, 3, 2.0],
  [14, 4, 3.4],
  [7, 5, 0.4],
  [4, 2, 4.6],
  [11, 1, 1.0],
  [8, 3, 2.8],
  [13, 5, 0.2],
  [2, 4, 3.8],
  [16, 3, 1.8],
  [17, 1, 2.2],
  [18, 4, 0.6],
  [0, 2, 3.0],
  [19, 3, 1.4],
];

function cellCenter(col: number, row: number): [number, number] {
  const x = col * W + (row % 2 ? W / 2 : 0);
  const y = row * 1.5 * R;
  return [x, y];
}

export function HexTexture({
  className,
  tone = "light",
  glow = true,
  variant = "section",
}: {
  className?: string;
  /** `light` on canvas/mint surfaces, `dark` on deep-green brand panels. */
  tone?: "light" | "dark";
  glow?: boolean;
  /** `page`: the fainter, top-weighted texture behind every page. */
  variant?: "section" | "page";
}) {
  const id = useId().replace(/:/g, "");
  const page = variant === "page";
  const stroke = tone === "light" ? (page ? "rgb(11 61 53 / 0.14)" : "rgb(11 61 53 / 0.16)") : "rgb(255 255 255 / 0.16)";
  const glowFill = tone === "light" ? "rgb(63 174 140 / 0.30)" : "rgb(111 211 174 / 0.30)";
  const glowStroke = tone === "light" ? "rgb(20 108 90 / 0.55)" : "rgb(183 230 209 / 0.55)";

  return (
    <svg aria-hidden focusable="false" className={cx("pointer-events-none absolute inset-0 h-full w-full", className)}>
      <defs>
        <pattern id={`hex-${id}`} width={W} height={H} patternUnits="userSpaceOnUse">
          <path d={`${hexPath(W / 2, R)} ${hexPath(0, R + 1.5 * R)} ${hexPath(W, R + 1.5 * R)}`} fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
        {page ? (
          // Strongest along the top edge, easing out down the page.
          <radialGradient id={`fade-${id}`} cx="70%" cy="0%" r="110%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="45%" stopColor="white" stopOpacity="0.72" />
            <stop offset="100%" stopColor="white" stopOpacity="0.30" />
          </radialGradient>
        ) : (
          <radialGradient id={`fade-${id}`} cx="62%" cy="35%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.68" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        )}
        <mask id={`mask-${id}`}>
          <rect width="100%" height="100%" fill={`url(#fade-${id})`} />
        </mask>
      </defs>
      <g mask={`url(#mask-${id})`}>
        <rect width="100%" height="100%" fill={`url(#hex-${id})`} />
        {glow &&
          GLOW_CELLS.map(([col, row, delay]) => {
            const [x, y] = cellCenter(col, row);
            return (
              <path
                key={`${col}-${row}`}
                d={hexPath(x + W / 2, y + R, R - 1)}
                fill={glowFill}
                stroke={glowStroke}
                strokeWidth="1"
                className="hex-glow"
                style={{ animationDelay: `${delay}s` }}
              />
            );
          })}
      </g>
    </svg>
  );
}
