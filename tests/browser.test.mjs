// Real-browser tests: every page renders from data.js over http:// and file://,
// store flows work, and a broken data.js degrades to the "Content unavailable" notice.
// Needs Chrome/Chromium; skipped if none is found, unless REQUIRE_BROWSER=1 (CI sets it).
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { ROOT, read, loadData } from './lib/site.mjs';
import { startServer } from './lib/server.mjs';
import { findChrome, launchBrowser } from './lib/browser.mjs';

const chrome = findChrome();
if (!chrome && process.env.REQUIRE_BROWSER) throw new Error('REQUIRE_BROWSER is set but no Chrome was found (set CHROME_PATH)');
const skip = chrome ? false : 'no Chrome/Chromium found (set CHROME_PATH to run browser tests)';

const data = loadData();
const { site, home, projects, resume, backstory, store } = data;

let browser, server;
before(async () => {
  if (skip) return;
  browser = await launchBrowser(chrome);
  server = await startServer();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

// Open a page, wait for it to render, and check the shared chrome and errors.
async function open(base, path, { width } = {}) {
  const page = await browser.newPage({ width });
  const state = await page.gotoAndRender(base + path);
  return { page, state };
}

function assertHealthy(page, state, where) {
  assert.equal(state, 'ready', `${where}: rendered as "${state}"`);
  assert.deepEqual(page.errors, [], `${where}: errors in the page`);
}

const shared = () => ({
  nav: document.querySelectorAll('.bottomnav a').length,
  menu: document.querySelectorAll('.menu-overlay nav a').length,
  brand: document.querySelector('.topbar .brand')?.textContent,
  footerBrand: document.querySelector('.site-footer .foot-brand')?.textContent,
  footerEmail: document.querySelector('.site-footer .foot-email')?.textContent,
  title: document.title,
  emptySlots: [...document.querySelectorAll('[data-store-text]')].filter(e => !e.textContent.trim()).map(e => e.getAttribute('data-store-text')),
});

for (const [label, base] of [['http', () => server.url], ['file://', () => pathToFileURL(ROOT).href]]) {
  describe(`pages render (${label})`, { skip }, () => {
    const check = async (path, extra) => {
      const { page, state } = await open(base(), path);
      try {
        assertHealthy(page, state, path);
        const s = await page.evaluate(shared);
        assert.equal(s.nav, site.nav.length, `${path}: bottom nav`);
        assert.equal(s.menu, site.nav.length, `${path}: menu`);
        assert.equal(s.brand, site.name, `${path}: top bar name`);
        assert.equal(s.footerBrand, site.name, `${path}: footer name`);
        assert.equal(s.footerEmail, site.email, `${path}: footer email`);
        assert.ok(s.title.trim(), `${path}: empty <title>`);
        assert.deepEqual(s.emptySlots, [], `${path}: empty text slots`);
        if (extra) await extra(page);
      } finally {
        await page.close();
      }
    };

    test('home', () => check('index.html', async page => {
      const r = await page.evaluate(() => ({
        hero: document.querySelector('.slide-title')?.textContent,
        cards: document.querySelectorAll('#home-row .card').length,
        tiles: document.querySelectorAll('#explore-tiles .cat-tile').length,
        statement: document.getElementById('statement-text')?.textContent,
      }));
      assert.equal(r.hero, home.hero[0].title.join(''));
      assert.equal(r.cards, Math.min(home.selectedWork.count, projects.items.length));
      assert.equal(r.tiles, home.explore.tiles.length);
      assert.equal(r.statement, home.statement.text);
    }));

    test('projects', () => check('projects.html', async page => {
      const r = await page.evaluate(() => ({
        cards: document.querySelectorAll('#proj-grid .card').length,
        chips: document.querySelectorAll('#chips .chip').length,
      }));
      assert.equal(r.cards, projects.items.length);
      assert.equal(r.chips, 1 + new Set(projects.items.map(p => p.cat)).size);
    }));

    test('resume', () => check('resume.html', async page => {
      const blocks = await page.evaluate(() => [...document.querySelectorAll('.resume-block h3')].map(h => h.textContent));
      assert.deepEqual(blocks, [...resume.sections.map(s => s.heading), resume.contactHeading]);
    }));

    test('backstory', () => check('backstory.html', async page => {
      const r = await page.evaluate(() => ({
        heading: document.getElementById('backstory-heading')?.textContent,
        paras: document.querySelectorAll('#backstory-body p').length,
      }));
      assert.equal(r.heading, backstory.heading);
      assert.equal(r.paras, backstory.paragraphs.length);
    }));

    test('control', () => check('control.html', async page => {
      const r = await page.evaluate(() => ({
        email: document.getElementById('f-email').value,
        projects: document.querySelectorAll('#proj-list li').length,
      }));
      assert.equal(r.email, site.email);
      assert.equal(r.projects, projects.items.length);
    }));

    test('store home', () => check('store/index.html', async page => {
      const r = await page.evaluate(() => ({
        hero: document.querySelector('.slide-title')?.textContent,
        ctas: document.querySelectorAll('.hero-ctas a').length,
        tiles: document.querySelectorAll('#categories-grid .cat-tile').length,
        cards: [...document.querySelectorAll('#featured-grid .product-card .name')].map(a => a.textContent),
        shopLinks: document.querySelectorAll('.site-footer .foot-links')[0]?.querySelectorAll('a').length,
      }));
      const hero = store.pages.home.hero;
      const featuredNames = JSON.parse(JSON.stringify(store.pages.home.featuredIds.map(id => store.products.find(p => p.id === id).name)));
      assert.equal(r.hero, hero.title.join(''));
      assert.equal(r.ctas, (hero.ctas || []).length);
      assert.equal(r.tiles, store.categories.length);
      assert.deepEqual(r.cards, featuredNames, 'featured grid shows Mary\'s chosen works in her order');
      assert.equal(r.shopLinks, store.categories.length + 2, 'footer shop links: Store + categories + Cart');
    }));

    for (const c of store.categories) {
      test(`store category: ${c.id}`, () => check(`store/category.html?category=${c.id}`, async page => {
        const r = await page.evaluate(() => ({
          h1: document.getElementById('category-heading').textContent,
          cards: document.querySelectorAll('#products-grid .product-card').length,
        }));
        assert.equal(r.h1, c.name);
        assert.equal(r.cards, store.products.filter(p => p.category === c.id).length);
      }));
    }

    test('store: every product page', async () => {
      for (const p of store.products) {
        await check(`store/product.html?id=${encodeURIComponent(p.id)}`, async page => {
          const h1 = await page.evaluate(() => document.querySelector('.pdp-info h1')?.textContent);
          assert.equal(h1, p.name, `product ${p.id}`);
        });
      }
    });

    for (const path of ['store/search.html', 'store/cart.html', 'store/checkout.html', 'store/thankyou.html?orderId=TEST']) {
      test(path, () => check(path));
    }
  });
}

describe('store flows', { skip }, () => {
  test('add to cart, change quantity, remove, check out', async () => {
    const page = await browser.newPage();
    try {
      const featured = store.pages.home.featuredIds.map(id => store.products.find(p => p.id === id));
      const [a, b] = featured.filter(p => p.stock > 0 && !p.byRequest);
      await page.gotoAndRender(server.url + 'store/index.html');
      await page.click(`[data-add-cart="${a.id}"]`);
      assert.equal(await page.evaluate(() => document.getElementById('cart-badge').textContent), '1');

      await page.gotoAndRender(server.url + `store/product.html?id=${b.id}`);
      await page.click('#qty-plus');
      await page.click('#add-to-cart-btn');
      assert.equal(await page.evaluate(() => document.getElementById('cart-badge').textContent), String(1 + Math.min(2, b.stock)));

      await page.gotoAndRender(server.url + 'store/cart.html');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.cart-row').length), 2);
      await page.click(`[data-qty-plus="${a.id}"]`);
      await page.click(`[data-remove="${b.id}"]`);
      const cart = await page.evaluate(() => ({
        rows: document.querySelectorAll('.cart-row').length,
        count: document.getElementById('cart-count').textContent,
        badge: document.getElementById('cart-badge').textContent,
      }));
      assert.deepEqual(cart, { rows: 1, count: '2 items', badge: '2' });

      // PayPal is blocked in tests, so checkout should show the summary and fail gracefully
      await page.gotoAndRender(server.url + 'store/checkout.html');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.sum-item').length), 1);
      const btn = await page.waitFor(() => {
        const t = document.getElementById('checkout-loading-btn').textContent;
        return t.includes('unavailable') && t;
      });
      assert.match(btn, /unavailable/);
      assert.deepEqual(page.errors, []);
    } finally {
      await page.close();
    }
  });

  test('empty cart checkout shows the empty state', async () => {
    const page = await browser.newPage();
    try {
      await page.gotoAndRender(server.url + 'store/checkout.html');
      assert.deepEqual(await page.evaluate(() => ({
        empty: document.getElementById('checkout-empty').hidden,
        body: document.getElementById('checkout-body').hidden,
      })), { empty: false, body: true });
    } finally {
      await page.close();
    }
  });

  test('search finds products and escapes the query', async () => {
    const page = await browser.newPage();
    try {
      const word = store.products[0].name.split(' ')[0].toLowerCase();
      await page.gotoAndRender(server.url + `store/search.html?q=${encodeURIComponent(word)}`);
      const expected = store.products.filter(p => (p.name + ' ' + p.description).toLowerCase().includes(word)).length;
      assert.equal(await page.evaluate(() => document.querySelectorAll('.product-card').length), expected);

      await page.gotoAndRender(server.url + 'store/search.html?q=' + encodeURIComponent('<img src=x onerror=window.pwned=1>'));
      assert.deepEqual(await page.evaluate(() => ({ imgs: document.querySelectorAll('.empty img').length, pwned: !!window.pwned })), { imgs: 0, pwned: false });
    } finally {
      await page.close();
    }
  });

  test('wishlist heart persists across pages', async () => {
    const page = await browser.newPage();
    try {
      const p = store.pages.home.featuredIds.map(id => store.products.find(p => p.id === id))[0];
      await page.gotoAndRender(server.url + 'store/index.html');
      await page.click(`[data-wishlist="${p.id}"]`);
      await page.gotoAndRender(server.url + `store/category.html?category=${p.category}`);
      assert.equal(await page.evaluate(id => document.querySelector(`[data-wishlist="${id}"]`).classList.contains('on'), p.id), true);
    } finally {
      await page.close();
    }
  });
});

describe('control page edits', { skip }, () => {
  test('saved edits show on the home page, and reset restores data.js', async () => {
    const page = await browser.newPage();
    try {
      await page.gotoAndRender(server.url + 'control.html');
      await page.evaluate(() => { document.getElementById('f-statement').value = 'EDITED IN TEST'; });
      await page.click('#save-text');
      await page.gotoAndRender(server.url + 'index.html');
      assert.equal(await page.evaluate(() => document.getElementById('statement-text').textContent), 'EDITED IN TEST');

      await page.gotoAndRender(server.url + 'control.html');
      await page.evaluate(() => { window.confirm = () => true; });
      await page.click('#reset-all');
      await page.gotoAndRender(server.url + 'index.html');
      assert.equal(await page.evaluate(() => document.getElementById('statement-text').textContent), home.statement.text);
    } finally {
      await page.close();
    }
  });
});

describe('phone width', { skip }, () => {
  for (const path of ['index.html', 'projects.html', 'resume.html', 'store/index.html', `store/product.html?id=${store.products[0]?.id}`, 'store/cart.html']) {
    test(`${path} has no horizontal scroll at 390px`, async () => {
      const { page, state } = await open(server.url, path, { width: 390 });
      try {
        assertHealthy(page, state, path);
        // compare with the fixed width: phone emulation widens the viewport to fit overflowing content
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(width <= 391, `${path} is ${width}px wide at a 390px screen`);
      } finally {
        await page.close();
      }
    });
  }
});

describe('analytics', { skip }, () => {
  test('Google Analytics is not loaded on localhost or file://', async () => {
    for (const url of [server.url + 'index.html', pathToFileURL(ROOT).href + 'index.html']) {
      const page = await browser.newPage();
      try {
        await page.gotoAndRender(url);
        assert.deepEqual(await page.evaluate(() => ({
          gtag: typeof window.gtag,
          script: !!document.querySelector('script[src*="googletagmanager"]'),
        })), { gtag: 'undefined', script: false }, url);
      } finally {
        await page.close();
      }
    }
  });
});

describe('broken data.js fails gracefully', { skip }, () => {
  const source = read('data.js');
  const without = key => {
    const copy = structuredClone(data);
    delete copy[key];
    return 'window.MM_DATA = ' + JSON.stringify(copy) + ';';
  };
  const cases = [
    ['missing (404)', { status: 404, type: 'text/plain', body: 'not found' }, ['index.html', 'store/index.html']],
    ['syntax error', { body: source.replace('"site": {', '"site": {,') }, ['index.html', 'resume.html', 'store/index.html']],
    ['sets nothing', { body: '// empty' }, ['index.html']],
    ['no resume section', { body: without('resume') }, ['resume.html']],
    ['no store section', { body: without('store') }, ['store/index.html', 'store/cart.html']],
  ];
  let broken;
  after(() => broken?.close());

  for (const [name, override, paths] of cases) {
    test(name, async () => {
      await broken?.close();
      broken = await startServer({ '/data.js': override });
      for (const path of paths) {
        const page = await browser.newPage();
        try {
          const state = await page.gotoAndRender(broken.url + path, 15000);
          const r = await page.evaluate(() => ({
            notice: document.querySelector('.load-error h1')?.textContent,
            nav: document.querySelectorAll('.bottomnav a').length,
            footer: !!document.querySelector('.site-footer .foot-brand')?.textContent,
          }));
          assert.equal(state, 'error', `${path}: should show the error notice`);
          assert.equal(r.notice, 'Content unavailable', path);
          assert.ok(r.nav > 0, `${path}: nav should still work`);
          assert.ok(r.footer, `${path}: footer should still render`);
          const uncaught = page.errors.filter(e => e.startsWith('uncaught:') && !/SyntaxError/.test(e));
          assert.deepEqual(uncaught, [], `${path}: uncaught errors besides the data.js syntax error`);
        } finally {
          await page.close();
        }
      }
    });
  }

  test('pages not using a missing section still render', async () => {
    await broken?.close();
    broken = await startServer({ '/data.js': { body: without('resume') } });
    const { page, state } = await open(broken.url, 'index.html');
    try {
      assertHealthy(page, state, 'index.html without resume');
    } finally {
      await page.close();
    }
  });
});
