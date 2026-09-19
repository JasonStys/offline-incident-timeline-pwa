/**
 * @file Parses transferred files, validates records in cancellable chunks, and returns ordered events.
 * Functions: handleMessage, handleParse, normalizeIncrementally, post, yieldToEventLoop.
 * Variables: activeRequests, NORMALIZATION_CHUNK_SIZE.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { EventValidationError, MAX_RECORDS, normalizeEvent } from "../core/event.js";
import { stableMergeSort } from "../core/stable-merge-sort.js";
import { detectFormat, parseLogText } from "../io/parse.js";
import { isWorkerRequest, WORKER_PROTOCOL_VERSION } from "./protocol.js";

const NORMALIZATION_CHUNK_SIZE = 250;
/** @type {Map<string, {canceled: boolean}>} */
const activeRequests = new Map();

self.addEventListener("message", (event) => {
  // Dedicated-worker messages normally expose an empty origin. Reject any explicit foreign origin.
  if (event.origin !== "" && event.origin !== self.location.origin) {
    return;
  }
  handleMessage(event.data);
});

/**
 * Validates the request envelope and routes parse or cancellation work.
 * @param {unknown} value Worker message data.
 * @returns {void}
 */
function handleMessage(value) {
  if (!isWorkerRequest(value)) {
    return;
  }
  const request = /** @type {Record<string, unknown>} */ (value);
  const requestId = /** @type {string} */ (request.requestId);
  if (request.type === "cancel") {
    const active = activeRequests.get(requestId);
    if (active) {
      active.canceled = true;
    }
    return;
  }
  void handleParse(
    requestId,
    /** @type {string} */ (request.fileName),
    /** @type {string} */ (request.mimeType),
    /** @type {ArrayBuffer} */ (request.buffer),
  );
}

/**
 * Decodes and parses a transferred buffer, emitting a safe terminal response.
 * @param {string} requestId Request identifier.
 * @param {string} fileName Source filename.
 * @param {string} mimeType Source MIME type.
 * @param {ArrayBuffer} buffer Transferred bytes.
 * @returns {Promise<void>}
 */
async function handleParse(requestId, fileName, mimeType, buffer) {
  if (activeRequests.has(requestId)) {
    post("error", requestId, { message: "Duplicate worker request identifier." });
    return;
  }
  const state = { canceled: false };
  activeRequests.set(requestId, state);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    const format = detectFormat(fileName, mimeType, text);
    const records = parseLogText(text, format);
    if (records.length > MAX_RECORDS) {
      throw new Error(`Import exceeds the ${MAX_RECORDS} record limit.`);
    }
    const result = await normalizeIncrementally(records, requestId, state);
    if (state.canceled) {
      post("canceled", requestId);
    } else {
      post("complete", requestId, result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    post("error", requestId, { message });
  } finally {
    activeRequests.delete(requestId);
  }
}

/**
 * Normalizes records in bounded chunks so cancellation messages can be processed between chunks.
 * @param {unknown[]} records Parsed records.
 * @param {string} requestId Request identifier.
 * @param {{canceled: boolean}} state Cooperative cancellation state.
 * @returns {Promise<{events: import("../core/event.js").IncidentEvent[], issues: import("../core/event.js").ValidationIssue[]}>}
 */
async function normalizeIncrementally(records, requestId, state) {
  /** @type {import("../core/event.js").IncidentEvent[]} */
  const events = [];
  /** @type {import("../core/event.js").ValidationIssue[]} */
  const issues = [];
  const seenIds = new Set();

  for (let sequence = 0; sequence < records.length; sequence += 1) {
    if (state.canceled) {
      return { events: [], issues: [] };
    }
    try {
      const event = normalizeEvent(records[sequence], sequence);
      if (seenIds.has(event.id)) {
        issues.push({ sequence, field: "id", message: "Duplicate event ID was skipped." });
      } else {
        seenIds.add(event.id);
        events.push(event);
      }
    } catch (error) {
      if (error instanceof EventValidationError) {
        issues.push({ sequence, field: error.field, message: error.message });
      } else {
        throw error;
      }
    }

    if ((sequence + 1) % NORMALIZATION_CHUNK_SIZE === 0) {
      post("progress", requestId, { processed: sequence + 1, total: records.length });
      await yieldToEventLoop();
    }
  }
  post("progress", requestId, { processed: records.length, total: records.length });
  return {
    events: stableMergeSort(events, (left, right) => left.epochMs - right.epochMs),
    issues,
  };
}

/**
 * Emits a versioned structured-clone-compatible response.
 * @param {string} type Response type.
 * @param {string} requestId Request identifier.
 * @param {Record<string, unknown>} [payload] Type-specific fields.
 * @returns {void}
 */
function post(type, requestId, payload = {}) {
  self.postMessage({ protocolVersion: WORKER_PROTOCOL_VERSION, type, requestId, ...payload });
}

/**
 * Yields to the worker event loop so queued cancellation messages can update state.
 * @returns {Promise<void>}
 */
function yieldToEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
