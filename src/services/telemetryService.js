/**
 * TelemetryService - PRO SCHOLAR V6 Unified Telemetry & Analytics
 *
 * Consolidates telemetry from all services into a single source of truth:
 * - Word lookup statistics
 * - Cache performance (via CacheOrchestrator)
 * - Dictionary usage
 * - V6 analysis metrics
 * - Error tracking
 * - Performance timing
 *
 * Features:
 * - Real-time metrics aggregation
 * - Historical data tracking
 * - Performance alerting
 * - Export capabilities
 *
 * @module TelemetryService
 */

import { getGlobalTelemetry, getPerformanceMetrics } from './cacheOrchestrator';

// =============================================================================
// TELEMETRY STATE
// =============================================================================

const _telemetry = {
  // ═══════════════════════════════════════════════════════════════════════════
  // LOOKUP METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  lookups: {
    total: 0,
    successful: 0,
    failed: 0,
    fromCache: 0,
    fromNetwork: 0
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // V6 ANALYSIS METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  v6Analysis: {
    extractions: 0,
    binyanDetections: 0,
    dialectDetections: 0,
    semanticFieldLookups: 0,
    weakVerbDetections: 0,
    hypothesesGenerated: 0
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DICTIONARY METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  dictionaries: {
    jastrow: { lookups: 0, hits: 0, misses: 0 },
    bdb: { lookups: 0, hits: 0, misses: 0 },
    strongs: { lookups: 0, hits: 0, misses: 0 },
    cal: { lookups: 0, hits: 0, misses: 0 },
    sefaria: { lookups: 0, hits: 0, misses: 0 }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  performance: {
    avgLookupMs: 0,
    maxLookupMs: 0,
    minLookupMs: Infinity,
    totalLookupMs: 0,
    p50: 0,
    p95: 0,
    p99: 0
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  errors: {
    total: 0,
    byType: {},
    recent: []
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION INFO
  // ═══════════════════════════════════════════════════════════════════════════
  session: {
    startTime: Date.now(),
    lastActivity: Date.now(),
    uniqueWords: new Set()
  }
};

// Performance timing samples for percentile calculation
const _timingSamples = [];
const MAX_TIMING_SAMPLES = 1000;

// =============================================================================
// RECORDING FUNCTIONS
// =============================================================================

/**
 * Record a word lookup event
 * @param {Object} event - Lookup event details
 */
export function recordLookup(event) {
  const {
    word,
    success = true,
    fromCache = false,
    durationMs = 0,
    source = null
    // v6Used - reserved for future V6 tracking
  } = event;

  _telemetry.lookups.total++;
  _telemetry.session.lastActivity = Date.now();

  if (success) {
    _telemetry.lookups.successful++;
  } else {
    _telemetry.lookups.failed++;
  }

  if (fromCache) {
    _telemetry.lookups.fromCache++;
  } else {
    _telemetry.lookups.fromNetwork++;
  }

  // Track unique words
  if (word) {
    _telemetry.session.uniqueWords.add(word);
  }

  // Record timing
  if (durationMs > 0) {
    recordTiming(durationMs);
  }

  // Track dictionary source
  if (source && _telemetry.dictionaries[source]) {
    _telemetry.dictionaries[source].lookups++;
    if (success) {
      _telemetry.dictionaries[source].hits++;
    } else {
      _telemetry.dictionaries[source].misses++;
    }
  }
}

/**
 * Record V6 analysis event
 * @param {string} type - Type of V6 analysis
 */
export function recordV6Analysis(type) {
  switch (type) {
    case 'extraction':
      _telemetry.v6Analysis.extractions++;
      break;
    case 'binyan':
      _telemetry.v6Analysis.binyanDetections++;
      break;
    case 'dialect':
      _telemetry.v6Analysis.dialectDetections++;
      break;
    case 'semantic':
      _telemetry.v6Analysis.semanticFieldLookups++;
      break;
    case 'weakVerb':
      _telemetry.v6Analysis.weakVerbDetections++;
      break;
    case 'hypothesis':
      _telemetry.v6Analysis.hypothesesGenerated++;
      break;
    default:
      break;
  }
}

/**
 * Record performance timing
 * @param {number} durationMs - Duration in milliseconds
 */
export function recordTiming(durationMs) {
  _telemetry.performance.totalLookupMs += durationMs;
  _telemetry.performance.maxLookupMs = Math.max(
    _telemetry.performance.maxLookupMs,
    durationMs
  );
  _telemetry.performance.minLookupMs = Math.min(
    _telemetry.performance.minLookupMs,
    durationMs
  );

  // Update average
  const count = _telemetry.lookups.total;
  if (count > 0) {
    _telemetry.performance.avgLookupMs = _telemetry.performance.totalLookupMs / count;
  }

  // Store sample for percentile calculation
  _timingSamples.push(durationMs);
  if (_timingSamples.length > MAX_TIMING_SAMPLES) {
    _timingSamples.shift();
  }

  // Recalculate percentiles periodically
  if (_timingSamples.length % 100 === 0) {
    calculatePercentiles();
  }
}

/**
 * Record an error
 * @param {Object} error - Error details
 */
export function recordError(error) {
  const { type = 'unknown', message = '' } = error;
  // Note: stack is available in error object but not stored to save memory

  _telemetry.errors.total++;

  // Track by type
  _telemetry.errors.byType[type] = (_telemetry.errors.byType[type] || 0) + 1;

  // Store recent errors (max 20)
  _telemetry.errors.recent.push({
    type,
    message,
    timestamp: Date.now()
  });
  if (_telemetry.errors.recent.length > 20) {
    _telemetry.errors.recent.shift();
  }
}

/**
 * Record dictionary-specific lookup
 * @param {string} dictionary - Dictionary name
 * @param {boolean} found - Whether word was found
 */
export function recordDictionaryLookup(dictionary, found) {
  const dict = dictionary.toLowerCase();
  if (_telemetry.dictionaries[dict]) {
    _telemetry.dictionaries[dict].lookups++;
    if (found) {
      _telemetry.dictionaries[dict].hits++;
    } else {
      _telemetry.dictionaries[dict].misses++;
    }
  }
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate percentiles from timing samples
 */
function calculatePercentiles() {
  if (_timingSamples.length === 0) return;

  const sorted = [..._timingSamples].sort((a, b) => a - b);
  const len = sorted.length;

  _telemetry.performance.p50 = sorted[Math.floor(len * 0.5)] || 0;
  _telemetry.performance.p95 = sorted[Math.floor(len * 0.95)] || 0;
  _telemetry.performance.p99 = sorted[Math.floor(len * 0.99)] || 0;
}

// =============================================================================
// RETRIEVAL FUNCTIONS
// =============================================================================

/**
 * Get comprehensive telemetry snapshot
 * @returns {Object} Complete telemetry data
 */
export function getTelemetry() {
  // Calculate percentiles if needed
  if (_timingSamples.length > 0 && _telemetry.performance.p50 === 0) {
    calculatePercentiles();
  }

  // Get cache telemetry from orchestrator
  let cacheTelemetry = null;
  try {
    cacheTelemetry = getGlobalTelemetry();
  } catch {
    cacheTelemetry = { global: { totalHits: 0, totalMisses: 0 } };
  }

  return {
    version: '6.0.0',
    timestamp: Date.now(),

    // Session info
    session: {
      uptime: Date.now() - _telemetry.session.startTime,
      lastActivity: _telemetry.session.lastActivity,
      uniqueWordsLookedUp: _telemetry.session.uniqueWords.size
    },

    // Lookup stats
    lookups: {
      ..._telemetry.lookups,
      hitRate: _telemetry.lookups.total > 0
        ? ((_telemetry.lookups.fromCache / _telemetry.lookups.total) * 100).toFixed(1) + '%'
        : '0%',
      successRate: _telemetry.lookups.total > 0
        ? ((_telemetry.lookups.successful / _telemetry.lookups.total) * 100).toFixed(1) + '%'
        : '0%'
    },

    // V6 analysis
    v6Analysis: { ..._telemetry.v6Analysis },

    // Dictionary usage
    dictionaries: Object.fromEntries(
      Object.entries(_telemetry.dictionaries).map(([name, stats]) => [
        name,
        {
          ...stats,
          hitRate: stats.lookups > 0
            ? ((stats.hits / stats.lookups) * 100).toFixed(1) + '%'
            : 'N/A'
        }
      ])
    ),

    // Performance
    performance: {
      avgLookupMs: _telemetry.performance.avgLookupMs.toFixed(2),
      maxLookupMs: _telemetry.performance.maxLookupMs,
      minLookupMs: _telemetry.performance.minLookupMs === Infinity
        ? 0
        : _telemetry.performance.minLookupMs,
      p50: _telemetry.performance.p50.toFixed(2),
      p95: _telemetry.performance.p95.toFixed(2),
      p99: _telemetry.performance.p99.toFixed(2)
    },

    // Cache (from orchestrator)
    cache: cacheTelemetry?.global || {},

    // Errors
    errors: {
      total: _telemetry.errors.total,
      byType: { ..._telemetry.errors.byType },
      recentCount: _telemetry.errors.recent.length
    }
  };
}

/**
 * Get cache-specific telemetry
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  try {
    return getGlobalTelemetry();
  } catch {
    return { global: { totalHits: 0, totalMisses: 0 } };
  }
}

/**
 * Get performance metrics for a time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Performance metrics
 */
export function getRecentPerformance(windowMs = 60000) {
  try {
    return getPerformanceMetrics(windowMs);
  } catch {
    return { operations: 0, hits: 0, misses: 0, hitRate: 'N/A' };
  }
}

/**
 * Get dictionary-specific statistics
 * @param {string} dictionary - Dictionary name
 * @returns {Object|null} Dictionary stats
 */
export function getDictionaryStats(dictionary) {
  const dict = dictionary.toLowerCase();
  const stats = _telemetry.dictionaries[dict];

  if (!stats) return null;

  return {
    name: dictionary,
    ...stats,
    hitRate: stats.lookups > 0
      ? ((stats.hits / stats.lookups) * 100).toFixed(1) + '%'
      : 'N/A'
  };
}

// =============================================================================
// CONTROL FUNCTIONS
// =============================================================================

/**
 * Reset all telemetry
 */
export function resetTelemetry() {
  _telemetry.lookups = {
    total: 0,
    successful: 0,
    failed: 0,
    fromCache: 0,
    fromNetwork: 0
  };

  _telemetry.v6Analysis = {
    extractions: 0,
    binyanDetections: 0,
    dialectDetections: 0,
    semanticFieldLookups: 0,
    weakVerbDetections: 0,
    hypothesesGenerated: 0
  };

  Object.keys(_telemetry.dictionaries).forEach(dict => {
    _telemetry.dictionaries[dict] = { lookups: 0, hits: 0, misses: 0 };
  });

  _telemetry.performance = {
    avgLookupMs: 0,
    maxLookupMs: 0,
    minLookupMs: Infinity,
    totalLookupMs: 0,
    p50: 0,
    p95: 0,
    p99: 0
  };

  _telemetry.errors = {
    total: 0,
    byType: {},
    recent: []
  };

  _telemetry.session.startTime = Date.now();
  _telemetry.session.lastActivity = Date.now();
  _telemetry.session.uniqueWords.clear();

  _timingSamples.length = 0;
}

/**
 * Export telemetry as JSON
 * @returns {string} JSON string of telemetry
 */
export function exportTelemetry() {
  return JSON.stringify(getTelemetry(), null, 2);
}

// =============================================================================
// ALERT FUNCTIONS
// =============================================================================

/**
 * Check for performance alerts
 * @returns {Object[]} Array of alerts
 */
export function getPerformanceAlerts() {
  const alerts = [];
  const telem = getTelemetry();

  // High error rate
  if (telem.lookups.total > 10) {
    const errorRate = (telem.errors.total / telem.lookups.total) * 100;
    if (errorRate > 5) {
      alerts.push({
        type: 'error_rate',
        severity: errorRate > 10 ? 'critical' : 'warning',
        message: `High error rate: ${errorRate.toFixed(1)}%`
      });
    }
  }

  // Slow performance
  const avgMs = parseFloat(telem.performance.avgLookupMs);
  if (avgMs > 500) {
    alerts.push({
      type: 'slow_performance',
      severity: avgMs > 1000 ? 'critical' : 'warning',
      message: `Slow average lookup time: ${avgMs.toFixed(0)}ms`
    });
  }

  // Low cache hit rate
  const hitRate = parseFloat(telem.lookups.hitRate);
  if (telem.lookups.total > 20 && hitRate < 30) {
    alerts.push({
      type: 'low_cache_hit',
      severity: hitRate < 15 ? 'warning' : 'info',
      message: `Low cache hit rate: ${hitRate}%`
    });
  }

  return alerts;
}

// =============================================================================
// EXPORTS
// =============================================================================

const TelemetryService = {
  // Recording
  recordLookup,
  recordV6Analysis,
  recordTiming,
  recordError,
  recordDictionaryLookup,

  // Retrieval
  getTelemetry,
  getCacheStats,
  getRecentPerformance,
  getDictionaryStats,
  getPerformanceAlerts,

  // Control
  resetTelemetry,
  exportTelemetry
};

export default TelemetryService;
