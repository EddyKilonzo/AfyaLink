"use client";

import { useAsync } from "@/hooks/use-async";
import { analyticsService, type MapFilters } from "@/services/analytics.service";

export const PERIOD_OPTIONS = [7, 30, 90, 365] as const;

export function useAnalyticsSummary(days = 30) {
  return useAsync(() => analyticsService.summary(days), [days]);
}

export function useMapPoints(filters: MapFilters = {}) {
  const key = JSON.stringify(filters);
  return useAsync(() => analyticsService.map(filters), [key]);
}
