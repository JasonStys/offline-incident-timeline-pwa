/**
 * @file Builds reusable severity, service, correlation, and token indexes for fast event filtering.
 * Functions: tokenize, addToIndex, intersectSets, summarizeSeverities; class: EventIndex.
 * Variables: TOKEN_PATTERN, severityIndex, serviceIndex, correlationIndex, tokenIndex.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { SEVERITIES } from "./event.js";

/** @import {IncidentEvent} from "./event.js" */
/**
 * @typedef {object} EventFilters
 * @property {string} [query] Space-separated message and service tokens.
 * @property {string} [severity] Exact severity.
 * @property {string} [service] Exact service.
 * @property {string} [correlationId] Exact correlation identifier.
 * @property {number} [fromEpochMs] Inclusive start time.
 * @property {number} [toEpochMs] Inclusive end time.
 */

const TOKEN_PATTERN = /[\p{L}\p{N}_-]+/gu;

/** Reusable immutable-ish indexes over an ordered event collection. */
export class EventIndex {
  /**
   * Builds O(n × t) indexes where t is the average unique token count per event.
   * @param {readonly IncidentEvent[]} events Chronologically ordered events.
   */
  constructor(events) {
    this.events = [...events];
    /** @type {Map<string, Set<number>>} */
    this.severityIndex = new Map();
    /** @type {Map<string, Set<number>>} */
    this.serviceIndex = new Map();
    /** @type {Map<string, Set<number>>} */
    this.correlationIndex = new Map();
    /** @type {Map<string, Set<number>>} */
    this.tokenIndex = new Map();

    this.events.forEach((event, index) => {
      addToIndex(this.severityIndex, event.severity, index);
      addToIndex(this.serviceIndex, event.service, index);
      addToIndex(this.correlationIndex, event.correlationId, index);
      const searchable = `${event.message} ${event.service} ${event.correlationId}`;
      for (const token of new Set(tokenize(searchable))) {
        addToIndex(this.tokenIndex, token, index);
      }
    });
  }

  /**
   * Intersects indexed filters before applying time bounds to the smallest candidate set.
   * @param {EventFilters} filters Filter contract.
   * @returns {IncidentEvent[]} Matching events in chronological order.
   */
  filter(filters) {
    /** @type {Set<number>[]} */
    const candidateSets = [];
    if (filters.severity) {
      candidateSets.push(this.severityIndex.get(filters.severity) ?? new Set());
    }
    if (filters.service) {
      candidateSets.push(this.serviceIndex.get(filters.service) ?? new Set());
    }
    if (filters.correlationId) {
      candidateSets.push(this.correlationIndex.get(filters.correlationId) ?? new Set());
    }
    for (const token of tokenize(filters.query ?? "")) {
      candidateSets.push(this.tokenIndex.get(token) ?? new Set());
    }

    const candidateIndexes =
      candidateSets.length === 0
        ? this.events.map((_, index) => index)
        : [...intersectSets(candidateSets)].sort((left, right) => left - right);
    const fromEpochMs = filters.fromEpochMs ?? Number.NEGATIVE_INFINITY;
    const toEpochMs = filters.toEpochMs ?? Number.POSITIVE_INFINITY;

    /** @type {IncidentEvent[]} */
    const matches = [];
    for (const index of candidateIndexes) {
      const event = this.events[index];
      if (event && event.epochMs >= fromEpochMs && event.epochMs <= toEpochMs) {
        matches.push(event);
      }
    }
    return matches;
  }

  /**
   * Returns sorted service values for filter-control population.
   * @returns {string[]} Locale-sorted services.
   */
  services() {
    return [...this.serviceIndex.keys()].sort((left, right) => left.localeCompare(right));
  }
}

/**
 * Converts searchable text into normalized, unique-index-friendly terms.
 * @param {string} text Searchable text.
 * @returns {string[]} Lowercase tokens.
 */
export function tokenize(text) {
  return (text.toLocaleLowerCase().match(TOKEN_PATTERN) ?? []).filter((token) => token.length > 0);
}

/**
 * Calculates the count and boundaries required by the accessible chart table.
 * @param {readonly IncidentEvent[]} events Filtered events.
 * @returns {{severity: string, count: number, first: string | null, last: string | null}[]}
 */
export function summarizeSeverities(events) {
  return SEVERITIES.map((severity) => {
    const matches = events.filter((event) => event.severity === severity);
    return {
      severity,
      count: matches.length,
      first: matches[0]?.timestamp ?? null,
      last: matches.at(-1)?.timestamp ?? null,
    };
  });
}

/**
 * Adds an event position to a named inverted-index bucket.
 * @param {Map<string, Set<number>>} index Inverted index.
 * @param {string} key Bucket key.
 * @param {number} position Event position.
 * @returns {void}
 */
function addToIndex(index, key, position) {
  const bucket = index.get(key) ?? new Set();
  bucket.add(position);
  index.set(key, bucket);
}

/**
 * Intersects sets starting with the smallest to minimize membership checks.
 * @param {readonly Set<number>[]} sets Candidate position sets.
 * @returns {Set<number>} Shared positions.
 */
function intersectSets(sets) {
  if (sets.length === 0) {
    return new Set();
  }
  const ordered = [...sets].sort((left, right) => left.size - right.size);
  const first = ordered[0];
  if (!first) {
    return new Set();
  }
  const result = new Set(first);
  for (const candidate of ordered.slice(1)) {
    for (const position of result) {
      if (!candidate.has(position)) {
        result.delete(position);
      }
    }
  }
  return result;
}
