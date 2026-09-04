/**
 * Decide whether a slot-window fetch is complete enough to persist and display
 * as the new canonical cache.
 *
 * 404 / missing slots are missed proposals (normal). 429/5xx/network failures
 * are holes that must not replace a good cached window.
 */
export interface FetchOutcomeInput {
  requested: number
  missingCount: number
  failedCount: number
}

export type LoadCommitAction = 'persist' | 'keep-previous' | 'show-partial' | 'error'

export function isPersistableFetch(input: FetchOutcomeInput): boolean {
  if (input.failedCount > 0) return false
  // An entire request of 404s is almost certainly a bad endpoint, not a
  // coincidental run of missed proposals.
  if (input.requested >= 8 && input.missingCount === input.requested) return false
  return true
}

export function decideLoadCommit(input: {
  persistable: boolean
  hasCachedWindow: boolean
  recordCount: number
}): LoadCommitAction {
  if (input.persistable) return 'persist'
  if (input.hasCachedWindow) return 'keep-previous'
  if (input.recordCount > 0) return 'show-partial'
  return 'error'
}

export function incompleteFetchMessage(failedCount: number, showingPartial: boolean): string {
  const slots = failedCount === 1 ? '1 slot' : `${failedCount} slots`
  if (showingPartial) {
    return `Could not fetch ${slots} from the beacon API. Results may be incomplete — use Full refresh to retry.`
  }
  return `Could not fetch ${slots} from the beacon API. Showing previous results — use Full refresh to retry.`
}
