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
import {
  resolveWorkingEndpoint,
  friendlyErrorMessage,
  orderedEndpoints,
} from '../lib/beacon/endpoints'
import { fetchHeadSlot, fetchBlockRecords, type SlotFetchSummary } from '../lib/beacon/fetchBlocks'
import { aggregateOnMainThread, postAggregationToWorker } from '../lib/aggregate/runAggregation'
import {
  mergeWindowRecords,
  newSlotsSince,
  shouldFetchFullWindow,
  slotsInWindow,
} from '../lib/beacon/mergeWindow'
import {
  decideLoadCommit,
  incompleteFetchMessage,
  isPersistableFetch,
} from '../lib/beacon/fetchOutcome'
import type { RetryInfo } from '../utils/retry'
import { isAbortError, throwIfAborted } from '../utils/retry'

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
    incompleteFetch: false,
    failedSlotCount: 0,
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
  persistQuick: boolean
  incompleteFetch: boolean
  failedSlotCount: number
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
        incompleteFetch: false,
        failedSlotCount: 0,
      }
    }
    return emptyResult()
  })

  const workerRef = useRef<Worker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const workingEndpointRef = useRef<string | null>(null)
  const aggregationIdRef = useRef(0)
  const aggregationMetaRef = useRef<AggregationMeta | null>(null)
  const loadGenerationRef = useRef(0)
  const loadInFlightRef = useRef(false)

  const persistQuickSnapshot = useCallback(
    (
      agg: {
        entries: FetchResult['entries']
        totalSlotsFetched: number
        slotsWithGraffiti: number
        uniqueGraffiti: number
      },
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
    },
    []
  )

  const applyAggregation = useCallback(
    (
      agg: {
        entries: FetchResult['entries']
        totalSlotsFetched: number
        slotsWithGraffiti: number
        uniqueGraffiti: number
      },
      meta: AggregationMeta
    ) => {
      if (meta.persistQuick) persistQuickSnapshot(agg, meta)
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
        incompleteFetch: meta.incompleteFetch,
        failedSlotCount: meta.failedSlotCount,
      }))
    },
    [persistQuickSnapshot]
  )

  useEffect(() => {
    const worker = new Worker(new URL('../workers/graffitiAggregator.worker.ts', import.meta.url), {
      type: 'module',
    })
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

    worker.onerror = err => {
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

  const aggregateViaWorker = useCallback(
    (records: GraffitiRecord[], meta: Omit<AggregationMeta, 'requestId'>) => {
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
        progress: meta.showLoading ? 100 : prev.progress,
        error: meta.showLoading && !meta.incompleteFetch ? null : prev.error,
        totalSlotsRequested: meta.totalSlotsRequested,
        lastHeadSlot: meta.lastHeadSlot,
        cachedAt: meta.cachedAt,
        isFromCache: meta.isFromCache,
        isStale: meta.isStale,
        incompleteFetch: meta.incompleteFetch,
        failedSlotCount: meta.failedSlotCount,
      }))

      postAggregationToWorker(worker, records, requestId)
    },
    [applyAggregation]
  )

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
        persistQuick: true,
        incompleteFetch: false,
        failedSlotCount: 0,
      })
    }
  }, [aggregateViaWorker])

  const load = useCallback(
    async (slotCount: number, forceFullRefresh = false) => {
      const generation = ++loadGenerationRef.current
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      loadInFlightRef.current = true
      const { signal } = controller

      const stillCurrent = () => generation === loadGenerationRef.current && !signal.aborted

      const onRetry = (info: RetryInfo) => {
        if (!stillCurrent()) return
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
        incompleteFetch: false,
        failedSlotCount: 0,
      }))

      try {
        let base = workingEndpointRef.current
        if (!base) {
          base = await resolveWorkingEndpoint(signal, onRetry)
          if (!stillCurrent()) return
          workingEndpointRef.current = base
        }

        const bases = orderedEndpoints(base)
        const currentHeadSlot = await fetchHeadSlot(bases, signal, onRetry)
        if (!stillCurrent()) return

        const cached = !forceFullRefresh ? loadCachedWindow() : null
        const hasCachedWindow = Boolean(
          cached && cached.records.length > 0 && cached.windowSize === slotCount
        )

        const onProgress = (completed: number, total: number) => {
          if (!stillCurrent()) return
          const p = total > 0 ? Math.round((completed / total) * 100) : 0
          setResult(prev => ({ ...prev, progress: p }))
        }

        const fetchOpts = {
          concurrency: CONCURRENCY,
          signal,
          onProgress,
          onRetry,
        }

        let records: GraffitiRecord[] = []
        let requestedSlots = 0
        let missingCount = 0
        let failedSlots: number[] = []

        const ingest = (fetched: SlotFetchSummary, requested: number) => {
          requestedSlots = requested
          missingCount = fetched.missingCount
          failedSlots = fetched.failedSlots
          if (fetched.fallbackSuccesses > 0 || fetched.failedSlots.length > 0) {
            workingEndpointRef.current = null
          }
          return fetched.records
        }

        if (hasCachedWindow && cached) {
          const lastKnown = cached.lastHeadSlot
          const delta = currentHeadSlot - lastKnown

          if (delta <= 0) {
            records = mergeWindowRecords(cached.records, [], currentHeadSlot, slotCount)
            requestedSlots = 0
          } else if (shouldFetchFullWindow(delta, slotCount)) {
            const slots = slotsInWindow(currentHeadSlot, slotCount)
            records = ingest(await fetchBlockRecords(bases, slots, fetchOpts), slots.length)
          } else {
            const slots = newSlotsSince(lastKnown, currentHeadSlot)
            const newRecords = ingest(
              await fetchBlockRecords(bases, slots, fetchOpts),
              slots.length
            )
            records = mergeWindowRecords(cached.records, newRecords, currentHeadSlot, slotCount)
          }
        } else {
          const slots = slotsInWindow(currentHeadSlot, slotCount)
          records = ingest(await fetchBlockRecords(bases, slots, fetchOpts), slots.length)
        }

        throwIfAborted(signal)
        if (!stillCurrent()) return

        const persistable =
          requestedSlots === 0 ||
          isPersistableFetch({
            requested: requestedSlots,
            missingCount,
            failedCount: failedSlots.length,
          })

        const action = decideLoadCommit({
          persistable,
          hasCachedWindow,
          recordCount: records.length,
        })

        if (action === 'keep-previous') {
          setResult(prev => ({
            ...prev,
            loading: false,
            progress: 100,
            statusMessage: null,
            error: null,
            isFromCache: true,
            incompleteFetch: true,
            failedSlotCount: failedSlots.length,
          }))
          return
        }

        if (action === 'error') {
          workingEndpointRef.current = null
          setResult(prev => ({
            ...prev,
            loading: false,
            progress: 100,
            error: incompleteFetchMessage(failedSlots.length || requestedSlots, true),
            statusMessage: null,
            incompleteFetch: true,
            failedSlotCount: failedSlots.length || requestedSlots,
          }))
          return
        }

        const fetchedAt = Date.now()
        const persist = action === 'persist'

        if (persist) {
          const toCache: CachedWindow = {
            version: 1,
            windowSize: slotCount,
            lastHeadSlot: currentHeadSlot,
            records,
            cachedAt: fetchedAt,
          }
          saveCachedWindow(toCache)
        }

        if (!stillCurrent()) return

        aggregateViaWorker(records, {
          totalSlotsRequested: slotCount,
          lastHeadSlot: persist ? currentHeadSlot : (cached?.lastHeadSlot ?? currentHeadSlot),
          cachedAt: persist ? fetchedAt : (cached?.cachedAt ?? fetchedAt),
          isStale: persist ? false : isCacheStale(cached?.cachedAt),
          isFromCache: !persist,
          showLoading: true,
          persistQuick: persist,
          incompleteFetch: !persist,
          failedSlotCount: persist ? 0 : failedSlots.length,
        })
      } catch (err: unknown) {
        if (isAbortError(err) || generation !== loadGenerationRef.current) return
        workingEndpointRef.current = null
        setResult(prev => ({
          ...prev,
          loading: false,
          error: friendlyErrorMessage(err),
          statusMessage: null,
          isStale: false,
          incompleteFetch: false,
        }))
      } finally {
        if (generation === loadGenerationRef.current) {
          loadInFlightRef.current = false
        }
      }
    },
    [aggregateViaWorker]
  )

  const checkForUpdates = useCallback(async () => {
    if (loadInFlightRef.current) return 0
    const cached = loadCachedWindow()
    if (!cached) return 0

    try {
      let base = workingEndpointRef.current
      if (!base) {
        base = await resolveWorkingEndpoint()
        workingEndpointRef.current = base
      }

      const headSlot = await fetchHeadSlot(orderedEndpoints(base))
      const delta = headSlot - cached.lastHeadSlot
      const newDelta = Math.max(0, delta)

      setResult(prev => ({ ...prev, newSlotsAvailable: newDelta }))
      return newDelta
    } catch {
      return 0
    }
  }, [])

  const clearCache = useCallback(() => {
    loadGenerationRef.current += 1
    loadInFlightRef.current = false
    aggregationIdRef.current += 1
    aggregationMetaRef.current = null
    abortControllerRef.current?.abort()
    clearCachedWindow()
    clearQuickResult()
    setResult(emptyResult())
  }, [])

  return { result, load, checkForUpdates, clearCache }
}
