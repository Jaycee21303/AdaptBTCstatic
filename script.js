const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const form = document.getElementById('interestForm');
const feedback = document.getElementById('formFeedback');
const btcTicker = document.getElementById('btcTicker');
const homeTickerEcho = document.getElementById('homeTickerEcho');
const heroLivePrice = document.getElementById('heroLivePrice');
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

async function fetchCoinbasePrice() {
  const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coinbase request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.amount);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coinbase returned no price');
}

async function fetchCoingeckoPrice() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&precision=2',
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error('Coingecko request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bitcoin?.usd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coingecko returned no price');
}

async function fetchCoindeskPrice() {
  const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice/BTC.json', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coindesk request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bpi?.USD?.rate_float ?? data?.bpi?.USD?.rate?.replace(/,/g, ''));
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coindesk returned no price');
}

function renderTicker(priceText) {
  if (!btcTicker) return;

  btcTicker.innerHTML = `<span class="ticker-label">BTC</span> <span class="ticker-price">${priceText}</span>`;

  if (homeTickerEcho) {
    homeTickerEcho.textContent = priceText;
  }

  if (heroLivePrice) {
    heroPriceDisplay = priceText;
    heroLivePrice.textContent = priceText;
  }
}

async function updateTicker() {
  if (!btcTicker) return;

  renderTicker('$updating…');

  try {
    const price = await fetchCoinbasePrice().catch(() => fetchCoingeckoPrice().catch(fetchCoindeskPrice));

    if (Number.isFinite(price)) {
      currentBtcPrice = price;
      const formatted = `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      renderTicker(formatted);

      if (dcaPriceInput) {
        dcaPriceInput.value = price.toFixed(2);
      }

      return;
    }

    throw new Error('Invalid price');
  } catch (error) {
    renderTicker('$--');
  }
}

updateTicker();
setInterval(updateTicker, 30000);

async function fetchBtcHistory() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&precision=2',
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) throw new Error('Coingecko history failed');

  const data = await response.json();
  const prices = Array.isArray(data?.prices) ? data.prices : [];

  return prices
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([time, price]) => ({ time, price: Number(price) }))
    .filter((point) => Number.isFinite(point.price));
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
    if (history.length) {
      drawBtcChart(history);

      const latest = history.at(-1);
      if (chartUpdated && latest) {
        chartUpdated.textContent = `Live • updated ${new Date(latest.time).toLocaleString()}`;
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
