# UTC incident workflow verification — 2026-11-09

The application now exposes the existing engine's inclusive millisecond bounds through labeled UTC
controls. Calendar round-trip validation prevents impossible dates and local/DST reinterpretation.
Open-ended and exact-equal ranges work with token/severity/service/correlation criteria. Invalid or
reversed ranges show a distinct alert, clear derived views and disable exports while preserving
stored evidence. Valid empty results offer adjustment/reset guidance. UTC URL criteria restore
online and offline, and invalid URL values cannot silently become an unbounded search.

The Service Worker cache moved to v2 to invalidate stale app shells. Browser and Lighthouse runners
now use strict owned ports; the Lighthouse runner waits for its own listener before probing HTTP.
Generated browser runtimes are excluded from source lint/format scans while authored source gates
remain enforced.

## Observed results

- 74 unit/property/integration tests passed; coverage was 97.03% statements, 91.00% branches,
  92.68% functions and 97.90% lines, above all existing release thresholds.
- The full real Chromium, Firefox and WebKit matrix passed 18 cases. Six intentionally skipped
  instances retain the documented Chromium-only offline/cancellation policy. Existing accessibility,
  persistence, export, worker-cancel and new UTC workflows all passed on their declared engines.
- UTC journeys ran under America/New_York with an explicit-offset synthetic microgrid incident near
  a DST transition. Downloads were parsed and checked for the exact expected event IDs. Inclusive
  endpoints, exact-equal bounds, combined criteria, invalid/reversed/no-match/reset states, malformed
  URL recovery, offline reload and a 390×844 viewport were exercised.
- Three-pass Lighthouse passed: accessibility 1.00, best practices 1.00, performance 0.97 and SEO
  0.91; FCP 908 ms, LCP 1073 ms and TBT 0 ms in the recorded run. Timings depend on the host.
- The final npm audit reported zero vulnerabilities. Direct pinned toolchain versions were retained.
- `npm run verify` passed formatting, lint, strict types, all coverage gates, the 50,000-event
  performance budget, production build, source/header/dependency policy, exact source index and file
  catalog. The recorded 50k query p95 was 2.39 ms (25 ms limit); host/load dependent.

## Dependency remediation

The original locked install reported high advisories through browser-audit tooling and moderate
URI/glob issues. Compatible transitive updates and the narrow minimatch 11.0.1 override removed
these findings without a forced tooling downgrade. All lint/type/browser gates were rerun on that
patched graph. Upstream advisory evidence: [Zod constrained-collection bounds](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), and
[fast-uri normalization](https://github.com/advisories/GHSA-w74x-v6f9-j3xg).

## Practical limits

No real incident records, external APIs or accounts were used. No GitHub Actions, hosted deployment
or Docker changes were initiated by this subtask. The app remains local-first and cannot protect
private data on a compromised/shared browser profile. Filter URLs may contain sensitive user-entered
terms; do not share such links. Automated accessibility checks do not replace manual assistive
technology testing. See [UTC_WINDOWS.md](../UTC_WINDOWS.md) for user behavior and file responsibilities.

Machine-readable evidence: [PRACTICAL_WORKFLOWS_2026-11-09.json](PRACTICAL_WORKFLOWS_2026-11-09.json).

## CI startup repair

The hosted Lighthouse job initially timed out before running audits because CI enabled ANSI color
inside Vite's listener address: the host and bold port were separated by control sequences. An
owned forced-color reproduction confirmed that the raw expected URL was absent while the visible
address was correct. The runner now removes terminal formatting, requires the exact announced
Local URL, and includes bounded sanitized startup output on failure. The strict-port ownership
check, 15-second startup deadline and all Lighthouse budgets are unchanged.

Three focused regressions cover plain/ANSI/CRLF output, chunked output, unrelated logs and different
ports. An owned occupied-port sentinel test was rejected with zero HTTP requests sent to that
service. Three complete Lighthouse runs with CI-style color enabled passed again: accessibility
1.00, best practices 1.00, performance 0.97, SEO 0.91, FCP 947 ms, LCP 1110 ms and TBT 0 ms.
