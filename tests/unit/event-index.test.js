/**
 * @file Verifies indexed intersections, tokens, time bounds, service discovery, and severity summaries.
 * Functions: event factory and Vitest test cases.
 * Variables: events and index fixtures.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { EventIndex, summarizeSeverities, tokenize } from "../../src/core/event-index.js";
import { normalizeRecords } from "../../src/core/event.js";

const events = normalizeRecords([
  {
    id: "a",
    timestamp: "2026-01-01T00:00:00Z",
    severity: "error",
    service: "api",
    message: "Directory timeout",
    correlationId: "chain-1",
  },
  {
    id: "b",
    timestamp: "2026-01-01T00:00:01Z",
    severity: "warning",
    service: "queue",
    message: "Backlog rising",
    correlationId: "chain-1",
  },
  {
    id: "c",
    timestamp: "2026-01-01T00:00:02Z",
    severity: "info",
    service: "api",
    message: "Directory recovered",
    correlationId: "chain-2",
  },
]).events;

describe("EventIndex", () => {
  it("tokenizes Unicode and punctuation consistently", () => {
    expect(tokenize("API_timeout déjà-vu / Retry")).toEqual(["api_timeout", "déjà-vu", "retry"]);
  });

  it("filters with indexed dimensions and tokens", () => {
    const index = new EventIndex(events);
    expect(index.filter({ service: "api" }).map((event) => event.id)).toEqual(["a", "c"]);
    expect(index.filter({ query: "directory timeout", severity: "error" })).toEqual([events[0]]);
    expect(index.filter({ correlationId: "chain-1", service: "queue" })).toEqual([events[1]]);
    expect(index.filter({ query: "missing" })).toEqual([]);
  });

  it("applies inclusive time bounds after index selection", () => {
    const index = new EventIndex(events);
    expect(
      index.filter({
        fromEpochMs: Date.parse("2026-01-01T00:00:01Z"),
        toEpochMs: Date.parse("2026-01-01T00:00:02Z"),
      }),
    ).toEqual([events[1], events[2]]);
  });

  it("returns locale-sorted service options and severity summaries", () => {
    const index = new EventIndex(events);
    expect(index.services()).toEqual(["api", "queue"]);
    expect(summarizeSeverities(events)).toEqual([
      { severity: "critical", count: 0, first: null, last: null },
      {
        severity: "error",
        count: 1,
        first: "2026-01-01T00:00:00.000Z",
        last: "2026-01-01T00:00:00.000Z",
      },
      {
        severity: "warning",
        count: 1,
        first: "2026-01-01T00:00:01.000Z",
        last: "2026-01-01T00:00:01.000Z",
      },
      {
        severity: "info",
        count: 1,
        first: "2026-01-01T00:00:02.000Z",
        last: "2026-01-01T00:00:02.000Z",
      },
    ]);
  });
});
