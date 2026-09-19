/**
 * @file Runs current Lighthouse twice against the production preview and enforces conservative budgets.
 * Functions: waitForServer, launchPreview, isWindowsCleanupError, stopChrome, runAudit, summarize, enforceBudgets, main.
 * Variables: ROOT, OUTPUT_DIRECTORY, TARGET_URL, RUN_COUNT, CATEGORY_BUDGETS, AUDIT_BUDGETS.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIRECTORY = path.join(ROOT, ".runtime", "lighthouse");
const TARGET_URL = "http://127.0.0.1:4174/";
const RUN_COUNT = 2;
const CATEGORY_BUDGETS = {
  accessibility: 1,
  "best-practices": 0.95,
  performance: 0.9,
  seo: 0.9,
};
const AUDIT_BUDGETS = {
  "first-contentful-paint": 1_800,
  "largest-contentful-paint": 2_500,
  "total-blocking-time": 250,
};

/**
 * Waits for the preview process to accept HTTP requests.
 * @param {number} attempts Maximum requests.
 * @returns {Promise<void>}
 */
async function waitForServer(attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(TARGET_URL);
      if (response.ok) return;
    } catch {
      // The preview process may still be binding its socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Production preview did not become ready.");
}

/**
 * Starts Vite preview without invoking a command shell.
 * @returns {import("node:child_process").ChildProcess} Preview child process.
 */
function launchPreview() {
  const viteExecutable = path.join(ROOT, "node_modules", "vite", "bin", "vite.js");
  return spawn(
    process.execPath,
    [viteExecutable, "preview", "--host", "127.0.0.1", "--port", "4174"],
    {
      cwd: ROOT,
      stdio: "ignore",
      windowsHide: true,
    },
  );
}

/**
 * Identifies Windows file-lock errors that may briefly outlive a terminated Chromium process.
 * @param {unknown} error Candidate cleanup error.
 * @returns {boolean} Whether cleanup can safely be deferred.
 */
function isWindowsCleanupError(error) {
  const errorCode = /** @type {NodeJS.ErrnoException} */ (error)?.code;
  return process.platform === "win32" && (errorCode === "EPERM" || errorCode === "EBUSY");
}

/**
 * Stops the audit browser while tolerating only the known deferred Windows profile cleanup.
 * @param {Awaited<ReturnType<typeof launch>>} chrome Running Chrome launcher instance.
 * @returns {Promise<void>}
 */
async function stopChrome(chrome) {
  try {
    await chrome.kill();
  } catch (error) {
    if (!isWindowsCleanupError(error)) throw error;
    console.warn("Chromium stopped, but Windows deferred removal of its temporary profile.");
  }
}

/**
 * Runs Lighthouse using a Playwright-managed Chromium binary.
 * @param {number} runNumber One-based run number.
 * @returns {Promise<import("lighthouse").RunnerResult["lhr"]>} Lighthouse result.
 */
async function runAudit(runNumber) {
  const chrome = await launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const result = await lighthouse(TARGET_URL, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: Object.keys(CATEGORY_BUDGETS),
      formFactor: "desktop",
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
    });
    if (!result) throw new Error(`Lighthouse run ${runNumber} returned no result.`);
    await writeFile(path.join(OUTPUT_DIRECTORY, `run-${runNumber}.json`), result.report, "utf8");
    return result.lhr;
  } finally {
    await stopChrome(chrome);
  }
}

/**
 * Selects the worst category score and slowest audit value across runs.
 * @param {import("lighthouse").Result[]} results Lighthouse results.
 * @returns {{categories: Record<string, number>, audits: Record<string, number>}} Summary.
 */
function summarize(results) {
  const categories = Object.fromEntries(
    Object.keys(CATEGORY_BUDGETS).map((name) => [
      name,
      Math.min(...results.map((result) => result.categories[name]?.score ?? 0)),
    ]),
  );
  const audits = Object.fromEntries(
    Object.keys(AUDIT_BUDGETS).map((name) => [
      name,
      Math.max(
        ...results.map((result) => result.audits[name]?.numericValue ?? Number.POSITIVE_INFINITY),
      ),
    ]),
  );
  return { categories, audits };
}

/**
 * Throws when any category score or timing exceeds its declared budget.
 * @param {{categories: Record<string, number>, audits: Record<string, number>}} summary Audit summary.
 * @returns {void}
 */
function enforceBudgets(summary) {
  const failures = [];
  for (const [name, minimum] of Object.entries(CATEGORY_BUDGETS)) {
    if ((summary.categories[name] ?? 0) < minimum) failures.push(`${name} score`);
  }
  for (const [name, maximum] of Object.entries(AUDIT_BUDGETS)) {
    if ((summary.audits[name] ?? Number.POSITIVE_INFINITY) > maximum) failures.push(name);
  }
  if (failures.length > 0) {
    throw new Error(`Lighthouse budgets failed: ${failures.join(", ")}.`);
  }
}

/** Builds, serves, audits, records evidence, and stops all child processes. */
async function main() {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const preview = launchPreview();
  try {
    await waitForServer();
    const results = [];
    for (let runNumber = 1; runNumber <= RUN_COUNT; runNumber += 1) {
      results.push(await runAudit(runNumber));
    }
    const summary = summarize(results);
    await writeFile(
      path.join(OUTPUT_DIRECTORY, "summary.json"),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), ...summary }, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(summary, null, 2));
    enforceBudgets(summary);
  } finally {
    preview.kill();
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  // Windows can retain browser bookkeeping handles after taskkill; all audits and cleanup are complete here.
  if (process.platform === "win32") process.exit(process.exitCode ?? 0);
}
