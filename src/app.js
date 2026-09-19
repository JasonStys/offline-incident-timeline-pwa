/**
 * @file Coordinates imports, persistence, indexed filtering, accessible rendering, exports, and recovery.
 * Functions: startApplication, setEvidenceActionsDisabled, requiredElement, loadDemo, commitImport, applyFilters, renderDetails, updateStorageStatus, setNetworkStatus.
 * Variables: database, parserClient, events, eventIndex, filteredEvents, controls, virtualList.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { EventIndex } from "./core/event-index.js";
import { normalizeRecords } from "./core/event.js";
import { downloadText } from "./io/download.js";
import { serializeEventsCsv, serializeEventsJson } from "./io/export.js";
import { parseLogText } from "./io/parse.js";
import { measureOperation, observeLongTasks } from "./performance/metrics.js";
import { registerServiceWorker } from "./pwa/register.js";
import { readUrlFilters, writeUrlFilters } from "./state/url-state.js";
import {
  DatabaseCorruptionError,
  estimateStorage,
  openTimelineDatabase,
} from "./storage/database.js";
import { renderSummaryTable, renderTimelineChart } from "./ui/timeline-chart.js";
import { VirtualEventList } from "./ui/virtual-list.js";
import { ParserWorkerClient } from "./worker/client.js";

/** @import {IncidentEvent, ValidationIssue} from "./core/event.js" */
/**
 * @typedef {object} AppControls
 * @property {HTMLOutputElement} networkStatus
 * @property {HTMLOutputElement} storageStatus
 * @property {HTMLOutputElement} operationStatus
 * @property {HTMLSelectElement} themeSelect
 * @property {HTMLButtonElement} demoButton
 * @property {HTMLLabelElement} fileLabel
 * @property {HTMLInputElement} fileInput
 * @property {HTMLButtonElement} cancelButton
 * @property {HTMLButtonElement} clearButton
 * @property {HTMLFormElement} filterForm
 * @property {HTMLInputElement} searchInput
 * @property {HTMLSelectElement} severitySelect
 * @property {HTMLSelectElement} serviceSelect
 * @property {HTMLInputElement} correlationInput
 * @property {HTMLButtonElement} resetFilters
 * @property {HTMLParagraphElement} filterSummary
 * @property {HTMLButtonElement} exportJson
 * @property {HTMLButtonElement} exportCsv
 * @property {SVGSVGElement} timelineChart
 * @property {HTMLTableSectionElement} timelineTableBody
 * @property {HTMLDivElement} eventList
 * @property {HTMLDivElement} eventDetail
 */

/**
 * Boots the application and installs all event handlers after the static shell is available.
 * @returns {Promise<() => void>} Cleanup callback for tests or controlled teardown.
 */
export async function startApplication() {
  const controls = collectControls();
  setEvidenceActionsDisabled(controls, true);
  const database = await openTimelineDatabase();
  const parserClient = new ParserWorkerClient();
  /** @type {IncidentEvent[]} */
  let events = [];
  /** @type {IncidentEvent[]} */
  let filteredEvents = [];
  let eventIndex = new EventIndex([]);
  let latestLongTaskMs = 0;
  const virtualList = new VirtualEventList(controls.eventList, {
    onSelect: (event) => renderDetails(controls.eventDetail, event),
  });

  const disconnectLongTasks = observeLongTasks((durationMs) => {
    latestLongTaskMs = Math.max(latestLongTaskMs, durationMs);
  });

  /** Updates derived state and every event-dependent view. */
  const render = () => {
    const filters = readControlFilters(controls);
    filteredEvents = eventIndex.filter(filters);
    writeUrlFilters(filters);
    controls.filterSummary.textContent = `${filteredEvents.length.toLocaleString()} of ${events.length.toLocaleString()} events shown${latestLongTaskMs > 0 ? ` · longest observed main-thread task ${latestLongTaskMs.toFixed(0)} ms` : ""}.`;
    controls.exportJson.disabled = filteredEvents.length === 0;
    controls.exportCsv.disabled = filteredEvents.length === 0;
    renderTimelineChart(controls.timelineChart, filteredEvents);
    renderSummaryTable(controls.timelineTableBody, filteredEvents);
    virtualList.setItems(filteredEvents);
  };

  /**
   * Replaces application state after a successful atomic persistence operation.
   * @param {readonly IncidentEvent[]} nextEvents Validated events.
   */
  const applyEvents = (nextEvents) => {
    events = [...nextEvents];
    eventIndex = new EventIndex(events);
    populateServices(controls.serviceSelect, eventIndex.services());
    render();
  };

  /**
   * Persists one validated import before exposing it in the UI.
   * @param {{events: IncidentEvent[], issues: ValidationIssue[]}} result Worker or fixture result.
   * @param {string} source Safe source label.
   */
  const commitImport = async (result, source) => {
    if (result.events.length === 0) {
      throw new Error("Import contained no valid events.");
    }
    await database.replaceEvents(result.events, {
      source,
      importedAt: new Date().toISOString(),
      issueCount: result.issues.length,
    });
    applyEvents(result.events);
    controls.operationStatus.textContent = `${result.events.length.toLocaleString()} events loaded${issueSummary(result.issues)}.`;
    await updateStorageStatus(controls.storageStatus);
  };

  const handleFile = async () => {
    const file = controls.fileInput.files?.[0];
    if (!file) {
      return;
    }
    setEvidenceActionsDisabled(controls, true);
    controls.cancelButton.disabled = false;
    controls.operationStatus.textContent = `Reading ${file.name}…`;
    try {
      const result = await measureOperation("worker-import", () =>
        parserClient.parse(file, (processed, total) => {
          controls.operationStatus.textContent = `Validating ${processed.toLocaleString()} of ${total.toLocaleString()} records…`;
        }),
      );
      await commitImport(result, file.name);
    } catch (error) {
      controls.operationStatus.textContent =
        error instanceof DOMException && error.name === "AbortError"
          ? "Import canceled. Previous data was preserved."
          : `Import failed: ${error instanceof Error ? error.message : "Unknown error."}`;
    } finally {
      controls.cancelButton.disabled = true;
      controls.fileInput.value = "";
      setEvidenceActionsDisabled(controls, false);
    }
  };

  const handleDemo = async () => {
    setEvidenceActionsDisabled(controls, true);
    controls.operationStatus.textContent = "Loading demo incident…";
    try {
      const result = await measureOperation("demo-import", loadDemo);
      await commitImport(result, "bundled synthetic fixture");
    } catch (error) {
      controls.operationStatus.textContent = `Demo load failed: ${error instanceof Error ? error.message : "Unknown error."}`;
    } finally {
      setEvidenceActionsDisabled(controls, false);
    }
  };

  const handleClear = async () => {
    setEvidenceActionsDisabled(controls, true);
    try {
      await database.clear();
      applyEvents([]);
      controls.operationStatus.textContent = "Local incident data cleared.";
      await updateStorageStatus(controls.storageStatus);
    } catch (error) {
      controls.operationStatus.textContent = `Clear failed: ${error instanceof Error ? error.message : "Unknown error."}`;
    } finally {
      setEvidenceActionsDisabled(controls, false);
    }
  };

  controls.filterForm.addEventListener("input", render);
  controls.resetFilters.addEventListener("click", () => {
    controls.filterForm.reset();
    render();
  });
  controls.fileInput.addEventListener("change", () => void handleFile());
  controls.demoButton.addEventListener("click", () => void handleDemo());
  controls.cancelButton.addEventListener("click", () => parserClient.cancel());
  controls.clearButton.addEventListener("click", () => void handleClear());
  controls.exportJson.addEventListener("click", () =>
    downloadText("incident-timeline.json", serializeEventsJson(filteredEvents), "application/json"),
  );
  controls.exportCsv.addEventListener("click", () =>
    downloadText("incident-timeline.csv", serializeEventsCsv(filteredEvents), "text/csv"),
  );

  const urlFilters = readUrlFilters();
  setControlFilters(controls, urlFilters);
  initializeTheme(controls.themeSelect);
  setNetworkStatus(controls.networkStatus);
  window.addEventListener("online", () => setNetworkStatus(controls.networkStatus));
  window.addEventListener("offline", () => setNetworkStatus(controls.networkStatus));
  await registerServiceWorker((message, state) => {
    controls.storageStatus.textContent = message;
    controls.storageStatus.dataset.state = state;
  });

  try {
    const storedEvents = await database.readEvents();
    applyEvents(storedEvents);
    controls.operationStatus.textContent =
      storedEvents.length > 0
        ? `Restored ${storedEvents.length.toLocaleString()} locally saved events.`
        : "Ready";
  } catch (error) {
    if (error instanceof DatabaseCorruptionError) {
      controls.operationStatus.textContent = error.message;
      applyEvents([]);
    } else {
      throw error;
    }
  }
  await updateStorageStatus(controls.storageStatus);
  setEvidenceActionsDisabled(controls, false);

  return () => {
    disconnectLongTasks();
    virtualList.destroy();
    parserClient.terminate();
    database.close();
  };
}

/**
 * Prevents startup restoration, imports, and clearing from mutating the same evidence concurrently.
 * @param {AppControls} controls Application controls.
 * @param {boolean} disabled Whether evidence-changing actions are unavailable.
 * @returns {void}
 */
function setEvidenceActionsDisabled(controls, disabled) {
  controls.demoButton.disabled = disabled;
  controls.fileInput.disabled = disabled;
  controls.clearButton.disabled = disabled;
  controls.fileLabel.setAttribute("aria-disabled", String(disabled));
}

/**
 * Fetches and validates the bundled synthetic incident fixture.
 * @returns {Promise<{events: IncidentEvent[], issues: ValidationIssue[]}>} Validated fixture.
 */
async function loadDemo() {
  const response = await fetch(new URL("fixtures/sample-incidents.json", document.baseURI));
  if (!response.ok) {
    throw new Error(`Fixture request failed with HTTP ${response.status}.`);
  }
  const text = await response.text();
  return normalizeRecords(parseLogText(text, "json"));
}

/**
 * Renders selected event fields using text nodes only.
 * @param {HTMLElement} container Detail panel content.
 * @param {IncidentEvent | null} event Selected event.
 * @returns {void}
 */
function renderDetails(container, event) {
  if (!event) {
    container.className = "empty-state";
    container.textContent = "Select an event to inspect its fields.";
    return;
  }
  container.className = "";
  const list = document.createElement("dl");
  list.className = "detail-grid";
  /** @type {[string, string][]} */
  const fields = [
    ["Timestamp", event.timestamp],
    ["Severity", event.severity],
    ["Service", event.service],
    ["Correlation", event.correlationId],
    ["Message", event.message],
    ["Event ID", event.id],
    ["Metadata", JSON.stringify(event.metadata) ?? "{}"],
  ];
  for (const [label, value] of fields) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    list.append(term, description);
  }
  container.replaceChildren(list);
}

/**
 * Populates a service selector while preserving a still-valid selection.
 * @param {HTMLSelectElement} select Service control.
 * @param {readonly string[]} services Sorted services.
 * @returns {void}
 */
function populateServices(select, services) {
  const previous = select.dataset.pendingValue ?? select.value;
  const options = services.map((service) => {
    const option = document.createElement("option");
    option.value = service;
    option.textContent = service;
    return option;
  });
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All services";
  select.replaceChildren(all, ...options);
  if (services.includes(previous)) {
    select.value = previous;
  }
  delete select.dataset.pendingValue;
}

/**
 * Converts validation diagnostics into a concise import suffix.
 * @param {readonly ValidationIssue[]} issues Validation diagnostics.
 * @returns {string} Summary suffix.
 */
function issueSummary(issues) {
  return issues.length === 0
    ? ""
    : `; ${issues.length.toLocaleString()} invalid or duplicate record${issues.length === 1 ? " was" : "s were"} skipped`;
}

/**
 * Reads current controls into the EventIndex and URL-state contract.
 * @param {AppControls} controls Application controls.
 * @returns {{query: string, severity: string, service: string, correlationId: string}} Filters.
 */
function readControlFilters(controls) {
  return {
    query: controls.searchInput.value,
    severity: controls.severitySelect.value,
    service: controls.serviceSelect.value,
    correlationId: controls.correlationInput.value,
  };
}

/**
 * Applies URL-derived filters without dispatching intermediate input events.
 * @param {AppControls} controls Application controls.
 * @param {{query: string, severity: string, service: string, correlationId: string}} filters URL filters.
 * @returns {void}
 */
function setControlFilters(controls, filters) {
  controls.searchInput.value = filters.query;
  controls.severitySelect.value = filters.severity;
  controls.correlationInput.value = filters.correlationId;
  controls.serviceSelect.dataset.pendingValue = filters.service;
}

/**
 * Applies stored theme preference and persists future user selections.
 * @param {HTMLSelectElement} select Theme control.
 * @returns {void}
 */
function initializeTheme(select) {
  const stored = localStorage.getItem("incident-timeline-theme");
  const theme = stored && ["system", "light", "dark"].includes(stored) ? stored : "system";
  document.documentElement.dataset.theme = theme;
  select.value = theme;
  select.addEventListener("change", () => {
    document.documentElement.dataset.theme = select.value;
    localStorage.setItem("incident-timeline-theme", select.value);
  });
}

/**
 * Updates online/offline status with both text and non-color state.
 * @param {HTMLOutputElement} output Network status output.
 * @returns {void}
 */
function setNetworkStatus(output) {
  output.textContent = navigator.onLine ? "Online" : "Offline";
  output.dataset.state = navigator.onLine ? "good" : "warning";
}

/**
 * Reports approximate local usage without exposing a false precision percentage.
 * @param {HTMLOutputElement} output Storage status output.
 * @returns {Promise<void>}
 */
async function updateStorageStatus(output) {
  const estimate = await estimateStorage();
  if (estimate.usage === null) {
    if (!output.textContent?.includes("cache")) {
      output.textContent = "Local storage ready";
    }
    output.dataset.state = "good";
    return;
  }
  output.textContent = `${(estimate.usage / 1024).toFixed(0)} KiB local use`;
  output.dataset.state = "good";
}

/**
 * Resolves a required element and verifies its runtime interface.
 * @template {Element} T
 * @param {string} id Element ID.
 * @param {{new (...args: never[]): T}} expectedConstructor Expected DOM constructor.
 * @returns {T} Typed required element.
 */
function requiredElement(id, expectedConstructor) {
  const element = document.getElementById(id);
  if (!(element instanceof expectedConstructor)) {
    throw new Error(`Required element #${id} is missing or has the wrong type.`);
  }
  return element;
}

/**
 * Resolves all required static-shell controls once during startup.
 * @returns {AppControls} Typed application control collection.
 */
function collectControls() {
  return {
    networkStatus: requiredElement("network-status", HTMLOutputElement),
    storageStatus: requiredElement("storage-status", HTMLOutputElement),
    operationStatus: requiredElement("operation-status", HTMLOutputElement),
    themeSelect: requiredElement("theme-select", HTMLSelectElement),
    demoButton: requiredElement("demo-button", HTMLButtonElement),
    fileLabel: requiredElement("file-label", HTMLLabelElement),
    fileInput: requiredElement("file-input", HTMLInputElement),
    cancelButton: requiredElement("cancel-button", HTMLButtonElement),
    clearButton: requiredElement("clear-button", HTMLButtonElement),
    filterForm: requiredElement("filter-form", HTMLFormElement),
    searchInput: requiredElement("search-input", HTMLInputElement),
    severitySelect: requiredElement("severity-select", HTMLSelectElement),
    serviceSelect: requiredElement("service-select", HTMLSelectElement),
    correlationInput: requiredElement("correlation-input", HTMLInputElement),
    resetFilters: requiredElement("reset-filters", HTMLButtonElement),
    filterSummary: requiredElement("filter-summary", HTMLParagraphElement),
    exportJson: requiredElement("export-json", HTMLButtonElement),
    exportCsv: requiredElement("export-csv", HTMLButtonElement),
    timelineChart: requiredElement("timeline-chart", SVGSVGElement),
    timelineTableBody: requiredElement("timeline-table-body", HTMLTableSectionElement),
    eventList: requiredElement("event-list", HTMLDivElement),
    eventDetail: requiredElement("event-detail", HTMLDivElement),
  };
}
