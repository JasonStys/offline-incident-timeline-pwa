# Limitations

- Synthetic/approved data only; this is not a certified incident-response or evidence-management system.
- One browser/native profile, one active import, one current snapshot, and no cross-device synchronization. Browser and desktop storage are separate origins.
- Entire files are decoded and JSON is parsed in memory before chunked validation; this is bounded but not streaming I/O.
- CSV supports RFC-style quoting but not arbitrary dialect detection, comments, encodings other than UTF-8, or locale-specific delimiters.
- Search is normalized exact-token matching, not substring, stemming, fuzzy, phrase, or ranked full-text search.
- Timestamps are normalized but clock skew, timezone intent, causal ordering, and distributed tracing semantics are not inferred.
- Generated fallback IDs are deterministic non-cryptographic hashes and are not evidence signatures.
- The SVG draws one point per filtered event and can become visually dense before the 100,000-record safety ceiling.
- Virtualization means offscreen rows are not simultaneously present in the accessibility tree; keyboard movement, detail view, and export provide alternate access.
- Automated axe/Lighthouse scores do not replace human screen-reader, high-contrast, zoom, cognition, or motor-access testing.
- Service Worker offline behavior depends on successful production registration under HTTPS/localhost and sufficient browser storage.
- Browser storage can be cleared or evicted; the application is not a backup system.
- CSV formula mitigation cannot control how every downstream spreadsheet transforms imported cells.
- No hosted demo, deployment environment, availability SLO, or production monitoring is claimed by repository tests.
- The desktop package currently targets unsigned Windows x64 only; the browser PWA remains the other-platform option. It is not an OS-managed/signed installer.
- Desktop data is plaintext to the trusted OS owner. Static alias admission and product hashes are not protection from a malicious concurrent same-account process or cryptographic evidence authentication.
- The desktop uses a physical verified bundle without a Service Worker. An interrupted owner lock is preserved rather than silently adopted; pending accepted work can keep Exit waiting without a universal time bound.
