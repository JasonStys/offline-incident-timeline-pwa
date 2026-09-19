/**
 * @file Parses bounded JSON and RFC-4180-style CSV text into untrusted record objects.
 * Functions: detectFormat, parseLogText, parseJsonRecords, parseCsvRecords, parseCsvRows, csvRecord.
 * Variables: MAX_FILE_BYTES, REQUIRED_HEADERS, HEADER_ALIASES.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUIRED_HEADERS = new Set(["timestamp", "severity", "service", "message"]);
const HEADER_ALIASES = new Map([
  ["correlation_id", "correlationId"],
  ["correlationid", "correlationId"],
  ["event_id", "id"],
]);

/** @typedef {"json" | "csv"} LogFormat */

/**
 * Selects a supported format from the filename, MIME type, or first non-space token.
 * @param {string} fileName Source filename.
 * @param {string} mimeType Browser-reported MIME type.
 * @param {string} text Decoded source text.
 * @returns {LogFormat} Detected format.
 */
export function detectFormat(fileName, mimeType, text) {
  const loweredName = fileName.toLocaleLowerCase();
  const loweredMime = mimeType.toLocaleLowerCase();
  if (loweredName.endsWith(".json") || loweredMime.includes("json")) {
    return "json";
  }
  if (loweredName.endsWith(".csv") || loweredMime.includes("csv")) {
    return "csv";
  }
  if (text.trimStart().startsWith("[") || text.trimStart().startsWith("{")) {
    return "json";
  }
  return "csv";
}

/**
 * Parses bounded text according to the explicit import format.
 * @param {string} text Decoded log text.
 * @param {LogFormat} format Explicit format.
 * @returns {unknown[]} Untrusted records for domain validation.
 */
export function parseLogText(text, format) {
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${MAX_FILE_BYTES} byte limit.`);
  }
  if (text.trim().length === 0) {
    throw new Error("File is empty.");
  }
  return format === "json" ? parseJsonRecords(text) : parseCsvRecords(text);
}

/**
 * Accepts either a top-level event array or an object containing an events array.
 * @param {string} text JSON source.
 * @returns {unknown[]} Parsed records.
 */
function parseJsonRecords(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON is malformed.");
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed !== null && typeof parsed === "object" && Array.isArray(parsed.events)) {
    return parsed.events;
  }
  throw new Error("JSON must be an array or an object with an events array.");
}

/**
 * Maps a header row and data rows to plain record objects.
 * @param {string} text CSV source.
 * @returns {Record<string, unknown>[]} Untrusted records.
 */
function parseCsvRecords(text) {
  const rows = parseCsvRows(text);
  const headerRow = rows.shift();
  if (!headerRow) {
    throw new Error("CSV requires a header row.");
  }
  const headers = headerRow.map((header) => {
    const trimmed = header.trim();
    return HEADER_ALIASES.get(trimmed.toLocaleLowerCase()) ?? trimmed;
  });
  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV headers must be unique after alias normalization.");
  }
  const missing = [...REQUIRED_HEADERS].filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required headers: ${missing.join(", ")}.`);
  }
  return rows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => csvRecord(headers, row));
}

/**
 * Tokenizes CSV with quoted commas, newlines, and doubled quote escaping.
 * @param {string} text CSV source.
 * @returns {string[][]} Rows and cells.
 */
export function parseCsvRows(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field.");
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Converts one CSV row to a record and parses optional metadata JSON.
 * @param {string[]} headers Normalized headers.
 * @param {string[]} row Cell values.
 * @returns {Record<string, unknown>} Record object.
 */
function csvRecord(headers, row) {
  /** @type {Record<string, unknown>} */
  const record = {};
  headers.forEach((header, index) => {
    const value = row[index] ?? "";
    if (header === "metadata" && value.trim().length > 0) {
      try {
        record[header] = JSON.parse(value);
      } catch {
        record[header] = value;
      }
    } else {
      record[header] = value;
    }
  });
  return record;
}
