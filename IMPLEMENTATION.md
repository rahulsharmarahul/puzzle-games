# Puzzle Zone implementation checklist

Architecture: React/Vite static app; hash navigation; lazy loaded game screen; pure Sudoku and Petdoku engines; shared immutable game actions and timestamp timer; centralized versioned localStorage; bounded per-profile history and aggregates; deterministic versioned puzzle catalogue; generated offline asset list.

- [x] Phase 1: responsive shell, profiles, settings, persistence
- [x] Phase 2: unique Sudoku catalogue, difficulty assessment, controls, save/resume, tests
- [x] Phase 3: unique Petdoku catalogue, controls, rule validation, tests
- [x] Phase 4: daily challenges, statistics, family leaderboard, validated backups
- [x] Phase 5: offline PWA, icons, build, deployment workflow, documentation, final QA
- [x] Game expansion: Flappy Jump, Wordle, English Checkers and Dots and Boxes; same-device multiplayer across all six games; basic computer board-game opponents; backward-compatible backups; independent shared sessions and lifetime match totals
- [x] Different-device multiplayer: server-authoritative two-seat Cloudflare rooms, guest invitations, reconnects, expiry, shared pause, private puzzle solutions, verified flight replay, per-device online results, deployment configuration and documentation
- [x] Family fix: 120 room creations/hour per shared connection, immediate legacy-limit reset, private-code family linking, synchronized roster/progress/statistics, local-profile preservation, explicit progress transfer and revision-conflict recovery

Validation: 83 Vitest tests, 18 original/same-device browser tests and 11 online/family browser scenarios cover the collection; production build succeeds. The online suite runs two independent browser contexts against the Cloudflare emulator. All six games and access checks also passed against the live Cloudflare endpoint; room navigation/mobile layout and per-device results were additionally checked locally. Three-device family sync, profile transfer and conflict recovery also passed against the live service. Tests cover reconnects, reserved seats, unauthorized moves, stale revisions, duplicate actions, private-state filtering, cooperative completion, flight verification, backup validation and existing offline gameplay. Wrangler is a development-only dependency.

Backend deployed at https://puzzle-zone-multiplayer.rahulsharma-rahul.workers.dev. The frontend points to that endpoint in public/multiplayer.json and is published through the repository's GitHub Pages workflow. See ONLINE.md for deployment, room retention and installed-app updates.

Physical iPhone/iPad/Android testing and the actual GitHub Pages deployment remain user-side validation. Catalogue variety is finite; Petdoku difficulty is based on grid size. See README for these limits and operating-system force-kill timer behavior.
