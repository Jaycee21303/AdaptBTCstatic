const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
});

const headerPrice = document.getElementById('btcPrice');
const heroPrice = document.getElementById('heroPrice');
const stripPrice = document.getElementById('stripPrice');
const heroChange = document.getElementById('heroChange');
const stripChange = document.getElementById('stripChange');
const priceTimestamp = document.getElementById('priceTimestamp');

const CACHE_KEY = 'adaptbtc_price_cache_v1';

function formatPrice(value) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function applyChange(el, change) {
  if (!el || typeof change !== 'number') return;

  const sign = change > 0 ? '+' : '';
  const formatted = `${sign}${change.toFixed(2)}%`;
  el.textContent = formatted;

  el.classList.remove('negative', 'positive');
  if (change < 0) {
    el.classList.add('negative');
  } else {
    el.classList.add('positive');
  }
}

function persistPrice(value, change) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value, change, time: Date.now() }));
  } catch (error) {
    // ignore storage issues
  }
}

function readCachedPrice() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.value)) {
      return parsed;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function renderPrice(value, change) {
  const priceText = Number.isFinite(value) ? formatPrice(value) : '$--';
  headerPrice && (headerPrice.textContent = priceText);
  heroPrice && (heroPrice.textContent = priceText);
  stripPrice && (stripPrice.textContent = priceText);

  if (Number.isFinite(change)) {
    applyChange(heroChange, change);
    applyChange(stripChange, change);
  }
}

async function fetchCoinGeckoPrice() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
    { cache: 'no-store' }
  );

  if (!response.ok) throw new Error('CoinGecko request failed');

  const data = await response.json();
  const value = Number(data?.bitcoin?.usd);
  const change = Number(data?.bitcoin?.usd_24h_change);

  if (!Number.isFinite(value)) throw new Error('Invalid price data');
  return { value, change: Number.isFinite(change) ? change : 0 }; 
}

async function updateTicker() {
  const cached = readCachedPrice();
  if (cached) {
    renderPrice(cached.value, cached.change);
  }

  try {
    const latest = await fetchCoinGeckoPrice();
    renderPrice(latest.value, latest.change);
    persistPrice(latest.value, latest.change);
    if (priceTimestamp) {
      priceTimestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    if (!cached) {
      renderPrice(undefined, undefined);
    }
  }
}

updateTicker();
setInterval(updateTicker, 30000);
