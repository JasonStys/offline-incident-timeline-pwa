/**
 * @file Retain acknowledged real renderer/database work and native file operations until actual completion.
 * Functions: createOwner closes admission once, preserves every accepted completion and never force-kills work.
 * Variables: opaque operation tokens and retained promises are per-launch state, not account authentication.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
"use strict";
const { randomBytes } = require("node:crypto");

/** One trusted immutable app renderer; an acknowledged operation must end before the owned profile can close. */
function createOwner() {
  const tokens = new Map(),
    pending = new Set();
  let closing = null;
  return {
    get busy() {
      return tokens.size > 0 || pending.size > 0;
    },
    get closing() {
      return closing !== null;
    },
    begin(kind) {
      if (closing || !["startup", "import", "fixture", "clear"].includes(kind) || tokens.size >= 4)
        throw new Error("The active timeline cannot admit another operation.");
      const token = randomBytes(32).toString("hex");
      let resolve;
      const done = new Promise((finish) => {
        resolve = finish;
      });
      tokens.set(token, { done, resolve });
      return token;
    },
    end(token) {
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token) || !tokens.has(token))
        throw new Error("Unknown timeline operation completion.");
      const state = tokens.get(token);
      tokens.delete(token);
      state.resolve();
    },
    async track(work) {
      if (closing) throw new Error("Timeline exit was already requested.");
      const task = Promise.resolve().then(work);
      pending.add(task);
      try {
        return await task;
      } finally {
        pending.delete(task);
      }
    },
    finish() {
      if (!closing)
        closing = (async () => {
          const result = await Promise.allSettled([
            ...pending,
            ...[...tokens.values()].map((state) => state.done),
          ]);
          if (result.some((entry) => entry.status === "rejected"))
            throw new Error("An accepted local operation failed; preserve its data and review.");
        })();
      return closing;
    },
  };
}
module.exports = { createOwner };
