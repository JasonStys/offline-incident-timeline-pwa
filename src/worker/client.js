/**
 * @file Transfers files to the parser worker, tracks progress, supports cancellation, and owns cleanup.
 * Functions: nextRequestId, abortError; class: ParserWorkerClient.
 * Variables: worker, activeRequestId, pending, requestCounter.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { MAX_FILE_BYTES } from "../io/parse.js";
import { createCancelRequest, createParseRequest, isWorkerResponse } from "./protocol.js";

/** @import {IncidentEvent, ValidationIssue} from "../core/event.js" */

let requestCounter = 0;

/** Main-thread facade for one dedicated parser worker. */
export class ParserWorkerClient {
  /**
   * Creates the worker and installs one validated response handler.
   * @param {() => Worker} [workerFactory] Injectable worker constructor.
   */
  constructor(
    workerFactory = () =>
      new Worker(new URL("./parser.worker.js", import.meta.url), { type: "module" }),
  ) {
    this.worker = workerFactory();
    this.activeRequestId = null;
    this.cancelRequested = false;
    /** @type {Map<string, {resolve: (value: {events: IncidentEvent[], issues: ValidationIssue[]}) => void, reject: (reason?: unknown) => void, onProgress: ((processed: number, total: number) => void) | undefined}>} */
    this.pending = new Map();
    this.worker.addEventListener("message", (event) => this.handleMessage(event.data));
    this.worker.addEventListener("error", () => this.failAll(new Error("Parser worker failed.")));
  }

  /**
   * Reads and transfers a bounded file, resolving with validated events and issues.
   * @param {File} file User-selected local file.
   * @param {(processed: number, total: number) => void} [onProgress] Progress observer.
   * @returns {Promise<{events: IncidentEvent[], issues: ValidationIssue[]}>}
   */
  async parse(file, onProgress) {
    if (this.activeRequestId) {
      throw new Error("Another import is already active.");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File exceeds the ${MAX_FILE_BYTES} byte limit.`);
    }
    const requestId = nextRequestId();
    this.activeRequestId = requestId;
    this.cancelRequested = false;
    const buffer = await file.arrayBuffer();
    if (this.cancelRequested) {
      this.activeRequestId = null;
      this.cancelRequested = false;
      throw abortError("Import canceled.");
    }
    const promise = new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject, onProgress });
    });
    const request = createParseRequest(requestId, file.name, file.type, buffer);
    this.worker.postMessage(request, [buffer]);
    return promise;
  }

  /** Requests cooperative cancellation of the active parse. */
  cancel() {
    if (this.activeRequestId) {
      this.cancelRequested = true;
      this.worker.postMessage(createCancelRequest(this.activeRequestId));
    }
  }

  /** Terminates the worker and rejects any unresolved request. */
  terminate() {
    this.failAll(abortError("Parser worker terminated."));
    this.worker.terminate();
  }

  /**
   * Validates and dispatches one worker response.
   * @param {unknown} value Worker message data.
   * @returns {void}
   */
  handleMessage(value) {
    if (!isWorkerResponse(value)) {
      this.failAll(new Error("Parser worker returned an invalid response."));
      return;
    }
    const response = /** @type {Record<string, unknown>} */ (value);
    const requestId = /** @type {string} */ (response.requestId);
    const pending = this.pending.get(requestId);
    if (!pending) {
      return;
    }
    if (response.type === "progress") {
      pending.onProgress?.(Number(response.processed), Number(response.total));
      return;
    }

    this.pending.delete(requestId);
    this.activeRequestId = null;
    this.cancelRequested = false;
    if (response.type === "complete") {
      pending.resolve(
        /** @type {{events: IncidentEvent[], issues: ValidationIssue[]}} */ ({
          events: response.events,
          issues: response.issues,
        }),
      );
    } else if (response.type === "canceled") {
      pending.reject(abortError("Import canceled."));
    } else {
      pending.reject(new Error(String(response.message ?? "Import failed.")));
    }
  }

  /**
   * Rejects and clears all outstanding work after a protocol or worker failure.
   * @param {Error} error Failure reason.
   * @returns {void}
   */
  failAll(error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
    this.activeRequestId = null;
    this.cancelRequested = false;
  }
}

/**
 * Creates a collision-resistant-enough local request identifier without external state.
 * @returns {string} Request identifier.
 */
function nextRequestId() {
  requestCounter += 1;
  return globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}-${requestCounter}`;
}

/**
 * Creates a standard AbortError for cooperative cancellation paths.
 * @param {string} message Human-readable reason.
 * @returns {DOMException} Abort error.
 */
function abortError(message) {
  return new DOMException(message, "AbortError");
}
