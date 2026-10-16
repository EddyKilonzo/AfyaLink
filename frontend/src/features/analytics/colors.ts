import type { ReportSeverity, ReportStatus } from "@/types";

// Hex values for SVG (Leaflet, Recharts), where Tailwind classes do not apply.

/** Same values as the --color-sev-* tokens in globals.css. Always shown with a text label. */
export const SEVERITY_COLORS: Record<ReportSeverity, string> = {
  LOW: "#4d7c0f",
  MODERATE: "#b45309",
  HIGH: "#c2410c",
  CRITICAL: "#b91c1c",
};

/**
 * Chart roles as CSS variables (defined in globals.css with separate light and
 * dark steps), so every chart follows the theme. SVG presentation attributes
 * accept var(), so these work as Recharts `fill` / `stroke` values.
 */
export const CHART_MARK = "var(--chart-mark)";
export const CHART_GRID = "var(--chart-grid)";
export const CHART_INK = "var(--chart-ink)";
export const CHART_MUTED = "var(--chart-muted)";
export const CHART_CURSOR = "var(--chart-cursor)";

/** Severity as an ordered ramp for proportion charts (LOW -> CRITICAL). */
export const SEVERITY_RAMP: Record<ReportSeverity, string> = {
  LOW: "var(--chart-sev-1)",
  MODERATE: "var(--chart-sev-2)",
  HIGH: "var(--chart-sev-3)",
  CRITICAL: "var(--chart-sev-4)",
};

/** Review pipeline as an ordered ramp (SUBMITTED -> ACTIONED). */
export const STATUS_RAMP: Record<ReportStatus, string> = {
  SUBMITTED: "var(--chart-step-1)",
  REVIEWED: "var(--chart-step-2)",
  ACTIONED: "var(--chart-step-3)",
};
