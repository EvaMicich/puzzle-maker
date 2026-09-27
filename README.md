# Puzzle Maker — Owen's Level 1

A small TypeScript / Phaser 3 / Vite game. All artwork is drawn with Phaser Graphics. No image assets, fonts, audio downloads, UI frameworks, or test packages.

## Play locally

From this folder, run `npm run dev`, then open http://127.0.0.1:5173. Dependencies are already installed; on a fresh checkout, run `npm install` once first.

Use A/D or left/right arrows to walk, W/S or up/down arrows on ladders, Space to jump, F to shoot with target aim assistance, and hold G near a bottom platform to grapple toward it. Clicking aims and fires manually. R restarts the whole level. Enable sound with the top-right button.

Shoot all six targets, descend on the right, cross left through downward arrows to collect the trophy, then return right along the safe corridor and descend again. Follow orange → yellow → spinning green → blue → green slime on purple → finish. Arrow hits preserve progress. Falling from platforms returns to the bottom ladder. Level 2 is only a restartable placeholder.

## Checks

- `npm run check` — strict TypeScript check without output files.
- `npm run build` — check and produce one production build in `dist`.
- `npm run preview` — serve the production build.

## Small playability adjustments

The entire drawing fits one view. Six targets keep the drawing's paired left/middle and single right positions. Platform spacing is adjusted for jumps; the green square rotates beneath a stable landing edge. The yellow ladder sits on its right edge. The right ladder has two separately unlocked segments. Bow aim assistance and a simple hold-to-pull grapple make keyboard play approachable. The character retains the orange head/hands, zigzag face band, belt, and corrected grey body. The background takes three minutes for a gentle full colour cycle. Sound is original synthesized audio and starts muted.

Game state and movement live in `src/main.ts`; page styling lives in `src/style.css`. `node_modules`, Vite's cache, and `dist` are ignored. Source maps are not enabled. The reference photographs are not copied into the project.
