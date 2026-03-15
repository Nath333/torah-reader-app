import { fetchWithFallback, fetchWithTimeout, clearPendingRequests, getPendingRequestCount } from './http';

// Mock fetch
global.fetch = jest.fn();

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns response on successful fetch', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) };
    fetch.mockResolvedValueOnce(mockResponse);

    const responsePromise = fetchWithTimeout('https://api.example.com/test');
    jest.runAllTimers();
    const response = await responsePromise;

    expect(response).toEqual(mockResponse);
  });

  test('throws error on timeout', async () => {
    // Create a promise that never resolves
    fetch.mockImplementationOnce(() => new Promise(() => {}));

    const fetchPromise = fetchWithTimeout('https://api.example.com/test', {}, 100);

    // Fast-forward timers
    jest.advanceTimersByTime(150);

    await expect(fetchPromise).rejects.toThrow('Request timed out');
  });
});

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
