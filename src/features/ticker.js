import { fetchJson } from '../lib/api.js';
import { getCache, setCache } from '../lib/cache.js';

export const PRICE_CACHE_KEY = 'adaptbtc_price_cache_v2';
const CACHE_TTL_MS = 60_000;
const STALE_WINDOW_MS = 10 * 60_000;
const TICKER_REFRESH_MS = 60_000;

const PRICE_ENDPOINTS = [
  {
    name: 'coingecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    parse: (data) => ({
      value: Number(data?.bitcoin?.usd),
      change: Number(data?.bitcoin?.usd_24h_change),
    }),
  },
  {
    name: 'coincap',
    url: 'https://api.coincap.io/v2/assets/bitcoin',
    parse: (data) => ({
      value: Number(data?.data?.priceUsd),
      change: Number(data?.data?.changePercent24Hr),
    }),
  },
];

const formatPrice = (value) =>
  `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatChange = (value) => {
  if (!Number.isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const setTextIfChanged = (el, text) => {
  if (!el) return;
  if (el.textContent !== text) {
    el.textContent = text;
  }
};

const setStatus = (statusEl, text) => {
  if (!statusEl) return;
  if (text) {
    statusEl.hidden = false;
    setTextIfChanged(statusEl, text);
  } else {
    statusEl.hidden = true;
  }
};

const applyChangeClass = (el, change) => {
  if (!el || typeof change !== 'number') return;
  el.classList.remove('negative', 'positive');
  if (change < 0) {
    el.classList.add('negative');
  } else {
    el.classList.add('positive');
  }
};

const fetchLivePrice = async () => {
  let lastError;
  for (const endpoint of PRICE_ENDPOINTS) {
    try {
      const { data } = await fetchJson(endpoint.url, { timeoutMs: 7000, retries: 1, backoff: 400 });
      const parsed = endpoint.parse(data);
      if (!Number.isFinite(parsed.value)) throw new Error(`${endpoint.name} invalid price data`);
      return { value: parsed.value, change: Number.isFinite(parsed.change) ? parsed.change : 0 };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('All price requests failed');
};

export const initTicker = () => {
  const headerPrice = document.getElementById('btcPrice');
  const heroPrice = document.getElementById('heroPrice');
  const heroChange = document.getElementById('heroChange');
  const statusEl = document.getElementById('btcStatus');

  if (!headerPrice && !heroPrice) return;

  const render = (value, change, isDelayed) => {
    const formatted = Number.isFinite(value) ? formatPrice(value) : '$--';
    setTextIfChanged(headerPrice, formatted);
    setTextIfChanged(heroPrice, formatted);

    if (heroChange) {
      setTextIfChanged(heroChange, formatChange(change));
      applyChangeClass(heroChange, change);
    }

    setStatus(statusEl, isDelayed ? 'Delayed' : '');
  };

  const updateTicker = async () => {
    const cached = getCache(PRICE_CACHE_KEY);
    const cachedValue = cached?.value;
    const isStale = cached?.isExpired || false;

    if (cachedValue && cachedValue.value) {
      render(cachedValue.value, cachedValue.change ?? 0, isStale);
    }

    try {
      const latest = await fetchLivePrice();
      render(latest.value, latest.change, false);
      setCache(PRICE_CACHE_KEY, latest, CACHE_TTL_MS);
    } catch (error) {
      if (!cachedValue) {
        render(null, null, true);
      } else {
        const staleEnough = cached?.updatedAt ? Date.now() - cached.updatedAt > STALE_WINDOW_MS : true;
        render(cachedValue.value, cachedValue.change ?? 0, staleEnough);
      }
    }
  };

  updateTicker();
  setInterval(updateTicker, TICKER_REFRESH_MS);
};
