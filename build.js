const esbuild = require('esbuild');
const fs = require('fs');

// Bundle JS
esbuild.buildSync({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/game.js',
  format: 'iife',
  platform: 'browser',
  minify: false,
  target: ['es2017'],
});

// Inline src/style.css into index.html.
// Replaces either a <link rel="stylesheet" href="src/style.css"> tag
// or an existing <style>...</style> block — idempotent across multiple builds.
const css = fs.readFileSync('src/style.css', 'utf8');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /<link rel="stylesheet" href="src\/style\.css">|<style>[\s\S]*?<\/style>/,
  '<style>\n' + css + '\n</style>'
);
fs.writeFileSync('index.html', html);
