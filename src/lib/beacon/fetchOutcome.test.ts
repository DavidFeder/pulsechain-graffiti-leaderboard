import { describe, expect, it } from 'vitest'
import { decideLoadCommit, isPersistableFetch } from './fetchOutcome'

describe('isPersistableFetch', () => {
  it('allows a complete fetch including missed proposals', () => {
    expect(isPersistableFetch({ requested: 500, missingCount: 12, failedCount: 0 })).toBe(true)
  })

  it('rejects any API/network slot failure', () => {
    expect(isPersistableFetch({ requested: 10, missingCount: 0, failedCount: 1 })).toBe(false)
  })

  it('rejects an implausible all-404 response', () => {
    expect(isPersistableFetch({ requested: 8, missingCount: 8, failedCount: 0 })).toBe(false)
    expect(isPersistableFetch({ requested: 3, missingCount: 3, failedCount: 0 })).toBe(true)
  })
})

describe('decideLoadCommit', () => {
  it('persists complete fetches', () => {
    expect(decideLoadCommit({ persistable: true, hasCachedWindow: false, recordCount: 10 })).toBe(
      'persist'
    )
  })

  it('keeps the previous cache when a refresh is incomplete', () => {
    expect(decideLoadCommit({ persistable: false, hasCachedWindow: true, recordCount: 4 })).toBe(
      'keep-previous'
    )
  })

  it('shows a partial window only when there is nothing cached', () => {
    expect(decideLoadCommit({ persistable: false, hasCachedWindow: false, recordCount: 4 })).toBe(
      'show-partial'
    )
  })

  it('errors when every slot fails and there is no cache', () => {
    expect(decideLoadCommit({ persistable: false, hasCachedWindow: false, recordCount: 0 })).toBe(
      'error'
    )
  })
})
