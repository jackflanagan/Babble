export var TAU = Math.PI * 2;
export function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
export function lerp(a,b,t){ return a + (b-a)*t; }
export function rand(a,b){ return a + Math.random()*(b-a); }

export function safeGet(key, fallback){
  try{
    var v = localStorage.getItem(key);
    return v===null ? fallback : JSON.parse(v);
  }catch(e){ return fallback; }
}
export function safeSet(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ /* ignore */ }
}

export function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function haptic(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||18); }catch(e){} }
