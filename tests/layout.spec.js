// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

/** Dismiss the portrait-rotation warning overlay if present (touch devices in portrait). */
async function dismissPortraitWarning(page) {
  await page.evaluate(() => {
    var el = document.getElementById('portraitWarning');
    if (el) el.style.display = 'none';
  });
}

test.beforeEach(async ({ page }) => {
  page.on('console', () => {});
  await page.goto(FILE_URL);
  // Wait for the globe/map screen to be visible
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  // If a portrait-rotation overlay is blocking interaction, hide it so tests can proceed
  await dismissPortraitWarning(page);
});

// ─── Portrait warning ─────────────────────────────────────────────────────────

test('portrait warning is shown on touch devices in portrait orientation', async ({ page }, testInfo) => {
  const vp = page.viewportSize();
  const isTouchPortrait = vp.height > vp.width;
  if (!isTouchPortrait) {
    test.skip();
    return;
  }

  // Reload without dismissing the warning
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });

  const warning = page.locator('#portraitWarning');
  const display = await warning.evaluate(el => getComputedStyle(el).display);
  expect(display).toBe('flex');

  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}-portrait-warning.png` });
});

// ─── Map screen ──────────────────────────────────────────────────────────────

test('map screen is visible on load', async ({ page }, testInfo) => {
  const scene = page.locator('#scene-globe');
  await expect(scene).toBeVisible();

  // Globe container should be present
  const globe = page.locator('.globe-wrap');
  await expect(globe).toBeVisible();

  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}-map.png`, fullPage: false });
});

test('map title and tagline are visible', async ({ page }) => {
  const vp = page.viewportSize();
  // In landscape mobile the brand is hidden to save space — skip this check there
  if (vp.width > vp.height && vp.height <= 520) {
    test.skip();
    return;
  }
  const tagline = page.locator('.tag, .tagline').first();
  await expect(tagline).toBeVisible();
});

test('location roster chips are visible', async ({ page }) => {
  // Roster of location chips
  const roster = page.locator('#roster');
  await expect(roster).toBeVisible();
  // At least one chip
  const chips = page.locator('.chip.active');
  const count = await chips.count();
  expect(count).toBeGreaterThan(0);
});

// ─── How-to / Start button ───────────────────────────────────────────────────

test('clicking Scotland chip shows how-to screen with visible Start button', async ({ page }, testInfo) => {
  // Click the first active (unlocked) chip — Glasgow is always unlocked
  const firstChip = page.locator('.chip.active').first();
  await expect(firstChip).toBeVisible({ timeout: 5000 });
  await firstChip.click();

  // How-to card should appear
  const howto = page.locator('.howto');
  await expect(howto).toBeVisible({ timeout: 3000 });

  // Start button must be visible
  const startBtn = page.locator('#btnStart');
  await expect(startBtn).toBeVisible();
  await expect(startBtn).not.toBeHidden();

  // Start button must be within viewport bounds (not clipped by safe-area / overflow)
  const btnBox = await startBtn.boundingBox();
  const vpSize = page.viewportSize();
  expect(btnBox).not.toBeNull();
  expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(vpSize.height + 5); // 5px tolerance

  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}-howto.png`, fullPage: false });
});

// ─── Game canvas layout ───────────────────────────────────────────────────────

test('canvas fills the viewport correctly after starting a level', async ({ page }, testInfo) => {
  const firstChip = page.locator('.chip.active').first();
  await firstChip.click();
  await page.locator('#btnStart').click();

  // Wait for game scene to appear
  await expect(page.locator('#scene-game')).toBeVisible({ timeout: 5000 });

  const canvas = page.locator('#gameCanvas');
  await expect(canvas).toBeVisible({ timeout: 5000 });

  const canvasBox = await canvas.boundingBox();
  const vpSize = page.viewportSize();

  expect(canvasBox).not.toBeNull();

  // Canvas must not overflow the viewport
  expect(canvasBox.x).toBeGreaterThanOrEqual(-2);
  expect(canvasBox.y).toBeGreaterThanOrEqual(-2);
  expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(vpSize.width + 2);
  expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(vpSize.height + 2);

  // Canvas must take up meaningful space — at least 50% of shorter viewport dimension
  const minDim = Math.min(vpSize.width, vpSize.height);
  const canvasShortSide = Math.min(canvasBox.width, canvasBox.height);
  expect(canvasShortSide).toBeGreaterThan(minDim * 0.5);

  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}-game.png`, fullPage: false });
});

test('HUD is visible during gameplay', async ({ page }) => {
  const firstChip = page.locator('.chip.active').first();
  await firstChip.click();
  await page.locator('#btnStart').click();

  await expect(page.locator('#scene-game')).toBeVisible({ timeout: 5000 });

  const hud = page.locator('.hud');
  await expect(hud).toBeVisible();
});

test('canvas height fills viewport in landscape on small screen', async ({ page }, testInfo) => {
  const vp = page.viewportSize();
  // Only relevant for landscape mobile (narrow height)
  if (vp.width < vp.height || vp.height > 520) {
    test.skip();
    return;
  }

  const firstChip = page.locator('.chip.active').first();
  await firstChip.click();
  await page.locator('#btnStart').click();
  await expect(page.locator('#scene-game')).toBeVisible({ timeout: 5000 });

  const canvasBox = await page.locator('#gameCanvas').boundingBox();
  // Canvas height should fill nearly all of the viewport height
  expect(canvasBox.height).toBeGreaterThan(vp.height * 0.85);

  await page.screenshot({ path: `tests/screenshots/${testInfo.project.name}-landscape-game.png`, fullPage: false });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

test('back button on how-to returns to globe screen', async ({ page }) => {
  const firstChip = page.locator('.chip.active').first();
  await firstChip.click();

  const howto = page.locator('.howto');
  await expect(howto).toBeVisible({ timeout: 3000 });

  // Click the "← Back to map" button inside the howto card
  const backBtn = page.locator('#btnHowtoBack');
  await expect(backBtn).toBeVisible({ timeout: 3000 });
  await backBtn.click();

  await expect(page.locator('#scene-globe')).toBeVisible({ timeout: 3000 });
});
