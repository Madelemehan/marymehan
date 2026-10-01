storePage(() => {
  const cartItems = getCartItems();

  const checkoutBody = document.getElementById('checkout-body');
  const summaryContainer = document.getElementById('checkout-summary');
  const emptyMsg = document.getElementById('checkout-empty');
  const loadingBtn = document.getElementById('checkout-loading-btn');
  const paypalContainer = document.getElementById('paypal-button-container');

  if (cartItems.length === 0) {
    checkoutBody.hidden = true;
    emptyMsg.hidden = false;
  } else {
    const { subtotal, shipping, total } = totals(cartItems);

    summaryContainer.innerHTML = `
      <div class="panel">
        <div class="panel-head">Order summary</div>
        <div class="panel-body">
          ${cartItems.map(item => `
            <div class="sum-item">
              <span class="sum-thumb ${artTone(item.product)}">${artImg(item.product, false)}</span>
              <div class="grow">
                <div class="nm">${item.product.name}</div>
                <div class="q">Qty ${item.qty}</div>
              </div>
              <strong>${money(item.product.price * item.qty)}</strong>
            </div>
          `).join('')}
          <div class="sum-row sep"><span>Subtotal</span><strong>${money(subtotal)}</strong></div>
          <div class="sum-row"><span>Shipping</span><strong>${shipping === 0 ? 'Free' : money(shipping)}</strong></div>
          <div class="sum-row total"><span>Total</span><span>${money(total)}</span></div>
        </div>
      </div>
    `;

    function renderButtons() {
      paypal.Buttons({
        style: { layout: 'vertical', color: 'white', shape: 'pill', label: 'paypal' },

        createOrder: (_data, actions) => {
          return actions.order.create({
            application_context: {
              return_url: new URL('thankyou.html', location.href).href,
              cancel_url: new URL('checkout.html', location.href).href,
            },
            purchase_units: [{
              amount: {
                value: total.toFixed(2),
                currency_code: 'USD',
                breakdown: {
                  item_total: { value: subtotal.toFixed(2), currency_code: 'USD' },
                  shipping: { value: shipping.toFixed(2), currency_code: 'USD' },
                },
              },
              items: cartItems.map(item => ({
                name: item.product.name.slice(0, 127),
                unit_amount: { value: item.product.price.toFixed(2), currency_code: 'USD' },
                quantity: String(item.qty),
              })),
            }],
          });
        },

        onApprove: (_data, actions) => {
          return actions.order.capture().then(details => {
            localStorage.setItem('mm-store-last-order', JSON.stringify(details));
            clearCart();
            window.location.href = `thankyou.html?orderId=${encodeURIComponent(details.id)}`;
          });
        },

        onError: err => {
          console.error('PayPal error', err);
          alert('Payment failed. Please try again.');
        },
      }).render('#paypal-button-container').then(() => {
        loadingBtn.hidden = true;
        paypalContainer.hidden = false;
      });
    }

    function unavailable() {
      loadingBtn.textContent = 'Checkout unavailable — please try again later';
    }

    // Load the PayPal SDK only on this page, and only when there is something to pay for
    const sdk = document.createElement('script');
    sdk.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture`;
    sdk.onload = () => (typeof paypal !== 'undefined' ? renderButtons() : unavailable());
    sdk.onerror = unavailable;
    document.head.appendChild(sdk);
  }
});
