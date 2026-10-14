/**
 * @file Prevents mismatched Vitest/coverage proposals from silently changing the toolchain contract.
 * Functions: Vitest cases exercise accepted, mismatched, missing, and ranged dependency versions.
 * Variables: version pairs are synthetic authored-manifest fixtures, not installed packages.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { validateVitestPair } from "../../scripts/dependency-policy.mjs";

describe("Vitest peer-version policy", () => {
  it("accepts a matching exact release", () => {
    expect(() =>
      validateVitestPair({ vitest: "5.0.3", "@vitest/coverage-v8": "5.0.3" }),
    ).not.toThrow();
  });
  it("rejects a one-sided upgrade", () => {
    expect(() => validateVitestPair({ vitest: "5.0.3", "@vitest/coverage-v8": "5.0.1" })).toThrow(
      /same exact release/u,
    );
  });
  it("rejects missing dependencies", () => {
    expect(() => validateVitestPair({})).toThrow(/same exact release/u);
    expect(() => validateVitestPair({ vitest: "5.0.3" })).toThrow(/same exact release/u);
  });
  it("rejects matching ranges rather than weakening locked installation", () => {
    expect(() => validateVitestPair({ vitest: "^5.0.3", "@vitest/coverage-v8": "^5.0.3" })).toThrow(
      /same exact release/u,
    );
  });
});
