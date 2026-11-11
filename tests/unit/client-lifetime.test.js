/**
 * @file Verify parser-client admission recovers after actual file-read and postMessage failures.
 * Functions: inertWorker and independent client lifetime regressions; parsing outcomes are not mocked as success.
 * Variables: synthetic file failures and controlled Worker transport only.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { expect, it, vi } from "vitest";
import { ParserWorkerClient } from "../../src/worker/client.js";

/** @returns {Worker} Inert transport whose failure is explicit; no parser or application output is asserted. */
function inertWorker() {
  return /** @type {Worker} */ (
    /** @type {unknown} */ ({ addEventListener: vi.fn(), postMessage: vi.fn(), terminate: vi.fn() })
  );
}

it("a rejected actual file read releases admission so a later import can be attempted", async () => {
  const client = new ParserWorkerClient(inertWorker);
  const file = /** @type {File} */ (
    /** @type {unknown} */ ({
      size: 1,
      name: "unavailable.json",
      type: "application/json",
      arrayBuffer: async () => {
        throw new Error("owned file no longer available");
      },
    })
  );
  await expect(client.parse(file)).rejects.toThrow("owned file no longer available");
  expect(client.activeRequestId).toBeNull();
  expect(client.pending.size).toBe(0);
  // Another independent read failure must reach its own source, not remain stuck behind the earlier request ID.
  await expect(client.parse(file)).rejects.toThrow("owned file no longer available");
  client.terminate();
});

it("a synchronous transport refusal leaves no pending promise or permanently busy client", async () => {
  const worker = inertWorker();
  worker.postMessage = () => {
    throw new Error("owned transport refused");
  };
  const client = new ParserWorkerClient(() => worker);
  const file = /** @type {File} */ (
    /** @type {unknown} */ ({
      size: 2,
      name: "data.json",
      type: "application/json",
      arrayBuffer: async () => new ArrayBuffer(2),
    })
  );
  await expect(client.parse(file)).rejects.toThrow("owned transport refused");
  expect(client.activeRequestId).toBeNull();
  expect(client.pending.size).toBe(0);
  await expect(client.parse(file)).rejects.toThrow("owned transport refused");
});
