const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const form = document.getElementById('interestForm');
const feedback = document.getElementById('formFeedback');
const btcTicker = document.getElementById('btcTicker');
const btcTickerPrice = document.querySelector('#btcTicker .ticker-price');
const heroLivePrice = document.getElementById('heroLivePrice');
const priceTimestamp = document.getElementById('priceTimestamp');
const tickerStatus = document.getElementById('tickerStatus');
const learningNotice = document.getElementById('learningNotice');
const learningLinks = document.querySelectorAll('a[href="#learning"]');
const dcaForm = document.getElementById('dcaForm');
const dcaPriceInput = document.getElementById('dcaPrice');
const dcaResults = document.getElementById('dcaResults');
const btcChartCanvas = document.getElementById('btcChart');
const chartUpdated = document.getElementById('chartUpdated');

let currentBtcPrice = null;
let chartPoints = [];
let heroPriceDisplay = '$--';
const cachedPriceKey = 'btcLastPrice';

navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = formData.get('email');

  feedback.textContent = email ? `Thanks, ${email}! We'll reach out soon.` : 'Thanks for reaching out!';
  feedback.style.color = 'var(--primary)';
  form.reset();
});

function fetchWithTimeout(url, options = {}, timeout = 7000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout)),
  ]);
}

async function fetchCoincapPrice() {
  const response = await fetchWithTimeout('https://api.coincap.io/v2/assets/bitcoin', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Coincap request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.priceUsd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coincap returned no price');
}

async function fetchCoinbasePrice() {
  const response = await fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Coinbase request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.amount ?? data?.data?.priceUsd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coinbase returned no price');
}

async function fetchBinancePrice() {
  const response = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Binance request failed');

  const data = await response.json();
  const amount = parseFloat(data?.price);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Binance returned no price');
}

async function fetchBitfinexPrice() {
  const response = await fetchWithTimeout('https://api-pub.bitfinex.com/v2/ticker/tBTCUSD', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Bitfinex request failed');

  const data = await response.json();
  const amount = Array.isArray(data) ? parseFloat(data[6]) : NaN;
  if (Number.isFinite(amount)) return amount;

  throw new Error('Bitfinex returned no price');
}

async function fetchCoindeskPrice() {
  const response = await fetchWithTimeout('https://api.coindesk.com/v1/bpi/currentprice/BTC.json', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!response.ok) throw new Error('Coindesk request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bpi?.USD?.rate_float);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coindesk returned no price');
}

async function fetchCoingeckoPrice() {
  const response = await fetchWithTimeout(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      mode: 'cors',
    }
  );
  if (!response.ok) throw new Error('Coingecko request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bitcoin?.usd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coingecko returned no price');
}

function renderTicker(priceText) {
  if (btcTickerPrice) {
    btcTickerPrice.textContent = priceText;
  }

  if (heroLivePrice) {
    heroLivePrice.textContent = priceText;
  }
}

function readCachedTicker() {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(cachedPriceKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.value)) {
      return { value: Number(parsed.value), time: parsed?.time ? new Date(parsed.time) : null };
    }
  } catch (error) {
    // ignore cache errors
  }

  return null;
}

function persistTicker(value) {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(
      cachedPriceKey,
      JSON.stringify({ value, time: new Date().toISOString() })
    );
  } catch (error) {
    // ignore storage failures
  }
}

async function updateTicker() {
  if (!btcTicker) return;

  const cached = readCachedTicker();
  if (!Number.isFinite(currentBtcPrice) && cached?.value) {
    const formatted = `$${Number(cached.value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
    heroPriceDisplay = formatted;
    renderTicker(formatted);

    if (priceTimestamp && cached.time) {
      priceTimestamp.textContent = `Cached • ${cached.time.toLocaleString()}`;
    }

    if (tickerStatus) {
      tickerStatus.textContent = 'Using saved price while syncing';
    }
  }

  try {
    tickerStatus && (tickerStatus.textContent = 'Syncing live data');

    const sources = [
      { fetcher: fetchBinancePrice, label: 'Binance' },
      { fetcher: fetchCoinbasePrice, label: 'Coinbase' },
      { fetcher: fetchCoincapPrice, label: 'Coincap' },
      { fetcher: fetchCoingeckoPrice, label: 'Coingecko' },
      { fetcher: fetchBitfinexPrice, label: 'Bitfinex' },
      { fetcher: fetchCoindeskPrice, label: 'Coindesk' },
    ];

    let resolvedPrice = null;

    for (const source of sources) {
      try {
        const value = await source.fetcher();
        resolvedPrice = { value, source: source.label };
        break;
      } catch (error) {
        // Try the next source silently
      }
    }

    if (resolvedPrice && Number.isFinite(resolvedPrice.value)) {
      currentBtcPrice = resolvedPrice.value;
      const formatted = `$${Number(resolvedPrice.value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
      heroPriceDisplay = formatted;
      renderTicker(formatted);
      persistTicker(resolvedPrice.value);

      if (priceTimestamp) {
        priceTimestamp.textContent = new Date().toLocaleString();
      }

      if (tickerStatus) {
        tickerStatus.textContent = `Live via ${resolvedPrice.source}`;
      }

      if (dcaPriceInput) {
        dcaPriceInput.value = resolvedPrice.value.toFixed(2);
      }

      return;
    }

    throw new Error('Invalid price');
  } catch (error) {
    if (Number.isFinite(currentBtcPrice)) {
      const fallback = `$${Number(currentBtcPrice).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
      renderTicker(fallback);

      if (tickerStatus) {
        tickerStatus.textContent = 'Showing cached price';
      }
      return;
    }

    if (cached?.value) {
      const fallback = `$${Number(cached.value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
      renderTicker(fallback);

      if (tickerStatus) {
        tickerStatus.textContent = 'Using saved price';
      }

      if (priceTimestamp && cached.time) {
        priceTimestamp.textContent = `Cached • ${cached.time.toLocaleString()}`;
      }
      return;
    }

    renderTicker('$--');

    if (priceTimestamp) {
      priceTimestamp.textContent = 'Ticker unavailable';
    }

    if (tickerStatus) {
      tickerStatus.textContent = 'Unable to load live data';
    }
  }
}

updateTicker();
setInterval(updateTicker, 30000);

async function fetchCoincapHistory() {
  const end = Date.now();
  const start = end - 1000 * 60 * 60 * 24 * 30;
  const response = await fetchWithTimeout(
    `https://api.coincap.io/v2/assets/bitcoin/history?interval=h1&start=${start}&end=${end}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Coincap history failed');

  const data = await response.json();
  const prices = Array.isArray(data?.data) ? data.data : [];

  return prices
    .map((point) => ({ time: Number(point?.time), price: Number(point?.priceUsd) }))
    .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.time));
}

async function fetchCoinbaseHistory() {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
  const response = await fetchWithTimeout(
    `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600&start=${start.toISOString()}&end=${end.toISOString()}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Coinbase history failed');

  const data = await response.json();
  return (Array.isArray(data) ? data : [])
    .map((point) => ({ time: Number(point?.[0]) * 1000, price: Number(point?.[4]) }))
    .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

async function fetchBinanceHistory() {
  const end = Date.now();
  const start = end - 1000 * 60 * 60 * 24 * 30;
  const response = await fetchWithTimeout(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&startTime=${start}&endTime=${end}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Binance history failed');

  const data = await response.json();
  return (Array.isArray(data) ? data : [])
    .map((point) => ({ time: Number(point?.[0]), price: Number(point?.[4]) }))
    .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.time));
}

async function fetchBitfinexHistory() {
  const response = await fetchWithTimeout(
    'https://api-pub.bitfinex.com/v2/candles/trade:1h:tBTCUSD/hist?limit=720',
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Bitfinex history failed');

  const data = await response.json();
  return (Array.isArray(data) ? data : [])
    .map((point) => ({ time: Number(point?.[0]), price: Number(point?.[2]) }))
    .filter((point) => Number.isFinite(point.price) && Number.isFinite(point.time))
    .reverse();
}

const fallbackHistory = Array.from({ length: 30 }, (_, index) => {
  const time = Date.now() - (29 - index) * 24 * 60 * 60 * 1000;
  const price = 30000 + Math.sin(index / 5) * 1200 + index * 60;
  return { time, price };
});

async function fetchBtcHistory() {
  try {
    return await fetchBinanceHistory();
  } catch (error) {
    try {
      return await fetchCoinbaseHistory();
    } catch (secondError) {
      try {
        return await fetchCoincapHistory();
      } catch (thirdError) {
        try {
          return await fetchBitfinexHistory();
        } catch (fourthError) {
          return fallbackHistory;
        }
      }
    }
  }
}

function drawBtcChart(data) {
  if (!btcChartCanvas || !data.length) return;

  const ctx = btcChartCanvas.getContext('2d');
  const width = btcChartCanvas.width;
  const height = btcChartCanvas.height;
  const padding = 28;

  ctx.clearRect(0, 0, width, height);

  const prices = data.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const scaleX = (width - padding * 2) / Math.max(data.length - 1, 1);
  const scaleY = (height - padding * 2) / range;

  const normalizedPoints = data.map((point, index) => {
    const x = padding + index * scaleX;
    const y = height - padding - (point.price - minPrice) * scaleY;
    return { ...point, x, y };
  });

  chartPoints = normalizedPoints;

  const gradient = ctx.createLinearGradient(0, padding, 0, height);
  gradient.addColorStop(0, 'rgba(12, 99, 255, 0.24)');
  gradient.addColorStop(1, 'rgba(12, 99, 255, 0.04)');

  ctx.beginPath();
  normalizedPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.strokeStyle = '#0c63ff';
  ctx.lineWidth = 2.25;
  ctx.stroke();

  ctx.lineTo(normalizedPoints.at(-1).x, height - padding + 6);
  ctx.lineTo(normalizedPoints[0].x, height - padding + 6);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
}

function handleChartHover(event) {
  if (!btcChartCanvas || !chartPoints.length) return;

  const rect = btcChartCanvas.getBoundingClientRect();
  const cursorX = event.clientX - rect.left;
  const nearest = chartPoints.reduce((closest, point) => {
    const distance = Math.abs(point.x - cursorX);
    return distance < closest.distance ? { point, distance } : closest;
  }, { point: chartPoints[0], distance: Number.POSITIVE_INFINITY }).point;

  const formattedPrice = `$${nearest.price.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  if (heroLivePrice) {
    heroLivePrice.textContent = formattedPrice;
  }

  if (chartUpdated) {
    chartUpdated.textContent = `Hovered • ${new Date(nearest.time).toLocaleString()}`;
  }
}

function resetChartHover() {
  if (heroLivePrice) {
    heroLivePrice.textContent = heroPriceDisplay;
  }

  if (chartUpdated) {
    chartUpdated.textContent = 'Live • auto-refreshed';
  }
}

async function updateBtcChart() {
  if (!btcChartCanvas) return;

  try {
    const history = await fetchBtcHistory();
    const usedFallback = history === fallbackHistory;
    if (history.length) {
      drawBtcChart(history);

      const latest = history.at(-1);
      if (chartUpdated && latest) {
        chartUpdated.textContent = usedFallback
          ? 'Showing sample BTC data (live feed unavailable)'
          : `Live • updated ${new Date(latest.time).toLocaleString()}`;
      }
    }
  } catch (error) {
    if (chartUpdated) {
      chartUpdated.textContent = 'Chart unavailable right now';
    }
  }
}

if (btcChartCanvas) {
  btcChartCanvas.addEventListener('mousemove', handleChartHover);
  btcChartCanvas.addEventListener('mouseleave', resetChartHover);
  updateBtcChart();
  setInterval(updateBtcChart, 300000);
}

function showLearningNotice(event) {
  if (!learningNotice) return;

  learningNotice.classList.add('show');
  learningNotice.textContent = 'Learning Portal Coming Soon';

  setTimeout(() => learningNotice.classList.remove('show'), 2800);
}

learningLinks.forEach((link) => {
  link.addEventListener('click', showLearningNotice);
});

function formatCurrency(value) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBtc(value) {
  return `${Number(value).toFixed(6)} BTC`;
}

function handleDcaCalculation(event) {
  event.preventDefault();

  const amount = Number.parseFloat(document.getElementById('dcaAmount')?.value ?? '0');
  const frequency = Number.parseFloat(document.getElementById('dcaFrequency')?.value ?? '1');
  const months = Number.parseInt(document.getElementById('dcaMonths')?.value ?? '0', 10);
  const growth = Number.parseFloat(document.getElementById('dcaGrowth')?.value ?? '0');
  const priceFromInput = Number.parseFloat(dcaPriceInput?.value ?? '0');
  const price = Number.isFinite(priceFromInput) && priceFromInput > 0 ? priceFromInput : currentBtcPrice;

  if (!Number.isFinite(price) || price <= 0) {
    dcaResults.textContent = 'Please wait for the live BTC price or enter your own to calculate.';
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0) {
    dcaResults.textContent = 'Enter a contribution amount and duration greater than zero.';
    return;
  }

  const totalContribution = amount * frequency * months;
  const btcAccumulated = totalContribution / price;
  const projectedPrice = price * Math.pow(1 + growth / 100, months / 12);
  const projectedValue = btcAccumulated * projectedPrice;
  const cadence = frequency === 1 ? 'each month' : `${frequency.toFixed(2)} times per month`;

  dcaResults.innerHTML = `
    Investing <strong>${formatCurrency(amount)}</strong> ${cadence}
    for <strong>${months} month${months === 1 ? '' : 's'}</strong> totals <strong>${formatCurrency(totalContribution)}</strong>.<br>
    At an average BTC price of <strong>${formatCurrency(price)}</strong>, you would accumulate <strong>${formatBtc(btcAccumulated)}</strong>.<br>
    With a ${growth}% annual growth assumption, your stack could be worth <strong>${formatCurrency(projectedValue)}</strong> at the end of the period.
  `;
}

if (dcaForm && dcaResults) {
  dcaForm.addEventListener('submit', handleDcaCalculation);
}
