# Security design and threat model

## Assets and boundaries

Assets are imported event content, locally persisted records, generated exports, application integrity, and user trust. Untrusted boundaries are selected files, URL parameters, IndexedDB records, worker messages, cached responses, and dependency/build inputs.

No server, identity, telemetry, or upload boundary exists. This reduces exposure but does not make a shared browser profile a secure evidence vault.

## Threats and controls

| Threat                              | Control                                                                                                                         | Residual risk                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Markup/script injection in messages | DOM creation and `textContent`; static gate bans `innerHTML`, `eval`, `Function`, and `document.write`.                         | Browser/extension compromise remains outside scope.                                        |
| Memory/CPU exhaustion               | 10 MiB, 100k records, bounded fields/metadata, worker execution, chunk yield, cancellation.                                     | Pathological but bounded inputs can still be slow on low-end devices.                      |
| Worker message spoofing             | Versioned allowlisted envelopes, bounded request IDs, one active import.                                                        | Same-origin compromised script could still send messages.                                  |
| Partial/corrupt persistence         | Validate first; one atomic transaction; startup revalidation; explicit recovery.                                                | Device crash/storage eviction can lose local data.                                         |
| Duplicate/ambiguous records         | Duplicate ID rejection and stable source-order ties.                                                                            | Source clock skew and semantic duplicates cannot be inferred reliably.                     |
| CSV formula execution               | Prefix formula-leading cells and quote every field.                                                                             | Consumers may strip the apostrophe or interpret other vendor-specific formulas.            |
| URL data leakage                    | Allowlist and length-bound four filter fields; never serialize events/metadata.                                                 | Users may put sensitive text in a search filter.                                           |
| Cross-context messages              | Validate worker protocol envelopes and reject explicit foreign origins; service-worker commands require the application origin. | Dedicated-worker messages use an empty origin, so their strict protocol remains essential. |
| Dynamic object property writes      | CSV headers are normalized, deduplicated, and checked against an explicit field allowlist before fixed-property assignment.     | JSON imports remain untrusted until domain validation.                                     |
| Cache poisoning/staleness           | Same-origin GET only, HTTPS deployment assumption, deterministic shell, versioned caches, bounded runtime cache, update notice. | A compromised origin controls both network and Service Worker responses.                   |
| Supply-chain compromise             | Exact lockfile, `npm ci`, high-severity audit, Dependabot, dependency review, CodeQL, immutable Action SHAs.                    | Audits cannot detect every malicious package or zero-day.                                  |
| Local confidentiality loss          | Documentation warns against real/private data; explicit clear control; no remote transmission.                                  | Other users/extensions/processes with profile/device access may read IndexedDB or exports. |

## Data retention

The most recent successful import replaces the previous snapshot. Data remains until replaced, cleared through the UI, evicted by the browser, or site storage is cleared. The application does not implement retention timers because it cannot reliably classify user data.

## Deployment requirements

- Serve through HTTPS (localhost is acceptable for development) so Service Workers are available.
- Set an explicit Content Security Policy at the hosting layer when supported: restrict scripts, workers, styles, connections, images, objects, and base URIs to the smallest needed set.
- Do not add analytics, remote fonts, CDNs, or upload endpoints without a new privacy/security decision record.
- Review cache scope when deploying under a repository subpath.

## Incident handling

For a suspected flaw, preserve the affected commit and synthetic reproduction, disable the hosted demo if ongoing exposure exists, fix the smallest boundary, add a regression test, rotate the cache version when cached code changed, run the full verification/audit matrix, and document remaining risk.
