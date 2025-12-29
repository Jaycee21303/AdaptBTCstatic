(function () {
  const statusEl = document.querySelector('[data-compare-status]');
  const bodyEl = document.querySelector('[data-compare-body]');
  const errorsEl = document.querySelector('[data-compare-errors]');
  const refreshBtn = document.getElementById('compare-refresh');

  const spreadEls = {
    percent: document.querySelector('[data-spread-percent]'),
    bps: document.querySelector('[data-spread-bps]'),
    low: document.querySelector('[data-spread-low]'),
    high: document.querySelector('[data-spread-high]'),
  };

  function formatUSD(value) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
  }

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b91c1c' : 'var(--gray-600)';
  }

  function renderSpread(spread) {
    if (!spread) return;
    spreadEls.percent.textContent = `${spread.percent?.toFixed(3) ?? '—'}%`;
    spreadEls.bps.textContent = `${spread.basis_points ?? '—'} bps`;
    spreadEls.low.textContent = formatUSD(spread.low);
    spreadEls.high.textContent = formatUSD(spread.high);
  }

  function renderErrors(errors = []) {
    if (!errorsEl) return;
    errorsEl.textContent = errors.length ? `Partial data: ${errors.join('; ')}` : '';
  }

  function renderRows(exchanges = []) {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    if (!exchanges.length) {
      const empty = document.createElement('div');
      empty.className = 'skeleton-row';
      empty.textContent = 'No prices available right now.';
      bodyEl.appendChild(empty);
      return;
    }

    const bestPrice = Math.min(...exchanges.map((ex) => ex.price));

    exchanges
      .sort((a, b) => a.price - b.price)
      .forEach((exchange) => {
        const row = document.createElement('div');
        row.className = 'row';
        const distance = ((exchange.price - bestPrice) / bestPrice) * 100;
        row.innerHTML = `
          <div class="col">${exchange.exchange}</div>
          <div class="col">${formatUSD(exchange.price)}</div>
          <div class="col"><span class="distance-chip">${distance.toFixed(3)}% from best</span></div>
          <div class="col muted">${exchange.source}</div>
        `;
        bodyEl.appendChild(row);
      });
  }

  async function loadPrices() {
    setStatus('Refreshing quotes…');
    try {
      const response = await fetch('/api/exchange-prices');
      if (!response.ok) throw new Error('Request failed');
      const payload = await response.json();
      renderRows(payload.exchanges || []);
      renderErrors(payload.errors || []);
      renderSpread(payload.spread);
      setStatus('Live quotes updated.');
    } catch (error) {
      console.error(error);
      renderRows([]);
      renderErrors(['Unable to reach one or more exchanges.']);
      setStatus('Unable to refresh exchange prices.', true);
    }
  }

  if (refreshBtn) refreshBtn.addEventListener('click', loadPrices);
  loadPrices();
  setInterval(loadPrices, 60000);
})();
