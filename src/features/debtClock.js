import { fetchJson } from '../lib/api.js';
import { getCache, setCache } from '../lib/cache.js';

const CACHE_KEY = 'adaptbtc_debt_cache_v2';
const CACHE_TTL_MS = 15 * 60_000;
const FETCH_INTERVAL_MS = 15 * 60_000;
const DISPLAY_REFRESH_MS = 15_000;

const formatDebtFull = (value) => {
  if (!Number.isFinite(value)) return '$--';
  return `$${Math.round(value).toLocaleString()}`;
};

const formatDebtChange = (value) => {
  if (!Number.isFinite(value)) return '--';
  const billions = value / 1_000_000_000;
  const sign = billions > 0 ? '+' : '';
  return `${sign}$${Math.abs(billions).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
};

const setTextIfChanged = (el, text) => {
  if (!el) return;
  if (el.textContent !== text) {
    el.textContent = text;
  }
};

export const initDebtClock = () => {
  const debtValue = document.getElementById('debtValue');
  const debtChange = document.getElementById('debtChange');
  const debtUpdated = document.getElementById('debtUpdated');
  const debtStatus = document.getElementById('debtStatus');

  if (!debtValue) return;

  let debtBaseline = null;
  let debtPerSecond = 0;
  let debtStartTime = Date.now();
  let debtDailyChange = null;

  const renderDebtEstimate = () => {
    if (!debtValue || debtBaseline === null) return;
    const elapsedSeconds = (Date.now() - debtStartTime) / 1000;
    const estimatedDebt = Math.floor(debtBaseline + debtPerSecond * elapsedSeconds);
    setTextIfChanged(debtValue, formatDebtFull(estimatedDebt));
    setTextIfChanged(debtStatus, 'Live');
  };

  const applyDebtSnapshot = (snapshot, statusLabel) => {
    debtBaseline = snapshot.total;
    debtDailyChange = snapshot.change;
    debtPerSecond = debtDailyChange / 86_400;
    debtStartTime = Date.now();

    if (debtChange) {
      setTextIfChanged(debtChange, formatDebtChange(debtDailyChange));
    }
    if (debtUpdated) {
      setTextIfChanged(debtUpdated, snapshot.dateLabel);
    }
    setTextIfChanged(debtStatus, statusLabel);
    renderDebtEstimate();
  };

  const fetchDebtClock = async () => {
    const fallback = {
      total: 34_800_000_000_000,
      change: 2_500_000_000,
      dateLabel: 'Fallback data',
    };

    const cached = getCache(CACHE_KEY);
    if (cached?.value && !cached.isExpired) {
      applyDebtSnapshot(cached.value, 'Cached');
    }

    try {
      const { data } = await fetchJson(
        'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[number]=1&page[size]=2',
        { timeoutMs: 9000, retries: 1, backoff: 500 }
      );
      const records = Array.isArray(data?.data) ? data.data : [];
      const latest = records[0];
      const previous = records[1];

      const latestDebt = Number(latest?.total_public_debt_outstanding);
      const previousDebt = Number(previous?.total_public_debt_outstanding);

      if (!Number.isFinite(latestDebt)) throw new Error('Invalid debt data');

      const snapshot = {
        total: latestDebt,
        change: Number.isFinite(previousDebt) ? latestDebt - previousDebt : 0,
        dateLabel: latest?.record_date ? new Date(latest.record_date).toLocaleDateString() : 'Latest update',
      };

      setCache(CACHE_KEY, snapshot, CACHE_TTL_MS);
      applyDebtSnapshot(snapshot, 'Live');
    } catch (error) {
      if (cached?.value) {
        applyDebtSnapshot(cached.value, 'Delayed');
      } else {
        applyDebtSnapshot(fallback, 'Offline fallback');
      }
    }
  };

  fetchDebtClock();
  setInterval(renderDebtEstimate, DISPLAY_REFRESH_MS);
  setInterval(fetchDebtClock, FETCH_INTERVAL_MS);
};
