/**
 * @file Keep visible evidence on the same UTC time scale as the timestamp filters and exports.
 * Functions: utcTimestamp and utcClock render normalized instants without host locale or timezone drift.
 * Variables: ISO strings retain milliseconds; dates are shown where a range can span multiple days.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */

/** @param {string} timestamp Valid timestamp with an explicit offset. @returns {string} UTC date and clock. */
export function utcTimestamp(timestamp) {
  return new Date(timestamp).toISOString().replace("T", " ").replace("Z", " UTC");
}

/** @param {string} timestamp Valid timestamp with an explicit offset. @returns {string} Millisecond UTC clock for a compact row. */
export function utcClock(timestamp) {
  return new Date(timestamp).toISOString().slice(11, -1) + " UTC";
}
