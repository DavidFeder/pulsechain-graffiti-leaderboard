import { useState, useEffect, useCallback, useRef } from 'react'
import { useBeaconGraffiti } from './hooks/useBeaconGraffiti'
import { StatsCards } from './components/StatsCards'
import { LeaderboardTable } from './components/LeaderboardTable'
import { PulseChainLogo } from './components/PulseChainLogo'
import ErrorBoundary from './components/ErrorBoundary'
import {
  RefreshCw,
  AlertCircle,
  Database,
  Cpu,
  X,
  AlertTriangle,
  Search,
  Share2,
  Check,
} from 'lucide-react'
import { WINDOW_SIZE, HEAD_POLL_INTERVAL_MS } from './lib/constants'
import { formatRelativeTime } from './utils/formatRelativeTime'
import { copyText } from './utils/clipboard'
import { incompleteFetchMessage } from './lib/beacon/fetchOutcome'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { useThemeSample } from './theme/useThemeSample'

function App() {
  const { result, load, checkForUpdates, clearCache } = useBeaconGraffiti()
  const { themeId, selectTheme } = useThemeSample()
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0)
  const shareTimerRef = useRef<number | null>(null)

  // Check for new slots when the tab is visible, and poll while it stays open.
  useEffect(() => {
    if (!result.lastHeadSlot) return

    const tick = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }

    tick()
    const intervalId = window.setInterval(tick, HEAD_POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [result.lastHeadSlot, checkForUpdates])

  // Automatically load the leaderboard on first page load only.
  // Intentionally empty deps — we do not want this to re-run when result changes.
  useEffect(() => {
    if (result.entries.length === 0 && !result.loading) {
      load(WINDOW_SIZE, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoad = useCallback(
    (forceFull = false) => {
      setSearchTerm('') // clear filter on new load
      load(WINDOW_SIZE, forceFull)
    },
    [load]
  )

  const handleClearCache = () => {
    setSearchTerm('')
    clearCache()
  }

  useEffect(() => {
    return () => {
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current)
    }
  }, [])

  const handleShare = async () => {
    const ok = await copyText(window.location.href)
    if (ok) {
      setCopiedLink(true)
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current)
      shareTimerRef.current = window.setTimeout(() => setCopiedLink(false), 1600)
    }
  }

  // Keyboard shortcut: press "R" to refresh (when not typing in an input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
          return
        }
        if (result.loading) return
        e.preventDefault()
        handleLoad(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [result.loading, handleLoad])

  const loadingMessage = result.loading
    ? result.statusMessage
      ? result.statusMessage
      : result.progress < 100 && result.progress > 0
        ? `Fetching new blocks... ${result.progress}%`
        : 'Aggregating graffiti data in background...'
    : result.statusMessage || ''

  const trimmedSearch = searchTerm.trim()
  const displayedEntries = trimmedSearch
    ? result.entries.filter(e => e.graffiti.toLowerCase().includes(trimmedSearch.toLowerCase()))
    : result.entries

  // Stale cache banner takes precedence in styling
  const showCacheBanner = result.isFromCache && result.cachedAt
  const isStale = result.isStale
  const hasResults = result.entries.length > 0 || result.totalSlotsFetched > 0
  const noFilterMatches = hasResults && trimmedSearch && displayedEntries.length === 0

  // Live status text for screen readers
  const liveStatus = result.loading
    ? loadingMessage
    : result.error
      ? `Error: ${result.error}`
      : result.incompleteFetch
        ? incompleteFetchMessage(result.failedSlotCount, !result.isFromCache)
        : hasResults
          ? `Loaded ${result.entries.length} unique graffiti from ${result.totalSlotsFetched} slots`
          : ''

  const showFullRefresh = result.isFromCache || isStale || result.incompleteFetch

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <ErrorBoundary key={errorBoundaryKey} onReset={() => setErrorBoundaryKey(k => k + 1)}>
          {/* Screen-reader live region for status updates */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveStatus}
          </div>

          {/* Header */}
          <header className="header-atmosphere mb-10">
            <div className="flex items-center gap-4 mb-2">
              <PulseChainLogo size={48} className="logo-glow" />
              <div>
                <h1 className="page-title flex items-center gap-3 text-4xl">
                  <span>PulseChain</span>
                  <span className="title-gradient">Graffiti Leaderboard</span>
                </h1>
              </div>
            </div>

            <p className="text-lg text-muted max-w-2xl">
              Real beacon chain graffiti from the last{' '}
              <span className="font-mono">{WINDOW_SIZE}</span> slots.
            </p>
          </header>

          <ThemeSwitcher themeId={themeId} onSelect={selectTheme} />

          {/* Cache status banner - enhanced with staleness warning (takes precedence when stale) */}
          {showCacheBanner && !result.loading && (
            <div
              role="status"
              className={`status-banner mb-6 ${isStale ? 'status-banner-stale' : 'status-banner-cache'}`}
            >
              <div
                className={`flex items-center gap-2 ${isStale ? 'text-amber-400' : 'pulse-accent'}`}
              >
                {isStale ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Database className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="font-medium">
                  {isStale ? 'Cache is stale' : 'Loaded from cache'}
                </span>
              </div>
              <div className={isStale ? 'text-amber-300/80' : 'text-muted'}>
                Last synced {formatRelativeTime(result.cachedAt)} • up to slot{' '}
                {result.lastHeadSlot?.toLocaleString()}
                {isStale && (
                  <span className="ml-1.5 font-medium">
                    (older than 6 hours — full refresh recommended)
                  </span>
                )}
              </div>
              {result.newSlotsAvailable > 0 && !isStale && (
                <div className="accent-chip">
                  {result.newSlotsAvailable} new slots since last visit
                </div>
              )}
            </div>
          )}

          {result.incompleteFetch && !result.loading && (
            <div role="status" className="status-banner status-banner-warn mb-6">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">Incomplete fetch</span>
              </div>
              <div className="text-amber-300/90">
                {incompleteFetchMessage(result.failedSlotCount, !result.isFromCache)}
              </div>
            </div>
          )}

          {/* Controls */}
          <div
            className="flex flex-wrap items-center gap-3 mb-6"
            role="group"
            aria-label="Leaderboard controls"
          >
            <button
              onClick={() => handleLoad(false)}
              disabled={result.loading}
              aria-busy={result.loading}
              title="Refresh (keyboard: R)"
              className="btn-primary focus-ring"
            >
              <>
                <RefreshCw
                  className={`w-4 h-4${result.loading ? ' animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {result.isFromCache || hasResults
                  ? 'Update with latest blocks'
                  : 'Load Leaderboard'}
              </>
            </button>

            {showFullRefresh && (
              <button
                onClick={() => handleLoad(true)}
                disabled={result.loading}
                className={`btn-ghost focus-ring ${
                  isStale || result.incompleteFetch ? 'btn-ghost-warn' : ''
                }`}
              >
                Full refresh
              </button>
            )}

            <button
              onClick={handleShare}
              className="btn-ghost focus-ring"
              title="Copy page link"
              aria-label="Share leaderboard — copy link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Share
                </>
              )}
            </button>

            {result.cachedAt && (
              <button onClick={handleClearCache} className="btn-ghost btn-quiet focus-ring">
                Clear cache
              </button>
            )}
          </div>

          {/* Error state with retry */}
          {result.error && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 bg-red-950/80 border border-red-900 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{result.error}</span>
              </div>
              <button
                onClick={() => handleLoad(true)}
                disabled={result.loading}
                className="shrink-0 flex items-center gap-1.5 border border-red-800 hover:bg-red-900/50 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {/* Progress bar */}
          {result.loading && (
            <div
              className="mb-6"
              role="progressbar"
              aria-valuenow={result.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={loadingMessage}
            >
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${result.progress}%` }} />
              </div>
              <div className="text-xs text-faint mt-1.5 flex items-center gap-2">
                <Cpu className="w-3 h-3" aria-hidden="true" />
                {loadingMessage} — previous results stay visible until the new data is ready
              </div>
            </div>
          )}

          {/* Results stay fully visible and interactive while a refresh is running */}
          {hasResults && (
            <div>
              <StatsCards result={result} />

              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-soft" id="leaderboard-heading">
                  Top Graffiti (real beacon data)
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="graffiti-filter" className="sr-only">
                    Filter graffiti
                  </label>
                  <input
                    id="graffiti-filter"
                    type="search"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filter graffiti (e.g. pulse, pls, love...)"
                    className="field-input focus-ring"
                    autoComplete="off"
                  />
                  {trimmedSearch && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="btn-tiny focus-ring"
                      title="Clear filter"
                      aria-label="Clear filter"
                    >
                      <X className="w-3 h-3" aria-hidden="true" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {trimmedSearch && !noFilterMatches && (
                <div className="text-[10px] text-faint -mt-1 mb-2" aria-live="polite">
                  Showing {displayedEntries.length} of {result.entries.length} matching “
                  {trimmedSearch}”
                </div>
              )}

              {noFilterMatches ? (
                <div className="empty-panel py-12" role="status">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
                  <div className="font-medium text-muted">
                    No graffiti matched “{trimmedSearch}”
                  </div>
                  <div className="text-xs mt-1.5">Try a different filter or clear the search.</div>
                  <button onClick={() => setSearchTerm('')} className="btn-tiny focus-ring mt-4">
                    Clear filter
                  </button>
                </div>
              ) : (
                <LeaderboardTable
                  entries={displayedEntries}
                  searchTerm={trimmedSearch || undefined}
                />
              )}
            </div>
          )}

          {/* Cold start: skeleton placeholders until the first payload arrives */}
          {result.loading && !hasResults && (
            <div className="mb-8" aria-busy="true" aria-label="Loading leaderboard">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="stat-card">
                    <div className="skeleton-pulse skeleton-block mb-3 h-3 w-24" />
                    <div className="skeleton-pulse skeleton-block h-8 w-16" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton-row flex items-center gap-3 pb-3">
                    <div className="skeleton-pulse skeleton-block h-7 w-7 shrink-0 rounded-full" />
                    <div className="skeleton-pulse skeleton-block h-6 flex-1" />
                    <div className="skeleton-pulse skeleton-block h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial empty / first-load state */}
          {!result.loading && !hasResults && !result.error && (
            <div className="empty-panel py-16" role="status">
              <div className="font-medium text-muted mb-1">No data yet</div>
              <div className="text-sm">
                Click “Load Leaderboard” to fetch the latest graffiti from the beacon chain.
              </div>
              <div className="text-xs mt-3 text-dim">
                Returning visitors get instant results from local cache.
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="site-footer">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <a
                href="https://github.com/DavidFeder/pulsechain-graffiti-leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded-sm"
              >
                GitHub
              </a>
              <span className="hidden sm:inline" aria-hidden="true">
                •
              </span>
              <span>Built for the PulseChain community</span>
              <span className="hidden sm:inline" aria-hidden="true">
                •
              </span>
              <span className="text-dim">
                Press <kbd className="kbd-key">R</kbd> to refresh
              </span>
            </div>
          </footer>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App
