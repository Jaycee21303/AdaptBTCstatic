(function () {
  const growthModes = {
    reserved: 0.15,
    moderate: 0.3,
    bullish: 0.5,
  };

  const contributionsPerYear = {
    daily: 365,
    weekly: 52,
    monthly: 12,
  };

  const colorPalette = {
    reserved: 'rgba(244, 152, 72, 0.9)',
    moderate: 'rgba(37, 99, 235, 0.9)',
    bullish: 'rgba(16, 185, 129, 0.9)',
    accumulation: '#0f172a',
  };

  // Starting BTC spot price in USD for projections. Will update from live ticker.
  let startingPrice = 30000;
  let latestPricePaths = {
    reserved: [],
    moderate: [],
    bullish: [],
  };

  const currentBtcInput = document.getElementById('current-btc');
  const goalBtcInput = document.getElementById('goal-btc');
  const dcaAmountInput = document.getElementById('dca-amount');
  const frequencyInput = document.getElementById('frequency');
  const modeInput = document.getElementById('mode');
  const goalTimelineEl = document.getElementById('goal-timeline');
  const livePriceEl = document.getElementById('current-price');
  const livePriceStatusEl = document.getElementById('price-status');
  const ctx = document.getElementById('dca-chart');

  if (!ctx) {
    return;
  }

  const months = 120;
  const years = 10;

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'BTC accumulation',
          data: [],
          borderColor: colorPalette.accumulation,
          backgroundColor: colorPalette.accumulation,
          borderWidth: 3,
          tension: 0.25,
          yAxisID: 'btc',
        },
        {
          label: 'Reserved price path',
          data: [],
          borderColor: colorPalette.reserved,
          backgroundColor: colorPalette.reserved,
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.25,
          yAxisID: 'price',
        },
        {
          label: 'Moderate price path',
          data: [],
          borderColor: colorPalette.moderate,
          backgroundColor: colorPalette.moderate,
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.25,
          yAxisID: 'price',
        },
        {
          label: 'Bullish price path',
          data: [],
          borderColor: colorPalette.bullish,
          backgroundColor: colorPalette.bullish,
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.25,
          yAxisID: 'price',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const isPrice = context.dataset.yAxisID === 'price';
              if (isPrice) {
                return `${label}: $${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
              }

              const modeKey = modeInput?.value || 'moderate';
              const priceSeries = latestPricePaths[modeKey] || [];
              const priceAtPoint = priceSeries[context.dataIndex];
              const usdValue = Number.isFinite(priceAtPoint)
                ? value * priceAtPoint
                : value * startingPrice;
              const btcLine = `${label}: ${value.toFixed(4)} BTC`;
              const usdLine = `≈ ${formatUsd(usdValue)} at ${modeKey.charAt(0).toUpperCase()}${modeKey.slice(1)} price`;
              return [btcLine, usdLine];
            },
          },
        },
      },
      scales: {
        btc: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'BTC Balance',
          },
          grid: {
            drawOnChartArea: true,
          },
        },
        price: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'BTC Price (USD)',
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: (value) => `$${Number(value).toLocaleString()}`,
          },
        },
        x: {
          title: {
            display: true,
            text: 'Years from now',
          },
        },
      },
    },
  });

  function getInputValue(input, fallback = 0) {
    const parsed = parseFloat(input?.value ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatUsd(value) {
    return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  function formatTimeline(monthsToGoal) {
    if (!Number.isFinite(monthsToGoal)) return '—';
    if (monthsToGoal < 1) return 'Already at goal';
    const yearsPart = Math.floor(monthsToGoal / 12);
    const monthsPart = Math.round(monthsToGoal % 12);
    const yearsLabel = yearsPart > 0 ? `${yearsPart} year${yearsPart === 1 ? '' : 's'}` : '';
    const monthsLabel = monthsPart > 0 ? `${monthsPart} month${monthsPart === 1 ? '' : 's'}` : '';
    return [yearsLabel, monthsLabel].filter(Boolean).join(' ');
  }

  function project() {
    const currentBtc = getInputValue(currentBtcInput, 0);
    const goalBtc = getInputValue(goalBtcInput, 1);
    const dcaAmount = getInputValue(dcaAmountInput, 0);
    const frequency = frequencyInput.value;
    const mode = modeInput.value;

    const periodsPerYear = contributionsPerYear[frequency];
    const monthsPerPeriod = 12 / periodsPerYear;
    const selectedGrowth = growthModes[mode];

    const labels = ['0'];
    const accumulation = [currentBtc];
    const pricePaths = {
      reserved: [startingPrice],
      moderate: [startingPrice],
      bullish: [startingPrice],
    };

    let balance = currentBtc;
    let goalMonths = null;
    let currentMonth = 0;
    const totalPeriods = Math.ceil(years * periodsPerYear);

    for (let period = 1; period <= totalPeriods; period += 1) {
      const yearsElapsed = period / periodsPerYear;
      const currentPrice = startingPrice * (1 + selectedGrowth) ** yearsElapsed;
      balance += dcaAmount / currentPrice;

      const monthProgress = period * monthsPerPeriod;
      while (currentMonth < monthProgress && currentMonth < months) {
        currentMonth += 1;

        if (currentMonth % 12 === 0) {
          const yearsElapsedForLabel = currentMonth / 12;
          labels.push(yearsElapsedForLabel.toString());

          Object.keys(growthModes).forEach((growthKey) => {
            const rate = growthModes[growthKey];
            const projectedPrice = startingPrice * (1 + rate) ** yearsElapsedForLabel;
            pricePaths[growthKey].push(projectedPrice);
          });

          accumulation.push(balance);
        }
      }

      if (goalMonths === null && balance >= goalBtc) {
        goalMonths = period * monthsPerPeriod;
        break;
      }
    }

    // If the loop ended early due to reaching the goal, pad remaining labels for consistent graphing.
    if (labels.length - 1 < years) {
      const lastBalance = accumulation[accumulation.length - 1];
      const lastYear = labels.length - 1;
      for (let year = lastYear + 1; year <= years; year += 1) {
        labels.push(year.toString());
        accumulation.push(lastBalance);
        Object.keys(growthModes).forEach((growthKey) => {
          const rate = growthModes[growthKey];
          const projectedPrice = startingPrice * (1 + rate) ** year;
          pricePaths[growthKey].push(projectedPrice);
        });
      }
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = accumulation;
    chart.data.datasets[1].data = pricePaths.reserved;
    chart.data.datasets[2].data = pricePaths.moderate;
    chart.data.datasets[3].data = pricePaths.bullish;
    latestPricePaths = pricePaths;
    chart.update();

    const timelineText = goalMonths && goalMonths <= months
      ? formatTimeline(goalMonths)
      : goalMonths
        ? formatTimeline(goalMonths)
        : 'Beyond 10 years with current plan';
    goalTimelineEl.textContent = timelineText;
  }

  async function loadLivePrice() {
    const apiUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
    try {
      const response = await fetch(apiUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to fetch price');
      const data = await response.json();
      const livePrice = data?.bitcoin?.usd;

      if (Number.isFinite(livePrice)) {
        startingPrice = livePrice;
        if (livePriceEl) {
          livePriceEl.textContent = formatUsd(livePrice);
        }
        if (livePriceStatusEl) {
          livePriceStatusEl.textContent = 'Live price from CoinGecko';
        }
        project();
        return;
      }

      throw new Error('Invalid price data');
    } catch (error) {
      if (livePriceStatusEl) {
        livePriceStatusEl.textContent = 'Using fallback price due to live data issue';
      }
      if (livePriceEl) {
        livePriceEl.textContent = formatUsd(startingPrice);
      }
      project();
    }
  }

  [currentBtcInput, goalBtcInput, dcaAmountInput, frequencyInput, modeInput].forEach((input) => {
    input?.addEventListener('input', project);
    input?.addEventListener('change', project);
  });

  project();
  loadLivePrice();
})();
