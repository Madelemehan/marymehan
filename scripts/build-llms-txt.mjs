// Builds /llms.txt (https://llmstxt.org) from the site content in /data.js.
//
//   node scripts/build-llms-txt.mjs                 # relative links, for a local look
//   SITE_URL=https://example.com/ node scripts/...  # absolute links (what CI does)
//
// Fails loudly if data.js is missing or malformed, so a broken data.js stops the deploy.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// data.js sets window.MM_DATA; run it in a sandbox with a stand-in window
const window = {};
vm.runInNewContext(readFileSync(ROOT + 'data.js', 'utf8'), { window }, { filename: 'data.js' });
const data = window.MM_DATA;
if (!data || typeof data !== 'object') throw new Error('data.js did not set window.MM_DATA');
for (const key of ['site', 'home', 'projects', 'resume', 'store']) {
  if (!data[key]) throw new Error(`data.js is missing the "${key}" section`);
}
const { site, home, projects, resume, store } = data;

const base = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/?$/, '/') : '';
const url = path => (/^[a-z]+:/i.test(path) ? path : base + path);
const md = s => String(s).replace(/([[\]])/g, '\\$1'); // keep names from breaking link syntax
const link = (label, path, note) => `- [${md(label)}](${url(path)})${note ? `: ${note}` : ''}`;
const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const navLabel = id => site.nav.find(p => p.id === id)?.label;
const categoryName = id => store.categories.find(c => c.id === id)?.name || id;
const projectCats = [...new Set(projects.items.map(p => p.cat))];

const out = [];
const add = (...lines) => out.push(...lines);

// ---------- header ----------
const name = site.name.replace(/\b\w/g, c => c.toUpperCase());
add(`# ${name}`, '');
add(`> ${site.tagline}. ${home.statement.text}`, '');
add(
  `${name} is based in ${site.location}. Contact: ${site.email}.`,
  '',
  'The site is static: every page is rendered in the browser from one content file (`data.js`), ' +
    'so the pages themselves contain little text until JavaScript runs. This file summarizes that content.',
  ''
);

// ---------- pages ----------
add('## Pages', '');
add(link(navLabel('home') || 'Home', 'index.html', `Featured work and an introduction: "${home.statement.text}"`));
add(link(navLabel('projects') || 'Projects', 'projects.html',
  `${plural(projects.items.length, 'project')}, filterable by category (${projectCats.join(', ')})`));
add(link(navLabel('resume') || 'Resume', 'resume.html', `${resume.sections.map(s => s.heading).join(', ')}, and contact details`));
add(link(navLabel('store') || 'Store', 'store/index.html',
  `Shop for ${store.categories.map(c => c.name.toLowerCase()).join(', ')}; ${plural(store.products.length, 'item')}`));
add('');

// ---------- projects ----------
add(`## ${projects.heading}`, '');
for (const p of projects.items) {
  add(link(p.name, p.href || 'projects.html', `${p.cat}, ${p.year}. ${p.role}`));
}
add('');

// ---------- resume ----------
add(`## ${resume.heading}`, '');
for (const s of resume.sections) {
  add(`### ${s.heading}`, '');
  for (const i of s.items || []) {
    add(`- ${i.when}: ${[i.title, i.org].filter(Boolean).join(', ')}${i.text ? `. ${i.text}` : ''}`);
  }
  if (s.tags) add(s.tags.join(', '));
  add('');
}
add(`### ${resume.contactHeading}`, '', `- Email: ${site.email}`, `- Based in: ${site.location}`, '');

// ---------- store ----------
add('## Store', '');
add(
  'Prices are in USD. Checkout is through PayPal. Product pages are at `store/product.html?id=<id>`, ' +
    'category pages at `store/category.html?category=<id>`, and search at `store/search.html?q=<words>`.',
  ''
);
add('### Categories', '');
for (const c of store.categories) {
  const count = store.products.filter(p => p.category === c.id).length;
  add(link(c.name, `store/category.html?category=${c.id}`, `${c.description} (${plural(count, 'item')})`));
}
add('');
for (const c of store.categories) {
  const items = store.products.filter(p => p.category === c.id);
  if (!items.length) continue;
  add(`### ${c.name}`, '');
  for (const p of items) {
    const price = p.originalPrice ? `${money(p.price)} (was ${money(p.originalPrice)})` : money(p.price);
    const status = p.stock > 0 ? 'available' : 'sold out';
    const details = [price, p.badge, status].filter(Boolean).join(', ');
    add(link(p.name, `store/product.html?id=${p.id}`, `${details}. ${p.description} ${p.features.join('; ')}.`));
  }
  add('');
}
// products whose category isn't listed still get a mention
const orphans = store.products.filter(p => !store.categories.some(c => c.id === p.category));
if (orphans.length) {
  add('### Other', '');
  orphans.forEach(p => add(link(p.name, `store/product.html?id=${p.id}`, `${money(p.price)}, ${categoryName(p.category)}. ${p.description}`)));
  add('');
}

// ---------- optional ----------
add('## Optional', '');
add(link('data.js', 'data.js', 'The full site content as a JavaScript object (`window.MM_DATA`), the source for every page above'));

writeFileSync(ROOT + 'llms.txt', out.join('\n') + '\n');
console.log(`Wrote llms.txt (${out.length} lines${base ? `, links under ${base}` : ', relative links'})`);
