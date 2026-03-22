/**
 * Word Lookup Service - Extracted from ClickableText.js
 *
 * Provides scholarly Hebrew and Aramaic word lookup functionality
 * with multi-source support (Jastrow, BDB, Strong's, Sefaria, etc.)
 */

import { cleanHebrewWord } from '../utils/hebrewUtils';
import { lookupWordSync as lookupHebrewSync } from './combinedTranslationService';
import { scholarlyLookup, lookupJastrow, lookupWordSefaria } from './scholarlyLexiconService';
import { HALACHIC_OVERRIDE, lookupHalachicWithPrefix } from '../utils/commentaryUtils';
import { translateEnglishToFrench } from './englishToFrenchService';
import { smartLookup, getConnectivityStatus } from './smartDataService';
import { analyzeWord as analyzeGrammar, GRAMMAR_CONSTANTS } from './grammarAnalysisService';

// Use PREFIXES and SUFFIXES from grammar service (single source of truth)
const { PREFIXES, SUFFIXES } = GRAMMAR_CONSTANTS;

/**
 * Get prefix meaning from grammar service
 */
export const getPrefixMeaning = (prefixStr) => {
  if (!prefixStr) return 'prefix';
  if (prefixStr.length === 1) {
    const prefix = PREFIXES[prefixStr];
    if (!prefix) return 'prefix';
    return prefix.meaning.split(' ')[0].replace(/[()]/g, '');
  }
  const meanings = [];
  for (const letter of prefixStr) {
    const prefix = PREFIXES[letter];
    if (prefix) {
      meanings.push(prefix.meaning.split(' ')[0].replace(/[()]/g, ''));
    }
  }
  return meanings.length > 0 ? meanings.join(' + ') : 'prefix';
};

/**
 * Get suffix meaning from grammar service
 */
export const getSuffixMeaning = (suffix) => {
  if (!suffix) return 'suffix';
  const suffixInfo = SUFFIXES[suffix];
  if (suffixInfo) return suffixInfo.meaning;
  if (suffix.startsWith('ו') && suffix.length > 1) {
    const innerSuffix = suffix.slice(1);
    const innerInfo = SUFFIXES[innerSuffix];
    if (innerInfo) return `and + ${innerInfo.meaning}`;
  }
  return 'suffix';
};

/**
 * Check HALACHIC_OVERRIDE with dynamic prefix stripping
 */
export const checkHalachicOverride = (word) => {
  if (!word) return null;

  const result = lookupHalachicWithPrefix(word);
  if (result) {
    return {
      definition: result.definition,
      prefix: result.prefix || '',
      root: result.root,
      source: result.source || 'Halachic'
    };
  }

  if (HALACHIC_OVERRIDE && HALACHIC_OVERRIDE[word]) {
    return {
      definition: HALACHIC_OVERRIDE[word],
      prefix: '',
      root: word,
      source: 'Halachic'
    };
  }

  return null;
};

/**
 * Smart detection: Is this word likely a noun?
 */
export const isLikelyNoun = (word) => {
  if (!word) return false;
  const analysis = analyzeGrammar(word);
  if (analysis?.partOfSpeech?.name === 'Noun') return true;
  const hasDefiniteArticle = /^ה/.test(word);
  const hasPluralSuffix = /(?:ים|ות|ין)$/.test(word);
  return hasDefiniteArticle || hasPluralSuffix;
};

/**
 * Is this definition describing a verb action?
 */
export const isVerbSenseDefinition = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return (
    /^to\s+\w/.test(lower) ||
    /^(intermission|cessation|resting|ceasing)/i.test(lower) ||
    /^(departure|exit|going out)/i.test(lower) ||
    /^(entering|coming in|income)/i.test(lower)
  );
};

/**
 * Create halachic source object
 */
const createHalachicSource = (overrideResult, forceHebrew = false) => {
  if (!overrideResult) return null;

  const fullTranslation = overrideResult.prefix
    ? `${overrideResult.prefix} ${overrideResult.definition}`
    : overrideResult.definition;

  const sourceName = overrideResult.source || 'Halachic';

  return {
    name: sourceName,
    definition: fullTranslation,
    fullName: `${sourceName} Context (recommended for Talmud study)`,
    headword: overrideResult.root,
    recommended: true,
    _isHalachicOverride: true,
    _forceHebrew: forceHebrew
  };
};

/**
 * Scholarly Hebrew lookup - multi-source (BDB, Strong's, Jastrow, Klein, Sefaria)
 */
export const lookupHebrewScholarlyAsync = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  const overrideResult = checkHalachicOverride(cleaned) || checkHalachicOverride(word);
  const halachicSource = createHalachicSource(overrideResult, false);

  const result = {
    word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    fullDefinition: null,
    source: 'none',
    sources: [],
    language: 'Hebrew',
    headword: null,
    root: null,
    morphology: null,
    matchedForm: null
  };

  // Check connectivity
  const connectivity = getConnectivityStatus();
  if (!connectivity.isOnline || !connectivity.sefaria) {
    const cached = await smartLookup(word, { includeFrench: true });
    if (cached?.success) {
      return {
        ...result,
        english: cached.english,
        french: cached.french,
        source: cached.source || 'cache',
        sources: cached.sources || [],
        headword: cached.headword,
        root: cached.root,
        offline: true
      };
    }
  }

  try {
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      result.english = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.headword = scholarlyResult.sources?.jastrow?.headword ||
                        scholarlyResult.sources?.bdb?.headword ||
                        cleaned;

      // Collect sources
      const sourceMap = {
        jastrow: { name: 'Jastrow', fullName: "Jastrow's Dictionary of Targumim, Talmud", year: 1903 },
        bdb: { name: 'BDB', fullName: 'Brown-Driver-Briggs Hebrew Lexicon', year: 1906 },
        strong: { name: "Strong's", fullName: "Strong's Concordance" },
        steinsaltz: { name: 'Steinsaltz', fullName: 'Steinsaltz Talmud Translation', year: 1989 },
        klein: { name: 'Klein', fullName: "Klein's Etymological Dictionary", year: 1987 },
        halot: { name: 'HALOT', fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', year: 2000 },
        sefaria: { name: 'Sefaria', fullName: 'Sefaria.org Lexicon' }
      };

      for (const [key, meta] of Object.entries(sourceMap)) {
        const src = scholarlyResult.sources?.[key];
        if (src?.definitions?.length > 0) {
          result.sources.push({
            ...meta,
            definition: src.definitions[0]?.text,
            strongNumber: src.strongNumber
          });
          if (!result.source || result.source === 'none') {
            result.source = key;
          }
        }
      }

      if (scholarlyResult.grammar) result.morphology = scholarlyResult.grammar;
      if (scholarlyResult.cognates) result.cognates = scholarlyResult.cognates;
      result.language = scholarlyResult.language || 'Hebrew';

      // Smart disambiguation
      if (result.english && result.sources.length > 0) {
        const defIsVerb = isVerbSenseDefinition(result.english);
        const wordIsNoun = isLikelyNoun(cleaned);

        if (defIsVerb && wordIsNoun) {
          for (const src of result.sources) {
            if (!src.definition || isVerbSenseDefinition(src.definition)) continue;
            if (src.definition.length >= 3 && src.definition.length < 100) {
              result.english = src.definition;
              result.source = src.name?.toLowerCase() || result.source;
              break;
            }
          }
        }
      }

      // Add halachic source
      if (halachicSource) {
        result.sources.unshift(halachicSource);
        if (!result.english || result.english.length > 50) {
          result.english = halachicSource.definition;
        }
        result.source = halachicSource.name.toLowerCase();
        result._halachicOverride = true;
      }

      // Get French translation
      if (result.english) {
        try {
          result.french = await translateEnglishToFrench(result.english);
        } catch (e) { /* Optional */ }
        smartLookup(word, { includeFrench: true }).catch(() => {});
        return result;
      }
    }
  } catch (error) {
    console.warn('Scholarly Hebrew lookup failed:', error.message);
  }

  // Fallback to sync lookup
  const syncResult = lookupHebrewSync(cleaned);
  if (syncResult?.english) {
    return {
      ...result,
      english: halachicSource?.definition || syncResult.english,
      source: halachicSource ? halachicSource.name.toLowerCase() : syncResult.source || 'local',
      sources: halachicSource ? [halachicSource, ...(syncResult.sources || [])] : syncResult.sources || [],
      headword: syncResult.headword,
      _halachicOverride: !!halachicSource
    };
  }

  if (halachicSource) {
    return {
      ...result,
      english: halachicSource.definition,
      source: halachicSource.name.toLowerCase(),
      sources: [halachicSource],
      _halachicOverride: true
    };
  }

  return result;
};

/**
 * Scholarly Aramaic lookup
 */
export const lookupAramaicAsync = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const overrideResult = checkHalachicOverride(cleaned) || checkHalachicOverride(word);
  const halachicSource = createHalachicSource(overrideResult, true);

  const result = {
    word,
    cleanedWord: cleaned,
    translation: null,
    fullDefinition: null,
    source: 'none',
    sources: [],
    language: 'Aramaic',
    headword: null,
    root: null,
    morphology: null
  };

  // Check connectivity
  const connectivity = getConnectivityStatus();
  if (!connectivity.isOnline || !connectivity.sefaria) {
    const cached = await smartLookup(word, { includeFrench: false });
    if (cached?.success) {
      return {
        ...result,
        translation: cached.english,
        source: cached.source || 'cache',
        sources: cached.sources || [],
        headword: cached.headword,
        root: cached.root,
        offline: true
      };
    }
  }

  try {
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      result.translation = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.headword = scholarlyResult.sources?.jastrow?.headword ||
                        scholarlyResult.sources?.bdb?.headword ||
                        cleaned;

      // Collect sources
      const sourceMap = {
        jastrow: { name: 'Jastrow', fullName: "Jastrow's Dictionary of Targumim, Talmud", year: 1903 },
        bdb: { name: 'BDB', fullName: 'Brown-Driver-Briggs Hebrew Lexicon', year: 1906 },
        strong: { name: "Strong's", fullName: "Strong's Concordance" },
        steinsaltz: { name: 'Steinsaltz', fullName: 'Steinsaltz Talmud Translation', year: 1989 },
        klein: { name: 'Klein', fullName: "Klein's Etymological Dictionary", year: 1987 },
        halot: { name: 'HALOT', fullName: 'Hebrew and Aramaic Lexicon of the Old Testament', year: 2000 },
        sefaria: { name: 'Sefaria', fullName: 'Sefaria.org Lexicon' }
      };

      for (const [key, meta] of Object.entries(sourceMap)) {
        const src = scholarlyResult.sources?.[key];
        if (src?.definitions?.length > 0) {
          result.sources.push({
            ...meta,
            definition: src.definitions[0]?.text,
            strongNumber: src.strongNumber
          });
          if (!result.source || result.source === 'none') {
            result.source = key;
          }
        }
      }

      if (scholarlyResult.grammar) result.morphology = scholarlyResult.grammar;
      if (scholarlyResult.cognates) result.cognates = scholarlyResult.cognates;
      result.language = scholarlyResult.language || 'Aramaic';

      // Smart disambiguation for Aramaic
      if (result.translation && result.sources.length > 0) {
        const defIsVerb = isVerbSenseDefinition(result.translation);
        const hasAramaicDefinite = /א$/.test(cleaned) || /^ד/.test(cleaned);
        const hasPluralSuffix = /(?:ין|יא|תא)$/.test(cleaned);
        const wordIsNoun = hasAramaicDefinite || hasPluralSuffix || isLikelyNoun(cleaned);

        if (defIsVerb && wordIsNoun) {
          for (const src of result.sources) {
            if (!src.definition || isVerbSenseDefinition(src.definition)) continue;
            if (src.definition.length >= 3 && src.definition.length < 100) {
              result.translation = src.definition;
              result.source = src.name?.toLowerCase() || result.source;
              break;
            }
          }
        }
      }

      // Add halachic source
      if (halachicSource) {
        result.sources.unshift(halachicSource);
        if (!result.translation || result.translation.length > 50) {
          result.translation = halachicSource.definition;
        }
        result.source = halachicSource.name.toLowerCase();
        result._halachicOverride = true;
        if (halachicSource._forceHebrew) {
          result.language = 'Hebrew';
        }
      }

      if (result.translation) {
        smartLookup(word, { includeFrench: false }).catch(() => {});
        return result;
      }
    }

    // Fallback to Jastrow
    const jastrowResult = await lookupJastrow(cleaned);
    if (jastrowResult?.shortDefinition) {
      const fallbackSources = [{ name: 'Jastrow', fullName: "Jastrow's Dictionary", definition: jastrowResult.shortDefinition }];
      if (halachicSource) fallbackSources.unshift(halachicSource);

      return {
        ...result,
        translation: halachicSource?.definition || jastrowResult.shortDefinition,
        fullDefinition: jastrowResult.definitions?.[0] || jastrowResult.shortDefinition,
        source: halachicSource ? halachicSource.name.toLowerCase() : 'jastrow',
        sources: fallbackSources,
        headword: jastrowResult.headword,
        _halachicOverride: !!halachicSource,
        language: halachicSource?._forceHebrew ? 'Hebrew' : result.language
      };
    }

    // Fallback to Sefaria
    const sefariaResult = await lookupWordSefaria(cleaned);
    if (sefariaResult?.shortDefinition) {
      const fallbackSources = [{ name: 'Sefaria', definition: sefariaResult.shortDefinition }];
      if (halachicSource) fallbackSources.unshift(halachicSource);

      return {
        ...result,
        translation: halachicSource?.definition || sefariaResult.shortDefinition,
        fullDefinition: sefariaResult.definitions?.[0] || sefariaResult.shortDefinition,
        source: halachicSource ? halachicSource.name.toLowerCase() : (sefariaResult.language === 'Aramaic' ? 'jastrow' : 'sefaria'),
        sources: fallbackSources,
        headword: sefariaResult.headword,
        language: halachicSource?._forceHebrew ? 'Hebrew' : (sefariaResult.language || 'Aramaic'),
        _halachicOverride: !!halachicSource
      };
    }
  } catch (error) {
    console.warn('Scholarly Aramaic lookup failed:', error.message);
  }

  // Fallback to sync lookup
  const syncResult = lookupHebrewSync(cleaned);
  if (syncResult?.english && syncResult.sources?.length > 0) {
    const fallbackSources = [...syncResult.sources];
    if (halachicSource && !fallbackSources.some(s => s.name === halachicSource.name)) {
      fallbackSources.unshift(halachicSource);
    }

    return {
      ...result,
      translation: halachicSource?.definition || syncResult.english,
      fullDefinition: syncResult.fullEnglish,
      source: halachicSource ? halachicSource.name.toLowerCase() : syncResult.source || 'local',
      sources: fallbackSources,
      headword: syncResult.headword,
      matchedForm: syncResult.matchedForm,
      strippedPrefix: syncResult.strippedPrefix,
      strippedSuffix: syncResult.strippedSuffix,
      _halachicOverride: !!halachicSource,
      language: halachicSource?._forceHebrew ? 'Hebrew' : syncResult.language || result.language
    };
  }

  if (halachicSource) {
    return {
      ...result,
      translation: halachicSource.definition,
      source: halachicSource.name.toLowerCase(),
      sources: [halachicSource],
      _halachicOverride: true,
      language: halachicSource._forceHebrew ? 'Hebrew' : result.language
    };
  }

  return result;
};

/**
 * Synchronous Aramaic lookup
 */
export const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const combinedResult = lookupHebrewSync(cleaned);
  return {
    word,
    cleanedWord: cleaned,
    translation: combinedResult?.english || null,
    source: combinedResult?.source || 'none',
    sources: combinedResult?.sources?.length > 0
      ? combinedResult.sources
      : combinedResult?.english ? [{ name: 'Jastrow', definition: combinedResult.english }] : [],
    language: 'Aramaic',
    headword: combinedResult?.headword
  };
};

const wordLookupService = {
  lookupHebrewScholarlyAsync,
  lookupAramaicAsync,
  lookupAramaicSync,
  getPrefixMeaning,
  getSuffixMeaning,
  checkHalachicOverride,
  isLikelyNoun,
  isVerbSenseDefinition
};

export default wordLookupService;
