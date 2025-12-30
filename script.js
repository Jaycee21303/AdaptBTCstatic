const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const form = document.getElementById('interestForm');
const feedback = document.getElementById('formFeedback');
const btcTicker = document.getElementById('btcTicker');
const btcTickerPrice = document.querySelector('#btcTicker .ticker-price');
const heroLivePrice = document.getElementById('heroLivePrice');
const priceTimestamp = document.getElementById('priceTimestamp');
const learningNotice = document.getElementById('learningNotice');
const learningLinks = document.querySelectorAll('a[href="#learning"]');
const dcaForm = document.getElementById('dcaForm');
const dcaPriceInput = document.getElementById('dcaPrice');
const dcaResults = document.getElementById('dcaResults');

let currentBtcPrice = null;

navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('open');
});

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = formData.get('email');

  feedback.textContent = email ? `Thanks, ${email}! We'll reach out soon.` : 'Thanks for reaching out!';
  feedback.style.color = 'var(--primary)';
  form.reset();
});

function fetchWithTimeout(url, options = {}, timeout = 7000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout)),
  ]);
}

async function fetchCoincapPrice() {
  const response = await fetchWithTimeout('https://api.coincap.io/v2/assets/bitcoin', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coincap request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.priceUsd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coincap returned no price');
}

async function fetchCoinbasePrice() {
  const response = await fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coinbase request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.amount);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coinbase returned no price');
}

async function fetchBinancePrice() {
  const response = await fetchWithTimeout('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Binance request failed');

  const data = await response.json();
  const amount = parseFloat(data?.price);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Binance returned no price');
}

async function fetchBitfinexPrice() {
  const response = await fetchWithTimeout('https://api-pub.bitfinex.com/v2/ticker/tBTCUSD', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Bitfinex request failed');

  const data = await response.json();
  const amount = Array.isArray(data) ? parseFloat(data[6]) : NaN;
  if (Number.isFinite(amount)) return amount;

  throw new Error('Bitfinex returned no price');
}

function renderTicker(priceText) {
  if (btcTickerPrice) {
    btcTickerPrice.textContent = priceText;
  }

  if (heroLivePrice) {
    heroLivePrice.textContent = priceText;
  }
}

async function updateTicker() {
  if (!btcTicker) return;

  try {
    const price = await fetchBinancePrice()
      .catch(() => fetchCoinbasePrice())
      .catch(() => fetchCoincapPrice())
      .catch(() => fetchBitfinexPrice());

    if (Number.isFinite(price)) {
      currentBtcPrice = price;
      const formatted = `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      renderTicker(formatted);

      if (priceTimestamp) {
        priceTimestamp.textContent = new Date().toLocaleString();
      }

      if (dcaPriceInput) {
        dcaPriceInput.value = price.toFixed(2);
      }

      return;
    }

    throw new Error('Invalid price');
  } catch (error) {
    if (Number.isFinite(currentBtcPrice)) {
      const fallback = `$${Number(currentBtcPrice).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
      renderTicker(fallback);
      return;
    }

    renderTicker('$--');

    if (priceTimestamp) {
      priceTimestamp.textContent = 'Ticker unavailable';
    }
  }
}

updateTicker();
setInterval(updateTicker, 30000);

function showLearningNotice(event) {
  if (!learningNotice) return;

  learningNotice.classList.add('show');
  learningNotice.textContent = 'Learning Portal Coming Soon';

  setTimeout(() => learningNotice.classList.remove('show'), 2800);
}

learningLinks.forEach((link) => {
  link.addEventListener('click', showLearningNotice);
});

function formatCurrency(value) {
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBtc(value) {
  return `${Number(value).toFixed(6)} BTC`;
}

function handleDcaCalculation(event) {
  event.preventDefault();

  const amount = Number.parseFloat(document.getElementById('dcaAmount')?.value ?? '0');
  const frequency = Number.parseFloat(document.getElementById('dcaFrequency')?.value ?? '1');
  const months = Number.parseInt(document.getElementById('dcaMonths')?.value ?? '0', 10);
  const growth = Number.parseFloat(document.getElementById('dcaGrowth')?.value ?? '0');
  const priceFromInput = Number.parseFloat(dcaPriceInput?.value ?? '0');
  const price = Number.isFinite(priceFromInput) && priceFromInput > 0 ? priceFromInput : currentBtcPrice;

  if (!Number.isFinite(price) || price <= 0) {
    dcaResults.textContent = 'Please wait for the live BTC price or enter your own to calculate.';
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0) {
    dcaResults.textContent = 'Enter a contribution amount and duration greater than zero.';
    return;
  }

  const totalContribution = amount * frequency * months;
  const btcAccumulated = totalContribution / price;
  const projectedPrice = price * Math.pow(1 + growth / 100, months / 12);
  const projectedValue = btcAccumulated * projectedPrice;
  const cadence = frequency === 1 ? 'each month' : `${frequency.toFixed(2)} times per month`;

  dcaResults.innerHTML = `
    Investing <strong>${formatCurrency(amount)}</strong> ${cadence}
    for <strong>${months} month${months === 1 ? '' : 's'}</strong> totals <strong>${formatCurrency(totalContribution)}</strong>.<br>
    At an average BTC price of <strong>${formatCurrency(price)}</strong>, you would accumulate <strong>${formatBtc(btcAccumulated)}</strong>.<br>
    With a ${growth}% annual growth assumption, your stack could be worth <strong>${formatCurrency(projectedValue)}</strong> at the end of the period.
  `;
}

if (dcaForm && dcaResults) {
  dcaForm.addEventListener('submit', handleDcaCalculation);
}
