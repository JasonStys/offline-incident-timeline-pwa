/**
 * @file Stage actual production timeline files and privileged-source hashes for a new native build workspace.
 * Functions: record binds actual descriptor bytes; walk admits only bounded public build resources.
 * Variables: fresh output, fixed source files and manifest digests; no private profile or installed app is read.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import fs from "node:fs";
import path from "node:path";
import { createResourceRecorder } from "./native-resource-reader.mjs";
import { execFileSync } from "node:child_process";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const requested = process.argv[2];
if (!requested) throw new Error("Choose an explicit native resource output.");
const output = path.resolve(requested);
const allowDirty = process.argv[3] === "--allow-dirty";
if (!output || fs.existsSync(output) || process.argv.length > 4 || (!allowDirty && process.argv[3]))
  throw new Error("Choose a fresh explicit native resource output.");
const command = ["-c", `safe.directory=${root.replaceAll("\\", "/")}`, "-C", root];
const source = execFileSync("git", [...command, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const dirty =
  execFileSync("git", [...command, "status", "--porcelain", "--untracked-files=all"], {
    encoding: "utf8",
  }).length > 0;
if (
  !/^[a-f0-9]{40}$/.test(source) ||
  (dirty && !allowDirty) ||
  (allowDirty && process.env.GITHUB_ACTIONS === "true")
)
  throw new Error(
    "Exact clean native source is required; local candidates must be explicitly labeled.",
  );
if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_SHA !== source)
  throw new Error("CI checkout/source mismatch.");
/** @type {Record<string,string>} */
const files = {};
/** @type {Record<string,string>} */
const owner = {};
const record = createResourceRecorder();
fs.mkdirSync(output, { recursive: true });
/**
 * Copy only original built app assets; source maps remain development-only.
 * @param {string} directory Actual built public directory.
 */
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const input = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Public build aliases are unsupported.");
    if (entry.isDirectory()) walk(input);
    else if (!entry.name.endsWith(".map")) {
      const name = path.relative(path.join(root, "dist"), input).replaceAll("\\", "/");
      if (!/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(name) || Object.keys(files).length >= 100)
        throw new Error("Invalid native resource inventory.");
      const { data, hash } = record(input);
      const destination = path.join(output, ...name.split("/"));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, data, { flag: "wx" });
      files[name] = hash;
    }
  }
}
walk(path.join(root, "dist"));
for (const name of [
  "main.mjs",
  "files.cjs",
  "profile.cjs",
  "owner.cjs",
  "protocol.cjs",
  "preload.cjs",
])
  owner[name] = record(path.join(root, "desktop", name)).hash;
fs.writeFileSync(
  path.join(output, "SOURCE.json"),
  JSON.stringify(
    {
      schema: 1,
      product: "offline-incident-timeline-pwa",
      version: "1.1.0",
      source,
      sourceDirty: dirty,
      files,
      owner,
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
console.log(
  `Staged ${Object.keys(files).length} actual original app resources; sourceDirty=${dirty}`,
);
