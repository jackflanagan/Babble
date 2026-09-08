// @ts-check
// Guards against the class of bug where an extracted module references an
// undeclared global (e.g. `ctx`), which esbuild silently treats as a global:
// the build passes but draw() throws at runtime and the level renders blank.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

// Console errors expected when running off the CrazyGames platform.
const IGNORED_ERROR_RE = /CrazySDK is not initialized|crazygames|Failed to load resource/i;

const LOCATION_IDS = ['glasgow', 'modena', 'paris', 'ireland', 'athens', 'kenya', 'tokyo', 'brazil', 'newyork', 'boss'];
const LABELS = ['Glasgow', 'Modena', 'Paris', 'Ireland', 'Athens', 'Kenya', 'Tokyo', 'Brazil', 'New York', 'China'];

async function dismissPortraitWarning(page) {
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });
}

/** Sample the canvas and report how much distinct content is drawn. */
async function canvasContent(page) {
  return page.evaluate(() => {
    const c = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBlank = 0;
    const colors = new Set();
    const step = 4 * 137;
    let samples = 0;
    for (let i = 0; i < d.length; i += step) {
      samples++;
      colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ',' + d[i + 3]);
      if (d[i + 3] !== 0) nonBlank++;
    }
    return { distinctColors: colors.size, nonBlankFrac: nonBlank / samples };
  });
}

test('every location draws a non-blank level with no page errors', async ({ page }) => {
  test.setTimeout(150000);

  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !IGNORED_ERROR_RE.test(m.text())) errors.push('console.error: ' + m.text());
  });

  // Unlock every location so all 10 can be entered from the roster.
  await page.addInitScript((ids) => {
    const all = {};
    ids.forEach(id => { all[id] = { best: 0, cleared: true }; });
    localStorage.setItem('gh_progress_v2', JSON.stringify(all));
  }, LOCATION_IDS);

  for (let i = 0; i < LABELS.length; i++) {
    await page.goto(FILE_URL);
    await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
    await dismissPortraitWarning(page);

    const chips = page.locator('#roster .chip.active');
    await expect(chips).toHaveCount(LABELS.length);

    const chip = chips.nth(i);
    expect((await chip.textContent() || '').trim()).toBe(LABELS[i]);
    await chip.click();
    await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
    await page.locator('#btnStart').click();
    await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(1800); // let a few frames + the countdown draw

    const content = await canvasContent(page);
    expect(content.nonBlankFrac, `${LABELS[i]}: canvas is mostly blank`).toBeGreaterThan(0.6);
    // A real level (sky + platforms + creatures + HUD) has many colours; a level
    // that only painted the sky before draw() threw has far fewer.
    expect(content.distinctColors, `${LABELS[i]}: too few distinct colours (${content.distinctColors})`).toBeGreaterThan(60);
  }

  expect(errors, 'runtime errors during rendering:\n' + errors.join('\n')).toEqual([]);
});
