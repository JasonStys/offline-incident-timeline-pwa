/**
 * @file Verifies deterministic JSON and formula-safe RFC-compatible CSV serialization.
 * Functions: Vitest export cases.
 * Variables: normalized event fixture.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { normalizeRecords } from "../../src/core/event.js";
import { serializeEventsCsv, serializeEventsJson } from "../../src/io/export.js";
import { parseLogText } from "../../src/io/parse.js";

const event = normalizeRecords([
  {
    id: "evt-1",
    timestamp: "2026-01-01T00:00:00Z",
    severity: "error",
    service: "api",
    message: '=HYPERLINK("bad")',
    correlationId: "chain-1",
    metadata: { attempt: 2 },
  },
]).events[0];

describe("event export", () => {
  it("uses a versioned JSON envelope", () => {
    const serialized = serializeEventsJson(event ? [event] : []);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(JSON.parse(serialized)).toMatchObject({ schemaVersion: 1, events: [{ id: "evt-1" }] });
  });

  it("quotes cells and neutralizes spreadsheet formulas", () => {
    const serialized = serializeEventsCsv(event ? [event] : []);
    expect(serialized).toContain('"\'=HYPERLINK(""bad"")"');
    const parsed = parseLogText(serialized, "csv");
    expect(parsed[0]).toMatchObject({ id: "evt-1", message: '\'=HYPERLINK("bad")' });
  });
});
