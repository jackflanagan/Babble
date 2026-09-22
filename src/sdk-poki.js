/* ---------- Poki SDK wrapper ----------
   Mirrors sdk.js's shape for CrazyGames. All calls are no-ops until initPoki()
   has resolved successfully against a live PokiSDK global. The SDK script tag
   is injected at runtime by ads.js (only on poki.com) — initPoki() is called
   once that dynamically-loaded script fires. */

var PKSDK = null;

/* PokiSDK.init() returns a Promise; resolves true on success (including once
   gameLoadingFinished() has fired, per Poki's docs), false otherwise. */
export function initPoki(){
  return new Promise(function(resolve){
    try{
      if(typeof PokiSDK === 'undefined'){ resolve(false); return; }
      PKSDK = PokiSDK;
      PKSDK.init().then(function(){
        try{ PKSDK.gameLoadingFinished(); }catch(e){}
        resolve(true);
      }).catch(function(){ resolve(false); });
    }catch(e){ resolve(false); }
  });
}

export function pkGameplayStart(){ try{ if(PKSDK) PKSDK.gameplayStart(); }catch(e){} }
export function pkGameplayStop(){  try{ if(PKSDK) PKSDK.gameplayStop();  }catch(e){} }

export function pkShowMidroll(cb){
  pkGameplayStop();
  if(!PKSDK){ if(cb) cb(); return; }
  try{
    PKSDK.commercialBreak().then(function(){ pkGameplayStart(); if(cb) cb(); });
  }catch(e){ if(cb) cb(); }
}

/* rewardedBreak(pauseCb) calls pauseCb right before the ad plays, then
   resolves to a boolean: whether the player finished it and earns the reward. */
export function pkShowRewarded(cb, pauseCb){
  if(!PKSDK){ if(cb) cb(false); return; }
  try{
    PKSDK.rewardedBreak(function(){ if(pauseCb) pauseCb(); }).then(function(withReward){
      if(withReward) pkGameplayStart();
      if(cb) cb(!!withReward);
    });
  }catch(e){ if(cb) cb(false); }
}
