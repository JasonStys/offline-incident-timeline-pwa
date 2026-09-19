/**
 * @file Verifies format detection, JSON envelopes, CSV quoting, aliases, metadata, and parser limits.
 * Functions: Vitest parser cases.
 * Variables: validRecord and CSV fixtures.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { detectFormat, MAX_FILE_BYTES, parseCsvRows, parseLogText } from "../../src/io/parse.js";

const validRecord = {
  timestamp: "2026-01-01T00:00:00Z",
  severity: "info",
  service: "api",
  message: "Ready",
};

describe("log parsing", () => {
  it("detects extensions, MIME types, content, and CSV fallback", () => {
    expect(detectFormat("events.JSON", "", "x")).toBe("json");
    expect(detectFormat("events.bin", "application/json", "x")).toBe("json");
    expect(detectFormat("events.csv", "", "x")).toBe("csv");
    expect(detectFormat("events.bin", "text/csv", "x")).toBe("csv");
    expect(detectFormat("events.bin", "", "  [ ]")).toBe("json");
    expect(detectFormat("events.bin", "", "a,b")).toBe("csv");
  });

  it("parses JSON arrays and version-friendly event envelopes", () => {
    expect(parseLogText(JSON.stringify([validRecord]), "json")).toEqual([validRecord]);
    expect(
      parseLogText(JSON.stringify({ schemaVersion: 1, events: [validRecord] }), "json"),
    ).toEqual([validRecord]);
  });

  it("rejects malformed, empty, unsupported, and oversized JSON", () => {
    expect(() => parseLogText("", "json")).toThrow(/empty/);
    expect(() => parseLogText("{", "json")).toThrow(/malformed/);
    expect(() => parseLogText('{"record":1}', "json")).toThrow(/array/);
    expect(() => parseLogText("x".repeat(MAX_FILE_BYTES + 1), "csv")).toThrow(/exceeds/);
  });

  it("parses quoted CSV fields, newlines, aliases, and metadata", () => {
    const csv = [
      "event_id,timestamp,severity,service,message,correlation_id,metadata",
      'evt-1,2026-01-01T00:00:00Z,error,api,"Timed out, then retried",chain-1,"{""attempt"":2}"',
      'evt-2,2026-01-01T00:00:01Z,info,api,"Line one\nLine two",chain-1,',
    ].join("\r\n");
    expect(parseLogText(csv, "csv")).toEqual([
      {
        id: "evt-1",
        timestamp: "2026-01-01T00:00:00Z",
        severity: "error",
        service: "api",
        message: "Timed out, then retried",
        correlationId: "chain-1",
        metadata: { attempt: 2 },
      },
      {
        id: "evt-2",
        timestamp: "2026-01-01T00:00:01Z",
        severity: "info",
        service: "api",
        message: "Line one\nLine two",
        correlationId: "chain-1",
        metadata: "",
      },
    ]);
  });

  it("rejects invalid CSV contracts", () => {
    expect(() => parseLogText("", "csv")).toThrow(/empty/);
    expect(() => parseLogText("id,message\n1,test", "csv")).toThrow(/missing required/);
    expect(() =>
      parseLogText("timestamp,severity,service,message,event_id,id\n1,info,a,b,c,d", "csv"),
    ).toThrow(/unique/);
    expect(() => parseCsvRows('a,"unterminated')).toThrow(/unterminated/);
  });

  it("keeps invalid metadata text for domain validation", () => {
    const csv =
      "timestamp,severity,service,message,metadata\n2026-01-01T00:00:00Z,info,api,Ready,{bad}";
    expect(parseLogText(csv, "csv")[0]).toHaveProperty("metadata", "{bad}");
  });
});
