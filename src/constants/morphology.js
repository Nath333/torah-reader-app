// =============================================================================
// Morphology Constants — FAÇADE (splits functionWords 03/10 + 20/10/2026)
//
// Les données et l'analyse vivent désormais dans ./morphology/ :
//   functionWords.js   mots-outils (extrait 03/10)
//   prefixSuffixData.js  préfixes/suffixes (données + getters)
//   patternsData.js    patterns verbaux/nominaux (regex)
//   rootValidation.js  validation de racine + racines talmudiques
//   aramaicMorphology.js conjugaison/binyanim/racine araméens
//   confidenceAnalysis.js analyse à confiance multiples
//   hebrewBinyanim.js  binyanim hébreux
// Cette façade garde l'intégralité de la surface publique historique :
// aucun importeur modifié. NB : ARAMAIC_BINYANIM existe aussi (autre modèle)
// dans morphologyPatterns.js — unification Reportée (choix de modèle).
// =============================================================================

import { stripAllDiacritics } from '../utils/hebrewUtils';
import { STOP_WORDS, isStopWord, FUNCTION_WORDS, lookupFunctionWord } from './morphology/functionWords';
export { STOP_WORDS, isStopWord, FUNCTION_WORDS, lookupFunctionWord };

import {
  HEBREW_PREFIX_MEANINGS, getPrefixMeaning, getPrefixInfo,
  HEBREW_PREFIXES_ORDERED, SINGLE_PREFIXES, HEBREW_SUFFIXES_ORDERED,
  HEBREW_VERB_PREFIXES, HEBREW_VERB_SUFFIXES,
  ARAMAIC_PREFIXES, getCombinedPrefixMeaning
} from './morphology/prefixSuffixData';
import { VERB_PATTERNS, ARAMAIC_VERB_PATTERNS, NOUN_PATTERNS } from './morphology/patternsData';
import {
  isLikelyCompleteRoot, smartPrefixAnalysis, getCommonTalmudicRoots
} from './morphology/rootValidation';
import {
  CONJUGATION_PREFIXES, CONJUGATION_SUFFIXES, ARAMAIC_BINYANIM, WEAK_VERB_TYPES,
  getConjugationPrefixLabel, getConjugationSuffixLabel, computeVerbTranslation,
  extractAramaicRoot
} from './morphology/aramaicMorphology';
import {
  analyzeWordWithConfidence, getAramaicConfidence, ABBREVIATION_EXPANSIONS
} from './morphology/confidenceAnalysis';
import {
  HEBREW_BINYANIM, detectHebrewBinyan, getBinyanInfo, extractHebrewRoot
} from './morphology/hebrewBinyanim';

export {
  HEBREW_PREFIX_MEANINGS, getPrefixMeaning, getPrefixInfo,
  HEBREW_PREFIXES_ORDERED, SINGLE_PREFIXES, HEBREW_SUFFIXES_ORDERED,
  HEBREW_VERB_PREFIXES, HEBREW_VERB_SUFFIXES,
  ARAMAIC_PREFIXES, getCombinedPrefixMeaning,
  VERB_PATTERNS, ARAMAIC_VERB_PATTERNS, NOUN_PATTERNS,
  isLikelyCompleteRoot, smartPrefixAnalysis, getCommonTalmudicRoots,
  CONJUGATION_PREFIXES, CONJUGATION_SUFFIXES, ARAMAIC_BINYANIM, WEAK_VERB_TYPES,
  getConjugationPrefixLabel, getConjugationSuffixLabel, computeVerbTranslation,
  extractAramaicRoot,
  analyzeWordWithConfidence, getAramaicConfidence, ABBREVIATION_EXPANSIONS,
  HEBREW_BINYANIM, detectHebrewBinyan, getBinyanInfo, extractHebrewRoot
};

const morphology = {
  HEBREW_PREFIX_MEANINGS,
  HEBREW_PREFIXES_ORDERED,
  HEBREW_SUFFIXES_ORDERED,
  SINGLE_PREFIXES,
  STOP_WORDS,
  ARAMAIC_PREFIXES,
  FUNCTION_WORDS,
  getPrefixMeaning,
  getPrefixInfo,
  getCombinedPrefixMeaning,
  isStopWord,
  isLikelyCompleteRoot,
  smartPrefixAnalysis,
  lookupFunctionWord,
  // PRO SCHOLAR: Smart root extraction with weak verb reconstruction
  extractAramaicRoot,
  // PRO SCHOLAR: Systematic translation from pattern analysis
  computeVerbTranslation,
  // PRO SCHOLAR: Confidence-based analysis
  analyzeWordWithConfidence,
  getAramaicConfidence,
  // PRO SCHOLAR: Hebrew Binyanim detection
  HEBREW_BINYANIM,
  detectHebrewBinyan,
  getBinyanInfo,
  extractHebrewRoot,
};

export default morphology;
