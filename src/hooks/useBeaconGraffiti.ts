import { useState, useCallback, useEffect, useRef } from 'react'
import {
  saveCachedWindow,
  loadCachedWindow,
  clearCachedWindow,
  type CachedWindow,
} from '../lib/storage'
import type { WorkerResponse } from '../lib/aggregateGraffiti'
import { CONCURRENCY, MAX_CACHE_AGE_MS } from '../lib/constants'
import type { FetchResult, GraffitiRecord } from '../lib/beacon/types'
import { saveQuickResult, loadQuickResult, clearQuickResult } from '../lib/cache/quickCache'
import { resolveWorkingEndpoint, friendlyErrorMessage } from '../lib/beacon/endpoints'
import { fetchHeadSlot, fetchBlockRecords } from '../lib/beacon/fetchBlocks'
import { aggregateOnMainThread, postAggregationToWorker } from '../lib/aggregate/runAggregation'
import {
  mergeWindowRecords,
  newSlotsSince,
  shouldFetchFullWindow,
  slotsInWindow,
} from '../lib/beacon/mergeWindow'
import type { RetryInfo } from '../utils/retry'
import { isAbortError } from '../utils/retry'

export type { GraffitiEntry, FetchResult } from '../lib/beacon/types'

function isCacheStale(cachedAt: number | null | undefined): boolean {
  if (!cachedAt) return false
  return Date.now() - cachedAt > MAX_CACHE_AGE_MS
}

function emptyResult(): FetchResult {
  return {
    entries: [],
    totalSlotsRequested: 0,
    totalSlotsFetched: 0,
    slotsWithGraffiti: 0,
    uniqueGraffiti: 0,
    loading: false,
    progress: 0,
    error: null,
    statusMessage: null,
    isFromCache: false,
    cachedAt: null,
    lastHeadSlot: null,
    newSlotsAvailable: 0,
    isStale: false,
  }
}

interface AggregationMeta {
  requestId: number
  totalSlotsRequested: number
  lastHeadSlot: number
  cachedAt: number
  isStale: boolean
  isFromCache: boolean
  showLoading: boolean
}

/**
 * Main hook that orchestrates fetching, caching, and aggregation of beacon graffiti.
 */
export function useBeaconGraffiti() {
  const [result, setResult] = useState<FetchResult>(() => {
    const quick = loadQuickResult()
    if (quick) {
      return {
        entries: quick.entries,
        totalSlotsRequested: quick.totalSlotsRequested,
        totalSlotsFetched: quick.totalSlotsFetched,
        slotsWithGraffiti: quick.slotsWithGraffiti,
        uniqueGraffiti: quick.entries.length,
        loading: false,
        progress: 100,
        error: null,
        statusMessage: null,
        isFromCache: true,
        cachedAt: quick.cachedAt,
        lastHeadSlot: quick.lastHeadSlot,
        newSlotsAvailable: 0,
        isStale: isCacheStale(quick.cachedAt),
      }
    }
    return emptyResult()
  })

  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const workingEndpointRef = useRef<string | null>(null)
  const aggregationIdRef = useRef(0)
  const aggregationMetaRef = useRef<AggregationMeta | null>(null)

  const persistQuickSnapshot = useCallback((
    agg: { entries: FetchResult['entries']; totalSlotsFetched: number; slotsWithGraffiti: number; uniqueGraffiti: number },
    meta: AggregationMeta
  ) => {
    saveQuickResult({
      entries: agg.entries,
      totalSlotsRequested: meta.totalSlotsRequested,
      totalSlotsFetched: agg.totalSlotsFetched,
      slotsWithGraffiti: agg.slotsWithGraffiti,
      cachedAt: meta.cachedAt,
      lastHeadSlot: meta.lastHeadSlot,
    })
  }, [])

  const applyAggregation = useCallback((
    agg: { entries: FetchResult['entries']; totalSlotsFetched: number; slotsWithGraffiti: number; uniqueGraffiti: number },
    meta: AggregationMeta
  ) => {
    persistQuickSnapshot(agg, meta)
    setResult(prev => ({
      ...prev,
      entries: agg.entries,
      totalSlotsFetched: agg.totalSlotsFetched,
      slotsWithGraffiti: agg.slotsWithGraffiti,
      uniqueGraffiti: agg.uniqueGraffiti,
      totalSlotsRequested: meta.totalSlotsRequested,
      loading: false,
      progress: 100,
      error: null,
      statusMessage: null,
      isFromCache: meta.isFromCache,
      cachedAt: meta.cachedAt,
      lastHeadSlot: meta.lastHeadSlot,
      isStale: meta.isStale,
      newSlotsAvailable: meta.isFromCache ? prev.newSlotsAvailable : 0,
    }))
  }, [persistQuickSnapshot])

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/graffitiAggregator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      const meta = aggregationMetaRef.current
      if (!meta || message.requestId !== meta.requestId) return

      if (message.type === 'AGGREGATE_RESULT') {
        applyAggregation(message.result, meta)
      }

      if (message.type === 'ERROR') {
        setResult(prev => ({
          ...prev,
          loading: false,
          error: message.error || 'Worker aggregation failed',
          statusMessage: null,
        }))
      }
    }

    worker.onerror = (err) => {
      console.error('Graffiti worker error:', err)
      setResult(prev => ({
        ...prev,
        loading: false,
        error: 'Aggregation worker crashed',
        statusMessage: null,
      }))
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [applyAggregation])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const aggregateViaWorker = useCallback((records: GraffitiRecord[], meta: Omit<AggregationMeta, 'requestId'>) => {
    const requestId = ++aggregationIdRef.current
    const fullMeta: AggregationMeta = { ...meta, requestId }
    aggregationMetaRef.current = fullMeta

    const worker = workerRef.current

    if (!worker) {
      applyAggregation(aggregateOnMainThread(records), fullMeta)
      return
    }

    setResult(prev => ({
      ...prev,
      loading: meta.showLoading,
      progress: meta.showLoading ? 0 : prev.progress,
      error: meta.showLoading ? null : prev.error,
      totalSlotsRequested: meta.totalSlotsRequested,
      lastHeadSlot: meta.lastHeadSlot,
      cachedAt: meta.cachedAt,
      isFromCache: meta.isFromCache,
      isStale: meta.isStale,
    }))

    postAggregationToWorker(worker, records, requestId)
  }, [applyAggregation])

  useEffect(() => {
    const cached = loadCachedWindow()
    if (cached && cached.records.length > 0) {
      aggregateViaWorker(cached.records, {
        totalSlotsRequested: cached.windowSize,
        lastHeadSlot: cached.lastHeadSlot,
        cachedAt: cached.cachedAt,
        isStale: isCacheStale(cached.cachedAt),
        isFromCache: true,
        showLoading: false,
      })
    }
  }, [aggregateViaWorker])

  const load = useCallback(async (slotCount: number, forceFullRefresh = false) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const { signal } = controller

    const onRetry = (info: RetryInfo) => {
      if (signal.aborted) return
      if (info.status === 429) {
        setResult(prev => ({
          ...prev,
          statusMessage: 'Beacon API rate-limited — retrying…',
        }))
      } else if (info.status && info.status >= 500) {
        setResult(prev => ({
          ...prev,
          statusMessage: 'Beacon API error — retrying…',
        }))
      }
    }

    setResult(prev => ({
      ...prev,
      loading: true,
      error: null,
      statusMessage: null,
      progress: 0,
      totalSlotsRequested: slotCount,
      isFromCache: false,
      isStale: false,
    }))

    try {
      let base = workingEndpointRef.current
      if (!base) {
        base = await resolveWorkingEndpoint(signal, onRetry)
        workingEndpointRef.current = base
      }

      const currentHeadSlot = await fetchHeadSlot(base, signal, onRetry)

      const cached = !forceFullRefresh ? loadCachedWindow() : null
      let records: GraffitiRecord[] = []

      const onProgress = (completed: number, total: number) => {
        const p = total > 0 ? Math.round((completed / total) * 100) : 0
        setResult(prev => ({ ...prev, progress: p }))
      }

      const fetchOpts = {
        concurrency: CONCURRENCY,
        signal,
        onProgress,
        onRetry,
      }

      if (cached && cached.records.length > 0 && cached.windowSize === slotCount) {
        const lastKnown = cached.lastHeadSlot
        const delta = currentHeadSlot - lastKnown

        if (delta <= 0) {
          records = mergeWindowRecords(cached.records, [], currentHeadSlot, slotCount)
        } else if (shouldFetchFullWindow(delta, slotCount)) {
          records = await fetchBlockRecords(base, slotsInWindow(currentHeadSlot, slotCount), fetchOpts)
        } else {
          const newRecords = await fetchBlockRecords(base, newSlotsSince(lastKnown, currentHeadSlot), fetchOpts)
          records = mergeWindowRecords(cached.records, newRecords, currentHeadSlot, slotCount)
        }
      } else {
        records = await fetchBlockRecords(base, slotsInWindow(currentHeadSlot, slotCount), fetchOpts)
      }

      const fetchedAt = Date.now()
      const toCache: CachedWindow = {
        version: 1,
        windowSize: slotCount,
        lastHeadSlot: currentHeadSlot,
        records,
        cachedAt: fetchedAt,
      }
      saveCachedWindow(toCache)

      aggregateViaWorker(records, {
        totalSlotsRequested: slotCount,
        lastHeadSlot: currentHeadSlot,
        cachedAt: fetchedAt,
        isStale: false,
        isFromCache: false,
        showLoading: true,
      })
    } catch (err: unknown) {
      if (isAbortError(err)) return
      workingEndpointRef.current = null
      setResult(prev => ({
        ...prev,
        loading: false,
        error: friendlyErrorMessage(err),
        statusMessage: null,
        isStale: false,
      }))
    }
  }, [aggregateViaWorker])

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
    aggregationIdRef.current += 1
    aggregationMetaRef.current = null
    abortControllerRef.current?.abort()
    clearCachedWindow()
    clearQuickResult()
    setResult(emptyResult())
  }, [])

  return { result, load, checkForUpdates, clearCache }
}
