/* ---------- audio ---------- */

var _getMuted = function(){ return false; };
export function setMutedGetter(fn){ _getMuted = fn; }

var audioCtx = null;
export function ac(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
export function suspendAudio(){ if(audioCtx) audioCtx.suspend(); }
export function resumeAudio(){ if(audioCtx) audioCtx.resume(); }
export var masterGain = null;
export function getMasterGain(){
  if(!masterGain){
    masterGain = ac().createGain();
    masterGain.gain.value = _getMuted() ? 0 : parseFloat(document.getElementById("volSlider").value);
    masterGain.connect(ac().destination);
  }
  return masterGain;
}
export function setMasterVolume(v){
  if(masterGain) masterGain.gain.value = v;
}
export function playSound(type){
  try{
    var c = ac(), now = c.currentTime;
    var g = c.createGain(); g.connect(getMasterGain());
    var o = c.createOscillator(); o.connect(g);
    if(type==='jump'){
      o.type='sine'; o.frequency.setValueAtTime(280,now); o.frequency.linearRampToValueAtTime(520,now+0.12);
      g.gain.setValueAtTime(0.22,now); g.gain.linearRampToValueAtTime(0,now+0.14);
      o.start(now); o.stop(now+0.14);
    } else if(type==='shoot'){
      o.type='square'; o.frequency.setValueAtTime(700,now); o.frequency.linearRampToValueAtTime(400,now+0.08);
      g.gain.setValueAtTime(0.12,now); g.gain.linearRampToValueAtTime(0,now+0.1);
      o.start(now); o.stop(now+0.1);
    } else if(type==='trap'){
      o.type='sawtooth'; o.frequency.setValueAtTime(180,now); o.frequency.linearRampToValueAtTime(90,now+0.18);
      g.gain.setValueAtTime(0.25,now); g.gain.linearRampToValueAtTime(0,now+0.2);
      o.start(now); o.stop(now+0.2);
    } else if(type==='pop'){
      o.type='sine'; o.frequency.setValueAtTime(420,now); o.frequency.linearRampToValueAtTime(80,now+0.15);
      g.gain.setValueAtTime(0.35,now); g.gain.linearRampToValueAtTime(0,now+0.18);
      o.start(now); o.stop(now+0.18);
      // noise burst
      var buf = c.createBuffer(1,c.sampleRate*0.08,c.sampleRate);
      var d = buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns = c.createBufferSource(); ns.buffer=buf;
      var ng = c.createGain(); ng.gain.setValueAtTime(0.18,now); ng.gain.linearRampToValueAtTime(0,now+0.08);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.08);
    } else if(type==='collect'){
      o.type='sine'; o.frequency.setValueAtTime(660,now); o.frequency.linearRampToValueAtTime(880,now+0.12);
      g.gain.setValueAtTime(0.2,now); g.gain.linearRampToValueAtTime(0,now+0.15);
      o.start(now); o.stop(now+0.15);
    } else if(type==='lose'){
      o.type='sine'; o.frequency.setValueAtTime(440,now); o.frequency.linearRampToValueAtTime(180,now+0.45);
      g.gain.setValueAtTime(0.3,now); g.gain.linearRampToValueAtTime(0,now+0.5);
      o.start(now); o.stop(now+0.5);
    } else if(type==='powerup'){
      [0,0.08,0.16].forEach(function(t,i){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=[523,659,784][i];
        pg.gain.setValueAtTime(0.22,now+t); pg.gain.linearRampToValueAtTime(0,now+t+0.1);
        po.start(now+t); po.stop(now+t+0.1);
      });
      o.stop(now); // unused
    } else if(type==='win'){
      [[523,0],[659,0.1],[784,0.2],[1047,0.32]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=f[0];
        pg.gain.setValueAtTime(0.25,now+f[1]); pg.gain.linearRampToValueAtTime(0,now+f[1]+0.18);
        po.start(now+f[1]); po.stop(now+f[1]+0.2);
      });
      o.stop(now);
    } else if(type==='beep'){
      o.type='sine'; o.frequency.setValueAtTime(880,now); o.frequency.linearRampToValueAtTime(880,now+0.08);
      g.gain.setValueAtTime(0.18,now); g.gain.linearRampToValueAtTime(0,now+0.1);
      o.start(now); o.stop(now+0.1);
    } else if(type==='go'){
      o.type='sine'; o.frequency.setValueAtTime(440,now); o.frequency.linearRampToValueAtTime(880,now+0.2);
      g.gain.setValueAtTime(0.25,now); g.gain.linearRampToValueAtTime(0,now+0.25);
      o.start(now); o.stop(now+0.25);
    } else if(type==='achievement'){
      // triumphant rising fanfare: C-E-G-C-E (two octaves)
      [[523,0],[659,0.11],[784,0.22],[1047,0.34],[1319,0.48]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=f[0];
        pg.gain.setValueAtTime(0,now+f[1]);
        pg.gain.linearRampToValueAtTime(0.28,now+f[1]+0.04);
        pg.gain.linearRampToValueAtTime(0,now+f[1]+0.22);
        po.start(now+f[1]); po.stop(now+f[1]+0.24);
      });
      // shimmer overtone layer
      var po2=c.createOscillator(), pg2=c.createGain();
      po2.connect(pg2); pg2.connect(getMasterGain());
      po2.type='triangle'; po2.frequency.value=2093;
      pg2.gain.setValueAtTime(0,now+0.48); pg2.gain.linearRampToValueAtTime(0.12,now+0.52);
      pg2.gain.linearRampToValueAtTime(0,now+0.85);
      po2.start(now+0.48); po2.stop(now+0.86);
      o.stop(now);
    } else if(type==='chase'){
      [0,0.15,0.3].forEach(function(t){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sawtooth'; po.frequency.value=t%0.3===0?880:440;
        pg.gain.setValueAtTime(0.18,now+t); pg.gain.linearRampToValueAtTime(0,now+t+0.12);
        po.start(now+t); po.stop(now+t+0.14);
      });
      o.stop(now);
    } else if(type==='pop_combo'){
      // Ascending sparkle pop — bright and snappy
      o.type='sine'; o.frequency.setValueAtTime(520,now); o.frequency.linearRampToValueAtTime(1400,now+0.13);
      g.gain.setValueAtTime(0.32,now); g.gain.linearRampToValueAtTime(0,now+0.15);
      o.start(now); o.stop(now+0.15);
      // crisp noise burst
      var buf=c.createBuffer(1,c.sampleRate*0.06,c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var ng=c.createGain(); ng.gain.setValueAtTime(0.28,now); ng.gain.linearRampToValueAtTime(0,now+0.06);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.06);
      // sparkle chime on top
      [0.05,0.09].forEach(function(t,i){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=[1047,1319][i];
        pg.gain.setValueAtTime(0.15,now+t); pg.gain.linearRampToValueAtTime(0,now+t+0.1);
        po.start(now+t); po.stop(now+t+0.12);
      });
    } else if(type==='powerup_big'){
      // Rising arpeggio sweep + final chord punch
      [[330,0],[440,0.07],[554,0.14],[660,0.21],[880,0.28]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='square'; po.frequency.value=f[0];
        pg.gain.setValueAtTime(0,now+f[1]);
        pg.gain.linearRampToValueAtTime(0.18,now+f[1]+0.03);
        pg.gain.linearRampToValueAtTime(0,now+f[1]+0.11);
        po.start(now+f[1]); po.stop(now+f[1]+0.13);
      });
      [523,659,784].forEach(function(freq){
        var po=c.createOscillator(), pg=c.createGain();
        po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=freq;
        pg.gain.setValueAtTime(0.22,now+0.35); pg.gain.linearRampToValueAtTime(0,now+0.65);
        po.start(now+0.35); po.stop(now+0.67);
      });
      o.stop(now);
    } else if(type==='pop_glasgow'){
      // Gritty heavy thud — low sine + fat noise burst
      o.type='sine'; o.frequency.setValueAtTime(320,now); o.frequency.linearRampToValueAtTime(50,now+0.18);
      g.gain.setValueAtTime(0.42,now); g.gain.linearRampToValueAtTime(0,now+0.2);
      o.start(now); o.stop(now+0.2);
      var buf=c.createBuffer(1,Math.ceil(c.sampleRate*0.1),c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var ng=c.createGain(); ng.gain.setValueAtTime(0.32,now); ng.gain.linearRampToValueAtTime(0,now+0.12);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.12);
    } else if(type==='pop_modena'){
      // Italian bubbly ascending pop
      o.type='sine'; o.frequency.setValueAtTime(300,now); o.frequency.linearRampToValueAtTime(720,now+0.14);
      g.gain.setValueAtTime(0.28,now); g.gain.linearRampToValueAtTime(0,now+0.17);
      o.start(now); o.stop(now+0.17);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.value=1047;
      pg.gain.setValueAtTime(0.12,now+0.06); pg.gain.linearRampToValueAtTime(0,now+0.2);
      po.start(now+0.06); po.stop(now+0.21);
    } else if(type==='pop_paris'){
      // Elegant twinkle — two rising notes
      o.type='sine'; o.frequency.setValueAtTime(660,now); o.frequency.linearRampToValueAtTime(880,now+0.1);
      g.gain.setValueAtTime(0.22,now); g.gain.linearRampToValueAtTime(0,now+0.14);
      o.start(now); o.stop(now+0.14);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='triangle'; po.frequency.value=1320;
      pg.gain.setValueAtTime(0.16,now+0.08); pg.gain.linearRampToValueAtTime(0,now+0.22);
      po.start(now+0.08); po.stop(now+0.23);
    } else if(type==='pop_ireland'){
      // Warm folk pluck — triangle, mid frequency, harmonic overtone
      o.type='triangle'; o.frequency.setValueAtTime(400,now); o.frequency.linearRampToValueAtTime(140,now+0.2);
      g.gain.setValueAtTime(0.38,now); g.gain.linearRampToValueAtTime(0,now+0.22);
      o.start(now); o.stop(now+0.22);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.value=800;
      pg.gain.setValueAtTime(0.1,now); pg.gain.linearRampToValueAtTime(0,now+0.12);
      po.start(now); po.stop(now+0.13);
    } else if(type==='pop_kenya'){
      // Bright percussive click + tiny noise snap
      o.type='square'; o.frequency.setValueAtTime(520,now); o.frequency.linearRampToValueAtTime(1100,now+0.06);
      g.gain.setValueAtTime(0.3,now); g.gain.linearRampToValueAtTime(0,now+0.1);
      o.start(now); o.stop(now+0.1);
      var buf=c.createBuffer(1,Math.ceil(c.sampleRate*0.04),c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var ng=c.createGain(); ng.gain.setValueAtTime(0.2,now); ng.gain.linearRampToValueAtTime(0,now+0.04);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.04);
    } else if(type==='combo_3'){
      // Two staggered sparkles + chime
      [[520,0,1400],[680,0.08,1600]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.setValueAtTime(f[0],now+f[1]); po.frequency.linearRampToValueAtTime(f[2],now+f[1]+0.12);
        pg.gain.setValueAtTime(0.28,now+f[1]); pg.gain.linearRampToValueAtTime(0,now+f[1]+0.14);
        po.start(now+f[1]); po.stop(now+f[1]+0.15);
      });
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.value=1568;
      pg.gain.setValueAtTime(0.18,now+0.16); pg.gain.linearRampToValueAtTime(0,now+0.3);
      po.start(now+0.16); po.stop(now+0.32);
      o.stop(now);
    } else if(type==='combo_4'){
      // Three sparkles in cascade + bell
      [[480,0,1200],[600,0.07,1500],[740,0.14,1800]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.setValueAtTime(f[0],now+f[1]); po.frequency.linearRampToValueAtTime(f[2],now+f[1]+0.13);
        pg.gain.setValueAtTime(0.3,now+f[1]); pg.gain.linearRampToValueAtTime(0,now+f[1]+0.15);
        po.start(now+f[1]); po.stop(now+f[1]+0.16);
      });
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='triangle'; po.frequency.value=2093;
      pg.gain.setValueAtTime(0.22,now+0.22); pg.gain.linearRampToValueAtTime(0,now+0.5);
      po.start(now+0.22); po.stop(now+0.52);
      o.stop(now);
    } else if(type==='combo_max'){
      // 5+ combo: ascending cascade + bass thump + sparkle rain
      [[400,0],[520,0.06],[640,0.12],[800,0.18],[1000,0.24],[1300,0.3]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=f[0];
        pg.gain.setValueAtTime(0.25,now+f[1]); pg.gain.linearRampToValueAtTime(0,now+f[1]+0.15);
        po.start(now+f[1]); po.stop(now+f[1]+0.17);
      });
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.setValueAtTime(120,now); po.frequency.linearRampToValueAtTime(40,now+0.2);
      pg.gain.setValueAtTime(0.5,now); pg.gain.linearRampToValueAtTime(0,now+0.25);
      po.start(now); po.stop(now+0.26);
      [0.32,0.38,0.44].forEach(function(t){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='triangle'; po.frequency.value=1760+Math.random()*500;
        pg.gain.setValueAtTime(0.12,now+t); pg.gain.linearRampToValueAtTime(0,now+t+0.1);
        po.start(now+t); po.stop(now+t+0.12);
      });
      o.stop(now);
    } else if(type==='powerup_speed'){
      // Fast whoosh double-sweep
      o.type='sawtooth'; o.frequency.setValueAtTime(200,now); o.frequency.linearRampToValueAtTime(1800,now+0.12);
      g.gain.setValueAtTime(0.25,now); g.gain.linearRampToValueAtTime(0,now+0.15);
      o.start(now); o.stop(now+0.15);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.setValueAtTime(800,now+0.1); po.frequency.linearRampToValueAtTime(2200,now+0.22);
      pg.gain.setValueAtTime(0.2,now+0.1); pg.gain.linearRampToValueAtTime(0,now+0.25);
      po.start(now+0.1); po.stop(now+0.26);
    } else if(type==='powerup_rapid'){
      // Rapid-fire burst of clicks
      [0,0.05,0.1,0.15,0.2].forEach(function(t){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='square'; po.frequency.value=900+t*400;
        pg.gain.setValueAtTime(0.2,now+t); pg.gain.linearRampToValueAtTime(0,now+t+0.04);
        po.start(now+t); po.stop(now+t+0.05);
      });
      o.stop(now);
    } else if(type==='powerup_shield'){
      // Resonant protective chord swell
      [392,523,659].forEach(function(freq){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sine'; po.frequency.value=freq;
        pg.gain.setValueAtTime(0,now); pg.gain.linearRampToValueAtTime(0.22,now+0.1);
        pg.gain.linearRampToValueAtTime(0,now+0.55);
        po.start(now); po.stop(now+0.57);
      });
      o.stop(now);
    } else if(type==='powerup_magnet'){
      // Low whump then magnetic snap upward
      o.type='sine'; o.frequency.setValueAtTime(80,now); o.frequency.linearRampToValueAtTime(30,now+0.15);
      g.gain.setValueAtTime(0.35,now); g.gain.linearRampToValueAtTime(0,now+0.18);
      o.start(now); o.stop(now+0.18);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.setValueAtTime(200,now+0.18); po.frequency.linearRampToValueAtTime(880,now+0.28);
      pg.gain.setValueAtTime(0.22,now+0.18); pg.gain.linearRampToValueAtTime(0,now+0.32);
      po.start(now+0.18); po.stop(now+0.33);
    } else if(type==='powerup_ghost'){
      // Ethereal shimmer — phasing triangle waves
      [0,0.06,0.12,0.18].forEach(function(t,i){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='triangle'; po.frequency.value=523*(1+i*0.25);
        pg.gain.setValueAtTime(0,now+t); pg.gain.linearRampToValueAtTime(0.16,now+t+0.08);
        pg.gain.linearRampToValueAtTime(0,now+t+0.35);
        po.start(now+t); po.stop(now+t+0.37);
      });
      o.stop(now);
    } else if(type==='shield_block'){
      // Metallic clank — layered sawtooth harmonics
      [200,400,600].forEach(function(freq){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sawtooth'; po.frequency.value=freq;
        pg.gain.setValueAtTime(0.16,now); pg.gain.linearRampToValueAtTime(0,now+0.13);
        po.start(now); po.stop(now+0.14);
      });
      o.stop(now);
    } else if(type==='life_lost'){
      // Cartoon descending ouch
      o.type='sine'; o.frequency.setValueAtTime(440,now); o.frequency.linearRampToValueAtTime(200,now+0.2);
      g.gain.setValueAtTime(0.28,now); g.gain.linearRampToValueAtTime(0.25,now+0.2); g.gain.linearRampToValueAtTime(0,now+0.38);
      o.start(now); o.stop(now+0.4);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.setValueAtTime(220,now+0.22); po.frequency.linearRampToValueAtTime(110,now+0.38);
      pg.gain.setValueAtTime(0.2,now+0.22); pg.gain.linearRampToValueAtTime(0,now+0.42);
      po.start(now+0.22); po.stop(now+0.43);
    } else if(type==='wave2'){
      // Dramatic "duh-duh-DUUUH" wave 2 announcement
      [[330,0,0.12],[330,0.16,0.12],[220,0.32,0.5]].forEach(function(f){
        var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
        po.type='sawtooth'; po.frequency.value=f[0];
        pg.gain.setValueAtTime(0.3,now+f[1]); pg.gain.linearRampToValueAtTime(0,now+f[1]+f[2]);
        po.start(now+f[1]); po.stop(now+f[1]+f[2]+0.02);
      });
      o.stop(now);
    } else if(type==='land'){
      // Soft thud — low sine + tiny noise
      o.type='sine'; o.frequency.setValueAtTime(90,now); o.frequency.linearRampToValueAtTime(40,now+0.08);
      g.gain.setValueAtTime(0.22,now); g.gain.linearRampToValueAtTime(0,now+0.1);
      o.start(now); o.stop(now+0.1);
      var buf=c.createBuffer(1,Math.ceil(c.sampleRate*0.04),c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var ng=c.createGain(); ng.gain.setValueAtTime(0.1,now); ng.gain.linearRampToValueAtTime(0,now+0.05);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.05);
    } else if(type==='motorbike_rev'){
      // Engine rev — sawtooth sweep up then drop
      o.type='sawtooth'; o.frequency.setValueAtTime(80,now); o.frequency.linearRampToValueAtTime(220,now+0.15);
      o.frequency.linearRampToValueAtTime(110,now+0.35);
      g.gain.setValueAtTime(0.2,now); g.gain.linearRampToValueAtTime(0.28,now+0.15); g.gain.linearRampToValueAtTime(0,now+0.4);
      o.start(now); o.stop(now+0.4);
    } else if(type==='paint_splat'){
      // Wet splat — low thump + noise
      o.type='sine'; o.frequency.setValueAtTime(180,now); o.frequency.linearRampToValueAtTime(80,now+0.1);
      g.gain.setValueAtTime(0.25,now); g.gain.linearRampToValueAtTime(0,now+0.12);
      o.start(now); o.stop(now+0.12);
      var buf=c.createBuffer(1,Math.ceil(c.sampleRate*0.08),c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var ng=c.createGain(); ng.gain.setValueAtTime(0.24,now); ng.gain.linearRampToValueAtTime(0,now+0.09);
      ns.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.09);
    } else if(type==='minigame_oar'){
      // Oar whoosh + water splash
      o.type='sine'; o.frequency.setValueAtTime(400,now); o.frequency.linearRampToValueAtTime(200,now+0.12);
      g.gain.setValueAtTime(0.2,now); g.gain.linearRampToValueAtTime(0,now+0.15);
      o.start(now); o.stop(now+0.15);
      var buf=c.createBuffer(1,Math.ceil(c.sampleRate*0.12),c.sampleRate);
      var d=buf.getChannelData(0); for(var ni=0;ni<d.length;ni++) d[ni]=Math.random()*2-1;
      var ns=c.createBufferSource(); ns.buffer=buf;
      var nf=c.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=2000;
      var ng=c.createGain(); ng.gain.setValueAtTime(0,now); ng.gain.linearRampToValueAtTime(0.22,now+0.02);
      ng.gain.linearRampToValueAtTime(0,now+0.14);
      ns.connect(nf); nf.connect(ng); ng.connect(getMasterGain()); ns.start(now); ns.stop(now+0.15);
    } else if(type==='minigame_beetroot'){
      // Plop into soup — descending sine + bloop overtone
      o.type='sine'; o.frequency.setValueAtTime(280,now); o.frequency.linearRampToValueAtTime(120,now+0.15);
      g.gain.setValueAtTime(0.3,now); g.gain.linearRampToValueAtTime(0,now+0.18);
      o.start(now); o.stop(now+0.18);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='sine'; po.frequency.setValueAtTime(560,now); po.frequency.linearRampToValueAtTime(240,now+0.1);
      pg.gain.setValueAtTime(0.12,now); pg.gain.linearRampToValueAtTime(0,now+0.12);
      po.start(now); po.stop(now+0.13);
    } else if(type==='minigame_spot'){
      // Electronic boop — Berlin club feel
      o.type='sine'; o.frequency.setValueAtTime(880,now); o.frequency.linearRampToValueAtTime(1047,now+0.06);
      g.gain.setValueAtTime(0.25,now); g.gain.linearRampToValueAtTime(0,now+0.12);
      o.start(now); o.stop(now+0.12);
      var po=c.createOscillator(), pg=c.createGain(); po.connect(pg); pg.connect(getMasterGain());
      po.type='square'; po.frequency.value=440;
      pg.gain.setValueAtTime(0.1,now); pg.gain.linearRampToValueAtTime(0,now+0.05);
      po.start(now); po.stop(now+0.06);
    }
  } catch(e){}
}

