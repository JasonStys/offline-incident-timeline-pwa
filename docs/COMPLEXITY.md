# Algorithmic and resource complexity

Let `n` be records, `b` file bytes, `t` average unique searchable tokens per event, `k` filter candidate count, and `v` visible rows plus overscan.

| Operation                     |                               Time |     Auxiliary space | Notes                                                                            |
| ----------------------------- | ---------------------------------: | ------------------: | -------------------------------------------------------------------------------- |
| UTF-8 decode                  |                               O(b) |                O(b) | Transferred bytes avoid a main-thread buffer copy; decoded text still allocates. |
| JSON parse                    |                      O(b) expected |            O(n + b) | Native parser; complete document in memory.                                      |
| CSV tokenize                  |                               O(b) |            O(n + b) | Single pass supporting quotes and embedded newlines.                             |
| Record validation             |   O(n) plus metadata serialization |                O(n) | Chunk yield every 250 records enables cancellation.                              |
| Stable merge sort             |                         O(n log n) |                O(n) | Bottom-up and non-mutating; stable when comparator returns zero.                 |
| Index build                   |                           O(n × t) |            O(n × t) | Severity/service/correlation/token position sets.                                |
| Indexed filter                | O(sum of candidate-set checks + k) |                O(k) | Starts with the smallest set; result positions sort chronologically.             |
| Time-bound filter             |                               O(k) |                O(k) | Applied after indexed narrowing.                                                 |
| Virtual list render           |                               O(v) |      O(v) DOM nodes | Independent of total filtered result count.                                      |
| SVG render                    |                               O(k) |      O(k) SVG nodes | A future larger-scale view should aggregate points.                              |
| IndexedDB snapshot replace    |                        O(n) writes |      O(n) persisted | One atomic transaction and complete replacement.                                 |
| Export                        |                               O(k) |     O(output bytes) | Generates the complete filtered output in memory.                                |
| Service Worker runtime lookup |     Cache implementation dependent | ≤40 runtime entries | Shell cache is fixed; runtime cache uses bounded insertion-order eviction.       |

## Practical bounds

The 10 MiB/100,000-record limits keep worst-case allocations finite. They are safety ceilings, not promises that every mobile device will process the maximum comfortably. The checked benchmark uses 50,000 deterministic records and generous cross-run budgets; browser Lighthouse and E2E flows catch presentation regressions.

## Optimization choices

- Transfer the input buffer rather than structured-cloning it.
- Yield during normalization to process cancellation.
- Reuse exact-match/inverted indexes across filter updates.
- Preserve chronological order using integer positions rather than re-sorting event objects per query.
- Render list rows proportional to viewport size.
- Separate the table summary from thousands of SVG accessibility nodes.

## Growth triggers

Revisit the design if imports regularly exceed 100,000 records, files exceed 10 MiB, SVG points exceed useful visual density, IndexedDB writes cause long stalls, fuzzy search becomes required, or multi-user evidence retention becomes a product requirement.
