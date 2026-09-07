/* =========================================================
   Ambient starfield (behind everything)
========================================================= */

import { TAU, rand } from './utils.js';

export function initStarfield(){
  var c = document.getElementById('starfield');
  var ctx = c.getContext('2d');
  var stars = [];
  function resize(){
    c.width = window.innerWidth * devicePixelRatio;
    c.height = window.innerHeight * devicePixelRatio;
    c.style.width = window.innerWidth+'px';
    c.style.height = window.innerHeight+'px';
    var n = Math.floor((window.innerWidth*window.innerHeight)/9000);
    stars = [];
    for(var i=0;i<n;i++){
      stars.push({
        x: Math.random()*c.width,
        y: Math.random()*c.height,
        r: Math.random()*1.4*devicePixelRatio + 0.3,
        p: Math.random()*TAU,
        s: rand(0.5,1.6)
      });
    }
  }
  window.addEventListener('resize', resize);
  resize();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(t){
    ctx.clearRect(0,0,c.width,c.height);
    for(var i=0;i<stars.length;i++){
      var s = stars[i];
      var tw = reduceMotion ? 0.8 : 0.55 + 0.45*Math.sin(t*0.001*s.s + s.p);
      ctx.globalAlpha = tw*0.8;
      ctx.fillStyle = '#cfe0ff';
      ctx.beginPath();
      ctx.arc(s.x,s.y,s.r,0,TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
