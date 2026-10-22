// =============================================================================
// Commentary Utilities — FAÇADE (split 22/10)
// Fonctions partagées de traitement du texte des commentaires (Rashi, Talmud).
// Modules sous ./commentaryUtils/ : data (pures), halachic (lookup à préfixes),
// glossary (moteur), translation (pipeline he→en), processing (appariement).
// Surface publique intégrale conservée (exports nommés uniquement — pas de
// default export historique).
// =============================================================================

import { normalizeQuotes } from './commentaryUtils/translation';
import { lookupHalachicWithPrefix } from './commentaryUtils/halachic';
import {
  TALMUDIC_ABBREVIATIONS, HALACHIC_OVERRIDE, RASHI_VOCABULARY
} from './commentaryUtils/data';
import {
  extractDibbur, processCommentArray, processTalmudComments,
  processTalmudCommentsParallel, createErrorResponse, cleanTextArray,
  processCommentArrayWithTranslation
} from './commentaryUtils/processing';

export {
  // Normalisation / lookup
  normalizeQuotes, lookupHalachicWithPrefix,
  // Constantes partagées (contrat historique du bloc de queue)
  TALMUDIC_ABBREVIATIONS, HALACHIC_OVERRIDE, RASHI_VOCABULARY,
  // Processing
  extractDibbur, processCommentArray, processTalmudComments,
  processTalmudCommentsParallel, createErrorResponse, cleanTextArray,
  processCommentArrayWithTranslation
};
