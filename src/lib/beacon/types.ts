/**
 * Shared types for the beacon graffiti leaderboard.
 */

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
  /**
   * True when the underlying cache (quick or full window) is older than MAX_CACHE_AGE_MS.
   * UI should show a warning and encourage a Full refresh.
   */
  isStale: boolean
}

export interface QuickCacheSnapshot {
  entries: GraffitiEntry[]
  totalSlotsRequested: number
  cachedAt: number
  lastHeadSlot: number
}

export interface GraffitiRecord {
  slot: number
  graffiti: string
}
