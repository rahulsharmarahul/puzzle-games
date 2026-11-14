# Puzzle Zone implementation checklist

Architecture: React/Vite static app; hash navigation; lazy loaded game screen; pure Sudoku and Petdoku engines; shared immutable game actions and timestamp timer; centralized versioned localStorage; bounded per-profile history and aggregates; deterministic versioned puzzle catalogue; generated offline asset list.

- [x] Phase 1: responsive shell, profiles, settings, persistence
- [x] Phase 2: unique Sudoku catalogue, difficulty assessment, controls, save/resume, tests
- [x] Phase 3: unique Petdoku catalogue, controls, rule validation, tests
- [x] Phase 4: daily challenges, statistics, family leaderboard, validated backups
- [x] Phase 5: offline PWA, icons, build, deployment workflow, documentation, final QA
- [x] Game expansion: Flappy Jump, Wordle, English Checkers and Dots and Boxes; same-device multiplayer across all six games; basic computer board-game opponents; backward-compatible backups; independent shared sessions and lifetime match totals
- [x] Different-device multiplayer: server-authoritative Cloudflare rooms, guest invitations, reconnects, expiry, shared pause, private puzzle solutions, verified flight replay, per-device online results, deployment configuration and documentation
- [x] Family fix: 120 room creations/hour per shared connection, immediate legacy-limit reset, private-code family linking, synchronized roster/progress/statistics, local-profile preservation, explicit progress transfer and revision-conflict recovery

Validation: 128 Vitest tests, 54 original/same-device browser tests and 15 online/family browser scenarios cover the collection; production build succeeds. The online suite runs two or three independent browser contexts against the Cloudflare emulator. The original six games and access checks also passed against the live Cloudflare endpoint; room navigation/mobile layout and per-device results were additionally checked locally. Three-device family sync, profile transfer and conflict recovery also passed against the live service. Tests cover reconnects, reserved seats, unauthorized moves, stale revisions, duplicate actions, private-state filtering, cooperative completion, flight verification, backup validation and existing offline gameplay. Wrangler is a development-only dependency.

Backend deployed at https://puzzle-zone-multiplayer.rahulsharma-rahul.workers.dev. The frontend points to that endpoint in public/multiplayer.json and is published through the repository's GitHub Pages workflow. See ONLINE.md for deployment, room retention and installed-app updates.

Physical iPhone/iPad/Android testing remains user-side validation. Catalogue variety is finite; Petdoku difficulty is based on grid size. See README for these limits and operating-system force-kill timer behavior.

- [x] Table game expansion: Ludo, UNO, casual seven-card Trump Tricks and Sea Battle, solo computer opponents, same-device privacy handoffs, online private seat projections and reserved 2-4-player rooms. Full simulated matches validate every saved position, including three/four-player games; browser tests cover phone layouts, offline play, complete Trump rounds, fleet placement, reconnects and three-device Family save/result synchronization. Exact rule variants are documented in README.

The four additional games and new-game Family progress/results passed browser checks against the deployed Cloudflare service.

- [x] Appearance: 14 preset company/nature palettes plus validated custom colours, automatic readable text/links/buttons, persistent settings and backup restoration; compact four-column desktop game collection with the large hero removed and a small daily-challenge action preserved.

- [x] Favorites: accessible per-card star buttons, stable favorites-first ordering, player-specific persistence, backward-compatible save validation, backups and Family synchronization.

- [x] Wordle dictionary fix: accept over 12,500 English guesses (including MINES and BOOKS) separately from the unchanged answer schedule; preserve offline play and saved-game replay; add Clear word for rejected entries and test exact screenshot words in local and online modes.

- [x] Browser gameplay audit: full visible-control play-throughs of all ten games, additional computer-opponent sessions, complete online regression suite, and fixes for Sea Battle hit/miss/sunk feedback plus public card-game handoff notices. See QA_REPORT.md for the tested flows and practical limits.

- [x] Rich appearance and Wordle update: six-colour presets/custom controls, distinct Netflix/Tesla/Apple styling, 12 persistent Petdoku pals on solo/shared/online boards, eight vivid region colours, fixed green/amber/grey Wordle feedback with a top legend, and per-player daily current/best streaks with backup/Family synchronization.

- [x] Fruit Merge and Block Blast: deterministic fruit collision/merge physics, 8x8 block placement/line clears, touch/keyboard controls, solo and same-device modes, per-profile best scores and results, stable saves/backups, favorites, offline assets and Family synchronization.
