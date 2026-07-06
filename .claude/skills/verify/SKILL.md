---
name: verify
description: Build, launch, and drive Rocket Power in a headless browser to verify gameplay changes end-to-end. Use when verifying that a game change actually works at runtime, before committing.
---

# Verify Rocket Power

## Launch

```bash
npm run dev -- --port 5199 --strictPort   # background; game at http://localhost:5199
```

## Drive (headless Chrome via playwright-core)

Install `playwright-core` in a scratch dir (NOT this repo) and launch with the
system Chrome: `executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`.

- Title → gameplay: `page.keyboard.press('Enter')`.
- The game instance is exposed as `window.rocketPower` (see `src/main.ts`).
  Read rocket state from the game scene:

```js
const s = window.rocketPower.scene.getScene('game');
const spr = s.children.list.find((c) => c.texture && c.texture.key === 'rocket');
// spr.x/y/angle, spr.body.velocity, spr.body.moves (false once the run ended),
// spr.tintTopLeft === 0xff4444 means crashed, 0xffffff means landed
```

- Capture the end-of-run result precisely by subscribing before flying:
  `window.rocketPower.events.on('rp-run-ended', (p) => (window.__runEnd = p))`
  → `{ result: { outcome, reason? }, elapsedMs }`.
- Keys: hold with `keyboard.down/up('ArrowUp'|'ArrowLeft'|'ArrowRight')`, restart with `press('r')`.

## Flows worth driving

1. **Crash path**: press Enter, idle ~5s → free-fall crash → CRASHED overlay; `press('r')` → fresh run (timer resets).
2. **Landing path**: closed-loop autopilot (poll state every ~50ms, bang-bang thrust/rotate).
   A working autopilot lives in the session scratchpad pattern: cruise right at y≈950
   (under stalactite y>820, over ridge y<1152), brake at x>3150, descend upright onto
   pad (x 3072–3584, top y 1920), thrust when vy>42 near ground. Expect `outcome: 'landed'`.
3. **Timer sanity**: screenshot ~300ms after Enter — HUD TIME must read ~00:00.x, not seconds.

## Gotchas

- Level geometry (for autopilot targets) comes from `scripts/gen-level.mjs`'s ASCII map × 2 × 64px.
- Touchdown speed spikes between 50ms control ticks can exceed the 100 px/s limit — a
  crash with reason `too-fast` may be autopilot sloppiness, not a game bug; check `reason`.
- Chrome requests `/favicon.ico` → one harmless 404 in the console.
