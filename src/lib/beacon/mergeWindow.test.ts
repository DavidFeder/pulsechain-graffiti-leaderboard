import { describe, expect, it } from 'vitest'
import {
  mergeWindowRecords,
  newSlotsSince,
  shouldFetchFullWindow,
  slotsInWindow,
  windowCutoff,
} from './mergeWindow'

describe('mergeWindow', () => {
  it('computes cutoff and full-window slot lists', () => {
    expect(windowCutoff(1000, 500)).toBe(501)
    expect(slotsInWindow(10, 3)).toEqual([10, 9, 8])
    expect(newSlotsSince(10, 13)).toEqual([11, 12, 13])
    expect(newSlotsSince(13, 10)).toEqual([])
  })

  it('caps delta fetches once the chain has moved a full window', () => {
    expect(shouldFetchFullWindow(499, 500)).toBe(false)
    expect(shouldFetchFullWindow(500, 500)).toBe(true)
    expect(shouldFetchFullWindow(8000, 500)).toBe(true)
  })

  it('merges by slot, drops rows outside the window, and sorts', () => {
    const merged = mergeWindowRecords(
      [
        { slot: 8, graffiti: 'old-out' },
        { slot: 10, graffiti: 'keep' },
        { slot: 12, graffiti: 'stale' },
      ],
      [
        { slot: 12, graffiti: 'fresh' },
        { slot: 11, graffiti: 'new' },
      ],
      12,
      3
    )

    expect(merged).toEqual([
      { slot: 10, graffiti: 'keep' },
      { slot: 11, graffiti: 'new' },
      { slot: 12, graffiti: 'fresh' },
    ])
  })
})
