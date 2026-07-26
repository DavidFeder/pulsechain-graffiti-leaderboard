import { decodeGraffiti } from '../decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../../utils/concurrency'
import { fetchWithRetry } from '../../utils/retry'
import type { GraffitiRecord } from './types'

/**
 * Fetch the current beacon head slot from the given API base URL.
 */
export async function fetchHeadSlot(
  base: string,
  signal?: AbortSignal
): Promise<number> {
  const headRes = await fetchWithRetry(
    `${base}/eth/v1/beacon/headers/head`,
    { signal },
    2
  )
  if (!headRes.ok) throw new Error('Failed to fetch head slot from beacon API')

  const headData = await headRes.json()
  return Number(headData.data.header.message.slot)
}

export interface FetchBlocksOptions {
  concurrency: number
  signal?: AbortSignal
  onProgress?: (completed: number, total: number) => void
}

/**
 * Fetch graffiti records for a list of slots with limited concurrency.
 * Returns only successfully decoded records (failed/missing slots are skipped).
 */
export async function fetchBlockRecords(
  base: string,
  slots: number[],
  options: FetchBlocksOptions
): Promise<GraffitiRecord[]> {
  const { concurrency, signal, onProgress } = options
  const total = slots.length
  let completed = 0

  const fetched = await fetchWithConcurrencyLimit(
    slots,
    async (slot, _index, fetchSignal) => {
      try {
        const res = await fetchWithRetry(
          `${base}/eth/v2/beacon/blocks/${slot}`,
          { signal: fetchSignal },
          1
        )
        if (!res.ok) {
          completed++
          onProgress?.(completed, total)
          return null
        }

        const block = await res.json()
        const g = decodeGraffiti(block?.data?.message?.body?.graffiti)

        completed++
        onProgress?.(completed, total)

        return { slot, graffiti: g } satisfies GraffitiRecord
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return null
        completed++
        onProgress?.(completed, total)
        return null
      }
    },
    concurrency,
    signal
  )

  return fetched.filter(Boolean) as GraffitiRecord[]
}
