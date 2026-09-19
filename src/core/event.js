/**
 * @file Validates untrusted log records, normalizes fields, rejects duplicates, and orders events.
 * Functions: normalizeEvent, normalizeRecords, parseTimestamp, boundedString, safeMetadata, hashText.
 * Variables: SEVERITIES, SEVERITY_ALIASES, MAX_RECORDS, MAX_METADATA_BYTES, IDENTIFIER_PATTERN.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { stableMergeSort } from "./stable-merge-sort.js";

/** @typedef {"info" | "warning" | "error" | "critical"} Severity */
/**
 * @typedef {object} IncidentEvent
 * @property {string} id Stable local event identifier.
 * @property {string} timestamp Normalized ISO-8601 timestamp.
 * @property {number} epochMs Timestamp as milliseconds since the Unix epoch.
 * @property {Severity} severity Normalized severity.
 * @property {string} service Producing component.
 * @property {string} message Human-readable evidence.
 * @property {string} correlationId Failure-chain identifier.
 * @property {number} sequence Original input position used for stable ties.
 * @property {Record<string, unknown>} metadata Bounded structured metadata.
 */
/**
 * @typedef {object} ValidationIssue
 * @property {number} sequence Input record position.
 * @property {string} field Field that failed validation.
 * @property {string} message Safe diagnostic.
 */

export const SEVERITIES = /** @type {const} */ (["critical", "error", "warning", "info"]);
export const MAX_RECORDS = 100_000;
export const MAX_METADATA_BYTES = 4_096;
const IDENTIFIER_PATTERN = /^[\p{L}\p{N}._:/-]+$/u;
const SEVERITY_ALIASES = new Map([
  ["warn", "warning"],
  ["fatal", "critical"],
  ["debug", "info"],
]);

/** Error raised when a single untrusted record violates the data contract. */
export class EventValidationError extends Error {
  /**
   * Creates a validation error without embedding the untrusted value.
   * @param {string} field Invalid field.
   * @param {string} message Safe explanation.
   */
  constructor(field, message) {
    super(message);
    this.name = "EventValidationError";
    this.field = field;
  }
}

/**
 * Validates and normalizes a single input record.
 * @param {unknown} record Untrusted JSON or CSV record.
 * @param {number} sequence Zero-based source order.
 * @returns {IncidentEvent} Immutable normalized event.
 * @throws {EventValidationError} When a required field is invalid.
 */
export function normalizeEvent(record, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new EventValidationError("sequence", "Sequence must be a non-negative safe integer.");
  }
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    throw new EventValidationError("record", "Record must be an object.");
  }

  const input = /** @type {Record<string, unknown>} */ (record);
  const epochMs = parseTimestamp(input.timestamp);
  const timestamp = new Date(epochMs).toISOString();
  const rawSeverity = boundedString(input.severity, "severity", 16).toLowerCase();
  const severity = /** @type {Severity} */ (SEVERITY_ALIASES.get(rawSeverity) ?? rawSeverity);
  if (!SEVERITIES.includes(severity)) {
    throw new EventValidationError(
      "severity",
      `Severity must be one of: ${SEVERITIES.join(", ")}.`,
    );
  }

  const service = boundedString(input.service, "service", 80);
  const message = boundedString(input.message, "message", 2_000);
  const correlationId = optionalIdentifier(input.correlationId, "uncorrelated", "correlationId");
  const generatedId = `evt-${String(sequence).padStart(6, "0")}-${hashText(`${timestamp}|${service}|${message}`)}`;
  const id = optionalIdentifier(input.id, generatedId, "id");
  const metadata = safeMetadata(input.metadata);

  return Object.freeze({
    id,
    timestamp,
    epochMs,
    severity,
    service,
    message,
    correlationId,
    sequence,
    metadata,
  });
}

/**
 * Normalizes a bounded record collection, skipping invalid and duplicate records with diagnostics.
 * @param {unknown[]} records Untrusted records.
 * @param {number} [limit=MAX_RECORDS] Maximum accepted input count.
 * @returns {{events: IncidentEvent[], issues: ValidationIssue[]}} Ordered events and safe issues.
 */
export function normalizeRecords(records, limit = MAX_RECORDS) {
  if (!Array.isArray(records)) {
    throw new EventValidationError("records", "Imported content must contain a record array.");
  }
  if (records.length > limit) {
    throw new EventValidationError("records", `Import exceeds the ${limit} record limit.`);
  }

  /** @type {IncidentEvent[]} */
  const events = [];
  /** @type {ValidationIssue[]} */
  const issues = [];
  const seenIds = new Set();

  records.forEach((record, sequence) => {
    try {
      const event = normalizeEvent(record, sequence);
      if (seenIds.has(event.id)) {
        issues.push({ sequence, field: "id", message: "Duplicate event ID was skipped." });
        return;
      }
      seenIds.add(event.id);
      events.push(event);
    } catch (error) {
      if (error instanceof EventValidationError) {
        issues.push({ sequence, field: error.field, message: error.message });
        return;
      }
      throw error;
    }
  });

  return {
    events: stableMergeSort(events, (left, right) => left.epochMs - right.epochMs),
    issues,
  };
}

/**
 * Converts an ISO string or finite epoch-millisecond number into a valid instant.
 * @param {unknown} value Timestamp candidate.
 * @returns {number} Epoch milliseconds.
 */
function parseTimestamp(value) {
  const epochMs =
    typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(epochMs) || epochMs < 0 || epochMs > 8_640_000_000_000_000) {
    throw new EventValidationError(
      "timestamp",
      "Timestamp must be a valid ISO string or epoch milliseconds.",
    );
  }
  return epochMs;
}

/**
 * Requires a trimmed, non-empty, bounded string.
 * @param {unknown} value Candidate value.
 * @param {string} field Diagnostic field name.
 * @param {number} maximumLength Maximum Unicode code-unit length.
 * @returns {string} Validated string.
 */
function boundedString(value, field, maximumLength) {
  if (typeof value !== "string") {
    throw new EventValidationError(field, `${field} must be a string.`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new EventValidationError(
      field,
      `${field} must contain 1 to ${maximumLength} characters.`,
    );
  }
  return normalized;
}

/**
 * Validates an optional identifier or returns a deterministic fallback.
 * @param {unknown} value Identifier candidate.
 * @param {string} fallback Default identifier.
 * @param {string} field Diagnostic field name.
 * @returns {string} Safe identifier.
 */
function optionalIdentifier(value, fallback, field) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const identifier = boundedString(value, field, 128);
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new EventValidationError(
      field,
      `${field} may contain letters, numbers, period, underscore, colon, slash, and hyphen.`,
    );
  }
  return identifier;
}

/**
 * Accepts a small plain object that can be structured-cloned into IndexedDB.
 * @param {unknown} value Metadata candidate.
 * @returns {Record<string, unknown>} Frozen metadata object.
 */
function safeMetadata(value) {
  if (value === undefined || value === null || value === "") {
    return Object.freeze({});
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new EventValidationError("metadata", "Metadata must be an object.");
  }
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined || serialized.length > MAX_METADATA_BYTES) {
      throw new EventValidationError(
        "metadata",
        `Metadata must serialize to at most ${MAX_METADATA_BYTES} bytes.`,
      );
    }
    return Object.freeze(/** @type {Record<string, unknown>} */ (JSON.parse(serialized)));
  } catch (error) {
    if (error instanceof EventValidationError) {
      throw error;
    }
    throw new EventValidationError("metadata", "Metadata must be JSON serializable.");
  }
}

/**
 * Produces a compact deterministic non-cryptographic identifier suffix.
 * @param {string} text Input text.
 * @returns {string} Eight-character hexadecimal hash.
 */
function hashText(text) {
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
