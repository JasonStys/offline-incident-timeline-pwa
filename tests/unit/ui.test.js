/**
 * @file Verifies text-only chart and virtual-list rendering plus keyboard selection behavior.
 * Functions: event factory and Vitest UI cases.
 * Variables: normalized events and DOM containers.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it, vi } from "vitest";
import { normalizeRecords } from "../../src/core/event.js";
import { renderSummaryTable, renderTimelineChart } from "../../src/ui/timeline-chart.js";
import { VirtualEventList } from "../../src/ui/virtual-list.js";

const events = normalizeRecords([
  {
    id: "a",
    timestamp: "2026-01-01T00:00:00Z",
    severity: "error",
    service: "api",
    message: "<img src=x onerror=alert(1)>",
    correlationId: "chain-1",
  },
  {
    id: "b",
    timestamp: "2026-01-01T00:00:01Z",
    severity: "info",
    service: "queue",
    message: "Recovered",
    correlationId: "chain-1",
  },
]).events;

describe("UI renderers", () => {
  it("renders SVG points and the equivalent summary table", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const body = document.createElement("tbody");
    renderTimelineChart(svg, events);
    renderSummaryTable(body, events);
    expect(svg.querySelectorAll("circle")).toHaveLength(2);
    expect(svg.textContent).toContain("api: <img src=x onerror=alert(1)>");
    expect(svg.querySelector("img")).toBeNull();
    expect(body.querySelectorAll("tr")).toHaveLength(4);
    expect(body.textContent).toContain("error1");
  });

  it("virtualizes rows, escapes text, and supports keyboard navigation", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientHeight", { value: 144 });
    document.body.append(container);
    const onSelect = vi.fn();
    const list = new VirtualEventList(container, { rowHeight: 72, overscan: 0, onSelect });
    list.setItems(events);
    expect(container.querySelectorAll(".event-row")).toHaveLength(2);
    expect(container.querySelector("img")).toBeNull();
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(onSelect).toHaveBeenLastCalledWith(events[1]);
    expect(container.getAttribute("aria-activedescendant")).toBe("event-row-1");
    list.destroy();
    container.remove();
  });
});
