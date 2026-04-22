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

import { getJastrowAramaicData } from '../services/dictionaries/dictionaryLoader';
import { stripAllDiacritics } from '../utils/hebrewUtils';
import { createLazyProxy } from './proxyHelpers';

// =============================================================================
// LAZY-LOADED LEXICON ACCESS
// =============================================================================

/** @returns {Object|null} Jastrow Aramaic data (returns Proxy for compatibility) */
export const JASTROW_ARAMAIC = createLazyProxy(getJastrowAramaicData);

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

  const cleaned = stripAllDiacritics(word);
  return data[cleaned] || null;
};

export default JASTROW_ARAMAIC;
