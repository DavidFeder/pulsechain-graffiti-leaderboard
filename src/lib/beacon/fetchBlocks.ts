import { decodeGraffiti } from '../decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../../utils/concurrency'
import { fetchWithRetry, isAbortError, throwIfAborted, type RetryInfo } from '../../utils/retry'
import type { GraffitiRecord } from './types'
import { orderedEndpoints } from './endpoints'

export type BeaconRetryHandler = (info: RetryInfo) => void

export interface SlotFetchSummary {
  records: GraffitiRecord[]
  missingCount: number
  failedSlots: number[]
  fallbackSuccesses: number
}

type SlotOutcome =
  | { kind: 'ok'; record: GraffitiRecord; usedFallback: boolean }
  | { kind: 'missing'; usedFallback: boolean }
  | { kind: 'failed' }

function endpointList(bases: string | readonly string[]): string[] {
  return typeof bases === 'string' ? [bases] : [...bases]
}

/**
 * Fetch the current beacon head slot, trying failover bases if needed.
 */
export async function fetchHeadSlot(
  bases: string | readonly string[],
  signal?: AbortSignal,
  onRetry?: BeaconRetryHandler
): Promise<number> {
  const list = endpointList(bases)
  let lastError: unknown = new Error('Failed to fetch head slot from beacon API')

  for (const base of list) {
    throwIfAborted(signal)
    try {
      const headRes = await fetchWithRetry(
        `${base}/eth/v1/beacon/headers/head`,
        { signal, onRetry },
        list.length > 1 ? 0 : 2
      )
      if (!headRes.ok) {
        lastError = new Error('Failed to fetch head slot from beacon API')
        continue
      }

      const headData = await headRes.json()
      const slot = Number(headData?.data?.header?.message?.slot)
      if (!Number.isFinite(slot) || slot < 0) {
        lastError = new Error('Beacon API returned an invalid head slot')
        continue
      }
      return slot
    } catch (err) {
      if (isAbortError(err)) throw err
      lastError = err
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to fetch head slot from beacon API')
}

export interface FetchBlocksOptions {
  concurrency: number
  signal?: AbortSignal
  onProgress?: (completed: number, total: number) => void
  onRetry?: BeaconRetryHandler
}

/**
 * Fetch graffiti records for a list of slots with limited concurrency.
 *
 * 404 is a missed proposal (no block). Other failures are retried on the
 * failover endpoint. AbortError is rethrown so callers do not persist a
 * partial window.
 */
export async function fetchBlockRecords(
  bases: string | readonly string[],
  slots: number[],
  options: FetchBlocksOptions
): Promise<SlotFetchSummary> {
  const { concurrency, signal, onProgress, onRetry } = options
  const endpoints = typeof bases === 'string' ? orderedEndpoints(bases) : [...bases]
  const total = slots.length
  let completed = 0

  const fetched = await fetchWithConcurrencyLimit(
    slots,
    async (slot, _index, fetchSignal) => {
      const outcome = await fetchOneSlot(endpoints, slot, fetchSignal, onRetry)
      completed++
      onProgress?.(completed, total)
      return outcome
    },
    concurrency,
    signal
  )

  throwIfAborted(signal)

  const records: GraffitiRecord[] = []
  const failedSlots: number[] = []
  let missingCount = 0
  let fallbackSuccesses = 0

  for (let i = 0; i < slots.length; i++) {
    const outcome = fetched[i]
    if (!outcome || outcome.kind === 'failed') {
      failedSlots.push(slots[i])
      continue
    }
    if (outcome.kind === 'missing') {
      missingCount++
      if (outcome.usedFallback) fallbackSuccesses++
      continue
    }
    records.push(outcome.record)
    if (outcome.usedFallback) fallbackSuccesses++
  }

  return { records, missingCount, failedSlots, fallbackSuccesses }
}

async function fetchOneSlot(
  bases: string[],
  slot: number,
  signal: AbortSignal | undefined,
  onRetry?: BeaconRetryHandler
): Promise<SlotOutcome> {
  for (let i = 0; i < bases.length; i++) {
    throwIfAborted(signal)
    const base = bases[i]
    const usedFallback = i > 0

    try {
      const res = await fetchWithRetry(
        `${base}/eth/v2/beacon/blocks/${slot}`,
        { signal, onRetry },
        0
      )

      if (res.status === 404) {
        return { kind: 'missing', usedFallback }
      }

      if (res.ok) {
        const block = await res.json()
        return {
          kind: 'ok',
          usedFallback,
          record: {
            slot,
            graffiti: decodeGraffiti(block?.data?.message?.body?.graffiti),
          },
        }
      }
    } catch (err) {
      if (isAbortError(err)) throw err
    }
  }

  return { kind: 'failed' }
}
