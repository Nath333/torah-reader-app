/**
 * CAL (Comprehensive Aramaic Lexicon) - Lazy-loaded from JSON
 *
 * BUNDLE OPTIMIZATION: The large dictionary data (~28KB) has been moved to
 * public/data/cal_aramaic.json and is now lazy-loaded via dictionaryLoader.js.
 *
 * This file provides the same API as before but uses cached data from
 * the lazy loader.
 *
 * Sources: Hebrew Union College's CAL database
 * Dialects: BA (Biblical Aramaic), JBA (Jewish Babylonian), JPA (Jewish Palestinian),
 *           Tg (Targum), Syr (Syriac), CPA (Christian Palestinian)
 *
 * Total: ~169 entries (loaded on-demand, not bundled)
 */

import { getCALAramaicData } from '../services/dictionaries/dictionaryLoader';
import { stripAllDiacritics, normalizeFinals } from '../utils/hebrewUtils';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED LEXICON ACCESS
// =============================================================================

/** @returns {Object|null} CAL Aramaic data (returns Proxy for compatibility) */
export const CAL_ARAMAIC = createLazyProxy(getCALAramaicData);

// =============================================================================
// LOOKUP FUNCTIONS (use lazy-loaded data)
// =============================================================================

/**
 * Look up a word in CAL Aramaic
 * @param {string} word - Aramaic word (with or without nikud)
 * @returns {Object|null} - CAL entry or null if not found
 */
export const lookupCAL = (word) => {
  if (!word) return null;
  const data = getCALAramaicData();
  if (!data) return null;

  // Clean the word of nikud/cantillation
  const cleaned = stripAllDiacritics(word);

  // Direct lookup
  if (data[cleaned]) {
    return { ...data[cleaned], source: 'CAL' };
  }

  // Try without final letters (כ→ך, מ→ם, etc.)
  const normalized = normalizeFinals(cleaned);

  if (data[normalized]) {
    return { ...data[normalized], source: 'CAL' };
  }

  // Search in forms array
  for (const [, entry] of Object.entries(data)) {
    if (entry.forms && entry.forms.includes(cleaned)) {
      return { ...entry, matchedForm: cleaned, source: 'CAL' };
    }
  }

  return null;
};

/**
 * Get all entries for a specific dialect
 * @param {string} dialect - Dialect code (BA, JBA, JPA, Tg, Syr)
 * @returns {Array} - Array of entries
 */
export const getByDialect = (dialect) => {
  const data = getCALAramaicData();
  if (!data) return [];

  return Object.entries(data)
    .filter(([_, entry]) => entry.dialects && entry.dialects.includes(dialect))
    .map(([lemma, entry]) => ({ lemma, ...entry }));
};

/**
 * Search CAL entries by definition
 * @param {string} query - English search term
 * @returns {Array} - Matching entries
 */
export const searchCAL = (query) => {
  if (!query) return [];
  const data = getCALAramaicData();
  if (!data) return [];

  const lowerQuery = query.toLowerCase();

  return Object.entries(data)
    .filter(([_, entry]) =>
      entry.definition.toLowerCase().includes(lowerQuery) ||
      (entry.notes && entry.notes.toLowerCase().includes(lowerQuery))
    )
    .map(([lemma, entry]) => ({ lemma, ...entry }));
};

export default CAL_ARAMAIC;
