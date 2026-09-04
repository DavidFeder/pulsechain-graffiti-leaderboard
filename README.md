# PulseChain Graffiti Leaderboard

**Live:** [leaderboard.validatorstore.com](https://leaderboard.validatorstore.com)

Real beacon chain graffiti leaderboard for PulseChain. Shows the most popular graffiti messages set by validators over the last **500 slots**.

---

### Features

- Real **beacon chain** graffiti (not execution-layer `extraData`)
- Fixed 500-slot sliding window (fast + reliable on public endpoints)
- Two-tier local caching for instant return visits
- Incremental fetching only persists a new window when every requested slot is a block or a 404 missed proposal — aborted or rate-limited fetches never overwrite a good cache
- Web Worker aggregation so the UI stays responsive
- Same-origin proxy for the beacon API (head + per-slot blocks only, to avoid an open proxy)
- Copy-to-clipboard on every graffiti entry
- Search / filter
- Vercel Analytics + Speed Insights
- Strong security headers (CSP, COOP, HSTS, etc.)

---

### Quick Start

```bash
git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
cd pulsechain-graffiti-leaderboard
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

The Vite dev server proxies `/api/beacon` and `/api/beacon-fallback` so local development hits the same beacon APIs as production (no `vercel dev` required).

#### Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start development server      |
| `npm run build`   | Type-check + production build |
| `npm run preview` | Preview production build      |
| `npm run lint`    | Run ESLint                    |
| `npm test`        | Run unit tests                |
| `npm run format`  | Format with Prettier          |

---

### Architecture

- **Two-tier caching**
  - Tiny “quick” snapshot in `localStorage` → instant first paint for returning visitors
  - Full 500-slot window of raw records → correct incremental updates

- **Same-origin proxy**  
  Browser calls `/api/beacon/*` (g4mm4) with automatic failover to `/api/beacon-fallback/*` (PublicNode). Rewrites are limited to `eth/v1/beacon/headers/head` and `eth/v2/beacon/blocks/:slot`. Vite uses a trailing slash on `/api/beacon/` so it cannot prefix-match the fallback path. That avoids CORS, keeps CSP `connect-src` on `'self'`, and is not an open proxy.

- **Web Worker**  
  Counting and sorting run off the main thread.

- **Incremental fetching**  
  After the first load we only request new slots since the last cached head. Incomplete fetches (API errors, not missed proposals) keep the previous window and offer a Full refresh.

- **AbortController**  
  In-flight requests are cancelled when the user triggers a new load. Aborted work does not persist a partial cache.

---

### Tech Stack

- Vite + React 18 + TypeScript + Tailwind CSS
- `@vitejs/plugin-react-swc` for fast builds
- Vercel (hosting + analytics + edge proxy, with PublicNode beacon failover)
- Vitest for decode / aggregation / cache / retry unit tests
- Pure client-side — no custom backend

---

Built for the PulseChain community by [ValidatorStore](https://validatorstore.com). MIT licensed.
