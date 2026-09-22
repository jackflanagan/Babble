/* ---------- CrazyGames SDK wrapper ----------
   All calls are no-ops until initCG() has run and found a live CrazyGames.SDK
   global. The SDK script tag is now injected at runtime by ads.js (only on
   crazygames.com), so init can no longer happen synchronously at module load
   — src/ads.js calls initCG() once the dynamically-loaded script fires. */

import { escHtml } from './utils.js';

var CGSDK = null;
export function initCG(){
  try{
    if(typeof CrazyGames !== 'undefined' && CrazyGames.SDK){
      CGSDK = CrazyGames.SDK;
      CGSDK.init();
      return true;
    }
  }catch(e){}
  return false;
}

export function adGameplayStart(){ try{ if(CGSDK) CGSDK.game.gameplayStart(); }catch(e){} }
export function adGameplayStop(){  try{ if(CGSDK) CGSDK.game.gameplayStop();  }catch(e){} }
export function showAdBreak(cb){
  adGameplayStop();
  if(!CGSDK){ if(cb) cb(); return; }
  try{
    CGSDK.ad.requestAd('midgame', {
      adStarted:  function(){ /* music already stopped at game-over/win */ },
      adFinished: function(){ adGameplayStart(); if(cb) cb(); },
      adError:    function(){ adGameplayStart(); if(cb) cb(); }
    });
  }catch(e){ if(cb) cb(); }
}
/* Rewarded video — adFinished means the player watched to completion and
   should get the reward; adError (unfilled, cooldown, etc.) means no reward. */
export function showRewardedAd(cb){
  if(!CGSDK){ if(cb) cb(false); return; }
  try{
    CGSDK.ad.requestAd('rewarded', {
      adStarted:  function(){},
      adFinished: function(){ if(cb) cb(true); },
      adError:    function(){ if(cb) cb(false); }
    });
  }catch(e){ if(cb) cb(false); }
}
/* Use sparingly — CrazyGames' own docs say this is for genuinely special
   moments (beating a boss, a high score), not routine level clears. */
export function happyMoment(){ try{ if(CGSDK) CGSDK.game.happytime(); }catch(e){} }

/* ---------- Leaderboard config (fill in after Supabase setup) ---------- */
var LB_URL  = 'https://cguzwgffoszofgkpqdtf.supabase.co';
var LB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNndXp3Z2Zmb3N6b2Zna3BxZHRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTEzMzMsImV4cCI6MjEwNTY2NzMzM30.iZRJpSFAgiLxYpakh83EYojf8vBEWWir2VKSRl5TsHA';   // anon/public key — safe to commit, RLS is the real boundary
var LB_TABLE = 'scores';

export function lbEnabled(){ return LB_URL && LB_KEY; }

function lbHeaders(){
  return { 'Content-Type':'application/json', 'apikey': LB_KEY, 'Authorization':'Bearer '+LB_KEY };
}

export function submitScore(locationId, playerName, scoreVal, cb){
  if(!lbEnabled()){ if(cb) cb(null); return; }
  var body = JSON.stringify({ location_id: locationId, player_name: playerName, score: scoreVal });
  fetch(LB_URL + '/rest/v1/' + LB_TABLE, {
    method: 'POST',
    headers: Object.assign(lbHeaders(), {'Prefer':'return=minimal'}),
    body: body
  }).then(function(r){
    if(cb) cb(r.ok ? true : null);
  }).catch(function(){ if(cb) cb(null); });
}

export function fetchLeaderboard(locationId, cb){
  if(!lbEnabled()){ cb([]); return; }
  var url = LB_URL + '/rest/v1/' + LB_TABLE +
    '?select=player_name,score,created_at' +
    '&location_id=eq.' + encodeURIComponent(locationId) +
    '&order=score.desc&limit=15';
  fetch(url, { headers: lbHeaders() })
    .then(function(r){ return r.json(); })
    .then(function(rows){ cb(Array.isArray(rows) ? rows : []); })
    .catch(function(){ cb([]); });
}

var lbCurrentLocation = null;

export function openLeaderboard(locationId, LOCATIONS){
  lbCurrentLocation = locationId || (LOCATIONS[0] && LOCATIONS[0].id);
  var overlay = document.getElementById('overlayLeaderboard');
  overlay.style.display = 'flex';
  buildLbTabs(LOCATIONS);
  loadLbTab(lbCurrentLocation);
}

function buildLbTabs(LOCATIONS){
  var tabsEl = document.getElementById('lbTabs');
  tabsEl.innerHTML = '';
  LOCATIONS.forEach(function(loc){
    if(!loc.unlocked) return;
    var btn = document.createElement('button');
    btn.className = 'btn btn-ghost';
    btn.style.cssText = 'font-size:12px;padding:5px 12px;';
    btn.textContent = loc.name;
    btn.dataset.lid = loc.id;
    if(loc.id === lbCurrentLocation) btn.style.borderColor = 'var(--gold)';
    btn.addEventListener('click', function(){
      lbCurrentLocation = loc.id;
      buildLbTabs(LOCATIONS);
      loadLbTab(loc.id);
    });
    tabsEl.appendChild(btn);
  });
}

/* Canonical progression object (from progression.js) is passed via
   setProgress so loadLbTab can highlight the player's own row. */
var _progress = null;
export function setProgress(p){ _progress = p; }

/* Player name / leaderboard identity — kept separate from the progression
   profile on purpose. Keyed by board id ('adventure' or a location id). */
var LB_NAMES_KEY = 'bbl_lb_names_v1';
function readLbNames(){
  try{ return JSON.parse(localStorage.getItem(LB_NAMES_KEY)) || {}; }catch(e){ return {}; }
}
export function getLbName(boardId){
  var n = readLbNames()[boardId];
  return typeof n === 'string' ? n : '';
}
export function setLbName(boardId, name){
  if(!boardId || typeof name !== 'string' || !name) return;
  try{
    var m = readLbNames();
    m[boardId] = name;
    localStorage.setItem(LB_NAMES_KEY, JSON.stringify(m));
  }catch(e){ /* storage disabled — never crash */ }
}

function loadLbTab(locationId){
  var tableEl = document.getElementById('lbTable');
  var statusEl = document.getElementById('lbStatus');
  tableEl.innerHTML = '';
  statusEl.textContent = lbEnabled() ? 'Loading\u2026' : '\u26A0 Leaderboard not configured yet.';
  if(!lbEnabled()) return;
  fetchLeaderboard(locationId, function(rows){
    statusEl.textContent = '';
    if(!rows.length){
      tableEl.innerHTML = '<p style="text-align:center;color:var(--dim-text);font-size:14px;">No scores yet \u2014 be the first!</p>';
      return;
    }
    var lr = (_progress && _progress.levelRecords) || {};
    var localBest = (lr[locationId] && lr[locationId].bestScore) || 0;
    var html = '<table style="width:100%;border-collapse:collapse;font-size:14px;">';
    html += '<tr style="color:var(--dim-text);font-size:11px;text-transform:uppercase;letter-spacing:.06em;">';
    html += '<th style="padding:4px 8px;text-align:left;">#</th>';
    html += '<th style="padding:4px 8px;text-align:left;">Player</th>';
    html += '<th style="padding:4px 8px;text-align:right;">Score</th></tr>';
    rows.forEach(function(row, i){
      var medal = i===0?'\uD83E\uDD47':i===1?'\uD83E\uDD48':i===2?'\uD83E\uDD49':(i+1)+'.';
      var isMe = localBest && row.score === localBest;
      var rowStyle = isMe ? 'background:rgba(255,207,92,0.12);' : (i%2===0?'':'background:rgba(255,255,255,0.03);');
      html += '<tr style="' + rowStyle + '">';
      html += '<td style="padding:7px 8px;">' + medal + '</td>';
      html += '<td style="padding:7px 8px;font-weight:' + (isMe?'700':'400') + ';">' + escHtml(row.player_name) + (isMe?' \u25C0 you':'') + '</td>';
      html += '<td style="padding:7px 8px;text-align:right;color:var(--gold);font-weight:700;">' + row.score + '</td>';
      html += '</tr>';
    });
    html += '</table>';
    tableEl.innerHTML = html;
  });
}
