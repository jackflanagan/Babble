// @ts-check
// Guards the new-player difficulty-curve changes:
//  - campaign order (real levels first, mini-games spaced, none in the first 3)
//  - the early-stop safety net (a wipe on stops 1-3 restarts the stop, not the run)
// Desktop-only where it drives real play.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function boot(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.waitForFunction(() => window.__game && window.__game.campaign, null, { timeout: 5000 });
}

async function startCampaign(page) {
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  await page.waitForTimeout(3300);
}

test('campaign order: real levels first, mini-games spaced, none in the first three stops', async ({ page }) => {
  await boot(page);
  const camp = await page.evaluate(() => window.__game.campaign());
  const types = camp.map(s => s.split(':')[0]);

  expect(camp).toHaveLength(15);
  expect(camp[camp.length - 1]).toBe('level:boss');

  // First three stops are real levels; first mini-game is stop 4.
  expect(types.slice(0, 3)).toEqual(['level', 'level', 'level']);
  expect(camp[3]).toBe('minigame:mediterranean');

  // No two mini-games back to back.
  for (let i = 1; i < types.length; i++) {
    expect(types[i] === 'minigame' && types[i - 1] === 'minigame').toBe(false);
  }

  // Tokyo and Brazil are not adjacent.
  const iTokyo = camp.indexOf('level:tokyo');
  const iBrazil = camp.indexOf('level:brazil');
  expect(Math.abs(iTokyo - iBrazil)).toBeGreaterThan(1);

  // All 10 levels + 5 mini-games present exactly once.
  expect(types.filter(t => t === 'level')).toHaveLength(10);
  expect(types.filter(t => t === 'minigame')).toHaveLength(5);
});

test('early safety net: a wipe on the first stop restarts it instead of ending the run', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'drives real play');
  test.setTimeout(30000);
  await boot(page);
  await startCampaign(page);
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(0);

  // Drain all three lives.
  await page.evaluate(() => { window.__game.loseLife(); window.__game.loseLife(); window.__game.loseLife(); });
  expect(await page.evaluate(() => window.__game.getState().lives)).toBeLessThanOrEqual(0);

  // The run is NOT over: after the brief restart delay we are playing Glasgow
  // again with a full bar of lives, campaignStep untouched, no results screen.
  await page.waitForFunction(() => window.__game.getState().gameState === 'playing', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');
  expect(await page.evaluate(() => window.__game.campaignStep())).toBe(0);
  expect(await page.evaluate(() => window.__game.getState().lives)).toBe(3);
  expect(await page.evaluate(() => window.__game.adventureComplete())).toBe(false);
  expect(await page.evaluate(() => document.getElementById('overlayWin').hidden)).toBe(true);
});

test('past the safety net: a wipe on stop 4+ ends the run', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'drives real play');
  test.setTimeout(90000);
  await boot(page);
  await startCampaign(page);

  // Drive through the first three levels + the Mediterranean mini-game to reach
  // Galway (stop 5 / campaignStep 4), the first level past the safety net.
  let atGalway = false;
  for (let i = 0; i < 120 && !atGalway; i++) {
    const s = await page.evaluate(() => ({
      mg: window.__game.miniGameId(),
      loc: window.__game.getState().currentLocationId,
      playing: window.__game.getState().gameState === 'playing',
      step: window.__game.campaignStep(),
    }));
    if (s.step >= 4 && !s.mg && s.playing) { atGalway = true; break; }
    await page.evaluate(() => {
      const g = window.__game;
      if (g.miniGameId()) g.forceMiniGameWin();
      else if (g.getState().gameState === 'playing') { g.forceAllCollectiblesTaken(); g.forceWave2(); }
    });
    await page.waitForTimeout(400);
  }
  expect(atGalway, 'never reached stop 4+').toBe(true);
  await page.waitForTimeout(3300); // countdown

  await page.evaluate(() => { window.__game.loseLife(); window.__game.loseLife(); window.__game.loseLife(); });

  // Run is over: the adventure results screen appears.
  await page.waitForFunction(() => !document.getElementById('overlayWin').hidden, null, { timeout: 6000 });
  expect(await page.evaluate(() => window.__game.adventureComplete())).toBe(true);
  expect((await page.locator('#winTitle').textContent() || '')).toMatch(/adventure over/i);
});
