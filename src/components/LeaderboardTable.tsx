import { useState } from 'react'
import { GraffitiEntry } from '../hooks/useBeaconGraffiti'
import { Copy, Check } from 'lucide-react'

interface Props {
  entries: GraffitiEntry[]
  searchTerm?: string
}

function Medal({ place, size = 'md' }: { place: 1 | 2 | 3; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-10 w-10 text-sm' : size === 'md' ? 'h-8 w-8 text-xs' : 'h-7 w-7 text-[11px]'
  if (place === 1) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 font-bold text-amber-950 shadow-inner ring-1 ring-yellow-400/60 ${dim}`}
        aria-label="1st place"
        title="1st place - Gold"
      >
        1
      </div>
    )
  }
  if (place === 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 font-bold text-slate-700 shadow-inner ring-1 ring-slate-300/60 ${dim}`}
        aria-label="2nd place"
        title="2nd place - Silver"
      >
        2
      </div>
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 font-bold text-amber-100 shadow-inner ring-1 ring-orange-400/60 ${dim}`}
      aria-label="3rd place"
      title="3rd place - Bronze"
    >
      3
    </div>
  )
}

function PodiumCard({
  entry,
  place,
  copied,
  onCopy,
}: {
  entry: GraffitiEntry
  place: 1 | 2 | 3
  copied: boolean
  onCopy: (text: string) => void
}) {
  const isGold = place === 1
  return (
    <div
      className={`flex flex-col items-center rounded-xl border px-3 pb-4 text-center ${
        isGold
          ? 'min-w-[9.5rem] flex-[1.15] border-yellow-400/40 bg-yellow-400/[0.07] pt-6 sm:min-w-[12rem]'
          : place === 2
            ? 'min-w-[8rem] flex-1 border-slate-400/30 bg-slate-300/[0.05] pt-4 sm:min-w-[10rem]'
            : 'min-w-[8rem] flex-1 border-orange-400/30 bg-orange-500/[0.06] pt-4 sm:min-w-[10rem]'
      }`}
    >
      <Medal place={place} size={isGold ? 'lg' : 'md'} />
      <div className="mt-3 flex max-w-full items-center gap-1.5">
        <code className="graffiti-cell max-w-[10rem] truncate rounded bg-zinc-950 px-2 py-1 text-[12px] text-[#FF00AA] sm:max-w-[14rem]">
          {entry.graffiti}
        </code>
        <button
          onClick={() => onCopy(entry.graffiti)}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-[#FF00AA] focus:outline-none focus:ring-1 focus:ring-[#FF00AA]/40"
          title="Copy graffiti to clipboard"
          aria-label={`Copy “${entry.graffiti}” to clipboard`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className={`mt-2 font-semibold tabular-nums ${isGold ? 'text-lg' : 'text-sm'}`}>{entry.count}</div>
      <div className="text-[11px] text-zinc-500">{entry.percentage.toFixed(1)}%</div>
    </div>
  )
}

export function LeaderboardTable({ entries, searchTerm }: Props) {
  const [copiedGraffiti, setCopiedGraffiti] = useState<string | null>(null)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedGraffiti(text)
      setTimeout(() => setCopiedGraffiti(null), 1400)
    } catch {
      // Clipboard API not available (very old browsers)
    }
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500">
        {searchTerm
          ? `No matches for “${searchTerm}”.`
          : 'No graffiti found in the selected range.'}
      </div>
    )
  }

  // Podium + medals apply only to the unfiltered leaderboard so a search
  // does not accidentally crown the first three matching rows.
  const celebrateTop = !searchTerm
  const top3 = celebrateTop ? entries.slice(0, 3) : []

  const getMetalBadge = (index: number) => {
    if (!celebrateTop) return null
    if (index === 0) return <Medal place={1} size="md" />
    if (index === 1) return <Medal place={2} size="sm" />
    if (index === 2) return <Medal place={3} size="sm" />
    return null
  }

  const rowWash = (index: number) => {
    if (!celebrateTop) return undefined
    if (index === 0) return 'bg-yellow-400/[0.06]'
    if (index === 1) return 'bg-slate-300/[0.05]'
    if (index === 2) return 'bg-orange-500/[0.06]'
    return undefined
  }

  return (
    <div>
      {top3.length > 0 && (
        <div className="mb-6 flex items-end justify-center gap-2 sm:gap-3">
          {top3[1] && (
            <PodiumCard
              entry={top3[1]}
              place={2}
              copied={copiedGraffiti === top3[1].graffiti}
              onCopy={copyToClipboard}
            />
          )}
          {top3[0] && (
            <PodiumCard
              entry={top3[0]}
              place={1}
              copied={copiedGraffiti === top3[0].graffiti}
              onCopy={copyToClipboard}
            />
          )}
          {top3[2] && (
            <PodiumCard
              entry={top3[2]}
              place={3}
              copied={copiedGraffiti === top3[2].graffiti}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="leaderboard-table w-full text-sm">
          <thead>
            <tr>
              <th className="w-12 pr-2" scope="col">
                <span className="sr-only">Rank</span>
              </th>
              <th>GRAFFITI</th>
              <th className="w-24 text-right">COUNT</th>
              <th className="w-28 text-right">% OF BLOCKS</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const isCopied = copiedGraffiti === entry.graffiti
              return (
                <tr key={index} className={rowWash(index)}>
                  <td className="w-12 pr-2">
                    <div className="flex items-center justify-center">
                      {getMetalBadge(index) || (
                        <div className="flex h-7 w-7 items-center justify-center font-mono text-[11px] text-zinc-500">
                          {index + 1}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="group flex items-center gap-2">
                      <code className="graffiti-cell rounded bg-zinc-950 px-2 py-1 text-[13px] text-[#FF00AA]">
                        {entry.graffiti}
                      </code>
                      <button
                        onClick={() => copyToClipboard(entry.graffiti)}
                        className="rounded p-1 text-zinc-500 opacity-60 transition-colors hover:bg-zinc-900 hover:text-[#FF00AA] group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-[#FF00AA]/40"
                        title="Copy graffiti to clipboard"
                        aria-label={`Copy “${entry.graffiti}” to clipboard`}
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="text-right font-medium tabular-nums">{entry.count}</td>
                  <td className="text-right font-mono text-zinc-400">
                    {entry.percentage.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
