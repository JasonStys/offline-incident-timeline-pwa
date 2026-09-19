/**
 * @file Verifies versioned worker request construction and boundary validation.
 * Functions: Vitest protocol cases.
 * Variables: request buffer and response cases.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import {
  createCancelRequest,
  createParseRequest,
  isWorkerRequest,
  isWorkerResponse,
  WORKER_PROTOCOL_VERSION,
} from "../../src/worker/protocol.js";

describe("worker protocol", () => {
  it("builds valid parse and cancellation requests", () => {
    const buffer = new ArrayBuffer(8);
    const parse = createParseRequest("r1", "events.json", "application/json", buffer);
    const cancel = createCancelRequest("r1");
    expect(parse.protocolVersion).toBe(WORKER_PROTOCOL_VERSION);
    expect(isWorkerRequest(parse)).toBe(true);
    expect(isWorkerRequest(cancel)).toBe(true);
  });

  it.each([
    null,
    {},
    { protocolVersion: 99, type: "cancel", requestId: "r1" },
    { protocolVersion: 1, type: "unknown", requestId: "r1" },
    { protocolVersion: 1, type: "cancel", requestId: "" },
    { protocolVersion: 1, type: "parse", requestId: "r1", fileName: "x", mimeType: "x" },
  ])("rejects invalid request %j", (request) => {
    expect(isWorkerRequest(request)).toBe(false);
  });

  it("accepts known responses and rejects invalid envelopes", () => {
    expect(isWorkerResponse({ protocolVersion: 1, type: "complete", requestId: "r1" })).toBe(true);
    expect(isWorkerResponse({ protocolVersion: 1, type: "other", requestId: "r1" })).toBe(false);
    expect(isWorkerResponse(null)).toBe(false);
  });
});
