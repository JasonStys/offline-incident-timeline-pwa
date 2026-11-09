# UTC incident windows

**From (UTC, inclusive)** and **Through (UTC, inclusive)** narrow the current incident before
visualization and export. Both fields explicitly mean UTC regardless of your device timezone.
Native controls may display localized calendar text, but the application parses their values as
UTC and rejects impossible dates instead of allowing JavaScript to normalize them silently.

Leave either bound blank for an open-ended window. Seconds and milliseconds are supported. Equal
bounds select records at the exact same millisecond; records on both endpoints are included. A
record supplied with an explicit offset is normalized to the same UTC instant during import.
Severity, service, correlation and token criteria are combined with the time window using AND.

A reversed/invalid range has a visible alert, marks the time controls invalid, clears derived views
and disables exports. The original imported data remains in IndexedDB. A valid range with zero
matches instead says **No events match** and offers adjustment/reset guidance. Correct a value or
choose **Reset filters** to recover. Invalid URL values are shown as an invalid filter state rather
than silently turning into an unbounded search.

The allowlisted URL filter keys include `from` and `to`. They preserve UTC criteria on reload and
offline recovery. Do not share URLs containing sensitive query terms or investigation details.
No event records, metadata, file content or credentials are placed in these URLs automatically.
Exports contain only currently matching evidence and are generated locally without a network upload.

## Implementation and tests

| File                             | Purpose                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `src/state/time-window.js`       | Strict UTC calendar round-trip validation and inclusive ordered bounds        |
| `src/app.js`                     | Form integration, invalid/no-match states, export disabling and derived views |
| `src/state/url-state.js`         | Bounded allowlisted UTC filter persistence                                    |
| `src/core/event-index.js`        | Existing index intersection followed by inclusive millisecond comparison      |
| `tests/unit/time-window.test.js` | UTC/DST/leap/calendar/epoch/boundary regression evidence                      |
| `tests/e2e/time-window.spec.js`  | Analyst import/filter/export/recovery and offline journeys                    |

The Service Worker cache namespace is now v2 so an older cached shell does not mask the controls.
There is no IndexedDB migration for this feature: the existing normalized event schema is unchanged.
`INCIDENT_BROWSER_PORT` selects an owned strict-port browser test server; an occupied port fails
instead of reusing an unrelated service. `INCIDENT_LIGHTHOUSE_PORT` similarly selects the audit
preview, and the audit waits for its own listener announcement before making HTTP requests.
