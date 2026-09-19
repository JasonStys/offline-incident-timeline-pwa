# Research and standards notes

The implementation favors platform documentation and normative/standards-oriented accessibility guidance.

## Browser platform

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) — lifecycle, secure-context requirement, interception, and offline use.
- [MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) — explicit request/response storage and cache behavior.
- [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB) — version upgrades, transactions, object stores, and blocked upgrades.
- [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) — isolated execution and message-based communication.
- [MDN: Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) — ownership transfer and detached source buffers.
- [MDN: Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) — types and limitations used by workers and IndexedDB.
- [WHATWG HTML: Web workers](https://html.spec.whatwg.org/multipage/workers.html) — worker processing model and messaging.
- [W3C Service Workers specification](https://w3c.github.io/ServiceWorker/) — lifecycle, fetch interception, registration, and scope model.

## Accessibility

- [W3C WAI: Complex images](https://www.w3.org/WAI/tutorials/images/complex/) — charts need concise identification plus a complete text equivalent.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — perceivable, operable, understandable, and robust requirements.
- [WAI-ARIA Authoring Practices: Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — keyboard and selection semantics used by the event viewport.
- [W3C: Understanding Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) — visible focus design.

## Engineering interpretation

- Transfer is used only for the input `ArrayBuffer`; normalized objects return through structured cloning because they must remain readable on the worker until posting completes.
- IndexedDB schema changes occur only in `onupgradeneeded`; application writes await transaction completion rather than only request success.
- The Service Worker does not force activation. Waiting plus an explicit update message avoids replacing code while an investigation is in progress.
- The accessible table is the authoritative alternative for overview statistics; thousands of per-point SVG nodes would be slower and harder to navigate.
- Exact filter indexes are chosen over general full-text search to keep behavior explainable and bounded.

Sources were reviewed on 2026-09-18. Compatibility must be rechecked when the browser support baseline changes.
