export const THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    name: 'Classic Pulse',
    description: 'Today’s near-black leaderboard with the cyan-to-magenta PulseChain gradient.',
    themeColor: '#0a0a0a',
    swatch: 'linear-gradient(90deg, #00D4FF, #A855F7, #FF00AA)',
  },
  {
    id: 'neon',
    label: 'Neon',
    name: 'Pulse Neon',
    description: 'The same cyan and magenta, with a grid, glow, and a lit header.',
    themeColor: '#05010a',
    swatch: 'linear-gradient(90deg, #00D4FF, #FF00AA)',
  },
  {
    id: 'glass',
    label: 'Glass',
    name: 'Pulse Glass',
    description: 'Frosted cards and soft blur, still in the PulseChain colors.',
    themeColor: '#07060f',
    swatch: 'linear-gradient(135deg, rgba(0,212,255,0.8), rgba(255,0,170,0.75))',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    name: 'Beacon Terminal',
    description: 'Green phosphor on black, set in a monospace dashboard.',
    themeColor: '#010a04',
    swatch: 'linear-gradient(90deg, #05210c, #39FF14)',
  },
  {
    id: 'gold',
    label: 'Gold',
    name: 'Validator Gold',
    description: 'Deep navy and gold, with a ceremonial serif headline.',
    themeColor: '#07111f',
    swatch: 'linear-gradient(90deg, #0e1c33, #e4c56a)',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    name: 'Hex Editorial',
    description: 'Light paper, a serif headline, and a single magenta accent.',
    themeColor: '#f6f1e8',
    swatch: 'linear-gradient(90deg, #f6f1e8, #c4006a)',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    name: 'Plasma Arcade',
    description: 'Thick borders, high contrast, and blocky display type.',
    themeColor: '#140818',
    swatch: 'linear-gradient(90deg, #ffe14a, #ff2bd6)',
  },
  {
    id: 'tide',
    label: 'Tide',
    name: 'Deep Tide',
    description: 'Teal and indigo, quieter than the logo gradient.',
    themeColor: '#03141c',
    swatch: 'linear-gradient(90deg, #14b8a6, #818cf8)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    name: 'Sunset Stake',
    description: 'Charcoal with amber and coral.',
    themeColor: '#1a100e',
    swatch: 'linear-gradient(90deg, #fb923c, #e11d48)',
  },
  {
    id: 'ledger',
    label: 'Ledger',
    name: 'Ink Ledger',
    description: 'Cream paper, ink rules, and stamp-like ranks.',
    themeColor: '#f3ecd9',
    swatch: 'linear-gradient(90deg, #f3ecd9, #8c1d40)',
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export type ThemeSample = (typeof THEMES)[number]

const THEME_IDS = new Set<string>(THEMES.map(theme => theme.id))

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value)
}

/** Query param wins. A bare URL stays Classic, even if a choice was stored earlier. */
export function themeFromSearch(search: string): ThemeId {
  const id = new URLSearchParams(search).get('theme')
  return isThemeId(id) ? id : 'classic'
}

export function themeById(id: ThemeId): ThemeSample {
  const theme = THEMES.find(item => item.id === id)
  if (!theme) return THEMES[0]
  return theme
}

export function themeHref(id: ThemeId, currentHref: string): string {
  const url = new URL(currentHref, 'http://localhost')
  url.searchParams.set('theme', id)
  const search = url.searchParams.toString()
  return `${url.pathname}?${search}`
}
