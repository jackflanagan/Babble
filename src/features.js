/* ---------- Feature 1: Streak Counter ---------- */
/* ---------- Feature 2: Daily Challenge ---------- */
/* ---------- Feature 3: Achievements ---------- */

import { safeGet, safeSet } from './utils.js';

/* --- injectable dependencies --- */
var _getLocations = function(){ return []; };
export function setLocationsGetter(fn){ _getLocations = fn; }

var _runAchievements = null;
export function setRunAchievements(arr){ _runAchievements = arr; }

/* ---------- Streak ---------- */
export function updateStreak(){
  var s = safeGet('gh_streak_v1', {count:0, lastDate:''});
  var today = new Date().toDateString();
  var yesterday = new Date(Date.now()-86400000).toDateString();
  if(s.lastDate === today){ /* already counted today */ }
  else if(s.lastDate === yesterday){ s.count++; s.lastDate = today; safeSet('gh_streak_v1', s); }
  else if(s.lastDate !== today){ s.count = 1; s.lastDate = today; safeSet('gh_streak_v1', s); }
  var el = document.getElementById('streakBadge');
  if(el) el.textContent = s.count > 1 ? '\uD83D\uDD25 ' + s.count + ' day streak!' : '';
}

/* ---------- Daily Challenge ---------- */
export function getDailyLocationId(){
  var LOCATIONS = _getLocations();
  var today = new Date().toDateString();
  var hash = 0;
  for(var i=0;i<today.length;i++) hash = (hash*31 + today.charCodeAt(i)) & 0xfffffff;
  var unlocked = LOCATIONS.filter(function(l){ return l.unlocked && l.id !== 'boss'; });
  if(unlocked.length === 0) return 'glasgow';
  return unlocked[hash % unlocked.length].id;
}

export function refreshDailyUI(){
  var LOCATIONS = _getLocations();
  var d = safeGet('gh_daily_v1', {date:'',score:0,done:false});
  var today = new Date().toDateString();
  var statusEl = document.getElementById('dailyStatus');
  if(d.date === today && d.done){
    statusEl.textContent = 'Done today! Score: ' + d.score;
    document.getElementById('btnDaily').textContent = '\u2713 Completed';
    document.getElementById('btnDaily').disabled = false;
  } else {
    statusEl.textContent = 'Location: ' + (LOCATIONS.filter(function(l){ return l.id===getDailyLocationId(); })[0]||{name:'?'}).name;
    document.getElementById('btnDaily').textContent = '\u2B50 Daily Challenge';
    document.getElementById('btnDaily').disabled = false;
  }
}

/* ---------- Achievements ---------- */
export var ACHIEVEMENTS = [
  {id:'first_pop',   label:'First Pop',     desc:'Pop your first enemy',          icon:'\uD83D\uDCA5', unlocked:false},
  {id:'combo3',      label:'Combo King',    desc:'Get a x3 combo',                icon:'\uD83D\uDD25', unlocked:false},
  {id:'speedrun',    label:'Speed Runner',  desc:'Clear a level in under 40s',    icon:'\u26A1', unlocked:false},
  {id:'survivor',    label:'Survivor',      desc:'Survive 60s of chasing',        icon:'\uD83D\uDEE1', unlocked:false},
  {id:'globetrotter',label:'Globetrotter', desc:'Clear all 5 locations',         icon:'\uD83C\uDF0D', unlocked:false},
  {id:'treasure',    label:'Treasure Hunt', desc:'Collect all treasures in a run',icon:'\uD83D\uDC8E', unlocked:false},
  {id:'powerup_all', label:'Power Mad',     desc:'Use all 3 power-up types',      icon:'\u26A1', unlocked:false},
  {id:'rat_friend',  label:'Rat Whisperer', desc:'Get the water rat companion',   icon:'\uD83D\uDC00', unlocked:false},
  {id:'elephant_friend', label:'Elephant Keeper', desc:'Befriend the baby elephant in Kenya', icon:'\uD83D\uDC18', unlocked:false}
];
var unlockedAchievements = safeGet('gh_achievements_v1', []);
ACHIEVEMENTS.forEach(function(a){ if(unlockedAchievements.indexOf(a.id)>-1) a.unlocked=true; });

export var achievementQueue = [];
export var achievementToast = null;
export var achievementToastT = 0;
export function setAchievementToast(v){ achievementToast = v; }
export function setAchievementToastT(v){ achievementToastT = v; }

export function unlockAchievement(id){
  var a = ACHIEVEMENTS.filter(function(x){ return x.id===id; })[0];
  if(!a || a.unlocked) return;
  a.unlocked = true;
  unlockedAchievements.push(id);
  safeSet('gh_achievements_v1', unlockedAchievements);
  achievementQueue.push(a);
  if(_runAchievements) _runAchievements.push(a);
  renderAchievements();
}

export function renderAchievements(){
  var el = document.getElementById('achievementBadges');
  var tip = document.getElementById('achTooltip');
  if(!el) return;
  el.innerHTML = '';
  ACHIEVEMENTS.forEach(function(a){
    var b = document.createElement('span');
    b.style.cssText = 'font-size:22px;opacity:'+(a.unlocked?'1':'0.2')+';cursor:'+(a.unlocked?'pointer':'default')+';transition:transform 0.1s;display:inline-block;';
    b.textContent = a.icon;
    if(a.unlocked){
      b.addEventListener('mouseenter', function(){
        b.style.transform = 'scale(1.3)';
        if(tip){ tip.style.display='block'; tip.innerHTML='<strong>'+a.icon+' '+a.label+'</strong><br><span style="color:var(--dim-text);font-size:12px;">'+a.desc+'</span>'; }
      });
      b.addEventListener('mouseleave', function(){
        b.style.transform = '';
        if(tip){ tip.style.display='none'; }
      });
      /* touch support */
      b.addEventListener('touchstart', function(e){ e.preventDefault();
        if(tip){ tip.style.display='block'; tip.innerHTML='<strong>'+a.icon+' '+a.label+'</strong><br><span style="color:var(--dim-text);font-size:12px;">'+a.desc+'</span>'; }
      }, {passive:false});
    }
    el.appendChild(b);
  });
  if(tip) tip.style.display = 'none';
}
