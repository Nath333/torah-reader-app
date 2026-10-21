// =============================================================================
// Modes de lookup — quickLookup (synchrone local), progressiveLookup,
// progressiveBatchLookup, batchLookup.
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  cleanHebrewWord
} from '../dictionaries/hebrewDictionary';
import {
  isCoreDictionariesLoaded
} from '../dictionaries/dictionaryLoader';
import {
  IS_DEV as DEBUG
} from '../../utils/debug';
import {
  isBiblicalName,
  lookupAcademicCriticalWord,
  lookupCriticalWord
} from '../../constants/criticalWords';
import {
  getResultQualityScore
} from '../scholarSourceAggregator';
import { lookupWord, getPipeline } from './pipeline';
import { lookupCache } from './state';
import { createEmptyResult } from './results';

// =============================================================================
// QUICK LOOKUP (SYNCHRONOUS)
// =============================================================================

/**
 * Quick synchronous lookup - for immediate results without waiting
 * Uses only local dictionaries, no online sources
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Lookup options
 * @returns {Object} Lookup result (may be incomplete)
 */
export const quickLookup = (word, options = {}) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return createEmptyResult(word);
  }

  const cacheKey = `${cleaned}:${options.contextMode || 'default'}`;
  const cached = lookupCache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // Track whether dictionaries are loaded — results may be incomplete if not
  const dictReady = isCoreDictionariesLoaded();

  // Run pipeline synchronously
  const runPipeline = getPipeline();
  const result = runPipeline(word, options);

  // Guard against null/undefined pipeline result
  if (!result) {
    if (DEBUG) {
      log.debug(`[quickLookup] Pipeline returned null for: ${word}`);
    }
    const empty = createEmptyResult(word, cleaned);
    empty.dictionariesLoaded = dictReady;
    return empty;
  }

  // Tag result with dictionary loading state
  result.dictionariesLoaded = dictReady;

  // Cache and return if we found something
  // Only cache if dictionaries were loaded (avoid caching incomplete results)
  if (result.english || (result.sources && result.sources.length > 0)) {
    if (dictReady) {
      lookupCache.set(cacheKey, result);
    }
    return result;
  }

  // PRO SCHOLAR V12: Academic critical words (HALOT, DJBA, Jastrow) - Tier 1
  // Try scholarly source first for common terms (sync - uses preloaded data)
  const academicEntry = lookupAcademicCriticalWord(cleaned);
  if (academicEntry) {
    if (DEBUG) {
      log.debug(`[AcademicCritical] ${cleaned} → ${academicEntry.definition} (${academicEntry.source})`);
    }
    const academicResult = {
      word,
      cleanedWord: cleaned,
      english: academicEntry.definition,
      fullDefinition: academicEntry.fullDefinition,
      source: academicEntry.source,
      etymology: academicEntry.etymology,
      cognates: academicEntry.cognates,
      citation: academicEntry.citation,
      frequency: academicEntry.frequency,
      category: academicEntry.category || academicEntry._category,
      pos: academicEntry.pos,
      lemma: academicEntry.lemma,
      isAramaic: academicEntry.isAramaic,
      sources: [{
        name: academicEntry.source,
        definition: academicEntry.fullDefinition || academicEntry.definition,
        tier: 1,
        citation: academicEntry.citation
      }],
      language: academicEntry.isAramaic ? 'Aramaic' : 'Hebrew',
      offline: true,
      isAcademic: true,
      tier: 1
    };
    lookupCache.set(cacheKey, academicResult);
    return academicResult;
  }

  // CRITICAL_WORDS fallback for common words (simple string translations)
  // Final fallback for common words when all dictionary lookups fail
  const criticalTranslation = lookupCriticalWord(cleaned) || lookupCriticalWord(word);
  if (criticalTranslation) {
    if (DEBUG) {
      log.debug(`[CriticalWords] ${cleaned} → ${criticalTranslation}`);
    }
    const fallbackResult = {
      word,
      cleanedWord: cleaned,
      english: criticalTranslation,
      source: isBiblicalName(cleaned) ? 'Biblical Name' : 'Critical Words',
      sources: [{
        name: isBiblicalName(cleaned) ? 'Biblical Names' : 'Critical Words',
        definition: criticalTranslation,
        tier: 4
      }],
      language: 'Hebrew',
      offline: true,
      isFallback: true
    };
    lookupCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  return result;
};

// =============================================================================
// PROGRESSIVE LOOKUP - Quick return + background enhancement
// =============================================================================

/**
 * Progressive lookup - returns fast with local results, enhances in background
 *
 * This is the recommended function for UI components that want:
 * 1. Immediate results from local dictionaries
 * 2. Enhanced results with online sources when available
 * 3. Non-blocking user experience
 *
 * @param {string} word - Hebrew/Aramaic word to look up
 * @param {Object} options - Lookup options
 * @param {string} options.contextMode - 'biblical', 'talmudic', 'midrashic'
 * @param {boolean} options.includeOnline - Fetch online sources in background (default: true)
 * @param {Function} options.onEnhanced - Callback when enhanced results available (result) => void
 * @returns {Object} Immediate result from local dictionaries
 *
 * @example
 * const result = progressiveLookup('תורה', {
 *   onEnhanced: (enhancedResult) => {
 *     // Update UI with better results
 *     setTranslation(enhancedResult);
 *   }
 * });
 *
 * // result is immediately available (local only)
 * showTranslation(result);
 */
export const progressiveLookup = (word, options = {}) => {
  const {
    contextMode = null,
    includeOnline = true,
    onEnhanced = null
  } = options;

  // Step 1: Return immediate local result
  const localResult = quickLookup(word, { contextMode });

  // If no callback or no online needed, just return local
  if (!onEnhanced || !includeOnline) {
    return localResult;
  }

  // Check if we already have strong results
  const qualityScore = getResultQualityScore(localResult);
  if (qualityScore >= 80) {
    // Already have high quality - no need for background fetch
    return { ...localResult, qualityScore, isComplete: true };
  }

  // Step 2: Start background enhancement
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return localResult;
  }

  // Mark result as potentially enhanceable
  const progressiveResult = {
    ...localResult,
    qualityScore,
    isComplete: false,
    isPending: true
  };

  // Background enhancement (use setTimeout for browser compatibility)
  setTimeout(async () => {
    try {
      // Use lookupWord with online sources
      const enhancedResult = await lookupWord(word, {
        contextMode,
        includeOnline: true
      });

      // Calculate new quality
      const enhancedScore = getResultQualityScore(enhancedResult);

      // Only call callback if we got better results
      if (enhancedScore > qualityScore ||
          enhancedResult.sources.length > localResult.sources.length) {
        onEnhanced({
          ...enhancedResult,
          qualityScore: enhancedScore,
          isComplete: true,
          wasEnhanced: true,
          previousScore: qualityScore
        });
      } else {
        // No improvement, still call with completion status
        onEnhanced({
          ...localResult,
          qualityScore,
          isComplete: true,
          wasEnhanced: false
        });
      }
    } catch (err) {
      if (DEBUG) {
        log.debug(`[Progressive] Background enhancement failed: ${err.message}`);
      }
      // Still mark as complete on error
      onEnhanced({
        ...localResult,
        qualityScore,
        isComplete: true,
        wasEnhanced: false,
        error: err.message
      });
    }
  });

  return progressiveResult;
};

/**
 * Progressive batch lookup - returns fast for all words, enhances in background
 *
 * @param {string[]} words - Array of words to look up
 * @param {Object} options - Lookup options
 * @param {Function} options.onWordEnhanced - Callback when a word gets enhanced (word, result) => void
 * @param {Function} options.onAllComplete - Callback when all lookups complete (results) => void
 * @returns {Map<string, Object>} Immediate results from local dictionaries
 */
export const progressiveBatchLookup = (words, options = {}) => {
  const {
    contextMode = null,
    includeOnline = true,
    onWordEnhanced = null,
    onAllComplete = null
  } = options;

  // Deduplicate
  const uniqueWords = [...new Set(words.map(w => cleanHebrewWord(w)).filter(w => w && w.length >= 2))];
  const results = new Map();

  // Step 1: Quick local lookup for all words
  for (const word of uniqueWords) {
    results.set(word, quickLookup(word, { contextMode }));
  }

  // If no callbacks, return immediately
  if (!onWordEnhanced && !onAllComplete) {
    return results;
  }

  // Step 2: Background enhancement (use setTimeout for browser compatibility)
  if (includeOnline) {
    setTimeout(async () => {
      const enhancedResults = new Map();

      for (const word of uniqueWords) {
        try {
          const localResult = results.get(word);
          const localScore = getResultQualityScore(localResult);

          // Skip if already high quality
          if (localScore >= 80) {
            enhancedResults.set(word, { ...localResult, isComplete: true });
            continue;
          }

          // Fetch enhanced
          const enhanced = await lookupWord(word, {
            contextMode,
            includeOnline: true
          });

          const enhancedScore = getResultQualityScore(enhanced);

          if (enhancedScore > localScore) {
            enhancedResults.set(word, {
              ...enhanced,
              qualityScore: enhancedScore,
              wasEnhanced: true,
              isComplete: true
            });

            if (onWordEnhanced) {
              onWordEnhanced(word, enhancedResults.get(word));
            }
          } else {
            enhancedResults.set(word, { ...localResult, isComplete: true });
          }
        } catch (err) {
          enhancedResults.set(word, { ...results.get(word), isComplete: true, error: err.message });
        }
      }

      if (onAllComplete) {
        onAllComplete(enhancedResults);
      }
    });
  }

  return results;
};

// =============================================================================
// BATCH LOOKUP
// =============================================================================

/**
 * Look up multiple words efficiently
 * Deduplicates and runs in parallel
 *
 * @param {string[]} words - Array of words to look up
 * @param {Object} options - Lookup options
 * @returns {Map<string, Object>} Map of word -> result
 */
export const batchLookup = async (words, options = {}) => {
  const uniqueWords = [...new Set(words.map(w => cleanHebrewWord(w)).filter(Boolean))];
  const results = new Map();

  // Check cache first
  const uncached = [];
  for (const word of uniqueWords) {
    const cacheKey = `${word}:${options.contextMode || 'default'}`;
    const cached = lookupCache.get(cacheKey);
    if (cached) {
      results.set(word, { ...cached, fromCache: true });
    } else {
      uncached.push(word);
    }
  }

  // Lookup uncached words in parallel
  if (uncached.length > 0) {
    const lookupPromises = uncached.map(word =>
      lookupWord(word, options).then(result => ({ word, result }))
    );

    const lookupResults = await Promise.allSettled(lookupPromises);

    for (const outcome of lookupResults) {
      if (outcome.status === 'fulfilled') {
        results.set(outcome.value.word, outcome.value.result);
      }
    }
  }

  return results;
};

