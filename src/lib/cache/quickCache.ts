import { QUICK_CACHE_KEY } from '../constants'
import type { QuickCacheSnapshot } from '../beacon/types'

/**
 * Tiny snapshot used purely for instant UI on returning visitors.
 * Intentionally separate from the full record window cache.
 */

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
    return raw ? (JSON.parse(raw) as QuickCacheSnapshot) : null
  } catch {
    return null
  }
}

export function clearQuickResult(): void {
  try {
    localStorage.removeItem(QUICK_CACHE_KEY)
  } catch {
    // ignore
  }
}
