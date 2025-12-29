(function () {
  const statusEl = document.querySelector('[data-signal-status]');
  const priceEl = document.querySelector('[data-signal-price]');
  const changeEl = document.querySelector('[data-signal-change]');
  const capEl = document.querySelector('[data-signal-cap]');
  const volEl = document.querySelector('[data-signal-volume]');
  const momentumEl = document.querySelector('[data-signal-momentum]');
  const volatilityEl = document.querySelector('[data-signal-volatility]');
  const liquidityEl = document.querySelector('[data-signal-liquidity]');
  const confidenceEl = document.querySelector('[data-confidence-score]');

  const chips = {
    momentum: document.querySelector('[data-chip-momentum]'),
    liquidity: document.querySelector('[data-chip-liquidity]'),
    stability: document.querySelector('[data-chip-stability]'),
    heat: document.querySelector('[data-chip-heat]'),
  };

  const allocationInput = document.getElementById('allocation-input');
  const horizonInput = document.getElementById('horizon-input');
  const convictionSelect = document.getElementById('conviction-mode');
  const horizonDisplay = document.querySelector('[data-horizon-display]');
  const refreshBtn = document.getElementById('refresh-signals');

  const outputEls = {
    btc: document.querySelector('[data-output-btc]'),
    capital: document.querySelector('[data-output-capital]'),
    stretch: document.querySelector('[data-output-stretch]'),
    buffer: document.querySelector('[data-output-buffer]'),
  };

  let latestPrice = 0;
  let latestMomentum = 0;
  let latestVolatility = 0;
  let avgPrice30d = 0;
  let liquidityScore = 0;

  function formatUSD(value) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  function formatPercent(value, decimals = 2) {
    if (!Number.isFinite(value)) return '—';
    return `${value.toFixed(decimals)}%`;
  }

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#b91c1c' : 'var(--gray-600)';
  }

  function standardDeviation(values) {
    if (!values.length) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function renderChips(momentumScore, liquidityScoreValue, stabilityScore, heatScore) {
    if (chips.momentum) chips.momentum.textContent = `${Math.round(momentumScore)} / 100`;
    if (chips.liquidity) chips.liquidity.textContent = `${Math.round(liquidityScoreValue)} / 100`;
    if (chips.stability) chips.stability.textContent = `${Math.round(stabilityScore)} / 100`;
    if (chips.heat) chips.heat.textContent = `${Math.round(heatScore)} / 100`;
  }

  function renderPlan() {
    const allocation = Number.parseFloat(allocationInput?.value || '0');
    const months = Number.parseInt(horizonInput?.value || '0', 10);
    const conviction = convictionSelect?.value || 'balanced';
    const capital = allocation * months;

    const convictionMultiplier = {
      steady: 0.7,
      balanced: 1,
      aggressive: 1.3,
    }[conviction] || 1;

    if (!latestPrice || !Number.isFinite(capital) || capital <= 0) {
      outputEls.btc.textContent = '—';
      outputEls.capital.textContent = '—';
      outputEls.stretch.textContent = '—';
      outputEls.buffer.textContent = '—';
      return;
    }

    const baseBtc = capital / latestPrice;
    const expectedLift = clamp(latestMomentum / 100 * convictionMultiplier, -0.5, 0.5);
    const stretchBtc = capital / (latestPrice * (1 - expectedLift * 0.5));
    const buffer = capital * (0.05 + Math.min(0.15, latestVolatility * 4));

    outputEls.btc.textContent = `${baseBtc.toFixed(4)} BTC`;
    outputEls.capital.textContent = formatUSD(capital);
    outputEls.stretch.textContent = `${stretchBtc.toFixed(4)} BTC`;
    outputEls.buffer.textContent = formatUSD(buffer);
  }

  function renderSnapshot(snapshot) {
    const market = snapshot?.market_data;
    if (!market) return;

    latestPrice = market.current_price?.usd || 0;
    const change = market.price_change_percentage_24h || 0;
    const cap = market.market_cap?.usd || 0;
    const volume = market.total_volume?.usd || 0;
    liquidityScore = clamp((volume / cap) * 1200, 0, 100);

    priceEl.textContent = formatUSD(latestPrice);
    changeEl.textContent = formatPercent(change);
    changeEl.style.color = change >= 0 ? '#059669' : '#b91c1c';
    capEl.textContent = formatUSD(cap);
    volEl.textContent = formatUSD(volume);
  }

  function computeSignals(historyPrices) {
    if (!Array.isArray(historyPrices) || historyPrices.length < 2) return;
    const prices = historyPrices.map((p) => Number(p[1])).filter((p) => Number.isFinite(p));
    if (!prices.length) return;

    const first = prices[0];
    const last = prices[prices.length - 1];
    avgPrice30d = prices.reduce((sum, v) => sum + v, 0) / prices.length;
    latestMomentum = ((last - first) / first) * 100;

    const returns = [];
    for (let i = 1; i < prices.length; i += 1) {
      if (prices[i - 1]) {
        returns.push(prices[i] / prices[i - 1] - 1);
      }
    }
    latestVolatility = standardDeviation(returns);

    const volatilityPct = latestVolatility * 100;
    momentumEl.textContent = formatPercent(latestMomentum);
    volatilityEl.textContent = `${volatilityPct.toFixed(2)}% σ`;

    const stabilityScore = clamp(100 - volatilityPct * 18, 10, 100);
    const momentumScore = clamp(50 + latestMomentum * 0.8, 0, 100);
    const heatScore = clamp(50 + ((last - avgPrice30d) / avgPrice30d) * 120, 0, 100);

    const confidence = Math.round(
      momentumScore * 0.35 + stabilityScore * 0.25 + liquidityScore * 0.25 + heatScore * 0.15,
    );

    liquidityEl.textContent = `${Math.round(liquidityScore)} / 100`;
    if (confidenceEl) confidenceEl.textContent = `${confidence}`;

    renderChips(momentumScore, liquidityScore, stabilityScore, heatScore);
    renderPlan();
  }

  async function loadSignals() {
    setStatus('Refreshing live metrics…');
    try {
      const [snapshotRes, historyRes] = await Promise.all([
        fetch('/api/btc/snapshot'),
        fetch('/api/btc/history?days=30'),
      ]);

      if (!snapshotRes.ok) throw new Error('Snapshot request failed');
      if (!historyRes.ok) throw new Error('History request failed');

      const snapshot = await snapshotRes.json();
      const history = await historyRes.json();

      renderSnapshot(snapshot);
      computeSignals(history.prices || []);
      setStatus('Live metrics updated.');
    } catch (error) {
      console.error(error);
      setStatus('Unable to refresh signals right now.', true);
    }
  }

  if (horizonInput && horizonDisplay) {
    horizonInput.addEventListener('input', () => {
      horizonDisplay.textContent = horizonInput.value;
      renderPlan();
    });
  }

  [allocationInput, convictionSelect].forEach((el) => {
    if (el) el.addEventListener('input', renderPlan);
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadSignals);
  }

  loadSignals();
  setInterval(loadSignals, 120000);
})();
