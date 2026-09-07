# Babble — Claude Code Spec

## Project Overview
A browser-based word/geography game built with vanilla JS + Web Audio API + WebRTC multiplayer.
Bundled with esbuild. Targets CrazyGames but also works self-hosted.

## Architecture

### Build pipeline
- Source: `src/` (ES modules)
- Entry: `src/main.js` imports `src/canvas.js` and `src/utils.js`
- Bundle: `npx node build.js` → `dist/game.js` (IIFE, committed to repo)
- HTML: `index.html` loads `dist/game.js` — no inline JS
- Tests: Playwright (`npm test`) with 5 device profiles

### Current module structure
```
src/
  main.js     — ~3,250 lines (core game engine, update loop, mini-games, main draw)
  sdk.js      — CrazyGames SDK wrapper, ad break helpers, leaderboard UI
  starfield.js — Ambient starfield animation
  audio.js    — Web Audio API synth sound effects (playSound)
  music.js    — Background music (embedded base64 MP3)
  features.js — Streak counter, daily challenge, achievements
  globe.js    — Globe scene rendering, LOCATIONS, WORLD_LAND polygon data, pins
  net.js      — Online multiplayer (WebRTC via Trystero)
  levels.js   — Per-location theming, LEVEL_LAYOUTS, LEVELS definitions
  draw.js     — Drawing helpers: creatures, enemies, power-ups, platforms
  canvas.js   — ctx, W, H, initCanvas()
  utils.js    — TAU, clamp, lerp, rand, safeGet, safeSet, escHtml, haptic
dist/
  game.js     — esbuild IIFE bundle (regenerate after src/ changes)
```

## Refactor Status — Phase 2 complete

Phase 1: JS extracted from index.html, esbuild pipeline added.
Phase 2: main.js split from 6,232 lines to ~3,250 lines across 10 modules.

### Completed extractions

| Module | Lines | Contents |
|---|---|---|
| `src/sdk.js` | ~120 | CrazyGames SDK, leaderboard config/UI |
| `src/starfield.js` | ~45 | Starfield IIFE, converted to initStarfield() |
| `src/audio.js` | ~375 | audioCtx, masterGain, playSound (all synth types) |
| `src/music.js` | ~20 | bgmAudio, startMusic, stopMusic |
| `src/features.js` | ~105 | Streak, daily challenge, achievements |
| `src/globe.js` | ~495 | Globe rendering, LOCATIONS, WORLD_LAND, pins |
| `src/net.js` | ~335 | WebRTC multiplayer via Trystero |
| `src/levels.js` | ~635 | LEVEL_LAYOUTS, LEVELS definitions, drawSkylineRow |
| `src/draw.js` | ~950 | All creature/enemy/powerup/platform draw functions |

### Remaining in main.js (not extracted)
- **Scene switching** (~150 lines) — tightly coupled to game state (enterLocation, backToMap, selectMode)
- **Game engine core** (~120 lines) — input handling, key bindings, mobile controls
- **Game loop + update** (~700 lines) — physics, collision, spawning, update(dt)
- **Mini-games** (~1000 lines) — endless mode, campaign transitions, 5 mini-games + their draw functions
- **Main draw()** (~600 lines) — orchestrates all rendering, references all game state
- **Cosmetic UI** (~80 lines) — skin dots, name input, HUD updates

These sections were not extracted because they have extensive cross-references to 10+ game state
variables (players, enemies, bubbles, gameState, score, etc.) that would require a complex shared
state system. Further splitting would need a game state object refactor.

### Also pending
- Extract 567-line `<style>` block from `index.html` to `src/style.css` (link tag in head)
- `globe-hopper.html` is a pre-refactor artifact — can be deleted once the new build is confirmed stable

## Rules for working in this codebase

1. **Always rebuild after editing src/.** Run `node build.js` to update `dist/game.js` before testing.
2. **Commit `dist/game.js`.** The game must work without a build step for users who clone the repo.
3. **One module at a time.** When splitting `main.js`, extract one section, verify the game runs
   (open index.html or run `npm test`), then move to the next. Don't batch multiple sections in one change.
4. **No bundler magic.** Keep imports explicit. esbuild handles tree-shaking; don't add Rollup/Webpack.
5. **Preserve the IIFE output format.** `build.js` uses `format: 'iife'` — do not change this without
   verifying CrazyGames SDK compatibility.
6. **Tests live in `tests/`.** Playwright specs use real browser automation — run `npm test` to verify
   layout and navigation still work after structural changes.
7. **`globe-hopper.html` is legacy.** Don't modify it; it is not part of the current build pipeline.

## Key globals in main.js (before full modularisation)
Many variables are currently in module scope in `main.js` and shared implicitly across sections.
When extracting a module, trace dependencies carefully — pass shared state as function arguments
or export/import explicit references rather than relying on closure over module scope.
