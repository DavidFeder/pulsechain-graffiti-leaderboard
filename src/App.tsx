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
            <div className="text-[10px] text-zinc-500 mt-1">Higher = slower (real beacon blocks are heavy to fetch)</div>
          </div>

          <button
            onClick={handleLoad}
            disabled={result.loading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-zinc-800 text-black disabled:text-zinc-400 font-medium px-6 py-2.5 rounded text-sm transition-colors"
          >
            {result.loading ? (
              <>Fetching... {result.progress}%</>
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

        {/* Live progress bar */}
        {result.loading && (
          <div className="mb-6">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-emerald-500 transition-all duration-200" 
                style={{ width: `${result.progress}%` }} 
              />
            </div>
            <div className="text-xs text-zinc-500 mt-1.5">
              Fetching beacon blocks — {result.progress}% complete. This is expected to be slow for correctness.
            </div>
          </div>
        )}

        {/* Results */}
        {(result.entries.length > 0 || result.totalSlotsFetched > 0) && !result.loading && (
          <>
            <StatsCards result={result} />

            <div className="mb-3 flex items-baseline justify-between">
              <div className="text-sm font-medium text-zinc-300">Top Graffiti (real beacon data)</div>
              <div className="text-xs text-zinc-500">
                Sorted by frequency • Empty graffiti filtered
              </div>
            </div>

            <LeaderboardTable entries={result.entries} />
          </>
        )}

        {!result.loading && result.entries.length === 0 && result.totalSlotsRequested === 0 && (
          <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            Click <span className="font-medium text-zinc-400">"Load / Refresh Leaderboard"</span> above to fetch real validator graffiti.
            <div className="text-xs mt-2 max-w-xs mx-auto">Start with 100–300 slots. 500+ will take noticeably longer on public endpoints.</div>
          </div>
        )}

        <div className="mt-12 text-[10px] text-zinc-600 leading-relaxed max-w-2xl">
          This MVP prioritizes correctness: we fetch the actual <code className="text-emerald-400">body.graffiti</code> field from beacon blocks (the 32 bytes validators set with <code>--graffiti</code> in their client).
          This is deliberately slower than reading execution <code>extraData</code>.
        </div>
      </div>
    </div>
  )
}

export default App
