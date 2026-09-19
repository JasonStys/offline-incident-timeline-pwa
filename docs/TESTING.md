# Testing strategy

## Risk-based pyramid

```text
           Cross-browser E2E
      offline / axe / cancellation
   IndexedDB + DOM integration tests
Unit + property tests for contracts/algorithms
```

The largest layer protects deterministic domain behavior. Integration tests cover browser-shaped boundaries with fake IndexedDB and JSDOM. A smaller cross-browser layer proves critical workflows in actual engines.

## Coverage matrix

| Risk                           | Test type              | Representative cases                                                                            |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Untrusted record shape         | Unit/property          | Invalid timestamps/severity/identifiers/metadata, bounds, duplicate IDs.                        |
| Incorrect timeline order       | Example + property     | Empty/single arrays, random numeric arrays, equal timestamp stability.                          |
| Incorrect filter intersections | Unit                   | Token + severity + service + correlation, unknown buckets, time bounds.                         |
| CSV parser edge cases          | Unit                   | Quotes, commas, CRLF/LF, quoted newlines, aliases, duplicate/missing headers, malformed quotes. |
| Export injection               | Unit                   | Formula prefixes and quote escaping.                                                            |
| Worker contract                | Unit + E2E             | Version mismatch, invalid envelopes, progress, immediate cancellation, no partial commit.       |
| Database migration/integrity   | Integration            | New schema, v1→v2 index addition, replace/read/meta/clear/delete, corrupt records.              |
| Unsafe DOM insertion           | Static gate + DOM      | Ban dynamic markup primitives; malicious-looking message remains text.                          |
| Keyboard/accessibility         | DOM + E2E              | Arrow selection, labels, populated axe WCAG A/AA scan, equivalent table.                        |
| Offline failure                | E2E                    | Ready worker, online seed, network disable, reload, IndexedDB restore.                          |
| Cross-engine behavior          | E2E matrix             | Chromium, Firefox, WebKit main flow and axe scan.                                               |
| Performance regression         | Benchmark + Lighthouse | 50k algorithm budgets, category scores, FCP/LCP/TBT budgets.                                    |
| Supply-chain regression        | CI                     | `npm audit`, Dependabot, dependency review, CodeQL, SHA-pinned Actions.                         |

## Coverage thresholds

Vitest enforces at least 92% line, statement, and function coverage plus 88% branch coverage across the domain core, parsing/serialization, URL state, storage, and worker protocol. Browser-only orchestration is protected primarily through Playwright because line coverage there would encourage mocks that miss real lifecycle behavior.

Strict JavaScript checking covers authored source, scripts, tests, and configuration. `maxNodeModuleJsDepth: 0` keeps third-party JavaScript implementations outside that boundary while their published declaration types remain available; dependency code is instead controlled through exact locks, npm audit, dependency review, and CodeQL.

## Commands

```bash
npm run test:unit
npm run test:e2e
npm run benchmark:check
npm run lighthouse
npm run audit
npm run verify
```

Install browsers once with `npx playwright install chromium firefox webkit`. CI installs each browser and its Linux dependencies in isolated matrix jobs.

Lighthouse runs three times. The performance category uses the median score to reduce shared-runner noise, while accessibility, best-practices, and SEO use the lowest score and FCP/LCP/TBT use the slowest measurement. Every declared budget must still pass.

## Manual checks

Automated tools cannot prove screen-reader comprehension. Before a visual release:

1. Navigate every control and event row using keyboard only.
2. Confirm visible focus at 200% zoom and at 320 CSS-pixel width.
3. Inspect chart/table equivalence with a screen reader.
4. Toggle reduced motion and light/dark/high-contrast preferences.
5. Install the PWA, reload offline, and confirm the update-ready message on a cache-version change.
6. Corrupt a test database record in developer tools and confirm recovery guidance without rendering it.

## Known gaps

Offline emulation is deterministic only in Chromium CI; the primary flow and axe scan still run in all three engines. Automated axe results are necessary but not sufficient. The benchmark uses synthetic data and cannot represent all devices, locale costs, browser storage quotas, or adversarial content distributions.
