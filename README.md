# Puzzle Zone

A free, mobile-first family puzzle app: Sudoku and Petdoku, four difficulty levels, local profiles, daily challenges, statistics, backups and offline play. React, Vite, JavaScript and plain CSS. No accounts, backend, paid services, API keys, advertisements or remote fonts.

## Run locally

Install **Node.js 22.18+** (or a current Node 24 LTS) and open this `puzzle-games` folder in VS Code. In its terminal:

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173/puzzle-games/**. Stop the server with Ctrl+C.

### Play on your phone on the same network

1. Connect the computer and phone to the same Wi-Fi.
2. Run `npm run dev`. The server listens on all network interfaces.
3. Find the Network URL printed by Vite, or run `ipconfig` and find your Wi-Fi adapter's IPv4 address.
4. Open `http://YOUR-COMPUTER-IP:5173/puzzle-games/` on the phone.
5. If Windows asks, allow Node.js on your **private** network. VPNs, guest Wi-Fi isolation or firewall policies may prevent phone access.

Online gameplay works over the LAN. **PWA installation and service workers require HTTPS or localhost**, so use the deployed GitHub Pages URL to test offline installation on a real phone. Device profiles are separate: playing on a phone does not transfer your computer's progress. Use a JSON backup to transfer it.

## Validation and production preview

```powershell
npm test
npm run build
npm run preview
```

Production preview: **http://localhost:4173/puzzle-games/**. Development mode deliberately does not register the service worker. The production build precaches the app shell, both lazy game code and all puzzle data.

Browser integration tests use Playwright:

```powershell
npm run build
npm run test:e2e
```

On Windows the tests use installed Google Chrome. On other platforms run `npx playwright install chromium` first. The tests own and stop their production preview server; port 4173 must be available. Screenshots and failed traces go to ignored `test-results/`.

Unit tests validate **every catalogue puzzle**, solution uniqueness, Sudoku technique ratings, generated transformations, Petdoku connectivity and rules, notes, hints, undo/redo, timer arithmetic, profile isolation, storage validation, migration, quota failure, backup round trips, daily determinism, history pruning and aggregate accounting. Browser tests exercise actual game completion, save/resume, profiles, backups, daily repeat prevention, responsive layouts and offline lazy loading.

## Deploy to GitHub Pages for free

Nothing is pushed or published automatically from this local folder. When you decide to publish:

1. Create a GitHub repository named **puzzle-games**. For free GitHub Pages, use a public repository on GitHub Free.
2. Put the **contents of this folder** at the repository root. `package.json`, `src/`, `public/` and `.github/` must be at the root, rather than inside another `puzzle-games` directory. Do not upload `node_modules`, `.npm-cache`, `dist` or test results.
3. If using Git, run the following from this folder, replacing the URL with your own repository. Do not run `git init` again if you already have a repository here.

   ```powershell
   git init
   git add .
   git commit -m "Build Puzzle Zone"
   git branch -M main
   git remote add origin https://github.com/USERNAME/puzzle-games.git
   git push -u origin main
   ```

4. On GitHub, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Open the **Actions** tab and run **Deploy Puzzle Zone to GitHub Pages** if the push workflow has not started. The workflow runs unit tests, builds, uploads `dist`, and deploys through GitHub Pages.
6. Wait for both jobs to succeed. Open the deployment URL shown by GitHub, normally **https://USERNAME.github.io/puzzle-games/**.
7. Open the site online once, wait for offline caching, then test airplane mode and reload. On Safari use Share → Add to Home Screen. On Android choose Install app or Add to Home screen.

The Vite base is `/puzzle-games/`. Hash navigation (`#stats`, `#sudoku`) works with refreshes and direct links on Pages without server rewrites. The manifest and worker scope are relative to the same repository path. If you rename the repository or use a custom domain, update `base` in `vite.config.js` before rebuilding; the manifest and worker paths adjust relative to the site root automatically.

The provided workflow assumes this folder is the repository root. If deploying from a larger repository, configure the workflow working directory, npm cache dependency path and uploaded artifact directory accordingly.

## How to play

**Sudoku:** put 1–9 exactly once in every row, column and 3×3 box. Given numbers cannot change. Tap a cell and the number keypad. Notes toggle pencil marks. Arrow keys move between cells; 1–9 enters numbers, N toggles notes, Delete/Backspace erases, and Ctrl/Cmd+Z undoes (Shift adds redo). Wrong entries have red underlines. Hints reveal a correct cell. Restart clears entries and history while retaining elapsed time, mistakes and hints to keep results honest.

**Petdoku:** exactly one pet in each row, column and contiguous colour region. Pets cannot touch, including diagonally. Tap a cell to cycle **empty → × excluded → pet → empty**. Regions also have numbers so colours are not the only clue. Conflicting pets have red underlines. The keyboard can navigate cells and Space/Enter cycles a focused cell. A hint places one correct pet; it does not erase conflicting pets you placed elsewhere.

Both games open paused. Start/Resume begins the timer. Explicit pause, hiding the page, navigation away and page closing checkpoint it. Background time is excluded. Undo/redo retains cumulative mistake and hint counts. Games save on moves and lifecycle events, rather than every timer tick. Starting a new game confirms abandoning the old one. There is one unfinished save per game per player.

## Puzzles and difficulty

- Version 1 contains **24 Sudoku bases** (6 per level), with seeded digit permutations, row/band and column/stack permutations, and transposition for variety.
- Sudoku bases are uniquely solved by a backtracking solver. Difficulty is the strongest technique required by a deterministic assessment: Easy = naked singles; Medium = hidden singles; Hard = naked pairs or locked candidates; Expert = search needed after those techniques. These are **application-specific technique bands**, not a claim to match a commercial or universal human difficulty scale.
- Petdoku contains **48 uniquely solved, contiguous region maps** (12 per level) with seeded rotations/reflections and region relabeling. Easy is 5×5, Medium 6×6, Hard 7×7, Expert 8×8. Larger boards generally involve more possibilities; difficulty within each size varies. There is no human-technique rating for Petdoku.
- Runtime puzzle selection and transformations are bounded and inexpensive. No puzzle search runs in the game UI. `npm run catalogue` reproducibly regenerates and validates the curated data offline (takes several seconds).
- Daily seeds include **catalogue version, local calendar date, game and difficulty**. Devices on the same local date with the same application version get the same puzzle. Different time zones can be on different challenge dates. Finished daily combinations cannot be completed again for extra statistics.
- This is a finite catalogue. Free-play puzzles and daily puzzle layouts can eventually repeat; transformed Sudoku variants provide much greater variety than Petdoku. Preserve catalogue v1 and its transformation algorithm if extending the app so existing saves remain compatible. Introduce a new version deliberately for future catalogues.

## Storage, statistics and privacy

Only browser **localStorage** holds user data. App files live in the bounded service-worker cache. No progress is sent to a server. Optional player names and emoji avatars are the only profile details.

`src/lib/storage.js` owns versioned envelopes, known-schema migrations, defensive save/backup validation, quota warnings and the storage usage indicator. Keys separate profile metadata (`pz:profiles`), preferences (`pz:settings`) and player progress (`pz:player:ID`). UUIDs isolate family members. Version 0 migration supports the documented pre-streak development envelope; unknown future versions are not interpreted. Malformed player data falls back safely; restore a backup to recover progress.

Per-game/per-level aggregates retain starts, completions, abandonments, active time, solve time totals, personal best, last solve time, mistakes, hints, completion streaks and daily playing streaks. Global streaks and the latest 500 completions are retained per player. The dashboard filters aggregate statistics and shows up to 50 of those history records. Average solve time uses completed puzzles only; time played also includes unfinished/abandoned attempts. Daily streaks count local calendar days with play. Completion streaks reset when abandoning an attempt. The family leaderboard compares local profiles only.

Settings can export a single player or all local profiles and preferences as JSON. Imports validate file size, schema, boards, undo/redo, catalogue identity, counters and history. Restore as new players by default, or explicitly choose one existing player and confirm replacing progress. Restoring settings is optional. Backups are **not encrypted**; store files appropriately. Export periodically: browser clearing, storage eviction and private browsing can remove local data.

## Offline behavior and updates

The build derives an exact precache list including both games. First installation requires connectivity; offline availability starts once the worker finishes installing. Updates install a new cache without replacing an active worker immediately. An update banner lets the player choose when to reload. Saves are versioned localStorage data and are not removed by cache updates. The worker caches only known app files and never grows a data cache from arbitrary requests.

Browser refresh and ordinary page suspension save timestamps accurately. An operating-system crash or force kill **without lifecycle events** can lose elapsed time since the last meaningful action; no browser-only solution can guarantee a final write after that. Each move has already saved the board. Normal refresh, tab hiding and navigation are tested. Safari/iOS and Android hardware testing is still recommended; automated mobile checks emulate Chrome viewport sizes, not native mobile operating systems.

## Project map and extending

```text
src/
  data/catalogue.json       Versioned, validated puzzle bases
  engines/                 Sudoku/Petdoku solvers, seeded transformations
  lib/game.js              Pure actions, snapshots, timer helpers
  lib/storage.js           Persistence, profiles, statistics, backups
  ui/Game.jsx              Lazy game screen and shared controls
  main.jsx                 Shell, home, profiles, stats, settings
  styles.css               Responsive theme and accessible focus states
  tests/                   Vitest engine and storage tests
e2e/                       Browser integration and offline tests
public/                    Manifest, worker and install icons
scripts/                   Reproducible catalogue and icon generation
.github/workflows/         GitHub Pages test/build/deploy
```

To add a game, introduce an engine and bounded puzzle source, register it in puzzle selection, extend the shared game action/validation dispatch and persistence allowlists, add a game card and instructions, and test it. No backend or routing restructuring is required. PNG icons are checked in; the optional `scripts/icons.ps1` regenerates them on Windows using System.Drawing.

The app uses semantic controls, labels, visible focus, reduced-motion preferences, region numbers, touch controls and light/dark modes. Sound is off by default and generated with the browser audio API only when enabled.
