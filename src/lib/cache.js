const canUseStorage = () => typeof localStorage !== 'undefined';

export const getCache = (key) => {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const expiresAt = Number(parsed.expiresAt);
    const isExpired = Number.isFinite(expiresAt) ? Date.now() > expiresAt : false;
    return {
      value: parsed.value,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
      isExpired,
      updatedAt: Number(parsed.updatedAt) || null,
    };
  } catch (error) {
    return null;
  }
};

export const setCache = (key, value, ttlMs) => {
  if (!canUseStorage()) return;
  const now = Date.now();
  const expiresAt = Number.isFinite(ttlMs) ? now + ttlMs : null;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        value,
        updatedAt: now,
        expiresAt,
      })
    );
  } catch (error) {
    // ignore storage errors
  }
};
