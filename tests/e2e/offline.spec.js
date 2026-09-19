/**
 * @file Proves app-shell caching, offline reload, and IndexedDB recovery in Chromium.
 * Functions: Playwright offline lifecycle test.
 * Variables: browserName, context, page.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { expect, test } from "@playwright/test";

test("reloads offline and restores local incident evidence", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Deterministic offline emulation is enforced in Chromium CI.",
  );
  await page.goto("./");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.getByRole("button", { name: "Load demo incident" }).click();
  await expect(page.locator("#operation-status")).toContainText("15 events loaded");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Incident Timeline" })).toBeVisible();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await expect(page.locator("#operation-status")).toContainText("Restored 15 locally saved events");
});
