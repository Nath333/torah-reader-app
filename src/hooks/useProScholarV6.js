/**
 * useProScholar - PRO SCHOLAR Integration Hook
 * @module useProScholarV6
 *
 * Connects React components to the unified root extraction service:
 * - Multi-hypothesis root extraction with dictionary validation
 * - Binyan analysis (Hebrew & Aramaic verb patterns)
 * - Weak verb type detection (8 types)
 * - Dialect detection (Biblical Hebrew, Mishnaic, Talmudic Aramaic)
 * - Semantic field categorization
 * - Root family expansion
 * - Telemetry access
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// =============================================================================
// SINGLE SOURCE OF TRUTH IMPORTS
// =============================================================================

// Import weak verb display from centralized constants
import { WEAK_VERB_DISPLAY } from '../constants/morphologyPatterns';

// =============================================================================
// SAFE IMPORTS - All services are optional
// =============================================================================

// PRO SCHOLAR: Root extraction service
let UnifiedRootService = null;
try {
  UnifiedRootService = require('../services/rootExtraction');
} catch (e) {
  console.warn('[useProScholarV6] rootExtraction not available');
}

// PRO SCHOLAR V6.2: Import TelemetryService for unified telemetry
let TelemetryService = null;
try {
  TelemetryService = require('../services/telemetryService');
} catch (e) {
  console.debug('[useProScholarV6] TelemetryService not available, using local telemetry');
}

// Destructure V6 functions with safe fallbacks
const {
  extractRootsEnhanced = () => ({ roots: [], confidence: 0 }),
  // eslint-disable-next-line no-unused-vars
  extractRootsWithDirectValidation = () => [], // Reserved for future direct validation
  analyzeBinyan = () => null,
  detectDialect = () => ({ dialect: 'unknown', confidence: 0 }),
  detectCitations = () => [],
  getSemanticField = () => null,
  getRootFamily = () => [],
  validateWithDirectDictionaries = () => ({ found: false }),
  // Use local telemetry as fallback if TelemetryService unavailable
  getTelemetry: getLocalTelemetry = () => ({}),
  resetTelemetry: resetLocalTelemetry = () => {},
  getCacheStats: getLocalCacheStats = () => ({ size: 0, hits: 0, misses: 0 }),
  clearCache = () => {},
  DICTIONARY_TIERS = {},
  PREFIX_PATTERNS = [],
  SUFFIX_PATTERNS = [],
  NOUN_PATTERNS = [],
  WEAK_VERB_TYPES = {},
  BINYANIM = {},
  VERSION = '6.0.0'
} = UnifiedRootService || {};

// PRO SCHOLAR V12: Use rootExtraction's telemetry directly (it tracks the actual lookups)
// TelemetryService is for general app telemetry, rootExtraction has root-specific metrics
const getTelemetry = getLocalTelemetry || TelemetryService?.getTelemetry || (() => ({}));
const resetTelemetry = resetLocalTelemetry || TelemetryService?.resetTelemetry || (() => {});
const getCacheStats = getLocalCacheStats || TelemetryService?.getCacheStats || (() => ({ size: 0, hits: 0, misses: 0 }));

// =============================================================================
// CONSTANTS - Most are now imported from '../constants/morphologyPatterns'
// =============================================================================

// NOTE: WEAK_VERB_DISPLAY is now imported from morphologyPatterns.js (single source of truth)

/** Dictionary tier display configuration - PRO SCHOLAR V13 */
const TIER_DISPLAY = {
  // Modern keys (from dictionarySources.js RELIABILITY_TIERS)
  academic: { icon: '🥇', label: 'Academic', color: '#059669', bg: '#dcfce7', description: 'Academic lexicon - peer-reviewed' },
  scholarly: { icon: '🥈', label: 'Reference', color: '#0891b2', bg: '#cffafe', description: 'Scholarly reference work' },
  curated: { icon: '🥉', label: 'Curated', color: '#6366f1', bg: '#e0e7ff', description: 'Curated vocabulary list' },
  derived: { icon: '⚙️', label: 'Derived', color: '#8b5cf6', bg: '#ede9fe', description: 'Morphological derivation' },
  reference: { icon: '📑', label: 'General', color: '#64748b', bg: '#f1f5f9', description: 'General reference' },
  // Legacy keys (for backward compatibility)
  gold: { icon: '🥇', label: 'Academic', color: '#059669', bg: '#dcfce7', description: 'Academic lexicon - peer-reviewed' },
  silver: { icon: '🥈', label: 'Reference', color: '#0891b2', bg: '#cffafe', description: 'Scholarly reference work' },
  bronze: { icon: '🥉', label: 'Curated', color: '#6366f1', bg: '#e0e7ff', description: 'Curated vocabulary list' }
};

/** Dialect display configuration */
const DIALECT_DISPLAY = {
  'biblical_hebrew': {
    name: 'Biblical Hebrew',
    hebrew: 'עברית מקראית',
    icon: '📜',
    color: '#1d4ed8'
  },
  'mishnaic_hebrew': {
    name: 'Mishnaic Hebrew',
    hebrew: 'עברית משנאית',
    icon: '📚',
    color: '#7c3aed'
  },
  'talmudic_aramaic': {
    name: 'Talmudic Aramaic',
    hebrew: 'ארמית תלמודית',
    icon: '📖',
    color: '#059669'
  },
  'targumic_aramaic': {
    name: 'Targumic Aramaic',
    hebrew: 'ארמית תרגומית',
    icon: '🎯',
    color: '#d97706'
  },
  'syriac': {
    name: 'Syriac',
    hebrew: 'סורית',
    icon: '🏛️',
    color: '#dc2626'
  },
  'unknown': {
    name: 'Unknown',
    hebrew: 'לא ידוע',
    icon: '❓',
    color: '#6b7280'
  }
};

/** Semantic field display configuration */
const SEMANTIC_FIELD_DISPLAY = {
  LEGAL: { name: 'Legal/Halachic', icon: '⚖️', color: '#1d4ed8' },
  DIALECTIC: { name: 'Dialectical', icon: '💬', color: '#7c3aed' },
  RITUAL: { name: 'Ritual/Temple', icon: '🕯️', color: '#b45309' },
  AGRICULTURAL: { name: 'Agricultural', icon: '🌾', color: '#16a34a' },
  COMMERCIAL: { name: 'Commercial', icon: '💰', color: '#ca8a04' },
  FAMILY: { name: 'Family/Social', icon: '👨‍👩‍👧', color: '#ec4899' },
  RELIGIOUS: { name: 'Religious', icon: '✡️', color: '#6366f1' },
  ANATOMICAL: { name: 'Anatomical', icon: '🫀', color: '#ef4444' },
  TEMPORAL: { name: 'Temporal', icon: '⏰', color: '#0891b2' },
  SPATIAL: { name: 'Spatial', icon: '📍', color: '#84cc16' }
};

// =============================================================================
// HOOK: useProScholarV6
// =============================================================================

/**
 * Main hook for PRO SCHOLAR V6 integration
 *
 * @param {string} word - Hebrew/Aramaic word to analyze
 * @param {Object} options - Analysis options
 * @param {string} [options.contextType='general'] - Context type (talmudic, biblical, mishnaic)
 * @param {boolean} [options.skipCache=false] - Skip cache lookup
 * @param {boolean} [options.includeFamily=true] - Include root family expansion
 * @param {boolean} [options.detectDialect=true] - Run dialect detection
 * @returns {Object} Analysis result with all V6 features
 */
export function useProScholarV6(word, options = {}) {
  const {
    contextType = 'general',
    skipCache = false,
    includeFamily = true,
    detectDialect: shouldDetectDialect = true
  } = options;

  // State
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Abort controller for cleanup
  const abortRef = useRef(null);

  // Perform analysis
  useEffect(() => {
    if (!word || !UnifiedRootService) {
      setAnalysis(null);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const analyze = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ─────────────────────────────────────────────────────────────────
        // STEP 1: Enhanced Root Extraction with Direct Dictionary Validation
        // ─────────────────────────────────────────────────────────────────
        const rootsEnhanced = extractRootsEnhanced(word, {
          contextType,
          skipCache,
          maxHypotheses: 5
        });

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 2: Binyan Analysis
        // ─────────────────────────────────────────────────────────────────
        const binyanResult = analyzeBinyan(word, { contextType });

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 3: Dialect Detection
        // ─────────────────────────────────────────────────────────────────
        let dialectResult = null;
        if (shouldDetectDialect) {
          dialectResult = detectDialect(word);
        }

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 4: Semantic Field Detection
        // ─────────────────────────────────────────────────────────────────
        const bestRoot = rootsEnhanced?.roots?.[0]?.root;
        const semanticField = bestRoot ? getSemanticField(bestRoot) : null;

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 5: Root Family Expansion
        // ─────────────────────────────────────────────────────────────────
        let rootFamily = [];
        if (includeFamily && bestRoot) {
          rootFamily = getRootFamily(bestRoot) || [];
        }

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 6: Citation Detection
        // ─────────────────────────────────────────────────────────────────
        const citations = detectCitations(word);

        if (signal.aborted) return;

        // ─────────────────────────────────────────────────────────────────
        // STEP 7: Direct Dictionary Validation for best root
        // ─────────────────────────────────────────────────────────────────
        let dictionaryValidation = null;
        if (bestRoot) {
          dictionaryValidation = validateWithDirectDictionaries(bestRoot, { contextType });
        }

        // ─────────────────────────────────────────────────────────────────
        // STEP 8: Determine Weak Verb Type
        // ─────────────────────────────────────────────────────────────────
        let weakVerbType = null;
        if (rootsEnhanced?.weakType) {
          weakVerbType = {
            type: rootsEnhanced.weakType,
            display: WEAK_VERB_DISPLAY[rootsEnhanced.weakType] || null
          };
        }

        // ─────────────────────────────────────────────────────────────────
        // Build Final Analysis Result
        // ─────────────────────────────────────────────────────────────────
        setAnalysis({
          word,
          contextType,
          version: VERSION,

          // Root extraction
          roots: rootsEnhanced?.roots || [],
          bestRoot,
          confidence: rootsEnhanced?.confidence || 0,

          // Binyan analysis
          binyan: binyanResult,
          binyanDisplay: binyanResult ? {
            name: binyanResult.name,
            hebrew: binyanResult.hebrew,
            meaning: binyanResult.meaning,
            isAramaic: binyanResult.isAramaic || false
          } : null,

          // Weak verb
          weakVerbType,
          isWeakVerb: !!weakVerbType,

          // Dialect
          dialect: dialectResult,
          dialectDisplay: dialectResult ? DIALECT_DISPLAY[dialectResult.dialect] || DIALECT_DISPLAY.unknown : null,

          // Semantic field
          semanticField,
          semanticFieldDisplay: semanticField ? SEMANTIC_FIELD_DISPLAY[semanticField] : null,

          // Root family
          rootFamily,
          hasFamily: rootFamily.length > 0,

          // Citations
          citations,
          hasCitations: citations.length > 0,

          // Dictionary validation
          dictionaryValidation,
          validatedSources: dictionaryValidation?.sources || [],

          // Source tier info
          sourceTiers: (dictionaryValidation?.sources || []).map(src => ({
            name: src.name,
            tier: DICTIONARY_TIERS[src.key]?.tier || 'silver',
            display: TIER_DISPLAY[DICTIONARY_TIERS[src.key]?.tier] || TIER_DISPLAY.silver
          })),

          // Metadata
          timestamp: Date.now(),
          fromCache: rootsEnhanced?.fromCache || false
        });

      } catch (err) {
        if (!signal.aborted) {
          console.error('[useProScholarV6] Analysis error:', err);
          setError(err.message || 'Analysis failed');
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    analyze();

    // Cleanup
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [word, contextType, skipCache, includeFamily, shouldDetectDialect]);

  return {
    analysis,
    isLoading,
    error,
    // Expose display helpers
    getWeakVerbDisplay: useCallback((type) => WEAK_VERB_DISPLAY[type] || null, []),
    getTierDisplay: useCallback((tier) => TIER_DISPLAY[tier] || TIER_DISPLAY.silver, []),
    getDialectDisplay: useCallback((dialect) => DIALECT_DISPLAY[dialect] || DIALECT_DISPLAY.unknown, []),
    getSemanticFieldDisplay: useCallback((field) => SEMANTIC_FIELD_DISPLAY[field] || null, [])
  };
}

// =============================================================================
// HOOK: useProScholarTelemetry
// =============================================================================

/**
 * Hook for accessing PRO SCHOLAR telemetry data
 * Useful for development and performance monitoring
 */
export function useProScholarTelemetry() {
  const [telemetry, setTelemetry] = useState(() => getTelemetry());

  const refresh = useCallback(() => {
    setTelemetry(getTelemetry());
  }, []);

  const reset = useCallback(() => {
    resetTelemetry();
    setTelemetry(getTelemetry());
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cacheStats = useMemo(() => getCacheStats(), [telemetry]); // Refresh when telemetry updates

  return {
    telemetry,
    cacheStats,
    refresh,
    reset,
    clearCache: useCallback(() => {
      clearCache();
      refresh();
    }, [refresh])
  };
}

// =============================================================================
// HOOK: useRootFamily
// =============================================================================

/**
 * Helper to normalize root family result to array
 * @param {*} result - Result from getRootFamily (array or object)
 * @returns {Array} Normalized array
 */
function normalizeRootFamily(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  // Handle object responses with various property names
  if (typeof result === 'object') {
    return result.words || result.entries || result.members || result.family || [];
  }
  return [];
}

/**
 * Hook for getting root family expansion
 * @param {string} root - 3-letter Hebrew root
 */
export function useRootFamily(root) {
  const [family, setFamily] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!root || !UnifiedRootService) {
      setFamily([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = getRootFamily(root);
      // Normalize to array (handles object responses)
      setFamily(normalizeRootFamily(result));
    } catch (err) {
      console.warn('[useRootFamily] Error:', err);
      setFamily([]);
    } finally {
      setIsLoading(false);
    }
  }, [root]);

  return { family, isLoading };
}

// =============================================================================
// HOOK: useDialectDetection
// =============================================================================

/**
 * Hook for dialect detection in text
 * @param {string} text - Text to analyze for dialect
 */
export function useDialectDetection(text) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!text || !UnifiedRootService) {
      setResult(null);
      return;
    }

    try {
      const dialectResult = detectDialect(text);
      setResult({
        ...dialectResult,
        display: DIALECT_DISPLAY[dialectResult.dialect] || DIALECT_DISPLAY.unknown
      });
    } catch (err) {
      console.warn('[useDialectDetection] Error:', err);
      setResult(null);
    }
  }, [text]);

  return result;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  WEAK_VERB_DISPLAY,
  TIER_DISPLAY,
  DIALECT_DISPLAY,
  SEMANTIC_FIELD_DISPLAY,
  // Re-export service constants
  DICTIONARY_TIERS,
  PREFIX_PATTERNS,
  SUFFIX_PATTERNS,
  NOUN_PATTERNS,
  WEAK_VERB_TYPES,
  BINYANIM,
  VERSION,
  // Utility helpers
  normalizeRootFamily
};

export default useProScholarV6;
