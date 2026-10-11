import { api, toQuery } from "@/lib/api";
import type { AuditAction, AuditLog, Paginated } from "@/types";

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  from?: string;
  to?: string;
}

/** ADMIN only, read-only. */
export const auditService = {
  list: (filters: AuditFilters = {}) => api<Paginated<AuditLog>>(`/audit-logs${toQuery(filters)}`),
};
