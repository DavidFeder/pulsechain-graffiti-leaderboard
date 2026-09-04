import { FetchResult } from '../hooks/useBeaconGraffiti'
import { formatRelativeTime } from '../utils/formatRelativeTime'
import { slotExplorerUrl } from '../lib/beacon/explorers'
import { ExternalLink } from 'lucide-react'

interface Props {
  result: FetchResult
}

export function StatsCards({ result }: Props) {
  const {
    totalSlotsRequested,
    totalSlotsFetched,
    slotsWithGraffiti,
    uniqueGraffiti,
    cachedAt,
    lastHeadSlot,
  } = result

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">SLOTS IN WINDOW</div>
          <div className="text-3xl font-semibold tabular-nums">
            {totalSlotsRequested.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">SLOTS WITH DATA</div>
          <div className="text-3xl font-semibold tabular-nums">
            {totalSlotsFetched.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {totalSlotsRequested > 0
              ? Math.round((totalSlotsFetched / totalSlotsRequested) * 100)
              : 0}
            % coverage
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">BLOCKS WITH GRAFFITI</div>
          <div className="text-3xl font-semibold tabular-nums">
            {slotsWithGraffiti.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">UNIQUE GRAFFITI</div>
          <div className="text-3xl font-semibold tabular-nums">{uniqueGraffiti}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        {typeof lastHeadSlot === 'number' && lastHeadSlot > 0 && (
          <a
            href={slotExplorerUrl(lastHeadSlot)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[#00D4FF] focus:outline-none focus-visible:underline"
          >
            Head slot {lastHeadSlot.toLocaleString()}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
        {cachedAt && <span>Last updated {formatRelativeTime(cachedAt)}</span>}
      </div>
    </div>
  )
}
