// @ts-check
// The globe must communicate three location states — AVAILABLE, VISITED,
// LOCKED — and show a small info card (name / best score / status / action)
// when a location is selected. Progression data is the source of truth;
// there is no per-destination UI. Desktop-only: the behaviour is DOM/state,
// not layout — mobile globe layout is covered by layout.spec.js.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const PROG_KEY = 'bbl_progression_v1';
const CAMP_KEY = 'gh_progress_v2';

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'run once on desktop');
});

async function boot(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });
}

/** Seed locations as cleared (unlocks pins) + visited (enables replay).
 *  records: { id: bestScore } or { id: { best, stars } } */
async function seed(page, records) {
  await page.evaluate(({ ck, pk, records }) => {
    const camp = {};
    const visited = [];
    const levelRecords = {};
    Object.keys(records).forEach(id => {
      const r = typeof records[id] === 'object' ? records[id] : { best: records[id] };
      camp[id] = { best: r.best || 0, cleared: true };
      visited.push(id);
      if (r.stars) levelRecords[id] = { bestScore: r.best || 0, completions: 1, stars: r.stars };
    });
    localStorage.setItem(ck, JSON.stringify(camp));
    localStorage.setItem(pk, JSON.stringify({
      version: 1, visitedLocations: visited, levelRecords,
      bestAdventureScore: 0, totalAdventures: 0,
    }));
  }, { ck: CAMP_KEY, pk: PROG_KEY, records });
}

const pin = (name) => `.pin[aria-label*="${name}"]`;
const chip = (page, name) => page.locator('#roster .chip', { hasText: name });
const card = '.globe-locinfo';

test('clean profile keeps the first-time campaign experience intact', async ({ page }) => {
  await boot(page);

  // Nothing is marked visited on the globe or in the roster.
  expect(await page.locator('.pin.cleared').count()).toBe(0);
  expect(await page.locator('#roster .chip.cleared').count()).toBe(0);
  await expect(page.locator(card)).toHaveCount(0); // card only exists once opened

  // The roster still launches the campaign in one tap (unchanged).
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);
});

test('AVAILABLE: pin shows a "Play" card and launches the campaign', async ({ page }) => {
  await boot(page);

  const glasgowPin = page.locator(pin('Glasgow'));
  await expect(glasgowPin).toBeEnabled();
  await expect(glasgowPin).not.toHaveClass(/\bcleared\b/);
  await expect(glasgowPin).not.toHaveClass(/\blocked\b/);

  await glasgowPin.dispatchEvent('click');
  await expect(page.locator(card)).toBeVisible();
  await expect(page.locator(card)).toHaveClass(/is-available/);
  await expect(page.locator('.globe-locinfo-name')).toHaveText('Glasgow');
  await expect(page.locator('.globe-locinfo-state')).toContainText('Available');
  const go = page.locator('.globe-locinfo-go');
  await expect(go).toBeVisible();
  await expect(go).toContainText('Play');

  await go.click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);
});

test('VISITED: pin + chip go gold and the card shows score, status, stars and Replay', async ({ page }) => {
  await boot(page);
  await seed(page, { glasgow: { best: 4200, stars: { completion: true, collection: false, performance: true } } });
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });

  // Visual state: gold on both the globe pin and the roster chip.
  await expect(page.locator(pin('Glasgow'))).toHaveClass(/\bcleared\b/);
  await expect(chip(page, 'Glasgow')).toHaveClass(/\bcleared\b/);
  expect(await chip(page, 'Glasgow').getAttribute('title')).toContain('2/3');

  await page.locator(pin('Glasgow')).dispatchEvent('click');
  await expect(page.locator(card)).toBeVisible();
  await expect(page.locator(card)).toHaveClass(/is-visited/);
  await expect(page.locator('.globe-locinfo-name')).toHaveText('Glasgow');
  await expect(page.locator('.globe-locinfo-state')).toContainText('Cleared');
  await expect(page.locator('.globe-locinfo-score')).toContainText('4200');
  // Mastery stars are rendered on the card: 2 of 3 earned.
  const starsLine = page.locator('.globe-locinfo-stars');
  await expect(starsLine).toBeVisible();
  await expect(starsLine).toContainText('2/3');
  await expect(starsLine).toContainText('★★☆');
  const go = page.locator('.globe-locinfo-go');
  await expect(go).toContainText('Replay');

  await go.click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
});

test('LOCKED: pin is disabled and the chip explains the locked state with no action', async ({ page }) => {
  await boot(page);

  await expect(page.locator(pin('Tokyo'))).toBeDisabled();
  await expect(page.locator(pin('Tokyo'))).toHaveClass(/\blocked\b/);
  await expect(chip(page, 'Tokyo')).not.toHaveClass(/\bactive\b/);

  await chip(page, 'Tokyo').click();
  await expect(page.locator(card)).toBeVisible();
  await expect(page.locator(card)).toHaveClass(/is-locked/);
  await expect(page.locator('.globe-locinfo-name')).toHaveText('Tokyo');
  await expect(page.locator('.globe-locinfo-state')).toContainText('Locked');
  await expect(page.locator('.globe-locinfo-go')).toBeHidden();

  // Still on the map — nothing was started.
  await expect(page.locator('#scene-globe')).toBeVisible();
  expect(await page.evaluate(() => document.getElementById('scene-game').hidden)).toBe(true);
});

test('the info card is data-driven: same code, different state per location; ✕ closes it', async ({ page }) => {
  await boot(page);
  await seed(page, { glasgow: 1500 });
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.replayMode, null, { timeout: 5000 });

  // Visited location.
  await page.locator(pin('Glasgow')).dispatchEvent('click');
  await expect(page.locator(card)).toHaveClass(/is-visited/);
  await expect(page.locator('.globe-locinfo-name')).toHaveText('Glasgow');

  // Selecting a different, still-available location swaps the same card.
  await page.locator(pin('Paris')).dispatchEvent('click');
  await expect(page.locator(card)).toHaveClass(/is-available/);
  await expect(page.locator('.globe-locinfo-name')).toHaveText('Paris');
  expect(await page.locator(card).count()).toBe(1); // one reusable node, not one per pin

  // Close button hides it.
  await page.locator('.globe-locinfo-x').click();
  await expect(page.locator(card)).toBeHidden();
});
