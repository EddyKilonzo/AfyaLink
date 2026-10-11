"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useAsync } from "@/hooks/use-async";
import { useMutation } from "@/hooks/use-mutation";
import { getDb, type LocalReport } from "@/lib/db";
import { reportsService, type ReportFilters } from "@/services/reports.service";
import { REPORT_EDIT_WINDOW_MS, type ReportStatusUpdate, type ReportUpdate, type ServerReport, type User } from "@/types";

/** Server reports, re-fetched whenever a filter changes. */
export function useServerReports(filters: ReportFilters, enabled = true) {
  const key = JSON.stringify(filters);
  return useAsync(() => reportsService.list(filters), [key], enabled);
}

export function useReport(id: string | undefined) {
  return useAsync(() => reportsService.get(id as string), [id], Boolean(id));
}

/** This user's reports stored on the device (live: updates as sync progresses). */
export function useLocalReports(): LocalReport[] | undefined {
  const { user } = useAuth();
  const ownerId = user?.id;
  return useLiveQuery(async () => {
    if (!ownerId) return [];
    const rows = await getDb().reports.where("ownerId").equals(ownerId).toArray();
    return rows.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }, [ownerId]);
}

/** A row in the merged reports list: either still on the device, or on the server. */
export type FeedItem =
  | { source: "local"; id: string; observedAt: string; report: LocalReport }
  | { source: "server"; id: string; observedAt: string; report: ServerReport };

/**
 * Server page merged with local reports the server has not confirmed yet.
 * Local `synced` copies are dropped in favour of the server row.
 */
export function useReportsFeed(filters: ReportFilters) {
  const server = useServerReports(filters);
  const local = useLocalReports();

  const items = useMemo<FeedItem[]>(() => {
    const serverIds = new Set(server.data?.items.map((r) => r.id));
    const unsent: FeedItem[] = (local ?? [])
      .filter((r) => r.syncState !== "synced" && !serverIds.has(r.id))
      .map((r) => ({ source: "local", id: r.id, observedAt: r.observedAt, report: r }));
    const remote: FeedItem[] = (server.data?.items ?? []).map((r) => ({
      source: "server",
      id: r.id,
      observedAt: r.observedAt,
      report: r,
    }));
    // Unsent work first so it is never buried on page 2.
    return [...unsent, ...remote];
  }, [server.data, local]);

  return { items, page: server.data, loading: server.loading || local === undefined, error: server.error, reload: server.reload };
}

/** Mirrors the API rule so the UI only offers edits the server will accept. */
export function canCorrectReport(report: ServerReport, user: User | null, now = Date.now()): boolean {
  return (
    user?.role === "CHV" &&
    report.chvId === user.id &&
    report.status === "SUBMITTED" &&
    now - Date.parse(report.receivedAt) < REPORT_EDIT_WINDOW_MS
  );
}

export function useCorrectReport() {
  return useMutation((id: string, changes: ReportUpdate) => reportsService.update(id, changes));
}

export function useReviewReport() {
  return useMutation((id: string, input: ReportStatusUpdate) => reportsService.review(id, input));
}
