import { useState } from 'react'
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

  const getMetalBadge = (index: number) => {
    if (index === 0) {
      return (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 text-[11px] font-bold text-amber-950 shadow-inner ring-1 ring-yellow-400/60"
          aria-label="1st place"
          title="1st place - Gold"
        >
          1
        </div>
      )
    }
    if (index === 1) {
      return (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-[11px] font-bold text-slate-700 shadow-inner ring-1 ring-slate-300/60"
          aria-label="2nd place"
          title="2nd place - Silver"
        >
          2
        </div>
      )
    }
    if (index === 2) {
      return (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-[11px] font-bold text-amber-100 shadow-inner ring-1 ring-orange-400/60"
          aria-label="3rd place"
          title="3rd place - Bronze"
        >
          3
        </div>
      )
    }
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[11px] text-zinc-500">
        {index + 1}
      </div>
    )
  }

  const copyButton = (graffiti: string) => {
    const isCopied = copiedGraffiti === graffiti
    return (
      <button
        onClick={() => copyToClipboard(graffiti)}
        className="shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-[#FF00AA] focus:outline-none focus:ring-1 focus:ring-[#FF00AA]/40"
        title="Copy graffiti to clipboard"
        aria-label={`Copy “${graffiti}” to clipboard`}
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    )
  }

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {entries.map((entry, index) => (
          <li
            key={index}
            className="rounded-lg border border-zinc-800 bg-[#111] px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              {getMetalBadge(index)}
              <code className="graffiti-cell min-w-0 flex-1 rounded bg-zinc-950 px-2 py-1 text-[13px] text-[#FF00AA]">
                {entry.graffiti}
              </code>
              {copyButton(entry.graffiti)}
            </div>
            <div className="mt-1.5 flex items-center justify-between pl-9 text-xs text-zinc-400">
              <span className="font-medium tabular-nums text-zinc-300">{entry.count}</span>
              <span className="font-mono">{entry.percentage.toFixed(1)}%</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
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
            {entries.map((entry, index) => (
              <tr key={index}>
                <td className="pl-16">
                  <div className="flex items-center gap-2">
                    {index < 3 ? (
                      <div className="ml-4">{getMetalBadge(index)}</div>
                    ) : (
                      <div className="ml-4 flex h-7 w-7 items-center justify-center font-mono text-[11px] text-zinc-500">
                        {index + 1}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <code className="graffiti-cell rounded bg-zinc-950 px-2 py-1 text-[13px] text-[#FF00AA]">
                      {entry.graffiti}
                    </code>
                    {copyButton(entry.graffiti)}
                  </div>
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
    </>
  )
}
