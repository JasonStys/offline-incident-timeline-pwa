/**
 * @file Validates inclusive UTC time windows without browser-local/DST date assumptions.
 * Functions: parseUtcBoundary, parseTimeWindow.
 * Variables: canonical ISO round-trip prevents silently normalized impossible calendar dates.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * Parse an optional UTC datetime control value or explicit-Z URL value.
 * @param {string} value Bounded date/time text; no local offset is inferred.
 * @returns {number | null | undefined} Epoch milliseconds, null if invalid, undefined if empty.
 */
export function parseUtcBoundary(value) {
  if (value === "") return undefined;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?Z?$/.exec(
    value,
  );
  if (!parts || parts[1] === "0000") return null;
  const canonical = `${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:${parts[6] ?? "00"}.${(parts[7] ?? "").padEnd(3, "0")}Z`;
  const epoch = Date.parse(canonical);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === canonical ? epoch : null;
}

/**
 * Validate both boundaries and their inclusive ordering before any filter/export is applied.
 * @param {string} from UTC start control.
 * @param {string} to UTC end control.
 * @returns {{valid: true, fromEpochMs: number | undefined, toEpochMs: number | undefined} | {valid: false, error: string}} Result.
 */
export function parseTimeWindow(from, to) {
  const start = parseUtcBoundary(from);
  const end = parseUtcBoundary(to);
  if (start === null) return { valid: false, error: "Enter a valid UTC start date and time." };
  if (end === null) return { valid: false, error: "Enter a valid UTC end date and time." };
  if (start !== undefined && end !== undefined && start > end) {
    return {
      valid: false,
      error:
        "UTC start must be at or before UTC end. No events are shown or exported until the range is corrected.",
    };
  }
  return { valid: true, fromEpochMs: start, toEpochMs: end };
}
