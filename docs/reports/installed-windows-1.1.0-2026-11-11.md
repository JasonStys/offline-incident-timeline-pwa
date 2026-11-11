# Installed Windows 1.1.0 validation

By Jason Stys. 11 November 2026.

These observations describe the independently downloaded, published **1.1.0** application built from `832e11e43942f937aa855525e3c278be037c8c27`. Earlier Office editions, failed-run evidence and releases remain unchanged.

## Purpose and practical improvements

Investigate approved incident JSON and CSV locally, filter a persistent event snapshot by exact UTC time and indexed fields, inspect selected records and export the complete filtered evidence through a usable offline desktop application.

The original browser PWA, Worker parser, IndexedDB indexes, chart, keyboard list and equivalent table remain. The native app adds its own durable origin and profile, verified bundled assets, explicit new-file exports and completion-aware shutdown. UTC labels and actual Worker failure cleanup were corrected with independent regressions.

## Observed validation

**Actual installed app: Passed.** Two visible launches passed original 15-event and custom four-event flows, exact UTC windows, rejected-import preservation, retained IndexedDB, JSON and CSV, cancel and no-overwrite, closed bridge refusals and a real export through repeated Quit. Both processes exited zero without renderer errors.

**Original source and browser gates: Passed.** 100 scoped source tests passed at 97.90% coverage; 26 native helper cases passed at 99.27% lines and 95.97% branches over five helpers. Six ZIP controls and original three-engine browser and Lighthouse gates passed; six existing browser-specific skips remain explicit.

**Distribution and security: Passed.** Five independently downloaded release files matched provider hashes. All 89 installed files stayed unchanged. All three exact-source main workflows and three actual raw CodeQL categories passed with no findings or open alerts before publication.

## Illustrated use and implementation

The [four-page guide](windows-application-guide-1.1.0.docx) contains two actual installed-app screenshots, a worked user journey, an immutable source-code excerpt and operating limits. The [review manifest](windows-application-guide-1.1.0.json) binds exact Word, image, source and individually inspected page identities. Prepared cases are inputs inside the actual application, never separate demonstration apps.

## Installation and limits

Verify the SHA256 and extract the complete Windows x64 ZIP. Retain every Electron and Chromium notice, then launch IncidentTimeline.exe or the individual Desktop icon. Electron 44.11.1 and Node 24.22.2 are bundled; no Node setup, local HTTP service, IDE or Docker change is required.

The native profile uses owner-local plaintext Chromium and IndexedDB storage outside the installation. Browser PWA data is a separate origin and moves only by explicit import and export. Protect approved inputs and exports. Validation used fresh synthetic profiles; normal data was not opened.

This is an offline event investigation tool, not a live feed, forensic signature, authenticated chain of custody, encrypted vault, shared account service or backup system. Coincident chart points can overlap; inspect the equivalent table and individual records.

Static profile admission trusts the OS owner and does not defeat a malicious same-account writer. Interrupted-owner locks are retained for review. The application is unsigned; package hashes and installed tests are distinct from signed-installer or clean-machine certification.

Individual shortcut targets were read-back verified. Actual installed-executable acceptance is separate from ordinary default-profile shortcut activation, which was not independently exercised. Only synthetic inputs and isolated outputs were used; normal user data and Docker were not opened or changed. This documentation commit requires its own original hosted checks and processed security analyses; prior runtime evidence does not certify later source changes.
