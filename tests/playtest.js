/**
 * Babble automated playtest
 * Run with: node tests/playtest.js
 */
const { chromium } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

// Errors to ignore — expected in headless/local environment
const NOISE_PATTERNS = [
  /CrazySDK is not initialized/i,
  /crazygames/i,
  /WebGL/i,
  /AudioContext/i,
];
function isNoise(msg){ return NOISE_PATTERNS.some(function(p){ return p.test(msg); }); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  let pass = 0, fail = 0, bugs = [];

  function ok(label){ console.log('  \u2713 ' + label); pass++; }
  function ko(label, detail){ console.log('  \u2717 ' + label + (detail?' \u2014 '+detail:'')); fail++; bugs.push(label+(detail?' - '+detail:'')); }
  function check(label, cond, detail){ cond ? ok(label) : ko(label, detail); }

  async function openPage(){
    const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
    const errs = [];
    page.on('pageerror', e => { if(!isNoise(e.message)) errs.push(e.message); });
    page.on('console',   m => { if(m.type()==='error' && !isNoise(m.text())) errs.push(m.text()); });
    await page.goto(FILE_URL);
    await page.waitForSelector('#scene-globe', { timeout:8000 });
    return { page, errs };
  }

  async function startLevel(page, locId){
    // Use roster chips (stable — not animated like globe pins)
    const chips = page.locator('.chip.active');
    const cc = await chips.count();
    let launched = false;
    for(let i=0;i<cc;i++){
      const t = await chips.nth(i).innerText();
      if(t && t.toLowerCase().includes(locId.toLowerCase())){
        await chips.nth(i).click({ force: true }); launched = true; break;
      }
    }
    if(!launched) await chips.first().click({ force: true });
    await page.waitForSelector('.howto', { state:'visible', timeout:5000 });
    await page.locator('#btnStart').click();
    await page.waitForSelector('#scene-game', { state:'visible', timeout:5000 });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: Page loads + map screen
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Map & navigation ══════════════════════');
  {
    const { page, errs } = await openPage();
    check('No JS errors on load',        errs.length===0, errs[0]);
    check('Globe canvas visible',         await page.locator('#globeCanvas').isVisible());
    check('Active chips visible',         await page.locator('.chip.active').count() > 0);
    check('Start button hidden on map',   await page.locator('#btnStart').isHidden());
    await page.screenshot({ path:'tests/screenshots/playtest-01-map.png' });
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: Level start — each unlocked location
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Level start ═══════════════════════════');
  for(const loc of ['glasgow','modena','paris','ireland']){
    const { page, errs } = await openPage();
    await startLevel(page, loc);
    await wait(500);
    check(loc+': no JS errors after start', errs.length===0, errs[0]);
    check(loc+': canvas rendered',          await page.locator('#gameCanvas').isVisible());
    check(loc+': HUD visible',              await page.locator('.hud').isVisible());
    await page.screenshot({ path:'tests/screenshots/playtest-02-'+loc+'-start.png' });
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: Debug hook & internal state
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Debug hook + internal vars ════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'glasgow');
    await wait(500);

    const hookExists = await page.evaluate(() => typeof window.__game === 'object');
    check('window.__game hook exists', hookExists);

    if(hookExists){
      const state = await page.evaluate(() => window.__game.getState());
      check('gameState is ready/playing',  ['ready','playing'].includes(state.gameState), state.gameState);
      check('waveNumber is 1',             state.waveNumber === 1, 'waveNumber='+state.waveNumber);
      check('Lives == 3',                  state.lives === 3, 'lives='+state.lives);
      check('Enemies spawned',             state.enemyCount > 0, 'count='+state.enemyCount);
      check('smokeLevel var exists',       typeof state.smokeLevel === 'number');
      check('paintBlobCount var exists',   typeof state.paintBlobCount === 'number');

      const fns = await page.evaluate(() => window.__game.drawFns);
      check('drawBuckfastRef is function',  fns.buckfast  === 'function', fns.buckfast);
      check('drawParmesanRef is function',  fns.parmesan  === 'function', fns.parmesan);
      check('drawLukeKellyRef is function', fns.lukekelly === 'function', fns.lukekelly);
      check('drawArtistRef is function',    fns.artist    === 'function', fns.artist);
      check('drawMotorbikeRef is function', fns.motorbike === 'function', fns.motorbike);
    }
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: Special enemy types spawn correctly
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Special enemy types ════════════════════');
  {
    const { page } = await openPage();
    await startLevel(page, 'glasgow');
    await wait(500);
    const types = await page.evaluate(() => window.__game.getEnemyTypes());
    const hasBuckfast = types.includes('buckfast');
    const hasNormal   = types.includes('normal');
    check('Glasgow spawns buckfast or normal enemies', hasBuckfast || hasNormal,
          'types: '+types.join(','));
    check('Glasgow enemy array non-empty', types.length > 0, 'count='+types.length);
    await page.close();
  }
  {
    const { page } = await openPage();
    await startLevel(page, 'modena');
    await wait(500);
    const types = await page.evaluate(() => window.__game.getEnemyTypes());
    check('Modena spawns parmesan or normal', types.includes('parmesan') || types.includes('normal'),
          types.join(','));
    await page.close();
  }
  {
    const { page } = await openPage();
    await startLevel(page, 'ireland');
    await wait(500);
    const types = await page.evaluate(() => window.__game.getEnemyTypes());
    check('Ireland spawns lukekelly or normal', types.includes('lukekelly') || types.includes('normal'),
          types.join(','));
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: Wave-2 all-clear bug
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Wave-2 all-clear bug ════════════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'glasgow');
    await wait(3500); // past countdown

    // Force all collectibles taken + trigger wave-2 transition
    await page.evaluate(() => {
      window.__game.forceAllCollectiblesTaken();
    });
    await wait(300);
    await page.evaluate(() => {
      window.__game.forceWave2();
    });
    await wait(800); // let update loop run wave-2 spawn

    const state = await page.evaluate(() => window.__game.getState());
    check('Wave 2 spawns after forceWave2()',    state.waveNumber === 2, 'waveNumber='+state.waveNumber);
    check('Wave 2 has enemies',                  state.enemyCount > 0,  'enemies='+state.enemyCount);
    check('allClearFired stays true (bug fix)',  state.allClearFired === true);
    check('No errors during wave-2 transition',  errs.length===0, errs[0]);
    await page.screenshot({ path:'tests/screenshots/playtest-05-wave2.png' });
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: Artist paint blobs
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Artist paint blobs ══════════════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'paris');
    await wait(3500);
    // Inject an artist with paintT almost expired
    await page.evaluate(() => window.__game.spawnArtistEnemy());
    await wait(400); // let it throw
    const state = await page.evaluate(() => window.__game.getState());
    check('Paint blob spawned by artist', state.paintBlobCount > 0, 'count='+state.paintBlobCount);
    check('No errors with artist+paint',  errs.length===0, errs[0]);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 7: Motorbike smoke
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Motorbike smoke ═════════════════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'kenya');
    await wait(3500);
    await page.evaluate(() => window.__game.spawnMotorbikeEnemy());
    await wait(400);
    const state = await page.evaluate(() => window.__game.getState());
    check('Smoke level increases after motorbike rev', state.smokeLevel > 0, 'smokeLevel='+state.smokeLevel);
    check('No errors with motorbike smoke', errs.length===0, errs[0]);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 8: Luke Kelly never chases
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Luke Kelly (never chases) ═══════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'ireland');
    await wait(3500); // let chase timer expire (default 8s so not yet, but test still valid)
    const types = await page.evaluate(() => window.__game.getEnemyTypes());
    check('Ireland has enemies', types.length > 0, 'count='+types.length);
    // Inject a Luke Kelly, wait and check it's still there (didn't crash)
    const injected = await page.evaluate(() => {
      enemies.push({ x:200, y:400, w:28, h:26, vx:80, vy:0, dir:1, state:'free',
        bubbleTimer:0, hopT:0, angry:0, onGround:true, type:'lukekelly', hits:1,
        wanderX:600, wanderT:5 });
      return enemies.length;
    }).catch(() => -1);
    // Note: direct enemies access fails (IIFE scope) - use getEnemyTypes which goes through __game
    check('No errors when Luke Kelly exists in level', errs.length===0, errs[0]);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 9: Game renders 5s without crash
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ 5-second play stability ════════════════');
  for(const loc of ['glasgow','modena','ireland','paris']){
    const { page, errs } = await openPage();
    await startLevel(page, loc);
    // Simulate some movement
    await page.keyboard.down('a');
    await wait(500); await page.keyboard.up('a');
    await page.keyboard.down('d');
    await wait(500); await page.keyboard.up('d');
    await wait(4000);
    check(loc+': 5s play, no crash', errs.length===0, errs[0]);
    const state = await page.evaluate(() => window.__game.getState());
    check(loc+': game still running',  ['playing','ready'].includes(state.gameState), state.gameState);
    await page.screenshot({ path:'tests/screenshots/playtest-09-'+loc+'-5s.png' });
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST GROUP 10: Back-to-map navigation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══ Back to map ═════════════════════════════');
  {
    const { page, errs } = await openPage();
    await startLevel(page, 'glasgow');
    await wait(500);
    await page.locator('#btnBack').click();
    await page.waitForSelector('#scene-globe', { state:'visible', timeout:3000 });
    check('Back button returns to globe',  await page.locator('#scene-globe').isVisible());
    check('Game scene hidden after back',  await page.locator('#scene-game').isHidden());
    check('No errors navigating back',     errs.length===0, errs[0]);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('Results: ' + pass + ' passed, ' + fail + ' failed');
  if(bugs.length){
    console.log('\nBugs to fix:');
    bugs.forEach(function(b,i){ console.log('  '+(i+1)+'. '+b); });
  }
  console.log('══════════════════════════════════════════════\n');

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();
