/* MARY ADELE MEHAN — store
   Shared store code: catalog lookups, cart, wishlist, top bar, and markup.
   Plain script (not a module) so the store also works opened straight from disk.
   Load after ../js/main.js; each page script then calls storePage(render). */

/* ---------- catalog (from data.js → "store") ---------- */

let STORE = { taglines: [], categories: [], products: [], pages: {} };
let STORE_SITE_NAME = '';

// Like main.js's mmPage(), for store pages: once data.js loads, wire the
// top bar, fill this page's titles and headings, and run render(store, data).
// A missing "store" section shows the error notice instead of an empty shop.
function storePage(render) {
  mmPage((data) => {
    if (!data.store) throw new Error('data.js has no "store" section');
    STORE = { taglines: [], categories: [], products: [], pages: {}, ...data.store };
    STORE_SITE_NAME = data.site.name;
    wireTopbar(data);
    fillStorePage();
    render(STORE, data);
  });
}

/* ---------- page text (from data.js → store.pages[<body data-store-page>]) ---------- */

function storePageText() {
  return STORE.pages[document.body.dataset.storePage] || {};
}

// "{name}" in store text is the site name
function storeFill(text) {
  return String(text).replaceAll('{name}', STORE_SITE_NAME);
}

// Tab title for a store page, e.g. storeTitle('Prints') → "Prints — Mary Adele Mehan store"
function storeTitle(page) {
  return storeFill((STORE.pageTitle || '{page}').replaceAll('{page}', page));
}

// Fill [data-store-text], [data-store-href], [data-store-placeholder] from this
// page's entry; values are paths into it, e.g. data-store-text="featuredMore.label"
function fillStorePage() {
  const text = storePageText();
  const get = path => path.split('.').reduce((o, k) => o?.[k], text);
  const fill = (attr, apply) => document.querySelectorAll(`[${attr}]`).forEach(el => {
    const value = get(el.getAttribute(attr));
    if (value !== undefined) apply(el, storeFill(value));
  });
  fill('data-store-text', (el, v) => { el.textContent = v; });
  fill('data-store-href', (el, v) => { el.href = v; });
  fill('data-store-placeholder', (el, v) => { el.placeholder = v; el.setAttribute('aria-label', v); });

  const title = text.fullTitle || text.title || text.heading;
  if (title) document.title = text.fullTitle ? storeFill(text.fullTitle) : storeTitle(storeFill(title));
  if (text.description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = storeFill(text.description);
  }
}

// Footer: a row of shop links above the site nav, and the store's note (see buildFooter in main.js)
function mmFooterExtra(data) {
  const store = data.store;
  if (!store) return null;
  const storeLabel = data.site.nav.find(p => p.id === 'store')?.label || 'Store';
  return {
    links: [
      { label: storeLabel, href: 'index.html' },
      ...(store.categories || []).map(c => ({ label: c.name, href: `category.html?category=${c.id}` })),
      { label: store.pages?.cart?.heading || 'Cart', href: 'cart.html' },
    ],
    note: store.footer?.note,
  };
}

function getProductById(id) {
  return STORE.products.find(p => p.id === id) || null;
}

function getProductsByCategory(categoryId) {
  return STORE.products.filter(p => p.category === categoryId);
}

function getFeaturedProducts(count = 8) {
  return STORE.products.slice(0, count);
}

function getCategoryById(id) {
  return STORE.categories.find(c => c.id === id) || null;
}

/* ---------- cart (localStorage) ---------- */

const CART_KEY = 'mm-store-cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(id, qty = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id, qty });
  }
  saveCart(cart);
}

function removeFromCart(id) {
  saveCart(getCart().filter(item => item.id !== id));
}

function updateQuantity(id, qty) {
  if (qty < 1) {
    removeFromCart(id);
    return;
  }
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty = qty;
    saveCart(cart);
  }
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function getCartTotal(products) {
  return getCart().reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
}

/* ---------- wishlist (localStorage) ---------- */

const WISHLIST_KEY = 'mm-store-wishlist';

function loadWishlist() {
  try { return new Set(JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []); }
  catch { return new Set(); }
}

function saveWishlist(set) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify([...set]));
}

function isWishlisted(id) {
  return loadWishlist().has(id);
}

function toggleWishlist(id) {
  const set = loadWishlist();
  set.has(id) ? set.delete(id) : set.add(id);
  saveWishlist(set);
  return set.has(id);
}

// Call after rendering product cards to sync heart icon state
function initHearts(container) {
  container.querySelectorAll('[data-wishlist]').forEach(btn => {
    setHeart(btn, isWishlisted(btn.dataset.wishlist));
  });

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-wishlist]');
    if (!btn) return;
    e.preventDefault();
    const hearted = toggleWishlist(btn.dataset.wishlist);
    setHeart(btn, hearted);
  });
}

function setHeart(btn, hearted) {
  btn.classList.toggle('on', hearted);
  btn.setAttribute('aria-pressed', String(hearted));
  btn.setAttribute('aria-label', hearted ? 'Remove from wishlist' : 'Add to wishlist');
}

/* ---------- top bar: store search + cart badge ---------- */

// The shared chrome comes from main.js; point its top-bar icons at the store.
function wireTopbar(data) {
  const right = document.querySelector('.topbar .right');
  if (right) {
    right.innerHTML = `
      <a class="icon-btn" href="search.html" aria-label="Search the store">${MM_ICONS.search}</a>
      <a class="icon-btn cart-link" href="cart.html" aria-label="Cart">
        ${MM_ICONS.bag}<span class="cart-badge" id="cart-badge" hidden></span>
      </a>`;
  }

  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count > 99 ? '99+' : count;
  badge.hidden = count === 0;
}

/* ---------- shared markup ---------- */


function money(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Product artwork: the photo if there is one, otherwise a studio-gray tone (see .t-* in style.css)
function artTone(p) {
  return p.image ? '' : (p.tone || 't-dark');
}

function artImg(p, lazy = true) {
  return p.image ? `<img src="${p.image}" alt="${p.name}"${lazy ? ' loading="lazy"' : ''}${p.thumbPosition ? ` style="object-position:${p.thumbPosition}"` : ''}>` : '';
}

function emptyState(title, text, linkText, href = 'index.html') {
  return `
    <div class="empty">
      <h2>${title}</h2>
      ${text ? `<p>${text}</p>` : ''}
      <a class="btn ghost" href="${href}">${linkText}</a>
    </div>`;
}

function productCard(p) {
  const cat = getCategoryById(p.category);
  return `
    <div class="card product-card">
      <a class="thumb ${artTone(p)}" href="product.html?id=${p.id}">
        ${artImg(p)}
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      </a>
      <button class="wish" data-wishlist="${p.id}" aria-label="Add to wishlist">${MM_ICONS.heart}</button>
      <div class="cat">${cat ? cat.name : ''}</div>
      <a class="name" href="product.html?id=${p.id}">${p.name}</a>
      <div class="meta price">
        <span class="tag">${money(p.price)}</span>${p.originalPrice ? `<s>${money(p.originalPrice)}</s>` : ''}
      </div>
      <button class="btn ghost sm block add" data-add-cart="${p.id}">Add to cart</button>
    </div>`;
}

// Fill a .grid-products with cards and wire up the heart + add-to-cart buttons.
function renderProductGrid(grid, list) {
  grid.innerHTML = list.map(productCard).join('');
  initHearts(grid);
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-add-cart]');
    if (!btn) return;
    addToCart(btn.dataset.addCart, 1);
    updateCartBadge();
    btn.textContent = 'Added';
    setTimeout(() => { btn.textContent = 'Add to cart'; }, 1500);
  });
}

// Cart lines joined with their product; drops ids no longer in the catalog
function getCartItems() {
  return getCart().map(item => {
    const product = STORE.products.find(p => p.id === item.id);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
}

// Subtotal / shipping / total for a list of { product, qty }
function totals(items) {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 5.99;
  return { subtotal, shipping, total: subtotal + shipping };
}
