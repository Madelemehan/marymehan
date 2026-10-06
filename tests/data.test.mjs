// data.js: valid, complete, and consistent with the pages that read it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, exists, loadData, parseDataAsJson, iconNames, fallbackSite, TONES } from './lib/site.mjs';

const data = loadData();
const { site, home, projects, resume, backstory, store } = data;
const nonEmpty = (v, what) => assert.ok(typeof v === 'string' && v.trim(), `${what} should be a non-empty string`);
const pathOf = href => href.split(/[?#]/)[0];

test('data.js runs and sets window.MM_DATA', () => {
  assert.equal(typeof data, 'object');
  for (const key of ['site', 'home', 'projects', 'resume', 'backstory', 'store']) assert.ok(data[key], `missing "${key}" section`);
});

test('data.js is JSON-shaped (double quotes, no trailing commas, no code)', () => {
  // (round-trip through JSON: data comes from a vm sandbox with its own Object prototype)
  assert.deepEqual(parseDataAsJson(), JSON.parse(JSON.stringify(data)));
});

test('site: name, email, nav, footer', () => {
  nonEmpty(site.name, 'site.name');
  assert.match(site.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'site.email');
  nonEmpty(site.footer?.copyright, 'site.footer.copyright');
  assert.ok(Array.isArray(site.nav) && site.nav.length, 'site.nav should be a non-empty list');
  const icons = iconNames();
  const ids = new Set();
  for (const item of site.nav) {
    nonEmpty(item.label, `nav label for ${item.id}`);
    assert.ok(!ids.has(item.id), `duplicate nav id ${item.id}`);
    ids.add(item.id);
    assert.ok(icons.includes(item.icon), `nav "${item.id}" icon "${item.icon}" isn't in MM_ICONS (${icons.join(', ')})`);
    assert.ok(exists(pathOf(item.href)), `nav "${item.id}" links to missing file ${item.href}`);
  }
});

test('site.analytics.googleTagId looks like a GA4 ID', () => {
  if (!site.analytics) return;
  assert.match(site.analytics.googleTagId, /^G-[A-Z0-9]+$/);
});

test('MM_FALLBACK_SITE in main.js matches data.js (name, email)', () => {
  const fallback = fallbackSite();
  assert.equal(fallback.name, site.name, 'update MM_FALLBACK_SITE.name in js/main.js');
  assert.equal(fallback.email, site.email, 'update MM_FALLBACK_SITE.email in js/main.js');
  for (const item of fallback.nav) assert.ok(exists(pathOf(item.href)), `fallback nav links to missing ${item.href}`);
});

test('home: hero, selected work, explore, statement', () => {
  nonEmpty(home.title, 'home.title');
  assert.ok(home.hero?.length, 'home.hero needs at least one slide');
  for (const [i, slide] of home.hero.entries()) {
    assert.ok(Array.isArray(slide.title) && slide.title.length, `hero slide ${i}: title should be a list of lines`);
    if (slide.image) assert.ok(exists(slide.image), `hero slide ${i}: missing image ${slide.image}`);
  }
  assert.ok(Number.isInteger(home.selectedWork?.count) && home.selectedWork.count > 0, 'home.selectedWork.count');
  for (const tile of home.explore?.tiles || []) assert.ok(exists(pathOf(tile.href)), `explore tile links to missing ${tile.href}`);
  nonEmpty(home.statement?.text, 'home.statement.text');
});

test('projects: every item has name, category, year, role', () => {
  assert.ok(projects.items?.length, 'projects.items is empty');
  for (const p of projects.items) {
    for (const k of ['name', 'cat', 'year', 'role']) nonEmpty(p[k], `project "${p.name}" ${k}`);
    if (p.tone) assert.ok(TONES.includes(p.tone), `project "${p.name}" tone "${p.tone}"`);
  }
});

test('resume: sections have items or tags', () => {
  assert.ok(resume.sections?.length, 'resume.sections is empty');
  for (const s of resume.sections) {
    nonEmpty(s.heading, 'resume section heading');
    assert.ok(s.items?.length || s.tags?.length, `resume section "${s.heading}" has no items or tags`);
    for (const i of s.items || []) nonEmpty(i.title, `resume item in "${s.heading}"`);
  }
  nonEmpty(resume.contactHeading, 'resume.contactHeading');
});

test('backstory: heading and paragraphs', () => {
  nonEmpty(backstory.title, 'backstory.title');
  nonEmpty(backstory.heading, 'backstory.heading');
  nonEmpty(backstory.sub, 'backstory.sub');
  assert.ok(backstory.paragraphs?.length, 'backstory.paragraphs is empty');
  for (const p of backstory.paragraphs) nonEmpty(p, 'backstory paragraph');
});

test('store: categories and products are consistent', () => {
  const catIds = store.categories.map(c => c.id);
  assert.equal(new Set(catIds).size, catIds.length, 'duplicate category ids');
  const ids = store.products.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate product ids');
  for (const p of store.products) {
    const where = `product "${p.id}"`;
    nonEmpty(p.name, `${where} name`);
    nonEmpty(p.description, `${where} description`);
    assert.ok(catIds.includes(p.category), `${where} category "${p.category}" isn't in store.categories`);
    assert.ok(typeof p.price === 'number' && p.price > 0, `${where} price`);
    if (p.originalPrice !== undefined) assert.ok(p.originalPrice > p.price, `${where} originalPrice should be above price`);
    assert.ok(Array.isArray(p.features), `${where} features should be a list`);
    assert.ok(Number.isInteger(p.stock) && p.stock >= 0, `${where} stock should be a whole number ≥ 0`);
    if (p.image) assert.ok(exists(join('store', p.image)), `${where} image ${p.image} not found (paths are relative to store/)`);
    else assert.ok(TONES.includes(p.tone), `${where} needs an image or a tone (${TONES.join(', ')})`);
  }
});

test('store: every page slot has text in store.pages', () => {
  assert.match(store.pageTitle || '', /\{page\}/, 'store.pageTitle should contain {page}');
  for (const file of ['index', 'category', 'product', 'search', 'cart', 'checkout', 'thankyou']) {
    const html = read(`store/${file}.html`);
    const pageId = html.match(/data-store-page="([^"]+)"/)?.[1];
    assert.ok(pageId, `store/${file}.html has no data-store-page`);
    const text = store.pages?.[pageId];
    assert.ok(text, `store.pages.${pageId} is missing (used by store/${file}.html)`);
    for (const [, attr, path] of html.matchAll(/data-store-(text|href|placeholder)="([^"]+)"/g)) {
      const value = path.split('.').reduce((o, k) => o?.[k], text);
      assert.ok(typeof value === 'string' && value.trim(), `store/${file}.html: data-store-${attr}="${path}" has no text in store.pages.${pageId}`);
    }
  }
  assert.ok(store.pages.home?.hero?.title?.length, 'store.pages.home.hero.title');
});

test('llms.txt builds from data.js', () => {
  const r = spawnSync(process.execPath, ['scripts/build-llms-txt.mjs'], { cwd: ROOT, encoding: 'utf8' });
  rmSync(join(ROOT, 'llms.txt'), { force: true });
  assert.equal(r.status, 0, r.stderr);
});
