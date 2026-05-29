## PulseChain Validator Graffiti Leaderboard

**Real beacon chain graffiti data** — fetched directly from the consensus layer (where validators actually set `--graffiti "..."` in Lighthouse, Prysm, etc).

This is a **client-side only** tool. No backend, no indexer, no API keys.

### Key Features

- Uses the **real 32-byte beacon graffiti field** (not the often-junk `extraData`)
- **Excellent returning visitor experience** via localStorage persistence
- Smart incremental updates: only fetches new slots since your last visit
- Because it's immutable blockchain data, cached results remain valid for a long time

### How the Caching Works (The Best Part)

1. First visit: Full fetch of the requested window (e.g. last 300 slots)
2. The raw `[{slot, graffiti}, ...]` records + metadata are saved to localStorage
3. Next visit: You see the full leaderboard **instantly** from cache
4. The "Update with latest blocks" button only fetches the *new* slots that appeared since you last opened the app (often just 5–40 blocks)
5. The window automatically slides forward — old slots are dropped and counts are recalculated

This design takes full advantage of the fact that blockchain history is immutable. Old graffiti data never becomes invalid.

### Running locally

```bash
git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
cd pulsechain-graffiti-leaderboard
npm install
npm run dev
```

Open http://localhost:5173

### Current Status

- [x] Real beacon graffiti decoding
- [x] LocalStorage persistence + cheap incremental updates
- [ ] Live auto-refresh (polling)
- [ ] Web Worker for zero jank
- [ ] Charts, trends, and time-series
- [ ] Validator identity lookup (proposer index → graffiti history)
- [ ] Export CSV / shareable links

### Tech

- Vite + React + TypeScript + Tailwind
- Direct calls only to `https://rpc-pulsechain.g4mm4.io/beacon-api/`

Built for the PulseChain community. All data is public and permanent on-chain.