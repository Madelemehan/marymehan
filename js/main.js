/* MARY MEHAN — shared site logic
   All content lives in /data.js (window.MM_DATA). The Control page can override a few
   fields (MM_EDITABLE); those edits are kept in localStorage, in this browser only. */

const MM_KEY = "mm-site-content";

// Control-page field -> where it lives in data.js
const MM_EDITABLE = {
  tagline: ["site", "tagline"],
  statement: ["home", "statement", "text"],
  email: ["site", "email"],
  projects: ["projects", "items"],
};

let MM_CONTENT = null; // data.js content, untouched

// data.js sits next to this script's folder, wherever the page is
const MM_DATA_URL = new URL("../data.js", document.currentScript.src);

// Bump MM_DATA_VERSION whenever data.js content changes. The version rides
// along as a query param so visitors fetch fresh content after a deploy
// instead of rendering a stale cached copy.
const MM_DATA_VERSION = "20261002c";

function mmGet(obj, path) {
  return path.reduce((o, k) => o?.[k], obj);
}

function mmSet(obj, path, value) {
  const last = path[path.length - 1];
  path.slice(0, -1).reduce((o, k) => (o[k] ??= {}), obj)[last] = value;
}

// data.js content with this browser's Control-page edits applied
function mmLoad() {
  const data = structuredClone(MM_CONTENT);
  try {
    const edits = JSON.parse(localStorage.getItem(MM_KEY)) || {};
    for (const [key, path] of Object.entries(MM_EDITABLE)) {
      if (edits[key] !== undefined) mmSet(data, path, edits[key]);
    }
  } catch {
    // no edits, or unreadable: plain data.js
  }
  return data;
}

function mmSave(data) {
  const edits = {};
  for (const [key, path] of Object.entries(MM_EDITABLE)) edits[key] = mmGet(data, path);
  localStorage.setItem(MM_KEY, JSON.stringify(edits));
}

function mmReset() {
  localStorage.removeItem(MM_KEY);
}

// Just enough to draw the menu, nav and footer if data.js can't be used
const MM_FALLBACK_SITE = {
  name: "Mary Adele Mehan",
  email: "hello@marymehan.com",
  menuFoot: "Mary Adele Mehan",
  nav: [
    { id: "home", label: "Home", href: "index.html", icon: "home" },
    { id: "projects", label: "Artwork", href: "projects.html", icon: "heart" },
    { id: "resume", label: "Resume", href: "resume.html", icon: "person" },
    { id: "store", label: "Store", href: "store/index.html", icon: "bag" },
  ],
  footer: { copyright: "© Mary Mehan. All rights reserved.", note: "" },
};

const MM_LOAD_TIMEOUT = 10000;

// Fill any missing chrome fields from the fallback so the menu and footer always work
function mmWithDefaults(content) {
  if (!content || typeof content !== "object") throw new Error("window.MM_DATA is not an object");
  const site = content.site || {};
  content.site = {
    ...MM_FALLBACK_SITE,
    ...site,
    nav: Array.isArray(site.nav) && site.nav.length ? site.nav : MM_FALLBACK_SITE.nav,
    footer: { ...MM_FALLBACK_SITE.footer, ...site.footer },
  };
  return content;
}

const mmDomReady = new Promise((resolve) =>
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", resolve) : resolve()
);

// Load data.js with a plain <script> element (allowed even on file:// pages).
// Resolves with window.MM_DATA; rejects if it 404s, has a syntax error, or times out.
const mmContent = Promise.race([
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MM_DATA_URL.href + "?v=" + MM_DATA_VERSION;
    script.onload = () =>
      window.MM_DATA
        ? resolve(window.MM_DATA)
        : reject(new Error("data.js loaded but didn't set window.MM_DATA (syntax error?)"));
    script.onerror = () => reject(new Error("couldn't load " + MM_DATA_URL));
    document.head.appendChild(script);
  }),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${MM_LOAD_TIMEOUT / 1000}s`)), MM_LOAD_TIMEOUT)
  ),
]).then(mmWithDefaults);

// Google Analytics (gtag.js) with the ID from data.js → site.analytics.googleTagId.
// Same calls as Google's standard snippet. Skipped on file:// and localhost so
// local previews and tests don't show up as visits.
function mmInitAnalytics(id) {
  if (!id || location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(script);
}
mmContent.then((content) => mmInitAnalytics(content.site.analytics?.googleTagId), () => {});

// Resolves with the content once data.js is loaded, the DOM is ready, and
// the shared chrome is built. If data.js can't be loaded, the chrome is built
// from MM_FALLBACK_SITE, an error notice is shown, and this rejects.
// Page scripts should use mmPage() rather than this directly.
const mmReady = Promise.all([mmContent, mmDomReady]).then(
  ([content]) => {
    MM_CONTENT = content;
    const data = mmLoad();
    buildChrome(data);
    buildFooter(data);
    return data;
  },
  async (err) => {
    await mmDomReady;
    console.error("Could not load data.js:", err);
    const fallback = { site: MM_FALLBACK_SITE };
    buildChrome(fallback);
    buildFooter(fallback);
    mmContentError();
    throw err;
  }
);
mmReady.catch(() => {}); // reported above

// Run a page's render code once content is ready. If data.js failed to load,
// it doesn't run; if it throws (e.g. a section is missing), the error notice replaces the page.
// When done, <html data-mm-state> is "ready" or "error" (the tests wait on it).
function mmPage(render) {
  return mmReady.then(
    (data) => {
      try {
        render(data);
        document.documentElement.dataset.mmState ??= "ready";
      } catch (err) {
        console.error("Could not render this page from data.js:", err);
        mmContentError();
      }
    },
    () => {} // already reported by mmReady
  );
}

// Swap the page's own content for a short notice; the menu, nav and footer stay
function mmContentError() {
  if (document.querySelector(".load-error")) return;
  const notice = document.createElement("section");
  notice.className = "load-error";
  notice.setAttribute("role", "alert");
  notice.innerHTML = `
    <div class="wrap">
      <h1>Content unavailable</h1>
      <p>This page couldn't load its content. Check your connection and try again.</p>
      <button class="btn ghost" type="button">Try again</button>
    </div>`;
  notice.querySelector("button").addEventListener("click", () => location.reload());
  const top = document.querySelector(".topbar");
  top ? top.after(notice) : document.body.prepend(notice);
  document.body.classList.add("content-failed");
  document.documentElement.dataset.mmState = "error";
}

/* ---------- icons (stroke-based line icons) ---------- */

const MM_ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.9-9.3-9C1.4 8 3 4.9 6.2 4.9c2 0 3.3 1 4.1 2.4h3.4c.8-1.4 2.1-2.4 4.1-2.4 3.2 0 4.8 3.1 3.5 6.1-1.8 4.1-9.3 9-9.3 9z" transform="scale(0.98)"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/></svg>',
  person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c1-4 3.8-6 7.2-6s6.2 2 7.2 6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.5 2"/></svg>',
};

/* ---------- shared chrome: top bar, bottom nav, overlay menu, footer ----------
   Each page sets <body data-page="home|projects|resume|store|control">.
   Pages in a subfolder also set data-root="../" so links resolve. */

function buildChrome(data) {
  const page = document.body.dataset.page || "home";
  const root = document.body.dataset.root || "";
  const site = data.site;

  // top bar
  const top = document.createElement("header");
  top.className = "topbar";
  top.innerHTML = `
    <div class="left">
      <button class="icon-btn" id="menu-open" aria-label="Menu">${MM_ICONS.menu}</button>
      <a class="brand" href="${root}index.html"></a>
    </div>
    <div class="right">
      <a class="icon-btn" href="${root}projects.html" aria-label="Projects">${MM_ICONS.heart}</a>
      <a class="icon-btn" href="${root}projects.html" aria-label="Search">${MM_ICONS.search}</a>
      <a class="icon-btn" id="mail-btn" href="mailto:${site.email}" aria-label="Contact">${MM_ICONS.bag}</a>
    </div>`;
  top.querySelector(".brand").textContent = site.name;
  document.body.prepend(top);

  // bottom nav: one icon per page
  const nav = document.createElement("nav");
  nav.className = "bottomnav";
  nav.setAttribute("aria-label", "Primary");
  nav.innerHTML =
    site.nav.map(
      (p) =>
        `<a href="${root}${p.href}" class="${p.id === page ? "active" : ""}" aria-label="${p.label}">${MM_ICONS[p.icon] || MM_ICONS.home}</a>`
    ).join("");
  document.body.appendChild(nav);

  // overlay menu
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";
  overlay.innerHTML = `
    <button class="menu-close" aria-label="Close menu">&times;</button>
    <nav>
      ${site.nav.map(
        (p) => `<a href="${root}${p.href}" class="${p.id === page ? "active" : ""}">${p.label}</a>`
      ).join("")}
    </nav>
    <div class="menu-foot"><span id="menu-foot-text"></span><br /><span id="menu-email"></span></div>`;
  overlay.querySelector("#menu-foot-text").textContent = site.menuFoot;
  overlay.querySelector("#menu-email").textContent = site.email;
  document.body.appendChild(overlay);

  document.getElementById("menu-open").addEventListener("click", () => overlay.classList.add("open"));
  overlay.querySelector(".menu-close").addEventListener("click", () => overlay.classList.remove("open"));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") overlay.classList.remove("open");
  });

  // top bar turns solid once you scroll past the hero-ish zone
  addEventListener("scroll", () => top.classList.toggle("solid", scrollY > 40), { passive: true });
  if (scrollY > 40) top.classList.add("solid");
}

// Fills an empty <footer class="site-footer"></footer>; pages with their own footer keep it.
// A section can add a row of links above the site nav and its own note by defining
// mmFooterExtra(data) => { links: [{ label, href }], note } (the store does).
function buildFooter(data) {
  const footer = document.querySelector(".site-footer");
  if (!footer || footer.children.length) return;
  const root = document.body.dataset.root || "";
  const site = data.site;
  let extra = null;
  try {
    extra = typeof mmFooterExtra === "function" ? mmFooterExtra(data) : null;
  } catch (err) {
    console.error("mmFooterExtra failed:", err);
  }
  const row = (links, prefix) =>
    `<div class="foot-links">${links.map((p) => `<a href="${prefix}${p.href}">${p.label}</a>`).join("")}</div>`;
  footer.innerHTML = `
    <div class="wrap">
      <div class="foot-brand"></div>
      ${extra?.links?.length ? row(extra.links, "") : ""}
      ${row(site.nav, root)}
      <div class="foot-fine">
        <span class="foot-email"></span><br />
        <span class="foot-copy"></span><br />
        <span class="foot-note"></span>
      </div>
    </div>`;
  footer.querySelector(".foot-brand").textContent = site.name;
  footer.querySelector(".foot-email").textContent = site.email;
  footer.querySelector(".foot-copy").textContent = site.footer.copyright;
  footer.querySelector(".foot-note").textContent = extra?.note ?? site.footer.note;
}

/* ---------- project card rendering ---------- */

function projectCard(p, i) {
  const a = document.createElement("a");
  a.className = "card";
  a.href = p.href || "projects.html";
  if (/^https?:\/\//.test(p.href || "")) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  const thumb = p.image
    ? `<div class="thumb has-img"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>`
    : `<div class="thumb ${p.tone || "t-" + ((i % 4) + 1)}" data-num="${String(i + 1).padStart(2, "0")}"></div>`;
  a.innerHTML = `
    ${thumb}
    <div class="cat">${p.cat}</div>
    <div class="name">${p.name}</div>
    <div class="meta"><span class="tag">${p.year}</span>${p.role}</div>`;
  return a;
}

function renderRow(el, projects) {
  el.innerHTML = "";
  projects.forEach((p, i) => el.appendChild(projectCard(p, i)));
}

/* ---------- hero carousel ---------- */

// Slides from data: { title: [lines], sub?: [lines], image?, position?, dim?, art?, mark? }
function renderHero(el, slides) {
  const track = el.querySelector(".hero-track");
  track.innerHTML = "";
  slides.forEach((s) => {
    const slide = document.createElement("div");
    slide.className = "hero-slide";

    const art = document.createElement("div");
    art.className = "slide-art " + (s.image ? "art-photo" + (s.dim ? " dim" : "") : s.art || "art-1");
    if (s.image) art.style.backgroundImage = `url('${s.image}')`;
    if (s.position) art.style.backgroundPosition = s.position;
    if (s.mark) art.dataset.mark = s.mark;

    const caption = document.createElement("div");
    caption.className = "slide-caption";
    const lines = (cls, text) => {
      const d = document.createElement("div");
      d.className = cls;
      [].concat(text).forEach((line, i) => {
        if (i) d.appendChild(document.createElement("br"));
        d.appendChild(document.createTextNode(line));
      });
      caption.appendChild(d);
    };
    lines("slide-title", s.title);
    if (s.sub) lines("slide-sub", s.sub);

    slide.append(art, caption);
    track.appendChild(slide);
  });
}

function initHero() {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const track = hero.querySelector(".hero-track");
  const slides = hero.querySelectorAll(".hero-slide");
  const barsBox = hero.querySelector(".hero-progress");
  if (slides.length < 2) return; // single banner: no arrows, bars, or autoplay
  let idx = 0;
  let timer;

  const prev = document.createElement("button");
  prev.className = "hero-arrow prev";
  prev.setAttribute("aria-label", "Previous slide");
  prev.innerHTML = MM_ICONS.back;
  const next = document.createElement("button");
  next.className = "hero-arrow next";
  next.setAttribute("aria-label", "Next slide");
  next.innerHTML = MM_ICONS.back;
  hero.appendChild(prev);
  hero.appendChild(next);
  prev.addEventListener("click", () => go(idx - 1, true));
  next.addEventListener("click", () => go(idx + 1, true));

  addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(idx - 1, true);
    if (e.key === "ArrowRight") go(idx + 1, true);
  });

  slides.forEach((_, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", "Slide " + (i + 1));
    b.addEventListener("click", () => go(i, true));
    barsBox.appendChild(b);
  });
  const bars = barsBox.querySelectorAll("button");

  function go(i, manual) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    bars.forEach((d, j) => d.classList.toggle("on", j === idx));
    if (manual) restart();
  }
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => go(idx + 1), 5000);
  }
  go(0);
  restart();
}
