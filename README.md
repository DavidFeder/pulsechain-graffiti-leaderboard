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

### Tech

- Vite + React + TypeScript + Tailwind
- Pure client-side (no backend)

Built for the PulseChain community.