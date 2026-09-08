// @ts-check
// Exercises the game loop past "level started" using the window.__game debug hook.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function dismissPortraitWarning(page) {
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
}

/** Load, then enter the nth unlocked location (0 = Glasgow). */
async function enterLocation(page, index = 0) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await dismissPortraitWarning(page);
  await page.locator('#roster .chip.active').nth(index).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });
}

test('debug hook is exposed once the game boots', async ({ page }) => {
  await enterLocation(page);
  const shape = await page.evaluate(() => Object.keys(window.__game).sort());
  expect(shape).toContain('getState');
  expect(shape).toContain('forceWave2');
  expect(shape).toContain('forceAllCollectiblesTaken');
});

test('a freshly started level has collectibles, enemies and lives', async ({ page }) => {
  await enterLocation(page);
  await page.waitForFunction(() => window.__game.getState().enemyCount > 0, null, { timeout: 6000 });
  const s = await page.evaluate(() => window.__game.getState());
  expect(s.currentLocationId).toBe('glasgow');
  expect(s.gameState).toBe('playing');
  expect(s.collectiblesTotal).toBeGreaterThan(0);
  expect(s.lives).toBeGreaterThan(0);
});

test('lose overlay stays hidden while the player is alive', async ({ page }) => {
  await enterLocation(page);
  await page.waitForTimeout(1000);
  await expect(page.locator('#overlayLose')).toBeHidden();
});

test('clearing collectibles then both waves reaches the won state', async ({ page }) => {
  test.setTimeout(40000);
  await enterLocation(page);
  expect(await page.evaluate(() => window.__game.getState().gameState)).toBe('playing');

  // The update loop is inert during the ~3s start countdown.
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.__game.forceAllCollectiblesTaken());

  // forceWave2() zeroes the current wave; the loop advances wave 1 -> 2, then a
  // later pass with no enemies triggers winLevel() -> gameState 'won'.
  let won = false;
  for (let i = 0; i < 40 && !won; i++) {
    await page.evaluate(() => window.__game.forceWave2());
    await page.waitForTimeout(400);
    won = await page.evaluate(() => window.__game.getState().gameState === 'won');
  }
  expect(won, 'level never reached the won state').toBe(true);
});
