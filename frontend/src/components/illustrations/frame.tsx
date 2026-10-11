import { useId, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** Brand palette used by every illustration (mirrors the @theme tokens). */
export const C = {
  b50: "#eef9f3",
  b100: "#ddf5ea",
  b200: "#b7e6d1",
  b300: "#80cfb1",
  b400: "#3fae8c",
  b500: "#1d8a70",
  b600: "#146c5a",
  b900: "#0b3d35",
  b950: "#072a24",
  canvas: "#f7f9f7",
  white: "#ffffff",
  ink: "#172522",
  muted: "#687873",
  amber: "#f3b66a",
  amberSoft: "#fdf1df",
} as const;

export type IllustrationProps = {
  /** Sizing classes. Defaults to `w-full`; height always follows the viewBox. */
  className?: string;
  /** When set, the illustration is announced as an image with this label. Otherwise it is decorative. */
  title?: string;
};

/** Unique, CSS-safe id factory so clip-path ids never collide when an illustration renders twice. */
export function useIllustrationIds() {
  const base = `il${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (name: string) => `${base}-${name}`;
}

export function Frame({ viewBox, className, title, children }: IllustrationProps & { viewBox: string; children: ReactNode }) {
  const titleId = `t${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const a11y = title ? { role: "img" as const, "aria-labelledby": titleId } : { "aria-hidden": true as const };
  return (
    <svg viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" focusable="false" className={cx("block h-auto", className ?? "w-full")} {...a11y}>
      {title && <title id={titleId}>{title}</title>}
      {children}
    </svg>
  );
}

/** A small stylised homestead: round wall with a conical thatched roof. Faceless, no detail. */
export function Hut({ x, y, s = 1, roof = C.b900, wall = C.canvas }: { x: number; y: number; s?: number; roof?: string; wall?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-15" y="-2" width="30" height="20" rx="3" fill={wall} />
      <rect x="-4" y="6" width="8" height="12" rx="2" fill={C.b600} opacity="0.55" />
      <path d="M-20 0 L0 -20 L20 0 Z" fill={roof} />
      <path d="M-20 0 L0 -20 L2 -18 L-14 0 Z" fill={C.white} opacity="0.12" />
    </g>
  );
}

/** Flat-topped acacia: thin trunk, layered umbrella canopy. */
export function Acacia({ x, y, s = 1, canopy = C.b600, top = C.b500 }: { x: number; y: number; s?: number; canopy?: string; top?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-2 0 L-3 -38 L-16 -54 M-3 -38 L10 -56 M-2 -30 L6 -44" stroke={C.b900} strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="-4" cy="-58" rx="44" ry="11" fill={canopy} />
      <ellipse cx="2" cy="-64" rx="30" ry="8" fill={top} />
    </g>
  );
}
