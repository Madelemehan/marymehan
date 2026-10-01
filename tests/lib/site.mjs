// Shared helpers: repo paths, data.js, and the site's HTML/JS files.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import vm from 'node:vm';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export const read = path => readFileSync(join(ROOT, path), 'utf8');
export const exists = path => existsSync(join(ROOT, path));

// data.js run as the browser would (sets window.MM_DATA)
export function loadData(source = read('data.js')) {
  const window = {};
  vm.runInNewContext(source, { window }, { filename: 'data.js' });
  return window.MM_DATA;
}

// The object literal in data.js, parsed as strict JSON (catches trailing commas, comments, code)
export function parseDataAsJson(source = read('data.js')) {
  const start = source.indexOf('window.MM_DATA = ');
  if (start < 0) throw new Error('data.js must contain "window.MM_DATA = { ... };"');
  const body = source.slice(start + 'window.MM_DATA = '.length).trim().replace(/;\s*$/, '');
  return JSON.parse(body);
}

// All site files of a type, as repo-relative paths (skips tests/, scripts/, .github/)
export function siteFiles(ext) {
  const out = [];
  const walk = dir => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!['.git', '.github', 'node_modules', 'tests', 'scripts'].includes(entry.name)) walk(path);
      } else if (entry.name.endsWith(ext)) {
        out.push(relative(ROOT, join(ROOT, path)));
      }
    }
  };
  walk('');
  return out.sort();
}

// Keys of MM_ICONS in js/main.js
export function iconNames() {
  const block = read('js/main.js').match(/const MM_ICONS = \{([\s\S]*?)\n\};/);
  return [...block[1].matchAll(/^\s*(\w+):/gm)].map(m => m[1]);
}

// MM_FALLBACK_SITE in js/main.js (a plain object literal)
export function fallbackSite() {
  const block = read('js/main.js').match(/const MM_FALLBACK_SITE = (\{[\s\S]*?\n\});/);
  return vm.runInNewContext(`(${block[1]})`);
}

export const TONES = ['t-1', 't-2', 't-3', 't-4', 't-dark'];
