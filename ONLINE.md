# Different-device multiplayer

The frontend stays on GitHub Pages. A separate **Cloudflare Worker + SQLite-backed Durable Objects** service synchronizes 2-4-player rooms. It is designed for the Workers Free plan and uses no purchased domain, paid database, email login, Firebase or client-side deployment credentials.

The backend is deployed at **https://puzzle-zone-multiplayer.rahulsharma-rahul.workers.dev**. `public/multiplayer.json` contains this address. The frontend is published separately through the repository's GitHub Pages workflow; older installed versions need to apply the app's update before showing the online controls.

## Included play modes

- **Checkers / Dots and Boxes:** competitive turn-based matches, using the existing rules.
- **Sudoku / Petdoku:** cooperative turn-taking with shared cells, notes, hints, undo/redo, correctness feedback and a shared pause. Board-changing actions pass the turn; notes do not. Solo and same-device saves are untouched.
- **Wordle:** cooperative alternating guesses. Both players share six guesses and feedback. The server holds the answer until the game ends. The online word is selected for the room; this is separate from the solo daily word schedule.
- **Flappy Jump:** one flight per player on the same course. Only the active player runs a local flight; the other sees waiting status and the resulting score. This is a score challenge, not a live animation of the opponent. The server reconstructs the fixed-step flight from a bounded list of flap ticks and verifies the score. A flight is capped at 120 simulated seconds. Pause/refresh recovery uses a small browser-local checkpoint.

## Deploy the backend

From the `puzzle-games` folder with dependencies installed:

```powershell
npm run multiplayer:login
npm run multiplayer:check
npm run multiplayer:deploy
```

1. The login command opens Cloudflare in your browser. Sign into your account and authorize Wrangler. Use the **Workers Free** plan; no paid upgrade is needed for this configuration.
2. The check command bundles the worker without publishing it.
3. The deploy command creates/updates `puzzle-zone-multiplayer`, binds the `GameRoom` Durable Object class, and applies the initial SQLite namespace migration. If Cloudflare asks you to choose a free `workers.dev` subdomain, complete that step.
4. Copy the **HTTPS Worker URL** printed by Wrangler, for example `https://puzzle-zone-multiplayer.your-subdomain.workers.dev`.
5. Update **`public/multiplayer.json`**:

   ```json
   {"endpoint":"https://puzzle-zone-multiplayer.your-subdomain.workers.dev"}
   ```

6. Verify the `ALLOWED_ORIGINS` value in `wrangler.jsonc` includes the website origin. The supplied production origin is `https://rahulsharmarahul.github.io`. Origins do **not** include `/puzzle-games/`. Redeploy after changing this value.
7. Run `npm run build` and commit/push the source changes, including `public/multiplayer.json`, to `main`. The existing GitHub Pages workflow deploys the frontend. No deployment token belongs in this JSON file: the URL is public configuration only.
8. Open the updated site on both devices. If the PWA has cached an older version, apply its update banner or close and reopen the app after the new worker is installed.

For a local-only connection override, the Online rooms screen has **Connection settings → Online service address**. This is useful during setup and affects only that browser. A saved override takes precedence over the public JSON configuration. The `VITE_MULTIPLAYER_URL` build variable is also supported. A configuration override stores no Cloudflare API token.

Signing into the Cloudflare dashboard does not sign the terminal into Wrangler; the browser authorization above is separate. No account password should be shared with the app or committed to Git. Wrangler manages its own authorization outside the project.

## Play from different devices

1. Both players open the deployed Puzzle Zone website using their own local profiles.
2. Player one opens **Online rooms** or a game's **Play online · Different devices** link.
3. Select a game and tap **Create room**.
4. Share **Copy invitation**, or send the eight-character room code.
5. Player two opens that link (or enters the code under Join room), then taps **Join room**.
6. Once all players show Connected, take turns. The server prevents moves from the wrong player.
7. Either player can pause a shared non-flight game. Ending a competitive match resigns to the opponent; ending a cooperative game closes the challenge.

Room codes provide guest access to the second seat. Share them only with your intended player. A seat remains reserved after joining; another tab on the same profile/browser can resume it, but a new tab replaces the old connection. A third player cannot take either seat. If a player loses their original browser data, create a new room instead of trying to reclaim the reserved seat.

The most recent eight room credentials are retained per local profile for rejoining. Each room expires **six hours after creation**, and Cloudflare's alarm deletes its state. Room credentials are local-only bearer tokens, stored separately from profile backups so importing a backup does not duplicate a player's online seat. Match results, per-game totals and recent online history are included in ordinary profile backups. Profiles and lifetime statistics stay local unless the devices join the same shared family, described below.

## Shared family profiles, progress and statistics

Open **Family → Family sync → Create shared family** on the device with your main player profiles. Copy the private 16-character family code. On each other device, open Family, enter that code and select **Join shared family**. Choose your own **shared** player in the family cards. Player names, avatars, solo progress, daily results, same-device sessions, online results and statistics now synchronize; the active player selection remains device-local.

Changes upload after a short delay, and WebSocket notifications update the other devices without constant polling. Wait for **Up to date** before switching to another device. **Sync now** retries a pending upload/download. Offline play still saves immediately on the device and queues changes for reconnection. When the same shared player changes independently on two devices, a conflict is shown: choose **Use cloud progress** or explicitly replace it with **Keep this device's progress**. A recovery copy is retained locally before replacement; **Download device recovery copies** exports those snapshots in the normal backup format.

Joining a family does not guess identities by player name or merge totals. Original device-only profiles are kept under **Profiles kept only on this device**. To bring an old save into your shared player, open **Copy existing device progress to a shared player**, choose the original and destination, and confirm. This replaces the chosen shared save rather than adding counters together. The original local profile is kept. Cloud revisions prevent silent overwrites and duplicate retries.

Family codes grant read/write access to every shared player; share them only with your family. No email/password account or automatic discovery based on your IP address is used. Different family codes keep groups separate. A family supports up to 20 shared players. Removing a shared player removes that player's cloud data; other devices can retain detached local copies. Disconnecting a device keeps its downloaded progress and does not affect the other devices. Family data expires after **180 days without activity**. Family codes and online-seat credentials stay out of ordinary backups; link a restored device with the family code again.

Family sync uses a separate SQLite-backed `FamilyGroup` Durable Object. Each player has a revisioned, validated snapshot; large snapshots are chunked into bounded storage values and updated transactionally. Payloads are capped at two million serialized characters per profile. If storage or free quotas are unavailable, device saves are kept and sync reports an error instead of discarding progress.

Room creation now allows **120 new rooms per hour per internet connection**, shared by devices using that connection. Joining/rejoining an existing room does not consume the creation allowance. General API traffic has a separate **300-request-per-minute** guard, and creating new shared families is limited to 20 per hour. A versioned rate-policy migration resets the previous ten-room restriction immediately. These are application safeguards, independent of Cloudflare's own Free-plan quotas.

## Local development and validation

Use two terminals:

```powershell
npm run multiplayer:dev
```

```powershell
npm run dev
```

The service listens at `http://127.0.0.1:8787`. Open `http://localhost:5173/puzzle-games/#online` and use that service address in Connection settings. Two separate browser profiles or one normal and one private window simulate independent devices. Real phone testing should use the deployed HTTPS service; a phone's `127.0.0.1` is the phone itself.

```powershell
npm test
npm run build
npm run test:online
npm run test:e2e
```

`test:online` starts the production frontend preview and a local Cloudflare emulator, then tests two or three independent browser contexts, synchronized turns, reserved seats, rejected illegal moves, pause/resume, completion, verified flights, private-state filtering and origin restrictions. It uses a new ignored `.wrangler/tests-*` state directory per run so previous room limits do not contaminate tests. Ports 4173 and 8787 must be available. On Windows it uses installed Chrome; on other systems install Playwright Chromium first. `test:e2e` separately checks the original offline/same-device flows.

## Architecture and safeguards

- `server/model.js`: game-agnostic room lifecycle, turn checks, game action dispatch, revision checking, duplicate-action detection, private/public state projections, and flight replay.
- `server/worker.js`: CORS/origin allowlist, HTTP room creation/join, per-IP creation/join throttles, hashed seat tokens, SQLite-backed room storage, WebSocket attachments/hibernation, per-connection message limits and room-expiry alarms.
- `src/lib/room-connection.js`: bounded reconnect backoff, offline/online handling, acknowledgement tracking and idempotent resubmission of an interrupted move.
- `src/ui/Online.jsx`: room setup, invitation links, guest seats, presence, shared game controls and reconnect feedback.
- Separate game UI adapters send **move intents**, never trusted replacement boards. Illegal moves and stale revisions are rejected by the server.

Both players must be connected for ordinary moves. Clocks suspend while disconnected or explicitly paused. The authoritative board survives browser refresh and Durable Object hibernation. On a cold service restart the last persisted clock checkpoint may be the most recent move or connection event; no every-second writes are made. Action IDs prevent duplicate moves if a connection drops after the server accepts an action but before its acknowledgement arrives.

Puzzle solutions, Sudoku undo snapshots, the unfinished Wordle answer/seed, and seat-token hashes are never sent in public room state. Verified flight inputs enforce the app's physics and timing bounds; this is a casual family game, **not bot-proof competitive anti-cheat**. Direct browser tampering can still reveal locally bundled solo puzzles and vocabulary; online rules do not make the standalone offline games tamper-proof.

WebSockets authenticate through a subprotocol token rather than URL query parameters. Private tokens are not part of invitation links or logs. The server permits only configured web origins, rejects unknown rooms/seat tokens, reserves the selected 2-4 seats, limits payload sizes, and applies conservative per-IP creation/join and per-connection message rates. Origin checks complement seat authentication; they do not authenticate arbitrary non-browser clients.

## Cost and availability

This configuration uses SQLite Durable Objects, available on Workers Free. It uses hibernatable WebSockets and expires abandoned rooms to reduce idle work. Free quotas still apply to requests, compute and storage; when a free limit is reached, affected online operations can fail until the limit resets. Keep the account on **Workers Free** and do not enable paid products if zero billing is required. Nothing in the repository upgrades the account or configures a paid service. Solo and same-device games continue to work without this service.

Official references: [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/).

## Four additional family games

Ludo, UNO and Trump Tricks offer **2, 3 or 4 seats**; choose Number of players before creating the room. Sea Battle has two seats. Share the same invitation with every guest. Each guest gets a distinct reserved seat; all selected players must join and stay connected before moves are accepted. Existing two-seat rooms continue to work. Ending a match with three or four players cancels it for everyone as a draw; a two-player resignation awards the other player the win.

Each authenticated socket receives a seat-specific snapshot on join, broadcast, reconnect and error recovery. UNO/Trump hands, draw decks, seeds and opposing Sea Battle fleets stay on the server. Only the seat's own hand or fleet and public information reach that device. All rule checks run on the server. See README for the exact family rule variants. Local match saves and online results for these games are included in Family progress synchronization and backups. Active online rooms rejoin using the original browser's reserved seat rather than a synced local session.
