// =============================================================================
// Génération des recommandations — niveaux, parashiot, révisions SRS,
// suggestions de modes/commentateurs, jalons proches.
// (extrait de learningRecommendationService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getTopTopics } from '../../ai/aiMemoryService';
import { getStats as getSRSStats, getDifficultCards } from '../../srsService';
import {
  STORAGE_KEY, LEARNING_LEVELS, MODE_LABELS, TOPIC_PROGRESSIONS, PARSHA_ORDER
} from './config';
import {
  recommendationStore, persistRecommendations,
  calculateLevel, matchParshaIndex, setCurrentParsha
} from './state';

export function generateRecommendations() {
  const recommendations = [];
  const progress = recommendationStore.userProgress;
  const currentLevel = LEARNING_LEVELS[progress.level.toUpperCase()] || LEARNING_LEVELS.BEGINNER;

  // 1. Next parsha recommendation
  if (progress.currentParsha < PARSHA_ORDER.length) {
    recommendations.push({
      id: 'next-parsha',
      type: 'parsha',
      priority: 1,
      title: `Continuer avec la parasha ${PARSHA_ORDER[progress.currentParsha]}`,
      description: 'Continuer ton étude systématique de la Torah',
      action: { type: 'navigate', target: PARSHA_ORDER[progress.currentParsha] },
      reason: 'Apprentissage systématique'
    });
  }

  // 2. Vocabulary review recommendation
  const srsStats = getSRSStats();
  if (srsStats.dueNow > 0) {
    recommendations.push({
      id: 'vocab-review',
      type: 'vocabulary',
      priority: 2,
      count: srsStats.dueNow,
      title: `Réviser ${srsStats.dueNow} mot${srsStats.dueNow > 1 ? 's' : ''} de vocabulaire`,
      description: `${srsStats.dueNow} mot(s) arrivent à échéance`,
      action: { type: 'review', mode: 'vocabulary' },
      reason: 'Répétition espacée',
      urgent: srsStats.dueNow > 10
    });
  }

  // 3. Topic progression recommendations
  const topTopics = getTopTopics(3);
  topTopics.forEach(({ topic }) => {
    const nextTopics = TOPIC_PROGRESSIONS[topic] || [];
    nextTopics.forEach(nextTopic => {
      if (!progress.topicsMastered.includes(nextTopic)) {
        recommendations.push({
          id: `topic-${nextTopic}`,
          type: 'topic',
          priority: 3,
          title: `Explorer le thème « ${nextTopic} »`,
          description: `Dans la continuité de ton intérêt pour « ${topic} »`,
          action: { type: 'search', query: nextTopic },
          reason: 'Progression thématique'
        });
      }
    });
  });

  // 4. New commentator exploration
  const unexploredCommentators = currentLevel.suggestedCommentators.filter(
    c => !progress.commentatorsExplored.includes(c) && c !== 'All commentators'
  );
  if (unexploredCommentators.length > 0) {
    const nextCommentator = unexploredCommentators[0];
    recommendations.push({
      id: `commentator-${nextCommentator}`,
      type: 'commentator',
      priority: 4,
      title: `Découvrir le commentaire de ${nextCommentator}`,
      description: 'Élargir ta lecture avec un nouveau point de vue',
      action: { type: 'filter', commentator: nextCommentator },
      reason: 'Exploration'
    });
  }

  // 5. Level-up motivation
  const nextLevel = getNextLevel(progress.level);
  if (nextLevel) {
    const remaining = {
      verses: nextLevel.criteria.versesStudied - progress.versesStudied,
      vocabulary: nextLevel.criteria.vocabularyMastered - progress.vocabularyMastered,
      commentators: nextLevel.criteria.commentatorsExplored - progress.commentatorsExplored.length
    };

    if (remaining.verses <= 10 || remaining.vocabulary <= 10) {
      recommendations.push({
        id: 'level-up',
        type: 'achievement',
        priority: 2,
        title: `Presque ${nextLevel.label} !`,
        description: `Encore ${Math.max(0, Math.min(remaining.verses, remaining.vocabulary))} élément(s) pour atteindre le niveau ${nextLevel.label}`,
        action: { type: 'study' },
        reason: 'Motivation'
      });
    }
  }

  // 6. Difficult words to review
  const difficultCards = getDifficultCards(3);
  if (difficultCards.length > 0) {
    recommendations.push({
      id: 'difficult-review',
      type: 'vocabulary',
      priority: 3,
      count: difficultCards.length,
      title: 'Retravailler les mots difficiles',
      description: `${difficultCards.length} mots demandent plus d'attention`,
      action: { type: 'review', mode: 'difficult' },
      reason: 'Renforcer les points faibles'
    });
  }

  // 7. Study mode recommendation based on level
  const suggestedMode = currentLevel.suggestedModes.find(mode => {
    // Logic to suggest unexplored modes
    return Math.random() > 0.5; // Simplified - would track mode usage in production
  });
  if (suggestedMode) {
    recommendations.push({
      id: `mode-${suggestedMode}`,
      type: 'study-mode',
      priority: 5,
      title: `Essayer le mode « ${MODE_LABELS[suggestedMode] || suggestedMode} »`,
      description: `Recommandé pour ton niveau ${currentLevel.label}`,
      action: { type: 'mode', mode: suggestedMode },
      reason: 'Adapté à ton niveau'
    });
  }

  // Filter out dismissed recommendations
  const filtered = recommendations.filter(
    r => !recommendationStore.dismissedRecommendations.includes(r.id)
  );

  // Sort by priority
  filtered.sort((a, b) => a.priority - b.priority);

  recommendationStore.recommendations = filtered;
  recommendationStore.lastUpdated = Date.now();
  persistRecommendations();

  return filtered;
}

/**
 * Get next learning level
 */
function getNextLevel(currentLevelId) {
  const levelOrder = ['beginner', 'intermediate', 'advanced', 'scholar'];
  const currentIndex = levelOrder.indexOf(currentLevelId);
  if (currentIndex < levelOrder.length - 1) {
    return LEARNING_LEVELS[levelOrder[currentIndex + 1].toUpperCase()];
  }
  return null;
}

/**
 * Dismiss a recommendation
 */
export function dismissRecommendation(recommendationId) {
  recommendationStore.dismissedRecommendations.push(recommendationId);

  // Keep only last 50 dismissals
  if (recommendationStore.dismissedRecommendations.length > 50) {
    recommendationStore.dismissedRecommendations =
      recommendationStore.dismissedRecommendations.slice(-50);
  }

  persistRecommendations();
}

/**
 * Get current recommendations
 */
export function getRecommendations(limit = 5) {
  if (recommendationStore.recommendations.length === 0 ||
      Date.now() - recommendationStore.lastUpdated > 3600000) { // Refresh hourly
    generateRecommendations();
  }
  return recommendationStore.recommendations.slice(0, limit);
}

/**
 * Get progress summary
 */
export function getProgressSummary() {
  const progress = recommendationStore.userProgress;
  const currentLevel = LEARNING_LEVELS[progress.level.toUpperCase()] || LEARNING_LEVELS.BEGINNER;
  const nextLevel = getNextLevel(progress.level);

  let progressToNextLevel = 100;
  if (nextLevel) {
    const totalNeeded =
      nextLevel.criteria.versesStudied +
      nextLevel.criteria.vocabularyMastered +
      nextLevel.criteria.commentatorsExplored;
    const current =
      progress.versesStudied +
      progress.vocabularyMastered +
      progress.commentatorsExplored.length;
    const currentLevelTotal =
      currentLevel.criteria.versesStudied +
      currentLevel.criteria.vocabularyMastered +
      currentLevel.criteria.commentatorsExplored;

    progressToNextLevel = Math.min(100, Math.round(
      ((current - currentLevelTotal) / (totalNeeded - currentLevelTotal)) * 100
    ));
  }

  return {
    level: currentLevel,
    nextLevel,
    progressToNextLevel,
    stats: {
      versesStudied: progress.versesStudied,
      vocabularyMastered: progress.vocabularyMastered,
      commentatorsExplored: progress.commentatorsExplored.length,
      topicsMastered: progress.topicsMastered.length,
      studyStreak: progress.studyStreak
    }
  };
}

/**
 * Reset recommendations
 */
export function resetRecommendations() {
  recommendationStore = {
    userProgress: {
      level: 'beginner',
      versesStudied: 0,
      vocabularyMastered: 0,
      commentatorsExplored: [],
      topicsMastered: [],
      currentParsha: 0,
      lastStudyDate: null,
      studyStreak: 0
    },
    recommendations: [],
    dismissedRecommendations: [],
    lastUpdated: null
  };
  localStorage.removeItem(STORAGE_KEY);
}

