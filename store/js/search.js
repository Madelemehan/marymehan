storePage(({ products }) => {
  const params = new URLSearchParams(location.search);
  const query = (params.get('q') || '').trim();
  const q = query.toLowerCase();

  const heading = document.getElementById('search-heading');
  const subheading = document.getElementById('search-subheading');
  const input = document.getElementById('search-input');
  const grid = document.getElementById('products-grid');

  if (query) document.title = storeTitle(`"${query}"`);
  input.value = query;

  if (!query) {
    // heading and subheading come from data.js (store.pages.search)
    input.focus();
  } else {
    const results = products.filter(p =>
      p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );

    heading.textContent = `"${query}"`;
    subheading.textContent = results.length === 0
      ? 'No products found.'
      : `${results.length} product${results.length === 1 ? '' : 's'} found`;

    if (results.length === 0) {
      grid.innerHTML = emptyState(`No results for "${esc(query)}"`, 'Try a different word, or browse everything.', 'All products', 'category.html');
    } else {
      renderProductGrid(grid, results);
    }
  }
});
