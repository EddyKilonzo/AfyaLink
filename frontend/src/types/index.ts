// Mirrors backend enums in backend/src/database/entities. Keep in sync.

export const USER_ROLES = ["CHV", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const REPORT_CATEGORIES = [
  "DISEASE_CASE",
  "MATERNAL_HEALTH",
  "CHILD_HEALTH",
  "NUTRITION",
  "WATER_SANITATION",
  "DEATH",
  "OTHER",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_SEVERITIES = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type ReportSeverity = (typeof REPORT_SEVERITIES)[number];

export const AGE_GROUPS = ["UNDER_5", "AGE_5_17", "AGE_18_59", "AGE_60_PLUS", "MIXED"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export type ReportStatus = "SUBMITTED" | "REVIEWED" | "ACTIONED";

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  DISEASE_CASE: "Disease case",
  MATERNAL_HEALTH: "Maternal health",
  CHILD_HEALTH: "Child health",
  NUTRITION: "Nutrition",
  WATER_SANITATION: "Water & sanitation",
  DEATH: "Death",
  OTHER: "Other",
};

export const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  UNDER_5: "Under 5",
  AGE_5_17: "5 – 17",
  AGE_18_59: "18 – 59",
  AGE_60_PLUS: "60+",
  MIXED: "Mixed ages",
};

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  locationId: number | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

/** Fields a CHV submits; `id` is generated on the device and never changes. */
export interface ReportPayload {
  id: string;
  category: ReportCategory;
  conditionName: string;
  severity: ReportSeverity;
  casesCount: number;
  ageGroup: AgeGroup;
  symptoms?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  observedAt: string;
  clientCreatedAt: string;
}

export interface ServerReport extends Omit<ReportPayload, "latitude" | "longitude" | "symptoms" | "notes"> {
  chvId: string;
  locationId: number | null;
  symptoms: string[] | null;
  notes: string | null;
  latitude: string | null;
  longitude: string | null;
  status: ReportStatus;
  receivedAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AnalyticsSummary {
  scope: "all" | "own";
  periodDays: number;
  since: string;
  totals: { reports: number; cases: number };
  byCategory: { category: ReportCategory; count: number }[];
  bySeverity: { severity: ReportSeverity; count: number }[];
  byDay: { day: string; count: number }[];
  topConditions: { condition: string; cases: number }[];
}

export type SyncItemStatus = "created" | "duplicate" | "rejected";

export interface SyncResponse {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  summary: { received: number; created: number; duplicates: number; rejected: number };
  results: { id: string | null; status: SyncItemStatus; reason?: string }[];
  serverTime: string;
}

export interface HealthStatus {
  status: "ok";
  service: string;
  database: "not_configured" | "connecting" | "connected" | "unavailable";
  uptimeSeconds: number;
  timestamp: string;
}
