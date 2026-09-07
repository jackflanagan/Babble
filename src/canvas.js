export var ctx = null;
export var W = 720;
export var H = 480;
export var TAU = Math.PI * 2;
export function initCanvas() {
  var cv = document.getElementById('gameCanvas');
  ctx = cv.getContext('2d');
}
