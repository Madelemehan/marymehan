storePage(({ categories, taglines }) => {
  // Hero (data.js → store.pages.home.hero)
  const hero = storePageText().hero;
  if (hero) {
    document.querySelector('.hero .slide-art').dataset.mark = hero.mark || '';
    const title = document.querySelector('.hero .slide-title');
    title.textContent = '';
    hero.title.forEach((line, i) => {
      if (i) title.appendChild(document.createElement('br'));
      title.appendChild(document.createTextNode(storeFill(line)));
    });
    document.querySelector('.hero-ctas').innerHTML = (hero.ctas || []).map(c =>
      `<a class="btn${c.ghost ? ' ghost' : ''}" href="${c.href}">${esc(storeFill(c.label))}</a>`
    ).join('');
  }

  // Rotating tagline
  const taglineEl = document.getElementById('rotating-tagline');
  if (taglineEl) {
    const shuffled = [...taglines].sort(() => Math.random() - 0.5);
    let index = 0;

    function showTagline() {
      taglineEl.style.opacity = '0';
      setTimeout(() => {
        taglineEl.textContent = shuffled[index];
        taglineEl.style.opacity = '1';
        index = (index + 1) % shuffled.length;
      }, 700);
    }

    showTagline();
    setInterval(showTagline, 4000);
  }

  // Category tiles
  const categoriesGrid = document.getElementById('categories-grid');
  if (categoriesGrid) {
    categoriesGrid.innerHTML = categories.map(cat => `
      <a class="cat-tile" href="category.html?category=${cat.id}">
        <span class="tile-label">${cat.name}<small>${cat.description}</small></span>
      </a>
    `).join('');
  }

  // Category chips above the featured grid
  const chips = document.getElementById('featured-chips');
  if (chips) {
    chips.innerHTML = `
      <a class="chip on" href="category.html">All</a>
      ${categories.map(c => `<a class="chip" href="category.html?category=${c.id}">${c.name}</a>`).join('')}
    `;
  }

  // Featured products
  const featuredGrid = document.getElementById('featured-grid');
  if (featuredGrid) renderProductGrid(featuredGrid, getFeaturedProducts(8));
});
