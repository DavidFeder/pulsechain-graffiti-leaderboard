import { describe, expect, it } from 'vitest'
import { isCachedWindow } from '../storage'
import { isQuickCacheSnapshot } from './quickCache'

describe('cache parsers', () => {
  it('rejects malformed window caches', () => {
    expect(isCachedWindow(null)).toBe(false)
    expect(isCachedWindow({ version: 1, records: [{ slot: '1', graffiti: 'x' }] })).toBe(false)
    expect(
      isCachedWindow({
        version: 1,
        windowSize: 500,
        lastHeadSlot: 10,
        cachedAt: 1,
        records: [{ slot: 10, graffiti: 'ok' }],
      })
    ).toBe(true)
  })

  it('rejects malformed quick snapshots', () => {
    expect(isQuickCacheSnapshot({ cachedAt: 1, lastHeadSlot: 2, totalSlotsRequested: 500 })).toBe(
      false
    )
    expect(
      isQuickCacheSnapshot({
        cachedAt: 1,
        lastHeadSlot: 2,
        totalSlotsRequested: 500,
        entries: [{ graffiti: 'x', count: 1, percentage: 1, exampleSlot: 2 }],
      })
    ).toBe(true)
  })
})
