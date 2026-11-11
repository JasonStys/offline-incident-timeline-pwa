/**
 * @file Prove closed package identities, actual content hashes and an immutable exact-origin response allowlist.
 * Functions: real tiny package fixtures exercise successful responses and independent corrupted-package controls.
 * Variables: known public resource bytes only; no profile bytes or proxy/network requests are involved.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { verifiedAssets, responseFor } = require("../protocol.cjs");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "incident-package-contract-"));
  t.after(() => {
    assert.ok(path.basename(root).startsWith("incident-package-contract-"));
    fs.rmSync(root, { recursive: true });
  });
  const site = path.join(root, "site"),
    owner = path.join(root, "owner");
  fs.mkdirSync(site);
  fs.mkdirSync(owner);
  const metadata = {
    schema: 1,
    product: "offline-incident-timeline-pwa",
    version: "1.1.0",
    source: "a".repeat(40),
    sourceDirty: false,
    files: {},
    owner: {},
  };
  for (const [map, directory, names] of [
    [
      metadata.files,
      site,
      [
        "index.html",
        "assets/app.js",
        "assets/app.css",
        "service-worker.js",
        "fixtures/sample-incidents.json",
      ],
    ],
    [
      metadata.owner,
      owner,
      ["main.mjs", "files.cjs", "profile.cjs", "owner.cjs", "protocol.cjs", "preload.cjs"],
    ],
  ]) {
    for (const name of names) {
      const file = path.join(directory, name),
        bytes = Buffer.from("public fixed resource " + name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, bytes);
      map[name] = createHash("sha256").update(bytes).digest("hex");
    }
  }
  const save = () => fs.writeFileSync(path.join(site, "SOURCE.json"), JSON.stringify(metadata));
  save();
  return { site, owner, metadata, save };
}

test("only immutable actual package buffers are served with CSP and correct HEAD semantics", async (t) => {
  const { site, owner } = fixture(t),
    verified = verifiedAssets(site, owner);
  const actual = await responseFor(new Request("incident://workbench/"), verified.assets).text();
  assert.equal(actual, "public fixed resource index.html");
  fs.writeFileSync(path.join(site, "index.html"), "changed after verification");
  assert.equal(
    await responseFor(new Request("incident://workbench/"), verified.assets).text(),
    actual,
  );
  const head = responseFor(
    new Request("incident://workbench/assets/app.js", { method: "HEAD" }),
    verified.assets,
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.match(head.headers.get("content-security-policy"), /object-src 'none'/);
  assert.match(head.headers.get("content-type"), /javascript/);
});

test("foreign origins, private paths, encoded traversal and mutation methods cannot read files", async (t) => {
  const { site, owner } = fixture(t),
    { assets } = verifiedAssets(site, owner);
  for (const url of [
    "https://workbench/",
    "incident://other/",
    "incident://workbench:123/",
    "incident://workbench/owner.json",
    "incident://workbench/%2e%2e%2fowner.json",
    "incident://workbench/SOURCE.json",
  ])
    assert.equal(responseFor(new Request(url), assets).status, 404, url);
  assert.equal(
    responseFor({ url: "incident://user:password@workbench/", method: "GET" }, assets).status,
    404,
  );
  assert.equal(
    responseFor(new Request("incident://workbench/", { method: "POST" }), assets).status,
    404,
  );
});

test("wrong source/version/shape and incomplete privileged-owner inventories are refused", async (t) => {
  for (const mutation of [
    (m) => (m.source = "not-a-sha"),
    (m) => (m.version = "1.0.0"),
    (m) => (m.sourceDirty = 0),
    (m) => (m.extra = true),
    (m) => (m.files = []),
    (m) => (m.owner = []),
    (m) => delete m.owner["main.mjs"],
    (m) => (m.owner["extra.cjs"] = "a".repeat(64)),
  ]) {
    const state = fixture(t);
    mutation(state.metadata);
    state.save();
    assert.throws(() => verifiedAssets(state.site, state.owner));
  }
});

test("changed payload/owner bytes, traversal paths, unsupported types and absent core app fail closed", async (t) => {
  for (const kind of ["payload", "owner", "traversal", "type", "missing"]) {
    const state = fixture(t);
    if (kind === "payload") fs.writeFileSync(path.join(state.site, "assets/app.js"), "tampered");
    if (kind === "owner") fs.writeFileSync(path.join(state.owner, "main.mjs"), "tampered");
    if (kind === "traversal") state.metadata.files["../owner/main.mjs"] = "a".repeat(64);
    if (kind === "type") {
      const bytes = Buffer.from("not served");
      fs.writeFileSync(path.join(state.site, "unknown.exe"), bytes);
      state.metadata.files["unknown.exe"] = createHash("sha256").update(bytes).digest("hex");
    }
    if (kind === "missing") delete state.metadata.files["index.html"];
    state.save();
    assert.throws(() => verifiedAssets(state.site, state.owner));
  }
});
