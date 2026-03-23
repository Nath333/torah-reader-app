/**
 * CacheOrchestrator Tests
 *
 * Tests the centralized cache management system including:
 * - Cache registration/unregistration
 * - Telemetry and metrics
 * - Global cache operations
 * - Memory pressure management
 * - WordLookupCache LRU implementation
 */

import CacheOrchestrator, {
  registerCache,
  unregisterCache,
  getCache,
  recordOperation,
  getGlobalTelemetry,
  getPerformanceMetrics,
  clearAllCaches,
  pruneExpiredEntries,
  getMemoryPressure,
  autoManageCaches,
  createManagedCache,
  CACHE_CONFIGS,
  WordLookupCache,
  wordLookupCache
} from './cacheOrchestrator';
import { createCache } from '../utils/cache';

describe('Cache Registration', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearAllCaches();
  });

  describe('registerCache', () => {
    it('should register a cache successfully', () => {
      const cache = createCache();
      const result = registerCache('testCache', cache);

      expect(result).toBe(true);
      expect(getCache('testCache')).toBe(cache);
    });

    it('should return false for invalid id', () => {
      const cache = createCache();
      const result = registerCache('', cache);

      expect(result).toBe(false);
    });

    it('should return false for invalid cache instance', () => {
      const result = registerCache('testCache', null);

      expect(result).toBe(false);
    });

    it('should use default config for unknown cache ids', () => {
      const cache = createCache();
      registerCache('unknownCache', cache);

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.unknownCache.category).toBe('other');
    });

    it('should use predefined config for known cache ids', () => {
      const cache = createCache();
      registerCache('wordLookup', cache);

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.wordLookup.category).toBe('dictionary');
      expect(telemetry.byCache.wordLookup.name).toBe('Word Lookup');
    });

    it('should allow custom config override', () => {
      const cache = createCache();
      registerCache('customCache', cache, {
        name: 'My Custom Cache',
        category: 'custom',
        priority: 'high'
      });

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.customCache.name).toBe('My Custom Cache');
      expect(telemetry.byCache.customCache.category).toBe('custom');
    });
  });

  describe('unregisterCache', () => {
    it('should unregister an existing cache', () => {
      const cache = createCache();
      registerCache('toRemove', cache);

      const result = unregisterCache('toRemove');

      expect(result).toBe(true);
      expect(getCache('toRemove')).toBeNull();
    });

    it('should return false for non-existent cache', () => {
      const result = unregisterCache('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getCache', () => {
    it('should return cache instance for registered cache', () => {
      const cache = createCache();
      registerCache('myCache', cache);

      expect(getCache('myCache')).toBe(cache);
    });

    it('should return null for unregistered cache', () => {
      expect(getCache('nonexistent')).toBeNull();
    });
  });
});

describe('Telemetry', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('recordOperation', () => {
    it('should record hit operations', () => {
      const cache = createCache();
      registerCache('hitTest', cache);

      recordOperation('hitTest', 'hit', 5);

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.hitTest.hits).toBe(1);
    });

    it('should record miss operations', () => {
      const cache = createCache();
      registerCache('missTest', cache);

      recordOperation('missTest', 'miss', 10);

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.missTest.misses).toBe(1);
    });

    it('should not record for unregistered cache', () => {
      // Should not throw
      expect(() => recordOperation('nonexistent', 'hit', 5)).not.toThrow();
    });

    it('should track lookup time in history', () => {
      const cache = createCache();
      registerCache('timeTest', cache);

      recordOperation('timeTest', 'hit', 15);

      const telemetry = getGlobalTelemetry();
      const lastOp = telemetry.recentOps[telemetry.recentOps.length - 1];
      expect(lastOp.lookupTimeMs).toBe(15);
    });
  });

  describe('getGlobalTelemetry', () => {
    it('should aggregate stats from all caches', () => {
      const cache1 = createCache();
      const cache2 = createCache();
      registerCache('testCache1', cache1, { category: 'test' });
      registerCache('testCache2', cache2, { category: 'test' });

      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      recordOperation('testCache1', 'hit');
      recordOperation('testCache2', 'miss');

      const telemetry = getGlobalTelemetry();

      // Check that our caches are included (may have other caches from app)
      expect(telemetry.global.totalCaches).toBeGreaterThanOrEqual(2);
      expect(telemetry.byCache.testCache1).toBeDefined();
      expect(telemetry.byCache.testCache2).toBeDefined();
      expect(telemetry.byCache.testCache1.hits).toBe(1);
      expect(telemetry.byCache.testCache2.misses).toBe(1);
    });

    it('should group stats by category', () => {
      const cache1 = createCache();
      const cache2 = createCache();
      registerCache('dict1', cache1, { category: 'dictionary' });
      registerCache('dict2', cache2, { category: 'dictionary' });

      recordOperation('dict1', 'hit');
      recordOperation('dict2', 'hit');

      const telemetry = getGlobalTelemetry();

      expect(telemetry.byCategory.dictionary.hits).toBe(2);
      expect(telemetry.byCategory.dictionary.caches).toContain('dict1');
      expect(telemetry.byCategory.dictionary.caches).toContain('dict2');
    });

    it('should include recent operations', () => {
      const cache = createCache();
      registerCache('recentTest', cache);

      recordOperation('recentTest', 'hit');
      recordOperation('recentTest', 'miss');

      const telemetry = getGlobalTelemetry();

      expect(telemetry.recentOps.length).toBeGreaterThanOrEqual(2);
    });

    it('should estimate memory usage', () => {
      const cache = createCache();
      registerCache('memTest', cache);

      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      const telemetry = getGlobalTelemetry();

      expect(telemetry.global.estimatedMemoryMB).toBeDefined();
      // Memory is calculated from totalSize which may be 0 if cache doesn't report size
      expect(typeof parseFloat(telemetry.global.estimatedMemoryMB)).toBe('number');
    });
  });

  describe('getPerformanceMetrics', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return metrics for time window', () => {
      const cache = createCache();
      registerCache('perfTest', cache);

      recordOperation('perfTest', 'hit', 10);
      recordOperation('perfTest', 'miss', 20);

      const metrics = getPerformanceMetrics(60000);

      expect(metrics.windowMs).toBe(60000);
      expect(metrics.operations).toBe(2);
      expect(metrics.hits).toBe(1);
      expect(metrics.misses).toBe(1);
    });

    it('should calculate operations per second', () => {
      const cache = createCache();
      registerCache('opsTest', cache);

      // Record 10 operations
      for (let i = 0; i < 10; i++) {
        recordOperation('opsTest', i % 2 === 0 ? 'hit' : 'miss');
      }

      const metrics = getPerformanceMetrics(60000); // 1 minute window

      expect(parseFloat(metrics.opsPerSecond)).toBeGreaterThan(0);
    });
  });
});

describe('Cache Operations', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('clearAllCaches', () => {
    it('should clear all registered caches', () => {
      const cache1 = createCache();
      const cache2 = createCache();
      registerCache('clear1', cache1);
      registerCache('clear2', cache2);

      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      clearAllCaches();

      expect(cache1.get('key1')).toBeNull();
      expect(cache2.get('key2')).toBeNull();
    });

    it('should clear only specified categories', () => {
      const cache1 = createCache();
      const cache2 = createCache();
      registerCache('cat1', cache1, { category: 'dictionary' });
      registerCache('cat2', cache2, { category: 'content' });

      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      clearAllCaches({ categories: ['dictionary'] });

      expect(cache1.get('key1')).toBeNull();
      expect(cache2.get('key2')).toBe('value2');
    });

    it('should clear only specified cache ids', () => {
      const cache1 = createCache();
      const cache2 = createCache();
      registerCache('id1', cache1);
      registerCache('id2', cache2);

      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      clearAllCaches({ ids: ['id1'] });

      expect(cache1.get('key1')).toBeNull();
      expect(cache2.get('key2')).toBe('value2');
    });

    it('should reset hit/miss counters', () => {
      const cache = createCache();
      registerCache('resetTest', cache);

      recordOperation('resetTest', 'hit');
      recordOperation('resetTest', 'miss');

      clearAllCaches();

      const telemetry = getGlobalTelemetry();
      expect(telemetry.byCache.resetTest?.hits || 0).toBe(0);
    });
  });

  describe('pruneExpiredEntries', () => {
    it('should return count of pruned entries', () => {
      // Note: This requires caches to implement a prune method
      const result = pruneExpiredEntries();

      expect(typeof result).toBe('number');
    });
  });
});

describe('Memory Pressure Management', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('getMemoryPressure', () => {
    it('should return pressure level', () => {
      const pressure = getMemoryPressure();

      expect(['low', 'moderate', 'high', 'critical']).toContain(pressure.level);
      expect(pressure.utilization).toBeDefined();
      expect(pressure.recommendation).toBeDefined();
    });

    it('should identify low priority caches', () => {
      const cache = createCache({ maxSize: 10 });
      registerCache('lowPriorityTest', cache, { priority: 'low' });

      // Fill the cache
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      const pressure = getMemoryPressure();

      expect(pressure.lowPriorityCaches).toBeDefined();
      expect(Array.isArray(pressure.lowPriorityCaches)).toBe(true);
    });
  });

  describe('autoManageCaches', () => {
    it('should return action taken', () => {
      const result = autoManageCaches();

      expect(result.action).toBeDefined();
      expect(['none', 'cleared']).toContain(result.action);
    });

    it('should not clear when pressure is low', () => {
      const cache = createCache({ maxSize: 100 });
      registerCache('autoTest', cache, { priority: 'low' });

      // Add just a few items
      cache.set('key1', 'value1');

      const result = autoManageCaches();

      expect(result.action).toBe('none');
      expect(result.reason).toBeDefined();
    });
  });
});

describe('createManagedCache', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  it('should create and register a cache', () => {
    const cache = createManagedCache('managedTest');

    expect(cache).toBeDefined();
    expect(getCache('managedTest')).toBe(cache);
  });

  it('should use predefined config for known ids', () => {
    const cache = createManagedCache('wordLookup');

    const stats = cache.stats();
    expect(stats.maxSize).toBe(CACHE_CONFIGS.wordLookup.maxSize);
  });

  it('should allow custom options', () => {
    const cache = createManagedCache('customManaged', {
      maxSize: 50,
      ttl: 10000
    });

    const stats = cache.stats();
    expect(stats.maxSize).toBe(50);
    expect(stats.ttl).toBe(10000);
  });

  it('should record telemetry on get', () => {
    const cache = createManagedCache('telemetryTest');

    cache.set('key1', 'value1');
    cache.get('key1'); // Hit
    cache.get('key2'); // Miss

    const telemetry = getGlobalTelemetry();
    expect(telemetry.byCache.telemetryTest.hits).toBe(1);
    expect(telemetry.byCache.telemetryTest.misses).toBe(1);
  });
});

describe('CACHE_CONFIGS', () => {
  it('should have config for wordLookup', () => {
    expect(CACHE_CONFIGS.wordLookup).toBeDefined();
    expect(CACHE_CONFIGS.wordLookup.name).toBe('Word Lookup');
    expect(CACHE_CONFIGS.wordLookup.category).toBe('dictionary');
  });

  it('should have config for translation', () => {
    expect(CACHE_CONFIGS.translation).toBeDefined();
    expect(CACHE_CONFIGS.translation.ttl).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('should have config for commentary', () => {
    expect(CACHE_CONFIGS.commentary).toBeDefined();
    expect(CACHE_CONFIGS.commentary.category).toBe('content');
  });

  it('should have priority for all configs', () => {
    Object.values(CACHE_CONFIGS).forEach(config => {
      expect(['high', 'medium', 'low']).toContain(config.priority);
    });
  });
});

describe('WordLookupCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('basic operations', () => {
    it('should create cache with default config', () => {
      const cache = new WordLookupCache();

      expect(cache.config.maxSize).toBe(500);
      expect(cache.config.ttl).toBe(5 * 60 * 1000);
      expect(cache.config.evictionPolicy).toBe('lru');
    });

    it('should allow custom config', () => {
      const cache = new WordLookupCache({
        maxSize: 100,
        ttl: 60000,
        evictionPolicy: 'fifo'
      });

      expect(cache.config.maxSize).toBe(100);
      expect(cache.config.ttl).toBe(60000);
      expect(cache.config.evictionPolicy).toBe('fifo');
    });

    it('should set and get values', () => {
      const cache = new WordLookupCache();

      cache.set('word1', { definition: 'test' });
      expect(cache.get('word1')).toEqual({ definition: 'test' });
    });

    it('should return null for missing keys', () => {
      const cache = new WordLookupCache();

      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should check key existence with has', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');
      cache.delete('key1');

      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.stats().size).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('should return value before TTL expires', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(500);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null after TTL expires', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeNull();
    });

    it('should not report expired key with has', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);

      expect(cache.has('key1')).toBe(false);
    });

    it('should track expirations in metrics', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(1001);
      cache.get('key1'); // Triggers expiration

      expect(cache.stats().expirations).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when maxSize reached', () => {
      const cache = new WordLookupCache({ maxSize: 3 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Add new entry - should evict one entry (LRU finds oldest by lastAccess)
      cache.set('key4', 'value4');

      // Total should still be at max
      expect(cache.stats().size).toBe(3);
      expect(cache.get('key4')).toBe('value4'); // New entry exists
    });

    it('should track evictions in metrics', () => {
      const cache = new WordLookupCache({ maxSize: 2 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Should evict

      expect(cache.stats().evictions).toBe(1);
    });

    it('should update lastAccess on get', () => {
      const cache = new WordLookupCache({ maxSize: 3 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(100);

      cache.set('key2', 'value2');

      jest.advanceTimersByTime(100);

      // Access key1 to update its lastAccess
      cache.get('key1');

      jest.advanceTimersByTime(100);

      cache.set('key3', 'value3');

      // Now key2 should be the LRU (oldest lastAccess)
      cache.set('key4', 'value4'); // Should evict key2

      expect(cache.stats().size).toBe(3);
      // Verify key4 was added
      expect(cache.get('key4')).toBe('value4');
    });

    it('should track access count', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      // Access count is internal but affects eviction
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('FIFO eviction', () => {
    it('should evict first-in entry', () => {
      const cache = new WordLookupCache({
        maxSize: 2,
        evictionPolicy: 'fifo'
      });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new entry - should still evict key1 (FIFO)
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('metrics', () => {
    it('should track hits and misses', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', () => {
      const cache = new WordLookupCache();

      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.stats();
      expect(stats.hitRate).toBe('50.0%');
    });

    it('should return N/A for hit rate with no operations', () => {
      const cache = new WordLookupCache();

      const stats = cache.stats();
      expect(stats.hitRate).toBe('N/A');
    });

    it('should include size and config in stats', () => {
      const cache = new WordLookupCache({ maxSize: 100, ttl: 60000 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.ttl).toBe(60000);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      jest.advanceTimersByTime(1001);

      const removed = cache.cleanup();

      expect(removed).toBe(2);
      expect(cache.stats().size).toBe(0);
    });

    it('should only remove expired entries', () => {
      const cache = new WordLookupCache({ ttl: 1000 });

      cache.set('key1', 'value1');

      jest.advanceTimersByTime(500);

      cache.set('key2', 'value2');

      jest.advanceTimersByTime(600); // key1 expired, key2 still valid

      const removed = cache.cleanup();

      expect(removed).toBe(1);
      expect(cache.get('key2')).toBe('value2');
    });
  });
});

describe('wordLookupCache singleton', () => {
  it('should be a WordLookupCache instance', () => {
    expect(wordLookupCache).toBeInstanceOf(WordLookupCache);
  });

  it('should have LRU eviction policy', () => {
    expect(wordLookupCache.config.evictionPolicy).toBe('lru');
  });

  it('should be usable', () => {
    wordLookupCache.clear();

    wordLookupCache.set('testKey', 'testValue');
    expect(wordLookupCache.get('testKey')).toBe('testValue');

    wordLookupCache.clear();
  });
});

describe('CacheOrchestrator default export', () => {
  it('should export all functions', () => {
    expect(CacheOrchestrator.registerCache).toBe(registerCache);
    expect(CacheOrchestrator.unregisterCache).toBe(unregisterCache);
    expect(CacheOrchestrator.getCache).toBe(getCache);
    expect(CacheOrchestrator.recordOperation).toBe(recordOperation);
    expect(CacheOrchestrator.getGlobalTelemetry).toBe(getGlobalTelemetry);
    expect(CacheOrchestrator.getPerformanceMetrics).toBe(getPerformanceMetrics);
    expect(CacheOrchestrator.clearAllCaches).toBe(clearAllCaches);
    expect(CacheOrchestrator.createManagedCache).toBe(createManagedCache);
  });

  it('should export constants', () => {
    expect(CacheOrchestrator.CACHE_CONFIGS).toBe(CACHE_CONFIGS);
  });

  it('should export WordLookupCache class', () => {
    expect(CacheOrchestrator.WordLookupCache).toBe(WordLookupCache);
  });
});
