// Beacon API is proxied through Vercel at /api/beacon* (see vercel.json)
// and through Vite's dev server proxy locally (see vite.config.ts).
// Same-origin paths keep CSP connect-src on 'self' and avoid CORS.
export const BEACON_API_ENDPOINTS = ['/api/beacon', '/api/beacon-fallback'] as const

export const WINDOW_SIZE = 500

// Maximum concurrent block requests.
export const CONCURRENCY = 10

export const HEAD_POLL_INTERVAL_MS = 45_000

/** Otterscan slot pages (PulseChain). */
export const BEACON_SLOT_EXPLORER = 'https://otter.pulsechain.com/slot/'

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
