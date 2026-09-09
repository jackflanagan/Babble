// @ts-check
// Compact replay result card (#overlayReplayResult): current score, personal
// best, a "NEW BEST!" banner ONLY when the score improved, stars earned, and
// the previous best. The adventure results screen (#overlayWin) is untouched.
// Desktop-only: drives real level completion.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const PROG_KEY = 'bbl_progression_v1';
const CAMP_KEY = 'gh_progress_v2';

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'run once on desktop');
});

/** Boot with Glasgow visited (+ optional prior level record). */
async function boot(page, priorRecord) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(({ ck, pk, rec }) => {
    localStorage.setItem(ck, JSON.stringify({ glasgow: { best: 0, cleared: true } }));
    const prof = {
      version: 1, visitedLocations: ['glasgow'], levelRecords: {},
      bestAdventureScore: 0, totalAdventures: 0,
    };
    if (rec) prof.levelRecords.glasgow = rec;
    localStorage.setItem(pk, JSON.stringify(prof));
  }, { ck: CAMP_KEY, pk: PROG_KEY, rec: priorRecord || null });
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.replayMode, null, { timeout: 5000 });
}

async function startGlasgowReplay(page) {
  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
}

async function finish(page, opts = {}) {
  if (opts.score) await page.evaluate((n) => window.__game.addScore(n), opts.score);
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !document.getElementById('overlayReplayResult').hidden)) return true;
    await page.evaluate((collect) => {
      if (collect) window.__game.forceAllCollectiblesTaken();
      if (window.__game.getState().gameState === 'playing') window.__game.forceWave2();
    }, !!opts.collect);
    await page.waitForTimeout(300);
  }
  return false;
}

const vis = (page, sel) => page.evaluate((s) => !document.querySelector(s).hidden, sel);
const txt = (page, sel) => page.evaluate((s) => document.querySelector(s).textContent, sel);

test('new best: banner shown, score + previous best displayed', async ({ page }) => {
  test.setTimeout(45000);
  await boot(page, { bestScore: 3000, completions: 1, stars: { completion: true, collection: false, performance: false } });
  await startGlasgowReplay(page);
  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  expect(await finish(page, { collect: true, score: target + 3000 })).toBe(true);

  expect(await vis(page, '#overlayReplayResult')).toBe(true);
  expect(await page.evaluate(() => document.getElementById('overlayWin').hidden)).toBe(true);

  expect(await vis(page, '#rrBanner')).toBe(true);
  expect(await txt(page, '#rrBanner')).toMatch(/NEW BEST/i);
  expect(await vis(page, '#rrLabel')).toBe(false);

  const score = parseInt((await txt(page, '#rrScore')).replace(/,/g, ''), 10);
  expect(score).toBeGreaterThan(3000);
  expect(await txt(page, '#rrScore')).toContain(','); // thousands separator

  expect(await vis(page, '#rrPrev')).toBe(true);
  expect(await txt(page, '#rrPrev')).toContain('3,000');
  expect(await txt(page, '#rrStars')).toBe('★★★');           // all three earned this run
  expect(await txt(page, '#rrPrev')).toContain('1★ → 3★');    // star improvement noted
});

test('not a new best: no banner, previous best still shown', async ({ page }) => {
  test.setTimeout(45000);
  await boot(page, { bestScore: 999999, completions: 4, stars: { completion: true, collection: true, performance: true } });
  await startGlasgowReplay(page);
  expect(await finish(page)).toBe(true); // low score, no collectibles

  expect(await vis(page, '#overlayReplayResult')).toBe(true);
  expect(await vis(page, '#rrBanner')).toBe(false);
  expect(await vis(page, '#rrLabel')).toBe(true);
  expect(await txt(page, '#rrLabel')).toMatch(/glasgow/i);

  const score = parseInt((await txt(page, '#rrScore')).replace(/,/g, ''), 10);
  expect(score).toBeLessThan(999999);

  expect(await vis(page, '#rrPrev')).toBe(true);
  expect(await txt(page, '#rrPrev')).toContain('999,999');
  // no "new best" wording is VISIBLE on the card (the banner node exists but is hidden)
  const visibleText = (await page.locator('#overlayReplayResult').innerText()).toLowerCase();
  expect(visibleText).not.toContain('new best');
});

test('first replay with no prior record: score + stars only, no banner, no previous line', async ({ page }) => {
  test.setTimeout(45000);
  await boot(page); // visited, but no levelRecord
  await startGlasgowReplay(page);
  expect(await finish(page)).toBe(true);

  expect(await vis(page, '#overlayReplayResult')).toBe(true);
  expect(await vis(page, '#rrBanner')).toBe(false);
  expect(await vis(page, '#rrPrev')).toBe(false);
  expect(await txt(page, '#rrScore')).not.toBe('');
  expect(await txt(page, '#rrStars')).toMatch(/[★☆]{3}/);
});

test('card buttons: Replay re-runs the level, World map returns to the globe', async ({ page }) => {
  test.setTimeout(60000);
  await boot(page);
  await startGlasgowReplay(page);
  expect(await finish(page)).toBe(true);

  // Replay
  await page.locator('#rrReplay').click();
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  expect(await page.evaluate(() => document.getElementById('overlayReplayResult').hidden)).toBe(true); // card dismissed
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');

  // World map
  await page.waitForTimeout(3300);
  expect(await finish(page)).toBe(true);
  await page.locator('#rrMap').click();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 5000 });
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);
});

test('the compact card is replay-only: a campaign level clear does not show it', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.replayMode, null, { timeout: 5000 });

  // Clean profile -> chip starts the campaign.
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);

  // Force the campaign level to complete; it auto-transitions (mini-game next).
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.__game.miniGameId() || window.__game.campaignStep() > 0)) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }
  expect(await page.evaluate(() => document.getElementById('overlayReplayResult').hidden)).toBe(true);
});
