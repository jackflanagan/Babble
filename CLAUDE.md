# Babble — Claude Code Spec

## Project Overview
A browser-based bubble-trap platformer with a globe-hopping / geography theme.
Vanilla JS + Web Audio API synth sound + WebRTC multiplayer. Bundled with esbuild.
Targets CrazyGames but also works self-hosted.

Core loop: shoot bubbles to trap enemies, jump on a trapped bubble to pop it, grab
collectibles for bonus points, clear every enemy across two waves to finish a level.

## The game is one continuous adventure

Tapping **any** landing pin on the globe starts a single fixed run:

```
Glasgow → Modena → Paris → (Mediterranean) → Galway → Athens → (Krakow) →
Amboseli → Tokyo → (Berlin) → Brazil → (London) → New York → (Pamplona) → Beijing
```

15 stops = 10 levels + 5 mini-games, in a fixed order (`CAMPAIGN` in `main.js`),
ending on the Beijing boss. Order is tuned for a new-player difficulty curve:
three real levels before the first mini-game, mini-games never in the first 3
stops / never adjacent, Tokyo and Brazil not back-to-back.

- **First-time run always starts at `CAMPAIGN[0]`.** `enterLocation()` ignores which
  pin was tapped; `campaignStep` walks the list; `getNextCampaignItem()` returns
  `null` at the end. (A *completed* location can later be replayed from the globe —
  see the replay/mastery systems — but that is a separate path and never touches
  `campaignStep`.)
- **Score carries the whole way.** `resetGame(keepScore)` — campaign transitions pass
  `true`. Lives reset to 3 per level.
- **Early safety net:** a wipe on the first three stops (`campaignStep <= 2`)
  auto-restarts that stop (score carries, lives refill) instead of ending the run.
- **Out of lives from the fourth stop on ends the run** → `finishAdventure(false)`. Clearing Beijing →
  `finishAdventure(true)`. Both show the `#overlayWin` overlay repurposed as the
  results screen (title "Adventure over" / "Adventure complete!"), with "New
  adventure" / "World map" buttons. `finishAdventure(true)` calls
  `recordAdventureComplete(finalScore)` → `bestAdventureScore` + `totalAdventures++`.
- **Mini-game clears bank a Trap Blast charge** (`powerCharges`). In a level, press
  **E** / **Q** or the `#btnPower` / `#mcPower` button to spend one: every free enemy
  is instantly bubbled. Charges reset per run. A *failed* mini-game has no penalty —
  the run just continues without the charge.
- **Difficulty tuning (new-player curve, `src/levels.js` + a few `main.js` consts):**
  Glasgow `buckfast` waveRatio `0.25`, Modena `parmesan` `0.3`, Amboseli `motorbike`
  `0.4`; motorbike smoke eased (burst `+0.38`, decay `×0.2`, overlay alpha `×0.5`);
  Berlin mini-game window `litDuration 0.9` / `needed 24`; Glasgow tutorial runs 18 s
  with a 3rd line about combos; HUD / transitions drop the "N / 15" total (first 3
  stops show only the location name).
- **Leaderboard is not wired up.** `sdk.js` has empty `LB_URL` / `LB_KEY`, so
  `submitScore()` no-ops and the name-entry row stays hidden. Names still persist
  (to `bbl_lb_names_v1`) so the flow is ready for a backend.

Location **ids** never change (`ireland`, `kenya`, `boss`); only their display
**names** were updated to Galway / Amboseli / Beijing.

## Replay, three-star mastery & the results card

A location the player has **completed at least once** (`visitedLocations`) becomes
replayable straight from the globe — a *separate* path from the campaign.

- **Entry.** `globe.js` `launchLocation(loc)` routes every pin/chip tap:
  `_canReplay(loc.id)` (injected: `visitedLocations.includes(id) && LEVELS[id] &&
  LEVEL_LAYOUTS[id]`) → `enterLocation(loc, {replay:true})` → `enterReplay(loc)`;
  otherwise the normal campaign `enterLocation(loc)`. A locked chip opens the info
  card instead of launching. Guests never initiate (`netRole==='guest' && netConnected`).
- **`enterReplay(loc)`** sets `replayMode = true`, `campaignMode = false`, plays that
  one level via the ordinary `LEVELS` / `LEVEL_LAYOUTS` / `resetGame()` pipeline.
  **It never touches `campaignStep`** and does not bank/spend `powerCharges`.
- **`replayMode`** is a module-scope flag in `main.js` (mutually exclusive with
  `campaignMode`), cleared in `backToMap()` and the campaign path of `enterLocation`.
- **Three mastery stars** per action level, stored in `levelRecords[id].stars`
  (`{completion, collection, performance}`, each only ever flips `false → true`):
  - `completion` — reaching `winLevel()`
  - `collection` — every collectible in the level picked up
  - `performance` — `levelScore >= levelPerfTarget(id)`. `levelScore =
    state.score - levelStartScore` isolates *this* level's earnings, so it works the
    same in a replay (score starts 0) and inside the cumulative-score campaign.
    `levelStartScore` is snapshotted in `resetGame()`.
  - **`levelPerfTarget(id)`** = `LEVELS[id].starScore` if set (boss = `2600`), else
    derived from the level's own point values:
    `round((10·pop + 2a+2b+2c + 150) · 1.7 / 100) · 100` ≈ 4200 standard, 5400 Athens.
  `winLevel()` records stars for **both** campaign and replay clears; the win screen's
  `★` row and the globe use the same count (`levelStarCount(id)`).
- **`#overlayReplayResult`** — the compact replay results card (separate from the
  campaign `#overlayWin`, which is untouched). `populateReplayResult(id, runScore,
  prevBest, prevStars, starsNow)` fills `#rrScore` (comma-formatted), `#rrStars`,
  `#rrPrev` ("Previous best: …", shown only when a prior record exists), and
  `#rrBanner` "NEW BEST!" (shown only when `runScore > prevBest` **and** a prior best
  existed). Buttons `#rrReplay` (re-run, `replayMode` stays on) / `#rrMap`
  (`backToMap`). No animation; `resetGame()` also hides it.
- `prevBest` / `prevStars` are snapshotted at the top of `winLevel()` **before** the
  record is updated.

## Globe / world map (`src/globe.js`)

- **Three location states**, all driven by progression data:
  - **LOCKED** — pin `disabled` + `.locked` (grey, no pulse); chip not `.active`.
  - **AVAILABLE** — pin `.pin` (coral, pulsing).
  - **VISITED** — pin **and** roster chip get `.cleared` (gold), from
    `pCleared(id) === visitedLocations.includes(id)`.
- **`refreshClearedPin()`** re-derives pin unlocks from `visitedLocations` (the
  campaign unlock chain: Europe-4 → Amboseli; Galway → Athens; Amboseli → Tokyo →
  Brazil → New York → Beijing) and toggles the `.cleared` classes + chip tooltips.
  Called at globe module load (empty data), then from `main.js` init and `backToMap()`.
- **`#globe-locinfo`** — one reusable info card (`ensureLocInfo` builds it once,
  bottom-centre of `.globe-wrap`). Pin tap → `showLocInfo(loc)` fills name /
  `★`-line (`_levelStars`) / state text / best score (`pBest`) / a PLAY-or-REPLAY
  button; a locked chip opens it with an explain-only message. Tap-off / `#…-x` closes.
- **`positionPins()`** projects each pin to screen space, then runs a small
  **de-cluster pass** (3 iterations) pushing apart any interactive pins whose hit
  areas would overlap — the European stops (Glasgow / Galway / Paris / Modena)
  cluster tightly on a phone globe. `minGap` = 48 px on `(pointer: coarse)`, 34 px
  otherwise; `.pin` padding is 12 px, 18 px under `@media (pointer: coarse)`. The
  canvas glow spots stay at the true location — only the button nudges.
- **DI from `main.js`:** `setGlobeProgress(getProgression())`, `setEnterLocation`,
  `setCanReplay`, `setLevelStars`, `setLbName`.

## Player progression — one canonical system

`src/progression.js` is the **single source of truth** for all persistent player
progress. There is no second copy anywhere. One localStorage key,
`bbl_progression_v1` (schema `version: 2`):

```
{
  version: 2,
  visitedLocations: [ locationId, … ],   // completed at least once (the old `cleared`)
  levelRecords: {
    [locationId]: {
      bestScore,    // best ISOLATED score for that level (campaign leg or replay)
      completions,  // times cleared, campaign + replay (the old `playCount`)
      stars: { completion, collection, performance }   // three-star mastery, only ever accrue
    }
  },
  bestAdventureScore,   // best score from a fully completed adventure
  totalAdventures       // adventures that reached completion
}
```

- **API (all in `progression.js`):** `loadProgression()` / `getProgression()` return
  the one live object; `markLocationVisited`, `recordLevelResult(id, isolatedScore)`
  (bumps `completions`, keeps the higher `bestScore`), `recordLevelStars` (OR-merges
  stars), `recordAdventureComplete`; readers `levelBestScore` / `levelCompletions` /
  `isLevelCleared` / `levelStarCount`; `resetProgression()`.
- **main.js keeps NO progression state.** `winLevel` calls the recorders;
  everything else (HUD "best", escalating-difficulty `playCount`, skip-tutorial,
  skin unlocks, `globetrotter`) reads the helpers.
- **globe.js gets the canonical object via the existing DI setter**
  `setGlobeProgress(getProgression())`, plus injected getters `setCanReplay`,
  `setLevelStars`, `setLbName`. Its `pCleared()` / `pBest()` helpers read
  `visitedLocations` / `levelRecords`. **The campaign unlock chain in
  `refreshClearedPin()` reads `visitedLocations`.**
- **Legacy `gh_progress_v2`** (the old per-location `{best,cleared,playCount}` +
  `adventure`) is folded in **once** by `migrateLegacy()` on first load
  (`max()`-merged), then the key is `removeItem`-ed. This is the ONLY code that
  touches `gh_progress_v2` — do not add gameplay reads/writes of it.
- **Player name / leaderboard identity is kept separate** in `bbl_lb_names_v1`
  (owned by `sdk.js`: `getLbName` / `setLbName`), not in the progression profile.
- **Reset** is `localStorage.clear()` (`#btnReset`) — key-agnostic, wipes all of it.

## Architecture

### Build pipeline
- Source: `src/` (ES modules). Entry point: `src/main.js`.
- `node build.js` does two things:
  1. esbuild-bundles `src/main.js` → `dist/game.js` (`format: 'iife'`, committed to repo).
  2. Inlines `src/style.css` into `index.html`'s `<style>` block (replaces a
     `<link rel="stylesheet" href="src/style.css">` or an existing `<style>…</style>`
     — idempotent across repeated builds).
- `index.html` loads `dist/game.js`. No inline JS; the CSS is inlined at build time.
- `npm test` runs `node build.js` first (`pretest`), then Playwright.

### Module structure (`src/`)
| File | Lines | Contents |
|---|---|---|
| `main.js` | ~3,720 | Game engine, input, update/physics loop, the adventure/campaign system + replay/mastery wiring, 5 mini-games, main `draw()`, `window.__game` debug hook |
| `draw.js` | ~1,130 | All creature / enemy / collectible / power-up / platform draw functions |
| `levels.js` | ~755 | `LEVEL_LAYOUTS`, `LEVELS` (per-location theming, blurbs, enemy/collectible art refs, powerups, `starScore`), `drawSkylineRow` |
| `globe.js` | ~645 | Globe scene rendering, `LOCATIONS`, `WORLD_LAND` polygons, pins (de-cluster + tap targets), unlock chain, location info card |
| `audio.js` | ~380 | `audioCtx`, `masterGain`, `playSound` (all synth sound types) |
| `net.js` | ~340 | WebRTC multiplayer via Trystero; injectable-deps pattern (`setNet*` setters) |
| `sdk.js` | ~155 | CrazyGames SDK wrapper, ad-break helpers, leaderboard config/UI, `bbl_lb_names_v1` name store |
| `progression.js` | ~255 | **The one canonical player-progression store** (`bbl_progression_v1` v2) + `migrateLegacy()` |
| `features.js` | ~110 | Streak counter, daily challenge, achievements |
| `starfield.js` | ~45 | Ambient starfield — `initStarfield()` |
| `music.js` | ~20 | Background music (embedded base64 MP3) — `startMusic` / `stopMusic` |
| `utils.js` | ~20 | `TAU`, `clamp`, `lerp`, `rand`, `safeGet`, `safeSet`, `escHtml`, `haptic` |
| `canvas.js` | ~10 | `ctx`, `W` (720), `H` (480), `initCanvas()` |
| `style.css` | ~645 | Full stylesheet, inlined into `index.html` at build time |

`W`/`H` are a fixed 720×480 logical coordinate space; the canvas is CSS-scaled.

### Still living in `main.js`
Scene switching, input/keybindings/mobile controls, the update loop, the mini-games,
`draw()`, and cosmetic UI all stay in `main.js` — they cross-reference the `state`
object and ~25 module-scope variables (`GRAVITY`, `PLATFORMS`, `freezeT`, `slowT`,
`powerCharges`, `campaignMode`, `campaignStep`, `replayMode`, `levelStartScore`, …).
Further extraction needs those threaded through explicitly rather than closed over.

`net.js` is fully extracted but depends on main.js wiring it up: `setNetState`,
`setNetKeys`, `setNetUpdateHud`, `setNetLivePlayers`, `setNetTryJump`, etc. When a
net helper needs live game data, it must go through one of these getters — reading
the `_netShared` sync buffer directly breaks single-player (it's only populated by
the host).

## Tests (`tests/`, Playwright, 5 device profiles)
| Spec | Covers |
|---|---|
| `layout.spec.js` | Scene visibility, canvas sizing, HUD, navigation, portrait warning |
| `reset.spec.js` | Reset button clears localStorage (canonical + legacy + unrelated keys); clean load with empty storage |
| `render.spec.js` | Every location draws non-blank pixels with **zero** pageerrors — guards the "undeclared global in an extracted module" class of bug |
| `gameplay.spec.js` | `window.__game` hook; fresh-level state; lose overlay hidden while alive; P1 jump/bubble keys don't throw; Trap Blast power; forced two-wave win |
| `build.spec.js` | esbuild output is an IIFE; the CSS inliner leaves no dangling link and is idempotent (desktop-only, serial) |
| `multiplayer.spec.js` | Opening "Two phones" + host/join don't throw (WebRTC can't pair over `file://`) |
| `adventure.spec.js` | Drives the whole 15-stop run via the debug hook — fixed order, cumulative score, finish screen (desktop-only, ~1.3 min) |
| `progression.spec.js` | Canonical store: clean profile writes nothing; load/sanitise; corrupt-data fallback; visited persists; adventure completion |
| `canonical-progression.spec.js` | Legacy `gh_progress_v2` migration + key removal; merge keeps higher; new game writes only canonical; replay/stars/globe-unlock/reset all off canonical (desktop-only) |
| `replay.spec.js` | World-map replay: campaign clear unlocks replay; visited pin starts that level; `campaignStep` untouched; returns to results/map; level-record scoring; locked can't start (desktop-only) |
| `mastery.spec.js` | Three stars (completion / collection / performance); persistence; never decrease; a better replay adds missing stars (desktop-only) |
| `replay-result.spec.js` | Compact `#overlayReplayResult` card: NEW BEST only when improved; previous best; first replay; buttons; replay-only (desktop-only) |
| `globe-states.spec.js` | Globe communicates LOCKED / AVAILABLE / VISITED; info card shows name/score/stars/action; data-driven (desktop-only) |
| `balance.spec.js` | Campaign order (mini-games spaced, none in first 3, Tokyo≠Brazil-adjacent); early-stop safety net restarts vs later stops end the run (desktop-only for the driven parts) |

`window.__game` is a debug hook (defined at the bottom of `main.js`) exposing
`getState()`, `miniGameId()`, `campaignStep()`, `replayMode()`, `adventureComplete()`,
`getProgression()`, `levelStars(id)`, `perfTarget(id)`, `campaign()`, `powerCharges()`,
`freeEnemyCount()`, `forceAllCollectiblesTaken()`, `forceWave2()`, `forceMiniGameWin()`,
`usePower()`, `addScore(n)`, `loseLife()`, etc. Never call it from production code.

**Not runtime-tested:** real WebRTC multiplayer (needs two hosted browsers — Trystero
won't pair over `file://`); leaderboard submission (no backend configured).

## State & open threads (for a fresh session)

Everything below is **done, tested and on `main`** — this section is orientation, not a TODO.

Recent work, newest first:
1. **Progression consolidation** — one canonical store (`progression.js`), `main.js`
   holds no progression state, `gh_progress_v2` migrated once then removed, names
   split to `bbl_lb_names_v1`. Globe pins de-clustered + bigger touch targets.
2. **Balance pass** — campaign reorder, early-stop safety net, enemy/mini-game/
   tutorial/HUD tweaks (see the campaign section).
3. **Replay + three-star mastery + `#overlayReplayResult`** card.
4. **Globe three-state UI + `#globe-locinfo`** info card.

Known quirks / not-yet-done (no one has asked for these):
- **Level timing is wave-2-only.** `state.startTime` is reset when wave 2 spawns, so
  `totalElapsed` in `winLevel()` measures wave 2, not the whole level. The mastery
  *performance* star sidesteps this (score-based via `levelStartScore`), but the
  cosmetic `★` star-rating and time bonus still use the partial value.
- **Only action levels are replayable**, not mini-games (no `LEVELS` entry for them).
- **`render.spec.js` effectively only renders Glasgow** — `enterLocation()` always
  starts `CAMPAIGN[0]`, so its per-location loop enters Glasgow 10×. Still a useful
  pageerror guard; a real per-location render check would need the `__game` hook.
- **Modena gravity is 1200** (floaty) — left as-is in the balance pass because its
  platforms were placed for it; changing it risks unreachable collectibles.
- **Leaderboard backend** — `LB_URL`/`LB_KEY` still empty in `sdk.js`.

## Rules for working in this codebase
1. **Always `node build.js` after editing `src/`** before testing or committing.
2. **Commit `dist/game.js`** — the game must run without a build step for anyone who
   clones the repo. `build.js` also rewrites `index.html`'s `<style>` block; commit that too.
3. **Keep `format: 'iife'`** in `build.js` — verify CrazyGames SDK compatibility before changing.
4. **No bundler magic.** Explicit imports; esbuild does the tree-shaking. No Rollup/Webpack.
5. **esbuild does not error on undeclared identifiers** — it treats them as globals.
   A missing `import` in an extracted module builds fine and throws at runtime. When
   moving code between modules, check every free identifier is imported or declared.
6. **`tests/screenshots/*.png` are regenerated on every run** — the diffs are pixel
   churn, safe to commit or discard.
7. Run `npm test` (or `npx playwright test`) after any structural change.

## Local preview
No `python` on this box. Serve over HTTP with a tiny Node static server (the game
loads the CrazyGames SDK, which wants `http(s)://`). Chrome throttles / freezes the
game whenever its tab is backgrounded — keep it foreground when testing by hand.
