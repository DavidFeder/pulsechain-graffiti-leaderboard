/**
 * Shared types for the beacon graffiti leaderboard.
 */

export interface GraffitiEntry {
  graffiti: string
  count: number
  percentage: number
  /** Most recent slot in the window that carried this graffiti. */
  exampleSlot: number
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
  /** Transient retry / rate-limit copy shown while a load is in flight. */
  statusMessage: string | null
  isFromCache: boolean
  cachedAt: number | null
  lastHeadSlot: number | null
  newSlotsAvailable: number
  /**
   * True when the underlying cache (quick or full window) is older than MAX_CACHE_AGE_MS.
   * UI should show a warning and encourage a Full refresh.
   */
  isStale: boolean
  /**
   * True when the last network fetch could not retrieve every requested slot
   * (API errors, not missed proposals). Full refresh should stay available.
   */
  incompleteFetch: boolean
  /** Count of slots that failed for reasons other than a 404 missed block. */
  failedSlotCount: number
}

export interface QuickCacheSnapshot {
  entries: GraffitiEntry[]
  totalSlotsRequested: number
  totalSlotsFetched: number
  slotsWithGraffiti: number
  cachedAt: number
  lastHeadSlot: number
}

export interface GraffitiRecord {
  slot: number
  graffiti: string
}
