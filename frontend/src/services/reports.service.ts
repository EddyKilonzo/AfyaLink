import { api } from "@/lib/api";
import type { Paginated, ReportCategory, ReportPayload, ReportSeverity, ServerReport } from "@/types";

export interface ReportFilters {
  page?: number;
  limit?: number;
  category?: ReportCategory;
  severity?: ReportSeverity;
  from?: string;
  to?: string;
}

function toQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const reportsService = {
  list: (filters: ReportFilters = {}) => api<Paginated<ServerReport>>(`/reports${toQuery(filters)}`),
  get: (id: string) => api<ServerReport>(`/reports/${encodeURIComponent(id)}`),
  /** Idempotent: re-sending the same report ID returns outcome "duplicate". */
  create: (payload: ReportPayload) =>
    api<{ outcome: "created" | "duplicate"; report: ServerReport }>("/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
