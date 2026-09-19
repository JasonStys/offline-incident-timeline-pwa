# Deployment checklist

**Release:** Static PWA artifact
**Deployer:** Repository maintainer
**Target:** HTTPS static hosting under a known scope

## Pre-deploy

- [ ] `npm ci` completes from the checked lockfile on Node.js 24.
- [ ] Formatting, ESLint, strict JavaScript types, unit/property tests, and coverage pass.
- [ ] Chromium, Firefox, and WebKit flows pass.
- [ ] Offline reload and worker cancellation pass in Chromium.
- [ ] axe finds no WCAG A/AA violations in the populated critical flow.
- [ ] Lighthouse accessibility, best-practice, SEO, and performance budgets pass.
- [ ] 50,000-record benchmark stays within checked budgets.
- [ ] `npm audit --audit-level=high`, dependency review, CodeQL, and repository validation pass.
- [ ] `docs/CODE_INDEX.md` and `docs/FILE_CATALOG.md` are current.
- [ ] No real operational, customer, credential, or private data is present.
- [ ] Service Worker cache version was deliberately changed if shell semantics changed.
- [ ] Hosting path/scope, HTTPS, MIME types, and security headers were verified in staging.
- [ ] Previous `dist` artifact and commit are available for rollback.

## Deploy

- [ ] Build once with `npm run build`; deploy that immutable `dist` artifact.
- [ ] Confirm `index.html`, deterministic app assets, generated worker chunk, manifest, icon, fixture, and Service Worker return 200.
- [ ] Confirm the Service Worker scope covers only the intended application path.
- [ ] Load the demo, filter a failure chain, export, reload, and inspect persisted data.
- [ ] Disable network and verify shell/database recovery.
- [ ] Re-enable network and verify update/status behavior.

## Post-deploy

- [ ] Confirm no console errors, failed precache requests, or blocked database upgrades.
- [ ] Run one keyboard-only and one screen-reader smoke path.
- [ ] Verify 320-pixel layout, 200% zoom, reduced motion, and light/dark themes.
- [ ] Record release commit, artifact checksum, smoke-test time, and known limitations.
- [ ] Update release notes and validation report.

## Rollback triggers

- Application shell fails online or offline.
- Existing valid IndexedDB records cannot be read after upgrade.
- Import can partially replace saved data or cancellation commits records.
- Critical flow has a keyboard blocker or new serious accessibility violation.
- Security scan reports a new high/critical finding.
- Lighthouse performance falls below 0.90 or accessibility below 1.00 on the defined desktop profile.

## Rollback procedure

1. Restore the previous immutable static artifact.
2. Do not delete user IndexedDB data.
3. Verify the previous worker activates after the normal reload lifecycle.
4. Run the online/offline smoke path.
5. Open a root-cause issue using synthetic reproduction data.
6. Ship a forward-compatible migration or cache fix; never attempt an IndexedDB version downgrade.
