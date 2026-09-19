# Offline operations and recovery runbook

## When to use this runbook

Use it when the application does not install, fails to reload offline, reports an unavailable cache, shows corrupt local data, or appears stuck on an older deployment.

## Normal lifecycle

1. A production build registers `service-worker.js` under the current deployment scope.
2. Installation atomically precaches the shell. A failed `addAll` leaves the previous worker active.
3. Activation removes only old caches with the application prefix.
4. Navigation uses the network first and falls back to the cached request or `index.html`.
5. Same-origin static requests are cache-first and populate a 40-entry runtime cache.
6. A new worker waits; the UI says an update is ready after reload.

## Offline verification

1. Start a production preview with `npm run build && npm run preview`.
2. Load the page online and wait for **Offline cache ready**.
3. Load the demo incident and verify it was saved.
4. Disable the network in developer tools and reload.
5. Confirm the shell appears, network status says **Offline**, and 15 events restore.

The automated Chromium test performs the same sequence.

## Corrupt local data

Symptoms: startup status reports invalid local records and the timeline remains empty.

1. Preserve the original source file outside the application.
2. Select **Clear local data**.
3. Reload and re-import the known-good source.
4. If clear is blocked, close other tabs using the site and retry.
5. As a last resort, clear this site's storage through browser settings; this removes cached shell and IndexedDB data.

## Stale application shell

1. Reload once so a waiting worker can activate through the normal lifecycle.
2. Confirm the deployment serves the new deterministic `assets/app.js`, `assets/app.css`, and matching worker cache version.
3. Inspect Service Worker status and cache names in developer tools.
4. If the active worker is broken, unregister it and clear only this site's cache, then reload online.

## Database upgrade blocked

The open helper closes its handle on `versionchange`, but another old tab may still block a migration. Close all tabs for the application, reopen one tab, and retry. Do not delete the database unless the saved source can be re-imported.

## Rollback

Static deployment rollback restores the previous `dist` artifact. Because database migrations are additive and version 2 retains the version 1 stores/indexes, the previous release can still read event records; it simply ignores the new correlation index. If a future migration is not backward compatible, export data before deployment and document a forward-repair migration rather than relying on database downgrade.

## Escalation evidence

Record browser/version, deployment commit, worker state, scope, cache names, database version, error status text, online/offline state, and reproduction steps using synthetic data. Do not attach private event logs.
