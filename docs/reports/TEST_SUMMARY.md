# Test summary

## Automated suites

- Domain validation and normalization examples, invalid-boundary matrix, duplicates, generated IDs, and metadata safety.
- Stable merge-sort examples and randomized property comparison.
- Indexed token/dimension intersections, time bounds, service discovery, and severity summaries.
- JSON/CSV format detection, envelopes, quoting, newlines, aliases, malformed content, and hard limits.
- Versioned JSON and spreadsheet-safe CSV export.
- URL allowlisting, length bounds, and history replacement.
- Worker request/response protocol validation.
- IndexedDB creation, v1→v2 migration, atomic round trip, import metadata, clear/delete, corruption detection, and storage estimates.
- Text-only SVG/list rendering and keyboard selection.
- Chromium, Firefox, and WebKit load/filter/persistence/export/accessibility flows.
- Chromium offline reload and worker-cancellation stress flows.
- Lighthouse desktop category and timing budgets.

## Acceptance targets

Vitest coverage thresholds are enforced in configuration. Browser tests use the production build. CI retains coverage, browser, and Lighthouse artifacts on failure for diagnosis.

## Final results

Local release-candidate verification on Node.js 24.18.1 produced:

| Suite/evidence                 | Result                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Vitest                         | 50 tests passed across 9 files.                                                                             |
| V8 statement coverage          | 96.73%.                                                                                                     |
| V8 branch coverage             | 89.11%.                                                                                                     |
| V8 function coverage           | 92.40%.                                                                                                     |
| V8 line coverage               | 97.71%.                                                                                                     |
| Chromium production flows      | 5 passed: main journey, export, axe, offline recovery, and cancellation.                                    |
| WebKit production flows        | 3 passed; the 2 Service Worker/cancellation cases are intentionally Chromium-only.                          |
| Lighthouse worst of two runs   | Accessibility 1.00, best practices 1.00, performance 0.97, SEO 0.91.                                        |
| Lighthouse worst-case timings  | FCP 905.72 ms, LCP 1,070.22 ms, TBT 0 ms.                                                                   |
| Deterministic 50,000-row bench | All budgets passed; detailed numbers are in `PERFORMANCE.md`.                                               |
| Dependency audit               | `npm audit --audit-level=high` reported zero vulnerabilities.                                               |
| Repository quality gates       | Format, lint, strict JavaScript types, build, repository contract, generated index, and catalog all passed. |

Firefox is exercised by the isolated Ubuntu GitHub Actions matrix because the local Windows Firefox process did not complete startup. The latest Actions run for `main` remains the authoritative cross-browser and CodeQL record; its links are included in the release handoff.
