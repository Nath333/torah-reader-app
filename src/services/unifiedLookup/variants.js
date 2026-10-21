// =============================================================================
// Variantes de lookup (préfixes/suffixes/binyanim) + config des dictionnaires
// (extrait de unifiedLookupService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  HEBREW_PREFIXES_ORDERED
} from '../../constants/morphology';
import {
  normalizeFinals,
  restoreFinals,
  stripAllDiacritics
} from '../../utils/hebrewUtils';
import {
  getBDBData,
  getCALAramaicData,
  getGeseniusLexiconData,
  getJastrowAramaicData,
  getJastrowData,
  getKleinLexiconData,
  getStrongsData
} from '../dictionaries/dictionaryLoader';

// Use canonical HEBREW_PREFIXES_ORDERED from morphology.js (DRY - single source of truth)
// Includes 3/4-letter prefix combos that the local copy was missing
const HEBREW_PREFIXES = HEBREW_PREFIXES_ORDERED;

// Cache for variant generation — avoids recomputing for each dictionary lookup

/**
 * PRO SCHOLAR V13: Generate all morphological variants for dictionary lookup
 * Handles: diacritics, finals, plurals, prefixes
 * Results are cached per word to avoid redundant computation across lookups.
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Array<{form: string, type: string}>} Variants with type info
 */
export const generateLookupVariants = (word) => {
  if (_variantCache.has(word)) return _variantCache.get(word);
  const variants = [];
  const stripped = stripAllDiacritics(word);
  const normalized = normalizeFinals(stripped);

  // Helper to add variant if not duplicate
  const addVariant = (form, type) => {
    if (form && !variants.some(v => v.form === form)) {
      variants.push({ form, type });
    }
  };

  // 1. Original forms
  addVariant(word, 'exact');
  addVariant(stripped, 'stripped');
  addVariant(normalized, 'normalized');

  // 2. Plural → singular transformations (with final letter restoration)
  if (stripped.endsWith('ות') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(stem + 'ה', 'fem-singular'); // יציאות → יציאה
    addVariant(restoreFinals(stem), 'stem'); // יציאות → יציא (with proper final)
  }
  if (stripped.endsWith('ים') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(restoreFinals(stem), 'masc-singular'); // כהנים → כהן (not כהנ)
    addVariant(stem, 'masc-singular-raw'); // Also try without final restoration
  }
  if (stripped.endsWith('ין') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    addVariant(restoreFinals(stem), 'aramaic-singular'); // מלכין → מלך
    addVariant(stem + 'א', 'aramaic-emphatic'); // מלכא
  }

  // 3. Prefix stripping (בפנים → פנים, הגדול → גדול)
  for (const prefix of HEBREW_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      addVariant(withoutPrefix, `prefix-${prefix}`);
      // Also try plural→singular on the prefix-stripped form
      if (withoutPrefix.endsWith('ים') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(restoreFinals(stem), `prefix-${prefix}-singular`); // הכהנים → כהן
        addVariant(stem, `prefix-${prefix}-singular-raw`);
      }
      if (withoutPrefix.endsWith('ות') && withoutPrefix.length > 3) {
        const stem = withoutPrefix.slice(0, -2);
        addVariant(stem + 'ה', `prefix-${prefix}-fem-singular`);
      }
    }
  }

  // Cache the result (with size cap)
  if (_variantCache.size >= MAX_VARIANT_CACHE) _variantCache.clear();
  _variantCache.set(word, variants);
  return variants;
};

/**
 * Get lazy-loaded dictionary data (includes Jastrow Aramaic for Talmudic lookup)
 * All lexicons are now lazy-loaded from JSON files
 * @returns {Object} Dictionary data sources
 */
export const getDictionaries = () => ({
  bdb: getBDBData(),
  jastrow: getJastrowData(),
  strongs: getStrongsData(),
  calAramaic: getCALAramaicData(),
  jastrowAramaic: getJastrowAramaicData(),
  // PRO SCHOLAR V16: Academic sources (FREE public domain sources)
  gesenius: getGeseniusLexiconData(),
  klein: getKleinLexiconData()
});

