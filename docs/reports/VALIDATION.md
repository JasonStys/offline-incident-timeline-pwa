# Validation report

## Scope

This report records the repository acceptance contract for the initial release. The authoritative run is the latest successful GitHub Actions execution for the current `main` commit; local results are repeated before publication.

## Gates

| Gate                      | Expected result                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Prettier                  | All authored source/configuration formatted.                                                     |
| ESLint                    | Zero errors and zero warnings.                                                                   |
| Strict JavaScript types   | `tsc --checkJs` passes without emission.                                                         |
| Unit/property/integration | All Vitest cases pass.                                                                           |
| Coverage                  | ≥92% lines/statements/functions and ≥88% branches for core boundaries.                           |
| Production build          | Vite generates deterministic `assets/app.js` and `assets/app.css` plus worker chunk/source maps. |
| Repository contract       | Required docs, headers, Action pins, safe DOM policy, and fixture validation pass.               |
| Code index/catalog        | Generated files exactly match current sources/layout.                                            |
| Benchmark                 | All budgets in `PERFORMANCE.md` pass.                                                            |
| Cross-browser             | Chromium, Firefox, and WebKit main/accessibility flows pass.                                     |
| Offline/cancellation      | Chromium production-build flows pass.                                                            |
| Lighthouse                | Accessibility 1.00, performance ≥0.90, best practices ≥0.95, SEO ≥0.90 and timing budgets.       |
| Dependency audit          | No high/critical npm audit findings.                                                             |
| CodeQL                    | JavaScript/TypeScript analysis succeeds with no unresolved alert accepted as normal.             |

## Repository invariants

- No application framework or runtime UI library.
- No analytics, upload endpoint, account, or remote persistence.
- No dynamic HTML or dynamic code execution.
- No source file without a descriptive responsibility/function/variable header and exact-index reference.
- No unpinned third-party GitHub Action.
- No partial import commit.
- No generated build, test, dependency, or Lighthouse output committed except intentionally generated evidence JSON/Markdown.

## Result recording

The release candidate passed the complete local deterministic gate, Chromium and WebKit browser flows, two Lighthouse runs, the 50,000-record benchmark, and a high-severity dependency audit. Generated measurements are committed under `docs/reports/generated/benchmark.json`, while exact local test and coverage totals are recorded in `TEST_SUMMARY.md`.

The final commit and GitHub run URLs are reported in the release handoff after the independent Ubuntu Chromium, Firefox, WebKit, Lighthouse, dependency-review, and CodeQL jobs complete. This linked run is authoritative for the published commit.
