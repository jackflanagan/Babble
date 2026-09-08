// @ts-check
// WebRTC can't pair over file://, but this still guards the net.js module
// wiring: opening "Two phones" and starting host/join must not throw. A
// regression like the earlier undeclared `keys` / `updateHud` refs would
// surface here as a pageerror.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

// Expected noise when offline / off-platform: the trystero import can't load
// from a file:// origin, and net.js logs that in its catch block.
const IGNORED_ERROR_RE =
  /CrazySDK is not initialized|crazygames|Failed to load resource|esm\.run|trystero|dynamically imported module|netHostStart failed|netJoinStart failed/i;

async function openNetPanel(page) {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
  await page.locator('#roster .chip.active').first().click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('.mode-btn[data-players="net"]').click();
  await expect(page.locator('#netPanel')).toBeVisible();
}

function collectErrors(page, sink) {
  page.on('pageerror', e => sink.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !IGNORED_ERROR_RE.test(m.text())) sink.push('console.error: ' + m.text());
  });
}

test('hosting a room does not throw', async ({ page }) => {
  const errors = [];
  collectErrors(page, errors);
  await openNetPanel(page);

  await page.locator('#btnNetHost').click();
  await page.waitForTimeout(2000); // let the async import reject and hit the catch

  // The catch path surfaces a status message instead of crashing.
  await expect(page.locator('#netStatus')).not.toBeEmpty();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('joining with a code does not throw', async ({ page }) => {
  const errors = [];
  collectErrors(page, errors);
  await openNetPanel(page);

  await page.locator('#netTabJoin').click();
  await page.locator('#netCodeInput').fill('ABCDE');
  await page.locator('#btnNetJoin').click();
  await page.waitForTimeout(2000);

  await expect(page.locator('#netStatus')).not.toBeEmpty();
  expect(errors, errors.join('\n')).toEqual([]);
});
