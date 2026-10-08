/**
 * Learning Recommendation Service - PRO SCHOLAR v3
 *
 * ADVANCED FEATURES:
 * - Priority scoring algorithm (SRS urgency, difficulty, frequency, context)
 * - Session optimization with interleaving
 * - Root family gap analysis
 * - Weak area identification
 * - Adaptive recommendations based on study history
 * - Learning path optimization with milestones
 *
 * RECOMMENDATION ALGORITHM:
 * 1. PRIORITY SCORING - Each word gets a weighted score based on:
 *    - SRS urgency (35%): How overdue is the card
 *    - Difficulty (20%): User's struggle level (low ease factor)
 *    - Frequency (25%): How common/important the word is
 *    - Root family (10%): Gaps in root family knowledge
 *    - Context (10%): Relevance to current study
 *
 * 2. SESSION OPTIMIZATION:
 *    - 70% review / 30% new cards ratio
 *    - Interleaving for better retention
 *    - Cognitive load management
 */

import { getTopTopics } from '../ai/aiMemoryService';
import { getStats as getSRSStats, getDifficultCards } from '../srsService';

const STORAGE_KEY = 'learning-recommendations';

// Learning levels with progression criteria
// label en français (affiché tel quel par le badge de niveau du dashboard) ;
// le jugement de niveau est piloté par versesStudied (la même source que le
// badge studyTracker) — vocabulary/commentators restent des statistiques.
export const LEARNING_LEVELS = {
  BEGINNER: {
    id: 'beginner',
    label: 'Débutant',
    hebrewLabel: 'מתחיל',
    criteria: {
      versesStudied: 0,
      vocabularyMastered: 0,
      commentatorsExplored: 0
    },
    suggestedModes: ['summary', 'translation'],
    suggestedCommentators: ['Rashi'],
    maxComplexity: 1
  },
  INTERMEDIATE: {
    id: 'intermediate',
    label: 'Intermédiaire',
    hebrewLabel: 'בינוני',
    criteria: {
      versesStudied: 50,
      vocabularyMastered: 30,
      commentatorsExplored: 2
    },
    suggestedModes: ['summary', 'iyun', 'mussar'],
    suggestedCommentators: ['Rashi', 'Ibn Ezra', 'Sforno'],
    maxComplexity: 2
  },
  ADVANCED: {
    id: 'advanced',
    label: 'Avancé',
    hebrewLabel: 'מתקדם',
    criteria: {
      versesStudied: 200,
      vocabularyMastered: 100,
      commentatorsExplored: 4
    },
    suggestedModes: ['iyun', 'machloket', 'halacha'],
    suggestedCommentators: ['Rashi', 'Ramban', 'Ibn Ezra', 'Sforno', 'Or HaChaim'],
    maxComplexity: 3
  },
  SCHOLAR: {
    id: 'scholar',
    label: 'Savant',
    hebrewLabel: 'תלמיד חכם',
    criteria: {
      versesStudied: 500,
      vocabularyMastered: 300,
      commentatorsExplored: 6
    },
    suggestedModes: ['iyun', 'machloket', 'halacha', 'chavruta'],
    suggestedCommentators: ['All commentators'],
    maxComplexity: 4
  }
};

// Libellés FR des modes d'étude (clés internes de l'IA)
const MODE_LABELS = {
  summary: 'Synthèse',
  translation: 'Traduction',
  iyun: 'Iyoun (analyse)',
  mussar: 'Moussar',
  machloket: 'Mahloket (débat)',
  halacha: 'Halakha',
  chavruta: 'Havrouta'
};

// Topic progressions (what to study after mastering a topic)
const TOPIC_PROGRESSIONS = {
  'creation': ['covenant', 'blessing', 'sabbath'],
  'covenant': ['commandment', 'promise', 'faith'],
  'exodus': ['redemption', 'freedom', 'promised_land'],
  'sacrifice': ['temple', 'prayer', 'worship'],
  'commandment': ['halacha', 'righteousness', 'sin'],
  'prayer': ['faith', 'worship', 'blessing'],
  'love': ['mercy', 'forgiveness', 'kindness'],
  'sin': ['repentance', 'forgiveness', 'redemption']
};

// Parsha study order (for systematic Torah learning)
const PARSHA_ORDER = [
  'Bereishit', 'Noach', 'Lech Lecha', 'Vayera', 'Chayei Sarah',
  'Toldot', 'Vayetzei', 'Vayishlach', 'Vayeshev', 'Miketz',
  'Vayigash', 'Vayechi', 'Shemot', 'Vaera', 'Bo', 'Beshalach',
  'Yitro', 'Mishpatim', 'Terumah', 'Tetzaveh', 'Ki Tisa',
  'Vayakhel', 'Pekudei', 'Vayikra', 'Tzav', 'Shemini',
  'Tazria', 'Metzora', 'Acharei Mot', 'Kedoshim', 'Emor',
  'Behar', 'Bechukotai', 'Bamidbar', 'Naso', 'Behaalotecha',
  'Shelach', 'Korach', 'Chukat', 'Balak', 'Pinchas',
  'Matot', 'Masei', 'Devarim', 'Vaetchanan', 'Eikev',
  'Reeh', 'Shoftim', 'Ki Teitzei', 'Ki Tavo', 'Nitzavim',
  'Vayelech', 'Haazinu', "Vezot HaBracha"
];

// In-memory recommendation store
let recommendationStore = {
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

import { createPersistedStore } from '../../utils/persistedStore';
const recommendationPersist = createPersistedStore(STORAGE_KEY, recommendationStore, { name: 'recommendations' });

/**
 * Initialize recommendation service
 */
export function initializeRecommendations() {
  recommendationStore = recommendationPersist.load();
  return recommendationStore;
}

/**
 * Save recommendations to localStorage
 */
function persistRecommendations() {
  recommendationStore = recommendationPersist.save(recommendationStore);
}

/**
 * Calculate user's current learning level.
 * Critère pilote = versesStudied (même logique que le badge studyTracker) —
 * l'ancienne conjonction stricte (verses ET vocab ET commentateurs) faisait
 * rester le service à « Débutant » pendant que le badge passait Intermédiaire.
 */
export function calculateLevel(progress) {
  const levels = Object.values(LEARNING_LEVELS).reverse();

  for (const level of levels) {
    if (progress.versesStudied >= level.criteria.versesStudied) {
      return level;
    }
  }

  return LEARNING_LEVELS.BEGINNER;
}

/**
 * Track study activity
 */
export function trackStudyActivity(activity) {
  const { type, verseRef, commentator, topic, vocabularyLearned = 0 } = activity;

  if (type === 'verse' && verseRef) {
    recommendationStore.userProgress.versesStudied++;
  }

  if (commentator && !recommendationStore.userProgress.commentatorsExplored.includes(commentator)) {
    recommendationStore.userProgress.commentatorsExplored.push(commentator);
  }

  if (topic && !recommendationStore.userProgress.topicsMastered.includes(topic)) {
    recommendationStore.userProgress.topicsMastered.push(topic);
  }

  recommendationStore.userProgress.vocabularyMastered += vocabularyLearned;

  // Update level
  const newLevel = calculateLevel(recommendationStore.userProgress);
  recommendationStore.userProgress.level = newLevel.id;

  // Update study streak
  const today = new Date().toDateString();
  if (recommendationStore.userProgress.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (recommendationStore.userProgress.lastStudyDate === yesterday) {
      recommendationStore.userProgress.studyStreak++;
    } else {
      recommendationStore.userProgress.studyStreak = 1;
    }
    recommendationStore.userProgress.lastStudyDate = today;
  }

  persistRecommendations();
  return recommendationStore.userProgress;
}

/**
 * Aligne les compteurs du service sur les sources de vérité réelles.
 * Appelé par le dashboard avant chaque génération : l'ancien store ne
 * bougeait QUE sur clic d'une suggestion, les niveaux et « Presque … ! »
 * restaient donc figés malgré une vraie lecture.
 * @param {{ versesStudied?: number, vocabularyMastered?: number }} measures
 */
export function syncProgress(measures = {}) {
  const p = recommendationStore.userProgress;
  if (Number.isFinite(measures.versesStudied)) {
    p.versesStudied = measures.versesStudied;
  }
  if (Number.isFinite(measures.vocabularyMastered)) {
    p.vocabularyMastered = measures.vocabularyMastered;
  }
  p.level = calculateLevel(p).id;
  persistRecommendations();
  return p;
}

/**
 * Generate personalized recommendations
 */
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
 * Get study path suggestion
 */
export function getStudyPath(duration = 'week') {
  const progress = recommendationStore.userProgress;
  const currentLevel = LEARNING_LEVELS[progress.level.toUpperCase()] || LEARNING_LEVELS.BEGINNER;

  const dailyTasks = [];
  const days = duration === 'week' ? 7 : duration === 'month' ? 30 : 7;

  for (let day = 0; day < days; day++) {
    const tasks = [];

    // Daily vocabulary review
    tasks.push({
      type: 'vocabulary',
      description: 'Review due vocabulary',
      estimatedMinutes: 10
    });

    // Parsha study (spread across week)
    if (day % 2 === 0) {
      tasks.push({
        type: 'parsha',
        description: `Study ${PARSHA_ORDER[progress.currentParsha] || 'Bereishit'}`,
        estimatedMinutes: 20
      });
    }

    // Commentary deep-dive
    if (day === 0 || day === 3) {
      tasks.push({
        type: 'commentary',
        description: `Explore ${currentLevel.suggestedCommentators[0]} commentary`,
        estimatedMinutes: 15
      });
    }

    // Analysis mode practice
    if (day === 1 || day === 4 || day === 6) {
      const mode = currentLevel.suggestedModes[day % currentLevel.suggestedModes.length];
      tasks.push({
        type: 'analysis',
        description: `Practice ${mode} analysis`,
        estimatedMinutes: 15
      });
    }

    dailyTasks.push({
      day: day + 1,
      date: new Date(Date.now() + day * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      tasks,
      totalMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
    });
  }

  return {
    duration,
    level: currentLevel.label,
    dailyTasks,
    totalMinutes: dailyTasks.reduce((sum, d) => sum + d.totalMinutes, 0)
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

// =============================================================================
// PRO SCHOLAR v3 - PRIORITY SCORING ENGINE
// =============================================================================

/** Weight factors for priority scoring */
const PRIORITY_WEIGHTS = {
  SRS_URGENCY: 0.35,    // How overdue is the card
  DIFFICULTY: 0.20,     // User's struggle level
  FREQUENCY: 0.25,      // Word importance/commonality
  ROOT_FAMILY: 0.10,    // Gaps in root family knowledge
  CONTEXT: 0.10,        // Relevance to current study
};

/** Session optimization constants */
const SESSION_CONFIG = {
  REVIEW_RATIO: 0.70,         // 70% review cards
  NEW_RATIO: 0.30,            // 30% new cards
  MIN_INTERLEAVE: 3,          // Min cards between same type
  MAX_CONSECUTIVE_HARD: 2,    // Max hard cards in a row
  OPTIMAL_SESSION_SIZE: 20,   // Default session size
  COGNITIVE_LOAD_CAP: 100,    // Max cognitive load score
};

/** Hebrew root families for gap analysis */
const ROOT_FAMILIES = {
  // Common verbal roots
  'כתב': ['כָּתַב', 'מִכְתָּב', 'כְּתָב', 'כָּתוּב', 'כְּתִיבָה'],
  'למד': ['לָמַד', 'לִמֵּד', 'תַּלְמִיד', 'לִמּוּד', 'מְלַמֵּד'],
  'אמר': ['אָמַר', 'מַאֲמָר', 'אֹמֶר', 'אֲמִירָה', 'נֶאֱמָר'],
  'שמע': ['שָׁמַע', 'שְׁמִיעָה', 'שֵׁמַע', 'מִשְׁמַעַת', 'שׁוֹמֵעַ'],
  'עשה': ['עָשָׂה', 'מַעֲשֶׂה', 'עֲשִׂיָּה', 'נַעֲשָׂה', 'מַעֲשִׂים'],
  'ידע': ['יָדַע', 'דַּעַת', 'יְדִיעָה', 'מוֹדָע', 'מַדָּע'],
  'הלך': ['הָלַךְ', 'הֲלִיכָה', 'מַהֲלָךְ', 'הוֹלֵךְ', 'הִלּוּכָה'],
  'בוא': ['בָּא', 'בִּיאָה', 'מָבוֹא', 'תְּבוּאָה', 'יָבוֹא'],
  'נתן': ['נָתַן', 'מַתָּנָה', 'נְתִינָה', 'נָתוּן', 'מִתָּן'],
  'שוב': ['שָׁב', 'תְּשׁוּבָה', 'שִׁיבָה', 'מְשֻׁבָּה', 'שָׁבִים'],
  // Key Torah terms
  'קדש': ['קָדוֹשׁ', 'קְדֻשָּׁה', 'קִדּוּשׁ', 'מִקְדָּשׁ', 'הִתְקַדֵּשׁ'],
  'ברך': ['בָּרַךְ', 'בְּרָכָה', 'בָּרוּךְ', 'מְבָרֵךְ', 'הִתְבָּרֵךְ'],
  'צדק': ['צֶדֶק', 'צַדִּיק', 'צְדָקָה', 'הִצְטַדֵּק', 'צִדּוּק'],
};

/** Word frequency tiers (higher = more common) */
const FREQUENCY_TIERS = {
  ULTRA_COMMON: { min: 1000, score: 1.0 },    // את, אל, כי, etc.
  VERY_COMMON: { min: 500, score: 0.85 },
  COMMON: { min: 200, score: 0.70 },
  MODERATE: { min: 50, score: 0.55 },
  UNCOMMON: { min: 10, score: 0.40 },
  RARE: { min: 1, score: 0.25 },
};

/**
 * Calculate priority score for a word/card
 * @returns {Object} { score, breakdown, urgency }
 */
export function calculatePriorityScore(word, options = {}) {
  const {
    srsCard = null,
    wordFrequency = 100,
    currentContext = null,
    rootFamily = null,
    masteredRoots = [],
  } = options;

  const breakdown = {};

  // 1. SRS Urgency (35%)
  let srsScore = 0;
  if (srsCard) {
    const now = Date.now();
    const dueDate = srsCard.nextReview || now;
    const daysPastDue = Math.max(0, (now - dueDate) / (1000 * 60 * 60 * 24));

    if (daysPastDue > 7) srsScore = 1.0;
    else if (daysPastDue > 3) srsScore = 0.85;
    else if (daysPastDue > 1) srsScore = 0.70;
    else if (daysPastDue > 0) srsScore = 0.55;
    else srsScore = 0.3; // Not due yet but still valuable
  }
  breakdown.srsUrgency = srsScore;

  // 2. Difficulty (20%) - inverse of ease factor
  let difficultyScore = 0.5;
  if (srsCard?.easeFactor) {
    // Ease factor typically 1.3 to 2.5; lower = harder = higher priority
    difficultyScore = Math.max(0, Math.min(1, (2.5 - srsCard.easeFactor) / 1.2));
  }
  breakdown.difficulty = difficultyScore;

  // 3. Frequency (25%) - more common words are higher priority
  let frequencyScore = 0.5;
  for (const [, config] of Object.entries(FREQUENCY_TIERS)) {
    if (wordFrequency >= config.min) {
      frequencyScore = config.score;
      break;
    }
  }
  breakdown.frequency = frequencyScore;

  // 4. Root Family Gap (10%)
  let rootScore = 0.5;
  if (rootFamily && ROOT_FAMILIES[rootFamily]) {
    const familyWords = ROOT_FAMILIES[rootFamily];
    const masteredCount = familyWords.filter(w => masteredRoots.includes(w)).length;
    const gapRatio = 1 - (masteredCount / familyWords.length);
    rootScore = gapRatio > 0.5 ? 0.8 : gapRatio > 0.2 ? 0.5 : 0.2;
  }
  breakdown.rootFamily = rootScore;

  // 5. Context Relevance (10%)
  let contextScore = 0.5;
  if (currentContext) {
    // Boost if word appears in current parsha or topic
    if (currentContext.currentWords?.includes(word)) {
      contextScore = 1.0;
    } else if (currentContext.recentTopics?.some(t => word.includes(t))) {
      contextScore = 0.75;
    }
  }
  breakdown.context = contextScore;

  // Calculate weighted total
  const totalScore =
    (breakdown.srsUrgency * PRIORITY_WEIGHTS.SRS_URGENCY) +
    (breakdown.difficulty * PRIORITY_WEIGHTS.DIFFICULTY) +
    (breakdown.frequency * PRIORITY_WEIGHTS.FREQUENCY) +
    (breakdown.rootFamily * PRIORITY_WEIGHTS.ROOT_FAMILY) +
    (breakdown.context * PRIORITY_WEIGHTS.CONTEXT);

  return {
    word,
    score: Math.round(totalScore * 100) / 100,
    breakdown,
    urgency: srsScore > 0.7 ? 'high' : srsScore > 0.4 ? 'medium' : 'low',
    recommended: totalScore > 0.6,
  };
}

/**
 * Create an optimized study session with interleaving
 * @returns {Object} { cards, stats, estimatedTime }
 */
export function createOptimizedSession(allCards, options = {}) {
  const {
    sessionSize = SESSION_CONFIG.OPTIMAL_SESSION_SIZE,
    includeNew = true,
    maxCognitiveLoad = SESSION_CONFIG.COGNITIVE_LOAD_CAP,
    currentContext = null,
  } = options;

  // Separate review and new cards
  const reviewCards = allCards.filter(c => c.reviewCount > 0);
  const newCards = allCards.filter(c => c.reviewCount === 0);

  // Calculate how many of each type
  const reviewCount = Math.floor(sessionSize * SESSION_CONFIG.REVIEW_RATIO);
  const newCount = includeNew ? Math.floor(sessionSize * SESSION_CONFIG.NEW_RATIO) : 0;

  // Score and sort review cards by priority
  const scoredReviewCards = reviewCards.map(card => ({
    ...card,
    priority: calculatePriorityScore(card.word, {
      srsCard: card,
      currentContext,
    }),
  }));
  scoredReviewCards.sort((a, b) => b.priority.score - a.priority.score);

  // Select top review cards
  const selectedReview = scoredReviewCards.slice(0, reviewCount);

  // Select new cards (prefer high-frequency, contextual)
  const scoredNewCards = newCards.map(card => ({
    ...card,
    priority: calculatePriorityScore(card.word, {
      wordFrequency: card.frequency || 100,
      currentContext,
    }),
  }));
  scoredNewCards.sort((a, b) => b.priority.score - a.priority.score);
  const selectedNew = scoredNewCards.slice(0, newCount);

  // Interleave cards for optimal learning
  const interleavedSession = interleaveCards([...selectedReview, ...selectedNew]);

  // Calculate session stats
  const totalCognitiveLoad = interleavedSession.reduce((sum, card) => {
    const difficulty = card.priority?.breakdown?.difficulty || 0.5;
    return sum + (difficulty * 5);
  }, 0);

  // Trim if cognitive load too high
  let finalSession = interleavedSession;
  if (totalCognitiveLoad > maxCognitiveLoad) {
    const ratio = maxCognitiveLoad / totalCognitiveLoad;
    finalSession = interleavedSession.slice(0, Math.floor(interleavedSession.length * ratio));
  }

  return {
    cards: finalSession,
    stats: {
      total: finalSession.length,
      review: finalSession.filter(c => c.reviewCount > 0).length,
      new: finalSession.filter(c => c.reviewCount === 0).length,
      cognitiveLoad: Math.round(totalCognitiveLoad),
      averagePriority: finalSession.length > 0
        ? Math.round(finalSession.reduce((sum, c) => sum + (c.priority?.score || 0), 0) / finalSession.length * 100) / 100
        : 0,
    },
    estimatedTime: {
      minutes: Math.ceil(finalSession.length * 0.5), // ~30 seconds per card
      label: finalSession.length <= 10 ? 'Quick review' :
             finalSession.length <= 20 ? 'Standard session' : 'Deep study',
    },
  };
}

/**
 * Interleave cards for better retention
 * Spaces out similar cards, avoids consecutive hard cards
 */
function interleaveCards(cards) {
  if (cards.length <= 3) return cards;

  const result = [];
  const remaining = [...cards];
  let hardStreak = 0;

  while (remaining.length > 0) {
    let selectedIndex = 0;
    const lastCard = result[result.length - 1];

    // Find a good next card
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const isHard = (candidate.priority?.breakdown?.difficulty || 0) > 0.7;

      // Avoid consecutive hard cards
      if (isHard && hardStreak >= SESSION_CONFIG.MAX_CONSECUTIVE_HARD) {
        continue;
      }

      // Avoid same root family consecutively
      if (lastCard && candidate.rootFamily === lastCard.rootFamily) {
        continue;
      }

      selectedIndex = i;
      hardStreak = isHard ? hardStreak + 1 : 0;
      break;
    }

    result.push(remaining.splice(selectedIndex, 1)[0]);
  }

  return result;
}

/**
 * Analyze root family gaps
 * @returns {Object} { gaps, recommendations, coverage }
 */
export function analyzeRootFamilyGaps(masteredWords = []) {
  const analysis = {
    gaps: [],
    recommendations: [],
    coverage: {},
    overallCoverage: 0,
  };

  let totalWords = 0;
  let masteredCount = 0;

  for (const [root, words] of Object.entries(ROOT_FAMILIES)) {
    const mastered = words.filter(w => masteredWords.includes(w));
    const coverage = mastered.length / words.length;

    totalWords += words.length;
    masteredCount += mastered.length;

    analysis.coverage[root] = {
      root,
      total: words.length,
      mastered: mastered.length,
      percentage: Math.round(coverage * 100),
      missing: words.filter(w => !masteredWords.includes(w)),
    };

    // Identify gaps (< 50% coverage)
    if (coverage < 0.5 && mastered.length > 0) {
      analysis.gaps.push({
        root,
        coverage: Math.round(coverage * 100),
        known: mastered,
        toLearn: words.filter(w => !masteredWords.includes(w)),
        priority: mastered.length > 0 ? 'high' : 'medium', // Has foundation
      });
    }

    // Recommendation: complete partially learned families first
    if (coverage > 0 && coverage < 1) {
      analysis.recommendations.push({
        type: 'complete-family',
        root,
        message: `Complete the ${root} root family (${Math.round(coverage * 100)}% learned)`,
        words: words.filter(w => !masteredWords.includes(w)),
      });
    }
  }

  analysis.overallCoverage = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // Sort gaps by priority
  analysis.gaps.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.known.length - a.known.length;
  });

  return analysis;
}

/**
 * Identify weak areas in learning
 * @returns {Object} { weakAreas, strengthAreas, recommendations }
 */
export function identifyWeakAreas(studyHistory = [], srsCards = []) {
  const analysis = {
    weakAreas: [],
    strengthAreas: [],
    recommendations: [],
    patterns: {},
  };

  // Analyze by word type
  const wordTypeStats = {};
  const rootStats = {};
  const timeOfDayStats = {};

  srsCards.forEach(card => {
    // Categorize by type
    const type = card.type || 'general';
    if (!wordTypeStats[type]) {
      wordTypeStats[type] = { total: 0, difficult: 0, easy: 0 };
    }
    wordTypeStats[type].total++;
    if (card.easeFactor < 1.8) wordTypeStats[type].difficult++;
    if (card.easeFactor > 2.3) wordTypeStats[type].easy++;

    // Track root family performance
    if (card.rootFamily) {
      if (!rootStats[card.rootFamily]) {
        rootStats[card.rootFamily] = { total: 0, avgEase: 0, easeSum: 0 };
      }
      rootStats[card.rootFamily].total++;
      rootStats[card.rootFamily].easeSum += card.easeFactor || 2.5;
      rootStats[card.rootFamily].avgEase =
        rootStats[card.rootFamily].easeSum / rootStats[card.rootFamily].total;
    }
  });

  // Analyze study history for time patterns
  studyHistory.forEach(session => {
    const hour = new Date(session.timestamp).getHours();
    const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    if (!timeOfDayStats[timeSlot]) {
      timeOfDayStats[timeSlot] = { sessions: 0, avgPerformance: 0, perfSum: 0 };
    }
    timeOfDayStats[timeSlot].sessions++;
    timeOfDayStats[timeSlot].perfSum += session.performance || 0.5;
    timeOfDayStats[timeSlot].avgPerformance =
      timeOfDayStats[timeSlot].perfSum / timeOfDayStats[timeSlot].sessions;
  });

  // Identify weak areas (types with high difficulty ratio)
  for (const [type, stats] of Object.entries(wordTypeStats)) {
    const difficultyRatio = stats.difficult / Math.max(stats.total, 1);
    if (difficultyRatio > 0.4 && stats.total >= 5) {
      analysis.weakAreas.push({
        area: type,
        type: 'word-type',
        severity: difficultyRatio > 0.6 ? 'high' : 'medium',
        stats: {
          total: stats.total,
          difficult: stats.difficult,
          ratio: Math.round(difficultyRatio * 100),
        },
        recommendation: `Focus more on ${type} words - ${Math.round(difficultyRatio * 100)}% are challenging`,
      });
    }
    if (difficultyRatio < 0.2 && stats.total >= 5) {
      analysis.strengthAreas.push({
        area: type,
        type: 'word-type',
        stats: { total: stats.total, easy: stats.easy },
      });
    }
  }

  // Identify weak root families
  for (const [root, stats] of Object.entries(rootStats)) {
    if (stats.avgEase < 1.8 && stats.total >= 3) {
      analysis.weakAreas.push({
        area: root,
        type: 'root-family',
        severity: stats.avgEase < 1.5 ? 'high' : 'medium',
        stats: {
          total: stats.total,
          avgEase: Math.round(stats.avgEase * 100) / 100,
        },
        recommendation: `The ${root} root family needs more practice`,
      });
    }
  }

  // Best time to study
  let bestTime = 'morning';
  let bestPerformance = 0;
  for (const [time, stats] of Object.entries(timeOfDayStats)) {
    if (stats.avgPerformance > bestPerformance && stats.sessions >= 3) {
      bestPerformance = stats.avgPerformance;
      bestTime = time;
    }
  }
  analysis.patterns.bestStudyTime = bestTime;
  analysis.patterns.timeStats = timeOfDayStats;

  // Generate recommendations
  if (analysis.weakAreas.length > 0) {
    const topWeak = analysis.weakAreas.slice(0, 3);
    analysis.recommendations = topWeak.map(weak => ({
      priority: weak.severity === 'high' ? 1 : 2,
      action: `Practice ${weak.area}`,
      reason: weak.recommendation,
      type: weak.type,
    }));
  }

  // Add time-based recommendation
  if (bestPerformance > 0.6) {
    analysis.recommendations.push({
      priority: 3,
      action: `Schedule study sessions in the ${bestTime}`,
      reason: `You perform ${Math.round(bestPerformance * 100)}% better during this time`,
      type: 'schedule',
    });
  }

  return analysis;
}

/**
 * Generate learning milestones
 * @returns {Array} Milestone objects with progress
 */
export function generateMilestones(progress) {
  const milestones = [
    {
      id: 'first-100-words',
      title: '100 premiers mots',
      hebrewTitle: 'מאה מילים ראשונות',
      target: 100,
      current: progress.vocabularyMastered || 0,
      type: 'vocabulary',
      reward: '🏆 Initié du vocabulaire',
    },
    {
      id: 'root-explorer',
      title: 'Explorateur de racines',
      hebrewTitle: 'חוקר שורשים',
      target: 10,
      current: Object.keys(progress.rootFamiliesStarted || {}).length,
      type: 'roots',
      reward: '🌳 Maître des racines',
    },
    {
      id: 'weekly-streak',
      title: 'Série de 7 jours',
      hebrewTitle: 'רצף שבועי',
      target: 7,
      current: progress.studyStreak || 0,
      type: 'streak',
      reward: '🔥 Érudit assidu',
    },
    {
      id: 'parsha-5',
      title: '5 premières parashiot',
      hebrewTitle: 'חמש פרשיות',
      target: 5,
      current: progress.currentParsha || 0,
      type: 'parsha',
      reward: '📜 Lecteur de la Torah',
    },
    {
      id: 'commentator-trio',
      title: 'Trois commentateurs',
      hebrewTitle: 'שלושה פרשנים',
      target: 3,
      current: progress.commentatorsExplored?.length || 0,
      type: 'commentators',
      reward: '📚 Explorateur des commentaires',
    },
    {
      id: 'verse-100',
      title: '100 versets étudiés',
      hebrewTitle: 'מאה פסוקים',
      target: 100,
      current: progress.versesStudied || 0,
      type: 'verses',
      reward: '✨ Savant des versets',
    },
    {
      id: 'master-500',
      title: 'Maître du vocabulaire',
      hebrewTitle: 'בעל אוצר מילים',
      target: 500,
      current: progress.vocabularyMastered || 0,
      type: 'vocabulary',
      reward: '👑 Maître du lexique',
    },
  ];

  return milestones.map(m => ({
    ...m,
    progress: Math.min(100, Math.round((m.current / m.target) * 100)),
    completed: m.current >= m.target,
    remaining: Math.max(0, m.target - m.current),
  }));
}

/**
 * Get personalized study focus
 * @returns {Object} Focus area with action items
 */
export function getStudyFocus(options = {}) {
  const { srsCards = [], studyHistory = [], masteredWords = [] } = options;

  // Get weak areas
  const weakAnalysis = identifyWeakAreas(studyHistory, srsCards);

  // Get root family gaps
  const rootAnalysis = analyzeRootFamilyGaps(masteredWords);

  // Determine primary focus
  let primaryFocus = {
    area: 'general-review',
    reason: 'Maintain your progress with regular review',
    actions: [],
  };

  if (weakAnalysis.weakAreas.length > 0) {
    const topWeak = weakAnalysis.weakAreas[0];
    primaryFocus = {
      area: topWeak.area,
      type: topWeak.type,
      reason: topWeak.recommendation,
      severity: topWeak.severity,
      actions: [
        `Practice ${topWeak.area} words specifically`,
        `Use slower review for these cards`,
        `Create mnemonics for difficult ones`,
      ],
    };
  } else if (rootAnalysis.gaps.length > 0) {
    const topGap = rootAnalysis.gaps[0];
    primaryFocus = {
      area: `${topGap.root} root family`,
      type: 'root-completion',
      reason: `Complete the ${topGap.root} root family for deeper understanding`,
      actions: [
        `Learn: ${topGap.toLearn.slice(0, 3).join(', ')}`,
        `Review known: ${topGap.known.join(', ')}`,
        `Look for these roots in your reading`,
      ],
    };
  }

  return {
    focus: primaryFocus,
    secondaryGoals: [
      ...(weakAnalysis.recommendations || []).slice(1, 3),
      ...(rootAnalysis.recommendations || []).slice(0, 2),
    ],
    bestStudyTime: weakAnalysis.patterns?.bestStudyTime || 'morning',
  };
}

// Initialize on module load
initializeRecommendations();

const learningRecommendationService = {
  // Core
  LEARNING_LEVELS,
  initializeRecommendations,
  calculateLevel,
  trackStudyActivity,
  syncProgress,
  generateRecommendations,
  dismissRecommendation,
  getRecommendations,
  getProgressSummary,
  getStudyPath,
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
