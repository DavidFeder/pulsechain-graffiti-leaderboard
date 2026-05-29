import React from 'react'
import { FetchResult } from '../hooks/useBeaconGraffiti'

interface Props {
  result: FetchResult
}

export function StatsCards({ result }: Props) {
  const { totalSlotsRequested, totalSlotsFetched, slotsWithGraffiti, uniqueGraffiti } = result

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="stat-card">
        <div className="text-xs text-zinc-500 mb-1">SLOTS REQUESTED</div>
        <div className="text-3xl font-semibold tabular-nums">{totalSlotsRequested.toLocaleString()}</div>
      </div>
      <div className="stat-card">
        <div className="text-xs text-zinc-500 mb-1">SLOTS FETCHED</div>
        <div className="text-3xl font-semibold tabular-nums">{totalSlotsFetched.toLocaleString()}</div>
        <div className="text-[10px] text-zinc-500 mt-1">{totalSlotsRequested > 0 ? Math.round((totalSlotsFetched / totalSlotsRequested) * 100) : 0}% success</div>
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
