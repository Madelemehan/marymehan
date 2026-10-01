storePage(() => {
  const params = new URLSearchParams(location.search);
  const product = getProductById(params.get('id'));
  const container = document.getElementById('product-container');

  if (!product) {
    container.innerHTML = emptyState('Product not found', 'It may have sold out or moved.', 'Back to the store');
  } else {
    document.title = `${product.name} — Mary Adele Mehan store`;

    const category = getCategoryById(product.category);
    const discount = product.originalPrice
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;
    const stockClass = product.stock > 10 ? '' : product.stock > 0 ? 'low' : 'out';
    const stockText = product.stock > 10 ? 'In stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of stock';

    container.innerHTML = `
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="index.html">Store</a>
        <span>/</span>
        <a href="category.html?category=${product.category}">${category ? category.name : product.category}</a>
        <span>/</span>
        <span>${product.name}</span>
      </nav>

      <div class="pdp">
        <div class="pdp-media ${artTone(product)}">
          ${artImg(product, false)}
        </div>

        <div class="pdp-info">
          ${product.badge ? `<div><span class="badge inline">${product.badge}</span></div>` : ''}
          <h1>${product.name}</h1>

          <div class="pdp-price">
            ${money(product.price)}
            ${product.originalPrice ? `<s>${money(product.originalPrice)}</s>` : ''}
            ${discount ? `<span class="save">Save ${discount}%</span>` : ''}
          </div>

          <p class="desc">${product.description}</p>

          <div>
            <h3>Features</h3>
            <ul class="features">
              ${product.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </div>

          <div class="stock ${stockClass}">${stockText}</div>

          <div class="buy-row">
            <div class="stepper">
              <button id="qty-minus" aria-label="Decrease quantity">−</button>
              <input id="qty-input" type="number" value="1" min="1" max="${product.stock}" aria-label="Quantity">
              <button id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn" id="add-to-cart-btn" ${product.stock === 0 ? 'disabled' : ''}>
              ${product.stock === 0 ? 'Out of stock' : 'Add to cart'}
            </button>
          </div>

          <a class="btn ghost block" href="cart.html">View cart</a>
        </div>
      </div>
    `;

    const qtyInput = document.getElementById('qty-input');
    const clampQty = n => Math.min(product.stock, Math.max(1, Math.floor(n) || 1));

    document.getElementById('qty-minus').addEventListener('click', () => {
      qtyInput.value = clampQty(Number(qtyInput.value) - 1);
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      qtyInput.value = clampQty(Number(qtyInput.value) + 1);
    });

    const btn = document.getElementById('add-to-cart-btn');
    btn.addEventListener('click', () => {
      const qty = clampQty(Number(qtyInput.value));
      qtyInput.value = qty;
      addToCart(product.id, qty);
      updateCartBadge();
      btn.textContent = `Added ${qty}`;
      setTimeout(() => { btn.textContent = 'Add to cart'; }, 1500);
    });
  }
});
