# Puzzle Zone

A free, mobile-first family game collection: Sudoku, Petdoku, Flappy Jump, Wordle, Checkers, Dots and Boxes, Ludo, UNO, Trump Tricks, Sea Battle, Fruit Merge and Block Blast, with local profiles, same-device multiplayer, saved sessions, statistics, backups and offline play. React, Vite, JavaScript and plain CSS. Solo and same-device play need no backend or accounts. Optional different-device multiplayer uses a separate Cloudflare Worker; no player email accounts, paid services, advertisements or remote fonts are required.

## Play online from different devices

Open **Online rooms**, select a game, and create a room. Send the invitation link or eight-character code to your friend, who joins from another device. Checkers, Dots and Boxes, Ludo, UNO, Trump Tricks and Sea Battle are competitive; Sudoku, Petdoku and Wordle are cooperative; Flappy Jump is a matching-course score challenge. All players need internet. Existing solo and same-device modes remain available offline.

The configured service is `https://puzzle-zone-multiplayer.rahulsharma-rahul.workers.dev`, set in `public/multiplayer.json`. Deployment, local development, security, reconnection, room expiry and free-quota details are documented in **[ONLINE.md](ONLINE.md)**. The frontend must be pushed to GitHub Pages after changes to make the new online interface available there. Cloudflare backend changes are deployed separately with `npm run multiplayer:deploy`.

## Family sync across devices

In **Family**, create a shared family on one device, then enter its private family code on your other devices. Shared player names, avatars, unfinished games and statistics synchronize automatically. Select the correct shared player on each device. Existing device-only profiles are preserved, with an explicit copy-progress option for moving their saves into a shared player. Offline changes queue locally; conflicting changes require a choice and keep a recovery copy. Wait for **Up to date** before switching devices. See [ONLINE.md](ONLINE.md) for details and privacy.

## New games and same-device multiplayer

The home page has sixteen game cards. Sudoku and Petdoku keep their existing solo flow and add **Play together · Same device**. Each arcade game offers solo or same-device play. Ludo, UNO and Trump Tricks support 2-4 players, including three-player family matches; Sea Battle supports two. Choose another family profile or enter a guest name. Player one is the active profile; all shared results belong to that hosting profile. These modes use one device. For different devices, use Online rooms as described above.

| Game | Solo | Same-device multiplayer |
| --- | --- | --- |
| Sudoku | Existing four difficulties and daily puzzles | Cooperative shared board; turn changes after each board-changing action |
| Petdoku | Existing four difficulties, feedback and automatic crosses | Cooperative shared board with the same correctness feedback and automatic crosses |
| Flappy Jump | Tap/Space to fly through pipes and build a score | Each player takes one flight on exactly the same seeded course; highest score wins |
| Wordle | Five-letter English word, six guesses, daily or free play | Cooperative guessing; alternate submitted guesses and share six attempts |
| Checkers | Basic computer opponent | Two players alternate moves on one board |
| Dots and Boxes | Basic computer opponent | Two players draw edges; completing a box earns another turn |
| Ludo | 1-3 computer opponents | 2-4 players race four tokens home |
| UNO | 1-3 computer opponents | 2-4 players; private handoff between turns |
| Trump Tricks | 1-3 computer opponents | 2-4 players; private handoff between turns |
| Sea Battle | Computer opponent | Two players; private fleet setup and turns |

**Ludo:** roll six to enter a token; sixes, captures and reaching home earn another roll. A third consecutive six loses that roll and passes the turn. Pairs block passing and landing, including your own pairs; marked stars protect tokens from capture. The home lane begins after 51 outer-track positions, and exact rolls bring each token home at progress 56. First to bring all four home wins. These are the displayed family rules; regional variants differ.

**UNO:** independently drawn 108-card family version, seven cards each and a numeric opening discard. Match colour or value, or play a wild. Draw one and either play that card or pass; no stacking or draw-four challenges. Draw four is rejected when the hand has the current colour. Call UNO before playing from two cards to one; otherwise draw two automatically. Reverse acts as skip with two players. Draw actions penalize and skip the next player, including when the final card wins. First empty hand wins a single-hand match (no 500-point scoring). [Mattel rule reference](https://service.mattel.com/instruction_sheets/42003-Eng.pdf).

**Trump Tricks:** a casual trick-taking variant, not a specific regional Trump game. Deal seven cards each from a standard deck, reveal the next card to set trump, and let player one lead. Follow suit when possible; otherwise any card is legal. Highest trump wins, or highest led-suit card if no trump was played. The winner leads next. After seven tricks the most tricks wins; a tie for highest score is a draw. No bidding or partnerships.

**Sea Battle:** place straight ships of lengths 5, 4, 3, 3 and 2 on a 10x10 grid, manually or with Auto-place. Ships may touch but cannot overlap. Confirm locks your fleet. Players alternate one shot, including after a hit. Sink all five ships to win. Online fleet placement can happen independently; no shots until both confirm. The computer chooses targets from its own hit/miss history.

Same-device UNO, Trump and Sea Battle hide the next hand/fleet behind **Pass to player -> Show my turn**. This is courtesy privacy on a shared device; local saves/backups contain the complete match. Online devices receive only their own hand/fleet, public counts and played cards, plus their shot results; hidden fleets are revealed when the match ends. Computer opponents use simple heuristics.

**Flappy Jump:** tap the flight area, use the Jump button, or press Space/Up. Touching a pipe, ground or ceiling ends a flight. Pause saves the current flight. Leaving the page pauses it; press Start flight to continue. Refresh restores the last saved tap/pause checkpoint rather than replaying a continuously running simulation. A sudden force kill can lose movement since that checkpoint. No imported graphics, sounds or game assets are used.

**Wordle:** accepted guesses use a bundled English dictionary of over 12,500 five-letter words, including plurals such as MINES and BOOKS. This dictionary is separate from the original 887-word answer list, whose order and daily schedule are preserved. The dictionary is a five-letter subset of [word-list](https://github.com/sindresorhus/word-list), pinned to the commit recorded in src/data/word-guesses.js; its MIT notice is included in public/word-list-license.txt. Rejected entries can be edited or removed with Clear word. Green/✓ means the right letter in the right spot; amber/↔ means present elsewhere; grey/× means there is no remaining copy of that letter. Exact matches consume letters first, so duplicate-letter feedback is correct. A guess may not be submitted twice. Its deterministic daily answer schedule is independent of the NYT game. Cooperative play shares feedback and the six-guess limit; it is a team game, not a hidden-board duel. Daily wins cannot inflate totals through replay, even after recent history is pruned.

**Checkers:** English/American rules on an 8×8 board with 12 pieces per side. Men move and capture diagonally forward; kings move/capture one diagonal step (or jump) in either direction. Captures are mandatory, and a capture chain must continue with the same piece. Any available capture chain may be selected; the longest is not compulsory. Promotion ends the turn. A player unable to move loses. Three repeated positions, or 40 full turns of kings with no capture/man move, end in a draw. Computer play uses a lightweight legal-move heuristic, not tournament-level search. [Rule reference](https://wcdf.net/rules.htm).

**Dots and Boxes:** choose a board of 2×2 through 6×6 boxes. Tap a horizontal or vertical edge between adjacent dots. Closing a box claims it and keeps your turn; one edge may claim two boxes. Most boxes wins, with ties recorded as draws. The computer prioritizes scoring moves and avoids offering three-sided boxes where possible. [Rule reference](https://www.math.ucla.edu/~tom/Games/dots%26boxes.html).

Shared Sudoku/Petdoku sessions never overwrite solo unfinished games, daily results or solo solve statistics. Notes do not pass the turn; entering, erasing, hinting, undoing or redoing a board-changing action does. The contribution display counts these actions, rather than claiming each is a correct placement. One shared/arcade session per game is retained for each hosting profile, including its latest result. Starting another session asks before replacing an unfinished one. Finished sessions can be revisited after refresh. There is no competitive undo in Checkers or Dots and Boxes; the existing cooperative puzzles retain their undo controls.

Statistics has a separate **Arcade & shared games** section with per-game lifetime finishes, host/team wins, losses, draws, Flappy Jump best match score, and recent results. The last 500 results are retained; lifetime totals remain when records are pruned. These results are not mixed with solo puzzle times or the solo-puzzle family leaderboard. The player who started the match owns its record; choosing a second family member does not alter that other profile's solo statistics.

All new state is in an optional `club` section inside the active profile's existing version-1 localStorage payload. Old saves and old backups work without migration. Export/import includes shared sessions, rosters, lifetime totals, daily completion deduplication and recent match history. Imported sessions are checked for allowed game IDs, state types, board dimensions, counters and legal Wordle replay. Both lazy screens and every required word/puzzle asset are precached in production.

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

Online gameplay works over the LAN. **PWA installation and service workers require HTTPS or localhost**, so use the deployed GitHub Pages URL to test offline installation on a real phone. Link both devices to the same Family code to synchronize player saves and statistics, or transfer a JSON backup.

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

**Petdoku:** exactly one pet in each row, column and contiguous colour region. Pets cannot touch, including diagonally. Tap a cell to cycle **empty → × excluded → pet → empty**. Regions also have numbers so colours are not the only clue. Each pet is checked against the unique solution: **✓ means correct**, while **! and a red underline mean incorrect**, even if there is no immediate rule conflict. Wrong placements count as mistakes. A correct pet automatically crosses out every other cell in its row, column and region, plus all touching neighbours (including diagonals). Those automatic crosses cannot be cycled into pets while the correct pet remains. Removing or undoing a correct pet reopens cells it ruled out; manual crosses and restrictions from other correct pets remain. Crosses are derived from the saved board and reappear after reload. The keyboard can navigate cells and Space/Enter cycles a focused cell. Hints use the same automatic crossing behavior. Incorrect pets already on the board stay visible for you to correct.

Both games open paused. Start/Resume begins the timer. Explicit pause, hiding the page, navigation away and page closing checkpoint it. Background time is excluded. Undo/redo retains cumulative mistake and hint counts. Games save on moves and lifecycle events, rather than every timer tick. Starting a new game confirms abandoning the old one. There is one unfinished save per game per player.

## Puzzles and difficulty

- Version 1 contains **24 Sudoku bases** (6 per level), with seeded digit permutations, row/band and column/stack permutations, and transposition for variety.
- Sudoku bases are uniquely solved by a backtracking solver. Difficulty is the strongest technique required by a deterministic assessment: Easy = naked singles; Medium = hidden singles; Hard = naked pairs or locked candidates; Expert = search needed after those techniques. These are **application-specific technique bands**, not a claim to match a commercial or universal human difficulty scale.
- Petdoku contains **48 uniquely solved, contiguous region maps** (12 per level) with seeded rotations/reflections and region relabeling. Easy is 5×5, Medium 6×6, Hard 7×7, Expert 8×8. Larger boards generally involve more possibilities; difficulty within each size varies. There is no human-technique rating for Petdoku.
- Runtime puzzle selection and transformations are bounded and inexpensive. No puzzle search runs in the game UI. `npm run catalogue` reproducibly regenerates and validates the curated data offline (takes several seconds).
- Daily seeds include **catalogue version, local calendar date, game and difficulty**. Devices on the same local date with the same application version get the same puzzle. Different time zones can be on different challenge dates. Finished daily combinations cannot be completed again for extra statistics.
- This is a finite catalogue. Free-play puzzles and daily puzzle layouts can eventually repeat; transformed Sudoku variants provide much greater variety than Petdoku. Preserve catalogue v1 and its transformation algorithm if extending the app so existing saves remain compatible. Introduce a new version deliberately for future catalogues.

## Storage, statistics and privacy

Browser **localStorage** holds local profiles, solo/same-device saves and statistics. App files live in the bounded service-worker cache. Online rooms share guest names, avatars and match state with the configured Cloudflare service for up to six hours; those rooms are separate from local lifetime statistics. Optional player names and emoji avatars are the only profile details. See ONLINE.md for online-room privacy and rejoin credentials.

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

## Appearance and compact home

Settings offers 14 preset palettes: Garden light/dark, Tesla, Apple, Microsoft, Google, Netflix, Spotify, Amazon, GitHub, Data-phi.ai, Ocean, Sunset and Lavender, plus Custom. Company names describe colour inspirations; the interface uses original styling and no downloaded logos or fonts. Data-phi.ai uses charcoal, mint and cyan inspired by https://data-phi.ai/. Every theme has six palette colours used across buttons, navigation, card art, highlights and surfaces. Presets also change shapes and typography: Netflix uses a dark cinema look, Tesla uses graphite/red with sharper panels, and Apple uses soft rounded surfaces. Custom offers six controls: page background, main accent, secondary, highlight, card accent and navigation accent; readable text/button/link colours and card surfaces are calculated automatically. The top-bar sun button cycles presets. Appearance is saved on this device and included when exporting/restoring settings in backups.

The large home banner is removed. Compact game cards show four per row on wide desktops, three on smaller desktops and two or one on tablets/phones. Today's Sudoku is still available from the small daily-challenge button beside the collection heading. Gameplay feedback and distinct board colours remain visible across themes.

## Favorite games

Use the star on any home-page game card to add or remove a favorite. Favorites appear first, followed by every other game; each group keeps the standard collection order. Choices belong to the active player, survive refresh/offline use, travel in profile backups, and synchronize when that player is linked through Family sync. Old saves without favorites keep their original game order.

The [browser gameplay audit](QA_REPORT.md) records full play-throughs of all ten games, computer-opponent checks and the feedback fixes found during gameplay. Sea Battle retains outgoing/incoming shot summaries and shows hit/miss/sunk results on the same-device handoff; UNO and Trump handoffs retain their public action/trick notices.

## Petdoku pals and Wordle feedback

Choose from 12 Petdoku pals (Cat, Panda, Puppy, Bunny, Fox, Koala, Bear, Tiger, Frog, Penguin, Hamster and Unicorn) in Settings or above any Petdoku board. Pet selection survives reload and appearance backup restoration. Each device can use its own pet on an online board. Eight brighter region colours keep the numbered regions easy to distinguish in light and dark themes.

Wordle always uses three fixed feedback colours: green for the correct letter/position, amber for a letter elsewhere in the word, and slate grey for an absent or extra copy. The legend is above the grid. This feedback does not inherit a company theme's accent colours.

Wordle's daily streak shows current consecutive winning days, best streak and today's result. A date counts once even across solo/cooperative modes; any daily win for that date counts, and a later loss does not erase that day's win. A missed day or a daily loss without a win resets the current streak. Free play and random online-room matches do not affect the daily streak. Results are stored per player, included in backups, and shared through Family sync. Retained older daily-win history is adopted; lifetime best and daily records remain after recent match history is pruned.

## Fruit Merge and Block Blast

**Fruit Merge:** drop fruit into a physics jar by tapping, dragging/releasing, using the position slider, or using arrow keys and the Drop button. Matching fruits combine through an eleven-fruit chain to watermelon; two watermelons merge away for a bonus. The run ends if settled fruit crosses the dashed top line. Pause and Finish run are available. Two-player same-device mode gives each player a separate run with the same seeded fruit sequence; highest score wins. Scores and stable post-drop positions save automatically, so refreshing during the short cosmetic settling animation restores the accepted drop.

**Block Blast:** place three fixed-orientation pieces at a time on an 8x8 board. Filled rows/columns clear simultaneously, including intersections. Each placed block scores one point; each cleared line scores 10 times the current consecutive-clear combo. A non-clearing move resets the combo. A new tray appears after all three pieces are used. The run ends when none of the remaining pieces fits. Tap a tray piece and then its top-left board square, or use desktop drag-and-drop and keyboard arrows/Enter. Two-player same-device mode shares the board and score, alternating after each placement.

Both games support favorites, per-profile saves, personal bests, results, backups, Family progress sync and offline play. Their play modes are solo/same-device; the Online rooms menu contains the ten games supported by that service. Artwork is original canvas/CSS plus system fruit emoji.


## 2048, 2248 and Flood-It

All three offer solo or two-player cooperative play on one device. Each accepted move passes the turn in cooperative mode. Saves, scores, favourites, backups, offline play and Family progress sync use the existing active-player profile. Family sync transfers progress between devices; these games do not have simultaneous online rooms.

**2048:** slide the 4x4 board with arrow keys, a swipe or the four direction buttons. Matching tiles merge once per move and add their merged value to the score. Invalid moves do not spawn tiles or change turns. Reach 2048 and keep playing, then finish the run or play until there are no legal moves. A completed run counts as a win only if it reached 2048.

**2248:** connect equal neighbouring tiles to start a chain on a 5x8 board. Subsequent tiles may equal or double the previous tile, with diagonals allowed and no reuse. Drag/release, or tap tiles and select Merge chain; keyboard arrows focus tiles and Enter/Space select them. Backtracking during a drag removes the last tile. The chain sum rounds up to a power of two, which is also the score awarded. The result stays at the chain endpoint before gravity; empty spaces refill from above. No power-ups or timers. Finish the run to record the score, or continue until no equal neighbours remain. Rules follow the [number-chain format](https://2248game.com/faq).

**Flood-It:** a six-colour 12x12 board starts at the flagged top-left square. Choose a palette colour to recolour your connected territory and absorb adjacent matching squares. Symbols identify each colour. Cover every square in at most 30 moves to win; winning score is 100 times the unused moves plus 100. Selecting the current colour does not consume a move. New game starts a fresh board.


## Named family and screen time

New devices start with Rahul, Neha and Aparna. Existing unlinked devices add any missing names once, preserving original profiles, IDs and saves. Matching names are compared without case or outer whitespace; deleted preset profiles stay deleted. An already linked family keeps its canonical roster. Choose your own player before playing. Use Family > Create shared family on one device, then join its private code on other devices to share these player IDs and their records.

Family and Statistics show a screen-time dashboard: per-player totals and a breakdown across all sixteen games, for Today, Last 7 days or All time. Tracking starts with this update. It counts a visible, focused game board, including thinking, waiting-for-a-turn and pause time. Home, setup, family/statistics/settings pages, completed games and background tabs do not count. A same-device match belongs to the selected host profile; guests and partners are not timed independently. Each online player tracks their own device/profile. This measures game screen time, separately from puzzle solve timers.

A monotonic clock measures elapsed time and the device's local calendar assigns dates, including splitting activity at midnight. Checkpoints run every five seconds and on route/profile changes, focus/visibility changes, page exit and backup export; abrupt process termination can lose up to the last checkpoint. Per-installation grow-only counters combine by maximum, while distinct devices add together. Repeated syncs and backup imports do not multiply existing records. Concurrent devices' foreground use adds together. All-time game totals remain; daily detail keeps the latest ninety dates per installation. At most 100 installation records fit a profile; the server retains the existing 2 MB sync payload limit.

Screen time stays on the device until Family sync is linked. Its independent Cloudflare synchronization operation merges counters without modifying saved-game revisions, resetting game screens or creating game-progress conflicts. Offline screen-time changes queue and merge after reconnecting. Player/family backups include screen time and imports restore it alongside progress. Screen-time dashboard updates arrive through Family sync; wait for Up to date before checking another device. A progress transfer also copies the source player's screen time into the destination by counter merge.


Wordle also supports the phone's native keyboard: tap **Type your guess**, type five letters and press **Go/Enter** or **Check word**. Autocorrection, spellcheck and autocomplete are disabled for game guesses. Native typing, deletion and the in-game letter buttons share the same current guess. The field clears after accepted submissions and remains ready for the next word. This applies to solo, same-device and online Wordle; entry is disabled while the online board is read-only or the game is complete.


## Arrow Escape and touch-first Ludo

**Arrow Escape:** tap any part of an arrow to clear it when no other arrow blocks the straight path ahead of its head. Clear the whole board to win. Easy, medium and hard boards are generated with a guaranteed solution. Blocked taps cost five points, hints cost ten, successful escapes score 100. There is no time or lives limit. A hint highlights an arrow with a clear exit. Two-player same-device play alternates after a successful escape; blocked attempts and hints keep the turn. Saves, results, best scores, favourites, backups, screen time, Family progress sync and offline play are included. This is an original straight-arrow version of the [tap-to-escape format](https://arrowescape.io/); it uses original vector graphics and generated levels. Online rooms are not offered for this game.

**Ludo:** tap the die at the centre of the board, then a glowing token or its highlighted destination. Tokens use larger touch areas than their visual discs. A shared square with multiple movable tokens opens a short chooser. Finished tokens are counted beside each player's colour/name. Enlarge board gives a scrollable board for precise taps on small phones; Fit board restores the compact view. Optional keyboard-friendly move buttons and full rules sit under Alternative token controls & rules. The same controls work in computer, same-device and different-device modes. Existing movement, captures, blocking, safe squares, exact home rolls and extra-turn rules are retained. Last die roll is now public state, so every online player sees the actual result even when a roll has no legal move; the random seed stays private. Older saves without lastDie still load.


## Wordle hints

Use **Reveal a letter** for up to three optional hints per word. Each hint reveals a correct letter and its numbered position, skipping positions already solved in submitted guesses or earlier hints. Revealed positions stay in a separate clue row; your draft word is preserved. A hint never submits a word, uses a guess or passes the cooperative turn. If all positions are known, hints stop. Hint use is visible for the rest of the round, including after completion, and assisted daily wins still count towards the existing streak.

Hints persist with the saved game, offline use, profile backups and Family progress sync. Online Wordle shares the same three-hint budget between players; only the current connected, unpaused player may request a hint. The server reveals only the requested positions and keeps the complete answer and seed private until the match ends. Existing saves without hint records remain valid.
