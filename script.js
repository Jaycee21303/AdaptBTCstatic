const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
});

const headerPrice = document.getElementById('btcPrice');
const heroPrice = document.getElementById('heroPrice');
const heroChange = document.getElementById('heroChange');
const priceTimestamp = document.getElementById('priceTimestamp');
const heroBtcChart = document.getElementById('heroBtcChart');
const heroChartStatus = document.getElementById('heroChartStatus');
const heroZoomButton = document.getElementById('heroZoomButton');
const heroLatestClose = document.getElementById('heroLatestClose');
const heroRange = document.getElementById('heroRange');
const heroRangeChange = document.getElementById('heroRangeChange');
const debtValue = document.getElementById('debtValue');
const debtChange = document.getElementById('debtChange');
const debtUpdated = document.getElementById('debtUpdated');
const debtStatus = document.getElementById('debtStatus');

const dcaForm = document.getElementById('dcaForm');
const dcaAmountInput = document.getElementById('dcaAmount');
const dcaFrequencyInput = document.getElementById('dcaFrequency');
const dcaMonthsInput = document.getElementById('dcaMonths');
const dcaGrowthInput = document.getElementById('dcaGrowth');
const dcaPriceInput = document.getElementById('dcaPrice');
const dcaResults = document.getElementById('dcaResults');
const dcaProjectionValue = document.getElementById('dcaProjectionValue');
const dcaProjectionMode = document.getElementById('dcaProjectionMode');
const dcaBtcHeld = document.getElementById('dcaBtcHeld');
const dcaContributionTotal = document.getElementById('dcaContributionTotal');
const dcaCostBasis = document.getElementById('dcaCostBasis');
const dcaTimeline = document.getElementById('dcaTimeline');
const dcaGrowthNote = document.getElementById('dcaGrowthNote');
const dcaMonthlyDeploy = document.getElementById('dcaMonthlyDeploy');
const dcaScenarioRange = document.getElementById('dcaScenarioRange');
const dcaStartPriceLabel = document.getElementById('dcaStartPriceLabel');
const dcaChart = document.getElementById('dcaChart');

const CACHE_KEY = 'adaptbtc_price_cache_v1';
const HERO_HISTORY_RANGES = {
  sixMonths: { cacheKey: 'adaptbtc_history_cache_v1_6m', days: 180, label: '6-month view' },
  full: { cacheKey: 'adaptbtc_history_cache_v1_full', days: 'max', label: '2009 on' },
};
let livePrice = null;
let hasBootstrappedDca = false;
let currentHeroRange = 'sixMonths';
let debtBaseline = null;
let debtPerSecond = 0;
let debtStartTime = Date.now();
let debtDailyChange = null;

const fallbackHistory = [
  { time: new Date('2023-12-15').getTime(), price: 42400 },
  { time: new Date('2024-01-15').getTime(), price: 42850 },
  { time: new Date('2024-02-01').getTime(), price: 43650 },
  { time: new Date('2024-02-15').getTime(), price: 51800 },
  { time: new Date('2024-03-01').getTime(), price: 61200 },
  { time: new Date('2024-03-15').getTime(), price: 70050 },
  { time: new Date('2024-04-01').getTime(), price: 65900 },
  { time: new Date('2024-04-15').getTime(), price: 64020 },
  { time: new Date('2024-05-01').getTime(), price: 57480 },
  { time: new Date('2024-05-15').getTime(), price: 64040 },
  { time: new Date('2024-06-01').getTime(), price: 67810 },
  { time: new Date('2024-06-15').getTime(), price: 71100 },
];

const fallbackFullHistory = [
  { time: new Date('2009-01-03').getTime(), price: 0.05 },
  { time: new Date('2010-07-17').getTime(), price: 0.09 },
  { time: new Date('2011-06-01').getTime(), price: 9.5 },
  { time: new Date('2012-12-01').getTime(), price: 13.5 },
  { time: new Date('2013-11-30').getTime(), price: 1163 },
  { time: new Date('2015-01-14').getTime(), price: 177 },
  { time: new Date('2017-12-17').getTime(), price: 19497 },
  { time: new Date('2018-12-15').getTime(), price: 3220 },
  { time: new Date('2020-12-31').getTime(), price: 28940 },
  { time: new Date('2021-11-10').getTime(), price: 68789 },
  { time: new Date('2022-11-21').getTime(), price: 15760 },
  { time: new Date('2024-06-15').getTime(), price: 71100 },
];

function extendHistoryTo2009(points) {
  if (!Array.isArray(points) || !points.length) return points;
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const anchorTime = new Date('2009-01-03').getTime();
  if (sorted[0].time <= anchorTime) return sorted;

  const anchorPrice = Math.max(0.05, sorted[0].price * 0.0015);
  return [{ time: anchorTime, price: anchorPrice }, ...sorted];
}

function formatPrice(value) {
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatShortPrice(value) {
  if (!Number.isFinite(value)) return '$--';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return formatPrice(value);
}

function formatDebtTrillions(value) {
  if (!Number.isFinite(value)) return '$-- T';
  return `$${(value / 1_000_000_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} T`;
}

function formatDebtChange(value) {
  if (!Number.isFinite(value)) return '--';
  const billions = value / 1_000_000_000;
  const sign = billions > 0 ? '+' : '';
  return `${sign}$${Math.abs(billions).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
}

function formatMonthDay(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

function readCachedHistory(cacheKey) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.points) && parsed.points.length) {
      return parsed.points;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function persistHistory(points, cacheKey) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ points, time: Date.now() }));
  } catch (error) {
    // ignore cache issues
  }
}

function renderPrice(value, change) {
  const priceText = Number.isFinite(value) ? formatPrice(value) : '$--';
  headerPrice && (headerPrice.textContent = priceText);
  heroPrice && (heroPrice.textContent = priceText);
  dcaStartPriceLabel && (dcaStartPriceLabel.textContent = Number.isFinite(value) ? `Live: ${priceText}` : 'Live price');

  if (Number.isFinite(value)) {
    livePrice = value;
    if (dcaPriceInput && !dcaPriceInput.value) {
      dcaPriceInput.placeholder = formatPrice(value);
    }
    bootstrapDcaWhenReady();
  }

  if (Number.isFinite(change)) {
    applyChange(heroChange, change);
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
bootstrapHeroHistory();
setInterval(updateTicker, 30000);

function renderDebtEstimate() {
  if (!debtValue || debtBaseline === null) return;
  const elapsedSeconds = (Date.now() - debtStartTime) / 1000;
  const estimatedDebt = debtBaseline + debtPerSecond * elapsedSeconds;
  debtValue.textContent = formatDebtTrillions(estimatedDebt);
  if (debtStatus) debtStatus.textContent = 'Live';
}

async function fetchDebtClock() {
  const fallback = {
    total: 34_800_000_000_000,
    change: 2_500_000_000,
    dateLabel: 'Fallback data',
  };

  try {
    const response = await fetch(
      'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[number]=1&page[size]=2',
      { cache: 'no-store' }
    );

    if (!response.ok) throw new Error('Debt request failed');

    const data = await response.json();
    const records = Array.isArray(data?.data) ? data.data : [];
    const latest = records[0];
    const previous = records[1];

    const latestDebt = Number(latest?.total_public_debt_outstanding);
    const previousDebt = Number(previous?.total_public_debt_outstanding);

    if (!Number.isFinite(latestDebt)) throw new Error('Invalid debt data');

    debtBaseline = latestDebt;
    debtDailyChange = Number.isFinite(previousDebt) ? latestDebt - previousDebt : null;
    debtPerSecond = Number.isFinite(debtDailyChange) ? debtDailyChange / 86_400 : 0;
    debtStartTime = Date.now();

    if (debtChange && Number.isFinite(debtDailyChange)) {
      debtChange.textContent = formatDebtChange(debtDailyChange);
    }

    if (debtUpdated && latest?.record_date) {
      debtUpdated.textContent = new Date(latest.record_date).toLocaleDateString();
    }

    if (debtStatus) debtStatus.textContent = 'Live';
  } catch (error) {
    debtBaseline = fallback.total;
    debtDailyChange = fallback.change;
    debtPerSecond = debtDailyChange / 86_400;
    debtStartTime = Date.now();

    if (debtChange) {
      debtChange.textContent = formatDebtChange(debtDailyChange);
    }

    if (debtUpdated) {
      debtUpdated.textContent = fallback.dateLabel;
    }

    if (debtStatus) debtStatus.textContent = 'Offline fallback';
  }

  renderDebtEstimate();
}

fetchDebtClock();
setInterval(renderDebtEstimate, 1000);
setInterval(fetchDebtClock, 15 * 60 * 1000);

heroZoomButton?.addEventListener('click', () => {
  currentHeroRange = currentHeroRange === 'full' ? 'sixMonths' : 'full';
  updateHeroZoomButton();
  loadHeroHistory(currentHeroRange);
});

function formatCurrency(value) {
  if (!Number.isFinite(value)) return '$0';
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatCurrencyShort(value) {
  if (!Number.isFinite(value)) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return formatCurrency(value);
}

function formatBtc(value) {
  if (!Number.isFinite(value)) return '0 BTC';
  if (value < 0.01) return `${value.toFixed(4)} BTC`;
  return `${value.toFixed(3)} BTC`;
}

function deriveGrowthProfiles(baseGrowth) {
  const bear = Number((baseGrowth * 0.5).toFixed(2));
  const bull = Number((baseGrowth * 1.5 + 2).toFixed(2));
  return {
    bear,
    base: baseGrowth,
    bull,
  };
}

function buildScenarioSeries({ months, monthlyContribution, startPrice, annualGrowth }) {
  const monthlyRate = Math.pow(1 + annualGrowth / 100, 1 / 12) - 1;
  let currentPrice = startPrice;
  let holdings = 0;
  let totalContributions = 0;
  const values = [];

  for (let month = 1; month <= months; month += 1) {
    holdings += monthlyContribution / currentPrice;
    totalContributions += monthlyContribution;
    currentPrice *= 1 + monthlyRate;
    values.push(holdings * currentPrice);
  }

  return { values, holdings, totalContributions, finalPrice: currentPrice };
}

function drawLine(ctx, points, color, width = 2.8, dash = []) {
  if (!points.length) return;
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawHeroChart(points) {
  if (!heroBtcChart || !points.length) return;
  const ctx = heroBtcChart.getContext('2d');
  if (!ctx) return;

  const deviceRatio = window.devicePixelRatio || 1;
  const width = heroBtcChart.clientWidth || 640;
  const height = 240;
  heroBtcChart.width = width * deviceRatio;
  heroBtcChart.height = height * deviceRatio;
  ctx.save();
  ctx.scale(deviceRatio, deviceRatio);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 14, right: 16, bottom: 28, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const paddedRange = Math.max(max - min, 1) * 0.08;
  const minWithPadding = min - paddedRange;
  const maxWithPadding = max + paddedRange;
  const range = maxWithPadding - minWithPadding || 1;

  const toX = (index) => padding.left + (index / Math.max(1, points.length - 1)) * chartWidth;
  const toY = (price) => padding.top + (1 - (price - minWithPadding) / range) * chartHeight;

  ctx.strokeStyle = 'rgba(12, 22, 43, 0.08)';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i += 1) {
    const y = padding.top + (i / gridLines) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(12, 22, 43, 0.32)';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= gridLines; i += 1) {
    const value = max - (range * i) / gridLines;
    const y = padding.top + (i / gridLines) * chartHeight;
    ctx.fillText(formatShortPrice(value), padding.left - 12, y);
  }

  ctx.strokeStyle = 'rgba(12, 22, 43, 0.06)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const verticalLines = 4;
  for (let i = 0; i <= verticalLines; i += 1) {
    const ratio = i / verticalLines;
    const x = padding.left + ratio * chartWidth;
    const index = Math.min(points.length - 1, Math.round(ratio * (points.length - 1)));
    const labelDate = new Date(points[index].time);
    const label = labelDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom + 6);
    ctx.stroke();
    ctx.fillText(label, x, height - padding.bottom + 8);
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(12, 99, 255, 0.28)');
  gradient.addColorStop(1, 'rgba(12, 99, 255, 0)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(points[0].price));
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(toX(i), toY(points[i].price));
  }
  ctx.lineTo(toX(points.length - 1), height - padding.bottom);
  ctx.lineTo(toX(0), height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const linePoints = points.map((p, index) => ({ x: toX(index), y: toY(p.price) }));
  drawLine(ctx, linePoints, 'rgba(12, 99, 255, 1)', 3.2);

  const lastPoint = linePoints[linePoints.length - 1];
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0c63ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawChart({ bear, base, bull, contributions, months }) {
  if (!dcaChart) return;
  const ctx = dcaChart.getContext('2d');
  if (!ctx) return;

  const deviceRatio = window.devicePixelRatio || 1;
  const width = dcaChart.clientWidth || 680;
  const height = 360;
  dcaChart.width = width * deviceRatio;
  dcaChart.height = height * deviceRatio;
  ctx.scale(deviceRatio, deviceRatio);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 24, right: 70, bottom: 36, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...bear, ...base, ...bull, ...contributions, 1);

  const toY = (value) => padding.top + (1 - value / maxValue) * chartHeight;
  const toX = (index) => padding.left + (index / Math.max(1, months - 1)) * chartWidth;

  // grid lines
  ctx.strokeStyle = 'rgba(13, 22, 43, 0.08)';
  ctx.fillStyle = '#445';
  ctx.lineWidth = 1;
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const gridLines = 4;
  for (let i = 0; i <= gridLines; i += 1) {
    const ratio = i / gridLines;
    const y = padding.top + ratio * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    const labelValue = maxValue * (1 - ratio);
    ctx.fillText(formatCurrencyShort(labelValue), padding.left - 8, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const totalYears = Math.max(1, Math.round(months / 12));
  for (let year = 0; year <= totalYears; year += 1) {
    const index = Math.min(months - 1, Math.round((year / totalYears) * (months - 1)));
    const x = toX(index);
    ctx.fillStyle = '#6b7280';
    ctx.fillText(`${year}y`, x, height - padding.bottom + 10);
  }

  const bearPoints = bear.map((value, index) => ({ x: toX(index), y: toY(value) }));
  const basePoints = base.map((value, index) => ({ x: toX(index), y: toY(value) }));
  const bullPoints = bull.map((value, index) => ({ x: toX(index), y: toY(value) }));
  const contributionPoints = contributions.map((value, index) => ({ x: toX(index), y: toY(value) }));

  drawLine(ctx, contributionPoints, 'rgba(13, 22, 43, 0.35)', 2.5, [6, 6]);
  drawLine(ctx, bearPoints, '#c2410c', 2.6);
  drawLine(ctx, basePoints, '#0c63ff', 3.2);
  drawLine(ctx, bullPoints, '#0bbf63', 3.2);

  const finalPoint = basePoints[basePoints.length - 1];
  if (finalPoint) {
    ctx.fillStyle = '#0c63ff';
    ctx.beginPath();
    ctx.arc(finalPoint.x, finalPoint.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function renderHeroStats(points, label) {
  if (!points.length) return;
  const latest = points[points.length - 1];
  const first = points[0];
  const high = Math.max(...points.map((p) => p.price));
  const low = Math.min(...points.map((p) => p.price));
  const change = ((latest.price - first.price) / first.price) * 100;

  if (heroLatestClose) {
    heroLatestClose.textContent = formatPrice(latest.price);
  }
  if (heroRange) {
    heroRange.textContent = `${formatShortPrice(high)} / ${formatShortPrice(low)}`;
  }
  if (heroRangeChange) {
    const sign = change > 0 ? '+' : '';
    heroRangeChange.textContent = `${sign}${change.toFixed(1)}%`;
    heroRangeChange.classList.toggle('positive', change >= 0);
    heroRangeChange.classList.toggle('negative', change < 0);
  }
  if (heroChartStatus) {
    const labelText = label ? ` · ${label}` : '';
    heroChartStatus.textContent = `Through ${formatMonthDay(latest.time)}${labelText}`;
  }
}

async function fetchCoinGeckoHistory(days) {
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    { cache: 'no-store' }
  );

  if (!response.ok) throw new Error('History request failed');
  const data = await response.json();
  const prices = Array.isArray(data?.prices) ? data.prices : [];
  const points = prices
    .filter((row) => Array.isArray(row) && row.length >= 2)
    .map((row) => ({ time: Number(row[0]), price: Number(row[1]) }))
    .filter((p) => Number.isFinite(p.time) && Number.isFinite(p.price));
  if (!points.length) throw new Error('Invalid history data');
  return points;
}

function loadHeroHistoryFrom(points, rangeKey) {
  if (!Array.isArray(points) || !points.length) return;
  const rangeLabel = HERO_HISTORY_RANGES[rangeKey]?.label;
  const normalized = rangeKey === 'full' ? extendHistoryTo2009(points) : points;
  const sorted = [...normalized].sort((a, b) => a.time - b.time);
  drawHeroChart(sorted);
  renderHeroStats(sorted, rangeLabel);
}

function getFallbackHistory(rangeKey) {
  return rangeKey === 'full' ? fallbackFullHistory : fallbackHistory;
}

function updateHeroZoomButton() {
  if (!heroZoomButton) return;
  const isZoomedOut = currentHeroRange === 'full';
  heroZoomButton.textContent = isZoomedOut ? '↩️ Back to 6M view' : '🔍 Zoom out to 2009';
  heroZoomButton.setAttribute('aria-pressed', String(isZoomedOut));
}

async function loadHeroHistory(rangeKey) {
  if (!heroBtcChart) return;
  const range = HERO_HISTORY_RANGES[rangeKey];
  if (!range) return;

  const cachedHistory = readCachedHistory(range.cacheKey);
  if (cachedHistory?.length) {
    loadHeroHistoryFrom(cachedHistory, rangeKey);
    heroChartStatus && (heroChartStatus.textContent = `Cached · ${range.label}`);
  } else {
    const fallback = getFallbackHistory(rangeKey);
    loadHeroHistoryFrom(fallback, rangeKey);
    heroChartStatus && (heroChartStatus.textContent = `Fallback · ${range.label}`);
  }

  try {
    const liveHistory = await fetchCoinGeckoHistory(range.days);
    const normalizedHistory = rangeKey === 'full' ? extendHistoryTo2009(liveHistory) : liveHistory;
    persistHistory(normalizedHistory, range.cacheKey);
    loadHeroHistoryFrom(normalizedHistory, rangeKey);
    if (heroChartStatus) {
      heroChartStatus.textContent = `Through ${formatMonthDay(normalizedHistory[normalizedHistory.length - 1].time)} · ${range.label}`;
    }
  } catch (error) {
    if (heroChartStatus) {
      heroChartStatus.textContent = `Offline fallback · ${range.label}`;
    }
  }
}

function bootstrapHeroHistory() {
  updateHeroZoomButton();
  loadHeroHistory(currentHeroRange);
}

function calculateDca(event) {
  event?.preventDefault();

  const amount = parseFloat(dcaAmountInput?.value || '');
  const frequency = parseFloat(dcaFrequencyInput?.value || '');
  const months = parseInt(dcaMonthsInput?.value || '0', 10);
  const baseGrowth = parseFloat(dcaGrowthInput?.value || '0');
  const priceInput = parseFloat(dcaPriceInput?.value || '');
  const price = Number.isFinite(priceInput) && priceInput > 0 ? priceInput : livePrice;

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(frequency) || !Number.isFinite(months) || months <= 0) {
    dcaResults && (dcaResults.textContent = 'Please enter a valid contribution, frequency, and timeline.');
    return;
  }

  if (!Number.isFinite(price)) {
    dcaResults && (dcaResults.textContent = 'Enter a BTC price or wait for the live price to load.');
    return;
  }

  const profiles = deriveGrowthProfiles(baseGrowth);
  const monthlyContribution = amount * frequency;
  const contributionSeries = [];
  for (let month = 1; month <= months; month += 1) {
    contributionSeries.push(monthlyContribution * month);
  }

  const bearSeries = buildScenarioSeries({ months, monthlyContribution, startPrice: price, annualGrowth: profiles.bear });
  const baseSeries = buildScenarioSeries({ months, monthlyContribution, startPrice: price, annualGrowth: profiles.base });
  const bullSeries = buildScenarioSeries({ months, monthlyContribution, startPrice: price, annualGrowth: profiles.bull });

  const finalValue = baseSeries.values[baseSeries.values.length - 1];
  const totalContributions = monthlyContribution * months;
  const costBasis = baseSeries.holdings ? totalContributions / baseSeries.holdings : 0;

  dcaProjectionValue && (dcaProjectionValue.textContent = formatCurrency(finalValue));
  dcaProjectionMode && (dcaProjectionMode.textContent = `Base growth: ${profiles.base.toFixed(1)}% annually`);
  dcaBtcHeld && (dcaBtcHeld.textContent = formatBtc(baseSeries.holdings));
  dcaContributionTotal && (dcaContributionTotal.textContent = formatCurrency(totalContributions));
  dcaCostBasis && (dcaCostBasis.textContent = formatCurrency(costBasis));
  dcaTimeline && (dcaTimeline.textContent = `${(months / 12).toFixed(1)} years`);
  dcaMonthlyDeploy && (dcaMonthlyDeploy.textContent = formatCurrency(monthlyContribution));
  dcaScenarioRange &&
    (dcaScenarioRange.textContent = `${profiles.bear.toFixed(1)}% to ${profiles.bull.toFixed(1)}% CAGR`);
  dcaStartPriceLabel && (dcaStartPriceLabel.textContent = `Pricing: ${formatCurrency(price)}`);
  dcaGrowthNote &&
    (dcaGrowthNote.textContent = `Bear ${profiles.bear.toFixed(1)}% · Base ${profiles.base.toFixed(1)}% · Bull ${profiles.bull.toFixed(1)}% CAGR`);
  dcaResults &&
    (dcaResults.textContent = `Projection uses ${formatCurrency(price)} start, ${formatCurrency(
      monthlyContribution
    )} monthly, and a ${profiles.base.toFixed(1)}% base CAGR across ${months} months.`);

  drawChart({
    bear: bearSeries.values,
    base: baseSeries.values,
    bull: bullSeries.values,
    contributions: contributionSeries,
    months,
  });
}

dcaForm?.addEventListener('submit', calculateDca);

[dcaAmountInput, dcaFrequencyInput, dcaMonthsInput, dcaGrowthInput, dcaPriceInput].forEach((field) => {
  field?.addEventListener('input', () => {
    if (!hasBootstrappedDca && livePrice) {
      hasBootstrappedDca = true;
    }
    if (hasBootstrappedDca) {
      calculateDca();
    }
  });
});

function bootstrapDcaWhenReady() {
  if (hasBootstrappedDca || !dcaForm) return;
  if (!livePrice) return;
  hasBootstrappedDca = true;
  calculateDca();
}

window.addEventListener('resize', () => {
  if (!hasBootstrappedDca) return;
  calculateDca();
});

setTimeout(() => bootstrapDcaWhenReady(), 500);

