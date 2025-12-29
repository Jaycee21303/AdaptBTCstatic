const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('[data-nav-links]');
const priceEl = document.querySelector('[data-btc-price]');
const changeEl = document.querySelector('[data-btc-change]');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
}

const animateElements = () => {
  const items = document.querySelectorAll('[data-animate]');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  items.forEach(item => observer.observe(item));
};

const updateBtcTicker = async () => {
  if (!priceEl || !changeEl) return;

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
    );

    if (!response.ok) throw new Error('Failed to fetch BTC price');
    const data = await response.json();
    const price = data?.bitcoin?.usd;
    const change = data?.bitcoin?.usd_24h_change;

    if (typeof price !== 'number' || typeof change !== 'number') throw new Error('Invalid BTC data');

    priceEl.textContent = price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });

    const isPositive = change >= 0;
    changeEl.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}% 24h`;
    changeEl.classList.toggle('positive', isPositive);
    changeEl.classList.toggle('negative', !isPositive);
  } catch (error) {
    priceEl.textContent = '—';
    changeEl.textContent = 'Unavailable';
    changeEl.classList.remove('positive', 'negative');
  }
};

const startBtcTicker = () => {
  updateBtcTicker();
  setInterval(updateBtcTicker, 60000);
};

document.addEventListener('DOMContentLoaded', () => {
  animateElements();
  startBtcTicker();
});
