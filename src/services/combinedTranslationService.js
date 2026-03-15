// =============================================================================
// Combined Translation Service
// Uses Sefaria API (BDB, Jastrow, Strong's) as primary source
// Returns multiple scholarly sources for professional Jewish study
// =============================================================================

import { scholarlyLookup, lookupWordSefaria, getSimpleTranslation, lookupJastrow } from './scholarlyLexiconService';
import { cleanHebrewWord } from './hebrewDictionary';
import { isLikelyAramaic } from './babylonianDictionary';
import { translateEnglishToFrench, quickTranslate } from './englishToFrenchService';
import { createCache } from '../utils/cache';

// Use shared cache utility for combined lookups
const combinedCache = createCache({ ttl: 60 * 60 * 1000, maxSize: 1000 }); // 1 hour

/**
 * Pick the best definition from a comma-separated list or long definition
 * Smarter selection: avoids abbreviations, prefers complete meaningful words
 * @param {string} definition - The raw definition from Sefaria
 * @returns {string} - The best definition or null if no good match
 */
const pickBestDefinition = (definition) => {
  if (!definition || typeof definition !== 'string') return null;

  // Common abbreviations and useless words to skip
  const skipPatterns = /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|interj\.|pl\.|sing\.|m\.|f\.|lit\.|fig\.)$/i;
  const skipWords = ['or', 'and', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'as', 'at', 'by'];

  /**
   * Check if a definition part is meaningful
   */
  const isMeaningful = (text) => {
    if (!text) return false;
    const cleaned = text.trim().toLowerCase();
    // Skip too short (less than 3 chars)
    if (cleaned.length < 3) return false;
    // Skip single common words
    if (skipWords.includes(cleaned)) return false;
    // Skip abbreviations
    if (skipPatterns.test(cleaned)) return false;
    // Skip if it's just numbers or punctuation
    if (/^[\d\s.,:;!?]+$/.test(cleaned)) return false;
    // Skip too long (over 80 chars for display)
    if (cleaned.length > 80) return false;
    return true;
  };

  // If definition has commas, pick the FIRST meaningful part
  if (definition.includes(',')) {
    const parts = definition.split(',')
      .map(p => p.trim())
      .filter(isMeaningful);

    if (parts.length > 0) {
      return parts[0];
    }
  }

  // If definition is very long, get first part before parentheses
  if (definition.length > 80) {
    const match = definition.match(/^([^(;]+)/);
    if (match && isMeaningful(match[1])) {
      return match[1].trim();
    }
  }

  // Check if the whole definition is meaningful
  const cleaned = definition.replace(/[,;.]+$/, '').trim();
  if (isMeaningful(cleaned)) {
    return cleaned;
  }

  // Return null if nothing meaningful found
  return null;
};

/**
 * Clean and validate a Hebrew word
 * @param {string} word - The word to clean
 * @returns {string} - Cleaned word
 */
const cleanWord = (word) => {
  return cleanHebrewWord(word);
};

/**
 * Get cached result if available
 */
const getCached = (word) => {
  return combinedCache.get(word);
};

/**
 * Set cache for a word
 */
const setCache = (word, data) => {
  combinedCache.set(word, data);
};

/**
 * Lookup a Hebrew/Aramaic word using Sefaria scholarly sources
 * Returns both English and French translations with multiple sources
 *
 * @param {string} word - The Hebrew/Aramaic word
 * @returns {Promise<object>} - Translation result with multiple sources
 */
export const lookupWordAsync = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  // Check cache first
  const cached = getCached(cleaned);
  if (cached) return cached;

  let result = {
    word: word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    source: 'none',
    sources: [], // Multiple scholarly sources
    sefariaData: null,
    language: 'Hebrew'
  };

  try {
    // Use scholarly lookup for comprehensive multi-source results
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      // Try to get a meaningful short definition, fall back to full
      const bestDef = pickBestDefinition(scholarlyResult.primaryDefinition);
      result.english = bestDef || scholarlyResult.primaryDefinition;
      result.fullEnglish = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.headword = scholarlyResult.sources?.bdb?.headword ||
                        scholarlyResult.sources?.jastrow?.headword ||
                        scholarlyResult.sources?.strong?.headword ||
                        cleaned;
      result.language = scholarlyResult.language || 'Hebrew';

      // Default source to 'sefaria' when we have a definition
      // Will be overridden if specific source is identified
      result.source = 'sefaria';

      // Collect all available scholarly sources
      if (scholarlyResult.sources?.bdb) {
        const bdbDefs = scholarlyResult.sources.bdb.definitions || [];
        const bdbDef = bdbDefs.length > 0 ? bdbDefs[0]?.text : scholarlyResult.primaryDefinition;
        if (bdbDef) {
          result.sources.push({
            name: 'BDB',
            fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
            definition: bdbDef,
            year: 1906
          });
          result.source = 'bdb';
        }
      }

      if (scholarlyResult.sources?.jastrow) {
        const jastrowDefs = scholarlyResult.sources.jastrow.definitions || [];
        const jastrowDef = jastrowDefs.length > 0 ? jastrowDefs[0]?.text : null;
        if (jastrowDef) {
          result.sources.push({
            name: 'Jastrow',
            fullName: "Jastrow's Dictionary of Targumim, Talmud",
            definition: jastrowDef,
            year: 1903
          });
          if (result.source === 'sefaria') result.source = 'jastrow';
          result.language = 'Aramaic';
        }
      }

      if (scholarlyResult.sources?.strong) {
        const strongDefs = scholarlyResult.sources.strong.definitions || [];
        const strongDef = strongDefs.length > 0 ? strongDefs[0]?.text : null;
        if (strongDef) {
          result.sources.push({
            name: "Strong's",
            fullName: "Strong's Concordance",
            definition: strongDef,
            strongNumber: scholarlyResult.sources.strong.strongNumber
          });
          if (result.source === 'sefaria') result.source = 'strong';
        }
      }

      if (scholarlyResult.sources?.klein) {
        const kleinDefs = scholarlyResult.sources.klein.definitions || [];
        const kleinDef = kleinDefs.length > 0 ? kleinDefs[0]?.text : null;
        if (kleinDef) {
          result.sources.push({
            name: 'Klein',
            fullName: "Klein's Etymological Dictionary",
            definition: kleinDef,
            year: 1987
          });
        }
      }

      // Add Steinsaltz if available (Aramaic/Talmudic)
      if (scholarlyResult.sources?.steinsaltz) {
        const steinsaltzDefs = scholarlyResult.sources.steinsaltz.definitions || [];
        const steinsaltzDef = steinsaltzDefs.length > 0 ? steinsaltzDefs[0]?.text : null;
        if (steinsaltzDef) {
          result.sources.push({
            name: 'Steinsaltz',
            fullName: 'Steinsaltz Talmud Dictionary',
            definition: steinsaltzDef,
            year: 1989
          });
          result.language = 'Aramaic';
        }
      }

      // Add Bolls.life if available (online BDB API)
      if (scholarlyResult.sources?.bolls) {
        const bollsDefs = scholarlyResult.sources.bolls.definitions || [];
        const bollsDef = bollsDefs.length > 0 ? bollsDefs[0]?.text : null;
        if (bollsDef) {
          result.sources.push({
            name: 'Bolls.life',
            fullName: 'Bolls.life Bible Dictionary (BDB)',
            definition: bollsDef,
            year: 2020,
            strongNumber: scholarlyResult.sources.bolls.strongNumber
          });
          if (result.source === 'sefaria') result.source = 'bolls';
        }
      }

      // Add STEP Bible if available (Strong's definitions)
      if (scholarlyResult.sources?.step) {
        const stepDefs = scholarlyResult.sources.step.definitions || [];
        const stepDef = stepDefs.length > 0 ? stepDefs[0]?.text : null;
        if (stepDef) {
          result.sources.push({
            name: 'STEP Bible',
            fullName: 'Scripture Tools for Every Person',
            definition: stepDef,
            year: 2021,
            strongNumber: scholarlyResult.sources.step.strongNumber,
            transliteration: scholarlyResult.sources.step.transliteration
          });
          if (result.source === 'sefaria') result.source = 'step';
        }
      }

      // Add HALOT if available (modern scholarly lexicon)
      if (scholarlyResult.sources?.halot) {
        const halotDefs = scholarlyResult.sources.halot.definitions || [];
        const halotDef = halotDefs.length > 0 ? halotDefs[0]?.text : null;
        if (halotDef) {
          result.sources.push({
            name: 'HALOT',
            fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
            definition: halotDef,
            year: 2000
          });
        }
      }

      // Add Gesenius if available (classical Hebrew grammar)
      if (scholarlyResult.sources?.gesenius) {
        const geseniusDefs = scholarlyResult.sources.gesenius.definitions || [];
        const geseniusDef = geseniusDefs.length > 0 ? geseniusDefs[0]?.text : null;
        if (geseniusDef) {
          result.sources.push({
            name: 'Gesenius',
            fullName: "Gesenius' Hebrew Grammar & Lexicon",
            definition: geseniusDef,
            year: 1910
          });
        }
      }

      // Add TWOT if available (theological analysis)
      if (scholarlyResult.sources?.twot) {
        const twotDefs = scholarlyResult.sources.twot.definitions || [];
        const twotDef = twotDefs.length > 0 ? twotDefs[0]?.text : null;
        if (twotDef) {
          result.sources.push({
            name: 'TWOT',
            fullName: 'Theological Wordbook of the Old Testament',
            definition: twotDef,
            year: 1980
          });
        }
      }

      // If we still have no specific sources but have a definition, add Sefaria as source
      if (result.sources.length === 0 && result.english) {
        result.sources.push({
          name: 'Sefaria',
          fullName: 'Sefaria Lexicon',
          definition: result.english
        });
      }

      if (scholarlyResult.grammar) {
        result.morphology = scholarlyResult.grammar;
      }

      if (scholarlyResult.cognates) {
        result.cognates = scholarlyResult.cognates;
      }
    }
  } catch (error) {
    console.warn('Scholarly lookup failed:', error.message);
  }

  // Fallback to simple Sefaria lookup if scholarly failed
  if (!result.english) {
    try {
      const sefariaResult = await getSimpleTranslation(cleaned);
      if (sefariaResult) {
        result.english = pickBestDefinition(sefariaResult);
        result.fullEnglish = sefariaResult;
        result.source = 'sefaria';
        result.sources.push({
          name: 'Sefaria',
          fullName: 'Sefaria Lexicon',
          definition: result.english
        });

        // Get full Sefaria data for additional info
        const fullData = await lookupWordSefaria(cleaned);
        if (fullData) {
          result.sefariaData = {
            language: fullData.language,
            headword: fullData.headword,
            strongNumber: fullData.strongNumber,
            morphology: fullData.morphology,
            definitions: fullData.definitions
          };
          result.language = fullData.language || 'Hebrew';
        }
      }
    } catch (error) {
      console.warn('Sefaria lookup failed:', error.message);
    }
  }

  // Try Jastrow specifically for Aramaic words
  if (!result.english || isLikelyAramaic(cleaned)) {
    try {
      const jastrowResult = await lookupJastrow(cleaned);
      if (jastrowResult?.shortDefinition) {
        if (!result.english) {
          result.english = jastrowResult.shortDefinition;
          result.source = 'jastrow';
        }
        // Add Jastrow if not already in sources
        if (!result.sources.find(s => s.name === 'Jastrow')) {
          result.sources.push({
            name: 'Jastrow',
            fullName: "Jastrow's Dictionary of Targumim, Talmud",
            definition: jastrowResult.shortDefinition,
            year: 1903
          });
        }
        result.language = 'Aramaic';
        result.headword = jastrowResult.headword || result.headword;
      }
    } catch (error) {
      console.warn('Jastrow lookup failed:', error.message);
    }
  }

  // Check if word is Aramaic (for UI indication)
  if (isLikelyAramaic(cleaned)) {
    result.isAramaic = true;
    result.language = 'Aramaic';
  }

  // Get French translation - try quick lookup first, then API
  if (result.english) {
    // Use the short definition for translation
    const textToTranslate = result.english.length > 200
      ? (pickBestDefinition(result.english) || result.english.substring(0, 200))
      : result.english;

    // First try quick translation (cache + common words - no API call)
    const quickFrench = quickTranslate(textToTranslate);
    if (quickFrench) {
      result.french = quickFrench;
      result.frenchSource = 'Dictionary';
    } else {
      // Fall back to API translation (rate limited)
      try {
        const translatedFrench = await translateEnglishToFrench(textToTranslate);
        if (translatedFrench) {
          result.french = translatedFrench;
          result.frenchSource = 'MyMemory';
        } else {
          result.french = null;
          result.frenchSource = 'none';
        }
      } catch (error) {
        console.warn('French translation failed:', error.message);
        result.french = null;
        result.frenchSource = 'error';
      }
    }
  }

  // Cache the result
  setCache(cleaned, result);

  return result;
};

/**
 * Synchronous lookup - returns cached data or loading state
 * Use this for immediate display, then call lookupWordAsync for full data
 *
 * @param {string} word - The Hebrew word
 * @returns {object} - Cached result or loading placeholder
 */
export const lookupWordSync = (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  // Check cache first (might have full scholarly result)
  const cached = getCached(cleaned);
  if (cached) return cached;

  // No cache - return loading state, don't use local dictionaries
  // API will provide real scholarly data
  const isAramaic = isLikelyAramaic(cleaned);

  return {
    word: word,
    cleanedWord: cleaned,
    english: null, // Will be filled by API
    french: null,
    frenchSource: 'none',
    source: 'none',
    sources: [],
    isAramaic,
    language: isAramaic ? 'Aramaic' : 'Hebrew',
    sefariaData: null,
    isLoading: true // Indicates API lookup should be triggered
  };
};

/**
 * Prefetch translations for multiple words using scholarly sources
 * Useful for loading a verse/paragraph
 *
 * @param {string[]} words - Array of Hebrew words
 * @returns {Promise<Map<string, object>>} - Map of word to translation
 */
export const prefetchTranslations = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.map(cleanWord).filter(w => w && w.length >= 2))];

  // First, get all from cache
  const needsApi = [];
  for (const word of uniqueWords) {
    const cached = getCached(word);
    if (cached) {
      results.set(word, cached);
    } else {
      needsApi.push(word);
    }
  }

  // Fetch from Sefaria API for words not in cache
  if (needsApi.length > 0) {
    await fetchFromSefariaInBackground(needsApi, results);
  }

  return results;
};

/**
 * Background fetch from Sefaria API using scholarly lookup
 */
const fetchFromSefariaInBackground = async (words, results) => {
  const batchSize = 3;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);

    const promises = batch.map(async (word) => {
      try {
        const result = await lookupWordAsync(word);
        if (result.english) {
          results.set(word, result);
        }
      } catch {
        // Keep any existing result
      }
    });

    await Promise.all(promises);

    // Small delay between batches
    if (i + batchSize < words.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
};

/**
 * Check if a word has any translation available
 * @param {string} word - The Hebrew word
 * @returns {boolean} - True if translation might exist
 */
export const hasTranslation = (word) => {
  const cleaned = cleanWord(word);
  // All Hebrew words with 2+ letters potentially have translations via Sefaria
  return cleaned && cleaned.length >= 2;
};

/**
 * Clear all caches
 */
export const clearCaches = () => {
  combinedCache.clear();
};

const combinedTranslationService = {
  lookupWordAsync,
  lookupWordSync,
  prefetchTranslations,
  hasTranslation,
  clearCaches
};

export default combinedTranslationService;
