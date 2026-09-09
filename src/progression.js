/* =========================================================
   PLAYER PROGRESSION  —  persistent, cross-adventure profile

   A deliberately tiny localStorage layer, kept out of main.js's
   in-memory `state`. This is step 1 of the replayability system:
   it only *records* progress. Nothing in here changes how the
   fixed campaign plays for a first-time player.

   Stored shape (localStorage key `bbl_progression_v1`):
     {
       version: 1,
       visitedLocations: [],   // ids of locations the player has completed
       levelRecords: {},       // reserved for later steps (per-level records)
       bestAdventureScore: 0,  // best score from a fully completed adventure
       totalAdventures: 0      // adventures that reached their completion state
     }
========================================================= */

var STORAGE_KEY   = 'bbl_progression_v1';
var SCHEMA_VERSION = 1;

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
        completions: nonNegInt(r.completions)
      };
    });
  }

  out.bestAdventureScore = nonNegInt(raw.bestAdventureScore);
  out.totalAdventures    = nonNegInt(raw.totalAdventures);
  return out;
}

var _data = null;

/* Load once, then hand back the same live object. Never throws. */
export function loadProgression(){
  if(_data) return _data;
  var raw = null;
  try{
    var str = (typeof localStorage !== 'undefined') ? localStorage.getItem(STORAGE_KEY) : null;
    if(str) raw = JSON.parse(str);
  }catch(e){ raw = null; }
  _data = sanitize(raw);
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

/* Record a standalone level result (a world-map replay). Bumps the
   completion count and keeps the best score — the stored bestScore is
   only replaced when the new score is strictly higher. */
export function recordLevelResult(locationId, score){
  if(typeof locationId !== 'string' || !locationId) return;
  var s = (typeof score === 'number' && isFinite(score) && score > 0) ? Math.floor(score) : 0;
  var d = loadProgression();
  var rec = d.levelRecords[locationId] || { bestScore: 0, completions: 0 };
  rec.completions = (rec.completions || 0) + 1;
  if(s > (rec.bestScore || 0)) rec.bestScore = s;
  d.levelRecords[locationId] = rec;
  persist();
}

/* Wipe the profile back to defaults. Not wired to any UI yet;
   the existing "Reset all progress" button clears localStorage
   wholesale. Exposed for tests and future settings use. */
export function resetProgression(){
  _data = freshData();
  persist();
}
