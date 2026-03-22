/**
 * useWordLookup - Custom hook for Hebrew/Aramaic word translations
 *
 * V3.0 REFACTORED: Now uses unified wordLookupOrchestrator
 *
 * This hook provides a clean API for looking up words, delegating all lookup
 * logic to the centralized orchestrator. No duplicate code.
 *
 * Features:
 * - Instant sync lookup with async enhancement
 * - Automatic caching (handled by orchestrator)
 * - Abort controller for canceling in-flight requests
 * - Toggle behavior (clicking same word clears selection)
 * - Context-aware lookup with reference support
 * - French translation on-demand (lazy)
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  lookupWord,
  quickLookup,
  getFrenchTranslation,
  cleanHebrewWord,
  batchLookup,
  warmCache,
  isCached
} from '../services/wordLookupOrchestrator';

// =============================================================================
// CONFIDENCE THRESHOLDS (re-exported for components that need them)
// =============================================================================

export const CONFIDENCE = {
  VERY_HIGH: 95,
  HIGH: 85,
  MEDIUM: 70,
  LOW: 50,
  MIN_VALID: 40,
  VERB_PATTERN: 75,
  ABBREVIATION: 85,
  FUNCTION_WORD: 90,
  ARAMAIC_FUNCTION: 95,
  MIN_WORD_LENGTH: 2,
  HEADWORD_MATCH_THRESHOLD: 0.65
};

// =============================================================================
// SYNC LOOKUP FUNCTIONS (for immediate display)
// =============================================================================

/**
 * Sync Hebrew lookup for immediate display
 */
const lookupHebrewSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createBaseResult(word, cleaned, 'Hebrew');
  }

  const result = quickLookup(cleaned);
  return result || createBaseResult(word, cleaned, 'Hebrew');
};

/**
 * Sync Aramaic lookup for immediate display
 */
const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createBaseResult(word, cleaned, 'Aramaic');
  }

  const result = quickLookup(cleaned);
  if (result) {
    return {
      ...result,
      language: 'Aramaic',
      translation: result.english // Aramaic compatibility
    };
  }

  return {
    ...createBaseResult(word, cleaned, 'Aramaic'),
    translation: null,
    loading: true
  };
};

/**
 * Create base result object
 */
const createBaseResult = (word, cleaned, language = 'Hebrew') => ({
  word,
  cleanedWord: cleaned,
  english: null,
  french: null,
  translation: null,
  source: 'none',
  sources: [],
  language,
  headword: null,
  root: null,
  confidence: 0,
  lookupPath: null
});

// =============================================================================
// ASYNC LOOKUP FUNCTIONS (delegate to orchestrator)
// =============================================================================

/**
 * Async Hebrew lookup via orchestrator
 */
const lookupHebrew = async (word, options = {}) => {
  const { reference } = options;
  const cleaned = cleanHebrewWord(word);

  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createBaseResult(word, cleaned, 'Hebrew');
  }

  try {
    const result = await lookupWord(word, {
      contextType: 'biblical',
      reference,
      includeV6: true,
      includeBinyan: true,
      includeDialect: true,
      includeFrequency: true,
      includeGrammar: true
    });

    return result;
  } catch (error) {
    console.warn('[useWordLookup] Hebrew lookup failed:', error.message);
    return createBaseResult(word, cleaned, 'Hebrew');
  }
};

/**
 * Async Aramaic lookup via orchestrator
 */
const lookupAramaic = async (word, options = {}) => {
  const { reference } = options;
  const cleaned = cleanHebrewWord(word);

  if (!cleaned || cleaned.length < CONFIDENCE.MIN_WORD_LENGTH) {
    return createBaseResult(word, cleaned, 'Aramaic');
  }

  try {
    const result = await lookupWord(word, {
      contextType: 'talmudic',
      reference,
      includeV6: true,
      includeBinyan: true,
      includeDialect: true,
      includeFrequency: true,
      includeGrammar: true
    });

    // Ensure Aramaic compatibility
    return {
      ...result,
      language: result.language || 'Aramaic',
      translation: result.english || result.translation
    };
  } catch (error) {
    console.warn('[useWordLookup] Aramaic lookup failed:', error.message);
    return createBaseResult(word, cleaned, 'Aramaic');
  }
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * useWordLookup - Hook for managing word lookup state and actions
 *
 * Features:
 * - Instant sync lookup with async enhancement
 * - Result caching (handled by orchestrator)
 * - Abort controller for canceling in-flight requests
 * - Toggle behavior (clicking same word clears selection)
 * - Context-aware lookup with reference support
 * - On-demand French translation
 *
 * @param {Object} options
 * @param {string} options.language - 'hebrew' or 'aramaic'
 * @param {string} options.reference - Text reference (e.g., "Shabbat 2a") for context-aware lookup
 * @returns {Object} Lookup state and handlers
 */
const useWordLookup = ({ language = 'hebrew', reference = null } = {}) => {
  const [selectedWord, setSelectedWord] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [frenchTranslation, setFrenchTranslation] = useState(null);
  const abortRef = useRef(null);
  const referenceRef = useRef(reference);
  referenceRef.current = reference;

  const isAramaic = language === 'aramaic';

  // Memoize lookup functions
  const { syncLookup, asyncLookup } = useMemo(() => ({
    syncLookup: isAramaic ? lookupAramaicSync : lookupHebrewSync,
    asyncLookup: isAramaic ? lookupAramaic : lookupHebrew
  }), [isAramaic]);

  /**
   * Look up a word
   * @param {string} word - The word to look up
   * @param {Object} options - { reference: "Shabbat 2a" }
   */
  const lookup = useCallback(async (word, options = {}) => {
    // Toggle off if same word
    if (selectedWord === word) {
      setSelectedWord(null);
      setTranslationData(null);
      setFrenchTranslation(null);
      return;
    }

    // Cancel previous lookup
    if (abortRef.current) {
      abortRef.current.abort = true;
    }

    const controller = { abort: false };
    abortRef.current = controller;

    setSelectedWord(word);
    setFrenchTranslation(null);

    // Get context from options or hook-level reference
    const contextRef = options.reference || referenceRef.current;
    const lookupContext = contextRef ? { reference: contextRef } : {};

    // Immediate local result while fetching
    const localResult = syncLookup(word);
    setTranslationData(localResult);
    setIsLoading(true);

    // Async API lookup with context
    try {
      const apiResult = await asyncLookup(word, lookupContext);

      if (!controller.abort) {
        const hasResult = isAramaic
          ? apiResult.translation || apiResult.english
          : apiResult.english;

        if (hasResult) {
          setTranslationData(apiResult);
        }
      }
    } catch (error) {
      // Silent fail - already have sync result
      console.warn('[useWordLookup] Async lookup failed:', error.message);
    } finally {
      if (!controller.abort) {
        setIsLoading(false);
      }
    }
  }, [selectedWord, syncLookup, asyncLookup, isAramaic]);

  /**
   * Load French translation on-demand
   * Call this when user toggles French display
   */
  const loadFrench = useCallback(async () => {
    if (!translationData?.english) return null;

    // Check if already loaded
    if (translationData.french) {
      setFrenchTranslation(translationData.french);
      return translationData.french;
    }

    try {
      const french = await getFrenchTranslation(translationData.english);
      if (french) {
        setFrenchTranslation(french);
        // Update translation data with French
        setTranslationData(prev => ({
          ...prev,
          french
        }));
      }
      return french;
    } catch (error) {
      console.warn('[useWordLookup] French translation failed:', error.message);
      return null;
    }
  }, [translationData]);

  /**
   * Clear selection
   */
  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    setSelectedWord(null);
    setTranslationData(null);
    setFrenchTranslation(null);
    setIsLoading(false);
  }, []);

  return {
    // State
    selectedWord,
    translationData,
    isLoading,
    isAramaic,
    frenchTranslation,

    // Actions
    lookup,
    loadFrench,
    clear
  };
};

export default useWordLookup;

// Named exports for direct use
export {
  lookupHebrew,
  lookupAramaic,
  lookupHebrewSync,
  lookupAramaicSync,
  // Re-export batch operations for convenience
  batchLookup,
  warmCache,
  isCached
};
