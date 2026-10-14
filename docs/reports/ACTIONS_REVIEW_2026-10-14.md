# Actions maintenance review — 2026-10-14

Reviewed by Jason Stys. Run 38013047462 correctly blocked an npm graph containing
source-map-js 1.2.1. The lock now selects patched 1.2.2; the audit threshold remains
unchanged and npm audit reports zero known vulnerabilities. This was a dependency
issue, not an Actions service outage. Coordinated CodeQL steps are also pinned to
one official 4.38.3 commit, guarded against mismatches and grouped by Dependabot.

Local Node 24.18.1 verification passed: 50 unit tests, required coverage budgets,
format/lint/types, the 50,000-event performance gate, production build, repository
contracts and regenerated source/file indexes. A restricted Windows temporary
directory initially caused test-loader ENOENT errors; moving only the test temp
directory into ignored .runtime resolved them without changing application code.
Browser/IndexedDB/offline flows and Lighthouse remain native CI gates. Final run
links will be appended after verification. Historical evidence is archived
privately on the PC, not exposed through source control.

See the [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
