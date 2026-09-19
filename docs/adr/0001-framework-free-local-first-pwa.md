# ADR-0001: Framework-free local-first progressive web application

**Status:** Accepted
**Date:** 2026-09-18
**Decider:** Repository maintainer

## Context

The portfolio already demonstrates typed frontend frameworks elsewhere. This project must instead prove direct JavaScript and browser-API competence while supporting offline reload, local persistence, responsive parsing, accessible visualization, deterministic tests, and a small deployment surface.

## Decision

Build the application with modern JavaScript modules, semantic HTML, CSS, a dedicated Web Worker, IndexedDB, SVG, and a hand-authored Service Worker. Use Vite only as a standards-based build/dev tool; it is not an application runtime dependency. Persist one validated snapshot locally and keep all analysis on the device.

## Options considered

### Option A: Framework-free modules and browser APIs

| Dimension               | Assessment                                                                  |
| ----------------------- | --------------------------------------------------------------------------- |
| Complexity              | Medium: lifecycle and DOM updates are explicit.                             |
| Cost                    | Static hosting only.                                                        |
| Scalability             | Strong for bounded single-device analysis; limited for collaboration.       |
| Learning/reviewer value | High direct evidence of platform knowledge.                                 |
| Maintenance             | Small runtime dependency surface; browser behavior must be tested directly. |

**Pros:** transparent data flow, minimal runtime supply chain, strong browser fundamentals, easy static deployment.
**Cons:** more bespoke state/render code, no framework component ecosystem, manual accessibility discipline.

### Option B: Component framework plus PWA plug-in

| Dimension               | Assessment                                                     |
| ----------------------- | -------------------------------------------------------------- |
| Complexity              | Low-to-medium application code; additional build abstractions. |
| Cost                    | Static hosting only.                                           |
| Scalability             | Good UI composition.                                           |
| Learning/reviewer value | Lower for the targeted JavaScript/platform gap.                |
| Maintenance             | Larger dependency graph and plug-in upgrade surface.           |

**Pros:** mature component patterns, router/state ecosystem, generated Service Worker options.
**Cons:** hides browser lifecycle details, duplicates skills shown elsewhere, increases runtime/tool coupling.

### Option C: Server-backed incident dashboard

| Dimension               | Assessment                                            |
| ----------------------- | ----------------------------------------------------- |
| Complexity              | High: API, database, auth, deployment, privacy.       |
| Cost                    | Ongoing service/database hosting.                     |
| Scalability             | Best for multi-user and continuous ingestion.         |
| Learning/reviewer value | Strong full-stack evidence but dilutes browser focus. |
| Maintenance             | Multiple operational boundaries.                      |

**Pros:** collaboration, durable centralized history, server-side search.
**Cons:** conflicts with offline/local privacy goal and creates unnecessary sensitive-data risk.

## Trade-off analysis

Option A most directly satisfies the repository's evidence goal and keeps the trust boundary on one device. The explicit lifecycle code is intentional engineering work rather than accidental complexity. Vite remains acceptable as build tooling because the deployed application uses standards-native modules and APIs, not a framework runtime.

## Consequences

- Browser contracts and failure handling remain visible and testable.
- Cross-browser E2E testing is mandatory because no framework compatibility layer exists.
- IndexedDB migrations and Service Worker cache versions require deliberate maintenance.
- This design will not become a collaborative production incident platform without new backend, identity, privacy, and retention decisions.

## Action items

- [x] Implement versioned worker and database protocols.
- [x] Document cache, migration, recovery, and rollback procedures.
- [x] Add unit/property, cross-browser, accessibility, offline, and cancellation tests.
- [x] Enforce performance and supply-chain budgets in CI.
