// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function dismissPortraitWarning(page) {
  await page.evaluate(() => { var el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
}

test('Reset button clears localStorage', async ({ page }) => {
  // Inject stubs before page scripts run: bypass headless confirm suppression
  // and prevent the reload from navigating away mid-test
  await page.addInitScript(() => {
    window.__confirmFn = function() { return true; };
    window.__reloadFn = function() {};
  });

  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await dismissPortraitWarning(page);

  // Seed some progress keys (canonical + legacy + unrelated)
  await page.evaluate(() => {
    localStorage.setItem('bbl_progression_v1', JSON.stringify({
      version: 2, visitedLocations: ['glasgow'],
      levelRecords: { glasgow: { bestScore: 9999, completions: 3, stars: { completion: true, collection: true, performance: true } } },
      bestAdventureScore: 12000, totalAdventures: 2,
    }));
    localStorage.setItem('gh_progress_v2', JSON.stringify({ glasgow: { best: 9999, cleared: true } }));
    localStorage.setItem('gh_streak', '5');
    localStorage.setItem('bbl_panda_special', '1');
  });

  await page.locator('#btnReset').click();

  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toHaveLength(0);
});

test('Game loads cleanly with empty localStorage', async ({ page }) => {
  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });

  // Simulate what happens after a reset: clear storage and reload
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });

  await expect(page.locator('#scene-globe')).toBeVisible();
});
