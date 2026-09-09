// @ts-check
// Replayable locations (step 2 of the replayability system).
// The fixed campaign is unchanged; these tests exercise the ADDITIONAL
// world-map replay path only. Desktop-only: the behaviour under test is
// game-state, not layout — mobile control coverage stays in layout/gameplay specs.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const PROG_KEY = 'bbl_progression_v1';   // the single canonical store

test.beforeEach(() => {
  test.skip(test.info().project.name !== 'desktop', 'run once on desktop');
});

async function boot(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });
}

/** Seed canonical progression: locations visited (unlocks pins + enables replay). */
async function seed(page, ids) {
  await page.evaluate(({ pk, ids }) => {
    const levelRecords = {};
    ids.forEach(id => {
      levelRecords[id] = { bestScore: 1000, completions: 1,
        stars: { completion: true, collection: false, performance: false } };
    });
    localStorage.setItem(pk, JSON.stringify({
      version: 2, visitedLocations: ids.slice(), levelRecords,
      bestAdventureScore: 0, totalAdventures: 0,
    }));
  }, { pk: PROG_KEY, ids });
}

async function startCampaignFromGlobe(page) {
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  await page.waitForTimeout(3300); // start countdown
}

/** Force the current live replay level to completion; resolves once the
 *  compact replay result card shows. */
async function forceClearLevel(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => !document.getElementById('overlayReplayResult').hidden)) return true;
    await page.evaluate(() => {
      const g = window.__game;
      if (g.getState().gameState === 'playing') { g.forceAllCollectiblesTaken(); g.forceWave2(); }
    });
    await page.waitForTimeout(300);
  }
  return false;
}

test('completing a campaign level marks it visited and replayable from the map', async ({ page }) => {
  test.setTimeout(60000);
  await boot(page);
  expect(await page.evaluate(() => window.__game.getProgression().visitedLocations)).toEqual([]);

  await startCampaignFromGlobe(page);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');

  // Clear Glasgow within the campaign.
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.__game.miniGameId() || window.__game.campaignStep() > 0)) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }

  expect(await page.evaluate(() => window.__game.getProgression().visitedLocations)).toContain('glasgow');

  // Back on the map, the Glasgow chip now offers a replay.
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  const title = await page.locator('#roster .chip', { hasText: 'Glasgow' }).getAttribute('title');
  expect(title).toContain('Replay Glasgow'); // may carry a mastery-star suffix
});

test('selecting a visited location starts that level directly in replay mode', async ({ page }) => {
  await boot(page);
  await seed(page, ['glasgow', 'modena']);
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });

  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(0);

  await page.locator('#roster .chip', { hasText: 'Modena' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  expect((await page.locator('#howtoTitle').textContent() || '')).toContain('Replay');

  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });

  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('modena');
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.adventureComplete())).toBe(false);
  expect((await page.locator('#hudLocation').textContent() || '')).toContain('REPLAY');
});

test('replay does not modify campaignStep or campaign progression', async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await boot(page);
  await startCampaignFromGlobe(page);

  // Drive the campaign forward to the Paris level (glasgow -> modena -> paris,
  // all real levels in the new order) so campaignStep is genuinely non-zero.
  let atParis = false;
  for (let i = 0; i < 90 && !atParis; i++) {
    const s = await page.evaluate(() => ({
      mg: window.__game.miniGameId(),
      loc: window.__game.getState().currentLocationId,
      playing: window.__game.getState().gameState === 'playing',
    }));
    if (s.loc === 'paris' && !s.mg && s.playing) { atParis = true; break; }
    await page.evaluate(() => {
      const g = window.__game;
      if (g.miniGameId()) g.forceMiniGameWin();
      else if (g.getState().gameState === 'playing') { g.forceAllCollectiblesTaken(); g.forceWave2(); }
    });
    await page.waitForTimeout(400);
  }
  expect(atParis, 'campaign never reached the Paris level').toBe(true);
  const stepBefore = await page.evaluate(() => window.__game.campaignStep());
  expect(stepBefore).toBeGreaterThanOrEqual(2);

  // Leave to the map mid-campaign, then replay Glasgow.
  await page.locator('#btnBack').click();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 5000 });
  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  await page.waitForTimeout(3300);

  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(stepBefore);

  // Completing the replay must not advance the campaign either.
  expect(await forceClearLevel(page)).toBe(true);
  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(stepBefore);
  expect(await page.evaluate(() => window.__game.adventureComplete())).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('replay completion returns to the results/map state, not the next campaign level', async ({ page }) => {
  test.setTimeout(60000);
  await boot(page);
  await seed(page, ['glasgow']);
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });

  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  await page.waitForTimeout(3300);

  expect(await forceClearLevel(page)).toBe(true);

  // The compact replay result card is shown (not the campaign #overlayWin),
  // it offers Replay / World map, and there is no auto-advance.
  expect(await page.evaluate(() => document.getElementById('overlayReplayResult').hidden)).toBe(false);
  expect(await page.evaluate(() => document.getElementById('overlayWin').hidden)).toBe(true);
  await expect(page.locator('#rrReplay')).toBeVisible();
  await expect(page.locator('#rrMap')).toBeVisible();
  expect(await page.evaluate(() => window.__game.getState().gameState)).toBe('won');
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(true);
  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(0);

  // "World map" returns to the globe and clears replay mode.
  await page.locator('#rrMap').click();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 5000 });
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);
});

/** Enter a Glasgow replay from a freshly seeded map and clear it. */
async function seededGlasgowReplay(page, extraProgMutator) {
  await boot(page);
  await seed(page, ['glasgow']);
  if (extraProgMutator) await page.evaluate(extraProgMutator, PROG_KEY);
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => window.__game && window.__game.getState && window.__game.replayMode, null, { timeout: 5000 });
  await page.locator('#roster .chip', { hasText: 'Glasgow' }).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  await page.waitForTimeout(3300);
  expect(await forceClearLevel(page)).toBe(true);
}

test('replay records the level score in levelRecords when there is no better record', async ({ page }) => {
  test.setTimeout(60000);
  await seededGlasgowReplay(page);
  const rec = await page.evaluate(() => window.__game.getProgression().levelRecords.glasgow);
  expect(rec.completions).toBe(2);          // 1 seeded clear + this replay
  expect(rec.bestScore).toBeGreaterThan(0);
});

test('replay does NOT replace a stored level record that is already better', async ({ page }) => {
  test.setTimeout(60000);
  await seededGlasgowReplay(page, (k) => {
    const p = JSON.parse(localStorage.getItem(k));
    p.levelRecords = { glasgow: { bestScore: 999999, completions: 3 } };
    localStorage.setItem(k, JSON.stringify(p));
  });
  const rec = await page.evaluate(() => window.__game.getProgression().levelRecords.glasgow);
  expect(rec.bestScore).toBe(999999);   // unchanged — the replay score is lower
  expect(rec.completions).toBe(4);      // still incremented
});

test('locked / unvisited locations cannot be started', async ({ page }) => {
  await boot(page); // clean profile

  // Tokyo starts locked.
  const tokyoChip = page.locator('#roster .chip', { hasText: 'Tokyo' });
  await expect(tokyoChip).toHaveCount(1);
  await expect(tokyoChip).not.toHaveClass(/(^|\s)active(\s|$)/);
  const tokyoPin = page.locator('.pin[aria-label*="Tokyo"]');
  await expect(tokyoPin).toBeDisabled();

  await tokyoChip.click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await expect(page.locator('#scene-globe')).toBeVisible();
  expect(await page.evaluate(() => document.getElementById('scene-game').hidden)).toBe(true);

  // An unlocked but not-yet-visited location still starts the CAMPAIGN, not a replay.
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.replayMode())).toBe(false);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
});
