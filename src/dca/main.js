import './dca.css';
import { initNavToggle } from '../features/nav.js';
import { initContrastToggle } from '../features/contrastToggle.js';
import { initTicker } from '../features/ticker.js';
import { initDcaCalculator } from './calculator.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initContrastToggle();
  initTicker();
  initDcaCalculator();
});
