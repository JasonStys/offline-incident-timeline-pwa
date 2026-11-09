/**
 * @file Tests UTC calendar validation, inclusive boundaries and indexed filtering independently of UI.
 * Functions: Vitest date-window and exact-event cases.
 * Variables: UTC fixtures exercise leap dates, DST ambiguity, epoch zero and millisecond endpoints.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { parseTimeWindow, parseUtcBoundary } from "../../src/state/time-window.js";
import { EventIndex } from "../../src/core/event-index.js";
import { normalizeRecords } from "../../src/core/event.js";

describe("UTC time-window boundary", () => {
  it.each([
    ["1970-01-01T00:00", 0],
    ["2024-02-29T12:00:00.1", Date.parse("2024-02-29T12:00:00.100Z")],
    ["2026-11-01T01:30", Date.parse("2026-11-01T01:30:00Z")],
    ["2026-03-08T02:30:00.123Z", Date.parse("2026-03-08T02:30:00.123Z")],
  ])("parses %s explicitly as UTC, not local/DST time", (value, expected) => {
    expect(parseUtcBoundary(value)).toBe(expected);
  });

  it.each([
    "garbage",
    "2026-02-29T00:00",
    "2026-04-31T00:00",
    "2026-13-01T00:00",
    "2026-01-01T24:00",
    "2026-01-01T00:00:60",
    "2026-01-01T00:00:00.1234",
    "2026-01-01",
    "2026-01-01T00:00-05:00",
    "0000-01-01T00:00",
  ])("rejects invalid calendar text %s", (value) => {
    expect(parseUtcBoundary(value)).toBeNull();
  });

  it("distinguishes open, invalid and reversed ranges without inventing a bound", () => {
    expect(parseTimeWindow("", "")).toEqual({
      valid: true,
      fromEpochMs: undefined,
      toEpochMs: undefined,
    });
    expect(parseTimeWindow("1970-01-01T00:00", "")).toEqual({
      valid: true,
      fromEpochMs: 0,
      toEpochMs: undefined,
    });
    expect(parseTimeWindow("", "1970-01-01T00:00")).toEqual({
      valid: true,
      fromEpochMs: undefined,
      toEpochMs: 0,
    });
    expect(parseTimeWindow("invalid", "")).toMatchObject({
      valid: false,
      error: expect.stringContaining("start"),
    });
    expect(parseTimeWindow("", "invalid")).toMatchObject({
      valid: false,
      error: expect.stringContaining("end"),
    });
    expect(parseTimeWindow("2026-01-02T00:00", "2026-01-01T00:00")).toMatchObject({
      valid: false,
      error: expect.stringContaining("before"),
    });
  });

  it("combines inclusive millisecond bounds with indexed dimensions and exact UTC offsets", () => {
    const records = normalizeRecords(
      [0, 500, 1000, 1001].map((offset, index) => ({
        id: `edge-${index}`,
        timestamp: new Date(Date.parse("2026-01-01T00:00:00Z") + offset).toISOString(),
        severity: index === 1 ? "error" : "info",
        service: "grid-gateway",
        message: "Synthetic voltage event",
        correlationId: "demo-microgrid",
      })),
    ).events;
    const range = parseTimeWindow("2026-01-01T00:00:00.500", "2026-01-01T00:00:01");
    expect(range.valid).toBe(true);
    if (!range.valid) throw new Error("Expected a valid fixture range");
    const index = new EventIndex(records);
    const bounds = { fromEpochMs: range.fromEpochMs ?? 0, toEpochMs: range.toEpochMs ?? 0 };
    expect(index.filter(bounds).map((event) => event.id)).toEqual(["edge-1", "edge-2"]);
    expect(
      index
        .filter({ ...bounds, severity: "error", service: "grid-gateway" })
        .map((event) => event.id),
    ).toEqual(["edge-1"]);
    expect(
      index
        .filter({ fromEpochMs: bounds.fromEpochMs, toEpochMs: bounds.fromEpochMs })
        .map((event) => event.id),
    ).toEqual(["edge-1"]);
  });
});
