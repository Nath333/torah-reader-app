/**
 * Jastrow Aramaic (Small Subset) - Lazy-loaded from JSON
 *
 * BUNDLE OPTIMIZATION: The dictionary data (~18KB) has been moved to
 * public/data/jastrow_aramaic.json and is now lazy-loaded via dictionaryLoader.js.
 *
 * This is a small subset of Jastrow's Dictionary focused on common Aramaic words.
 * For the full Jastrow dictionary (25K entries), use dictionaryLoader.js.
 *
 * Total: ~86 entries (loaded on-demand, not bundled)
 */

import { getJastrowAramaicData } from '../services/dictionaryLoader';

// =============================================================================
// LAZY-LOADED LEXICON ACCESS
// =============================================================================

/** @returns {Object|null} Jastrow Aramaic data (returns Proxy for compatibility) */
export const JASTROW_ARAMAIC = new Proxy({}, {
  get: (_, prop) => {
    const data = getJastrowAramaicData();
    if (prop === Symbol.iterator) {
      return function* () {
        if (data) yield* Object.entries(data);
      };
    }
    return data?.[prop];
  },
  has: (_, prop) => {
    const data = getJastrowAramaicData();
    return data ? prop in data : false;
  },
  ownKeys: () => {
    const data = getJastrowAramaicData();
    return data ? Object.keys(data) : [];
  },
  getOwnPropertyDescriptor: (_, prop) => {
    const data = getJastrowAramaicData();
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
 * Look up a word in Jastrow Aramaic (small subset)
 * @param {string} word - Aramaic word (with or without nikud)
 * @returns {Object|null} - Jastrow entry or null if not found
 */
export const lookupJastrowLocal = (word) => {
  if (!word) return null;
  const data = getJastrowAramaicData();
  if (!data) return null;

  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');
  return data[cleaned] || null;
};

export default JASTROW_ARAMAIC;
