import React from 'react'
import { GraffitiEntry } from '../hooks/useBeaconGraffiti'

interface Props {
  entries: GraffitiEntry[]
}

export function LeaderboardTable({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        No graffiti found in the selected range.
      </div>
    )
  }

  const getMetalBadge = (index: number) => {
    if (index === 0) {
      // Gold
      return (
        <div
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-[11px] font-bold text-amber-950 shadow-inner ring-1 ring-yellow-400/60"
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
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-[11px] font-bold text-slate-700 shadow-inner ring-1 ring-slate-300/60"
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
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-[11px] font-bold text-amber-100 shadow-inner ring-1 ring-orange-400/60"
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
            <th className="w-32 pl-6">#</th>
            <th>GRAFFITI</th>
            <th className="w-24 text-right">COUNT</th>
            <th className="w-28 text-right">% OF BLOCKS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="pl-6">
                <div className="flex items-center gap-2">
                  {getMetalBadge(index) || (
                    <span className="font-mono text-zinc-500 pl-1">{index + 1}</span>
                  )}
                </div>
              </td>
              <td>
                <code className="graffiti-cell bg-zinc-950 px-2 py-1 rounded text-[#FF00AA] text-[13px]">
                  {entry.graffiti}
                </code>
              </td>
              <td className="text-right font-medium tabular-nums">{entry.count}</td>
              <td className="text-right font-mono text-zinc-400">
                {entry.percentage.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
