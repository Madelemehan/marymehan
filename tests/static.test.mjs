// Code rules from AGENTS.md, checked without a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { read, exists, siteFiles } from './lib/site.mjs';

const html = siteFiles('.html');
const js = siteFiles('.js');

test('all site JS parses', () => {
  for (const file of [...js, 'scripts/build-llms-txt.mjs']) {
    const r = spawnSync(process.execPath, ['--check', file], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    assert.equal(r.status, 0, `${file}: ${r.stderr}`);
  }
});

test('no ES modules or fetch() in site code (must work from file://)', () => {
  for (const file of html) {
    assert.doesNotMatch(read(file), /<script[^>]*type=["']module["']/, `${file} uses <script type="module">`);
  }
  for (const file of js) {
    const src = read(file);
    assert.doesNotMatch(src, /^\s*(import|export)\s/m, `${file} uses import/export`);
    assert.doesNotMatch(src, /\bimport\s*\(/, `${file} uses dynamic import()`);
    assert.doesNotMatch(src, /\bfetch\s*\(/, `${file} uses fetch()`);
  }
});

test('data.js loads with a cache-busting version', () => {
  const src = read('js/main.js');
  assert.match(src, /MM_DATA_VERSION\s*=\s*"[^"]+"/, 'main.js needs an MM_DATA_VERSION constant');
  assert.match(src, /\?v="\s*\+\s*MM_DATA_VERSION/, 'data.js script src must carry the version param');
});

test('every page loads main.js before its own scripts', () => {
  for (const file of html) {
    const srcs = [...read(file).matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
    const main = file.includes('/') ? '../js/main.js' : 'js/main.js';
    assert.equal(srcs[0], main, `${file}: first script should be ${main}`);
    if (file.startsWith('store/')) assert.equal(srcs[1], 'js/store.js', `${file}: store.js should load right after main.js`);
  }
});

test('local links, scripts, and stylesheets in HTML exist', () => {
  for (const file of html) {
    const dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
    for (const [, url] of read(file).matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#|javascript:|data:)/.test(url) || url.includes('${')) continue;
      const path = new URL(url, 'file:///site/' + dir).pathname.replace(/^\/site\//, '');
      assert.ok(exists(path), `${file} links to missing ${url}`);
    }
  }
});

test('every store page declares data-store-page and has an empty footer slot', () => {
  for (const file of html.filter(f => f.startsWith('store/'))) {
    const src = read(file);
    assert.match(src, /data-store-page="[^"]+"/, `${file} has no data-store-page`);
    assert.match(src, /<footer class="site-footer"><\/footer>/, `${file} should have an empty footer (built by main.js)`);
  }
});

test('PayPal config holds a client ID only', () => {
  const src = read('store/js/config.js');
  assert.match(src, /const PAYPAL_CLIENT_ID = '[^']+';/);
  assert.doesNotMatch(src, /\b(const|let|var)\s+\w*SECRET\w*\s*=/i, 'the PayPal secret must never be in the site');
});

test('no secrets committed', () => {
  const patterns = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /"private_key"\s*:/, /\bclient_secret\b/, /\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/];
  const files = spawnSync('git', ['ls-files'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).stdout.split('\n')
    .filter(f => f && !/\.(jpe?g|png|gif|webp|ico)$/.test(f) && f !== 'tests/static.test.mjs');
  for (const file of files) {
    if (!exists(file)) continue;
    const src = read(file);
    for (const p of patterns) assert.doesNotMatch(src, p, `${file} looks like it contains a secret (${p})`);
  }
});
