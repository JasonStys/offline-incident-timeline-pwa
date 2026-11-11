/**
 * @file Use the actual native incident window twice in an explicitly marked synthetic workspace.
 * Functions: launch and finish own exact Electron processes; no normal AppData or generic OS input is used.
 * Variables: SDK-only candidate evidence is distinct from the later compiled archive consumer proof.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { _electron as electron, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const output = path.resolve(process.argv[2] ?? path.join(root, ".runtime/native-sdk-smoke-001"));
if (!output.startsWith(path.join(root, ".runtime") + path.sep))
  throw new Error("Use a new own-project native proof root.");
await fs.mkdir(output);
await fs.writeFile(path.join(output, "acceptance.marker"), "incident-native-synthetic-v1\n", {
  flag: "wx",
});
const profile = path.join(output, "profile");
const packagedExecutable = process.env.INCIDENT_NATIVE_EXECUTABLE;
const resourceRoot = path.resolve(
  process.env.TIMELINE_NATIVE_RESOURCES ?? path.join(root, ".runtime/native-resources-002"),
);
/** @type {Record<string,string>} */
const environment = Object.fromEntries(
  Object.entries({ ...process.env, TIMELINE_NATIVE_RESOURCES: resourceRoot }).filter(
    (entry) => typeof entry[1] === "string",
  ),
);
delete environment.ELECTRON_RUN_AS_NODE;
/** @type {{app: import("@playwright/test").ElectronApplication,page: import("@playwright/test").Page}|undefined} */
let application;
/** @type {(number|null)[]} */
const exits = [];
/** @type {string[]} */
const logs = [];
/** @type {string[]} */
const pageErrors = [];
/** @type {{version:string,runtime:string|undefined,node:string,packaged:boolean}[]} */
const runtimeIdentities = [];
/** Start only the fixed actual native source entry with an explicit synthetic profile. */
async function launch() {
  const app = await electron.launch({
    executablePath:
      packagedExecutable ?? path.join(root, "desktop/node_modules/electron/dist/electron.exe"),
    args: [
      ...(packagedExecutable ? [] : [path.join(root, "desktop/main.mjs")]),
      "--profile",
      profile,
    ],
    env: environment,
    timeout: 45000,
  });
  const page = await app.firstWindow();
  application = { app, page };
  page.on("console", (message) => {
    if (logs.length < 64) logs.push(message.type() + ": " + message.text().slice(0, 2000));
  });
  page.on("pageerror", (error) => {
    if (pageErrors.length < 64) pageErrors.push(String(error).slice(0, 2000));
    if (logs.length < 64) logs.push("pageerror: " + String(error).slice(0, 2000));
  });
  app.process().stderr?.on("data", (bytes) => {
    if (logs.length < 64) logs.push("native: " + String(bytes).slice(0, 2000));
  });
  page.setDefaultTimeout(10000);
  await expect(page.getByRole("heading", { name: "Incident Timeline", exact: true })).toBeVisible();
  await expect(page.locator("#demo-button")).toBeEnabled();
  expect(
    await app.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      return windows.length === 1 && windows[0]?.isVisible();
    }),
  ).toBe(true);
  expect(await app.evaluate(({ app }) => app.isPackaged)).toBe(Boolean(packagedExecutable));
  const identity = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    runtime: process.versions.electron,
    node: process.versions.node,
    packaged: app.isPackaged,
  }));
  expect(identity.version).toBe("1.1.0");
  expect(identity.runtime).toBe("44.11.1");
  runtimeIdentities.push(identity);
  return { app, page };
}

/** @param {import("@playwright/test").ElectronApplication} app Owned app. @param {string|null} file New explicit synthetic destination, or cancel. */
async function chooseExport(app, file) {
  await app.evaluate(({ dialog }, destination) => {
    dialog.showSaveDialog = async () => ({
      canceled: destination === null,
      filePath: destination ?? "",
    });
  }, file);
}
/**
 * Normal application Quit must finish the real parser/database cleanup and process; never kill on timeout.
 * @param {import("@playwright/test").ElectronApplication} app Actual owned process wrapper.
 * @param {boolean} [heldExport] Release an already invoked synthetic save choice only after repeated Quit preserves the real accepted operation.
 */
async function finish(app, heldExport = false) {
  const child = app.process();
  const ended = /** @type {Promise<[number|null, NodeJS.Signals|null]>} */ (once(child, "exit"));
  await app.evaluate(({ app }) => {
    app.quit();
  });
  if (heldExport) {
    await app.evaluate(({ app, BrowserWindow }) => {
      app.quit();
      BrowserWindow.getAllWindows()[0]?.close();
    });
    expect(child.exitCode).toBeNull();
    expect(await fs.readFile(path.join(profile, "owner.lock"), "utf8")).toMatch(/^[a-f0-9]{64}$/);
    if (!application) throw new Error("Owned window was not retained.");
    await expect(application.page.locator("#operation-status")).toContainText(
      "Accepted import/database/export work is finishing",
    );
    await app.evaluate(
      (_electron, destination) => {
        const release = Reflect.get(globalThis, Symbol.for("timeline.synthetic.choice"));
        if (typeof release !== "function") throw new Error("Owned synthetic save choice missing.");
        release({ canceled: false, filePath: destination });
      },
      path.join(output, "exit-pending-evidence.json"),
    );
  }
  /** @type {ReturnType<typeof setTimeout>|undefined} */
  let timer;
  try {
    const result = await Promise.race([
      ended,
      new Promise(
        /** @param {(value: never) => void} _resolve */ (_resolve, reject) => {
          timer = setTimeout(
            () =>
              reject(new Error("Owned native exit still pending; preserve process " + child.pid)),
            30000,
          );
        },
      ),
    ]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeNull();
    exits.push(result[0]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  application = await launch();
  const { app, page } = application;
  const refused = await page.evaluate(async () => {
    const bridge = Reflect.get(window, "timelineDesktop");
    const admission = await bridge.beginOperation("unknown").then(
      () => false,
      () => true,
    );
    const file = await bridge
      .exportText({
        fileName: "arbitrary.exe",
        mimeType: "application/json",
        text: "inert refusal control",
      })
      .then(
        () => false,
        () => true,
      );
    return { admission, file };
  });
  expect(refused).toEqual({ admission: true, file: true });
  await page.locator("#demo-button").click();
  await expect(page.locator("#filter-summary")).toContainText("15 of 15 events");
  await expect(page.locator("#network-status")).toHaveText("Local desktop bundle");
  await page.locator("#severity-select").selectOption("error");
  await expect(page.locator("#filter-summary")).toContainText("3 of 15 events");
  await page.locator("#severity-select").selectOption("");
  await page.locator("#from-input").fill("2026-03-18T14:02:14.002");
  await page.locator("#to-input").fill("2026-03-18T14:02:14.002");
  await expect(page.locator("#filter-summary")).toContainText("2 of 15 events");
  await expect(page.locator("#event-list")).toContainText("14:02:14.002 UTC");
  await page.screenshot({ path: path.join(output, "native-exact-utc-window.png"), fullPage: true });
  await page.locator("#reset-filters").click();
  await page.locator("#prepared-fixture").selectOption("midnight");
  await page.locator("#demo-button").click();
  await expect(page.locator("#filter-summary")).toContainText("4 of 4 events");
  await page
    .locator("#file-input")
    .setInputFiles(path.join(root, "public/fixtures/midnight-recovery.json"));
  await expect(page.locator("#filter-summary")).toContainText("4 of 4 events");
  const invalid = path.join(output, "malformed.json");
  await fs.writeFile(invalid, "{broken", { flag: "wx" });
  await page.locator("#file-input").setInputFiles(invalid);
  await expect(page.locator("#operation-status")).toContainText("Import failed");
  await expect(page.locator("#filter-summary")).toContainText("4 of 4 events");
  await page.locator("#from-input").fill("2026-03-19T00:00:00.002");
  await page.locator("#to-input").fill("2026-03-19T00:00:00.002");
  await expect(page.locator("#filter-summary")).toContainText("2 of 4 events");
  await expect(page.locator("#timeline-chart")).toContainText("2026-03-19 00:00:00.002 UTC");
  const exported = path.join(output, "filtered-evidence.json");
  await chooseExport(app, exported);
  await page.locator("#export-json").click();
  await expect(page.locator("#operation-status")).toContainText("exported to a new local file");
  const records = JSON.parse(await fs.readFile(exported, "utf8"));
  expect(records.schemaVersion).toBe(1);
  expect(records.events.map((/** @type {{id:string}} */ event) => event.id)).toEqual([
    "bridge-error",
    "bridge-formula",
  ]);
  await page.locator("#export-json").click();
  await expect(page.locator("#operation-status")).toContainText("not applied");
  expect(JSON.parse(await fs.readFile(exported, "utf8"))).toEqual(records);
  await chooseExport(app, null);
  await page.locator("#export-csv").click();
  await expect(page.locator("#operation-status")).toContainText("Export canceled");
  await chooseExport(app, path.join(output, "filtered-evidence.csv"));
  await page.locator("#export-csv").click();
  await expect(page.locator("#operation-status")).toContainText("exported to a new local file");
  expect(await fs.readFile(path.join(output, "filtered-evidence.csv"), "utf8")).toContain(
    '"\'=SUM(1,2)"',
  );
  await page.screenshot({
    path: path.join(output, "native-midnight-evidence.png"),
    fullPage: true,
  });
  await page
    .locator("#timeline-chart")
    .screenshot({ path: path.join(output, "native-utc-chart.png") });
  await page
    .locator(".results-layout")
    .screenshot({ path: path.join(output, "native-evidence-details.png") });
  await finish(app);
  application = undefined;
  expect(pageErrors).toEqual([]);
  application = await launch();
  await expect(application.page.locator("#filter-summary")).toContainText("4 of 4 events");
  await expect(application.page.locator("#operation-status")).toContainText(
    "Restored 4 locally saved events",
  );
  await application.page.screenshot({
    path: path.join(output, "native-restored-timeline.png"),
    fullPage: true,
  });
  await application.app.evaluate(({ dialog }) => {
    /** @type {(value:import("electron").SaveDialogReturnValue)=>void} */
    let release = () => {
      throw new Error("Synthetic completion was not initialized.");
    };
    const choice = new Promise((resolve) => {
      release = resolve;
    });
    Reflect.set(globalThis, Symbol.for("timeline.synthetic.choice"), release);
    dialog.showSaveDialog = () => {
      Reflect.set(globalThis, Symbol.for("timeline.synthetic.requested"), true);
      return choice;
    };
  });
  await application.page.locator("#export-json").click();
  await expect
    .poll(() =>
      application?.app.evaluate(() =>
        Reflect.get(globalThis, Symbol.for("timeline.synthetic.requested")),
      ),
    )
    .toBe(true);
  await finish(application.app, true);
  expect(
    JSON.parse(await fs.readFile(path.join(output, "exit-pending-evidence.json"), "utf8")),
  ).toMatchObject({ schemaVersion: 1, events: expect.any(Array) });
  expect(
    JSON.parse(await fs.readFile(path.join(output, "exit-pending-evidence.json"), "utf8")).events,
  ).toHaveLength(4);
  application = undefined;
  expect(pageErrors).toEqual([]);
  await fs.writeFile(
    path.join(output, "proof.json"),
    JSON.stringify(
      {
        schema: 1,
        passed: true,
        scope: packagedExecutable
          ? "Actual relocated packaged Windows executable; original Worker/IndexedDB/UTC filtering and real file exports. No installation or normal profile use."
          : "Actual Electron SDK/source window and original Worker/IndexedDB/UTC filter core. Not a packaged/installed release.",
        packaged: Boolean(packagedExecutable),
        ownedWindowVisibleAtReady: true,
        runtimeIdentities,
        pageErrors,
        closedBridgeRefusals: refused,
        exitCodes: exits,
        events: 15,
        exactWindowEvents: 2,
        severityErrors: 3,
        restoredCustomEvents: 4,
        preparedMidnightWorkflow: true,
        exactCustomWindowEvents: 2,
        malformedImportPreserved: true,
        jsonExactIds: true,
        csvFormulaNeutralized: true,
        noOverwriteAndCancel: true,
        pendingActualExportRetainedThroughRepeatedQuit: true,
        normalUserProfileOpened: false,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
} catch (error) {
  /** @type {Record<string,unknown>} */
  const diagnostic = {
    schema: 1,
    passed: false,
    error: String(error),
    scope: `${packagedExecutable ? "Synthetic packaged executable" : "Synthetic source-SDK"} native candidate; a failed journey has no accepted exit proof. The harness issues no kill command.`,
  };
  diagnostic.logs = logs;
  if (application) {
    diagnostic.pid = application.app.process().pid;
    diagnostic.title = await application.page.title().catch(() => "unavailable");
    diagnostic.body = await application.page
      .locator("body")
      .innerText()
      .catch(() => "unavailable");
    diagnostic.workers = await application.page
      .evaluate(async () => ({
        state: document.readyState,
        registrations: await navigator.serviceWorker.getRegistrations().then((values) =>
          values.map((r) => ({
            scope: r.scope,
            active: r.active?.state,
            installing: r.installing?.state,
            waiting: r.waiting?.state,
          })),
        ),
        controller: navigator.serviceWorker.controller?.state,
      }))
      .catch(() => "unavailable");
  }
  await fs.writeFile(
    path.join(output, "failure.json"),
    JSON.stringify(diagnostic, null, 2) + "\n",
    { flag: "wx" },
  );
  throw error;
}
