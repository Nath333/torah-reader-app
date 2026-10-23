// =============================================================================
// Learning Recommendation Service — FAÇADE (split 23/10)
// Recommandations adaptatives et optimisation de session d'étude.
// Modules sous ./learningRecommendation/ : config (pures), state (ÉTAT +
// persistance), recommendations (génération), studyOptimizer (scoring/sessions).
// Surface publique + default conservées.
// =============================================================================

import { LEARNING_LEVELS } from './learningRecommendation/config';
import { PRIORITY_WEIGHTS, ROOT_FAMILIES, FREQUENCY_TIERS, SESSION_CONFIG } from './learningRecommendation/studyOptimizer';
import {
  initializeRecommendations, calculateLevel, trackStudyActivity,
  syncProgress, matchParshaIndex, setCurrentParsha
} from './learningRecommendation/state';
import {
  generateRecommendations, dismissRecommendation, getRecommendations,
  getProgressSummary, resetRecommendations
} from './learningRecommendation/recommendations';
import {
  calculatePriorityScore, createOptimizedSession, analyzeRootFamilyGaps,
  identifyWeakAreas, generateMilestones, getStudyFocus
} from './learningRecommendation/studyOptimizer';

export {
  // Config
  LEARNING_LEVELS,
  // État
  initializeRecommendations, calculateLevel, trackStudyActivity,
  syncProgress, matchParshaIndex, setCurrentParsha,
  // Recommandations
  generateRecommendations, dismissRecommendation, getRecommendations,
  getProgressSummary, resetRecommendations,
  // Optimiseur d'étude
  calculatePriorityScore, createOptimizedSession, analyzeRootFamilyGaps,
  identifyWeakAreas, generateMilestones, getStudyFocus
};

const learningRecommendationService = {
  // Core
  LEARNING_LEVELS,
  initializeRecommendations,
  calculateLevel,
  trackStudyActivity,
  syncProgress,
  matchParshaIndex,
  setCurrentParsha,
  generateRecommendations,
  dismissRecommendation,
  getRecommendations,
  getProgressSummary,
  resetRecommendations,
  // PRO SCHOLAR v3
  PRIORITY_WEIGHTS,
  SESSION_CONFIG,
  ROOT_FAMILIES,
  FREQUENCY_TIERS,
  calculatePriorityScore,
  createOptimizedSession,
  analyzeRootFamilyGaps,
  identifyWeakAreas,
  generateMilestones,
  getStudyFocus,
};

export default learningRecommendationService;

