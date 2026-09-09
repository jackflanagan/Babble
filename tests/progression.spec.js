// @ts-check
// Step 1 of the replayability system: a persistent, cross-adventure player
// profile in localStorage (key `bbl_progression_v1`). These tests cover the
// persistence layer only — the campaign itself is unchanged.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const KEY = 'bbl_progression_v1';

async function bootGlobe(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });
}

/** Start the fixed adventure (any pin) and wait for the first level. */
async function startAdventure(page) {
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  await page.waitForTimeout(3300); // let the start countdown elapse
}

test('clean profile: defaults in memory, nothing written to localStorage', async ({ page }) => {
  await bootGlobe(page);
  const prog = await page.evaluate(() => window.__game.getProgression());
  expect(prog).toEqual({
    version: 1,
    visitedLocations: [],
    levelRecords: {},
    bestAdventureScore: 0,
    totalAdventures: 0,
  });
  // Loading alone must not persist — the key stays absent until a real event.
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
});

test('loading progression: a stored profile is read back and sanitised', async ({ page }) => {
  await bootGlobe(page);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
    version: 1,
    visitedLocations: ['glasgow', 'modena', 'glasgow'], // dupe should collapse
    levelRecords: { glasgow: { bestScore: 1200, completions: 2, stars: { completion: true, collection: false, performance: true } } },
    bestAdventureScore: 5000,
    totalAdventures: 3,
    strayField: 'ignored',
  })), KEY);
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });

  const prog = await page.evaluate(() => window.__game.getProgression());
  expect(prog.visitedLocations).toEqual(['glasgow', 'modena']);
  expect(prog.levelRecords.glasgow).toEqual({
    bestScore: 1200, completions: 2,
    stars: { completion: true, collection: false, performance: true },
  });
  expect(prog.bestAdventureScore).toBe(5000);
  expect(prog.totalAdventures).toBe(3);
  expect(prog).not.toHaveProperty('strayField');
});

test('corrupted / malformed localStorage falls back to defaults without errors', async ({ page }) => {
  const badValues = [
    '{ not json',
    'null',
    '[]',
    '"a string"',
    '42',
    JSON.stringify({ visitedLocations: 'nope', totalAdventures: -5, bestAdventureScore: NaN, levelRecords: [] }),
  ];

  await bootGlobe(page);
  for (const bad of badValues) {
    const errors = [];
    const onError = (e) => errors.push(String(e.message || e));
    page.on('pageerror', onError);

    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, bad]);
    await page.reload();
    await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });

    const prog = await page.evaluate(() => window.__game.getProgression());
    expect(prog.version, `bad value: ${bad}`).toBe(1);
    expect(prog.visitedLocations, `bad value: ${bad}`).toEqual([]);
    expect(prog.levelRecords, `bad value: ${bad}`).toEqual({});
    expect(prog.bestAdventureScore, `bad value: ${bad}`).toBe(0);
    expect(prog.totalAdventures, `bad value: ${bad}`).toBe(0);
    expect(errors, `bad value ${bad} raised: ${errors.join('\n')}`).toEqual([]);

    page.off('pageerror', onError);
  }
});

test('completing a location records it as visited and persists (save + load roundtrip)', async ({ page }) => {
  test.setTimeout(45000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await bootGlobe(page);
  await startAdventure(page);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');

  // Force-clear Glasgow: both waves, all collectibles. Once the run advances
  // past it (Modena is next), winLevel() has run for Glasgow.
  for (let i = 0; i < 60; i++) {
    const advanced = await page.evaluate(() =>
      window.__game.campaignStep() > 0 || window.__game.getState().currentLocationId !== 'glasgow');
    if (advanced) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).not.toBe('glasgow');

  // In memory + on disk.
  const prog = await page.evaluate(() => window.__game.getProgression());
  expect(prog.visitedLocations).toContain('glasgow');
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  expect(stored.version).toBe(1);
  expect(stored.visitedLocations).toContain('glasgow');
  expect(stored.totalAdventures).toBe(0); // adventure not finished yet

  // Survives a reload.
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getProgression, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.getProgression().visitedLocations)).toContain('glasgow');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('completing the whole adventure bumps totalAdventures and records best score', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'long end-to-end run — desktop only');
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/CrazySDK is not initialized/.test(m.text())) errors.push('console.error: ' + m.text());
  });

  await bootGlobe(page);
  expect(await page.evaluate(() => window.__game.getProgression().totalAdventures)).toBe(0);
  await startAdventure(page);

  let finished = false;
  for (let i = 0; i < 400 && !finished; i++) {
    const s = await page.evaluate(() => ({
      winShown: !document.getElementById('overlayWin').hidden,
      title: document.getElementById('winTitle').textContent,
    }));
    if (s.winShown && s.title === 'Adventure complete!') { finished = true; break; }
    await page.evaluate(() => {
      const g = window.__game;
      if (g.miniGameId()) g.forceMiniGameWin();
      else if (g.getState().gameState === 'playing') { g.forceAllCollectiblesTaken(); g.forceWave2(); }
    });
    await page.waitForTimeout(500);
  }
  expect(finished, 'never reached the completion screen').toBe(true);

  const prog = await page.evaluate(() => window.__game.getProgression());
  expect(prog.totalAdventures).toBe(1);
  expect(prog.bestAdventureScore).toBeGreaterThan(0);
  expect(prog.visitedLocations).toContain('glasgow');
  expect(prog.visitedLocations).toContain('boss');

  // Persisted, and a losing run would not double-count (only completion does).
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  expect(stored.totalAdventures).toBe(1);
  expect(stored.bestAdventureScore).toBe(prog.bestAdventureScore);

  expect(errors, errors.join('\n')).toEqual([]);
});
