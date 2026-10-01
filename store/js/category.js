storePage(({ categories, products: allProducts }) => {
  const params = new URLSearchParams(location.search);
  const categoryId = params.get('category');
  const category = getCategoryById(categoryId);
  const products = categoryId ? getProductsByCategory(categoryId) : allProducts;

  // Page title
  document.title = category ? `${category.name} — mary mehan store` : 'All products — mary mehan store';

  const heading = document.getElementById('category-heading');
  const subheading = document.getElementById('category-subheading');
  if (heading) heading.textContent = category ? category.name : 'All products';
  if (subheading) {
    const count = `${products.length} piece${products.length === 1 ? '' : 's'}`;
    subheading.textContent = category ? `${category.description} · ${count}` : `The full collection · ${count}`;
  }

  // Category chips
  const tabs = document.getElementById('category-tabs');
  if (tabs) {
    tabs.innerHTML = `
      <a class="chip${categoryId ? '' : ' on'}" href="category.html">All</a>
      ${categories.map(c => `
        <a class="chip${c.id === categoryId ? ' on' : ''}" href="category.html?category=${c.id}">${c.name}</a>
      `).join('')}
    `;
  }

  // Product grid
  const grid = document.getElementById('products-grid');
  if (grid) {
    if (products.length === 0) {
      grid.innerHTML = emptyState('No products found', 'Nothing in this category yet.', 'Back to the store');
    } else {
      renderProductGrid(grid, products);
    }
  }
});
