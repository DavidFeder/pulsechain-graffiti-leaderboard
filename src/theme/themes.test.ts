import { describe, expect, it } from 'vitest'
import { themeFromSearch, themeHref } from './themes'

describe('themeFromSearch', () => {
  it('stays on Classic when the URL has no theme', () => {
    expect(themeFromSearch('')).toBe('classic')
    expect(themeFromSearch('?foo=1')).toBe('classic')
  })

  it('ignores unknown theme ids', () => {
    expect(themeFromSearch('?theme=nope')).toBe('classic')
  })

  it('reads a known theme id', () => {
    expect(themeFromSearch('?theme=neon')).toBe('neon')
    expect(themeFromSearch('?utm=1&theme=ledger')).toBe('ledger')
  })
})

describe('themeHref', () => {
  it('sets the theme query and keeps the path', () => {
    expect(themeHref('arcade', 'https://leaderboard.example/?x=1')).toBe('/?x=1&theme=arcade')
  })
})
