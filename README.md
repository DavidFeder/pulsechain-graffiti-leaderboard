## PulseChain Validator Graffiti Leaderboard

**Real beacon chain graffiti data** — fetched directly from the consensus layer (where validators actually set `--graffiti "..."` in Lighthouse, Prysm, etc).

This is **Phase 1 MVP**. Pure client-side. No backend. No indexing service.

### Current Status
- Fetches the last N slots via the public beacon API
- Decodes the 32-byte `graffiti` field correctly (strips null padding)
- Shows frequency leaderboard
- Works today on https://rpc-pulsechain.g4mm4.io/beacon-api/

### Why this matters
Most "graffiti" you see in block explorers (extraData) is just client version strings (geth, linux, etc). The *real* tags validators deliberately put on the chain live in the beacon block body.

### Running locally

```bash
git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
cd pulsechain-graffiti-leaderboard
npm install
npm run dev
```

Then open http://localhost:5173

### Roadmap (planned)
- [ ] Increase default window (currently limited for perf)
- [ ] Live auto-refresh + sliding window
- [ ] Web Worker for heavy processing
- [ ] Better charts + historical trends
- [ ] Proposer index + validator identity lookup
- [ ] Export CSV / shareable links

### Tech
- Vite + React + TypeScript + Tailwind
- Direct calls to PulseChain beacon API only
- No external dependencies beyond React for the MVP

Built for fun by the PulseChain community. Data is public and on-chain forever.