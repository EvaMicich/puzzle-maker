# Puzzle Maker — Made by Owen

A small TypeScript / Phaser 3 / Vite game. All artwork is drawn with Phaser Graphics. No image assets, fonts, audio downloads, UI frameworks, or test packages.

## Play locally

From this folder, run `npm run dev`, then open http://127.0.0.1:5173. Dependencies are already installed; on a fresh checkout, run `npm install` once first.

Use A/D or left/right arrows to walk, W/S or up/down arrows on ladders, Space to jump, F to shoot with target aim assistance, and hold G near a bottom platform to grapple toward it. Clicking aims and fires manually. R restarts the whole level. Enable sound with the top-right button.

Shoot all six targets, descend on the right, cross left through downward arrows to collect the trophy, then return right along the safe corridor and descend again. Follow orange → yellow → spinning green → blue → green slime on purple → finish. Arrow hits preserve progress. Falling from platforms returns to the bottom ladder. The finish now takes Sneeker directly into Level 2.

## Level 2 — the loop tree

Climb the irregular brown trunks and small side branches into the green loop. All jumps are possible normally. Stand on a green patch and press Space for a directed slime assist; hold G to pull toward the next branch. The loop holds Sneeker safely against its surface, including upside down: D/right/W/up moves forward, A/left/S/down reverses, and releasing the keys pauses. Complete one lap to travel along the exit and drop through the tree hole.

Inside, walk left into the axe. Press F once to chop each branch beneath your feet. Two cracked branches shake after 16 seconds and break after 20 seconds of continuous standing; jumping resets their timer. Collect the trophy on the second-last branch before chopping it and descending to the finish. The ordinary axe is discarded on completion, and Level 3 begins. No bow is available in Level 2.

Falls use the most recently reached branch as a checkpoint and preserve collected tools/trophy. The fifth failed attempt resets only Level 2 and restores all five attempts. R also restarts the current level.

For development, open http://127.0.0.1:5173/?level=2 to start directly in Level 2.

## Level 3 — Owen's final dragon

The game has exactly three levels. Run with A/D or left/right, jump with Space, and press F for each battle-axe swing. The bow and grappling hook are unavailable in this arena. Use the Levels button at any time to choose among all three levels; R restarts the current fight.

The white dragon keeps Owen's black patches, red head, two blue wings, pale grey teeth, long tail, and green tree disguise. There is one safe fighting island with moving lava around it. Ten hearts are tracked in twenty half-heart units. Lava costs half a heart and returns Sneeker to safety; fire, spin passes and swoops cost one heart. Brief invulnerability prevents accidental repeated collision damage. Losing all hearts opens Choose a Level instead of restarting automatically.

- **300 → 200 HP:** find the tree-tail and strike it five times. It disappears and moves after each hit.
- **200 → 100 HP:** move out of the marked fire lane, then approach the resting dragon during its fifteen-second opening. Five axe hits complete this phase.
- **100 → 0 HP:** dodge five brownish-green spin-jet passes, then two telegraphed swoops. Each low landing allows one axe hit. The dragon finally stops attacking and becomes a tree again; land any remaining hits there. The entire phase still takes exactly five successful hits.

Every successful axe strike deals exactly twenty HP. One swing cannot hit repeatedly. Defeating the dragon reveals trophy #3; walk into it to enter the square trophy room with **YOU WIN**, **Puzzle Maker**, and **Made by Owen**. Choose a Level provides replay. This is the end of the game.

Trophies earned in any level are retained for the current browser session and survive level selection/retries. The end room displays #1, #2, and #3. If you jump straight to the boss, unearned earlier trophies appear as grey placeholders labeled with their level rather than being awarded automatically. Reloading the page clears the session collection.

Direct development links: http://127.0.0.1:5173/?level=3 for the boss, or http://127.0.0.1:5173/?level=menu for level selection.

## Checks

- `npm run check` — strict TypeScript check without output files.
- `npm run build` — check and produce one production build in `dist`.
- `npm run preview` — serve the production build.
- `.browser-smoke.mjs` — dependency-free browser regression checks, using Node's WebSocket and an already installed Chromium browser with remote debugging on port 9222. With Vite running on port 5173, run `node .browser-smoke.mjs`. It exercises all three levels, retries, tools, loop rotation, branch timers, exact boss damage, half-hearts, dodges, distinct spin hits, selection buttons, collected trophies, ending credits, direct launch, and native keyboard input. It generates no screenshots or videos. The test browser closes after a successful run.

## Small playability adjustments

The entire drawing fits one view. Six targets keep the drawing's paired left/middle and single right positions. Platform spacing is adjusted for jumps; the green square rotates beneath a stable landing edge. The yellow ladder sits on its right edge. The right ladder has two separately unlocked segments. Bow aim assistance and a simple hold-to-pull grapple make keyboard play approachable. The character retains the orange head/hands, zigzag face band, belt, and corrected grey body. The background takes three minutes for a gentle full colour cycle. Sound is original synthesized audio and starts muted.

Game state and movement live in `src/main.ts`; page styling lives in `src/style.css`. `node_modules`, Vite's cache, and `dist` are ignored. Source maps are not enabled. The reference photographs are not copied into the project.

Level 2 is isolated in `src/level2.ts`; Level 1 changes only register the scene, update the page's level-specific controls, and replace its old placeholder with the scene transition. The outdoor layout is compressed to fit the existing view, with branch heights adjusted to remain jumpable. The loop uses a safe oval path with a short guided exit into the hole. The right-hand hollow-tree sketch is shown as an overview before the camera enters the full-height interior. Interior floor barriers span the passage; the trophy branch waits for collection before it can be chopped, avoiding an accidental missed trophy. Two branches are unstable, and their collapse lands on the next barrier safely. No dependencies or downloaded assets were added for Level 2.

Level 3 and its small menu/end scenes live in `src/level3.ts`; `src/trophies.ts` only tracks session awards. No prior movement or level mechanics were rewritten for the boss. The arena is a single island because the reference specifies a boss design rather than a detailed arena layout. Two swoops and one hit per low opening ensure both aerial behavior and the final tree disguise are seen; missed swoop hits remain available at the final tree. All sound remains synthesized and optional. No dependencies or downloaded assets were added.
