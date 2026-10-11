"use client";

import { useAsync } from "@/hooks/use-async";
import { useMutation } from "@/hooks/use-mutation";
import { saveFile } from "@/lib/api";
import { auditService, type AuditFilters } from "@/services/audit.service";
import { reportsService, type ReportFilters } from "@/services/reports.service";
import { syncService, type SyncLogFilters } from "@/services/sync.service";
import { usersService, type CreateUserInput, type UpdateUserInput, type UserFilters } from "@/services/users.service";

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
