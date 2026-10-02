import { useCallback, useEffect, useState } from 'react'
import { rememberTheme } from './themeStorage'
import { ThemeId, themeById, themeFromSearch } from './themes'

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', themeById(id).themeColor)
}

export function useThemeSample() {
  const [themeId, setThemeId] = useState<ThemeId>(() => themeFromSearch(window.location.search))

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    const onPopState = () => setThemeId(themeFromSearch(window.location.search))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const selectTheme = useCallback((id: ThemeId) => {
    const url = new URL(window.location.href)
    url.searchParams.set('theme', id)
    const next = `${url.pathname}${url.search}`
    const current = `${window.location.pathname}${window.location.search}`
    if (next !== current) {
      window.history.pushState({}, '', next)
    }
    rememberTheme(id)
    setThemeId(id)
  }, [])

  return { themeId, selectTheme }
}
