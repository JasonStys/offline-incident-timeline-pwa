# Native incident workflow observations — 2026-11-11

This report distinguishes local candidate evidence from later exact-source hosted acceptance and release publication. Existing Word publications remain historical source-bound editions.

## Actual defects and controls

- A literal DOM regression reproduced the prior timezone mismatch: UTC midnight evidence appeared as the preceding local day at 5 PM. Chart/table labels now include the UTC date and milliseconds, and compact rows explicitly retain UTC milliseconds. Offset/day-rollover expectations are independently specified.
- Real file-read and synchronous Worker-post failures previously left `ParserWorkerClient.activeRequestId` set, refusing every later import. Both original failure cases were reproduced; cleanup now releases only their own pending request and a subsequent import can proceed.
- The first native source prototype stalled during custom-scheme Service Worker startup. The desktop mode now uses its verified physical offline bundle; ordinary production HTTP PWA caching remains real and separately tested. The custom-scheme vendor cause is not claimed as proven.
- The first compiled ASAR candidate failed resource admission. An actual Electron probe showed named virtual device/inode `1/1` differed from its real file descriptor. Ordinary-file packaging satisfies the existing identity check; that check was not removed or bypassed.

## Observed local evidence

The original three-engine suite completed with 18 passes and its six existing non-Chromium offline/worker skips. The current unit suite completed 98 cases at 97.90% lines (374/382), 91.00% branches (253/278) and 92.68% functions (76/82) in its original coverage scope. Original unit/property/storage floors remain 92% lines/statements/functions and 88% branches. The measured scope is core, parser, storage and protocol, not every UI/native line.

Four native helpers have their own actual Node coverage: descriptor IO, profile admission, operation ownership and package protocol. Their 22 controls measured 99.24% lines, 95.14% branches and 95.83% functions. New enforced floors are 95/90/90 respectively. Main/preload and real UI behavior are exercised by the actual EXE consumer rather than included in that helper percentage. Six small real ZIP fixtures cover path traversal, duplicate/case collisions, links, declared/actual bounds, source growth and vendor timestamps.

The corrected relocated Windows candidate completed two actual EXE launches and normal exits `0/0`: original 15-event fixture, severity count 3, equal UTC count 2, custom four-record midnight input, malformed import preserving accepted data, exact two-record JSON export, formula-safe CSV, cancel/no-overwrite, restored four-record IndexedDB state and a genuine pending export retained through repeated Quit/Close. The save-choice response is controlled in the acceptance harness; engine outputs, file bytes, database operations and process exits are real. No normal user profile, installation or shortcut is part of this source-candidate proof.

The original Service Worker/IndexedDB schema and protocol contracts remain; only shell cache namespace v3 invalidates the changed browser UI. Native application version is 1.1.0 and locked Electron runtime 44.11.1. Source maps are development-only.

## Hosted boundaries

The original JavaScript CodeQL job and category remain intact. Separate genuine Python and Actions analyses cover the new archive/tooling/workflow source, with no project execution or source exclusions. Their hosted processed results are required separately; local unit success is not a clean-scan claim.

The unchanged three-sample Lighthouse runner passed locally: aggregate accessibility 1.00, best practices 1.00, performance 0.97 and SEO 0.91; median FCP 951.995 ms, LCP 1125.495 ms and TBT 0 ms. Its known Windows temporary-browser-profile cleanup warnings were retained. These observations are not a production SLO or a claim that every UI/native line has been measured.

Original browser and Lighthouse jobs use the official exact 1.64.1 Noble image by digest as nonroot UID 1001. Mandatory real browser/missing-executable/font/focus/layout probes precede unchanged three-engine app tests and the original three-sample Lighthouse budgets. No host-validation bypass, test deadline widening or failed-collector allowance is introduced. These jobs do not invoke or repair Docker on a user's PC.

The native workflow builds clean source, validates every relocated payload and uses the real Windows application. Current hosted source scans, cross-OS browser jobs and release/download/install results must be evaluated for the actual accepted commit; local results alone do not establish them. Native macOS/Linux apps, signed installers, encrypted user stores, malicious same-owner protection, universal shutdown bounds and production incident certification are not claimed.

## Fresh quality graph setup correction

The first hosted candidate at `c6cb7438e6ec52dc6413e201ddb391218063411e` passed actual Windows native acceptance, all three browser jobs and Lighthouse. Its quality job failed `TS2307` on the acceptance harness's Electron type: the quality recipe installed only the root npm graph while strict JavaScript checking now includes that native harness. This was this repository's declared-tooling setup omission, not an application runtime failure or a GitHub platform outage. The workflow now installs the exact desktop graph with `--ignore-scripts` before the unchanged quality recipe. An independent actual-workflow mutation rejects removal of that step. A local fresh desktop `npm ci --ignore-scripts` then proved Electron 44.11.1 types were present, the Electron executable was absent and strict type checking passed. Runtime, renderer, user-store and native005 payload hashes are unchanged by this CI-only correction. Later hosted results are evaluated at their own exact source identity.
