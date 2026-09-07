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
  main.js     — 6,200+ line monolith (Phase 2 target: split into modules below)
  canvas.js   — ctx, W, H, initCanvas()
  utils.js    — TAU, clamp, lerp, rand, safeGet, safeSet, escHtml, haptic
dist/
  game.js     — esbuild IIFE bundle (regenerate after src/ changes)
```

## Refactor Status — Phase 2 in progress

Phase 1 is complete: JS extracted from index.html, esbuild pipeline added.

**Phase 2 goal:** split `src/main.js` into logical modules. The file has clear section banners
marking the intended boundaries. Extract each section in order, keeping the game working after
each extraction by updating imports in `main.js`.

### Planned module splits (from `src/main.js` section banners)

| Target file | Approx lines in main.js | Contents |
|---|---|---|
| `src/sdk.js` | 1–133 | CrazyGames SDK wrapper, ad break helpers |
| `src/features.js` | 134–247 | Streak, daily challenge, achievements |
| `src/starfield.js` | 249–292 | Starfield animation |
| `src/globe.js` | 293–773 | Globe scene rendering, pins, WORLD_LAND polygon data |
| `src/scenes.js` | 774–918 | Scene switching logic |
| `src/net.js` | 919–1241 | Online multiplayer (WebRTC via Trystero) |
| `src/engine.js` | 1242–2023 | Game engine core: physics, input, keys, mobile controls |
| `src/audio.js` | 2024–2388 | Web Audio API synth sounds |
| `src/music.js` | 2389–3490 | Background music (embedded base64 MP3) |
| `src/game.js` | 3491–4654 | Endless mode, per-location level themes, game loop |
| `src/draw.js` | 4655–6232 | Drawing functions: shared, power-ups, creatures, enemies |

### Also pending
- Extract 567-line `<style>` block from `index.html` → `src/style.css` (link tag in head)
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
