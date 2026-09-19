# Offline Incident Timeline PWA

A framework-free progressive web application for importing synthetic JSON/CSV event logs, tracing correlated failures, and continuing the investigation without a network connection. The project demonstrates direct command of JavaScript modules, semantic HTML, modern CSS, Service Workers, IndexedDB, Web Workers, SVG, browser performance APIs, and accessible interaction design.

> This is a portfolio and educational project. Use synthetic or explicitly approved data only; do not import credentials, customer records, or private operational logs.

## What it demonstrates

- **Browser fundamentals:** no application framework and no runtime UI dependency.
- **Responsive work:** parsing and validation run in a dedicated worker with a versioned protocol, transferred `ArrayBuffer`, progress, and cooperative cancellation.
- **Offline reliability:** a versioned Service Worker precaches the deterministic shell, runtime-caches same-origin worker assets, and provides a navigation fallback.
- **Durable local data:** IndexedDB schema migrations, atomic snapshot replacement, persisted import evidence, startup revalidation, and corruption recovery.
- **Algorithmic intent:** stable bottom-up merge sort, reusable inverted indexes, bounded input, formula-safe CSV output, and viewport-proportional DOM rendering.
- **Accessible evidence:** keyboard listbox navigation, visible focus, semantic controls, reduced-motion support, high-contrast themes, an SVG overview, and an equivalent summary table.
- **Engineering evidence:** unit/property/integration tests, cross-browser Playwright flows, axe checks, offline reload tests, worker-cancellation tests, Lighthouse budgets, CodeQL, dependency review, and exact source indexes.

## Quick start

Prerequisites: Node.js 24 or newer.

```bash
npm ci
npm run dev
```

Open the printed local URL and choose **Load demo incident**. To exercise production caching locally:

```bash
npm run build
npm run preview
```

The Service Worker is registered only in production builds. This prevents development-cache confusion.

## Verification

```bash
npm run verify
npx playwright install chromium firefox webkit
npm run test:e2e
npm run audit
```

`npm run verify` checks formatting, lint, strict JavaScript types, unit/property coverage, the large-fixture benchmark budget, production build, repository contracts, exact code-index freshness, and file-catalog freshness. See [testing strategy](docs/TESTING.md), [validation evidence](docs/reports/VALIDATION.md), and [performance evidence](docs/reports/PERFORMANCE.md).

## Product walkthrough

1. Import the bundled incident, a JSON array/envelope, or a CSV file.
2. The worker decodes, validates, normalizes, de-duplicates, and stable-sorts records.
3. The application atomically replaces the IndexedDB snapshot only after a successful import.
4. Search by indexed tokens or narrow by severity, service, and correlation ID.
5. Use the SVG timeline or equivalent table, then move through the virtual list with Arrow keys.
6. Export the filtered evidence as versioned JSON or spreadsheet-safe CSV.
7. Go offline, reload, and continue from the cached shell and local database.

The URL stores only bounded filter values. Event messages, metadata, and complete records never enter shareable URL state.

## Architecture

```text
JSON/CSV File ──ArrayBuffer transfer──▶ Parser Web Worker
                                           │
                              validate + stable merge sort
                                           │ versioned messages
                                           ▼
Semantic UI ◀── EventIndex ◀── App state ──atomic write──▶ IndexedDB v2
    │                │            │
    │                │            └── filtered JSON/CSV export
    │                └── severity/service/correlation/token indexes
    ├── virtualized list + detail panel
    └── SVG timeline + equivalent HTML table

Network ──▶ Service Worker ──▶ versioned shell/runtime caches ──▶ offline reload
```

The full design, data flow, constraints, and growth triggers are in [ARCHITECTURE.md](docs/ARCHITECTURE.md). The main decision and alternatives are recorded in [ADR-0001](docs/adr/0001-framework-free-local-first-pwa.md).

## Major features and functions

| Area            | Main API                                       | Responsibility                                                                                              |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Data contract   | `normalizeEvent`, `normalizeRecords`           | Validate untrusted records, normalize timestamps/severity, reject duplicates, and preserve source position. |
| Ordering        | `stableMergeSort`                              | Deterministic O(n log n) ordering with stable equal-timestamp ties and O(n) auxiliary memory.               |
| Search          | `EventIndex.filter`                            | Intersect reusable indexes before applying time bounds; retain chronological result order.                  |
| Parsing         | `parseLogText`, `parseCsvRows`                 | Bounded JSON/envelope parsing and quoted CSV tokenization without dynamic code.                             |
| Worker boundary | `ParserWorkerClient`, `normalizeIncrementally` | Transfer bytes, report progress, yield for cancellation, and validate the message protocol.                 |
| Persistence     | `TimelineDatabase`                             | Upgrade IndexedDB v1→v2, replace snapshots atomically, store import metadata, and detect corruption.        |
| Rendering       | `VirtualEventList`                             | Keep live row DOM proportional to viewport height plus overscan and provide keyboard selection.             |
| Visualization   | `renderTimelineChart`, `renderSummaryTable`    | Show time/severity relationships with a complete non-visual alternative.                                    |
| Offline runtime | `service-worker.js`                            | Precache deterministic assets, prune old versions, recover navigations, and bound runtime caching.          |
| URL state       | `readUrlFilters`, `writeUrlFilters`            | Share only allowlisted bounded filters without record content.                                              |
| Evidence        | repository scripts                             | Generate exact indexes/catalogs, benchmark algorithms, and validate repository invariants.                  |

Exact function, class, variable, and HTML element locations are generated in [CODE_INDEX.md](docs/CODE_INDEX.md).

## Input contract

Required fields are `timestamp`, `severity`, `service`, and `message`. Optional fields are `id`, `correlationId`, and `metadata`. Imports are capped at 10 MiB and 100,000 records. Invalid rows are skipped with a count; a completely invalid import does not replace saved data. See [DATA_CONTRACT.md](docs/DATA_CONTRACT.md) for formats and examples.

## Repository map

| Path                       | Purpose                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `index.html`               | Semantic application shell and accessible regions.                                                          |
| `src/core/`                | Event contract, stable ordering, indexes, and summaries.                                                    |
| `src/io/`                  | JSON/CSV input and local JSON/CSV export.                                                                   |
| `src/worker/`              | Versioned worker protocol, client, parsing, progress, and cancellation.                                     |
| `src/storage/`             | IndexedDB migrations, transactions, metadata, and recovery.                                                 |
| `src/ui/`                  | Virtualized list and accessible timeline/table rendering.                                                   |
| `src/pwa/`                 | Production Service Worker registration and update status.                                                   |
| `public/service-worker.js` | Offline shell and bounded runtime-cache policy.                                                             |
| `public/fixtures/`         | Synthetic demonstration data.                                                                               |
| `tests/unit/`              | Unit, property, integration, DOM, and migration tests.                                                      |
| `tests/e2e/`               | Cross-browser, accessibility, offline, export, persistence, and cancellation flows.                         |
| `scripts/`                 | Benchmarking, exact documentation generation, and repository validation.                                    |
| `docs/`                    | Requirements, architecture, decisions, contracts, operations, testing, security, evidence, and limitations. |
| `.github/`                 | Pinned CI, CodeQL, dependency review, and update automation.                                                |

Every authored file is summarized in the generated [FILE_CATALOG.md](docs/FILE_CATALOG.md).

## Safety and privacy

- Imported content is parsed as data and rendered with text nodes; no `innerHTML`, `eval`, or dynamic `Function` use is allowed.
- CSV output neutralizes spreadsheet formula prefixes.
- No analytics, remote API, account, or upload endpoint exists.
- The app cannot guarantee protection for sensitive data on a shared or compromised browser profile.
- Clear local data from the UI and clear site data in the browser before using the app on another device or account.

See [SECURITY.md](SECURITY.md) and [docs/SECURITY.md](docs/SECURITY.md).

## Documentation

- [Requirements and acceptance criteria](docs/REQUIREMENTS.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Data contract](docs/DATA_CONTRACT.md)
- [Testing strategy](docs/TESTING.md)
- [Accessibility design](docs/ACCESSIBILITY.md)
- [Offline operations and recovery](docs/OFFLINE_OPERATIONS.md)
- [Security design](docs/SECURITY.md)
- [Complexity analysis](docs/COMPLEXITY.md)
- [Research sources](docs/RESEARCH.md)
- [Known limitations](docs/LIMITATIONS.md)
- [Deployment checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Validation report](docs/reports/VALIDATION.md)
- [Test summary](docs/reports/TEST_SUMMARY.md)
- [Performance report](docs/reports/PERFORMANCE.md)

## License

[MIT](LICENSE)
