import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "chv.mwende@afyalink.test";
const DEMO_PASSWORD = "AfyaLink#Dev2026";
const API = "http://localhost:3001/api";

interface LocalReport {
  id: string;
  conditionName: string;
  syncState: string;
}

interface ServerReport {
  id: string;
  conditionName: string;
}

test.describe("offline-first sync flow", () => {
  test("sign in, go offline, create report, reload, confirm pending, go online, confirm synced", async ({ page, context }) => {
    // 1. Sign in
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // 2. Wait for redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(/Demo/)).toBeVisible();

    // 3. Go offline
    await context.setOffline(true);
    await expect(page.getByText(/offline/i).first()).toBeVisible({ timeout: 5000 });

    // 4. Create a report while offline
    await page.click('a[href="/reports/new"]');
    await page.fill('input[name="conditionName"]', "Test Malaria Offline");
    await page.selectOption('select[name="severity"]', "MODERATE");
    await page.fill('input[name="casesCount"]', "3");
    await page.click('button[type="submit"]');

    // 5. Confirm saved on device
    await expect(page.getByText(/Saved on this device/i)).toBeVisible({ timeout: 5000 });

    // 6. Reload page
    await page.reload();
    await expect(page).toHaveURL("/dashboard");

    // 7. Check IndexedDB for the pending report
    const reports = await page.evaluate(async (): Promise<LocalReport[]> => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const req = indexedDB.open("afyalink");
        req.onsuccess = () => resolve(req.result);
      });
      const tx = db.transaction("reports", "readonly");
      const store = tx.objectStore("reports");
      const all = await new Promise<LocalReport[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
      });
      return all.filter((r) => r.conditionName === "Test Malaria Offline");
    });

    expect(reports.length).toBe(1);
    expect(reports[0].syncState).toBe("pending");

    // 8. Go online
    await context.setOffline(false);
    await page.waitForTimeout(2000); // Allow sync to attempt

    // 9. Confirm report synced (server confirmed)
    const synced = await page.evaluate(async (): Promise<LocalReport[]> => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const req = indexedDB.open("afyalink");
        req.onsuccess = () => resolve(req.result);
      });
      const tx = db.transaction("reports", "readonly");
      const store = tx.objectStore("reports");
      const all = await new Promise<LocalReport[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
      });
      return all.filter((r) => r.conditionName === "Test Malaria Offline" && r.syncState === "synced");
    });

    expect(synced.length).toBe(1);
  });

  test("synced report appears exactly once in the database", async ({ page, context }) => {
    // Sign in first
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', DEMO_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/dashboard");

    // Go offline, create report, go online
    await context.setOffline(true);
    await page.click('a[href="/reports/new"]');
    await page.fill('input[name="conditionName"]', "Duplicate Test Report");
    await page.selectOption('select[name="severity"]', "LOW");
    await page.fill('input[name="casesCount"]', "1");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Saved on this device/i)).toBeVisible();

    await context.setOffline(false);
    await page.waitForTimeout(3000);

    // Check server has exactly one report with this name
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    const response = await fetch(`${API}/reports`, {
      headers: { Cookie: cookieHeader },
    });
    const data = await response.json() as { items: ServerReport[] };
    const matching = data.items.filter((r) => r.conditionName === "Duplicate Test Report");
    expect(matching.length).toBe(1);
  });
});