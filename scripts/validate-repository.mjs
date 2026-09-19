/**
 * @file Enforces documentation, source-header, workflow-pin, unsafe-DOM, fixture, and repository contracts.
 * Functions: collectFiles, requireFiles, validateHeaders, validateActionPins, validateSourceSafety, validateFixture, main.
 * Variables: ROOT, REQUIRED_FILES, SOURCE_EXTENSIONS, EXCLUDED_DIRECTORIES.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRecords } from "../src/core/event.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED_FILES = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "package-lock.json",
  "docs/ARCHITECTURE.md",
  "docs/REQUIREMENTS.md",
  "docs/DATA_CONTRACT.md",
  "docs/TESTING.md",
  "docs/ACCESSIBILITY.md",
  "docs/OFFLINE_OPERATIONS.md",
  "docs/SECURITY.md",
  "docs/COMPLEXITY.md",
  "docs/LIMITATIONS.md",
  "docs/RESEARCH.md",
  "docs/DEPLOYMENT_CHECKLIST.md",
  "docs/CODE_INDEX.md",
  "docs/FILE_CATALOG.md",
  "docs/adr/0001-framework-free-local-first-pwa.md",
  "docs/reports/VALIDATION.md",
  "docs/reports/TEST_SUMMARY.md",
  "docs/reports/PERFORMANCE.md",
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/dependabot.yml",
];
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".yml", ".yaml"]);
const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".runtime",
  ".lighthouseci",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

/**
 * Recursively collects authored files in deterministic order.
 * @param {string} directory Current directory.
 * @returns {Promise<string[]>} Relative file paths.
 */
async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(absolute)));
    } else {
      results.push(path.relative(ROOT, absolute).replaceAll("\\", "/"));
    }
  }
  return results;
}

/** Verifies every contract file exists. */
async function requireFiles() {
  await Promise.all(REQUIRED_FILES.map((file) => access(path.join(ROOT, file))));
}

/**
 * Requires an explanatory file header near the start of authored code and automation files.
 * @param {string[]} files Relative file paths.
 */
async function validateHeaders(files) {
  for (const file of files.filter((candidate) => SOURCE_EXTENSIONS.has(path.extname(candidate)))) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    const header = source.split(/\r?\n/u).slice(0, 12).join("\n");
    if (!/@file|File:/u.test(header)) {
      throw new Error(`${file} is missing a descriptive file header in its first 12 lines.`);
    }
    if ((file.endsWith(".js") || file.endsWith(".mjs")) && !header.includes("Line locations:")) {
      throw new Error(`${file} header must reference exact line locations.`);
    }
  }
}

/**
 * Requires immutable 40-character SHAs for every third-party GitHub Action.
 * @param {string[]} files Relative file paths.
 */
async function validateActionPins(files) {
  for (const file of files.filter((candidate) => candidate.startsWith(".github/workflows/"))) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    for (const line of source.split(/\r?\n/u)) {
      const match = line.match(/\buses:\s*([^\s#]+)/u);
      if (match && !/@[0-9a-f]{40}$/u.test(match[1] ?? "")) {
        throw new Error(`${file} contains an unpinned action: ${match[1]}.`);
      }
    }
  }
}

/**
 * Rejects unsafe dynamic markup and runtime code-generation primitives in application source.
 * @param {string[]} files Relative file paths.
 */
async function validateSourceSafety(files) {
  const applicationFiles = files.filter(
    (file) => (file.startsWith("src/") || file.startsWith("public/")) && file.endsWith(".js"),
  );
  const forbiddenPatterns = [
    { expression: /\.innerHTML\s*=/u, label: "innerHTML assignment" },
    { expression: /\beval\s*\(/u, label: "eval" },
    { expression: /new\s+Function\s*\(/u, label: "Function constructor" },
    { expression: /document\.write\s*\(/u, label: "document.write" },
  ];
  for (const file of applicationFiles) {
    const source = await readFile(path.join(ROOT, file), "utf8");
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.expression.test(source)) {
        throw new Error(`${file} contains forbidden ${forbidden.label}.`);
      }
    }
  }
}

/** Validates the bundled demonstration data with the same production contract. */
async function validateFixture() {
  const source = await readFile(path.join(ROOT, "public/fixtures/sample-incidents.json"), "utf8");
  const records = JSON.parse(source);
  const result = normalizeRecords(records);
  if (result.events.length !== records.length || result.issues.length !== 0) {
    throw new Error("Bundled fixture does not satisfy the event data contract.");
  }
}

/** Runs the complete deterministic repository contract. */
async function main() {
  await requireFiles();
  const files = await collectFiles(ROOT);
  await validateHeaders(files);
  await validateActionPins(files);
  await validateSourceSafety(files);
  await validateFixture();
  console.log(`Repository contract passed for ${files.length} authored files.`);
}

await main();
