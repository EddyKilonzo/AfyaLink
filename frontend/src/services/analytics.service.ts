import { api, toQuery } from "@/lib/api";
import type { AnalyticsSummary, MapResponse, ReportCategory, ReportSeverity } from "@/types";

export interface MapFilters {
  /** 1–365, default 30. */
  days?: number;
  category?: ReportCategory;
  severity?: ReportSeverity;
}

/** Aggregates only. The API decides the scope: CHVs get their own, admins everything. */
export const analyticsService = {
  summary: (days = 30) => api<AnalyticsSummary>(`/analytics/summary${toQuery({ days })}`),
  map: (filters: MapFilters = {}) => api<MapResponse>(`/analytics/map${toQuery({ days: 30, ...filters })}`),
};
