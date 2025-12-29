import ChartModule from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

const ChartJS = ChartModule?.default ?? ChartModule;

const PUBLIC_API_URL = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart';
const LIVE_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';
const REFRESH_INTERVAL_MS = 15 * 1000;
const RETRY_DELAY_MS = 10 * 1000;
const DEFAULT_RANGE = '7';
const SOCKET_RETRY_LIMIT = 5;
const SOCKET_RETRY_BASE = 2000;

const historyCache = new Map();
const historyInFlight = new Map();
const subscribers = new Set();

let latestSnapshot = null;
let tickerInterval = null;
let chartLibPromise = null;
let adapterLoaded = false;
let livePriceInFlight = null;
let socket = null;
let socketScriptPromise = null;
let socketAttempts = 0;

const RANGE_UNITS = {
  '1': 'hour',
  '7': 'day',
  '30': 'day',
  '180': 'month',
  '365': 'month',
  max: 'year',
};

const sanitizeRange = (value) => {
  const normalized = String(value || '').toLowerCase();
  return ['1', '7', '30', '180', '365', 'max'].includes(normalized) ? normalized : DEFAULT_RANGE;
};

const formatCurrency = (value) =>
  Number.isFinite(value)
    ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const ensureSocketIO = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.io) return Promise.resolve();
  if (socketScriptPromise) return socketScriptPromise;

  socketScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Socket.IO failed to load'));
    document.head.appendChild(script);
  });

  return socketScriptPromise;
};

const ensureChartReady = async () => {
  if (chartLibPromise) return chartLibPromise;

  chartLibPromise = (async () => {
    const hasDateAdapter = Boolean(ChartJS?._adapters?._date);
    if (!adapterLoaded && !hasDateAdapter) {
      await import('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/+esm');
      adapterLoaded = true;
    } else if (hasDateAdapter) {
      adapterLoaded = true;
    }

    if (!ChartJS?.registry?.getController('candlestick')) {
      const financial = await import('https://cdn.jsdelivr.net/npm/chartjs-chart-financial@4.4.0/+esm');
      const { CandlestickController, CandlestickElement, OhlcElement } = financial;
      ChartJS.register(CandlestickController, CandlestickElement, OhlcElement);
    }

    return ChartJS;
  })();

  return chartLibPromise;
};

const notifySubscribers = (snapshot) => {
  latestSnapshot = snapshot;
  subscribers.forEach((handler) => {
    try {
      handler(snapshot);
    } catch (error) {
      console.warn('BTC subscriber error', error);
    }
  });
};

export const subscribeToBTCTicker = (handler) => {
  if (typeof handler !== 'function') return () => {};
  subscribers.add(handler);
  if (latestSnapshot) handler(latestSnapshot);
  return () => subscribers.delete(handler);
};

const normalizePrices = (prices) => {
  const points = [];
  const candles = [];

  let firstPrice = null;
  let lastPrice = null;
  let highPrice = -Infinity;

  prices.forEach(([time, value], index) => {
    const timestamp = Number(time);
    const price = Number(value);
    if (!Number.isFinite(timestamp) || !Number.isFinite(price)) return;

    points.push({ x: timestamp, y: price });

    const open = index === 0 ? price : points[index - 1]?.y ?? price;
    const close = price;
    const high = Math.max(open, close);
    const low = Math.min(open, close);

    candles.push({ x: timestamp, o: open, h: high, l: low, c: close });

    if (firstPrice === null) firstPrice = price;
    lastPrice = price;
    highPrice = Math.max(highPrice, high);
  });

  if (!points.length || firstPrice === null || lastPrice === null) {
    throw new Error('No price data available');
  }

  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  const updatedAt = points.at(-1)?.x ?? Date.now();

  return { points, candles, changePercent, currentPrice: lastPrice, updatedAt, high: highPrice };
};

const fetchHistory = async (range) => {
  const url = `${PUBLIC_API_URL}?vs_currency=usd&days=${range}`;

  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`BTC request failed: ${response.status}`);
  }
  const json = await response.json();
  const prices = json?.prices;
  if (!json || !Array.isArray(prices)) throw new Error('BTC response missing prices');
  return prices;
};

const fetchHistoricalPayload = async (range) => {
  const normalized = sanitizeRange(range);
  const cached = historyCache.get(normalized);
  const now = Date.now();
  if (cached?.payload && now - cached.fetchedAt < REFRESH_INTERVAL_MS) return cached.payload;
  if (cached?.fetchedAt && now - cached.fetchedAt >= REFRESH_INTERVAL_MS) historyCache.delete(normalized);
  if (historyInFlight.has(normalized)) return historyInFlight.get(normalized);

  const request = fetchHistory(normalized)
    .then((prices) => {
      const payload = normalizePrices(prices);
      historyCache.set(normalized, { payload, fetchedAt: Date.now() });
      return payload;
    })
    .finally(() => historyInFlight.delete(normalized));

  historyInFlight.set(normalized, request);
  return request;
};

const fetchLivePrice = async () => {
  if (livePriceInFlight) return livePriceInFlight;

  livePriceInFlight = fetch(LIVE_PRICE_URL, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`BTC live request failed: ${response.status}`);
      const json = await response.json();
      const price = json?.bitcoin?.usd;
      const change24h = json?.bitcoin?.usd_24h_change;
      if (!Number.isFinite(price)) throw new Error('BTC live response missing price');
      return { price, change24h, updatedAt: Date.now() };
    })
    .finally(() => {
      livePriceInFlight = null;
    });

  return livePriceInFlight;
};

const applyLivePriceToPayload = (payload, live) => {
  if (!payload || !live) return payload;
  const livePrice = Number.isFinite(live.price)
    ? live.price
    : Number.isFinite(live.currentPrice)
      ? live.currentPrice
      : null;
  if (!Number.isFinite(livePrice)) return payload;
  const updatedAt = live.updatedAt ?? Date.now();
  const lastPoint = payload.points.at(-1);
  if (lastPoint) {
    lastPoint.x = updatedAt;
    lastPoint.y = livePrice;
  }
  const lastCandle = payload.candles.at(-1);
  if (lastCandle) {
    lastCandle.x = updatedAt;
    lastCandle.c = livePrice;
    lastCandle.h = Math.max(lastCandle.o, livePrice);
    lastCandle.l = Math.min(lastCandle.o, livePrice);
  }
  payload.currentPrice = livePrice;
  payload.updatedAt = updatedAt;
  const firstPrice = payload.points[0]?.y;
  if (Number.isFinite(firstPrice)) {
    payload.changePercent = ((livePrice - firstPrice) / firstPrice) * 100;
  }
  payload.high = Math.max(payload.high ?? -Infinity, livePrice);
  return payload;
};

const buildSnapshot = (payload, range, change24h = null, source = null) => ({
  price: payload.currentPrice,
  rangeChange: payload.changePercent,
  change24h: Number.isFinite(change24h) ? change24h : payload.changePercent,
  updatedAt: payload.updatedAt,
  high: payload.high,
  range,
  source: source || payload.source,
});

const createChartConfig = (payload, range, type = 'line') => {
  const unit = RANGE_UNITS[range] || 'day';
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    normalized: true,
    scales: {
      x: {
        type: 'time',
        time: { unit },
        ticks: { maxTicksLimit: 6, color: '#64748b' },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
      y: {
        ticks: {
          callback: (v) => `$${v.toLocaleString()}`,
          color: '#64748b',
        },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const value = context.raw?.c ?? context.parsed?.y;
            return typeof value === 'number' ? `BTC: ${formatCurrency(value)}` : 'BTC';
          },
        },
      },
    },
    elements: {
      line: { borderJoinStyle: 'round', borderCapStyle: 'round' },
      point: { radius: 0, hoverRadius: 4 },
    },
  };

  return type === 'candlestick'
    ? {
        type: 'candlestick',
        data: {
          datasets: [
            {
              data: payload.candles,
              color: { up: '#3b82f6', down: '#1d4ed8', unchanged: '#3b82f6' },
              borderColor: '#93c5fd',
            },
          ],
        },
        options,
      }
    : {
        type: 'line',
        data: {
          datasets: [
            {
              data: payload.points,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59,130,246,0.12)',
              fill: true,
              tension: 0.35,
              pointRadius: 0,
            },
          ],
        },
        options,
      };
};

const chartInstances = new Map();

const cleanupInstance = (id) => {
  const existing = chartInstances.get(id);
  if (!existing) return;
  existing.unsubscribe?.();
  if (existing.chart) existing.chart.destroy();
  if (existing.observer) existing.observer.disconnect();
  if (existing.timer) clearInterval(existing.timer);
  if (existing.retryTimer) clearTimeout(existing.retryTimer);
  chartInstances.delete(id);
};

const applyPriceCopy = (scope, snapshot) => {
  const getNode = (selector) => scope.querySelector(selector) || document.querySelector(selector);

  const priceEl = getNode('[data-btc-price], #btcLivePrice');
  const changeEl = getNode('[data-btc-change], #btcChange');
  const updatedEl = getNode('[data-btc-updated]');
  const highEl = getNode('#price-map-ath');
  const summaryPrice = getNode('#price-map-current');
  const summaryChange = getNode('#price-map-change');
  const statusEl = getNode('[data-btc-status]');

  if (priceEl) priceEl.textContent = formatCurrency(snapshot.price);
  if (summaryPrice) summaryPrice.textContent = formatCurrency(snapshot.price);

  const applyChange = (element) => {
    if (!element) return;
    const value = Number.isFinite(snapshot.change24h) ? snapshot.change24h : snapshot.rangeChange;
    element.textContent = Number.isFinite(value) ? `${formatPercent(value)} 24h` : 'Unavailable';
    element.classList.toggle('positive', Number.isFinite(value) && value >= 0);
    element.classList.toggle('negative', Number.isFinite(value) && value < 0);
  };

  applyChange(changeEl);
  applyChange(summaryChange);

  if (highEl && Number.isFinite(snapshot.high)) highEl.textContent = formatCurrency(snapshot.high);

  if (updatedEl && snapshot.updatedAt) {
    updatedEl.textContent = `Updated ${new Date(snapshot.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  if (statusEl) {
    statusEl.textContent = snapshot.source || 'Live price';
    statusEl.hidden = false;
    statusEl.classList.remove('is-error');
  }
};

const setActiveButtons = (buttons, value, key) => {
  buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset[key] === value));
};

export const startBTCTicker = (onStatus) => {
  if (tickerInterval || socket) {
    return () => {
      if (tickerInterval) {
        clearInterval(tickerInterval);
        tickerInterval = null;
      }
      if (socket) {
        socket.off('btc_price');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.disconnect();
        socket = null;
      }
    };
  }

  const reportStatus = (message, isError = false) => {
    if (typeof onStatus === 'function') {
      onStatus(message, isError);
    }
  };

  const safeRefresh = () =>
    fetchLivePrice()
      .then((live) => {
        const payload = {
          currentPrice: live.price,
          changePercent: Number.isFinite(live.change24h) ? live.change24h : 0,
          updatedAt: live.updatedAt,
          high: live.price,
          source: 'Fallback price (CoinGecko)',
        };
        notifySubscribers(buildSnapshot(payload, '1', live.change24h, payload.source));
        reportStatus('Live price (fallback)');
      })
      .catch((error) => {
        console.warn('BTC ticker error', error);
        reportStatus('Unable to reach price feed', true);
      });

  const startFallbackPolling = () => {
    if (tickerInterval) return;
    safeRefresh();
    tickerInterval = setInterval(safeRefresh, REFRESH_INTERVAL_MS);
  };

  const handleLiveUpdate = (price, updatedAt) => {
    const snapshot = {
      price,
      change24h: latestSnapshot?.change24h ?? null,
      rangeChange: latestSnapshot?.rangeChange ?? latestSnapshot?.change24h ?? null,
      updatedAt: updatedAt || Date.now(),
      high: Math.max(latestSnapshot?.high ?? -Infinity, price),
      source: 'Live price (Socket.IO)',
    };
    notifySubscribers(snapshot);
  };

  const scheduleReconnect = () => {
    socketAttempts += 1;
    if (socketAttempts >= SOCKET_RETRY_LIMIT) {
      startFallbackPolling();
      reportStatus('Using fallback price feed', true);
      if (socket) {
        socket.off('btc_price');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.disconnect();
        socket = null;
      }
      return;
    }
    const delay = Math.min(30000, SOCKET_RETRY_BASE * 2 ** (socketAttempts - 1));
    setTimeout(() => {
      try {
        socket?.connect();
      } catch (error) {
        startFallbackPolling();
      }
    }, delay);
  };

  const setupSocket = async () => {
    try {
      await ensureSocketIO();
    } catch (error) {
      startFallbackPolling();
      reportStatus('Using fallback price feed', true);
      return;
    }

    try {
      socket = window.io();
    } catch (error) {
      startFallbackPolling();
      reportStatus('Using fallback price feed', true);
      return;
    }

    socketAttempts = 0;

    socket.on('connect', () => {
      socketAttempts = 0;
      reportStatus('Live price (Socket.IO)');
      if (tickerInterval) {
        clearInterval(tickerInterval);
        tickerInterval = null;
      }
    });

    socket.on('btc_price', (payload) => {
      const price = Number(payload?.price);
      if (!Number.isFinite(price)) return;

      const tsRaw = payload?.ts;
      const parsedTs = Number.isFinite(tsRaw)
        ? tsRaw
        : typeof tsRaw === 'string'
          ? Date.parse(tsRaw) || Date.now()
          : Date.now();

      handleLiveUpdate(price, parsedTs);
    });

    socket.on('connect_error', () => {
      reportStatus('Reconnecting to price feed…', true);
      scheduleReconnect();
    });
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') return;
      reportStatus('Reconnecting to price feed…', true);
      scheduleReconnect();
    });
  };

  reportStatus('Connecting to price feed…');
  setupSocket();
  safeRefresh();

  return () => {
    if (socket) {
      socket.off('btc_price');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.disconnect();
      socket = null;
    }
    if (tickerInterval) {
      clearInterval(tickerInterval);
      tickerInterval = null;
    }
  };
};

export const initBTCChart = async (containerId, variant = 'hero') => {
  if (chartInstances.has(containerId)) {
    return chartInstances.get(containerId);
  }

  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }

  const canvas = document.getElementById(containerId);
  if (!canvas) return null;

  const normalizedVariant = variant === 'tool' ? 'tool' : 'hero';
  const wrapper = canvas.parentElement;
  if (wrapper?.classList.contains('btc-chart-wrapper') && !wrapper.classList.contains(normalizedVariant)) {
    wrapper.classList.add(normalizedVariant);
  }

  const scope = canvas.closest('[data-btc-chart]') || document;
  const statusEl = scope.querySelector('[data-btc-status]');
  const buttons = Array.from(scope.querySelectorAll('[data-range]'));
  const toggleBtn = scope.querySelector('[data-chart-toggle], #toggleType');

  await ensureChartReady();
  if (!ChartJS) {
    throw new Error('Chart.js failed to load');
  }
  let chart = null;
  let activeRange = DEFAULT_RANGE;
  let chartType = 'line';
  let retryTimer = null;
  let isRendering = false;
  const instanceRecord = { chart: null, observer: null, timer: null, retryTimer: null, unsubscribe: null };

  const updateStatus = (message, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.hidden = !message;
    statusEl.classList.toggle('is-error', Boolean(isError));
  };

  const updateChart = (payload, range, type) => {
    if (!chart) {
      const config = createChartConfig(payload, range, type);
      chart = new ChartJS(canvas, config);
      instanceRecord.chart = chart;
      return;
    }

    chart.config.type = type;
    chart.data.datasets = [
      type === 'candlestick'
        ? {
            data: payload.candles,
            color: { up: '#3b82f6', down: '#1d4ed8', unchanged: '#3b82f6' },
            borderColor: '#93c5fd',
          }
        : {
            data: payload.points,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
          },
    ];
    chart.options.scales.x.time.unit = RANGE_UNITS[range] || 'day';
    chart.update('none');
  };

  const render = async (range = activeRange) => {
    const normalizedRange = sanitizeRange(range);
    activeRange = normalizedRange;
    setActiveButtons(buttons, normalizedRange, 'range');
    updateStatus('Loading BTC data…');

    try {
      const payload = await fetchHistoricalPayload(normalizedRange);
      applyLivePriceToPayload(payload, latestSnapshot);
      updateChart(payload, normalizedRange, chartType);
      const snapshot = buildSnapshot(payload, normalizedRange, latestSnapshot?.change24h);
      applyPriceCopy(scope, snapshot);
      updateStatus('');
    } catch (error) {
      console.error(error);
      updateStatus('Unable to load BTC price data', true);
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          refreshData(activeRange);
        }, RETRY_DELAY_MS);
        instanceRecord.retryTimer = retryTimer;
      }
    }
  };

  const refreshData = async (range = activeRange) => {
    if (isRendering) return;
    isRendering = true;
    try {
      await render(range);
    } finally {
      isRendering = false;
    }
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.range === activeRange) return;
      refreshData(btn.dataset.range);
    });
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      chartType = chartType === 'line' ? 'candlestick' : 'line';
      toggleBtn.textContent = chartType === 'line' ? 'Candles' : 'Line';
      toggleBtn.setAttribute('aria-pressed', chartType === 'candlestick');
      refreshData(activeRange);
    });
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      chart?.resize(entry.contentRect.width, entry.contentRect.height);
    }
  });

  observer.observe(canvas.parentElement || canvas);

  const unsubscribe = subscribeToBTCTicker((snapshot) => {
    if (!snapshot || !Number.isFinite(snapshot.price)) return;
    const cached = historyCache.get(activeRange);
    const payload = cached?.payload;
    if (payload) {
      applyLivePriceToPayload(payload, snapshot);
      snapshot.rangeChange = payload.changePercent;
      snapshot.high = payload.high;
      snapshot.updatedAt = snapshot.updatedAt || payload.updatedAt;
      updateChart(payload, activeRange, chartType);
    }
    applyPriceCopy(scope, snapshot);
  });

  await refreshData(activeRange);

  instanceRecord.timer = setInterval(() => refreshData(activeRange), REFRESH_INTERVAL_MS);

  instanceRecord.observer = observer;
  instanceRecord.unsubscribe = unsubscribe;

  instanceRecord.refresh = () => render(activeRange);
  instanceRecord.destroy = () => cleanupInstance(containerId);

  chartInstances.set(containerId, instanceRecord);

  return instanceRecord;
};
