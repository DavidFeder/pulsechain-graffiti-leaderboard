import { FetchResult } from '../hooks/useBeaconGraffiti'

interface Props {
  result: FetchResult
}

function formatRelativeTime(timestamp: number | null): string {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StatsCards({ result }: Props) {
  const { totalSlotsRequested, totalSlotsFetched, slotsWithGraffiti, uniqueGraffiti, cachedAt } = result

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">SLOTS IN WINDOW</div>
          <div className="text-3xl font-semibold tabular-nums">{totalSlotsRequested.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">SLOTS WITH DATA</div>
          <div className="text-3xl font-semibold tabular-nums">{totalSlotsFetched.toLocaleString()}</div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {totalSlotsRequested > 0 ? Math.round((totalSlotsFetched / totalSlotsRequested) * 100) : 0}% coverage
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">BLOCKS WITH GRAFFITI</div>
          <div className="text-3xl font-semibold tabular-nums">{slotsWithGraffiti.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-zinc-500 mb-1">UNIQUE GRAFFITI</div>
          <div className="text-3xl font-semibold tabular-nums">{uniqueGraffiti}</div>
        </div>
      </div>

      {cachedAt && (
        <div className="mt-2 text-[11px] text-zinc-500 text-right">
          Last updated {formatRelativeTime(cachedAt)}
        </div>
      )}
    </div>
  )
}
