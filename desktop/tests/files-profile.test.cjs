/**
 * @file Exercise actual bounded descriptors, aliases, owner markers and recoverable browser files.
 * Functions: real filesystem fixtures prove refused profiles preserve every outside sentinel.
 * Variables: fresh marked test directories only; no normal user profile is opened or removed.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { readRegular, readUtf8, newFile } = require("../files.cjs");
const { openProfile, admitProfile } = require("../profile.cjs");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "incident-native-contract-"));
  t.after(() => {
    assert.ok(path.basename(root).startsWith("incident-native-contract-"));
    fs.rmSync(root, { recursive: true });
  });
  return root;
}

test("bounded reads reject malformed UTF8, oversized and hardlinked files; exports never overwrite", (t) => {
  const root = fixture(t),
    file = path.join(root, "evidence.json"),
    sentinel = path.join(root, "outside.json");
  newFile(file, "real evidence");
  assert.equal(readUtf8(file, 64), "real evidence");
  assert.throws(() => newFile(file, "replacement"));
  assert.equal(fs.readFileSync(file, "utf8"), "real evidence");
  assert.throws(() => readRegular(file, 2));
  fs.writeFileSync(sentinel, Buffer.from([0xff]));
  assert.throws(() => readUtf8(sentinel, 64));
  fs.linkSync(file, path.join(root, "alias"));
  assert.throws(() => readRegular(file, 64));
  assert.equal(fs.readFileSync(file, "utf8"), "real evidence");
});

test("normal browser persistence and SQLite recovery sidecars survive an owned restart unchanged", (t) => {
  const root = fixture(t),
    directory = path.join(root, "profile");
  const first = openProfile(directory);
  fs.mkdirSync(path.join(first.browser, "Default"));
  const files = [
    "IndexedDB",
    "state.sqlite",
    "state.sqlite-wal",
    "state.sqlite-shm",
    "state.sqlite-journal",
  ];
  for (const name of files)
    fs.writeFileSync(path.join(first.browser, "Default", name), "preserve " + name);
  const identity = fs.readFileSync(path.join(directory, "owner.json"));
  assert.throws(() => openProfile(directory));
  first.close();
  first.close();
  const second = openProfile(directory);
  assert.deepEqual(fs.readFileSync(path.join(directory, "owner.json")), identity);
  for (const name of files)
    assert.equal(
      fs.readFileSync(path.join(second.browser, "Default", name), "utf8"),
      "preserve " + name,
    );
  second.close();
});

test("unknown, mismatched, interrupted-owner and replaced lock evidence is preserved", (t) => {
  const root = fixture(t),
    unknown = path.join(root, "unknown");
  fs.mkdirSync(unknown);
  fs.writeFileSync(path.join(unknown, "customer.txt"), "retain");
  assert.throws(() => openProfile(unknown));
  assert.deepEqual(fs.readdirSync(unknown), ["customer.txt"]);
  const first = openProfile(path.join(root, "profile"));
  fs.writeFileSync(path.join(first.directory, "owner.lock"), "different-owner");
  assert.throws(() => first.close());
  assert.throws(() => openProfile(first.directory));
  assert.equal(
    fs.readFileSync(path.join(first.directory, "owner.lock"), "utf8"),
    "different-owner",
  );
  fs.unlinkSync(path.join(first.directory, "owner.lock"));
  const marker = path.join(first.directory, "owner.json"),
    bytes = '{"schema":1,"product":"different","id":"' + "a".repeat(32) + '"}';
  fs.writeFileSync(marker, bytes);
  assert.throws(() => openProfile(first.directory));
  assert.equal(fs.readFileSync(marker, "utf8"), bytes);
});

test("all fixed mutable profile slots reject real hardlinks before any profile mutation", async (t) => {
  for (const name of [
    "owner.json",
    "owner.lock",
    "state.sqlite",
    "state.sqlite-wal",
    "state.sqlite-shm",
    "state.sqlite-journal",
  ]) {
    await t.test(name, (sub) => {
      const root = fixture(sub),
        profile = openProfile(path.join(root, "profile"));
      profile.close();
      const outside = path.join(root, "outside"),
        original = Buffer.from("untouched external bytes");
      fs.writeFileSync(outside, original);
      const destination = name.startsWith("owner.")
        ? path.join(profile.directory, name)
        : path.join(profile.browser, name);
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
      fs.linkSync(outside, destination);
      assert.throws(() => openProfile(profile.directory));
      assert.deepEqual(fs.readFileSync(outside), original);
      assert.equal(
        fs.existsSync(path.join(profile.directory, "owner.lock")),
        name === "owner.lock",
      );
    });
  }
});

test("directory aliases and frozen program roots are refused without mutating their targets", (t) => {
  const root = fixture(t),
    target = path.join(root, "outside"),
    alias = path.join(root, "alias");
  fs.mkdirSync(target);
  fs.symlinkSync(target, alias, process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => openProfile(path.join(alias, "profile")));
  assert.deepEqual(fs.readdirSync(target), []);
  const program = path.join(root, "program");
  fs.mkdirSync(program);
  assert.throws(() => openProfile(path.join(program, "profile"), [program]));
  assert.deepEqual(fs.readdirSync(program), []);
});

test("browser tree entry, depth and actual byte budgets reject before an owner lock is created", async (t) => {
  for (const kind of ["depth", "bytes", "unknown-top-level"]) {
    await t.test(kind, (sub) => {
      const root = fixture(sub),
        profile = openProfile(path.join(root, "profile"));
      profile.close();
      if (kind === "depth")
        fs.mkdirSync(path.join(profile.browser, ...Array(18).fill("d")), { recursive: true });
      if (kind === "bytes") {
        const file = path.join(profile.browser, "too-large");
        fs.writeFileSync(file, "");
        fs.truncateSync(file, 256 * 1024 * 1024 + 1);
      }
      if (kind === "unknown-top-level")
        for (const name of ["a", "b", "c", "d"])
          fs.writeFileSync(path.join(profile.directory, name), "retain");
      assert.throws(() => admitProfile(profile.directory));
      assert.equal(fs.existsSync(path.join(profile.directory, "owner.lock")), false);
    });
  }
});
