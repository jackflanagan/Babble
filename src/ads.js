/* ---------- Ads facade ----------
   Portal-agnostic entry point for gameplay code — nothing else should import
   sdk.js's or sdk-poki.js's ad functions directly. Detects which portal we're
   running on, injects that portal's SDK script tag at runtime (never both,
   never on self-hosted), and dispatches every Ads.* call to whichever
   adapter is active. Everything no-ops safely off-portal or before the SDK
   has loaded, so callers never need their own try/catch. */

import { initCG, adGameplayStart, adGameplayStop, showAdBreak, showRewardedAd, happyMoment } from './sdk.js';
import { initPoki, pkGameplayStart, pkGameplayStop, pkShowMidroll, pkShowRewarded } from './sdk-poki.js';

function detectPortal(){
  try{
    var qp = new URLSearchParams(location.search).get('portal');
    if(qp === 'crazygames' || qp === 'poki') return qp;
  }catch(e){}
  var h = (location.hostname || '').toLowerCase();
  if(h.indexOf('crazygames.com') >= 0) return 'crazygames';
  if(h.indexOf('poki.com') >= 0) return 'poki';
  return null;
}
export var PORTAL = detectPortal();

var SCRIPT_URLS = {
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
};

function loadPortalScript(){
  return new Promise(function(resolve){
    var url = SCRIPT_URLS[PORTAL];
    if(!url){ resolve(false); return; }
    var s = document.createElement('script');
    s.src = url;
    s.onload = function(){ resolve(true); };
    s.onerror = function(){ resolve(false); };
    document.head.appendChild(s);
  });
}

var _sdkOk = false;   // true once the active portal's SDK is loaded AND initialized
/* Resolves once portal detection + script load + SDK init has settled
   (success or failure) — never rejects. Nothing needs to await this; it's
   here for tests/manual checks that want to know when things have stabilized. */
export var ready = (function(){
  if(PORTAL === 'crazygames'){
    return loadPortalScript().then(function(ok){ _sdkOk = ok && initCG(); });
  }
  if(PORTAL === 'poki'){
    return loadPortalScript().then(function(ok){
      if(!ok) return;
      return initPoki().then(function(success){ _sdkOk = success; });
    });
  }
  return Promise.resolve();
})();

export var Ads = {
  notifyLevelStart: function(){
    if(PORTAL === 'crazygames') adGameplayStart();
    else if(PORTAL === 'poki') pkGameplayStart();
  },
  notifyLevelEnd: function(){
    if(PORTAL === 'crazygames') adGameplayStop();
    else if(PORTAL === 'poki') pkGameplayStop();
  },
  /* Midroll ad on a natural break (level result, retry, back to map). Always
     calls cb once settled, whether or not an ad actually played. */
  showMidroll: function(cb){
    if(PORTAL === 'crazygames') showAdBreak(cb);
    else if(PORTAL === 'poki') pkShowMidroll(cb);
    else { if(cb) cb(); }
  },
  /* Rewarded video. cb(gotReward). pauseCb (Poki only) fires right before
     the ad starts, for callers that want to stop music/etc. */
  showRewarded: function(cb, pauseCb){
    if(PORTAL === 'crazygames') showRewardedAd(cb);
    else if(PORTAL === 'poki') pkShowRewarded(cb, pauseCb);
    else if(cb) cb(false);
  },
  /* Best-effort only — true means "a portal SDK is live", not "an ad is
     guaranteed to fill". Use to decide whether to show a rewarded-ad button
     at all; still handle cb(false) from showRewarded for the unfilled case. */
  rewardedAvailable: function(){ return _sdkOk; },
  /* CrazyGames-only "happy moment" signal — no Poki equivalent exists.
     Use sparingly, for genuinely special moments only. */
  happyMoment: function(){
    if(PORTAL === 'crazygames') happyMoment();
  }
};
