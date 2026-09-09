// @ts-check
// The whole game is one fixed run: every level + mini-game once, in order,
// score carried the whole way, a single leaderboard screen at the end.
const { test, expect } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const EXPECTED_ORDER = [
  'glasgow', 'modena', 'paris', 'mediterranean', 'ireland', 'athens', 'krakow',
  'kenya', 'tokyo', 'berlin', 'brazil', 'london', 'newyork', 'pamplona', 'boss',
];

test.beforeEach(() => {
  // Long, single-project smoke — mini-games still run on real timers even when won early.
  test.skip(test.info().project.name !== 'desktop', 'run once on desktop');
});

test('one continuous adventure: fixed order, cumulative score, leaderboard at the end', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/CrazySDK is not initialized/.test(m.text())) errors.push('console.error: ' + m.text());
  });

  await page.goto(FILE_URL);
  await page.waitForSelector('#scene-globe', { state: 'visible', timeout: 10000 });
  await page.evaluate(() => { const el = document.getElementById('portraitWarning'); if (el) el.style.display = 'none'; });

  // Any pin starts the same run.
  await page.locator('#roster .chip.active').nth(2).click();
  await page.waitForSelector('.howto', { state: 'visible', timeout: 3000 });
  await page.locator('#btnStart').click();
  await page.waitForSelector('#scene-game', { state: 'visible', timeout: 5000 });
  await page.waitForFunction(() => window.__game && window.__game.getState, null, { timeout: 5000 });

  expect(await page.evaluate(() => window.__game.getState().currentLocationId)).toBe('glasgow');

  const order = [];
  let finished = false;
  for (let i = 0; i < 400 && !finished; i++) {
    const s = await page.evaluate(() => ({
      loc: window.__game.getState().currentLocationId,
      mg: window.__game.miniGameId(),
      playing: window.__game.getState().gameState === 'playing',
      winShown: !document.getElementById('overlayWin').hidden,
      title: document.getElementById('winTitle').textContent,
      score: window.__game.getState().score,
    }));
    const stop = s.mg || s.loc;
    if (order[order.length - 1] !== stop) order.push(stop);
    if (s.winShown) {
      finished = true;
      expect(s.title).toBe('Adventure complete!');
      expect(s.score).toBeGreaterThan(0);
      break;
    }
    await page.evaluate(() => {
      const g = window.__game;
      if (g.miniGameId()) g.forceMiniGameWin();
      else if (g.getState().gameState === 'playing') { g.forceAllCollectiblesTaken(); g.forceWave2(); }
    });
    await page.waitForTimeout(500);
  }

  expect(errors, errors.join('\n')).toEqual([]);
  expect(finished, 'never reached the finish screen').toBe(true);

  // Reduce the poll trace to the order stops were first entered, and check it
  // matches the fixed campaign exactly (transition frames can briefly repeat a
  // stop, so collapse consecutive dupes and keep only first occurrences).
  const collapsed = order.filter((v, i) => v !== order[i - 1]).filter(v => EXPECTED_ORDER.includes(v));
  const firstSeen = [];
  for (const v of collapsed) if (!firstSeen.includes(v)) firstSeen.push(v);
  expect(firstSeen).toEqual(EXPECTED_ORDER);
});
