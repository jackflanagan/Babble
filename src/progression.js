/* =========================================================
   PLAYER PROGRESSION  —  the single canonical persistence layer

   Everything about level completion, per-level best score, mastery
   stars and the adventure profile lives here, under ONE localStorage
   key. main.js and globe.js never keep their own copy — they read
   through the exported helpers / injected getters.

   Stored shape (localStorage key `bbl_progression_v1`, version 2):
     {
       version: 2,
       visitedLocations: [ locationId, … ],   // completed at least once
       levelRecords: {
         [locationId]: {
           bestScore,      // best ISOLATED score for that level (campaign leg or replay)
           completions,    // times cleared (campaign + replay)
           stars: { completion, collection, performance }
         }
       },
       bestAdventureScore,  // best score from a fully completed adventure
       totalAdventures      // adventures that reached completion
     }

   Player name / leaderboard data is deliberately NOT here — that stays
   in sdk.js (`bbl_lb_names_v1`).

   Version 1 profiles and the legacy `gh_progress_v2` object are folded
   in once by migrateLegacy() on first load.
========================================================= */

var STORAGE_KEY   = 'bbl_progression_v1';
var LEGACY_KEY    = 'gh_progress_v2';
var SCHEMA_VERSION = 2;

function freshData(){
  return {
    version: SCHEMA_VERSION,
    visitedLocations: [],
    levelRecords: {},
    bestAdventureScore: 0,
    totalAdventures: 0
  };
}

function nonNegInt(v){
  return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0;
}

/* Three independent mastery stars per action level. Each only ever flips
   false -> true (see recordLevelStars), so a record can only improve. */
function sanitizeStars(s){
  s = (s && typeof s === 'object') ? s : {};
  return { completion: s.completion === true, collection: s.collection === true, performance: s.performance === true };
}

/* Coerce whatever comes back from disk into a known-good shape.
   Corrupt JSON, wrong types, an unknown schema version, or extra
   keys all collapse to defaults instead of throwing. */
function sanitize(raw){
  var out = freshData();
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

  if(Array.isArray(raw.visitedLocations)){
    var seen = {};
    raw.visitedLocations.forEach(function(id){
      if(typeof id === 'string' && id && !seen[id]){ seen[id] = 1; out.visitedLocations.push(id); }
    });
  }

  if(raw.levelRecords && typeof raw.levelRecords === 'object' && !Array.isArray(raw.levelRecords)){
    Object.keys(raw.levelRecords).forEach(function(id){
      var r = raw.levelRecords[id];
      if(!r || typeof r !== 'object' || Array.isArray(r)) return;
      out.levelRecords[id] = {
        bestScore:   nonNegInt(r.bestScore),
        completions: nonNegInt(r.completions),
        stars:       sanitizeStars(r.stars)
      };
    });
  }

  out.bestAdventureScore = nonNegInt(raw.bestAdventureScore);
  out.totalAdventures    = nonNegInt(raw.totalAdventures);
  return out;
}

/* One-time fold of a pre-v2 profile and/or the legacy gh_progress_v2
   object into the canonical shape. Values are merged with max() so a
   returning player never loses ground, then the legacy key is removed
   and player names are handed to sdk.js. Returns true if anything was
   migrated (so the caller knows to persist). */
function migrateLegacy(d, loadedVersion){
  var didMerge = false;
  var legacy = null;
  try{
    var ls = (typeof localStorage !== 'undefined') ? localStorage.getItem(LEGACY_KEY) : null;
    if(ls) legacy = JSON.parse(ls);
  }catch(e){ legacy = null; }

  if(legacy && typeof legacy === 'object' && !Array.isArray(legacy)){
    var names = {};
    Object.keys(legacy).forEach(function(id){
      var e = legacy[id];
      if(!e || typeof e !== 'object') return;
      if(id === 'adventure'){
        var ab = nonNegInt(e.best);
        if(ab > d.bestAdventureScore) d.bestAdventureScore = ab;
        if(typeof e.name === 'string' && e.name) names.adventure = e.name;
        didMerge = true;
        return;
      }
      if(typeof e.name === 'string' && e.name){ names[id] = e.name; didMerge = true; }
      var lb = nonNegInt(e.best), lp = nonNegInt(e.playCount);
      // Only materialise a record when the legacy entry actually has progress.
      if(e.cleared !== true && lb === 0 && lp === 0) return;
      var rec = d.levelRecords[id] || { bestScore: 0, completions: 0, stars: sanitizeStars() };
      if(lb > rec.bestScore)   rec.bestScore   = lb;
      if(lp > rec.completions) rec.completions = lp;
      if(e.cleared === true){
        rec.stars.completion = true;
        if(d.visitedLocations.indexOf(id) === -1) d.visitedLocations.push(id);
      }
      d.levelRecords[id] = rec;
      didMerge = true;
    });
    try{
      if(Object.keys(names).length && typeof localStorage !== 'undefined'){
        var existing = {};
        try{ existing = JSON.parse(localStorage.getItem('bbl_lb_names_v1')) || {}; }catch(e2){}
        Object.keys(names).forEach(function(k){ if(existing[k] == null) existing[k] = names[k]; });
        localStorage.setItem('bbl_lb_names_v1', JSON.stringify(existing));
      }
    }catch(e3){}
    try{ if(typeof localStorage !== 'undefined') localStorage.removeItem(LEGACY_KEY); }catch(e4){}
  }

  // A stored pre-v2 profile still needs re-stamping even with nothing to fold in.
  if(loadedVersion != null && loadedVersion !== SCHEMA_VERSION) didMerge = true;
  return didMerge;
}

var _data = null;

/* Load once, then hand back the same live object. Never throws.
   Runs the one-time legacy migration on first load. */
export function loadProgression(){
  if(_data) return _data;
  var raw = null, hadStored = false;
  try{
    var str = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    if(str){ raw = JSON.parse(str); hadStored = true; }
  }catch(e){ raw = null; }
  _data = sanitize(raw);
  var loadedVersion = hadStored && raw && typeof raw === 'object' ? raw.version : null;
  if(migrateLegacy(_data, loadedVersion)){
    _data.version = SCHEMA_VERSION;
    persist();
  }
  return _data;
}

/* Read-only accessor. Treat the returned object as immutable. */
export function getProgression(){ return loadProgression(); }

function persist(){
  try{
    if(typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
  }catch(e){ /* private mode / quota / storage disabled — never crash the game */ }
}

/* Record a location the player has *successfully completed*
   (called from winLevel). Idempotent per location. */
export function markLocationVisited(locationId){
  if(typeof locationId !== 'string' || !locationId) return;
  var d = loadProgression();
  if(d.visitedLocations.indexOf(locationId) === -1) d.visitedLocations.push(locationId);
  persist();
}

/* Record a completed adventure — one that reached its intended
   completion state (finishAdventure(true), i.e. every stop cleared).
   Bumps the run counter and keeps the best final score. */
export function recordAdventureComplete(finalScore){
  var d = loadProgression();
  d.totalAdventures += 1;
  var s = (typeof finalScore === 'number' && isFinite(finalScore)) ? finalScore : 0;
  if(s > d.bestAdventureScore) d.bestAdventureScore = s;
  persist();
}

/* Record a level clear (campaign leg OR world-map replay). Bumps the
   completion count and keeps the best ISOLATED score for that level —
   bestScore is only replaced when the new score is strictly higher. */
export function recordLevelResult(locationId, score){
  if(typeof locationId !== 'string' || !locationId) return;
  var s = (typeof score === 'number' && isFinite(score) && score > 0) ? Math.floor(score) : 0;
  var d = loadProgression();
  var rec = d.levelRecords[locationId] || { bestScore: 0, completions: 0, stars: sanitizeStars() };
  rec.completions = (rec.completions || 0) + 1;
  if(s > (rec.bestScore || 0)) rec.bestScore = s;
  d.levelRecords[locationId] = rec;
  persist();
}

/* Merge freshly earned mastery stars into a level's record. Stars only ever
   go false -> true, so a worse replay can never take a star away, and a
   better replay can add the ones that were still missing. */
export function recordLevelStars(locationId, earned){
  if(typeof locationId !== 'string' || !locationId || !earned) return;
  var d = loadProgression();
  var rec = d.levelRecords[locationId] || { bestScore: 0, completions: 0, stars: sanitizeStars() };
  var st = sanitizeStars(rec.stars);
  st.completion  = st.completion  || earned.completion  === true;
  st.collection  = st.collection  || earned.collection  === true;
  st.performance = st.performance || earned.performance === true;
  rec.stars = st;
  d.levelRecords[locationId] = rec;
  persist();
}

/* 0–3: how many mastery stars a level currently holds. */
export function levelStarCount(locationId){
  var rec = loadProgression().levelRecords[locationId];
  if(!rec) return 0;
  var st = sanitizeStars(rec.stars);
  return (st.completion ? 1 : 0) + (st.collection ? 1 : 0) + (st.performance ? 1 : 0);
}

/* Best isolated score recorded for a level (0 if never cleared). */
export function levelBestScore(locationId){
  var rec = loadProgression().levelRecords[locationId];
  return (rec && rec.bestScore) || 0;
}

/* Times a level has been cleared (campaign legs + replays). Replaces the
   old gh_progress_v2 `playCount` — feeds escalating difficulty. */
export function levelCompletions(locationId){
  var rec = loadProgression().levelRecords[locationId];
  return (rec && rec.completions) || 0;
}

/* Has this location been completed at least once? (the old `cleared` flag) */
export function isLevelCleared(locationId){
  return loadProgression().visitedLocations.indexOf(locationId) !== -1;
}

/* Wipe the profile back to defaults. Not wired to any UI yet;
   the existing "Reset all progress" button clears localStorage
   wholesale. Exposed for tests and future settings use. */
export function resetProgression(){
  _data = freshData();
  persist();
}
