/* ---------- per-location theming ---------- */

import { TAU } from './utils.js';
import { ctx, W, H } from './canvas.js';
import { drawKelpieRef, drawScotCollectibleRef, drawBurglarRef, drawModenaCollectibleRef, drawHyenaRef, drawWaspRef, drawKenyaCollectibleRef, drawMimeRef, drawParisCollectibleRef, drawBansheeRef, drawIrelandCollectibleRef, drawGorgonRef, drawAthensCollectibleRef, drawDragonRef, drawTokyoCollectibleRef, drawBrazilCollectibleRef, drawNewyorkCollectibleRef, drawOniRef, drawPigeonRef } from './draw.js';
export function drawSkylineRow(buildings, color, baseY){
  ctx.fillStyle = color;
  buildings.forEach(function(b){
    ctx.fillRect(b.x, baseY-b.h, b.w, b.h);
  });
}

export var LEVEL_LAYOUTS = {
glasgow: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:40, y:350, w:160, h:18},
    {x:520, y:350, w:160, h:18},
    {x:220, y:262, w:280, h:18},
    {x:40, y:174, w:160, h:18},
    {x:520, y:174, w:160, h:18},
    {x:270, y:96, w:180, h:18}
  ],
  enemySpawns: [
    {x:260, y:230, platform:3},
    {x:600, y:404, platform:0},
    {x:70, y:322, platform:1},
    {x:300, y:68, platform:6},
    {x:520, y:146, platform:5}
  ],
  collectibleSpots: [
    {x:100, y:322, slot:'a'},{x:600, y:322, slot:'b'},{x:360, y:234, slot:'c'},
    {x:100, y:146, slot:'b'},{x:600, y:146, slot:'a'},{x:360, y:68, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:260, oy:310, w:120, h:18, axis:'x', amplitude:90, speed:0.7}
  ],
  enemyVariety: {specialType:'buckfast', waveRatio:0.4}
},
modena: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:20, y:350, w:200, h:18},
    {x:500, y:350, w:200, h:18},
    {x:160, y:255, w:400, h:18},
    {x:50, y:165, w:110, h:18},
    {x:560, y:165, w:110, h:18},
    {x:275, y:85, w:170, h:18}
  ],
  enemySpawns: [
    {x:80, y:320, platform:1},
    {x:580, y:320, platform:2},
    {x:280, y:225, platform:3},
    {x:80, y:135, platform:4},
    {x:580, y:135, platform:5}
  ],
  collectibleSpots: [
    {x:100, y:320, slot:'a'},{x:600, y:320, slot:'b'},{x:350, y:225, slot:'c'},
    {x:100, y:135, slot:'b'},{x:610, y:135, slot:'a'},{x:360, y:55, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:360, oy:210, w:100, h:18, axis:'y', amplitude:45, speed:0.9}
  ],
  enemyVariety: {specialType:'parmesan', waveRatio:0.5}
},
paris: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:30, y:375, w:130, h:18},
    {x:560, y:375, w:130, h:18},
    {x:75, y:285, w:170, h:18},
    {x:475, y:285, w:170, h:18},
    {x:35, y:190, w:135, h:18},
    {x:550, y:190, w:135, h:18},
    {x:295, y:100, w:130, h:18}
  ],
  enemySpawns: [
    {x:60, y:345, platform:1},
    {x:600, y:345, platform:2},
    {x:130, y:255, platform:3},
    {x:530, y:255, platform:4},
    {x:80, y:160, platform:5}
  ],
  collectibleSpots: [
    {x:80, y:345, slot:'a'},{x:610, y:345, slot:'b'},{x:145, y:255, slot:'c'},
    {x:530, y:255, slot:'b'},{x:90, y:160, slot:'a'},{x:350, y:70, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:280, oy:215, w:110, h:18, axis:'x', amplitude:80, speed:0.8}
  ],
  enemyVariety: {specialType:'artist', waveRatio:0.4}
},
ireland: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:15, y:360, w:220, h:18},
    {x:540, y:355, w:165, h:18},
    {x:255, y:270, w:210, h:18},
    {x:40, y:185, w:155, h:18},
    {x:525, y:185, w:155, h:18},
    {x:295, y:100, w:130, h:18}
  ],
  enemySpawns: [
    {x:80, y:330, platform:1},
    {x:595, y:325, platform:2},
    {x:310, y:240, platform:3},
    {x:95, y:155, platform:4},
    {x:570, y:155, platform:5}
  ],
  collectibleSpots: [
    {x:100, y:330, slot:'a'},{x:605, y:325, slot:'b'},{x:340, y:240, slot:'c'},
    {x:100, y:155, slot:'b'},{x:580, y:155, slot:'a'},{x:350, y:70, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:340, oy:225, w:115, h:18, axis:'x', amplitude:90, speed:0.65}
  ],
  enemyVariety: {specialType:'lukekelly', waveRatio:0.35}
},
kenya: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:20, y:365, w:155, h:18},
    {x:545, y:365, w:155, h:18},
    {x:245, y:295, w:230, h:18},
    {x:25, y:205, w:145, h:18},
    {x:550, y:205, w:145, h:18},
    {x:195, y:115, w:330, h:18}
  ],
  enemySpawns: [
    {x:70, y:335, platform:1},
    {x:605, y:335, platform:2},
    {x:310, y:265, platform:3},
    {x:70, y:175, platform:4},
    {x:605, y:175, platform:5}
  ],
  collectibleSpots: [
    {x:80, y:335, slot:'a'},{x:615, y:335, slot:'b'},{x:350, y:265, slot:'c'},
    {x:80, y:175, slot:'b'},{x:615, y:175, slot:'a'},{x:360, y:85, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:360, oy:255, w:130, h:18, axis:'x', amplitude:110, speed:1.0}
  ],
  enemyVariety: {specialType:'motorbike', waveRatio:0.5}
},
tokyo: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:20,  y:380, w:140, h:18},
    {x:200, y:320, w:140, h:18},
    {x:380, y:260, w:140, h:18},
    {x:520, y:200, w:140, h:18},
    {x:80,  y:145, w:140, h:18}
  ],
  enemySpawns: [
    {x:60, y:350, platform:1},
    {x:250, y:290, platform:2},
    {x:430, y:230, platform:3},
    {x:560, y:170, platform:4},
    {x:120, y:115, platform:5}
  ],
  collectibleSpots: [
    {x:80, y:350, slot:'a'},{x:260, y:290, slot:'b'},{x:440, y:230, slot:'c'},
    {x:575, y:170, slot:'a'},{x:130, y:115, slot:'b'},{x:350, y:230, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:300, oy:180, w:110, h:18, axis:'x', amplitude:80, speed:1.1}
  ],
  enemyVariety: {specialType:'fast', waveRatio:0.55}
},
brazil: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:30,  y:370, w:150, h:18},
    {x:560, y:355, w:130, h:18},
    {x:180, y:280, w:170, h:18},
    {x:460, y:255, w:130, h:18},
    {x:280, y:160, w:160, h:18}
  ],
  enemySpawns: [
    {x:80, y:340, platform:1},
    {x:600, y:325, platform:2},
    {x:240, y:250, platform:3},
    {x:500, y:225, platform:4},
    {x:330, y:130, platform:5}
  ],
  collectibleSpots: [
    {x:90, y:340, slot:'a'},{x:610, y:325, slot:'b'},{x:250, y:250, slot:'c'},
    {x:510, y:225, slot:'a'},{x:340, y:130, slot:'b'},{x:180, y:250, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:350, oy:310, w:120, h:18, axis:'y', amplitude:50, speed:0.85}
  ],
  enemyVariety: {specialType:'fast', waveRatio:0.4}
},
newyork: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:30,  y:370, w:130, h:18},
    {x:30,  y:270, w:130, h:18},
    {x:295, y:380, w:130, h:18},
    {x:295, y:270, w:130, h:18},
    {x:560, y:360, w:130, h:18},
    {x:560, y:240, w:130, h:18}
  ],
  enemySpawns: [
    {x:70, y:340, platform:1},
    {x:340, y:350, platform:3},
    {x:600, y:330, platform:5},
    {x:70, y:240, platform:2},
    {x:340, y:240, platform:4}
  ],
  collectibleSpots: [
    {x:80, y:340, slot:'a'},{x:350, y:350, slot:'b'},{x:610, y:330, slot:'c'},
    {x:90, y:240, slot:'b'},{x:360, y:240, slot:'a'},{x:600, y:210, slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:295, oy:165, w:130, h:18, axis:'x', amplitude:60, speed:0.75}
  ],
  enemyVariety: {specialType:'armoured', waveRatio:0.4}
},
athens: {
  platforms: [
    {x:0,   y:440, w:720, h:40, ground:true},
    {x:30,  y:375, w:140, h:18},
    {x:550, y:375, w:140, h:18},
    {x:140, y:290, w:180, h:18},
    {x:400, y:275, w:180, h:18},
    {x:290, y:95,  w:140, h:18}
  ],
  enemySpawns: [
    {x:70,  y:345, platform:1},
    {x:590, y:345, platform:2},
    {x:190, y:260, platform:3},
    {x:460, y:245, platform:4},
    {x:330, y:155, platform:0}
  ],
  collectibleSpots: [
    {x:90,  y:345, slot:'a'},{x:600, y:345, slot:'b'},{x:220, y:260, slot:'c'},
    {x:460, y:245, slot:'a'},{x:340, y:155, slot:'b'},{x:355, y:65,  slot:'c'}
  ],
  movingPlatformDefs: [
    {ox:270, oy:185, w:180, h:18, axis:'x', amplitude:60, speed:0.75}
  ],
  enemyVariety: {specialType:'fast', waveRatio:0.45}
},
boss: {
  platforms: [
    {x:0, y:440, w:720, h:40, ground:true},
    {x:35, y:330, w:105, h:18},
    {x:580, y:330, w:105, h:18},
    {x:255, y:240, w:210, h:18},
    {x:75, y:150, w:115, h:18},
    {x:530, y:150, w:115, h:18},
    {x:305, y:65, w:110, h:18}
  ],
  enemySpawns: [
    {x:330, y:390, platform:0}
  ],
  collectibleSpots: [
    {x:80, y:300, slot:'a'},{x:615, y:300, slot:'b'},{x:360, y:210, slot:'c'},
    {x:120, y:120, slot:'b'},{x:580, y:120, slot:'a'},{x:360, y:35, slot:'c'}
  ],
  movingPlatformDefs: [],
  enemyVariety: null
}
};

export var LEVELS = {
  glasgow: {
    name:'Glasgow',
    blurb:'Trap every kelpie in a bubble, then bump it to pop it. Grab shortbread, thistle and a tartan tam along the way for bonus points. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#7192b3', skyMid:'#a3c2d0', skyBottom:'#dfe9e1',
      sunColor:'rgba(238,242,230,0.85)',
      groundBase:'#48566c', groundEdge:'#6c7d95', detailColor:['#b48ee0','#8f6fce'],
      platformTop:'#c9a06a', platformBody:'#8a6642', platformDetail:'#3a3a3a',
      drawBackdrop:function(){
        // rain-washed rainbow, low opacity
        var cx=170, cy=330, colors=['#ff8a8a','#ffcf7a','#fff08a','#8fe0a0','#8fc6ff','#c7a0ff'];
        for(var i=0;i<colors.length;i++){
          ctx.strokeStyle = colors[i]; ctx.globalAlpha=0.22; ctx.lineWidth=6;
          ctx.beginPath(); ctx.arc(cx,cy,150-i*7,Math.PI,Math.PI*2); ctx.stroke();
        }
        ctx.globalAlpha=1;
        // tenement skyline
        drawSkylineRow([
          {x:0,w:70,h:70},{x:66,w:50,h:100},{x:112,w:60,h:60},{x:168,w:46,h:120},
          {x:210,w:60,h:80},{x:520,w:56,h:90},{x:572,w:44,h:60},{x:612,w:60,h:110},{x:668,w:52,h:75}
        ],'rgba(70,90,110,0.55)',300);
        // the Armadillo (Clyde Auditorium) - scalloped shell shapes
        ctx.fillStyle = 'rgba(180,200,215,0.7)';
        for(var s=0;s<5;s++){
          ctx.beginPath();
          ctx.ellipse(600+s*20, 300, 26, 46-s*3, 0, Math.PI, TAU);
          ctx.fill();
        }
      },
      drawCenterpiece:function(x,y){
        // Duke of Wellington statue, with the famous traffic cone
        ctx.save();
        ctx.translate(x,y);
        ctx.fillStyle = '#5b6a63';
        // plinth
        ctx.fillRect(-26,0,52,10);
        // horse body
        ctx.beginPath(); ctx.ellipse(0,-18,20,12,0,0,TAU); ctx.fill();
        // horse legs
        ctx.fillRect(-14,-10,4,14); ctx.fillRect(10,-10,4,14);
        // horse neck+head
        ctx.beginPath(); ctx.ellipse(-16,-30,7,12,-0.5,0,TAU); ctx.fill();
        // rider torso
        ctx.beginPath(); ctx.ellipse(2,-34,6,10,0,0,TAU); ctx.fill();
        // rider head
        ctx.beginPath(); ctx.arc(2,-46,5,0,TAU); ctx.fill();
        // traffic cone on head
        ctx.fillStyle = '#ff7a1f';
        ctx.beginPath(); ctx.moveTo(2,-58); ctx.lineTo(-4,-45); ctx.lineTo(8,-45); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-3,-49,10,2);
        ctx.restore();
      }
    },
    enemyDraw:drawKelpieRef,
    collectibleDraw:drawScotCollectibleRef,
    levelPhysics:{ gravity:1500 },
    locPowerup:{ type:'haggis', label:'HAGGIS!', color:'#d4843a', glowColor:'rgba(212,132,58,0.4)', effect:function(p){ p.shield = 10; } }
  },
  modena:{
    name:'Modena',
    blurb:'Trap every barrel-sprite in a bubble, then bump it to pop it. Grab parmesan, balsamic drops and a rare mini Ferrari for bonus points. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#4f9bd6', skyMid:'#8ec3dd', skyBottom:'#f3e2bd',
      sunColor:'rgba(255,217,138,0.95)',
      groundBase:'#a97a4e', groundEdge:'#cf9d63', detailColor:['#6a9a4c','#557f3d'],
      platformTop:'#c1543a', platformBody:'#9c6b4a', platformDetail:'#5c3b28',
      drawBackdrop:function(){
        // cypress trees
        ctx.fillStyle = 'rgba(50,80,50,0.5)';
        [40,120,560,660].forEach(function(x){
          ctx.beginPath(); ctx.moveTo(x,300); ctx.lineTo(x-8,260); ctx.quadraticCurveTo(x,240,x+8,260); ctx.lineTo(x,300); ctx.fill();
        });
        // terracotta rooftop skyline
        drawSkylineRow([
          {x:0,w:64,h:56},{x:60,w:60,h:80},{x:116,w:50,h:50},{x:520,w:50,h:60},
          {x:566,w:60,h:44},{x:622,w:56,h:74},{x:674,w:46,h:52}
        ],'rgba(150,90,60,0.5)',300);
      },
      drawCenterpiece:function(x,y){
        // Ghirlandina Tower - tall tapering campanile
        ctx.save();
        ctx.translate(x,y);
        ctx.fillStyle = '#d8bd8e';
        ctx.fillRect(-16,-90,32,90);
        ctx.fillStyle = '#c9a876';
        ctx.fillRect(-12,-104,24,14);
        ctx.beginPath(); ctx.moveTo(-12,-104); ctx.lineTo(0,-122); ctx.lineTo(12,-104); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(90,60,30,0.6)';
        for(var i=0;i<4;i++){ ctx.fillRect(-4,-82+i*18,8,10); }
        ctx.fillStyle = '#e8c98f';
        ctx.fillRect(0,-126,2,8);
        ctx.restore();
      }
    },
    enemyDraw:drawBurglarRef,
    collectibleDraw:drawModenaCollectibleRef,
    levelPhysics:{ gravity:1200 },
    locPowerup:{ type:'ferrari', label:'FERRARI!', color:'#e03030', glowColor:'rgba(220,48,48,0.4)', effect:function(p){ p.speedBoost = 10; } }
  },
  kenya:{
    name:'Kenya',
    blurb:'Trap every wasp in a bubble, then bump it to pop it. Grab a coffee bean, Maasai bead, and befriend the baby elephant for a companion! Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#c05a10', skyMid:'#e88a30', skyBottom:'#f5c98a',
      sunColor:'rgba(255,200,60,0.95)',
      groundBase:'#a05c28', groundEdge:'#c87c40', detailColor:['#8a7a50','#6a6038'],
      platformTop:'#c8a060', platformBody:'#8a6030', platformDetail:'#3a2a10',
      drawBackdrop:function(){
        // acacia trees silhouette
        ctx.fillStyle = 'rgba(40,25,10,0.55)';
        [[80,300,40],[160,310,30],[530,295,50],[640,308,36]].forEach(function(t){
          ctx.fillRect(t[0]-3,t[1]-t[2],6,t[2]);
          ctx.beginPath(); ctx.ellipse(t[0],t[1]-t[2],t[2]*0.9,t[2]*0.35,0,0,TAU); ctx.fill();
        });
        // distant Kilimanjaro
        ctx.fillStyle = 'rgba(90,70,50,0.35)';
        ctx.beginPath(); ctx.moveTo(240,300); ctx.lineTo(360,180); ctx.lineTo(480,300); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.moveTo(340,195); ctx.lineTo(360,180); ctx.lineTo(380,195); ctx.fill();
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // giraffe
        ctx.fillStyle = '#d4902a';
        // body
        ctx.beginPath(); ctx.ellipse(0,0,14,10,0,0,TAU); ctx.fill();
        // neck
        ctx.beginPath(); ctx.moveTo(-4,-10); ctx.lineTo(4,-10); ctx.lineTo(2,-55); ctx.lineTo(-2,-55); ctx.closePath(); ctx.fill();
        // head
        ctx.beginPath(); ctx.ellipse(0,-60,7,5,0,0,TAU); ctx.fill();
        // ossicones
        ctx.fillRect(-4,-68,3,10); ctx.fillRect(2,-68,3,10);
        // patches
        ctx.fillStyle = '#8a5010';
        [[0,0,5,4],[-8,-4,4,3],[7,-3,4,3],[0,-30,3,4],[-2,-45,3,3]].forEach(function(p){
          ctx.beginPath(); ctx.ellipse(p[0],p[1],p[2],p[3],0,0,TAU); ctx.fill();
        });
        // legs
        ctx.fillStyle = '#d4902a';
        [-8,8].forEach(function(lx){ ctx.fillRect(lx-2,8,4,20); });
        // eye
        ctx.fillStyle = '#1c1330';
        ctx.beginPath(); ctx.arc(4,-61,1.4,0,TAU); ctx.fill();
        ctx.restore();
      }
    },
    enemyDraw:drawWaspRef,
    collectibleDraw:drawKenyaCollectibleRef,
    levelPhysics:{ gravity:1500, enemySpeed:1.15 },
    locPowerup:{ type:'safari', label:'SAFARI!', color:'#e8a020', glowColor:'rgba(232,160,32,0.4)', effect:function(p){ freezeT = 3; } }
  },
  paris:{
    name:'Paris',
    blurb:'Trap every mime in a bubble, then bump it to pop it. Grab a baguette, croissant and a beret for bonus points. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#7ab2e8', skyMid:'#b8d4f0', skyBottom:'#f0e8d8',
      sunColor:'rgba(255,220,150,0.9)',
      groundBase:'#8a8070', groundEdge:'#b0a090', detailColor:['#c0b090','#a09070'],
      platformTop:'#b0a080', platformBody:'#807060', platformDetail:'#404030',
      drawBackdrop:function(){
        // Parisian rooftops
        drawSkylineRow([
          {x:0,w:72,h:68},{x:68,w:56,h:96},{x:120,w:48,h:52},{x:164,w:60,h:80},
          {x:500,w:52,h:64},{x:548,w:64,h:92},{x:608,w:50,h:56},{x:654,w:66,h:76}
        ],'rgba(80,70,60,0.5)',300);
        // mansard roofs
        ctx.fillStyle = 'rgba(60,55,50,0.5)';
        [[34,232,36,24],[94,204,28,26],[540,236,26,24],[580,208,32,28]].forEach(function(r){
          ctx.beginPath(); ctx.moveTo(r[0],r[1]); ctx.lineTo(r[0]+r[2]/2,r[1]-r[3]); ctx.lineTo(r[0]+r[2],r[1]); ctx.fill();
        });
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Eiffel Tower
        ctx.fillStyle = '#8a7a5a';
        // base legs
        ctx.beginPath(); ctx.moveTo(-46,0); ctx.lineTo(-28,-50); ctx.lineTo(-10,-50); ctx.lineTo(-6,0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(46,0); ctx.lineTo(28,-50); ctx.lineTo(10,-50); ctx.lineTo(6,0); ctx.fill();
        // middle section
        ctx.fillRect(-18,-50,36,30);
        // upper section
        ctx.beginPath(); ctx.moveTo(-16,-50); ctx.lineTo(-6,-95); ctx.lineTo(6,-95); ctx.lineTo(16,-50); ctx.fill();
        // spire
        ctx.beginPath(); ctx.moveTo(-4,-95); ctx.lineTo(0,-118); ctx.lineTo(4,-95); ctx.fill();
        // horizontal girders
        ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth=2;
        [-10,-30,-50,-70,-90].forEach(function(ty){ ctx.beginPath(); ctx.moveTo(-20+ty*0.2,ty); ctx.lineTo(20-ty*0.2,ty); ctx.stroke(); });
        ctx.restore();
      }
    },
    enemyDraw:drawMimeRef,
    collectibleDraw:drawParisCollectibleRef,
    levelPhysics:{ gravity:1500 },
    locPowerup:{ type:'croissant', label:'CROISSANT!', color:'#f0c030', glowColor:'rgba(240,192,48,0.4)', effect:function(p){ doubleScoreT = 8; } }
  },
  ireland:{
    name:'Ireland',
    blurb:'Trap every banshee in a bubble, then bump it to pop it. Grab a shamrock, golden harp and a pot of gold for bonus points. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#4a7a9a', skyMid:'#7ab0c0', skyBottom:'#c8e0cc',
      sunColor:'rgba(220,230,200,0.7)',
      groundBase:'#3a7a3a', groundEdge:'#5aa05a', detailColor:['#2a6a2a','#4a8a4a'],
      platformTop:'#6aaa5a', platformBody:'#4a7a3a', platformDetail:'#2a4a2a',
      drawBackdrop:function(){
        // rolling green hills
        ctx.fillStyle = 'rgba(40,100,40,0.45)';
        ctx.beginPath(); ctx.moveTo(0,300); ctx.quadraticCurveTo(120,230,240,300); ctx.lineTo(0,300); ctx.fill();
        ctx.beginPath(); ctx.moveTo(200,300); ctx.quadraticCurveTo(360,210,520,300); ctx.lineTo(200,300); ctx.fill();
        ctx.beginPath(); ctx.moveTo(480,300); ctx.quadraticCurveTo(600,240,720,300); ctx.lineTo(480,300); ctx.fill();
        // ruined castle
        ctx.fillStyle = 'rgba(90,80,70,0.5)';
        ctx.fillRect(580,230,50,70); ctx.fillRect(610,200,20,30);
        ctx.fillStyle = 'rgba(60,55,50,0.5)';
        ctx.fillRect(580,230,8,20); ctx.fillRect(622,230,8,20);
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Round Tower
        ctx.fillStyle = '#8a8070';
        ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-10,-80); ctx.lineTo(10,-80); ctx.lineTo(12,0); ctx.fill();
        // conical roof
        ctx.fillStyle = '#6a6050';
        ctx.beginPath(); ctx.moveTo(-14,-80); ctx.lineTo(0,-108); ctx.lineTo(14,-80); ctx.fill();
        // door arch
        ctx.fillStyle = '#4a4038';
        ctx.beginPath(); ctx.arc(0,-12,5,Math.PI,0); ctx.fillRect(-5,-12,10,12); ctx.fill();
        // stone lines
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth=1;
        [-20,-40,-60].forEach(function(ty){ ctx.beginPath(); ctx.moveTo(-12+ty*0.08,ty); ctx.lineTo(12-ty*0.08,ty); ctx.stroke(); });
        ctx.restore();
      }
    },
    enemyDraw:drawBansheeRef,
    collectibleDraw:drawIrelandCollectibleRef,
    levelPhysics:{ gravity:1500 },
    locPowerup:{ type:'shamrock', label:'LUCKY!', color:'#30c040', glowColor:'rgba(48,192,64,0.4)', effect:function(p){ lives = Math.min(lives + 1, 9); } }
  },
  tokyo:{
    name:'Tokyo',
    blurb:'Trap every oni in a bubble, then bump it to pop it. Grab a paper lantern, sushi and a lucky cat for bonus points. These little demons are quick — keep moving. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#1b1f3a', skyMid:'#4a3a6a', skyBottom:'#e79fb8',
      sunColor:'rgba(240,240,255,0.9)',
      groundBase:'#2a2e46', groundEdge:'#464c72', detailColor:['#ff5aa8','#5ad1ff'],
      platformTop:'#3c4a70', platformBody:'#28304c', platformDetail:'#8a5aff',
      drawBackdrop:function(){
        // neon high-rise skyline
        drawSkylineRow([
          {x:0,w:60,h:110},{x:58,w:44,h:150},{x:100,w:52,h:80},{x:150,w:40,h:130},
          {x:500,w:46,h:96},{x:544,w:58,h:140},{x:600,w:42,h:74},{x:640,w:60,h:120}
        ],'rgba(40,44,80,0.6)',300);
        // scattered neon signs
        ['#ff5aa8','#5ad1ff','#ffd23a','#7dff9a'].forEach(function(col,i){
          ctx.fillStyle = col; ctx.globalAlpha = 0.5;
          ctx.fillRect(30 + i*180, 170 + (i%2)*40, 26, 8);
          ctx.globalAlpha = 1;
        });
        // moon
        ctx.fillStyle = 'rgba(240,240,255,0.85)';
        ctx.beginPath(); ctx.arc(600,90,26,0,TAU); ctx.fill();
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // torii gate
        ctx.fillStyle = '#d6392f';
        ctx.fillRect(-34,-6,8,66);   // left pillar
        ctx.fillRect(26,-6,8,66);    // right pillar
        ctx.fillRect(-44,-10,88,8);  // lower lintel
        ctx.beginPath();             // upswept top lintel
        ctx.moveTo(-52,-24); ctx.quadraticCurveTo(0,-32,52,-24);
        ctx.lineTo(52,-16); ctx.quadraticCurveTo(0,-24,-52,-16); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-6,-16,12,6);   // centre plaque
        ctx.restore();
      }
    },
    enemyDraw:drawOniRef,
    collectibleDraw:drawTokyoCollectibleRef,
    levelPhysics:{ gravity:1400, enemySpeed:1.2 },
    locPowerup:{ type:'lantern', label:'LANTERN!', color:'#ff5aa8', glowColor:'rgba(255,90,168,0.4)', effect:function(p){ p.shield = 8; } }
  },
  brazil:{
    name:'Brazil',
    blurb:'Trap every jungle-sprite in a bubble, then bump it to pop it. Grab a carnival feather, football and a toucan for bonus points. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#1f8fae', skyMid:'#4fc2c0', skyBottom:'#f3e6a8',
      sunColor:'rgba(255,224,120,0.95)',
      groundBase:'#7a9a3a', groundEdge:'#9dc255', detailColor:['#2f8f4a','#f0b429'],
      platformTop:'#c98a3a', platformBody:'#8a5a2a', platformDetail:'#3a2a10',
      drawBackdrop:function(){
        // Sugarloaf Mountain + hills
        ctx.fillStyle = 'rgba(40,90,60,0.4)';
        ctx.beginPath(); ctx.moveTo(0,300); ctx.quadraticCurveTo(120,210,250,300); ctx.fill();
        ctx.beginPath(); ctx.moveTo(430,300); ctx.quadraticCurveTo(560,150,690,300); ctx.fill();
        // rainforest canopy blobs
        ctx.fillStyle = 'rgba(30,110,55,0.5)';
        [[60,300,34],[150,308,26],[300,304,30],[560,300,40],[650,306,28]].forEach(function(t){
          ctx.beginPath(); ctx.ellipse(t[0],t[1]-t[2],t[2],t[2]*0.6,0,0,TAU); ctx.fill();
          ctx.fillRect(t[0]-2,t[1]-t[2],4,t[2]);
        });
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Christ the Redeemer on a plinth
        ctx.fillStyle = '#8a8a8a';
        ctx.fillRect(-6,-4,12,4);           // plinth
        ctx.fillStyle = '#cfcfcf';
        ctx.fillRect(-3,-40,6,36);          // robe/body
        ctx.fillRect(-22,-34,44,5);         // outstretched arms
        ctx.beginPath(); ctx.arc(0,-44,4,0,TAU); ctx.fill(); // head
        ctx.restore();
      }
    },
    enemyDraw:drawHyenaRef,
    collectibleDraw:drawBrazilCollectibleRef,
    levelPhysics:{ gravity:1450, enemySpeed:1.1 },
    locPowerup:{ type:'samba', label:'SAMBA!', color:'#2fbf6a', glowColor:'rgba(47,191,106,0.4)', effect:function(p){ p.speedBoost = 9; } }
  },
  newyork:{
    name:'New York',
    blurb:'Trap every pigeon in a bubble, then bump it to pop it. Grab a pretzel, yellow taxi and a Liberty torch for bonus points. The flock scatters fast and comes back angrier. Walk off either edge to wrap around the map.',
    values:{ a:100, b:60, c:250, pop:150 },
    theme:{
      skyTop:'#3a4a6a', skyMid:'#8a94ac', skyBottom:'#e6b98a',
      sunColor:'rgba(255,200,140,0.85)',
      groundBase:'#4a4a52', groundEdge:'#6c6c76', detailColor:['#c8c8d0','#9a9aa6'],
      platformTop:'#9aa0aa', platformBody:'#6a6f7c', platformDetail:'#3a3d46',
      drawBackdrop:function(){
        // dense skyscraper skyline
        drawSkylineRow([
          {x:0,w:54,h:150},{x:52,w:40,h:110},{x:90,w:60,h:180},{x:150,w:44,h:120},
          {x:470,w:48,h:140},{x:516,w:64,h:200},{x:578,w:40,h:100},{x:616,w:56,h:160},{x:670,w:50,h:120}
        ],'rgba(70,74,92,0.6)',300);
        // Empire State-ish spire
        ctx.fillStyle = 'rgba(90,94,112,0.7)';
        ctx.fillRect(336,150,20,150);
        ctx.beginPath(); ctx.moveTo(336,150); ctx.lineTo(346,120); ctx.lineTo(356,150); ctx.fill();
        ctx.fillRect(344,100,4,22);
        // lit windows
        ctx.fillStyle = 'rgba(255,220,120,0.5)';
        for(var wx=0;wx<7;wx++){ for(var wy=0;wy<10;wy++){
          if((wx+wy)%3===0) ctx.fillRect(338+wx*2.4,158+wy*13,1.6,6);
        } }
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Statue of Liberty
        ctx.fillStyle = '#5bbfa6';
        ctx.fillRect(-8,-6,16,6);            // pedestal
        ctx.fillRect(-4,-48,8,42);           // robe
        ctx.fillRect(-4,-52,8,4);            // shoulders
        ctx.beginPath(); ctx.arc(0,-56,4,0,TAU); ctx.fill();  // head
        // crown spikes
        for(var s=-2;s<=2;s++){ ctx.beginPath(); ctx.moveTo(s*2,-60); ctx.lineTo(s*2,-66); ctx.stroke(); }
        // raised torch arm
        ctx.fillRect(6,-64,4,16);
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath(); ctx.arc(8,-66,3,0,TAU); ctx.fill();
        ctx.restore();
      }
    },
    enemyDraw:drawPigeonRef,
    collectibleDraw:drawNewyorkCollectibleRef,
    levelPhysics:{ gravity:1500, enemySpeed:1.15 },
    locPowerup:{ type:'bagel', label:'BAGEL!', color:'#e0a94a', glowColor:'rgba(224,169,74,0.4)', effect:function(p){ p.shield = 8; } }
  },
  athens:{
    name:'Athens',
    blurb:'Trap every gorgon in a bubble, then bump it to pop it. Grab an olive branch, amphora and a mini Parthenon for bonus points. Watch out — these stone-faced enemies move fast!',
    values:{ a:120, b:80, c:300, pop:200 },
    theme:{
      skyTop:'#3a7ab8', skyMid:'#6eb0d8', skyBottom:'#f2e8c8',
      sunColor:'rgba(255,230,100,0.98)',
      groundBase:'#c8a878', groundEdge:'#e8c898', detailColor:['#d4c090','#b8a878'],
      platformTop:'#f0ead8', platformBody:'#d4c8a8', platformDetail:'#8a8070',
      drawBackdrop:function(){
        // Aegean sea hint at horizon
        ctx.fillStyle = 'rgba(50,140,200,0.18)';
        ctx.fillRect(0, 310, 720, 130);
        // Parthenon columns silhouette
        ctx.fillStyle = 'rgba(180,165,130,0.55)';
        var colBase = 380, colTop = 210;
        ctx.fillRect(colBase - 110, colTop - 6, 220, 8); // entablature
        for(var ci=0; ci<9; ci++){
          ctx.fillRect(colBase - 106 + ci * 24, colTop + 2, 10, 124);
        }
        ctx.fillRect(colBase - 114, colTop + 126, 228, 12); // stylobate
        // rocky acropolis hill
        ctx.fillStyle = 'rgba(140,120,90,0.4)';
        ctx.beginPath();
        ctx.moveTo(260, 440); ctx.quadraticCurveTo(360, 315, 460, 440); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(200, 440); ctx.quadraticCurveTo(280, 340, 400, 360); ctx.quadraticCurveTo(490, 345, 560, 440); ctx.fill();
        // olive trees
        ctx.fillStyle = 'rgba(60,90,50,0.5)';
        [[80,340,22],[640,345,18],[130,380,16],[680,375,14]].forEach(function(t){
          ctx.fillRect(t[0]-2, t[1]-t[2], 4, t[2]);
          ctx.beginPath(); ctx.ellipse(t[0], t[1]-t[2], t[2]*0.75, t[2]*0.5, 0, 0, TAU); ctx.fill();
        });
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Caryatid figure (female column from Erechtheion)
        ctx.fillStyle = '#d8ceb8';
        // base
        ctx.fillRect(-12, 0, 24, 8);
        // draped body
        ctx.beginPath(); ctx.moveTo(-10,-2); ctx.lineTo(-8,-70); ctx.lineTo(8,-70); ctx.lineTo(10,-2); ctx.fill();
        // drapery folds
        ctx.strokeStyle = '#b8a898'; ctx.lineWidth=1.5;
        [-6,-2,2,6].forEach(function(lx){
          ctx.beginPath(); ctx.moveTo(lx,-4); ctx.lineTo(lx-1,-68); ctx.stroke();
        });
        // head
        ctx.fillStyle = '#d8ceb8';
        ctx.beginPath(); ctx.arc(0,-76,8,0,TAU); ctx.fill();
        // capital (top block)
        ctx.fillRect(-14,-88,28,10);
        // hair / headdress
        ctx.fillStyle = '#a09080';
        ctx.beginPath(); ctx.arc(0,-76,8,Math.PI,0); ctx.fill();
        ctx.restore();
      }
    },
    enemyDraw:drawGorgonRef,
    collectibleDraw:drawAthensCollectibleRef,
    levelPhysics:{ gravity:1300 },
    locPowerup:{ type:'olive', label:'OLIVE!', color:'#7ab840', glowColor:'rgba(122,184,64,0.4)', effect:function(p){ slowT = 5; } }
  },
  boss:{
    name:'China',
    blurb:'A mighty dragon guards the mountains. Three hits to defeat it — each hit makes it faster and angrier. This is the final test.',
    values:{ a:100, b:60, c:250, pop:500 },
    theme:{
      skyTop:'#c0392b', skyMid:'#e74c3c', skyBottom:'#f39c12',
      sunColor:'rgba(255,220,50,0.95)',
      groundBase:'#5d4037', groundEdge:'#795548', detailColor:['#c0392b','#e74c3c'],
      platformTop:'#c0392b', platformBody:'#922b21', platformDetail:'#7b241c',
      drawBackdrop:function(){
        // misty mountains
        ctx.fillStyle = 'rgba(120,80,60,0.35)';
        [[0,300,120,220,240,300],[180,300,340,195,500,300],[420,300,560,215,720,300]].forEach(function(pts){
          ctx.beginPath(); ctx.moveTo(pts[0],pts[1]); ctx.quadraticCurveTo(pts[2],pts[3],pts[4],pts[5]); ctx.lineTo(pts[4],400); ctx.lineTo(pts[0],400); ctx.fill();
        });
        // The Great Wall silhouette
        ctx.fillStyle = 'rgba(100,60,40,0.5)';
        ctx.fillRect(0,270,720,12);
        for(var ti=0;ti<14;ti++){ ctx.fillRect(ti*52,255,28,18); }
        // pagoda
        ctx.fillStyle = 'rgba(180,40,30,0.55)';
        ctx.fillRect(560,210,60,60); ctx.fillRect(550,200,80,14);
        ctx.fillRect(565,195,50,8); ctx.fillRect(575,188,30,8);
        ctx.fillStyle = 'rgba(220,60,40,0.6)';
        ctx.fillRect(546,198,88,6); ctx.fillRect(562,186,56,6); ctx.fillRect(572,178,36,6);
      },
      drawCenterpiece:function(x,y){
        ctx.save(); ctx.translate(x,y);
        // Chinese temple gate (paifang)
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-36,0,8,80); ctx.fillRect(28,0,8,80);
        ctx.fillRect(-40,-8,88,14); ctx.fillRect(-34,-24,76,18);
        ctx.fillRect(-30,-38,68,16);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(-38,-10,84,4); ctx.fillRect(-36,-26,72,4); ctx.fillRect(-32,-40,64,4);
        ctx.fillStyle = '#922b21';
        ctx.beginPath(); ctx.moveTo(-42,-8); ctx.lineTo(-36,-28); ctx.lineTo(-30,-8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(30,-8); ctx.lineTo(36,-28); ctx.lineTo(42,-8); ctx.fill();
        ctx.restore();
      }
    },
    enemyDraw:drawDragonRef,
    collectibleDraw:drawScotCollectibleRef
  }
};


