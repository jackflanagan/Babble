// @ts-check
// src/progression.js (bbl_progression_v1) is the ONE canonical progression
// store. main.js / globe.js keep no independent copy. The legacy gh_progress_v2
// object is folded in once by migration, then removed.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const CANON = 'bbl_progression_v1';
const LEGACY = 'gh_progress_v2';
const NAMES = 'bbl_lb_names_v1';

async function boot(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });
}
const canon = (page) => page.evaluate(() => window.__game.getProgression());
const raw = (page, k) => page.evaluate((k) => { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }, k);

test('migration: a legacy gh_progress_v2 save is folded into the canonical store and removed', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gh_progress_v2', JSON.stringify({
      glasgow: { best: 4200, cleared: true, playCount: 3, name: 'ADA' },
      modena:  { best: 5100, cleared: true, playCount: 1 },
      athens:  { best: 0,    cleared: false },           // reached, not cleared
      adventure: { best: 18000, name: 'ADA' },
    }));
  });
  await boot(page);

  const c = await canon(page);
  expect(c.version).toBe(2);
  // cleared -> visitedLocations; not-cleared stays out
  expect(c.visitedLocations.sort()).toEqual(['glasgow', 'modena']);
  // per-level best + playCount -> levelRecords.bestScore / .completions, + completion star
  expect(c.levelRecords.glasgow).toEqual({ bestScore: 4200, completions: 3, stars: { completion: true, collection: false, performance: false } });
  expect(c.levelRecords.modena).toEqual({ bestScore: 5100, completions: 1, stars: { completion: true, collection: false, performance: false } });
  expect(c.levelRecords).not.toHaveProperty('athens');
  // adventure best carried over
  expect(c.bestAdventureScore).toBe(18000);

  // legacy key removed, canonical persisted, names moved to their own store
  expect(await raw(page, LEGACY)).toBeNull();
  expect(await raw(page, CANON)).not.toBeNull();
  expect(await raw(page, NAMES)).toMatchObject({ glasgow: 'ADA', adventure: 'ADA' });
});

test('migration merges with an existing v1 canonical profile, keeping the higher values', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 1,
      visitedLocations: ['glasgow'],
      levelRecords: { glasgow: { bestScore: 9000, completions: 5, stars: { completion: true, collection: true, performance: false } } },
      bestAdventureScore: 20000, totalAdventures: 4,
    }));
    localStorage.setItem('gh_progress_v2', JSON.stringify({
      glasgow: { best: 4200, cleared: true, playCount: 3 },   // lower — must not overwrite
      adventure: { best: 12000 },                              // lower — must not overwrite
    }));
  });
  await boot(page);

  const c = await canon(page);
  expect(c.version).toBe(2);
  expect(c.levelRecords.glasgow.bestScore).toBe(9000);        // kept the higher
  expect(c.levelRecords.glasgow.completions).toBe(5);
  expect(c.levelRecords.glasgow.stars.collection).toBe(true); // v1 star preserved
  expect(c.bestAdventureScore).toBe(20000);
  expect(c.totalAdventures).toBe(4);
  expect(await raw(page, LEGACY)).toBeNull();
});

test('a brand-new game writes only the canonical store, never gh_progress_v2', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'drives real play');
  test.setTimeout(45000);
  await boot(page);
  expect(await raw(page, CANON)).toBeNull();   // clean load persists nothing
  expect(await raw(page, LEGACY)).toBeNull();

  // Play the campaign until it advances past Glasgow (winLevel has run once).
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__game.getState().currentLocationId !== 'glasgow' || window.__game.campaignStep() > 0)) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }

  const c = await raw(page, CANON);
  expect(c).not.toBeNull();
  expect(c.version).toBe(2);
  expect(c.visitedLocations).toContain('glasgow');
  expect(c.levelRecords.glasgow.completions).toBe(1);
  expect(c.levelRecords.glasgow.bestScore).toBeGreaterThan(0);
  // The legacy key was never created.
  expect(await raw(page, LEGACY)).toBeNull();
});

test('replay still works off the canonical store', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'drives real play');
  test.setTimeout(45000);
  await page.addInitScript(() => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ['glasgow'],
      levelRecords: { glasgow: { bestScore: 500, completions: 1, stars: { completion: true, collection: false, performance: false } } },
      bestAdventureScore: 0, totalAdventures: 0,
    }));
  });
  await boot(page);
  await page.waitForFunction(() => window.__game.replayMode, null, { timeout: 5000 });

  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  await page.waitForTimeout(3300);

  // Finish the replay -> the canonical record's completions climb, no legacy key.
  await page.evaluate(() => window.__game.addScore(6000));
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !document.getElementById('overlayReplayResult').hidden)) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }
  const c = await canon(page);
  expect(c.levelRecords.glasgow.completions).toBe(2);
  expect(c.levelRecords.glasgow.bestScore).toBeGreaterThan(500);
  expect(await raw(page, LEGACY)).toBeNull();
});

test('mastery stars still record into the canonical levelRecords', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'drives real play');
  test.setTimeout(45000);
  await page.addInitScript(() => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ['glasgow'],
      levelRecords: {}, bestAdventureScore: 0, totalAdventures: 0,
    }));
  });
  await boot(page);
  await page.waitForFunction(() => window.__game.replayMode, null, { timeout: 5000 });

  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);

  const target = await page.evaluate(() => window.__game.perfTarget('glasgow'));
  await page.evaluate((n) => window.__game.addScore(n), target + 1000);
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !document.getElementById('overlayReplayResult').hidden)) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }
  const c = await canon(page);
  expect(c.levelRecords.glasgow.stars).toEqual({ completion: true, collection: true, performance: true });
  expect(await page.evaluate(() => window.__game.levelStars('glasgow'))).toBe(3);
});

test('the globe unlock chain reads the canonical visitedLocations', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'globe interaction');
  await page.addInitScript(() => {
    // All four European stops cleared -> Kenya (Amboseli) must unlock.
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ['glasgow', 'modena', 'paris', 'ireland'],
      levelRecords: {}, bestAdventureScore: 0, totalAdventures: 0,
    }));
  });
  await boot(page);

  const amboseliPin = page.locator('.pin[aria-label*="Amboseli"]');
  await expect(amboseliPin).toBeEnabled();
  await expect(amboseliPin).not.toHaveClass(/\blocked\b/);
  // A still-locked stop further along stays locked.
  await expect(page.locator('.pin[aria-label*="Beijing"]')).toBeDisabled();
});

test('reset clears the canonical progression store', async ({ page }) => {
  await page.addInitScript(() => {
    window.__confirmFn = () => true;
    window.__reloadFn = () => {};
  });
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ['glasgow', 'modena'],
      levelRecords: { glasgow: { bestScore: 8000, completions: 4, stars: { completion: true, collection: true, performance: true } } },
      bestAdventureScore: 25000, totalAdventures: 3,
    }));
    localStorage.setItem('bbl_lb_names_v1', JSON.stringify({ adventure: 'ZED' }));
  });

  await page.locator('#btnReset').click();
  expect(await page.evaluate(() => Object.keys(localStorage))).toHaveLength(0);

  // After a reload the in-memory profile is back to canonical defaults.
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });
  expect(await canon(page)).toEqual({
    version: 2, visitedLocations: [], levelRecords: {},
    bestAdventureScore: 0, totalAdventures: 0,
  });
});
