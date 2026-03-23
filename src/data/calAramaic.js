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

import { getCALAramaicData } from '../services/dictionaryLoader';

// =============================================================================
// LAZY-LOADED LEXICON ACCESS
// =============================================================================

/** @returns {Object|null} CAL Aramaic data (returns Proxy for compatibility) */
export const CAL_ARAMAIC = new Proxy({}, {
  get: (_, prop) => {
    const data = getCALAramaicData();
    if (prop === Symbol.iterator) {
      return function* () {
        if (data) yield* Object.entries(data);
      };
    }
    return data?.[prop];
  },
  has: (_, prop) => {
    const data = getCALAramaicData();
    return data ? prop in data : false;
  },
  ownKeys: () => {
    const data = getCALAramaicData();
    return data ? Object.keys(data) : [];
  },
  getOwnPropertyDescriptor: (_, prop) => {
    const data = getCALAramaicData();
    if (data && prop in data) {
      return { enumerable: true, configurable: true, value: data[prop] };
    }
    return undefined;
  }
});

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
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');

  // Direct lookup
  if (data[cleaned]) {
    return { ...data[cleaned], source: 'CAL' };
  }

  // Try without final letters (כ→ך, מ→ם, etc.)
  const normalized = cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');

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
