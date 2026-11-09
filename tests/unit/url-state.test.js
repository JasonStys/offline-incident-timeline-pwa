/**
 * @file Verifies URL allowlisting, bounded values, encoding, and history replacement semantics.
 * Functions: Vitest URL-state cases.
 * Variables: fake history and location objects.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it, vi } from "vitest";
import { readUrlFilters, writeUrlFilters } from "../../src/state/url-state.js";

describe("URL filter state", () => {
  it("reads only allowlisted bounded fields", () => {
    const filters = readUrlFilters({
      search: `?q=${"x".repeat(200)}&severity=error&service=api&correlation=chain-1&events=secret`,
    });
    expect(filters).toEqual({
      query: "x".repeat(128),
      severity: "error",
      service: "api",
      correlationId: "chain-1",
      from: "",
      to: "",
    });
  });

  it("replaces state, removes stale filters, and omits empty values", () => {
    const replaceState = vi.fn();
    const url = writeUrlFilters(
      { query: " timeout ", severity: "", service: "api", correlationId: "" },
      { replaceState },
      { href: "https://example.test/app?severity=old&unknown=kept" },
    );
    expect(url.searchParams.get("q")).toBe("timeout");
    expect(url.searchParams.get("service")).toBe("api");
    expect(url.searchParams.has("severity")).toBe(false);
    expect(url.searchParams.get("unknown")).toBe("kept");
    expect(replaceState).toHaveBeenCalledWith(null, "", url);
  });

  it("round-trips bounded UTC windows and removes both stale bounds on reset", () => {
    const replaceState = vi.fn();
    const from = "2026-03-18T14:02:14.002";
    const to = "2026-03-18T14:03";
    const url = writeUrlFilters({ from, to }, { replaceState }, { href: "https://example.test/" });
    expect(readUrlFilters(url)).toMatchObject({ from, to });
    const reset = writeUrlFilters({}, { replaceState }, { href: url.href });
    expect(reset.searchParams.has("from")).toBe(false);
    expect(reset.searchParams.has("to")).toBe(false);
  });
});
