storePage(() => {
  const container = document.getElementById('cart-container');
  const countEl = document.getElementById('cart-count');

  container.addEventListener('click', e => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.remove);
    } else {
      const minus = e.target.closest('[data-qty-minus]');
      const plus = e.target.closest('[data-qty-plus]');
      const id = minus?.dataset.qtyMinus || plus?.dataset.qtyPlus;
      const item = id && getCart().find(i => i.id === id);
      if (!item) return;
      updateQuantity(id, item.qty + (plus ? 1 : -1));
    }
    updateCartBadge();
    renderCart();
  });

  renderCart();

  function renderCart() {
    const cartItems = getCartItems();
    const itemCount = cartItems.reduce((n, i) => n + i.qty, 0);
    countEl.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'}`;

    if (cartItems.length === 0) {
      container.innerHTML = emptyState('Your cart is empty', 'Add something to get started.', 'Start shopping');
      return;
    }

    const { subtotal, shipping, total } = totals(cartItems);

    container.innerHTML = `
      <div class="cart-layout">
        <ul class="cart-list">
          ${cartItems.map(cartItemRow).join('')}
        </ul>

        <div class="panel">
          <div class="panel-head">Order summary</div>
          <div class="panel-body">
            <div class="sum-row"><span>Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})</span><strong>${money(subtotal)}</strong></div>
            <div class="sum-row"><span>Shipping</span><strong>${shipping === 0 ? 'Free' : money(shipping)}</strong></div>
            ${shipping > 0 ? `<p class="sum-note">Add ${money(50 - subtotal)} more for free shipping</p>` : ''}
            <div class="sum-row total"><span>Total</span><span>${money(total)}</span></div>
            <div class="sum-actions">
              <a class="btn block" href="checkout.html">Proceed to checkout</a>
              <a class="btn ghost block" href="index.html">Continue shopping</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function cartItemRow(item) {
    return `
      <li class="cart-row">
        <a class="thumb ${artTone(item.product)}" href="product.html?id=${item.id}">
          ${artImg(item.product, false)}
        </a>
        <div class="info">
          <div class="top">
            <a class="name" href="product.html?id=${item.id}">${item.product.name}</a>
            <button class="remove" data-remove="${item.id}" aria-label="Remove ${item.product.name}">&times;</button>
          </div>
          <span class="each">${money(item.product.price)} each</span>
          <div class="bottom">
            <div class="stepper">
              <button data-qty-minus="${item.id}" aria-label="Decrease quantity">−</button>
              <span>${item.qty}</span>
              <button data-qty-plus="${item.id}" aria-label="Increase quantity">+</button>
            </div>
            <span class="line">${money(item.product.price * item.qty)}</span>
          </div>
        </div>
      </li>
    `;
  }
});
