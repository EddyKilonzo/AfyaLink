import { test, expect } from "@playwright/test";

/**
 * Browser end-to-end: the offline-first loop the whole product is built around.
 *
 * 1. Sign in (the dev account from backend/scripts/db.mjs).
 * 2. Go offline (page.setOffline).
 * 3. Record a report; reload; confirm it is still `pending` on the device.
 * 4. Go online; confirm the UI flips to `synced` after the server confirms.
 *
 * These tests need a running MySQL + API + dev server. They skip when the
 * database is not configured so CI without a DB does not fail the suite.
 */
const DB_HOST = process.env.DB_HOST ?? "127.0.0.1";
const DB_NAME = process.env.DB_NAME ?? "afyalink_dev";
const DB_AVAILABLE = Boolean(DB_HOST) && Boolean(DB_NAME);

const DEV_EMAIL = "chv.mwende@afyalink.test";
const DEV_PASSWORD = "AfyaLink#Dev2026";

test.skip(!DB_AVAILABLE, "MySQL is not configured; skipping offline-sync e2e.");

test.describe("offline-first sync", () => {
  test("a report recorded offline stays on the device and syncs when reconnected", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEV_EMAIL);
    await page.getByLabel("Password").fill(DEV_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Record a unique report so we can find it again by name.
    const marker = `offline-${Date.now()}`;
    await page.getByRole("link", { name: "New report" }).click();
    await page.getByLabel("Condition or issue").fill(`Offline test ${marker}`);
    await page.getByRole("button", { name: "Save report" }).click();
    await expect(page.getByText("Saved on this device")).toBeVisible();

    // Go offline and reload: the report must still be on the device, shown as pending.
    await context.setOffline(true);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("link", { name: /Sync/ }).first().click();
    await expect(page.getByText("Waiting to sync")).toBeVisible();
    await expect(page.getByText(`Offline test ${marker}`)).toBeVisible();

    // Reconnect and sync until the server confirms.
    await context.setOffline(false);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByText("Received by the server")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(`Offline test ${marker}`).first()).toBeVisible();
  });
});