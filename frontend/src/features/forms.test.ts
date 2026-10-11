import { fillDays } from "./analytics/charts";
import { changePasswordSchema, otpSchema, passwordSchema, userFormSchema } from "./auth/schemas";
import { canCorrectReport } from "./reports/hooks";
import { parseSymptoms, reportFormSchema } from "./reports/report-schema";
import type { ServerReport, User } from "@/types";

describe("password and OTP rules (mirror the backend)", () => {
  it.each([
    ["short1", false],
    ["longenoughpassword", false],
    ["1234567890", false],
    [" leading1space", false],
    ["Valid12345", true],
    ["Ünïcödé1234", true],
  ])("%j → %s", (value, ok) => {
    expect(passwordSchema.safeParse(value).success).toBe(ok);
  });

  it("rejects passwords over 72 bytes even when under 72 characters", () => {
    expect(passwordSchema.safeParse(`1${"é".repeat(40)}`).success).toBe(false);
  });

  it("normalises spaces in one-time codes", () => {
    expect(otpSchema.parse(" 123 456 ")).toBe("123456");
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("requires a matching, different new password", () => {
    const base = { currentPassword: "Old1234567", newPassword: "New1234567", confirmPassword: "New1234567" };
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "x" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "Old1234567", confirmPassword: "Old1234567" }).success).toBe(false);
  });
});

describe("form schemas", () => {
  it("treats an empty area as no location", () => {
    const user = { fullName: "Demo CHV", email: "A@B.TEST", role: "CHV", locationId: "", password: "Initial1234" };
    expect(userFormSchema.parse(user)).toMatchObject({ email: "a@b.test", locationId: undefined });
    expect(userFormSchema.parse({ ...user, locationId: "4" }).locationId).toBe(4);
  });

  it("rejects future observation times and half-filled coordinates", () => {
    const base = { category: "DISEASE_CASE", conditionName: "Malaria", severity: "LOW", casesCount: "1", ageGroup: "MIXED" };
    expect(reportFormSchema.safeParse({ ...base, observedAt: "2999-01-01T00:00" }).success).toBe(false);
    expect(reportFormSchema.safeParse({ ...base, observedAt: "2026-10-01T08:00", latitude: -1.2 }).success).toBe(false);
    expect(reportFormSchema.safeParse({ ...base, observedAt: "2026-10-01T08:00" }).success).toBe(true);
  });

  it("splits, trims and caps symptoms", () => {
    expect(parseSymptoms(" fever, , cough ")).toEqual(["fever", "cough"]);
    expect(parseSymptoms("")).toBeUndefined();
    expect(parseSymptoms(Array.from({ length: 30 }, (_, i) => `s${i}`).join(","))).toHaveLength(20);
  });
});

describe("canCorrectReport (mirrors PATCH /reports/:id)", () => {
  const chv = { id: "chv-1", role: "CHV" } as User;
  const report = { chvId: "chv-1", status: "SUBMITTED", receivedAt: "2026-10-10T00:00:00Z" } as ServerReport;
  const now = Date.parse("2026-10-11T00:00:00Z");

  it("allows the owner within 72 hours while submitted", () => {
    expect(canCorrectReport(report, chv, now)).toBe(true);
  });

  it.each([
    ["another CHV", report, { ...chv, id: "chv-2" }, now],
    ["an admin", report, { ...chv, role: "ADMIN" }, now],
    ["after review", { ...report, status: "REVIEWED" }, chv, now],
    ["after 72 hours", report, chv, Date.parse("2026-10-13T00:00:01Z")],
  ] as const)("refuses %s", (_label, r, u, at) => {
    expect(canCorrectReport(r as ServerReport, u as User, at)).toBe(false);
  });
});

describe("fillDays", () => {
  it("pads missing days with zero", () => {
    vi.useFakeTimers({ now: new Date("2026-10-04T12:00:00Z") });
    const days = fillDays([{ day: "2026-10-02", count: 3 }], "2026-10-01T00:00:00Z", 30);
    expect(days).toEqual([
      { day: "2026-10-01", count: 0 },
      { day: "2026-10-02", count: 3 },
      { day: "2026-10-03", count: 0 },
      { day: "2026-10-04", count: 0 },
    ]);
    vi.useRealTimers();
  });
});
