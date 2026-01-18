const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FetchError extends Error {
  constructor(message, { status, type } = {}) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.type = type;
  }
}

const classifyError = (error) => {
  if (error?.name === 'AbortError') {
    return new FetchError('Request timed out', { type: 'timeout' });
  }
  if (error instanceof FetchError) return error;
  return new FetchError(error?.message || 'Network error', { type: 'network' });
};

export const fetchJson = async (url, { timeoutMs = 8000, retries = 1, backoff = 500 } = {}) => {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        throw new FetchError(`Request failed: ${response.status}`, {
          status: response.status,
          type: 'http',
        });
      }
      const data = await response.json();
      return { data, response };
    } catch (error) {
      lastError = classifyError(error);
      if (attempt >= retries) break;
      await sleep(backoff * Math.pow(2, attempt));
    } finally {
      clearTimeout(timeout);
    }

    attempt += 1;
  }

  throw lastError || new FetchError('Request failed', { type: 'unknown' });
};
