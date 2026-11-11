/**
 * @file Preserve the original browser workflow while acknowledging actual native operations before any mutation.
 * Functions: desktopBridge and withDesktopOperation; ordinary PWA callers need no native bridge.
 * Variables: optional fixed timelineDesktop API; no path or arbitrary IPC is exposed to imported data.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * @typedef {object} TimelineDesktop
 * @property {(kind: string) => Promise<string>} beginOperation
 * @property {(token: string) => Promise<void>} endOperation
 * @property {(success: boolean) => Promise<void>} ready
 * @property {(request: {fileName: string, text: string, mimeType: string}) => Promise<{cancelled: boolean}>} exportText
 * @property {() => Promise<void>} quit
 * @property {(handler: () => void) => () => void} onShutdown
 * @property {(handler: () => void) => () => void} onQuitWaiting
 */

/**
 * Returns the optional tightly scoped bridge without changing ordinary browser behavior.
 * @returns {TimelineDesktop | undefined} Native API only when the owned preload provides it.
 */
export function desktopBridge() {
  return /** @type {Window & {timelineDesktop?: TimelineDesktop}} */ (window).timelineDesktop;
}

/**
 * The native owner acknowledges admission before parsing/database writes; completion follows the real awaited work even on failure.
 * @template T
 * @param {"startup" | "import" | "fixture" | "clear"} kind Actual operation kind.
 * @param {() => Promise<T>} work Original unchanged operation.
 * @returns {Promise<T>} Real result or original error.
 */
export async function withDesktopOperation(kind, work) {
  const bridge = desktopBridge();
  if (!bridge) return work();
  const token = await bridge.beginOperation(kind);
  try {
    return await work();
  } finally {
    await bridge.endOperation(token);
  }
}
