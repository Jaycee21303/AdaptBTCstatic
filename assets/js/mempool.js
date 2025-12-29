const bucketEdges = [1, 2, 5, 10, 20, 40, 80, 160, 320, 640, 1280];
const bucketLabels = bucketEdges.map((edge, index) =>
  index === bucketEdges.length - 1 ? `${edge}+ sat/vB` : `${edge} sat/vB`
);
const bucketColors = [
  'rgba(125, 180, 255, 0.4)',
  'rgba(99, 143, 255, 0.4)',
  'rgba(116, 178, 255, 0.4)',
  'rgba(140, 205, 255, 0.4)',
  'rgba(107, 220, 196, 0.4)',
  'rgba(141, 214, 170, 0.45)',
  'rgba(186, 219, 140, 0.45)',
  'rgba(225, 217, 140, 0.45)',
  'rgba(255, 205, 140, 0.45)',
  'rgba(255, 181, 140, 0.5)',
  'rgba(255, 160, 140, 0.5)',
];

const summaryStatusEl = document.getElementById('mempool-status');
const chipSizeEl = document.getElementById('chip-mempool-size');
const chipCountEl = document.getElementById('chip-mempool-count');
const chipFeesEl = document.getElementById('chip-total-fees');
const chipFastEl = document.getElementById('chip-fee-fast');
const chipHalfEl = document.getElementById('chip-fee-half');
const chipHourEl = document.getElementById('chip-fee-hour');
const chartStatusEl = document.getElementById('chart-status');
const feedStatusEl = document.getElementById('feed-status');
const feedListEl = document.getElementById('tx-feed');
const feedEmptyEl = document.getElementById('feed-empty');
const guidanceStatusEl = document.getElementById('fee-guidance-status');
const guidanceFastEl = document.getElementById('guidance-fast');
const guidanceHalfEl = document.getElementById('guidance-half');
const guidanceHourEl = document.getElementById('guidance-hour');
const blockStatusEl = document.getElementById('block-status');
const blockFallbackEl = document.getElementById('block-fallback');
const previewCard = document.querySelector('[data-mempool-preview]');

let mempoolChart;
let blockChart;
let btcUsd = null;
let recommendedFees = null;
const chartPoints = bucketEdges.map(() => []);

const formatUpdateTime = seconds => {
  if (!seconds) return 'recently';
  const date = new Date(seconds * 1000);
  return date.toLocaleTimeString();
};

const formatNumber = (value, digits = 0) =>
  Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

const formatBtc = sats => (Number(sats || 0) / 1e8);

const formatMB = vbytes => (Number(vbytes || 0) / 1e6);

const shortId = txid =>
  txid && txid.length > 12 ? `${txid.slice(0, 6)}…${txid.slice(-6)}` : txid || 'tx';

const ensureUsdPrice = async () => {
  if (btcUsd) return btcUsd;
  try {
    const response = await fetch('/api/network-fees');
    if (!response.ok) throw new Error('price request failed');
    const data = await response.json();
    if (!data?.btc_usd) throw new Error('price unavailable');
    btcUsd = data.btc_usd;
  } catch (error) {
    // silently ignore; USD conversions will be skipped
  }
  return btcUsd;
};

const computeBuckets = histogram => {
  const totals = bucketEdges.map(() => 0);
  if (!Array.isArray(histogram)) return totals;

  histogram.forEach(entry => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const [feeRate, vsize] = entry;
    const bucketIndex = bucketEdges.findIndex(edge => feeRate <= edge);
    const idx = bucketIndex >= 0 ? bucketIndex : bucketEdges.length - 1;
    totals[idx] += formatMB(vsize);
  });
  return totals;
};

const maintainSeries = (series, limit = 180) => {
  while (series.length > limit) {
    series.shift();
  }
};

const buildMempoolChart = ctx => {
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'line',
    data: {
      datasets: bucketEdges.map((edge, index) => ({
        label: bucketLabels[index],
        data: chartPoints[index],
        fill: true,
        tension: 0.3,
        backgroundColor: bucketColors[index],
        borderColor: bucketColors[index].replace('0.4', '0.9').replace('0.45', '0.9').replace('0.5', '0.95'),
        borderWidth: 1.5,
        pointRadius: 0,
        stack: 'mempool',
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      stacked: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} MB`,
          },
        },
        zoom: {
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          pan: { enabled: true, mode: 'x' },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'pp', displayFormats: { minute: 'HH:mm', second: 'HH:mm:ss' } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.07)' },
          ticks: {
            callback: value => `${value} MB`,
          },
        },
      },
    },
  });
};

const updateMempoolChart = (totals, timestamp) => {
  if (!totals) return;
  totals.forEach((value, index) => {
    chartPoints[index].push({ x: timestamp, y: Number(value.toFixed(3)) });
    maintainSeries(chartPoints[index]);
  });

  if (!mempoolChart) {
    const canvas = document.getElementById('mempool-chart');
    mempoolChart = buildMempoolChart(canvas?.getContext('2d'));
  }
  if (mempoolChart) {
    mempoolChart.update('none');
  }
};

const updateChips = (summary, fees) => {
  if (summary) {
    const mempoolMB = formatMB(summary.vsize || summary.vbytes);
    const totalFeesBtc = formatBtc(summary.total_fee || summary.totalFees);
    if (chipSizeEl) chipSizeEl.textContent = `${formatNumber(mempoolMB, 2)} MB`;
    if (chipCountEl) chipCountEl.textContent = formatNumber(summary.count || summary.transactions);
    if (chipFeesEl) chipFeesEl.textContent = totalFeesBtc ? `${totalFeesBtc.toFixed(4)} BTC` : '—';
    if (summaryStatusEl) {
      const updated = summary.as_of || summary.timestamp || Date.now() / 1000;
      const label = summary.stale ? 'Cached mempool data' : 'Live mempool data';
      summaryStatusEl.textContent = `${label} · Updated ${formatUpdateTime(updated)}`;
      summaryStatusEl.classList.toggle('warning', Boolean(summary.stale));
      summaryStatusEl.classList.toggle('positive', !summary.stale);
    }
  }

  if (fees) {
    if (chipFastEl) chipFastEl.textContent = fees.fastestFee ? `${fees.fastestFee} sat/vB` : '—';
    if (chipHalfEl) chipHalfEl.textContent = fees.halfHourFee ? `${fees.halfHourFee} sat/vB` : '—';
    if (chipHourEl) chipHourEl.textContent = fees.hourFee ? `${fees.hourFee} sat/vB` : '—';
  }
};

const renderFeed = async transactions => {
  if (!feedListEl || !Array.isArray(transactions)) return;
  const previousScroll = feedListEl.scrollTop;
  const nearTop = previousScroll < 40;

  const price = await ensureUsdPrice();
  feedListEl.innerHTML = '';
  transactions.slice(0, 60).forEach(tx => {
    const valueBtc = formatBtc(tx.value || 0);
    const feeRate = tx.fee && tx.vsize ? (tx.fee / tx.vsize).toFixed(1) : '—';
    const usdValue = price ? (valueBtc * price).toLocaleString('en-US', { maximumFractionDigits: 2 }) : null;
    const age = tx.time ? `${Math.max(0, Math.round((Date.now() / 1000 - tx.time) / 60))} min ago` : 'recent';

    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `
      <div class="row">
        <a href="https://mempool.space/tx/${tx.txid}" target="_blank" rel="noopener">${shortId(tx.txid)}</a>
        <span class="muted small">${age}</span>
      </div>
      <div class="feed-meta">
        <span><strong>${valueBtc.toFixed(6)}</strong> BTC${usdValue ? ` (~$${usdValue})` : ''}</span>
        <span class="muted">${feeRate !== '—' ? `${feeRate} sat/vB` : 'fee pending'}</span>
      </div>
    `;
    feedListEl.appendChild(item);
  });

  if (!transactions.length && feedEmptyEl) {
    feedEmptyEl.hidden = false;
  } else if (feedEmptyEl) {
    feedEmptyEl.hidden = true;
  }

  if (nearTop) {
    feedListEl.scrollTop = 0;
  } else {
    feedListEl.scrollTop = previousScroll;
  }
};

const loadSummary = async () => {
  if (!chartStatusEl) return;
  try {
    const response = await fetch('/api/mempool/summary');
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const totals = computeBuckets(data.fee_histogram || data.feeHistogram);
    updateMempoolChart(totals, Date.now());
    updateChips(data, recommendedFees);
    const freshnessLabel = data.stale ? 'Cached mempool depth' : 'Live mempool depth';
    chartStatusEl.textContent = `${freshnessLabel} · Updated ${formatUpdateTime(data.as_of || data.timestamp)}`;
    chartStatusEl.classList.toggle('warning', Boolean(data.stale));
    chartStatusEl.classList.toggle('positive', !data.stale);
  } catch (error) {
    if (chartStatusEl) {
      chartStatusEl.textContent = `Unable to load mempool depth: ${error.message}`;
      chartStatusEl.classList.remove('positive');
      chartStatusEl.classList.add('warning');
    }
  }
};

const loadFeed = async () => {
  if (!feedStatusEl) return;
  try {
    const response = await fetch('/api/mempool/recent');
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    await renderFeed(data.transactions || []);
    const freshnessLabel = data.stale ? 'Cached unconfirmed flow' : 'Live unconfirmed flow';
    feedStatusEl.textContent = `${freshnessLabel} · ${formatUpdateTime(data.timestamp)}`;
    feedStatusEl.classList.toggle('warning', Boolean(data.stale));
    feedStatusEl.classList.toggle('positive', !data.stale);
  } catch (error) {
    feedStatusEl.textContent = `Feed paused: ${error.message}`;
    feedStatusEl.classList.remove('positive');
    feedStatusEl.classList.add('warning');
  }
};

const renderGuidance = payload => {
  if (!payload) return;
  const { fastestFee, halfHourFee, hourFee } = payload;
  if (guidanceFastEl) guidanceFastEl.textContent = fastestFee ? `${fastestFee} sat/vB` : '—';
  if (guidanceHalfEl) guidanceHalfEl.textContent = halfHourFee ? `${halfHourFee} sat/vB` : '—';
  if (guidanceHourEl) guidanceHourEl.textContent = hourFee ? `${hourFee} sat/vB` : '—';
  if (guidanceStatusEl) {
    const updated = payload.timestamp ? formatUpdateTime(payload.timestamp) : 'recently';
    const label = payload.stale ? 'Cached guidance' : 'Updated';
    guidanceStatusEl.textContent = `${label} ${updated}`;
    guidanceStatusEl.classList.toggle('warning', Boolean(payload.stale));
    guidanceStatusEl.classList.toggle('positive', !payload.stale);
  }
};

const loadGuidance = async () => {
  if (!guidanceStatusEl) return;
  try {
    const response = await fetch('/api/mempool/recommended');
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    recommendedFees = data;
    renderGuidance(data);
    updateChips(null, data);
  } catch (error) {
    guidanceStatusEl.textContent = `Guidance unavailable: ${error.message}`;
    guidanceStatusEl.classList.remove('positive');
    guidanceStatusEl.classList.add('warning');
  }
};

const loadBlocks = async () => {
  if (!blockStatusEl) return;
  try {
    const response = await fetch('/api/mempool/blocks');
    if (!response.ok) throw new Error('request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    if (blockFallbackEl) blockFallbackEl.hidden = true;

    if (!blockChart) {
      const canvas = document.getElementById('block-chart');
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        blockChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [
              {
                label: 'Projected vMB',
                data: [],
                backgroundColor: 'rgba(135, 199, 255, 0.6)',
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: { callback: value => `${value} MB` },
                grid: { color: 'rgba(255,255,255,0.08)' },
              },
              x: { grid: { display: false } },
            },
          },
        });
      }
    }

    if (blockChart) {
      blockChart.data.labels = blocks.map((_, idx) => `Block ${idx + 1}`);
      blockChart.data.datasets[0].data = blocks.map(block => {
        const vbytes = block.blockVSize || block.vsize || block.vbytes || 0;
        return Number((vbytes / 1e6).toFixed(2));
      });
      blockChart.update('none');
      if (!blocks.length && blockFallbackEl) {
        blockFallbackEl.hidden = false;
        blockFallbackEl.textContent = 'Block data unavailable right now.';
      }
    }

    const blockLabel = data.stale ? 'Cached backlog view' : 'Projected backlog';
    blockStatusEl.textContent = `${blockLabel} · ${formatUpdateTime(data.timestamp)}`;
    blockStatusEl.classList.toggle('warning', Boolean(data.stale));
    blockStatusEl.classList.toggle('positive', !data.stale);
  } catch (error) {
    blockStatusEl.textContent = `Block view unavailable: ${error.message}`;
    blockStatusEl.classList.remove('positive');
    blockStatusEl.classList.add('warning');
    if (blockFallbackEl) blockFallbackEl.hidden = false;
  }
};

const initMempoolPage = () => {
  const isMempoolPage = document.getElementById('mempool-chart');
  if (!isMempoolPage) return;

  loadGuidance();
  loadSummary();
  loadFeed();
  loadBlocks();
  ensureUsdPrice();

  setInterval(loadSummary, 10000);
  setInterval(loadFeed, 6000);
  setInterval(loadGuidance, 12000);
  setInterval(loadBlocks, 20000);
};

const renderPreview = (summary, fees) => {
  if (!previewCard) return;
  const sizeEl = previewCard.querySelector('[data-preview-size]');
  const fastestEl = previewCard.querySelector('[data-preview-fastest]');
  const statusEl = previewCard.querySelector('[data-preview-status]');
  const meterEl = previewCard.querySelector('[data-preview-meter]');
  const meterTextEl = previewCard.querySelector('[data-meter-text]');
  if (sizeEl) {
    if (summary) {
      sizeEl.textContent = `${formatNumber(formatMB(summary.vsize || 0), 2)} vMB`;
    } else {
      sizeEl.textContent = '—';
    }
  }
  if (fastestEl) {
    if (fees) {
      fastestEl.textContent = fees.fastestFee ? `${fees.fastestFee} sat/vB` : '—';
    } else {
      fastestEl.textContent = '—';
    }
  }
  if (meterEl) {
    const feeValue = fees?.fastestFee || 0;
    const maxFee = 400;
    const level = Math.min(100, Math.round((feeValue / maxFee) * 100));
    meterEl.style.setProperty('--meter-level', `${level}%`);
    meterEl.setAttribute('aria-valuenow', level);
    if (meterTextEl) {
      if (!feeValue) {
        meterTextEl.textContent = 'Waiting for live pressure…';
      } else if (level > 70) {
        meterTextEl.textContent = 'High fee pressure';
      } else if (level > 40) {
        meterTextEl.textContent = 'Elevated fee pressure';
      } else {
        meterTextEl.textContent = 'Calm fee pressure';
      }
    }
  }
  if (statusEl) {
    if (summary) {
      const updated = summary.as_of ? formatUpdateTime(summary.as_of) : 'moments ago';
      const label = summary.stale ? 'Cached preview' : 'Live';
      statusEl.textContent = `${label} · Updated ${updated}`;
      statusEl.classList.toggle('warning', Boolean(summary.stale));
      statusEl.classList.toggle('positive', !summary.stale);
    } else {
      statusEl.textContent = 'Preview unavailable right now';
      statusEl.classList.remove('positive');
      statusEl.classList.add('warning');
    }
  }
};

const initPreview = async () => {
  if (!previewCard) return;
  try {
    const [summaryRes, recRes] = await Promise.all([
      fetch('/api/mempool/summary'),
      fetch('/api/mempool/recommended'),
    ]);
    const summary = summaryRes.ok ? await summaryRes.json() : null;
    const rec = recRes.ok ? await recRes.json() : null;
    renderPreview(summary?.error ? null : summary, rec?.error ? null : rec);
  } catch (error) {
    const statusEl = previewCard.querySelector('[data-preview-status]');
    if (statusEl) {
      statusEl.textContent = `Preview unavailable: ${error.message}`;
      statusEl.classList.add('warning');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initMempoolPage();
  initPreview();
});
