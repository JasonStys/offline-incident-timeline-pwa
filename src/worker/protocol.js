/**
 * @file Defines and validates the versioned message contract shared by the UI and parser worker.
 * Functions: createParseRequest, createCancelRequest, isWorkerRequest, isWorkerResponse.
 * Variables: WORKER_PROTOCOL_VERSION, REQUEST_TYPES, RESPONSE_TYPES.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

export const WORKER_PROTOCOL_VERSION = 1;
const REQUEST_TYPES = new Set(["parse", "cancel"]);
const RESPONSE_TYPES = new Set(["progress", "complete", "error", "canceled"]);

/**
 * Builds a parse request containing a transferable file buffer.
 * @param {string} requestId Unique request identifier.
 * @param {string} fileName Source filename.
 * @param {string} mimeType Source MIME type.
 * @param {ArrayBuffer} buffer File bytes transferred to the worker.
 * @returns {{protocolVersion: number, type: "parse", requestId: string, fileName: string, mimeType: string, buffer: ArrayBuffer}}
 */
export function createParseRequest(requestId, fileName, mimeType, buffer) {
  return {
    protocolVersion: WORKER_PROTOCOL_VERSION,
    type: "parse",
    requestId,
    fileName,
    mimeType,
    buffer,
  };
}

/**
 * Builds a cancellation request for an active import.
 * @param {string} requestId Active request identifier.
 * @returns {{protocolVersion: number, type: "cancel", requestId: string}}
 */
export function createCancelRequest(requestId) {
  return { protocolVersion: WORKER_PROTOCOL_VERSION, type: "cancel", requestId };
}

/**
 * Performs a shallow boundary check before the worker consumes an untrusted message.
 * @param {unknown} value Message candidate.
 * @returns {boolean} Whether the common request envelope is valid.
 */
export function isWorkerRequest(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const request = /** @type {Record<string, unknown>} */ (value);
  if (
    request.protocolVersion !== WORKER_PROTOCOL_VERSION ||
    typeof request.type !== "string" ||
    !REQUEST_TYPES.has(request.type) ||
    typeof request.requestId !== "string" ||
    request.requestId.length === 0 ||
    request.requestId.length > 128
  ) {
    return false;
  }
  if (request.type === "cancel") {
    return true;
  }
  return (
    typeof request.fileName === "string" &&
    typeof request.mimeType === "string" &&
    request.buffer instanceof ArrayBuffer
  );
}

/**
 * Validates the common response envelope before resolving UI promises.
 * @param {unknown} value Message candidate.
 * @returns {boolean} Whether the response envelope is valid.
 */
export function isWorkerResponse(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const response = /** @type {Record<string, unknown>} */ (value);
  return (
    response.protocolVersion === WORKER_PROTOCOL_VERSION &&
    typeof response.type === "string" &&
    RESPONSE_TYPES.has(response.type) &&
    typeof response.requestId === "string"
  );
}
