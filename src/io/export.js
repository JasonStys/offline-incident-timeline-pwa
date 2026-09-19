/**
 * @file Serializes validated events to deterministic JSON and spreadsheet-safe CSV exports.
 * Functions: serializeEventsJson, serializeEventsCsv, csvCell.
 * Variables: CSV_HEADERS, FORMULA_PREFIX_PATTERN.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/** @import {IncidentEvent} from "../core/event.js" */

const CSV_HEADERS = [
  "id",
  "timestamp",
  "severity",
  "service",
  "message",
  "correlationId",
  "metadata",
];
const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

/**
 * Serializes events with stable indentation and a versioned envelope.
 * @param {readonly IncidentEvent[]} events Validated events.
 * @returns {string} JSON export.
 */
export function serializeEventsJson(events) {
  return `${JSON.stringify({ schemaVersion: 1, events }, null, 2)}\n`;
}

/**
 * Serializes events with quoted cells and formula-injection hardening.
 * @param {readonly IncidentEvent[]} events Validated events.
 * @returns {string} CSV export with CRLF row endings.
 */
export function serializeEventsCsv(events) {
  const rows = [CSV_HEADERS.map(csvCell).join(",")];
  for (const event of events) {
    rows.push(
      [
        event.id,
        event.timestamp,
        event.severity,
        event.service,
        event.message,
        event.correlationId,
        JSON.stringify(event.metadata),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${rows.join("\r\n")}\r\n`;
}

/**
 * Quotes a CSV cell and neutralizes spreadsheet formula prefixes.
 * @param {unknown} value Cell value.
 * @returns {string} Safe quoted cell.
 */
function csvCell(value) {
  let text = String(value);
  if (FORMULA_PREFIX_PATTERN.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}
