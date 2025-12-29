const resultsEl = document.querySelector('[data-fee-results]');
const statusEl = document.querySelector('[data-fee-status]');
const rateFastestEl = document.querySelector('[data-rate-fastest]');
const rateHalfEl = document.querySelector('[data-rate-half]');
const rateHourEl = document.querySelector('[data-rate-hour]');
const rateMinimumEl = document.querySelector('[data-rate-minimum]');
const refreshBtn = document.getElementById('fee-refresh');
const formEl = document.getElementById('fee-form');
const amountInput = document.getElementById('fee-amount');
const currencySelect = document.getElementById('fee-currency');
const prioritySelect = document.getElementById('fee-priority');

let latestPayload = null;

const formatUsd = value =>
  Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const formatNumber = value => Number(value || 0).toLocaleString('en-US');

const renderRates = payload => {
  if (!payload || !rateFastestEl) return;
  const { fees } = payload;
  rateFastestEl.textContent = fees.fastest ? `${fees.fastest} sat/vB` : '—';
  rateHalfEl.textContent = fees.half_hour ? `${fees.half_hour} sat/vB` : '—';
  rateHourEl.textContent = fees.hour ? `${fees.hour} sat/vB` : '—';
  rateMinimumEl.textContent = fees.minimum ? `${fees.minimum} sat/vB` : '—';

  if (statusEl) {
    const updated = new Date(payload.timestamp * 1000).toLocaleTimeString();
    statusEl.textContent = `Live mempool data · Updated ${updated}`;
    statusEl.classList.add('positive');
  }
};

const renderEstimate = () => {
  if (!resultsEl || !latestPayload) return;

  const amountRaw = parseFloat(amountInput?.value || '');
  if (Number.isNaN(amountRaw) || amountRaw <= 0) {
    resultsEl.innerHTML = '<div class="result">Enter an amount to see fee math.</div>';
    return;
  }

  const currency = currencySelect?.value || 'usd';
  const priority = prioritySelect?.value || 'fastest';
  const rates = latestPayload.fees || {};
  const rate = rates[priority];
  const assumedVbytes = latestPayload.assumptions?.vbytes || 140;
  const btcUsd = latestPayload.btc_usd || 0;

  if (!rate || !btcUsd) {
    resultsEl.innerHTML = '<div class="result">Fee data unavailable right now. Try refreshing.</div>';
    return;
  }
  const feeSats = rate * assumedVbytes;
  const feeBtc = feeSats / 1e8;
  const feeUsd = feeBtc * btcUsd;

  const sendBtc =
    currency === 'usd' ? amountRaw / (btcUsd || 1) : amountRaw;
  const sendUsd = currency === 'usd' ? amountRaw : amountRaw * btcUsd;

  const priorityLabel =
    priority === 'fastest'
      ? 'Fastest'
      : priority === 'half_hour'
        ? 'Next 30 minutes'
        : priority === 'hour'
          ? 'Next hour'
          : 'Economy';

  resultsEl.innerHTML = `
    <div class="result">
      <p><strong>${priorityLabel}</strong> fee for your send:</p>
      <p>${formatUsd(feeUsd)} (${formatNumber(feeSats)} sats) · ~${feeBtc.toFixed(6)} BTC</p>
      <p class="muted small">Based on ${rate} sat/vB and a ${assumedVbytes} vbyte transaction.</p>
      <div class="fee-breakdown">
        <div class="breakdown-tile">
          <div class="label">You’re sending</div>
          <div class="value">${formatUsd(sendUsd)} (~${sendBtc.toFixed(6)} BTC)</div>
        </div>
        <div class="breakdown-tile">
          <div class="label">Fee share of send</div>
          <div class="value">${((feeUsd / sendUsd) * 100).toFixed(2)}%</div>
        </div>
        <div class="breakdown-tile">
          <div class="label">BTC/USD price</div>
          <div class="value">${formatUsd(btcUsd)}</div>
        </div>
      </div>
    </div>
  `;
};

const loadFees = async () => {
  if (statusEl) statusEl.textContent = 'Loading fee data…';
  try {
    const response = await fetch('/api/network-fees');
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    latestPayload = data;
    renderRates(data);
    renderEstimate();
  } catch (error) {
    latestPayload = null;
    if (statusEl) statusEl.textContent = `Unable to load fees: ${error.message}`;
    if (resultsEl) {
      resultsEl.innerHTML = '<div class="result">Fee data unavailable right now. Try refreshing.</div>';
    }
  }
};

if (formEl) {
  formEl.addEventListener('submit', event => {
    event.preventDefault();
    renderEstimate();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    loadFees();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadFees();
});
