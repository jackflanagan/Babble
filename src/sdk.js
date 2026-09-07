/* ---------- CrazyGames SDK wrapper ----------
   All calls are no-ops when running outside CrazyGames (dev, self-host, Poki, etc.)
   Replace the SDK script tag + CGSDK init to target a different platform.      */

import { escHtml } from './utils.js';

var CGSDK = null;
(function(){
  try{
    if(typeof CrazyGames !== 'undefined' && CrazyGames.SDK){
      CGSDK = CrazyGames.SDK;
      CGSDK.init();
    }
  }catch(e){}
})();

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

/* ---------- Leaderboard config (fill in after Supabase setup) ---------- */
var LB_URL  = '';   // e.g. 'https://xyzxyz.supabase.co'
var LB_KEY  = '';   // your project's anon/public key
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

/* progress is passed via setProgress so loadLbTab can access it */
var _progress = null;
export function setProgress(p){ _progress = p; }

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
    var progress = _progress || {};
    var localBest = (progress[locationId] && progress[locationId].best) || 0;
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
