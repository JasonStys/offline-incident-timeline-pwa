# Contributing

## Development workflow

1. Create a focused branch.
2. Install the exact dependency graph with `npm ci`.
3. Make the smallest cohesive change.
4. Update tests and documentation in the same commit.
5. Run `npm run code-index` and `npm run file-catalog` after source or file-layout changes.
6. Run `npm run verify`, `npm run test:e2e`, and `npm run audit`.

## Code standards

- Keep the application framework-free and use browser standards directly.
- Treat files, IndexedDB content, worker messages, URL values, and cached responses as untrusted boundaries.
- Prefer pure functions in `src/core` and isolate browser effects behind small modules.
- Use explicit bounds, safe failure messages, stable ordering, and text-only DOM insertion.
- Add JSDoc to public functions/classes and retain each file's responsibility/function/variable header.
- Document exact symbols through the generated `docs/CODE_INDEX.md`; never hand-maintain drifting line numbers.
- Comment design intent, invariants, and non-obvious safety behavior rather than restating syntax.

## Pull-request evidence

Include the problem, design trade-off, tests added, validation commands, screenshots only when UI changes need them, accessibility impact, performance impact, offline/cache impact, and rollback plan. Never attach private operational logs.
