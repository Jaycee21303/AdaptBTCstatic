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

async function updateTicker() {
  if (!btcTicker) return;

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');

    if (!response.ok) {
      throw new Error('Ticker request failed');
    }

    const data = await response.json();
    const rate = data?.bitcoin?.usd;

    btcTicker.textContent = rate
      ? `BTC: $${Number(rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : 'BTC: --';
  } catch (error) {
    btcTicker.textContent = 'BTC: --';
  }
}

updateTicker();
setInterval(updateTicker, 30000);
