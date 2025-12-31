const priceEl = document.getElementById('livePrice');
const timestampEl = document.getElementById('priceTimestamp');
const usdInput = document.getElementById('dcaUsd');
const frequencyInput = document.getElementById('dcaFrequency');
const yearsInput = document.getElementById('dcaYears');
const goalInput = document.getElementById('goalBtc');
const priceInput = document.getElementById('startPrice');
const btcHeldEl = document.getElementById('btcHeld');
const totalInvestedEl = document.getElementById('totalInvested');
const avgCostEl = document.getElementById('avgCost');
const goalStatusEl = document.getElementById('goalStatus');
const scenarioRangeEl = document.getElementById('scenarioRange');
const chartCanvas = document.getElementById('dcaChart');
const themeToggle = document.getElementById('themeToggle');

const rates = {
  conservative: 0.1,
  moderate: 0.3,
  bullish: 0.6,
};

let livePrice;
let chartInstance;

function currentTheme() {
  return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
}

function setTheme(mode) {
  const enableDark = mode === 'dark';
  document.body.classList.toggle('theme-dark', enableDark);
  if (themeToggle) {
    const label = enableDark ? 'Light mode' : 'Dark mode';
    themeToggle.textContent = label;
    themeToggle.setAttribute('aria-pressed', enableDark ? 'true' : 'false');
  }
  localStorage.setItem('dca-theme', enableDark ? 'dark' : 'light');
  runCalculation();
}

function initTheme() {
  const saved = localStorage.getItem('dca-theme');
  const mode = saved || 'light';
  setTheme(mode);
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBtc(value) {
  if (!Number.isFinite(value)) return '0 BTC';
  return `${value.toFixed(6)} BTC`;
}

async function fetchLivePrice() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
    );
    if (!response.ok) throw new Error('Failed');
    const data = await response.json();
    const value = Number(data?.bitcoin?.usd);
    if (!Number.isFinite(value)) throw new Error('Invalid');
    livePrice = value;
    priceEl.textContent = formatCurrency(value);
    timestampEl.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (!priceInput.value) {
      priceInput.placeholder = formatCurrency(value);
    }
    runCalculation();
  } catch (error) {
    timestampEl.textContent = 'Unable to load live price right now.';
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
  const isDark = currentTheme() === 'dark';
  return {
    primary: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
    light: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)',
  };
}

function updateChart(labels, holdings, conservativePrices, moderatePrices, bullishPrices) {
  if (!chartCanvas) return;
  const grid = chartGridColors();
  const textColor = currentTheme() === 'dark' ? '#e7eefc' : '#0f172a';
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
        label: 'Conservative price',
        data: conservativePrices,
        borderColor: '#f28b82',
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1',
        tension: 0.25,
      },
      {
        label: 'Moderate price',
        data: moderatePrices,
        borderColor: '#0c63ff',
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        yAxisID: 'y1',
        tension: 0.25,
      },
      {
        label: 'Bullish price',
        data: bullishPrices,
        borderColor: '#8ab4ff',
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
  const years = parseFloat(yearsInput.value || '0');
  const goalBtc = parseFloat(goalInput.value || '0');
  const startPrice = parseFloat(priceInput.value || '') || livePrice;

  if (!Number.isFinite(dcaUsd) || dcaUsd <= 0 || !Number.isFinite(periodsPerYear) || periodsPerYear <= 0 || !Number.isFinite(years) || years <= 0) {
    return;
  }

  if (!Number.isFinite(startPrice) || startPrice <= 0) {
    goalStatusEl.textContent = 'Enter a valid BTC price or wait for live data.';
    return;
  }

  const params = { dcaUsd, periodsPerYear, years, startPrice, goalBtc };

  const conservative = buildProjection(rates.conservative, params);
  const moderate = buildProjection(rates.moderate, params);
  const bullish = buildProjection(rates.bullish, params);

  const labels = moderate.labels;
  const totalContributions = dcaUsd * Math.max(1, Math.round(years * periodsPerYear));
  const avgCost = totalContributions / moderate.btcBalance;

  btcHeldEl.textContent = formatBtc(moderate.btcBalance);
  totalInvestedEl.textContent = formatCurrency(totalContributions);
  avgCostEl.textContent = Number.isFinite(avgCost) ? formatCurrency(avgCost) : '$0';

  if (moderate.goalYears !== null) {
    goalStatusEl.textContent = `Goal reached in ${moderate.goalYears.toFixed(2)} years (moderate)`;
  } else {
    goalStatusEl.textContent = goalBtc > 0 ? 'Goal not reached in this window.' : 'No BTC goal set.';
  }

  scenarioRangeEl.textContent = `Conservative ${rates.conservative * 100}% · Moderate ${rates.moderate * 100}% · Bullish ${rates.bullish * 100}% CAGR`;

  updateChart(labels, moderate.balances, conservative.prices, moderate.prices, bullish.prices);
}

[usdInput, frequencyInput, yearsInput, goalInput, priceInput].forEach((el) => {
  el?.addEventListener('input', runCalculation);
  el?.addEventListener('change', runCalculation);
});

themeToggle?.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
});

initTheme();
fetchLivePrice();
runCalculation();
