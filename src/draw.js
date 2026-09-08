/* ---------- drawing helpers ---------- */

import { TAU, rand } from './utils.js';
import { ctx, W, H } from './canvas.js';

/* injectable deps */
var _getState = function(){ return {}; };
export function setDrawState(fn){ _getState = fn; }

/* ---------- drawing: shared ---------- */
export function drawGround(theme){
  ctx.fillStyle = theme.groundBase;
  ctx.fillRect(0,440,W,40);
  ctx.fillStyle = theme.groundEdge;
  ctx.fillRect(0,440,W,8);
  for(var i=0;i<24;i++){
    ctx.fillStyle = i%2? theme.detailColor[0] : theme.detailColor[1];
    ctx.beginPath();
    ctx.arc(20+i*30, 452 + Math.sin(i)*3, 2.4, 0, TAU);
    ctx.fill();
  }
}
export function drawPlatform(p, theme){
  ctx.fillStyle = theme.platformBody;
  ctx.fillRect(p.x, p.y, p.w, 10);
  ctx.fillStyle = theme.platformTop;
  ctx.fillRect(p.x, p.y-6, p.w, 6);
  ctx.fillStyle = theme.platformDetail;
  for(var x=p.x+6; x<p.x+p.w-6; x+=Math.max(24,p.w/6)){
    ctx.fillRect(x,p.y+10,4,6);
  }
}

export function drawFox(p){
  var pal = p.palette;
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h/2);
  ctx.scale(p.facing<0?-1:1, 1);
  var bob = p.onGround ? Math.sin(p.walkPhase)*2 : 0;
  ctx.translate(0,bob);
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(-14, 2, 10, 6, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = pal.tailTip;
  ctx.beginPath(); ctx.ellipse(-20,0,4,3,-0.5,0,TAU); ctx.fill();
  ctx.fillStyle = pal.body;
  ctx.beginPath();
  ctx.ellipse(0,4,11,13,0,0,TAU);
  ctx.fill();
  ctx.fillStyle = pal.belly;
  ctx.beginPath();
  ctx.ellipse(1,9,6,7,0,0,TAU);
  ctx.fill();
  ctx.fillStyle = pal.body;
  ctx.beginPath(); ctx.moveTo(-9,-10); ctx.lineTo(-13,-19); ctx.lineTo(-3,-13); ctx.fill();
  ctx.beginPath(); ctx.moveTo(9,-10); ctx.lineTo(13,-19); ctx.lineTo(3,-13); ctx.fill();
  ctx.fillStyle = pal.ear;
  ctx.beginPath(); ctx.moveTo(-8,-11); ctx.lineTo(-10,-16); ctx.lineTo(-5,-13); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8,-11); ctx.lineTo(10,-16); ctx.lineTo(5,-13); ctx.fill();
  ctx.fillStyle = pal.belly;
  ctx.beginPath(); ctx.ellipse(4,0,6,5,0,0,TAU); ctx.fill();
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(2,-2,1.6,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-1,1.6,0,TAU); ctx.fill();
  ctx.fillStyle = pal.ear;
  ctx.beginPath(); ctx.moveTo(9,1); ctx.lineTo(13,2); ctx.lineTo(9,4); ctx.fill();
  ctx.restore();
}

export function drawChicken(p){
  ctx.save();
  ctx.translate(p.x+p.w/2, p.y+p.h/2);
  ctx.scale(p.facing<0?-1:1, 1);
  var bob = p.onGround ? Math.sin(p.walkPhase)*2 : 0;
  ctx.translate(0,bob);
  // body
  ctx.fillStyle = '#f5c842';
  ctx.beginPath(); ctx.ellipse(0,5,11,12,0,0,TAU); ctx.fill();
  // wing
  ctx.fillStyle = '#e0a800';
  ctx.beginPath(); ctx.ellipse(-4,6,5,8,-0.3,0,TAU); ctx.fill();
  // head
  ctx.fillStyle = '#f5c842';
  ctx.beginPath(); ctx.arc(5,-10,8,0,TAU); ctx.fill();
  // comb (red)
  ctx.fillStyle = '#e83030';
  ctx.beginPath(); ctx.arc(4,-20,4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-19,3,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0,-19,3,0,TAU); ctx.fill();
  // wattle
  ctx.beginPath(); ctx.arc(9,-8,3,0,TAU); ctx.fill();
  // beak
  ctx.fillStyle = '#f0a020';
  ctx.beginPath(); ctx.moveTo(13,-10); ctx.lineTo(18,-8); ctx.lineTo(13,-6); ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(8,-11,1.6,0,TAU); ctx.fill();
  // tail feathers
  ctx.fillStyle = '#e0a800';
  ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(-18,-10); ctx.lineTo(-10,2); ctx.fill();
  ctx.fillStyle = '#f5c842';
  ctx.beginPath(); ctx.moveTo(-9,-2); ctx.lineTo(-18,-4); ctx.lineTo(-10,4); ctx.fill();
  ctx.restore();
}

export function drawBubble(b){
  ctx.save();
  ctx.globalAlpha = 0.85;
  var grad = ctx.createRadialGradient(b.x-b.r*0.3,b.y-b.r*0.3,1,b.x,b.y,b.r);
  if(b.boss){
    grad.addColorStop(0,'rgba(255,255,200,0.95)');
    grad.addColorStop(0.4,'rgba(255,120,60,0.7)');
    grad.addColorStop(1,'rgba(200,30,30,0.35)');
    ctx.strokeStyle = 'rgba(255,100,50,0.9)';
  } else {
    grad.addColorStop(0,'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4,'rgba(150,220,255,0.55)');
    grad.addColorStop(1,'rgba(120,190,255,0.25)');
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  }
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU); ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if(b.state==='carrying' && b.trapped){
    var te=b.trapped;
    if(te.type==='buckfast') drawBuckfastRef(te);
    else if(te.type==='parmesan') drawParmesanRef(te);
    else if(te.type==='lukekelly') drawLukeKellyRef(te);
    else if(te.type==='artist') drawArtistRef(te);
    else if(te.type==='motorbike') drawMotorbikeRef(te);
    else { var st = _getState(); st.LEVELS[st.currentLocationId].enemyDraw(te); }
  }
  ctx.restore();
}

/* ---------- drawing: power-ups ---------- */
var _locPowerupMeta = null;
export function getLOC_POWERUP_META(){
  if(!_locPowerupMeta){
    _locPowerupMeta = {};
    var LEVELS = _getState().LEVELS;
    Object.keys(LEVELS).forEach(function(k){
      var lp = LEVELS[k].locPowerup;
      if(lp) _locPowerupMeta[lp.type] = lp;
    });
  }
  return _locPowerupMeta;
}

export function drawPowerup(pu){
  var y = pu.y + Math.sin(pu.bob)*5;
  ctx.save(); ctx.translate(pu.x, y);
  var pulse = 0.85 + Math.sin(pu.bob*2)*0.15;
  ctx.scale(pulse, pulse);
  var locMeta = getLOC_POWERUP_META()[pu.type];
  if(locMeta){
    // location-specific power-up
    var grd = ctx.createRadialGradient(0,0,4,0,0,18);
    grd.addColorStop(0, locMeta.glowColor); grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,0,18,0,TAU); ctx.fill();
    ctx.fillStyle = locMeta.color;
    ctx.beginPath(); ctx.arc(0,0,10,0,TAU); ctx.fill();
    ctx.fillStyle='#fff';
    if(pu.type==='haggis'){
      // plate with food blob
      ctx.beginPath(); ctx.ellipse(0,3,8,3,0,0,TAU); ctx.fill();
      ctx.fillStyle=locMeta.color;
      ctx.beginPath(); ctx.ellipse(0,0,6,5,0,0,TAU); ctx.fill();
    } else if(pu.type==='ferrari'){
      // small car side-view
      ctx.fillRect(-7,1,14,4); ctx.fillRect(-4,-2,8,4);
      ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(-4,5,2,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(4,5,2,0,TAU); ctx.fill();
    } else if(pu.type==='safari'){
      // paw print
      ctx.beginPath(); ctx.arc(0,2,4,0,TAU); ctx.fill();
      [[-5,-4],[-2,-6],[2,-6],[5,-4]].forEach(function(p){ ctx.beginPath(); ctx.arc(p[0],p[1],1.8,0,TAU); ctx.fill(); });
    } else if(pu.type==='croissant'){
      // croissant arc
      ctx.lineWidth=2.5; ctx.strokeStyle='#fff'; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(0,2,6,-2.4,0.4); ctx.stroke();
      ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-7,3); ctx.lineTo(-9,6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,3); ctx.lineTo(9,6); ctx.stroke();
    } else if(pu.type==='shamrock'){
      // three leaf clover
      [[-3,-2],[3,-2],[0,-6]].forEach(function(p){ ctx.beginPath(); ctx.arc(p[0],p[1],3.5,0,TAU); ctx.fill(); });
      ctx.fillRect(-1,0,2,6);
    } else if(pu.type==='olive'){
      // olive branch: stem with two olives
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-6,6); ctx.quadraticCurveTo(0,0,6,-6); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-2,3,3,2,-0.5,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3,-3,3,2,-0.5,0,TAU); ctx.fill();
    }
  } else {
    // standard power-ups
    var glowColMap2 = {speed:'rgba(255,220,0,0.35)',rapid:'rgba(255,120,0,0.35)',shield:'rgba(80,160,255,0.35)',magnet:'rgba(255,60,255,0.35)',ghost:'rgba(150,255,220,0.35)'};
    var glowCol = glowColMap2[pu.type] || 'rgba(80,160,255,0.35)';
    var grd = ctx.createRadialGradient(0,0,4,0,0,18);
    grd.addColorStop(0,glowCol); grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(0,0,18,0,TAU); ctx.fill();
    var baseColMap = {speed:'#ffd700',rapid:'#ff7800',shield:'#4499ff',magnet:'#ff44ff',ghost:'#aaffee'};
    ctx.fillStyle = baseColMap[pu.type] || '#4499ff';
    ctx.beginPath(); ctx.arc(0,0,10,0,TAU); ctx.fill();
    ctx.fillStyle='#fff';
    if(pu.type==='speed'){
      ctx.beginPath(); ctx.moveTo(2,-8); ctx.lineTo(-2,0); ctx.lineTo(1,0); ctx.lineTo(-2,8); ctx.lineTo(3,0); ctx.lineTo(0,0); ctx.closePath(); ctx.fill();
    } else if(pu.type==='rapid'){
      [-5,0,5].forEach(function(ox){ ctx.beginPath(); ctx.arc(ox,0,2.2,0,TAU); ctx.fill(); });
    } else if(pu.type==='magnet'){
      // magnet U shape
      ctx.lineWidth=2.5; ctx.strokeStyle='#fff'; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(-5,4); ctx.arc(-5,4,3,Math.PI,TAU); ctx.moveTo(-2,4); ctx.lineTo(-2,-6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2,-6); ctx.lineTo(2,4); ctx.arc(2,4,3,Math.PI,TAU); ctx.moveTo(5,4); ctx.lineTo(5,-6); ctx.stroke();
    } else if(pu.type==='ghost'){
      // ghost shape
      ctx.beginPath(); ctx.arc(0,-4,6,Math.PI,0); ctx.lineTo(6,5); ctx.quadraticCurveTo(4,8,2,5); ctx.quadraticCurveTo(0,8,-2,5); ctx.quadraticCurveTo(-4,8,-6,5); ctx.lineTo(-6,-4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#44aaff'; ctx.beginPath(); ctx.arc(-2,-5,1.5,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(2,-5,1.5,0,TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(6,-4); ctx.lineTo(6,2); ctx.quadraticCurveTo(0,8,-6,2); ctx.lineTo(-6,-4); ctx.closePath(); ctx.fill();
    }
  }
  // expiry fade
  if(pu.life<2) ctx.globalAlpha = pu.life/2;
  ctx.restore();
}

/* ---------- drawing: Glasgow creature/collectibles ---------- */
export function drawKelpieRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.006 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  ctx.fillStyle = en.state==='trapped' ? '#bfeef0' : (flash ? '#ff8a8a' : '#2f5f66');
  ctx.beginPath(); ctx.ellipse(0,3,13,11,0,0,TAU); ctx.fill();
  ctx.fillStyle = '#4a8a92';
  ctx.beginPath(); ctx.ellipse(0,6,7,5,0,0,TAU); ctx.fill();
  // flowing mane
  ctx.fillStyle = '#1f3d42';
  ctx.beginPath();
  ctx.moveTo(-2,-10); ctx.quadraticCurveTo(-10,-14,-9,-4); ctx.quadraticCurveTo(-6,-9,-2,-6); ctx.fill();
  // pointed ears (horse-like)
  ctx.fillStyle = '#2f5f66';
  ctx.beginPath(); ctx.moveTo(-6,-9); ctx.lineTo(-8,-16); ctx.lineTo(-2,-11); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4,-9); ctx.lineTo(6,-16); ctx.lineTo(0,-11); ctx.fill();
  // glowing eyes
  ctx.fillStyle = '#9ff0ff';
  ctx.beginPath(); ctx.arc(-4,0,1.8,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4,0,1.8,0,TAU); ctx.fill();
  ctx.restore();
}
export function drawScotCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save();
  ctx.translate(c.x,y);
  if(c.slot==='a'){ // shortbread
    ctx.fillStyle = '#e0b87a';
    ctx.beginPath(); ctx.roundRect(-11,-6,22,12,3); ctx.fill();
    ctx.fillStyle = '#b98c4f';
    for(var i=0;i<3;i++){ ctx.beginPath(); ctx.arc(-6+i*6,0,1,0,TAU); ctx.fill(); }
  } else if(c.slot==='b'){ // thistle
    ctx.strokeStyle = '#4a7a4a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(0,0); ctx.stroke();
    ctx.fillStyle = '#9b6fd6';
    for(var k=0;k<7;k++){
      ctx.save(); ctx.rotate((k-3)*0.22);
      ctx.beginPath(); ctx.ellipse(0,-7,2.2,7,0,0,TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#4a7a4a';
    ctx.beginPath(); ctx.ellipse(0,0,5,4,0,0,TAU); ctx.fill();
  } else { // tam o' shanter
    ctx.fillStyle = '#7a2f3a';
    ctx.beginPath(); ctx.ellipse(0,2,11,8,0,0,TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth=1;
    for(var g=-8;g<=8;g+=4){ ctx.beginPath(); ctx.moveTo(g,-4); ctx.lineTo(g,9); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-10,2); ctx.lineTo(10,2); ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath(); ctx.arc(0,-6,3,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- drawing: Modena creature/collectibles ---------- */
export function drawBurglarRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.006 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  ctx.scale(en.dir||1, 1);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  // body - striped shirt
  ctx.fillStyle = en.state==='trapped' ? '#ccd8ff' : (flash ? '#ff8a8a' : '#e8e8e8');
  ctx.beginPath(); ctx.ellipse(0,4,10,11,0,0,TAU); ctx.fill();
  ctx.fillStyle = flash ? '#ff6666' : '#222';
  [-3,1,5].forEach(function(ty){ ctx.fillRect(-10,ty,20,3); });
  // head
  ctx.fillStyle = en.state==='trapped' ? '#f0d8b8' : (flash?'#ff8a8a':'#f0c890');
  ctx.beginPath(); ctx.arc(0,-11,7,0,TAU); ctx.fill();
  // mask (bandit mask)
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(0,-11,8,4,0,0,TAU); ctx.fill();
  ctx.fillStyle = en.state==='trapped' ? '#f0d8b8' : '#f0c890';
  ctx.beginPath(); ctx.arc(-3,-13,2.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-13,2.2,0,TAU); ctx.fill();
  // eyes
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(-3,-13,1.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-13,1.2,0,TAU); ctx.fill();
  // hat
  ctx.fillStyle = '#111';
  ctx.fillRect(-8,-19,16,4);
  ctx.beginPath(); ctx.ellipse(0,-21,5,4,0,0,TAU); ctx.fill();
  // swag bag
  ctx.fillStyle = '#8a7040';
  ctx.beginPath(); ctx.arc(12,2,5,0,TAU); ctx.fill();
  ctx.strokeStyle='#5a4820'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(10,2); ctx.lineTo(10,-4); ctx.stroke();
  ctx.restore();
}
export function drawModenaCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save();
  ctx.translate(c.x,y);
  if(c.slot==='a'){ // parmesan wedge
    ctx.fillStyle = '#f0d98a';
    ctx.beginPath(); ctx.moveTo(-11,7); ctx.lineTo(9,7); ctx.lineTo(2,-8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8be6e';
    ctx.beginPath(); ctx.moveTo(-11,7); ctx.lineTo(2,-8); ctx.lineTo(-3,-8); ctx.lineTo(-13,7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9a24a';
    [[-4,3],[0,0],[3,4]].forEach(function(d){ ctx.beginPath(); ctx.arc(d[0],d[1],1,0,TAU); ctx.fill(); });
  } else if(c.slot==='b'){ // balsamic drop
    ctx.fillStyle = '#2a140c';
    ctx.beginPath();
    ctx.moveTo(0,-9); ctx.quadraticCurveTo(8,4,0,9); ctx.quadraticCurveTo(-8,4,0,-9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-2,-2,1.6,2.6,0,0,TAU); ctx.fill();
  } else { // water rat
    ctx.fillStyle = '#8a7060';
    ctx.beginPath(); ctx.ellipse(0,2,9,7,0,0,TAU); ctx.fill();
    // head
    ctx.beginPath(); ctx.ellipse(9,0,6,5,0.2,0,TAU); ctx.fill();
    // ears
    ctx.fillStyle = '#c09080';
    ctx.beginPath(); ctx.arc(6,-6,3,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(11,-5,2.5,0,TAU); ctx.fill();
    // eye
    ctx.fillStyle = '#1c1330'; ctx.beginPath(); ctx.arc(12,0,1.4,0,TAU); ctx.fill();
    // tail
    ctx.strokeStyle='#6a5040'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-8,2); ctx.quadraticCurveTo(-14,6,-12,10); ctx.stroke();
    // sparkle
    ctx.fillStyle='#ffd700'; ctx.font='9px serif'; ctx.textAlign='center';
    ctx.fillText('✦',0,-8);
  }
  ctx.restore();
}

/* ---------- drawing: Kenya creature/collectibles ---------- */
export function drawHyenaRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.007 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  ctx.fillStyle = en.state==='trapped' ? '#e8d8a0' : (flash ? '#ff8a8a' : '#b08840');
  ctx.beginPath(); ctx.ellipse(0,4,13,10,0,0,TAU); ctx.fill();
  // spots
  ctx.fillStyle = 'rgba(60,40,10,0.4)';
  [[-5,2,3,2],[5,0,2.5,2],[0,6,2,1.5]].forEach(function(s){ ctx.beginPath(); ctx.ellipse(s[0],s[1],s[2],s[3],0,0,TAU); ctx.fill(); });
  // head
  ctx.fillStyle = en.state==='trapped' ? '#e8d8a0' : (flash ? '#ff8a8a' : '#b08840');
  ctx.beginPath(); ctx.ellipse(10,0,8,7,0.2,0,TAU); ctx.fill();
  // ears
  ctx.fillStyle = '#7a5820';
  ctx.beginPath(); ctx.moveTo(8,-7); ctx.lineTo(5,-14); ctx.lineTo(13,-9); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14,-5); ctx.lineTo(12,-12); ctx.lineTo(18,-7); ctx.fill();
  // snout
  ctx.fillStyle = '#8a6030';
  ctx.beginPath(); ctx.ellipse(16,2,4,3,0,0,TAU); ctx.fill();
  // eyes
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(11,-2,1.6,0,TAU); ctx.fill();
  ctx.restore();
}
export function drawWaspRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.012 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  ctx.scale(en.dir<0?-1:1, 1);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var trapped = en.state==='trapped';
  // wings (drawn behind body)
  ctx.fillStyle = 'rgba(200,240,255,0.55)';
  ctx.beginPath(); ctx.ellipse(-4,-10,8,5,0.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4,-10,8,5,-0.4,0,TAU); ctx.fill();
  // abdomen stripes
  var stripes = trapped ? ['#e8e080','#e8e080','#e8e080'] : (flash ? ['#ff6060','#ff6060','#ff6060'] : ['#f0c020','#2a2a10','#f0c020']);
  for(var si=0;si<3;si++){
    ctx.fillStyle = stripes[si];
    ctx.beginPath(); ctx.ellipse(0, 6+si*4, 8-si*1.5, 4, 0, 0, TAU); ctx.fill();
  }
  // stinger
  ctx.fillStyle = trapped ? '#c8c060' : '#1c1c08';
  ctx.beginPath(); ctx.moveTo(-2,18); ctx.lineTo(2,18); ctx.lineTo(0,25); ctx.fill();
  // thorax
  ctx.fillStyle = trapped ? '#e0d880' : (flash ? '#ff6060' : '#1c1c08');
  ctx.beginPath(); ctx.ellipse(0,-1,7,6,0,0,TAU); ctx.fill();
  // head
  ctx.fillStyle = trapped ? '#e8e080' : (flash ? '#ff6060' : '#2a2a10');
  ctx.beginPath(); ctx.ellipse(0,-11,5,5,0,0,TAU); ctx.fill();
  // antennae
  ctx.strokeStyle = trapped ? '#c8c060' : '#1c1c08'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(-2,-15); ctx.quadraticCurveTo(-8,-22,-6,-26); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2,-15); ctx.quadraticCurveTo(8,-22,6,-26); ctx.stroke();
  // eyes
  ctx.fillStyle = '#e83030';
  ctx.beginPath(); ctx.arc(-3,-11,1.8,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-11,1.8,0,TAU); ctx.fill();
  ctx.restore();
}

export function drawKenyaCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // coffee bean
    ctx.fillStyle = '#4a2810';
    ctx.beginPath(); ctx.ellipse(0,0,9,7,0,0,TAU); ctx.fill();
    ctx.strokeStyle = '#2a1408'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,-6); ctx.quadraticCurveTo(4,0,0,6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-6); ctx.quadraticCurveTo(-4,0,0,6); ctx.stroke();
  } else if(c.slot==='b'){ // Maasai bead necklace
    ctx.strokeStyle = '#1c1330'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.stroke();
    ['#e83030','#f0d020','#2060e0','#30a030'].forEach(function(col,i){
      ctx.fillStyle = col;
      var a = i*Math.PI/2;
      ctx.beginPath(); ctx.arc(Math.cos(a)*9, Math.sin(a)*9, 2.5, 0, TAU); ctx.fill();
    });
  } else { // baby elephant companion item (slot 'c')
    // draw a tiny cute elephant icon as collectible
    ctx.fillStyle = '#a0b0c0';
    ctx.beginPath(); ctx.ellipse(0,2,9,7,0,0,TAU); ctx.fill();
    // head
    ctx.beginPath(); ctx.ellipse(9,-2,6,5,0,0,TAU); ctx.fill();
    // trunk
    ctx.strokeStyle = '#a0b0c0'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(14,-2); ctx.quadraticCurveTo(20,2,17,8); ctx.stroke();
    // ear
    ctx.fillStyle = '#c8a0a0';
    ctx.beginPath(); ctx.ellipse(7,-4,4,5,-0.4,0,TAU); ctx.fill();
    // eye
    ctx.fillStyle = '#1c1330'; ctx.beginPath(); ctx.arc(12,-3,1,0,TAU); ctx.fill();
    // star sparkle hint
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(-8,-8,2.5,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- drawing: Paris creature/collectibles ---------- */
export function drawMimeRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.006 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  // body (striped)
  ctx.fillStyle = en.state==='trapped' ? '#ddeeff' : (flash ? '#ff8a8a' : '#fff');
  ctx.beginPath(); ctx.ellipse(0,4,10,12,0,0,TAU); ctx.fill();
  ctx.fillStyle = flash ? '#ff8a8a' : '#222';
  [-4,0,4].forEach(function(ty){ ctx.fillRect(-10,ty,20,3); });
  // white face
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0,-10,7,0,TAU); ctx.fill();
  // beret
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(-1,-17,7,3,0,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4,-17,4,Math.PI,0); ctx.fill();
  // eyes + smile
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-3,-11,1.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-11,1.4,0,TAU); ctx.fill();
  ctx.strokeStyle = '#e83030'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(0,-8,2.5,0,Math.PI); ctx.stroke();
  ctx.restore();
}
export function drawParisCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // baguette
    ctx.fillStyle = '#d4a050';
    ctx.save(); ctx.rotate(-0.3);
    ctx.beginPath(); ctx.roundRect(-14,-4,28,8,4); ctx.fill();
    ctx.fillStyle = '#a87030';
    ctx.beginPath(); ctx.moveTo(-10,-4); ctx.lineTo(-6,-4); ctx.lineTo(-8,4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,-4); ctx.lineTo(2,4); ctx.fill();
    ctx.restore();
  } else if(c.slot==='b'){ // croissant
    ctx.fillStyle = '#c88840';
    ctx.save(); ctx.rotate(0.2);
    ctx.beginPath(); ctx.moveTo(-10,4); ctx.quadraticCurveTo(-8,-8,0,-6); ctx.quadraticCurveTo(8,-8,10,4); ctx.quadraticCurveTo(0,8,-10,4); ctx.fill();
    ctx.fillStyle = '#a06820';
    ctx.beginPath(); ctx.arc(0,0,4,0,TAU); ctx.fill();
    ctx.restore();
  } else { // beret
    ctx.fillStyle = '#8a1010';
    ctx.beginPath(); ctx.ellipse(0,2,12,8,0,0,TAU); ctx.fill();
    ctx.fillStyle = '#6a0808';
    ctx.beginPath(); ctx.ellipse(0,-2,7,4,0,0,TAU); ctx.fill();
    ctx.fillStyle = '#cccccc';
    ctx.beginPath(); ctx.arc(0,-5,3,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- drawing: Ireland creature/collectibles ---------- */
export function drawBansheeRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.009 + en.x*0.05)*3;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  ctx.globalAlpha = 0.85;
  // flowing ghostly form
  ctx.fillStyle = en.state==='trapped' ? '#cceecc' : (flash ? '#ff8a8a' : '#7acc7a');
  ctx.beginPath(); ctx.ellipse(0,-2,11,13,0,0,TAU); ctx.fill();
  // wispy bottom
  ctx.fillStyle = en.state==='trapped' ? '#aaddaa' : (flash ? '#ff6666' : '#5aaa5a');
  [-6,0,6].forEach(function(wx){
    ctx.beginPath(); ctx.ellipse(wx,12,3,5,wx*0.05,0,TAU); ctx.fill();
  });
  // hair
  ctx.strokeStyle = en.state==='trapped' ? '#88ccaa' : '#3a883a';
  ctx.lineWidth=2; ctx.lineCap='round';
  [-4,0,4].forEach(function(hx){
    ctx.beginPath(); ctx.moveTo(hx,-13); ctx.quadraticCurveTo(hx+4,-20,hx+2,-26); ctx.stroke();
  });
  // eyes (hollow)
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(-4,-4,2.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(4,-4,2.5,0,TAU); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}
export function drawIrelandCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // shamrock
    ctx.fillStyle = '#20a030';
    [0,1,2].forEach(function(i){
      ctx.save(); ctx.rotate(i*Math.PI*2/3);
      ctx.beginPath(); ctx.ellipse(0,-6,4,5,0,0,TAU); ctx.fill();
      ctx.restore();
    });
    ctx.strokeStyle = '#20a030'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,9); ctx.stroke();
  } else if(c.slot==='b'){ // golden harp
    ctx.strokeStyle = '#e8b820'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(-2,0,9,Math.PI*1.1,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10,-6); ctx.lineTo(-10,9); ctx.stroke();
    [0,1,2,3].forEach(function(i){
      ctx.beginPath();
      ctx.moveTo(-10,-4+i*3); ctx.lineTo(5+Math.sin(i*0.6)*2,-7+i*5);
      ctx.stroke();
    });
  } else { // pot of gold
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.ellipse(0,4,9,7,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-8,-2,16,6,2); ctx.fill();
    ctx.fillStyle = '#f0c020';
    [-4,0,4].forEach(function(cx){ ctx.beginPath(); ctx.arc(cx,-1,2.5,0,TAU); ctx.fill(); });
  }
  ctx.restore();
}

/* ---------- drawing: Athens Gorgon / collectibles ---------- */
export function drawGorgonRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.008 + en.x*0.04)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var trapped = en.state==='trapped';
  var bodyCol = trapped ? '#c8d8c0' : (flash ? '#ff8a8a' : '#8a9a7a');
  // body
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.ellipse(0,4,11,9,0,0,TAU); ctx.fill();
  // head
  ctx.beginPath(); ctx.ellipse(0,-5,9,8,0,0,TAU); ctx.fill();
  // snake hair (6 snakes)
  var snakeCol = trapped ? '#a0c090' : (flash ? '#ff6060' : '#4a7a3a');
  ctx.strokeStyle = snakeCol; ctx.lineWidth=2.5; ctx.lineCap='round';
  var now2 = performance.now()*0.005;
  [[-8,-8,-12,-18],[-4,-12,-5,-22],[0,-13,2,-23],[4,-12,7,-22],[8,-9,13,-18],[6,-6,16,-12]].forEach(function(s,i){
    var sw = Math.sin(now2+i)*3;
    ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.quadraticCurveTo(s[0]+sw,s[1]-5,s[2]+sw,s[3]); ctx.stroke();
    // snake head
    ctx.fillStyle=snakeCol; ctx.beginPath(); ctx.arc(s[2]+sw,s[3],2.2,0,TAU); ctx.fill();
  });
  // eyes (glowing amber — gorgon stare)
  ctx.fillStyle = trapped ? '#d0e0c0' : (flash ? '#ff0000' : '#e8a020');
  ctx.beginPath(); ctx.arc(-3,-5,2.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-5,2.2,0,TAU); ctx.fill();
  ctx.fillStyle='#1c1330';
  ctx.beginPath(); ctx.arc(-3,-5,1,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-5,1,0,TAU); ctx.fill();
  ctx.restore();
}
export function drawAthensCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // olive branch
    ctx.strokeStyle = '#5a8c40'; ctx.lineWidth=1.8; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-8,6); ctx.quadraticCurveTo(0,0,8,-6); ctx.stroke();
    [[-5,3,3,2],[-1,0,3,2],[4,-3,3,2]].forEach(function(p){ ctx.fillStyle='#7ab840'; ctx.beginPath(); ctx.ellipse(p[0],p[1],p[2],p[3],-0.5,0,TAU); ctx.fill(); });
  } else if(c.slot==='b'){ // amphora (terracotta vase)
    ctx.fillStyle = '#c06030';
    ctx.beginPath(); ctx.moveTo(-4,-9); ctx.bezierCurveTo(-10,-4,-10,6,-6,9); ctx.lineTo(6,9); ctx.bezierCurveTo(10,6,10,-4,4,-9); ctx.fill();
    ctx.fillRect(-4,-10,8,3);
    ctx.fillStyle = '#e8a060';
    ctx.fillRect(-3,-1,6,2); ctx.fillRect(-4,4,8,1);
    // handles
    ctx.strokeStyle='#c06030'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(-7,-2,4,0.5,Math.PI-0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(7,-2,4,Math.PI+0.5,TAU-0.5); ctx.stroke();
  } else { // miniature Parthenon column
    ctx.fillStyle = '#f0ead8';
    ctx.fillRect(-4,-12,8,18);
    // flutes (vertical grooves)
    ctx.strokeStyle = '#c8c0a8'; ctx.lineWidth=1;
    [-2,0,2].forEach(function(lx){ ctx.beginPath(); ctx.moveTo(lx,-12); ctx.lineTo(lx,6); ctx.stroke(); });
    // capital
    ctx.fillRect(-6,-13,12,3);
    ctx.fillRect(-8,-16,16,4);
  }
  ctx.restore();
}

/* ---------- drawing: Tokyo enemy (oni) ---------- */
export function drawOniRef(en){
  ctx.save();
  var wob = Math.sin(performance.now()*0.009 + en.x*0.05)*2;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/80)%2===0;
  var trapped = en.state==='trapped';
  var skin = trapped ? '#d8b0c8' : (flash ? '#ff5a4a' : '#d0463a');
  // body
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.ellipse(0,4,11,10,0,0,TAU); ctx.fill();
  // head
  ctx.beginPath(); ctx.ellipse(0,-7,9,8,0,0,TAU); ctx.fill();
  // horns
  ctx.fillStyle = trapped ? '#f0e0d0' : '#f5ead2';
  ctx.beginPath(); ctx.moveTo(-7,-12); ctx.lineTo(-10,-22); ctx.lineTo(-3,-13); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7,-12); ctx.lineTo(10,-22); ctx.lineTo(3,-13); ctx.closePath(); ctx.fill();
  // wild hair
  ctx.strokeStyle = trapped ? '#7a5a6a' : '#20140f'; ctx.lineWidth=2; ctx.lineCap='round';
  [[-6,-12,-11,-6],[0,-14,0,-4],[6,-12,11,-6]].forEach(function(s){
    ctx.beginPath(); ctx.moveTo(s[0],s[1]); ctx.quadraticCurveTo(s[2]-2,s[1]-4,s[2],s[3]); ctx.stroke();
  });
  // eyes
  ctx.fillStyle = flash ? '#ffef00' : '#fff4d0';
  ctx.beginPath(); ctx.arc(-3.5,-7,2.4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5,-7,2.4,0,TAU); ctx.fill();
  ctx.fillStyle='#1c1330';
  ctx.beginPath(); ctx.arc(-3.5+(en.dir||1)*0.6,-7,1.1,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5+(en.dir||1)*0.6,-7,1.1,0,TAU); ctx.fill();
  // fang grin
  ctx.strokeStyle='#3a1a14'; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.arc(0,-2,4,0.15,Math.PI-0.15); ctx.stroke();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(-3,-1); ctx.lineTo(-1.5,2.5); ctx.lineTo(-0.5,-0.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3,-1); ctx.lineTo(1.5,2.5); ctx.lineTo(0.5,-0.6); ctx.fill();
  ctx.restore();
}

/* ---------- drawing: New York enemy (pigeon) ---------- */
export function drawPigeonRef(en){
  ctx.save();
  var t = performance.now()*0.012;
  var bob = Math.sin(t + en.x*0.05)*1.6;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+bob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var trapped = en.state==='trapped';
  var body = trapped ? '#c9d2dc' : (flash ? '#ff9a9a' : '#8b93a0');
  var dir = en.dir || en.facing || 1;
  ctx.scale(dir, 1);
  // tail
  ctx.fillStyle = trapped ? '#b7c0cc' : '#6c7381';
  ctx.beginPath(); ctx.moveTo(-9,2); ctx.lineTo(-16,-2); ctx.lineTo(-16,6); ctx.closePath(); ctx.fill();
  // body
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-1,2,10,8,0,0,TAU); ctx.fill();
  // wing (flap)
  var flap = Math.sin(t*2)*3;
  ctx.fillStyle = trapped ? '#aab3bf' : '#767d8b';
  ctx.beginPath(); ctx.ellipse(-2,1+flap*0.3,6,4,0.3+flap*0.05,0,TAU); ctx.fill();
  // head
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(8,-5,5,0,TAU); ctx.fill();
  // iridescent neck
  ctx.fillStyle = trapped ? '#9fd0c0' : (flash ? '#ffcaca' : '#3a8f7a');
  ctx.beginPath(); ctx.ellipse(5,-1,3.5,4,0.2,0,TAU); ctx.fill();
  // beak
  ctx.fillStyle = '#e8a23a';
  ctx.beginPath(); ctx.moveTo(12,-5); ctx.lineTo(17,-4); ctx.lineTo(12,-2.5); ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = flash ? '#ff0000' : '#e86a2a';
  ctx.beginPath(); ctx.arc(9,-6,1.6,0,TAU); ctx.fill();
  ctx.fillStyle = '#1c1330';
  ctx.beginPath(); ctx.arc(9.3,-6,0.8,0,TAU); ctx.fill();
  // feet
  ctx.strokeStyle = '#d05a5a'; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(-2,9); ctx.lineTo(-2,12); ctx.moveTo(3,9); ctx.lineTo(3,12); ctx.stroke();
  ctx.restore();
}

/* ---------- drawing: Tokyo collectibles ---------- */
export function drawTokyoCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // paper lantern
    ctx.fillStyle = '#e23c4a';
    ctx.beginPath(); ctx.ellipse(0,0,8,10,0,0,TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth=1;
    [-5,0,5].forEach(function(ly){ ctx.beginPath(); ctx.moveTo(-8,ly); ctx.lineTo(8,ly); ctx.stroke(); });
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-3,-12,6,3); ctx.fillRect(-3,9,6,3);
  } else if(c.slot==='b'){ // sushi (nigiri)
    ctx.fillStyle = '#f5f0e6';
    ctx.beginPath(); ctx.roundRect(-9,0,18,7,3); ctx.fill();
    ctx.fillStyle = '#f08a6a';
    ctx.beginPath(); ctx.roundRect(-9,-5,18,6,3); ctx.fill();
    ctx.fillStyle = '#2a3a2a'; ctx.fillRect(-3,-5,6,7);
  } else { // maneki-neko (lucky cat)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(0,3,8,7,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0,-6,5,0,TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-5,-9); ctx.lineTo(-2,-13); ctx.lineTo(0,-9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(5,-9); ctx.lineTo(2,-13); ctx.lineTo(0,-9); ctx.fill();
    ctx.strokeStyle = '#d94a4a'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(7,-2); ctx.lineTo(10,-8); ctx.stroke(); // raised paw
    ctx.fillStyle = '#1c1330';
    ctx.beginPath(); ctx.arc(-2,-6,1,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2,-6,1,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- drawing: Brazil collectibles ---------- */
export function drawBrazilCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // carnival feather
    ctx.fillStyle = '#26c6a0';
    for(var k=0;k<5;k++){
      ctx.save(); ctx.rotate((k-2)*0.3);
      ctx.beginPath(); ctx.ellipse(0,-6,2.4,9,0,0,TAU); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath(); ctx.arc(0,4,3,0,TAU); ctx.fill();
  } else if(c.slot==='b'){ // football
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,-1); ctx.lineTo(2,4); ctx.lineTo(-2,4); ctx.lineTo(-4,-1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,8,0,TAU); ctx.stroke();
  } else { // toucan
    ctx.fillStyle = '#1c1c22';
    ctx.beginPath(); ctx.ellipse(-2,2,8,7,0,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4,-4,4,0,TAU); ctx.fill();
    ctx.fillStyle = '#ff9a1f'; // big beak
    ctx.beginPath(); ctx.moveTo(6,-6); ctx.quadraticCurveTo(20,-3,7,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4,-5,1.4,0,TAU); ctx.fill();
    ctx.fillStyle = '#1c1330'; ctx.beginPath(); ctx.arc(4,-5,0.7,0,TAU); ctx.fill();
  }
  ctx.restore();
}

/* ---------- drawing: New York collectibles ---------- */
export function drawNewyorkCollectibleRef(c){
  if(c.taken) return;
  var y = c.y + Math.sin(c.bob)*4;
  ctx.save(); ctx.translate(c.x,y);
  if(c.slot==='a'){ // pretzel
    ctx.strokeStyle = '#a9702f'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(-3,0,5,-0.4,Math.PI+0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(3,0,5,-Math.PI-0.6,0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6,4); ctx.lineTo(6,4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    [[-3,-2],[3,-2],[0,3]].forEach(function(d){ ctx.beginPath(); ctx.arc(d[0],d[1],0.8,0,TAU); ctx.fill(); });
  } else if(c.slot==='b'){ // yellow taxi
    ctx.fillStyle = '#ffcf00';
    ctx.beginPath(); ctx.roundRect(-11,-2,22,9,2); ctx.fill();
    ctx.fillRect(-7,-7,12,6);
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.arc(-6,7,2.4,0,TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(6,7,2.4,0,TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-2,-9,4,2); // roof light
  } else { // Statue of Liberty torch
    ctx.fillStyle = '#5bbfa6';
    ctx.fillRect(-2,-2,4,12); // arm
    ctx.beginPath(); ctx.moveTo(-4,-2); ctx.lineTo(4,-2); ctx.lineTo(2,-6); ctx.lineTo(-2,-6); ctx.closePath(); ctx.fill(); // cup
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.moveTo(0,-16); ctx.quadraticCurveTo(5,-8,-4,-6); ctx.quadraticCurveTo(3,-8,0,-16); ctx.fill(); // flame
  }
  ctx.restore();
}

/* ---------- drawing: Boss Dragon (China) ---------- */
export function drawDragonRef(en){
  ctx.save();
  var t = performance.now()*0.003;
  var wob = Math.sin(t*1.4 + en.x*0.03)*5;
  ctx.translate(en.x+en.w/2, en.y+en.h/2+wob);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var bodyCol = en.state==='trapped' ? '#ffcc88' : (flash ? '#ff6600' : '#c0392b');
  var scaleCol = en.state==='trapped' ? '#ff9940' : (flash ? '#ff3300' : '#922b21');
  var goldCol = en.state==='trapped' ? '#ffe080' : (flash ? '#ffcc00' : '#f39c12');
  // serpent body segments (wavy)
  for(var si=0;si<5;si++){
    var sx = Math.sin(t*1.5+si*0.9)*(si*3.5);
    var sy = si*7;
    ctx.fillStyle = si%2===0 ? bodyCol : scaleCol;
    ctx.beginPath(); ctx.ellipse(sx, sy, en.w*0.32-si*1.5, en.h*0.22-si, 0, 0, TAU); ctx.fill();
  }
  // head
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.ellipse(0,-12, en.w*0.38, en.h*0.30, 0, 0, TAU); ctx.fill();
  // snout
  ctx.fillStyle = scaleCol;
  ctx.beginPath(); ctx.ellipse(en.dir*10,-14, 10, 7, 0.3*en.dir, 0, TAU); ctx.fill();
  // mane/whiskers
  ctx.strokeStyle = goldCol; ctx.lineWidth=2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-8,-18); ctx.quadraticCurveTo(-18,-28,-14,-36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8,-18); ctx.quadraticCurveTo(18,-28,14,-36); ctx.stroke();
  // eyes
  ctx.fillStyle = flash ? '#fff' : goldCol;
  ctx.beginPath(); ctx.arc(-8,-12,4,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-12,4,0,TAU); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-8,-12,2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-12,2,0,TAU); ctx.fill();
  // horns
  ctx.fillStyle = goldCol;
  ctx.beginPath(); ctx.moveTo(-6,-20); ctx.lineTo(-10,-34); ctx.lineTo(-3,-22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6,-20); ctx.lineTo(10,-34); ctx.lineTo(3,-22); ctx.fill();
  // HP pips above boss
  if(en.hits){
    for(var hp=0;hp<3;hp++){
      ctx.fillStyle = hp < en.hits ? '#ff2040' : 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(-12+hp*12, -en.h/2-10, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth=1;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---------- Special enemy draw functions ---------- */
export function drawBuckfastRef(en){
  var t = performance.now()*0.006;
  ctx.save();
  ctx.translate(en.x+en.w/2, en.y+en.h/2);
  if(en.dir<0) ctx.scale(-1,1);
  var flash = en.angry>0 && Math.floor(performance.now()/80)%2===0;
  var trapped = en.state==='trapped';
  // Speed blur trails
  if(!trapped && en.dir){
    for(var ti=1;ti<=3;ti++){
      ctx.globalAlpha=0.08*(4-ti);
      ctx.fillStyle='#3a7a2a';
      ctx.beginPath(); ctx.ellipse(-ti*8, 0, en.w*0.4, en.h*0.45, 0, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  // Bottle body
  ctx.fillStyle = trapped?'#88cc88':(flash?'#88ff88':'#1e5a22');
  ctx.beginPath();
  ctx.moveTo(-5,-13); ctx.lineTo(-4,-8); ctx.lineTo(-9,0); ctx.lineTo(-9,11);
  ctx.lineTo(9,11); ctx.lineTo(9,0); ctx.lineTo(4,-8); ctx.lineTo(5,-13);
  ctx.closePath(); ctx.fill();
  // Gold label
  ctx.fillStyle = trapped?'#ffee88':'#c8a000';
  ctx.fillRect(-8,1,16,7);
  ctx.fillStyle='#1a1200'; ctx.font='bold 5px monospace'; ctx.textAlign='center';
  ctx.fillText('BV',0,7);
  // Cap
  ctx.fillStyle='#7a5a10'; ctx.fillRect(-4,-15,8,3);
  // Eyes (peering out of label area)
  ctx.fillStyle='#ffe040';
  ctx.beginPath(); ctx.arc(-3,-3,2.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-3,2.5,0,TAU); ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(-3,-3,1.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-3,1.2,0,TAU); ctx.fill();
  // Legs
  ctx.strokeStyle=trapped?'#88cc88':'#1e5a22'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-4,11); ctx.lineTo(-4,16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4,11); ctx.lineTo(4,16); ctx.stroke();
  // Bubble indicator (hits)
  if(en.type && en.hits>1){
    ctx.fillStyle='rgba(160,210,255,0.7)';
    ctx.beginPath(); ctx.arc(0,-19,4,0,TAU); ctx.fill();
  }
  ctx.restore();
}

export function drawParmesanRef(en){
  ctx.save();
  ctx.translate(en.x+en.w/2, en.y+en.h/2);
  if(en.dir<0) ctx.scale(-1,1);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var trapped = en.state==='trapped';
  // Crack angle based on hits taken
  var crk = (en.hits===3?0 : en.hits===2?0.08 : 0.18);
  ctx.rotate(crk * (Math.random()<0.5?1:-1));
  // Wedge body
  ctx.fillStyle = trapped?'#fffacc':(flash?'#ffe080':'#f0d050');
  ctx.beginPath();
  ctx.moveTo(-20,14); ctx.lineTo(20,14); ctx.lineTo(20,-6);
  ctx.quadraticCurveTo(0,-20,-20,-6); ctx.closePath(); ctx.fill();
  // Rind
  ctx.strokeStyle=trapped?'#eedc80':'#b8920a'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(-20,14); ctx.lineTo(-20,-6);
  ctx.quadraticCurveTo(0,-20,20,-6); ctx.stroke();
  // Holes (typical parmesan texture)
  ctx.fillStyle=trapped?'#fffacc':'#c8a820';
  [[-10,4],[-2,-2],[9,6],[5,-9],[13,0]].forEach(function(h){
    ctx.beginPath(); ctx.ellipse(h[0],h[1],3.5,2.5,0,0,TAU); ctx.fill();
  });
  // Grumpy face
  ctx.fillStyle='#3a2000';
  ctx.beginPath(); ctx.arc(-7,-1,3,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(7,-1,3,0,TAU); ctx.fill();
  ctx.fillStyle='#fff5';
  ctx.beginPath(); ctx.arc(-6,-2,1.2,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-2,1.2,0,TAU); ctx.fill();
  // Grumpy brows
  ctx.strokeStyle='#3a2000'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-10,-5); ctx.lineTo(-5,-8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10,-5); ctx.lineTo(5,-8); ctx.stroke();
  // Mouth (grumpy)
  ctx.beginPath(); ctx.moveTo(-5,7); ctx.quadraticCurveTo(0,5,5,7); ctx.stroke();
  // HP pips for 3-hit
  if(en.hits){
    for(var hp=0;hp<3;hp++){
      ctx.fillStyle = hp<en.hits?'#ff8040':'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.arc(-10+hp*10,-26,4,0,TAU); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawLukeKellyRef(en){
  var t = performance.now()*0.001;
  ctx.save();
  ctx.translate(en.x+en.w/2, en.y+en.h/2);
  if(en.dir<0) ctx.scale(-1,1);
  var trapped = en.state==='trapped';
  var walkSwing = Math.sin(t*4)*4;
  // Legs
  ctx.fillStyle=trapped?'#aaa':'#222';
  ctx.fillRect(-8,12, 7, 8+Math.sin(t*4)*2);
  ctx.fillRect(1, 12, 7, 8-Math.sin(t*4)*2);
  // Dark jacket body
  ctx.fillStyle=trapped?'#aaa':'#3a2810';
  ctx.fillRect(-10,-2,20,16);
  // Afro — big auburn halo
  ctx.fillStyle=trapped?'#dda':'#7a3000';
  ctx.beginPath(); ctx.arc(0,-12,13,Math.PI,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(-11,-8,6,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(11,-8,6,0,TAU); ctx.fill();
  // Beard — full and auburn
  ctx.fillStyle=trapped?'#cc9':'#8b3a00';
  ctx.beginPath(); ctx.arc(0,-6,9,0,Math.PI); ctx.fill();
  // Face skin
  ctx.fillStyle=trapped?'#e8d0b0':'#c8784a';
  ctx.beginPath(); ctx.arc(0,-10,7.5,0,TAU); ctx.fill();
  // Eyes
  ctx.fillStyle='#1a0a00';
  ctx.beginPath(); ctx.arc(-3,-11,1.8,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-11,1.8,0,TAU); ctx.fill();
  // Bouzouki body
  ctx.fillStyle=trapped?'#c8c080':'#7a4a12';
  ctx.beginPath(); ctx.ellipse(16,4,8,11,-0.4,0,TAU); ctx.fill();
  ctx.strokeStyle=trapped?'#aaa':'#3a2000'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(9,-2); ctx.lineTo(4,-18); ctx.stroke();
  // Strings
  ctx.strokeStyle='#d4c080'; ctx.lineWidth=0.7;
  for(var sti=0;sti<3;sti++){
    ctx.beginPath(); ctx.moveTo(9+sti*1.5,-1); ctx.lineTo(20,6); ctx.stroke();
  }
  // Music notes floating
  if(!trapped){
    var nt = t*1.5;
    var noteAlpha = Math.abs(Math.sin(nt))*0.85 + 0.15;
    ctx.globalAlpha = noteAlpha;
    ctx.fillStyle='#20ff70'; ctx.font='bold 15px serif'; ctx.textAlign='center';
    ctx.fillText('♪', 4, -24 - (nt%2)*10);
    ctx.fillStyle='#70ff20'; ctx.font='11px serif';
    ctx.fillText('♫', 16, -18 - ((nt+1)%2)*8);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

export function drawArtistRef(en){
  ctx.save();
  ctx.translate(en.x+en.w/2, en.y+en.h/2);
  if(en.dir<0) ctx.scale(-1,1);
  var flash = en.angry>0 && Math.floor(performance.now()/90)%2===0;
  var trapped = en.state==='trapped';
  // Legs
  ctx.fillStyle=trapped?'#aac':'#2a2a60';
  ctx.fillRect(-8,12,7,9); ctx.fillRect(1,12,7,9);
  // Smock (off-white with paint stains)
  ctx.fillStyle=trapped?'#e8e4d0':'#ddd8c4';
  ctx.fillRect(-10,-2,20,16);
  if(!trapped){
    [['#ff4040',-6,2],['#4040ff',2,5],['#ffcc00',5,-1]].forEach(function(s){
      ctx.fillStyle=s[0]; ctx.beginPath(); ctx.arc(s[1],s[2],3,0,TAU); ctx.fill();
    });
  }
  // Head
  ctx.fillStyle=trapped?'#e8d0b0':'#d4906a';
  ctx.beginPath(); ctx.arc(0,-11,8,0,TAU); ctx.fill();
  // Beret (tilted)
  ctx.fillStyle=trapped?'#888':'#111';
  ctx.beginPath(); ctx.ellipse(2,-18,11,5,-0.3,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(2,-18,3.5,0,TAU); ctx.fill();
  // Eyes
  ctx.fillStyle='#1a1000';
  ctx.beginPath(); ctx.arc(-3,-12,1.8,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-12,1.8,0,TAU); ctx.fill();
  // Palette
  ctx.fillStyle=trapped?'#c8a060':'#a07030';
  ctx.beginPath(); ctx.ellipse(15,2,9,7,0.3,0,TAU); ctx.fill();
  [['#f00',10,0],['#00f',16,-1],['#ff0',18,4],['#0f0',13,5]].forEach(function(d){
    ctx.fillStyle=d[0]; ctx.beginPath(); ctx.arc(d[1],d[2],2,0,TAU); ctx.fill();
  });
  // Arm holding palette
  ctx.strokeStyle=trapped?'#c8a060':'#c07040'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(2,2); ctx.lineTo(13,-1); ctx.stroke();
  // Throw indicator when paintT is close
  if(en.paintT!==undefined && en.paintT < 1){
    ctx.globalAlpha = 1 - en.paintT;
    ctx.fillStyle='#ff4040';
    ctx.beginPath(); ctx.arc(18, -4, 5, 0, TAU); ctx.fill();
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

export function drawMotorbikeRef(en){
  var t = performance.now()*0.005;
  ctx.save();
  ctx.translate(en.x+en.w/2, en.y+en.h/2);
  if(en.dir<0) ctx.scale(-1,1);
  var trapped = en.state==='trapped';
  var wheelRot = t * 8 * (trapped ? 0 : 1);
  // Exhaust trail
  if(!trapped){
    for(var se=0;se<3;se++){
      ctx.globalAlpha=0.15-se*0.04;
      ctx.fillStyle='#888';
      ctx.beginPath(); ctx.arc(-18-se*6, 8+Math.sin(t*3+se)*2, 5+se, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  // Wheels
  ctx.strokeStyle=trapped?'#888':'#1a1a1a'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(-14,8,8,0,TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(14,8,8,0,TAU); ctx.stroke();
  // Spokes
  ctx.lineWidth=1.5;
  for(var sp=0;sp<4;sp++){
    var sa = wheelRot + sp*Math.PI/2;
    ctx.beginPath(); ctx.moveTo(-14+Math.cos(sa)*8,8+Math.sin(sa)*8);
    ctx.lineTo(-14-Math.cos(sa)*8,8-Math.sin(sa)*8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14+Math.cos(sa)*8,8+Math.sin(sa)*8);
    ctx.lineTo(14-Math.cos(sa)*8,8-Math.sin(sa)*8); ctx.stroke();
  }
  ctx.fillStyle=trapped?'#888':'#222';
  ctx.beginPath(); ctx.arc(-14,8,3.5,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(14,8,3.5,0,TAU); ctx.fill();
  // Frame
  ctx.strokeStyle=trapped?'#aaa':'#c0392b'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(-12,4); ctx.lineTo(0,-4); ctx.lineTo(12,4);
  ctx.moveTo(-12,4); ctx.lineTo(12,4); ctx.stroke();
  // Forks
  ctx.strokeStyle=trapped?'#aaa':'#888'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(8,-6); ctx.lineTo(14,0); ctx.stroke();
  // Handlebars
  ctx.beginPath(); ctx.moveTo(6,-5); ctx.lineTo(11,-8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6,-5); ctx.lineTo(11,-3); ctx.stroke();
  // Rider body (hunched forward)
  ctx.fillStyle=trapped?'#aaa':'#1a3050';
  ctx.beginPath(); ctx.moveTo(-4,-2); ctx.lineTo(8,-6); ctx.lineTo(10,4); ctx.lineTo(-2,4); ctx.closePath(); ctx.fill();
  // Helmet
  ctx.fillStyle=trapped?'#ccc':'#e85000';
  ctx.beginPath(); ctx.arc(3,-9,8,Math.PI*0.85,TAU*0.85); ctx.fill();
  // Visor
  ctx.fillStyle=trapped?'#ccc8':'#ffcc0088';
  ctx.fillRect(-1,-12,8,4);
  ctx.restore();
}

/* Paint blob draw */
export function drawPaintBlobs(paintBlobs){
  paintBlobs.forEach(function(pb){
    ctx.save();
    ctx.fillStyle = pb.color;
    ctx.globalAlpha = Math.max(0, 1 - pb.t/pb.life);
    ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fill();
    // Splat drip
    ctx.beginPath(); ctx.ellipse(pb.x, pb.y+pb.r*0.7, pb.r*0.4, pb.r*0.8, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha=1; ctx.restore();
  });
}

