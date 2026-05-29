import type { CachedWindow } from '../hooks/useBeaconGraffiti';
import { STORAGE_KEY } from './constants';

export function saveCachedWindow(data: CachedWindow): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist graffiti cache', e);
  }
}

export function loadCachedWindow(): CachedWindow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedWindow;

    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedWindow(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
