# PulseChain Graffiti Leaderboard

**Live:** [leaderboard.validatorstore.com](https://leaderboard.validatorstore.com)

Real beacon chain graffiti leaderboard for PulseChain. Shows the most popular graffiti messages set by validators over the last **500 slots**.

---

### Features

- Real **beacon chain** graffiti (not execution-layer `extraData`)
- Fixed 500-slot sliding window (fast + reliable on public endpoints)
- Two-tier local caching for instant return visits
- Incremental updates (only fetches new slots since last visit)
- Web Worker aggregation so the UI stays responsive
- Same-origin proxy for the beacon API (avoids CORS issues)
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

#### Scripts

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm run dev`        | Start development server       |
| `npm run build`      | Type-check + production build  |
| `npm run preview`    | Preview production build       |
| `npm run lint`       | Run ESLint                     |
| `npm run format`     | Format with Prettier           |

---

### Architecture

- **Two-tier caching**
  - Tiny “quick” snapshot in `localStorage` → instant first paint for returning visitors
  - Full 500-slot window of raw records → correct incremental updates

- **Same-origin proxy**  
  Browser calls `/api/beacon/*` → Vercel rewrites to the public beacon API.  
  This eliminates CORS problems that most public beacon endpoints have.

- **Web Worker**  
  Counting and sorting run off the main thread.

- **Incremental fetching**  
  After the first load we only request new slots since the last cached head.

- **AbortController**  
  In-flight requests are cancelled when the user triggers a new load.

---

### Tech Stack

- Vite + React 18 + TypeScript + Tailwind CSS
- `@vitejs/plugin-react-swc` for fast builds
- Vercel (hosting + analytics + edge proxy)
- Pure client-side — no custom backend

---

Built for the PulseChain community by [ValidatorStore](https://validatorstore.com).
