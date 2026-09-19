/**
 * @file Reads and writes bounded, non-sensitive filter state in the page URL.
 * Functions: readUrlFilters, writeUrlFilters, boundedQueryValue.
 * Variables: FILTER_KEYS, MAX_URL_VALUE_LENGTH.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

const FILTER_KEYS = ["q", "severity", "service", "correlation"];
const MAX_URL_VALUE_LENGTH = 128;

/**
 * Reads only the allowlisted filter keys from a URL.
 * @param {{search: string}} [locationValue=window.location] Location-like object.
 * @returns {{query: string, severity: string, service: string, correlationId: string}} Filter state.
 */
export function readUrlFilters(locationValue = window.location) {
  const parameters = new URLSearchParams(locationValue.search);
  return {
    query: boundedQueryValue(parameters.get("q")),
    severity: boundedQueryValue(parameters.get("severity")),
    service: boundedQueryValue(parameters.get("service")),
    correlationId: boundedQueryValue(parameters.get("correlation")),
  };
}

/**
 * Replaces URL filter state without serializing events, metadata, or navigation history entries.
 * @param {{query?: string, severity?: string, service?: string, correlationId?: string}} filters Filter state.
 * @param {{replaceState: (data: unknown, unused: string, url?: string | URL | null) => void}} [historyValue=window.history] History-like object.
 * @param {{href: string}} [locationValue=window.location] Location-like object.
 * @returns {URL} Updated URL.
 */
export function writeUrlFilters(
  filters,
  historyValue = window.history,
  locationValue = window.location,
) {
  const url = new URL(locationValue.href);
  for (const key of FILTER_KEYS) {
    url.searchParams.delete(key);
  }
  const entries = {
    q: filters.query,
    severity: filters.severity,
    service: filters.service,
    correlation: filters.correlationId,
  };
  for (const [key, rawValue] of Object.entries(entries)) {
    const value = boundedQueryValue(rawValue ?? "");
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  historyValue.replaceState(null, "", url);
  return url;
}

/**
 * Trims and bounds one URL value to prevent oversized share links.
 * @param {string | null} value Candidate value.
 * @returns {string} Safe bounded value.
 */
function boundedQueryValue(value) {
  return (value ?? "").trim().slice(0, MAX_URL_VALUE_LENGTH);
}
