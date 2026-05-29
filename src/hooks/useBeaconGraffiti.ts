import { useState, useCallback, useEffect, useRef } from 'react'
import { decodeGraffiti } from '../lib/decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../utils/concurrency'
import {
  saveCachedWindow,
  loadCachedWindow,
  clearCachedWindow,
  type CachedWindow,
} from '../lib/storage'
import { computeLeaderboard } from '../lib/aggregateGraffiti'
import type { WorkerRequest, WorkerResponse } from '../lib/aggregateGraffiti'
import { BEACON_API, CONCURRENCY, QUICK_CACHE_KEY } from '../lib/constants'
import { fetchWithRetry } from '../utils/retry'

// Quick cache is a tiny snapshot used purely for instant UI on returning visitors.
// It is intentionally separate from the full record cache.
function saveQuickResult(data: {
  entries: GraffitiEntry[]
  totalSlotsRequested: number
  cachedAt: number
  lastHeadSlot: number
}) {
  try {
    localStorage.setItem(QUICK_CACHE_KEY, JSON.stringify(data))
  } catch {}
}

function loadQuickResult() {
  try {
    const raw = localStorage.getItem(QUICK_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearQuickResult() {
  try {
    localStorage.removeItem(QUICK_CACHE_KEY)
  } catch {}
}

// =============================================================================
// TYPES
// =============================================================================

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
  isFromCache: boolean
  cachedAt: number | null
  lastHeadSlot: number | null
  newSlotsAvailable: number
}

/**
 * Main hook that orchestrates fetching, caching, and aggregation of beacon graffiti.
 *
 * Architecture highlights:
 * - Two-tier caching: "quick" snapshot for instant paint + full record window for correctness
 * - Incremental updates: only fetch new slots since the last cached head
 * - Heavy aggregation moved to a Web Worker so the main thread stays responsive
 * - AbortController everywhere to cancel stale requests when the user changes parameters
 */
export function useBeaconGraffiti() {
  // ---------------------------------------------------------------------------
  // Initial state: try to show previous result instantly using the tiny quick cache.
  // This is what makes returning visitors see data with zero loading time.
  // ---------------------------------------------------------------------------
  const [result, setResult] = useState<FetchResult>(() => {
    const quick = loadQuickResult()
    if (quick) {
      return {
        entries: quick.entries,
        totalSlotsRequested: quick.totalSlotsRequested,
        totalSlotsFetched: quick.entries.length > 0 ? quick.totalSlotsRequested : 0,
        slotsWithGraffiti: 0,
        uniqueGraffiti: quick.entries.length,
        loading: false,
        progress: 100,
        error: null,
        isFromCache: true,
        cachedAt: quick.cachedAt,
        lastHeadSlot: quick.lastHeadSlot,
        newSlotsAvailable: 0,
      }
    }
    return {
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
    }
  })

  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ---------------------------------------------------------------------------
  // Web Worker initialization (runs once).
  // We keep one long-lived worker for the lifetime of the app.
  // All heavy Map + sort work happens off the main thread.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/graffitiAggregator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data

      if (message.type === 'AGGREGATE_RESULT') {
        const workerResult = message.result

        setResult(prev => {
          const newState = {
            ...prev,
            entries: workerResult.entries,
            totalSlotsFetched: workerResult.totalSlotsFetched,
            slotsWithGraffiti: workerResult.slotsWithGraffiti,
            uniqueGraffiti: workerResult.uniqueGraffiti,
            loading: false,
            progress: 100,
            error: null,
            isFromCache: false,
          }

          // Persist a tiny snapshot so the next visit is instant.
          if (prev.lastHeadSlot && prev.totalSlotsRequested) {
            saveQuickResult({
              entries: workerResult.entries,
              totalSlotsRequested: prev.totalSlotsRequested,
              cachedAt: Date.now(),
              lastHeadSlot: prev.lastHeadSlot,
            })
          }

          return newState
        })
      }

      if (message.type === 'ERROR') {
        setResult(prev => ({
          ...prev,
          loading: false,
          error: message.error || 'Worker aggregation failed',
        }))
      }
    }

    worker.onerror = (err) => {
      console.error('Graffiti worker error:', err)
      setResult(prev => ({
        ...prev,
        loading: false,
        error: 'Aggregation worker crashed',
      }))
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Abort any in-flight network requests when the component unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Aggregation helper (prefers worker, falls back to main thread).
  // ---------------------------------------------------------------------------
  const aggregateViaWorker = useCallback((records: Array<{ slot: number; graffiti: string }>, meta: {
    totalSlotsRequested: number
    lastHeadSlot: number
    cachedAt?: number
  }) => {
    const worker = workerRef.current

    if (!worker) {
      // Graceful degradation: do the work on the main thread.
      const agg = computeLeaderboard(records)
      setResult(prev => ({
        ...prev,
        ...agg,
        totalSlotsRequested: meta.totalSlotsRequested,
        loading: false,
        progress: 100,
        lastHeadSlot: meta.lastHeadSlot,
        cachedAt: meta.cachedAt ?? Date.now(),
      }))
      return
    }

    setResult(prev => ({
      ...prev,
      loading: true,
      progress: 0,
      totalSlotsRequested: meta.totalSlotsRequested,
      lastHeadSlot: meta.lastHeadSlot,
    }))

    const request: WorkerRequest = { type: 'AGGREGATE', records }
    worker.postMessage(request)
  }, [])

  // ---------------------------------------------------------------------------
  // On first mount, if we have a full cached window, start aggregating it
  // immediately in the background. This is what gives "instant" results.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cached = loadCachedWindow()
    if (cached && cached.records.length > 0) {
      aggregateViaWorker(cached.records, {
        totalSlotsRequested: cached.windowSize,
        lastHeadSlot: cached.lastHeadSlot,
        cachedAt: cached.cachedAt,
      })
    }
  }, [aggregateViaWorker])

  // ---------------------------------------------------------------------------
  // Core load function.
  // - Always fetches current head first.
  // - Tries to do a cheap delta update when possible.
  // - Persists the new full window.
  // - Hands the records off to the worker for aggregation.
  // ---------------------------------------------------------------------------
  const load = useCallback(async (slotCount: number, forceFullRefresh = false) => {
    // Cancel any previous in-flight request (user changed slot count, etc.)
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const { signal } = controller

    setResult(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0,
      totalSlotsRequested: slotCount,
      isFromCache: false,
    }))

    try {
      // Get the latest head slot (with retry + abort support)
      const headRes = await fetchWithRetry(
        `${BEACON_API}/eth/v1/beacon/headers/head`,
        { signal },
        2
      )
      if (!headRes.ok) throw new Error('Failed to fetch head slot from beacon API')

      const headData = await headRes.json()
      const currentHeadSlot: number = Number(headData.data.header.message.slot)

      const cached = !forceFullRefresh ? loadCachedWindow() : null
      let records: Array<{ slot: number; graffiti: string }> = []

      // -----------------------------------------------------------------------
      // Happy path: we have a previous window of the exact same size.
      // Only fetch the new slots that appeared since last time.
      // -----------------------------------------------------------------------
      if (cached && cached.records.length > 0 && cached.windowSize === slotCount) {
        const lastKnown = cached.lastHeadSlot
        const delta = currentHeadSlot - lastKnown

        if (delta > 0) {
          const newSlots = Array.from({ length: delta }, (_, i) => lastKnown + 1 + i)

          let completed = 0
          const newRecords = await fetchWithConcurrencyLimit(
            newSlots,
            async (slot, _index, fetchSignal) => {
              try {
                const res = await fetchWithRetry(
                  `${BEACON_API}/eth/v2/beacon/blocks/${slot}`,
                  { signal: fetchSignal },
                  1
                )
                if (!res.ok) return null

                const block = await res.json()
                const g = decodeGraffiti(block?.data?.message?.body?.graffiti)

                completed++
                const p = Math.round((completed / delta) * 100)
                setResult(prev => ({ ...prev, progress: p }))

                return { slot, graffiti: g }
              } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return null
                completed++
                return null
              }
            },
            CONCURRENCY,
            signal
          )

          // Keep old records that are still inside the requested window
          const cutoffSlot = currentHeadSlot - slotCount + 1
          const survivingOld = cached.records.filter(r => r.slot >= cutoffSlot)
          records = [...survivingOld, ...newRecords.filter(Boolean) as any]
        } else {
          // No new blocks since last visit — just reuse what we have
          records = cached.records
        }
      } else {
        // -------------------------------------------------------------------
        // Cold start or window size changed: fetch the full requested window.
        // -------------------------------------------------------------------
        const slots = Array.from({ length: slotCount }, (_, i) => currentHeadSlot - i)

        let completed = 0
        const fetched = await fetchWithConcurrencyLimit(
          slots,
          async (slot, _index, fetchSignal) => {
            try {
              const res = await fetchWithRetry(
                `${BEACON_API}/eth/v2/beacon/blocks/${slot}`,
                { signal: fetchSignal },
                1
              )
              if (!res.ok) return null

              const block = await res.json()
              const g = decodeGraffiti(block?.data?.message?.body?.graffiti)

              completed++
              const p = Math.round((completed / slotCount) * 100)
              setResult(prev => ({ ...prev, progress: p }))

              return { slot, graffiti: g }
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') return null
              completed++
              return null
            }
          },
          CONCURRENCY,
          signal
        )
        records = fetched.filter(Boolean) as any
      }

      // Final safety trim to exactly the requested window size
      const cutoff = currentHeadSlot - slotCount + 1
      records = records.filter(r => r.slot >= cutoff).slice(-slotCount)

      // Persist the full window for next time
      const toCache: CachedWindow = {
        version: 1,
        windowSize: slotCount,
        lastHeadSlot: currentHeadSlot,
        records,
        cachedAt: Date.now(),
      }
      saveCachedWindow(toCache)

      // Hand off to worker (or main-thread fallback) for aggregation
      aggregateViaWorker(records, {
        totalSlotsRequested: slotCount,
        lastHeadSlot: currentHeadSlot,
        cachedAt: toCache.cachedAt,
      })
    } catch (err: any) {
      if (err instanceof Error && err.name === 'AbortError') return
      setResult(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load graffiti data',
      }))
    }
  }, [aggregateViaWorker])

  // ---------------------------------------------------------------------------
  // Lightweight head check used by the visibility listener in App.tsx.
  // Does not trigger a full reload — just updates the "X new slots" badge.
  // ---------------------------------------------------------------------------
  const checkForUpdates = useCallback(async () => {
    const cached = loadCachedWindow()
    if (!cached) return 0

    try {
      const headRes = await fetchWithRetry(`${BEACON_API}/eth/v1/beacon/headers/head`, {}, 1)
      const headSlot = Number((await headRes.json()).data.header.message.slot)
      const delta = headSlot - cached.lastHeadSlot
      const newDelta = Math.max(0, delta)

      setResult(prev => ({ ...prev, newSlotsAvailable: newDelta }))
      return newDelta
    } catch {
      return 0
    }
  }, [])

  const clearCache = useCallback(() => {
    clearCachedWindow()
    clearQuickResult()

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
