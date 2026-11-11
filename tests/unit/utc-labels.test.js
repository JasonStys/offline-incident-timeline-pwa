/**
 * @file Verifies displayed evidence uses the same UTC clock as the inclusive UTC filters.
 * Functions: literal DOM oracles cover day rollover and a timestamp with an explicit offset.
 * Variables: fixed input events and text expectations are independent of the implementation formatter.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { describe, expect, it } from "vitest";
import { renderSummaryTable, renderTimelineChart } from "../../src/ui/timeline-chart.js";
import { VirtualEventList } from "../../src/ui/virtual-list.js";

/** @returns {import("../../src/core/event.js").IncidentEvent} Known-valid normalized record. */
function evidence() {
  return {
    id: "utc-record",
    timestamp: "2026-03-19T00:00:00.002Z",
    epochMs: 1773878400002,
    severity: "error",
    service: "gateway",
    message: "UTC midnight",
    correlationId: "flight-01",
    sequence: 0,
    metadata: {},
  };
}

describe("unambiguous evidence time labels", () => {
  it("shows UTC date and milliseconds in chart and equivalent table", () => {
    const event = evidence();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    renderTimelineChart(svg, [event]);
    expect(svg.textContent).toContain("2026-03-19 00:00:00.002 UTC");
    expect(svg.querySelector("circle")?.getAttribute("aria-label")).toContain(
      "2026-03-19 00:00:00.002 UTC",
    );
    const body = document.createElement("tbody");
    renderSummaryTable(body, [event]);
    const errorRow = [...body.querySelectorAll("tr")].find(
      (row) => row.querySelector("th")?.textContent === "error",
    );
    expect(errorRow?.querySelectorAll("td")[1]?.textContent).toBe("2026-03-19 00:00:00.002 UTC");
  });

  it("retains UTC milliseconds in compact list rows across an offset/day boundary", () => {
    const container = document.createElement("div");
    const list = new VirtualEventList(container);
    list.setItems([{ ...evidence(), timestamp: "2026-03-18T17:00:00.002-07:00" }]);
    expect(container.querySelector(".event-row-correlation")?.textContent).toBe(
      "00:00:00.002 UTC · flight-01",
    );
    list.destroy();
  });
});
