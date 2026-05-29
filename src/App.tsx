import { useState } from 'react'
import { useBeaconGraffiti } from './hooks/useBeaconGraffiti'
import { StatsCards } from './components/StatsCards'
import { LeaderboardTable } from './components/LeaderboardTable'
import { RefreshCw, AlertCircle } from 'lucide-react'

function App() {
  const { result, load } = useBeaconGraffiti()
  const [slotCount, setSlotCount] = useState(300)

  const handleLoad = () => {
    load(slotCount)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl font-bold tracking-tighter">PulseChain</div>
            <div className="text-4xl font-bold tracking-tighter text-emerald-400">Graffiti Leaderboard</div>
          </div>
          <p className="text-lg text-zinc-400 max-w-2xl">
            Real beacon chain graffiti from the last <span className="font-mono">{slotCount}</span> slots.{' '}
            <span className="text-zinc-500">Pure client-side. No backend.</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Data source: rpc-pulsechain.g4mm4.io beacon API • Only the real 32-byte graffiti field validators set on their nodes
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">SLOTS TO ANALYZE</label>
            <div className="flex gap-2">
              {[100, 300, 500].map(n => (
                <button
                  key={n}
                  onClick={() => setSlotCount(n)}
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
                className="w-28 bg-black border border-zinc-700 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Higher = slower first load (beacon blocks are heavy)</div>
          </div>

          <button
            onClick={handleLoad}
            disabled={result.loading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-zinc-800 text-black disabled:text-zinc-400 font-medium px-6 py-2.5 rounded text-sm transition-colors"
          >
            {result.loading ? (
              <>Loading...</>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Load / Refresh Leaderboard
              </>
            )}
          </button>
        </div>

        {result.error && (
          <div className="flex items-center gap-2 bg-red-950 border border-red-900 text-red-400 px-4 py-3 rounded mb-6 text-sm">
            <AlertCircle className="w-4 h-4" />
            {result.error}
          </div>
        )}

        {result.loading && result.totalSlotsRequested > 0 && (
          <div className="mb-6 text-sm text-zinc-400">
            Fetching beacon blocks... this can take 20–60 seconds depending on the range.
          </div>
        )}

        {/* Results */}
        {(result.entries.length > 0 || result.totalSlotsFetched > 0) && (
          <>
            <StatsCards result={result} />

            <div className="mb-3 flex items-baseline justify-between">
              <div className="text-sm font-medium text-zinc-300">Top Graffiti</div>
              <div className="text-xs text-zinc-500">
                Sorted by frequency • Only non-empty graffiti shown
              </div>
            </div>

            <LeaderboardTable entries={result.entries} />
          </>
        )}

        {!result.loading && result.entries.length === 0 && result.totalSlotsRequested === 0 && (
          <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            Click <span className="font-medium text-zinc-400">"Load / Refresh Leaderboard"</span> to start.
            <div className="text-xs mt-2">Recommended starting point: 300 slots (~50 minutes of history)</div>
          </div>
        )}

        <div className="mt-12 text-[10px] text-zinc-600 leading-relaxed max-w-2xl">
          Note: Fetching full beacon blocks for graffiti is intentionally slow on public endpoints.
          This is the price of correctness (real validator-set graffiti). Future versions will add caching, workers, and smarter incremental updates.
        </div>
      </div>
    </div>
  )
}

export default App
