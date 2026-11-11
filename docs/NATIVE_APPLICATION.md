# Windows incident workbench

The desktop app contains the complete existing timeline, not a separate demonstration program. JSON/CSV import runs the original Web Worker; accepted records replace the current IndexedDB snapshot atomically. The existing indexes, inclusive UTC boundaries, virtualized keyboard list, equivalent table and formula-safe exports remain the analysis engine.

## First use and meaningful investigation

Extract the entire Windows x64 ZIP to a separate application folder and open `IncidentTimeline.exe`. Keep all runtime files beside it. No Node.js, Python, local server or IDE is required by the shipped app. The application is unsigned; source-based tests are not a clean-machine installation certification.

1. Choose **Service outage** or **UTC midnight recovery**, then **Load demo incident**. Both are prepared synthetic data inside this application.
2. Import an approved JSON array/envelope or UTF-8 CSV file. A successful import replaces the current snapshot. A malformed or wholly invalid import preserves prior evidence; partly valid imports display rejected-row counts.
3. Combine indexed tokens, severity, service and correlation with UTC boundaries. Chart/table labels include the UTC date and milliseconds; compact rows retain the millisecond UTC clock. An equal boundary selects that exact instant. Invalid/reversed ranges disable exports; an empty valid result is distinct.
4. Inspect the selected record and move with arrow keys. The chart and equivalent table reflect the same filtered events. Exports retain every filtered record, including virtualized offscreen rows.
5. **Export JSON/CSV** opens an explicit save choice. Choose a new filename. Cancellation preserves existing files; an existing destination is refused rather than overwritten. CSV formula-like text is neutralized by the original serializer.
6. Close normally, then reopen. The saved snapshot is revalidated and restored; filter URL state is window state rather than a separate incident-history database.

## Durable data and ownership

The normal Windows profile is `%LOCALAPPDATA%\JasonStysPortfolio\offline-incident-timeline-pwa\workspace`. Application binaries and profiles are separate. It contains a product marker, retained owner lock and a Chromium `browser-state` directory. It has no built-in accounts, shared credentials or server-side storage.

Existing ancestor junctions/symlinks, fixed marker/lock aliases, nonregular or multiply linked browser files and profiles inside program/resource roots are refused before Chromium opens them. Tree admission is bounded to 10,000 entries, depth 16, 256 MiB per file and 512 MiB total. Ordinary SQLite recovery sidecars are preserved. Unknown data is never silently adopted or reset.

A stale interrupted-owner lock is retained for review. Do not delete it while any application owner remains active; preserve a complete cold profile copy before investigating recovery. This is a single trusted OS-owner boundary. Admission checks do not defeat a malicious process running as the same OS account or a concurrent namespace replacement.

Records and local exports are plaintext to the OS owner; this is not an encrypted forensic vault, evidence signature, multiuser authorization service or backup system. Import only approved evidence. Browser PWA data is a separate browser origin and is not automatically migrated into the desktop profile.

## Exit and package boundaries

The native owner acknowledges operations before parsing or IndexedDB mutation. Repeated Quit/Close closes new admission and keeps the same visible window/profile while accepted work finishes. A pending save choice must finish or be canceled. Only then does the real renderer terminate its parser, close IndexedDB and acknowledge its one-use teardown token. A failed or uncompleted operation is not converted into successful exit by killing the process. There is no universal shutdown-time guarantee.

Native resources are verified as bounded ordinary files with source/payload hashes before serving an exact private-origin allowlist. Ordinary files are intentional: ASAR's virtual named stat identity differs from the actual read descriptor and cannot satisfy the same-descriptor contract. These hashes detect accidental changes; the unsigned package is not cryptographically publisher-authenticated.

No imported content is executed. Renderer Node integration is off; context isolation, sandbox and web security stay on. The preload exposes only bounded explicit exports and operation/exit acknowledgments. Popups, permissions, external navigation, ordinary downloads and outside-origin app requests are refused. This does not make claims about unrelated OS/network software.

## Source build and actual acceptance

Development/build tools require Node.js 24 and Python 3.14; they are not end-user dependencies:

```powershell
npm ci --ignore-scripts
npm --prefix desktop ci --ignore-scripts
node desktop/node_modules/electron/install.js
npm run verify
npm run test:native-contracts
python -m unittest discover -s tests -p test_native_archive.py -v
node scripts/build-native.mjs release/local-clean
python scripts/archive_native.py release/local-clean/win-unpacked .runtime/local-native-proof
```

Use a new output every time. Clean source is required by default. The explicit `--allow-dirty` option labels local candidates and is refused in GitHub Actions. Packaging binds source/payload/owner hashes and compares source fingerprints before/after the build. The ZIP consumer bounds extraction, compares every relocated file, and launches the extracted EXE twice with marked synthetic data. It proves real parsing, prepared data, malformed-input preservation, exact exports, restart, actual runtime version and normal process exits; it does not install the app or access a normal profile.

Default Actions artifacts contain bounded synthetic receipts and screenshots, not browser profiles or full runtime packages. A complete unsigned ZIP is retained only by an explicit trusted-main manual request for one day. Release publication and installation are separate acceptance steps.
