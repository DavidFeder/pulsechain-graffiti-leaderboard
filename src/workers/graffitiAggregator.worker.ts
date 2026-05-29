/// <reference lib="webworker" />

import { isEmptyGraffiti, computeLeaderboard } from '../lib/aggregateGraffiti';

/**
 * Web Worker for heavy graffiti aggregation.
 * This keeps the main thread completely free.
 */

export interface WorkerRecord {
  slot: number;
  graffiti: string;
}

// Re-export for type consistency
export type { AggregatedResult as WorkerResult } from '../lib/aggregateGraffiti';

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
