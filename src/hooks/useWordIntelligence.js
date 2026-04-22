// =============================================================================
// useWordIntelligence - PRO SCHOLAR v3
// Unified word intelligence hook with caching, SRS, and learning insights
// =============================================================================

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import useWordLookup from './useWordLookup';
import { useVocabulary } from './useVocabulary';
import { stripAllDiacritics } from '../utils/hebrewUtils';

// =============================================================================
// SAFE SERVICE IMPORTS
// =============================================================================

let srsService = null;
let semanticFieldService = null;
let knowledgeGraphService = null;

try {
  srsService = require('../services/srsService');
} catch (e) {
  console.debug('[useWordIntelligence] srsService not available');
}

try {
  semanticFieldService = require('../services/scholarly/semanticFieldService');
} catch (e) {
  console.debug('[useWordIntelligence] semanticFieldService not available');
}

try {
  knowledgeGraphService = require('../services/scholarly/knowledgeGraphService');
} catch (e) {
  console.debug('[useWordIntelligence] knowledgeGraphService not available');
}

// =============================================================================
// LRU CACHE - High-performance word lookup caching
// =============================================================================

/**
 * LRU (Least Recently Used) Cache implementation
 * Provides O(1) get/set operations with automatic eviction
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get value from cache, moving it to "most recently used"
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set value in cache, evicting LRU if at capacity
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    // If key exists, delete it first (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {{ size: number, maxSize: number, hitRate: number }}
   */
  get stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance (persists across hook instances)
const wordCache = new LRUCache(100);

// =============================================================================
// LEARNING INSIGHTS - Difficulty and study time estimation
// =============================================================================

/**
 * Calculate word difficulty based on multiple factors
 * @param {Object} data - Word lookup data
 * @returns {{ level: string, score: number, factors: string[] }}
 */
const calculateDifficulty = (data) => {
  if (!data) return { level: 'unknown', score: 0, factors: [] };

  const factors = [];
  let score = 50; // Base difficulty

  // Factor 1: Word length (longer = harder)
  const wordLength = data.word?.length || 0;
  if (wordLength > 6) {
    score += 10;
    factors.push('Long word');
  } else if (wordLength <= 3) {
    score -= 10;
    factors.push('Short word');
  }

  // Factor 2: Aramaic is generally harder for Hebrew learners
  if (data.isAramaic || data.language === 'Aramaic') {
    score += 15;
    factors.push('Aramaic vocabulary');
  }

  // Factor 3: Weak verb roots (irregular conjugations)
  if (data.verbAnalysis?.weakType) {
    score += 20;
    factors.push(`Weak verb (${data.verbAnalysis.weakType})`);
  }

  // Factor 4: Multiple meanings (ambiguous)
  const meanings = data.sources?.length || 0;
  if (meanings > 3) {
    score += 10;
    factors.push('Multiple meanings');
  }

  // Factor 5: Rare word (low frequency)
  if (data.frequency?.rank > 1000 || data.frequency?.level === 'rare') {
    score += 15;
    factors.push('Rare word');
  } else if (data.frequency?.rank < 100 || data.frequency?.level === 'very_common') {
    score -= 15;
    factors.push('Common word');
  }

  // Factor 6: Complex morphology
  const prefixCount = data.morphology?.prefixes?.length || 0;
  const suffixCount = data.morphology?.suffixes?.length || 0;
  if (prefixCount + suffixCount > 2) {
    score += 10;
    factors.push('Complex morphology');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level;
  if (score >= 75) level = 'expert';
  else if (score >= 55) level = 'intermediate';
  else if (score >= 35) level = 'beginner';
  else level = 'easy';

  return { level, score, factors };
};

/**
 * Estimate study time for a word
 * @param {Object} data - Word lookup data
 * @param {Object} srsCard - SRS card if exists
 * @returns {{ seconds: number, label: string }}
 */
const estimateStudyTime = (data, srsCard) => {
  const difficulty = calculateDifficulty(data);

  // Base time: 30 seconds
  let seconds = 30;

  // Adjust by difficulty
  if (difficulty.level === 'expert') seconds += 60;
  else if (difficulty.level === 'intermediate') seconds += 30;
  else if (difficulty.level === 'easy') seconds -= 15;

  // Adjust by SRS state (familiar words are faster)
  if (srsCard) {
    const masteryLevel = srsService?.getMasteryLevel?.(srsCard);
    if (masteryLevel?.level === 'mastered') seconds = Math.max(10, seconds - 20);
    else if (masteryLevel?.level === 'learning') seconds = Math.max(15, seconds - 10);
  }

  // Create human-readable label
  let label;
  if (seconds < 20) label = '< 20s';
  else if (seconds < 45) label = '~30s';
  else if (seconds < 75) label = '~1 min';
  else label = '~2 min';

  return { seconds, label };
};

// =============================================================================
// CROSS-REFERENCES - Find related words and concepts
// =============================================================================

/**
 * Get cross-references for a word
 * @param {Object} data - Word lookup data
 * @returns {Promise<Object>} Cross-reference data
 */
const getCrossReferences = async (data) => {
  if (!data) return null;

  const refs = {
    sameRoot: [],
    semanticField: [],
    relatedConcepts: [],
  };

  // Get words with same root
  if (data.root && knowledgeGraphService?.getWordsFromRoot) {
    try {
      refs.sameRoot = await knowledgeGraphService.getWordsFromRoot(data.root);
    } catch (e) {
      console.debug('[CrossRefs] Root lookup failed:', e);
    }
  }

  // Get semantic field
  if (data.word && semanticFieldService?.getSemanticField) {
    try {
      refs.semanticField = await semanticFieldService.getSemanticField(data.word);
    } catch (e) {
      console.debug('[CrossRefs] Semantic field lookup failed:', e);
    }
  }

  // Get related concepts from knowledge graph
  if (data.word && knowledgeGraphService?.getRelatedConcepts) {
    try {
      refs.relatedConcepts = await knowledgeGraphService.getRelatedConcepts(data.word);
    } catch (e) {
      console.debug('[CrossRefs] Related concepts lookup failed:', e);
    }
  }

  return refs;
};

// =============================================================================
// HISTORY TRACKING
// =============================================================================

const MAX_HISTORY = 50;
const HISTORY_KEY = 'word-lookup-history';

/**
 * Load lookup history from localStorage
 * @returns {Array}
 */
const loadHistory = () => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

/**
 * Save lookup history to localStorage
 * @param {Array} history
 */
const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (e) {
    console.debug('[History] Save failed:', e);
  }
};

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * useWordIntelligence - PRO SCHOLAR v3 unified word intelligence hook
 *
 * Features:
 * - LRU cache for fast repeated lookups
 * - SRS integration with quick review
 * - Learning insights (difficulty, study time)
 * - Cross-references (same root, semantic field)
 * - History tracking
 * - Prefetch system
 *
 * @param {Object} options
 * @param {string} options.language - 'hebrew' or 'aramaic'
 * @param {boolean} options.showFrench - Show French translations
 * @param {Function} options.onShowGraph - Callback when graph button clicked
 * @param {boolean} options.compact - Use compact card layout
 * @param {boolean} options.enableHistory - Track lookup history
 * @param {boolean} options.enablePrefetch - Prefetch related words
 * @returns {Object} Word intelligence state and handlers
 */
const useWordIntelligence = ({
  language = 'hebrew',
  showFrench = false,
  onShowGraph = null,
  compact = false,
  enableHistory = true,
  enablePrefetch = true,
} = {}) => {
  // -------------------------------------------------------------------------
  // CORE STATE
  // -------------------------------------------------------------------------

  const {
    selectedWord,
    translationData,
    isLoading,
    lookup: baseLookup,
    clear,
  } = useWordLookup({ language });

  const {
    hasWord,
    addWord,
    vocabulary,
  } = useVocabulary();

  // -------------------------------------------------------------------------
  // ENHANCED STATE
  // -------------------------------------------------------------------------

  const [crossRefs, setCrossRefs] = useState(null);
  const [history, setHistory] = useState(() => enableHistory ? loadHistory() : []);
  const [srsCard, setSrsCard] = useState(null);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  const cacheStatsRef = useRef({ hits: 0, misses: 0 });

  // -------------------------------------------------------------------------
  // CACHED LOOKUP
  // -------------------------------------------------------------------------

  const lookup = useCallback(async (word, options = {}) => {
    if (!word) return;

    const cacheKey = `${word}-${language}`;

    // Check cache first
    if (wordCache.has(cacheKey) && !options.bypassCache) {
      cacheStatsRef.current.hits++;
      setCacheStats({ ...cacheStatsRef.current });

      const cached = wordCache.get(cacheKey);
      // Still call baseLookup to update UI state, but data is pre-cached
      baseLookup(word);
      return cached;
    }

    // Cache miss - perform lookup
    cacheStatsRef.current.misses++;
    setCacheStats({ ...cacheStatsRef.current });

    const result = await baseLookup(word);

    // Cache the result
    if (result) {
      wordCache.set(cacheKey, result);
    }

    return result;
  }, [baseLookup, language]);

  // -------------------------------------------------------------------------
  // SRS INTEGRATION
  // -------------------------------------------------------------------------

  /**
   * Get SRS card ID for a word
   */
  const getCardId = useCallback((word) => {
    const cleaned = word ? stripAllDiacritics(word).trim() : '';
    return `vocab-${cleaned}`;
  }, []);

  /**
   * Load SRS card when word changes
   */
  useEffect(() => {
    if (selectedWord && srsService?.getCard) {
      const cardId = getCardId(selectedWord);
      const card = srsService.getCard(cardId);
      setSrsCard(card);
    } else {
      setSrsCard(null);
    }
  }, [selectedWord, getCardId]);

  /**
   * Quick SRS review - rate and process in one call
   * @param {number} quality - Quality rating 0-5
   */
  const quickReview = useCallback((quality) => {
    if (!selectedWord || !srsService) return null;

    const cardId = getCardId(selectedWord);
    let card = srsService.getCard(cardId);

    // Create card if doesn't exist
    if (!card && translationData) {
      card = srsService.createCard(
        cardId,
        selectedWord,
        translationData.english || translationData.definition || '',
        {
          context: translationData.context || '',
          hebrewRoot: translationData.root,
          source: 'WordIntelligence',
        }
      );
    }

    if (card) {
      const updated = srsService.processReview(cardId, quality);
      setSrsCard(updated);
      return updated;
    }

    return null;
  }, [selectedWord, translationData, getCardId]);

  /**
   * Get mastery level for current word
   */
  const masteryLevel = useMemo(() => {
    if (!srsCard || !srsService?.getMasteryLevel) {
      return { level: 'new', icon: '✨' };
    }
    return srsService.getMasteryLevel(srsCard);
  }, [srsCard]);

  // -------------------------------------------------------------------------
  // CROSS-REFERENCES
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (translationData && enablePrefetch) {
      getCrossReferences(translationData).then(setCrossRefs);
    } else {
      setCrossRefs(null);
    }
  }, [translationData, enablePrefetch]);

  // -------------------------------------------------------------------------
  // HISTORY TRACKING
  // -------------------------------------------------------------------------

  const addToHistory = useCallback((word, data) => {
    if (!enableHistory || !word) return;

    setHistory(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(h => h.word !== word);

      // Add new entry at start
      const newHistory = [
        {
          word,
          english: data?.english || data?.definition,
          root: data?.root,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_HISTORY);

      saveHistory(newHistory);
      return newHistory;
    });
  }, [enableHistory]);

  // Add to history when word is looked up
  useEffect(() => {
    if (selectedWord && translationData) {
      addToHistory(selectedWord, translationData);
    }
  }, [selectedWord, translationData, addToHistory]);

  /**
   * Clear lookup history
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // -------------------------------------------------------------------------
  // LEARNING INSIGHTS
  // -------------------------------------------------------------------------

  const difficulty = useMemo(() =>
    calculateDifficulty(translationData),
    [translationData]
  );

  const studyTime = useMemo(() =>
    estimateStudyTime(translationData, srsCard),
    [translationData, srsCard]
  );

  // -------------------------------------------------------------------------
  // VOCABULARY INTEGRATION
  // -------------------------------------------------------------------------

  const isInVocab = useMemo(() => {
    if (!selectedWord) return false;
    return hasWord(selectedWord) || hasWord(translationData?.cleanedWord);
  }, [selectedWord, translationData?.cleanedWord, hasWord]);

  const handleAddToVocab = useCallback((word, definition, root) => {
    if (!word || !definition) return;
    addWord(word, definition, root || '');
  }, [addWord]);

  // -------------------------------------------------------------------------
  // PREFETCH RELATED WORDS
  // -------------------------------------------------------------------------

  const prefetchRelated = useCallback(async () => {
    if (!crossRefs || !enablePrefetch) return;

    // Prefetch words from same root (background, low priority)
    const toFetch = [
      ...(crossRefs.sameRoot?.slice(0, 3) || []),
      ...(crossRefs.semanticField?.slice(0, 2) || []),
    ];

    toFetch.forEach(word => {
      const cacheKey = `${word}-${language}`;
      if (!wordCache.has(cacheKey)) {
        // Low-priority background fetch
        setTimeout(() => baseLookup(word), 100);
      }
    });
  }, [crossRefs, enablePrefetch, language, baseLookup]);

  // Trigger prefetch when cross-refs load
  useEffect(() => {
    if (crossRefs) {
      prefetchRelated();
    }
  }, [crossRefs, prefetchRelated]);

  // -------------------------------------------------------------------------
  // CARD PROPS
  // -------------------------------------------------------------------------

  const cardProps = useMemo(() => ({
    word: selectedWord,
    data: translationData,
    onAddToVocab: handleAddToVocab,
    onShowGraph,
    onClose: clear,
    compact,
    showFrench,
    isInVocab,
    srsCard,
    masteryLevel,
    difficulty,
    studyTime,
    crossRefs,
    onQuickReview: quickReview,
  }), [
    selectedWord,
    translationData,
    handleAddToVocab,
    onShowGraph,
    clear,
    compact,
    showFrench,
    isInVocab,
    srsCard,
    masteryLevel,
    difficulty,
    studyTime,
    crossRefs,
    quickReview,
  ]);

  // -------------------------------------------------------------------------
  // RETURN VALUE
  // -------------------------------------------------------------------------

  return {
    // Core state
    selectedWord,
    translationData,
    isLoading,
    isInVocab,

    // Actions
    lookup,
    clear,
    addToVocab: handleAddToVocab,

    // SRS integration
    srsCard,
    masteryLevel,
    quickReview,

    // Learning insights
    difficulty,
    studyTime,

    // Cross-references
    crossRefs,

    // History
    history,
    clearHistory,

    // Cache stats
    cacheStats,
    clearCache: () => wordCache.clear(),

    // Card rendering
    cardProps,

    // Vocabulary stats
    vocabularyCount: vocabulary.length,
  };
};

export default useWordIntelligence;

// =============================================================================
// EXPORTS
// =============================================================================

export { LRUCache, calculateDifficulty, estimateStudyTime, getCrossReferences };
