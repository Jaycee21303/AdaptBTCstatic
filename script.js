const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const form = document.getElementById('interestForm');
const feedback = document.getElementById('formFeedback');
const btcTicker = document.getElementById('btcTicker');
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

async function fetchCoinbasePrice() {
  const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coinbase request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.amount);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coinbase returned no price');
}

async function fetchCoingeckoPrice() {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&precision=2',
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error('Coingecko request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bitcoin?.usd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coingecko returned no price');
}

async function fetchCoindeskPrice() {
  const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice/BTC.json', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Coindesk request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bpi?.USD?.rate_float ?? data?.bpi?.USD?.rate?.replace(/,/g, ''));
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coindesk returned no price');
}

function renderTicker(priceText) {
  if (!btcTicker) return;

  btcTicker.innerHTML = `<span class="ticker-label">BTC</span> <span class="ticker-price">${priceText}</span>`;
}

async function updateTicker() {
  if (!btcTicker) return;

  renderTicker('$updating…');

  try {
    const price = await fetchCoinbasePrice().catch(() => fetchCoingeckoPrice().catch(fetchCoindeskPrice));

    if (Number.isFinite(price)) {
      currentBtcPrice = price;
      const formatted = `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      renderTicker(formatted);

      if (dcaPriceInput) {
        dcaPriceInput.value = price.toFixed(2);
      }

      return;
    }

    throw new Error('Invalid price');
  } catch (error) {
    renderTicker('$--');
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
