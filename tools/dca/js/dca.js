const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-links');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const priceEl = document.getElementById('livePrice');
const timestampEl = document.getElementById('priceTimestamp');
const usdInput = document.getElementById('dcaUsd');
const frequencyInput = document.getElementById('dcaFrequency');
const outlookInput = document.getElementById('outlook');
const goalInput = document.getElementById('goalBtc');
const priceInput = document.getElementById('startPrice');
const headerPrice = document.getElementById('btcPrice');
const btcHeldEl = document.getElementById('btcHeld');
const totalInvestedEl = document.getElementById('totalInvested');
const avgCostEl = document.getElementById('avgCost');
const goalStatusEl = document.getElementById('goalStatus');
const scenarioRangeEl = document.getElementById('scenarioRange');
const priceLegendEl = document.getElementById('priceLegend');
const chartCanvas = document.getElementById('dcaChart');

const outlooks = {
  bearish: { label: 'Bearish', rate: 0.1 },
  moderate: { label: 'Moderate', rate: 0.3 },
  bullish: { label: 'Bullish', rate: 0.45 },
};

const projectionYears = 5;

const CACHE_KEY = 'adaptbtc_price_cache_v1';
const FALLBACK_PRICE = 69000;

let livePrice;
let chartInstance;

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBtc(value) {
  if (!Number.isFinite(value)) return '0 BTC';
  return `${value.toFixed(6)} BTC`;
}

function persistPrice(value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ value, time: Date.now() }));
  } catch (error) {
    // ignore storage errors
  }
}

function readCachedPrice() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.value)) {
      return parsed.value;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function renderPrice(value, statusText) {
  if (!Number.isFinite(value)) return;
  livePrice = value;

  const formatted = formatCurrency(value);
  priceEl.textContent = formatted;
  headerPrice && (headerPrice.textContent = formatted);

  if (!priceInput.value) {
    priceInput.placeholder = formatted;
  }

  if (timestampEl && statusText) {
    timestampEl.textContent = statusText;
  }

  runCalculation();
}

async function fetchLivePrice() {
  const cached = readCachedPrice();
  if (Number.isFinite(cached)) {
    renderPrice(cached, 'Using cached price while we fetch the latest…');
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { cache: 'no-store' }
    );
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    const value = Number(data?.bitcoin?.usd);
    if (!Number.isFinite(value)) throw new Error('Invalid');

    persistPrice(value);
    renderPrice(
      value,
      `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
  } catch (error) {
    const fallbackValue = Number.isFinite(cached) ? cached : FALLBACK_PRICE;
    renderPrice(fallbackValue, 'Using stored price — live feed unavailable.');
  }
}

function buildProjection(rate, params) {
  const { dcaUsd, periodsPerYear, years, startPrice, goalBtc } = params;
  const totalPeriods = Math.max(1, Math.round(years * periodsPerYear));

  let btcBalance = 0;
  let goalYears = null;
  const balances = [];
  const prices = [];
  const labels = [];

  for (let period = 1; period <= totalPeriods; period++) {
    const year = period / periodsPerYear;
    const btcPrice = startPrice * Math.pow(1 + rate, year);
    const btcPurchased = dcaUsd / btcPrice; // exact formula
    btcBalance += btcPurchased; // accumulation

    if (goalYears === null && goalBtc > 0 && btcBalance >= goalBtc) {
      goalYears = period / periodsPerYear; // first time goal reached
    }

    balances.push(btcBalance);
    prices.push(btcPrice);
    labels.push(year.toFixed(2));
  }

  return {
    balances,
    prices,
    labels,
    btcBalance,
    goalYears,
  };
}

function chartGridColors() {
  return {
    primary: 'rgba(15,23,42,0.08)',
    light: 'rgba(15,23,42,0.05)',
  };
}

function updateChart(labels, holdings, projectedPrices, label) {
  if (!chartCanvas) return;
  const grid = chartGridColors();
  const textColor = '#0f172a';
  const data = {
    labels,
    datasets: [
      {
        label: 'BTC balance',
        data: holdings,
        borderColor: '#0bbf63',
        backgroundColor: 'rgba(11, 191, 99, 0.12)',
        yAxisID: 'y',
        borderWidth: 3,
        tension: 0.25,
      },
      {
        label: `${label} price`,
        data: projectedPrices,
        borderColor: '#0c63ff',
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1',
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'BTC balance', color: textColor },
        ticks: { color: textColor },
        grid: { color: grid.primary },
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'BTC price (USD)', color: textColor },
        grid: { display: false },
        ticks: {
          color: textColor,
          callback: (val) => `$${Number(val).toLocaleString()}`,
        },
      },
      x: {
        title: { display: true, text: 'Years', color: textColor },
        ticks: { color: textColor },
        grid: { color: grid.light },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            if (ctx.dataset.yAxisID === 'y') {
              return `${ctx.dataset.label}: ${value.toFixed(6)} BTC`;
            }
            return `${ctx.dataset.label}: $${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.data = data;
    chartInstance.options = options;
    chartInstance.update();
  } else {
    chartInstance = new Chart(chartCanvas.getContext('2d'), { type: 'line', data, options });
  }
}

function runCalculation() {
  const dcaUsd = parseFloat(usdInput.value || '0');
  const periodsPerYear = parseFloat(frequencyInput.value || '0');
  const goalBtc = parseFloat(goalInput.value || '0');
  const startPrice = parseFloat(priceInput.value || '') || livePrice || FALLBACK_PRICE;
  const outlookKey = outlookInput?.value || 'moderate';
  const outlook = outlooks[outlookKey] || outlooks.moderate;

  if (!Number.isFinite(dcaUsd) || dcaUsd <= 0 || !Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    return;
  }

  if (!Number.isFinite(startPrice) || startPrice <= 0) {
    goalStatusEl.textContent = 'Enter a valid BTC price or wait for live data.';
    return;
  }

  const params = { dcaUsd, periodsPerYear, years: projectionYears, startPrice, goalBtc };

  const projection = buildProjection(outlook.rate, params);

  const labels = projection.labels;
  const totalContributions = dcaUsd * Math.max(1, Math.round(projectionYears * periodsPerYear));
  const avgCost = totalContributions / projection.btcBalance;

  btcHeldEl.textContent = formatBtc(projection.btcBalance);
  totalInvestedEl.textContent = formatCurrency(totalContributions);
  avgCostEl.textContent = Number.isFinite(avgCost) ? formatCurrency(avgCost) : '$0';

  if (projection.goalYears !== null) {
    goalStatusEl.textContent = `Goal reached in ${projection.goalYears.toFixed(2)} years (${outlook.label.toLowerCase()})`;
  } else {
    goalStatusEl.textContent = goalBtc > 0 ? 'Goal not reached in this window.' : 'No BTC goal set.';
  }

  scenarioRangeEl.textContent = `${outlook.label} outlook · ${(outlook.rate * 100).toFixed(0)}% CAGR assumption over ${projectionYears} years.`;
  if (priceLegendEl) {
    priceLegendEl.textContent = `${outlook.label} price`;
  }

  updateChart(labels, projection.balances, projection.prices, outlook.label);
}

[usdInput, frequencyInput, outlookInput, goalInput, priceInput].forEach((el) => {
  el?.addEventListener('input', runCalculation);
  el?.addEventListener('change', runCalculation);
});
fetchLivePrice();
setInterval(fetchLivePrice, 30000);
runCalculation();
