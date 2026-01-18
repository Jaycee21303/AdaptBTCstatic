import Chart from 'chart.js/auto';
import { fetchJson } from '../lib/api.js';
import { getCache, setCache } from '../lib/cache.js';
import { PRICE_CACHE_KEY } from '../features/ticker.js';

const PRICE_TTL_MS = 60_000;
const FALLBACK_PRICE = 69_000;

const outlooks = {
  bearish: { label: 'Bearish', rate: 0.1 },
  moderate: { label: 'Moderate', rate: 0.3 },
  bullish: { label: 'Bullish', rate: 0.45 },
};

const projectionYears = 5;

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '$0';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatBtc = (value) => {
  if (!Number.isFinite(value)) return '0 BTC';
  return `${value.toFixed(6)} BTC`;
};

const getCachedPrice = () => {
  const cached = getCache(PRICE_CACHE_KEY);
  if (!cached?.value) return null;
  if (typeof cached.value === 'number') return cached.value;
  return Number(cached.value.value) || null;
};

const persistPrice = (value) => {
  setCache(PRICE_CACHE_KEY, { value }, PRICE_TTL_MS);
};

const fetchLivePrice = async () => {
  const { data } = await fetchJson(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    { timeoutMs: 7000, retries: 1, backoff: 500 }
  );
  const value = Number(data?.bitcoin?.usd);
  if (!Number.isFinite(value)) throw new Error('Invalid live price');
  return value;
};

const buildProjection = (rate, params) => {
  const { dcaUsd, periodsPerYear, years, startPrice, goalBtc } = params;
  const totalPeriods = Math.max(1, Math.round(years * periodsPerYear));

  let btcBalance = 0;
  let goalYears = null;
  const balances = [];
  const prices = [];
  const labels = [];

  for (let period = 1; period <= totalPeriods; period += 1) {
    const year = period / periodsPerYear;
    const btcPrice = startPrice * Math.pow(1 + rate, year);
    const btcPurchased = dcaUsd / btcPrice;
    btcBalance += btcPurchased;

    if (goalYears === null && goalBtc > 0 && btcBalance >= goalBtc) {
      goalYears = period / periodsPerYear;
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
};

const chartGridColors = () => ({
  primary: 'rgba(15,23,42,0.08)',
  light: 'rgba(15,23,42,0.05)',
});

const createBalanceGradient = (ctx, chartArea) => {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, 'rgba(11, 191, 99, 0.35)');
  gradient.addColorStop(1, 'rgba(11, 191, 99, 0.02)');
  return gradient;
};

export const initDcaCalculator = () => {
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

  if (!priceEl || !chartCanvas) return;

  let livePrice;
  let chartInstance;

  const renderPrice = (value, statusText) => {
    if (!Number.isFinite(value)) return;
    livePrice = value;

    const formatted = formatCurrency(value);
    priceEl.textContent = formatted;
    if (headerPrice) headerPrice.textContent = formatted;

    if (!priceInput.value) {
      priceInput.placeholder = formatted;
    }

    if (timestampEl && statusText) {
      timestampEl.textContent = statusText;
    }

    runCalculation();
  };

  const updateChart = (labels, holdings, projectedPrices, label) => {
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d');
    if (!ctx) return;
    const grid = chartGridColors();
    const textColor = '#0f172a';
    const chartArea = chartInstance?.chartArea;
    const balanceFill = chartArea ? createBalanceGradient(ctx, chartArea) : 'rgba(11, 191, 99, 0.12)';

    const data = {
      labels,
      datasets: [
        {
          label: 'BTC balance',
          data: holdings,
          borderColor: '#0bbf63',
          backgroundColor: balanceFill,
          yAxisID: 'y',
          borderWidth: 4,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
          fill: true,
          cubicInterpolationMode: 'monotone',
          tension: 0.35,
        },
        {
          label: `${label} price`,
          data: projectedPrices,
          borderColor: '#0c63ff',
          borderDash: [8, 6],
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y1',
          cubicInterpolationMode: 'monotone',
          tension: 0.35,
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
            label: (context) => `${context.dataset.label}: ${context.formattedValue}`,
          },
        },
      },
    };

    if (chartInstance) {
      chartInstance.data = data;
      chartInstance.options = options;
      chartInstance.update();
    } else {
      chartInstance = new Chart(ctx, { type: 'line', data, options });
    }
  };

  const runCalculation = () => {
    const dcaUsd = Number.parseFloat(usdInput?.value || '');
    const periodsPerYear = Number.parseFloat(frequencyInput?.value || '');
    const outlook = outlookInput?.value || 'moderate';
    const goalBtc = Number.parseFloat(goalInput?.value || '0');
    const priceOverride = Number.parseFloat(priceInput?.value || '');
    const startPrice = Number.isFinite(priceOverride) && priceOverride > 0 ? priceOverride : livePrice;

    if (!Number.isFinite(dcaUsd) || dcaUsd <= 0 || !Number.isFinite(periodsPerYear) || !Number.isFinite(startPrice)) {
      return;
    }

    const outlookConfig = outlooks[outlook] || outlooks.moderate;
    const projection = buildProjection(outlookConfig.rate, {
      dcaUsd,
      periodsPerYear,
      years: projectionYears,
      startPrice,
      goalBtc,
    });

    if (btcHeldEl) btcHeldEl.textContent = formatBtc(projection.btcBalance);

    const totalInvested = dcaUsd * periodsPerYear * projectionYears;
    if (totalInvestedEl) totalInvestedEl.textContent = formatCurrency(totalInvested);

    const avgCost = projection.btcBalance > 0 ? totalInvested / projection.btcBalance : 0;
    if (avgCostEl) avgCostEl.textContent = formatCurrency(avgCost);

    if (goalStatusEl) {
      if (projection.goalYears !== null) {
        goalStatusEl.textContent = `Goal hit in ~${projection.goalYears.toFixed(1)} years`;
      } else {
        goalStatusEl.textContent = 'Goal not reached';
      }
    }

    if (scenarioRangeEl) {
      scenarioRangeEl.textContent = `${outlookConfig.label} outlook · ${(outlookConfig.rate * 100).toFixed(0)}% CAGR assumption over ${
        projectionYears
      } years.`;
    }

    if (priceLegendEl) {
      priceLegendEl.textContent = `${outlookConfig.label} price`;
    }

    updateChart(projection.labels, projection.balances, projection.prices, outlookConfig.label);
  };

  const bootstrap = async () => {
    const cached = getCachedPrice();
    if (Number.isFinite(cached)) {
      renderPrice(cached, 'Using cached price while we fetch the latest…');
    }

    try {
      const value = await fetchLivePrice();
      persistPrice(value);
      renderPrice(value, `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      const fallbackValue = Number.isFinite(cached) ? cached : FALLBACK_PRICE;
      renderPrice(fallbackValue, 'Delayed — using stored price.');
    }
  };

  [usdInput, frequencyInput, outlookInput, goalInput, priceInput].forEach((field) => {
    field?.addEventListener('input', runCalculation);
  });

  bootstrap();
};
