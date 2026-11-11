/**
 * @file Launch the actual original offline PWA on a stable private app origin with durable IndexedDB and retained real operation ownership.
 * Functions: sender, closeOwned and native IPC handlers own one window/profile; no data service or arbitrary filesystem API is exposed.
 * Variables: private profile, immutable resources, acknowledged work and final teardown proof are per-process state.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { app, BrowserWindow, Menu, dialog, ipcMain, protocol, session } from "electron";
import { randomBytes } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { openProfile } = require("./profile.cjs");
const { newFile } = require("./files.cjs");
const { createOwner } = require("./owner.cjs");
const { verifiedAssets, responseFor } = require("./protocol.cjs");
const VERSION = "1.1.0",
  URL_ROOT = "incident://workbench/";
const sourceRoot = dirname(fileURLToPath(import.meta.url));
const resourceRoot = app.isPackaged
  ? join(process.resourcesPath, "timeline")
  : resolve(
      process.env.TIMELINE_NATIVE_RESOURCES ?? join(sourceRoot, "../.runtime/native-resources"),
    );
const profileFlag = process.argv.indexOf("--profile");
const profilePath =
  profileFlag < 0
    ? join(
        process.env.LOCALAPPDATA ?? app.getPath("appData"),
        "JasonStysPortfolio",
        "offline-incident-timeline-pwa",
        "workspace",
      )
    : process.argv[profileFlag + 1];
const owner = createOwner();
let profile,
  window,
  startup,
  closing,
  exiting = false,
  shutdown;
app.setName("Offline Incident Timeline");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "incident",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
app.commandLine.appendSwitch("disable-background-networking");

/** Bind every call to the sole immutable app main frame; URL filter values confer no privileges. */
function sender(event, allowClosing = false) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    (!allowClosing && (owner.closing || closing))
  )
    throw new Error("The active incident workspace is required.");
  const url = new URL(event.senderFrame.url);
  if (
    url.protocol !== "incident:" ||
    url.hostname !== "workbench" ||
    url.port ||
    url.username ||
    url.password ||
    !["/", "/index.html"].includes(url.pathname)
  )
    throw new Error("The active incident workspace is required.");
}

/** Close only after every acknowledged parser/database/file operation and the actual renderer teardown completes. */
function closeOwned() {
  if (!closing)
    closing = (async () => {
      try {
        if (window && !window.isDestroyed()) {
          window.setTitle("Incident Timeline — finishing accepted local work");
          window.webContents.send("timeline:quit-waiting");
        }
        await startup;
        await owner.finish();
        if (window && !window.isDestroyed()) {
          const token = randomBytes(32).toString("hex");
          const ready = new Promise((resolve, reject) => {
            shutdown = { token, resolve, reject };
          });
          window.webContents.send("timeline:shutdown", token);
          await ready;
        }
        session.defaultSession.flushStorageData();
        profile?.close();
        exiting = true;
        app.quit();
      } catch {
        process.exitCode = 1;
        dialog.showErrorBox(
          "Incident workspace needs review",
          "The owned operation or teardown did not complete normally. Existing event data and ownership evidence were not reset. Preserve this workspace for review.",
        );
        // No force-kill, lock adoption, profile clearing or guessed successful teardown.
        if (!owner.busy) {
          exiting = true;
          app.quit();
        }
      }
    })();
  return closing;
}
app.on("before-quit", (event) => {
  if (!exiting) {
    event.preventDefault();
    void closeOwned();
  }
});
app.on("window-all-closed", () => {
  if (!exiting) void closeOwned();
});

try {
  if (typeof profilePath !== "string")
    throw new Error("Choose an explicit absolute profile or launch normally.");
  profile = openProfile(profilePath, [
    dirname(process.execPath),
    process.resourcesPath,
    app.getAppPath(),
  ]);
  app.setPath("userData", profile.browser);
  if (!app.requestSingleInstanceLock())
    throw new Error("This native workspace already has an application owner.");
  startup = app.whenReady().then(async () => {
    const verified = verifiedAssets(resourceRoot, sourceRoot);
    protocol.handle("incident", (request) => responseFor(request, verified.assets));
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
      callback(false),
    );
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const own =
        details.url.startsWith(URL_ROOT) ||
        details.url.startsWith("blob:" + URL_ROOT) ||
        details.url === "about:blank";
      callback({ cancel: !own });
    });
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 880,
      minHeight: 680,
      show: false,
      title: `Incident Timeline | Jason Stys | ${VERSION}`,
      webPreferences: {
        preload: join(sourceRoot, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        devTools: false,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith(URL_ROOT)) event.preventDefault();
    });
    session.defaultSession.on("will-download", (event) => event.preventDefault());
    window.on("close", (event) => {
      if (!exiting) {
        event.preventDefault();
        void closeOwned();
      }
    });
    ipcMain.handle("timeline:begin", (event, kind) => {
      sender(event, kind === "startup");
      return owner.begin(kind);
    });
    let readyResolve, readyReject;
    const renderedReady = new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });
    const readyTimer = setTimeout(
      () => readyReject(new Error("Actual timeline startup did not complete.")),
      30000,
    );
    ipcMain.handle("timeline:ready", (event, success) => {
      sender(event, true);
      if (typeof success !== "boolean") throw new Error("Invalid timeline readiness.");
      clearTimeout(readyTimer);
      if (success) readyResolve();
      else readyReject(new Error("Actual timeline startup failed."));
    });
    ipcMain.handle("timeline:end", (event, token) => {
      sender(event, true);
      owner.end(token);
    });
    ipcMain.handle("timeline:closed", (event, token) => {
      sender(event, true);
      if (!shutdown || token !== shutdown.token) {
        shutdown?.reject(new Error("Renderer teardown was refused."));
        throw new Error("Invalid teardown completion.");
      }
      shutdown.resolve();
      shutdown = undefined;
    });
    ipcMain.handle("timeline:quit", (event) => {
      sender(event);
      void closeOwned();
    });
    ipcMain.handle("timeline:export", (event, value) => {
      sender(event);
      if (
        !value ||
        Object.keys(value).sort().join("|") !== "fileName|mimeType|text" ||
        typeof value.text !== "string" ||
        Buffer.byteLength(value.text, "utf8") > 64 * 1024 * 1024 ||
        !["incident-timeline.json", "incident-timeline.csv"].includes(value.fileName) ||
        !["application/json", "text/csv"].includes(value.mimeType)
      )
        throw new Error("Invalid bounded timeline export.");
      const content = value.text;
      return owner.track(async () => {
        const choice = await dialog.showSaveDialog(window, {
          defaultPath: value.fileName,
          buttonLabel: "Save new evidence file",
          properties: ["createDirectory", "showOverwriteConfirmation"],
        });
        if (choice.canceled || !choice.filePath) return { cancelled: true };
        newFile(choice.filePath, content);
        return { cancelled: false };
      });
    });
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "Timeline",
          submenu: [
            {
              label: "About and privacy",
              click: () => {
                void dialog.showMessageBox(window, {
                  type: "info",
                  title: "Offline Incident Timeline",
                  message: "Made by Jason Stys | github.com/JasonStys",
                  detail:
                    "Actual local worker parsing, IndexedDB, inclusive UTC filters, accessible timeline and original JSON/CSV exports. No uploads, tracking, real incident feed or multiuser accounts. Keep approved evidence private. A native window closes only after acknowledged local work and database/worker teardown. Browser PWA data remains a separate origin; import/export explicitly to move data.",
                });
              },
            },
            {
              label: "Exit application",
              click: () => {
                void closeOwned();
              },
            },
          ],
        },
        { role: "editMenu" },
      ]),
    );
    try {
      await Promise.all([window.loadURL(URL_ROOT).then(() => window.show()), renderedReady]);
    } finally {
      clearTimeout(readyTimer);
    }
  });
  startup.catch(() => {
    process.exitCode = 1;
    if (closing) return;
    dialog.showErrorBox(
      "Incident Timeline could not start",
      "The complete application/profile could not be admitted. Existing data was preserved. Review the selected workspace and complete package; no automatic reset occurred.",
    );
    if (owner.busy) {
      if (window && !window.isDestroyed())
        window.setTitle("Incident Timeline — startup work needs review; profile retained");
    } else {
      exiting = true;
      profile?.close();
      app.quit();
    }
  });
} catch {
  process.exitCode = 1;
  app.whenReady().then(() => {
    dialog.showErrorBox(
      "Incident Timeline could not open",
      "Existing workspace data was preserved. Use an empty identified local workspace outside the application. An interrupted-owner lock is not removed automatically.",
    );
    exiting = true;
    profile?.close();
    app.quit();
  });
}
