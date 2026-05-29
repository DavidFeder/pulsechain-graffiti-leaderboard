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

  return (
    <div className="overflow-x-auto">
      <table className="leaderboard-table w-full text-sm">
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>GRAFFITI</th>
            <th className="w-24 text-right">COUNT</th>
            <th className="w-28 text-right">% OF BLOCKS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="font-mono text-zinc-500">{index + 1}</td>
              <td>
                <code className="graffiti-cell bg-zinc-950 px-2 py-1 rounded text-purple-400 text-[13px]">
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
