// =============================================================================
// Lookup halachique à préfixes — LA fonction unique pour les termes talmudiques
// (HALACHIC_OVERRIDE + RASHI_VOCABULARY, strips dynamiques).
// (extrait de commentaryUtils.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { normalizeFinals } from '../hebrewUtils';
import { getPrefixMeaning, SINGLE_PREFIXES } from '../../constants/morphology';
import { HALACHIC_OVERRIDE, RASHI_VOCABULARY } from './data';

/**
 * DYNAMIC PREFIX-AWARE LOOKUP
 * Instead of hardcoding השבת, לשבת, בשבת, etc., we:
 * 1. Strip prefixes dynamically
 * 2. Look up the root in HALACHIC_OVERRIDE or RASHI_VOCABULARY
 * 3. Combine prefix meaning + root meaning
 *
 * This is the SINGLE function for halachic/Talmudic word lookup.
 * All consumers should use this instead of directly accessing HALACHIC_OVERRIDE.
 *
 * @param {string} word - Hebrew word (potentially with prefixes)
 * @param {Object} options - { includeRashi: true } to also check RASHI_VOCABULARY
 * @returns {object|null} - { definition, prefix, root, source } or null
 */
export const lookupHalachicWithPrefix = (word, options = {}) => {
  if (!word) return null;
  const { includeRashi = true } = options;

  // Helper to check dictionaries in priority order:
  // 1. HALACHIC_OVERRIDE (proper nouns and technical terms)
  // 2. RASHI_VOCABULARY (Talmudic vocabulary and compound phrases)
  //
  // NOTE: Common words (יד, של, בעל, etc.) are now handled by the
  // systematic scoring system in unifiedLookupService.js
  const checkDictionaries = (w) => {
    // FIRST: Check halachic overrides (proper nouns, titles)
    if (HALACHIC_OVERRIDE[w]) {
      return { def: HALACHIC_OVERRIDE[w], source: 'Halachic' };
    }
    // SECOND: Check Rashi vocabulary (compound phrases, Aramaic particles)
    if (includeRashi && typeof RASHI_VOCABULARY !== 'undefined' && RASHI_VOCABULARY[w]) {
      return { def: RASHI_VOCABULARY[w], source: 'Rabbinic' };
    }
    return null;
  };

  // Direct match first (includes multi-word phrases)
  const direct = checkDictionaries(word);
  if (direct) {
    return { definition: direct.def, prefix: '', root: word, source: direct.source };
  }

  // Try stripping single prefix
  if (word.length > 2 && SINGLE_PREFIXES.includes(word[0])) {
    const stripped = word.slice(1);
    const found = checkDictionaries(stripped);
    if (found) {
      const prefixMeaning = getPrefixMeaning(word[0]);
      // Return BASE definition separately from prefix - callers combine them
      // This prevents double-prefix bugs like "the the Shabbat"
      return {
        definition: found.def,  // BASE definition without prefix
        prefix: prefixMeaning,
        root: stripped,
        source: found.source
      };
    }
  }

  // Try stripping two prefixes (e.g., וה, של, etc.)
  if (word.length > 3 && SINGLE_PREFIXES.includes(word[0]) && SINGLE_PREFIXES.includes(word[1])) {
    const stripped = word.slice(2);
    const found = checkDictionaries(stripped);
    if (found) {
      const p1 = getPrefixMeaning(word[0]);
      const p2 = getPrefixMeaning(word[1]);
      const combinedPrefix = [p1, p2].filter(Boolean).join(' ');
      // Return BASE definition separately from prefix - callers combine them
      return {
        definition: found.def,  // BASE definition without prefix
        prefix: combinedPrefix,
        root: stripped,
        source: found.source
      };
    }
  }

  return null;
};
