// =============================================================================
// État du service d'extraction de racines — cache géré + télémétrie
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createManagedCache } from '../../cacheOrchestrator';

const _cache = createManagedCache('rootExtraction', {
  maxSize: 500,
  ttl: 60 * 60 * 1000 // 1 hour
});

export const getCached = (key) => _cache.get(key);
export const setCache = (key, value) => {
  _cache.set(key, value);
  return value;
};

export const clearCache = () => _cache.clear();
export const getCacheStats = () => _cache.stats ? _cache.stats() : { size: 0, maxSize: 500 };


export const _telemetry = {
  lookups: 0,
  cacheHits: 0,
  cacheMisses: 0,
  hypothesesGenerated: 0,
  validatedMatches: 0,
  dictionaryLookups: 0,
  weakVerbsDetected: 0,
  particlesFound: 0,
  errors: 0,
  startTime: Date.now(),
  lastLookupMs: 0,
  avgLookupMs: 0,
  totalLookupMs: 0,
};

/**
 * Get telemetry data for performance analysis
 * Track lookups, cache efficiency, and timing
 */
export const getTelemetry = () => ({
  ..._telemetry,
  uptime: Date.now() - _telemetry.startTime,
  hitRate: _telemetry.lookups > 0
    ? ((_telemetry.cacheHits / _telemetry.lookups) * 100).toFixed(1) + '%'
    : '0%',
  avgLookupMs: _telemetry.lookups > 0
    ? (_telemetry.totalLookupMs / _telemetry.lookups).toFixed(2)
    : 0,
  cacheStats: getCacheStats(),
});

/**
 * Reset telemetry counters
 */
export const resetTelemetry = () => {
  Object.assign(_telemetry, {
    lookups: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hypothesesGenerated: 0,
    validatedMatches: 0,
    dictionaryLookups: 0,
    weakVerbsDetected: 0,
    particlesFound: 0,
    errors: 0,
    startTime: Date.now(),
    lastLookupMs: 0,
    avgLookupMs: 0,
    totalLookupMs: 0,
  });
};

/**
 * Record a lookup for telemetry
 * @private
 */
export const recordLookup = (durationMs, fromCache = false) => {
  _telemetry.lookups++;
  _telemetry.lastLookupMs = durationMs;
  _telemetry.totalLookupMs += durationMs;
  if (fromCache) {
    _telemetry.cacheHits++;
  } else {
    _telemetry.cacheMisses++;
  }
};
