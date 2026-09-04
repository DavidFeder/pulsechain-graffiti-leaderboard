import { QUICK_CACHE_KEY } from '../constants'
import type { GraffitiEntry, QuickCacheSnapshot } from '../beacon/types'

/**
 * Tiny snapshot used purely for instant UI on returning visitors.
 * Intentionally separate from the full record window cache.
 */

export function isQuickCacheSnapshot(value: unknown): value is QuickCacheSnapshot {
  if (!value || typeof value !== 'object') return false
  const parsed = value as QuickCacheSnapshot
  if (
    typeof parsed.cachedAt !== 'number' ||
    typeof parsed.lastHeadSlot !== 'number' ||
    typeof parsed.totalSlotsRequested !== 'number' ||
    !Array.isArray(parsed.entries)
  ) {
    return false
  }

  return parsed.entries.every(isGraffitiEntry)
}

function isGraffitiEntry(value: unknown): value is GraffitiEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as GraffitiEntry
  return (
    typeof entry.graffiti === 'string' &&
    typeof entry.count === 'number' &&
    typeof entry.percentage === 'number'
  )
}

export function saveQuickResult(data: QuickCacheSnapshot): void {
  try {
    localStorage.setItem(QUICK_CACHE_KEY, JSON.stringify(data))
  } catch {
    // Quota or private mode — ignore
  }
}

export function loadQuickResult(): QuickCacheSnapshot | null {
  try {
    const raw = localStorage.getItem(QUICK_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isQuickCacheSnapshot(parsed)) return null

    return {
      ...parsed,
      totalSlotsFetched:
        typeof parsed.totalSlotsFetched === 'number'
          ? parsed.totalSlotsFetched
          : parsed.totalSlotsRequested,
      slotsWithGraffiti:
        typeof parsed.slotsWithGraffiti === 'number' ? parsed.slotsWithGraffiti : 0,
      entries: parsed.entries.map(entry => ({
        ...entry,
        exampleSlot:
          typeof entry.exampleSlot === 'number' ? entry.exampleSlot : parsed.lastHeadSlot,
      })),
    }
  } catch {
    return null
  }
}

export function clearQuickResult(): void {
  try {
    localStorage.removeItem(QUICK_CACHE_KEY)
  } catch {
    // Ignore — private mode / quota / unavailable storage
  }
}
