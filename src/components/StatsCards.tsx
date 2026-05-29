import React from 'react'
import { FetchResult } from '../hooks/useBeaconGraffiti'

interface Props {
  result: FetchResult
}

export function StatsCards({ result }: Props) {
  const { totalSlotsRequested, totalSlotsFetched, slotsWithGraffiti, uniqueGraffiti, isFromCache, cachedAt } = result

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="stat-card">
        <div className="text-xs text-zinc-500 mb-1">SLOTS IN WINDOW</div>
        <div className="text-3xl font-semibold tabular-nums">{totalSlotsRequested.toLocaleString()}</div>
      </div>
      <div className="stat-card">
        <div className="text-xs text-zinc-500 mb-1">SLOTS WITH DATA</div>
        <div className="text-3xl font-semibold tabular-nums">{totalSlotsFetched.toLocaleString()}</div>
        <div className="text-[10px] text-zinc-500 mt-1">{totalSlotsRequested > 0 ? Math.round((totalSlotsFetched / totalSlotsRequested) * 100) : 0}% coverage</div>
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
  )
}
