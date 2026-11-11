/**
 * @file Verify immutable bundled app bytes and serve a fixed secure app-scheme inventory, never private profile files.
 * Functions: verifiedAssets returns fixed in-memory buffers; responseFor admits only exact bundled GET/HEAD paths.
 * Variables: CSP, MIME types, bounded metadata and payload hashes are package provenance, not signatures.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { createHash } = require("node:crypto");
const { join, extname } = require("node:path");
const { readRegular, readUtf8 } = require("./files.cjs");
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; worker-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'; form-action 'none'";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

/** Bounded immutable website buffers, with no imported event content or profile path admitted. */
function verifiedAssets(root, ownerRoot) {
  const value = JSON.parse(readUtf8(join(root, "SOURCE.json"), 512 * 1024));
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !==
      "files|owner|product|schema|source|sourceDirty|version" ||
    value.schema !== 1 ||
    value.product !== "offline-incident-timeline-pwa" ||
    value.version !== "1.1.0" ||
    !/^[a-f0-9]{40}$/.test(value.source) ||
    typeof value.sourceDirty !== "boolean" ||
    !value.files ||
    typeof value.files !== "object" ||
    Array.isArray(value.files) ||
    !value.owner ||
    typeof value.owner !== "object" ||
    Array.isArray(value.owner) ||
    Object.keys(value.owner).sort().join("|") !==
      "files.cjs|main.mjs|owner.cjs|preload.cjs|profile.cjs|protocol.cjs"
  )
    throw new Error("Packaged timeline source identity is invalid.");
  const result = new Map();
  let total = 0;
  for (const [entries, base, target] of [
    [value.files, root, result],
    [value.owner, ownerRoot, null],
  ]) {
    const names = Object.keys(entries);
    if (names.length < 3 || names.length > 100)
      throw new Error("Packaged timeline inventory is outside its bounds.");
    for (const name of names) {
      if (
        !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(name) ||
        name.split("/").some((part) => part === "." || part === "..") ||
        !/^[a-f0-9]{64}$/.test(entries[name])
      )
        throw new Error("Invalid packaged source path/hash.");
      const bytes = readRegular(join(base, ...name.split("/")), 16 * 1024 * 1024);
      total += bytes.length;
      if (
        total > 32 * 1024 * 1024 ||
        createHash("sha256").update(bytes).digest("hex") !== entries[name]
      )
        throw new Error("Packaged timeline bytes changed or exceed bounds.");
      if (target) {
        const type = MIME[extname(name)];
        if (!type) throw new Error("Unknown bundled app resource type.");
        target.set("/" + name, { bytes, type });
      }
    }
  }
  for (const name of [
    "/index.html",
    "/assets/app.js",
    "/assets/app.css",
    "/service-worker.js",
    "/fixtures/sample-incidents.json",
  ])
    if (!result.has(name))
      throw new Error("The complete original timeline application is required.");
  return { metadata: value, assets: result };
}

/** No request-derived file access, proxy, redirect or private API is part of this scheme. */
function responseFor(request, assets) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return new Response("Refused", { status: 400 });
  }
  const name = url.pathname === "/" ? "/index.html" : url.pathname;
  const asset = assets.get(name);
  if (
    url.protocol !== "incident:" ||
    url.hostname !== "workbench" ||
    url.port ||
    url.username ||
    url.password ||
    !["GET", "HEAD"].includes(request.method) ||
    !asset
  )
    return new Response("Not found", { status: 404 });
  return new Response(request.method === "HEAD" ? null : asset.bytes, {
    status: 200,
    headers: {
      "content-type": asset.type,
      "content-security-policy": CSP,
      "x-content-type-options": "nosniff",
      "service-worker-allowed": "/",
      "cache-control": "no-cache",
    },
  });
}
module.exports = { verifiedAssets, responseFor };
