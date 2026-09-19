/**
 * @file Verifies IndexedDB creation, v1-to-v2 migration, atomic replacement, corruption checks, metadata, clear, delete, and estimates.
 * Functions: openVersionOne helper and Vitest database cases.
 * Variables: IDBFactory instances and normalized event fixture.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { IDBFactory, IDBVersionChangeEvent } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeRecords } from "../../src/core/event.js";
import {
  DatabaseCorruptionError,
  deleteTimelineDatabase,
  estimateStorage,
  openTimelineDatabase,
} from "../../src/storage/database.js";

const event = normalizeRecords([
  {
    id: "evt-1",
    timestamp: "2026-01-01T00:00:00Z",
    severity: "info",
    service: "api",
    message: "Ready",
    correlationId: "chain-1",
  },
]).events[0];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TimelineDatabase", () => {
  it("replaces, reads, reports metadata, and clears events atomically", async () => {
    const factory = new IDBFactory();
    const database = await openTimelineDatabase({ factory, name: "round-trip" });
    await database.replaceEvents(event ? [event] : [], {
      source: "test",
      importedAt: "2026-01-01T00:00:00.000Z",
      issueCount: 0,
    });
    expect(await database.readEvents()).toEqual([event]);
    expect(await database.readLastImport()).toEqual({
      source: "test",
      importedAt: "2026-01-01T00:00:00.000Z",
      issueCount: 0,
    });
    await database.clear();
    expect(await database.readEvents()).toEqual([]);
    expect(await database.readLastImport()).toBeUndefined();
    database.close();
    await deleteTimelineDatabase({ factory, name: "round-trip" });
  });

  it("adds the correlation index while migrating a version-one database", async () => {
    const factory = new IDBFactory();
    await openVersionOne(factory, "migration");
    const database = await openTimelineDatabase({ factory, name: "migration" });
    const transaction = database.database.transaction("events", "readonly");
    expect(transaction.objectStore("events").indexNames.contains("byCorrelation")).toBe(true);
    database.close();
  });

  it("detects corrupt persisted records", async () => {
    const factory = new IDBFactory();
    const database = await openTimelineDatabase({ factory, name: "corruption" });
    const transaction = database.database.transaction("events", "readwrite");
    transaction.objectStore("events").put({ id: "bad", severity: "unknown" });
    await new Promise((resolve) => {
      transaction.oncomplete = resolve;
    });
    await expect(database.readEvents()).rejects.toBeInstanceOf(DatabaseCorruptionError);
    database.close();
  });

  it("reports storage estimates and handles unsupported estimates", async () => {
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 1_000 }) },
    });
    await expect(estimateStorage()).resolves.toEqual({ usage: 100, quota: 1_000 });
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: vi.fn().mockResolvedValue({}) },
    });
    await expect(estimateStorage()).resolves.toEqual({ usage: null, quota: null });
    Object.defineProperty(navigator, "storage", { configurable: true, value: undefined });
    await expect(estimateStorage()).resolves.toEqual({ usage: null, quota: null });
  });

  it("surfaces open errors and blocked deletion without hanging", async () => {
    /** @type {Partial<IDBOpenDBRequest> & Record<string, unknown>} */
    const openRequest = {};
    const openFactory = /** @type {IDBFactory} */ (
      /** @type {unknown} */ ({ open: () => openRequest })
    );
    const opening = openTimelineDatabase({ factory: openFactory, name: "open-error" });
    const typedOpenRequest = /** @type {IDBOpenDBRequest} */ (/** @type {unknown} */ (openRequest));
    typedOpenRequest.onerror?.call(typedOpenRequest, new Event("error"));
    await expect(opening).rejects.toThrow("Unable to open IndexedDB");

    /** @type {Partial<IDBOpenDBRequest> & Record<string, unknown>} */
    const deleteRequest = {};
    const deleteFactory = /** @type {IDBFactory} */ (
      /** @type {unknown} */ ({ deleteDatabase: () => deleteRequest })
    );
    const deleting = deleteTimelineDatabase({ factory: deleteFactory, name: "delete-blocked" });
    const typedDeleteRequest = /** @type {IDBOpenDBRequest} */ (
      /** @type {unknown} */ (deleteRequest)
    );
    typedDeleteRequest.onblocked?.call(
      typedDeleteRequest,
      new IDBVersionChangeEvent("blocked", { oldVersion: 1, newVersion: 2 }),
    );
    await expect(deleting).rejects.toThrow("blocked");
  });
});

/**
 * Creates the historical schema used by the migration test.
 * @param {IDBFactory} factory Fake factory.
 * @param {string} name Database name.
 * @returns {Promise<void>}
 */
function openVersionOne(factory, name) {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => {
      const events = request.result.createObjectStore("events", { keyPath: "id" });
      events.createIndex("byTimestamp", "epochMs");
      events.createIndex("bySeverity", "severity");
      events.createIndex("byService", "service");
      request.result.createObjectStore("meta", { keyPath: "key" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
  });
}
