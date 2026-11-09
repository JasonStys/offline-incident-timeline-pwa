/**
 * @file Exercises UTC filters, exact exports, conflict/empty states and offline restoration across browsers.
 * Functions: fixture upload and Playwright analyst journeys.
 * Variables: synthetic microgrid incidents use inclusive millisecond and explicit-offset boundaries.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/New_York" });

const records = [
  {
    id: "before",
    timestamp: "2026-03-08T02:30:00.000Z",
    severity: "info",
    service: "grid-gateway",
    message: "Synthetic voltage sampling began",
    correlationId: "demo-grid",
  },
  {
    id: "start",
    timestamp: "2026-03-07T21:30:00.500-05:00",
    severity: "error",
    service: "grid-gateway",
    message: "Synthetic voltage limit crossed",
    correlationId: "demo-grid",
  },
  {
    id: "end",
    timestamp: "2026-03-08T02:30:01.000Z",
    severity: "info",
    service: "grid-gateway",
    message: "Synthetic load shed acknowledged",
    correlationId: "demo-grid",
  },
  {
    id: "after",
    timestamp: "2026-03-08T02:30:01.001Z",
    severity: "warning",
    service: "battery-controller",
    message: "Synthetic reserve estimate updated",
    correlationId: "demo-grid",
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Load demo incident" })).toBeEnabled();
  await page.locator("#file-input").setInputFiles({
    name: "microgrid-incident.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(records)),
  });
  await expect(page.locator("#operation-status")).toContainText("4 events loaded");
});

test("analyst selects an inclusive UTC window, combines criteria and exports exactly the matching evidence", async ({
  page,
}) => {
  await page.getByLabel("From (UTC, inclusive)").fill("2026-03-08T02:30:00.5");
  await page.getByLabel("Through (UTC, inclusive)").fill("2026-03-08T02:30:01");
  await expect(page.locator("#filter-summary")).toContainText("2 of 4 events shown");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error("Expected a local download");
  const exported =
    /** @type {{schemaVersion: number, events: import("../../src/core/event.js").IncidentEvent[]}} */ (
      JSON.parse(await readFile(path, "utf8"))
    );
  expect(exported.events.map((event) => event.id)).toEqual(["start", "end"]);
  await page.locator("#severity-select").selectOption("error");
  await page.locator("#service-select").selectOption("grid-gateway");
  await expect(page.locator("#filter-summary")).toContainText("1 of 4 events shown");
  await expect(page.locator("#event-detail")).toContainText("voltage limit crossed");
  await page.getByLabel("Through (UTC, inclusive)").fill("2026-03-08T02:30:00.5");
  await expect(page.locator("#filter-summary")).toContainText("1 of 4 events shown");
});

test("reversed, empty-match and invalid URL windows have distinct safe recovery states", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("From (UTC, inclusive)").fill("2026-03-08T02:30:01");
  await page.getByLabel("Through (UTC, inclusive)").fill("2026-03-08T02:30");
  await expect(page.getByRole("alert")).toContainText("at or before");
  await expect(page.locator("#export-json")).toBeDisabled();
  await expect(page.locator("#event-detail")).toContainText("Select an event");
  await page.getByLabel("Through (UTC, inclusive)").fill("2026-03-08T02:30:01");
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.locator("#filter-summary")).toContainText("1 of 4 events shown");
  await page.getByLabel("From (UTC, inclusive)").fill("2027-01-01T00:00");
  await page.getByLabel("Through (UTC, inclusive)").fill("");
  await expect(page.locator("#filter-summary")).toContainText("No events match");
  await expect(page.locator("#export-csv")).toBeDisabled();
  await page.locator("#reset-filters").click();
  await expect(page.locator("#filter-summary")).toContainText("4 of 4 events shown");
  await page.goto("./?from=not-a-date");
  await expect(page.locator("#operation-status")).toContainText("Restored 4");
  await expect(page.getByRole("alert")).toContainText("valid UTC");
  await expect(page.locator("#export-json")).toBeDisabled();
  await page.locator("#reset-filters").click();
  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.locator("#filter-summary")).toContainText("4 of 4 events shown");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("UTC criteria restore while offline without depending on the device timezone", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "Deterministic offline emulation is enforced in Chromium CI.",
  );
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator("#operation-status")).toContainText("Restored 4");
  await page.getByLabel("From (UTC, inclusive)").fill("2026-03-08T02:30:00.5");
  await page.getByLabel("Through (UTC, inclusive)").fill("2026-03-08T02:30:01");
  await expect(page.locator("#filter-summary")).toContainText("2 of 4 events shown");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#operation-status")).toContainText("Restored 4");
  await expect(page.locator("#filter-summary")).toContainText("2 of 4 events shown");
  await expect(page.getByLabel("From (UTC, inclusive)")).toHaveValue(/2026-03-08T02:30:00\.5/);
  await expect(page.getByLabel("Through (UTC, inclusive)")).toHaveValue(/2026-03-08T02:30:01/);
});
