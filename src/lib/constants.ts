// Beacon API is now proxied through Vercel at /api/beacon
// (see vercel.json rewrite → https://rpc-pulsechain.g4mm4.io/beacon-api)
// This avoids CORS issues that public beacon endpoints often have.
export const BEACON_API_ENDPOINTS = [
  '/api/beacon',
] as const

/** @deprecated Prefer BEACON_API_ENDPOINTS — kept for any legacy references */
export const BEACON_API = BEACON_API_ENDPOINTS[0]

// Maximum concurrent block requests.
// Raised back to 10 now that traffic goes through the same-origin proxy.
export const CONCURRENCY = 10

// localStorage keys
// Full window cache (used for fast incremental updates)
export const STORAGE_KEY = 'pls-graffiti-leaderboard-v1'
// Tiny snapshot used only for instant first paint on returning visitors
export const QUICK_CACHE_KEY = 'pls-graffiti-quick-v1'

/**
 * Staleness threshold for cached data.
 *
 * If the last full window or quick snapshot is older than this, we mark
 * the result as stale in the UI. This prevents serving potentially
 * misleading "delta updated" aggregates from a very old baseline.
 *
 * Currently 6 hours. Used by useBeaconGraffiti for the isStale flag.
 */
export const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 6 // 6 hours
