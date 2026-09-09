// @ts-check
// Three-star mastery for replayable action levels:
//   completion  — level cleared
//   collection  — every collectible picked up
//   performance — this level's score met LEVELS[id].starScore / levelPerfTarget
// Stars persist in levelRecords, only ever accrue, and show on the map UI.
// Desktop-only: drives real level completion (same as adventure/replay specs).
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const PROG_KEY = 'bbl_progression_v1';   // the single canonical store

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'run once on desktop');
});

async function bootWithGlasgowVisited(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate((pk) => {
    localStorage.setItem(pk, JSON.stringify({
      version: 2, visitedLocations: ['glasgow'], levelRecords: {},
      bestAdventureScore: 0, totalAdventures: 0,
    }));
  }, PROG_KEY);
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.levelStars && window.__game.replayMode, null, { timeout: 5000 });
}

async function startGlasgowReplay(page) {
  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300); // start countdown
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
}

/** Drive the currently-playing level to completion.
 *  opts.collect -> pick up all collectibles; opts.score -> inject extra score. */
async function finishLevel(page, opts = {}) {
  if (opts.score) await page.evaluate((n) => window.__game.addScore(n), opts.score);
  for (let i = 0; i < 60; i++) {
    // A world-map replay finishes on the compact result card, not #overlayWin.
    if (await page.evaluate(() => !document.getElementById('overlayReplayResult').hidden)) return true;
    await page.evaluate((collect) => {
      if (collect) window.__game.forceAllCollectiblesTaken();
      if (window.__game.getState().gameState === 'playing') window.__game.forceWave2();
    }, !!opts.collect);
    await page.waitForTimeout(300);
  }
  return false;
}

const stars = (page) => page.evaluate(() => window.__game.getProgression().levelRecords.glasgow.stars);
const starCount = (page) => page.evaluate(() => window.__game.levelStars('glasgow'));

test('completion star: awarded for clearing the level, nothing else', async ({ page }) => {
  test.setTimeout(45000);
  await bootWithGlasgowVisited(page);
  await startGlasgowReplay(page);
  expect(await finishLevel(page)).toBe(true); // no collectibles, no injected score

  expect(await stars(page)).toEqual({ completion: true, collection: false, performance: false });
  expect(await starCount(page)).toBe(1);
});

test('collection star: awarded when every collectible is picked up', async ({ page }) => {
  test.setTimeout(45000);
  await bootWithGlasgowVisited(page);
  await startGlasgowReplay(page);
  expect(await finishLevel(page, { collect: true })).toBe(true);

  const s = await stars(page);
  expect(s.completion).toBe(true);
  expect(s.collection).toBe(true);
  expect(s.performance).toBe(false);
  expect(await starCount(page)).toBe(2);
});

test('performance star: awarded when the level score meets its target', async ({ page }) => {
  test.setTimeout(45000);
  await bootWithGlasgowVisited(page);
  await startGlasgowReplay(page);

  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  expect(target).toBeGreaterThan(1000); // sanity: a real, balance-derived target
  expect(await finishLevel(page, { score: target + 500 })).toBe(true);

  const s = await stars(page);
  expect(s.completion).toBe(true);
  expect(s.performance).toBe(true);
  expect(s.collection).toBe(false);
  expect(await starCount(page)).toBe(2);
});

test('persistence: stars survive a reload', async ({ page }) => {
  test.setTimeout(45000);
  await bootWithGlasgowVisited(page);
  await startGlasgowReplay(page);
  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  expect(await finishLevel(page, { collect: true, score: target + 1000 })).toBe(true);
  expect(await starCount(page)).toBe(3);

  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.levelStars, null, { timeout: 5000 });

  expect(await stars(page)).toEqual({ completion: true, collection: true, performance: true });
  expect(await starCount(page)).toBe(3);
  // and it's visible on the map UI (info card + chip tooltip)
  const title = await page.locator('#roster .chip', { hasText: 'Glasgow' }).getAttribute('title');
  expect(title).toContain('3/3');
});

test('stars never decrease: a worse replay keeps every earned star', async ({ page }) => {
  test.setTimeout(60000);
  await bootWithGlasgowVisited(page);

  // Run 1: earn all three.
  await startGlasgowReplay(page);
  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  expect(await finishLevel(page, { collect: true, score: target + 1000 })).toBe(true);
  expect(await starCount(page)).toBe(3);

  // Run 2: deliberately worse — no collectibles, no score.
  await page.locator('#rrReplay').click(); // replay card's "Replay"
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  expect(await finishLevel(page)).toBe(true);

  expect(await stars(page)).toEqual({ completion: true, collection: true, performance: true });
  expect(await starCount(page)).toBe(3);
  expect(await page.evaluate(() => window.__game.getProgression().levelRecords.glasgow.completions)).toBe(2);
});

test('replay improving a record: a later, better run adds the missing stars', async ({ page }) => {
  test.setTimeout(60000);
  await bootWithGlasgowVisited(page);

  // Run 1: completion only.
  await startGlasgowReplay(page);
  expect(await finishLevel(page)).toBe(true);
  expect(await stars(page)).toEqual({ completion: true, collection: false, performance: false });
  expect(await starCount(page)).toBe(1);
  const bestAfter1 = await page.evaluate(() => window.__game.getProgression().levelRecords.glasgow.bestScore);

  // Run 2: full clear + strong score.
  await page.locator('#rrReplay').click();
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  expect(await finishLevel(page, { collect: true, score: target + 2000 })).toBe(true);

  expect(await stars(page)).toEqual({ completion: true, collection: true, performance: true });
  expect(await starCount(page)).toBe(3);
  const bestAfter2 = await page.evaluate(() => window.__game.getProgression().levelRecords.glasgow.bestScore);
  expect(bestAfter2).toBeGreaterThan(bestAfter1);
});
