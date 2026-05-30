## PulseChain Validator Graffiti Leaderboard

Real beacon chain graffiti leaderboard. Shows the most popular graffiti messages set by validators on the PulseChain network.

### Quick Start

```bash
git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
cd pulsechain-graffiti-leaderboard
npm install
npm run dev
```

Open http://localhost:5173

### Features

- Uses real beacon chain graffiti data
- Fast local caching with incremental updates
- Runs entirely in the browser
- Good Windows support

### Running on Windows

1. Install [Node.js (LTS)](https://nodejs.org) and [Git for Windows](https://git-scm.com/download/win)
2. Open PowerShell or Command Prompt
3. Run the commands above

**Important**: After installing Node.js, **close and reopen** your terminal before running `npm install`.

**Easiest install method**:
```powershell
winget install OpenJS.NodeJS.LTS
```

Then close and reopen PowerShell, navigate to the folder, and run `npm install`.

### Architecture (for developers)

- **Two-tier caching**: A small "quick" snapshot is used for instant first paint. A larger sliding window of raw records is kept for correct incremental updates.
- **Web Worker**: Heavy aggregation (counting + sorting) runs off the main thread so the UI stays responsive even on slower machines.
- **Incremental fetching**: On subsequent loads we only request new slots since the last cached head instead of re-fetching everything.
- **AbortController**: Every network request is cancellable. Changing the slot count or navigating away instantly aborts previous work.
- Source of truth for graffiti is the beacon chain `body.graffiti` field (32 bytes), not execution-layer `extraData`.

### Tech

- Vite + React 18 + TypeScript + Tailwind
- Pure client-side (no backend)

Built for the PulseChain community.

---

*Forced redeploy trigger - 2026-05-30*