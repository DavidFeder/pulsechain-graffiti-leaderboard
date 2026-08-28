import { describe, expect, it } from 'vitest'
import { computeLeaderboard, isEmptyGraffiti } from './aggregateGraffiti'

describe('computeLeaderboard', () => {
  it('counts, sorts, and reports percentages against all fetched records', () => {
    const result = computeLeaderboard([
      { slot: 1, graffiti: 'aaa' },
      { slot: 2, graffiti: 'bbb' },
      { slot: 3, graffiti: 'aaa' },
      { slot: 4, graffiti: '' },
    ])

    expect(result.totalSlotsFetched).toBe(4)
    expect(result.slotsWithGraffiti).toBe(3)
    expect(result.uniqueGraffiti).toBe(2)
    expect(result.entries[0]).toMatchObject({ graffiti: 'aaa', count: 2, percentage: 50, exampleSlot: 3 })
    expect(result.entries[1]).toMatchObject({ graffiti: 'bbb', count: 1, percentage: 25, exampleSlot: 2 })
  })

  it('groups case-insensitively and keeps the most common spelling', () => {
    const result = computeLeaderboard([
      { slot: 10, graffiti: 'pls' },
      { slot: 11, graffiti: 'PLS' },
      { slot: 12, graffiti: 'PLS' },
    ])

    expect(result.uniqueGraffiti).toBe(1)
    expect(result.entries[0].graffiti).toBe('PLS')
    expect(result.entries[0].count).toBe(3)
    expect(result.entries[0].exampleSlot).toBe(12)
  })

  it('treats whitespace-only graffiti as empty', () => {
    expect(isEmptyGraffiti('   ')).toBe(true)
    const result = computeLeaderboard([{ slot: 1, graffiti: '   ' }])
    expect(result.slotsWithGraffiti).toBe(0)
    expect(result.entries).toEqual([])
  })
})
