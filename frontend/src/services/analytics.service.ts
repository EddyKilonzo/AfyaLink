import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@/types";

export const analyticsService = {
  summary: (days = 30) => api<AnalyticsSummary>(`/analytics/summary?days=${days}`),
};
