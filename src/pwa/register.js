/**
 * @file Registers the production Service Worker and reports lifecycle changes without forcing reloads.
 * Functions: registerServiceWorker.
 * Variables: workerUrl, registration, installingWorker.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * Registers the scoped worker in production and reports explicit cache/update status.
 * @param {(message: string, state: "good" | "warning") => void} onStatus Status observer.
 * @returns {Promise<ServiceWorkerRegistration | null>} Registration when supported.
 */
export async function registerServiceWorker(onStatus) {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    onStatus("Online development mode", "good");
    return null;
  }
  try {
    const workerUrl = new URL("service-worker.js", document.baseURI);
    const registration = await navigator.serviceWorker.register(workerUrl, { scope: "./" });
    await navigator.serviceWorker.ready;
    onStatus(navigator.onLine ? "Offline cache ready" : "Offline cache active", "good");

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
          onStatus("Update ready after reload", "warning");
        }
      });
    });
    return registration;
  } catch {
    onStatus("Offline cache unavailable", "warning");
    return null;
  }
}
