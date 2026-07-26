// Primary + fallback public PulseChain **Beacon API** endpoints.
// IMPORTANT: These must support the Beacon REST API
// (e.g. /eth/v1/beacon/headers/head and /eth/v2/beacon/blocks/{slot}).
// Regular execution-layer RPCs (rpc.pulsechain.com, publicnode, etc.) will NOT work here.
//
// The first endpoint that responds successfully is used for the session.
export const BEACON_API_ENDPOINTS = [
  'https://rpc-pulsechain.g4mm4.io/beacon-api',
  // Add more true Beacon API endpoints here when available.
] as const

/** @deprecated Prefer BEACON_API_ENDPOINTS — kept for any legacy references */
export const BEACON_API = BEACON_API_ENDPOINTS[0]

// Maximum concurrent block requests.
// Further lowered to 6 to reduce rate-limit / NetworkError risk on public endpoints.
export const CONCURRENCY = 6

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
