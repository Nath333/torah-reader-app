// =============================================================================
// Aide morphologique — getMorphology, formatMorphologyDescription (interne),
// getMorphologicalHint.
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  analyzeWordMorphology
} from '../analysis/morphologicalAnalysisService';


import {
  cleanHebrewWord
} from '../dictionaries/hebrewDictionary';

/**
 * Get morphological analysis for a word (prefixes, suffixes, root breakdown)
 * @param {string} word - Word to analyze
 * @returns {Object} Morphological breakdown
 */
export const getMorphology = (word) => {
  try {
    const analyses = analyzeWordMorphology?.(word);
    if (!analyses || analyses.length === 0) return null;

    // analyzeWordMorphology returns an array sorted by confidence — use the best
    const best = analyses[0];

    const normalized = {
      word,
      root: best.root,
      prefixes: best.prefix ? [best.prefix] : [],
      suffixes: best.suffix ? [best.suffix] : [],
      stem: best.root,
      pattern: best.type,
      binyan: best.binyan,
      language: best.language,
      confidence: best.confidence,
      translation: best.translation,
      breakdown: best.breakdown,
      allAnalyses: analyses.slice(0, 3)
    };
    normalized.description = formatMorphologyDescription(normalized);
    return normalized;
  } catch (err) {
    return null;
  }
};

/**
 * Format morphological analysis as human-readable description
 */
const formatMorphologyDescription = (analysis) => {
  if (!analysis) return null;

  const parts = [];

  if (analysis.prefixes?.length > 0) {
    parts.push(`Prefixes: ${analysis.prefixes.join(' + ')}`);
  }

  if (analysis.root) {
    parts.push(`Root: ${analysis.root}`);
  }

  if (analysis.binyan) {
    parts.push(`Binyan: ${analysis.binyan}`);
  }

  if (analysis.tense) {
    parts.push(`Tense: ${analysis.tense}`);
  }

  if (analysis.person && analysis.number) {
    parts.push(`${analysis.person} ${analysis.number}${analysis.gender ? ` ${analysis.gender}` : ''}`);
  }

  if (analysis.suffixes?.length > 0) {
    parts.push(`Suffixes: ${analysis.suffixes.join(' + ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
};


/**
 * Get morphological hint for words not found in dictionary
 * Provides helpful breakdown of prefixes, root, and suffixes
 *
 * @param {string} word - The word to analyze
 * @returns {Object|null} Morphological hint object
 */
export const getMorphologicalHint = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  const hint = {
    word: cleaned,
    prefixes: [],
    possibleRoot: null,
    suffixes: [],
    breakdown: null
  };

  // Common Hebrew prefixes
  const prefixMap = {
    'ו': 'and',
    'ה': 'the',
    'ב': 'in',
    'ל': 'to/for',
    'מ': 'from',
    'כ': 'like/as',
    'ש': 'that/which',
    'וה': 'and the',
    'וב': 'and in',
    'ול': 'and to',
    'מה': 'from the',
    'לה': 'to the',
    'בה': 'in the',
    'כש': 'when'
  };

  // Common Hebrew suffixes
  const suffixMap = {
    'ים': 'masc. pl.',
    'ות': 'fem. pl.',
    'ין': 'Aram. pl.',
    'י': 'my/of',
    'ך': 'your (m)',
    'ה': 'her/to',
    'ו': 'his/him',
    'נו': 'our/us',
    'כם': 'your (m.pl)',
    'הם': 'their (m)',
    'הן': 'their (f)'
  };

  let remaining = cleaned;

  // Try to detect prefixes (max 2 chars)
  for (const [prefix, meaning] of Object.entries(prefixMap).sort((a, b) => b[0].length - a[0].length)) {
    if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
      hint.prefixes.push({ chars: prefix, meaning });
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  // Try to detect suffixes
  for (const [suffix, meaning] of Object.entries(suffixMap).sort((a, b) => b[0].length - a[0].length)) {
    if (remaining.endsWith(suffix) && remaining.length > suffix.length + 2) {
      hint.suffixes.push({ chars: suffix, meaning });
      remaining = remaining.slice(0, -suffix.length);
      break;
    }
  }

  // The remaining part might be the root
  if (remaining.length >= 2 && remaining.length <= 4) {
    hint.possibleRoot = remaining;
  }

  // Build human-readable breakdown
  const parts = [];
  if (hint.prefixes.length > 0) {
    parts.push(hint.prefixes.map(p => `${p.chars}(${p.meaning})`).join('+'));
  }
  if (hint.possibleRoot) {
    parts.push(`√${hint.possibleRoot}`);
  } else {
    parts.push(remaining);
  }
  if (hint.suffixes.length > 0) {
    parts.push(hint.suffixes.map(s => `${s.chars}(${s.meaning})`).join('+'));
  }

  hint.breakdown = parts.join(' + ');

  return hint;
};

/**
 * Get cache statistics
 */
