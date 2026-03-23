/**
 * Feature Flags - Unified Feature Registry & Performance Layer
 * (Renamed from proScholarV4.js in PRO SCHOLAR V8 cleanup)
 *
 * ⚠️ DEPRECATED for root extraction - Use rootExtraction.js instead!
 * The extractAllPossibleRoots function is now in rootExtraction.js
 * with better caching and direct dictionary validation.
 *
 * Migration guide:
 *   OLD: import { extractAllPossibleRoots } from './featureFlags';
 *   NEW: import { extractRootsWithDirectValidation } from './rootExtraction';
 *
 * This module is STILL VALID for:
 * - Feature flags (FEATURES)
 * - Telemetry
 * - Service cache management
 *
 * @module featureFlags
 * @version 4.0.0
 */

// Dictionary loaders for multi-hypothesis validation
import {
  lookupJastrowSync,
  lookupBDBSync,
  lookupStrongsSync
} from './dictionaryLoader';
// PRO SCHOLAR V5: Single source of truth for Aramaic particles
import { ARAMAIC_PARTICLES } from './preClassificationService';

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const PRO_SCHOLAR_VERSION = '4.0.0';

export const FEATURES = {
  // Dictionary & Word Analysis
  WORD_INTELLIGENCE: true,       // WordIntelligenceCard with all features
  FAMILY_TREE: true,            // Word family visualization
  CONSTRUCT_CHAIN: true,        // סמיכות detection
  CANTILLATION: true,           // Trop analysis

  // Manuscript & Text Criticism
  MANUSCRIPT_VARIANTS: true,    // DSS/LXX variants
  MASORETIC_NOTES: true,        // Masoretic notes display
  TEXT_VERSIONS: true,          // Multiple text versions

  // AI & Analysis
  RAG_ENHANCED: true,           // RAG-enhanced AI responses
  KNOWLEDGE_GRAPH: true,        // Rabbi relationship visualization
  DISCOURSE_ANALYSIS: true,     // Sugya flow analysis

  // Study & Progress
  SRS_REVIEW: true,             // Spaced repetition system
  MASTERY_TRACKING: true,       // Learning progress tracking
  STUDY_STREAK: true,           // Daily study tracking

  // Performance
  AGGRESSIVE_CACHING: true,     // Enable all caches
  LAZY_LOADING: true,           // Lazy service initialization
  PREFETCH: true,               // Prefetch likely lookups
};

// =============================================================================
// SERVICE CACHE - Lazy initialization with singleton pattern
// =============================================================================

const _serviceCache = {
  cantillation: null,
  constructChain: null,
  manuscriptVariants: null,
  knowledgeGraph: null,
  rag: null,
  srs: null,
  wordLookup: null,
  grammarAnalysis: null,
  semanticField: null,
  hebrewDictionary: null,
  calDictionary: null,
};

/**
 * Get a service with lazy initialization
 * @param {string} serviceName - Name of the service
 * @returns {Object|null} The service module or null if unavailable
 */
export const getService = (serviceName) => {
  if (_serviceCache[serviceName]) {
    return _serviceCache[serviceName];
  }

  try {
    switch (serviceName) {
      case 'cantillation':
        _serviceCache.cantillation = require('./cantillationService');
        break;
      case 'constructChain':
        _serviceCache.constructChain = require('./constructChainService');
        break;
      case 'manuscriptVariants':
        _serviceCache.manuscriptVariants = require('./manuscriptVariantsService');
        break;
      case 'knowledgeGraph':
        _serviceCache.knowledgeGraph = require('./knowledgeGraphService');
        break;
      case 'rag':
        _serviceCache.rag = require('./ragService');
        break;
      case 'srs':
        _serviceCache.srs = require('./srsService');
        break;
      case 'wordLookup':
        // PRO SCHOLAR V10: Use unifiedLookupService (consolidated from wordLookupOrchestrator)
        _serviceCache.wordLookup = require('./unifiedLookupService');
        break;
      case 'grammarAnalysis':
        _serviceCache.grammarAnalysis = require('./grammarAnalysisService');
        break;
      case 'semanticField':
        _serviceCache.semanticField = require('./semanticFieldService');
        break;
      case 'hebrewDictionary':
        _serviceCache.hebrewDictionary = require('./hebrewDictionary');
        break;
      case 'calDictionary':
        _serviceCache.calDictionary = require('./calDictionaryService');
        break;
      default:
        console.warn(`[ProScholarV4] Unknown service: ${serviceName}`);
        return null;
    }
  } catch (e) {
    console.warn(`[ProScholarV4] Failed to load service ${serviceName}:`, e.message);
    return null;
  }

  return _serviceCache[serviceName];
};

// =============================================================================
// UNIFIED CACHE SYSTEM
// ⚠️ DEPRECATED - PRO SCHOLAR V8
//
// These cache functions (getCached, setCached, clearCache) are deprecated.
// Use cacheOrchestrator.js instead for unified cache management with telemetry.
//
// Migration:
//   OLD: import { getCached, setCached } from './proScholarV4';
//   NEW: import { createManagedCache } from './cacheOrchestrator';
//        const cache = createManagedCache('myNamespace', { ttl: 300000, maxSize: 500 });
//        cache.get(key); cache.set(key, value);
//
// The getCached/setCached functions below are kept for backwards compatibility.
// =============================================================================

const _globalCache = new Map();
const CACHE_CONFIG = {
  maxEntries: 1000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  wordLookupTTL: 5 * 60 * 1000,
  crossRefsTTL: 10 * 60 * 1000,
  variantsTTL: 30 * 60 * 1000,
  grammarTTL: 60 * 60 * 1000, // 1 hour - grammar doesn't change
};

/**
 * Get cached value
 * @param {string} namespace - Cache namespace (e.g., 'wordLookup', 'crossRefs')
 * @param {string} key - Cache key
 * @returns {*} Cached value or null
 */
export const getCached = (namespace, key) => {
  const fullKey = `${namespace}:${key}`;
  const cached = _globalCache.get(fullKey);

  if (!cached) return null;

  const ttl = CACHE_CONFIG[`${namespace}TTL`] || CACHE_CONFIG.defaultTTL;
  if (Date.now() - cached.timestamp > ttl) {
    _globalCache.delete(fullKey);
    return null;
  }

  return cached.value;
};

/**
 * Set cached value
 * @param {string} namespace - Cache namespace
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 */
export const setCached = (namespace, key, value) => {
  // Evict old entries if cache is full
  if (_globalCache.size >= CACHE_CONFIG.maxEntries) {
    const entries = Array.from(_globalCache.entries());
    // Remove oldest 10%
    const toRemove = Math.ceil(entries.length * 0.1);
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, toRemove)
      .forEach(([k]) => _globalCache.delete(k));
  }

  _globalCache.set(`${namespace}:${key}`, { value, timestamp: Date.now() });
};

/**
 * Clear cache namespace or entire cache
 * @param {string} [namespace] - Optional namespace to clear
 */
export const clearCache = (namespace) => {
  if (namespace) {
    const prefix = `${namespace}:`;
    for (const key of _globalCache.keys()) {
      if (key.startsWith(prefix)) {
        _globalCache.delete(key);
      }
    }
  } else {
    _globalCache.clear();
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => {
  const stats = {
    totalEntries: _globalCache.size,
    maxEntries: CACHE_CONFIG.maxEntries,
    namespaces: {},
  };

  for (const key of _globalCache.keys()) {
    const namespace = key.split(':')[0];
    stats.namespaces[namespace] = (stats.namespaces[namespace] || 0) + 1;
  }

  return stats;
};

// =============================================================================
// PRO SCHOLAR v4 UNIFIED API
// =============================================================================

/**
 * Analyze a Hebrew/Aramaic word with all Pro Scholar v4 features
 * @param {string} word - Word to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Complete word analysis
 */
export const analyzeWord = async (word, options = {}) => {
  const {
    includeGrammar = true,
    includeSemantics = true,
    includeFrequency = true,
    includeCantillation = true,
    includeConstruct = true,
    verseRef = null,
  } = options;

  // Check cache first
  const cacheKey = `${word}:${JSON.stringify(options)}`;
  const cached = getCached('wordAnalysis', cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const result = {
    word,
    timestamp: Date.now(),
    features: {},
  };

  // Get word lookup service
  const wordLookup = getService('wordLookup');
  if (wordLookup) {
    try {
      const lookupResult = await wordLookup.lookupWord(word, {
        includeGrammar,
        includeSemantics,
        includeFrequency,
      });
      if (lookupResult) {
        Object.assign(result, lookupResult);
        result.features.lookup = true;
      }
    } catch (e) {
      console.debug('[ProScholarV4] Word lookup failed:', e.message);
    }
  }

  // Cantillation analysis
  if (includeCantillation && FEATURES.CANTILLATION) {
    const cantService = getService('cantillation');
    if (cantService?.extractCantillation) {
      try {
        result.cantillation = cantService.extractCantillation(word);
        result.features.cantillation = result.cantillation?.length > 0;
      } catch (e) {
        console.debug('[ProScholarV4] Cantillation analysis failed:', e.message);
      }
    }
  }

  // Construct chain detection
  if (includeConstruct && FEATURES.CONSTRUCT_CHAIN) {
    const constructService = getService('constructChain');
    if (constructService?.analyzeConstructChain) {
      try {
        result.constructChain = constructService.analyzeConstructChain(word);
        result.features.constructChain = result.constructChain?.isConstruct || false;
      } catch (e) {
        console.debug('[ProScholarV4] Construct chain analysis failed:', e.message);
      }
    }
  }

  // Manuscript variants (if verse reference provided)
  if (verseRef && FEATURES.MANUSCRIPT_VARIANTS) {
    const variantsService = getService('manuscriptVariants');
    if (variantsService?.getVariantsForVerse) {
      try {
        result.variants = variantsService.getVariantsForVerse(verseRef);
        result.features.variants = result.variants?.variants?.length > 0;
      } catch (e) {
        console.debug('[ProScholarV4] Variants lookup failed:', e.message);
      }
    }
  }

  // Cache result
  setCached('wordAnalysis', cacheKey, result);

  return result;
};

/**
 * Get enhanced cross-references using RAG
 * @param {string} word - Word or root to find references for
 * @param {Object} options - Options
 * @returns {Promise<Object>} Cross-references with context
 */
export const getCrossReferences = async (word, options = {}) => {
  const { maxResults = 10, includeContext = true } = options;

  // Check cache
  const cacheKey = `${word}:${maxResults}:${includeContext}`;
  const cached = getCached('crossRefs', cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const result = {
    word,
    references: [],
    ragEnhanced: false,
  };

  // Try RAG-enhanced lookup first
  if (FEATURES.RAG_ENHANCED) {
    const ragService = getService('rag');
    if (ragService?.findRelatedVerses) {
      try {
        const ragResults = await ragService.findRelatedVerses(word, { limit: maxResults });
        if (ragResults?.length > 0) {
          result.references = ragResults;
          result.ragEnhanced = true;
        }
      } catch (e) {
        console.debug('[ProScholarV4] RAG lookup failed:', e.message);
      }
    }
  }

  // Fallback to Sefaria API
  if (result.references.length === 0) {
    try {
      const response = await fetch(
        `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`
      );
      if (response.ok) {
        const data = await response.json();
        result.references = {
          tanakh: data.tanakh_refs?.slice(0, maxResults) || [],
          talmud: data.talmud_refs?.slice(0, maxResults) || [],
          midrash: data.midrash_refs?.slice(0, 3) || [],
        };
      }
    } catch (e) {
      console.debug('[ProScholarV4] Sefaria API failed:', e.message);
    }
  }

  setCached('crossRefs', cacheKey, result);
  return result;
};

/**
 * Get knowledge graph data for a commentator or concept
 * @param {string} entity - Entity name (rabbi, concept, etc.)
 * @returns {Object} Knowledge graph data
 */
export const getKnowledgeGraph = (entity) => {
  if (!FEATURES.KNOWLEDGE_GRAPH) return null;

  const kgService = getService('knowledgeGraph');
  if (!kgService) return null;

  // Check cache
  const cached = getCached('knowledgeGraph', entity);
  if (cached) return cached;

  try {
    const rabbiInfo = kgService.RABBINIC_NETWORK?.[entity];
    if (rabbiInfo) {
      const result = {
        entity,
        ...rabbiInfo,
        connections: [],
      };

      // Find connections (teachers, students)
      if (rabbiInfo.teachers) {
        result.connections.push(
          ...rabbiInfo.teachers.map(t => ({ type: 'teacher', name: t }))
        );
      }
      if (rabbiInfo.students) {
        result.connections.push(
          ...rabbiInfo.students.map(s => ({ type: 'student', name: s }))
        );
      }

      // Try to find path if findPath is available
      if (kgService.findPath) {
        result.findPath = (target) => kgService.findPath(entity, target);
      }

      setCached('knowledgeGraph', entity, result);
      return result;
    }
  } catch (e) {
    console.debug('[ProScholarV4] Knowledge graph lookup failed:', e.message);
  }

  return null;
};

/**
 * Get SRS (Spaced Repetition) card for a word
 * @param {string} word - Word to get/create card for
 * @param {string} [definition] - Definition for new card
 * @returns {Object|null} SRS card data
 */
export const getSRSCard = (word, definition = '') => {
  if (!FEATURES.SRS_REVIEW) return null;

  const srsService = getService('srs');
  if (!srsService) return null;

  const cardId = `word:${word}`;
  let card = srsService.getCard?.(cardId);

  if (!card && definition) {
    card = srsService.createCard?.(cardId, word, definition, {
      type: 'vocabulary',
      source: 'ProScholarV4',
    });
  }

  return card;
};

/**
 * Process SRS review
 * @param {string} word - Word being reviewed
 * @param {number} quality - Quality rating (0-5 SM-2 scale)
 * @returns {Object|null} Updated card
 */
export const processSRSReview = (word, quality) => {
  if (!FEATURES.SRS_REVIEW) return null;

  const srsService = getService('srs');
  if (!srsService?.processReview) return null;

  const cardId = `word:${word}`;
  return srsService.processReview(cardId, quality);
};

// =============================================================================
// PRELOADING & PREFETCHING
// =============================================================================

/**
 * Preload services that are commonly used together
 * @param {string[]} [serviceNames] - Specific services to preload
 */
export const preloadServices = (serviceNames) => {
  const toLoad = serviceNames || [
    'wordLookup',
    'grammarAnalysis',
    'semanticField',
    'cantillation',
  ];

  toLoad.forEach(name => getService(name));
};

/**
 * Prefetch data for likely upcoming lookups
 * @param {string[]} words - Words to prefetch
 */
export const prefetchWords = async (words) => {
  if (!FEATURES.PREFETCH) return;

  const wordLookup = getService('wordLookup');
  if (!wordLookup?.lookupWord) return;

  // Prefetch in background, don't await
  words.forEach(word => {
    const cacheKey = `${word}:false:true:true:true`;
    if (!getCached('wordAnalysis', cacheKey)) {
      analyzeWord(word, { includeGrammar: true }).catch(() => {});
    }
  });
};

// =============================================================================
// TELEMETRY (for debugging and optimization)
// =============================================================================

const _telemetry = {
  lookups: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  startTime: Date.now(),
};

export const getTelemetry = () => ({
  ..._telemetry,
  uptime: Date.now() - _telemetry.startTime,
  hitRate: _telemetry.lookups > 0
    ? (_telemetry.cacheHits / _telemetry.lookups * 100).toFixed(1) + '%'
    : '0%',
  cacheStats: getCacheStats(),
});

// =============================================================================
// MULTI-HYPOTHESIS ROOT EXTRACTION ENGINE
// Uses EXISTING dictionaries (Jastrow, BDB, Strong's) - NO hardcoded database!
// =============================================================================

// PRO SCHOLAR V5: ARAMAIC_PARTICLES now imported from preClassificationService (75+ entries)
// Single source of truth - no duplicate definitions

// Suffix patterns for hypothesis generation
const POSSESSIVE_SUFFIXES = ['תו', 'תי', 'תך', 'ו', 'י', 'ה', 'נו', 'כם', 'הם'];
const PREFIXES = ['ו', 'ה', 'ב', 'ל', 'מ', 'כ', 'ש', 'ד', 'וה', 'ול', 'וב', 'כש', 'מש'];

/**
 * Generate multiple root hypotheses from a word
 * These are CANDIDATES to validate against dictionaries
 */
const generateRootHypotheses = (word) => {
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');
  const hypotheses = [];

  // Hypothesis 1: Word itself (maybe it's a root form)
  hypotheses.push({
    candidate: cleaned,
    type: 'direct',
    morphology: null
  });

  // Hypothesis 2: Strip possessive suffixes (construct + possessive)
  // e.g., שגגתו → שגג + תו (his error)
  for (const suffix of POSSESSIVE_SUFFIXES) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      const stem = cleaned.slice(0, -suffix.length);
      hypotheses.push({
        candidate: stem,
        type: 'suffix_stripped',
        suffix: suffix,
        suffixMeaning: getSuffixMeaning(suffix),
        morphology: `${stem} + ${suffix}`
      });

      // Also try restoring feminine ה for nouns like שגגה
      if (!stem.endsWith('ה')) {
        hypotheses.push({
          candidate: stem + 'ה',
          type: 'feminine_restored',
          suffix: suffix,
          suffixMeaning: getSuffixMeaning(suffix),
          morphology: `${stem}ה + ${suffix}`
        });
      }
    }
  }

  // Hypothesis 3: Strip prefixes
  for (const prefix of PREFIXES) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 2) {
      const remainder = cleaned.slice(prefix.length);
      hypotheses.push({
        candidate: remainder,
        type: 'prefix_stripped',
        prefix: prefix,
        prefixMeaning: getPrefixMeaning(prefix),
        morphology: `${prefix} + ${remainder}`
      });

      // Also try prefix + suffix stripping
      for (const suffix of POSSESSIVE_SUFFIXES) {
        if (remainder.endsWith(suffix) && remainder.length > suffix.length + 2) {
          const stem = remainder.slice(0, -suffix.length);
          hypotheses.push({
            candidate: stem,
            type: 'prefix_suffix_stripped',
            prefix: prefix,
            suffix: suffix,
            prefixMeaning: getPrefixMeaning(prefix),
            suffixMeaning: getSuffixMeaning(suffix),
            morphology: `${prefix} + ${stem} + ${suffix}`
          });
        }
      }
    }
  }

  // Hypothesis 4: Geminate roots (doubled middle letter)
  // e.g., סבב → סב, שגג → שג
  if (cleaned.length >= 3 && cleaned[cleaned.length - 1] === cleaned[cleaned.length - 2]) {
    const geminateRoot = cleaned.slice(0, -1);
    hypotheses.push({
      candidate: geminateRoot,
      type: 'geminate',
      morphology: `Geminate root: ${geminateRoot}${cleaned[cleaned.length - 1]}`
    });
  }

  // Hypothesis 5: Hollow verb restoration (ע"ו / ע"י)
  // e.g., הביא might come from בוא
  if (cleaned.length >= 4) {
    const match = cleaned.match(/^ה?([א-ת])([א-ת])י([א-ת])$/);
    if (match) {
      // eslint-disable-next-line no-unused-vars
      const [, c1, _c2, c3] = match; // _c2 is middle letter (skipped for hollow verb)
      hypotheses.push({
        candidate: c1 + 'ו' + c3,
        type: 'hollow_verb',
        morphology: `Hollow root (ע"ו): ${c1}ו${c3}`
      });
      hypotheses.push({
        candidate: c1 + 'י' + c3,
        type: 'hollow_verb',
        morphology: `Hollow root (ע"י): ${c1}י${c3}`
      });
    }
  }

  // ========== PRO SCHOLAR V4.1: WEAK VERB RULES ==========

  // Hypothesis 6: PE-NUN (פ"נ) - First נ assimilates
  // CRITICAL: תפיקו → ת + פיק + ו = Aphel of נפק
  // The נ disappears and the following letter gets a dagesh (doubles)
  // Common verbs: נפק (go out), נתן (give), נפל (fall), נגע (touch), נטל (take)
  const peNunPatterns = [
    // Pattern: XיX (2 consonants with yod in middle) → נXX
    { regex: /^([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2] },
    // Pattern: תXיXו (Aphel 2mp) → נXX
    { regex: /^ת([א-ת])י([א-ת])ו$/, reconstruct: (m) => 'נ' + m[1] + m[2] },
    // Pattern: תXיX (Aphel 3fs/2ms) → נXX
    { regex: /^ת([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2] },
    // Pattern: מXיX (Aphel participle) → נXX
    { regex: /^מ([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2] },
    // Pattern: XX (2 consonants) → נXX (assimilated נ)
    { regex: /^([א-ת])([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], lowConfidence: true },
  ];

  for (const pattern of peNunPatterns) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      const root = pattern.reconstruct(match);
      if (root.length === 3) {
        hypotheses.push({
          candidate: root,
          type: 'pe_nun',
          weakVerb: 'פ"נ',
          morphology: `Pe-Nun weak verb: נ assimilated → ${root}`,
          confidence: pattern.lowConfidence ? 70 : 85
        });
      }
    }
  }

  // Hypothesis 7: PE-YOD (פ"י) - First י drops or becomes ו
  // Common verbs: ילד (give birth), ישב (sit), ירד (descend), ידע (know)
  if (cleaned.length >= 2 && cleaned[0] === 'ו') {
    hypotheses.push({
      candidate: 'י' + cleaned.slice(1),
      type: 'pe_yod',
      weakVerb: 'פ"י',
      morphology: `Pe-Yod weak verb: י→ו → ${'י' + cleaned.slice(1)}`
    });
  }
  if (cleaned.length === 2) {
    hypotheses.push({
      candidate: 'י' + cleaned,
      type: 'pe_yod',
      weakVerb: 'פ"י',
      morphology: `Pe-Yod weak verb: initial י dropped → ${'י' + cleaned}`
    });
  }

  // Hypothesis 8: PE-ALEPH (פ"א) - First א quiesces
  // Common verbs: אמר (say), אכל (eat), אבד (lose), אהב (love)
  if (cleaned.length === 2) {
    hypotheses.push({
      candidate: 'א' + cleaned,
      type: 'pe_aleph',
      weakVerb: 'פ"א',
      morphology: `Pe-Aleph weak verb: initial א quiesced → ${'א' + cleaned}`
    });
  }

  // Hypothesis 9: LAMED-HE (ל"ה) - Final ה alternates with י/ת
  // Common verbs: בנה (build), עשה (do), ראה (see), היה (be)
  if (cleaned.length >= 2 && /[יהת]$/.test(cleaned)) {
    const base = cleaned.slice(0, -1);
    if (base.length >= 2) {
      hypotheses.push({
        candidate: base + 'ה',
        type: 'lamed_he',
        weakVerb: 'ל"ה',
        morphology: `Lamed-He weak verb: final ה → ${base}ה`
      });
      hypotheses.push({
        candidate: base + 'י',
        type: 'lamed_he',
        weakVerb: 'ל"ה',
        morphology: `Lamed-He weak verb: final י → ${base}י`
      });
    }
  }

  // Hypothesis 10: LAMED-ALEPH (ל"א) - Final א quiesces
  // Common verbs: קרא (call), מצא (find), נשא (carry), בוא (come)
  if (cleaned.length === 2 && !cleaned.endsWith('א')) {
    hypotheses.push({
      candidate: cleaned + 'א',
      type: 'lamed_aleph',
      weakVerb: 'ל"א',
      morphology: `Lamed-Aleph weak verb: final א quiesced → ${cleaned}א`
    });
  }

  // Hypothesis 11: AYIN-VAV (ע"ו) restoration
  // Pattern: XיX → XוX (the vav contracts to yod in conjugation)
  if (cleaned.length >= 2 && cleaned.length <= 3) {
    const firstLetter = cleaned[0];
    const lastLetter = cleaned[cleaned.length - 1];
    hypotheses.push({
      candidate: firstLetter + 'ו' + lastLetter,
      type: 'ayin_vav',
      weakVerb: 'ע"ו',
      morphology: `Ayin-Vav hollow verb: ${firstLetter}ו${lastLetter}`
    });
  }

  // Hypothesis 12: AYIN-YOD (ע"י) restoration
  if (cleaned.length === 2) {
    hypotheses.push({
      candidate: cleaned[0] + 'י' + cleaned[1],
      type: 'ayin_yod',
      weakVerb: 'ע"י',
      morphology: `Ayin-Yod hollow verb: ${cleaned[0]}י${cleaned[1]}`
    });
  }

  return hypotheses;
};

/**
 * Calculate confidence score for a hypothesis based on type and source
 */
const getConfidenceScore = (hypothesis, source, dictionaryTier) => {
  // Base confidence by hypothesis type
  const baseConfidence = {
    direct: 95,
    suffix_stripped: 88,
    prefix_stripped: 88,
    prefix_suffix_stripped: 85,
    feminine_restored: 82,
    geminate: 80,
    hollow_verb: 82,
    pe_nun: hypothesis.confidence || 85,  // Use hypothesis-specific confidence
    pe_yod: 80,
    pe_aleph: 78,
    lamed_he: 80,
    lamed_aleph: 75,
    ayin_vav: 78,
    ayin_yod: 75,
  };

  // Dictionary tier bonus
  const tierBonus = {
    gold: 5,      // Jastrow, BDB - scholarly standard
    silver: 0,    // Strong's, Klein
    bronze: -5,   // Other sources
  };

  const base = baseConfidence[hypothesis.type] || 70;
  const bonus = tierBonus[dictionaryTier] || 0;

  return Math.min(100, base + bonus);
};

/**
 * Validate hypotheses against EXISTING dictionaries
 * Returns all matches with scholarly sources
 */
const validateAgainstDictionaries = (hypotheses) => {
  const validatedResults = [];

  for (const hypothesis of hypotheses) {
    const { candidate } = hypothesis;

    // Check Jastrow (Aramaic/Talmudic - ~25,000 entries) - GOLD TIER
    const jastrowEntry = lookupJastrowSync(candidate);
    if (jastrowEntry) {
      validatedResults.push({
        root: candidate,
        definition: jastrowEntry.definition || jastrowEntry.gloss || jastrowEntry.meaning,
        source: 'Jastrow (1903)',
        sourceFullName: "A Dictionary of the Targumim, Talmud Babli, Yerushalmi, and Midrashic Literature",
        tier: 'gold',
        language: 'Aramaic/Hebrew',
        confidence: getConfidenceScore(hypothesis, 'Jastrow', 'gold'),
        hypothesis: hypothesis,
        entry: jastrowEntry,
        weakVerb: hypothesis.weakVerb // Include weak verb classification
      });
    }

    // Check BDB (Biblical Hebrew - ~8,000 entries) - GOLD TIER
    const bdbEntry = lookupBDBSync(candidate);
    if (bdbEntry) {
      validatedResults.push({
        root: candidate,
        definition: bdbEntry.definition || bdbEntry.gloss || bdbEntry.meaning,
        source: 'BDB (1906)',
        sourceFullName: "Brown-Driver-Briggs Hebrew and English Lexicon",
        tier: 'gold',
        language: 'Hebrew',
        confidence: getConfidenceScore(hypothesis, 'BDB', 'gold'),
        hypothesis: hypothesis,
        entry: bdbEntry,
        weakVerb: hypothesis.weakVerb
      });
    }

    // Check Strong's (Biblical Hebrew - ~8,600 entries) - SILVER TIER
    const strongsEntry = lookupStrongsSync(candidate);
    if (strongsEntry) {
      validatedResults.push({
        root: candidate,
        definition: strongsEntry.definition || strongsEntry.gloss || strongsEntry.meaning,
        source: "Strong's",
        sourceFullName: "Strong's Exhaustive Concordance",
        tier: 'silver',
        language: 'Hebrew',
        confidence: getConfidenceScore(hypothesis, "Strong's", 'silver'),
        hypothesis: hypothesis,
        entry: strongsEntry,
        weakVerb: hypothesis.weakVerb
      });
    }
  }

  return validatedResults;
};

/**
 * Extract ALL possible roots with dictionary validation
 * This is the main PRO SCHOLAR V4 function
 */
export const extractAllPossibleRoots = (word, options = {}) => {
  if (!word || word.length < 2) return [];

  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');

  // Step 0: Check if it's an Aramaic particle (fixed phrase)
  // PRO SCHOLAR V5: Now uses 75+ particles from preClassificationService
  const particle = ARAMAIC_PARTICLES[cleaned];
  if (particle) {
    return [{
      root: particle.root || cleaned,
      definition: particle.meaning,
      form: particle.form,
      source: 'Aramaic Particles',
      language: 'Aramaic',
      confidence: particle.confidence || 98,
      hypothesis: { type: particle.type || 'particle' }
    }];
  }

  // Step 1: Generate hypotheses (possible roots)
  const hypotheses = generateRootHypotheses(cleaned);

  // Step 2: Validate against existing dictionaries
  const results = validateAgainstDictionaries(hypotheses);

  // Step 3: Sort by confidence and deduplicate
  results.sort((a, b) => b.confidence - a.confidence);

  // Deduplicate by root + source
  const seen = new Set();
  const unique = results.filter(r => {
    const key = `${r.root}-${r.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
};

/**
 * Get the best root hypothesis
 */
export const getBestRoot = (word, options = {}) => {
  const results = extractAllPossibleRoots(word, options);
  return results.length > 0 ? results[0] : null;
};

/**
 * Get top N root hypotheses with all sources
 */
export const getTopRoots = (word, n = 3, options = {}) => {
  return extractAllPossibleRoots(word, options).slice(0, n);
};

// Helper functions
const getSuffixMeaning = (suffix) => {
  const meanings = {
    'תו': 'his (construct)',
    'תי': 'my (construct)',
    'תך': 'your (construct)',
    'ו': 'his',
    'י': 'my',
    'ה': 'her',
    'נו': 'our',
    'כם': 'your (pl)',
    'הם': 'their'
  };
  return meanings[suffix] || suffix;
};

const getPrefixMeaning = (prefix) => {
  const meanings = {
    'ו': 'and',
    'ה': 'the',
    'ב': 'in/with',
    'ל': 'to/for',
    'מ': 'from',
    'כ': 'like/as',
    'ש': 'that/which',
    'ד': 'of (Aramaic)',
    'וה': 'and the',
    'ול': 'and to',
    'וב': 'and in',
    'כש': 'when',
    'מש': 'from that'
  };
  return meanings[prefix] || prefix;
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const ProScholarV4 = {
  VERSION: PRO_SCHOLAR_VERSION,
  FEATURES,
  getService,
  getCached,
  setCached,
  clearCache,
  getCacheStats,
  analyzeWord,
  getCrossReferences,
  getKnowledgeGraph,
  getSRSCard,
  processSRSReview,
  preloadServices,
  prefetchWords,
  getTelemetry,
  // Multi-hypothesis root extraction (uses existing dictionaries!)
  ARAMAIC_PARTICLES,
  extractAllPossibleRoots,
  getBestRoot,
  getTopRoots,
};

export default ProScholarV4;
