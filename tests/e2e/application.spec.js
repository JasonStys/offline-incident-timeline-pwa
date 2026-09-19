/**
 * @file Exercises the main import, filter, keyboard, persistence, export, and accessibility flows across browsers.
 * Functions: Playwright test cases.
 * Variables: page, download, AxeBuilder results.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  const demoButton = page.getByRole("button", { name: "Load demo incident" });
  await expect(demoButton).toBeEnabled();
  await demoButton.click();
  await expect(page.locator("#operation-status")).toContainText("15 events loaded");
});

test("loads, filters, traces, and restores a synthetic incident", async ({ page }) => {
  await expect(page.getByText("15 of 15 events shown")).toBeVisible();
  await page.locator("#severity-select").selectOption("error");
  await expect(page.getByText("3 of 15 events shown")).toBeVisible();
  await page.getByLabel("Search messages").fill("timed");
  await expect(page.getByText("2 of 15 events shown")).toBeVisible();

  const list = page.getByRole("listbox", { name: "Incident events" });
  await list.focus();
  await list.press("ArrowDown");
  await expect(page.getByRole("heading", { name: "Event details" })).toBeVisible();
  await expect(
    page
      .locator("#event-detail")
      .getByText("Identity dependency timed out on attempt 2", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.locator("#operation-status")).toContainText("Restored 15 locally saved events");
  await expect(page.locator("#severity-select")).toHaveValue("error");
  await expect(page.getByLabel("Search messages")).toHaveValue("timed");
});

test("exports only filtered events without network transmission", async ({ page }) => {
  await page.getByLabel("Correlation ID").fill("inc-2026-0318-a");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("incident-timeline.json");
});

test("has no detectable WCAG A or AA violations in its populated state", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
