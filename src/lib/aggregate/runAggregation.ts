import { computeLeaderboard, type AggregatedResult, type WorkerRequest } from '../aggregateGraffiti'
import type { GraffitiRecord } from '../beacon/types'

/**
 * Run aggregation on the main thread (fallback when the Web Worker is unavailable).
 */
export function aggregateOnMainThread(records: GraffitiRecord[]): AggregatedResult {
  return computeLeaderboard(records)
}

/**
 * Post an aggregation request to the Web Worker.
 * The worker will respond via its onmessage handler with AGGREGATE_RESULT or ERROR.
 */
export function postAggregationToWorker(
  worker: Worker,
  records: GraffitiRecord[]
): void {
  const request: WorkerRequest = { type: 'AGGREGATE', records }
  worker.postMessage(request)
}
