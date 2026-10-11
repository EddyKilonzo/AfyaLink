import { api } from "@/lib/api";
import type { HealthStatus, ReadinessStatus } from "@/types";

export const healthService = {
  check: () => api<HealthStatus>("/health", { timeoutMs: 5_000 }),
  /** Rejects with a 503 ApiError while the database is not connected. */
  ready: () => api<ReadinessStatus>("/health/ready", { timeoutMs: 5_000 }),
};
