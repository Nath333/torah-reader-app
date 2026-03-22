// =============================================================================
// Morphology Analyzer - PRO SCHOLAR v3
// Breaks down Hebrew/Aramaic words into prefix + root + suffix components
// Shows users exactly how a word is constructed
//
// REFACTORED: Now uses modular constants from constants/morphology/
// REFACTORED: Verb grammar and confidence moved to utils/morphology/
// =============================================================================

// Import from modular structure (SINGLE SOURCE OF TRUTH)
import {
  HEBREW_PREFIX_MEANINGS,
  HEBREW_PREFIXES_ORDERED,
} from '../constants/morphology/prefixes';

import {
  HEBREW_SUFFIX_MEANINGS,
  HEBREW_SUFFIXES_ORDERED,
  getSuffixInfo,
} from '../constants/morphology/suffixes';

import {
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS,
} from '../constants/morphology/verbPatterns';

import { STOP_WORDS } from '../constants/morphology';

// Re-export from modular utils for backward compatibility
export { calculateConfidence, CONFIDENCE_FACTORS } from './morphology/confidence';
export { analyzeVerbGrammar, formatVerbGrammar, getBinyanInfo } from './morphology/verbGrammar';

// =============================================================================
// WORD MORPHOLOGY ANALYSIS
// Breaks down words into prefix + root + suffix components
// =============================================================================

/**
 * Analyze a Hebrew word and break it into components
 * @param {string} word - The Hebrew word to analyze
 * @param {Object} lookupResult - Optional result from dictionary lookup
 * @returns {Object} - Analysis with prefix, root, suffix breakdown
 */
export const analyzeWordMorphology = (word, lookupResult = null) => {
  if (!word || typeof word !== 'string') {
    return { word, components: [], root: word, hasBreakdown: false };
  }

  const components = [];
  let remaining = word;
  let strippedPrefix = '';
  let strippedSuffix = '';

  // Use lookup result if available (more accurate)
  if (lookupResult?.strippedPrefix) {
    strippedPrefix = lookupResult.strippedPrefix;
  }
  if (lookupResult?.strippedSuffix) {
    strippedSuffix = lookupResult.strippedSuffix;
  }

  // If no lookup result, detect prefixes ourselves
  // CRITICAL: Check for STOP_WORDS to avoid stripping parts of complete words
  if (!strippedPrefix) {
    for (const prefix of HEBREW_PREFIXES_ORDERED) {
      if (remaining.startsWith(prefix) && remaining.length > prefix.length + 1) {
        const stem = remaining.slice(prefix.length);
        // If stem is a STOP_WORD, use THIS prefix (don't strip further)
        if (STOP_WORDS.has(stem)) {
          strippedPrefix = prefix;
          break;
        }
        // Otherwise, accept this prefix
        strippedPrefix = prefix;
        break;
      }
    }
  }

  // Strip prefix and add to components
  if (strippedPrefix) {
    remaining = remaining.slice(strippedPrefix.length);

    // Break down compound prefixes into individual letters
    let prefixRemaining = strippedPrefix;
    while (prefixRemaining.length > 0) {
      let found = false;
      for (const p of ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'ד']) {
        if (prefixRemaining.startsWith(p)) {
          const info = HEBREW_PREFIX_MEANINGS[p] || { short: '?', type: 'prefix' };
          components.push({
            text: p,
            meaning: info.short,
            type: info.type,
            role: 'prefix'
          });
          prefixRemaining = prefixRemaining.slice(1);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  // If no lookup result, detect suffixes ourselves
  if (!strippedSuffix) {
    for (const suffix of HEBREW_SUFFIXES_ORDERED) {
      if (remaining.endsWith(suffix) && remaining.length > suffix.length + 1) {
        strippedSuffix = suffix;
        break;
      }
    }
  }

  // Calculate root (after prefix, before suffix)
  let root = remaining;
  if (strippedSuffix && remaining.endsWith(strippedSuffix)) {
    root = remaining.slice(0, -strippedSuffix.length);
  }

  // Use matched form from lookup if available (dictionary headword)
  const displayRoot = lookupResult?.matchedForm || lookupResult?.headword || root;

  // Add root component
  components.push({
    text: displayRoot,
    meaning: lookupResult?.english || 'root',
    type: 'root',
    role: 'root',
    headword: lookupResult?.headword,
    strongNumber: lookupResult?.strongNumber
  });

  // Add suffix component
  if (strippedSuffix) {
    const suffixInfo = getSuffixInfo(strippedSuffix) || { meaning: '?', type: 'suffix' };
    components.push({
      text: strippedSuffix,
      meaning: suffixInfo.meaning,
      type: suffixInfo.type,
      role: 'suffix'
    });
  }

  return {
    word,
    components,
    root: displayRoot,
    prefix: strippedPrefix || null,
    suffix: strippedSuffix || null,
    hasBreakdown: components.length > 1,
    headword: lookupResult?.headword,
    strongNumber: lookupResult?.strongNumber,
    language: lookupResult?.language || 'Hebrew'
  };
};

/**
 * Format morphology analysis as a display string
 * @param {Object} analysis - Result from analyzeWordMorphology
 * @returns {string} - Formatted breakdown string
 */
export const formatMorphologyBreakdown = (analysis) => {
  if (!analysis || !analysis.hasBreakdown) {
    return analysis?.word || '';
  }

  const parts = analysis.components.map(c => `${c.text} (${c.meaning})`);
  return `${analysis.word} → ${parts.join(' + ')}`;
};

/**
 * Get a simple breakdown object for UI display
 * @param {Object} analysis - Result from analyzeWordMorphology
 * @returns {Object} - { prefix, root, suffix } with meanings
 */
export const getSimpleBreakdown = (analysis) => {
  if (!analysis) return null;

  const prefixParts = analysis.components.filter(c => c.role === 'prefix');
  const rootPart = analysis.components.find(c => c.role === 'root');
  const suffixParts = analysis.components.filter(c => c.role === 'suffix');

  return {
    hasBreakdown: analysis.hasBreakdown,
    prefix: prefixParts.length > 0 ? {
      text: prefixParts.map(p => p.text).join(''),
      meaning: prefixParts.map(p => p.meaning).join(' + '),
      parts: prefixParts
    } : null,
    root: rootPart ? {
      text: rootPart.text,
      meaning: rootPart.meaning,
      headword: rootPart.headword,
      strongNumber: rootPart.strongNumber
    } : null,
    suffix: suffixParts.length > 0 ? {
      text: suffixParts.map(p => p.text).join(''),
      meaning: suffixParts.map(p => p.meaning).join(' + '),
      parts: suffixParts
    } : null
  };
};

// =============================================================================
// EXPORTS - Backward compatible API
// =============================================================================

// Re-export constants for modules that import from here
export {
  HEBREW_PREFIX_MEANINGS as PREFIX_MEANINGS,
  HEBREW_SUFFIX_MEANINGS as SUFFIX_MEANINGS,
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS,
};

const morphologyAnalyzer = {
  analyzeWordMorphology,
  formatMorphologyBreakdown,
  getSimpleBreakdown,
  // Re-exports from modular utils
  analyzeVerbGrammar: require('./morphology/verbGrammar').analyzeVerbGrammar,
  formatVerbGrammar: require('./morphology/verbGrammar').formatVerbGrammar,
  calculateConfidence: require('./morphology/confidence').calculateConfidence,
  // Constants
  PREFIX_MEANINGS: HEBREW_PREFIX_MEANINGS,
  SUFFIX_MEANINGS: HEBREW_SUFFIX_MEANINGS,
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS
};

export default morphologyAnalyzer;
