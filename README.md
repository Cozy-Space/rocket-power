# Rocket Power

A 2D singleplayer browser game: fly a rocket through a cave course and land softly on the pad.
This repo contains only the webapp — singleplayer first, no server.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
```

| Key           | Action                                    |
| ------------- | ----------------------------------------- |
| ↑ (hold)      | Thrust in the direction the rocket points |
| ← / →         | Rotate                                    |
| R             | Restart the run                           |
| Enter / Space | Launch from the title screen              |

Rules: gravity pulls you down, fuel drains while thrusting (empty tank = glide only).
Touching terrain anywhere but the pad — or the pad too fast — is a crash. Surviving
the touchdown isn't winning yet: the rocket keeps settling, rocking on its base.
Land gently and near-upright and it wobbles back to standing; come down too tilted
(or spinning) and it tips over. Your time is taken at touchdown.

## Scripts

| Script                                                  | Purpose                          |
| ------------------------------------------------------- | -------------------------------- |
| `npm run dev`                                           | Vite dev server with HMR         |
| `npm run build`                                         | Typecheck + production build     |
| `npm run preview`                                       | Serve the production build       |
| `npm test` / `npm run test:watch`                       | Vitest for the game-rule modules |
| `npm run typecheck` / `npm run lint` / `npm run format` | Hygiene                          |

## Architecture

- **Phaser 3** (pinned `^3.90.0` — npm `latest` is Phaser 4, a different API) + TypeScript + Vite.
- Scene flow: `boot` (generates placeholder textures) → `preload` → `title` → `game` + `ui` (parallel overlay scene).
- Pure, Phaser-free game rules live in `src/game/rules/` (fuel, touchdown evaluation, tip-over settle simulation, run timer) and are unit-tested with Vitest.
- All tunables (gravity, thrust, fuel, landing thresholds) live in `src/config.ts`.
- Cross-scene events (`src/game/events.ts`) go through the global `game.events` emitter so they survive scene restarts.
- Known Arcade-physics gotcha: collide callbacks run _after_ velocity is zeroed, so `GameScene`
  samples `lastVelocity` every frame and evaluates that in the collision handler.

## Levels (Tiled)

Levels are [Tiled](https://www.mapeditor.org/) JSON maps in `public/assets/levels/`.
Open `level-01.json` directly in Tiled, edit, save — no export step needed.

Conventions a level must follow:

- Orthogonal map, 64×64 px tiles. Tileset **embedded** in the map, named `cave`
  (2 tiles: gid 1 = rock, gid 2 = pad surface, image `../tiles/cave-tiles.png`).
- Tile layer **`terrain`** — every non-empty tile is solid. Pad-surface tiles are part of the terrain.
- Object layer **`markers`** with exactly two objects:
  - a point named **`spawn`** — player start,
  - a rectangle named **`landing-pad`** — drawn as a thin band over the pad's top face
    (used only to judge the touchdown, not for physics).

`scripts/gen-level.mjs` bootstraps a level (and the tileset PNG) from an ASCII map —
only needed to regenerate from scratch; the checked-in JSON is the source of truth:

```bash
node scripts/gen-level.mjs
```

## Art

All placeholder art is generated at runtime (`BootScene`). To swap in real art, edit
**only** `src/assets/manifest.ts`: change an entry's `source` from `'generated'` to
`'file'` and point `path` at a file under `public/assets/`. No scene code changes.

Suggested free interim art until custom art exists: [Kenney](https://kenney.nl) (CC0) —
_Space Shooter Redux_ for the rocket/flame, _Pixel Platformer_ or _Simplified Platformer Pack_
for cave tiles (assemble two 64×64 tiles into a 128×64 `cave-tiles.png`, rock left, pad right).
