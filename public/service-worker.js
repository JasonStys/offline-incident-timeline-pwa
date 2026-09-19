/**
 * @file Provides versioned app-shell caching, navigation fallback, and bounded runtime caching.
 * Functions: scopedUrl, cacheShell, pruneCaches, navigationResponse, assetResponse.
 * Variables: CACHE_PREFIX, CACHE_VERSION, SHELL_CACHE, RUNTIME_CACHE, APP_SHELL, MAX_RUNTIME_ENTRIES.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
"use strict";

const CACHE_PREFIX = "incident-timeline";
const CACHE_VERSION = "v1";
const SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const MAX_RUNTIME_ENTRIES = 40;
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/app.js",
  "./assets/app.css",
  "./manifest.webmanifest",
  "./icons/timeline.svg",
  "./fixtures/sample-incidents.json",
];

/**
 * Resolves a repository-relative resource against the worker's deployment scope.
 * @param {string} path Resource path from APP_SHELL.
 * @returns {string} Absolute scoped URL.
 */
function scopedUrl(path) {
  return new URL(path, self.registration.scope).href;
}

/**
 * Adds the deterministic application shell atomically during installation.
 * @returns {Promise<void>}
 */
async function cacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(APP_SHELL.map(scopedUrl));
}

/**
 * Removes cache namespaces from previous application versions.
 * @returns {Promise<void>}
 */
async function pruneCaches() {
  const expected = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX) && !expected.has(name))
      .map((name) => caches.delete(name)),
  );
}

/**
 * Uses network-first navigation with the cached shell as a deterministic fallback.
 * @param {Request} request Browser navigation request.
 * @returns {Promise<Response>}
 */
async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request)) ??
      (await caches.match(scopedUrl("./index.html"))) ??
      Response.error()
    );
  }
}

/**
 * Serves same-origin static assets cache-first and retains a bounded runtime cache.
 * @param {Request} request Static asset request.
 * @returns {Promise<Response>}
 */
async function assetResponse(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (!response.ok || new URL(request.url).origin !== self.location.origin) {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > MAX_RUNTIME_ENTRIES) {
    await cache.delete(keys[0]);
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(pruneCaches().then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.origin !== self.location.origin) {
    return;
  }
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(assetResponse(request));
  }
});
