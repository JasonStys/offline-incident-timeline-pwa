/**
 * @file Expose only acknowledged lifetime, explicit new-file exports and normal Quit for the actual timeline app.
 * Functions: frozen timelineDesktop bridge; caller frame and closed schemas are checked by the native owner.
 * Variables: no raw IPC, Node, filesystem paths, account data or arbitrary code crosses this boundary.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "timelineDesktop",
  Object.freeze({
    beginOperation: (kind) => ipcRenderer.invoke("timeline:begin", kind),
    endOperation: (token) => ipcRenderer.invoke("timeline:end", token),
    ready: (success) => ipcRenderer.invoke("timeline:ready", success),
    exportText: (request) => ipcRenderer.invoke("timeline:export", request),
    quit: () => ipcRenderer.invoke("timeline:quit"),
    onShutdown: (handler) => {
      const listener = (_event, token) => {
        if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return;
        try {
          handler();
          void ipcRenderer.invoke("timeline:closed", token);
        } catch {
          void ipcRenderer.invoke("timeline:closed", "refused");
        }
      };
      ipcRenderer.on("timeline:shutdown", listener);
      return () => ipcRenderer.removeListener("timeline:shutdown", listener);
    },
    onQuitWaiting: (handler) => {
      const listener = () => handler();
      ipcRenderer.on("timeline:quit-waiting", listener);
      return () => ipcRenderer.removeListener("timeline:quit-waiting", listener);
    },
  }),
);
