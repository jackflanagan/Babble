// @ts-check
// Verifies the build step in build.js: the esbuild bundle is produced and the
// src/style.css inliner is idempotent (it must not stack <style> blocks or
// leave a dangling <link> when run repeatedly).
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const BUNDLE = path.join(ROOT, 'dist', 'game.js');
const CSS = path.join(ROOT, 'src', 'style.css');

function build() {
  execFileSync('node', ['build.js'], { cwd: ROOT, stdio: 'pipe' });
}

// Node-only checks that mutate index.html / dist — run once, serially.
test.describe.configure({ mode: 'serial' });
test.describe('build pipeline', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'node-only; run once on desktop');
  });

  test('produces an IIFE bundle', () => {
    build();
    const js = fs.readFileSync(BUNDLE, 'utf8');
    expect(js.length).toBeGreaterThan(10000);
    expect(js.trimStart().startsWith('(()')).toBeTruthy(); // esbuild iife wrapper
  });

  test('inlines src/style.css into index.html', () => {
    build();
    const html = fs.readFileSync(INDEX, 'utf8');
    const css = fs.readFileSync(CSS, 'utf8');
    // No dangling link to the stylesheet…
    expect(html).not.toContain('href="src/style.css"');
    // …and the CSS content is present inline.
    const firstRule = css.split('\n').find(l => l.trim().endsWith('{'));
    expect(firstRule && html.includes(firstRule.trim())).toBeTruthy();
  });

  test('is idempotent across repeated builds', () => {
    build();
    const once = fs.readFileSync(INDEX, 'utf8');
    build();
    const twice = fs.readFileSync(INDEX, 'utf8');
    expect(twice).toBe(once);
    expect((twice.match(/<style>/g) || []).length).toBe(1);
    expect((twice.match(/<\/style>/g) || []).length).toBe(1);
  });
});
