/**
 * useWordLookup - Custom hook for Hebrew/Aramaic word translations
 *
 * Provides a clean API for looking up words with multi-source support,
 * handling both synchronous local lookups and async API calls.
 */

import { useState, useCallback, useRef } from 'react';
import { cleanHebrewWord } from '../services/hebrewDictionary';
import { lookupWordAsync, lookupWordSync } from '../services/combinedTranslationService';
import { scholarlyLookup, lookupJastrow, lookupWordSefaria } from '../services/scholarlyLexiconService';
import { lookupAramaicWord } from '../services/babylonianDictionary';
import { translateEnglishToFrench } from '../services/englishToFrenchService';

// =============================================================================
// Source Processing
// =============================================================================

/**
 * Unified source processor - converts API response to normalized source format
 */
const processSource = (name, data, options = {}) => {
  if (!data?.definitions?.length) return null;

  const def = data.definitions.find(d => !d.isShort)?.text || data.definitions[0]?.text;
  if (!def) return null;

  return {
    name,
    fullName: options.fullName || name,
    definition: def,
    year: options.year,
    strongNumber: data.strongNumber,
    morphology: data.morphology
  };
};

/**
 * Source configuration for scholarly lookups
 */
const SOURCE_CONFIG = {
  bdb: { fullName: 'Brown-Driver-Briggs Hebrew Lexicon', year: 1906 },
  strong: { fullName: "Strong's Concordance" },
  jastrow: { fullName: "Jastrow's Dictionary of Targumim, Talmud", year: 1903 },
  klein: { fullName: "Klein's Etymological Dictionary", year: 1987 },
  steinsaltz: { fullName: 'Steinsaltz Talmud Translation', year: 1989 },
  sefaria: { fullName: 'Sefaria.org Lexicon' },
  bolls: { fullName: 'Bolls.life Bible Dictionary', year: 2020 },
  halot: { fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', year: 2000 },
  gesenius: { fullName: "Gesenius' Hebrew Grammar & Lexicon", year: 1910 },
  twot: { fullName: 'Theological Wordbook of the Old Testament', year: 1980 }
};

/**
 * Process scholarly result into normalized format
 */
const processScholarlyResult = (result, word, cleaned) => {
  const output = {
    word,
    cleanedWord: cleaned,
    english: result.primaryDefinition || null,
    french: null,
    source: 'sefaria',
    sources: [],
    language: result.language || 'Hebrew',
    headword: null,
    root: result.root || null,
    morphology: result.grammar || null,
    matchedForm: result.matchedForm || null,
    cognates: result.cognates || null
  };

  // Get headword from first available source
  output.headword = result.sources?.bdb?.headword ||
                    result.sources?.strong?.headword ||
                    result.sources?.jastrow?.headword ||
                    cleaned;

  // Process each source
  for (const [key, config] of Object.entries(SOURCE_CONFIG)) {
    const sourceData = result.sources?.[key];
    if (sourceData) {
      const processed = processSource(
        key === 'strong' ? "Strong's" : key.charAt(0).toUpperCase() + key.slice(1),
        sourceData,
        config
      );
      if (processed) {
        output.sources.push(processed);

        // Set primary source based on priority
        if (key === 'bdb') output.source = 'bdb';
        else if (key === 'jastrow' && output.source === 'sefaria') {
          output.source = 'jastrow';
          output.language = 'Aramaic';
        }
        else if (key === 'steinsaltz' && output.source === 'sefaria') {
          output.source = 'steinsaltz';
          output.language = 'Aramaic';
        }
      }
    }
  }

  // Process other/unknown sources
  if (result.sources?.other?.length > 0) {
    for (const other of result.sources.other.slice(0, 3)) {
      if (!other.definitions?.length) continue;

      const lexicon = other.lexicon || '';
      let displayName = 'Lexicon';
      let fullName = lexicon;

      // Identify known lexicons
      if (lexicon.toLowerCase().includes('halot')) {
        displayName = 'HALOT';
        fullName = 'Hebrew and Aramaic Lexicon';
      } else if (lexicon.toLowerCase().includes('gesenius')) {
        displayName = 'Gesenius';
        fullName = "Gesenius' Hebrew Grammar";
      } else if (lexicon.toLowerCase().includes('twot')) {
        displayName = 'TWOT';
        fullName = 'Theological Wordbook';
      } else if (lexicon.toLowerCase().includes('even') || lexicon.toLowerCase().includes('shoshan')) {
        displayName = 'Even-Shoshan';
        fullName = 'Even-Shoshan Hebrew Dictionary';
      } else {
        displayName = lexicon.split(' ')[0] || 'Lexicon';
      }

      // Avoid duplicates
      if (!output.sources.find(s => s.name === displayName)) {
        output.sources.push({
          name: displayName,
          fullName,
          definition: other.definitions[0]?.text
        });
      }
    }
  }

  // Fallback source if none found
  if (output.sources.length === 0 && output.english) {
    output.sources.push({
      name: 'Sefaria',
      fullName: 'Sefaria Lexicon',
      definition: output.english
    });
  }

  return output;
};

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Hebrew scholarly lookup
 */
const lookupHebrew = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  try {
    // Primary: Scholarly lookup
    const scholarly = await scholarlyLookup(cleaned);

    if (scholarly?.primaryDefinition) {
      const result = processScholarlyResult(scholarly, word, cleaned);

      // Get French translation
      if (result.english && !result.french) {
        try {
          result.french = await translateEnglishToFrench(result.english);
        } catch (e) {
          // French translation optional
        }
      }

      return result;
    }

    // Fallback: Combined lookup
    const combined = await lookupWordAsync(cleaned);
    if (combined?.english) {
      return {
        word,
        cleanedWord: cleaned,
        english: combined.english,
        french: combined.french,
        source: combined.source || 'sefaria',
        sources: combined.sources || [{ name: 'Sefaria', definition: combined.english }],
        language: combined.language || 'Hebrew'
      };
    }
  } catch (error) {
    console.warn('Hebrew lookup failed:', error.message);
  }

  // Final fallback: Local sync
  const local = lookupWordSync(cleaned);
  if (local?.english) {
    return {
      word,
      cleanedWord: cleaned,
      english: local.english,
      french: local.french,
      source: 'local',
      sources: [{ name: 'Dictionary', definition: local.english }]
    };
  }

  return { english: null, french: null, source: 'none', sources: [] };
};

/**
 * Aramaic scholarly lookup
 */
const lookupAramaic = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none', sources: [] };
  }

  const base = {
    word,
    cleanedWord: cleaned,
    translation: null,
    source: 'none',
    sources: [],
    language: 'Aramaic'
  };

  try {
    // Primary: Scholarly lookup
    const scholarly = await scholarlyLookup(cleaned);

    if (scholarly?.primaryDefinition) {
      const result = processScholarlyResult(scholarly, word, cleaned);
      return {
        ...base,
        translation: result.english,
        source: result.source,
        sources: result.sources,
        headword: result.headword,
        root: result.root,
        morphology: result.morphology,
        cognates: result.cognates,
        language: result.language
      };
    }

    // Fallback: Direct Jastrow
    const jastrow = await lookupJastrow(cleaned);
    if (jastrow?.shortDefinition) {
      return {
        ...base,
        translation: jastrow.shortDefinition,
        source: 'jastrow',
        sources: [{ name: 'Jastrow', fullName: "Jastrow's Dictionary", definition: jastrow.shortDefinition }],
        headword: jastrow.headword
      };
    }

    // Fallback: Sefaria
    const sefaria = await lookupWordSefaria(cleaned);
    if (sefaria?.shortDefinition) {
      return {
        ...base,
        translation: sefaria.shortDefinition,
        source: sefaria.language === 'Aramaic' ? 'jastrow' : 'sefaria',
        sources: [{ name: 'Sefaria', definition: sefaria.shortDefinition }],
        headword: sefaria.headword,
        language: sefaria.language || 'Aramaic'
      };
    }
  } catch (error) {
    console.warn('Aramaic lookup failed:', error.message);
  }

  // Final fallback: Local Babylonian
  const local = lookupAramaicWord(cleaned);
  if (local) {
    return {
      ...base,
      translation: local,
      source: 'babylonian',
      sources: [{ name: 'Dictionary', definition: local }]
    };
  }

  return base;
};

/**
 * Sync lookups for immediate display
 */
const lookupHebrewSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, source: 'none' };
  }

  const local = lookupWordSync(cleaned);
  return {
    word,
    cleanedWord: cleaned,
    english: local?.english || null,
    french: local?.french || null,
    source: local?.english ? 'local' : 'none',
    sources: local?.english ? [{ name: 'Dictionary', definition: local.english }] : [],
    language: 'Hebrew'
  };
};

const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const local = lookupAramaicWord(cleaned);
  return {
    word,
    cleanedWord: cleaned,
    translation: local || null,
    source: local ? 'babylonian' : 'none',
    sources: local ? [{ name: 'Dictionary', definition: local }] : [],
    language: 'Aramaic'
  };
};

// =============================================================================
// Hook
// =============================================================================

/**
 * useWordLookup - Hook for managing word lookup state and actions
 *
 * @param {Object} options
 * @param {string} options.language - 'hebrew' or 'aramaic'
 * @returns {Object} Lookup state and handlers
 */
const useWordLookup = ({ language = 'hebrew' } = {}) => {
  const [selectedWord, setSelectedWord] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  const isAramaic = language === 'aramaic';
  const syncLookup = isAramaic ? lookupAramaicSync : lookupHebrewSync;
  const asyncLookup = isAramaic ? lookupAramaic : lookupHebrew;

  /**
   * Look up a word
   */
  const lookup = useCallback(async (word) => {
    // Toggle off if same word
    if (selectedWord === word) {
      setSelectedWord(null);
      setTranslationData(null);
      return;
    }

    // Cancel previous lookup
    if (abortRef.current) {
      abortRef.current.abort = true;
    }

    const controller = { abort: false };
    abortRef.current = controller;

    setSelectedWord(word);
    setIsLoading(true);

    // Immediate local result
    const localResult = syncLookup(word);
    setTranslationData(localResult);

    // Async API lookup
    try {
      const apiResult = await asyncLookup(word);

      if (!controller.abort) {
        const hasResult = isAramaic
          ? apiResult.translation
          : apiResult.english;

        if (hasResult) {
          setTranslationData(apiResult);
        }
      }
    } catch (error) {
      console.warn('Word lookup failed:', error.message);
    } finally {
      if (!controller.abort) {
        setIsLoading(false);
      }
    }
  }, [selectedWord, syncLookup, asyncLookup, isAramaic]);

  /**
   * Clear selection
   */
  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    setSelectedWord(null);
    setTranslationData(null);
    setIsLoading(false);
  }, []);

  return {
    selectedWord,
    translationData,
    isLoading,
    isAramaic,
    lookup,
    clear
  };
};

export default useWordLookup;
export { lookupHebrew, lookupAramaic, lookupHebrewSync, lookupAramaicSync };
