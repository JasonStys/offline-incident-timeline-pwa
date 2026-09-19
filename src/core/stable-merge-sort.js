/**
 * @file Implements a non-mutating, stable, bottom-up merge sort for deterministic event ordering.
 * Functions: stableMergeSort, mergeRuns.
 * Variables: source, target, width, left, middle, right.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * Sorts values without mutation and preserves input order when the comparator returns zero.
 * @template T
 * @param {readonly T[]} items Values to sort.
 * @param {(left: T, right: T) => number} compare Ordering function.
 * @returns {T[]} Stable sorted copy.
 */
export function stableMergeSort(items, compare) {
  if (items.length < 2) {
    return [...items];
  }

  let source = [...items];
  let target = new Array(items.length);

  // Bottom-up runs avoid recursion depth and maintain O(n) auxiliary memory.
  for (let width = 1; width < items.length; width *= 2) {
    for (let left = 0; left < items.length; left += width * 2) {
      const middle = Math.min(left + width, items.length);
      const right = Math.min(left + width * 2, items.length);
      mergeRuns(source, target, left, middle, right, compare);
    }
    [source, target] = [target, source];
  }

  return source;
}

/**
 * Merges adjacent sorted ranges, preferring the left item when keys are equal.
 * @template T
 * @param {readonly T[]} source Source array.
 * @param {T[]} target Destination array.
 * @param {number} left Inclusive first index.
 * @param {number} middle Exclusive end of the first range.
 * @param {number} right Exclusive end of the second range.
 * @param {(left: T, right: T) => number} compare Ordering function.
 * @returns {void}
 */
function mergeRuns(source, target, left, middle, right, compare) {
  let leftIndex = left;
  let rightIndex = middle;

  for (let outputIndex = left; outputIndex < right; outputIndex += 1) {
    const leftValue = /** @type {T} */ (source[leftIndex]);
    const rightValue = /** @type {T} */ (source[rightIndex]);
    if (leftIndex < middle && (rightIndex >= right || compare(leftValue, rightValue) <= 0)) {
      target[outputIndex] = leftValue;
      leftIndex += 1;
    } else {
      target[outputIndex] = rightValue;
      rightIndex += 1;
    }
  }
}
