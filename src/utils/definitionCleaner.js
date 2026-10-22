// =============================================================================
// Definition Cleaner — FAÇADE (split 22/10)
// Nettoyage unifié des définitions de dictionnaires, priorisation par contexte
// (Talmud vs Biblique), sélection et scoring systématiques.
// Modules sous ./definitionCleaner/ : contextConfig, clean, classifiers,
// selection, scoring. Surface publique + default conservées.
// =============================================================================

import { CONTEXT_MODES, SOURCE_PRIORITIES, getSourcePriority, shouldSkipSource } from './definitionCleaner/contextConfig';
import { cleanDefinition, extractCrossReference } from './definitionCleaner/clean';
import { pickBestDefinition, formatForTooltip, followCrossReference } from './definitionCleaner/selection';
import { scoreDefinition, pickBestFromCandidates } from './definitionCleaner/scoring';
import {
  isProperNounEntry, isTransliterationOnly, isObscureNounDefinition, isGrammaticalDefinition
} from './definitionCleaner/classifiers';

export {
  // Contexte
  CONTEXT_MODES, SOURCE_PRIORITIES, getSourcePriority, shouldSkipSource,
  // Nettoyage
  cleanDefinition, extractCrossReference,
  // Sélection
  pickBestDefinition, formatForTooltip, followCrossReference,
  // Scoring
  scoreDefinition, pickBestFromCandidates
};

const definitionCleaner = {
  cleanDefinition,
  pickBestDefinition,
  formatForTooltip,
  extractCrossReference,
  followCrossReference,
  isProperNounEntry,
  isGrammaticalDefinition,
  isObscureNounDefinition,
  scoreDefinition,
  pickBestFromCandidates,
  // PRO SCHOLAR v2: Context-aware source prioritization
  CONTEXT_MODES,
  SOURCE_PRIORITIES,
  getSourcePriority,
  shouldSkipSource,
};

export default definitionCleaner;

