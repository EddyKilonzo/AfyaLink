import type { ReportSeverity } from "@/types";

// Hex values for SVG (Leaflet, Recharts), where Tailwind classes do not apply.

/** Same values as the --color-sev-* tokens in globals.css. Always shown with a text label. */
export const SEVERITY_COLORS: Record<ReportSeverity, string> = {
  LOW: "#4d7c0f",
  MODERATE: "#b45309",
  HIGH: "#c2410c",
  CRITICAL: "#b91c1c",
};

/**
 * Single-series chart mark. A more saturated step of the brand teal: the
 * brand-600 token reads gray as a fill (fails the chroma floor); this one
 * passes lightness, chroma and 3:1 contrast on the light surface.
 */
export const CHART_MARK = "#0b8f72";

/** Recessive chart furniture and text, from the neutral tokens. */
export const CHART_GRID = "#e3e1d9";
export const CHART_INK = "#13221f";
export const CHART_MUTED = "#5b6b67";
