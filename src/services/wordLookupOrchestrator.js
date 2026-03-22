/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WORD LOOKUP ORCHESTRATOR V4.0 - PRO SCHOLAR EDITION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Academic-grade Hebrew/Aramaic lexical analysis system
 *
 * SCHOLARLY FEATURES:
 * ────────────────────
 * 1. Multi-Hypothesis Root Extraction
 *    - Generates 3-8 candidate roots per word
 *    - Direct dictionary validation for each hypothesis
 *    - Confidence scoring based on morphological plausibility
 *
 * 2. Source Tiering System
 *    - GOLD: BDB, Jastrow, HALOT, CAL (peer-reviewed academic)
 *    - SILVER: Strong's, Klein, Gesenius (established reference)
 *    - BRONZE: Sefaria, Steinsaltz (modern/popular)
 *
 * 3. Dictionary Match Validation
 *    - LCS-based headword similarity scoring
 *    - Rejects mismatched dictionary entries (e.g., תפיקו ≠ פיק)
 *
 * 4. Cognate Language Analysis
 *    - Akkadian, Ugaritic, Arabic, Syriac cognates
 *    - Proto-Semitic root reconstruction
 *
 * 5. Historical Layer Detection
 *    - Biblical Hebrew (BH) vs Mishnaic Hebrew (MH) vs Talmudic Aramaic (TA)
 *    - Dialect markers and periodization
 *
 * 6. Morphological Derivation Chain
 *    - 6-step scholarly breakdown (Surface → Root)
 *    - Each step with linguistic explanation
 *
 * 7. Weak Verb Analysis
 *    - All 8 weak verb types: פ״נ, פ״י, פ״א, ע״ו/ע״י, ע״ע, ל״ה, ל״א, Hollow
 *    - Transformation rules and paradigm identification
 *
 * 8. Semantic Field Categorization
 *    - 40+ scholarly domains (legal, ritual, agricultural, etc.)
 *    - Synonym/antonym networks
 *
 * 9. Cross-Reference System
 *    - Links to related entries in same root family
 *    - Hapax legomena detection
 *
 * 10. Corpus Frequency Analysis
 *     - Distribution across Biblical books, Mishnah, Talmud
 *     - Frequency bands with percentile rankings
 *
 * Architecture:
 * ─────────────
 * Component → lookupWord() → {
 *   ├→ Request Deduplication (pending promise map)
 *   ├→ Unified Cache Check (tiered: memory → IndexedDB)
 *   ├→ Pre-classification (particles, abbreviations, proper nouns)
 *   ├→ Parallel Dictionary Lookup (race Jastrow, BDB, Sefaria, CAL)
 *   ├→ Multi-Hypothesis Root Extraction with Direct Validation
 *   ├→ Scholarly Enhancement Pipeline
 *   │   ├→ Weak Verb Analysis
 *   │   ├→ Binyan Detection
 *   │   ├→ Historical Layer
 *   │   ├→ Semantic Field
 *   │   ├→ Cognate Languages
 *   │   └→ Corpus Frequency
 *   ├→ Source Tiering & Reliability Scoring
 *   └→ Normalized Result Assembly
 * }
 *
 * @module wordLookupOrchestrator
 * @version 4.0.0 PRO SCHOLAR
 */

import { createManagedCache, getGlobalTelemetry, getPerformanceMetrics, autoManageCaches } from './cacheOrchestrator';
// PRO SCHOLAR V7: Import scholarly source classification and explanation generator
import {
  generateScholarlyExplanation,
  getMatchTypeInfo,
  explainConfidence,
  getSourceInfo,
  getSourceReliability,
  calculateSourceConfidence,
  isAcademicLexicon,
  isLocalSource,
  MATCH_TYPES,
  RELIABILITY_TIERS
} from '../constants/dictionarySources';

// =============================================================================
// SCHOLARLY CONSTANTS
// =============================================================================

/**
 * Source Tiering - Academic credibility classification
 */
export const SOURCE_TIERS = {
  GOLD: {
    level: 'gold',
    reliability: 0.95,
    bonus: 5,
    description: 'Peer-reviewed academic dictionaries',
    sources: ['bdb', 'jastrow', 'halot', 'cal', 'dcpa']
  },
  SILVER: {
    level: 'silver',
    reliability: 0.85,
    bonus: 0,
    description: 'Established scholarly references',
    sources: ['strongs', 'strong', 'klein', 'gesenius', 'twot', 'koehler']
  },
  BRONZE: {
    level: 'bronze',
    reliability: 0.70,
    bonus: -3,
    description: 'Modern/popular sources',
    sources: ['sefaria', 'steinsaltz', 'artscroll', 'mechon-mamre']
  }
};

/**
 * Full source metadata for scholarly citations
 */
export const SOURCE_METADATA = {
  // GOLD TIER
  bdb: {
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    shortName: 'BDB',
    year: 1906,
    tier: 'gold',
    language: 'hebrew',
    citation: 'Brown, F., Driver, S. R., & Briggs, C. A. (1906). A Hebrew and English Lexicon of the Old Testament. Oxford: Clarendon Press.'
  },
  jastrow: {
    fullName: "Jastrow's Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature",
    shortName: 'Jastrow',
    year: 1903,
    tier: 'gold',
    language: 'aramaic',
    citation: 'Jastrow, M. (1903). A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature. London: Luzac.'
  },
  halot: {
    fullName: 'The Hebrew and Aramaic Lexicon of the Old Testament',
    shortName: 'HALOT',
    year: 2000,
    tier: 'gold',
    language: 'both',
    citation: 'Koehler, L., Baumgartner, W., & Stamm, J. J. (2000). The Hebrew and Aramaic Lexicon of the Old Testament. Leiden: Brill.'
  },
  cal: {
    fullName: 'Comprehensive Aramaic Lexicon',
    shortName: 'CAL',
    year: 2023,
    tier: 'gold',
    language: 'aramaic',
    citation: 'Comprehensive Aramaic Lexicon Project. Hebrew Union College, Cincinnati.'
  },

  // SILVER TIER
  strongs: {
    fullName: "Strong's Exhaustive Concordance of the Bible",
    shortName: "Strong's",
    year: 1890,
    tier: 'silver',
    language: 'hebrew',
    citation: "Strong, J. (1890). Strong's Exhaustive Concordance of the Bible. Nashville: Abingdon Press."
  },
  klein: {
    fullName: 'A Comprehensive Etymological Dictionary of the Hebrew Language',
    shortName: 'Klein',
    year: 1987,
    tier: 'silver',
    language: 'hebrew',
    citation: 'Klein, E. (1987). A Comprehensive Etymological Dictionary of the Hebrew Language. Jerusalem: Carta.'
  },
  gesenius: {
    fullName: "Gesenius' Hebrew Grammar & Lexicon",
    shortName: 'Gesenius',
    year: 1910,
    tier: 'silver',
    language: 'hebrew',
    citation: 'Gesenius, W. (1910). Hebrew Grammar. Ed. E. Kautzsch, trans. A. E. Cowley. Oxford: Clarendon Press.'
  },

  // BRONZE TIER
  sefaria: {
    fullName: 'Sefaria.org Lexicon',
    shortName: 'Sefaria',
    year: 2023,
    tier: 'bronze',
    language: 'both',
    citation: 'Sefaria.org. (2023). Online Lexicon Resources.'
  },
  steinsaltz: {
    fullName: 'Steinsaltz Talmud Translation',
    shortName: 'Steinsaltz',
    year: 1989,
    tier: 'bronze',
    language: 'aramaic',
    citation: 'Steinsaltz, A. (1989). The Talmud: The Steinsaltz Edition. New York: Random House.'
  }
};

/**
 * Weak Verb Types - All 8 classical categories
 */
export const WEAK_VERB_TYPES = {
  PE_NUN: {
    code: 'פ״נ',
    name: 'Pe-Nun',
    description: 'First root letter is נ - assimilates in certain forms',
    examples: ['נפל', 'נגש', 'נשא', 'נתן'],
    transformation: 'נ assimilates into following consonant with dagesh'
  },
  PE_YOD: {
    code: 'פ״י',
    name: 'Pe-Yod',
    description: 'First root letter is י - often drops or becomes vowel',
    examples: ['ישב', 'ילד', 'ירד', 'יצא'],
    transformation: 'י drops in Qal imperfect, becomes ו in Hiphil'
  },
  PE_ALEPH: {
    code: 'פ״א',
    name: 'Pe-Aleph',
    description: 'First root letter is א - quiesces affecting vowels',
    examples: ['אכל', 'אמר', 'אבד'],
    transformation: 'א quiesces, preceding vowel lengthens'
  },
  AYIN_VAV_YOD: {
    code: 'ע״ו/ע״י',
    name: 'Ayin-Vav/Yod (Hollow)',
    description: 'Middle root letter is ו or י - contracts to vowel',
    examples: ['קום', 'שים', 'בוא', 'מות'],
    transformation: 'Middle letter becomes long vowel (ū or ī)'
  },
  AYIN_AYIN: {
    code: 'ע״ע',
    name: 'Ayin-Ayin (Geminate)',
    description: 'Second and third root letters are identical',
    examples: ['סבב', 'גלל', 'חלל', 'תמם'],
    transformation: 'Doubled letter may contract or separate'
  },
  LAMED_HE: {
    code: 'ל״ה',
    name: 'Lamed-He',
    description: 'Third root letter is ה (originally י or ו)',
    examples: ['בנה', 'עשה', 'ראה', 'היה'],
    transformation: 'ה drops before consonant suffixes'
  },
  LAMED_ALEPH: {
    code: 'ל״א',
    name: 'Lamed-Aleph',
    description: 'Third root letter is א - quiesces in certain forms',
    examples: ['מצא', 'קרא', 'בוא', 'נשא'],
    transformation: 'א quiesces, preceding vowel affected'
  },
  DOUBLY_WEAK: {
    code: 'כפול',
    name: 'Doubly Weak',
    description: 'Two weak letters in root',
    examples: ['נתן', 'היה', 'חיה'],
    transformation: 'Multiple weakness rules apply'
  }
};

/**
 * Hebrew Binyan (verb pattern) information
 */
export const BINYAN_INFO = {
  // Hebrew Binyanim
  qal: { hebrew: 'קַל', meaning: 'Simple active', voice: 'active', intensity: 'simple' },
  niphal: { hebrew: 'נִפְעַל', meaning: 'Simple passive/reflexive', voice: 'passive', intensity: 'simple' },
  piel: { hebrew: 'פִּעֵל', meaning: 'Intensive active', voice: 'active', intensity: 'intensive' },
  pual: { hebrew: 'פֻּעַל', meaning: 'Intensive passive', voice: 'passive', intensity: 'intensive' },
  hiphil: { hebrew: 'הִפְעִיל', meaning: 'Causative active', voice: 'active', intensity: 'causative' },
  hophal: { hebrew: 'הָפְעַל', meaning: 'Causative passive', voice: 'passive', intensity: 'causative' },
  hithpael: { hebrew: 'הִתְפַּעֵל', meaning: 'Reflexive/reciprocal', voice: 'reflexive', intensity: 'intensive' },

  // Aramaic Binyanim
  peal: { hebrew: 'פְּעַל', meaning: 'Simple active (Aramaic Qal)', voice: 'active', intensity: 'simple', isAramaic: true },
  pael: { hebrew: 'פַּעֵל', meaning: 'Intensive active (Aramaic Piel)', voice: 'active', intensity: 'intensive', isAramaic: true },
  aphel: { hebrew: 'אַפְעֵל', meaning: 'Causative active (Aramaic Hiphil)', voice: 'active', intensity: 'causative', isAramaic: true },
  ithpeel: { hebrew: 'אִתְפְּעֵל', meaning: 'Reflexive (Aramaic Niphal)', voice: 'passive', intensity: 'simple', isAramaic: true },
  ithpaal: { hebrew: 'אִתְפַּעַל', meaning: 'Intensive reflexive', voice: 'reflexive', intensity: 'intensive', isAramaic: true },
  shafel: { hebrew: 'שַׁפְעֵל', meaning: 'Causative (alternate)', voice: 'active', intensity: 'causative', isAramaic: true }
};

/**
 * Semantic Domains for scholarly categorization
 */
export const SEMANTIC_DOMAINS = {
  // Legal/Halachic
  legal: { label: 'Legal/Halachic', hebrew: 'משפטי', color: '#8B4513' },
  ritual: { label: 'Ritual/Cultic', hebrew: 'פולחני', color: '#9932CC' },
  purity: { label: 'Purity/Impurity', hebrew: 'טהרה/טומאה', color: '#4169E1' },

  // Agricultural/Economic
  agricultural: { label: 'Agricultural', hebrew: 'חקלאי', color: '#228B22' },
  commercial: { label: 'Commercial/Trade', hebrew: 'מסחרי', color: '#DAA520' },

  // Social/Familial
  kinship: { label: 'Kinship/Family', hebrew: 'משפחתי', color: '#FF69B4' },
  social: { label: 'Social Relations', hebrew: 'חברתי', color: '#20B2AA' },

  // Religious/Theological
  divine: { label: 'Divine/Theological', hebrew: 'אלוהי', color: '#FFD700' },
  prayer: { label: 'Prayer/Worship', hebrew: 'תפילה', color: '#BA55D3' },

  // Physical/Material
  body: { label: 'Body/Anatomy', hebrew: 'גופני', color: '#CD853F' },
  nature: { label: 'Nature/Environment', hebrew: 'טבע', color: '#32CD32' },

  // Abstract/Cognitive
  emotion: { label: 'Emotion/Psychology', hebrew: 'רגשי', color: '#FF6347' },
  cognitive: { label: 'Cognitive/Mental', hebrew: 'קוגניטיבי', color: '#4682B4' },
  temporal: { label: 'Time/Temporal', hebrew: 'זמני', color: '#708090' },

  // Movement/Action
  motion: { label: 'Motion/Movement', hebrew: 'תנועה', color: '#00CED1' },
  speech: { label: 'Speech/Communication', hebrew: 'דיבור', color: '#FF7F50' },

  // Other scholarly domains
  military: { label: 'Military/Warfare', hebrew: 'צבאי', color: '#B22222' },
  wisdom: { label: 'Wisdom/Knowledge', hebrew: 'חכמה', color: '#9400D3' },
  eschatology: { label: 'Eschatological', hebrew: 'אסכטולוגי', color: '#2F4F4F' }
};

/**
 * Historical Language Layers
 */
export const HISTORICAL_LAYERS = {
  PROTO_SEMITIC: { code: 'PS', name: 'Proto-Semitic', period: 'pre-2000 BCE' },
  EARLY_BIBLICAL: { code: 'EBH', name: 'Early Biblical Hebrew', period: '1200-600 BCE' },
  LATE_BIBLICAL: { code: 'LBH', name: 'Late Biblical Hebrew', period: '600-200 BCE' },
  DEAD_SEA: { code: 'DSS', name: 'Dead Sea Scrolls Hebrew', period: '200 BCE - 70 CE' },
  MISHNAIC: { code: 'MH', name: 'Mishnaic Hebrew', period: '70-200 CE' },
  TALMUDIC_HEBREW: { code: 'TH', name: 'Talmudic Hebrew', period: '200-600 CE' },
  JEWISH_PALESTINIAN_ARAMAIC: { code: 'JPA', name: 'Jewish Palestinian Aramaic', period: '200 BCE - 400 CE' },
  JEWISH_BABYLONIAN_ARAMAIC: { code: 'JBA', name: 'Jewish Babylonian Aramaic', period: '200-700 CE' },
  TARGUMIC: { code: 'TG', name: 'Targumic Aramaic', period: '100-500 CE' }
};

/**
 * Cognate language families for etymology
 */
export const COGNATE_LANGUAGES = {
  akkadian: { name: 'Akkadian', script: 'cuneiform', period: '2500-500 BCE' },
  ugaritic: { name: 'Ugaritic', script: 'cuneiform', period: '1400-1200 BCE' },
  arabic: { name: 'Arabic', script: 'Arabic', period: '500 CE - present' },
  syriac: { name: 'Syriac', script: 'Syriac', period: '200 BCE - present' },
  ethiopic: { name: "Ge'ez/Ethiopic", script: "Ge'ez", period: '500 BCE - present' },
  phoenician: { name: 'Phoenician', script: 'Phoenician', period: '1050-150 BCE' },
  moabite: { name: 'Moabite', script: 'Phoenician', period: '900-600 BCE' }
};

// =============================================================================
// NORMALIZED RESULT SHAPE - PRO SCHOLAR VERSION
// =============================================================================

/**
 * Create a comprehensive normalized result object
 * @param {Object} overrides - Fields to override
 * @returns {Object} Normalized result with full scholarly metadata
 */
const createNormalizedResult = (overrides = {}) => ({
  // ─────────────────────────────────────────────────────────────────────────
  // CORE IDENTIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  word: null,
  cleanedWord: null,
  headword: null,

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSLATION
  // ─────────────────────────────────────────────────────────────────────────
  english: null,
  french: null,
  translation: null, // Aramaic compatibility alias

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE TRACKING (with tiering)
  // ─────────────────────────────────────────────────────────────────────────
  source: 'none',
  sourceTier: null, // 'gold', 'silver', 'bronze'
  sourceMetadata: null, // Full citation info
  sources: [], // All sources found
  matchValidation: null, // { isValid, similarity, reason }

  // ─────────────────────────────────────────────────────────────────────────
  // LANGUAGE & MORPHOLOGY
  // ─────────────────────────────────────────────────────────────────────────
  language: 'Hebrew',
  root: null,
  morphology: {
    partOfSpeech: null,
    gender: null,
    number: null,
    state: null, // absolute, construct
    person: null,
    tense: null
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-HYPOTHESIS ROOT EXTRACTION (PRO SCHOLAR)
  // ─────────────────────────────────────────────────────────────────────────
  rootHypotheses: [], // Array of { root, confidence, source, validated, weakType }
  bestHypothesis: null,
  hypothesisMetadata: {
    totalGenerated: 0,
    totalValidated: 0,
    validationMethod: 'dictionary-direct'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVATION CHAIN (scholarly breakdown for UI display)
  // ─────────────────────────────────────────────────────────────────────────
  derivationChain: null, // { originalWord, extractedRoot, rootSource, rootMeaning, pattern, patternEffect, conjugation, finalTranslation }

  // ─────────────────────────────────────────────────────────────────────────
  // WEAK VERB ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  weakVerb: null, // { type, code, transformation, paradigm }

  // ─────────────────────────────────────────────────────────────────────────
  // BINYAN ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  binyan: null, // { name, hebrew, meaning, voice, intensity }

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORICAL LAYER
  // ─────────────────────────────────────────────────────────────────────────
  historicalLayer: null, // { code, name, period, confidence }
  dialectMarkers: [],

  // ─────────────────────────────────────────────────────────────────────────
  // SEMANTIC FIELD
  // ─────────────────────────────────────────────────────────────────────────
  semanticField: null, // { domain, label, hebrew }
  secondaryFields: [],
  synonyms: [],
  antonyms: [],

  // ─────────────────────────────────────────────────────────────────────────
  // COGNATE LANGUAGES
  // ─────────────────────────────────────────────────────────────────────────
  cognates: [], // Array of { language, word, meaning, source }
  etymology: null, // Proto-Semitic reconstruction

  // ─────────────────────────────────────────────────────────────────────────
  // CORPUS FREQUENCY
  // ─────────────────────────────────────────────────────────────────────────
  frequency: {
    total: null,
    band: null, // 'very-high', 'high', 'medium', 'low', 'rare', 'hapax'
    percentile: null,
    distribution: {
      torah: null,
      prophets: null,
      writings: null,
      mishnah: null,
      talmud: null
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CROSS-REFERENCES
  // ─────────────────────────────────────────────────────────────────────────
  rootFamily: [], // Related words from same root
  crossReferences: [], // Links to related entries
  isHapaxLegomenon: false,

  // ─────────────────────────────────────────────────────────────────────────
  // LOOKUP METADATA
  // ─────────────────────────────────────────────────────────────────────────
  confidence: 0,
  offline: false,
  fromCache: false,
  lookupPath: null,

  // ─────────────────────────────────────────────────────────────────────────
  // PRO SCHOLAR V7: SCHOLARLY WORKFLOW ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────
  scholarlyWorkflow: null,        // Full step-by-step analysis from generateScholarlyExplanation
  matchType: 'EXACT',             // How the definition was found
  matchTypeInfo: null,            // Detailed match type metadata
  confidenceExplanation: null,    // Human-readable confidence breakdown
  sourceClassification: {         // Source type classification
    isAcademic: false,
    isLocal: false,
    reliabilityTier: null,
    reliabilityLevel: null
  },
  prefixesStripped: [],           // Array of { letter, meaning }
  suffixesStripped: [],           // Array of { suffix, meaning }

  // ─────────────────────────────────────────────────────────────────────────
  // VERSION METADATA
  // ─────────────────────────────────────────────────────────────────────────
  _meta: {
    version: '4.0-scholar-v7',
    timestamp: Date.now(),
    contextType: 'general',
    scholarFeatures: {
      multiHypothesis: false,
      sourceValidation: false,
      weakVerbAnalysis: false,
      historicalLayer: false,
      cognates: false,
      scholarlyWorkflow: false    // V7: Full workflow explanation
    }
  },

  // Apply overrides
  ...overrides
});

// =============================================================================
// TELEMETRY - Enhanced for Scholarly Features
// =============================================================================

const _telemetry = {
  // Basic metrics
  lookups: 0,
  cacheHits: 0,
  cacheMisses: 0,
  deduplicatedRequests: 0,

  // Parallel lookup wins
  parallelWins: { jastrow: 0, bdb: 0, sefaria: 0, cal: 0, scholarly: 0 },

  // Scholar features
  hypothesesGenerated: 0,
  hypothesesValidated: 0,
  weakVerbsDetected: 0,
  cognatesFound: 0,

  // Source tier distribution
  sourceTiers: { gold: 0, silver: 0, bronze: 0 },

  // Errors
  errors: [],
  lastError: null
};

/**
 * Log error with scholarly context
 */
const logError = (context, error, word = null, additionalInfo = {}) => {
  const errorEntry = {
    context,
    message: error?.message || String(error),
    word,
    ...additionalInfo,
    timestamp: Date.now()
  };

  _telemetry.errors.push(errorEntry);
  _telemetry.lastError = errorEntry;

  if (_telemetry.errors.length > 100) {
    _telemetry.errors.shift();
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[PRO-SCHOLAR:${context}]`, error?.message || error, word ? `(${word})` : '');
  }
};

/**
 * Get comprehensive telemetry data
 */
export const getTelemetry = () => {
  const totalLookups = _telemetry.lookups || 1;
  const totalCache = _telemetry.cacheHits + _telemetry.cacheMisses || 1;

  return {
    ..._telemetry,
    errorRate: ((_telemetry.errors.length / totalLookups) * 100).toFixed(2) + '%',
    cacheHitRate: ((_telemetry.cacheHits / totalCache) * 100).toFixed(1) + '%',
    hypothesisValidationRate: _telemetry.hypothesesGenerated > 0
      ? ((_telemetry.hypothesesValidated / _telemetry.hypothesesGenerated) * 100).toFixed(1) + '%'
      : 'N/A',
    averageSourceTier: calculateAverageSourceTier(),
    scholarlyFeatureUsage: {
      multiHypothesis: _telemetry.hypothesesGenerated,
      weakVerbAnalysis: _telemetry.weakVerbsDetected,
      cognateAnalysis: _telemetry.cognatesFound
    }
  };
};

const calculateAverageSourceTier = () => {
  const { gold, silver, bronze } = _telemetry.sourceTiers;
  const total = gold + silver + bronze;
  if (total === 0) return 'N/A';
  const score = (gold * 3 + silver * 2 + bronze * 1) / total;
  return score >= 2.5 ? 'gold' : score >= 1.5 ? 'silver' : 'bronze';
};

// =============================================================================
// REQUEST DEDUPLICATION
// =============================================================================

const _pendingRequests = new Map();
const PENDING_TTL = 15000;

const getOrCreatePendingRequest = (cacheKey, lookupFn) => {
  const pending = _pendingRequests.get(cacheKey);
  if (pending && (Date.now() - pending.startTime) < PENDING_TTL) {
    _telemetry.deduplicatedRequests++;
    return pending.promise;
  }

  const promise = lookupFn();
  _pendingRequests.set(cacheKey, { promise, startTime: Date.now() });
  promise.finally(() => _pendingRequests.delete(cacheKey));

  return promise;
};

// Cleanup stale requests - with proper interval management
let _cleanupIntervalId = null;

const startPendingRequestCleanup = () => {
  if (_cleanupIntervalId) return; // Already running

  _cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of _pendingRequests.entries()) {
      if (now - entry.startTime > PENDING_TTL) {
        _pendingRequests.delete(key);
      }
    }
    // Auto-stop cleanup if no pending requests
    if (_pendingRequests.size === 0 && _cleanupIntervalId) {
      clearInterval(_cleanupIntervalId);
      _cleanupIntervalId = null;
    }
  }, 30000);
};

// Start cleanup only when there are pending requests
const getOrCreatePendingRequestWithCleanup = (cacheKey, lookupFn) => {
  const result = getOrCreatePendingRequest(cacheKey, lookupFn);
  if (_pendingRequests.size > 0 && !_cleanupIntervalId) {
    startPendingRequestCleanup();
  }
  return result;
};

// Cleanup on module unload (for hot reloading)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_cleanupIntervalId) {
      clearInterval(_cleanupIntervalId);
      _cleanupIntervalId = null;
    }
  });
}

// =============================================================================
// UNIFIED CACHE
// =============================================================================

const _lookupCache = createManagedCache('wordLookup', {
  maxSize: 1000, // Increased for scholarly depth
  ttl: 10 * 60 * 1000 // 10 minutes for richer data
});

const getCacheKey = (word, options = {}) => {
  const { contextType = 'general', scholarDepth = 'full' } = options;
  return `v4:${word}:${contextType}:${scholarDepth}`;
};

// =============================================================================
// LAZY SERVICE LOADING
// =============================================================================

let _servicesCache = null;
let _scholarServicesCache = null;

const getCoreServices = () => {
  if (_servicesCache) return _servicesCache;

  try {
    const hebrewUtils = require('../utils/hebrewUtils');
    const combinedService = require('./combinedTranslationService');
    const scholarlyService = require('./scholarlyLexiconService');
    const smartDataService = require('./smartDataService');
    const preClassService = require('./preClassificationService');
    const grammarService = require('./grammarAnalysisService');

    // Try to load CAL dictionary service for Aramaic
    let calService = null;
    try {
      calService = require('./calDictionaryService');
    } catch {
      // CAL service is optional
    }

    _servicesCache = {
      cleanHebrewWord: hebrewUtils.cleanHebrewWord,
      stripVowels: hebrewUtils.stripVowels || ((w) => w?.replace(/[\u05B0-\u05C7]/g, '')),
      lookupWordSync: combinedService.lookupWordSync,
      scholarlyLookup: scholarlyService.scholarlyLookup,
      lookupJastrow: scholarlyService.lookupJastrow,
      lookupBDB: scholarlyService.lookupBDB || scholarlyService.lookupWordSefaria,
      lookupWordSefaria: scholarlyService.lookupWordSefaria,
      // CAL - Comprehensive Aramaic Lexicon (gold tier for Aramaic)
      lookupCAL: calService?.lookupAramaicWord || (async () => null),
      smartLookup: smartDataService.smartLookup,
      getConnectivityStatus: smartDataService.getConnectivityStatus,
      preClassify: preClassService.preClassify,
      getContextFromReference: preClassService.getContextFromReference,
      analyzeWord: grammarService.analyzeWord,
      GRAMMAR_CONSTANTS: grammarService.GRAMMAR_CONSTANTS
    };
  } catch (e) {
    logError('getCoreServices', e);
    _servicesCache = {
      cleanHebrewWord: (w) => w?.replace(/[^\u0590-\u05FF]/g, ''),
      stripVowels: (w) => w?.replace(/[\u05B0-\u05C7]/g, ''),
      lookupWordSync: () => null,
      scholarlyLookup: async () => null,
      lookupJastrow: async () => null,
      lookupBDB: async () => null,
      lookupWordSefaria: async () => null,
      lookupCAL: async () => null,
      smartLookup: async () => null,
      getConnectivityStatus: () => ({ isOnline: false }),
      preClassify: () => null,
      getContextFromReference: () => 'general',
      analyzeWord: () => null,
      GRAMMAR_CONSTANTS: { PREFIXES: {}, SUFFIXES: {} }
    };
  }

  return _servicesCache;
};

const getScholarServices = async () => {
  if (_scholarServicesCache) return _scholarServicesCache;

  try {
    const [unifiedRoot, frenchService, wordFreq, semanticField] = await Promise.all([
      import('./unifiedRootService'),
      import('./englishToFrenchService'),
      import('./wordFrequencyService').catch(() => ({ getWordFrequency: () => null })),
      import('./semanticFieldService').catch(() => ({ getWordSemantics: () => null }))
    ]);

    _scholarServicesCache = {
      extractRootsEnhanced: unifiedRoot.extractRootsEnhanced || unifiedRoot.default?.extractRootsEnhanced,
      extractRootsWithDirectValidation: unifiedRoot.extractRootsWithDirectValidation || unifiedRoot.default?.extractRootsWithDirectValidation,
      generateHypotheses: unifiedRoot.generateHypotheses || (() => []),
      analyzeBinyan: unifiedRoot.analyzeBinyan || (() => null),
      detectDialect: unifiedRoot.detectDialect || (() => ({ dialect: 'unknown' })),
      getSemanticField: semanticField.getWordSemantics || semanticField.default?.getWordSemantics || (() => null),
      getSynonyms: semanticField.getSynonyms || (() => []),
      getAntonyms: semanticField.getAntonyms || (() => []),
      getWordFrequency: wordFreq.getWordFrequency || wordFreq.default?.getWordFrequency || (() => null),
      translateEnglishToFrench: frenchService.translateEnglishToFrench || frenchService.default,
      hasScholarFeatures: true
    };
  } catch (e) {
    logError('getScholarServices', e);
    _scholarServicesCache = {
      extractRootsEnhanced: () => null,
      extractRootsWithDirectValidation: () => ({ allMatches: [] }),
      generateHypotheses: () => [],
      analyzeBinyan: () => null,
      detectDialect: () => ({ dialect: 'unknown' }),
      getSemanticField: () => null,
      getSynonyms: () => [],
      getAntonyms: () => [],
      getWordFrequency: () => null,
      translateEnglishToFrench: async () => null,
      hasScholarFeatures: false
    };
  }

  return _scholarServicesCache;
};

// =============================================================================
// DICTIONARY MATCH VALIDATION
// =============================================================================

const calculateHeadwordSimilarity = (query, headword) => {
  if (!query || !headword) return 1;

  const stripVowels = (s) => s?.replace(/[\u05B0-\u05C7]/g, '') || '';
  const q = stripVowels(query);
  const h = stripVowels(headword);

  if (q === h) return 1;

  if (q.includes(h) || h.includes(q)) {
    return Math.min(q.length, h.length) / Math.max(q.length, h.length);
  }

  const lcs = (a, b) => {
    const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        m[j][i] = a[i - 1] === b[j - 1] ? m[j - 1][i - 1] + 1 : Math.max(m[j][i - 1], m[j - 1][i]);
      }
    }
    return m[b.length][a.length];
  };

  return lcs(q, h) / Math.max(q.length, h.length);
};

const validateDictionaryMatch = (query, result) => {
  if (!result) return { isValid: false, similarity: 0, reason: 'no-result' };

  const headword = result.headword || result.matchedForm;
  if (!headword) return { isValid: true, similarity: 1, reason: 'no-headword-to-validate' };

  const similarity = calculateHeadwordSimilarity(query, headword);
  const threshold = 0.65;

  if (similarity >= threshold) {
    return { isValid: true, similarity, reason: similarity === 1 ? 'exact-match' : 'acceptable-match' };
  }

  return {
    isValid: false,
    similarity,
    reason: 'headword-mismatch',
    details: `Query "${query}" ≠ headword "${headword}" (${(similarity * 100).toFixed(0)}%)`
  };
};

// =============================================================================
// MULTI-HYPOTHESIS ROOT EXTRACTION
// =============================================================================

const generateRootHypotheses = (word, services) => {
  const hypotheses = [];
  const seen = new Set();

  const consonants = services.stripVowels(word);
  const len = consonants.length;

  const addHypothesis = (root, confidence, weakType = null, strippedPrefix = '', strippedSuffix = '') => {
    if (!root || root.length < 2 || root.length > 4 || seen.has(root)) return;
    seen.add(root);
    hypotheses.push({ root, confidence, weakType, strippedPrefix, strippedSuffix });
  };

  // Strategy 0: PRO SCHOLAR - Aphel Pe-Nun pattern detection
  // CRITICAL: תפיקו = ת + פיק + ו → Aphel of נפק (נ assimilated)
  // Pattern: ת + XיX + ו where the root is נ + first consonant + last consonant
  // Common verbs: נפק (go out), נתן (give), נפל (fall), נגע (touch), נטל (take)
  const aphelPeNunPatterns = [
    // תפיקו → נפק (Aphel 2mp imperative/jussive)
    { regex: /^ת([א-ת])י([א-ת])ו$/, conf: 92, suffix: 'ו', note: 'Aphel 2mp' },
    // תפיק → נפק (Aphel 3fs or 2ms)
    { regex: /^ת([א-ת])י([א-ת])$/, conf: 90, suffix: '', note: 'Aphel 3fs/2ms' },
    // מפיק → נפק (Aphel participle)
    { regex: /^מ([א-ת])י([א-ת])$/, conf: 88, suffix: '', note: 'Aphel participle' },
    // יפיק → נפק (Aphel 3ms imperfect)
    { regex: /^י([א-ת])י([א-ת])$/, conf: 88, suffix: '', note: 'Aphel 3ms' },
    // אפיק → נפק (Aphel 1cs)
    { regex: /^א([א-ת])י([א-ת])$/, conf: 88, suffix: '', note: 'Aphel 1cs' },
    // נפיק → נפק (Aphel 1cp)
    { regex: /^נ([א-ת])י([א-ת])$/, conf: 88, suffix: '', note: 'Aphel 1cp' },
    // תפיקי → נפק (Aphel 2fs)
    { regex: /^ת([א-ת])י([א-ת])י$/, conf: 90, suffix: 'י', note: 'Aphel 2fs' },
    // יפיקו → נפק (Aphel 3mp)
    { regex: /^י([א-ת])י([א-ת])ו$/, conf: 90, suffix: 'ו', note: 'Aphel 3mp' },
    // תפיקון → נפק (Aphel 2mp/3fp with final nun)
    { regex: /^ת([א-ת])י([א-ת])ון$/, conf: 90, suffix: 'ון', note: 'Aphel 2mp/3fp' },
  ];

  for (const { regex, conf, suffix } of aphelPeNunPatterns) {
    const match = consonants.match(regex);
    if (match) {
      // Reconstruct the Pe-Nun root: נ + first captured consonant + second captured consonant
      const root = 'נ' + match[1] + match[2];
      addHypothesis(root, conf, 'פ״נ', 'ת', suffix);
      // Also add the non-reconstructed form with lower confidence as fallback
      addHypothesis(match[1] + 'י' + match[2], conf - 15, null, 'ת', suffix);
    }
  }

  // Strategy 1: Direct 3-letter root
  if (len === 3) addHypothesis(consonants, 95);

  // Strategy 2: Prefix stripping
  const prefixes = ['ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש', 'נ', 'י', 'ת', 'א'];
  const multiPrefixes = ['הת', 'וה', 'ומ', 'שה', 'לה', 'בה', 'כש', 'מה', 'נת', 'ית'];

  for (const p of prefixes) {
    if (consonants.startsWith(p) && consonants.length - p.length >= 2) {
      const stripped = consonants.slice(p.length);
      if (stripped.length === 3) addHypothesis(stripped, 85, null, p);
      else if (stripped.length === 2) {
        addHypothesis('נ' + stripped, 75, 'פ״נ', p);
        addHypothesis('י' + stripped, 75, 'פ״י', p);
        addHypothesis(stripped + 'ה', 70, 'ל״ה', p);
      }
    }
  }

  for (const p of multiPrefixes) {
    if (consonants.startsWith(p) && consonants.length - p.length >= 2) {
      const stripped = consonants.slice(p.length);
      if (stripped.length === 3) addHypothesis(stripped, 80, null, p);
      else if (stripped.length === 2) {
        addHypothesis('נ' + stripped, 70, 'פ״נ', p);
        addHypothesis('י' + stripped, 70, 'פ״י', p);
      }
    }
  }

  // Strategy 3: Suffix stripping
  const suffixes = ['ה', 'ו', 'י', 'ך', 'ם', 'ן', 'ת', 'ים', 'ות', 'ין', 'תם', 'תן', 'נו', 'הם', 'הן'];

  for (const s of suffixes) {
    if (consonants.endsWith(s) && consonants.length - s.length >= 2) {
      const stripped = consonants.slice(0, -s.length);
      if (stripped.length === 3) addHypothesis(stripped, 85, null, '', s);
      else if (stripped.length === 2) {
        addHypothesis(stripped + 'ה', 75, 'ל״ה', '', s);
        addHypothesis(stripped + 'א', 70, 'ל״א', '', s);
        addHypothesis(stripped[0] + 'ו' + stripped[1], 70, 'ע״ו', '', s);
        addHypothesis(stripped[0] + 'י' + stripped[1], 65, 'ע״י', '', s);
      }
    }
  }

  // Strategy 4: Geminate detection
  if (len >= 2 && consonants[len - 1] === consonants[len - 2]) {
    addHypothesis(consonants.slice(0, -1), 75, 'ע״ע');
  }

  // Strategy 5: Hollow verb reconstruction
  if (len === 2) {
    addHypothesis(consonants[0] + 'ו' + consonants[1], 70, 'ע״ו');
    addHypothesis(consonants[0] + 'י' + consonants[1], 65, 'ע״י');
    addHypothesis('נ' + consonants, 65, 'פ״נ');
    addHypothesis('י' + consonants, 60, 'פ״י');
    addHypothesis(consonants + 'ה', 60, 'ל״ה');
  }

  // Strategy 6: Combined prefix+suffix
  for (const p of prefixes) {
    for (const s of suffixes.slice(0, 10)) {
      if (consonants.startsWith(p) && consonants.endsWith(s)) {
        const core = consonants.slice(p.length, -s.length);
        if (core.length === 3) addHypothesis(core, 80, null, p, s);
        else if (core.length === 2) {
          addHypothesis('נ' + core, 65, 'פ״נ', p, s);
          addHypothesis(core[0] + 'ו' + core[1], 60, 'ע״ו', p, s);
        }
      }
    }
  }

  hypotheses.sort((a, b) => b.confidence - a.confidence);
  return hypotheses.slice(0, 8);
};

/**
 * Validate root hypotheses against dictionaries in parallel
 * Uses Promise.allSettled for resilience - partial failures don't block results
 */
const validateHypothesesWithDictionary = async (hypotheses, services) => {
  // Process all hypotheses in parallel for speed
  const validationPromises = hypotheses.map(async (hyp) => {
    try {
      // Try Jastrow and Sefaria in parallel for each hypothesis
      const [jastrow, sefaria] = await Promise.all([
        services.lookupJastrow(hyp.root).catch(() => null),
        services.lookupWordSefaria(hyp.root).catch(() => null)
      ]);

      // Prefer Jastrow (gold tier)
      if (jastrow?.shortDefinition) {
        _telemetry.hypothesesValidated++;
        return {
          ...hyp,
          validated: true,
          source: 'jastrow',
          sourceTier: 'gold',
          definition: jastrow.shortDefinition,
          headword: jastrow.headword || hyp.root
        };
      }

      // Fall back to Sefaria (bronze tier)
      if (sefaria?.shortDefinition) {
        _telemetry.hypothesesValidated++;
        return {
          ...hyp,
          validated: true,
          source: 'sefaria',
          sourceTier: 'bronze',
          definition: sefaria.shortDefinition,
          headword: sefaria.headword || hyp.root
        };
      }

      // No dictionary match found
      return { ...hyp, validated: false, confidence: hyp.confidence * 0.6 };
    } catch {
      return { ...hyp, validated: false, confidence: hyp.confidence * 0.5 };
    }
  });

  // Wait for all validations with timeout
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve(hypotheses.map(h => ({ ...h, validated: false, confidence: h.confidence * 0.4 }))), 5000)
  );

  const validated = await Promise.race([
    Promise.all(validationPromises),
    timeoutPromise
  ]);

  // Sort: validated first, then by confidence
  validated.sort((a, b) => {
    if (a.validated && !b.validated) return -1;
    if (!a.validated && b.validated) return 1;
    return b.confidence - a.confidence;
  });

  return validated;
};

// =============================================================================
// WEAK VERB ANALYSIS
// =============================================================================

const analyzeWeakVerb = (root) => {
  if (!root || root.length !== 3) return null;

  const [r1, r2, r3] = root.split('');
  const weakTypes = [];

  if (r1 === 'נ') weakTypes.push(WEAK_VERB_TYPES.PE_NUN);
  if (r1 === 'י') weakTypes.push(WEAK_VERB_TYPES.PE_YOD);
  if (r1 === 'א') weakTypes.push(WEAK_VERB_TYPES.PE_ALEPH);
  if (r2 === 'ו' || r2 === 'י') weakTypes.push(WEAK_VERB_TYPES.AYIN_VAV_YOD);
  if (r2 === r3) weakTypes.push(WEAK_VERB_TYPES.AYIN_AYIN);
  if (r3 === 'ה') weakTypes.push(WEAK_VERB_TYPES.LAMED_HE);
  if (r3 === 'א') weakTypes.push(WEAK_VERB_TYPES.LAMED_ALEPH);

  if (weakTypes.length >= 2) {
    return { types: weakTypes, primary: WEAK_VERB_TYPES.DOUBLY_WEAK, isDoublyWeak: true };
  }

  if (weakTypes.length === 1) {
    return { types: weakTypes, primary: weakTypes[0], isDoublyWeak: false };
  }

  return null;
};

// =============================================================================
// DERIVATION CHAIN
// =============================================================================

/**
 * Build a derivation chain object for display in WordDefinitionCard
 * Returns an object with named properties that the UI expects:
 * - originalWord, extractedRoot, rootSource, rootMeaning, pattern, patternEffect, conjugation, finalTranslation
 *
 * @param {string} word - The original word
 * @param {Object} result - The lookup result with root, english, source, etc.
 * @param {Object} services - Service functions (stripVowels, GRAMMAR_CONSTANTS)
 * @returns {Object} Derivation chain object for UI display
 */
const buildDerivationChain = (word, result, services) => {
  let current = word;
  let strippedPrefix = null;
  let strippedSuffix = null;

  // Strip vowels
  const noVowels = services.stripVowels?.(current) || current;
  if (noVowels !== current) {
    current = noVowels;
  }

  // Check for prefix
  for (const p of ['הת', 'וה', 'מה', 'שה', 'לה', 'בה', 'כש', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש', 'נ', 'י', 'ת', 'א']) {
    if (current.startsWith(p) && current.length - p.length >= 2) {
      strippedPrefix = p;
      current = current.slice(p.length);
      break;
    }
  }

  // Check for suffix
  for (const s of ['תם', 'תן', 'נו', 'הם', 'הן', 'ים', 'ות', 'ין', 'ה', 'ו', 'י', 'ך', 'ם', 'ן', 'ת']) {
    if (current.endsWith(s) && current.length - s.length >= 2) {
      strippedSuffix = s;
      current = current.slice(0, -s.length);
      break;
    }
  }

  // Reconstruct root for weak verbs
  let reconstructedRoot = current;
  let weakVerbType = null;
  let weakVerbNote = null;

  // Check if we already have weak verb info from hypothesis validation
  if (result.bestHypothesis?.weakType) {
    weakVerbType = result.bestHypothesis.weakType;
    reconstructedRoot = result.bestHypothesis.root || current;
    weakVerbNote = `${weakVerbType} - root reconstructed`;
  } else if (current.length === 2 && result.weakVerb?.primary) {
    const wv = result.weakVerb.primary;
    weakVerbType = wv.code;
    if (wv.code === 'פ״נ') {
      reconstructedRoot = 'נ' + current;
      weakVerbNote = 'Pe-Nun: נ assimilated';
    } else if (wv.code === 'פ״י') {
      reconstructedRoot = 'י' + current;
      weakVerbNote = 'Pe-Yod: י dropped';
    } else if (wv.code === 'ע״ו' || wv.code === 'ע״ו/ע״י') {
      reconstructedRoot = current[0] + 'ו' + current[1];
      weakVerbNote = 'Hollow verb: middle letter restored';
    } else if (wv.code === 'ל״ה') {
      reconstructedRoot = current + 'ה';
      weakVerbNote = 'Lamed-He: final ה restored';
    }
  }

  // PRO SCHOLAR: Check for Pe-Nun pattern in 3-letter stems (e.g., פיק → נפק)
  // This catches cases where the stem looks like XיX from an Aphel of נ-root
  if (!weakVerbType && current.length === 3 && current[1] === 'י') {
    // Possible Pe-Nun Aphel stem: first consonant + י + last consonant
    // Check if נ + first + last is a known root
    const potentialRoot = 'נ' + current[0] + current[2];
    // Common Pe-Nun roots
    const knownPeNunRoots = ['נפק', 'נתן', 'נפל', 'נגע', 'נטל', 'נצל', 'נכס', 'נשק', 'נגד', 'נסע'];
    if (knownPeNunRoots.includes(potentialRoot)) {
      weakVerbType = 'פ״נ';
      reconstructedRoot = potentialRoot;
      weakVerbNote = 'Pe-Nun: נ assimilated in Aphel/Hiphil';
    }
  }

  const finalRoot = result.root || reconstructedRoot;

  // Determine root source label
  let rootSource = 'Analysis';
  if (result.source === 'jastrow') rootSource = 'Jastrow';
  else if (result.source === 'bdb') rootSource = 'BDB';
  else if (result.source === 'strong' || result.source === 'strongs') rootSource = "Strong's";
  else if (result.source === 'cal') rootSource = 'CAL';
  else if (result.source === 'sefaria') rootSource = 'Sefaria';
  else if (result.source === 'local') rootSource = 'Local';
  else if (result.sourceTier === 'gold') rootSource = result.source?.charAt(0).toUpperCase() + result.source?.slice(1) || 'Dictionary';

  // Determine pattern (binyan) info
  let pattern = null;
  let patternEffect = null;
  if (result.morphology?.binyan) {
    pattern = result.morphology.binyan;
    patternEffect = result.morphology.binyanInfo?.meaning || null;
  } else if (result.morphologyInfo?.pattern) {
    pattern = result.morphologyInfo.pattern;
    patternEffect = result.morphologyInfo.patternMeaning || null;
  }

  // Determine conjugation info
  let conjugation = null;
  if (result.morphology?.formDescription) {
    conjugation = result.morphology.formDescription;
  } else if (result.morphologyInfo?.conjugation) {
    conjugation = result.morphologyInfo.conjugation;
  }

  // Build the derivation chain object matching UI expectations
  return {
    originalWord: word,
    extractedRoot: finalRoot || null,
    rootSource: rootSource,
    rootMeaning: result.english || null,
    pattern: pattern,
    patternEffect: patternEffect,
    conjugation: conjugation,
    finalTranslation: result.english || result.translation || null,
    // PRO SCHOLAR: Additional scholarly data for transparency
    strippedPrefix,
    strippedSuffix,
    weakVerbType,
    weakVerbNote,  // Explanation of weak verb transformation
    stem: current,
    // Confidence and validation info
    confidence: result.confidence || (result.bestHypothesis?.confidence) || null,
    validated: result.bestHypothesis?.validated || false,
    consensusSources: result.consensusSources || null  // Sources that agree on the root
  };
};

// =============================================================================
// PRO SCHOLAR V7: SCHOLARLY WORKFLOW GENERATOR
// =============================================================================

/**
 * Apply V7 scholarly workflow analysis to a result
 * Generates step-by-step explanation of how the word was analyzed
 *
 * @param {Object} result - The lookup result
 * @param {string} word - Original word
 * @param {Object} options - Context options
 * @returns {Object} Enhanced result with scholarly workflow
 */
const applyScholarlyWorkflow = (result, word, options = {}) => {
  if (!result) return result;

  try {
    // Determine match type from lookup path and characteristics
    let matchType = 'EXACT';
    const prefixesStripped = [];
    const suffixesStripped = [];

    if (result.lookupPath?.includes('hypothesis') || result.bestHypothesis?.validated) {
      matchType = 'ROOT_DERIVED';
    } else if (result.derivationChain?.strippedPrefix) {
      matchType = 'PREFIX_STRIPPED';
      const prefixInfo = result.derivationChain.strippedPrefix;
      prefixesStripped.push({
        letter: prefixInfo,
        meaning: getPrefixMeaning(prefixInfo)
      });
    } else if (result.derivationChain?.strippedSuffix) {
      matchType = 'SUFFIX_STRIPPED';
      suffixesStripped.push({
        suffix: result.derivationChain.strippedSuffix,
        meaning: getSuffixMeaning(result.derivationChain.strippedSuffix)
      });
    } else if (result.binyan) {
      matchType = 'BINYAN';
    } else if (result.weakVerb) {
      matchType = 'MORPHOLOGICAL';
    }

    // Get match type info
    const matchTypeInfo = getMatchTypeInfo(matchType);
    result.matchType = matchType;
    result.matchTypeInfo = matchTypeInfo;
    result.prefixesStripped = prefixesStripped;
    result.suffixesStripped = suffixesStripped;

    // Calculate and explain confidence
    const sourceConfidence = calculateSourceConfidence(result.source, matchType);
    result.confidenceExplanation = explainConfidence(
      result.confidence || sourceConfidence.score,
      result.source,
      matchType
    );

    // Classify source
    const sourceInfo = getSourceInfo(result.source);
    const reliability = getSourceReliability(result.source);

    result.sourceClassification = {
      isAcademic: isAcademicLexicon(result.source),
      isLocal: isLocalSource(result.source),
      reliabilityTier: reliability?.label || 'Unknown',
      reliabilityLevel: reliability?.level || 5,
      reliabilityIcon: reliability?.icon || '📑',
      sourceType: sourceInfo?.type || 'unknown'
    };

    // Generate full scholarly workflow explanation
    result.scholarlyWorkflow = generateScholarlyExplanation({
      word: word,
      root: result.root,
      definition: result.english || result.translation,
      source: result.source,
      matchType: matchType,
      prefixes: prefixesStripped,
      suffixes: suffixesStripped,
      binyan: result.binyan,
      confidence: result.confidence
    });

    result._meta.scholarFeatures.scholarlyWorkflow = true;

  } catch (e) {
    logError('applyScholarlyWorkflow', e, word);
  }

  return result;
};

/**
 * Get prefix meaning for scholarly display
 */
const getPrefixMeaning = (prefix) => {
  const meanings = {
    'ה': 'the (definite article)',
    'ו': 'and/or (conjunction)',
    'ב': 'in/with (preposition)',
    'כ': 'as/like (comparative)',
    'ל': 'to/for (dative)',
    'מ': 'from (ablative)',
    'ש': 'that/which (relative)',
    'הת': 'reflexive (Hitpael)',
    'נ': 'passive marker',
    'י': 'imperfect prefix (3ms/3fp)',
    'ת': 'imperfect prefix (2ms/3fs)',
    'א': 'imperfect prefix (1cs)',
    'מה': 'the + from',
    'שה': 'that + the',
    'לה': 'to + the',
    'בה': 'in + the',
    'כש': 'when/as (temporal)',
    'וה': 'and + the'
  };
  return meanings[prefix] || 'grammatical prefix';
};

/**
 * Get suffix meaning for scholarly display
 */
const getSuffixMeaning = (suffix) => {
  const meanings = {
    'ה': 'her/it (3fs) or directional',
    'ו': 'his/him (3ms)',
    'י': 'my (1cs)',
    'ך': 'your (2ms)',
    'ם': 'them (3mp)',
    'ן': 'them (3fp)',
    'ת': 'you (2fs) or construct',
    'ים': 'masculine plural',
    'ות': 'feminine plural',
    'ין': 'Aramaic masculine plural',
    'תם': 'you all (2mp)',
    'תן': 'you all (2fp)',
    'נו': 'us/our (1cp)',
    'הם': 'them/their (3mp)',
    'הן': 'them/their (3fp)'
  };
  return meanings[suffix] || 'grammatical suffix';
};

// =============================================================================
// HISTORICAL LAYER DETECTION
// =============================================================================

const detectHistoricalLayer = (word, result, contextType) => {
  const markers = [];
  let layer = HISTORICAL_LAYERS.MISHNAIC;
  let confidence = 50;

  if (contextType === 'biblical' || contextType === 'torah') {
    layer = HISTORICAL_LAYERS.EARLY_BIBLICAL;
    confidence = 70;
    markers.push('biblical-context');
  } else if (contextType === 'talmudic') {
    if (result.language === 'Aramaic') {
      layer = HISTORICAL_LAYERS.JEWISH_BABYLONIAN_ARAMAIC;
      confidence = 80;
      markers.push('aramaic-detected');
    } else {
      layer = HISTORICAL_LAYERS.TALMUDIC_HEBREW;
      confidence = 70;
      markers.push('talmudic-context');
    }
  }

  if (result.source === 'jastrow' && result.language === 'Aramaic') {
    layer = HISTORICAL_LAYERS.JEWISH_BABYLONIAN_ARAMAIC;
    confidence = Math.max(confidence, 85);
    markers.push('jastrow-aramaic');
  } else if (result.source === 'bdb') {
    layer = HISTORICAL_LAYERS.EARLY_BIBLICAL;
    confidence = Math.max(confidence, 80);
    markers.push('bdb-biblical');
  }

  const aramaicIndicators = ['א', 'ין', 'תא', 'ותא'];
  for (const ind of aramaicIndicators) {
    if (word.endsWith(ind)) {
      layer = HISTORICAL_LAYERS.JEWISH_BABYLONIAN_ARAMAIC;
      confidence = Math.max(confidence, 75);
      markers.push(`aramaic-ending-${ind}`);
      break;
    }
  }

  return { layer, code: layer.code, name: layer.name, period: layer.period, confidence, markers };
};

// =============================================================================
// PARALLEL DICTIONARY LOOKUP
// =============================================================================

/**
 * Race-based parallel dictionary lookup with early termination
 * Returns as soon as a gold-tier result is found, or best available after timeout
 */
const parallelDictionaryLookup = async (word, services, options = {}) => {
  const { contextType = 'general' } = options;
  const isAramaic = contextType === 'talmudic';
  const tierRank = { gold: 3, silver: 2, bronze: 1, mixed: 2, none: 0 };

  // Build lookup tasks with source metadata
  const tasks = [];

  // Scholarly lookup (mixed tier - aggregates multiple sources)
  tasks.push({
    name: 'scholarly',
    tier: 'mixed',
    promise: services.scholarlyLookup(word)
      .then(r => r?.primaryDefinition ? { result: r, source: 'scholarly' } : null)
      .catch(() => null)
  });

  // Jastrow - GOLD tier for Aramaic
  if (isAramaic) {
    tasks.push({
      name: 'jastrow',
      tier: 'gold',
      promise: services.lookupJastrow(word)
        .then(r => r?.shortDefinition ? { result: r, source: 'jastrow' } : null)
        .catch(() => null)
    });

    // CAL - GOLD tier for Aramaic (Comprehensive Aramaic Lexicon)
    if (services.lookupCAL) {
      tasks.push({
        name: 'cal',
        tier: 'gold',
        promise: services.lookupCAL(word)
          .then(r => {
            if (r?.definitions?.[0]?.meaning) {
              return {
                result: {
                  shortDefinition: r.definitions[0].meaning,
                  headword: r.headword || r.lemma,
                  source: 'cal',
                  dialects: r.dialects,
                  partOfSpeech: r.partOfSpeech
                },
                source: 'cal'
              };
            }
            return null;
          })
          .catch(() => null)
      });
    }
  }

  // BDB - GOLD tier for Biblical Hebrew
  if (!isAramaic && services.lookupBDB) {
    tasks.push({
      name: 'bdb',
      tier: 'gold',
      promise: services.lookupBDB(word)
        .then(r => r?.shortDefinition ? { result: r, source: 'bdb' } : null)
        .catch(() => null)
    });
  }

  // Sefaria - BRONZE tier fallback
  tasks.push({
    name: 'sefaria',
    tier: 'bronze',
    promise: services.lookupWordSefaria(word)
      .then(r => r?.shortDefinition ? { result: r, source: 'sefaria' } : null)
      .catch(() => null)
  });

  try {
    // Use Promise.race with early-termination strategy:
    // Return immediately if we get a gold-tier result, otherwise wait for all
    let bestResult = null;
    let bestTier = 'none';
    let resolved = 0;

    await new Promise((resolve) => {
      const allResults = new Array(tasks.length).fill(null);
      let goldFound = false;

      tasks.forEach((task, idx) => {
        task.promise.then(result => {
          if (goldFound) return; // Skip if we already have gold

          allResults[idx] = result;
          resolved++;

          if (result) {
            const currentTierRank = tierRank[task.tier] || 0;
            const bestTierRank = tierRank[bestTier] || 0;

            if (currentTierRank > bestTierRank) {
              bestResult = result;
              bestTier = task.tier;
              _telemetry.parallelWins[task.name] = (_telemetry.parallelWins[task.name] || 0) + 1;
            }

            // Early termination: if we got a gold result, resolve immediately
            if (task.tier === 'gold') {
              goldFound = true;
              resolve(allResults);
              return;
            }
          }

          // All tasks complete
          if (resolved === tasks.length) {
            resolve(allResults);
          }
        }).catch(() => {
          resolved++;
          if (resolved === tasks.length) {
            resolve(allResults);
          }
        });
      });

      // Timeout fallback - don't wait forever
      setTimeout(() => {
        if (!goldFound) {
          resolve(allResults);
        }
      }, 3000);
    });

    return bestResult;
  } catch (e) {
    logError('parallelDictionaryLookup', e, word);
    return null;
  }
};

// =============================================================================
// RESULT PROCESSING
// =============================================================================

const processScholarlyResult = (scholarlyResult, word, cleaned) => {
  const result = createNormalizedResult({
    word, cleanedWord: cleaned,
    english: scholarlyResult.primaryDefinition || null,
    language: scholarlyResult.language || 'Hebrew',
    root: scholarlyResult.root || null,
    lookupPath: 'dictionary-hit',
    confidence: 80
  });

  result.headword = scholarlyResult.sources?.jastrow?.headword || scholarlyResult.sources?.bdb?.headword || scholarlyResult.sources?.strong?.headword || cleaned;

  for (const [key, meta] of Object.entries(SOURCE_METADATA)) {
    const src = scholarlyResult.sources?.[key];
    if (src?.definitions?.length > 0) {
      result.sources.push({
        name: meta.shortName, fullName: meta.fullName, definition: src.definitions[0]?.text,
        strongNumber: src.strongNumber, tier: meta.tier, year: meta.year, citation: meta.citation
      });
      _telemetry.sourceTiers[meta.tier] = (_telemetry.sourceTiers[meta.tier] || 0) + 1;
      if (result.source === 'none') {
        result.source = key;
        result.sourceTier = meta.tier;
        result.sourceMetadata = meta;
      }
    }
  }

  if (result.source === 'jastrow' || result.source === 'steinsaltz') result.language = 'Aramaic';

  return result;
};

const processJastrowResult = (jastrowResult, word, cleaned) => {
  _telemetry.sourceTiers.gold = (_telemetry.sourceTiers.gold || 0) + 1;
  return createNormalizedResult({
    word, cleanedWord: cleaned, english: jastrowResult.shortDefinition, translation: jastrowResult.shortDefinition,
    source: 'jastrow', sourceTier: 'gold', sourceMetadata: SOURCE_METADATA.jastrow,
    sources: [{ name: 'Jastrow', fullName: SOURCE_METADATA.jastrow.fullName, definition: jastrowResult.shortDefinition, tier: 'gold', citation: SOURCE_METADATA.jastrow.citation }],
    language: 'Aramaic', headword: jastrowResult.headword, lookupPath: 'jastrow-direct', confidence: 90
  });
};

const processSefariaResult = (sefariaResult, word, cleaned) => {
  _telemetry.sourceTiers.bronze = (_telemetry.sourceTiers.bronze || 0) + 1;
  return createNormalizedResult({
    word, cleanedWord: cleaned, english: sefariaResult.shortDefinition, translation: sefariaResult.shortDefinition,
    source: 'sefaria', sourceTier: 'bronze', sourceMetadata: SOURCE_METADATA.sefaria,
    sources: [{ name: 'Sefaria', fullName: SOURCE_METADATA.sefaria.fullName, definition: sefariaResult.shortDefinition, tier: 'bronze' }],
    language: sefariaResult.language || 'Hebrew', headword: sefariaResult.headword, lookupPath: 'sefaria-direct', confidence: 70
  });
};

const processCALResult = (calResult, word, cleaned) => {
  _telemetry.sourceTiers.gold = (_telemetry.sourceTiers.gold || 0) + 1;
  return createNormalizedResult({
    word, cleanedWord: cleaned,
    english: calResult.shortDefinition,
    translation: calResult.shortDefinition,
    source: 'cal',
    sourceTier: 'gold',
    sourceMetadata: SOURCE_METADATA.cal,
    sources: [{
      name: 'CAL',
      fullName: SOURCE_METADATA.cal.fullName,
      definition: calResult.shortDefinition,
      tier: 'gold',
      citation: SOURCE_METADATA.cal.citation,
      dialects: calResult.dialects
    }],
    language: 'Aramaic',
    headword: calResult.headword,
    lookupPath: 'cal-direct',
    confidence: 90,
    morphology: {
      partOfSpeech: calResult.partOfSpeech || null,
      gender: null,
      number: null,
      state: null,
      person: null,
      tense: null
    }
  });
};

// =============================================================================
// SCHOLARLY ENHANCEMENT PIPELINE
// =============================================================================

const applyScholarlyEnhancements = async (result, word, services, scholarServices, options) => {
  const { contextType = 'general' } = options;

  // 1. Multi-hypothesis root extraction
  const hypotheses = generateRootHypotheses(word, services);
  _telemetry.hypothesesGenerated += hypotheses.length;

  if (hypotheses.length > 0) {
    const validatedHypotheses = await validateHypothesesWithDictionary(hypotheses, services);
    result.rootHypotheses = validatedHypotheses;
    result.bestHypothesis = validatedHypotheses[0] || null;
    result.hypothesisMetadata = {
      totalGenerated: hypotheses.length,
      totalValidated: validatedHypotheses.filter(h => h.validated).length,
      validationMethod: 'dictionary-direct'
    };
    result._meta.scholarFeatures.multiHypothesis = true;

    if (!result.root && result.bestHypothesis?.validated) {
      result.root = result.bestHypothesis.root;
      if (!result.english && result.bestHypothesis.definition) {
        result.english = result.bestHypothesis.definition;
        result.translation = result.bestHypothesis.definition;
      }
    }
  }

  // 1.5 PRO SCHOLAR V8: CONSENSUS SCORING
  // Cross-validate root across multiple dictionaries for higher confidence
  if (result.root || result.bestHypothesis?.root) {
    const rootToValidate = result.root || result.bestHypothesis?.root;
    const consensusResults = { sources: [], agreement: 0, confidence: 0 };

    try {
      // Check multiple sources in parallel for consensus
      const [jastrowCheck, bdbCheck, strongsCheck] = await Promise.allSettled([
        services.lookupJastrow?.(rootToValidate)?.catch(() => null),
        services.lookupBDB?.(rootToValidate)?.catch(() => null),
        services.lookupStrongs?.(rootToValidate)?.catch(() => null)
      ]);

      if (jastrowCheck.status === 'fulfilled' && jastrowCheck.value?.headword) {
        consensusResults.sources.push('Jastrow');
      }
      if (bdbCheck.status === 'fulfilled' && bdbCheck.value?.headword) {
        consensusResults.sources.push('BDB');
      }
      if (strongsCheck.status === 'fulfilled' && strongsCheck.value?.headword) {
        consensusResults.sources.push("Strong's");
      }

      consensusResults.agreement = consensusResults.sources.length;

      // Calculate consensus confidence boost
      if (consensusResults.agreement >= 3) {
        consensusResults.confidence = 95;
        result.confidence = Math.max(result.confidence || 0, 95);
      } else if (consensusResults.agreement === 2) {
        consensusResults.confidence = 85;
        result.confidence = Math.max(result.confidence || 0, 85);
      } else if (consensusResults.agreement === 1) {
        consensusResults.confidence = 75;
        result.confidence = Math.max(result.confidence || 0, 75);
      }

      result.consensusSources = consensusResults.sources;
      result.consensusScore = consensusResults;
      result._meta.scholarFeatures.consensusValidation = true;
    } catch {
      // Consensus validation is optional, don't fail the lookup
    }
  }

  // 2. Weak verb analysis
  if (result.root) {
    const weakAnalysis = analyzeWeakVerb(result.root);
    if (weakAnalysis) {
      result.weakVerb = weakAnalysis;
      _telemetry.weakVerbsDetected++;
      result._meta.scholarFeatures.weakVerbAnalysis = true;
    }
  }

  // 3. Binyan analysis
  if (scholarServices.analyzeBinyan) {
    const binyan = scholarServices.analyzeBinyan(word, { contextType });
    if (binyan) {
      const binyanInfo = BINYAN_INFO[binyan.name?.toLowerCase()] || BINYAN_INFO[binyan.key];
      if (binyanInfo) {
        result.binyan = {
          name: binyan.name, key: binyan.key || binyan.name?.toLowerCase(),
          hebrew: binyanInfo.hebrew, meaning: binyanInfo.meaning,
          voice: binyanInfo.voice, intensity: binyanInfo.intensity,
          isAramaic: binyanInfo.isAramaic || false
        };
      }
    }
  }

  // 4. Historical layer
  const historicalAnalysis = detectHistoricalLayer(word, result, contextType);
  result.historicalLayer = { code: historicalAnalysis.code, name: historicalAnalysis.name, period: historicalAnalysis.period, confidence: historicalAnalysis.confidence };
  result.dialectMarkers = historicalAnalysis.markers;
  result._meta.scholarFeatures.historicalLayer = true;

  // 5. Semantic field
  if (scholarServices.getSemanticField) {
    const semantics = scholarServices.getSemanticField(result.root || word);
    if (semantics) {
      const domainKey = semantics.primaryDomain || semantics.domain;
      const domainInfo = SEMANTIC_DOMAINS[domainKey];
      if (domainInfo) {
        result.semanticField = { domain: domainKey, label: domainInfo.label, hebrew: domainInfo.hebrew, color: domainInfo.color };
      }
      if (semantics.secondaryDomains) {
        result.secondaryFields = semantics.secondaryDomains.map(d => SEMANTIC_DOMAINS[d]).filter(Boolean).map(d => ({ label: d.label, hebrew: d.hebrew }));
      }
      result.synonyms = scholarServices.getSynonyms(word)?.slice(0, 5) || [];
      result.antonyms = scholarServices.getAntonyms(word)?.slice(0, 5) || [];
    }
  }

  // 6. Corpus frequency
  if (scholarServices.getWordFrequency) {
    const freq = scholarServices.getWordFrequency(result.root || word);
    if (freq) {
      result.frequency = {
        total: freq.count || freq.total, band: freq.band, percentile: freq.percentile,
        distribution: freq.distribution || { torah: null, prophets: null, writings: null, mishnah: null, talmud: null }
      };
      if (freq.count === 1 || freq.band === 'hapax') result.isHapaxLegomenon = true;
    }
  }

  // 7. Derivation chain
  result.derivationChain = buildDerivationChain(word, result, services);

  // 8. Dictionary match validation
  result.matchValidation = validateDictionaryMatch(word, result);
  result._meta.scholarFeatures.sourceValidation = true;

  // 8.5 PRO SCHOLAR V8: UNCERTAINTY WARNINGS
  // Flag low-confidence results and provide alternatives
  const effectiveConfidence = result.confidence || result.consensusScore?.confidence ||
    result.bestHypothesis?.confidence || 50;

  if (effectiveConfidence < 60) {
    result.uncertain = true;
    result.uncertaintyLevel = effectiveConfidence < 40 ? 'high' : 'moderate';
    result.uncertaintyWarning = effectiveConfidence < 40
      ? 'Multiple interpretations possible - verification recommended'
      : 'Root extraction has moderate uncertainty';

    // Provide alternative hypotheses for user consideration
    if (result.rootHypotheses && result.rootHypotheses.length > 1) {
      result.alternatives = result.rootHypotheses.slice(1, 4).map(h => ({
        root: h.root,
        confidence: h.confidence,
        weakType: h.weakType,
        definition: h.definition || null,
        source: h.source || null
      }));
    }
  } else if (effectiveConfidence >= 90) {
    result.highConfidence = true;
    result.confidenceLevel = 'high';
  } else if (effectiveConfidence >= 75) {
    result.confidenceLevel = 'good';
  } else {
    result.confidenceLevel = 'moderate';
  }

  result._meta.scholarFeatures.uncertaintyAnalysis = true;

  // 9. PRO SCHOLAR V7: Apply scholarly workflow explanation
  result = applyScholarlyWorkflow(result, word, options);

  return result;
};

// =============================================================================
// MAIN LOOKUP FUNCTION
// =============================================================================

export const lookupWord = async (word, options = {}) => {
  const { contextType = 'general', reference = null, useCache = true, scholarDepth = 'full' } = options;

  _telemetry.lookups++;

  const services = getCoreServices();
  const cleaned = services.cleanHebrewWord(word);

  if (!cleaned || cleaned.length < 2) {
    return createNormalizedResult({ word, cleanedWord: cleaned, lookupPath: 'too-short' });
  }

  const effectiveContext = reference ? services.getContextFromReference(reference) : contextType;
  const cacheKey = getCacheKey(cleaned, { contextType: effectiveContext, scholarDepth });

  if (useCache) {
    const cached = _lookupCache.get(cacheKey);
    if (cached) {
      _telemetry.cacheHits++;
      return { ...cached, fromCache: true };
    }
  }
  _telemetry.cacheMisses++;

  return getOrCreatePendingRequestWithCleanup(cacheKey, async () => {
    // PRO SCHOLAR V8: Pass ORIGINAL word to preClassify for daf reference detection
    // (צו:) needs the punctuation to be recognized as page 96b)
    const preClass = services.preClassify(word, { reference, textType: effectiveContext, cleaned });

    if (preClass?.skipLookup || preClass?.skipDictionary) {
      // PRO SCHOLAR V8: Include contextual note for technical terms
      const meaningWithContext = preClass.note
        ? `${preClass.meaning || preClass.english} — ${preClass.note}`
        : (preClass.meaning || preClass.english);

      const result = createNormalizedResult({
        word, cleanedWord: cleaned,
        english: meaningWithContext,
        translation: meaningWithContext,
        root: preClass.root,
        source: preClass.type === 'abbreviation' ? 'abbreviation' :
                preClass.type === 'technical_term' ? `Talmudic (${preClass.context || 'technical'})` : 'pre-classification',
        confidence: preClass.confidence || 95,
        lookupPath: `pre-classification:${preClass.type}`,
        // Include the scholarly note and context directly
        contextNote: preClass.note,
        termContext: preClass.context,
        _meta: { version: '4.0-scholar', timestamp: Date.now(), contextType: effectiveContext, preClassified: true, scholarFeatures: {} }
      });
      // PRO SCHOLAR V8: Build derivation chain for pre-classified results too
      // Include weak verb info if available from preClass
      if (preClass.weakVerb) {
        result.bestHypothesis = { root: preClass.root, weakType: preClass.weakVerb, confidence: preClass.confidence };
      }
      result.derivationChain = buildDerivationChain(word, result, services);
      if (useCache) _lookupCache.set(cacheKey, result);
      return result;
    }

    const connectivity = services.getConnectivityStatus();

    if (!connectivity.isOnline) {
      const syncResult = services.lookupWordSync(cleaned);
      if (syncResult?.english) {
        const result = createNormalizedResult({
          word, cleanedWord: cleaned, english: syncResult.english, translation: syncResult.english,
          source: 'local', headword: syncResult.headword, offline: true, lookupPath: 'offline-local'
        });
        const hypotheses = generateRootHypotheses(cleaned, services);
        if (hypotheses.length > 0) {
          result.rootHypotheses = hypotheses.map(h => ({ ...h, validated: false }));
          result.bestHypothesis = hypotheses[0];
        }
        result.derivationChain = buildDerivationChain(cleaned, result, services);
        if (useCache) _lookupCache.set(cacheKey, result);
        return result;
      }
    }

    let result = null;

    try {
      const lookupResult = await parallelDictionaryLookup(cleaned, services, { contextType: effectiveContext });
      if (lookupResult) {
        switch (lookupResult.source) {
          case 'scholarly':
            result = processScholarlyResult(lookupResult.result, word, cleaned);
            break;
          case 'jastrow':
            result = processJastrowResult(lookupResult.result, word, cleaned);
            break;
          case 'cal':
            result = processCALResult(lookupResult.result, word, cleaned);
            break;
          case 'bdb':
            // BDB uses same structure as Sefaria
            result = processSefariaResult(lookupResult.result, word, cleaned);
            result.source = 'bdb';
            result.sourceTier = 'gold';
            result.sourceMetadata = SOURCE_METADATA.bdb;
            result.confidence = 90;
            _telemetry.sourceTiers.gold = (_telemetry.sourceTiers.gold || 0) + 1;
            _telemetry.sourceTiers.bronze = Math.max(0, (_telemetry.sourceTiers.bronze || 0) - 1);
            break;
          case 'sefaria':
          default:
            result = processSefariaResult(lookupResult.result, word, cleaned);
            break;
        }
      }
    } catch (e) {
      logError('parallelLookup', e, word);
    }

    if (!result || !result.english) {
      const syncResult = services.lookupWordSync(cleaned);
      if (syncResult?.english) {
        result = createNormalizedResult({
          word, cleanedWord: cleaned, english: syncResult.english, translation: syncResult.english,
          source: syncResult.source || 'local', headword: syncResult.headword, lookupPath: 'fallback-local'
        });
      } else {
        result = createNormalizedResult({ word, cleanedWord: cleaned, lookupPath: 'no-match-found' });
      }
    }

    if (scholarDepth !== 'quick') {
      const scholarServices = await getScholarServices();
      result = await applyScholarlyEnhancements(result, cleaned, services, scholarServices, { contextType: effectiveContext, scholarDepth });
    }

    result._meta.contextType = effectiveContext;
    result._meta.timestamp = Date.now();

    if (useCache && result.english) _lookupCache.set(cacheKey, result);

    return result;
  });
};

export const quickLookup = (word) => {
  const services = getCoreServices();
  const cleaned = services.cleanHebrewWord(word);
  if (!cleaned) return null;

  try {
    const syncResult = services.lookupWordSync(cleaned);
    if (syncResult?.english) {
      const result = createNormalizedResult({
        word, cleanedWord: cleaned, english: syncResult.english, translation: syncResult.english,
        source: syncResult.source || 'local', headword: syncResult.headword, lookupPath: 'sync-local',
        root: syncResult.root || null
      });
      // Build derivation chain for UI display
      result.derivationChain = buildDerivationChain(word, result, services);
      return result;
    }
  } catch (e) {
    logError('quickLookup', e, word);
  }

  return null;
};

export const getFrenchTranslation = async (englishText) => {
  if (!englishText) return null;
  try {
    const scholarServices = await getScholarServices();
    return await scholarServices.translateEnglishToFrench(englishText);
  } catch (e) {
    logError('getFrenchTranslation', e);
    return null;
  }
};

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

export const clearLookupCache = () => {
  _lookupCache.clear();
  _pendingRequests.clear();
};

export const getCacheStats = () => {
  const stats = _lookupCache.stats?.() || { size: 0, maxSize: 1000 };
  return { ...stats, ttlMs: 10 * 60 * 1000, pendingRequests: _pendingRequests.size };
};

// =============================================================================
// BATCH OPERATIONS (Performance Optimization)
// =============================================================================

/**
 * Look up multiple words in parallel with concurrency control
 * More efficient than calling lookupWord multiple times
 *
 * @param {string[]} words - Array of words to look up
 * @param {Object} options - Lookup options
 * @param {number} options.concurrency - Max parallel lookups (default: 5)
 * @returns {Promise<Map<string, Object>>} Map of word -> result
 */
export const batchLookup = async (words, options = {}) => {
  const { concurrency = 5, contextType = 'general', scholarDepth = 'quick' } = options;
  const results = new Map();
  const uniqueWords = [...new Set(words.filter(w => w && w.length >= 2))];

  // Process in batches for concurrency control
  for (let i = 0; i < uniqueWords.length; i += concurrency) {
    const batch = uniqueWords.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(word =>
        lookupWord(word, { contextType, scholarDepth, useCache: true })
          .then(result => ({ word, result }))
          .catch(() => ({ word, result: null }))
      )
    );

    for (const { word, result } of batchResults) {
      if (result) {
        results.set(word, result);
      }
    }
  }

  return results;
};

/**
 * Pre-warm the cache with common words from a text
 * Call this when loading a new page/section for faster subsequent lookups
 *
 * @param {string} text - Text to extract words from
 * @param {Object} options - Options including contextType
 */
export const warmCache = async (text, options = {}) => {
  if (!text) return;

  const services = getCoreServices();

  // Extract unique Hebrew/Aramaic words
  const wordPattern = /[\u0590-\u05FF]+/g;
  const matches = text.match(wordPattern) || [];
  const uniqueWords = [...new Set(
    matches
      .map(w => services.cleanHebrewWord(w))
      .filter(w => w && w.length >= 2 && w.length <= 15)
  )];

  // Limit to avoid overwhelming the system
  const wordsToWarm = uniqueWords.slice(0, 50);

  if (wordsToWarm.length > 0) {
    // Run in background with low priority
    setTimeout(() => {
      batchLookup(wordsToWarm, { ...options, scholarDepth: 'quick', concurrency: 3 })
        .catch(() => {}); // Silent fail for cache warming
    }, 100);
  }
};

/**
 * Check if a word is already cached
 * @param {string} word - Word to check
 * @param {Object} options - Options including contextType
 * @returns {boolean} Whether the word is cached
 */
export const isCached = (word, options = {}) => {
  const services = getCoreServices();
  const cleaned = services.cleanHebrewWord(word);
  if (!cleaned) return false;

  const cacheKey = getCacheKey(cleaned, options);
  return _lookupCache.has?.(cacheKey) || _lookupCache.get(cacheKey) !== undefined;
};

// =============================================================================
// EXPORTS
// =============================================================================

export { cleanHebrewWord } from '../utils/hebrewUtils';
export { lookupWordSync } from './combinedTranslationService';
export { scholarlyLookup, lookupJastrow, lookupWordSefaria } from './scholarlyLexiconService';
export { getGlobalTelemetry, getPerformanceMetrics, autoManageCaches };

const wordLookupOrchestrator = {
  // Core lookup functions
  lookupWord, quickLookup, getFrenchTranslation,
  // Batch operations
  batchLookup, warmCache, isCached,
  // Cache management
  clearLookupCache, getCacheStats, getTelemetry,
  // Utility functions
  createNormalizedResult, validateDictionaryMatch, calculateHeadwordSimilarity,
  generateRootHypotheses, analyzeWeakVerb, buildDerivationChain, detectHistoricalLayer,
  // PRO SCHOLAR V7: Scholarly workflow functions
  applyScholarlyWorkflow, getPrefixMeaning, getSuffixMeaning,
  // Constants
  SOURCE_TIERS, SOURCE_METADATA, WEAK_VERB_TYPES, BINYAN_INFO, SEMANTIC_DOMAINS, HISTORICAL_LAYERS, COGNATE_LANGUAGES,
  // PRO SCHOLAR V7: Re-exported from dictionarySources
  MATCH_TYPES, RELIABILITY_TIERS,
  generateScholarlyExplanation, getMatchTypeInfo, explainConfidence, isAcademicLexicon, isLocalSource
};

export default wordLookupOrchestrator;

// PRO SCHOLAR V7: Named exports for direct imports
export {
  applyScholarlyWorkflow,
  getPrefixMeaning,
  getSuffixMeaning
};
