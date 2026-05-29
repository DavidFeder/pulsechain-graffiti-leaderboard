// Beacon API endpoint
// Using g4mm4's public PulseChain RPC + Beacon API proxy
export const BEACON_API = 'https://rpc-pulsechain.g4mm4.io/beacon-api';

// Concurrency limit for parallel block fetches from the beacon API
export const CONCURRENCY = 18;

// LocalStorage keys
export const STORAGE_KEY = 'pls-graffiti-leaderboard-v1';
export const QUICK_CACHE_KEY = 'pls-graffiti-quick-v1';

// Cache freshness threshold (currently unused but kept for future use)
export const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 6; // 6 hours
