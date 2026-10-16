import { formatDate } from "@/lib/format";
import type { PdfBarsSection, PdfStatsSection, PdfTableSection, PdfTone } from "@/lib/pdf-generator";
import {
  CATEGORY_LABELS,
  REPORT_SEVERITIES,
  REPORT_STATUSES,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type ReportCategory,
  type ReportSeverity,
  type ReportStatus,
} from "@/types";

/** The fields every PDF report row needs, from a server report or a local draft. */
export interface PdfReportRow {
  conditionName: string;
  category: ReportCategory;
  severity: ReportSeverity;
  casesCount: number;
  observedAt: string;
  /** Review status; omitted for reports still waiting to sync. */
  status?: ReportStatus;
}

export const SEVERITY_TONE: Record<ReportSeverity, PdfTone> = {
  LOW: "low",
  MODERATE: "moderate",
  HIGH: "high",
  CRITICAL: "critical",
};

export const STATUS_TONE: Record<ReportStatus, PdfTone> = {
  SUBMITTED: "submitted",
  REVIEWED: "reviewed",
  ACTIONED: "actioned",
};

export function statusCell(status: ReportStatus | undefined) {
  return status ? { text: STATUS_LABELS[status], tone: STATUS_TONE[status] } : { text: "Waiting to sync", tone: "pending" as const };
}

export function reportStats(rows: PdfReportRow[], extra: PdfStatsSection["stats"] = []): PdfStatsSection {
  const cases = rows.reduce((sum, r) => sum + r.casesCount, 0);
  const urgent = rows.filter((r) => r.severity === "HIGH" || r.severity === "CRITICAL").length;
  return {
    heading: "At a glance",
    stats: [
      { label: "Reports", value: rows.length.toLocaleString() },
      { label: "Cases", value: cases.toLocaleString() },
      { label: "High or critical", value: urgent.toLocaleString(), tone: urgent ? ("high" as const) : undefined, hint: rows.length ? `${Math.round((urgent / rows.length) * 100)}% of reports` : undefined },
      ...extra,
    ].slice(0, 4),
  };
}

export function severityBars(rows: PdfReportRow[]): PdfBarsSection {
  return {
    heading: "Severity mix",
    description: "How serious the reports were",
    unit: "reports",
    bars: REPORT_SEVERITIES.map((s) => ({ label: SEVERITY_LABELS[s], value: rows.filter((r) => r.severity === s).length, tone: SEVERITY_TONE[s] })),
  };
}

export function statusBars(rows: PdfReportRow[]): PdfBarsSection {
  return {
    heading: "Review pipeline",
    description: "Where the reports are in review",
    unit: "reports",
    bars: REPORT_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: rows.filter((r) => r.status === s).length, tone: STATUS_TONE[s] })),
  };
}

export function reportTable(rows: PdfReportRow[], heading = "Reports"): PdfTableSection {
  const sorted = [...rows].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  return {
    heading: `${heading} (${rows.length.toLocaleString()})`,
    description: "Newest first",
    table: {
      columns: [
        { label: "Observed", width: "13%" },
        { label: "Condition", width: "27%" },
        { label: "Category", width: "18%" },
        { label: "Severity", width: "15%" },
        { label: "Status", width: "17%" },
        { label: "Cases", align: "right", width: "10%" },
      ],
      rows: sorted.map((r) => [
        formatDate(r.observedAt),
        r.conditionName,
        CATEGORY_LABELS[r.category],
        { text: SEVERITY_LABELS[r.severity], tone: SEVERITY_TONE[r.severity] },
        statusCell(r.status),
        r.casesCount.toLocaleString(),
      ]),
      empty: "No reports match these filters.",
      rowTones: sorted.map((r) => SEVERITY_TONE[r.severity]),
      legend: REPORT_SEVERITIES.map((s) => ({ text: SEVERITY_LABELS[s], tone: SEVERITY_TONE[s] })),
    },
  };
}
