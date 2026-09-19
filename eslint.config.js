/**
 * @file Configures strict JavaScript, JSDoc, browser, worker, Node, and test linting.
 * Functions: none; this module exports declarative ESLint configuration objects.
 * Variables: jsdocRules, browserFiles, workerFiles, nodeFiles, testFiles.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";

const jsdocRules = {
  "jsdoc/check-param-names": "error",
  "jsdoc/check-tag-names": "error",
  "jsdoc/check-types": "error",
  "jsdoc/require-param": "error",
  "jsdoc/require-param-description": "off",
  "jsdoc/require-returns": "off",
};

const browserFiles = ["src/**/*.js"];
const workerFiles = ["src/worker/parser.worker.js", "public/service-worker.js"];
const nodeFiles = ["scripts/**/*.mjs", "*.config.js"];
const testFiles = ["tests/**/*.js"];

export default [
  { ignores: ["dist/**", "coverage/**", "playwright-report/**", "test-results/**"] },
  eslint.configs.recommended,
  {
    files: browserFiles,
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: globals.browser },
    plugins: { jsdoc },
    rules: {
      ...jsdocRules,
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-warning-comments": ["error", { terms: ["fixme"], location: "anywhere" }],
    },
  },
  {
    files: workerFiles,
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker, ...globals.serviceworker },
    },
  },
  {
    files: nodeFiles,
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
  {
    files: testFiles,
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "no-console": "off" },
  },
];
