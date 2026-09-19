/**
 * @file Uses examples and generated data to prove ordering, stability, and non-mutation.
 * Functions: Vitest and fast-check property cases.
 * Variables: itemArbitrary and sample arrays.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { stableMergeSort } from "../../src/core/stable-merge-sort.js";

describe("stableMergeSort", () => {
  it("handles empty and single-value inputs without mutation", () => {
    const single = Object.freeze([4]);
    expect(stableMergeSort([], (left, right) => left - right)).toEqual([]);
    expect(stableMergeSort(single, (left, right) => left - right)).toEqual([4]);
  });

  it("preserves input order among equal keys", () => {
    const input = [
      { key: 2, order: "a" },
      { key: 1, order: "b" },
      { key: 2, order: "c" },
      { key: 1, order: "d" },
    ];
    expect(stableMergeSort(input, (left, right) => left.key - right.key)).toEqual([
      { key: 1, order: "b" },
      { key: 1, order: "d" },
      { key: 2, order: "a" },
      { key: 2, order: "c" },
    ]);
    expect(input[0]?.order).toBe("a");
  });

  it("matches numeric ordering for generated arrays", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 300 }), (values) => {
        expect(stableMergeSort(values, (left, right) => left - right)).toEqual(
          [...values].sort((left, right) => left - right),
        );
      }),
      { numRuns: 150 },
    );
  });
});
