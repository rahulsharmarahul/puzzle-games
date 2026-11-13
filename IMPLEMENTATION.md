# Puzzle Zone implementation checklist

Architecture: React/Vite static app; hash navigation; lazy loaded game screen; pure Sudoku and Petdoku engines; shared immutable game actions and timestamp timer; centralized versioned localStorage; bounded per-profile history and aggregates; deterministic versioned puzzle catalogue; generated offline asset list.

- [x] Phase 1: responsive shell, profiles, settings, persistence
- [x] Phase 2: unique Sudoku catalogue, difficulty assessment, controls, save/resume, tests
- [x] Phase 3: unique Petdoku catalogue, controls, rule validation, tests
- [x] Phase 4: daily challenges, statistics, family leaderboard, validated backups
- [x] Phase 5: offline PWA, icons, build, deployment workflow, documentation, final QA
- [x] Game expansion: Flappy Jump, Wordle, English Checkers and Dots and Boxes; same-device multiplayer across all six games; basic computer board-game opponents; backward-compatible backups; independent shared sessions and lifetime match totals

Validation: 59 Vitest tests and 18 Playwright browser tests cover the completed collection; production build succeeds. Browser tests use installed Chrome, with viewport sizes from 320px phones to desktop, and verify actual offline lazy loading. Petdoku feedback and automatic exclusions are covered through undo/redo, removal and reload. Added tests cover legal checker moves, required jumps, promotion, draws, computer turns, box claims and extra turns, duplicate Wordle letters, equal-course Flappy rounds, cooperative completion without modifying solo saves, session restoration, lifetime totals and backup compatibility. Keyboard activation is checked separately after final accessibility refinements. No new dependencies, remote push or deployment were introduced for this expansion.

Physical iPhone/iPad/Android testing and the actual GitHub Pages deployment remain user-side validation. Catalogue variety is finite; Petdoku difficulty is based on grid size. See README for these limits and operating-system force-kill timer behavior.
