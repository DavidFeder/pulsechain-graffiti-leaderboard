/// <reference lib="webworker" />

/**
 * Web Worker for heavy graffiti aggregation.
 * This keeps the main thread completely free, making cache hydration feel instant
 * even for large windows (500-2000 slots).
 */

export interface WorkerRecord {
  slot: number;
  graffiti: string;
}

export interface WorkerResult {
  entries: Array<{
    graffiti: string;
    count: number;
    percentage: number;
  }>;
  totalSlotsFetched: number;
  slotsWithGraffiti: number;
  uniqueGraffiti: number;
}

// Pure functions duplicated here so the worker has no external dependencies

function isEmptyGraffiti(graffiti: string): boolean {
  return !graffiti || graffiti.length === 0;
}

function computeLeaderboard(records: WorkerRecord[]): WorkerResult {
  const counts = new Map<string, number>();
  let withGraffiti = 0;

  for (const r of records) {
    if (!isEmptyGraffiti(r.graffiti)) {
      withGraffiti++;
      counts.set(r.graffiti, (counts.get(r.graffiti) || 0) + 1);
    }
  }

  const sorted = Array.from(counts.entries())
    .map(([graffiti, count]) => ({
      graffiti,
      count,
      percentage: records.length > 0 ? (count / records.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    entries: sorted,
    totalSlotsFetched: records.length,
    slotsWithGraffiti: withGraffiti,
    uniqueGraffiti: sorted.length,
  };
}

// Message protocol
self.onmessage = (event: MessageEvent) => {
  const { type, records } = event.data;

  if (type === 'AGGREGATE' && Array.isArray(records)) {
    try {
      const result = computeLeaderboard(records);
      self.postMessage({
        type: 'AGGREGATE_RESULT',
        result,
      });
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        error: err instanceof Error ? err.message : 'Unknown aggregation error',
      });
    }
  }
};

// Optional: for future - we could also move decoding here if we ever send raw hex
