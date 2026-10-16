"use client";

import { useAsync } from "@/hooks/use-async";
import { useMutation } from "@/hooks/use-mutation";
import { saveFile } from "@/lib/api";
import { writePrintablePdf } from "@/lib/pdf-generator";
import { auditService, type AuditFilters } from "@/services/audit.service";
import { reportsService, type ReportFilters } from "@/services/reports.service";
import { syncService, type SyncLogFilters } from "@/services/sync.service";
import { usersService, type CreateUserInput, type UpdateUserInput, type UserFilters } from "@/services/users.service";
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS, type ServerReport } from "@/types";
import { reportStats, reportTable, severityBars, statusBars } from "@/features/reports/report-pdf";
import { formatDate, formatDateTime } from "@/lib/format";

// Every call here is ADMIN-only on the server; these hooks add no access control of their own.

export function useUsers(filters: UserFilters) {
  const key = JSON.stringify(filters);
  return useAsync(() => usersService.list(filters), [key]);
}

export function useUser(id: string | undefined) {
  return useAsync(() => usersService.get(id as string), [id], Boolean(id));
}

export function useCreateUser() {
  return useMutation((input: CreateUserInput) => usersService.create(input));
}

export function useUpdateUser() {
  return useMutation((id: string, input: UpdateUserInput) => usersService.update(id, input));
}

// 204 endpoints resolve to `true` so `if (await run(...))` works like the others.

export function useResetPassword() {
  return useMutation(async (id: string, password: string) => {
    await usersService.resetPassword(id, password);
    return true;
  });
}

export function useResetMfa() {
  return useMutation(async (id: string) => {
    await usersService.resetMfa(id);
    return true;
  });
}

export function useAuditLogs(filters: AuditFilters) {
  const key = JSON.stringify(filters);
  return useAsync(() => auditService.list(filters), [key]);
}

/** Sync history: CHVs get their own, admins everyone's (optionally `userId`). */
export function useSyncLogs(filters: SyncLogFilters = {}) {
  const key = JSON.stringify(filters);
  return useAsync(() => syncService.logs(filters), [key]);
}

export function useExportReports() {
  return useMutation(async (filters: Omit<ReportFilters, "page" | "limit">) => {
    const file = await reportsService.exportCsv(filters);
    saveFile(file);
    return file.filename;
  });
}

/** Opens a branded PDF print window for the whole export (forest-green header,
 * consistent shadows). Zero dependencies: the browser prints a styled page and
 * the user saves it as PDF from the OS print dialog. */
/** The API caps page size at 100, so the export pages through, up to this many reports. */
const PDF_PAGE_SIZE = 100;
const PDF_MAX_REPORTS = 2_000;

export function useExportReportsPdf() {
  return useMutation(async (win: Window, filters: Omit<ReportFilters, "page" | "limit">, actor: { fullName: string; role: string }) => {
    let items: ServerReport[] = [];
    try {
      for (let page = 1; items.length < PDF_MAX_REPORTS; page++) {
        const batch = await reportsService.list({ ...filters, page, limit: PDF_PAGE_SIZE });
        items = items.concat(batch.items);
        if (page >= batch.totalPages || batch.items.length === 0) break;
      }
    } catch (error) {
      win.close();
      throw error;
    }
    const reports = { items: items.slice(0, PDF_MAX_REPORTS) };
    const stamp = new Date().toISOString().slice(0, 10);
    const period = filters.from ? `since ${filters.from.slice(0, 10)}` : "all time";
    const filterLabel = [
      filters.category ? CATEGORY_LABELS[filters.category] : null,
      filters.severity ? SEVERITY_LABELS[filters.severity] : null,
      filters.status ? STATUS_LABELS[filters.status] : null,
    ].filter(Boolean);
    writePrintablePdf(
      win,
      {
        title: "Community health reports",
        subtitle: `${reports.items.length.toLocaleString()} report(s), ${period}${items.length > PDF_MAX_REPORTS ? ` (first ${PDF_MAX_REPORTS.toLocaleString()})` : ""}${filterLabel.length ? ` · ${filterLabel.join(", ")}` : ""}`,
        kind: "Reports export",
        generatedAt: formatDateTime(new Date().toISOString()),
        generatedBy: actor.fullName,
        role: actor.role === "ADMIN" ? "Administrator" : actor.role,
      },
      [
        reportStats(reports.items, [{ label: "Awaiting review", value: reports.items.filter((r) => r.status === "SUBMITTED").length.toLocaleString() }]),
        severityBars(reports.items),
        statusBars(reports.items),
        {
          heading: "Filters",
          rows: [
            { label: "From", value: filters.from ? formatDate(filters.from) : "Any time" },
            { label: "To", value: filters.to ? formatDate(filters.to) : "Now" },
            { label: "Category", value: filters.category ? CATEGORY_LABELS[filters.category] : "All" },
            { label: "Severity", value: filters.severity ? SEVERITY_LABELS[filters.severity] : "All" },
            { label: "Status", value: filters.status ? STATUS_LABELS[filters.status] : "All" },
          ],
        },
        reportTable(reports.items),
      ],
      `afyalink-reports-${stamp}.pdf`,
    );
    return `afyalink-reports-${stamp}.pdf`;
  });
}
