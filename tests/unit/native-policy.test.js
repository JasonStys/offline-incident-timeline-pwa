/**
 * @file Exercise actual native/source workflows and independent single-boundary mutation controls.
 * Functions: literal mutation cases prove unsafe changes are rejected before packaging/CI acceptance.
 * Variables: fixed public source files only; no generated artifacts, accounts or private profiles are read.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { describe, it, expect } from "vitest";
import { nativePolicy, readNativeSources } from "../../scripts/native-policy.mjs";

describe("reviewed native workflow contracts", () => {
  it("accepts the actual complete workflow and boundaries", () =>
    expect(() => nativePolicy(readNativeSources())).not.toThrow());
  /** @type {[keyof ReturnType<typeof readNativeSources>, string, string][]} */
  const cases = [
    ["workflow", "contents: read", "contents: write"],
    ["workflow", "npm run test:native-contracts", "echo omitted"],
    ["workflow", ".runtime/native-hosted/proof.json", ".runtime/native-hosted/profile/**"],
    ["workflow", "inputs.upload_package", "true"],
    ["workflow", "retention-days: 1", "retention-days: 30"],
    ["builder", "asar: false", "asar: true"],
    ["main", "sandbox: true", "sandbox: false"],
    ["main", "contextIsolation: true", "contextIsolation: false"],
    ["main", "await owner.finish()", "void owner.finish()"],
    ["ci", "options: --user 1001", "options: --user 0"],
    ["ci", "node scripts/check-browser-host.mjs chromium", "echo unproven"],
    ["ci", "npm --prefix desktop ci --ignore-scripts", "echo missing declared native types"],
    ["codeql", "category: /language:javascript-typescript", "category: /language:replacement"],
    ["codeql", "language: [python, actions]", "language: [python]"],
    ["codeql", "category: /language:${{ matrix.language }}", "category: /language:unrelated"],
  ];
  for (const [field, before, after] of cases)
    it(`rejects ${field}: ${after}`, () => {
      const source = readNativeSources();
      const key = /** @type {keyof typeof source} */ (field);
      expect(source[key]).toContain(before);
      source[key] = source[key].replace(before, after);
      expect(() => nativePolicy(source)).toThrow();
    });
});
