/**
 * Shared pure functions for aggregating graffiti data.
 * Used by both the main thread (as fallback) and the Web Worker.
 */

export interface AggregatedResult {
  entries: Array<{
    graffiti: string;
    count: number;
    percentage: number;
  }>;
  totalSlotsFetched: number;
  slotsWithGraffiti: number;
  uniqueGraffiti: number;
}

export function isEmptyGraffiti(graffiti: string): boolean {
  return !graffiti || graffiti.length === 0;
}

export function computeLeaderboard(
  records: Array<{ slot: number; graffiti: string }>
): AggregatedResult {
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

// =============================================
// Strongly Typed Worker Message Protocol
// =============================================

export type WorkerRequest = {
  type: 'AGGREGATE';
  records: Array<{ slot: number; graffiti: string }>;
};

export type WorkerResponse =
  | { type: 'AGGREGATE_RESULT'; result: AggregatedResult }
  | { type: 'ERROR'; error: string };
