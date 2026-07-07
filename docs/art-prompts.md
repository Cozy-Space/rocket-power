# Art prompts for Rocket Power

Paste-ready prompts for an image-generation AI. Every prompt starts with the same
STYLE block — keep it identical across all generations (and reuse the same
session/seed if your tool supports it) so the assets look like one game.

## The style block (prepend to every prompt)

> Flat 2D game art with crisp clean outlines and subtle cel shading, retro-futurist
> 1970s cave-mining expedition aesthetic. Palette: deep slate-blue rock, warm amber
> accents, glowing teal highlights, off-white ceramic surfaces with burnt-orange
> markings. Bold readable silhouettes, no photorealism, no gradients across large
> areas, no text, no watermark.

## 1. Rocket sprite

Target: `rocket` texture, 24×48 px in game, nose pointing UP. Generate at
512×1024, downscale later.

> [STYLE BLOCK] A small expedition rocket in side profile pointing straight up,
> centered and perfectly vertical: off-white ceramic hull with one bold burnt-orange
> stripe around the middle, a single round teal-glass porthole in the upper half,
> two matte-dark tail fins at the base, slight soot weathering around the engine
> nozzle. Tall narrow proportions, exactly 1:2 width-to-height, symmetrical. The
> silhouette must stay readable when shrunk to 24×48 pixels. Isolated on a plain
> solid magenta background for easy cutout, no shadow on the ground, no background
> scenery.

## 2. Exhaust flame

Target: `flame` texture, 16×24 px in game, attached below the nozzle; widest at the
top, tip at the bottom. Generate at 512×768.

> [STYLE BLOCK] A stylized rocket exhaust flame on its own: a teardrop-shaped plume
> pointing straight DOWN — widest at the top where it meets the engine, tapering to
> a point at the bottom. Three cel-shaded layers: white-hot core, bright amber
> middle, deep orange-red rim, with two tiny detached spark triangles near the tip.
> 2:3 width-to-height ratio, centered, isolated on a plain solid magenta background,
> no rocket, no smoke clouds, no scenery.

## 3. Cave rock tile (must tile seamlessly!)

Target: left half of `cave-tiles.png`, 64×64 px in game. Generate at 1024×1024.
Walls, floors AND ceilings use this tile, so it must repeat in all directions.

> [STYLE BLOCK] A seamless, perfectly tileable square texture of dense cave rock:
> chunky faceted slate-blue basalt blocks with crisp cel-shaded facets, thin warm
> amber mineral veins running between the blocks, and one or two small teal
> bioluminescent crystal flecks. Uniform brightness edge to edge — no vignette, no
> directional light gradient, no border — the pattern must repeat seamlessly
> horizontally AND vertically. Flat game tileset texture, viewed straight on.

## 4. Landing pad tile (tiles horizontally)

Target: right half of `cave-tiles.png`, 64×64 px in game. The TOP edge is the
surface the rocket lands on. Generate at 1024×1024.

> [STYLE BLOCK] A seamless horizontally-tileable square texture of a landing pad
> deck: dark gunmetal plating with visible rivets and panel seams, a continuous
> glowing teal light-strip running along the ENTIRE top edge, and small amber hazard
> chevrons just below it. The top edge must read as a walkable landing surface; the
> pattern must repeat seamlessly left-to-right. Uniform lighting, no border, flat
> game tileset texture viewed straight on.

## 5. Bonus: title-screen backdrop (optional, no code changes needed yet)

> [STYLE BLOCK] A wide atmospheric scene of a vast underground cavern: layered
> slate-blue rock silhouettes receding into darkness, scattered teal bioluminescent
> crystals, faint amber dust motes in a single shaft of light, and a tiny off-white
> rocket with a warm exhaust glow navigating between rock formations. Cinematic
> composition with large calm empty areas suitable for overlaying a game title,
> 16:9 aspect ratio.

## Alternative style blocks (swap into the same prompts)

- **16-bit pixel art:** "Chunky 16-bit pixel art, SNES-era, limited 16-color
  palette of slate blue, amber, teal and off-white, clean 1px outlines, no
  anti-aliasing, no dithering gradients."
- **Hand-painted storybook:** "Soft hand-painted gouache game art, visible brush
  texture, muted slate and amber palette with teal glow accents, gentle rounded
  shapes, Oregon-Trail-meets-Moomin expedition mood."
- **Neon vector minimal:** "Ultra-minimal flat vector art, 2px uniform outlines,
  near-black background tones, electric teal and hot orange neon accents only,
  geometric shapes, Alto's-Odyssey-in-a-cave mood."

## Getting the results into the game

1. Downscale: rocket → 24×48, flame → 16×24, each tile → 64×64 (use nearest-neighbor
   for the pixel-art style, bicubic otherwise). Remove the magenta background so the
   rocket/flame PNGs are transparent.
2. Assemble `cave-tiles.png`: 128×64, rock tile LEFT, pad tile RIGHT.
3. Drop files under `public/assets/` (e.g. `public/assets/sprites/rocket.png`,
   `public/assets/tiles/cave-tiles.png`).
4. Edit **only** `src/assets/manifest.ts`: change each entry from
   `{ source: 'generated' }` to `{ source: 'file', path: 'assets/sprites/rocket.png' }`.
   No other code changes — BootScene skips generation for file-sourced entries.
5. Check the tiles in-game for visible seams (fly along a long wall) and confirm the
   rocket still reads as "pointing up" at rotation 0.
