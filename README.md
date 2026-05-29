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

### Testing on Windows

#### Prerequisites

1. Install **Node.js** (LTS version recommended) from [nodejs.org](https://nodejs.org/en/download/)
2. Install **Git for Windows** from [git-scm.com](https://git-scm.com/download/win)

> **Important**: After installing Node.js, **completely close and reopen** any terminals or PowerShell windows. This is the #1 reason `npm` is "not recognized" even after a successful install.

#### Step-by-step Instructions

1. Open **PowerShell** (recommended) or Command Prompt

2. Clone the repository:
   ```powershell
   git clone https://github.com/DavidFeder/pulsechain-graffiti-leaderboard.git
   cd pulsechain-graffiti-leaderboard
   ```

   > Because this is a **private repository**, Git will prompt you to authenticate with GitHub. Git for Windows includes the Git Credential Manager, which makes signing in with your GitHub account easy.

3. Install dependencies:
   ```powershell
   npm install
   ```

4. Start the development server:
   ```powershell
   npm run dev
   ```

5. Open your browser and go to the URL shown in the terminal (usually `http://localhost:5173/`).

#### Recommended Way to Work on Windows

- Use **Visual Studio Code** + its integrated terminal (much nicer than plain PowerShell).
- In VS Code: `Ctrl + `` ` (backtick) to open the terminal, then run the commands above.
- To stop the dev server, press `Ctrl + C` in the terminal.

#### Common Windows Gotchas & Fixes

- **"'npm' is not recognized"** (most common issue):
  - You **must** close the current PowerShell window completely and open a **brand new** one after installing Node.js.
  - This happens even when winget or the installer says "Successfully installed".
  - Example: User ran `winget install OpenJS.NodeJS.LTS`, saw "Successfully installed", then immediately ran `npm install` in the **same** terminal → error.
  - **Fix**: Close PowerShell → open it again → try `node --version` and `npm --version`.

- **Using `&&` between commands fails**:
  - Old Windows PowerShell (the default `PS` prompt) does not support `&&`.
  - Use two separate lines instead, or upgrade to modern PowerShell 7.

- **Port 5173 already in use**: Vite will automatically offer you another port (e.g. 5174).

- **Slow first `npm install`**: Normal on Windows. Subsequent installs are much faster.

- **Antivirus / Windows Defender** flagging something: This is rare with Vite projects. You can usually ignore it.

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