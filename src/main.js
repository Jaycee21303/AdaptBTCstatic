import './styles.css';
import { initNavToggle } from './features/nav.js';
import { initContrastToggle } from './features/contrastToggle.js';
import { initTicker } from './features/ticker.js';
import { initHeroChart } from './features/heroChart.js';
import { initDebtClock } from './features/debtClock.js';
import { initEducationHub } from './educationHub.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initContrastToggle();
  initTicker();
  initHeroChart();
  initDebtClock();
  initEducationHub();
});
