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

A subsequent automatic proposal failed in run 38645462285 because Vitest 5.0.3
was paired with coverage-v8 5.0.1, whose exact peer dependency requires Vitest
5.0.1. This is a proposal dependency conflict, not an Actions service outage.
Both authored pins and the lock are updated together to 5.0.3; no force-install
or legacy-peer-dependency bypass is used. Dependabot now groups the Vitest family,
and a repository contract plus four regression cases reject missing, ranged,
or mismatched versions. The latest verification below supersedes the original
50-test acceptance above.

The repaired pair passed a fresh locked install, full local verification and
audit (zero known vulnerabilities): 54 tests, 96.9% statements and 89.41%
branches, with unchanged budgets. The 50,000-event benchmark, production build,
81-file catalog and 42-file code index also passed. Native CI will validate the
browser flows on this exact dependency graph; its final run evidence is saved
in the private maintenance archive after acceptance.
