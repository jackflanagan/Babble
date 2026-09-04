const esbuild = require('esbuild');
esbuild.buildSync({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/game.js',
  format: 'iife',
  platform: 'browser',
  minify: false,
  target: ['es2017'],
});
