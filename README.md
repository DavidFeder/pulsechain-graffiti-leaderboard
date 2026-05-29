## PulseChain Validator Graffiti Leaderboard

**Real beacon chain graffiti data** — fetched directly from the consensus layer.

Pure client-side. No backend.

### Current Highlights

- Real 32-byte beacon `graffiti` field (not junk `extraData`)
- **localStorage persistence** with smart incremental updates
- **Web Worker** for all aggregation → cache hydration feels completely instant
- Lightweight pre-computed result + background re-aggregation for zero-jank returning visits

Because the data is immutable blockchain history, cached results are trustworthy for hours/days.

### Running

```bash
git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
cd pulsechain-graffiti-leaderboard
npm install
npm run dev
```

### Architecture Notes

- `useBeaconGraffiti` hook handles fetching + incremental logic
- All counting/sorting happens in `src/workers/graffitiAggregator.worker.ts`
- Two levels of caching:
  1. Raw records (for correct sliding windows)
  2. Pre-computed leaderboard (for instant paint)

### Next

- Background polling for new slots
- Charts + trends
- Validator lookup

Built for the PulseChain community.