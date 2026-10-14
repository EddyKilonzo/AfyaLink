"use client";

import { useAsync } from "@/hooks/use-async";
import { useMutation } from "@/hooks/use-mutation";
import { saveFile } from "@/lib/api";
import { openPrintablePdf } from "@/lib/pdf-generator";
import { auditService, type AuditFilters } from "@/services/audit.service";
import { reportsService, type ReportFilters } from "@/services/reports.service";
import { syncService, type SyncLogFilters } from "@/services/sync.service";
import { usersService, type CreateUserInput, type UpdateUserInput, type UserFilters } from "@/services/users.service";
import { CATEGORY_LABELS, type ServerReport } from "@/types";

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
export function useExportReportsPdf() {
  return useMutation(async (filters: Omit<ReportFilters, "page" | "limit">, actor: { fullName: string; role: string }) => {
    const reports = await reportsService.list({ ...filters, limit: 10_000 });
    const stamp = new Date().toISOString().slice(0, 10);
    openPrintablePdf(
      {
        title: `AfyaLink reports — ${stamp}`,
        subtitle: `${reports.items.length} report(s), last ${filters.to ? "to " + filters.to : "all"}`,
        generatedAt: new Date().toISOString(),
        generatedBy: actor.fullName,
        role: actor.role,
      },
      [
        {
          heading: "Summary",
          rows: [
            { label: "Total reports", value: reports.items.length.toLocaleString() },
            { label: "From", value: filters.from || "—" },
            { label: "To", value: filters.to || "—" },
            { label: "Category", value: filters.category || "All" },
            { label: "Severity", value: filters.severity || "All" },
            { label: "Status", value: filters.status || "All" },
          ],
        },
        {
          heading: `Reports (${reports.items.length})`,
          rows: reports.items.map((r: ServerReport) => ({
            label: r.conditionName,
            value: `${CATEGORY_LABELS[r.category]} · ${r.severity} · ${r.status} · ${r.casesCount} case(s)`,
          })),
        },
      ],
      `afyalink-reports-${stamp}.pdf`,
    );
    return `afyalink-reports-${stamp}.pdf`;
  });
}
