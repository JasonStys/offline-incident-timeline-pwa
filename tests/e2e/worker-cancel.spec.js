/**
 * @file Verifies cooperative worker cancellation preserves the previously committed timeline.
 * Functions: buildLargeFixture and Playwright cancellation test.
 * Variables: records and import input.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { expect, test } from "@playwright/test";

test("cancels a large worker import without replacing saved data", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName !== "chromium",
    "The worker cancellation stress flow runs once in Chromium.",
  );
  await page.goto("./");
  await page.getByRole("button", { name: "Load demo incident" }).click();
  await expect(page.locator("#operation-status")).toContainText("15 events loaded");

  const fixture = buildLargeFixture(35_000);
  await page.locator("#file-input").setInputFiles({
    name: "large-events.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await page.getByRole("button", { name: "Cancel import" }).click();
  await expect(page.locator("#operation-status")).toContainText("Import canceled");
  await expect(page.getByText("15 of 15 events shown")).toBeVisible();
});

/**
 * Creates deterministic records large enough for cancellation to interleave with chunked validation.
 * @param {number} count Record count.
 * @returns {Record<string, string>[]} Raw records.
 */
function buildLargeFixture(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `cancel-${index}`,
    timestamp: new Date(Date.parse("2026-01-01T00:00:00Z") + index).toISOString(),
    severity: index % 10 === 0 ? "error" : "info",
    service: "worker-test",
    message: `Cancellation fixture event ${index}`,
    correlationId: `chain-${index % 100}`,
  }));
}
