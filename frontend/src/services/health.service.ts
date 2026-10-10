import { api } from "@/lib/api";
import type { HealthStatus } from "@/types";

export const healthService = {
  check: () => api<HealthStatus>("/health", { timeoutMs: 5_000 }),
};
