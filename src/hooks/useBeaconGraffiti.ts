import { useState, useCallback, useEffect, useRef } from 'react'
import { decodeGraffiti } from '../lib/decodeGraffiti'
import { fetchWithConcurrencyLimit } from '../utils/concurrency'
import { saveCachedWindow, loadCachedWindow, clearCachedWindow } from '../lib/storage'
import { computeLeaderboard } from '../lib/aggregateGraffiti'
import type { WorkerRequest, WorkerResponse } from '../lib/aggregateGraffiti'
import { BEACON_API, CONCURRENCY, QUICK_CACHE_KEY } from '../lib/constants'

// Re-export for App.tsx convenience
export type { CachedWindow } from '../lib/storage'

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
export interface CachedWindow {
  version: 1
  windowSize: number
  lastHeadSlot: number
  records: Array<{ slot: number; graffiti: string }>
  cachedAt: number
}

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
  try { localStorage.removeItem(QUICK_CACHE_KEY) } catch {}
}

export function useBeaconGraffiti() {
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

  // Initialize Web Worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/graffitiAggregator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.type === 'AGGREGATE_RESULT') {
        const workerResult = message.result;

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
          };

          if (prev.lastHeadSlot && prev.totalSlotsRequested) {
            saveQuickResult({
              entries: workerResult.entries,
              totalSlotsRequested: prev.totalSlotsRequested,
              cachedAt: Date.now(),
              lastHeadSlot: prev.lastHeadSlot,
            });
          }

          return newState;
        });
      }

      if (message.type === 'ERROR') {
        setResult(prev => ({
          ...prev,
          loading: false,
          error: message.error || 'Worker aggregation failed',
        }));
      }
    };

    worker.onerror = (err) => {
      console.error('Graffiti worker error:', err);
      setResult(prev => ({
        ...prev,
        loading: false,
        error: 'Aggregation worker crashed',
      }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Cleanup any pending requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const aggregateViaWorker = useCallback((records: Array<{ slot: number; graffiti: string }>, meta: {
    totalSlotsRequested: number;
    lastHeadSlot: number;
    cachedAt?: number;
  }) => {
    const worker = workerRef.current;
    if (!worker) {
      // Fallback to main thread
      const agg = computeLeaderboard(records);
      setResult(prev => ({
        ...prev,
        ...agg,
        totalSlotsRequested: meta.totalSlotsRequested,
        loading: false,
        progress: 100,
        lastHeadSlot: meta.lastHeadSlot,
        cachedAt: meta.cachedAt ?? Date.now(),
      }));
      return;
    }

    setResult(prev => ({
      ...prev,
      loading: true,
      progress: 0,
      totalSlotsRequested: meta.totalSlotsRequested,
      lastHeadSlot: meta.lastHeadSlot,
    }));

    const request: WorkerRequest = {
      type: 'AGGREGATE',
      records,
    };
    worker.postMessage(request);
  }, []);

  // Hydrate from localStorage + kick off worker (non-blocking)
  useEffect(() => {
    const cached = loadCachedWindow();
    if (cached && cached.records.length > 0) {
      aggregateViaWorker(cached.records, {
        totalSlotsRequested: cached.windowSize,
        lastHeadSlot: cached.lastHeadSlot,
        cachedAt: cached.cachedAt,
      });
    }
  }, [aggregateViaWorker]);

  const load = useCallback(async (slotCount: number, forceFullRefresh = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    setResult(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0,
      totalSlotsRequested: slotCount,
      isFromCache: false,
    }));

    try {
      const headRes = await fetch(`${BEACON_API}/eth/v1/beacon/headers/head`, { signal });
      if (!headRes.ok) throw new Error('Failed to fetch head slot from beacon API');
      const headData = await headRes.json();
      const currentHeadSlot: number = Number(headData.data.header.message.slot);

      const cached = !forceFullRefresh ? loadCachedWindow() : null;
      let records: Array<{ slot: number; graffiti: string }> = [];

      if (cached && cached.records.length > 0 && cached.windowSize === slotCount) {
        const lastKnown = cached.lastHeadSlot;
        const delta = currentHeadSlot - lastKnown;

        if (delta > 0) {
          const newSlots = Array.from({ length: delta }, (_, i) => lastKnown + 1 + i);
          let completed = 0;

          const newRecords = await fetchWithConcurrencyLimit(
            newSlots,
            async (slot, _index, fetchSignal) => {
              try {
                const res = await fetch(`${BEACON_API}/eth/v2/beacon/blocks/${slot}`, { signal: fetchSignal });
                if (!res.ok) return null;
                const block = await res.json();
                const g = decodeGraffiti(block?.data?.message?.body?.graffiti);
                completed++;
                const p = Math.round((completed / delta) * 100);
                setResult(prev => ({ ...prev, progress: p }));
                return { slot, graffiti: g };
              } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return null;
                completed++;
                return null;
              }
            },
            CONCURRENCY,
            signal
          );

          const cutoffSlot = currentHeadSlot - slotCount + 1;
          const survivingOld = cached.records.filter(r => r.slot >= cutoffSlot);
          records = [...survivingOld, ...newRecords.filter(Boolean) as any];
        } else {
          records = cached.records;
        }
      } else {
        const slots = Array.from({ length: slotCount }, (_, i) => currentHeadSlot - i);
        let completed = 0;

        const fetched = await fetchWithConcurrencyLimit(
          slots,
          async (slot, _index, fetchSignal) => {
            try {
              const res = await fetch(`${BEACON_API}/eth/v2/beacon/blocks/${slot}`, { signal: fetchSignal });
              if (!res.ok) return null;
              const block = await res.json();
              const g = decodeGraffiti(block?.data?.message?.body?.graffiti);
              completed++;
              const p = Math.round((completed / slotCount) * 100);
              setResult(prev => ({ ...prev, progress: p }));
              return { slot, graffiti: g };
            } catch (err) {
              if (err instanceof Error && err.name === 'AbortError') return null;
              completed++;
              return null;
            }
          },
          CONCURRENCY,
          signal
        );
        records = fetched.filter(Boolean) as any;
      }

      const cutoff = currentHeadSlot - slotCount + 1;
      records = records.filter(r => r.slot >= cutoff).slice(-slotCount);

      const toCache: CachedWindow = {
        version: 1,
        windowSize: slotCount,
        lastHeadSlot: currentHeadSlot,
        records,
        cachedAt: Date.now(),
      };
      saveCachedWindow(toCache);

      aggregateViaWorker(records, {
        totalSlotsRequested: slotCount,
        lastHeadSlot: currentHeadSlot,
        cachedAt: toCache.cachedAt,
      });
    } catch (err: any) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setResult(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to load graffiti data',
      }));
    }
  }, [aggregateViaWorker]);

  const checkForUpdates = useCallback(async () => {
    const cached = loadCachedWindow();
    if (!cached) return 0;

    try {
      const headRes = await fetch(`${BEACON_API}/eth/v1/beacon/headers/head`);
      const headSlot = Number((await headRes.json()).data.header.message.slot);
      const delta = headSlot - cached.lastHeadSlot;
      const newDelta = Math.max(0, delta);

      setResult(prev => ({ ...prev, newSlotsAvailable: newDelta }));
      return newDelta;
    } catch {
      return 0;
    }
  }, []);

  const clearCache = useCallback(() => {
    clearCachedWindow();
    clearQuickResult();
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
    });
  }, []);

  return { result, load, checkForUpdates, clearCache };
}
