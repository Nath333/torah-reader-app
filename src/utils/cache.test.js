/**
 * Cache Utility Tests
 *
 * Tests the unified cache system including:
 * - Basic cache operations (get, set, has, delete, clear)
 * - TTL expiration
 * - Size limits
 * - Cached fetcher HOF
 * - Cache presets
 * - withCache decorator
 */

import {
  createCache,
  createCachedFetcher,
  withCache,
  CACHE_PRESETS,
  apiCache,
  translationCache,
  verseCache
} from './cache';

describe('createCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic operations', () => {
    it('should create a cache instance with default options', () => {
      const cache = createCache();

      expect(cache.get).toBeInstanceOf(Function);
      expect(cache.set).toBeInstanceOf(Function);
      expect(cache.has).toBeInstanceOf(Function);
      expect(cache.delete).toBeInstanceOf(Function);
      expect(cache.clear).toBeInstanceOf(Function);
      expect(cache.stats).toBeInstanceOf(Function);
    });

    it('should set and get a value', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const cache = createCache();

      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing value', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should store complex objects', () => {
      const cache = createCache();
      const complexValue = { a: 1, b: [2, 3], c: { nested: true } };

      cache.set('complex', complexValue);
      expect(cache.get('complex')).toEqual(complexValue);
    });

    it('should store null and undefined values', () => {
      const cache = createCache();

      cache.set('nullKey', null);
      cache.set('undefinedKey', undefined);

      // Note: Both null and undefined are stored as data
      // The get method returns the actual stored value
      // null returns null, undefined returns undefined
      expect(cache.get('nullKey')).toBeNull();
      expect(cache.get('undefinedKey')).toBeUndefined();
    });
  });

  describe('has method', () => {
    it('should return true for existing key', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const cache = createCache();

      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete method', () => {
    it('should delete existing key', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should not throw for non-existent key', () => {
      const cache = createCache();

      expect(() => cache.delete('nonexistent')).not.toThrow();
    });
  });

  describe('clear method', () => {
    it('should remove all entries', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should return value before TTL expires', () => {
      const cache = createCache({ ttl: 1000 }); // 1 second TTL

      cache.set('key1', 'value1');

      // Advance time by 500ms (half the TTL)
      jest.advanceTimersByTime(500);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null after TTL expires', () => {
      const cache = createCache({ ttl: 1000 }); // 1 second TTL

      cache.set('key1', 'value1');

      // Advance time past TTL
      jest.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeNull();
    });

    it('should use default TTL of 5 minutes', () => {
      const cache = createCache();
      const stats = cache.stats();

      expect(stats.ttl).toBe(5 * 60 * 1000);
    });

    it('should delete expired entry on access', () => {
      const cache = createCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);

      // This access should delete the expired entry
      cache.get('key1');

      // Verify it's deleted
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('size limit', () => {
    it('should enforce maxSize limit', () => {
      const cache = createCache({ maxSize: 3 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict oldest

      expect(cache.stats().size).toBeLessThanOrEqual(3);
    });

    it('should evict oldest entry when limit reached', () => {
      const cache = createCache({ maxSize: 2 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should use default maxSize of 500', () => {
      const cache = createCache();
      const stats = cache.stats();

      expect(stats.maxSize).toBe(500);
    });
  });

  describe('stats method', () => {
    it('should return cache statistics', () => {
      const cache = createCache({ ttl: 5000, maxSize: 100 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.ttl).toBe(5000);
    });
  });
});

describe('CACHE_PRESETS', () => {
  it('should have fast preset', () => {
    expect(CACHE_PRESETS.fast).toEqual({
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 500
    });
  });

  it('should have standard preset', () => {
    expect(CACHE_PRESETS.standard).toEqual({
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 200
    });
  });

  it('should have stable preset', () => {
    expect(CACHE_PRESETS.stable).toEqual({
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 300
    });
  });

  it('should have persistent preset', () => {
    expect(CACHE_PRESETS.persistent).toEqual({
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 1000
    });
  });

  it('should have translations preset', () => {
    expect(CACHE_PRESETS.translations).toEqual({
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 5000
    });
  });
});

describe('createCachedFetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return fetch, clear, stats, and cache', () => {
    const fetcher = jest.fn();
    const result = createCachedFetcher(fetcher);

    expect(result.fetch).toBeInstanceOf(Function);
    expect(result.clear).toBeInstanceOf(Function);
    expect(result.stats).toBeInstanceOf(Function);
    expect(result.cache).toBeDefined();
  });

  it('should call fetcher on first request', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher);

    const result = await fetch('arg1');

    expect(fetcher).toHaveBeenCalledWith('arg1');
    expect(result).toBe('result');
  });

  it('should return cached value on subsequent requests', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher);

    await fetch('arg1');
    const result = await fetch('arg1');

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('should track hits and misses in stats', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch, stats } = createCachedFetcher(fetcher);

    await fetch('arg1'); // Miss
    await fetch('arg1'); // Hit
    await fetch('arg1'); // Hit

    const s = stats();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBe('66.7%');
  });

  it('should use prefix for key generation', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher, { prefix: 'test' });

    await fetch('arg1');
    await fetch('arg2');

    // Different args should result in different cache entries
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('should use custom key generator', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher, {
      keyGenerator: (obj) => obj.id
    });

    await fetch({ id: 'test', other: 1 });
    await fetch({ id: 'test', other: 2 }); // Same id, different other

    // Should hit cache because key is the same
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should use preset configuration', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { stats } = createCachedFetcher(fetcher, { preset: 'standard' });

    const s = stats();
    expect(s.ttl).toBe(30 * 60 * 1000); // Standard preset TTL
  });

  it('should clear cache and reset stats', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch, clear, stats } = createCachedFetcher(fetcher);

    await fetch('arg1');
    await fetch('arg1');

    clear();

    const s = stats();
    expect(s.hits).toBe(0);
    expect(s.misses).toBe(0);
    expect(s.hitRate).toBe('N/A');
  });

  it('should handle multiple arguments', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher);

    await fetch('arg1', 'arg2', 'arg3');
    await fetch('arg1', 'arg2', 'arg3');

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  it('should handle object arguments', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher);

    const obj = { book: 'Genesis', chapter: 1 };
    await fetch(obj);
    await fetch({ book: 'Genesis', chapter: 1 });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should call fetcher with different args', async () => {
    const fetcher = jest.fn().mockResolvedValue('result');
    const { fetch } = createCachedFetcher(fetcher);

    await fetch('arg1');
    await fetch('arg2');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('withCache', () => {
  it('should wrap specified methods with caching', async () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data'),
      postData: jest.fn().mockResolvedValue('posted')
    };

    const cachedApi = withCache(api, ['getData']);

    await cachedApi.getData('arg1');
    await cachedApi.getData('arg1');

    expect(api.getData).toHaveBeenCalledTimes(1);
  });

  it('should not wrap unspecified methods', async () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data'),
      postData: jest.fn().mockResolvedValue('posted')
    };

    const cachedApi = withCache(api, ['getData']);

    await cachedApi.postData('arg1');
    await cachedApi.postData('arg1');

    expect(api.postData).toHaveBeenCalledTimes(2);
  });

  it('should add _clearAllCaches method', () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data')
    };

    const cachedApi = withCache(api, ['getData']);

    expect(cachedApi._clearAllCaches).toBeInstanceOf(Function);
  });

  it('should add _getStats method', async () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data')
    };

    const cachedApi = withCache(api, ['getData']);

    await cachedApi.getData('arg1');

    const stats = cachedApi._getStats();
    expect(stats.getData).toBeDefined();
    expect(stats.getData.misses).toBe(1);
  });

  it('should clear all caches with _clearAllCaches', async () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data'),
      getMore: jest.fn().mockResolvedValue('more')
    };

    const cachedApi = withCache(api, ['getData', 'getMore']);

    await cachedApi.getData('arg1');
    await cachedApi.getMore('arg2');

    cachedApi._clearAllCaches();

    await cachedApi.getData('arg1');
    await cachedApi.getMore('arg2');

    expect(api.getData).toHaveBeenCalledTimes(2);
    expect(api.getMore).toHaveBeenCalledTimes(2);
  });

  it('should skip non-function properties', () => {
    const api = {
      getData: jest.fn().mockResolvedValue('data'),
      value: 'static'
    };

    const cachedApi = withCache(api, ['getData', 'value']);

    expect(cachedApi.value).toBe('static');
  });
});

describe('pre-configured cache instances', () => {
  it('should export apiCache with fast preset', () => {
    const stats = apiCache.stats();
    expect(stats.ttl).toBe(CACHE_PRESETS.fast.ttl);
    expect(stats.maxSize).toBe(CACHE_PRESETS.fast.maxSize);
  });

  it('should export translationCache with translations preset', () => {
    const stats = translationCache.stats();
    expect(stats.ttl).toBe(CACHE_PRESETS.translations.ttl);
    expect(stats.maxSize).toBe(CACHE_PRESETS.translations.maxSize);
  });

  it('should export verseCache with stable preset', () => {
    const stats = verseCache.stats();
    expect(stats.ttl).toBe(CACHE_PRESETS.stable.ttl);
    expect(stats.maxSize).toBe(CACHE_PRESETS.stable.maxSize);
  });

  it('should allow operations on pre-configured caches', () => {
    // Clean up first
    apiCache.clear();

    apiCache.set('test', 'value');
    expect(apiCache.get('test')).toBe('value');

    apiCache.clear();
    expect(apiCache.get('test')).toBeNull();
  });
});

describe('edge cases', () => {
  it('should handle empty string key', () => {
    const cache = createCache();

    cache.set('', 'emptyKey');
    expect(cache.get('')).toBe('emptyKey');
  });

  it('should handle very long keys', () => {
    const cache = createCache();
    const longKey = 'a'.repeat(10000);

    cache.set(longKey, 'value');
    expect(cache.get(longKey)).toBe('value');
  });

  it('should handle special characters in keys', () => {
    const cache = createCache();
    const specialKey = '!@#$%^&*()[]{}|;:\'",.<>?/\\`~';

    cache.set(specialKey, 'value');
    expect(cache.get(specialKey)).toBe('value');
  });

  it('should handle unicode keys', () => {
    const cache = createCache();
    const unicodeKey = 'בראשית_ברא_אלהים';

    cache.set(unicodeKey, 'value');
    expect(cache.get(unicodeKey)).toBe('value');
  });

  it('should handle rapid set/get operations', () => {
    const cache = createCache({ maxSize: 10 });

    for (let i = 0; i < 100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // Should not throw and should have at most maxSize entries
    expect(cache.stats().size).toBeLessThanOrEqual(10);
  });
});
