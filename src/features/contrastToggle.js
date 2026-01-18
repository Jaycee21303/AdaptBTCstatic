const STORAGE_KEY = 'adaptbtc_contrast_mode';

export const initContrastToggle = () => {
  const toggle = document.getElementById('contrastToggle');
  if (!toggle) return;

  const applyMode = (enabled) => {
    document.body.classList.toggle('contrast-high', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'high' : 'normal');
    } catch (error) {
      // ignore storage errors
    }
  };

  const saved = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  })();

  applyMode(saved === 'high');

  toggle.addEventListener('click', () => {
    const enabled = document.body.classList.contains('contrast-high');
    applyMode(!enabled);
  });
};
