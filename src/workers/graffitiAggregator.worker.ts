/// <reference lib="webworker" />

import { computeLeaderboard } from '../lib/aggregateGraffiti';
import type { WorkerRequest, WorkerResponse } from '../lib/aggregateGraffiti';

/**
 * Web Worker for heavy graffiti aggregation.
 */

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  if (message.type === 'AGGREGATE') {
    const requestId = message.requestId;
    try {
      const result = computeLeaderboard(message.records);
      const response: WorkerResponse = {
        type: 'AGGREGATE_RESULT',
        requestId,
        result,
      };
      self.postMessage(response);
    } catch (err) {
      const response: WorkerResponse = {
        type: 'ERROR',
        requestId,
        error: err instanceof Error ? err.message : 'Unknown aggregation error',
      };
      self.postMessage(response);
    }
  }
};
