// Public PulseChain beacon API endpoint (via g4mm4 proxy)
export const BEACON_API = 'https://rpc-pulsechain.g4mm4.io/beacon-api'

// Maximum number of concurrent block requests we will make to the beacon API.
// 18 was chosen as a good balance between speed and not getting rate-limited.
export const CONCURRENCY = 18

// localStorage keys
// Full window cache (used for fast incremental updates)
export const STORAGE_KEY = 'pls-graffiti-leaderboard-v1'
// Tiny snapshot used only for instant first paint on returning visitors
export const QUICK_CACHE_KEY = 'pls-graffiti-quick-v1'

/**
 * Intended future use: if the full cache is older than this, we may decide
 * to do a full refresh instead of a delta update.
 * Currently unused but kept so the constant is defined in one place.
 */
export const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 6 // 6 hours
