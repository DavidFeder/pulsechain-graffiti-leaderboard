import { useState, useCallback, useEffect } from 'react'
import { decodeGraffiti, isEmptyGraffiti } from '../lib/decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../utils/concurrency'
import { saveCachedWindow, loadCachedWindow, clearCachedWindow, isCacheStale } from '../lib/storage'

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
  progress: number
  error: string | null
  // New cache-aware fields
  isFromCache: boolean
  cachedAt: number | null
  lastHeadSlot: number | null
  newSlotsAvailable: number
}

export interface CachedWindow {
  version: 1
  windowSize: number
  lastHeadSlot: number
  records: Array<{ slot: number; graffiti: string }>
  cachedAt: number
}

const BEACON_API = 'https://rpc-pulsechain.g4mm4.io/beacon-api'

const CONCURRENCY = 18

function aggregateFromRecords(records: Array<{ slot: number; graffiti: string }>) {
  const counts = new Map<string, number>()
  let withGraffiti = 0

  for (const r of records) {
    if (!isEmptyGraffiti(r.graffiti)) {
      withGraffiti++
      counts.set(r.graffiti, (counts.get(r.graffiti) || 0) + 1)
    }
  }

  const sorted: GraffitiEntry[] = Array.from(counts.entries())
    .map(([graffiti, count]) => ({
      graffiti,
      count,
      percentage: records.length > 0 ? (count / records.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    entries: sorted,
    totalSlotsFetched: records.length,
    slotsWithGraffiti: withGraffiti,
    uniqueGraffiti: sorted.length,
  }
}

export function useBeaconGraffiti() {
  const [result, setResult] = useState<FetchResult>({
    entries: [],
    totalSlotsRequested: 0,
    totalSlotsFetched: 0,
    slotsWithGraffiti: 0,
    uniqueGraffiti: 0,
    loading: false,
    progress: 0,
    error: null,
    isFromCache: false,
    cachedAt: null,
    lastHeadSlot: null,
    newSlotsAvailable: 0,
  })

  // Hydrate from localStorage instantly on mount
  useEffect(() => {
    const cached = loadCachedWindow()
    if (cached && cached.records.length > 0) {
      const agg = aggregateFromRecords(cached.records)

      setResult({
        ...agg,
        totalSlotsRequested: cached.windowSize,
        loading: false,
        progress: 100,
        error: null,
        isFromCache: true,
        cachedAt: cached.cachedAt,
        lastHeadSlot: cached.lastHeadSlot,
        newSlotsAvailable: 0, // will be calculated on first refresh
      })
    }
  }, [])

  const load = useCallback(async (slotCount: number, forceFullRefresh = false) => {
    setResult(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0,
      totalSlotsRequested: slotCount,
      isFromCache: false,
    }))

    try {
      // Get current head
      const headRes = await fetch(`${BEACON_API}/eth/v1/beacon/headers/head`)
      if (!headRes.ok) throw new Error('Failed to fetch head slot')
      const headData = await headRes.json()
      const currentHeadSlot: number = Number(headData.data.header.message.slot)

      const cached = !forceFullRefresh ? loadCachedWindow() : null

      let records: Array<{ slot: number; graffiti: string }> = []
      let startSlot = currentHeadSlot - slotCount + 1

      if (cached && cached.records.length > 0 && cached.windowSize === slotCount) {
        // === SMART INCREMENTAL UPDATE ===
        const lastKnown = cached.lastHeadSlot
        const delta = currentHeadSlot - lastKnown

        if (delta > 0) {
          // Fetch only the new slots
          const newSlots = Array.from({ length: delta }, (_, i) => lastKnown + 1 + i)

          let completed = 0
          const newRecords = await fetchWithConcurrencyLimit(
            newSlots,
            async (slot) => {
              try {
                const res = await fetch(`${BEACON_API}/eth/v2/beacon/blocks/${slot}`)
                if (!res.ok) return null
                const block = await res.json()
                const g = decodeGraffiti(block?.data?.message?.body?.graffiti)
                completed++
                const p = Math.round((completed / delta) * 100)
                setResult(prev => ({ ...prev, progress: p }))
                return { slot, graffiti: g }
              } catch {
                completed++
                return null
              }
            },
            CONCURRENCY
          )

          // Merge: drop old slots that fall outside the new window, append new ones
          const cutoffSlot = currentHeadSlot - slotCount + 1
          const survivingOld = cached.records.filter(r => r.slot >= cutoffSlot)
          records = [...survivingOld, ...newRecords.filter(Boolean) as any]
        } else {
          // No new blocks - just use cache
          records = cached.records
        }
      } else {
        // === FULL FETCH (first time or window size changed) ===
        const slots = Array.from({ length: slotCount }, (_, i) => currentHeadSlot - i)

        let completed = 0
        const fetched = await fetchWithConcurrencyLimit(
          slots,
          async (slot) => {
            try {
              const res = await fetch(`${BEACON_API}/eth/v2/beacon/blocks/${slot}`)
              if (!res.ok) return null
              const block = await res.json()
              const g = decodeGraffiti(block?.data?.message?.body?.graffiti)
              completed++
              const p = Math.round((completed / slotCount) * 100)
              setResult(prev => ({ ...prev, progress: p }))
              return { slot, graffiti: g }
            } catch {
              completed++
              return null
            }
          },
          CONCURRENCY
        )
        records = fetched.filter(Boolean) as any
      }

      // Trim to exact window size (in case of reorgs or weirdness)
      const cutoff = currentHeadSlot - slotCount + 1
      records = records.filter(r => r.slot >= cutoff).slice(-slotCount)

      const agg = aggregateFromRecords(records)

      // Persist the new window
      const toCache: CachedWindow = {
        version: 1,
        windowSize: slotCount,
        lastHeadSlot: currentHeadSlot,
        records,
        cachedAt: Date.now(),
      }
      saveCachedWindow(toCache)

      setResult({
        ...agg,
        totalSlotsRequested: slotCount,
        loading: false,
        progress: 100,
        error: null,
        isFromCache: false,
        cachedAt: toCache.cachedAt,
        lastHeadSlot: currentHeadSlot,
        newSlotsAvailable: 0,
      })
    } catch (err: any) {
      setResult(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load graffiti data',
      }))
    }
  }, [])

  // Check how many new slots exist compared to cache (cheap head-only call)
  const checkForUpdates = useCallback(async () => {
    const cached = loadCachedWindow()
    if (!cached) return 0

    try {
      const headRes = await fetch(`${BEACON_API}/eth/v1/beacon/headers/head`)
      const headSlot = Number((await headRes.json()).data.header.message.slot)
      const delta = headSlot - cached.lastHeadSlot
      const newDelta = Math.max(0, delta)

      setResult(prev => ({
        ...prev,
        newSlotsAvailable: newDelta,
      }))

      return newDelta
    } catch {
      return 0
    }
  }, [])

  const clearCache = useCallback(() => {
    clearCachedWindow()
    setResult({
      entries: [],
      totalSlotsRequested: 0,
      totalSlotsFetched: 0,
      slotsWithGraffiti: 0,
      uniqueGraffiti: 0,
      loading: false,
      progress: 0,
      error: null,
      isFromCache: false,
      cachedAt: null,
      lastHeadSlot: null,
      newSlotsAvailable: 0,
    })
  }, [])

  return { result, load, checkForUpdates, clearCache }
}
