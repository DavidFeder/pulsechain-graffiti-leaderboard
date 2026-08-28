import type { GraffitiRecord } from './types'

export function windowCutoff(headSlot: number, windowSize: number): number {
  return headSlot - windowSize + 1
}

/** When the chain has moved a full window (or more), skip delta fetch and reload. */
export function shouldFetchFullWindow(delta: number, windowSize: number): boolean {
  return delta >= windowSize
}

export function slotsInWindow(headSlot: number, windowSize: number): number[] {
  return Array.from({ length: windowSize }, (_, i) => headSlot - i)
}

export function newSlotsSince(lastKnownHead: number, currentHeadSlot: number): number[] {
  const delta = currentHeadSlot - lastKnownHead
  if (delta <= 0) return []
  return Array.from({ length: delta }, (_, i) => lastKnownHead + 1 + i)
}

/**
 * Merge cached + newly fetched records into the current sliding window.
 * Incoming records win on slot collisions. Result is sorted by slot ascending.
 */
export function mergeWindowRecords(
  existing: GraffitiRecord[],
  incoming: GraffitiRecord[],
  headSlot: number,
  windowSize: number
): GraffitiRecord[] {
  const cutoff = windowCutoff(headSlot, windowSize)
  const bySlot = new Map<number, GraffitiRecord>()

  for (const record of existing) {
    if (isRecordInWindow(record, cutoff, headSlot)) {
      bySlot.set(record.slot, record)
    }
  }

  for (const record of incoming) {
    if (isRecordInWindow(record, cutoff, headSlot)) {
      bySlot.set(record.slot, record)
    }
  }

  return Array.from(bySlot.values()).sort((a, b) => a.slot - b.slot)
}

function isRecordInWindow(record: GraffitiRecord, cutoff: number, headSlot: number): boolean {
  return (
    Number.isFinite(record.slot) &&
    typeof record.graffiti === 'string' &&
    record.slot >= cutoff &&
    record.slot <= headSlot
  )
}
