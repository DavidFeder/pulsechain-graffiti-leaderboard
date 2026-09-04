/**
 * Shared pure functions for aggregating graffiti data.
 * Used by both the main thread (as fallback) and the Web Worker.
 */

import type { GraffitiEntry, GraffitiRecord } from './beacon/types'

export interface AggregatedResult {
  entries: GraffitiEntry[]
  totalSlotsFetched: number
  slotsWithGraffiti: number
  uniqueGraffiti: number
}

export function isEmptyGraffiti(graffiti: string): boolean {
  return !graffiti || graffiti.trim().length === 0
}

interface GroupState {
  count: number
  exampleSlot: number
  variants: Map<string, number>
}

/**
 * Group graffiti case-insensitively (after trim). The displayed string is
 * the most common original spelling; ties keep the first-seen variant.
 */
export function computeLeaderboard(records: GraffitiRecord[]): AggregatedResult {
  const groups = new Map<string, GroupState>()
  let withGraffiti = 0

  for (const r of records) {
    const trimmed = r.graffiti.trim()
    if (isEmptyGraffiti(trimmed)) continue

    withGraffiti++
    const key = trimmed.toLocaleLowerCase()
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        count: 1,
        exampleSlot: r.slot,
        variants: new Map([[trimmed, 1]]),
      })
      continue
    }

    existing.count += 1
    if (r.slot > existing.exampleSlot) existing.exampleSlot = r.slot
    existing.variants.set(trimmed, (existing.variants.get(trimmed) || 0) + 1)
  }

  const sorted = Array.from(groups.values())
    .map(group => ({
      graffiti: pickDisplayVariant(group.variants),
      count: group.count,
      percentage: records.length > 0 ? (group.count / records.length) * 100 : 0,
      exampleSlot: group.exampleSlot,
    }))
    .sort((a, b) => b.count - a.count || a.graffiti.localeCompare(b.graffiti))

  return {
    entries: sorted,
    totalSlotsFetched: records.length,
    slotsWithGraffiti: withGraffiti,
    uniqueGraffiti: sorted.length,
  }
}

function pickDisplayVariant(variants: Map<string, number>): string {
  let best = ''
  let bestCount = -1
  for (const [text, count] of variants) {
    if (count > bestCount) {
      best = text
      bestCount = count
    }
  }
  return best
}

export type WorkerRequest = {
  type: 'AGGREGATE'
  requestId: number
  records: GraffitiRecord[]
}

export type WorkerResponse =
  | { type: 'AGGREGATE_RESULT'; requestId: number; result: AggregatedResult }
  | { type: 'ERROR'; requestId: number; error: string }
