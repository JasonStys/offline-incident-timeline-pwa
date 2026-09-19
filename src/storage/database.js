/**
 * @file Owns versioned IndexedDB migrations, atomic event replacement, metadata, and recovery.
 * Functions: openTimelineDatabase, migrateSchema, requestResult, transactionDone, deleteTimelineDatabase, estimateStorage; class: TimelineDatabase.
 * Variables: DATABASE_NAME, DATABASE_VERSION, EVENT_STORE, META_STORE.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { normalizeRecords } from "../core/event.js";

/** @import {IncidentEvent} from "../core/event.js" */

export const DATABASE_NAME = "incident-timeline";
export const DATABASE_VERSION = 2;
const EVENT_STORE = "events";
const META_STORE = "meta";

/** Error raised when persisted records no longer satisfy the current data contract. */
export class DatabaseCorruptionError extends Error {
  /** @param {string} message Safe recovery-oriented message. */
  constructor(message) {
    super(message);
    this.name = "DatabaseCorruptionError";
  }
}

/** Thin transaction-safe persistence boundary for timeline records. */
export class TimelineDatabase {
  /** @param {IDBDatabase} database Open database handle. */
  constructor(database) {
    this.database = database;
  }

  /**
   * Atomically replaces the complete event snapshot and its import metadata.
   * @param {readonly IncidentEvent[]} events Validated events.
   * @param {{source: string, importedAt: string, issueCount: number}} metadata Import evidence.
   * @returns {Promise<void>}
   */
  async replaceEvents(events, metadata) {
    const transaction = this.database.transaction([EVENT_STORE, META_STORE], "readwrite");
    const eventStore = transaction.objectStore(EVENT_STORE);
    eventStore.clear();
    for (const event of events) {
      eventStore.put(event);
    }
    transaction.objectStore(META_STORE).put({ key: "lastImport", value: metadata });
    await transactionDone(transaction);
  }

  /**
   * Reads and revalidates persisted events to detect corruption or incompatible manual edits.
   * @returns {Promise<IncidentEvent[]>} Chronologically ordered events.
   * @throws {DatabaseCorruptionError} When any persisted record is invalid.
   */
  async readEvents() {
    const transaction = this.database.transaction(EVENT_STORE, "readonly");
    const stored = await requestResult(transaction.objectStore(EVENT_STORE).getAll());
    await transactionDone(transaction);
    const { events, issues } = normalizeRecords(stored);
    if (issues.length > 0) {
      throw new DatabaseCorruptionError(
        `Local data contains ${issues.length} invalid record${issues.length === 1 ? "" : "s"}. Clear local data and re-import.`,
      );
    }
    return events;
  }

  /**
   * Reads the last successful import metadata when available.
   * @returns {Promise<unknown>} Metadata value or undefined.
   */
  async readLastImport() {
    const transaction = this.database.transaction(META_STORE, "readonly");
    const result = await requestResult(transaction.objectStore(META_STORE).get("lastImport"));
    await transactionDone(transaction);
    return result?.value;
  }

  /**
   * Clears timeline records and metadata inside one transaction.
   * @returns {Promise<void>}
   */
  async clear() {
    const transaction = this.database.transaction([EVENT_STORE, META_STORE], "readwrite");
    transaction.objectStore(EVENT_STORE).clear();
    transaction.objectStore(META_STORE).clear();
    await transactionDone(transaction);
  }

  /** Closes the browser database handle. */
  close() {
    this.database.close();
  }
}

/**
 * Opens the current schema and runs idempotent upgrade steps.
 * @param {{factory?: IDBFactory, name?: string}} [options] Injectable test dependencies.
 * @returns {Promise<TimelineDatabase>} Open persistence boundary.
 */
export function openTimelineDatabase(options = {}) {
  const factory = options.factory ?? indexedDB;
  const name = options.name ?? DATABASE_NAME;
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DATABASE_VERSION);
    request.onupgradeneeded = (event) =>
      migrateSchema(request.result, request.transaction, event.oldVersion);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
    request.onblocked = () => reject(new Error("Database upgrade is blocked by another open tab."));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(new TimelineDatabase(database));
    };
  });
}

/**
 * Deletes a named database for explicit corruption recovery or test isolation.
 * @param {{factory?: IDBFactory, name?: string}} [options] Injectable test dependencies.
 * @returns {Promise<void>}
 */
export function deleteTimelineDatabase(options = {}) {
  const factory = options.factory ?? indexedDB;
  const name = options.name ?? DATABASE_NAME;
  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(name);
    request.onerror = () => reject(request.error ?? new Error("Unable to delete IndexedDB."));
    request.onblocked = () =>
      reject(new Error("Database deletion is blocked by another open tab."));
    request.onsuccess = () => resolve();
  });
}

/**
 * Reports browser storage usage without treating unavailable estimates as failure.
 * @returns {Promise<{usage: number | null, quota: number | null}>}
 */
export async function estimateStorage() {
  if (!navigator.storage?.estimate) {
    return { usage: null, quota: null };
  }
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? null, quota: estimate.quota ?? null };
}

/**
 * Applies additive versioned migrations during the exclusive upgrade transaction.
 * @param {IDBDatabase} database Upgrading database.
 * @param {IDBTransaction | null} transaction Upgrade transaction.
 * @param {number} oldVersion Previous schema version.
 * @returns {void}
 */
function migrateSchema(database, transaction, oldVersion) {
  if (!transaction) {
    throw new Error("IndexedDB upgrade transaction is unavailable.");
  }
  let eventStore;
  if (oldVersion < 1) {
    eventStore = database.createObjectStore(EVENT_STORE, { keyPath: "id" });
    eventStore.createIndex("byTimestamp", "epochMs");
    eventStore.createIndex("bySeverity", "severity");
    eventStore.createIndex("byService", "service");
    database.createObjectStore(META_STORE, { keyPath: "key" });
  } else {
    eventStore = transaction.objectStore(EVENT_STORE);
  }
  if (oldVersion < 2 && !eventStore.indexNames.contains("byCorrelation")) {
    eventStore.createIndex("byCorrelation", "correlationId");
  }
}

/**
 * Converts an IndexedDB request callback into a typed promise.
 * @template T
 * @param {IDBRequest<T>} request IndexedDB request.
 * @returns {Promise<T>} Request result.
 */
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

/**
 * Resolves only after a transaction commits, preserving atomicity evidence.
 * @param {IDBTransaction} transaction IndexedDB transaction.
 * @returns {Promise<void>}
 */
function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}
