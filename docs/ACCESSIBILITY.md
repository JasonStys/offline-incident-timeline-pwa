# Accessibility design

## Principles

- Use semantic headings, labels, buttons, forms, output/status regions, tables, and landmarks.
- Never rely only on color: every severity has text, the timeline has lanes/labels, and the chart has a table alternative.
- Preserve a strong visible focus indicator and a skip link.
- Respect system color scheme and reduced-motion preferences while allowing a local theme override.
- Render imported text through text nodes, which supports both security and assistive-technology consistency.

## Keyboard model

The event viewport is a labeled listbox. Focus it and use Arrow Up/Down, Home, or End. Selection updates `aria-activedescendant`, each rendered option exposes `aria-posinset` and `aria-setsize`, and the detail panel mirrors the selected record. Buttons and filters follow native keyboard behavior.

## Visualization alternative

The SVG is a high-level overview. Every point has an accessible label, but large charts are not an efficient sequential screen-reader experience. The adjacent table provides complete per-severity count and time-bound information, and the list/detail/export flows expose the underlying events without depending on SVG position.

## Virtualization trade-off

Only viewport rows plus overscan exist in the DOM. This bounds render cost but means assistive technology cannot browse every event as simultaneously present content. The component exposes total/position semantics, keyboard paging through every item, selected detail, and complete exports. A future very-large-data version should evaluate a paginated semantic table as an alternate mode.

## Automated and manual validation

Playwright runs axe WCAG A/AA checks in Chromium, Firefox, and WebKit after loading the real fixture. Unit tests verify hostile-looking imported strings stay text. Lighthouse enforces an accessibility score of 1. Manual screen-reader, zoom, high-contrast, and reduced-motion checks remain release checklist items because automated tools cannot judge comprehension.
