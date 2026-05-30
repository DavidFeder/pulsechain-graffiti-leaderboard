import React, { useState } from 'react'
import { GraffitiEntry } from '../hooks/useBeaconGraffiti'
import { Copy, Check } from 'lucide-react'

interface Props {
  entries: GraffitiEntry[]
  searchTerm?: string
}

export function LeaderboardTable({ entries, searchTerm }: Props) {
  const [copiedGraffiti, setCopiedGraffiti] = useState<string | null>(null)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedGraffiti(text)
      // Reset feedback after a short delay
      setTimeout(() => setCopiedGraffiti(null), 1400)
    } catch {
      // Clipboard API not available (very old browsers) — fallback to nothing
    }
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        {searchTerm 
          ? `No matches for “${searchTerm}”.` 
          : 'No graffiti found in the selected range.'}
      </div>
    )
  }

  const getMetalBadge = (index: number) => {
    if (index === 0) {
      // Gold
      return (
        <div
          className="ml-4 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-[11px] font-bold text-amber-950 shadow-inner ring-1 ring-yellow-400/60"
          aria-label="1st place"
          title="1st place - Gold"
        >
          1
        </div>
      )
    }
    if (index === 1) {
      // Silver
      return (
        <div
          className="ml-4 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-[11px] font-bold text-slate-700 shadow-inner ring-1 ring-slate-300/60"
          aria-label="2nd place"
          title="2nd place - Silver"
        >
          2
        </div>
      )
    }
    if (index === 2) {
      // Bronze
      return (
        <div
          className="ml-4 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-[11px] font-bold text-amber-100 shadow-inner ring-1 ring-orange-400/60"
          aria-label="3rd place"
          title="3rd place - Bronze"
        >
          3
        </div>
      )
    }
    return null
  }

  return (
    <div className="overflow-x-auto">
      <table className="leaderboard-table w-full text-sm">
        <thead>
          <tr>
            {/* Rank column has no text header — the medals/numbers are self-explanatory */}
            <th className="w-48 pl-16" aria-hidden="true"></th>
            <th>GRAFFITI</th>
            <th className="w-24 text-right">COUNT</th>
            <th className="w-28 text-right">% OF BLOCKS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const isCopied = copiedGraffiti === entry.graffiti
            return (
              <tr key={index}>
                <td className="pl-16">
                  <div className="flex items-center gap-2">
                    {getMetalBadge(index) || (
                      <div className="ml-4 flex h-7 w-7 items-center justify-center font-mono text-zinc-500 text-[11px]">
                        {index + 1}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2 group">
                    <code className="graffiti-cell bg-zinc-950 px-2 py-1 rounded text-[#FF00AA] text-[13px]">
                      {entry.graffiti}
                    </code>
                    <button
                      onClick={() => copyToClipboard(entry.graffiti)}
                      className="p-1 rounded text-zinc-500 hover:text-[#FF00AA] hover:bg-zinc-900 transition-colors opacity-60 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-[#FF00AA]/40"
                      title="Copy graffiti to clipboard"
                      aria-label={`Copy “${entry.graffiti}” to clipboard`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
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
  )
}
