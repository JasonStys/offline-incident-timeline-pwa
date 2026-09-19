/**
 * @file Verifies event validation, normalization, duplicate handling, stable ties, and input limits.
 * Functions: record factory and Vitest test cases.
 * Variables: baseRecord and invalid-case tables.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import {
  EventValidationError,
  MAX_METADATA_BYTES,
  normalizeEvent,
  normalizeRecords,
} from "../../src/core/event.js";

const baseRecord = {
  id: "evt-1",
  timestamp: "2026-01-01T00:00:00Z",
  severity: "warning",
  service: "gateway",
  message: "Queue depth elevated",
  correlationId: "chain-1",
  metadata: { attempt: 2 },
};

describe("normalizeEvent", () => {
  it("normalizes a complete event and freezes its data", () => {
    const event = normalizeEvent(baseRecord, 3);
    expect(event).toMatchObject({
      id: "evt-1",
      timestamp: "2026-01-01T00:00:00.000Z",
      epochMs: 1_767_225_600_000,
      severity: "warning",
      service: "gateway",
      sequence: 3,
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.metadata)).toBe(true);
  });

  it.each([
    ["warn", "warning"],
    ["fatal", "critical"],
    ["debug", "info"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeEvent({ ...baseRecord, severity: input }, 0).severity).toBe(expected);
  });

  it("generates deterministic defaults for optional identifiers", () => {
    const required = {
      timestamp: baseRecord.timestamp,
      severity: baseRecord.severity,
      service: baseRecord.service,
      message: baseRecord.message,
      metadata: baseRecord.metadata,
    };
    const first = normalizeEvent(required, 2);
    const second = normalizeEvent(required, 2);
    expect(first.id).toMatch(/^evt-000002-[0-9a-f]{8}$/);
    expect(first.id).toBe(second.id);
    expect(first.correlationId).toBe("uncorrelated");
  });

  it.each([
    [null, 0, "record"],
    [baseRecord, -1, "sequence"],
    [{ ...baseRecord, timestamp: "invalid" }, 0, "timestamp"],
    [{ ...baseRecord, timestamp: -2 }, 0, "timestamp"],
    [{ ...baseRecord, severity: "notice" }, 0, "severity"],
    [{ ...baseRecord, service: "" }, 0, "service"],
    [{ ...baseRecord, message: 42 }, 0, "message"],
    [{ ...baseRecord, id: "unsafe id" }, 0, "id"],
    [{ ...baseRecord, metadata: [] }, 0, "metadata"],
  ])("rejects invalid data for %s", (record, sequence, field) => {
    expect(() => normalizeEvent(record, sequence)).toThrow(EventValidationError);
    try {
      normalizeEvent(record, sequence);
    } catch (error) {
      expect(error).toHaveProperty("field", field);
    }
  });

  it("rejects oversized and cyclic metadata", () => {
    expect(() =>
      normalizeEvent({ ...baseRecord, metadata: { value: "x".repeat(MAX_METADATA_BYTES + 1) } }, 0),
    ).toThrow(/at most/);
    const cyclic = {};
    cyclic.self = cyclic;
    expect(() => normalizeEvent({ ...baseRecord, metadata: cyclic }, 0)).toThrow(/serializable/);
  });
});

describe("normalizeRecords", () => {
  it("sorts by timestamp while preserving equal-time input order", () => {
    const result = normalizeRecords([
      { ...baseRecord, id: "later", timestamp: "2026-01-01T00:00:02Z" },
      { ...baseRecord, id: "tie-a", timestamp: "2026-01-01T00:00:01Z" },
      { ...baseRecord, id: "tie-b", timestamp: "2026-01-01T00:00:01Z" },
    ]);
    expect(result.events.map((event) => event.id)).toEqual(["tie-a", "tie-b", "later"]);
  });

  it("reports invalid and duplicate records without failing valid records", () => {
    const result = normalizeRecords([
      baseRecord,
      { ...baseRecord },
      { ...baseRecord, id: "evt-3", severity: "bad" },
    ]);
    expect(result.events).toHaveLength(1);
    expect(result.issues).toEqual([
      { sequence: 1, field: "id", message: "Duplicate event ID was skipped." },
      {
        sequence: 2,
        field: "severity",
        message: "Severity must be one of: critical, error, warning, info.",
      },
    ]);
  });

  it("enforces the collection contract", () => {
    expect(() => normalizeRecords(/** @type {never} */ ({}))).toThrow(/array/);
    expect(() => normalizeRecords([baseRecord, baseRecord], 1)).toThrow(/record limit/);
  });
});
