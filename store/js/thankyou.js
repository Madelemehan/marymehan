storePage(() => {
  const params = new URLSearchParams(location.search);
  const orderId = params.get('orderId') || params.get('token');

  let details = null;
  try {
    details = JSON.parse(localStorage.getItem('mm-store-last-order'));
    localStorage.removeItem('mm-store-last-order');
  } catch {
    // ignore
  }

  function render() {
    const container = document.getElementById('thankyou-container');
    const sub = document.getElementById('thankyou-sub');

    if (!orderId && !details) {
      sub.textContent = 'Nothing to show here.';
      container.innerHTML = emptyState('No order found', '', 'Back to the store');
      return;
    }

    const displayId = details?.id || orderId || 'N/A';
    const payerName = details?.payer?.name
      ? `${details.payer.name.given_name} ${details.payer.name.surname}`
      : null;
    const payerEmail = details?.payer?.email_address || null;
    const amount = details?.purchase_units?.[0]?.amount?.value;
    const currency = details?.purchase_units?.[0]?.amount?.currency_code || 'USD';

    const row = (label, value, cls = '') => `
      <div class="sum-row"><span>${label}</span><strong class="${cls}">${esc(value)}</strong></div>`;

    container.innerHTML = `
      <div class="panel">
        <div class="panel-head">Order details</div>
        <div class="panel-body">
          ${row('Order ID', displayId, 'mono')}
          ${payerName ? row('Name', payerName) : ''}
          ${payerEmail ? row('Email', payerEmail) : ''}
          ${amount ? row('Amount paid', `${currency} $${amount}`) : ''}
          ${row('Status', 'Completed')}
        </div>
      </div>

      <div class="resume-actions">
        <a class="btn" href="index.html">Continue shopping</a>
        <button class="btn ghost" onclick="window.print()">Print receipt</button>
      </div>
    `;
  }

  render();
});
