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

export const REPORT_STATUSES = ["SUBMITTED", "REVIEWED", "ACTIONED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Statuses an admin may move a report to (the API only allows forward moves). */
export type ReviewStatus = Exclude<ReportStatus, "SUBMITTED">;

export const STATUS_LABELS: Record<ReportStatus, string> = {
  SUBMITTED: "Submitted",
  REVIEWED: "Reviewed",
  ACTIONED: "Actioned",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  CHV: "Community Health Volunteer",
  ADMIN: "Administrator",
};

/** Forward-only review transitions, mirroring the backend rule. */
export const NEXT_STATUSES: Record<ReportStatus, ReviewStatus[]> = {
  SUBMITTED: ["REVIEWED", "ACTIONED"],
  REVIEWED: ["ACTIONED"],
  ACTIONED: [],
};

/** CHVs may correct their own SUBMITTED report within this window after receipt. */
export const REPORT_EDIT_WINDOW_MS = 72 * 60 * 60 * 1000;

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
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  avatarUrl: string | null;
}

export interface Location {
  id: number;
  county: string;
  subCounty: string;
  ward: string;
  village: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
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
  locationId?: number;
  latitude?: number;
  longitude?: number;
  observedAt: string;
  clientCreatedAt: string;
}

export interface ServerReport
  extends Omit<ReportPayload, "latitude" | "longitude" | "symptoms" | "notes" | "locationId"> {
  chvId: string;
  locationId: number | null;
  symptoms: string[] | null;
  notes: string | null;
  latitude: string | null;
  longitude: string | null;
  status: ReportStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  receivedAt: string;
  updatedAt: string;
}

/** CHV correction (`PATCH /reports/:id`); `null` clears an optional field. */
export interface ReportUpdate {
  category?: ReportCategory;
  conditionName?: string;
  severity?: ReportSeverity;
  casesCount?: number;
  ageGroup?: AgeGroup;
  symptoms?: string[] | null;
  notes?: string | null;
  locationId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  observedAt?: string;
}

export interface ReportStatusUpdate {
  status: ReviewStatus;
  reviewNote?: string;
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
  /** Same-length window immediately before `since`, for trend deltas. */
  previousTotals: { reports: number; cases: number };
  byCategory: { category: ReportCategory; count: number }[];
  bySeverity: { severity: ReportSeverity; count: number }[];
  byDay: { day: string; count: number }[];
  topConditions: { condition: string; cases: number }[];
  byStatus: { status: ReportStatus; count: number }[];
  pendingReview: number;
  byCounty: { county: string; reports: number; cases: number }[];
}

export interface MapPoint {
  id: string;
  category: ReportCategory;
  conditionName: string;
  severity: ReportSeverity;
  casesCount: number;
  status: ReportStatus;
  observedAt: string;
  county: string | null;
  ward: string | null;
  latitude: number;
  longitude: number;
}

export interface MapResponse {
  scope: "all" | "own";
  periodDays: number;
  since: string;
  truncated: boolean;
  points: MapPoint[];
}

export type SyncItemStatus = "created" | "duplicate" | "rejected";
export type SyncBatchStatus = "SUCCESS" | "PARTIAL" | "FAILED";

export interface SyncResponse {
  status: SyncBatchStatus;
  summary: { received: number; created: number; duplicates: number; rejected: number };
  results: { id: string | null; status: SyncItemStatus; reason?: string }[];
  serverTime: string;
}

export interface SyncLog {
  id: string;
  userId: string;
  deviceId: string | null;
  receivedCount: number;
  createdCount: number;
  duplicateCount: number;
  rejectedCount: number;
  status: SyncBatchStatus;
  startedAt: string;
  completedAt: string;
}

export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "auth.logout_all",
  "auth.password_change",
  "auth.mfa_enable",
  "auth.mfa_disable",
  "user.create",
  "user.update",
  "user.password_reset",
  "user.mfa_reset",
  "location.create",
  "report.update",
  "report.review",
  "report.export",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLog {
  id: string;
  actorId: string | null;
  action: AuditAction;
  targetType: "user" | "report" | "location" | null;
  targetId: string | null;
  ipAddress: string | null;
  requestId: string | null;
  details: Record<string, string | number | boolean | null> | null;
  createdAt: string;
}

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

/** Shape of every API error body (see docs/api.md). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  requestId?: string;
  timestamp: string;
}

/** `GET /health/ready`; any other state is returned as a 503 error. */
export interface ReadinessStatus {
  status: "ready";
  database: "connected";
}

export interface HealthStatus {
  status: "ok";
  service: string;
  database: "not_configured" | "connecting" | "connected" | "unavailable";
  uptimeSeconds: number;
  timestamp: string;
}
