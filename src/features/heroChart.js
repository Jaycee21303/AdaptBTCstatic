import { fetchHistoricalBTCData, fetchLatestBTCPrice, updateChartWithLivePrice } from '../lib/btcChartData.js';
import { getCache, setCache } from '../lib/cache.js';

const HERO_HISTORY_RANGES = {
  sixMonths: { cacheKey: 'adaptbtc_history_cache_v2_6m', days: 180, label: '6-month view' },
  full: { cacheKey: 'adaptbtc_history_cache_v2_full', days: 'max', label: '2009 on' },
};

const HERO_LIVE_REFRESH_MS = 45_000;
const HISTORY_TTL_MS = 30 * 60_000;

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

const extendHistoryTo2009 = (points) => {
  if (!Array.isArray(points) || !points.length) return points;
  const sorted = [...points].sort((a, b) => a.time - b.time);
  const anchorTime = new Date('2009-01-03').getTime();
  if (sorted[0].time <= anchorTime) return sorted;

  const anchorPrice = Math.max(0.05, sorted[0].price * 0.0015);
  return [{ time: anchorTime, price: anchorPrice }, ...sorted];
};

const formatPrice = (value) =>
  `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatShortPrice = (value) => {
  if (!Number.isFinite(value)) return '$--';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return formatPrice(value);
};

const formatMonthDay = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const setTextIfChanged = (el, text) => {
  if (!el) return;
  if (el.textContent !== text) {
    el.textContent = text;
  }
};

const drawLine = (ctx, points, color, width = 2.8, dash = []) => {
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
};

const drawSmoothLine = (ctx, points, color, width = 3.4) => {
  if (points.length < 2) {
    drawLine(ctx, points, color, width);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(12, 99, 255, 0.32)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const prev = points[i - 1] || current;
    const after = points[i + 2] || next;
    const cp1x = current.x + (next.x - prev.x) / 6;
    const cp1y = current.y + (next.y - prev.y) / 6;
    const cp2x = next.x - (after.x - current.x) / 6;
    const cp2y = next.y - (after.y - current.y) / 6;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
  }

  ctx.stroke();
  ctx.restore();
};

export const initHeroChart = () => {
  const heroBtcChart = document.getElementById('heroBtcChart');
  if (!heroBtcChart) return;

  const heroChartStatus = document.getElementById('heroChartStatus');
  const heroZoomButton = document.getElementById('heroZoomButton');
  const heroLatestClose = document.getElementById('heroLatestClose');
  const heroRange = document.getElementById('heroRange');
  const heroRangeChange = document.getElementById('heroRangeChange');
  const heroChartWrapper = heroBtcChart.parentElement || null;

  const heroHistoryState = { sixMonths: [], full: [] };
  let heroHoverPoints = [];
  let heroStatusBaseText = '';
  let heroTooltip = null;
  let heroLiveUpdater = null;
  let currentHeroRange = 'sixMonths';

  const setHeroStatus = (text) => {
    setTextIfChanged(heroChartStatus, text);
    heroStatusBaseText = text;
  };

  const drawHeroChart = (points) => {
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

    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(0, 'rgba(12, 99, 255, 0.05)');
    backgroundGradient.addColorStop(0.6, 'rgba(12, 22, 43, 0.03)');
    backgroundGradient.addColorStop(1, 'rgba(12, 22, 43, 0.01)');
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

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

    ctx.strokeStyle = 'rgba(12, 22, 43, 0.07)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i += 1) {
      const y = padding.top + (i / gridLines) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(12, 22, 43, 0.55)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= gridLines; i += 1) {
      const value = max - (range * i) / gridLines;
      const y = padding.top + (i / gridLines) * chartHeight;
      ctx.fillText(formatShortPrice(value), padding.left - 12, y);
    }

    ctx.strokeStyle = 'rgba(12, 22, 43, 0.08)';
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
    gradient.addColorStop(0, 'rgba(12, 99, 255, 0.35)');
    gradient.addColorStop(0.55, 'rgba(12, 99, 255, 0.14)');
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
    const lineGradient = ctx.createLinearGradient(padding.left, padding.top, padding.left, height - padding.bottom);
    lineGradient.addColorStop(0, '#0f6fff');
    lineGradient.addColorStop(1, '#0a4dc2');

    ctx.shadowColor = 'rgba(12, 99, 255, 0.28)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;
    drawSmoothLine(ctx, linePoints, lineGradient, 3.8);
    ctx.shadowColor = 'transparent';

    heroHoverPoints = points.map((point, index) => ({
      x: linePoints[index].x,
      y: linePoints[index].y,
      price: point.price,
      time: point.time,
    }));

    const lastPoint = linePoints[linePoints.length - 1];
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f6fff';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const markerInterval = Math.max(1, Math.floor(points.length / 10));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(12, 99, 255, 0.68)';
    ctx.lineWidth = 2.4;
    linePoints.forEach((point, index) => {
      if (index % markerInterval !== 0 || index === linePoints.length - 1) return;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  };

  const ensureHeroTooltip = () => {
    if (heroTooltip || !heroChartWrapper) return;
    heroTooltip = document.createElement('div');
    heroTooltip.setAttribute('aria-hidden', 'true');
    heroTooltip.style.position = 'absolute';
    heroTooltip.style.pointerEvents = 'none';
    heroTooltip.style.background = '#0c63ff';
    heroTooltip.style.color = '#ffffff';
    heroTooltip.style.padding = '6px 10px';
    heroTooltip.style.borderRadius = '10px';
    heroTooltip.style.font = '12px Inter, system-ui, sans-serif';
    heroTooltip.style.boxShadow = '0 10px 30px rgba(12, 99, 255, 0.18)';
    heroTooltip.style.transform = 'translate(-50%, -120%)';
    heroTooltip.style.opacity = '0';
    heroTooltip.style.transition = 'opacity 120ms ease';
    heroChartWrapper.appendChild(heroTooltip);
  };

  const hideHeroTooltip = () => {
    if (!heroTooltip) return;
    heroTooltip.style.opacity = '0';
  };

  const renderHeroTooltip = (point) => {
    ensureHeroTooltip();
    if (!heroTooltip) return;
    heroTooltip.textContent = `${formatPrice(point.price)} · ${formatMonthDay(point.time)}`;
    heroTooltip.style.left = `${point.x}px`;
    heroTooltip.style.top = `${point.y}px`;
    heroTooltip.style.opacity = '1';
  };

  const restoreHeroStatus = () => {
    if (heroChartStatus && heroStatusBaseText) {
      heroChartStatus.textContent = heroStatusBaseText;
    }
  };

  const handleHeroHover = (event) => {
    if (!heroHoverPoints.length || !heroBtcChart) return;
    const rect = heroBtcChart.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let nearest = null;
    let minDistance = Infinity;
    heroHoverPoints.forEach((point) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    });

    if (nearest && minDistance <= 18) {
      renderHeroTooltip(nearest);
      setTextIfChanged(heroChartStatus, `${formatPrice(nearest.price)} · ${formatMonthDay(nearest.time)}`);
    } else {
      hideHeroTooltip();
      restoreHeroStatus();
    }
  };

  const renderHeroStats = (points, label) => {
    if (!points.length) return;
    const sorted = [...points].sort((a, b) => a.time - b.time);
    const latest = sorted[sorted.length - 1];
    const min = Math.min(...sorted.map((point) => point.price));
    const max = Math.max(...sorted.map((point) => point.price));
    const change = ((latest.price - sorted[0].price) / sorted[0].price) * 100;

    if (heroLatestClose) {
      setTextIfChanged(heroLatestClose, formatPrice(latest.price));
    }
    if (heroRange) {
      setTextIfChanged(heroRange, `${formatShortPrice(max)} / ${formatShortPrice(min)}`);
    }
    if (heroRangeChange) {
      const sign = change > 0 ? '+' : '';
      setTextIfChanged(heroRangeChange, `${sign}${change.toFixed(1)}%`);
      heroRangeChange.classList.toggle('positive', change >= 0);
      heroRangeChange.classList.toggle('negative', change < 0);
    }
    const labelText = label ? ` · ${label}` : '';
    setHeroStatus(`Through ${formatMonthDay(latest.time)}${labelText}`);
  };

  const loadHeroHistoryFrom = (points, rangeKey) => {
    if (!Array.isArray(points) || !points.length) return;
    const rangeLabel = HERO_HISTORY_RANGES[rangeKey]?.label;
    const normalized = rangeKey === 'full' ? extendHistoryTo2009(points) : points;
    const sorted = [...normalized].sort((a, b) => a.time - b.time);
    heroHistoryState[rangeKey] = sorted;
    drawHeroChart(sorted);
    renderHeroStats(sorted, rangeLabel);
  };

  const getFallbackHistory = (rangeKey) => (rangeKey === 'full' ? fallbackFullHistory : fallbackHistory);

  const updateHeroZoomButton = () => {
    if (!heroZoomButton) return;
    const isZoomedOut = currentHeroRange === 'full';
    heroZoomButton.textContent = isZoomedOut ? '↩️ Back to 6M view' : '🔍 Zoom out to 2009';
    heroZoomButton.setAttribute('aria-pressed', String(isZoomedOut));
  };

  const refreshHeroLatestPrice = async () => {
    try {
      const latest = await fetchLatestBTCPrice();
      Object.keys(heroHistoryState).forEach((rangeKey) => {
        const range = HERO_HISTORY_RANGES[rangeKey];
        if (!range || !heroHistoryState[rangeKey]?.length) return;

        const updated = updateChartWithLivePrice(heroHistoryState[rangeKey], latest);
        heroHistoryState[rangeKey] = updated;
        setCache(range.cacheKey, { points: updated }, HISTORY_TTL_MS);

        if (rangeKey === currentHeroRange) {
          drawHeroChart(updated);
          renderHeroStats(updated, range.label);
          const lastPoint = updated[updated.length - 1];
          setHeroStatus(`Through ${formatMonthDay(lastPoint.time)} · ${range.label}`);
        }
      });
    } catch (error) {
      // keep last known history
    }
  };

  const startHeroLiveUpdates = () => {
    if (heroLiveUpdater || !heroHistoryState[currentHeroRange]?.length) return;
    refreshHeroLatestPrice();
    heroLiveUpdater = setInterval(refreshHeroLatestPrice, HERO_LIVE_REFRESH_MS);
  };

  const loadHeroHistory = async (rangeKey) => {
    const range = HERO_HISTORY_RANGES[rangeKey];
    if (!range) return;

    const cached = getCache(range.cacheKey);
    if (cached?.value?.points?.length) {
      loadHeroHistoryFrom(cached.value.points, rangeKey);
      setHeroStatus(`Cached · ${range.label}`);
    } else {
      const fallback = getFallbackHistory(rangeKey);
      loadHeroHistoryFrom(fallback, rangeKey);
      setHeroStatus(`Fallback · ${range.label}`);
    }

    try {
      const liveHistory = await fetchHistoricalBTCData(range.days);
      if (liveHistory?.length) {
        setCache(range.cacheKey, { points: liveHistory }, HISTORY_TTL_MS);
        loadHeroHistoryFrom(liveHistory, rangeKey);
        setHeroStatus(`Through ${formatMonthDay(liveHistory[liveHistory.length - 1].time)} · ${range.label}`);
        startHeroLiveUpdates();
      }
    } catch (error) {
      setHeroStatus(`Offline fallback · ${range.label}`);
    }
  };

  const bootstrapHeroHistory = () => {
    updateHeroZoomButton();
    loadHeroHistory(currentHeroRange);
  };

  heroZoomButton?.addEventListener('click', () => {
    currentHeroRange = currentHeroRange === 'full' ? 'sixMonths' : 'full';
    updateHeroZoomButton();
    loadHeroHistory(currentHeroRange);
  });

  heroBtcChart.addEventListener('pointermove', handleHeroHover);
  heroBtcChart.addEventListener('pointerleave', () => {
    hideHeroTooltip();
    restoreHeroStatus();
  });

  window.addEventListener('resize', () => {
    const points = heroHistoryState[currentHeroRange];
    if (points?.length) {
      drawHeroChart(points);
    }
  });

  bootstrapHeroHistory();
};
