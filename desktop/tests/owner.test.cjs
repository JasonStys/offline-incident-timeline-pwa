/**
 * @file Prove retained acknowledged work, refusal after exit, repeated Quit and failed native completion.
 * Functions: independent actual promise/event ordering cases; no browser/engine output is simulated.
 * Variables: inert controlled completion gates and actual owner instance only.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createOwner } = require("../owner.cjs");

test("exit cannot complete while an acknowledged real renderer operation is pending", async () => {
  const owner = createOwner(),
    token = owner.begin("import");
  let finished = false;
  const first = owner.finish();
  first.then(() => {
    finished = true;
  });
  assert.equal(owner.finish(), first);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(finished, false);
  assert.equal(owner.busy, true);
  assert.throws(() => owner.begin("clear"));
  owner.end(token);
  await first;
  assert.equal(finished, true);
  assert.equal(owner.busy, false);
  assert.throws(() => owner.end(token));
});

test("actual accepted native work is retained through both resolution and rejection", async () => {
  for (const failure of [false, true]) {
    const owner = createOwner();
    let release;
    const barrier = new Promise((resolve) => {
      release = resolve;
    });
    let completed = false;
    const work = owner.track(async () => {
      await barrier;
      completed = true;
      if (failure) throw new Error("inert failure");
      return 7;
    });
    const workResult = assert.doesNotReject(async () => {
      try {
        await work;
      } catch (error) {
        if (!failure) throw error;
      }
    });
    const finish = owner.finish();
    const finishResult = failure
      ? assert.rejects(finish, /accepted local operation failed/)
      : assert.doesNotReject(finish);
    await Promise.resolve();
    assert.equal(completed, false);
    assert.equal(owner.busy, true);
    release();
    await Promise.all([workResult, finishResult]);
    assert.equal(completed, true);
    assert.equal(owner.busy, false);
    await assert.rejects(owner.track(async () => 8));
  }
});

test("only known bounded operation kinds and exact one-use tokens are admitted", async () => {
  const owner = createOwner();
  for (const kind of ["unknown", undefined, null, 1, {}, "constructor"])
    assert.throws(() => owner.begin(kind));
  const tokens = ["startup", "import", "fixture", "clear"].map((kind) => owner.begin(kind));
  assert.equal(new Set(tokens).size, 4);
  assert.throws(() => owner.begin("import"));
  for (const token of [undefined, null, 1, {}, "é".repeat(64), "a".repeat(64)])
    assert.throws(() => owner.end(token));
  for (const token of tokens) owner.end(token);
  await owner.finish();
});
