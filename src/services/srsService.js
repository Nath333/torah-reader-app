/**
 * Spaced Repetition System (SRS) Service
 * Implements SM-2 algorithm for optimal vocabulary retention
 *
 * Features:
 * - SM-2 algorithm with modifications for Torah study
 * - Adaptive difficulty based on performance
 * - Hebrew/Aramaic specific considerations
 * - Integration with vocabulary hooks
 */

const STORAGE_KEY = 'srs-data';

// SM-2 algorithm constants
const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MAX_EASE_FACTOR = 3.0;

// Quality ratings (0-5 scale)
export const QUALITY = {
  COMPLETE_BLACKOUT: 0,    // Complete failure to recall
  INCORRECT: 1,            // Incorrect response; correct one remembered
  INCORRECT_EASY_RECALL: 2, // Incorrect; correct answer seemed easy to recall
  CORRECT_DIFFICULT: 3,    // Correct response with serious difficulty
  CORRECT_HESITATION: 4,   // Correct response after hesitation
  PERFECT: 5               // Perfect response, no hesitation
};

// Interval stages (in days)
const INITIAL_INTERVALS = [0, 1, 6]; // First review: same day, then 1 day, then 6 days

// Mastery thresholds - SINGLE SOURCE OF TRUTH
export const MASTERY_THRESHOLDS = {
  MASTERED: { minInterval: 21, minRepetitions: 5, label: 'mastered', icon: '⭐' },
  LEARNING: { minRepetitions: 3, label: 'learning', icon: '📚' },
  STARTED: { minRepetitions: 1, label: 'started', icon: '🌱' },
  NEW: { minRepetitions: 0, label: 'new', icon: '✨' },
};

/**
 * Get mastery level for a card
 * @param {SRSCard} card - The SRS card
 * @returns {{ level: string, icon: string }}
 */
export function getMasteryLevel(card) {
  if (!card) return { level: 'new', icon: MASTERY_THRESHOLDS.NEW.icon };

  const { interval = 0, repetitions = 0 } = card;

  if (interval >= MASTERY_THRESHOLDS.MASTERED.minInterval &&
      repetitions >= MASTERY_THRESHOLDS.MASTERED.minRepetitions) {
    return { level: 'mastered', icon: MASTERY_THRESHOLDS.MASTERED.icon };
  }
  if (repetitions >= MASTERY_THRESHOLDS.LEARNING.minRepetitions) {
    return { level: 'learning', icon: MASTERY_THRESHOLDS.LEARNING.icon };
  }
  if (repetitions >= MASTERY_THRESHOLDS.STARTED.minRepetitions) {
    return { level: 'started', icon: MASTERY_THRESHOLDS.STARTED.icon };
  }
  return { level: 'new', icon: MASTERY_THRESHOLDS.NEW.icon };
}

/**
 * SRS Card structure
 * @typedef {Object} SRSCard
 * @property {string} id - Unique identifier
 * @property {string} front - Question/Hebrew word
 * @property {string} back - Answer/Definition
 * @property {string} context - Usage context (verse, etc.)
 * @property {number} easeFactor - SM-2 ease factor (1.3 - 3.0)
 * @property {number} interval - Days until next review
 * @property {number} repetitions - Number of successful reviews
 * @property {number} nextReview - Timestamp of next review
 * @property {number} lastReview - Timestamp of last review
 * @property {Array} history - Review history
 * @property {string} type - Card type (vocabulary, verse, concept)
 * @property {Object} metadata - Additional data
 */

// In-memory store
let srsStore = {
  cards: {},
  stats: {
    totalReviews: 0,
    correctReviews: 0,
    streak: 0,
    lastStudyDate: null
  }
};

/**
 * Initialize SRS store from localStorage
 */
export function initializeSRS() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      srsStore = JSON.parse(stored);
    }
  } catch (err) {
    console.warn('Failed to load SRS data:', err);
  }
  return srsStore;
}

/**
 * Save SRS store to localStorage
 */
function persistSRS() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(srsStore));
  } catch (err) {
    console.warn('Failed to persist SRS data:', err);
  }
}

/**
 * Create a new SRS card
 */
export function createCard(id, front, back, options = {}) {
  const card = {
    id,
    front,
    back,
    context: options.context || '',
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReview: Date.now(), // Due immediately
    lastReview: null,
    history: [],
    type: options.type || 'vocabulary',
    metadata: {
      created: Date.now(),
      source: options.source || null,
      hebrewRoot: options.hebrewRoot || null,
      partOfSpeech: options.partOfSpeech || null,
      difficulty: options.difficulty || 'normal',
      ...options.metadata
    }
  };

  srsStore.cards[id] = card;
  persistSRS();
  return card;
}

/**
 * SM-2 Algorithm Implementation
 * Calculates the next review interval based on quality of response
 *
 * @param {SRSCard} card - The card being reviewed
 * @param {number} quality - Quality of response (0-5)
 * @returns {SRSCard} Updated card
 */
export function processReview(cardId, quality) {
  const card = srsStore.cards[cardId];
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  const now = Date.now();
  const qualityNum = Number(quality);

  // Record review in history
  card.history.push({
    timestamp: now,
    quality: qualityNum,
    interval: card.interval,
    easeFactor: card.easeFactor
  });

  // Update statistics
  srsStore.stats.totalReviews++;
  if (qualityNum >= 3) {
    srsStore.stats.correctReviews++;
  }

  // Update study streak
  const today = new Date().toDateString();
  if (srsStore.stats.lastStudyDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (srsStore.stats.lastStudyDate === yesterday) {
      srsStore.stats.streak++;
    } else if (srsStore.stats.lastStudyDate !== today) {
      srsStore.stats.streak = 1;
    }
    srsStore.stats.lastStudyDate = today;
  }

  // SM-2 Algorithm
  if (qualityNum < 3) {
    // Failed review - reset repetitions
    card.repetitions = 0;
    card.interval = INITIAL_INTERVALS[0];

    // Decrease ease factor for difficult cards
    card.easeFactor = Math.max(
      MIN_EASE_FACTOR,
      card.easeFactor - 0.2
    );
  } else {
    // Successful review
    if (card.repetitions === 0) {
      card.interval = INITIAL_INTERVALS[1]; // 1 day
    } else if (card.repetitions === 1) {
      card.interval = INITIAL_INTERVALS[2]; // 6 days
    } else {
      // Apply SM-2 formula: interval = previous_interval * ease_factor
      card.interval = Math.round(card.interval * card.easeFactor);
    }

    card.repetitions++;

    // Update ease factor based on quality
    // EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    const qualityDiff = 5 - qualityNum;
    const efChange = 0.1 - qualityDiff * (0.08 + qualityDiff * 0.02);
    card.easeFactor = Math.max(
      MIN_EASE_FACTOR,
      Math.min(MAX_EASE_FACTOR, card.easeFactor + efChange)
    );
  }

  // Calculate next review date
  card.lastReview = now;
  card.nextReview = now + card.interval * 24 * 60 * 60 * 1000;

  persistSRS();
  return card;
}

/**
 * Get cards due for review
 */
export function getDueCards(options = {}) {
  const { limit = 20, type = null } = options;
  const now = Date.now();

  const dueCards = Object.values(srsStore.cards)
    .filter(card => {
      const isDue = card.nextReview <= now;
      const matchesType = !type || card.type === type;
      return isDue && matchesType;
    })
    .sort((a, b) => {
      // Prioritize: overdue cards first, then by ease factor (harder first)
      const aOverdue = now - a.nextReview;
      const bOverdue = now - b.nextReview;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return a.easeFactor - b.easeFactor;
    });

  return dueCards.slice(0, limit);
}

/**
 * Get cards due today (including upcoming)
 */
export function getCardsDueToday() {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return Object.values(srsStore.cards)
    .filter(card => card.nextReview <= endOfDay.getTime())
    .sort((a, b) => a.nextReview - b.nextReview);
}

/**
 * Get learning statistics
 */
export function getStats() {
  const cards = Object.values(srsStore.cards);
  const now = Date.now();

  const dueNow = cards.filter(c => c.nextReview <= now).length;
  const dueTomorrow = cards.filter(c => {
    const tomorrow = now + 24 * 60 * 60 * 1000;
    return c.nextReview > now && c.nextReview <= tomorrow;
  }).length;

  // Mastery levels - uses MASTERY_THRESHOLDS for single source of truth
  const mastered = cards.filter(c =>
    c.interval >= MASTERY_THRESHOLDS.MASTERED.minInterval &&
    c.repetitions >= MASTERY_THRESHOLDS.MASTERED.minRepetitions
  ).length;
  const learning = cards.filter(c =>
    c.repetitions >= MASTERY_THRESHOLDS.STARTED.minRepetitions &&
    c.repetitions < MASTERY_THRESHOLDS.MASTERED.minRepetitions
  ).length;
  const newCards = cards.filter(c => c.repetitions === MASTERY_THRESHOLDS.NEW.minRepetitions).length;

  // Retention rate
  const retention = srsStore.stats.totalReviews > 0
    ? Math.round((srsStore.stats.correctReviews / srsStore.stats.totalReviews) * 100)
    : 0;

  // Average ease factor
  const avgEase = cards.length > 0
    ? cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length
    : DEFAULT_EASE_FACTOR;

  return {
    total: cards.length,
    dueNow,
    dueTomorrow,
    mastered,
    learning,
    new: newCards,
    retention,
    avgEaseFactor: Math.round(avgEase * 100) / 100,
    streak: srsStore.stats.streak,
    totalReviews: srsStore.stats.totalReviews
  };
}

/**
 * Get review forecast for next N days
 */
export function getReviewForecast(days = 7) {
  const cards = Object.values(srsStore.cards);
  const forecast = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < days; i++) {
    const dayStart = now + i * dayMs;
    const dayEnd = dayStart + dayMs;

    const dueCount = cards.filter(c =>
      c.nextReview >= dayStart && c.nextReview < dayEnd
    ).length;

    forecast.push({
      day: i,
      date: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dueCount
    });
  }

  return forecast;
}

/**
 * Get card by ID
 */
export function getCard(cardId) {
  return srsStore.cards[cardId] || null;
}

/**
 * Update card metadata
 */
export function updateCard(cardId, updates) {
  const card = srsStore.cards[cardId];
  if (!card) return null;

  Object.assign(card, updates);
  persistSRS();
  return card;
}

/**
 * Delete a card
 */
export function deleteCard(cardId) {
  delete srsStore.cards[cardId];
  persistSRS();
}

/**
 * Import cards from vocabulary list
 */
export function importFromVocabulary(vocabularyList) {
  const imported = [];

  vocabularyList.forEach(word => {
    if (!srsStore.cards[word.id]) {
      const card = createCard(
        word.id,
        word.hebrew,
        word.english,
        {
          context: word.context || '',
          type: 'vocabulary',
          hebrewRoot: word.root,
          source: word.source
        }
      );
      imported.push(card);
    }
  });

  return imported;
}

/**
 * Export cards for backup
 */
export function exportCards() {
  return {
    cards: srsStore.cards,
    stats: srsStore.stats,
    exportDate: new Date().toISOString()
  };
}

/**
 * Import cards from backup
 */
export function importCards(data) {
  if (data.cards) {
    srsStore.cards = { ...srsStore.cards, ...data.cards };
  }
  if (data.stats) {
    srsStore.stats = { ...srsStore.stats, ...data.stats };
  }
  persistSRS();
}

/**
 * Reset all SRS data
 */
export function resetSRS() {
  srsStore = {
    cards: {},
    stats: {
      totalReviews: 0,
      correctReviews: 0,
      streak: 0,
      lastStudyDate: null
    }
  };
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get difficult cards (low ease factor)
 */
export function getDifficultCards(limit = 10) {
  return Object.values(srsStore.cards)
    .filter(c => c.easeFactor < 2.0 && c.repetitions > 2)
    .sort((a, b) => a.easeFactor - b.easeFactor)
    .slice(0, limit);
}

/**
 * Get mastered cards
 */
export function getMasteredCards() {
  return Object.values(srsStore.cards)
    .filter(c =>
      c.interval >= MASTERY_THRESHOLDS.MASTERED.minInterval &&
      c.repetitions >= MASTERY_THRESHOLDS.MASTERED.minRepetitions
    )
    .sort((a, b) => b.interval - a.interval);
}

/**
 * Calculate optimal study session
 * Returns recommended cards to study based on available time
 */
export function getOptimalSession(availableMinutes = 15) {
  const avgTimePerCard = 0.5; // 30 seconds per card
  const maxCards = Math.floor(availableMinutes / avgTimePerCard);

  const dueCards = getDueCards({ limit: maxCards });

  // Mix in some new cards if there's room
  const newCards = Object.values(srsStore.cards)
    .filter(c => c.repetitions === 0)
    .slice(0, Math.floor(maxCards * 0.2)); // 20% new cards

  const combined = [...dueCards];
  newCards.forEach(card => {
    if (!combined.find(c => c.id === card.id) && combined.length < maxCards) {
      combined.push(card);
    }
  });

  return {
    cards: combined,
    estimatedMinutes: Math.round(combined.length * avgTimePerCard),
    newCount: newCards.length,
    reviewCount: dueCards.length
  };
}

// Initialize on module load
initializeSRS();

const srsService = {
  QUALITY,
  initializeSRS,
  createCard,
  processReview,
  getDueCards,
  getCardsDueToday,
  getStats,
  getReviewForecast,
  getCard,
  updateCard,
  deleteCard,
  importFromVocabulary,
  exportCards,
  importCards,
  resetSRS,
  getDifficultCards,
  getMasteredCards,
  getOptimalSession
};

export default srsService;
