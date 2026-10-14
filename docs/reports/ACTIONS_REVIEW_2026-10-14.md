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
Accepted main source: 921ac1827518dbcec3860d910b4255a7b17215d5.
[CI 38639973355](https://github.com/JasonStys/offline-incident-timeline-pwa/actions/runs/38639973355)
and [CodeQL 38639973347](https://github.com/JasonStys/offline-incident-timeline-pwa/actions/runs/38639973347)
passed. The previously failing setup-node proposal was updated without merging:
03e940672788dba380e85e7267f191961cc7b52f passed CI 38640538653,
CodeQL 38640538695 and dependency review 38640538665. These gates include all
browser lanes, offline/IndexedDB flows and Lighthouse. Approved historical cleanup
can remove old URLs; evidence is retained privately on the PC.

See the [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
