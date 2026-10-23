// =============================================================================
// Grammar Analysis Service — FAÇADE (split 23/10)
// Analyse grammaticale hébreu/araméen : racines, binyanim, morphologie.
// Modules sous ./grammarAnalysis/ : dictionaryHelpers, data (pures +
// lookup talmudique), rootBinyan, analysis, verbAnalysis. La façade garde
// GRAMMAR_CONSTANTS + getBinyanInfo/getAllBinyanim + default.
// =============================================================================

import {
  BINYANIM, ARAMAIC_BINYANIM, TENSES, PARTS_OF_SPEECH, COMMON_ROOTS,
  TALMUDIC_TERMS, PREFIXES, PRONOMINAL_SUFFIXES, SUFFIXES
} from './grammarAnalysis/data';
import { isValidDictionaryWord, getDictionarySource } from './grammarAnalysis/dictionaryHelpers';
import { extractRoot, detectBinyan } from './grammarAnalysis/rootBinyan';
import {
  analyzeVerb, analyzeWord, analyzePhrase, getGrammarSummary, getInlineGloss
} from './grammarAnalysis/analysis';
import { tryHebrewVerbAnalysis } from './grammarAnalysis/verbAnalysis';

export { PRONOMINAL_SUFFIXES, SUFFIXES };
export {
  extractRoot, detectBinyan,
  analyzeVerb, analyzeWord, analyzePhrase,
  getGrammarSummary, getInlineGloss,
  tryHebrewVerbAnalysis
};

// Export constants for use in UI
export const GRAMMAR_CONSTANTS = {
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSES,
  PARTS_OF_SPEECH,
  PREFIXES,
  SUFFIXES,
  PRONOMINAL_SUFFIXES,
  COMMON_ROOTS,
  TALMUDIC_TERMS
};

/**
 * Get Binyan information for display
 * @param {string} binyanKey - The binyan key (qal, piel, etc.)
 * @param {boolean} isAramaic - Whether to use Aramaic binyanim
 * @returns {Object|null} Full binyan data
 */
export function getBinyanInfo(binyanKey, isAramaic = false) {
  if (!binyanKey) return null;
  const source = isAramaic ? ARAMAIC_BINYANIM : BINYANIM;
  return source[binyanKey] || null;
}

/**
 * Get all binyanim for display/selection
 * @param {boolean} includeAramaic - Include Aramaic binyanim
 * @returns {Array} Array of binyan objects
 */
export function getAllBinyanim(includeAramaic = false) {
  const result = Object.entries(BINYANIM).map(([key, data]) => ({
    key,
    ...data,
    isAramaic: false
  }));

  if (includeAramaic) {
    const aramaic = Object.entries(ARAMAIC_BINYANIM).map(([key, data]) => ({
      key,
      ...data,
      isAramaic: true
    }));
    result.push(...aramaic);
  }

  return result;
}


const grammarAnalysisService = {
  analyzeWord,
  analyzeVerb,
  analyzePhrase,
  extractRoot,
  detectBinyan,
  getBinyanInfo,
  getAllBinyanim,
  getGrammarSummary,
  getInlineGloss,
  getDictionarySource,
  isValidDictionaryWord,
  tryHebrewVerbAnalysis,
  GRAMMAR_CONSTANTS
};

export default grammarAnalysisService;

