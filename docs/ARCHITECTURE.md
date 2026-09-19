# Architecture

## Context and goals

The application must demonstrate direct browser-API skill, continue after connectivity loss, remain responsive during large imports, preserve local evidence safely, and expose its trade-offs to reviewers. It must not depend on a UI framework or a backend.

## High-level design

```text
┌──────────────────────────── Browser main thread ────────────────────────────┐
│ Semantic controls → App coordinator → EventIndex → SVG/table/virtual list  │
│                         │           │                         │              │
│                         │           └── bounded URL filters   └── exports   │
│                         └── atomic IndexedDB v2 snapshot                    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ versioned structured-clone messages
                                   ▼
┌──────────────────────── Dedicated parser worker ───────────────────────────┐
│ transferred ArrayBuffer → UTF-8 → JSON/CSV → chunk validation → stable sort│
│                                      ▲                                      │
│                                  cancellation                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Network boundary ──────────────────────────────┐
│ request → Service Worker → fixed shell cache / bounded runtime cache        │
│                     └────→ network-first navigation with offline fallback   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component responsibilities

| Component               | Responsibility                                                              | Failure behavior                                                                   |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Domain core             | Normalize untrusted records and stable-sort equal timestamps.               | Returns bounded row issues; fatal collection limits reject the import.             |
| Parser worker           | Decode, parse, validate in chunks, report progress, and honor cancellation. | Emits one versioned terminal response; never mutates saved data.                   |
| Application coordinator | Own current events, filters, persistence ordering, and render calls.        | Preserves previous snapshot on import failure.                                     |
| EventIndex              | Map dimension/token values to ordered event positions.                      | Unknown filters yield an empty set.                                                |
| IndexedDB boundary      | Run additive migrations and atomic snapshot/meta replacement.               | Startup corruption is surfaced with a clear-data recovery path.                    |
| Virtual list            | Render only viewport rows plus overscan.                                    | Empty results produce no active descendant or detail record.                       |
| Timeline renderers      | Present event position and severity in SVG and an equivalent table.         | Empty input renders labeled lanes and zero counts.                                 |
| Service Worker          | Version shell/runtime caches and provide offline navigation.                | Failed installation does not replace the active worker; UI reports unavailability. |

## Data flow

1. The main thread checks the file-size bound and transfers the `ArrayBuffer` to a module worker.
2. The worker validates the request envelope, decodes UTF-8, chooses JSON/CSV, and parses records.
3. Every 250 records, validation yields to the worker event loop, posts progress, and checks cancellation.
4. Valid records are de-duplicated and stable-sorted by epoch milliseconds; equal keys retain source order.
5. The main thread receives structured-cloned events and issues.
6. IndexedDB replaces events and import metadata in one read/write transaction.
7. Only after commit does the UI replace state, build indexes, and render.
8. Filter changes intersect reusable sets and then update the chart, table, virtual list, details, and bounded URL.

## Storage model

Database `incident-timeline`, current version 2:

- `events`, key `id`; indexes `byTimestamp`, `bySeverity`, `byService`, `byCorrelation`.
- `meta`, key `key`; `lastImport` stores source label, ISO import time, and issue count.

Version 1 created events/meta and the first three indexes. Version 2 adds `byCorrelation` during the upgrade transaction. Snapshots are deliberately replaced rather than merged: an import is a complete evidence set, so replacement prevents ghost records from previous files.

## Cache policy

- **Shell cache:** deterministic build entry, CSS, manifest, icon, fixture, and navigation shell.
- **Runtime cache:** same-origin GET assets such as the generated worker chunk; cache-first and capped at 40 entries.
- **Navigation:** network-first so a connected reload sees deployments; cached request or shell fallback when offline.
- **Activation:** deletes only older caches with this application's prefix.
- **Update:** the new worker waits normally; the UI announces that a reload will activate the update.

## Error and recovery model

- Invalid rows are skipped and counted; untrusted raw values are not repeated in errors.
- Limits, malformed files, empty valid sets, and protocol failures reject the import.
- Persistence precedes UI replacement, so transaction failure preserves the previous in-memory and stored snapshot.
- Saved records are revalidated at startup; corruption blocks rendering and directs the user to clear and re-import.
- Cancellation is cooperative and returns `AbortError`; it never commits a partial snapshot.
- Offline-cache failure leaves the online application usable and is visible in status text.

## Scale and reliability

The intended ceiling is 100,000 imported records on a single device. Worker parsing protects interaction responsiveness; stable sort is O(n log n); index construction is O(n × t); query intersections start with the smallest set; and virtual rendering is O(v), where v is visible rows plus overscan. IndexedDB stores one snapshot, so storage scales linearly with event content.

At substantially larger scale, revisit the single transferred buffer, whole-snapshot commit, in-memory indexes, and SVG point count. Candidate evolutions are streamed file decoding, paged IndexedDB cursors, compressed typed-array indexes, WebGL/canvas aggregation, and a server-side evidence store—but each would add complexity and privacy boundaries.

## Trade-offs

- A framework-free implementation produces stronger browser-fundamentals evidence but requires explicit lifecycle/state code.
- Snapshot replacement is simple and coherent but unsuitable for continuous append ingestion.
- Exact-token indexes are predictable and cheap; substring/fuzzy search would require a different index.
- Runtime cache bounding avoids unbounded growth but uses insertion order rather than byte-aware eviction.
- A visual virtual list cannot expose every offscreen row simultaneously; export retains all records and the chart has a complete table alternative.

See [ADR-0001](adr/0001-framework-free-local-first-pwa.md) for the decision comparison.
