/**
 * @file Configures deterministic unit, property, DOM, and coverage tests.
 * Functions: none; this module exports Vitest configuration.
 * Variables: coverage thresholds, include paths, and test environment settings.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: [
        "src/core/**/*.js",
        "src/io/**/*.js",
        "src/state/**/*.js",
        "src/storage/**/*.js",
        "src/worker/protocol.js",
      ],
      exclude: ["src/io/download.js"],
      thresholds: {
        branches: 88,
        functions: 92,
        lines: 92,
        statements: 92,
      },
    },
    restoreMocks: true,
    testTimeout: 10000,
  },
});
