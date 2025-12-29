const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const form = document.getElementById('interestForm');
const feedback = document.getElementById('formFeedback');
const btcTicker = document.getElementById('btcTicker');

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
  const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
  if (!response.ok) throw new Error('Coinbase request failed');

  const data = await response.json();
  const amount = parseFloat(data?.data?.amount);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coinbase returned no price');
}

async function fetchCoingeckoPrice() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&precision=2');
  if (!response.ok) throw new Error('Coingecko request failed');

  const data = await response.json();
  const amount = parseFloat(data?.bitcoin?.usd);
  if (Number.isFinite(amount)) return amount;

  throw new Error('Coingecko returned no price');
}

async function updateTicker() {
  if (!btcTicker) return;

  btcTicker.textContent = 'BTC: updating…';

  try {
    const price = await fetchCoinbasePrice().catch(fetchCoingeckoPrice);

    btcTicker.textContent = price
      ? `BTC: $${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'BTC: --';
  } catch (error) {
    btcTicker.textContent = 'BTC: --';
  }
}

updateTicker();
setInterval(updateTicker, 30000);
