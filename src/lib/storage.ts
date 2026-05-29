import { STORAGE_KEY } from './constants'

/**
 * Shape of the full sliding-window cache stored in localStorage.
 * We persist the raw decoded graffiti records + metadata so we can
 * do fast incremental updates (only fetch new slots since last visit).
 */
export interface CachedWindow {
  version: 1
  windowSize: number
  lastHeadSlot: number
  records: Array<{ slot: number; graffiti: string }>
  cachedAt: number
}

export function saveCachedWindow(data: CachedWindow): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to persist graffiti cache', e)
  }
}

export function loadCachedWindow(): CachedWindow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CachedWindow

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearCachedWindow(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
