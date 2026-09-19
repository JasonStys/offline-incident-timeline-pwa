/**
 * @file Keeps DOM work proportional to visible rows while preserving keyboard selection semantics.
 * Functions: formatTime, createEventRow; class: VirtualEventList.
 * Variables: DEFAULT_ROW_HEIGHT, DEFAULT_OVERSCAN, items, selectedIndex, spacer.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/** @import {IncidentEvent} from "../core/event.js" */

const DEFAULT_ROW_HEIGHT = 72;
const DEFAULT_OVERSCAN = 4;

/** Virtualized, keyboard-navigable listbox for chronologically ordered events. */
export class VirtualEventList {
  /**
   * Initializes the viewport and stable event handlers.
   * @param {HTMLElement} container Scrollable element with listbox semantics.
   * @param {{rowHeight?: number, overscan?: number, onSelect?: (event: IncidentEvent | null) => void}} [options] Behavior options.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.overscan = options.overscan ?? DEFAULT_OVERSCAN;
    this.onSelect = options.onSelect ?? (() => {});
    /** @type {IncidentEvent[]} */
    this.items = [];
    this.selectedIndex = -1;
    this.spacer = document.createElement("div");
    this.spacer.className = "virtual-spacer";
    this.container.replaceChildren(this.spacer);
    this.scrollHandler = () => this.render();
    /** @type {(event: KeyboardEvent) => void} */
    this.keyHandler = (event) => this.handleKey(event);
    this.container.addEventListener("scroll", this.scrollHandler, { passive: true });
    this.container.addEventListener("keydown", this.keyHandler);
  }

  /**
   * Replaces list data, retains selection by ID where possible, and renders the visible window.
   * @param {readonly IncidentEvent[]} items Filtered events.
   * @returns {void}
   */
  setItems(items) {
    const selectedId = this.items[this.selectedIndex]?.id;
    this.items = [...items];
    this.selectedIndex = selectedId ? this.items.findIndex((event) => event.id === selectedId) : -1;
    if (this.selectedIndex < 0 && this.items.length > 0) {
      this.selectedIndex = 0;
    }
    this.spacer.style.height = `${this.items.length * this.rowHeight}px`;
    this.container.setAttribute("aria-activedescendant", this.activeRowId());
    this.render();
    this.onSelect(this.items[this.selectedIndex] ?? null);
  }

  /**
   * Renders visible and overscan rows based on the current scroll position.
   * @returns {void}
   */
  render() {
    const visibleCount = Math.ceil(this.container.clientHeight / this.rowHeight);
    const firstVisible = Math.floor(this.container.scrollTop / this.rowHeight);
    const start = Math.max(0, firstVisible - this.overscan);
    const end = Math.min(this.items.length, firstVisible + visibleCount + this.overscan);
    const rows = [];
    for (let index = start; index < end; index += 1) {
      const event = this.items[index];
      if (event) {
        rows.push(
          createEventRow(
            event,
            index,
            this.items.length,
            this.rowHeight,
            index === this.selectedIndex,
            () => this.select(index, true),
          ),
        );
      }
    }
    this.spacer.replaceChildren(...rows);
  }

  /**
   * Moves selection and optionally transfers focus to the newly rendered row.
   * @param {number} index Target index.
   * @param {boolean} focusRow Whether to focus the row button.
   * @returns {void}
   */
  select(index, focusRow) {
    if (index < 0 || index >= this.items.length) {
      return;
    }
    this.selectedIndex = index;
    const top = index * this.rowHeight;
    const bottom = top + this.rowHeight;
    if (top < this.container.scrollTop) {
      this.container.scrollTop = top;
    } else if (bottom > this.container.scrollTop + this.container.clientHeight) {
      this.container.scrollTop = bottom - this.container.clientHeight;
    }
    this.container.setAttribute("aria-activedescendant", this.activeRowId());
    this.render();
    this.onSelect(this.items[index] ?? null);
    if (focusRow) {
      document.getElementById(this.activeRowId())?.focus();
    }
  }

  /**
   * Handles Arrow, Home, and End navigation from the list or a row.
   * @param {KeyboardEvent} event Keyboard event.
   * @returns {void}
   */
  handleKey(event) {
    const keyTargets = new Map([
      ["ArrowDown", Math.min(this.items.length - 1, this.selectedIndex + 1)],
      ["ArrowUp", Math.max(0, this.selectedIndex - 1)],
      ["Home", 0],
      ["End", this.items.length - 1],
    ]);
    const target = keyTargets.get(event.key);
    if (target === undefined || target < 0) {
      return;
    }
    event.preventDefault();
    this.select(target, true);
  }

  /** Removes listeners when the application shell is torn down. */
  destroy() {
    this.container.removeEventListener("scroll", this.scrollHandler);
    this.container.removeEventListener("keydown", this.keyHandler);
  }

  /** @returns {string} Active descendant ID or an empty string. */
  activeRowId() {
    return this.selectedIndex >= 0 ? `event-row-${this.selectedIndex}` : "";
  }
}

/**
 * Builds one text-only option row without innerHTML or untrusted markup.
 * @param {IncidentEvent} event Incident event.
 * @param {number} index Zero-based list position.
 * @param {number} total Total filtered events.
 * @param {number} rowHeight Fixed row height.
 * @param {boolean} selected Selection state.
 * @param {() => void} onSelect Click callback.
 * @returns {HTMLButtonElement} Event option.
 */
function createEventRow(event, index, total, rowHeight, selected, onSelect) {
  const row = document.createElement("button");
  row.type = "button";
  row.id = `event-row-${index}`;
  row.className = "event-row";
  row.style.top = `${index * rowHeight}px`;
  row.setAttribute("role", "option");
  row.setAttribute("aria-selected", String(selected));
  row.setAttribute("aria-posinset", String(index + 1));
  row.setAttribute("aria-setsize", String(total));
  row.addEventListener("click", onSelect);

  const severity = document.createElement("span");
  severity.className = `severity-badge severity-${event.severity}`;
  severity.textContent = event.severity;
  const service = document.createElement("strong");
  service.textContent = event.service;
  const message = document.createElement("span");
  message.className = "event-row-message";
  message.textContent = event.message;
  const details = document.createElement("span");
  details.className = "event-row-correlation";
  details.textContent = `${formatTime(event.timestamp)} · ${event.correlationId}`;
  row.append(severity, service, message, details);
  return row;
}

/**
 * Formats a timestamp as a concise local time.
 * @param {string} timestamp ISO timestamp.
 * @returns {string} Local time.
 */
function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}
