"use client";

import { useMutation } from "@/hooks/use-mutation";
import { useAsync } from "@/hooks/use-async";
import { reportsService } from "@/services/reports.service";
import type { ServerReport } from "@/types";

/**
 * Fetches a single report as a PDF and triggers a download.
 * The server streams the PDF; we turn the blob into an object URL.
 */
export function useDownloadReportPdf() {
  return useMutation(async (id: string) => {
    const blob = await reportsService.pdf(id);
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    return id;
  });
}

/** One report from the server, with a refresh helper. */
export function useReport(id?: string) {
  const state = useAsync(async (): Promise<ServerReport | null> => {
    if (!id) return null;
    return reportsService.get(id);
  }, [id]);
  return { ...state, reload: state.retry };
}

/** All reports for the current user, paginated and filterable. */
export function useReportsFeed({
  page = 1,
  limit = 20,
  category,
  status,
}: {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
} = {}) {
  return useAsync(async () => reportsService.list({ page, limit, category, status }), [page, limit, category, status]);
}

/** Reports still on this device, not yet confirmed by the server. */
export function useLocalReports() {
  return useAsync(async () => {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    return db.reports.orderBy("clientCreatedAt").reverse().toArray();
  }, []);
}

/** Whether the current user is allowed to correct this report. */
export function canCorrectReport(report: ServerReport, user: { id: string } | null): boolean {
  return Boolean(user) && report.createdBy === user.id;
}