/**
 * @file Renders an accessible SVG incident timeline and an equivalent severity summary table.
 * Functions: renderTimelineChart, renderSummaryTable, svgElement, timeLabel.
 * Variables: SVG_NAMESPACE, LANE_Y, margins, range.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { summarizeSeverities } from "../core/event-index.js";

/** @import {IncidentEvent} from "../core/event.js" */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const LANE_Y = new Map([
  ["critical", 55],
  ["error", 110],
  ["warning", 165],
  ["info", 220],
]);

/**
 * Replaces SVG content with severity lanes and event points.
 * @param {SVGSVGElement} svg Timeline root.
 * @param {readonly IncidentEvent[]} events Filtered events.
 * @returns {void}
 */
export function renderTimelineChart(svg, events) {
  svg.replaceChildren();
  const width = 960;
  const marginLeft = 100;
  const marginRight = 30;
  const plotWidth = width - marginLeft - marginRight;
  const firstEpoch = events[0]?.epochMs ?? 0;
  const lastEpoch = events.at(-1)?.epochMs ?? firstEpoch + 1;
  const range = Math.max(1, lastEpoch - firstEpoch);

  for (const [severity, y] of LANE_Y) {
    const line = svgElement("line", {
      x1: marginLeft,
      x2: width - marginRight,
      y1: y,
      y2: y,
      class: "chart-grid",
    });
    const label = svgElement("text", { x: 18, y: y + 5, class: "chart-label" });
    label.textContent = (severity[0] ?? "").toUpperCase() + severity.slice(1);
    svg.append(line, label);
  }

  events.forEach((event) => {
    const x = marginLeft + ((event.epochMs - firstEpoch) / range) * plotWidth;
    const y = LANE_Y.get(event.severity) ?? 220;
    const circle = svgElement("circle", {
      cx: Number(x.toFixed(2)),
      cy: y,
      r: 7,
      class: `event-point severity-${event.severity}`,
      tabindex: 0,
      role: "img",
      "aria-label": `${event.severity} event from ${event.service} at ${timeLabel(event.timestamp)}: ${event.message}`,
    });
    const title = svgElement("title");
    title.textContent = `${event.service}: ${event.message}`;
    circle.append(title);
    svg.append(circle);
  });

  const startLabel = svgElement("text", { x: marginLeft, y: 262, class: "chart-label" });
  startLabel.textContent = events.length > 0 ? timeLabel(events[0]?.timestamp ?? "") : "No events";
  const endLabel = svgElement("text", {
    x: width - marginRight,
    y: 262,
    class: "chart-label",
    "text-anchor": "end",
  });
  endLabel.textContent = events.length > 0 ? timeLabel(events.at(-1)?.timestamp ?? "") : "";
  svg.append(startLabel, endLabel);
}

/**
 * Replaces the accessible chart-alternative table body.
 * @param {HTMLTableSectionElement} tableBody Summary table body.
 * @param {readonly IncidentEvent[]} events Filtered events.
 * @returns {void}
 */
export function renderSummaryTable(tableBody, events) {
  const rows = summarizeSeverities(events).map((summary) => {
    const row = document.createElement("tr");
    const severity = document.createElement("th");
    severity.scope = "row";
    severity.textContent = summary.severity;
    const count = document.createElement("td");
    count.textContent = String(summary.count);
    const first = document.createElement("td");
    first.textContent = summary.first ? timeLabel(summary.first) : "—";
    const last = document.createElement("td");
    last.textContent = summary.last ? timeLabel(summary.last) : "—";
    row.append(severity, count, first, last);
    return row;
  });
  tableBody.replaceChildren(...rows);
}

/**
 * Creates a namespaced SVG element and assigns text-safe attributes.
 * @param {string} name SVG tag name.
 * @param {Record<string, string | number>} [attributes] Element attributes.
 * @returns {SVGElement} SVG element.
 */
function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

/**
 * Formats a known-valid timestamp in the user's locale.
 * @param {string} timestamp ISO timestamp.
 * @returns {string} Localized time label.
 */
function timeLabel(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(new Date(timestamp));
}
