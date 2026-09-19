# Event data contract

## Limits

- File bytes: 10 MiB maximum after browser file selection.
- Records: 100,000 maximum.
- `id` and `correlationId`: 128 characters.
- `service`: 80 characters.
- `message`: 2,000 characters.
- Serialized metadata: 4,096 characters.

## Fields

| Field           | Required  | Type                                                      | Normalization                                                                                        |
| --------------- | --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `timestamp`     | Yes       | ISO date string or finite non-negative epoch milliseconds | Stored as ISO UTC plus `epochMs`.                                                                    |
| `severity`      | Yes       | String                                                    | Lowercase; `warn→warning`, `fatal→critical`, `debug→info`; final set is info/warning/error/critical. |
| `service`       | Yes       | String                                                    | Trimmed and bounded.                                                                                 |
| `message`       | Yes       | String                                                    | Trimmed and bounded; rendered as text only.                                                          |
| `id`            | No        | Restricted string                                         | Deterministic local hash-based fallback.                                                             |
| `correlationId` | No        | Restricted string                                         | Defaults to `uncorrelated`.                                                                          |
| `metadata`      | No        | Plain JSON object                                         | JSON round-trip clone and size bound.                                                                |
| `sequence`      | Generated | Non-negative integer                                      | Original input position for stable ties.                                                             |

Identifiers accept Unicode letters/numbers plus `.`, `_`, `:`, `/`, and `-`. Duplicate IDs after normalization are skipped with an issue.

## JSON formats

Array:

```json
[
  {
    "timestamp": "2026-01-01T00:00:00Z",
    "severity": "error",
    "service": "api",
    "message": "Upstream timeout",
    "correlationId": "chain-42"
  }
]
```

Envelope:

```json
{
  "schemaVersion": 1,
  "events": []
}
```

Unknown envelope properties are ignored. The top-level record collection must be an array.

## CSV format

Required headers are `timestamp,severity,service,message`. Optional headers are `id,correlationId,metadata`. Aliases `event_id`, `correlation_id`, and case-insensitive `correlationid` are normalized. Quoted commas, CRLF/LF rows, doubled quote escapes, and quoted newlines are supported. Duplicate normalized headers are rejected.

All other headers are rejected before records are constructed. This allowlist prevents untrusted column names such as `__proto__` from becoming object property writes.

Metadata cells attempt JSON parsing; invalid metadata text reaches domain validation and is skipped as an invalid record rather than executed.

## Ordering and identity

Events sort ascending by `epochMs`. Stable merge sort preserves source order when timestamps match. IDs are not used as a tie-breaker because doing so would destroy source evidence order. Generated IDs are deterministic for the same sequence, timestamp, service, and message but are not cryptographic identifiers.

## Export contract

JSON exports use `{ "schemaVersion": 1, "events": [...] }`. CSV exports quote every cell, use CRLF line endings, JSON-encode metadata, and prefix cells starting with `=`, `+`, `-`, or `@` with an apostrophe to reduce spreadsheet formula execution risk.
