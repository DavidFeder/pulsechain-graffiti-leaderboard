// Primary + fallback public PulseChain beacon API endpoints.
// The first one that responds successfully is used for the session.
export const BEACON_API_ENDPOINTS = [
  'https://rpc-pulsechain.g4mm4.io/beacon-api',
  // Add additional public endpoints here if they become available.
  // Example format: 'https://another-rpc.example/beacon-api',
] as const

/** @deprecated Prefer BEACON_API_ENDPOINTS — kept for any legacy references */
export const BEACON_API = BEACON_API_ENDPOINTS[0]

// Maximum concurrent block requests.
// Lowered from 18 → 10 to reduce chance of rate-limiting on public RPCs.
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
