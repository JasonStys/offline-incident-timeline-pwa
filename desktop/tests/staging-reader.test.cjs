/**
 * @file Exercise the actual build recorder's descriptor, alias, growth and cumulative byte guarantees.
 * Functions: real filesystem controls interpose only one owned read event; outside bytes stay unchanged.
 * Variables: fresh synthetic files, fixed SHA-256 oracle and restored readSync function; no app/profile is opened.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const reader = import("../../scripts/native-resource-reader.mjs");
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "incident-staging-reader-"));
  t.after(() => {
    assert.ok(path.basename(root).startsWith("incident-staging-reader-"));
    fs.rmSync(root, { recursive: true });
  });
  return root;
}
test("hash binds exact ordinary bytes to an independent standard SHA oracle", async (t) => {
  const { createResourceRecorder } = await reader,
    root = fixture(t),
    file = path.join(root, "public.js");
  fs.writeFileSync(file, "abc");
  const value = createResourceRecorder()(file);
  assert.equal(value.data.toString(), "abc");
  assert.equal(value.hash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("staging refuses real aliases and oversized metadata before accepting bytes", async (t) => {
  const { createResourceRecorder } = await reader,
    root = fixture(t),
    outside = path.join(root, "outside"),
    alias = path.join(root, "alias");
  fs.writeFileSync(outside, "retained");
  fs.linkSync(outside, alias);
  assert.throws(() => createResourceRecorder()(alias));
  assert.equal(fs.readFileSync(outside, "utf8"), "retained");
  const large = path.join(root, "large");
  fs.writeFileSync(large, "");
  fs.truncateSync(large, 16 * 1024 * 1024 + 1);
  assert.throws(() => createResourceRecorder()(large));
});
test("a real name replacement during reading cannot substitute the checked descriptor bytes", async (t) => {
  const { createResourceRecorder } = await reader,
    root = fixture(t),
    file = path.join(root, "public.js"),
    saved = path.join(root, "original.js");
  fs.writeFileSync(file, "abc");
  const original = fs.readSync;
  let replaced = false;
  fs.readSync = function (...args) {
    if (!replaced) {
      replaced = true;
      fs.renameSync(file, saved);
      fs.writeFileSync(file, "substituted");
    }
    return original.apply(fs, args);
  };
  try {
    const value = createResourceRecorder()(file);
    assert.equal(value.data.toString(), "abc");
    assert.equal(value.hash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  } finally {
    fs.readSync = original;
  }
  assert.equal(replaced, true);
  assert.equal(fs.readFileSync(file, "utf8"), "substituted");
  assert.equal(fs.readFileSync(saved, "utf8"), "abc");
});
test("actual source growth is refused and repeated ordinary reads cannot exceed the total budget", async (t) => {
  const { createResourceRecorder } = await reader,
    root = fixture(t),
    file = path.join(root, "public.js");
  fs.writeFileSync(file, "abc");
  const original = fs.readSync;
  let grew = false;
  fs.readSync = function (...args) {
    if (!grew) {
      grew = true;
      fs.appendFileSync(file, "!");
    }
    return original.apply(fs, args);
  };
  try {
    assert.throws(() => createResourceRecorder()(file));
  } finally {
    fs.readSync = original;
  }
  assert.equal(grew, true);
  fs.writeFileSync(file, Buffer.alloc(1024 * 1024, 0x61));
  const record = createResourceRecorder();
  for (let i = 0; i < 32; i++) assert.equal(record(file).data.length, 1024 * 1024);
  assert.throws(() => record(file));
  assert.equal(createResourceRecorder()(file).data.length, 1024 * 1024);
});
