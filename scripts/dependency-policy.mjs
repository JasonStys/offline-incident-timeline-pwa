/**
 * @file Validates the exact-version contract shared by Vitest and its coverage provider.
 * Functions: validateVitestPair checks dependency versions without installing code.
 * Variables: testVersion and coverageVersion are authored dependency version strings.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * Rejects missing, ranged, or mismatched versions required by the coverage peer contract.
 * @param {Record<string, string>} dependencies Authored development dependency versions.
 * @returns {void} Returns normally only for a matching, exact stable release pair.
 */
export function validateVitestPair(dependencies) {
  const testVersion = dependencies.vitest;
  const coverageVersion = dependencies["@vitest/coverage-v8"];
  if (!testVersion || !/^\d+\.\d+\.\d+$/u.test(testVersion) || testVersion !== coverageVersion) {
    throw new Error("Vitest and @vitest/coverage-v8 must use the same exact release.");
  }
}
