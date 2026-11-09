/**
 * @file Reproduces colorized CI listener output without weakening strict-port ownership checks.
 * Functions: Vitest readiness/parser cases.
 * Variables: actual forced-color Vite output splits host and bold port with ANSI sequences.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { describe, expect, it } from "vitest";
import { isOwnedPreviewReady, sanitizePreviewOutput } from "../../scripts/preview-output.mjs";

const url = "http://127.0.0.1:49198/";
const colorized =
  "  \u001b[32m➜\u001b[39m  \u001b[1mLocal\u001b[22m:   \u001b[36mhttp://127.0.0.1:\u001b[1m49198\u001b[22m/\u001b[39m\n";

describe("owned preview readiness", () => {
  it("accepts exact plain, colorized and CRLF listener announcements", () => {
    expect(colorized.includes(url)).toBe(false); // The real CI regression.
    expect(isOwnedPreviewReady(colorized, url)).toBe(true);
    expect(isOwnedPreviewReady(`  ➜  Local:   ${url}\r\n`, url)).toBe(true);
    expect(isOwnedPreviewReady(`Local: ${url}`, url)).toBe(true);
    expect(sanitizePreviewOutput(colorized)).toBe(`  ➜  Local:   ${url}\n`);
  });

  it("does not recognize another address, another port, or an unrelated log mention", () => {
    expect(isOwnedPreviewReady(colorized, "http://127.0.0.1:49199/")).toBe(false);
    expect(isOwnedPreviewReady(`Build warning mentions ${url}`, url)).toBe(false);
    expect(isOwnedPreviewReady(`Network: ${url}`, url)).toBe(false);
    expect(isOwnedPreviewReady("Local: http://localhost:49198/", url)).toBe(false);
    expect(isOwnedPreviewReady("Local: http://127.0.0.1:491980/", url)).toBe(false);
    expect(isOwnedPreviewReady(`Local: http://127.0.0.1:49199/ (previous ${url})`, url)).toBe(
      false,
    );
  });

  it("handles an ANSI sequence split across stdout chunks and bounds diagnostic retention", () => {
    const boundary = colorized.indexOf("49198");
    expect(isOwnedPreviewReady(colorized.slice(0, boundary), url)).toBe(false);
    expect(isOwnedPreviewReady(colorized.slice(0, boundary) + colorized.slice(boundary), url)).toBe(
      true,
    );
    expect(sanitizePreviewOutput("x".repeat(5000)).length).toBe(2000);
    expect(isOwnedPreviewReady("x".repeat(5000) + "\n" + colorized, url)).toBe(true);
  });
});
