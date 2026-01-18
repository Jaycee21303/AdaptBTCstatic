export const createAlert = (payload) => {
  return {
    id: payload?.id || crypto.randomUUID(),
    price: payload?.price ?? null,
    direction: payload?.direction ?? 'above',
    createdAt: new Date().toISOString(),
    status: 'draft',
  };
};

export const validateAlert = (alert) => {
  if (!alert) return { valid: false, reason: 'Missing alert' };
  if (!Number.isFinite(alert.price)) return { valid: false, reason: 'Missing price' };
  return { valid: true };
};
