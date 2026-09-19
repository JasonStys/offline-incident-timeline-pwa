/**
 * @file Captures bounded in-memory operation durations and optional browser long-task observations.
 * Functions: measureOperation, recentMetrics, observeLongTasks.
 * Variables: MAX_METRICS, metrics.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

const MAX_METRICS = 100;
/** @type {{name: string, durationMs: number, recordedAt: string}[]} */
const metrics = [];

/**
 * Times synchronous or asynchronous application work and records a bounded metric sample.
 * @template T
 * @param {string} name Stable operation name.
 * @param {() => T | Promise<T>} operation Work to measure.
 * @returns {Promise<T>} Operation result.
 */
export async function measureOperation(name, operation) {
  const start = performance.now();
  try {
    return await operation();
  } finally {
    metrics.push({
      name,
      durationMs: Number((performance.now() - start).toFixed(3)),
      recordedAt: new Date().toISOString(),
    });
    if (metrics.length > MAX_METRICS) {
      metrics.splice(0, metrics.length - MAX_METRICS);
    }
  }
}

/**
 * Returns a defensive copy suitable for local diagnostics.
 * @returns {{name: string, durationMs: number, recordedAt: string}[]} Metric samples.
 */
export function recentMetrics() {
  return metrics.map((metric) => ({ ...metric }));
}

/**
 * Observes long tasks where supported and returns a disconnect callback.
 * @param {(durationMs: number) => void} onLongTask Observer called for each duration.
 * @returns {() => void} Cleanup callback.
 */
export function observeLongTasks(onLongTask) {
  if (!("PerformanceObserver" in globalThis)) {
    return () => {};
  }
  const supported = PerformanceObserver.supportedEntryTypes?.includes("longtask") ?? false;
  if (!supported) {
    return () => {};
  }
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      onLongTask(Number(entry.duration.toFixed(2)));
    }
  });
  observer.observe({ type: "longtask", buffered: true });
  return () => observer.disconnect();
}
