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

test('P1 jump / bubble keys do not throw', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await enterLocation(page);
  await page.waitForTimeout(3300); // clear the countdown
  const canvas = page.locator('#gameCanvas');
  await canvas.focus().catch(() => {});
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('KeyW');
    await page.keyboard.press('Space');
    await page.keyboard.press('ShiftLeft');
    await page.keyboard.press('KeyD');
    await page.waitForTimeout(120);
  }
  expect(errors, errors.join('\n')).toEqual([]);
  expect(await page.evaluate(() => window.__game.getState().gameState)).toBe('playing');
});

test('Trap Blast power: banked on a mini-game clear, bubbles every free enemy', async ({ page }) => {
  test.setTimeout(70000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await enterLocation(page); // Glasgow, step 0

  // Force-clear the first three levels (glasgow -> modena -> paris) so the run
  // reaches the first mini-game (Mediterranean, step 3 in the new order).
  await page.waitForTimeout(3300);
  for (let i = 0; i < 160; i++) {
    if (await page.evaluate(() => window.__game.miniGameId())) break;
    await page.evaluate(() => { window.__game.forceAllCollectiblesTaken(); window.__game.forceWave2(); });
    await page.waitForTimeout(300);
  }
  expect(await page.evaluate(() => window.__game.miniGameId())).toBe('mediterranean');

  // Win the mini-game -> a power charge is banked, HUD button appears.
  await page.evaluate(() => window.__game.forceMiniGameWin());
  await page.waitForFunction(() => !window.__game.miniGameId() && window.__game.getState().gameState === 'playing', null, { timeout: 8000 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__game.powerCharges())).toBe(1);
  await expect(page.locator('#btnPower')).toBeVisible();

  // Use it: every free enemy should be trapped, charge spent, button gone.
  const freeBefore = await page.evaluate(() => window.__game.getEnemyTypes().length);
  expect(freeBefore).toBeGreaterThan(0);
  await page.locator('#btnPower').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__game.powerCharges())).toBe(0);
  expect(await page.evaluate(() => window.__game.freeEnemyCount())).toBe(0);
  await expect(page.locator('#btnPower')).toBeHidden();
  expect(errors, errors.join('\n')).toEqual([]);
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
