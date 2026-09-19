# Requirements and acceptance criteria

## Product goal

Provide a framework-free browser application that turns synthetic event logs into an interactive incident timeline, remains usable offline, and makes browser engineering decisions inspectable.

## Functional requirements

| ID   | Requirement                                                                             | Acceptance evidence                                     |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| F-01 | Import JSON arrays, JSON envelopes, and quoted CSV files.                               | Parser unit tests and cross-browser import flow.        |
| F-02 | Validate records and normalize timestamps, severity aliases, identifiers, and metadata. | Data-contract tests and bundled-fixture validation.     |
| F-03 | Preserve input order for equal timestamps.                                              | Property/example tests for stable merge sort.           |
| F-04 | Filter by message tokens, severity, service, and correlation ID.                        | EventIndex intersection tests and Playwright filters.   |
| F-05 | Render a timeline plus an equivalent non-visual summary.                                | DOM unit tests, semantic HTML, and axe flow.            |
| F-06 | Keep large imports off the main thread and support progress/cancellation.               | Versioned worker protocol and cancellation stress flow. |
| F-07 | Persist the latest valid snapshot and import evidence locally.                          | IndexedDB transaction and reload tests.                 |
| F-08 | Upgrade a v1 database to v2 without destructive recreation.                             | Migration integration test.                             |
| F-09 | Reload the application offline.                                                         | Production-build Service Worker test in Chromium.       |
| F-10 | Export the filtered result as JSON or CSV.                                              | Serialization unit tests and browser download flow.     |
| F-11 | Recover from corrupt stored records without rendering them.                             | Startup revalidation and corruption integration test.   |
| F-12 | Persist only bounded filter state in the URL.                                           | URL allowlist tests.                                    |

## Non-functional requirements

| ID   | Requirement      | Target                                                                                              |
| ---- | ---------------- | --------------------------------------------------------------------------------------------------- |
| N-01 | Input bounds     | ≤10 MiB and ≤100,000 records.                                                                       |
| N-02 | Unit coverage    | ≥92% lines/statements/functions and ≥88% branches for core boundaries.                              |
| N-03 | Accessibility    | Zero automated WCAG A/AA axe violations in the populated critical flow; keyboard path documented.   |
| N-04 | Performance      | 50,000-record normalization/sort ≤4 s; index build ≤2 s; indexed-query p95 ≤25 ms on CI-class CPUs. |
| N-05 | DOM scalability  | Visible rows plus fixed overscan, independent of total result count.                                |
| N-06 | Offline behavior | Cached shell and saved timeline reload with network disabled.                                       |
| N-07 | Supply chain     | Exact lockfile, high-severity npm audit gate, dependency review, Dependabot, and pinned Actions.    |
| N-08 | Maintainability  | Strict JavaScript type checking, ESLint, Prettier, generated code index, full file catalog.         |
| N-09 | Privacy          | No upload, analytics, account, telemetry, or remote persistence.                                    |

## Constraints and assumptions

- Modern evergreen browsers with JavaScript modules, workers, IndexedDB, SVG, and Service Workers.
- Single browser profile and single active import; no cross-device synchronization.
- Synthetic or explicitly approved records.
- Event time is source-provided wall-clock time; the application does not infer causality from clock skew.
- Scope is an analysis aid, not a production incident-response authority.

## Scope exclusions

Authentication, server APIs, real-time ingestion, multi-user collaboration, remote storage, cryptographic evidence signing, alert delivery, and sensitive-data classification are intentionally excluded.
