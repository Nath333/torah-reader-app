// =============================================================================
// Bases d'étymologie (sefariaCache, rootMeaningsPro, etymologyJastrow,
// wiktionaryCache) + lookupAllEtymology (mot → racine → racines alternatives).
// Extrait de dictionaryLoader.js (recette docs/DECOUPE-MONOLITHES.md).
// =============================================================================

import { extractRootHelper } from './loaderCore';

// =============================================================================
// MAJOR ETYMOLOGY DATABASES
// =============================================================================

/**
 * Get Sefaria lexicon cache (2,493 entries)
 * Pre-parsed Klein, BDB, Jastrow, Strong's from Sefaria API
 * @returns {Promise<Object>} Sefaria cache data
 */
export async function getSefariaCache() {
  return loadDictionary('sefariaCache');
}

/**
 * Get Pro root meanings database (18,898 entries)
 * Main unified etymology database with all scholarly sources
 * @returns {Promise<Object>} Root meanings pro data
 */
export async function getRootMeaningsPro() {
  return loadDictionary('rootMeaningsPro');
}

/**
 * Get Jastrow extracted etymology (16,794 entries)
 * Cross-references and etymological data parsed from Jastrow
 * @returns {Promise<Object>} Etymology Jastrow data
 */
export async function getEtymologyJastrow() {
  return loadDictionary('etymologyJastrow');
}

/**
 * Get Wiktionary etymology cache (108+ entries)
 * Proto-Semitic reconstructions and cognate data
 * @returns {Promise<Object>} Wiktionary cache data
 */
export async function getWiktionaryCache() {
  return loadDictionary('wiktionaryCache');
}

/**
 * Synchronous access to  etymology databases
 */
export function getSefariaCacheData() { return cache.sefariaCache; }
export function getRootMeaningsProData() { return cache.rootMeaningsPro; }
export function getEtymologyJastrowData() { return cache.etymologyJastrow; }
export function getWiktionaryCacheData() { return cache.wiktionaryCache; }

/**
 * Lookup word in all etymology databases (DRY refactor)
 * SMART: If exact word not found, automatically tries 3-letter root extraction
 * @param {string} word - Hebrew/Aramaic word (inflected form like יציאות)
 * @returns {Promise<Object>} Combined etymology data from all sources
 */
export async function lookupAllEtymology(word) {
  // Helper to lookup a single word in all databases
  const lookupWord = async (w) => {
    const accessData = (d, key) => d?.[key] || d?.entries?.[key] || d?.byWord?.[key] || null;

    const [sefaria, rootPro, jastrowEty, wiktionary] = await Promise.all([
      getSefariaCache().then(d => accessData(d, w)).catch(() => null),
      getRootMeaningsPro().then(d => accessData(d, w)).catch(() => null),
      getEtymologyJastrow().then(d => accessData(d, w)).catch(() => null),
      getWiktionaryCache().then(d => accessData(d, w)).catch(() => null)
    ]);
    return { sefaria, rootMeaningsPro: rootPro, etymologyJastrow: jastrowEty, wiktionary };
  };

  // Check if result has any data
  const hasData = (result) => !!(result.sefaria || result.rootMeaningsPro ||
    result.etymologyJastrow || result.wiktionary);

  const { root: extractedRoot, alternativeRoots } = await extractRootHelper(word);

  // First try exact word lookup
  const exactResult = await lookupWord(word);
  if (hasData(exactResult)) {
    return {
      ...exactResult,
      hasEtymology: true,
      lookupWord: word,
      extractedRoot: extractedRoot !== word ? extractedRoot : null,
      usedRootFallback: false
    };
  }

  // Try root-based lookup if we have an extracted root
  if (extractedRoot && extractedRoot !== word) {
    const rootResult = await lookupWord(extractedRoot);
    if (hasData(rootResult)) {
      return {
        ...rootResult,
        hasEtymology: true,
        lookupWord: word,
        extractedRoot,
        alternativeRoots,
        usedRootFallback: true
      };
    }

    // Try alternative roots in parallel if primary failed
    if (alternativeRoots.length > 0) {
      const altResults = await Promise.all(
        alternativeRoots.map(async (alt) => {
          const result = await lookupWord(alt.root);
          return { ...alt, result, found: hasData(result) };
        })
      );

      const successfulAlt = altResults.find(a => a.found);
      if (successfulAlt) {
        return {
          ...successfulAlt.result,
          hasEtymology: true,
          lookupWord: word,
          extractedRoot: successfulAlt.root,
          primaryRootAttempt: extractedRoot,
          alternativeRoots: alternativeRoots.filter(a => a.root !== successfulAlt.root),
          usedRootFallback: true,
          usedAlternativeRoot: true
        };
      }
    }
  }

  // Nothing found
  return {
    ...exactResult,
    hasEtymology: false,
    lookupWord: word,
    extractedRoot,
    alternativeRoots
  };
}
