# Browser play-through audit — 14 November 2026

All ten games were played through their visible browser controls to a result.
The new `e2e/playthrough.spec.js` chooses moves from visible board positions,
available buttons and displayed feedback. It does not read saved solutions,
inspect engine state or inject a finished match. Automated Chrome input was
used; this is browser gameplay testing rather than physical-device testing.

| Game | Play-through checked |
| --- | --- |
| Sudoku | Entered visible naked singles with number buttons; pause, reload, resume and solve completion |
| Petdoku | Placed pets, responded to correct/incorrect markings, excluded wrong cells and completed the board |
| Wordle | Submitted ordinary words including MINES and BOOKS; checked all five feedback tiles, subsequent rows and the final result |
| Dots and Boxes | Drew every edge on a 2×2 board; completed boxes, scoring and final result |
| Checkers | Selected pieces and highlighted destinations through a complete match; reloaded the result |
| Ludo | Played a three-player match through dice rolls, legal token moves and all four winning tokens reaching home |
| UNO | Played a three-player match through legal cards, draws, wild colours, calling UNO and a winning empty hand |
| Trump Tricks | Played all seven tricks with four players and checked the saved result |
| Sea Battle | Manually placed both fleets, fired shots through a completed match and checked hit/miss/sunk feedback and fleet privacy |
| Flappy Jump | Used visible flight pixels and Jump controls; checked pause/reload/resume, two flights and the final result. An additional visible-control session cleared a pipe and reached score 1 |

Computer checks cover three-player Ludo, four-player UNO, a complete round
against three Trump computers, Sea Battle fleet preparation and retaliation, and a complete Dots and Boxes game.
Existing browser cases also check a computer Checkers response.

The baseline 31 browser cases passed. Ten full play-throughs and five computer
scenarios were added. The unit suite has 111 passing tests. All 15 online/family
scenarios passed against the Cloudflare emulator, including gameplay across all
ten games, reconnects, reserved seats, wrong-turn rejection, hidden hands/fleets,
Family progress, favorites and conflict recovery.

## Problems found and fixed

- Same-device Sea Battle immediately hid the board after firing, leaving the
  firing player without a hit/miss result. The handoff now shows the firing
  player, coordinate, hit/miss and any sunk-ship result while keeping fleets
  hidden. The board also retains each player's last outgoing and incoming shot,
  so a quick computer response cannot erase the player's feedback.
- UNO and Trump handoffs hid the previous public action/trick notice. Those
  notices now remain visible on the handoff screen without revealing hands.

The completed browser results and runtime-error checks found no further
blocking gameplay defects in the tested sessions. These sessions do not exhaust
every possible game position, browser or physical phone.

## Rich themes, pets and Wordle update

The later appearance update adds six-colour palettes and custom controls, distinct Netflix/Tesla styling, 12 pet choices with vivid numbered regions, fixed green/amber/slate Wordle feedback with a top legend, and persistent daily current/best streaks. Four additional browser scenarios cover actual colour/style changes, pet selection and reload, all three feedback colours under company themes, and a daily streak win. Appearance backup restoration also checks the chosen pet. The suite now contains 118 unit cases and 50 offline/local browser scenarios. Online/Family checks include different pets on the same board and a daily streak arriving on another device.
