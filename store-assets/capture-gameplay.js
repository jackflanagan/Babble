// Standalone Playwright script — captures real-gameplay screenshots + preview
// videos for the CrazyGames store submission. Not a test; run with:
//   node store-assets/capture-gameplay.js [shots|videos|all]
// Requires devDependencies @playwright/test and ffmpeg-static (both already
// in package.json). Re-run any time the game visuals change materially.
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const REPO_ROOT = path.resolve(__dirname, '..');
const FILE_URL = 'file:///' + path.resolve(REPO_ROOT, 'index.html').replace(/\\/g, '/');
const SCRATCH_DIR = path.join(REPO_ROOT, '.capture-scratch');
const STORE_DIR = path.join(REPO_ROOT, 'store-assets', 'crazygames');

const LOCATION_IDS = ['glasgow', 'modena', 'paris', 'ireland', 'athens', 'kenya', 'tokyo', 'brazil', 'newyork', 'boss'];
const LABELS = { glasgow: 'Glasgow', modena: 'Modena', paris: 'Paris', ireland: 'Galway', athens: 'Athens', kenya: 'Amboseli', tokyo: 'Tokyo', brazil: 'Brazil', newyork: 'New York', boss: 'Beijing' };

async function primeProgression(page) {
  // Marks every action level "visited" so the roster chips route through the
  // replay path (`_canReplay`) instead of the fixed first-time campaign,
  // letting this script jump straight to any location — see globe.js.
  await page.addInitScript((ids) => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ids.slice(), levelRecords: {},
      bestAdventureScore: 0, totalAdventures: 0,
    }));
  }, LOCATION_IDS);
}

async function enterLocation(page, id) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  const label = LABELS[id];
  const chips = page.locator('#roster .chip.active');
  // Click via JS dispatch, not Playwright's pointer click — the howto footer
  // can overlap #btnStart at some viewport sizes, and a real pointer click
  // would land on whatever's topmost there instead of the intended element.
  const chipHandle = await chips.filter({ hasText: label }).first().elementHandle();
  await page.evaluate((el) => el.click(), chipHandle);
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.evaluate(() => document.getElementById('btnStart').click());
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(2200); // countdown + first spawns
}

// Gentle autopilot: mostly stands its ground and shoots, with small hops and
// brief taps of movement — animates bubbles/enemies without charging into
// enemies and losing a life (bad look for a promo screenshot).
async function playGently(page, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await page.keyboard.down('ShiftLeft');
    await page.waitForTimeout(120);
    await page.keyboard.up('ShiftLeft');
    await page.waitForTimeout(250);
    if (Math.random() < 0.4) {
      const dir = Math.random() < 0.5 ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      await page.waitForTimeout(120);
      await page.keyboard.up(dir);
    }
    if (Math.random() < 0.3) {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(60);
      await page.keyboard.up('KeyW');
    }
    await page.waitForTimeout(300);
  }
  for (const k of ['KeyA', 'KeyD', 'ShiftLeft', 'KeyW']) await page.keyboard.up(k);
}

// action phase (shoot/move/jump) -> silent wait (let the level evolve, e.g.
// a carnival-dancer wave arriving) -> pure cooldown with zero input, so any
// achievement toast / "life lost" popup from the action phase has faded
// before the screenshot is taken.
async function stagePlay(page, actionMs, waitMs, coolDownMs) {
  await playGently(page, actionMs);
  await page.waitForTimeout(waitMs);
  await page.waitForTimeout(coolDownMs);
}

async function getLives(page) {
  return page.evaluate(() => window.__game ? window.__game.getState().lives : 3);
}

// Takes several attempts (fresh play each time) and keeps whichever left the
// most lives intact — a full-lives frame reads as a much better promo shot
// than one mid-"LIFE LOST" banner.
async function shot(browser, id, outFile, actionMs, waitMs, coolDownMs) {
  const MAX_ATTEMPTS = 6;
  let bestLives = -1, bestFile = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await primeProgression(page);
    await enterLocation(page, id);
    await stagePlay(page, actionMs, waitMs, coolDownMs);
    const lives = await getLives(page);
    const candidate = outFile + '.try' + attempt + '.png';
    const canvas = await page.locator('#gameCanvas').elementHandle();
    await canvas.screenshot({ path: candidate });
    await ctx.close();
    if (lives > bestLives) {
      if (bestFile) fs.unlinkSync(bestFile);
      bestLives = lives; bestFile = candidate;
    } else {
      fs.unlinkSync(candidate);
    }
    if (bestLives >= 3) break;
  }
  fs.copyFileSync(bestFile, outFile);
  fs.unlinkSync(bestFile);
  console.log('screenshot ->', outFile, '(best lives=' + bestLives + ')');
}

async function video(browser, id, size, ms, outBase) {
  const videoDir = path.join(SCRATCH_DIR, 'vid_' + outBase);
  fs.mkdirSync(videoDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: videoDir, size } });
  const page = await ctx.newPage();
  await primeProgression(page);
  await enterLocation(page, id);
  await playGently(page, ms);
  await page.waitForTimeout(200);
  const vp = await page.video().path().catch(() => null);
  await ctx.close();
  const finalPath = vp || fs.readdirSync(videoDir).map(f => path.join(videoDir, f))[0];
  console.log('raw video ->', finalPath);
  return finalPath;
}

(async () => {
  const which = process.argv[2] || 'all';
  const browser = await chromium.launch();

  if (which === 'shots' || which === 'all') {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    // Each call: (location, out file, action ms, silent-wait ms, cooldown ms).
    // Brazil gets a long silent wait so a carnival-dancer wave has time to
    // arrive (they spawn every 4-6.5s); Tokyo/boss just need a brief settle.
    await shot(browser, 'brazil', path.join(STORE_DIR, 'screenshot-01.png'), 2000, 5500, 2000);
    await shot(browser, 'tokyo', path.join(STORE_DIR, 'screenshot-02.png'), 1200, 500, 500);
    await shot(browser, 'boss', path.join(STORE_DIR, 'screenshot-03.png'), 2000, 1500, 2000);
  }

  if (which === 'videos' || which === 'all') {
    const landscapeRaw = await video(browser, 'brazil', { width: 1920, height: 1080 }, 19000, 'landscape');
    const portraitRaw = await video(browser, 'tokyo', { width: 1080, height: 1620 }, 19000, 'portrait');
    await browser.close();

    const encode = (input, output, w, h) => {
      execFileSync(ffmpegPath, [
        '-y', '-i', input,
        '-t', '19',
        '-vf', `scale=${w}:${h}`,
        '-an',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        output,
      ], { stdio: 'inherit' });
    };
    encode(landscapeRaw, path.join(STORE_DIR, 'preview-landscape.mp4'), 1920, 1080);
    encode(portraitRaw, path.join(STORE_DIR, 'preview-portrait.mp4'), 1080, 1620);
    fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
  } else {
    await browser.close();
  }

  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
