import { useState, useCallback, useEffect, useRef } from 'react'
import {
  saveCachedWindow,
  loadCachedWindow,
  clearCachedWindow,
  type CachedWindow,
} from '../lib/storage'
import { computeLeaderboard } from '../lib/aggregateGraffiti'
import type { WorkerRequest, WorkerResponse } from '../lib/aggregateGraffiti'
import { CONCURRENCY, MAX_CACHE_AGE_MS } from '../lib/constants'
import type { FetchResult, GraffitiRecord } from '../lib/beacon/types'
import { saveQuickResult, loadQuickResult, clearQuickResult } from '../lib/cache/quickCache'
import { resolveWorkingEndpoint, friendlyErrorMessage } from '../lib/beacon/endpoints'
import { fetchHeadSlot, fetchBlockRecords } from '../lib/beacon/fetchBlocks'

// Re-export types so existing imports from the hook keep working
export type { GraffitiEntry, FetchResult } from '../lib/beacon/types'

/**
 * Returns true if the given timestamp is older than MAX_CACHE_AGE_MS.
 * Used to warn users that displayed aggregates may be based on a stale baseline
 * even if a few new slots were delta-fetched on top.
 */
function isCacheStale(cachedAt: number | null | undefined): boolean {
  if (!cachedAt) return false
  return Date.now() - cachedAt > MAX_CACHE_AGE_MS
}

/**
 * Main hook that orchestrates fetching, caching, and aggregation of beacon graffiti.
 *
 * Architecture highlights:
 * - Two-tier caching: "quick" snapshot for instant paint + full record window for correctness
 * - Incremental updates: only fetch new slots since the last cached head
 * - Heavy aggregation moved to a Web Worker so the main thread stays responsive
 * - AbortController everywhere to cancel stale requests when the user changes parameters
 * - Staleness detection via MAX_CACHE_AGE_MS (6h) so very old baselines are flagged
 * - Automatic failover across BEACON_API_ENDPOINTS
 */
export function useBeaconGraffiti() {
  // ---------------------------------------------------------------------------
  // Initial state: try to show previous result instantly using the tiny quick cache.
  // This is what makes returning visitors see data with zero loading time.
  // We also compute isStale immediately for the banner.
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
        isStale: isCacheStale(quick.cachedAt),
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
      isStale: false,
    }
  })

  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Cache the working endpoint for the lifetime of the page so we don't re-probe every request
  const workingEndpointRef = useRef<string | null>(null)

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
            isStale: isCacheStale(prev.cachedAt),
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
          isStale: false,
        }))
      }
    }

    worker.onerror = (err) => {
      console.error('Graffiti worker error:', err)
      setResult(prev => ({
        ...prev,
        loading: false,
        error: 'Aggregation worker crashed',
        isStale: false,
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
  const aggregateViaWorker = useCallback((records: GraffitiRecord[], meta: {
    totalSlotsRequested: number
    lastHeadSlot: number
    cachedAt?: number
    isStale?: boolean
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
        isStale: meta.isStale ?? isCacheStale(meta.cachedAt),
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
  // We pass the staleness flag so the UI can warn immediately.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const cached = loadCachedWindow()
    if (cached && cached.records.length > 0) {
      aggregateViaWorker(cached.records, {
        totalSlotsRequested: cached.windowSize,
        lastHeadSlot: cached.lastHeadSlot,
        cachedAt: cached.cachedAt,
        isStale: isCacheStale(cached.cachedAt),
      })
    }
  }, [aggregateViaWorker])

  // ---------------------------------------------------------------------------
  // Core load function.
  // - Always fetches current head first (with endpoint failover).
  // - Tries to do a cheap delta update when possible.
  // - Persists the new full window.
  // - Hands the records off to the worker for aggregation.
  // Fresh loads are never stale.
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
      isStale: false, // we are fetching fresh data right now
    }))

    try {
      // Resolve a working endpoint (uses cache if already known)
      let base = workingEndpointRef.current
      if (!base) {
        base = await resolveWorkingEndpoint(signal)
        workingEndpointRef.current = base
      }

      const currentHeadSlot = await fetchHeadSlot(base, signal)

      const cached = !forceFullRefresh ? loadCachedWindow() : null
      let records: GraffitiRecord[] = []

      const onProgress = (completed: number, total: number) => {
        const p = total > 0 ? Math.round((completed / total) * 100) : 0
        setResult(prev => ({ ...prev, progress: p }))
      }

      // -----------------------------------------------------------------------
      // Happy path: we have a previous window of the exact same size.
      // Only fetch the new slots that appeared since last time.
      // -----------------------------------------------------------------------
      if (cached && cached.records.length > 0 && cached.windowSize === slotCount) {
        const lastKnown = cached.lastHeadSlot
        const delta = currentHeadSlot - lastKnown

        if (delta > 0) {
          const newSlots = Array.from({ length: delta }, (_, i) => lastKnown + 1 + i)

          const newRecords = await fetchBlockRecords(base, newSlots, {
            concurrency: CONCURRENCY,
            signal,
            onProgress,
          })

          // Keep old records that are still inside the requested window
          const cutoffSlot = currentHeadSlot - slotCount + 1
          const survivingOld = cached.records.filter(r => r.slot >= cutoffSlot)
          records = [...survivingOld, ...newRecords]
        } else {
          // No new blocks since last visit — just reuse what we have
          records = cached.records
        }
      } else {
        // -------------------------------------------------------------------
        // Cold start or window size changed: fetch the full requested window.
        // -------------------------------------------------------------------
        const slots = Array.from({ length: slotCount }, (_, i) => currentHeadSlot - i)

        records = await fetchBlockRecords(base, slots, {
          concurrency: CONCURRENCY,
          signal,
          onProgress,
        })
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
        isStale: false, // freshly fetched
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      // Clear cached endpoint so next attempt re-probes
      workingEndpointRef.current = null
      setResult(prev => ({
        ...prev,
        loading: false,
        error: friendlyErrorMessage(err),
        isStale: false,
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
      let base = workingEndpointRef.current
      if (!base) {
        base = await resolveWorkingEndpoint()
        workingEndpointRef.current = base
      }

      const headSlot = await fetchHeadSlot(base)
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
      isStale: false,
    })
  }, [])

  return { result, load, checkForUpdates, clearCache }
}
