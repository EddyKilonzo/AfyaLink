import { api, apiDownload, apiJson, seg, toQuery } from "@/lib/api";
import type {
  Paginated,
  ReportCategory,
  ReportPayload,
  ReportSeverity,
  ReportStatus,
  ReportStatusUpdate,
  ReportUpdate,
  ServerReport,
} from "@/types";

export interface ReportFilters {
  page?: number;
  limit?: number;
  category?: ReportCategory;
  severity?: ReportSeverity;
  status?: ReportStatus;
  locationId?: number;
  /** ADMIN only; CHVs always get their own reports. */
  chvId?: string;
  /** ISO dates applied to `observedAt`. */
  from?: string;
  to?: string;
}

export const reportsService = {
  list: (filters: ReportFilters = {}) => api<Paginated<ServerReport>>(`/reports${toQuery(filters)}`),
  get: (id: string) => api<ServerReport>(`/reports/${seg(id)}`),
  /** Idempotent: re-sending the same report ID returns outcome "duplicate". */
  create: (payload: ReportPayload) =>
    apiJson<{ outcome: "created" | "duplicate"; report: ServerReport }>("/reports", "POST", payload),
  /** CHV correction of their own SUBMITTED report within 72 hours of receipt. */
  update: (id: string, changes: ReportUpdate) => apiJson<ServerReport>(`/reports/${seg(id)}`, "PATCH", changes),
  /** ADMIN review (forward only: SUBMITTED → REVIEWED → ACTIONED). */
  review: (id: string, input: ReportStatusUpdate) =>
    apiJson<ServerReport>(`/reports/${seg(id)}/status`, "PATCH", input),
  /** ADMIN CSV export with the same filters (paging ignored, at most 10 000 rows). */
  exportCsv: (filters: Omit<ReportFilters, "page" | "limit"> = {}) =>
    apiDownload(`/reports/export${toQuery(filters)}`, `afyalink-reports-${new Date().toISOString().slice(0, 10)}.csv`),
  /** Streams a single report as a PDF. */
  pdf: (id: string) =>
    apiDownload(`/reports/${seg(id)}/pdf`, `report-${id.slice(0, 8)}.pdf`),
};
