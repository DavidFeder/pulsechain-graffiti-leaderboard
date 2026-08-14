import { useState, useEffect, useCallback } from 'react'
import { useBeaconGraffiti } from './hooks/useBeaconGraffiti'
import { StatsCards } from './components/StatsCards'
import { LeaderboardTable } from './components/LeaderboardTable'
import { PulseChainLogo } from './components/PulseChainLogo'
import ErrorBoundary from './components/ErrorBoundary'
import { RefreshCw, AlertCircle, Database, Cpu, X, AlertTriangle, Search, Share2, Check } from 'lucide-react'

const SLOT_COUNT = 500

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function App() {
  const { result, load, checkForUpdates, clearCache } = useBeaconGraffiti()
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Only check for new slots when the browser tab is visible.
  // This avoids wasting requests while the user is on another tab.
  useEffect(() => {
    if (!result.lastHeadSlot) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }

    if (document.visibilityState === 'visible') {
      checkForUpdates()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [result.lastHeadSlot, checkForUpdates])

  // Automatically load the leaderboard on first page load only.
  // Intentionally empty deps — we do not want this to re-run when result changes.
  useEffect(() => {
    if (result.entries.length === 0 && !result.loading) {
      load(SLOT_COUNT, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoad = useCallback((forceFull = false) => {
    setSearchTerm('') // clear filter on new load
    load(SLOT_COUNT, forceFull)
  }, [load])

  const handleClearCache = () => {
    setSearchTerm('')
    clearCache()
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 1600)
    } catch {
      // Fallback for older browsers
      window.prompt('Copy this link:', url)
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
    ? result.progress < 100 && result.progress > 0
      ? `Fetching new blocks... ${result.progress}%`
      : 'Aggregating graffiti data in background...'
    : ''

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
      : hasResults
        ? `Loaded ${result.entries.length} unique graffiti from ${result.totalSlotsFetched} slots`
        : ''

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <ErrorBoundary>
          {/* Screen-reader live region for status updates */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveStatus}
          </div>

          {/* Header */}
          <header className="header-atmosphere mb-10">
            <div className="flex items-center gap-4 mb-2">
              <PulseChainLogo size={48} className="drop-shadow-[0_0_8px_rgba(255,0,170,0.4)]" />
              <div>
                <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tighter">
                  <span>PulseChain</span>
                  <span className="bg-gradient-to-r from-[#00D4FF] via-[#A855F7] to-[#FF00AA] bg-clip-text text-transparent">
                    Graffiti Leaderboard
                  </span>
                </h1>
              </div>
            </div>

            <div className="mb-3">
              <span
                className="inline-flex items-center rounded-full border border-[#FF00AA]/70 bg-[#FF00AA]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[#FF00AA]"
                title="Visual experiment — not production"
              >
                DEMO C — atmosphere
              </span>
            </div>
            <p className="text-lg text-zinc-400 max-w-2xl">
              Real beacon chain graffiti from the last <span className="font-mono">{SLOT_COUNT}</span> slots.
            </p>
          </header>

          {/* Cache status banner - enhanced with staleness warning (takes precedence when stale) */}
          {showCacheBanner && !result.loading && (
            <div
              role="status"
              className={`mb-6 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm ${isStale 
                ? 'border-amber-900/60 bg-amber-950/60 text-amber-300' 
                : 'border-zinc-800 bg-zinc-950'}`}
            >
              <div className={`flex items-center gap-2 ${isStale ? 'text-amber-400' : 'text-[#FF00AA]'`}>
                {isStale ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <Database className="h-4 w-4" aria-hidden="true" />}
                <span className="font-medium">{isStale ? 'Cache is stale' : 'Loaded from cache'}</span>
              </div>
              <div className={isStale ? 'text-amber-300/80' : 'text-zinc-400'}>
                Last synced {formatRelativeTime(result.cachedAt)} • up to slot {result.lastHeadSlot?.toLocaleString()}
                {isStale && <span className="ml-1.5 font-medium">(older than 6 hours — full refresh recommended)</span>}
              </div>
              {result.newSlotsAvailable > 0 && !isStale && (
                <div className="ml-auto rounded bg-[#FF00AA]/10 px-3 py-1 text-xs font-medium text-[#FF00AA]">
                  {result.newSlotsAvailable} new slots since last visit
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-6" role="group" aria-label="Leaderboard controls">
            <button
              onClick={() => handleLoad(false)}
              disabled={result.loading}
              aria-busy={result.loading}
              title="Refresh (keyboard: R)"
              className="flex items-center gap-2 text-white font-medium px-5 py-2.5 rounded text-sm transition-all disabled:bg-zinc-800 disabled:text-zinc-400 disabled:bg-none disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF00AA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
              style={{
                background: result.loading ? undefined : 'linear-gradient(to right, #00D4FF, #FF00AA)'
              }}
            >
              <>
                <RefreshCw className={`w-4 h-4${result.loading ? ' animate-spin' : ''}`} aria-hidden="true" />
                {result.isFromCache ? 'Update with latest blocks' : 'Load Leaderboard'}
              </>
            </button>

            {(result.isFromCache || isStale) && (
              <button
                onClick={() => handleLoad(true)}
                disabled={result.loading}
                className={`flex items-center gap-2 border px-4 py-2.5 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF00AA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${isStale 
                  ? 'border-amber-700 hover:bg-amber-950 text-amber-300' 
                  : 'border-zinc-700 hover:bg-zinc-900'}`}
              >
                Full refresh
              </button>
            )}

            <button
              onClick={handleShare}
              className="flex items-center gap-2 border border-zinc-700 hover:bg-zinc-900 px-3 py-2.5 rounded text-sm text-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF00AA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
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
              <button
                onClick={handleClearCache}
                className="flex items-center gap-2 border border-zinc-800 hover:bg-zinc-950 px-3 py-2.5 rounded text-sm text-zinc-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
              >
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
            <div className="mb-6" role="progressbar" aria-valuenow={result.progress} aria-valuemin={0} aria-valuemax={100} aria-label={loadingMessage}>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#FF00AA] transition-all duration-200" 
                  style={{ width: `${result.progress}%` }} 
                />
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 flex items-center gap-2">
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
                <div className="text-sm font-medium text-zinc-300" id="leaderboard-heading">
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter graffiti (e.g. pulse, pls, love...)"
                    className="w-full sm:w-72 bg-black border border-zinc-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#FF00AA] focus-visible:ring-1 focus-visible:ring-[#FF00AA] placeholder:text-zinc-600"
                    autoComplete="off"
                  />
                  {trimmedSearch && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded hover:bg-zinc-950 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                      title="Clear filter"
                      aria-label="Clear filter"
                    >
                      <X className="w-3 h-3" aria-hidden="true" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {trimmedSearch && !noFilterMatches && (
                <div className="text-[10px] text-zinc-500 -mt-1 mb-2" aria-live="polite">
                  Showing {displayedEntries.length} of {result.entries.length} matching “{trimmedSearch}”
                </div>
              )}

              {noFilterMatches ? (
                <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl" role="status">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
                  <div className="font-medium text-zinc-400">No graffiti matched “{trimmedSearch}”</div>
                  <div className="text-xs mt-1.5">Try a different filter or clear the search.</div>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-xs border border-zinc-700 hover:bg-zinc-900 px-3 py-1.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                  >
                    Clear filter
                  </button>
                </div>
              ) : (
                <LeaderboardTable entries={displayedEntries} searchTerm={trimmedSearch || undefined} />
              )}
            </div>
          )}

          {/* Cold start: skeleton placeholders until the first payload arrives */}
          {result.loading && !hasResults && (
            <div className="mb-8" aria-busy="true" aria-label="Loading leaderboard">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="stat-card">
                    <div className="skeleton-pulse mb-3 h-3 w-24 rounded bg-zinc-800" />
                    <div className="skeleton-pulse h-8 w-16 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 border-b border-zinc-900 pb-3">
                    <div className="skeleton-pulse h-7 w-7 shrink-0 rounded-full bg-zinc-800" />
                    <div className="skeleton-pulse h-6 flex-1 rounded bg-zinc-800" />
                    <div className="skeleton-pulse h-4 w-12 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial empty / first-load state */}
          {!result.loading && !hasResults && !result.error && (
            <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-xl" role="status">
              <div className="font-medium text-zinc-400 mb-1">No data yet</div>
              <div className="text-sm">Click “Load Leaderboard” to fetch the latest graffiti from the beacon chain.</div>
              <div className="text-xs mt-3 text-zinc-600">Returning visitors get instant results from local cache.</div>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-zinc-800 text-center text-sm text-zinc-500">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <a
                href="https://github.com/DavidFeder/pulsechain-graffiti-leaderboard"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-300 transition-colors focus:outline-none focus-visible:underline"
              >
                GitHub
              </a>
              <span className="hidden sm:inline" aria-hidden="true">•</span>
              <span>Built for the PulseChain community</span>
              <span className="hidden sm:inline" aria-hidden="true">•</span>
              <span className="text-zinc-600">Press <kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px]">R</kbd> to refresh</span>
            </div>
          </footer>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App
