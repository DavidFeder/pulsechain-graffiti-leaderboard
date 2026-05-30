import { useState, useEffect } from 'react'
import { useBeaconGraffiti } from './hooks/useBeaconGraffiti'
import { StatsCards } from './components/StatsCards'
import { LeaderboardTable } from './components/LeaderboardTable'
import { PulseChainLogo } from './components/PulseChainLogo'
import ErrorBoundary from './components/ErrorBoundary'
import { RefreshCw, AlertCircle, Database, Cpu, X, AlertTriangle } from 'lucide-react'

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
  const [slotCount, setSlotCount] = useState(300)
  const [searchTerm, setSearchTerm] = useState('')

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

  // Automatically load the leaderboard on first page load
  useEffect(() => {
    if (result.entries.length === 0 && !result.loading) {
      load(slotCount, false)
    }
  }, []) // Empty dependency array = run only once on mount

  const handleLoad = (forceFull = false) => {
    setSearchTerm('') // clear filter on new load
    load(slotCount, forceFull)
  }

  const handleClearCache = () => {
    setSearchTerm('')
    clearCache()
  }

  // When user clicks one of the preset buttons (100/300/500),
  // immediately load with the new slot count.
  const handlePresetSlotCount = (n: number) => {
    setSlotCount(n)
    setSearchTerm('')
    load(n, false)
  }

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

  // Post-merge resolution (PR #2 vs PR #3): this file now contains both the staleness warning banner
  // (isStale + amber AlertTriangle styling) AND the search/filter + per-row copy functionality.

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <ErrorBoundary>
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-2">
              <PulseChainLogo size={48} className="drop-shadow-[0_0_8px_rgba(255,0,170,0.4)]" />
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-bold tracking-tighter">PulseChain</div>
                  <div className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-[#00D4FF] via-[#A855F7] to-[#FF00AA] bg-clip-text text-transparent">
                    Graffiti Leaderboard
                  </div>
                </div>
              </div>
            </div>

            <p className="text-lg text-zinc-400 max-w-2xl">
              Real beacon chain graffiti from the last <span className="font-mono">{slotCount}</span> slots.
            </p>
          </div>

          {/* Cache status banner - enhanced with staleness warning (takes precedence when stale) */}
          {showCacheBanner && (
            <div className={`mb-6 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm ${isStale 
              ? 'border-amber-900/60 bg-amber-950/60 text-amber-300' 
              : 'border-zinc-800 bg-zinc-950'}`}>
              <div className={`flex items-center gap-2 ${isStale ? 'text-amber-400' : 'text-[#FF00AA]'}`}>
                {isStale ? <AlertTriangle className="h-4 w-4" /> : <Database className="h-4 w-4" />}
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
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">SLOTS TO ANALYZE</label>
              <div className="flex gap-2">
                {[100, 300, 500].map(n => (
                  <button
                    key={n}
                    onClick={() => handlePresetSlotCount(n)}
                    className={`px-4 py-2 text-sm rounded border transition-colors ${slotCount === n 
                      ? 'bg-white text-black border-white' 
                      : 'border-zinc-700 hover:bg-zinc-900'}`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  value={slotCount}
                  onChange={(e) => setSlotCount(Math.max(50, Math.min(2000, Number(e.target.value) || 300)))}
                  className="w-28 bg-black border border-zinc-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#FF00AA]"
                />
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">Higher = slower first load</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleLoad(false)}
                disabled={result.loading}
                className="flex items-center gap-2 text-white font-medium px-5 py-2.5 rounded text-sm transition-all disabled:bg-zinc-800 disabled:text-zinc-400 disabled:bg-none disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(to right, #00D4FF, #FF00AA)'
                }}
              >
                {result.loading ? (
                  <>{loadingMessage}</>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" /> 
                    {result.isFromCache ? 'Update with latest blocks' : 'Load Leaderboard'}
                  </>
                )}
              </button>

              {(result.isFromCache || isStale) && (
                <button
                  onClick={() => handleLoad(true)}
                  disabled={result.loading}
                  className={`flex items-center gap-2 border px-4 py-2.5 rounded text-sm transition-colors ${isStale 
                    ? 'border-amber-700 hover:bg-amber-950 text-amber-300' 
                    : 'border-zinc-700 hover:bg-zinc-900'}`}
                >
                  Full refresh
                </button>
              )}

              {result.cachedAt && (
                <button
                  onClick={handleClearCache}
                  className="flex items-center gap-2 border border-zinc-800 hover:bg-zinc-950 px-3 py-2.5 rounded text-sm text-zinc-400 transition-colors"
                >
                  Clear cache
                </button>
              )}
            </div>
          </div>

          {result.error && (
            <div className="flex items-center gap-2 bg-red-950 border border-red-900 text-red-400 px-4 py-3 rounded mb-6 text-sm">
              <AlertCircle className="w-4 h-4" />
              {result.error}
            </div>
          )}

          {/* Progress bar */}
          {result.loading && (
            <div className="mb-6">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-1.5 bg-gradient-to-r from-[#00D4FF] to-[#FF00AA] transition-all duration-200" 
                  style={{ width: `${result.progress}%` }} 
                />
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 flex items-center gap-2">
                <Cpu className="w-3 h-3" />
                {loadingMessage} — running in background worker
              </div>
            </div>
          )}

          {(result.entries.length > 0 || result.totalSlotsFetched > 0) && !result.loading && (
            <>
              <StatsCards result={result} />

              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-zinc-300">Top Graffiti (real beacon data)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter graffiti (e.g. pulse, pls, love...)"
                    className="w-full sm:w-72 bg-black border border-zinc-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#FF00AA] placeholder:text-zinc-600"
                  />
                  {trimmedSearch && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded hover:bg-zinc-950 transition-colors"
                      title="Clear filter"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>
              </div>
              {trimmedSearch && (
                <div className="text-[10px] text-zinc-500 -mt-1 mb-2">
                  Showing {displayedEntries.length} of {result.entries.length} matching “{trimmedSearch}”
                </div>
              )}

              <LeaderboardTable entries={displayedEntries} searchTerm={trimmedSearch || undefined} />
            </>
          )}

          {!result.loading && result.entries.length === 0 && result.totalSlotsRequested === 0 && (
            <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              Loading the leaderboard...
              <div className="text-xs mt-2">Returning visitors get instant results thanks to localStorage + Web Worker aggregation.</div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default App
