import { useState, useCallback } from 'react'
import { decodeGraffiti, isEmptyGraffiti } from '../lib/decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../utils/concurrency'

export interface GraffitiEntry {
  graffiti: string
  count: number
  percentage: number
}

export interface FetchResult {
  entries: GraffitiEntry[]
  totalSlotsRequested: number
  totalSlotsFetched: number
  slotsWithGraffiti: number
  uniqueGraffiti: number
  loading: boolean
  error: string | null
}

const BEACON_API = 'https://rpc-pulsechain.g4mm4.io/beacon-api'

const CONCURRENCY = 18 // Balanced for public RPCs

export function useBeaconGraffiti() {
  const [result, setResult] = useState<FetchResult>({
    entries: [],
    totalSlotsRequested: 0,
    totalSlotsFetched: 0,
    slotsWithGraffiti: 0,
    uniqueGraffiti: 0,
    loading: false,
    error: null,
  })

  const load = useCallback(async (slotCount: number) => {
    setResult(prev => ({ ...prev, loading: true, error: null }))

    try {
      // 1. Get current head slot
      const headRes = await fetch(`${BEACON_API}/eth/v1/beacon/headers/head`)
      if (!headRes.ok) throw new Error('Failed to fetch head slot')
      const headData = await headRes.json()
      const headSlot: number = Number(headData.data.header.message.slot)

      const slots = Array.from({ length: slotCount }, (_, i) => headSlot - i)

      // 2. Fetch blocks with concurrency limit
      let fetched = 0
      const rawResults = await fetchWithConcurrencyLimit(
        slots,
        async (slot, idx) => {
          try {
            const res = await fetch(`${BEACON_API}/eth/v2/beacon/blocks/${slot}`)
            if (!res.ok) return null

            const block = await res.json()
            const graffitiHex = block?.data?.message?.body?.graffiti
            const graffiti = decodeGraffiti(graffitiHex)

            fetched++
            // Optional: you could expose progress here via another state

            return { slot, graffiti }
          } catch {
            return null
          }
        },
        CONCURRENCY
      )

      // 3. Aggregate
      const counts = new Map<string, number>()
      let successfulFetches = 0
      let withGraffiti = 0

      for (const r of rawResults) {
        if (r) {
          successfulFetches++
          if (!isEmptyGraffiti(r.graffiti)) {
            withGraffiti++
            counts.set(r.graffiti, (counts.get(r.graffiti) || 0) + 1)
          }
        }
      }

      // 4. Build sorted leaderboard
      const sorted = Array.from(counts.entries())
        .map(([graffiti, count]) => ({
          graffiti,
          count,
          percentage: successfulFetches > 0 ? (count / successfulFetches) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)

      setResult({
        entries: sorted,
        totalSlotsRequested: slotCount,
        totalSlotsFetched: successfulFetches,
        slotsWithGraffiti: withGraffiti,
        uniqueGraffiti: sorted.length,
        loading: false,
        error: null,
      })
    } catch (err: any) {
      setResult(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load graffiti data',
      }))
    }
  }, [])

  return { result, load }
}
