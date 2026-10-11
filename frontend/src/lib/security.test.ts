import { canAccessPath, isUuid, loginUrlFor, safeNextPath } from "./security";

const chv = { role: "CHV" as const };
const admin = { role: "ADMIN" as const };

describe("safeNextPath", () => {
  it("allows same-origin paths the role can open, keeping query and hash", () => {
    expect(safeNextPath("/reports?page=2#top", chv)).toBe("/reports?page=2#top");
    expect(safeNextPath("/admin/users", admin)).toBe("/admin/users");
  });

  it.each([
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "reports",
    "/reports\u0000",
    "/reports\nSet-Cookie: x",
    `/${"a".repeat(600)}`,
    "/login",
  ])("falls back to the role home for %j", (next) => {
    expect(safeNextPath(next, chv)).toBe("/dashboard");
  });

  it("does not send a CHV to an admin page", () => {
    expect(safeNextPath("/admin", chv)).toBe("/dashboard");
    expect(safeNextPath("/admin/audit", chv)).toBe("/dashboard");
  });

  it("uses the role home when there is no next", () => {
    expect(safeNextPath(null, admin)).toBe("/admin");
  });
});

describe("canAccessPath", () => {
  it("matches path segments, not prefixes of words", () => {
    expect(canAccessPath("/administer", "CHV")).toBe(true);
    expect(canAccessPath("/admin", "CHV")).toBe(false);
  });
});

describe("loginUrlFor", () => {
  it("encodes the return path", () => {
    expect(loginUrlFor("/reports/new", "?x=1")).toBe("/login?next=%2Freports%2Fnew%3Fx%3D1");
    expect(loginUrlFor("/login")).toBe("/login");
  });
});

describe("isUuid", () => {
  it("accepts UUIDs only", () => {
    expect(isUuid("249b4409-4a2e-42b6-b6f2-6f8c59dd7e34")).toBe(true);
    expect(isUuid("../users")).toBe(false);
    expect(isUuid(["249b4409-4a2e-42b6-b6f2-6f8c59dd7e34"])).toBe(false);
  });
});
