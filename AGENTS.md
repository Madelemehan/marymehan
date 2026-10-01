# AGENTS.md

Guidance for AI coding agents (and humans) working on this repo.

## What this is

The portfolio and art store for Mary Mehan, live at **marymehan.com**. It's a plain static site: HTML, CSS and vanilla JavaScript, with **no build step, no framework, and no npm dependencies**. Every file in the repo is served as-is by GitHub Pages.

Pages:

| Page | File | Script |
|---|---|---|
| Home | `index.html` | inline, uses `renderHero`, `renderRow` |
| Projects | `projects.html` | inline |
| Resume | `resume.html` | inline |
| Control | `control.html` | inline; edits content in the visitor's browser only |
| Store | `store/*.html` | `store/js/store.js` + one script per page |

## Ground rules

1. **The site must work when opened straight from disk (`file://`).** That means:
   - No ES modules (`<script type="module">`, `import`, `export`). Browsers block them on `file://`.
   - No `fetch()` or JSON imports of local files. Same reason.
   - Load things with plain `<script src="...">` tags. Shared code lives in global functions and constants.
2. **Make content edits in `data.js`.** All visible content comes from `data.js`, so any content change (text, headings, links, email, projects, resume entries, products, prices, categories, hero slides) should be made there, not in the HTML or JS. Only touch code when `data.js` can't express the change. Then add the new field or section to `data.js` and render it from there, rather than hardcoding the text.
3. **Keep the design language.** Dark, monochrome, editorial. Use the tokens and classes in `css/style.css` (`--bg`, `--text`, `--hairline`, `.wrap`, `.page-hero`, `.section`, `.card`, `.chip`, `.btn`, `.panel`, `.field`, the `.t-1`…`.t-4` / `.t-dark` tones). Store-only styles go in `store/css/store.css`, built from the same tokens.
4. **Match the surrounding code.** Same naming, comment density and idioms as the file you're editing.
5. **Never commit secrets.** PayPal *client IDs* are public and fine; PayPal secrets, API keys and service-account files are not. The sibling project `../retailkit/commerce` contains a GCP service-account key (`quiltsie-deployer.json`); never copy it here. The whole repo is published, so anything committed is public.

## Content: `data.js`

`data.js` sets one global, `window.MM_DATA`, with these sections:

| Key | Used by | Contents |
|---|---|---|
| `site` | every page | `name`, `tagline`, `email`, `location`, `menuFoot`, `nav` (id, label, href, icon), `footer`, `analytics.googleTagId` |
| `home` | `index.html` | `title`, `hero` slides, `selectedWork`, `explore` tiles, `statement` |
| `projects` | `projects.html`, home | `title`, `heading`, `allLabel`, `items` |
| `resume` | `resume.html` | `title`, `heading`, `sub`, `sections` (items or tags), `contactHeading`, `actions` |
| `store` | `store/` | `pageTitle`, `pages` (per-page titles, headings, hero), `footer`, `taglines`, `categories`, `products` |

Rules for editing it:

- **Keep it JSON-shaped:** double-quoted keys and strings, no trailing commas, no functions or expressions. It's `.js` only so it loads from `file://`.
- **Hero slides:** `{ "title": ["line 1", "line 2"], "sub"?: [...], "image"?, "position"?, "dim"?, "art"?, "mark"? }`. Use `image` for a photo, or `art` (e.g. `"art-2"`) plus an optional `mark` watermark. Title lines are arrays; no HTML in data.
- **Nav icons** must be keys of `MM_ICONS` in `js/main.js`: `home`, `heart`, `person`, `bag`, `clock`, `search`, `menu`, `back`.
- **Products:** `id` (unique, used in URLs and carts), `name`, `category` (a `categories[].id`), `price`, optional `originalPrice`, `description`, `features`, `stock`, optional `badge`. Give each product either `image` (a path relative to the `store/` pages, e.g. `"../img/hero-4.jpg"`) or `tone` (`t-1`…`t-4`, `t-dark`) for a gradient placeholder.
- **Store page text** lives in `store.pages.<id>`, where `<id>` is the page's `<body data-store-page>` (`home`, `category`, `product`, `search`, `cart`, `checkout`, `thankyou`). Elements marked `data-store-text="heading"` (or `data-store-href`, `data-store-placeholder`) are filled from that entry by `fillStorePage()`; dotted paths like `featuredMore.label` work. Tab titles use `store.pageTitle`. `{name}` in store text is replaced with `site.name`, so a rename is one edit (but `site.footer.copyright` is plain text and needs its own edit).
- **Renaming or removing a product `id`** drops it from visitors' saved carts. That's handled safely, but it's a visible change.

## How pages load

`js/main.js` is included on every page and runs first:

1. It loads `data.js` with a `<script>` element (`mmContent`), with a 10 s timeout.
2. It applies Control-page edits from `localStorage` (`mmLoad`), then builds the top bar, bottom nav, menu and footer (`buildChrome`, `buildFooter`).
3. Page code runs inside **`mmPage((data) => { ... })`**. Store pages use **`storePage((store, data) => { ... })`** from `store/js/store.js`, which wraps `mmPage` and also wires the store's top-bar icons. Don't use `mmReady.then` directly.

**Failure handling:** if `data.js` 404s, has a syntax error, times out, or a page's render throws (e.g. a missing section), the page keeps its nav and footer (drawn from `MM_FALLBACK_SITE` if needed) and `mmContentError()` replaces the content with a "Content unavailable" notice. Preserve this when adding pages: render inside `mmPage`/`storePage`, and let errors throw rather than swallowing them.

`MM_FALLBACK_SITE` in `js/main.js` is a hand-kept copy of the name, email and nav. **If you change `site.email` or `site.nav` in `data.js`, update it too.**

Main-site globals are prefixed `mm`/`MM_`. Because everything shares one global scope, wrap page code in the `mmPage`/`storePage` callback, and never declare top-level `const`/`let` in page scripts with names that might clash (e.g. `products`).

## Analytics

Google Analytics (gtag.js) is loaded by `mmInitAnalytics` in `js/main.js` using `site.analytics.googleTagId` from `data.js`; don't paste the Google snippet into pages. It's skipped on `file://` and `localhost`, so previews and tests don't count as visits. If you test it on another host, block requests to `google-analytics.com/g/collect` so test visits don't reach the real property. Because the site uses analytics cookies, don't add "no cookies / no tracking" claims to the copy.

## Control page and browser storage

`control.html` lets the owner edit the tagline, statement, email and projects. Edits are stored **only in that browser**; they never change `data.js` or the live site. Which fields are editable, and where they map in `data.js`, is defined by `MM_EDITABLE` in `js/main.js`.

`localStorage` keys: `mm-site-content` (Control edits, flat `{ tagline, statement, email, projects }`, kept for backward compatibility), `mm-store-cart`, `mm-store-wishlist`, `mm-store-last-order`.

## Store

- `store/js/store.js`: `storePage`, page text (`fillStorePage`, `storeTitle`, `storeFill`), the footer's shop-links row (`mmFooterExtra`, used by `buildFooter` in `main.js`), catalog lookups (`getProductById`, …), cart, wishlist, top bar, shared markup (`productCard`, `renderProductGrid`, `emptyState`, `money`, `esc`), and `totals()` (shipping: free at $50+, otherwise $5.99).
- `store/js/config.js`: `PAYPAL_CLIENT_ID`, loaded only on checkout. It's currently `'sb'` (PayPal sandbox), so **checkout doesn't take real payments** until the live client ID is put in.
- Checkout uses the PayPal JS SDK, loaded on demand in `store/js/checkout.js`.
- Escape anything from the URL or user input before putting it in `innerHTML` (use `esc()`); search does this.
- The cart doesn't currently cap quantities at `stock`.

## Running and testing

```bash
python3 -m http.server   # then open http://localhost:8000
```

Also check pages opened directly from disk, since that's a supported way to view the site.

There's no test suite. To verify a change, load the affected pages in a browser (headless Chrome via Puppeteer works well) and check:

- There are no console errors (a missing `favicon.ico` 404 is expected).
- Pages work from both `http://` and `file://`.
- Store flows still work: add to cart, cart +/−/remove, checkout summary, search.
- Pages still show the "Content unavailable" notice if `data.js` is missing or broken.
- The layout works at phone width (~390 px) with no horizontal scroll.

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`, which uploads the whole repo root. Before upload it runs `node scripts/build-llms-txt.mjs` to generate `/llms.txt` from `data.js`. That step **fails the deploy if `data.js` is missing, invalid, or lacks a section**, so a broken `data.js` never goes live.

- `llms.txt` is generated; it's in `.gitignore` and shouldn't be committed. If you add a new top-level section or page, update `scripts/build-llms-txt.mjs` to describe it.
- The repo is `Madelemehan/marymehan` (`git@github.com:Madelemehan/marymehan.git`). DNS is on Cloudflare. The Pages custom domain is `marymehan.com`; moving it to `www.marymehan.com` with HTTPS enforced is pending a `www` DNS record.
- The live site is public and for real visitors: confirm with the owner before pushing.
