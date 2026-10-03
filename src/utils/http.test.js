import { fetchWithFallback, clearPendingRequests, getPendingRequestCount } from './http';

// Mock fetch
global.fetch = vi.fn();

describe('fetchWithFallback', () => {
  beforeEach(() => {
    fetch.mockClear();
    clearPendingRequests();
  });

  test('returns JSON data on successful fetch', async () => {
    const mockData = { result: 'success' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const result = await fetchWithFallback('https://api.example.com/test');
    expect(result).toEqual(mockData);
  });

  test('deduplicates concurrent requests to same URL', async () => {
    const mockData = { result: 'dedupe test' };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    // Make multiple concurrent requests to the same URL
    const promise1 = fetchWithFallback('https://api.example.com/same');
    const promise2 = fetchWithFallback('https://api.example.com/same');
    const promise3 = fetchWithFallback('https://api.example.com/same');

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    // All should get the same result
    expect(result1).toEqual(mockData);
    expect(result2).toEqual(mockData);
    expect(result3).toEqual(mockData);

    // Fetch should only be called once due to deduplication
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('allows disabling deduplication', async () => {
    const mockData = { result: 'no dedupe' };
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const promise1 = fetchWithFallback('https://api.example.com/nodedupe', { dedupe: false });
    const promise2 = fetchWithFallback('https://api.example.com/nodedupe', { dedupe: false });

    await Promise.all([promise1, promise2]);

    // Fetch should be called twice when deduplication is disabled
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('clears pending request after completion', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' })
    });

    expect(getPendingRequestCount()).toBe(0);

    await fetchWithFallback('https://api.example.com/clear-test');

    expect(getPendingRequestCount()).toBe(0);
  });
});

describe('clearPendingRequests', () => {
  test('clears all pending requests', () => {
    clearPendingRequests();
    expect(getPendingRequestCount()).toBe(0);
  });
});

describe('fetchWithFallback — sans proxy tiers', () => {
  beforeEach(() => {
    fetch.mockReset();
    clearPendingRequests();
  });

  test('échoue après un seul appel en cas d erreur réseau directe (pas de repli allorigins)', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchWithFallback('https://api.example.com/fail')).rejects.toThrow('Failed to fetch');

    // Exactement un appel : aucun second appel vers un proxy tiers
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/fail');
  });

  test('échoue sur HTTP 500 sans appel supplémentaire', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(fetchWithFallback('https://api.example.com/err500')).rejects.toThrow('HTTP 500');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('429 marque le domaine limité sans appel proxy', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '60' }
    });

    await expect(fetchWithFallback('https://api.example.com/limited')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
