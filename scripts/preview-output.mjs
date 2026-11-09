/**
 * @file Normalizes terminal formatting before recognizing the owned Vite preview listener.
 * Functions: sanitizePreviewOutput, isOwnedPreviewReady.
 * Variables: output remains bounded and only the configured Local URL establishes readiness.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { stripVTControlCharacters } from "node:util";

/**
 * Remove ANSI formatting without changing the listener address, then retain bounded diagnostics.
 * @param {string} output Captured output from the child this runner started.
 * @returns {string} Terminal-safe bounded startup output.
 */
export function sanitizePreviewOutput(output) {
  return stripVTControlCharacters(output).slice(-2000);
}

/**
 * Require a Local listener announcement for the exact strict-port URL, never a bare log mention.
 * @param {string} output Captured owned preview output, possibly colorized or partial.
 * @param {string} targetUrl Expected loopback URL including its exact port and trailing slash.
 * @returns {boolean} Whether the owned child has announced its listener.
 */
export function isOwnedPreviewReady(output, targetUrl) {
  return sanitizePreviewOutput(output)
    .split(/\r?\n/u)
    .some((line) => /^\s*(?:➜\s*)?Local:\s+(\S+)/u.exec(line)?.[1] === targetUrl);
}
