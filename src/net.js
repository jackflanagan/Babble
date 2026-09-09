/* =========================================================
   ONLINE MULTIPLAYER (WebRTC via Trystero)
========================================================= */

import { escHtml, haptic } from './utils.js';

/* injectable deps — shared mutable state object (main.js passes a reference) */
var _state = {};
export function setNetState(s){ _state = s; }
function _getState(){ return _state; }
var _enterLocation = null;
export function setNetEnterLocation(fn){ _enterLocation = fn; }
var _backToMap = null;
export function setNetBackToMap(fn){ _backToMap = fn; }
var _playSound = function(){};
export function setNetPlaySound(fn){ _playSound = fn; }
var _tryJump = function(){};
var _tryShoot = function(){};
export function setNetTryJump(fn){ _tryJump = fn; }
export function setNetTryShoot(fn){ _tryShoot = fn; }
var _keys = {};
export function setNetKeys(k){ _keys = k; }
var _updateHud = function(){};
export function setNetUpdateHud(fn){ _updateHud = fn; }
var _livePlayers = function(){ return []; };
export function setNetLivePlayers(fn){ _livePlayers = fn; }
var NET_APP_ID = 'globehopper-jack-gift-v1';
var NET_IMPORT_URL = 'https://esm.run/trystero';
var netJoinRoomFn = null;
export var netRole = null;        // null | 'host' | 'guest'
var netRoomCode = '';
var netRoom = null;
var netActions = null;
export var netConnected = false;
var netPeerId = null;
var netLastSentInput = null;
export var netStateAccum = 0;
export function setNetStateAccum(v){ netStateAccum = v; }

export function netRandCode(){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for(var i=0;i<5;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

export function netSetStatus(msg, cls){
  var el = document.getElementById('netStatus');
  if(!el) return;
  el.textContent = msg;
  el.className = 'net-status' + (cls ? (' '+cls) : '');
}

export function netUiRefresh(){
  var netPanel = document.getElementById('netPanel');
  if(!netPanel || netPanel.hidden) return;
  var chooseEl = document.getElementById('netChooseRole');
  var codeEl = document.getElementById('netCodeDisplay');
  var introHint = document.getElementById('netIntroHint');
  var controlsHint = document.getElementById('netControlsHint');
  var startBtn = document.getElementById('btnStart');

  if(!netRole){
    chooseEl.hidden = false;
    codeEl.hidden = true;
    introHint.hidden = false;
    controlsHint.hidden = true;
    netSetStatus('');
    startBtn.hidden = true;
    return;
  }
  chooseEl.hidden = true;
  introHint.hidden = true;
  controlsHint.hidden = false;
  if(netRole==='host'){
    codeEl.hidden = false;
    codeEl.textContent = netRoomCode;
    if(netConnected){
      netSetStatus('Connected with your friend! Press Start when you’re both ready.', 'ok');
      startBtn.hidden = false;
    } else {
      netSetStatus('Share this code with your friend — waiting for them to join…', '');
      startBtn.hidden = true;
    }
  } else {
    codeEl.hidden = true;
    if(netConnected){
      netSetStatus('Connected! Waiting for the host to press Start…', 'ok');
    } else {
      netSetStatus('Connecting…', '');
    }
    startBtn.hidden = true;
  }
}

export function netHudRefresh(){
  var badge = document.getElementById('netHudBadge');
  var text = document.getElementById('netHudBadgeText');
  if(!badge) return;
  if(!netRole || document.getElementById('scene-game').hidden){ badge.hidden = true; return; }
  badge.hidden = false;
  badge.classList.toggle('lost', !netConnected);
  text.textContent = netConnected ? 'Online · connected' : 'Online · waiting…';
}

export async function netLoadJoinRoom(){
  if(netJoinRoomFn) return netJoinRoomFn;
  var mod = await import(NET_IMPORT_URL);
  netJoinRoomFn = mod.joinRoom;
  return netJoinRoomFn;
}

export function netSetupRoomHandlers(){
  var actions = {
    input: netRoom.makeAction('input'),
    press: netRoom.makeAction('press'),
    state: netRoom.makeAction('state'),
    scene: netRoom.makeAction('scene')
  };
  netActions = actions;

  netRoom.onPeerJoin = function(peerId){
    netPeerId = peerId;
    netConnected = true;
    netUiRefresh();
    netHudRefresh();
    if(netRole==='host'){
      netActions.scene.send({type:'_enterLocation', locationId: _getState().currentLocationId});
    }
  };
  netRoom.onPeerLeave = function(){
    netConnected = false;
    netPeerId = null;
    netUiRefresh();
    netHudRefresh();
    netSetStatus('Your friend disconnected.', 'warn');
  };

  if(netRole==='host'){
    actions.input.onMessage = function(data){
      if(!data) return;
      _keys.p2Left = !!data.left;
      _keys.p2Right = !!data.right;
      _keys.p2Jump = !!data.jump;
      _keys.p2Bubble = !!data.bubble;
    };
    actions.press.onMessage = function(data){
      if(!_getState().players || _getState().players.length<2) return;
      if(data==='jump') _tryJump(_getState().players[1]);
      else if(data==='bubble') _tryShoot(_getState().players[1]);
    };
  } else {
    actions.state.onMessage = function(data){ applyRemoteState(data); };
    actions.scene.onMessage = function(data){ applyRemoteScene(data); };
  }
}

export async function netHostStart(){
  netRole = 'host';
  netRoomCode = netRandCode();
  netConnected = false;
  netUiRefresh();
  try{
    var joinRoom = await netLoadJoinRoom();
    netRoom = joinRoom({appId: NET_APP_ID}, 'gh-' + netRoomCode);
    netSetupRoomHandlers();
  }catch(err){
    netSetStatus('Couldn’t start online play here — this only works once the game is hosted on the open web, not from this in-chat preview.', 'warn');
    console.error('netHostStart failed', err);
  }
}

export async function netJoinStart(code){
  netRole = 'guest';
  netRoomCode = code;
  netConnected = false;
  netUiRefresh();
  try{
    var joinRoom = await netLoadJoinRoom();
    netRoom = joinRoom({appId: NET_APP_ID}, 'gh-' + code);
    netSetupRoomHandlers();
  }catch(err){
    netSetStatus('Couldn’t connect here — this only works once the game is hosted on the open web, not from this in-chat preview.', 'warn');
    console.error('netJoinStart failed', err);
  }
}

export function netTeardown(){
  if(netRoom){ try{ netRoom.leave(); }catch(e){} }
  netRoom = null;
  netActions = null;
  netRole = null;
  netConnected = false;
  netPeerId = null;
  netRoomCode = '';
  netLastSentInput = null;
  var badge = document.getElementById('netHudBadge');
  if(badge) badge.hidden = true;
  var winRow = document.getElementById('winBtnRow'); if(winRow) winRow.hidden = false;
  var winWait = document.getElementById('winWaitHint'); if(winWait) winWait.hidden = true;
  var loseRow = document.getElementById('loseBtnRow'); if(loseRow) loseRow.hidden = false;
  var loseWait = document.getElementById('loseWaitHint'); if(loseWait) loseWait.hidden = true;
}

export function netBroadcastScene(type, extra){
  if(netRole==='host' && netConnected && netActions){
    var msg = Object.assign({type:type}, extra||{});
    netActions.scene.send(msg);
  }
}

export function netBroadcastState(){
  if(!(netRole==='host' && netConnected && netActions)) return;
  var s = _getState();
  netActions.state.send({
    gameState: s.gameState,
    score: s.score,
    lives: s.lives,
    enemiesLeft: s.enemiesLeft,
    currentLocationId: s.currentLocationId,
    players: s.players.map(function(p){ return {id:p.id, x:p.x, y:p.y, facing:p.facing, walkPhase:p.walkPhase, invuln:p.invuln}; }),
    enemies: s.enemies,
    bubbles: s.bubbles,
    collectibles: s.collectibles,
    popups: s.popups,
    winTitle: s.gameState==='won' ? document.getElementById('winTitle').textContent : null,
    winStars: s.gameState==='won' ? document.getElementById('winStars').textContent : null,
    winSummary: _getState().gameState==='won' ? document.getElementById('winSummary').textContent : null,
    loseSummary: _getState().gameState==='lost' ? document.getElementById('loseSummary').textContent : null
  });
}

export function netSendPress(kind){
  if(netRole==='guest' && netConnected && netActions){
    netActions.press.send(kind);
  }
}

export function netSendInputIfChanged(){
  if(!(netRole==='guest' && netConnected && netActions)) return;
  var cur = { left: !!_keys.p1Left, right: !!_keys.p1Right, jump: !!_keys.p1Jump, bubble: !!_keys.p1Bubble };
  var last = netLastSentInput;
  if(!last || last.left!==cur.left || last.right!==cur.right || last.jump!==cur.jump || last.bubble!==cur.bubble){
    netActions.input.send(cur);
    netLastSentInput = cur;
  }
}

export function applyRemoteState(data){
  if(!data) return;
  _getState().gameState = data.gameState;
  _getState().score = data.score;
  _getState().lives = data.lives;
  _getState().enemiesLeft = data.enemiesLeft;
  _getState().currentLocationId = data.currentLocationId;
  if(_getState().players && _getState().players.length===2 && data.players){
    data.players.forEach(function(sp){
      var lp = _getState().players[sp.id];
      if(lp){ lp.x=sp.x; lp.y=sp.y; lp.facing=sp.facing; lp.walkPhase=sp.walkPhase; lp.invuln=sp.invuln; }
    });
  }
  _getState().enemies = data.enemies || [];
  _getState().bubbles = data.bubbles || [];
  _getState().collectibles = data.collectibles || [];
  _getState().popups = data.popups || [];
  _updateHud();
  var winEl = document.getElementById('overlayWin');
  var loseEl = document.getElementById('overlayLose');
  if(_getState().gameState==='won'){
    winEl.hidden = false;
    if(data.winTitle) document.getElementById('winTitle').textContent = data.winTitle;
    if(data.winStars) document.getElementById('winStars').textContent = data.winStars;
    if(data.winSummary) document.getElementById('winSummary').textContent = data.winSummary;
    document.getElementById('winBtnRow').hidden = true;
    document.getElementById('winWaitHint').hidden = false;
  } else {
    winEl.hidden = true;
  }
  if(_getState().gameState==='lost'){
    loseEl.hidden = false;
    if(data.loseSummary) document.getElementById('loseSummary').textContent = data.loseSummary;
    document.getElementById('loseBtnRow').hidden = true;
    document.getElementById('loseWaitHint').hidden = false;
  } else {
    loseEl.hidden = true;
  }
}

export function applyRemoteScene(data){
  if(netRole!=='guest' || !data) return;
  if(data.type==='_enterLocation'){
    var loc = _getState().LOCATIONS.filter(function(l){ return l.id===data.locationId; })[0];
    if(loc) _enterLocation(loc, data.replay ? {replay:true} : undefined);
  } else if(data.type==='start'){
    _getState().gameState = 'playing';
    document.getElementById('howto').hidden = true;
  } else if(data.type==='retry' || data.type==='winAgain'){
    document.getElementById('overlayWin').hidden = true;
    document.getElementById('overlayLose').hidden = true;
    _getState().gameState = 'playing';
  } else if(data.type==='map'){
    _backToMap();
  }
}

export function localJumpPress(){
  if(netRole==='guest'){ netSendPress('jump'); return; }
  var p = _livePlayers()[0];
  if(p) _tryJump(p);
}
export function localBubblePress(){
  if(netRole==='guest'){ netSendPress('bubble'); return; }
  var p = _livePlayers()[0];
  if(p) _tryShoot(p);
}

document.getElementById('netTabHost').addEventListener('click', function(){
  document.getElementById('netTabHost').classList.add('active');
  document.getElementById('netTabJoin').classList.remove('active');
  document.getElementById('netHostPane').hidden = false;
  document.getElementById('netJoinPane').hidden = true;
});
document.getElementById('netTabJoin').addEventListener('click', function(){
  document.getElementById('netTabJoin').classList.add('active');
  document.getElementById('netTabHost').classList.remove('active');
  document.getElementById('netJoinPane').hidden = false;
  document.getElementById('netHostPane').hidden = true;
});
document.getElementById('btnNetHost').addEventListener('click', function(){ netHostStart(); });
document.getElementById('btnNetJoin').addEventListener('click', function(){
  var input = document.getElementById('netCodeInput');
  var code = (input.value||'').trim().toUpperCase();
  if(code.length < 3){ netSetStatus('Enter the code your friend sent you.', 'warn'); return; }
  netJoinStart(code);
});
document.getElementById('netCodeInput').addEventListener('input', function(e){
  e.target.value = e.target.value.toUpperCase();
});
document.getElementById('netCodeInput').addEventListener('keydown', function(e){
  if(e.key==='Enter'){ document.getElementById('btnNetJoin').click(); }
});

