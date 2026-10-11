import { api, toQuery } from "@/lib/api";
import type { Paginated, SyncLog } from "@/types";

export interface SyncLogFilters {
  page?: number;
  limit?: number;
  /** ADMIN only. */
  userId?: string;
}

/** Server-side sync history. Uploading itself is done by features/sync/sync-engine. */
export const syncService = {
  logs: (filters: SyncLogFilters = {}) => api<Paginated<SyncLog>>(`/sync/logs${toQuery(filters)}`),
};
