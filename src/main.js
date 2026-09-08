
import { TAU, clamp, lerp, rand, safeGet, safeSet, escHtml, haptic } from './utils.js';
import { ctx, W, H, initCanvas } from './canvas.js';
import { adGameplayStart, adGameplayStop, showAdBreak, lbEnabled, submitScore, fetchLeaderboard, openLeaderboard, setProgress } from './sdk.js';
import { initStarfield } from './starfield.js';
import { playSound, ac, getMasterGain, setMasterVolume, setMutedGetter, suspendAudio, resumeAudio } from './audio.js';
import { bgmAudio, startMusic, stopMusic, setMusicMutedGetter } from './music.js';
import { updateStreak, getDailyLocationId, refreshDailyUI, ACHIEVEMENTS, achievementQueue, achievementToast, achievementToastT, setAchievementToast, setAchievementToastT, unlockAchievement, renderAchievements, setLocationsGetter, setRunAchievements } from './features.js';
import { LOCATIONS, refreshClearedPin, renderBestScores, globeRunning, setGlobeRunning, positionPins, unlockLocation, project, globeR, globeLoop, setGlobeProgress, setEnterLocation } from './globe.js';
import { drawGround, drawPlatform, drawFox, drawChicken, drawBubble, drawPowerup, drawKelpieRef, drawScotCollectibleRef, drawBurglarRef, drawModenaCollectibleRef, drawHyenaRef, drawWaspRef, drawKenyaCollectibleRef, drawMimeRef, drawParisCollectibleRef, drawBansheeRef, drawIrelandCollectibleRef, drawGorgonRef, drawAthensCollectibleRef, drawDragonRef, drawBuckfastRef, drawParmesanRef, drawLukeKellyRef, drawArtistRef, drawMotorbikeRef, drawPaintBlobs, setDrawState, getLOC_POWERUP_META } from './draw.js';
import { netRole, netConnected, netStateAccum, setNetStateAccum, netUiRefresh, netHudRefresh, netTeardown, netBroadcastScene, netBroadcastState, netSendInputIfChanged, localJumpPress, localBubblePress, setNetState, setNetEnterLocation, setNetBackToMap, setNetPlaySound, setNetTryJump, setNetTryShoot, setNetKeys, setNetUpdateHud, setNetLivePlayers } from './net.js';
import { LEVELS, LEVEL_LAYOUTS, drawSkylineRow } from './levels.js';

  var progress = safeGet('gh_progress_v2', { glasgow: { best: 0, cleared: false }, modena: { best: 0, cleared: false }, kenya: { best: 0, cleared: false }, paris: { best: 0, cleared: false }, ireland: { best: 0, cleared: false }, athens: { best: 0, cleared: false }, tokyo: { best: 0, cleared: false }, brazil: { best: 0, cleared: false }, newyork: { best: 0, cleared: false }, boss: { best: 0, cleared: false } });
  setProgress(progress);
  setGlobeProgress(progress);
  // Re-derive unlocked locations from saved progress. globe.js runs
  // refreshClearedPin() at module load with empty progress, so without this
  // pass every location beyond the defaults re-locks on each page load.
  refreshClearedPin();
  setLocationsGetter(function(){ return LOCATIONS; });
  setDrawState(function(){ return { LEVELS: LEVELS, currentLocationId: state.currentLocationId }; });

  /* ---------- Feature 5: Random Mid-Level Events ---------- */
  var EVENTS = [
    {id:'bubble_storm', label:'BUBBLE STORM!', color:'#7fe3ff', duration:10},
    {id:'speed_boost',  label:'TAILWIND!',      color:'#ffd700', duration:8},
    {id:'fog',          label:'FOG ROLLS IN…', color:'#aabbcc', duration:10}
  ];
  var activeEvent = null, eventTimer = 0, nextEventIn = rand(20,35);

  var PALETTES_P1 = [
    { body:'#ff7a45', belly:'#fff3e6', ear:'#2a0d05', tailTip:'#fff' },   // 0: default orange
    { body:'#e0eeff', belly:'#fff', ear:'#8090c0', tailTip:'#c0d8ff' },   // 1: arctic (unlock glasgow)
    { body:'#cc2020', belly:'#ffd0d0', ear:'#6a0000', tailTip:'#fff' },   // 2: crimson (unlock modena)
    { body:'#1a1a2e', belly:'#3a3a5e', ear:'#0a0a1e', tailTip:'#888' }    // 3: midnight (unlock kenya)
  ];
  var PALETTES_P2 = [
    { body:'#7a93ff', belly:'#eef1ff', ear:'#141c4d', tailTip:'#fff' },   // 0: default blue
    { body:'#f5c842', belly:'#fff8e0', ear:'#8a7000', tailTip:'#fff' },   // 1: golden (unlock paris)
    { body:'#3a8a3a', belly:'#d0f0d0', ear:'#1a4a1a', tailTip:'#fff' }    // 2: forest (unlock ireland)
  ];
  var selectedSkins = safeGet('gh_skins_v1', {p1:0, p2:0});

  initStarfield();

  /* ========================================================= */
  var sceneGlobe = document.getElementById('scene-globe');
  var sceneGame = document.getElementById('scene-game');

  function setNumPlayers(n){
    state.numPlayers = n;
    document.querySelectorAll('.mode-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.players===String(n));
    });
    document.getElementById('p2Controls').hidden = (n!==2);
  }
  function selectMode(modeStr){
    document.querySelectorAll('.mode-btn').forEach(function(b){
      b.classList.toggle('active', b.dataset.players===modeStr);
    });
    if(modeStr==='net'){
      state.numPlayers = 2;
      document.getElementById('localControls').hidden = true;
      document.getElementById('localControlsHint').hidden = true;
      document.getElementById('p2Controls').hidden = true;
      document.getElementById('netPanel').hidden = false;
      netUiRefresh();
    } else {
      netTeardown();
      document.getElementById('netPanel').hidden = true;
      document.getElementById('localControls').hidden = false;
      document.getElementById('localControlsHint').hidden = false;
      state.numPlayers = (modeStr==='2') ? 2 : 1;
      document.getElementById('p2Controls').hidden = (state.numPlayers!==2);
      document.getElementById('btnStart').hidden = false;
    }
  }
  document.querySelectorAll('.mode-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ selectMode(btn.dataset.players); });
  });

  function enterLocation(loc){
    setGlobeRunning(false);
    sceneGlobe.hidden = true;
    sceneGame.hidden = false;
    // One fixed adventure — whichever pin was tapped, the run always starts at
    // the top of CAMPAIGN and plays straight through to the boss.
    campaignMode = true;
    campaignStep = 0;
    campaignLastType = 'level';
    adventureComplete = false;
    powerCharges = 0;
    var first = LOCATIONS.filter(function(l){ return l.id === CAMPAIGN[0].id; })[0] || loc;
    state.currentLocationId = first.id;
    if(netRole){
      state.numPlayers = 2;
      document.getElementById('p2Controls').hidden = true;
    } else {
      selectMode('1');
    }
    var level = LEVELS[first.id];
    document.getElementById('hudLocation').textContent = first.name + '  ·  1/' + CAMPAIGN.length;
    document.getElementById('howtoTitle').textContent = 'Start the adventure — ' + first.name;
    document.getElementById('howtoBlurb').textContent = level.blurb;
    resetGame();
    document.getElementById('howto').hidden = false;
    netUiRefresh();
    netHudRefresh();
    if(netRole==='host'){ netBroadcastScene('enterLocation', {locationId: first.id}); }
  }
  setEnterLocation(enterLocation);
  setNetEnterLocation(enterLocation);
  setNetPlaySound(playSound);
  function backToMap(){
    if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer = null; }
    var wasHost = (netRole==='host');
    adGameplayStop();
    stopGame();
    sceneGame.hidden = true;
    sceneGlobe.hidden = false;
    setGlobeRunning(true);
    refreshClearedPin();
    buildSkinDots();
    updateStreak();
    refreshDailyUI();
    document.getElementById('netHudBadge').hidden = true;
    if(wasHost){ netBroadcastScene('map'); }
  }
  setNetBackToMap(backToMap);
  document.getElementById('btnBack').addEventListener('click', backToMap);
  document.getElementById('btnHowtoBack').addEventListener('click', function(){ backToMap(); });
  document.getElementById('btnWinMap').addEventListener('click', backToMap);
  document.getElementById('btnLoseMap').addEventListener('click', backToMap);

  document.getElementById('btnLeaderboard').addEventListener('click', function(){
    openLeaderboard(null, LOCATIONS);
  });
  document.getElementById('btnLeaderboardClose').addEventListener('click', function(){
    document.getElementById('overlayLeaderboard').style.display = 'none';
  });

  function togglePause(){
    if(state.gameState==='playing'){
      state.gameState='paused';
      document.getElementById('btnPause').textContent='▶ Resume';
      suspendAudio();
    } else if(state.gameState==='paused'){
      state.gameState='playing';
      document.getElementById('btnPause').textContent='⏸ Pause';
      resumeAudio();
    }
  }
  document.getElementById('btnPause').addEventListener('click', togglePause);
  (function(){
    var bp = document.getElementById('btnPower');
    if(bp) bp.addEventListener('click', function(){ usePower(); });
    var mp = document.getElementById('mcPower');
    if(mp){
      var fire = function(e){ e.preventDefault(); usePower(); };
      mp.addEventListener('touchstart', fire, {passive:false});
      mp.addEventListener('click', fire);
    }
  })();

  function toggleFullscreen(){
    if(!document.fullscreenElement){
      (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen ||
       document.documentElement.mozRequestFullScreen).call(document.documentElement);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
    }
  }
  document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('btnReset').addEventListener('click', function(){
    var ask = window.__confirmFn || function(msg){ return confirm(msg); };
    if(!ask('Reset all progress, scores and unlocks?')) return;
    localStorage.clear();
    (window.__reloadFn || function(){ location.reload(); })();
  });
  document.getElementById('btnFullscreenGlobe').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', function(){
    var fs = !!document.fullscreenElement;
    document.getElementById('btnFullscreen').textContent = fs ? '✕' : '⛶';
    document.getElementById('btnFullscreenGlobe').textContent = fs ? '✕' : '⛶';
  });
  document.getElementById('volSlider').addEventListener('input', function(){
    var v = parseFloat(this.value);
    setMasterVolume(muted ? 0 : v);
    if(bgmAudio) bgmAudio.volume = muted ? 0 : Math.min(1, v * 0.6);
    safeSet('gh_volume_v1', {vol:v, muted:muted});
  });
  var muted = false;
  setMutedGetter(function(){ return muted; });
  setMusicMutedGetter(function(){ return muted; });
  document.getElementById('btnMute').addEventListener('click', function(){
    muted = !muted;
    var v = parseFloat(document.getElementById('volSlider').value);
    setMasterVolume(muted ? 0 : v);
    if(bgmAudio) bgmAudio.volume = muted ? 0 : Math.min(1, v * 0.6);
    this.textContent = muted ? '🔇' : '🔊';
    safeSet('gh_volume_v1', {vol:v, muted:muted});
  });
  // Load saved volume on startup
  (function(){
    var savedVol = safeGet('gh_volume_v1', {vol:0.5, muted:false});
    var slider = document.getElementById('volSlider');
    var muteBtn = document.getElementById('btnMute');
    if(slider) slider.value = savedVol.vol;
    if(savedVol.muted){ muted = true; if(muteBtn) muteBtn.textContent = '🔇'; }
  })();

  /* =========================================================
     GAME ENGINE
  ========================================================= */

  initCanvas();
  var cv = document.getElementById('gameCanvas');
  var GRAVITY = 1500;

  var state = {
    players:           null,
    enemies:           null,
    bubbles:           null,
    collectibles:      null,
    particles:         null,
    popups:            null,
    powerups:          null,
    popBursts:         null,
    score:             0,
    lives:             3,
    gameState:         'ready',
    enemiesLeft:       0,
    waveNumber:        1,
    comboCount:        0,
    startTime:         0,
    currentLocationId: 'glasgow',
    numPlayers:        1
  };

  cv.addEventListener('click', function(e){ handleMiniGameClick(e.clientX, e.clientY); });
  cv.addEventListener('touchstart', function(e){
    if(miniGameId){ e.preventDefault(); handleMiniGameClick(e.touches[0].clientX, e.touches[0].clientY); }
  }, {passive:false});

  var keys = {};
  setNetKeys(keys);
  setNetLivePlayers(function(){ return state.players; });

  window.addEventListener('keydown', function(e){
    var code = e.code, handled = true;
    switch(code){
      case 'KeyA': keys.p1Left = true; break;
      case 'KeyD': keys.p1Right = true; break;
      case 'KeyW': keys.p1Jump = true; localJumpPress(); break;
      case 'ShiftLeft': case 'ShiftRight': keys.p1Bubble = true; localBubblePress(); break;
      case 'Space': keys.p1Jump = true; localJumpPress(); break;
      case 'KeyE': case 'KeyQ': usePower(); break;
      case 'ArrowLeft': keys.p2Left = true; break;
      case 'ArrowRight': keys.p2Right = true; break;
      case 'ArrowUp': keys.p2Jump = true; tryJump(state.numPlayers===2 ? state.players[1] : state.players[0]); break;
      case 'Slash': keys.p2Bubble = true; tryShoot(state.numPlayers===2 ? state.players[1] : state.players[0]); break;
      case 'Escape': case 'KeyP': togglePause(); break;
      case 'KeyR': if(state.gameState==='lost' && netRole!=='guest'){ resetGame(); state.gameState='playing'; startMusic(); } break;
      default: handled = false;
    }
    if(handled && e.cancelable) e.preventDefault();
  }, {passive:false});
  window.addEventListener('keyup', function(e){
    switch(e.code){
      case 'KeyA': keys.p1Left = false; break;
      case 'KeyD': keys.p1Right = false; break;
      case 'KeyW': keys.p1Jump = false; break;
      case 'ShiftLeft': case 'ShiftRight': keys.p1Bubble = false; break;
      case 'Space': keys.p1Jump = false; break;
      case 'ArrowLeft': keys.p2Left = false; break;
      case 'ArrowRight': keys.p2Right = false; break;
      case 'ArrowUp': keys.p2Jump = false; break;
      case 'Slash': keys.p2Bubble = false; break;
    }
  });

  function bindHold(id, prop, onPress){
    var el = document.getElementById(id);
    var press = function(e){ if(e && e.cancelable) e.preventDefault(); keys[prop] = true; if(onPress) onPress(); };
    var release = function(e){ if(e && e.cancelable) e.preventDefault(); keys[prop] = false; };
    // Touch events first (most reliable on Samsung Internet / older Android WebViews),
    // Pointer events as the modern path, and mouse events as a desktop/synthetic-click fallback.
    el.addEventListener('touchstart', press, {passive:false});
    el.addEventListener('touchend', release, {passive:false});
    el.addEventListener('touchcancel', release, {passive:false});
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
    el.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }
  // Touch buttons always drive Player 1.
  bindHold('tLeft','p1Left');
  bindHold('tRight','p1Right');
  bindHold('tJump','p1Jump', function(){ localJumpPress(); });
  bindHold('tBubble','p1Bubble', function(){ localBubblePress(); });

  /* ---- Mobile floating controls ---- */
  function bindMC(id, prop, onPress){
    var el = document.getElementById(id);
    if(!el) return;
    var held = false;
    function press(e){ e.preventDefault(); if(held) return; held=true; el.classList.add('held'); keys[prop]=true; haptic(15); if(onPress) onPress(); }
    function release(e){ e.preventDefault(); held=false; el.classList.remove('held'); keys[prop]=false; }
    el.addEventListener('touchstart', press, {passive:false});
    el.addEventListener('touchend',   release, {passive:false});
    el.addEventListener('touchcancel',release, {passive:false});
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup',   release);
    el.addEventListener('pointerleave',release);
    el.addEventListener('pointercancel',release);
    el.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }
  bindMC('mcLeft',   'p1Left');
  bindMC('mcRight',  'p1Right');
  bindMC('mcJump',   'p1Jump',   function(){ localJumpPress(); });
  bindMC('mcBubble', 'p1Bubble', function(){ localBubblePress(); });

  /* Show/hide mobile controls and portrait warning */
  var isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  var mcEl = document.getElementById('mobileControls');
  var pwEl = document.getElementById('portraitWarning');

  function updateMobileUI(){
    if(!isTouchDevice){ if(mcEl) mcEl.style.display='none'; return; }
    var portrait = window.innerHeight > window.innerWidth;
    if(pwEl) pwEl.style.display = portrait ? 'flex' : 'none';
    if(mcEl) mcEl.style.display = portrait ? 'none' : 'block';
  }
  updateMobileUI();
  window.addEventListener('resize', updateMobileUI);
  window.addEventListener('orientationchange', function(){ setTimeout(updateMobileUI, 200); });

  /* Canvas swipe up = jump */
  var swipeStartY = 0;
  document.addEventListener('touchstart', function(e){
    swipeStartY = e.touches[0].clientY;
  }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(!isTouchDevice || state.gameState !== 'playing') return;
    var dy = swipeStartY - e.changedTouches[0].clientY;
    if(dy > 40){ localJumpPress(); keys.p1Jump = true; setTimeout(function(){ keys.p1Jump = false; }, 120); }
  }, {passive:true});

  var PLATFORMS = [];
  var movingPlatforms = [];

  var BOSS_SPAWN = [{x:330, y:390, w:54, h:46, vx:100, hits:3}];

  var shakeT = 0, comboTimer = 0, waveFlash = 0, screenFlash = 0, allClearFired = false, allClearDelay = 0;
  var freezeT = 0, slowT = 0, doubleScoreT = 0, smokeLevel = 0; var paintBlobs = [];
  var magnetT = 0;
  var puFlash = 0, puFlashLabel = '', puFlashColor = '#fff';
  var screenFlashColor = '#ff1040';
  var tutorialT = 0, tutorialDone = false, tutorialFirstPop = false;
  var survivorUnlocked = false;
  var usedPowerups = {};
  var killFeed = [];
  var fireMeter = 0, fireBonus = 0;
  var platShake = 0, platShakeX = 0, platShakeY = 0;
  var pandaSpecialUnlocked = (localStorage.getItem('bbl_panda_special') === '1');
  var pandaChargeCount = 0, pandaChargeTimer = 0, pandaCooldown = 0;
  var pandaProjectile = null; // {x,y,vx,vy,t,phase:'flying'|'sneezing',sneezeT}
  var campaignMode = false, campaignLastType = 'minigame';
  var campaignStep = 0;        // index into CAMPAIGN for the current run
  var adventureComplete = false;
  var powerCharges = 0;        // banked "Trap Blast" charges from cleared mini-games
  var miniGameId = null, miniGameTimer = 0, miniGamePhase = 'playing', miniGameData = {};
  var miniGameMusicHandle = null;
  var unlockedCosmetics = (function(){ try{ return JSON.parse(localStorage.getItem('bbl_cosmetics')||'{}'); }catch(e){ return {}; } })();
  var CHASE_DELAY = 12;
  /* The whole game is one fixed run: every level and mini-game once, in order,
     ending with the China boss. Score carries across the whole thing and the
     leaderboard is offered only on the final screen. */
  var CAMPAIGN = [
    {type:'level', id:'glasgow'},
    {type:'minigame', id:'mediterranean'},
    {type:'level', id:'modena'},
    {type:'minigame', id:'krakow'},
    {type:'level', id:'paris'},
    {type:'minigame', id:'berlin'},
    {type:'level', id:'ireland'},
    {type:'minigame', id:'london'},
    {type:'level', id:'athens'},
    {type:'minigame', id:'pamplona'},
    {type:'level', id:'kenya'},
    {type:'level', id:'tokyo'},
    {type:'level', id:'brazil'},
    {type:'level', id:'newyork'},
    {type:'level', id:'boss'},
  ];
  var MINI_GAME_DEFS = {
    mediterranean:{title:'Mediterranean Sea',subtitle:'Row to the other side!',timeLimit:22,reward:'sailingHat',rewardLabel:'Sailing Hat',power:'Tide Trap'},
    krakow:{title:'Krakow Kitchen',subtitle:'Click the beetroots to make soup!',timeLimit:20,reward:'beetrootJacket',rewardLabel:'Beetroot Jacket',power:'Beet Blast'},
    berlin:{title:'Berlin Club',subtitle:'Hit the glowing dance spots!',timeLimit:22,reward:'glowstick',rewardLabel:'Glowstick',power:'Strobe Snare'},
    london:{title:'Buckingham Palace',subtitle:'Knock the crowns off the guards!',timeLimit:28,reward:'crown',rewardLabel:'Golden Crown',power:'Crown Crash'},
    pamplona:{title:'Running of the Bulls',subtitle:'Free all the bulls from their pens!',timeLimit:26,reward:'bandana',rewardLabel:'Red Bandana',power:'Bull Rush'}
  };
  var POWERUP_TYPES = ['speed','rapid','shield','magnet','ghost'];
  var chaseAlertPlayed = false;
  var survivalMode = false, survivalWave = 0, survivalEnemyTimer = 0;
  var countdownT = 0, countdownBeep = 3;
  var runAchievements = [];
  setRunAchievements(runAchievements);
  var confettiParticles = [];

  function makePlayer(id, x, palette){
    return { id:id, x:x, y:400, w:30, h:34, vx:0, vy:0, onGround:false, facing:1,
      walkPhase:Math.random()*TAU, invuln:0, shootCooldown:0, palette:palette,
      speedBoost:0, rapidFire:0, shield:0, hasRat:false, ratPhase:0, hasElephant:false, elephantPhase:0 };
  }

  function resetGame(keepScore){
    state.players = [ makePlayer(0, state.numPlayers===2 ? 320 : 360, PALETTES_P1[selectedSkins.p1]) ];
    if(state.numPlayers===2) state.players.push(makePlayer(1, 420, PALETTES_P2[selectedSkins.p2]));

    /* Feature 4: Escalating Difficulty */
    var playCount = (progress[state.currentLocationId] && progress[state.currentLocationId].playCount) || 0;
    var diffMult = Math.min(1 + playCount * 0.12, 2.2);
    var adjustedChaseDelay = Math.max(5, CHASE_DELAY / diffMult);

    var layout = LEVEL_LAYOUTS[state.currentLocationId];
    var lvlPhys = (LEVELS[state.currentLocationId] && LEVELS[state.currentLocationId].levelPhysics) || {};
    GRAVITY = lvlPhys.gravity || 1500;
    freezeT = 0; slowT = 0; doubleScoreT = 0;
    PLATFORMS = layout.platforms;
    movingPlatforms = (layout.movingPlatformDefs || []).map(function(d){
      return {x:d.ox, y:d.oy, w:d.w, h:d.h, ox:d.ox, oy:d.oy, axis:d.axis, amplitude:d.amplitude, speed:d.speed};
    });
    var currentEnemySpawns = layout.enemySpawns;
    var currentCollectibleSpots = layout.collectibleSpots;

    if(state.currentLocationId === 'boss'){
      state.enemies = BOSS_SPAWN.map(function(s){
        return { x:s.x, y:60, w:s.w, h:s.h, vx:s.vx, vy:0, dir: Math.random()<0.5?1:-1, platform:0,
          state:'free', bubbleTimer:0, hopT: rand(1.5,3), angry:0, onGround:false, hits:s.hits,
          shootT: rand(2,4) };
      });
      state.waveNumber = 99;
    } else {
      var variety1 = layout.enemyVariety;
      state.enemies = currentEnemySpawns.map(function(s){
        var useSpecial = variety1 && Math.random() < (variety1.waveRatio * 0.45);
        var eType = useSpecial ? variety1.specialType : 'normal';
        var ew = eType==='parmesan'?44 : eType==='buckfast'?20 : eType==='motorbike'?42 : eType==='armoured'?34 : eType==='fast'?22 : 28;
        var eh = eType==='parmesan'?38 : eType==='buckfast'?26 : eType==='motorbike'?28 : eType==='armoured'?30 : eType==='fast'?20 : 26;
        var baseSpd = eType==='buckfast'?130 : eType==='parmesan'?50 : eType==='motorbike'?160 : eType==='armoured'?60 : eType==='fast'?110 : 70;
        var ehits = eType==='parmesan'?3 : eType==='armoured'?2 : 1;
        return { x:s.x, y:s.y, w:ew, h:eh, vx:Math.round(baseSpd * diffMult * (lvlPhys.enemySpeed || 1)), vy:0, dir: Math.random()<0.5?1:-1, platform:s.platform,
          state:'free', bubbleTimer:0, hopT: rand(1,3), angry:0, onGround:false, type:eType, hits:ehits, wanderX:rand(40,680), wanderT:rand(3,9) };
      });
      state.waveNumber = 1;
    }
    state.enemiesLeft = state.enemies.length;
    state.bubbles = [];
    state.particles = [];
    state.popups = [];
    state.powerups = [];
    state.popBursts = [];
    chaseAlertPlayed = false;
    state.comboCount = 0; comboTimer = 0; waveFlash = 0; allClearFired = false; allClearDelay = 0; smokeLevel = 0; paintBlobs = [];
    magnetT = 0; puFlash = 0; screenFlashColor = '#ff1040';
    killFeed = []; fireMeter = 0; fireBonus = 0; platShake = 0;
    pandaChargeCount = 0; pandaChargeTimer = 0; pandaCooldown = 0; pandaProjectile = null;
    survivorUnlocked = false;
    usedPowerups = {};

    var locPlayCount2 = (progress[state.currentLocationId] && progress[state.currentLocationId].playCount) || 0;
    tutorialDone = locPlayCount2 > 0;
    tutorialT = 0;
    tutorialFirstPop = false;

    /* Feature 5: Reset events */
    activeEvent = null; eventTimer = 0; nextEventIn = rand(20,35);

    /* Feature 6: Ghost state.collectibles */
    var missedPrev = safeGet('gh_missed_'+state.currentLocationId, []);
    state.collectibles = currentCollectibleSpots.map(function(c){
      var wasMissed = missedPrev.some(function(m){ return m.x===c.x && m.y===c.y; });
      return {x:c.x, y:c.y, slot:c.slot, taken:false, bob:Math.random()*TAU, ghost:wasMissed};
    });

    /* Store adjustedChaseDelay for use in update */
    resetGame._adjustedChaseDelay = adjustedChaseDelay;
    resetGame._diffMult = diffMult;
    resetGame._playCount = playCount;

    /* Survival mode overrides */
    if(survivalMode){
      state.waveNumber = 99;
      survivalWave = 0;
      state.enemiesLeft = 999;
      state.enemies = [];
      for(var si=0; si<3; si++){
        var ss = currentEnemySpawns[si % currentEnemySpawns.length];
        state.enemies.push({ x:ss.x, y:ss.y, w:28, h:26, vx:70, vy:0,
          dir:Math.random()<0.5?1:-1, platform:ss.platform,
          state:'free', bubbleTimer:0, hopT:rand(1,3), angry:0, onGround:false, hits:1, type:'normal', wanderX:rand(40,680), wanderT:rand(3,9) });
      }
    }

    countdownT = 3;
    countdownBeep = 3;
    runAchievements = [];
    confettiParticles = [];

    state.score = keepScore ? state.score : 0;
    state.lives = 3;
    state.gameState = 'ready';
    state.startTime = performance.now();
    updateHud();
    document.getElementById('overlayWin').hidden = true;
    document.getElementById('overlayLose').hidden = true;
    var pr = progress[state.currentLocationId] || {best:0};
    document.getElementById('hudBest').textContent = pr.best;
  }
  resetGame._adjustedChaseDelay = CHASE_DELAY;
  resetGame._diffMult = 1;
  resetGame._playCount = 0;

  function stopGame(){ state.gameState = 'stopped'; }

  document.getElementById('btnStart').addEventListener('click', function(){
    if(netRole==='guest') return;
    resetGame();
    document.getElementById('howto').hidden = true;
    state.gameState = 'playing';
    state.startTime = performance.now();
    startMusic();
    adGameplayStart();
    netBroadcastScene('start');
  });
  document.getElementById('btnRetry').addEventListener('click', function(){
    if(netRole==='guest') return;
    // survivalMode stays as-is (if they were in survival, retry stays survival)
    resetGame();
    state.gameState = 'playing';
    startMusic();
    netBroadcastScene('retry');
  });
  document.getElementById('btnWinNext').addEventListener('click', function(){
    if(netRole==='guest') return;
    var nextLoc = getNextLocation();
    if(nextLoc) startNextLevel(nextLoc);
  });
  document.getElementById('btnWinAgain').addEventListener('click', function(){
    if(netRole==='guest') return;
    if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer = null; }
    document.getElementById('winNextHint').hidden = true;
    document.getElementById('overlayWin').hidden = true;
    survivalMode = false;
    if(adventureComplete){
      // Start a whole new run from the top.
      adventureComplete = false;
      campaignMode = true;
      campaignStep = 0;
      campaignLastType = 'level';
      powerCharges = 0;
      state.currentLocationId = CAMPAIGN[0].id;
      resetGame();                 // fresh cumulative score
      state.gameState = 'playing';
      startMusic();
      return;
    }
    resetGame();
    state.gameState = 'playing';
    startMusic();
    netBroadcastScene('winAgain');
  });
  document.getElementById('btnSurvival').addEventListener('click', function(){
    survivalMode = true;
    resetGame();
    document.getElementById('howto').hidden = true;
    state.gameState = 'playing';
    state.startTime = performance.now();
    startMusic();
  });

  // Name entry for best state.score
  (function(){
    var nameInput = document.getElementById('nameInput');
    var submitted = false;
    window._resetLbSubmit = function(){ submitted = false; };
    function saveName(){
      var val = nameInput.value.trim();
      if(!val) return;
      var boardId = adventureComplete ? 'adventure' : state.currentLocationId;
      var pr = progress[boardId] || {best:0,cleared:false};
      pr.name = val;
      progress[boardId] = pr;
      safeSet('gh_progress_v2', progress);
      renderBestScores();
      // Submit to leaderboard on first confirm
      if(!submitted && lbEnabled()){
        submitted = true;
        var winScoreSubmit = document.getElementById('winScoreSubmit');
        winScoreSubmit.hidden = false;
        winScoreSubmit.textContent = 'Submitting score…';
        submitScore(boardId, val, pr.best, function(ok){
          winScoreSubmit.textContent = ok ? '✓ On the leaderboard!' : '✗ Could not submit score';
        });
      }
    }
    nameInput.addEventListener('blur', saveName);
    nameInput.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ saveName(); nameInput.blur(); }
    });
  })();

  // Skin selector
  function buildSkinDots(){
    var p1Unlocks = [true, progress.glasgow && progress.glasgow.cleared, progress.modena && progress.modena.cleared, progress.kenya && progress.kenya.cleared];
    var p2Unlocks = [true, progress.paris && progress.paris.cleared, progress.ireland && progress.ireland.cleared];
    var p1Colors = PALETTES_P1.map(function(p){ return p.body; });
    var p2Colors = PALETTES_P2.map(function(p){ return p.body; });

    function renderDots(containerId, colors, unlocks, playerIdx, currentSel){
      var container = document.getElementById(containerId);
      if(!container) return;
      container.innerHTML = '';
      colors.forEach(function(col, i){
        var dot = document.createElement('span');
        var unlocked = unlocks[i];
        dot.style.cssText = 'display:inline-block;width:16px;height:16px;border-radius:50%;background:'+col+';margin:0 2px;vertical-align:middle;'+(unlocked?'cursor:pointer;':'')+'opacity:'+(unlocked?1:0.3)+';border:'+(i===currentSel?'2px solid #fff':'2px solid transparent')+';';
        dot.title = unlocked ? 'Select skin '+(i+1) : 'Locked';
        if(unlocked){
          dot.addEventListener('click', function(){
            if(playerIdx===1) selectedSkins.p1 = i;
            else selectedSkins.p2 = i;
            safeSet('gh_skins_v1', selectedSkins);
            buildSkinDots();
            // update player palettes if playing
            if(state.gameState==='playing'){
              state.players.forEach(function(p){
                if(p.id===0) p.palette = PALETTES_P1[selectedSkins.p1];
                if(p.id===1) p.palette = PALETTES_P2[selectedSkins.p2];
              });
            }
          });
        }
        container.appendChild(dot);
      });
    }
    renderDots('skinDotsP1', p1Colors, p1Unlocks, 1, selectedSkins.p1);
    renderDots('skinDotsP2', p2Colors, p2Unlocks, 2, selectedSkins.p2);
  }
  buildSkinDots();

  function updateHud(){
    document.getElementById('hudScore').textContent = state.score;
    var pr = progress[state.currentLocationId] || {best:0};
    document.getElementById('hudBest').textContent = pr.best;
    var livesEl = document.getElementById('hudLives');
    livesEl.innerHTML = '';
    for(var i=0;i<state.lives;i++){
      var s = document.createElement('span');
      s.className = 'life';
      s.textContent = '🦊';
      livesEl.appendChild(s);
    }
  }
  setNetUpdateHud(updateHud);

  function rectsOverlap(a,b){
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }

  function resolvePlatformCollision(ent){
    ent.onGround = false;
    var allPlats = PLATFORMS.concat(movingPlatforms);
    for(var i=0;i<allPlats.length;i++){
      var p = allPlats[i];
      if(ent.vy >= 0 &&
         ent.x + ent.w > p.x && ent.x < p.x + p.w &&
         (ent.y+ent.h) >= p.y && (ent.y+ent.h) <= p.y + Math.max(18, ent.vy/30 + 18) &&
         (ent.y+ent.h - ent.vy/60) <= p.y + 6){
        ent.y = p.y - ent.h;
        ent.vy = 0;
        ent.onGround = true;
      }
    }
    if(ent.x < -ent.w) ent.x = W;
    if(ent.x > W) ent.x = -ent.w;
  }

  function spawnParticles(x,y,color,n){
    for(var i=0;i<n;i++){
      state.particles.push({
        x:x, y:y, vx: rand(-140,140), vy: rand(-220,-40),
        life: rand(0.35,0.7), t:0, color: color, r: rand(2,4)
      });
    }
  }
  function spawnPopup(x,y,text,color,size){
    state.popups.push({x:x,y:y,text:text,t:0,color:color||'#ffd166',size:size||16});
  }

  /* Trap Blast — a charge earned by clearing a mini-game. Instantly wraps every
     free enemy in a bubble so they can be popped; also briefly slows things. */
  function updatePowerHud(){
    var show = powerCharges > 0 && !sceneGame.hidden && !miniGameId && state.gameState === 'playing';
    var btn = document.getElementById('btnPower');
    if(btn){ btn.hidden = !show; if(show) btn.textContent = '⚡ Trap Blast ×' + powerCharges; }
    var mc = document.getElementById('mcPower');
    if(mc) mc.hidden = !show;
  }
  function usePower(){
    if(powerCharges <= 0 || miniGameId || state.gameState !== 'playing') return;
    var targets = state.enemies.filter(function(e){ return e.state === 'free'; });
    if(!targets.length) return;
    powerCharges--;
    targets.forEach(function(en){
      en.state = 'trapped';
      en.bubbleTimer = 4.5;
      en.stunT = 0;
      state.bubbles.push({ x:en.x + en.w/2, y:en.y + en.h/2, r:20, age:0,
        state:'carrying', trapped:en, vx:0, vy:0, t:0, grown:true });
    });
    slowT = Math.max(slowT, 1.4);
    screenFlash = 0.45; screenFlashColor = '#7fe3ff';
    shakeT = 0.4;
    spawnParticles(W/2, H/2, '#7fe3ff', 28);
    spawnPopup(W/2, H/2 - 30, 'TRAP BLAST!', '#7fe3ff', 34);
    pushKillFeed('⚡ TRAP BLAST — ' + targets.length + ' caught', '#7fe3ff');
    playSound('powerup_big');
    haptic(45);
    updatePowerHud();
  }

  // Trigger functions for jump/shoot. Called both from the per-frame input
  // poll (keyboard/touch holds) AND directly from the press event itself, so
  // a very quick tap can never slip between two animation frames unregistered.
  function tryJump(p){
    if(state.gameState==='playing' && p && p.onGround){
      p.vy = -560;
      p.onGround = false;
      playSound('jump');
    }
  }
  function tryShoot(p){
    if(state.gameState==='playing' && p && p.shootCooldown<=0){
      p.shootCooldown = p.rapidFire>0 ? 0.12 : 0.42;
      // panda triple-shoot detection
      if(pandaSpecialUnlocked && pandaCooldown <= 0 && !pandaProjectile){
        pandaChargeCount++;
        pandaChargeTimer = 0.55;
        if(pandaChargeCount >= 3){
          pandaChargeCount = 0;
          pandaCooldown = 18;
          launchPandaSpecial(p);
        }
      }
      playSound('shoot');
      state.bubbles.push({
        x: p.x + p.w/2 + p.facing*10, y: p.y+6,
        vx: p.facing*310, vy:55, r:4, grown:false, age:0,
        state:'flying', trapped:null, t:0
      });
    }
  }

  setNetTryJump(tryJump);
  setNetTryShoot(tryShoot);
  function drawPanda(x, y, t, sneezing){
    ctx.save();
    ctx.translate(x, y);
    // arc tumble in flight
    ctx.rotate(Math.sin(t * 10) * 0.35);
    var s = sneezing ? 1 + Math.sin(t * 20) * 0.07 : 1;
    ctx.scale(s, s);
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0,24,18,5,0,0,TAU); ctx.fill();
    // body
    ctx.fillStyle='#fff'; ctx.strokeStyle='#222'; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.ellipse(0,8,16,20,0,0,TAU); ctx.fill(); ctx.stroke();
    // head
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(0,-14,13,0,TAU); ctx.fill(); ctx.stroke();
    // ears
    ctx.fillStyle='#1a1a1a'; ctx.strokeStyle='#1a1a1a';
    ctx.beginPath(); ctx.arc(-10,-25,6,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(10,-25,6,0,TAU); ctx.fill();
    // eye patches
    ctx.beginPath(); ctx.ellipse(-5.5,-15,5,3.5,-0.35,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5.5,-15,5,3.5,0.35,0,TAU); ctx.fill();
    // eyes
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-5.5,-15,2,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5.5,-15,2,0,TAU); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(-5.5,-15,1,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(5.5,-15,1,0,TAU); ctx.fill();
    // nose
    ctx.fillStyle='#333';
    ctx.beginPath(); ctx.ellipse(0,-11,3,2,0,0,TAU); ctx.fill();
    if(sneezing){
      // sneeze cloud puff out of mouth
      ctx.fillStyle='rgba(180,255,230,0.75)';
      ctx.beginPath(); ctx.arc(14,-6,10,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(22,-4,7,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(28,-8,5,0,TAU); ctx.fill();
      ctx.fillStyle='#22cc88';
      ctx.font='bold 9px "Fredoka",sans-serif'; ctx.textAlign='left';
      ctx.fillText('achoo',12,-2);
    } else {
      // determined mouth
      ctx.strokeStyle='#555'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(0,-9,4,0.3,TAU-0.3); ctx.stroke();
    }
    ctx.restore();
  }

  function launchPandaSpecial(p){
    pandaProjectile = {
      x: p.x + p.w/2, y: p.y + p.h/2,
      vx: p.facing * 420, vy: -300,
      t: 0, phase: 'flying', sneezeT: 0
    };
    screenFlash = 0.3; screenFlashColor = '#aaffaa';
    shakeT = 0.25;
    pushKillFeed('PANDA INCOMING!', '#aaffaa');
    spawnPopup(p.x+p.w/2, p.y-30, 'PANDA SPECIAL!', '#aaffaa', 22);
    playSound('powerup_ghost');
  }

  function update(dt){
    if(state.gameState !== 'playing') return;
    if(countdownT > 0){
      var prevFloor = Math.ceil(countdownT);
      countdownT -= dt;
      var currFloor = Math.ceil(countdownT);
      if(currFloor < prevFloor && currFloor > 0) playSound('beep');
      if(countdownT <= 0) playSound('go');
      if(countdownT > 0) return;
    } else if(countdownT > -0.5){
      countdownT -= dt; // keep ticking so GO! fades out properly
    }
    /* Survival spawner */
    if(survivalMode && state.gameState==='playing'){
      var freeEnemies = state.enemies.filter(function(e){ return e.state==='free' || e.state==='trapped'; });
      if(freeEnemies.length === 0){
        survivalWave++;
        var count = Math.min(3 + survivalWave, 8);
        var sp = Math.min(70 + survivalWave*15, 220);
        for(var si=0; si<count; si++){
          var ss = LEVEL_LAYOUTS[state.currentLocationId].enemySpawns[si % LEVEL_LAYOUTS[state.currentLocationId].enemySpawns.length];
          state.enemies.push({ x:ss.x, y:ss.y, w:28, h:26, vx:sp, vy:0,
            dir:Math.random()<0.5?1:-1, platform:ss.platform,
            state:'free', bubbleTimer:0, hopT:rand(1,3), angry:0, onGround:false, hits:1, type:'normal', wanderX:rand(40,680), wanderT:rand(3,9) });
        }
        spawnPopup(W/2, 60, 'WAVE '+survivalWave+'!', '#ff5470');
      }
    }
    /* Confetti update */
    if(state.gameState==='won'){
      for(var ci=confettiParticles.length-1;ci>=0;ci--){
        var cp=confettiParticles[ci];
        cp.t+=dt; cp.x+=cp.vx*dt; cp.y+=cp.vy*dt; cp.vy+=200*dt; cp.rot+=cp.rotV*dt;
        if(cp.t>cp.life || cp.y>H+20) confettiParticles.splice(ci,1);
      }
    }
    if(comboTimer>0) comboTimer -= dt; else state.comboCount = 0;
    if(waveFlash>0) waveFlash -= dt;
    if(freezeT>0) freezeT -= dt;
    if(slowT>0) slowT -= dt;
    if(doubleScoreT>0) doubleScoreT -= dt;
    if(screenFlash>0) screenFlash -= dt*2.5;
    if(puFlash>0) puFlash -= dt*1.8;
    if(magnetT>0) magnetT -= dt;
    /* moving platforms */
    var nowSec = performance.now()/1000;
    movingPlatforms.forEach(function(mp){
      if(mp.axis==='x') mp.x = mp.ox + Math.sin(nowSec * mp.speed) * mp.amplitude;
      else mp.y = mp.oy + Math.sin(nowSec * mp.speed) * mp.amplitude;
    });
    /* tutorial timer */
    if(!tutorialDone && state.gameState==='playing'){
      tutorialT += dt;
      if(tutorialT > 12) tutorialDone = true;
    }

    var accel = 900, fric = 1300;
    state.players.forEach(function(p){
      if(p.speedBoost>0) p.speedBoost -= dt;
      if(p.rapidFire>0) p.rapidFire -= dt;
      if(p.shield>0) p.shield -= dt;
      var maxSpeed = p.speedBoost>0 ? 340 : 220;
      if(activeEvent && activeEvent.id==='speed_boost') maxSpeed += 80;
      var left, right, jump, bubble;
      if(state.numPlayers===1){
        left = keys.p1Left || keys.p2Left;
        right = keys.p1Right || keys.p2Right;
        jump = keys.p1Jump || keys.p2Jump;
        bubble = keys.p1Bubble || keys.p2Bubble;
      } else if(p.id===0){
        left = keys.p1Left; right = keys.p1Right; jump = keys.p1Jump; bubble = keys.p1Bubble;
      } else {
        left = keys.p2Left; right = keys.p2Right; jump = keys.p2Jump; bubble = keys.p2Bubble;
      }
      var moveDir = 0;
      if(left) moveDir -= 1;
      if(right) moveDir += 1;
      if(moveDir !== 0){
        p.vx += moveDir*accel*dt;
        p.vx = clamp(p.vx, -maxSpeed, maxSpeed);
        p.facing = moveDir;
        p.walkPhase += dt*10;
      } else {
        var s = Math.sign(p.vx);
        p.vx -= s*Math.min(Math.abs(p.vx), fric*dt);
      }
      if(jump) tryJump(p);
      var prevVy = p.vy;
      p.vy += GRAVITY*dt;
      p.x += p.vx*dt;
      p.y += p.vy*dt;
      resolvePlatformCollision(p);
      if(p.onGround && prevVy > 160) playSound('land');
      p.y = clamp(p.y, -100, H-p.h);
      if(p.invuln>0) p.invuln -= dt;
      p.shootCooldown -= dt;
      if(bubble) tryShoot(p);
    });

    // state.collectibles bob + pickup (either player can collect)
    var level = LEVELS[state.currentLocationId];
    state.collectibles.forEach(function(c){
      if(c.taken) return;
      c.bob += dt*2;
      if(magnetT > 0 && state.players.length > 0){
        var mpt = state.players[0];
        for(var mpi=1;mpi<state.players.length;mpi++){
          if(Math.abs(state.players[mpi].x-c.x)<Math.abs(mpt.x-c.x)) mpt=state.players[mpi];
        }
        var mcdx=mpt.x+mpt.w/2-c.x, mcdy=mpt.y+mpt.h/2-c.y;
        var mcdist=Math.sqrt(mcdx*mcdx+mcdy*mcdy)||1;
        c.x += (mcdx/mcdist)*240*dt; c.y += (mcdy/mcdist)*240*dt;
      }
      var box = {x:c.x-14,y:c.y-14,w:28,h:28};
      for(var pi=0; pi<state.players.length; pi++){
        if(rectsOverlap(state.players[pi], box)){
          c.taken = true;
          var v = (level.values[c.slot] || 50) * (c.ghost ? 2 : 1);
          state.score += v;
          if(c.ghost){
            spawnPopup(c.x,c.y,'+'+v+' GHOST BONUS!','#00e5ff');
          } else {
            spawnPopup(c.x,c.y,'+'+v,'#ffd166');
          }
          spawnParticles(c.x,c.y,c.ghost?'#00e5ff':'#ffd166',10);
          playSound('collect'); haptic(12);
          // water rat companion (Modena slot c)
          if(state.currentLocationId==='modena' && c.slot==='c'){
            state.players[pi].hasRat = true;
            unlockAchievement('rat_friend');
          }
          // baby elephant companion (Kenya slot c)
          if(state.currentLocationId==='kenya' && c.slot==='c'){
            state.players[pi].hasElephant = true;
            unlockAchievement('elephant_friend');
          }
          break;
        }
      }
    });

    /* All-state.collectibles clear: wipe ALL remaining state.enemies with a per-level effect */
    if(state.gameState === 'playing' && !survivalMode && state.currentLocationId !== 'boss'){
      var allTaken = state.collectibles.length > 0 && state.collectibles.every(function(c){ return c.taken; });
      if(allTaken && state.enemies.length > 0 && !allClearFired){
        allClearFired = true;
        var clearEffects = {
          glasgow: {color:'#7fe3ff', label:'BUBBLE SURGE!'},
          modena:  {color:'#ffd700', label:'PASTA POWER!'},
          paris:   {color:'#ff9fc4', label:'MON DIEU!'},
          ireland: {color:'#7fff7f', label:'LUCKY BLAST!'},
          kenya:   {color:'#ff9940', label:'SAFARI SWEEP!'}
        };
        var fx = clearEffects[state.currentLocationId] || {color:'#fff', label:'CLEAR!'};
        spawnPopup(W/2, H/2 - 40, fx.label, fx.color, 28);
        playSound('win');
        shakeT = 0.6;
        screenFlash = 0.4;
        state.enemies.forEach(function(en){
          for(var ci4=0;ci4<8;ci4++){
            state.particles.push({x:en.x+en.w/2+rand(-10,10), y:en.y+en.h/2+rand(-10,10),
              vx:rand(-180,180), vy:rand(-320,-80), life:1.0, t:0, color:fx.color, r:rand(3,8)});
          }
          state.particles.push({x:en.x+en.w/2,y:en.y+en.h/2,
            vx:rand(-80,80),vy:rand(-220,-100),life:0.8,t:0,color:'#ffd700',r:rand(5,10)});
          state.popBursts.push({x:en.x+en.w/2, y:en.y+en.h/2,
            vx:rand(-260,260), vy:rand(-400,-160),
            rot:0, rotV:rand(-14,14), t:0, life:0.9,
            drawFn:LEVELS[state.currentLocationId].enemyDraw, w:en.w, h:en.h, hits:0, enType:en.type});
          state.score += Math.round(level.values.pop * 0.5);
        });
        state.enemies = [];
        state.enemiesLeft = 0;
        allClearDelay = 1.8;
        unlockAchievement('treasure');
        // location-specific confetti rain
        var rainPalettes = {glasgow:['#7fe3ff','#ffffff'],modena:['#ffd700','#ff6600'],paris:['#ff9fc4','#ffffff'],ireland:['#7fff7f','#ffd700'],kenya:['#ff9940','#ffe066']};
        var rp = rainPalettes[state.currentLocationId]||['#ffd700','#ffffff'];
        spawnCelebrationRain(rp[0], rp[1]);
        pushKillFeed('ALL CLEAR!', rp[0]);
      }
    }

    // state.bubbles
    for(var bi=state.bubbles.length-1; bi>=0; bi--){
      var b = state.bubbles[bi];
      b.age += dt;
      if(b.state==='flying'){
        if(b.boss){
          /* boss projectile: travels straight, hurts player */
          b.x += b.vx*dt; b.y += b.vy*dt;
          if(b.age > 3 || b.x<-20 || b.x>W+20 || b.y<-20 || b.y>H+20){ state.bubbles.splice(bi,1); continue; }
          var bBox={x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2};
          var hit=false;
          state.players.forEach(function(p){ if(!hit && p.invuln<=0 && rectsOverlap(p,bBox)){ loseLife(p,0); hit=true; } });
          if(hit){ spawnParticles(b.x,b.y,'#ff4040',8); state.bubbles.splice(bi,1); }
          continue;
        }
        b.vx *= 0.965;
        b.vy = lerp(b.vy, -70, dt*2.2);
        b.x += b.vx*dt; b.y += b.vy*dt;
        b.r = Math.min(16, 6 + b.age*30);
        if(b.age > 2.4 || b.x<-20 || b.x>W+20 || b.y < -20 || b.y > H+20){ state.bubbles.splice(bi,1); continue; }
        if(b.decorative) continue;
        for(var ei=0; ei<state.enemies.length; ei++){
          var en = state.enemies[ei];
          if(en.state !== 'free') continue;
          var ebox = {x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2};
          if(rectsOverlap(ebox, en)){
            en.state = 'trapped';
            en.bubbleTimer = 4.5;
            b.state = 'carrying';
            b.trapped = en;
            b.r = 20;
            spawnParticles(b.x,b.y,'#7fe3ff',8);
            playSound('trap');
            break;
          }
        }
      } else if(b.state==='carrying'){
        b.y -= 34*dt;
        b.x += Math.sin(b.age*3)*10*dt;
        var en2 = b.trapped;
        if(en2){
          en2.x = b.x - en2.w/2; en2.y = b.y - en2.h/2;
          en2.bubbleTimer -= dt;
          if(en2.bubbleTimer <= 0){
            en2.state = 'free';
            en2.vx = (en2.dir||1) * 130;
            en2.angry = 3;
            en2.tauntT = 1.1;
            state.bubbles.splice(bi,1);
            continue;
          }
        }
        var pbox = {x:b.x-b.r,y:b.y-b.r,w:b.r*2,h:b.r*2};
        var popped = false, popper = null;
        for(var pj=0; pj<state.players.length && !popped; pj++){
          if(rectsOverlap(state.players[pj], pbox)){ popped = true; popper = state.players[pj]; }
        }
        if(popped){
          if(en2 && en2.hits && en2.hits > 1){
            // Multi-hit (parmesan / armoured / boss): reduce HP, then launch the
            // enemy clear of the player and let it tumble instead of dropping it
            // in their lap where it would immediately land a hit.
            en2.hits--;
            en2.angry = 5;
            en2.state = 'free';
            en2.bubbleTimer = 0;
            var ppr = popper || state.players[0];
            var away = (en2.x + en2.w/2) < (ppr.x + ppr.w/2) ? -1 : 1;
            en2.vx = 300 * away;
            en2.vy = -340;
            en2.dir = away;
            en2.onGround = false;
            en2.stunT = en2.type === 'parmesan' ? 1.8 : 1.1; // parmesan careens around longer
            b.trapped = null;
            state.bubbles.splice(bi,1);
            spawnPopup(b.x, b.y-10, 'HIT! '+en2.hits+' to go', '#ff3030');
            spawnParticles(b.x,b.y,'#ff3030',14);
            playSound('trap');
            shakeT = 0.2;
            continue;
          }
          state.comboCount++;
          comboTimer = 2.2;
          var basePoints = level.values.pop;
          var multiplier = Math.min(state.comboCount, 6);
          var pts = basePoints * multiplier * (doubleScoreT > 0 ? 2 : 1);
          var label = multiplier>1 ? '+'+pts+' x'+multiplier+'!' : '+'+pts;
          if(doubleScoreT>0) label += ' x2!';
          spawnPopup(b.x, b.y-10, label, multiplier>1?'#ff5470':'#ff9c7a', multiplier>1 ? 14+multiplier*4 : 16);
          spawnParticles(b.x,b.y,multiplier>2?'#ff5470':'#ff9c7a',14);
          state.score += pts;
          var popSnd = state.comboCount>=5?'combo_max':state.comboCount>=4?'combo_4':state.comboCount>=3?'combo_3':state.comboCount>=2?'pop_combo':('pop_'+(state.currentLocationId||'glasgow'));
          playSound(popSnd); haptic(state.comboCount>1?20:10);
          tutorialFirstPop = true;
          unlockAchievement('first_pop');
          if(state.comboCount >= 3) unlockAchievement('combo3');
          // kill feed + fire meter + platform shake
          fireMeter = Math.min(1, fireMeter + (state.comboCount>=3 ? 0.28 : 0.14));
          if(state.comboCount >= 3) pushKillFeed('x'+state.comboCount+' COMBO!', state.comboCount>=5?'#ff2200':state.comboCount>=4?'#ff5500':'#ff7744');
          if(state.comboCount >= 4) platShake = Math.max(platShake, 0.35);
          if(fireMeter >= 1 && fireBonus <= 0){
            fireBonus = 3; fireMeter = 0;
            state.players.forEach(function(fp2){ fp2.speedBoost=Math.max(fp2.speedBoost,3); fp2.rapidFire=Math.max(fp2.rapidFire,3); });
            screenFlash=0.5; screenFlashColor='#ff4400'; shakeT=0.4; platShake=0.6;
            pushKillFeed('ON FIRE!','#ff4400');
            spawnPopup(W/2, H/2-60, 'ON FIRE!', '#ff4400', 44);
            playSound('achievement');
          }
          // 35% chance to drop a power-up; 40% of drops are location-specific
          if(Math.random()<0.35){
            var lvlPU = LEVELS[state.currentLocationId] && LEVELS[state.currentLocationId].locPowerup;
            var ptype;
            if(lvlPU && Math.random()<0.4){
              ptype = lvlPU.type;
            } else {
              ptype = POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
            }
            state.powerups.push({x:b.x, y:b.y, type:ptype, bob:0, life:7});
          }
          var idx = state.enemies.indexOf(en2);
          if(idx>-1){ state.enemies.splice(idx,1); state.enemiesLeft--; }
          state.bubbles.splice(bi,1);
          shakeT = 0.15;
          // spinning ghost that flies off — parmesan careens around the map
          var isParm = en2.type === 'parmesan';
          state.popBursts.push({
            x:b.x, y:b.y,
            vx:isParm?rand(-360,360):rand(-220,220), vy:isParm?rand(-420,-260):rand(-340,-140),
            rot:0, rotV:rand(-12,12),
            t:0, life:isParm?1.5:0.65, bounce:isParm,
            drawFn:LEVELS[state.currentLocationId].enemyDraw,
            w:en2.w, h:en2.h, hits:0, enType:en2.type
          });
          // gold coin shower
          for(var ci2=0;ci2<5;ci2++){
            state.particles.push({x:b.x+rand(-8,8), y:b.y+rand(-8,8),
              vx:rand(-90,90), vy:rand(-180,-60),
              life:0.7, t:0, color:'#ffd700', r:rand(3,6)});
          }
        }
      }
    }

    /* Chain-pop: carrying state.bubbles that touch each other both pop */
    if(state.gameState==='playing'){
      var chainPopped = [];
      for(var cai=0; cai<state.bubbles.length; cai++){
        if(state.bubbles[cai].state!=='carrying') continue;
        for(var cbi=cai+1; cbi<state.bubbles.length; cbi++){
          if(state.bubbles[cbi].state!=='carrying') continue;
          var cdx=state.bubbles[cai].x-state.bubbles[cbi].x, cdy=state.bubbles[cai].y-state.bubbles[cbi].y;
          var cminD = state.bubbles[cai].r + state.bubbles[cbi].r;
          if(cdx*cdx+cdy*cdy < cminD*cminD){
            if(chainPopped.indexOf(cai)<0) chainPopped.push(cai);
            if(chainPopped.indexOf(cbi)<0) chainPopped.push(cbi);
          }
        }
      }
      chainPopped.sort(function(a,b){return b-a;});
      chainPopped.forEach(function(cidx){
        var cb=state.bubbles[cidx]; if(!cb||cb.state!=='carrying') return;
        var cen=cb.trapped; if(!cen) return;
        state.comboCount++; comboTimer=2.2;
        var pts=(level.values.pop)*Math.min(state.comboCount,6);
        spawnPopup(cb.x,cb.y-10,'\u26d3 CHAIN +'+pts,'#ff5470',22);
        spawnParticles(cb.x,cb.y,'#ff5470',18);
        state.score+=pts; playSound('combo_max'); haptic(25);
        pushKillFeed('CHAIN POP!','#ff8800'); platShake=Math.max(platShake,0.5);
        tutorialFirstPop=true;
        var ei=state.enemies.indexOf(cen);
        if(ei>-1){state.enemies.splice(ei,1);state.enemiesLeft--;}
        state.bubbles.splice(cidx,1);
        state.popBursts.push({x:cb.x,y:cb.y,vx:rand(-220,220),vy:rand(-340,-140),
          rot:0,rotV:rand(-12,12),t:0,life:0.65,
          drawFn:LEVELS[state.currentLocationId].enemyDraw,w:cen.w,h:cen.h,hits:0});
        for(var ci3=0;ci3<5;ci3++){
          state.particles.push({x:cb.x+rand(-8,8),y:cb.y+rand(-8,8),
            vx:rand(-90,90),vy:rand(-180,-60),life:0.7,t:0,color:'#ffd700',r:rand(3,6)});
        }
      });
    }

    /* Feature 5: Random mid-level events */
    nextEventIn -= dt;
    if(nextEventIn <= 0 && !activeEvent){
      activeEvent = EVENTS[Math.floor(Math.random()*EVENTS.length)];
      eventTimer = activeEvent.duration;
      spawnPopup(W/2, 60, activeEvent.label, activeEvent.color);
      nextEventIn = rand(25,45);
    }
    if(activeEvent){
      eventTimer -= dt;
      if(eventTimer <= 0) activeEvent = null;
    }
    /* bubble_storm event: 3% chance per frame to spawn a decorative bubble */
    if(activeEvent && activeEvent.id==='bubble_storm' && Math.random()<0.03){
      state.bubbles.push({x:rand(20,W-20), y:-20, vx:rand(-30,30), vy:rand(20,50), r:rand(8,16), grown:true, age:0, state:'flying', trapped:null, t:0, decorative:true});
    }

    /* Feature 3: Achievement toast drain in update */
    if(achievementQueue.length > 0 && !achievementToast){
      setAchievementToast(achievementQueue.shift());
      setAchievementToastT(4.8);
      playSound('achievement');
    }
    if(achievementToast){ setAchievementToastT(achievementToastT - dt); if(achievementToastT<=0) setAchievementToast(null); }

    // state.enemies
    var elapsed = (performance.now() - state.startTime) / 1000;
    var currentChaseDelay = resetGame._adjustedChaseDelay || CHASE_DELAY;
    var chasing = elapsed >= currentChaseDelay;

    /* Feature 3: Survivor achievement */
    if(chasing && elapsed - currentChaseDelay > 60 && !survivorUnlocked && state.lives > 0){
      survivorUnlocked = true;
      unlockAchievement('survivor');
    }

    state.enemies.forEach(function(en){
      if((en.tauntT||0) > 0) en.tauntT -= dt;
      if(en.state !== 'free') return;
      if(freezeT > 0) return;   // frozen — skip movement and collision entirely
      if(en.angry>0) en.angry -= dt;
      en.hopT -= dt;

      /* Knocked-back after a non-final pop: tumble through the air, ricochet off
         walls and the floor, and deal no contact damage until it settles. */
      if((en.stunT || 0) > 0){
        en.stunT -= dt;
        en.x += en.vx * dt;
        en.vy += GRAVITY * dt;
        en.y += en.vy * dt;
        if(en.x < 4){ en.x = 4; en.vx = Math.abs(en.vx) * 0.8; }
        if(en.x + en.w > W - 4){ en.x = W - 4 - en.w; en.vx = -Math.abs(en.vx) * 0.8; }
        resolvePlatformCollision(en);
        if(en.y + en.h > 445){
          en.y = 445 - en.h;
          en.vy = -Math.abs(en.vy) * 0.45;
          en.vx *= 0.7;
          if(Math.abs(en.vy) < 60){ en.vy = 0; }
        }
        if(en.onGround) en.vx *= 0.9;
        return;
      }

      /* Ireland banshees keen when a player strays close */
      if(state.currentLocationId === 'ireland' && state.players.length){
        en.wailT = (en.wailT || 0) - dt;
        if(en.wailT <= 0){
          for(var wp=0; wp<state.players.length; wp++){
            var wdx = (state.players[wp].x + state.players[wp].w/2) - (en.x + en.w/2);
            var wdy = (state.players[wp].y + state.players[wp].h/2) - (en.y + en.h/2);
            if(wdx*wdx + wdy*wdy < 130*130){
              playSound('banshee_wail');
              en.wailT = rand(1.6, 2.8);
              break;
            }
          }
        }
      }

      /* Motorbike: periodic smoke burst */
      if(en.type === 'motorbike'){
        en.smokeRevT = ((en.smokeRevT !== undefined) ? en.smokeRevT : rand(3,6)) - dt;
        if(en.smokeRevT <= 0){
          en.smokeRevT = rand(3, 7);
          smokeLevel = Math.min(1, smokeLevel + 0.55);
          playSound('motorbike_rev');
          for(var msi=0;msi<12;msi++){
            state.particles.push({x:en.x+en.w/2, y:en.y+en.h/2, vx:rand(-80,80), vy:rand(-60,20),
              life:rand(1.5,3), t:0, color:'rgba(120,120,120,0.6)', r:rand(10,22)});
          }
        }
      }

      /* Artist: throw paint blobs at state.players */
      if(en.type === 'artist' && state.players.length > 0){
        en.paintT = ((en.paintT !== undefined) ? en.paintT : rand(2,4)) - dt;
        if(en.paintT <= 0){
          en.paintT = rand(3, 6);
          var ptgt = state.players[0];
          var pbx = en.x+en.w/2, pby = en.y+en.h/2;
          var pdx = ptgt.x+ptgt.w/2-pbx, pdy = ptgt.y+ptgt.h/2-pby;
          var pdist = Math.sqrt(pdx*pdx+pdy*pdy)||1;
          var pspd = 200;
          var paintCols = ['#ff4040','#4040ff','#40cc40','#ffcc00'];
          paintBlobs.push({x:pbx, y:pby, vx:(pdx/pdist)*pspd, vy:(pdy/pdist)*pspd,
            r:7, color:paintCols[Math.floor(Math.random()*4)], life:3, t:0});
          playSound('paint_splat');
        }
      }

      /* Luke Kelly never chases — always wanders */
      var doChase = chasing && state.players.length > 0 && en.type !== 'lukekelly';

      if(doChase){
        // find nearest player
        var nearest = state.players[0];
        var bestDist = Math.abs(state.players[0].x - en.x);
        for(var cp=1; cp<state.players.length; cp++){
          var d = Math.abs(state.players[cp].x - en.x);
          if(d < bestDist){ bestDist = d; nearest = state.players[cp]; }
        }

        var enCx = en.x + en.w/2;
        var playerAbove = nearest.y + nearest.h < en.y - 6;

        /* If the target is above us, aim for the nearest edge of the platform
           it's standing on, so we can hop onto the ledge instead of jittering
           around directly underneath it. */
        var targetX = nearest.x + nearest.w/2;
        if(playerAbove){
          var allP = PLATFORMS.concat(movingPlatforms), standPl = null;
          for(var pk=0; pk<allP.length; pk++){
            var pl = allP[pk];
            if(nearest.x + nearest.w > pl.x && nearest.x < pl.x + pl.w &&
               Math.abs((nearest.y + nearest.h) - pl.y) < 12){ standPl = pl; break; }
          }
          if(standPl && !(enCx > standPl.x - 6 && enCx < standPl.x + standPl.w + 6)){
            targetX = enCx < standPl.x ? standPl.x + 8 : standPl.x + standPl.w - 8;
          }
        }

        /* Hold a committed heading through a climb hop so we actually land on
           the ledge rather than drifting back to where we launched. */
        if(!en.onGround && (en.climbT || 0) > 0){
          en.climbT -= dt;
          en.dir = en.climbDir;
        } else {
          en.dir = Math.abs(targetX - enCx) < 6 ? 0 : (targetX > enCx ? 1 : -1);
        }

        var speed = en.vx * (en.angry>0 ? 1.8 : 1.3) * (slowT > 0 ? 0.4 : 1);
        if(!en.onGround && (en.climbT || 0) > 0) speed *= 1.15; // extra reach mid-hop
        en.x += speed * en.dir * dt;
        en.vy += GRAVITY * dt;
        en.y += en.vy * dt;
        resolvePlatformCollision(en);
        if(en.y + en.h > 445){ en.y = 445 - en.h; en.vy = 0; en.onGround = true; }

        /* Stuck detection: no horizontal progress for 1.2 s -> committed hop. */
        en.stuckX = (en.stuckX !== undefined) ? en.stuckX : en.x;
        en.stuckT = ((en.stuckT !== undefined) ? en.stuckT : 0) + dt;
        if(en.stuckT >= 1.2){
          if(Math.abs(en.x - en.stuckX) < 24 && en.onGround){
            en.vy = rand(-560, -440);
            en.onGround = false;
            en.climbDir = playerAbove ? (targetX > enCx ? 1 : -1) : (-en.dir || 1);
            en.climbT = 1.0;
          }
          en.stuckX = en.x; en.stuckT = 0;
        }

        /* Jump: climb toward a target above, or hop to traverse platforms. */
        if(en.onGround){
          if(playerAbove || (en.hopT <= 0 && Math.random() < 0.35)){
            en.vy = rand(-560, -430);
            en.onGround = false;
            en.hopT = rand(0.4, 1.0);
            en.climbDir = Math.abs(targetX - enCx) > 10 ? (targetX > enCx ? 1 : -1) : (en.dir || 1);
            en.climbT = 0.9;
          }
        }
      } else {
        // Free-roaming wander (also used by Luke Kelly always)
        var speedMod = slowT > 0 ? 0.4 : 1;
        en.wanderT = (en.wanderT || 0) - dt;
        if(!en.wanderX || Math.abs(en.x + en.w/2 - en.wanderX) < 35 || en.wanderT <= 0){
          en.wanderX = rand(40, W - 70);
          en.wanderT = rand(3, 9);
        }
        en.dir = en.wanderX > en.x + en.w / 2 ? 1 : -1;
        en.x += en.vx * en.dir * dt * (en.angry > 0 ? 1.5 : 1) * speedMod;
        en.vy += GRAVITY * dt;
        en.y += en.vy * dt;
        resolvePlatformCollision(en);
        if(en.y + en.h > 445){ en.y = 445 - en.h; en.vy = 0; en.onGround = true; }
        if(en.x < 4){ en.x = 4; en.wanderX = rand(120, W - 60); }
        if(en.x + en.w > W - 4){ en.x = W - 4 - en.w; en.wanderX = rand(40, W - 150); }
        if(en.onGround && en.hopT <= 0){
          en.vy = rand(-440, -260);
          en.onGround = false;
          en.hopT = rand(0.4, 1.6);
        }
      }

      /* Boss bubble attack */
      if(state.currentLocationId === 'boss' && en.state === 'free' && state.gameState === 'playing'){
        en.shootT = (en.shootT || 3) - dt;
        if(en.shootT <= 0){
          en.shootT = Math.max(1.2, rand(2.5, 4.5) - (3 - en.hits) * 0.5);
          var target = state.players[Math.floor(Math.random()*state.players.length)];
          if(target){
            var bx = en.x + en.w/2, by = en.y + en.h/2;
            var dx2 = target.x + target.w/2 - bx, dy2 = target.y + target.h/2 - by;
            var dist2 = Math.sqrt(dx2*dx2+dy2*dy2) || 1;
            var spd = 240;
            state.bubbles.push({x:bx, y:by, vx:(dx2/dist2)*spd, vy:(dy2/dist2)*spd,
              r:14, grown:true, age:0, state:'flying', trapped:null, t:0,
              boss:true });
            playSound('shoot');
          }
        }
      }

      if(state.gameState === 'playing'){
        state.players.forEach(function(p){
          if(p.invuln<=0 && (en.stunT||0)<=0 && rectsOverlap(p, en)){
            loseLife(p, en.x + en.w/2 < p.x + p.w/2 ? -1 : 1);
          }
        });
      }
    });

    // state.particles
    for(var pi2=state.particles.length-1; pi2>=0; pi2--){
      var pp = state.particles[pi2];
      pp.t += dt;
      if(pp.t>pp.life){ state.particles.splice(pi2,1); continue; }
      pp.x += pp.vx*dt; pp.y += pp.vy*dt; pp.vy += 500*dt;
    }
    for(var pbi=state.popBursts.length-1; pbi>=0; pbi--){
      var pb = state.popBursts[pbi];
      pb.t += dt;
      if(pb.t >= pb.life){ state.popBursts.splice(pbi,1); continue; }
      pb.x += pb.vx*dt; pb.y += pb.vy*dt; pb.vy += (pb.bounce ? 380 : 600)*dt;
      pb.rot += pb.rotV*dt;
      if(pb.bounce){
        if(pb.x < 12){ pb.x = 12; pb.vx = Math.abs(pb.vx)*0.85; }
        if(pb.x > W-12){ pb.x = W-12; pb.vx = -Math.abs(pb.vx)*0.85; }
        if(pb.y > 445){ pb.y = 445; pb.vy = -Math.abs(pb.vy)*0.6; pb.vx *= 0.85; }
      }
    }
    for(var upi=state.popups.length-1; upi>=0; upi--){
      var up = state.popups[upi];
      up.t += dt;
      if(up.t>0.9){ state.popups.splice(upi,1); }
    }
    if(shakeT>0) shakeT -= dt;
    // kill feed drain
    for(var kfi2=killFeed.length-1;kfi2>=0;kfi2--){ killFeed[kfi2].t+=dt; if(killFeed[kfi2].t>killFeed[kfi2].life) killFeed.splice(kfi2,1); }
    // fire meter decay + on-fire bonus tick
    if(fireMeter>0 && comboTimer<=0) fireMeter=Math.max(0,fireMeter-dt*0.06);
    if(fireBonus>0){ fireBonus-=dt; state.players.forEach(function(fp){ fp.speedBoost=Math.max(fp.speedBoost,0.12); fp.rapidFire=Math.max(fp.rapidFire,0.12); }); }
    // platform shake
    if(platShake>0){ platShakeX=(Math.random()-0.5)*platShake*8; platShakeY=(Math.random()-0.5)*platShake*4; platShake=Math.max(0,platShake-dt*5); } else { platShakeX=0; platShakeY=0; }
    // panda charge timer + cooldown
    if(pandaChargeTimer>0){ pandaChargeTimer-=dt; if(pandaChargeTimer<=0) pandaChargeCount=0; }
    if(pandaCooldown>0) pandaCooldown-=dt;
    // panda projectile update
    if(pandaProjectile){
      var pp3=pandaProjectile;
      pp3.t+=dt;
      if(pp3.phase==='flying'){
        pp3.x+=pp3.vx*dt; pp3.y+=pp3.vy*dt; pp3.vy+=700*dt;
        if(pp3.y>=370 || pp3.t>2.8){
          pp3.phase='sneezing'; pp3.sneezeT=0; pp3.y=Math.min(pp3.y,370);
          // sneeze effect: freeze + slow all state.enemies
          freezeT=Math.max(freezeT,3.5); slowT=Math.max(slowT,2.5);
          // big sneeze particle burst
          for(var si2=0;si2<40;si2++){
            state.particles.push({x:pp3.x+rand(-25,25),y:pp3.y+rand(-15,15),
              vx:rand(-250,250),vy:rand(-140,60),
              life:1.4,t:0,color:Math.random()<0.6?'#ccffee':'#aaddff',r:rand(5,16)});
          }
          screenFlash=0.45; screenFlashColor='#aaffcc'; shakeT=0.6; platShake=0.5;
          spawnPopup(pp3.x,pp3.y-40,'ACHOO!','#ffffff',52);
          pushKillFeed('PANDA SNEEZE! FREEZE!','#ccffee');
          playSound('wave2');
          haptic(60);
        }
      } else {
        pp3.sneezeT+=dt;
        if(pp3.sneezeT>2.5) pandaProjectile=null;
      }
    }

    // chase alert sound
    if(!chaseAlertPlayed && elapsed >= currentChaseDelay){ chaseAlertPlayed = true; playSound('chase'); }

    // power-ups: bob, expire, pickup
    for(var pui=state.powerups.length-1; pui>=0; pui--){
      var pu = state.powerups[pui];
      pu.bob += dt*3;
      pu.life -= dt;
      if(pu.life<=0){ state.powerups.splice(pui,1); continue; }
      var puBox = {x:pu.x-12, y:pu.y-12, w:24, h:24};
      var picked = false;
      for(var ppi=0; ppi<state.players.length && !picked; ppi++){
        var pp2 = state.players[ppi];
        if(rectsOverlap(pp2, puBox)){
          picked = true;
          var lvlPU2 = LEVELS[state.currentLocationId] && LEVELS[state.currentLocationId].locPowerup;
          if(pu.type==='speed') pp2.speedBoost = 6;
          else if(pu.type==='rapid') pp2.rapidFire = 6;
          else if(pu.type==='shield') pp2.shield = 6;
          else if(pu.type==='magnet') magnetT = 6;
          else if(pu.type==='ghost'){ pp2.invuln = 5; pp2.shield = 5; }
          else if(lvlPU2 && pu.type===lvlPU2.type){ lvlPU2.effect(pp2); }
          var puSnd = ['speed','rapid','shield','magnet','ghost'].indexOf(pu.type)>=0 ? 'powerup_'+pu.type : 'powerup_big';
          playSound(puSnd);
          var puNames = {speed:'FAST!', rapid:'RAPID!', shield:'SHIELD!', magnet:'MAGNET!', ghost:'GHOST MODE!'};
          var puLabel = (lvlPU2 && pu.type===lvlPU2.type) ? lvlPU2.label : (puNames[pu.type] || 'POWER!');
          var puColMap = {speed:'#ffd700', rapid:'#ff7800', shield:'#4499ff', magnet:'#ff44ff', ghost:'#aaffee'};
          var puCol = puColMap[pu.type] || ((lvlPU2 && pu.type===lvlPU2.type) ? lvlPU2.color : '#b0f0ff');
          pushKillFeed(puLabel+' ACTIVATED', puCol);
          spawnPopup(W/2, H/2-20, puLabel, puCol, 38);
          spawnParticles(pu.x, pu.y, puCol, 18);
          shakeT = 0.35; screenFlash = 0.7; screenFlashColor = puCol;
          puFlash = 1.4; puFlashLabel = puLabel; puFlashColor = puCol;
          usedPowerups[pu.type] = true;
          if(usedPowerups.speed && usedPowerups.rapid && usedPowerups.shield) unlockAchievement('powerup_all');
          state.powerups.splice(pui,1);
        }
      }
    }

    if(allClearDelay > 0) allClearDelay -= dt;
    if(smokeLevel > 0) smokeLevel = Math.max(0, smokeLevel - dt * 0.12);

    /* Paint blob update */
    for(var pbi=paintBlobs.length-1;pbi>=0;pbi--){
      var pb2 = paintBlobs[pbi];
      pb2.t += dt; pb2.x += pb2.vx*dt; pb2.y += pb2.vy*dt; pb2.vy += 400*dt;
      var pbHit = false;
      for(var pi2=0;pi2<state.players.length;pi2++){
        var pp = state.players[pi2];
        if(pp.invuln<=0 && Math.abs(pb2.x-(pp.x+pp.w/2))<20 && Math.abs(pb2.y-(pp.y+pp.h/2))<22){
          slowT = Math.max(slowT, 2.5);
          spawnPopup(pb2.x, pb2.y, 'PAINT SPLASH!', pb2.color, 13);
          spawnParticles(pb2.x, pb2.y, pb2.color, 10);
          haptic(30);
          pbHit = true; break;
        }
      }
      if(pb2.y > 445){ spawnParticles(pb2.x, 440, pb2.color, 5); pbHit = true; }
      if(pb2.t > pb2.life || pbHit) paintBlobs.splice(pbi,1);
    }

    if(state.enemiesLeft<=0 && allClearDelay<=0){
      if(state.waveNumber < 2){
        state.waveNumber++;
        chaseAlertPlayed = false;
        state.startTime = performance.now();
        var speedMult = 1 + state.waveNumber*0.3;
        var layout2 = LEVEL_LAYOUTS[state.currentLocationId];
        var variety2 = layout2 && layout2.enemyVariety;
        state.enemies = layout2.enemySpawns.map(function(s, si){
          var useSpecial = variety2 && Math.random() < variety2.waveRatio;
          var eType = useSpecial ? variety2.specialType : 'normal';
          var ew = eType==='parmesan'?44 : eType==='buckfast'?20 : eType==='motorbike'?42 : eType==='armoured'?34 : eType==='fast'?22 : 28;
          var eh = eType==='parmesan'?38 : eType==='buckfast'?26 : eType==='motorbike'?28 : eType==='armoured'?30 : eType==='fast'?20 : 26;
          var lvlSpd = (LEVELS[state.currentLocationId] && LEVELS[state.currentLocationId].levelPhysics && LEVELS[state.currentLocationId].levelPhysics.enemySpeed) || 1;
          var baseSpd2 = eType==='buckfast'?130 : eType==='parmesan'?50 : eType==='motorbike'?160 : eType==='armoured'?60 : eType==='fast'?110 : 85;
          var spd = baseSpd2 * speedMult * lvlSpd;
          var ehits2 = eType==='parmesan'?3 : eType==='armoured'?2 : 1;
          return { x:s.x, y:s.y, w:ew, h:eh, vx:spd, vy:0,
            dir: Math.random()<0.5?1:-1, platform:s.platform,
            state:'free', bubbleTimer:0, hopT:rand(1,3), angry:0, onGround:false,
            type:eType, hits:ehits2, wanderX:rand(40,680), wanderT:rand(3,9) };
        });
        state.enemiesLeft = state.enemies.length;
        /* Don't re-trigger all-clear if state.collectibles were already all taken in wave 1 */
        allClearFired = state.collectibles.length > 0 && state.collectibles.every(function(c){ return c.taken; });
        allClearDelay = 0;
        waveFlash = 2.5;
        spawnParticles(W/2, H/2, '#ff5470', 30);
        playSound('wave2');
      } else {
        winLevel();
      }
    }
  }

  function loseLife(p, knockDir){
    if(p.shield>0){ playSound('shield_block'); p.invuln = 0.5; return; }
    state.lives--;
    p.invuln = 1.6;
    p.vy = -340;
    p.vx = (knockDir||0) * 240;
    screenFlash = 0.35; screenFlashColor = '#ff1040';
    shakeT = 0.4;
    playSound(state.lives > 0 ? 'life_lost' : 'lose'); haptic(50);
    updateHud();
    if(state.lives > 0){
      p.speedBoost = Math.max(p.speedBoost, 1.4);
      spawnPopup(p.x+p.w/2, p.y-24, 'FIGHT BACK!', '#ff6644', 15);
      spawnParticles(p.x+p.w/2, p.y+p.h/2, '#ff8855', 8);
      pushKillFeed('LIFE LOST - '+state.lives+' LEFT', '#ff6644');
    }
    if(state.lives<=0){
      state.gameState = 'lost';
      stopMusic();
      if(campaignMode){
        // The adventure is a single run — no per-level retries. End it here.
        finishAdventure(false);
        return;
      }
      var loseSummaryText = survivalMode
        ? 'Reached wave ' + survivalWave + ' · Score: ' + state.score
        : 'Score ' + state.score + ' · try trapping enemies before they reach you.';
      showAdBreak(function(){
        document.getElementById('loseSummary').textContent = loseSummaryText;
        document.getElementById('overlayLose').hidden = false;
      });
    }
  }

  var winNextTimer = null;

  function getNextLocation(){
    var idx = -1;
    for(var i=0; i<LOCATIONS.length; i++){ if(LOCATIONS[i].id === state.currentLocationId){ idx=i; break; } }
    for(var i = idx+1; i < LOCATIONS.length; i++){
      if(LOCATIONS[i].unlocked) return LOCATIONS[i];
    }
    return null;
  }

  /* ---------- Endless Mode ---------- */
  var endlessMode = false;
  var endlessLoop = 0;
  var endlessSpeedMult = 1.0;
  var ENDLESS_ORDER = ['glasgow','modena','paris','ireland','kenya','tokyo','brazil','newyork','boss'];

  function startEndlessMode(){
    endlessMode = true;
    endlessLoop = 1;
    endlessSpeedMult = 1.0;
    state.currentLocationId = ENDLESS_ORDER[0];
    document.getElementById('overlayWin').hidden = true;
    resetGame();
    state.gameState = 'playing';
    startMusic();
  }

  function endlessNextLevel(){
    var idx = ENDLESS_ORDER.indexOf(state.currentLocationId);
    var nextIdx = (idx + 1) % ENDLESS_ORDER.length;
    if(nextIdx === 0){
      endlessLoop++;
      endlessSpeedMult *= 1.25;
      var best = safeGet('gh_endless_best', 0);
      if(endlessLoop > best){ safeSet('gh_endless_best', endlessLoop); }
    }
    state.currentLocationId = ENDLESS_ORDER[nextIdx];
    document.getElementById('overlayWin').hidden = true;
    resetGame();
    state.gameState = 'playing';
    startMusic();
  }

  function startNextLevel(loc){
    if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer = null; }
    document.getElementById('overlayWin').hidden = true;
    document.getElementById('winNextHint').hidden = true;
    document.getElementById('btnWinNext').hidden = true;
    state.currentLocationId = loc.id;
    resetGame();
    document.getElementById('howto').hidden = true;
    state.gameState = 'playing';
    startMusic();
  }

  // ── Campaign & mini-game system ──────────────────────────────────────────

  function getNextCampaignItem(){
    campaignStep++;
    if(campaignStep >= CAMPAIGN.length) return null;   // run complete
    var item = CAMPAIGN[campaignStep];
    campaignLastType = item.type;
    return item;
  }

  /* End of the run (cleared everything, or ran out of lives) — final score +
     the one leaderboard for the whole adventure. */
  function finishAdventure(won){
    if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer = null; }
    campaignMode = false;
    adventureComplete = true;
    survivalMode = false;
    state.gameState = 'won';
    stopMusic();
    playSound(won ? 'win' : 'lose');
    var reached = LEVELS[state.currentLocationId] ? LEVELS[state.currentLocationId].name : state.currentLocationId;
    var finalScore = state.score;

    document.getElementById('overlayLose').hidden = true;
    document.getElementById('winTitle').textContent = won ? 'Adventure complete!' : 'Adventure over';
    document.getElementById('winStars').textContent = won ? '★★★' : '';
    document.getElementById('winSummary').textContent = won
      ? ('You cleared every stop · final score ' + finalScore)
      : ('You made it to ' + reached + ' · final score ' + finalScore);
    var acEl = document.getElementById('winAchievements'); if(acEl) acEl.hidden = true;
    document.getElementById('btnWinNext').hidden = true;
    document.getElementById('winNextHint').hidden = true;
    var btnAgain = document.getElementById('btnWinAgain');
    if(btnAgain) btnAgain.textContent = 'New adventure';

    var pr = progress.adventure || {best:0};
    if(finalScore > (pr.best || 0)) pr.best = finalScore;
    progress.adventure = pr;
    safeSet('gh_progress_v2', progress);
    document.getElementById('hudBest').textContent = pr.best;

    var nameEntryRow = document.getElementById('nameEntryRow');
    var nameInput = document.getElementById('nameInput');
    var winScoreSubmit = document.getElementById('winScoreSubmit');
    if(window._resetLbSubmit) window._resetLbSubmit();
    winScoreSubmit.hidden = true;
    if(lbEnabled()){
      nameEntryRow.hidden = false;
      nameInput.value = pr.name || '';
      setTimeout(function(){ nameInput.focus(); }, 100);
    } else {
      nameEntryRow.hidden = true;
    }

    spawnCelebrationRain('#ffd700', '#7fe3ff');
    showAdBreak(function(){ document.getElementById('overlayWin').hidden = false; });
  }

  function startCampaignTransition(){
    if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer=null; }
    var el = document.getElementById('campaignOverlay');
    el.style.display = 'flex';
    el.style.opacity = '0';
    el.offsetHeight; // reflow
    el.style.transition = 'opacity 0.4s ease-in';
    el.style.opacity = '1';
    setTimeout(function(){
      document.getElementById('overlayWin').hidden = true;
      document.getElementById('overlayLose').hidden = true;
      document.getElementById('howto').hidden = true;
      var item = getNextCampaignItem();
      if(!item){
        el.style.display = 'none'; el.innerHTML = '';
        finishAdventure(true);
        return;
      }
      var stepNo = campaignStep + 1;
      var locName = item.type==='level' ? (LEVELS[item.id] ? LEVELS[item.id].name : item.id) : MINI_GAME_DEFS[item.id].title;
      var sub = item.type==='minigame' ? MINI_GAME_DEFS[item.id].subtitle : ('Stop ' + stepNo + ' of ' + CAMPAIGN.length);
      el.innerHTML = '<div style="color:#fff;font-family:Fredoka,sans-serif;font-size:42px;font-weight:bold;text-align:center;text-shadow:0 0 30px rgba(255,255,255,0.4);">'+locName+'</div>'
        +'<div style="color:#aabbc8;font-family:Nunito,sans-serif;font-size:20px;margin-top:10px;text-align:center;">'+sub+'</div>';
      if(item.type==='level'){
        campaignLastType = 'level';
        stopMusic();
        state.currentLocationId = item.id;
        resetGame(true);   // carry the cumulative score
        document.getElementById('hudLocation').textContent =
          LEVELS[item.id].name + '  ·  ' + stepNo + '/' + CAMPAIGN.length;
        document.getElementById('howto').hidden = true;
        state.gameState = 'playing';
        state.startTime = performance.now();
        startMusic();
      } else {
        campaignLastType = 'minigame';
        startMiniGame(item.id);
      }
      setTimeout(function(){
        el.style.transition = 'opacity 0.55s ease-out';
        el.style.opacity = '0';
        setTimeout(function(){ el.style.display='none'; el.innerHTML=''; }, 580);
      }, 500);
    }, 420);
  }

  /* ── Kill feed ───────────────────────────────────────────────────────────── */
  function pushKillFeed(text, color){
    killFeed.unshift({text:text, color:color||'#fff', t:0, life:3.2});
    if(killFeed.length > 5) killFeed.length = 5;
  }

  /* ── Celebration confetti rain ───────────────────────────────────────────── */
  function spawnCelebrationRain(col1, col2){
    for(var i=0; i<50; i++){
      state.particles.push({
        x:rand(0,W), y:rand(-50,-5),
        vx:rand(-70,70), vy:rand(100,260),
        life:rand(1.5,3.2), t:0,
        color:Math.random()<0.5?col1:col2, r:rand(4,10)
      });
    }
  }

  /* ── Mini-game procedural music ─────────────────────────────────────────── */
  function stopMiniGameMusic(){
    if(miniGameMusicHandle){ clearTimeout(miniGameMusicHandle); miniGameMusicHandle = null; }
  }

  function startMiniGameMusic(id){
    stopMiniGameMusic();
    try{
      var a = ac();
      var mg = getMasterGain();
      var vol = muted ? 0 : Math.min(1, parseFloat(document.getElementById('volSlider').value)) * 0.38;

      /* shared helper: schedule a single note */
      function note(freq, startAt, dur, type, gain){
        var osc = a.createOscillator();
        var env = a.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, startAt);
        env.gain.linearRampToValueAtTime(gain * vol, startAt + 0.01);
        env.gain.setValueAtTime(gain * vol, startAt + dur * 0.7);
        env.gain.linearRampToValueAtTime(0, startAt + dur);
        osc.connect(env); env.connect(mg);
        osc.start(startAt); osc.stop(startAt + dur + 0.01);
      }

      /* noise burst for snare */
      function noise(startAt, dur, gain){
        try{
          var buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
          var d = buf.getChannelData(0);
          for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
          var src = a.createBufferSource();
          var env = a.createGain();
          var flt = a.createBiquadFilter();
          flt.type = 'highpass'; flt.frequency.value = 2200;
          src.buffer = buf;
          env.gain.setValueAtTime(gain*vol, startAt);
          env.gain.linearRampToValueAtTime(0, startAt+dur);
          src.connect(flt); flt.connect(env); env.connect(mg);
          src.start(startAt); src.stop(startAt+dur+0.01);
        }catch(e){}
      }

      if(id === 'mediterranean'){
        /* Gentle 80 BPM waltz — C major arpeggios, sine melody + triangle bass */
        var bpm = 80, beat = 60/bpm, bar = beat*3; // 3/4 time
        var melody = [261.63,329.63,392,329.63, 261.63,329.63,440,329.63,
                      293.66,349.23,440,349.23, 261.63,392,523.25,392];
        var bass   = [130.81,130.81,130.81,130.81, 130.81,130.81,130.81,130.81,
                      146.83,146.83,146.83,146.83, 130.81,130.81,130.81,130.81];
        var totalBars = 4;
        function schedMed(){
          if(!miniGameId || miniGameId!=='mediterranean') return;
          var now = a.currentTime + 0.05;
          for(var i=0;i<melody.length;i++){
            var t = now + i*(beat*0.75);
            note(melody[i], t, beat*0.65, 'sine',   0.55);
            note(bass[i],   t, beat*0.9,  'triangle',0.35);
          }
          var loopMs = melody.length * beat * 0.75 * 1000;
          miniGameMusicHandle = setTimeout(schedMed, loopMs - 80);
        }
        schedMed();

      } else if(id === 'krakow'){
        /* Lively 130 BPM polka — sawtooth melody + oom-pah bass */
        var bpm = 130, beat = 60/bpm, bar = beat*2;
        var melFreqs = [329.63,392,440,523.25, 392,329.63,293.66,261.63,
                        293.66,329.63,349.23,392, 261.63,261.63,392,523.25];
        var oomFreqs  = [130.81,196,130.81,196, 146.83,220,146.83,220,
                         130.81,196,130.81,196,  130.81,196,196,261.63];
        function schedKrak(){
          if(!miniGameId || miniGameId!=='krakow') return;
          var now = a.currentTime + 0.05;
          for(var i=0;i<melFreqs.length;i++){
            var t = now + i*beat*0.5;
            note(melFreqs[i], t, beat*0.42, 'sawtooth', 0.4);
            note(oomFreqs[i], t, beat*0.48, 'square',   0.3);
          }
          var loopMs = melFreqs.length * beat * 0.5 * 1000;
          miniGameMusicHandle = setTimeout(schedKrak, loopMs - 80);
        }
        schedKrak();

      } else if(id === 'berlin'){
        /* 130 BPM driving techno: four-on-the-floor kick, off-beat open hats,
           rolling acid bassline through a resonant lowpass, sparse stab. */
        var bpm = 130, beat = 60/bpm;
        // 16-step sequencer (sixteenth notes). Acid bass pattern in A minor.
        var acidSeq  = [110,0,110,220, 110,0,164.81,110, 110,0,110,130.81, 110,146.83,0,110];
        var acidAccent=[1,  0,0,  1,   0,  0,1,     0,   1,  0,0,  0,      0,  1,     0,0];
        var stabSeq  = [0,0,0,0, 220,0,0,0, 0,0,0,0, 261.63,0,293.66,0];

        /* short filtered-noise hi-hat */
        function hat(startAt, dur, gain){
          try{
            var buf = a.createBuffer(1, Math.ceil(a.sampleRate*dur), a.sampleRate);
            var d = buf.getChannelData(0);
            for(var i=0;i<d.length;i++) d[i]=(Math.random()*2-1);
            var src = a.createBufferSource(); src.buffer = buf;
            var flt = a.createBiquadFilter(); flt.type='highpass'; flt.frequency.value=8000;
            var env = a.createGain();
            env.gain.setValueAtTime(gain*vol, startAt);
            env.gain.exponentialRampToValueAtTime(0.0001, startAt+dur);
            src.connect(flt); flt.connect(env); env.connect(mg);
            src.start(startAt); src.stop(startAt+dur+0.01);
          }catch(e){}
        }
        /* resonant filtered saw — the "acid" voice */
        function acid(freq, startAt, dur, gain, accent){
          var osc = a.createOscillator(); osc.type='sawtooth'; osc.frequency.value=freq;
          var flt = a.createBiquadFilter(); flt.type='lowpass';
          flt.Q.value = accent ? 14 : 8;
          var fEnd = accent ? 320 : 180;
          flt.frequency.setValueAtTime(accent ? 2600 : 1400, startAt);
          flt.frequency.exponentialRampToValueAtTime(fEnd, startAt+dur);
          var env = a.createGain();
          env.gain.setValueAtTime(0, startAt);
          env.gain.linearRampToValueAtTime(gain*vol*(accent?1.3:1), startAt+0.008);
          env.gain.exponentialRampToValueAtTime(0.0001, startAt+dur);
          osc.connect(flt); flt.connect(env); env.connect(mg);
          osc.start(startAt); osc.stop(startAt+dur+0.02);
        }
        function schedBerlin(){
          if(!miniGameId || miniGameId!=='berlin') return;
          var now = a.currentTime + 0.05;
          var sixteenth = beat*0.25;
          for(var i=0;i<16;i++){
            var t = now + i*sixteenth;
            /* four-on-the-floor kick on every beat */
            if(i%4===0){
              var ok = a.createOscillator(), ek = a.createGain();
              ok.type='sine';
              ok.frequency.setValueAtTime(170, t);
              ok.frequency.exponentialRampToValueAtTime(42, t+0.14);
              ek.gain.setValueAtTime(1.0*vol, t);
              ek.gain.exponentialRampToValueAtTime(0.001, t+0.26);
              ok.connect(ek); ek.connect(mg);
              ok.start(t); ok.stop(t+0.27);
            }
            /* closed hat every sixteenth, louder open hat on the off-beat */
            hat(t, (i%4===2) ? 0.11 : 0.035, (i%4===2) ? 0.22 : 0.12);
            /* clap layered on 2 and 4 */
            if(i===4||i===12) noise(t, 0.14, 0.4);
            /* acid bass */
            if(acidSeq[i] > 0) acid(acidSeq[i], t, sixteenth*1.05, 0.34, acidAccent[i]);
            /* sparse detuned stab */
            if(stabSeq[i] > 0){
              note(stabSeq[i], t, beat*0.5, 'sawtooth', 0.16);
              note(stabSeq[i]*1.5, t, beat*0.5, 'square', 0.10);
            }
          }
          var loopMs = 16 * sixteenth * 1000;
          miniGameMusicHandle = setTimeout(schedBerlin, loopMs - 80);
        }
        schedBerlin();

      } else if(id === 'london'){
        /* British military march — 120 BPM, 4/4, brass square-wave melody + snare + bass */
        var bpm = 120, beat = 60/bpm;
        // Rule Britannia-esque motif: C D E G E D C - G A B G
        var marchMel = [261.63,293.66,329.63,392,329.63,293.66,261.63,0,
                        196,220,246.94,196,261.63,0,329.63,261.63];
        var marchBass= [65.41,65.41,65.41,65.41, 98,98,98,98,
                        65.41,65.41,65.41,65.41, 65.41,65.41,65.41,65.41];
        function schedLondon(){
          if(!miniGameId || miniGameId!=='london') return;
          var now = a.currentTime + 0.05;
          for(var i=0;i<16;i++){
            var t = now + i*beat*0.5;
            if(marchMel[i]>0) note(marchMel[i], t, beat*0.42, 'square', 0.28);
            note(marchBass[i], t, beat*0.48, 'triangle', 0.32);
            // Snare on beats 2 and 4
            if(i===4||i===12) noise(t, 0.12, 0.45);
            // Kick on 1 and 3
            if(i===0||i===8){
              var ok2=a.createOscillator(), ek2=a.createGain();
              ok2.type='sine'; ok2.frequency.setValueAtTime(140,t); ok2.frequency.exponentialRampToValueAtTime(40,t+0.14);
              ek2.gain.setValueAtTime(0.75*vol,t); ek2.gain.exponentialRampToValueAtTime(0.001,t+0.18);
              ok2.connect(ek2); ek2.connect(mg); ok2.start(t); ok2.stop(t+0.2);
            }
          }
          var loopMs = 16 * beat * 0.5 * 1000;
          miniGameMusicHandle = setTimeout(schedLondon, loopMs - 80);
        }
        schedLondon();

      } else if(id === 'pamplona'){
        /* Spanish flamenco — 140 BPM, Phrygian mode (E Phrygian), sawtooth guitar strums + palmas */
        var bpm = 140, beat = 60/bpm;
        // E Phrygian motif: E F G A B C D E
        var flamMel = [329.63,349.23,392,440,493.88,523.25,587.33,659.25,
                       493.88,440,392,349.23,329.63,0,329.63,0];
        var flamBass= [82.41,87.31,98,82.41, 82.41,87.31,98,82.41,
                       82.41,87.31,82.41,82.41, 82.41,82.41,82.41,82.41];
        function schedPamplona(){
          if(!miniGameId || miniGameId!=='pamplona') return;
          var now = a.currentTime + 0.05;
          for(var i=0;i<16;i++){
            var t = now + i*beat*0.5;
            if(flamMel[i]>0) note(flamMel[i], t, beat*0.38, 'sawtooth', 0.32);
            note(flamBass[i], t, beat*0.52, 'sawtooth', 0.28);
            // Palmas (hand claps) — noise bursts on syncopated beats
            if(i===2||i===5||i===10||i===13) noise(t, 0.08, 0.38);
            // Stomp on 1 and 9
            if(i===0||i===8){
              var os2=a.createOscillator(), es2=a.createGain();
              os2.type='sine'; os2.frequency.setValueAtTime(90,t); os2.frequency.exponentialRampToValueAtTime(30,t+0.12);
              es2.gain.setValueAtTime(0.65*vol,t); es2.gain.exponentialRampToValueAtTime(0.001,t+0.16);
              os2.connect(es2); es2.connect(mg); os2.start(t); os2.stop(t+0.18);
            }
          }
          var loopMs = 16 * beat * 0.5 * 1000;
          miniGameMusicHandle = setTimeout(schedPamplona, loopMs - 80);
        }
        schedPamplona();
      }
    }catch(e){}
  }

  function startMiniGame(id){
    miniGameId = id;
    miniGameTimer = MINI_GAME_DEFS[id].timeLimit;
    miniGamePhase = 'playing';
    state.gameState = 'minigame';
    stopMusic();
    startMiniGameMusic(id);
    document.querySelector('.hud').style.visibility = 'hidden';
    if(id === 'mediterranean'){
      miniGameData = {boatX:80, oarSide:'left', oarAnimL:0, oarAnimR:0, needed:34, clicks:0, wavePhase:0};
    } else if(id === 'krakow'){
      miniGameData = {beetroots:[], collected:0, needed:28, soupLevel:0, splashT:0};
      for(var bsi=0;bsi<6;bsi++) mgSpawnBeetroot();
    } else if(id === 'berlin'){
      var bCols=['#ff44cc','#44ccff','#ffcc00','#ff4444','#44ff88'];
      miniGameData = {
        spots:[{x:130,y:355},{x:240,y:375},{x:360,y:360},{x:480,y:375},{x:590,y:355}].map(function(sp,i){
          return {x:sp.x,y:sp.y,r:36,color:bCols[i],lit:false,litT:0,hitAnim:0};
        }),
        activeSpot:-1, litDuration:0.72, litTimer:0, hits:0, needed:28, beatT:0, beamPhase:0
      };
      mgActivateSpot();
    } else if(id === 'london'){
      miniGameData = {guards:[], knocked:0, needed:16, spawnT:0, speedMult:1};
      mgSpawnGuard(); mgSpawnGuard();
    } else if(id === 'pamplona'){
      miniGameData = {pens:[], freed:0, needed:13, spawnT:0};
      for(var psi=0;psi<4;psi++) mgSpawnPen();
    }
  }

  function mgSpawnGuard(){
    var fromLeft = Math.random()<0.5;
    var spd = (70 + Math.random()*30) * miniGameData.speedMult;
    miniGameData.guards.push({
      x: fromLeft ? -40 : W+40, y: 300,
      vx: fromLeft ? spd : -spd, dir: fromLeft ? 1 : -1,
      crownKnocked:false, crownOffX:0, crownOffY:0, crownVx:0, crownVy:0,
      walkPhase:Math.random()*TAU
    });
  }

  function mgSpawnPen(){
    var cols = ['#8b0000','#a01010','#6b0000','#900000'];
    miniGameData.pens.push({
      x:rand(60,W-110), y:rand(140,300),
      freed:false, gateOpen:0, bullX:0, bullVx:0, bullRunning:false,
      color:cols[Math.floor(Math.random()*cols.length)],
      hitAnim:0
    });
  }

  function mgSpawnBeetroot(){
    miniGameData.beetroots.push({x:rand(80,640), y:rand(60,310), r:rand(20,28), bob:Math.random()*TAU});
  }

  function mgActivateSpot(){
    var d = miniGameData;
    d.spots.forEach(function(s){ s.lit=false; });
    d.activeSpot = Math.floor(Math.random()*d.spots.length);
    d.spots[d.activeSpot].lit = true;
    d.litTimer = d.litDuration;
  }

  function updateMiniGame(dt){
    if(miniGamePhase !== 'playing') return;
    miniGameTimer -= dt;
    if(miniGameId === 'mediterranean'){
      miniGameData.wavePhase += dt*1.2;
      miniGameData.oarAnimL = Math.max(0, miniGameData.oarAnimL - dt*4);
      miniGameData.oarAnimR = Math.max(0, miniGameData.oarAnimR - dt*4);
      if(miniGameData.clicks >= miniGameData.needed) finishMiniGame(true);
      else if(miniGameTimer <= 0) finishMiniGame(false);
    } else if(miniGameId === 'krakow'){
      miniGameData.splashT = Math.max(0, miniGameData.splashT - dt*2);
      miniGameData.beetroots.forEach(function(b){ b.bob += dt*2; });
      if(miniGameData.collected >= miniGameData.needed) finishMiniGame(true);
      else if(miniGameTimer <= 0) finishMiniGame(false);
    } else if(miniGameId === 'berlin'){
      miniGameData.beatT += dt;
      miniGameData.beamPhase += dt*0.7;
      miniGameData.litTimer -= dt;
      miniGameData.spots.forEach(function(s){ s.hitAnim=Math.max(0,(s.hitAnim||0)-dt*3); });
      if(miniGameData.litTimer <= 0) mgActivateSpot();
      if(miniGameData.hits >= miniGameData.needed) finishMiniGame(true);
      else if(miniGameTimer <= 0) finishMiniGame(false);
    } else if(miniGameId === 'london'){
      var d = miniGameData;
      d.spawnT -= dt;
      // Increase speed over time
      d.speedMult = 1 + (1 - Math.max(0, miniGameTimer) / MINI_GAME_DEFS.london.timeLimit) * 1.7;
      if(d.spawnT <= 0 && d.guards.length < 6){
        mgSpawnGuard(); d.spawnT = 0.85 + Math.random()*0.6;
      }
      for(var gi=d.guards.length-1;gi>=0;gi--){
        var g = d.guards[gi];
        g.x += g.vx * d.speedMult * dt;
        g.walkPhase += dt * 3.5;
        if(g.crownKnocked){
          g.crownOffX += g.crownVx * dt;
          g.crownOffY += g.crownVy * dt;
          g.crownVy += 280 * dt;
        }
        if(g.x < -80 || g.x > W+80) d.guards.splice(gi,1);
      }
      if(d.knocked >= d.needed) finishMiniGame(true);
      else if(miniGameTimer <= 0) finishMiniGame(false);
    } else if(miniGameId === 'pamplona'){
      var d = miniGameData;
      d.spawnT -= dt;
      if(d.spawnT <= 0 && d.pens.length < 6 && d.freed < d.needed){
        mgSpawnPen(); d.spawnT = 1.1 + Math.random()*0.75;
      }
      for(var pi2=0;pi2<d.pens.length;pi2++){
        var pen = d.pens[pi2];
        pen.hitAnim = Math.max(0, (pen.hitAnim||0) - dt*3);
        if(pen.freed){
          pen.gateOpen = Math.min(1, pen.gateOpen + dt*3);
          if(pen.gateOpen >= 1){
            pen.bullRunning = true;
            pen.bullX += pen.bullVx * dt;
          }
        }
      }
      // Remove bulls that ran off screen
      d.pens = d.pens.filter(function(pen){
        return !pen.bullRunning || (pen.bullX > -80 && pen.bullX < W+80);
      });
      if(d.freed >= d.needed) finishMiniGame(true);
      else if(miniGameTimer <= 0) finishMiniGame(false);
    }
  }

  function finishMiniGame(won){
    if(miniGamePhase !== 'playing') return;
    stopMiniGameMusic();
    miniGamePhase = won ? 'won' : 'lost';
    if(won){
      var def = MINI_GAME_DEFS[miniGameId];
      unlockedCosmetics[def.reward] = true;
      try{ localStorage.setItem('bbl_cosmetics', JSON.stringify(unlockedCosmetics)); }catch(e){}
      if(campaignMode){
        powerCharges++;
        pushKillFeed('⚡ ' + def.power + ' earned — press E to unleash it', '#7fe3ff');
      }
      playSound('win'); haptic(30);
    } else {
      playSound('lose');
    }
    setTimeout(function(){
      var finId = miniGameId;
      miniGameId = null; miniGameData = {};
      document.querySelector('.hud').style.visibility = '';
      if(campaignMode) startCampaignTransition();
    }, won ? 2500 : 2000);
  }

  function handleMiniGameClick(ex, ey){
    if(!miniGameId || miniGamePhase !== 'playing') return;
    var r = cv.getBoundingClientRect();
    var cx2 = (ex - r.left) * (W / r.width);
    var cy2 = (ey - r.top) * (H / r.height);
    if(miniGameId === 'mediterranean'){
      var d = miniGameData;
      var isLeft = cx2 < W/2;
      if(isLeft && d.oarSide==='left'){ d.oarAnimL=1; d.clicks++; d.oarSide='right'; playSound('minigame_oar'); haptic(10); }
      else if(!isLeft && d.oarSide==='right'){ d.oarAnimR=1; d.clicks++; d.oarSide='left'; playSound('minigame_oar'); haptic(10); }
    } else if(miniGameId === 'krakow'){
      var d = miniGameData;
      for(var bi4=d.beetroots.length-1;bi4>=0;bi4--){
        var b = d.beetroots[bi4];
        var dx = cx2-b.x, dy = cy2-b.y;
        if(dx*dx+dy*dy < (b.r+14)*(b.r+14)){
          d.beetroots.splice(bi4,1); d.collected++; d.soupLevel=d.collected/d.needed; d.splashT=1;
          playSound('minigame_beetroot'); haptic(15); mgSpawnBeetroot(); break;
        }
      }
    } else if(miniGameId === 'berlin'){
      var d = miniGameData;
      if(d.activeSpot < 0) return;
      var s = d.spots[d.activeSpot];
      if(s && s.lit){
        var dx2=cx2-s.x, dy2=cy2-s.y;
        if(dx2*dx2+dy2*dy2 < (s.r+14)*(s.r+14)){
          d.hits++; s.hitAnim=1; s.lit=false;
          playSound('minigame_spot'); haptic(15); mgActivateSpot();
        }
      }
    } else if(miniGameId === 'london'){
      var d = miniGameData;
      for(var gi2=0;gi2<d.guards.length;gi2++){
        var g2 = d.guards[gi2];
        if(g2.crownKnocked) continue;
        // Crown sits on guard's head ~(g2.x, g2.y - 52)
        var cdx = cx2 - g2.x, cdy = cy2 - (g2.y - 52);
        if(cdx*cdx < 22*22 && cdy*cdy < 22*22){
          g2.crownKnocked = true;
          g2.crownVx = (Math.random()-0.5)*160;
          g2.crownVy = -(80 + Math.random()*80);
          d.knocked++;
          playSound('pop_glasgow'); haptic(20);
          break;
        }
      }
    } else if(miniGameId === 'pamplona'){
      var d = miniGameData;
      for(var pi3=0;pi3<d.pens.length;pi3++){
        var pen2 = d.pens[pi3];
        if(pen2.freed) continue;
        // Gate area: right side of pen rect
        var gdx = cx2 - (pen2.x + 90), gdy = cy2 - (pen2.y + 30);
        if(gdx > -30 && gdx < 30 && gdy > -40 && gdy < 40){
          pen2.freed = true;
          pen2.bullX = pen2.x + 60;
          pen2.bullVx = pen2.x < W/2 ? 280 : -280;
          d.freed++;
          pen2.hitAnim = 1;
          playSound('pop_ireland'); haptic(20);
        }
      }
    }
  }

  function drawMiniGame(){
    var def = MINI_GAME_DEFS[miniGameId];
    ctx.save();
    if(miniGameId==='mediterranean') drawMgMediterranean();
    else if(miniGameId==='krakow') drawMgKrakow();
    else if(miniGameId==='berlin') drawMgBerlin();
    else if(miniGameId==='london') drawMgLondon();
    else if(miniGameId==='pamplona') drawMgPamplona();
    // Timer bar
    var tr = Math.max(0, miniGameTimer/def.timeLimit);
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,8);
    ctx.fillStyle = tr>0.5?'#44ff88':tr>0.25?'#ffcc00':'#ff4444';
    ctx.fillRect(0,0,W*tr,8);
    // Win / lose overlay
    if(miniGamePhase==='won'){
      ctx.fillStyle='rgba(0,20,0,0.68)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#44ff88'; ctx.font='bold 56px "Fredoka",sans-serif'; ctx.textAlign='center';
      ctx.fillText('NICE ONE!',W/2,H/2-22);
      ctx.fillStyle='#ffd700'; ctx.font='26px "Fredoka",sans-serif';
      ctx.fillText('You got the '+def.rewardLabel+'!',W/2,H/2+28);
    } else if(miniGamePhase==='lost'){
      ctx.fillStyle='rgba(30,0,0,0.68)'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#ff4444'; ctx.font='bold 56px "Fredoka",sans-serif'; ctx.textAlign='center';
      ctx.fillText('SO CLOSE!',W/2,H/2-22);
      ctx.fillStyle='#fff'; ctx.font='24px "Fredoka",sans-serif';
      ctx.fillText('Maybe next time…',W/2,H/2+28);
    }
    ctx.restore();
  }

  function drawMgMediterranean(){
    var d = miniGameData;
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#1a6fbe'); sky.addColorStop(0.5,'#2ea8d5'); sky.addColorStop(1,'#1e7ec8');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffe87c'; ctx.beginPath(); ctx.arc(594,75,46,0,TAU); ctx.fill();
    // Distant coast
    ctx.fillStyle='#c8b480'; ctx.beginPath(); ctx.moveTo(0,165);
    for(var ci6=0;ci6<=720;ci6+=45){ ctx.lineTo(ci6,150+Math.sin(ci6*0.016)*18+Math.sin(ci6*0.027)*9); }
    ctx.lineTo(720,195); ctx.lineTo(0,195); ctx.closePath(); ctx.fill();
    // Waves
    for(var wl=0;wl<3;wl++){
      ctx.fillStyle=wl===0?'#1e6eb5':wl===1?'#1a7ed8':'#2490e8';
      ctx.beginPath(); ctx.moveTo(0,238+wl*18);
      for(var wx=0;wx<=720;wx+=32){ ctx.lineTo(wx,238+wl*18+Math.sin(d.wavePhase+wx*0.018+wl*1.2)*10); }
      ctx.lineTo(720,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    }
    // Boat
    var bx = 80 + (d.clicks/d.needed)*(560), by=252;
    ctx.fillStyle='#a0622a';
    ctx.beginPath(); ctx.moveTo(bx-52,by); ctx.lineTo(bx+52,by); ctx.lineTo(bx+40,by+26); ctx.lineTo(bx-40,by+26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#7a4418'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#c8844a'; ctx.fillRect(bx-36,by+6,72,14);
    // Mast + sail
    ctx.strokeStyle='#7a4418'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx,by-50); ctx.stroke();
    ctx.fillStyle='rgba(240,235,220,0.9)';
    ctx.beginPath(); ctx.moveTo(bx,by-48); ctx.lineTo(bx+28,by-28); ctx.lineTo(bx,by-10); ctx.closePath(); ctx.fill();
    // Oars
    var oarLA = 0.28+d.oarAnimL*0.42, oarRA = -0.28-d.oarAnimR*0.42;
    ctx.strokeStyle='#a0622a'; ctx.lineWidth=5; ctx.lineCap='round';
    ctx.save(); ctx.translate(bx-20,by+10); ctx.rotate(oarLA);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-46,22); ctx.stroke();
    ctx.fillStyle='#c8844a'; ctx.beginPath(); ctx.ellipse(-49,24,10,5,0.3,0,TAU); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(bx+20,by+10); ctx.rotate(oarRA);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(46,22); ctx.stroke();
    ctx.fillStyle='#c8844a'; ctx.beginPath(); ctx.ellipse(49,24,10,5,-0.3,0,TAU); ctx.fill();
    ctx.restore();
    // Click targets
    var pulse = 0.38+Math.sin(performance.now()*0.006)*0.25;
    ctx.globalAlpha = d.oarSide==='left'?pulse:0.14;
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(120,385,58,0,TAU); ctx.fill();
    ctx.globalAlpha = d.oarSide==='right'?pulse:0.14;
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(600,385,58,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='#fff'; ctx.font='bold 15px "Fredoka",sans-serif'; ctx.textAlign='center';
    ctx.fillText(d.oarSide==='left'?'◄ ROW':'◄',120,391);
    ctx.fillText(d.oarSide==='right'?'ROW ►':'►',600,391);
    ctx.fillStyle='rgba(255,255,255,0.82)'; ctx.font='bold 18px "Fredoka",sans-serif';
    ctx.fillText('Alternate left and right oars to row across!',W/2,463);
  }

  function drawMgKrakow(){
    var d = miniGameData;
    var bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#f5e8c8'); bg.addColorStop(1,'#e0d0a0');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
    // Wall
    ctx.fillStyle='#c8a060'; ctx.fillRect(0,18,W,18);
    ctx.fillStyle='#b89050'; ctx.fillRect(0,36,W,4);
    // Floor tiles
    for(var tfy=295;tfy<H;tfy+=44){
      for(var tfx=0;tfx<W;tfx+=44){
        ctx.fillStyle=(Math.floor(tfx/44)+Math.floor(tfy/44))%2===0?'#d8c088':'#e8d0a0';
        ctx.fillRect(tfx,tfy,44,44);
      }
    }
    // Soup pot
    var potX=W/2, potY=392;
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(potX-108,potY-16,24,12); ctx.fillRect(potX+84,potY-16,24,12);
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.ellipse(potX,potY,88,52,0,0,TAU); ctx.fill();
    ctx.fillStyle='#444'; ctx.fillRect(potX-82,potY-30,164,52);
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.ellipse(potX,potY+22,82,48,0,0,TAU); ctx.fill();
    // Soup
    if(d.soupLevel > 0){
      ctx.save(); ctx.beginPath(); ctx.ellipse(potX,potY+22,78,44,0,0,TAU); ctx.clip();
      var sH = d.soupLevel*46;
      ctx.fillStyle='#7a1a3a'; ctx.fillRect(potX-82,potY+66-sH,164,sH);
      ctx.fillStyle='#a03050'; ctx.beginPath(); ctx.ellipse(potX,potY+66-sH,78,13,0,0,TAU); ctx.fill();
      ctx.restore();
    }
    if(d.splashT > 0){
      ctx.save(); ctx.globalAlpha=d.splashT*0.8; ctx.fillStyle='#8b2f4a';
      [-24,-8,8,24,0].forEach(function(ox,i){
        ctx.beginPath(); ctx.arc(potX+ox,potY-52+i*4,4+i*1.5,0,TAU); ctx.fill();
      });
      ctx.restore();
    }
    // Beetroots
    d.beetroots.forEach(function(b){
      var wob = Math.sin(b.bob)*4;
      ctx.save(); ctx.translate(b.x,b.y+wob);
      ctx.fillStyle='#7a1a3a'; ctx.beginPath(); ctx.ellipse(0,4,b.r,b.r*1.1,0,0,TAU); ctx.fill();
      ctx.fillStyle='#a03050'; ctx.beginPath(); ctx.ellipse(-b.r*0.3,-b.r*0.22,b.r*0.38,b.r*0.28,0,0,TAU); ctx.fill();
      ctx.strokeStyle='#3a8a2a'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-3,-b.r); ctx.quadraticCurveTo(-8,-b.r-12,-4,-b.r-18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,-b.r); ctx.quadraticCurveTo(8,-b.r-10,6,-b.r-18); ctx.stroke();
      ctx.fillStyle='#3a8a2a';
      ctx.beginPath(); ctx.ellipse(-4,-b.r-18,8,5,0.4,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6,-b.r-18,7,5,-0.4,0,TAU); ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle='#5a1a2a'; ctx.font='bold 22px "Fredoka",sans-serif'; ctx.textAlign='center';
    ctx.fillText('Beetroot Soup — '+d.collected+'/'+d.needed,W/2,50);
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='16px "Fredoka",sans-serif';
    ctx.fillText('Click the beetroots to throw them in!',W/2,462);
  }

  function drawMgBerlin(){
    var d = miniGameData;
    ctx.fillStyle='#0a0816'; ctx.fillRect(0,0,W,H);
    // Laser beams
    ['#ff00cc','#00ccff','#ffcc00','#ff4400'].forEach(function(col,i){
      ctx.save(); ctx.globalAlpha=0.12+Math.sin(d.beamPhase+i*1.6)*0.07;
      ctx.fillStyle=col;
      var bx=100+i*175;
      ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx-26,H); ctx.lineTo(bx+26,H); ctx.lineTo(bx+52,0); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // Dance floor
    var fg = ctx.createLinearGradient(0,298,0,H);
    fg.addColorStop(0,'rgba(38,10,58,0.92)'); fg.addColorStop(1,'rgba(14,5,28,1)');
    ctx.fillStyle=fg; ctx.fillRect(0,298,W,H-298);
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
    for(var gx=0;gx<W;gx+=62){ ctx.beginPath(); ctx.moveTo(gx,298); ctx.lineTo(gx,H); ctx.stroke(); }
    for(var gy=298;gy<H;gy+=40){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }
    // Crowd
    ctx.fillStyle='#14101e';
    [52,115,195,275,360,445,525,605,668].forEach(function(px,i){
      var ph=264+(i%3)*7;
      ctx.beginPath(); ctx.arc(px,ph,14+(i%4)*3,0,TAU); ctx.fill();
      ctx.fillRect(px-10,ph,20,46);
    });
    // Dance spots
    d.spots.forEach(function(s){
      var pulse = s.lit ? (0.68+Math.sin(performance.now()*0.01)*0.28) : 0.14;
      var sg = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*1.9);
      sg.addColorStop(0,s.lit?s.color:'rgba(80,80,80,0.15)'); sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha=pulse; ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*1.9,0,TAU); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha=s.lit?pulse:0.22;
      ctx.fillStyle=s.lit?s.color:'#333'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.fill();
      if(s.hitAnim>0){
        ctx.globalAlpha=s.hitAnim; ctx.strokeStyle='#fff'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r*(1+s.hitAnim*0.7),0,TAU); ctx.stroke();
      }
      ctx.restore();
      if(s.lit){
        ctx.fillStyle='#fff'; ctx.font='bold 16px "Fredoka",sans-serif'; ctx.textAlign='center';
        ctx.fillText('TAP!',s.x,s.y+6);
      }
    });
    // Beat pulse
    var bp = Math.sin(d.beatT*(128/60)*TAU);
    if(bp>0.82){ ctx.save(); ctx.globalAlpha=(bp-0.82)*0.6; ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(W/2,H/2,18+bp*14,0,TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle='#fff'; ctx.font='bold 20px "Fredoka",sans-serif'; ctx.textAlign='center';
    ctx.fillText('Hits: '+d.hits+'/'+d.needed,W/2,30);
    ctx.fillStyle='rgba(200,200,200,0.8)'; ctx.font='14px "Fredoka",sans-serif';
    ctx.fillText('Tap the glowing spots!',W/2,462);
  }

  function drawMgLondon(){
    var d = miniGameData;
    // Sky and palace background
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#c8d8f0'); sky.addColorStop(1,'#e8eef8');
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
    // Ground
    ctx.fillStyle='#4a7a3a'; ctx.fillRect(0,380,W,H-380);
    ctx.fillStyle='#5a9a4a'; ctx.fillRect(0,380,W,14);
    // Palace facade (simplified)
    ctx.fillStyle='#e8e0cc'; ctx.fillRect(100,140,520,240);
    ctx.fillStyle='#d8d0bc'; ctx.fillRect(100,140,520,18);
    // Columns
    for(var ci7=0;ci7<9;ci7++){
      var colX=130+ci7*56;
      ctx.fillStyle='#ddd5c0'; ctx.fillRect(colX,158,14,192);
      ctx.fillStyle='#ccc5b0'; ctx.fillRect(colX,152,16,10);
    }
    // Gate posts
    ctx.fillStyle='#1a1a1a'; ctx.fillRect(280,320,20,80); ctx.fillRect(420,320,20,80);
    ctx.fillStyle='#ffd700';
    ctx.beginPath(); ctx.arc(290,322,8,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(430,322,8,0,TAU); ctx.fill();
    // Union Jack flag
    ctx.fillStyle='#012169'; ctx.fillRect(340,90,80,52);
    ctx.fillStyle='#fff';
    ctx.fillRect(340,104,80,8); ctx.fillRect(372,90,10,52);
    ctx.fillStyle='#c8102e';
    ctx.fillRect(340,107,80,4); ctx.fillRect(374,90,6,52);
    // Clouds
    ctx.fillStyle='rgba(255,255,255,0.85)';
    [[80,70,40],[200,50,30],[480,65,35],[630,45,28]].forEach(function(c){
      ctx.beginPath(); ctx.arc(c[0],c[1],c[2],0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(c[0]+c[2]*0.6,c[1]+4,c[2]*0.7,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(c[0]-c[2]*0.6,c[1]+4,c[2]*0.7,0,TAU); ctx.fill();
    });
    // Guards
    d.guards.forEach(function(g){
      var gx=g.x, gy=380;
      var legSwing = Math.sin(g.walkPhase)*14;
      // Legs
      ctx.strokeStyle='#111'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(gx,gy-20); ctx.lineTo(gx-6+legSwing,gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx,gy-20); ctx.lineTo(gx+6-legSwing,gy); ctx.stroke();
      // Red coat body
      ctx.fillStyle='#c8102e'; ctx.fillRect(gx-11,gy-56,22,38);
      // Gold buttons
      ctx.fillStyle='#ffd700';
      for(var bi5=0;bi5<4;bi5++) { ctx.beginPath(); ctx.arc(gx,gy-51+bi5*9,2,0,TAU); ctx.fill(); }
      // Arms
      var armSwing = Math.sin(g.walkPhase)*12;
      ctx.strokeStyle='#c8102e'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(gx-11,gy-48); ctx.lineTo(gx-16-armSwing,gy-34); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx+11,gy-48); ctx.lineTo(gx+16+armSwing,gy-34); ctx.stroke();
      // White gloves
      ctx.fillStyle='#eee';
      ctx.beginPath(); ctx.arc(gx-16-armSwing,gy-33,4,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(gx+16+armSwing,gy-33,4,0,TAU); ctx.fill();
      // Head
      ctx.fillStyle='#f5c8a0'; ctx.beginPath(); ctx.arc(gx,gy-62,11,0,TAU); ctx.fill();
      // Face
      ctx.fillStyle='#333';
      ctx.beginPath(); ctx.arc(gx-4,gy-64,2,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(gx+4,gy-64,2,0,TAU); ctx.fill();
      // Moustache
      ctx.strokeStyle='#5a3010'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(gx-5,gy-58); ctx.quadraticCurveTo(gx,gy-56,gx+5,gy-58); ctx.stroke();
      // Bearskin hat body
      if(!g.crownKnocked){
        ctx.fillStyle='#111'; ctx.fillRect(gx-12,gy-88,24,28);
        // Crown on top of bearskin
        ctx.fillStyle='#ffd700';
        ctx.beginPath(); ctx.moveTo(gx-10,gy-88); ctx.lineTo(gx-10,gy-98);
        ctx.lineTo(gx-5,gy-93); ctx.lineTo(gx,gy-100);
        ctx.lineTo(gx+5,gy-93); ctx.lineTo(gx+10,gy-98);
        ctx.lineTo(gx+10,gy-88); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#b8960a'; ctx.lineWidth=1; ctx.stroke();
        // Crown gems
        ctx.fillStyle='#c8102e';
        ctx.beginPath(); ctx.arc(gx-5,gy-93,2.5,0,TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(gx+5,gy-93,2.5,0,TAU); ctx.fill();
        ctx.fillStyle='#4444ff';
        ctx.beginPath(); ctx.arc(gx,gy-96,2.5,0,TAU); ctx.fill();
        // Click indicator
        var pulse2 = 0.4+Math.sin(performance.now()*0.007)*0.3;
        ctx.save(); ctx.globalAlpha=pulse2;
        ctx.strokeStyle='#ffd700'; ctx.lineWidth=2.5;
        ctx.setLineDash([4,4]); ctx.beginPath(); ctx.arc(gx,gy-93,18,0,TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else {
        // Bare bearskin (no crown)
        ctx.fillStyle='#111'; ctx.fillRect(gx-12,gy-88,24,28);
        ctx.fillStyle='#222'; ctx.fillRect(gx-12,gy-88,24,6);
        // Flying crown
        ctx.save(); ctx.translate(g.x+g.crownOffX, gy-88+g.crownOffY);
        ctx.fillStyle='#ffd700';
        ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-10,-10); ctx.lineTo(-5,-5); ctx.lineTo(0,-12);
        ctx.lineTo(5,-5); ctx.lineTo(10,-10); ctx.lineTo(10,0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#b8960a'; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
      }
    });
    // Progress
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath();
    ctx.roundRect(W/2-110,14,220,38,8); ctx.fill();
    ctx.fillStyle='#ffd700'; ctx.font='bold 20px "Fredoka",sans-serif'; ctx.textAlign='center';
    ctx.fillText('Crowns: '+d.knocked+'/'+d.needed,W/2,39);
    ctx.fillStyle='rgba(200,200,200,0.8)'; ctx.font='14px "Fredoka",sans-serif';
    ctx.fillText('Tap the crowns to knock them off!',W/2,462);
  }

  function drawMgPamplona(){
    var d = miniGameData;
    // Sky - warm Spanish midday
    var sky2 = ctx.createLinearGradient(0,0,0,H);
    sky2.addColorStop(0,'#e85010'); sky2.addColorStop(0.4,'#f87820'); sky2.addColorStop(1,'#ffc050');
    ctx.fillStyle=sky2; ctx.fillRect(0,0,W,H);
    // Sand arena floor
    ctx.fillStyle='#d4a060'; ctx.fillRect(0,300,W,H-300);
    ctx.fillStyle='#c89050'; ctx.fillRect(0,300,W,10);
    // Crowd stands
    ctx.fillStyle='#a05020'; ctx.fillRect(0,180,W,125);
    ctx.fillStyle='#882a00'; ctx.fillRect(0,180,W,18);
    // Crowd silhouettes
    ctx.fillStyle='#5a1800';
    for(var si2=0;si2<24;si2++){
      var sx=15+si2*30, sy=195+Math.sin(si2*1.7)*8;
      ctx.beginPath(); ctx.arc(sx,sy,8+(si2%3)*2,0,TAU); ctx.fill();
      ctx.fillRect(sx-5,sy,10,30);
    }
    // Red scarves on crowd
    ctx.fillStyle='#dd2222';
    for(var si3=0;si3<24;si3+=2){
      var sx2=15+si3*30, sy2=195+Math.sin(si3*1.7)*8;
      ctx.fillRect(sx2-5,sy2+4,10,6);
    }
    // Barrier wall
    ctx.fillStyle='#fff';
    ctx.fillRect(0,298,W,10);
    ctx.fillStyle='#dd2222';
    for(var bri=0;bri<12;bri++) ctx.fillRect(bri*60,298,30,10);
    // Sun
    ctx.fillStyle='#ffe060'; ctx.beginPath(); ctx.arc(640,80,42,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(255,240,100,0.3)'; ctx.beginPath(); ctx.arc(640,80,62,0,TAU); ctx.fill();
    // Pens
    d.pens.forEach(function(pen){
      var px=pen.x, py=pen.y;
      // Pen walls
      ctx.fillStyle=pen.color; ctx.fillRect(px,py,100,70);
      ctx.strokeStyle='#3a0000'; ctx.lineWidth=2; ctx.strokeRect(px,py,100,70);
      // Wood planks
      ctx.strokeStyle='rgba(0,0,0,0.18)'; ctx.lineWidth=1;
      for(var pl=0;pl<4;pl++){ ctx.beginPath(); ctx.moveTo(px,py+pl*18); ctx.lineTo(px+100,py+pl*18); ctx.stroke(); }
      // Bull inside (if not freed)
      if(!pen.freed || pen.gateOpen < 0.5){
        var bx2=px+32, by2=py+38;
        // Bull body
        ctx.fillStyle='#3a2210'; ctx.beginPath(); ctx.ellipse(bx2,by2,20,12,0,0,TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(bx2+18,by2-4,10,0,TAU); ctx.fill();
        // Horns
        ctx.strokeStyle='#c8a040'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(bx2+22,by2-10); ctx.lineTo(bx2+30,by2-18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx2+26,by2-8); ctx.lineTo(bx2+36,by2-12); ctx.stroke();
        // Eye
        ctx.fillStyle='#ff2200'; ctx.beginPath(); ctx.arc(bx2+22,by2-5,2.5,0,TAU); ctx.fill();
      }
      // Gate (right side)
      var gateAngle = pen.gateOpen * -1.4;
      ctx.save(); ctx.translate(px+100,py);
      ctx.rotate(gateAngle);
      ctx.fillStyle='#6a3010'; ctx.fillRect(0,0,14,70);
      ctx.strokeStyle='#3a1000'; ctx.lineWidth=1; ctx.strokeRect(0,0,14,70);
      ctx.fillStyle='rgba(0,0,0,0.3)';
      for(var gl2=0;gl2<4;gl2++) ctx.fillRect(2,gl2*18,10,3);
      ctx.restore();
      // Click hint on gate
      if(!pen.freed){
        var pulse3 = 0.4+Math.sin(performance.now()*0.006+pen.x)*0.35;
        ctx.save(); ctx.globalAlpha=pulse3;
        ctx.strokeStyle='#ff6600'; ctx.lineWidth=2.5; ctx.setLineDash([4,4]);
        ctx.strokeRect(px+92,py+10,22,50);
        ctx.setLineDash([]);
        ctx.globalAlpha=pulse3*1.2;
        ctx.fillStyle='#ff6600'; ctx.font='bold 13px "Fredoka",sans-serif'; ctx.textAlign='center';
        ctx.fillText('TAP!',px+104,py+40);
        ctx.restore();
      }
      // Hit flash
      if(pen.hitAnim > 0){
        ctx.save(); ctx.globalAlpha=pen.hitAnim*0.5;
        ctx.fillStyle='#fff'; ctx.fillRect(px,py,100,70);
        ctx.restore();
      }
    });
    // Running bulls
    d.pens.forEach(function(pen){
      if(!pen.bullRunning) return;
      var bx3=pen.bullX, by3=320;
      var runPhase=performance.now()*0.012;
      var legBob=Math.sin(runPhase)*8;
      // Dust cloud
      ctx.save(); ctx.globalAlpha=0.35;
      ctx.fillStyle='#d4a060';
      ctx.beginPath(); ctx.arc(bx3-(pen.bullVx>0?-1:1)*20,by3+8,18,0,TAU); ctx.fill();
      ctx.restore();
      // Body
      ctx.fillStyle='#3a2210'; ctx.beginPath(); ctx.ellipse(bx3,by3,26,15,0,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(bx3+(pen.bullVx>0?22:-22),by3-4,12,0,TAU); ctx.fill();
      // Legs
      ctx.strokeStyle='#2a1408'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(bx3-10,by3+12); ctx.lineTo(bx3-10+legBob,by3+26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx3+10,by3+12); ctx.lineTo(bx3+10-legBob,by3+26); ctx.stroke();
      // Horns
      var hDir=pen.bullVx>0?1:-1;
      ctx.strokeStyle='#c8a040'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(bx3+hDir*26,by3-10); ctx.lineTo(bx3+hDir*36,by3-20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx3+hDir*28,by3-6); ctx.lineTo(bx3+hDir*40,by3-8); ctx.stroke();
      // Eye
      ctx.fillStyle='#ff2200'; ctx.beginPath(); ctx.arc(bx3+hDir*26,by3-5,3,0,TAU); ctx.fill();
    });
    // Progress
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.beginPath();
    ctx.roundRect(W/2-110,14,220,38,8); ctx.fill();
    ctx.fillStyle='#ff6622'; ctx.font='bold 20px "Fredoka",sans-serif'; ctx.textAlign='center';
    ctx.fillText('Bulls freed: '+d.freed+'/'+d.needed,W/2,39);
    ctx.fillStyle='rgba(255,220,180,0.9)'; ctx.font='14px "Fredoka",sans-serif';
    ctx.fillText('Tap the gates to free the bulls!',W/2,462);
  }

  function drawSailingHat(p){
    ctx.save(); ctx.translate(p.x+p.w/2, p.y+1);
    ctx.fillStyle='#1a3a8a'; ctx.beginPath(); ctx.ellipse(0,0,13,5,0,0,TAU); ctx.fill();
    ctx.fillStyle='#2255cc'; ctx.fillRect(-9,-9,18,9);
    ctx.fillStyle='#fff'; ctx.fillRect(-9,-10,18,2);
    ctx.fillStyle='#ffd700'; ctx.fillRect(-6,-4,12,2);
    ctx.restore();
  }

  function drawBeetrootJacket(p){
    ctx.save(); ctx.translate(p.x+p.w/2, p.y+p.h/2+2);
    ctx.globalAlpha=0.38; ctx.fillStyle='#7a1a3a';
    ctx.beginPath(); ctx.ellipse(0,2,10,12,0,0,TAU); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='#7a1a3a'; ctx.beginPath(); ctx.arc(8,-5,4,0,TAU); ctx.fill();
    ctx.strokeStyle='#3a8a2a'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(8,-9); ctx.quadraticCurveTo(10,-13,8,-15); ctx.stroke();
    ctx.restore();
  }

  function drawGlowstick(p){
    var gsx = (p.facing||1) < 0 ? p.w+6 : -10;
    ctx.save(); ctx.translate(p.x+gsx, p.y+p.h/2-1);
    var gc='#88ff44';
    ctx.globalAlpha=0.28+Math.sin(performance.now()*0.008)*0.12;
    var gg=ctx.createRadialGradient(0,0,0,0,0,14);
    gg.addColorStop(0,gc); gg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(0,0,14,0,TAU); ctx.fill();
    ctx.globalAlpha=1; ctx.fillStyle=gc;
    ctx.beginPath(); ctx.ellipse(0,0,3,11,0.18,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(200,255,150,0.7)';
    ctx.beginPath(); ctx.ellipse(-1,-2,1.2,5,0.18,0,TAU); ctx.fill();
    ctx.restore();
  }

  function drawCrown(p){
    ctx.save(); ctx.translate(p.x + p.w/2, p.y - 2);
    // Crown base band
    ctx.fillStyle='#ffd700';
    ctx.fillRect(-11,0,22,6);
    // Three points
    ctx.beginPath();
    ctx.moveTo(-11,0); ctx.lineTo(-11,-10);
    ctx.lineTo(-5,-5); ctx.lineTo(0,-13);
    ctx.lineTo(5,-5); ctx.lineTo(11,-10);
    ctx.lineTo(11,0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#b8960a'; ctx.lineWidth=1; ctx.stroke();
    // Gems
    ctx.fillStyle='#ff2222'; ctx.beginPath(); ctx.arc(-5,-6,2.5,0,TAU); ctx.fill();
    ctx.fillStyle='#4488ff'; ctx.beginPath(); ctx.arc(5,-6,2.5,0,TAU); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-10,2.5,0,TAU); ctx.fill();
    ctx.restore();
  }

  function drawBandana(p){
    ctx.save(); ctx.translate(p.x + p.w/2, p.y + p.h*0.3);
    // Red bandana tied around neck
    ctx.fillStyle='#cc1111';
    ctx.beginPath();
    ctx.moveTo(-9,-2); ctx.lineTo(9,-2); ctx.lineTo(7,7); ctx.lineTo(0,4); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill();
    // Knot
    ctx.fillStyle='#ff2222';
    ctx.beginPath(); ctx.arc(0,4,3.5,0,TAU); ctx.fill();
    // White polka dots
    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-4,1,1.5,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4,1,1.5,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0,-0.5,1.5,0,TAU); ctx.fill();
    ctx.restore();
  }

  // ── End campaign & mini-game system ──────────────────────────────────────

  function winLevel(){
    if(survivalMode) return;
    if(state.gameState !== 'playing') return;
    state.gameState = 'won';
    stopMusic();
    playSound('win');
    var totalElapsed = (performance.now()-state.startTime)/1000;
    var elapsed = totalElapsed; // kept for star rating compat
    var collected = state.collectibles.filter(function(c){return c.taken;}).length;
    // time bonus (based on total elapsed across both waves)
    var timeBonus = Math.max(0, Math.floor(500 - totalElapsed * 6));
    if(timeBonus > 0){ state.score += timeBonus; spawnPopup(W/2,H/2-40,'TIME BONUS +'+timeBonus,'#ffd700'); }
    var stars = 1;
    if(collected >= 4) stars++;
    if(totalElapsed < 60) stars++;
    var pr = progress[state.currentLocationId] || {best:0,cleared:false};
    pr.cleared = true;
    pr.playCount = (pr.playCount||0) + 1;
    var isNewBest = state.score > pr.best;
    if(isNewBest) pr.best = state.score;
    progress[state.currentLocationId] = pr;
    safeSet('gh_progress_v2', progress);

    /* Panda special unlock — beating the China boss */
    if(state.currentLocationId === 'boss' && !pandaSpecialUnlocked){
      pandaSpecialUnlocked = true;
      try{ localStorage.setItem('bbl_panda_special','1'); }catch(e){}
      spawnPopup(W/2, H/2-80, 'PANDA SPECIAL UNLOCKED!', '#ffffff', 22);
      pushKillFeed('PANDA MOVE UNLOCKED!','#ffffff');
    }

    /* Feature 3: Achievements in winLevel */
    if(totalElapsed < 40) unlockAchievement('speedrun');
    if(collected >= state.collectibles.length) unlockAchievement('treasure');
    var allFiveCleared = ['glasgow','modena','kenya','paris','ireland'].every(function(id){ return progress[id] && progress[id].cleared; });
    if(allFiveCleared) unlockAchievement('globetrotter');

    /* Feature 2: Daily challenge check */
    var daily = safeGet('gh_daily_v1', {date:'',score:0,done:false});
    var today2 = new Date().toDateString();
    if(state.currentLocationId === getDailyLocationId() && (!daily.done || daily.date !== today2)){
      daily.date = today2; daily.score = state.score; daily.done = true;
      safeSet('gh_daily_v1', daily);
      refreshDailyUI();
      spawnPopup(W/2, H/2-60, 'DAILY COMPLETE!', '#ffd700');
    }

    /* Feature 6: Track missed state.collectibles */
    var missed = state.collectibles.filter(function(c){ return !c.taken; }).map(function(c){ return {x:c.x, y:c.y, slot:c.slot}; });
    safeSet('gh_missed_'+state.currentLocationId, missed);

    var playCount = resetGame._playCount || 0;
    document.getElementById('winTitle').textContent = LEVELS[state.currentLocationId].name + ' cleared!';
    document.getElementById('winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3-stars);
    document.getElementById('winSummary').textContent = 'Score ' + state.score + ' · ' + collected + '/' + state.collectibles.length + ' treasures · Tier ' + Math.min(playCount+1, 10);
    var acWinEl = document.getElementById('winAchievements');
    if(acWinEl){
      if(runAchievements && runAchievements.length > 0){
        acWinEl.textContent = 'Unlocked: ' + runAchievements.map(function(a){ return a.icon+' '+a.label; }).join(' · ');
        acWinEl.hidden = false;
      } else {
        acWinEl.hidden = true;
      }
    }
    var nameEntryRow = document.getElementById('nameEntryRow');
    var nameInput = document.getElementById('nameInput');
    var winScoreSubmit = document.getElementById('winScoreSubmit');
    winScoreSubmit.hidden = true;
    if(window._resetLbSubmit) window._resetLbSubmit();
    // Per-level name entry / leaderboard only applies to standalone play. In the
    // adventure the leaderboard is handled once, at the very end.
    if(!campaignMode){
      if(isNewBest){
        nameEntryRow.hidden = false;
        nameInput.value = pr.name || '';
        setTimeout(function(){ nameInput.focus(); }, 100);
      } else {
        nameEntryRow.hidden = true;
        if(pr.name && lbEnabled()){
          winScoreSubmit.hidden = false;
          winScoreSubmit.textContent = 'Submitting score…';
          submitScore(state.currentLocationId, pr.name, state.score, function(ok){
            winScoreSubmit.textContent = ok ? '✓ Score submitted to leaderboard' : '✗ Could not submit score';
          });
        }
      }
    } else {
      nameEntryRow.hidden = true;
    }
    for(var ci=0; ci<60; ci++){
      confettiParticles.push({
        x: rand(0,W), y: rand(-20,0),
        vx: rand(-60,60), vy: rand(80,200),
        color: ['#ff5470','#ffd700','#7fe3ff','#b0f0ff','#ff9c7a'][Math.floor(Math.random()*5)],
        r: rand(4,9), rot: rand(0,TAU), rotV: rand(-3,3), life:3, t:0
      });
    }
    showAdBreak(function(){
      if(!campaignMode) document.getElementById('overlayWin').hidden = false;
    });

    if(campaignMode){
      /* Campaign mode: auto-transition after win celebration */
      document.getElementById('btnWinNext').hidden = true;
      document.getElementById('winNextHint').hidden = true;
      winNextTimer = setTimeout(function(){
        startCampaignTransition();
      }, 2200);
    } else {
      /* Level flow: show Next Level button and auto-advance after 5s */
      refreshClearedPin(); buildSkinDots(); // unlock any newly reachable locations first
      var nextLoc = getNextLocation();
      var btnWinNext = document.getElementById('btnWinNext');
      var winNextHint = document.getElementById('winNextHint');
      if(winNextTimer){ clearTimeout(winNextTimer); winNextTimer = null; }
      if(nextLoc && netRole !== 'guest'){
        btnWinNext.hidden = false;
        btnWinNext.textContent = '→ ' + nextLoc.name;
        if(!isNewBest){
          var autoSecs = 5;
          winNextHint.textContent = 'Auto-advancing to ' + nextLoc.name + ' in ' + autoSecs + 's…';
          winNextHint.hidden = false;
          var tick = setInterval(function(){
            autoSecs--;
            if(autoSecs > 0){
              winNextHint.textContent = 'Auto-advancing to ' + nextLoc.name + ' in ' + autoSecs + 's…';
            } else {
              clearInterval(tick);
            }
          }, 1000);
          winNextTimer = setTimeout(function(){
            clearInterval(tick);
            if(state.gameState === 'won') startNextLevel(nextLoc);
          }, 5000);
        } else {
          winNextHint.hidden = true;
        }
      } else {
        btnWinNext.hidden = true;
        winNextHint.hidden = true;
      }
    }

    updateHud();
  }

  updateHud();

  function draw(){
    var level = LEVELS[state.currentLocationId];
    var theme = level.theme;
    ctx.save();
    if(shakeT>0){
      ctx.translate(rand(-3,3)*shakeT*4, rand(-3,3)*shakeT*4);
    }
    var sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,theme.skyTop);
    sky.addColorStop(0.6,theme.skyMid);
    sky.addColorStop(1,theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = theme.sunColor;
    ctx.beginPath(); ctx.arc(600,70,46,0,TAU); ctx.fill();

    theme.drawBackdrop();
    theme.drawCenterpiece(360,262);
    ctx.save(); if(platShakeX||platShakeY) ctx.translate(platShakeX, platShakeY);
    for(var i=1;i<PLATFORMS.length;i++) drawPlatform(PLATFORMS[i], theme);
    movingPlatforms.forEach(function(mp){ drawPlatform(mp, theme); });
    ctx.restore();
    drawGround(theme);

    state.collectibles.forEach(function(c){
      if(c.taken) return;
      if(c.ghost){
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(performance.now()*0.004)*0.2;
        ctx.filter = 'hue-rotate(180deg)';
        level.collectibleDraw(c);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        level.collectibleDraw(c);
      }
    });
    state.enemies.forEach(function(en){
      if(en.state==='free'){
        if(en.type==='buckfast') drawBuckfastRef(en);
        else if(en.type==='parmesan') drawParmesanRef(en);
        else if(en.type==='lukekelly') drawLukeKellyRef(en);
        else if(en.type==='artist') drawArtistRef(en);
        else if(en.type==='motorbike') drawMotorbikeRef(en);
        else level.enemyDraw(en);
        if(state.waveNumber >= 2){
          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ff2040';
          ctx.beginPath(); ctx.arc(en.x+en.w/2, en.y+en.h/2, en.w*0.7, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        if(en.type==='armoured'){
          ctx.save();
          ctx.strokeStyle='rgba(160,200,230,0.8)'; ctx.lineWidth=3;
          var cr=Math.max(en.w,en.h)*0.6;
          ctx.beginPath(); ctx.arc(en.x+en.w/2,en.y+en.h/2,cr,0,TAU); ctx.stroke();
          ctx.fillStyle='rgba(160,200,230,0.18)';
          ctx.beginPath(); ctx.arc(en.x+en.w/2,en.y+en.h/2,cr,0,TAU); ctx.fill();
          ctx.restore();
        }
        if(en.type==='fast'){
          ctx.save();
          var fdx=en.dir<0?1:-1;
          for(var ti=1;ti<=3;ti++){
            ctx.globalAlpha=0.12*(4-ti);
            ctx.fillStyle='#ffd700';
            ctx.beginPath(); ctx.ellipse(en.x+en.w/2+fdx*ti*7,en.y+en.h/2,en.w*0.3,en.h*0.3,0,0,TAU); ctx.fill();
          }
          ctx.globalAlpha=1; ctx.restore();
        }
      }
    });
    drawPaintBlobs(paintBlobs);
    /* Smoke screen overlay from motorbike */
    if(smokeLevel > 0.05){
      ctx.save();
      ctx.globalAlpha = smokeLevel * 0.72;
      ctx.fillStyle = '#707070';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // pop burst: spinning enemy ghost that flies off after being popped
    state.popBursts.forEach(function(pb){
      var frac = pb.t / pb.life;
      var fakeEn = {x:pb.x-pb.w/2, y:pb.y-pb.h/2, w:pb.w, h:pb.h,
                    state:'trapped', facing:1, dir:1, angry:0, hits:pb.hits, vx:0, vy:0, bubbleTimer:0, type:pb.enType||'normal'};
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - frac);
      ctx.translate(pb.x, pb.y);
      ctx.rotate(pb.rot);
      ctx.scale(1 - frac*0.6, 1 - frac*0.6);
      ctx.translate(-pb.x, -pb.y);
      if(fakeEn.type==='buckfast') drawBuckfastRef(fakeEn);
      else if(fakeEn.type==='parmesan') drawParmesanRef(fakeEn);
      else if(fakeEn.type==='lukekelly') drawLukeKellyRef(fakeEn);
      else if(fakeEn.type==='artist') drawArtistRef(fakeEn);
      else if(fakeEn.type==='motorbike') drawMotorbikeRef(fakeEn);
      else pb.drawFn(fakeEn);
      ctx.restore();
    });
    state.powerups.forEach(drawPowerup);
    state.players.forEach(function(p){
      var visible = p.invuln<=0 || Math.floor(performance.now()/80)%2===0;
      if(visible){
        // shield glow
        if(p.shield>0){
          ctx.save();
          ctx.globalAlpha = 0.45 + Math.sin(performance.now()*0.008)*0.2;
          var sg = ctx.createRadialGradient(p.x+p.w/2,p.y+p.h/2,8,p.x+p.w/2,p.y+p.h/2,28);
          sg.addColorStop(0,'rgba(80,180,255,0.6)'); sg.addColorStop(1,'rgba(80,180,255,0)');
          ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(p.x+p.w/2,p.y+p.h/2,28,0,TAU); ctx.fill();
          ctx.globalAlpha=1; ctx.restore();
        }
        if(p.id===0){ drawFox(p); } else { drawChicken(p); }
        if(unlockedCosmetics.sailingHat) drawSailingHat(p);
        if(unlockedCosmetics.beetrootJacket) drawBeetrootJacket(p);
        if(unlockedCosmetics.glowstick) drawGlowstick(p);
        if(unlockedCosmetics.crown) drawCrown(p);
        if(unlockedCosmetics.bandana) drawBandana(p);
        // water rat companion
        if(p.hasRat){
          p.ratPhase = (p.ratPhase||0) + 0.08;
          var rx = p.x + p.w/2 - p.facing*22 + Math.sin(p.ratPhase)*4;
          var ry = p.y + p.h - 10 + Math.sin(p.ratPhase*1.5)*3;
          ctx.save(); ctx.translate(rx, ry); ctx.scale(p.facing<0?1:-1,1);
          ctx.fillStyle='#8a7060';
          ctx.beginPath(); ctx.ellipse(0,0,7,5,0,0,TAU); ctx.fill();
          ctx.beginPath(); ctx.ellipse(7,-2,4,3,0.2,0,TAU); ctx.fill();
          ctx.fillStyle='#1c1330'; ctx.beginPath(); ctx.arc(9,-2,1,0,TAU); ctx.fill();
          ctx.strokeStyle='#6a5040'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(-6,0); ctx.quadraticCurveTo(-12,4,-10,8); ctx.stroke();
          ctx.restore();
        }
        // baby elephant companion (Kenya)
        if(p.hasElephant){
          p.elephantPhase = (p.elephantPhase||0) + 0.05;
          var ex = p.x + p.w/2 - p.facing*28 + Math.sin(p.elephantPhase)*5;
          var ey = p.y + p.h - 12 + Math.sin(p.elephantPhase*0.8)*3;
          ctx.save(); ctx.translate(ex, ey); ctx.scale(p.facing<0?1:-1, 1);
          // body
          ctx.fillStyle = '#90a8bc';
          ctx.beginPath(); ctx.ellipse(0,0,10,7,0,0,TAU); ctx.fill();
          // head
          ctx.beginPath(); ctx.ellipse(10,-2,7,6,0,0,TAU); ctx.fill();
          // ear
          ctx.fillStyle = '#c49090';
          ctx.beginPath(); ctx.ellipse(8,-5,4,5,-0.3,0,TAU); ctx.fill();
          // trunk (swings gently)
          var trunkSwing = Math.sin(p.elephantPhase*1.2)*0.3;
          ctx.strokeStyle = '#90a8bc'; ctx.lineWidth=3; ctx.lineCap='round';
          ctx.beginPath(); ctx.moveTo(16,-2); ctx.quadraticCurveTo(21+trunkSwing*8,3,18+trunkSwing*6,9); ctx.stroke();
          // legs (tiny)
          ctx.fillStyle = '#7898b0';
          [-5,0,4].forEach(function(lx){
            ctx.fillRect(lx, 5, 3, 5);
          });
          // eye
          ctx.fillStyle = '#1c1330'; ctx.beginPath(); ctx.arc(13,-3,1.2,0,TAU); ctx.fill();
          ctx.restore();
        }
        // name label above character
        var label = p.id===0 ? 'P1' : 'P2';
        ctx.save();
        ctx.font = '700 11px "Nunito", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = p.id===0 ? '#ffb08f' : '#9fb4ff';
        ctx.fillText(label, p.x+p.w/2, p.y-6);
        ctx.restore();
      }
    });
    state.bubbles.forEach(drawBubble);
    state.bubbles.forEach(function(b){
      if(b.state==='carrying' && b.trapped && b.trapped.bubbleTimer){
        var frac=b.trapped.bubbleTimer/4.5;
        ctx.save();
        ctx.strokeStyle=frac>0.35?'#7fe3ff':'#ff5470';
        ctx.lineWidth=3; ctx.globalAlpha=0.85;
        ctx.beginPath();
        ctx.arc(b.x,b.y,b.r+5,-Math.PI/2,-Math.PI/2+TAU*frac);
        ctx.stroke();
        ctx.restore();
      }
    });

    if(screenFlash>0){
      ctx.save();
      ctx.globalAlpha=Math.max(0,screenFlash)*0.45;
      ctx.fillStyle=screenFlashColor;
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
    state.particles.forEach(function(pp){
      ctx.globalAlpha = clamp(1-pp.t/pp.life,0,1);
      ctx.fillStyle = pp.color;
      ctx.beginPath(); ctx.arc(pp.x,pp.y,pp.r,0,TAU); ctx.fill();
      ctx.globalAlpha = 1;
    });
    state.popups.forEach(function(up){
      ctx.globalAlpha = clamp(1-up.t/0.9,0,1);
      ctx.fillStyle = up.color;
      ctx.font = '700 ' + (up.size||16) + 'px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(up.text, up.x, up.y - up.t*30);
      ctx.globalAlpha = 1;
    });
    /* Feature 5: Fog overlay */
    if(activeEvent && activeEvent.id==='fog'){
      ctx.fillStyle='rgba(180,190,200,0.35)'; ctx.fillRect(0,0,W,H);
    }
    /* Feature 5: Event indicator pill */
    if(activeEvent && eventTimer > 0){
      ctx.save();
      ctx.fillStyle = 'rgba(29,42,92,0.85)';
      ctx.beginPath(); ctx.roundRect(8, 36, 160, 28, 8); ctx.fill();
      ctx.fillStyle = activeEvent.color;
      ctx.font = 'bold 11px "Fredoka",sans-serif'; ctx.textAlign='left';
      ctx.fillText(activeEvent.label, 14, 54);
      // timer bar
      var barW = 50 * (eventTimer / activeEvent.duration);
      ctx.fillStyle = activeEvent.color;
      ctx.fillRect(120, 46, barW, 6);
      ctx.restore();
    }
    if(!tutorialDone && state.gameState==='playing'){
      var tMsg=tutorialFirstPop?'Jump onto the trapped bubble to pop it!':'Shoot enemies with bubbles! [Shift / bubble button]';
      var tAlpha;
      if(!tutorialFirstPop){ tAlpha=Math.min(1,tutorialT*3)*Math.min(1,(6-tutorialT)*2); }
      else { tAlpha=Math.min(1,(tutorialT-6)*2)*Math.min(1,(12-tutorialT)*2); }
      tAlpha=Math.max(0,tAlpha);
      if(tAlpha>0){
        ctx.save();
        ctx.globalAlpha=tAlpha;
        ctx.fillStyle='rgba(12,18,50,0.82)';
        ctx.beginPath(); ctx.roundRect(W/2-230,H-40,460,30,7); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font='700 12px "Nunito",sans-serif'; ctx.textAlign='center';
        ctx.fillText(tMsg,W/2,H-20);
        ctx.restore();
      }
    }
    /* Feature 3: Achievement popup — centered, dramatic */
    if(achievementToast){
      var at = achievementToast, tt = achievementToastT;
      var TOTAL = 4.8;
      // slide-in: first 0.4s; hold; fade-out: last 0.6s
      var slideP = tt > TOTAL-0.4 ? (TOTAL-tt)/0.4 : 1;
      var fadeP  = tt < 0.6 ? tt/0.6 : 1;
      var prog   = clamp(Math.min(slideP, fadeP), 0, 1);
      // ease out cubic for slide
      var ease   = 1 - Math.pow(1-slideP, 3);

      var cW = 380, cH = 120;
      var cx = (W - cW) / 2;
      var cy = H * 0.28 - cH / 2;
      var slideY = (1 - ease) * -(cH + 40);

      ctx.save();
      ctx.globalAlpha = prog;

      // outer glow halo
      var halo = ctx.createRadialGradient(W/2, cy+cH/2+slideY, 10, W/2, cy+cH/2+slideY, cW*0.72);
      halo.addColorStop(0, 'rgba(255,207,92,0.28)');
      halo.addColorStop(1, 'rgba(255,207,92,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(cx - 60, cy + slideY - 40, cW + 120, cH + 80);

      // card shadow
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(cx+4, cy+slideY+6, cW, cH, 16); ctx.fill();

      // card body
      ctx.fillStyle = '#111a3d';
      ctx.beginPath(); ctx.roundRect(cx, cy+slideY, cW, cH, 16); ctx.fill();

      // gold border (double ring feel)
      ctx.strokeStyle = 'rgba(255,207,92,0.9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(cx, cy+slideY, cW, cH, 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,207,92,0.22)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.roundRect(cx-2, cy+slideY-2, cW+4, cH+4, 18); ctx.stroke();

      // "ACHIEVEMENT UNLOCKED" header strip
      ctx.fillStyle = 'rgba(255,207,92,0.13)';
      ctx.beginPath(); ctx.roundRect(cx, cy+slideY, cW, 30, {upperLeft:16,upperRight:16,lowerLeft:0,lowerRight:0}); ctx.fill();
      ctx.fillStyle = '#ffcf5c';
      ctx.font = '700 11px "Space Mono",monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2606 ACHIEVEMENT UNLOCKED \u2606', W/2, cy+slideY+19);

      // divider
      ctx.fillStyle = 'rgba(255,207,92,0.25)';
      ctx.fillRect(cx+14, cy+slideY+30, cW-28, 1);

      // big icon
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(at.icon, cx+44, cy+slideY+80);

      // label
      ctx.fillStyle = '#eef1fb';
      ctx.font = '700 20px "Fredoka",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(at.label, cx+72, cy+slideY+64);

      // description
      ctx.fillStyle = '#a9b2d6';
      ctx.font = '600 13px "Nunito",sans-serif';
      ctx.fillText(at.desc, cx+72, cy+slideY+86);

      ctx.restore();
    }

    // chase warning
    if(state.gameState==='playing'){
      var elapsedDraw = (performance.now() - state.startTime) / 1000;
      var currentChaseDelayDraw = resetGame._adjustedChaseDelay || CHASE_DELAY;
      var timeLeft = currentChaseDelayDraw - elapsedDraw;
      if(timeLeft > 0 && timeLeft <= 5){
        // countdown flash
        var flash2 = Math.floor(elapsedDraw*2)%2===0;
        ctx.globalAlpha = flash2 ? 0.95 : 0.6;
        ctx.fillStyle = '#ff5470';
        ctx.font = '700 15px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CHASE IN ' + Math.ceil(timeLeft) + '!', W/2, 26);
        ctx.globalAlpha = 1;
      } else if(timeLeft <= 0){
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ff5470';
        ctx.font = '700 13px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CHASING!', W/2, 26);
        ctx.globalAlpha = 1;
      }
    }

    // wave label
    if(state.gameState==='playing' && state.waveNumber>1){
      ctx.fillStyle='rgba(255,84,112,0.7)';
      ctx.font='bold 11px "Fredoka",sans-serif';
      ctx.textAlign='right';
      ctx.fillText('WAVE '+state.waveNumber, W-8, 26);
    }

    // active loc power-up status banners
    if(state.gameState==='playing'){
      ctx.font='bold 11px "Fredoka",sans-serif'; ctx.textAlign='left';
      var bannerY = 38;
      if(freezeT>0){ ctx.fillStyle='rgba(80,200,255,0.85)'; ctx.fillText('❄ FREEZE '+Math.ceil(freezeT)+'s', 8, bannerY); bannerY+=14; }
      if(slowT>0){ ctx.fillStyle='rgba(122,184,64,0.85)'; ctx.fillText('🐢 SLOW '+Math.ceil(slowT)+'s', 8, bannerY); bannerY+=14; }
      if(doubleScoreT>0){ ctx.fillStyle='rgba(240,192,48,0.9)'; ctx.fillText('✦ x2 SCORE '+Math.ceil(doubleScoreT)+'s', 8, bannerY); bannerY+=14; }
      if(magnetT>0){ ctx.fillStyle='rgba(255,80,255,0.9)'; ctx.fillText('MAGNET '+Math.ceil(magnetT)+'s', 8, bannerY); bannerY+=14; }
    }

    // enemy indicator arrows (for state.enemies off the bottom third of screen)
    if(state.gameState==='playing' && state.players.length>0){
      var px = state.players[0].x + state.players[0].w/2;
      state.enemies.forEach(function(en){
        if(en.state!=='free') return;
        var ex = en.x+en.w/2, ey = en.y+en.h/2;
        // only show if enemy is more than 200px away vertically or near edge
        if(Math.abs(ey - (state.players[0].y+state.players[0].h/2)) < 120) return;
        var angle = Math.atan2(ey-(state.players[0].y+15), ex-px);
        var ax = px + Math.cos(angle)*50, ay = (state.players[0].y+15) + Math.sin(angle)*50;
        ax = clamp(ax,12,W-12); ay = clamp(ay,12,H-12);
        ctx.save(); ctx.translate(ax,ay); ctx.rotate(angle);
        ctx.fillStyle='rgba(255,84,112,0.75)';
        ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-5,-5); ctx.lineTo(-5,5); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
    }

    // powerup flash banner
    if(puFlash > 0){
      var pf = puFlash;
      var pfAlpha = pf > 0.8 ? 1 : pf / 0.8;
      ctx.save();
      ctx.globalAlpha = pfAlpha * 0.92;
      var pfScale = pf > 1.0 ? 1 + (pf-1.0)*0.4 : 1;
      ctx.translate(W/2, H/2 - 30);
      ctx.scale(pfScale, pfScale);
      ctx.shadowColor = puFlashColor;
      ctx.shadowBlur = 28;
      ctx.fillStyle = puFlashColor;
      ctx.font = 'bold 52px "Fredoka",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(puFlashLabel, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // wave transition overlay
    if(waveFlash > 0){
      var wf = waveFlash;
      ctx.fillStyle = 'rgba(10,17,40,'+(wf>1.5?0.7:wf/1.5*0.7)+')';
      ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = wf>1.5 ? 1 : wf/1.5;
      ctx.fillStyle = '#ff5470';
      ctx.font = 'bold 56px "Fredoka",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WAVE 2!', W/2, H/2-10);
      ctx.fillStyle = '#eef1fb';
      ctx.font = '18px "Nunito",sans-serif';
      ctx.fillText('Here they come — faster!', W/2, H/2+24);
      ctx.globalAlpha = 1;
    }

    // countdown overlay
    if(state.gameState==='playing' && countdownT > 0){
      var cn = Math.ceil(countdownT);
      var scale = 1 + (countdownT - Math.floor(countdownT)) * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, countdownT - Math.floor(countdownT) + 0.3);
      ctx.fillStyle = cn > 1 ? '#ff5470' : '#ffd700';
      ctx.font = 'bold ' + Math.round(80*scale) + 'px "Fredoka",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cn <= 0 ? 'GO!' : String(cn), W/2, H/2+20);
      ctx.restore();
    }
    if(state.gameState==='playing' && countdownT > -0.5 && countdownT <= 0){
      ctx.save(); ctx.globalAlpha = Math.max(0, 1+countdownT*2);
      ctx.fillStyle='#ffd700'; ctx.font='bold 90px "Fredoka",sans-serif'; ctx.textAlign='center';
      ctx.fillText('GO!', W/2, H/2+20); ctx.restore();
    }

    // survival HUD
    if(survivalMode && state.gameState==='playing'){
      ctx.save();
      ctx.fillStyle='rgba(255,84,112,0.85)';
      ctx.font='bold 13px "Fredoka",sans-serif'; ctx.textAlign='center';
      ctx.fillText('SURVIVAL · Wave '+survivalWave, W/2, 26);
      ctx.restore();
    }

    // confetti (win screen)
    if(state.gameState==='won'){
      confettiParticles.forEach(function(c){
        ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.rot);
        ctx.globalAlpha = Math.max(0, 1-c.t/c.life);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.r/2,-c.r/4,c.r,c.r/2);
        ctx.restore();
      });
    }

    // paused overlay
    if(state.gameState==='paused'){
      ctx.fillStyle='rgba(10,17,40,0.65)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#eef1fb';
      ctx.font='bold 38px "Fredoka",sans-serif';
      ctx.textAlign='center';
      ctx.fillText('PAUSED',W/2,H/2-8);
      ctx.font='14px "Nunito",sans-serif';
      ctx.fillStyle='#a9b2d6';
      ctx.fillText('Press P or Escape to resume',W/2,H/2+20);
    }

    // ── panda projectile draw ─────────────────────────────────────────────────
    if(pandaProjectile && state.gameState==='playing'){
      var pp4=pandaProjectile;
      var isSneeze=pp4.phase==='sneezing';
      // sneeze freeze cloud rings that pulse outward
      if(isSneeze){
        var sr=pp4.sneezeT*200;
        ctx.save();
        ctx.globalAlpha=Math.max(0,0.6-pp4.sneezeT*0.25);
        ctx.strokeStyle='#aaffcc'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(pp4.x,pp4.y,sr,0,TAU); ctx.stroke();
        ctx.strokeStyle='rgba(180,255,230,0.4)'; ctx.lineWidth=8;
        ctx.beginPath(); ctx.arc(pp4.x,pp4.y,sr*0.6,0,TAU); ctx.stroke();
        ctx.restore();
      }
      drawPanda(pp4.x, pp4.y, pp4.t, isSneeze);
    }

    // ── panda charge indicator (bottom-left when unlocked) ───────────────────
    if(pandaSpecialUnlocked && state.gameState==='playing'){
      ctx.save();
      var piX=8, piY=H-28;
      // cooldown ring or ready
      if(pandaCooldown>0){
        var cdFrac=1-(pandaCooldown/18);
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.arc(piX+12,piY+8,12,0,TAU); ctx.fill();
        ctx.strokeStyle='#aaffaa'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(piX+12,piY+8,10,-Math.PI/2,-Math.PI/2+TAU*cdFrac); ctx.stroke();
        ctx.fillStyle='rgba(170,255,170,0.5)'; ctx.font='bold 8px "Fredoka",sans-serif'; ctx.textAlign='center';
        ctx.fillText(Math.ceil(pandaCooldown)+'s', piX+12, piY+12);
      } else {
        // charge dots (1-3)
        for(var ci5=0;ci5<3;ci5++){
          ctx.fillStyle=ci5<pandaChargeCount?'#aaffaa':'rgba(170,255,170,0.25)';
          ctx.beginPath(); ctx.arc(piX+8+ci5*10, piY+8, 4, 0, TAU); ctx.fill();
        }
        if(pandaChargeCount===0){
          ctx.fillStyle='rgba(170,255,170,0.7)'; ctx.font='bold 8px "Fredoka",sans-serif'; ctx.textAlign='left';
          ctx.fillText('PANDA x3', piX, piY+20);
        }
      }
      ctx.restore();
    }

    // ── on-fire meter ────────────────────────────────────────────────────────
    if(state.gameState==='playing' && (fireMeter > 0.05 || fireBonus > 0)){
      ctx.save();
      var fmX=W/2-70, fmY=H-13, fmW=140, fmH=5;
      ctx.fillStyle='rgba(0,0,0,0.38)';
      ctx.beginPath(); ctx.roundRect(fmX,fmY,fmW,fmH,3); ctx.fill();
      var fmFill = fireBonus>0 ? 1 : fireMeter;
      var fmIsOnFire = fireBonus>0;
      var fmBlink = fmIsOnFire && Math.floor(performance.now()/120)%2===0;
      ctx.fillStyle = fmBlink ? '#ffcc00' : (fmIsOnFire ? '#ff4400' : (fireMeter>0.7?'#ff5500':'#ff9940'));
      ctx.beginPath(); ctx.roundRect(fmX,fmY,fmW*fmFill,fmH,3); ctx.fill();
      ctx.fillStyle = fmIsOnFire ? '#ff4400' : '#ff9940';
      ctx.font='bold 9px "Space Mono",monospace'; ctx.textAlign='right';
      ctx.fillText(fmIsOnFire?'ON FIRE!':'HEAT', fmX-4, fmY+fmH);
      ctx.restore();
    }

    // ── kill feed ─────────────────────────────────────────────────────────────
    if(killFeed.length>0 && state.gameState==='playing'){
      ctx.save();
      ctx.font='bold 11px "Space Mono",monospace';
      for(var kfi3=0;kfi3<killFeed.length;kfi3++){
        var kf=killFeed[kfi3];
        var kfA=kf.t<0.25?kf.t/0.25:kf.t>kf.life-0.4?(kf.life-kf.t)/0.4:1;
        ctx.globalAlpha=Math.max(0,kfA)*0.93;
        var kfY=58+kfi3*22;
        var tw=ctx.measureText(kf.text).width;
        ctx.fillStyle='rgba(8,14,36,0.76)';
        ctx.beginPath(); ctx.roundRect(W-tw-26, kfY-13, tw+18, 17, 4); ctx.fill();
        ctx.fillStyle=kf.color;
        ctx.textAlign='right';
        ctx.fillText(kf.text, W-12, kfY);
      }
      ctx.globalAlpha=1;
      ctx.restore();
    }

    // ── enemy taunt indicators ────────────────────────────────────────────────
    if(state.gameState==='playing'){
      state.enemies.forEach(function(en){
        if(!(en.tauntT>0)) return;
        var ta=Math.min(1,en.tauntT/0.3)*Math.min(1,en.tauntT);
        var tx=en.x+en.w/2, ty=en.y-10;
        ctx.save(); ctx.globalAlpha=Math.max(0,ta);
        ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.roundRect(tx-10,ty-18,20,15,4); ctx.fill();
        // speech bubble tail
        ctx.fillStyle='#ffffff';
        ctx.beginPath(); ctx.moveTo(tx-4,ty-3); ctx.lineTo(tx,ty+4); ctx.lineTo(tx+4,ty-3); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#cc2222';
        ctx.font='bold 11px "Fredoka",sans-serif'; ctx.textAlign='center';
        ctx.fillText('!',tx,ty-6);
        ctx.restore();
      });
    }

    ctx.restore();
  }

  /* Feature 2: Daily Challenge button */
  document.getElementById('btnDaily').addEventListener('click', function(){
    var locId = getDailyLocationId();
    var loc = LOCATIONS.filter(function(l){ return l.id===locId; })[0];
    if(loc && loc.unlocked) enterLocation(loc);
  });

  /* Feature 1+2+3: Init on page load */
  updateStreak();
  refreshDailyUI();
  renderAchievements();

  // First-time tutorial tip
  if(!safeGet('gh_tutorial_v1', false)){
    document.getElementById('tutorialTip').hidden = false;
    safeSet('gh_tutorial_v1', true);
  }

  var lastT = null;
  function frame(t){
    if(lastT===null) lastT = t;
    var dt = Math.min(0.033, (t-lastT)/1000);
    lastT = t;
    if(netRole==='guest') syncFromNet();
    if(!sceneGame.hidden){
      updatePowerHud();
      if(miniGameId){
        updateMiniGame(dt);
        drawMiniGame();
        document.getElementById('hudScore').textContent = '';
      } else {
        if(netRole!=='guest'){ update(dt); }
        draw();
        document.getElementById('hudScore').textContent = state.score;
      }
      if(netRole==='guest'){
        netSendInputIfChanged();
      } else if(netRole==='host' && netConnected){
        setNetStateAccum(netStateAccum + dt);
        if(netStateAccum >= 0.05){ setNetStateAccum(0); syncToNet(); netBroadcastState(); }
      }
    }
    requestAnimationFrame(frame);
  }

  /* Shared mutable state object for net module — synced before/after net calls */
  var _netShared = {};
  function syncToNet(){
    _netShared.players = state.players; _netShared.enemies = state.enemies; _netShared.bubbles = state.bubbles;
    _netShared.collectibles = state.collectibles; _netShared.score = state.score; _netShared.lives = state.lives;
    _netShared.gameState = state.gameState; _netShared.enemiesLeft = state.enemiesLeft;
    _netShared.currentLocationId = state.currentLocationId; _netShared.numPlayers = state.numPlayers;
    _netShared.popups = state.popups; _netShared.waveNumber = state.waveNumber; _netShared.comboCount = state.comboCount;
    _netShared.startTime = state.startTime; _netShared.LOCATIONS = LOCATIONS;
  }
  function syncFromNet(){
    // Nothing to sync until the host's first state snapshot arrives — otherwise
    // draw() would read undefined collectibles/enemies and crash the frame loop.
    if(!_netShared.players || !_netShared.collectibles) return;
    state.players = _netShared.players; state.enemies = _netShared.enemies; state.bubbles = _netShared.bubbles;
    state.collectibles = _netShared.collectibles; state.score = _netShared.score; state.lives = _netShared.lives;
    state.gameState = _netShared.gameState; state.enemiesLeft = _netShared.enemiesLeft;
    state.popups = _netShared.popups;
  }
  setNetState(_netShared);

  requestAnimationFrame(frame);

  /* Debug hook — exposes internal state for automated playtests only.
     Never call __game in production code; use the public APIs instead. */
  window.__game = {
    getState: function(){ return { gameState:state.gameState, waveNumber:state.waveNumber, score:state.score,
      lives:state.lives, enemiesLeft:state.enemiesLeft, enemyCount:state.enemies.length,
      collectiblesTaken: state.collectibles.filter(function(c){return c.taken;}).length,
      collectiblesTotal: state.collectibles.length, allClearFired:allClearFired,
      smokeLevel:smokeLevel, paintBlobCount:paintBlobs.length,
      currentLocationId:state.currentLocationId }; },
    getEnemyTypes: function(){ return state.enemies.map(function(e){return e.type;}); },
    hasFn: function(n){ return typeof window[n]==='function'; },
    forceAllCollectiblesTaken: function(){ state.collectibles.forEach(function(c){c.taken=true;}); },
    forceWave2: function(){ state.enemies=[]; state.enemiesLeft=0; allClearFired=true; allClearDelay=0; },
    miniGameId: function(){ return miniGameId; },
    campaignStep: function(){ return campaignStep; },
    adventureComplete: function(){ return adventureComplete; },
    powerCharges: function(){ return powerCharges; },
    freeEnemyCount: function(){ return state.enemies.filter(function(e){ return e.state === 'free'; }).length; },
    usePower: function(){ usePower(); },
    forceMiniGameWin: function(){ if(miniGameId){ finishMiniGame(true); return true; } return false; },
    spawnArtistEnemy: function(){ state.enemies.push({x:300,y:150,w:28,h:26,vx:80,vy:0,dir:1,
      state:'free',bubbleTimer:0,hopT:0,angry:0,onGround:false,type:'artist',hits:1,
      wanderX:200,wanderT:5,paintT:0.05}); return 'ok'; },
    spawnMotorbikeEnemy: function(){ state.enemies.push({x:100,y:400,w:42,h:28,vx:160,vy:0,dir:1,
      state:'free',bubbleTimer:0,hopT:0,angry:0,onGround:true,type:'motorbike',hits:1,
      wanderX:600,wanderT:5,smokeRevT:0.1}); return 'ok'; },
    drawFns: { buckfast: typeof drawBuckfastRef, parmesan: typeof drawParmesanRef,
      lukekelly: typeof drawLukeKellyRef, artist: typeof drawArtistRef,
      motorbike: typeof drawMotorbikeRef }
  };

