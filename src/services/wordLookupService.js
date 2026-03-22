/**
 * Word Lookup Service V3.0 - Thin Wrapper Around Orchestrator
 *
 * This file maintains backward compatibility while delegating all logic
 * to the unified wordLookupOrchestrator.
 *
 * DEPRECATED: Components should import directly from wordLookupOrchestrator.
 * This file exists only for backward compatibility with existing imports.
 */

import {
  lookupWord,
  quickLookup,
  getFrenchTranslation,
  cleanHebrewWord
} from './wordLookupOrchestrator';
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
 * Check HALACHIC_OVERRIDE - now handled by preClassificationService
 * @deprecated Use preClassify from preClassificationService instead
 */
export const checkHalachicOverride = (word) => {
  // Handled by preClassificationService in orchestrator
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
 * Scholarly Hebrew lookup - NOW DELEGATES TO ORCHESTRATOR
 *
 * @param {string} word - The word to look up
 * @param {Object} options - { reference: "Shabbat 2a" }
 * @returns {Promise<Object>} Normalized lookup result
 */
export const lookupHebrewScholarlyAsync = async (word, options = {}) => {
  const { reference } = options;
  const cleaned = cleanHebrewWord(word);

  if (!cleaned || cleaned.length < 2) {
    return {
      english: null,
      french: null,
      source: 'none',
      sources: [],
      word,
      cleanedWord: cleaned,
      language: 'Hebrew'
    };
  }

  try {
    const result = await lookupWord(word, {
      contextType: 'biblical',
      reference,
      includeV6: true,
      includeBinyan: true,
      includeGrammar: true
    });

    // Get French translation if needed
    if (result.english && !result.french) {
      try {
        result.french = await getFrenchTranslation(result.english);
      } catch {
        // French is optional
      }
    }

    return result;
  } catch (error) {
    console.warn('[wordLookupService] Hebrew lookup failed:', error.message);
    return {
      english: null,
      french: null,
      source: 'none',
      sources: [],
      word,
      cleanedWord: cleaned,
      language: 'Hebrew'
    };
  }
};

/**
 * Scholarly Aramaic lookup - NOW DELEGATES TO ORCHESTRATOR
 *
 * @param {string} word - The word to look up
 * @param {Object} options - { reference: "Shabbat 2a" }
 * @returns {Promise<Object>} Normalized lookup result
 */
export const lookupAramaicAsync = async (word, options = {}) => {
  const { reference } = options;
  const cleaned = cleanHebrewWord(word);

  if (!cleaned || cleaned.length < 2) {
    return {
      translation: null,
      source: 'none',
      word,
      cleanedWord: cleaned,
      language: 'Aramaic'
    };
  }

  try {
    const result = await lookupWord(word, {
      contextType: 'talmudic',
      reference,
      includeV6: true,
      includeBinyan: true,
      includeGrammar: true
    });

    // Ensure Aramaic compatibility
    return {
      ...result,
      translation: result.english || result.translation,
      language: result.language || 'Aramaic'
    };
  } catch (error) {
    console.warn('[wordLookupService] Aramaic lookup failed:', error.message);
    return {
      translation: null,
      source: 'none',
      word,
      cleanedWord: cleaned,
      language: 'Aramaic'
    };
  }
};

/**
 * Synchronous Aramaic lookup - NOW DELEGATES TO ORCHESTRATOR
 */
export const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);

  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const result = quickLookup(cleaned);

  return {
    word,
    cleanedWord: cleaned,
    translation: result?.english || null,
    source: result?.source || 'none',
    sources: result?.sources || [],
    language: 'Aramaic',
    headword: result?.headword
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
