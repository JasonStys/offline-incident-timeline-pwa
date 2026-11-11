/**
 * @file Check the deliberately reviewed native workflow format and sandbox/package boundaries.
 * Functions: nativePolicy rejects drift; readNativeSources reads only fixed authored policy inputs.
 * Variables: literal policy expectations are regression controls, not a general YAML parser or code attestation.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");

/** @returns {{workflow:string,ci:string,main:string,builder:string,codeql:string}} Exact public authored source. */
export function readNativeSources() {
  const read = (/** @type {string} */ name) =>
    fs.readFileSync(path.join(root, name), "utf8").replaceAll("\r\n", "\n");
  return {
    workflow: read(".github/workflows/native-app.yml"),
    ci: read(".github/workflows/ci.yml"),
    main: read("desktop/main.mjs"),
    builder: read("scripts/build-native.mjs"),
    codeql: read(".github/workflows/codeql.yml"),
  };
}

/** @param {ReturnType<typeof readNativeSources>} source Reviewed literal source fields. @returns {void} Throws on boundary/gate drift. */
export function nativePolicy(source) {
  assert.match(source.workflow, /permissions:\n {2}contents: read\n/);
  assert.doesNotMatch(
    source.workflow,
    /pull_request_target|contents: write|security-events: write|secrets\./,
  );
  for (const command of [
    "npm ci --ignore-scripts",
    "npm --prefix desktop ci --ignore-scripts",
    "node desktop/node_modules/electron/install.js",
    "npm run test:native-contracts",
    "python -m unittest discover -s tests -p test_native_archive.py -v",
    "node scripts/build-native.mjs release/hosted",
    "python scripts/archive_native.py release/hosted/win-unpacked .runtime/native-hosted",
  ])
    assert.ok(source.workflow.includes(command), `Required native step: ${command}`);
  const uploads = source.workflow.split("- name: Retain");
  assert.equal(uploads.length, 3);
  assert.doesNotMatch(uploads[1] ?? "", /profile|release\/|\.runtime\/native-hosted\/$/m);
  assert.ok(
    (uploads[2] ?? "").includes(
      "if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main' && inputs.upload_package",
    ),
  );
  assert.ok((uploads[2] ?? "").includes("retention-days: 1"));
  assert.match(source.builder, /asar: false/);
  assert.match(source.builder, /Source changed|Authored source changed during native build/);
  for (const setting of [
    "nodeIntegration: false",
    "contextIsolation: true",
    "sandbox: true",
    "webSecurity: true",
    "allowRunningInsecureContent: false",
  ])
    assert.ok(source.main.includes(setting), `Required renderer setting: ${setting}`);
  assert.ok(source.main.includes('setWindowOpenHandler(() => ({ action: "deny" }))'));
  assert.ok(source.main.includes("await owner.finish()"));
  assert.doesNotMatch(source.main, /process\.exit\(|\.kill\(|\.destroy\(\)/);
  assert.equal(
    (
      source.ci.match(
        /mcr\.microsoft\.com\/playwright:v1\.64\.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f/g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal((source.ci.match(/options: --user 1001/g) ?? []).length, 2);
  assert.ok(source.ci.includes("node scripts/check-browser-host.mjs ${{ matrix.browser }}"));
  assert.ok(source.ci.includes("node scripts/check-browser-host.mjs chromium"));
  assert.ok(source.ci.includes("npx playwright test --project=${{ matrix.browser }}"));
  assert.ok(source.ci.includes("npm run lighthouse"));
  assert.doesNotMatch(source.ci, /PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS|continue-on-error/);
  assert.match(source.codeql, /\n {2}analyze:\n/);
  assert.ok(source.codeql.includes("category: /language:javascript-typescript"));
  assert.ok(source.codeql.includes("language: [python, actions]"));
  assert.ok(source.codeql.includes("category: /language:${{ matrix.language }}"));
}
