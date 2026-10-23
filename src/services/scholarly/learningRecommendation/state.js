// =============================================================================
// ÉTAT des recommandations — store en mémoire + persistance localStorage,
// niveau, activité d'étude, progression, parasha courante.
// (extrait de learningRecommendationService.js — recette docs/DECOUPE-MONOLITHES.md)
// NB : recommendationStore est un `let` exporté — les réassignations
// (initialize/persist) restent dans CE module (live bindings ESM).
// =============================================================================

import { STORAGE_KEY, LEARNING_LEVELS, PARSHA_ORDER } from './config';

// In-memory recommendation store
export let recommendationStore = {
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

import { createPersistedStore } from '../../../utils/persistedStore';
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
export function persistRecommendations() {
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
 * Index de la parasha hebdomadaire dans PARSHA_ORDER.
 * Les displayValue Sefaria divergent de la table (« Bereshit » vs
 * « Bereishit », « V'Zot HaBerachah » vs « Vezot HaBracha »…) : comparaison
 * sur lettres normalisées + préfixe commun, avec alias pour les cas têtus.
 * @param {string} displayValue - ex. « Bereshit », « Ki Tisa »
 * @returns {number} 0-based dans PARSHA_ORDER, -1 si introuvable
 */
export function matchParshaIndex(displayValue) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  const target = norm(displayValue);
  if (target.length < 3) return -1;
  const ALIASES = {
    bereshit: 'bereishit', bereishit: 'bereshit',
    behaalotcha: 'behaalotecha', behaalotecha: 'behaalotcha',
    vzothaberachah: 'vezothabracha', vezothabracha: 'vzothaberachah',
    reh: 'reeh', reeh: 'reh'
  };
  const candidates = [target, ALIASES[target]].filter(Boolean);
  for (let i = 0; i < PARSHA_ORDER.length; i++) {
    const p = norm(PARSHA_ORDER[i]);
    if (candidates.some(c => c === p || (c.length >= 4 && p.startsWith(c)) || (p.length >= 4 && c.startsWith(p)))) {
      return i;
    }
  }
  return -1;
}

/**
 * Écrit l'index de la parasha courante (0-based). Alimente le jalon
 * « 5 premières parashiot » et la progression systématique — l'ancien
 * currentParsha n'a JAMAIS bougé de 0.
 * @param {number} index - position dans PARSHA_ORDER, -1/negatif = ignoré
 */
export function setCurrentParsha(index) {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= PARSHA_ORDER.length) return false;
  if (recommendationStore.userProgress.currentParsha === idx) return false;
  recommendationStore.userProgress.currentParsha = idx;
  persistRecommendations();
  return true;
}

/**
 * Generate personalized recommendations
 */
