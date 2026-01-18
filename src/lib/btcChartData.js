const API_BASE = 'https://api.coingecko.com/api/v3';
const MINUTE_INTERVAL = 60_000;

const normalizeDays = (days) => {
  if (days === 'max') return 'max';
  const numeric = Number(days);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : '7';
};

const mapPriceSeries = (prices) =>
  prices
    .map((entry) => ({ time: Number(entry[0]), price: Number(entry[1]) }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.price));

export const fetchHistoricalBTCData = async (days) => {
  const normalizedDays = normalizeDays(days);
  const interval = normalizedDays === '1' || normalizedDays === '7' ? 'minute' : 'daily';
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: normalizedDays,
    interval,
  });

  const response = await fetch(`${API_BASE}/coins/bitcoin/market_chart?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('History request failed');

  const data = await response.json();
  const prices = Array.isArray(data?.prices) ? data.prices : [];
  const points = mapPriceSeries(prices);
  if (!points.length) throw new Error('Invalid history data');

  return points;
};

export const fetchLatestBTCPrice = async () => {
  const response = await fetch(`${API_BASE}/simple/price?ids=bitcoin&vs_currencies=usd`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Latest price request failed');

  const data = await response.json();
  const value = Number(data?.bitcoin?.usd);
  if (!Number.isFinite(value)) throw new Error('Invalid latest price');

  return { value, time: Date.now() };
};

export const updateChartWithLivePrice = (points, latestSample) => {
  if (!Array.isArray(points) || !points.length || !latestSample) return points || [];
  if (!Number.isFinite(latestSample.value)) return points;

  const updated = [...points];
  const lastPoint = updated[updated.length - 1];
  const sampleTime = Number.isFinite(latestSample.time) ? latestSample.time : Date.now();

  if (lastPoint && Math.abs(sampleTime - lastPoint.time) < MINUTE_INTERVAL) {
    updated[updated.length - 1] = { ...lastPoint, price: latestSample.value, time: sampleTime };
  } else {
    updated.push({ time: sampleTime, price: latestSample.value });
  }

  return updated;
};
