import { ThemeId } from './themes'

export const THEME_STORAGE_KEY = 'pls-theme-sample'

/** Remember a choice the user actually made. Callers must not read this on a bare URL. */
export function rememberTheme(id: ThemeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // Private mode or blocked storage should not break theme switching.
  }
}
