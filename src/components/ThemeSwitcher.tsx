import { THEMES, ThemeId, themeById, themeHref } from '../theme/themes'

interface Props {
  themeId: ThemeId
  onSelect: (id: ThemeId) => void
}

export function ThemeSwitcher({ themeId, onSelect }: Props) {
  const active = themeById(themeId)

  return (
    <nav className="theme-switcher" aria-label="Theme samples">
      <div className="theme-switcher-label">Theme samples</div>
      <div className="theme-switcher-row">
        {THEMES.map(theme => {
          const href = themeHref(theme.id, window.location.href)
          const isCurrent = theme.id === themeId
          return (
            <a
              key={theme.id}
              href={href}
              className="theme-chip focus-ring"
              aria-current={isCurrent ? 'page' : undefined}
              title={theme.name}
              onClick={event => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                ) {
                  return
                }
                event.preventDefault()
                onSelect(theme.id)
              }}
            >
              <span
                className="theme-swatch"
                style={{ background: theme.swatch }}
                aria-hidden="true"
              />
              {theme.label}
            </a>
          )
        })}
      </div>
      <p className="theme-blurb">
        <span className="font-medium text-soft">{active.name}.</span> {active.description}
      </p>
    </nav>
  )
}
