import { STORAGE_KEY } from './constants'
import type { GraffitiRecord } from './beacon/types'

/**
 * Shape of the full sliding-window cache stored in localStorage.
 * We persist the raw decoded graffiti records + metadata so we can
 * do fast incremental updates (only fetch new slots since last visit).
 */
export interface CachedWindow {
  version: 1
  windowSize: number
  lastHeadSlot: number
  records: GraffitiRecord[]
  cachedAt: number
}

export function isCachedWindow(value: unknown): value is CachedWindow {
  if (!value || typeof value !== 'object') return false
  const parsed = value as CachedWindow
  if (
    parsed.version !== 1 ||
    typeof parsed.windowSize !== 'number' ||
    typeof parsed.lastHeadSlot !== 'number' ||
    typeof parsed.cachedAt !== 'number' ||
    !Array.isArray(parsed.records)
  ) {
    return false
  }

  return parsed.records.every(isGraffitiRecord)
}

function isGraffitiRecord(value: unknown): value is GraffitiRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as GraffitiRecord
  return (
    typeof record.slot === 'number' &&
    Number.isFinite(record.slot) &&
    typeof record.graffiti === 'string'
  )
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

    const parsed: unknown = JSON.parse(raw)
    return isCachedWindow(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearCachedWindow(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore — private mode / quota / unavailable storage
  }
}
