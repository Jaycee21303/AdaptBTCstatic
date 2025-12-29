(function () {
  const HISTORY_CACHE = new Map();
  const HISTORY_PROMISES = new Map();
  const LAST_KNOWN_HISTORY = new Map();

  let snapshotCache = null;
  let snapshotPromise = null;
  let lastKnownSnapshot = null;
  const CHART_INSTANCES = new Map();
  const API_BASE = 'https://api.coingecko.com/api/v3';

  const defaultColors = {
    line: '#1b73ff',
    fill: 'rgba(27, 115, 255, 0.12)',
    grid: '#e5e7eb',
    tick: '#4b5563',
  };

  function formatCurrency(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    });
  }

  function setStatus(statusEl, message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('error', Boolean(isError));
  }

  async function fetchJsonWithRetry(url, { retries = 3, timeoutMs = 12000 } = {}) {
    const retryStatuses = new Set([429, 500, 502, 503, 504]);
    const baseDelay = 600;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });

        if (response.ok) {
          clearTimeout(timeout);
          return response.json();
        }

        if (!retryStatuses.has(response.status) || attempt === retries) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && attempt === retries) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error('Failed to fetch JSON');
  }

  function normalizeHistory(prices) {
    if (!Array.isArray(prices)) return [];
    return prices.map(([timestamp, price]) => ({ x: timestamp, y: price }));
  }

  function getHistoryFromCache(rangeDays) {
    if (HISTORY_CACHE.has(rangeDays)) return HISTORY_CACHE.get(rangeDays);
    if (LAST_KNOWN_HISTORY.has(rangeDays)) return LAST_KNOWN_HISTORY.get(rangeDays);
    return null;
  }

  function cacheHistory(rangeDays, data) {
    HISTORY_CACHE.set(rangeDays, data);
    LAST_KNOWN_HISTORY.set(rangeDays, data);
  }

  async function fetchHistoryRange(rangeDays = 'max') {
    const backendUrl = `/api/btc/history?days=${rangeDays}`;
    const fallbackUrl = `${API_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${rangeDays}`;

    let data;
    try {
      data = await fetchJsonWithRetry(backendUrl);
    } catch (error) {
      console.warn('Backend BTC history failed, falling back to CoinGecko', error);
      data = await fetchJsonWithRetry(fallbackUrl);
    }

    if (!Array.isArray(data?.prices)) throw new Error('Invalid BTC history response');

    const parsed = normalizeHistory(data.prices);
    cacheHistory(rangeDays, parsed);
    return parsed;
  }

  async function fetchFullHistory() {
    if (HISTORY_CACHE.has('max')) return HISTORY_CACHE.get('max');
    if (HISTORY_PROMISES.has('max')) return HISTORY_PROMISES.get('max');

    const promise = fetchHistoryRange('max').finally(() => {
      HISTORY_PROMISES.delete('max');
    });

    HISTORY_PROMISES.set('max', promise);
    return promise;
  }

  async function fetchHistoricalPrices(rangeDays = 'max') {
    const cached = getHistoryFromCache(rangeDays);
    if (cached) return cached;

    // Reuse the full history dataset for derived ranges to avoid multiple network calls
    const numericDays = Number(rangeDays);
    if (Number.isFinite(numericDays) && numericDays > 0) {
      try {
        const fullHistory = await fetchFullHistory();
        const cutoff = Date.now() - numericDays * 24 * 60 * 60 * 1000;
        const filtered = fullHistory.filter((point) => point.x >= cutoff);

        if (filtered.length >= 2) {
          cacheHistory(rangeDays, filtered);
          return filtered;
        }
      } catch (error) {
        console.warn('Falling back to direct range fetch after full history error', error);
      }
    }

    if (HISTORY_PROMISES.has(rangeDays)) return HISTORY_PROMISES.get(rangeDays);

    const promise = fetchHistoryRange(rangeDays)
      .catch((error) => {
        const fallbackData = getHistoryFromCache(rangeDays);
        if (fallbackData) return fallbackData;
        throw error;
      })
      .finally(() => {
        HISTORY_PROMISES.delete(rangeDays);
      });

    HISTORY_PROMISES.set(rangeDays, promise);
    return promise;
  }

  async function fetchBtcSnapshot() {
    if (snapshotCache) return snapshotCache;
    if (snapshotPromise) return snapshotPromise;

    const backendUrl = '/api/btc/snapshot';
    const fallbackUrl = `${API_BASE}/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;

    snapshotPromise = fetchJsonWithRetry(backendUrl)
      .catch((error) => {
        console.warn('Backend BTC snapshot failed, falling back to CoinGecko', error);
        return fetchJsonWithRetry(fallbackUrl);
      })
      .then((data) => {
        const market = data?.market_data || {};
        snapshotCache = {
          price: market.current_price?.usd ?? null,
          change24h: market.price_change_percentage_24h ?? null,
          ath: market.ath?.usd ?? null,
          athDate: market.ath_date?.usd ? new Date(market.ath_date.usd) : null,
          lastUpdated: data?.last_updated ? new Date(data.last_updated) : null,
        };
        lastKnownSnapshot = snapshotCache;
        return snapshotCache;
      })
      .catch((error) => {
        if (lastKnownSnapshot) return lastKnownSnapshot;
        throw error;
      })
      .finally(() => {
        snapshotPromise = null;
      });

    return snapshotPromise;
  }

  function applySummary(snapshot, summarySelectors = {}) {
    if (!snapshot) return;
    const { priceElId, changeElId, athElId } = summarySelectors;

    if (priceElId) {
      const el = document.getElementById(priceElId);
      if (el) el.textContent = formatCurrency(snapshot.price);
    }

    if (changeElId) {
      const el = document.getElementById(changeElId);
      if (el) {
        if (typeof snapshot.change24h === 'number') {
          const isPositive = snapshot.change24h >= 0;
          el.textContent = `${isPositive ? '+' : ''}${snapshot.change24h.toFixed(2)}% 24h`;
          el.classList.toggle('positive', isPositive);
          el.classList.toggle('negative', !isPositive);
        } else {
          el.textContent = '—';
          el.classList.remove('positive', 'negative');
        }
      }
    }

    if (athElId) {
      const el = document.getElementById(athElId);
      if (el) {
        const athValue = formatCurrency(snapshot.ath);
        const athDate = snapshot.athDate
          ? snapshot.athDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';
        el.textContent = snapshot.ath ? `${athValue} • ${athDate}` : '—';
      }
    }
  }

  function createGradient(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(27, 115, 255, 0)');
    return gradient;
  }

  function buildChart(canvas, data, { compact = false } = {}) {
    if (!window.Chart) return null;

    const ctx = canvas.getContext('2d');
    const lineColor = defaultColors.line;

    return new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'BTC/USD',
            data,
            borderColor: lineColor,
            backgroundColor: createGradient(ctx, defaultColors.fill),
            borderWidth: 2.8,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `BTC/USD: ${formatCurrency(value)}`;
              },
            },
          },
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x',
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: compact ? 'month' : 'year' },
            grid: { color: defaultColors.grid, drawBorder: false },
            ticks: { color: defaultColors.tick, autoSkip: true, maxTicksLimit: compact ? 6 : 12 },
          },
          y: {
            title: { display: true, text: 'Price (USD)' },
            ticks: {
              color: defaultColors.tick,
              callback: (value) => formatCurrency(value),
            },
            grid: { color: defaultColors.grid, drawBorder: false },
          },
        },
      },
    });
  }

  async function initBtcPriceChart({
    canvasId,
    statusId,
    rangeDays = 'max',
    summarySelectors,
    compact = false,
    updatedLabelId,
  }) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const statusEl = statusId ? document.getElementById(statusId) : null;
    const updatedEl = updatedLabelId ? document.getElementById(updatedLabelId) : null;

    setStatus(statusEl, 'Loading BTC price data…');

    const destroyExisting = () => {
      if (CHART_INSTANCES.has(canvasId)) {
        CHART_INSTANCES.get(canvasId).destroy();
        CHART_INSTANCES.delete(canvasId);
      }
    };

    try {
      destroyExisting();
      const [history, snapshot] = await Promise.all([
        fetchHistoricalPrices(rangeDays),
        fetchBtcSnapshot(),
      ]);

      applySummary(snapshot, summarySelectors);
      const chart = buildChart(canvas, history, { compact });
      if (chart) CHART_INSTANCES.set(canvasId, chart);

      const updatedLabel = snapshot?.lastUpdated
        ? `Updated ${snapshot.lastUpdated.toLocaleString()}`
        : 'Live market data';
      setStatus(statusEl, updatedLabel);
      if (updatedEl) updatedEl.textContent = updatedLabel;
    } catch (error) {
      console.error('BTC price map error', error);
      destroyExisting();
      setStatus(statusEl, 'Unable to load BTC chart right now. Please try again later.', true);
      if (updatedEl) updatedEl.textContent = '—';
    }
  }

  function registerZoomPlugin() {
    const zoomPlugin = window.ChartZoom || window['chartjs-plugin-zoom'];
    if (window.Chart && zoomPlugin) {
      Chart.register(zoomPlugin);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    registerZoomPlugin();

    // Prefetch full history and snapshot so the first render is instant and resilient
    Promise.all([fetchFullHistory(), fetchBtcSnapshot()]).catch((error) => {
      console.warn('Prefetch error (continuing with lazy load)', error);
    });

    const mainRangeButtons = document.querySelectorAll('.range-btn');
    let activeRange = 'max';

    const handleRangeChange = (rangeDays, targetButton) => {
      activeRange = rangeDays;
      mainRangeButtons.forEach((btn) => btn.classList.toggle('is-active', btn === targetButton));
      initBtcPriceChart({
        canvasId: 'price-map-chart',
        statusId: 'price-map-status',
        rangeDays,
        compact: false,
        updatedLabelId: 'price-map-updated',
        summarySelectors: {
          priceElId: 'price-map-current',
          changeElId: 'price-map-change',
          athElId: 'price-map-ath',
        },
      });
    };

    mainRangeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const rangeDays = button.getAttribute('data-days');
        handleRangeChange(rangeDays, button);
      });
    });

    const resetButton = document.getElementById('price-map-reset');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        const chart = CHART_INSTANCES.get('price-map-chart');
        if (chart?.resetZoom) chart.resetZoom();
      });
    }

    if (mainRangeButtons.length) {
      handleRangeChange(activeRange, mainRangeButtons[0]);
    }

    initBtcPriceChart({
      canvasId: 'price-map-preview',
      statusId: 'price-map-preview-status',
      rangeDays: 90,
      compact: true,
    });
  });
})();
