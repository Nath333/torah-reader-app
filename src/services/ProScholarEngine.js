/**
 * PRO SCHOLAR ENGINE v7.0
 * ========================
 *
 * THE UNIFIED ORCHESTRATOR for all Hebrew/Aramaic text analysis.
 *
 * This replaces the fragmented architecture of:
 * - proScholarV4.js (DEPRECATED)
 * - multiHypothesisService.js (DEPRECATED)
 * - unifiedRootService.js (integrated)
 * - proScholarV6.js (integrated)
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    ProScholarEngine                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
 * │  │Morphology │  │Dictionary │  │ Semantic  │  │  Context  │ │
 * │  │ Analyzer  │  │  Service  │  │  Engine   │  │  Service  │ │
 * │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
 * │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
 * │  │ Gematria  │  │ Evolution │  │Difficulty │  │ Parallel  │ │
 * │  │Calculator │  │ Tracker   │  │  Scorer   │  │  Finder   │ │
 * │  └───────────┘  └───────────┘  └───────────┘  └───────────┘ │
 * │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
 * │  │   Cache   │  │ Telemetry │  │  Config   │               │
 * │  │  Manager  │  │  Service  │  │  Manager  │               │
 * │  └───────────┘  └───────────┘  └───────────┘               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * NEW FEATURES IN V7:
 * 1. Gematria Calculator - Numerical values + related word lookup
 * 2. Word Evolution Tracker - Biblical → Mishnaic → Talmudic
 * 3. Difficulty Scoring - For vocabulary learning
 * 4. Parallel Text Finder - Tanakh cross-references
 * 5. Unified Cache with TTL and LRU eviction
 * 6. Comprehensive Telemetry
 *
 * @module ProScholarEngine
 * @version 7.0.0
 */

import { ARAMAIC_PARTICLES, BIBLICAL_PARTICLES } from './preClassificationService';
import { lookupJastrowSync, lookupBDBSync, lookupStrongsSync } from './dictionaryLoader';
import { stripVowels, GEMATRIA_VALUES } from '../utils/hebrewUtils';

export const ENGINE_VERSION = '7.0.0';

// =============================================================================
// 1. UNIFIED CACHE MANAGER
// LRU cache with TTL support for optimal performance
// =============================================================================

class CacheManager {
  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 min default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      value,
      expiry: ttl ? Date.now() + ttl : null,
      created: Date.now()
    });
    this.stats.sets++;
    return value;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

// Global cache instance
const _cache = new CacheManager(1000, 300000);

// =============================================================================
// 2. GEMATRIA CALCULATOR
// Calculate numerical values and find related words
// =============================================================================

// DRY: GEMATRIA_VALUES imported from utils/hebrewUtils.js (single source of truth)

/**
 * Famous gematria equivalences for quick lookup
 */
const NOTABLE_GEMATRIAS = {
  13: ['אחד', 'אהבה'], // echad (one), ahavah (love)
  18: ['חי'], // chai (life)
  26: ['יהוה'], // YHVH
  72: ['חסד'], // chesed (kindness)
  86: ['אלהים'], // Elohim
  314: ['שדי'], // Shaddai
  358: ['משיח', 'נחש'], // mashiach (messiah), nachash (serpent)
  541: ['ישראל'], // Yisrael
  611: ['תורה'], // Torah
};

/**
 * Gematria calculation methods
 */
export const GematriaCalculator = {
  /**
   * Standard gematria (mispar hechrachi)
   */
  standard(word) {
    const cleaned = stripVowels(word).replace(/\s/g, '');
    let total = 0;
    for (const char of cleaned) {
      total += GEMATRIA_VALUES[char] || 0;
    }
    return total;
  },

  /**
   * Mispar Katan (small value) - each letter mod 9
   */
  katan(word) {
    const cleaned = stripVowels(word).replace(/\s/g, '');
    let total = 0;
    for (const char of cleaned) {
      const val = GEMATRIA_VALUES[char] || 0;
      total += val > 0 ? ((val - 1) % 9) + 1 : 0;
    }
    return total;
  },

  /**
   * Mispar Gadol - final letters have higher values
   */
  gadol(word) {
    const finalValues = { 'ך': 500, 'ם': 600, 'ן': 700, 'ף': 800, 'ץ': 900 };
    const cleaned = stripVowels(word).replace(/\s/g, '');
    let total = 0;
    for (const char of cleaned) {
      total += finalValues[char] || GEMATRIA_VALUES[char] || 0;
    }
    return total;
  },

  /**
   * AtBash - substitution cipher gematria
   */
  atbash(word) {
    const atbashMap = {
      'א': 'ת', 'ב': 'ש', 'ג': 'ר', 'ד': 'ק', 'ה': 'צ', 'ו': 'פ', 'ז': 'ע',
      'ח': 'ס', 'ט': 'נ', 'י': 'מ', 'כ': 'ל', 'ל': 'כ', 'מ': 'י', 'נ': 'ט',
      'ס': 'ח', 'ע': 'ז', 'פ': 'ו', 'צ': 'ה', 'ק': 'ד', 'ר': 'ג', 'ש': 'ב', 'ת': 'א'
    };
    const cleaned = stripVowels(word).replace(/\s/g, '');
    let transformed = '';
    for (const char of cleaned) {
      transformed += atbashMap[char] || char;
    }
    return { transformed, value: this.standard(transformed) };
  },

  /**
   * Full analysis with all methods
   */
  analyze(word) {
    const standard = this.standard(word);
    const katan = this.katan(word);
    const gadol = this.gadol(word);
    const atbash = this.atbash(word);

    // Find notable equivalences
    const equivalences = NOTABLE_GEMATRIAS[standard] || [];
    const katanEquivalences = NOTABLE_GEMATRIAS[katan] || [];

    return {
      word,
      methods: {
        standard: { value: standard, name: 'Mispar Hechrachi' },
        katan: { value: katan, name: 'Mispar Katan' },
        gadol: { value: gadol, name: 'Mispar Gadol' },
        atbash: { value: atbash.value, transformed: atbash.transformed, name: 'AtBash' }
      },
      equivalences: {
        standard: equivalences.filter(w => w !== word),
        katan: katanEquivalences.filter(w => w !== word)
      },
      notableValue: NOTABLE_GEMATRIAS[standard] ? true : false
    };
  },

  /**
   * Find words with same gematria value
   */
  findEquivalent(value) {
    return NOTABLE_GEMATRIAS[value] || [];
  }
};

// =============================================================================
// 3. WORD EVOLUTION TRACKER
// Track how words evolved from Biblical to Talmudic Hebrew
// =============================================================================

/**
 * Semantic shifts between periods
 */
const WORD_EVOLUTION_DB = {
  // Words that changed meaning
  'דבר': {
    biblical: { meaning: 'word, thing, matter', frequency: 'very high' },
    mishnaic: { meaning: 'word, matter, thing', frequency: 'very high', notes: 'Similar usage' },
    talmudic: { meaning: 'word, matter, legal case', frequency: 'very high', notes: 'Extended to legal contexts' }
  },
  'תורה': {
    biblical: { meaning: 'instruction, teaching, law', frequency: 'high' },
    mishnaic: { meaning: 'Torah, Pentateuch, halakha', frequency: 'very high', notes: 'More specific: Written Torah' },
    talmudic: { meaning: 'Torah, law, teaching', frequency: 'very high', notes: 'Includes Oral Torah' }
  },
  'מצוה': {
    biblical: { meaning: 'commandment, order', frequency: 'high' },
    mishnaic: { meaning: 'commandment, mitzvah', frequency: 'very high', notes: 'Technical: one of 613' },
    talmudic: { meaning: 'commandment, good deed', frequency: 'very high', notes: 'Extended to any good act' }
  },
  'גמרא': {
    biblical: { meaning: '—', frequency: 'none' },
    mishnaic: { meaning: 'completion, study', frequency: 'low' },
    talmudic: { meaning: 'Gemara (Talmudic discussion)', frequency: 'very high', notes: 'Technical term' }
  },
  'סוגיא': {
    biblical: { meaning: '—', frequency: 'none' },
    mishnaic: { meaning: '—', frequency: 'none' },
    talmudic: { meaning: 'topic, passage, sugya', frequency: 'high', notes: 'Aramaic loan' }
  },
  'הלכה': {
    biblical: { meaning: '—', frequency: 'none' },
    mishnaic: { meaning: 'law, ruling, halakha', frequency: 'very high', notes: 'From הלך (to go/walk)' },
    talmudic: { meaning: 'law, ruling, halakha', frequency: 'very high', notes: 'Normative legal ruling' }
  },
  'פסק': {
    biblical: { meaning: 'to cease, cut off', frequency: 'low' },
    mishnaic: { meaning: 'to decide, rule', frequency: 'medium' },
    talmudic: { meaning: 'to decide, ruling (pesak)', frequency: 'high', notes: 'Legal decision' }
  },
  'שמועה': {
    biblical: { meaning: 'report, news, hearing', frequency: 'medium' },
    mishnaic: { meaning: 'tradition, teaching', frequency: 'high', notes: 'Oral transmission' },
    talmudic: { meaning: 'teaching, tradition, shemu\'a', frequency: 'high', notes: 'Received teaching' }
  }
};

/**
 * Aramaic words that entered from different periods
 */
const ARAMAIC_EVOLUTION = {
  'מר': { period: 'talmudic', meaning: 'master, sir', notes: 'Honorific title' },
  'רבנן': { period: 'talmudic', meaning: 'the Rabbis', notes: 'Plural of רב' },
  'סוגיא': { period: 'talmudic', meaning: 'passage, topic', notes: 'From סוג (to surround)' },
  'גמרא': { period: 'talmudic', meaning: 'completion, learning', notes: 'From גמר (to complete)' },
  'שמעתא': { period: 'talmudic', meaning: 'halakhic tradition', notes: 'Aramaic form of שמועה' },
  'פירקא': { period: 'talmudic', meaning: 'chapter, section', notes: 'From פרק (to break/divide)' }
};

export const WordEvolutionTracker = {
  /**
   * Get evolution data for a word
   */
  getEvolution(word) {
    const cleaned = stripVowels(word);

    // Check Hebrew evolution
    const hebrewEvolution = WORD_EVOLUTION_DB[cleaned];
    if (hebrewEvolution) {
      return {
        word: cleaned,
        type: 'hebrew',
        evolution: hebrewEvolution,
        hasShift: this._detectSemanticShift(hebrewEvolution)
      };
    }

    // Check Aramaic
    const aramaicInfo = ARAMAIC_EVOLUTION[cleaned];
    if (aramaicInfo) {
      return {
        word: cleaned,
        type: 'aramaic_loan',
        evolution: {
          biblical: { meaning: '—', frequency: 'none' },
          mishnaic: aramaicInfo.period === 'mishnaic' ? aramaicInfo : { meaning: '—', frequency: 'none' },
          talmudic: aramaicInfo
        },
        notes: aramaicInfo.notes
      };
    }

    return { word: cleaned, type: 'unknown', evolution: null };
  },

  /**
   * Detect if word underwent semantic shift
   */
  _detectSemanticShift(evolution) {
    const periods = ['biblical', 'mishnaic', 'talmudic'];
    const meanings = periods
      .map(p => evolution[p]?.meaning)
      .filter(m => m && m !== '—');

    // Simple check: if meanings differ significantly
    return new Set(meanings).size > 1;
  },

  /**
   * Get period-appropriate meaning
   */
  getMeaningForPeriod(word, period) {
    const evolution = this.getEvolution(word);
    if (!evolution.evolution) return null;
    return evolution.evolution[period] || null;
  }
};

// =============================================================================
// 4. DIFFICULTY SCORER
// Rate word difficulty for vocabulary learning
// =============================================================================

/**
 * Factors that affect word difficulty
 */
const DIFFICULTY_FACTORS = {
  // Length complexity
  lengthWeight: {
    2: 0.8, // Short = easier
    3: 1.0, // Standard
    4: 1.1,
    5: 1.2,
    6: 1.3,
    7: 1.5,
    default: 1.6
  },

  // Root type complexity
  rootTypeWeight: {
    strong: 1.0,      // Regular triliteral
    'pe-nun': 1.3,    // פ"נ
    'pe-yod': 1.3,    // פ"י
    'lamed-he': 1.4,  // ל"ה
    'ayin-vav': 1.5,  // ע"ו (hollow)
    'geminate': 1.4,  // ע"ע
    default: 1.2
  },

  // Frequency (common = easier)
  frequencyWeight: {
    'very_high': 0.7,
    'high': 0.85,
    'medium': 1.0,
    'low': 1.3,
    'rare': 1.6,
    default: 1.0
  },

  // Language complexity
  languageWeight: {
    hebrew_biblical: 1.0,
    hebrew_mishnaic: 1.1,
    aramaic_babylonian: 1.4,
    aramaic_palestinian: 1.5,
    mixed: 1.3,
    default: 1.2
  }
};

/**
 * Word frequency data (simplified - would be loaded from corpus in production)
 */
const HIGH_FREQUENCY_WORDS = new Set([
  'אמר', 'היה', 'עשה', 'נתן', 'בוא', 'הלך', 'ראה', 'שמע', 'ידע', 'לקח',
  'דבר', 'אדם', 'יום', 'שנה', 'ארץ', 'בית', 'מלך', 'איש', 'אשה', 'בן',
  'תנא', 'אמרי', 'בעי', 'קאמר', 'מאי', 'היכי', 'אלא', 'הכי'
]);

export const DifficultyScorer = {
  /**
   * Calculate difficulty score (1-10)
   */
  score(word, options = {}) {
    const { textType = 'unknown', morphology = null, isVerb = false } = options;
    const cleaned = stripVowels(word);

    let score = 5.0; // Base score

    // Factor 1: Length
    const lengthFactor = DIFFICULTY_FACTORS.lengthWeight[cleaned.length]
      || DIFFICULTY_FACTORS.lengthWeight.default;
    score *= lengthFactor;

    // Factor 2: Root type (if morphology provided)
    if (morphology?.weakType) {
      const weakType = morphology.weakType.toLowerCase();
      if (weakType.includes('נ')) score *= DIFFICULTY_FACTORS.rootTypeWeight['pe-nun'];
      else if (weakType.includes('י') && weakType.includes('פ')) score *= DIFFICULTY_FACTORS.rootTypeWeight['pe-yod'];
      else if (weakType.includes('ה') && weakType.includes('ל')) score *= DIFFICULTY_FACTORS.rootTypeWeight['lamed-he'];
      else if (weakType.includes('ו') && weakType.includes('ע')) score *= DIFFICULTY_FACTORS.rootTypeWeight['ayin-vav'];
      else if (weakType.includes('ע"ע')) score *= DIFFICULTY_FACTORS.rootTypeWeight['geminate'];
    }

    // Factor 3: Frequency
    if (HIGH_FREQUENCY_WORDS.has(cleaned)) {
      score *= DIFFICULTY_FACTORS.frequencyWeight.very_high;
    }

    // Factor 4: Language/Text type
    if (textType === 'talmudic' || textType === 'aramaic') {
      score *= DIFFICULTY_FACTORS.languageWeight.aramaic_babylonian;
    } else if (textType === 'biblical') {
      score *= DIFFICULTY_FACTORS.languageWeight.hebrew_biblical;
    }

    // Factor 5: Verb complexity bonus
    if (isVerb) {
      score *= 1.15; // Verbs are generally harder
    }

    // Normalize to 1-10 scale
    score = Math.max(1, Math.min(10, score));

    return {
      word: cleaned,
      score: Math.round(score * 10) / 10,
      level: this._getLevel(score),
      factors: {
        length: lengthFactor,
        frequency: HIGH_FREQUENCY_WORDS.has(cleaned) ? 'high' : 'normal',
        textType
      }
    };
  },

  /**
   * Get difficulty level label
   */
  _getLevel(score) {
    if (score <= 2) return 'beginner';
    if (score <= 4) return 'elementary';
    if (score <= 6) return 'intermediate';
    if (score <= 8) return 'advanced';
    return 'expert';
  },

  /**
   * Batch score multiple words
   */
  batchScore(words, options = {}) {
    return words.map(w => this.score(w, options));
  }
};

// =============================================================================
// 5. PARALLEL TEXT FINDER
// Find where phrases appear in Tanakh
// =============================================================================

/**
 * Common Biblical phrases and their locations
 */
const BIBLICAL_PHRASES = {
  'בראשית ברא': { location: 'Genesis 1:1', context: 'Creation' },
  'שמע ישראל': { location: 'Deuteronomy 6:4', context: 'Shema' },
  'ואהבת לרעך': { location: 'Leviticus 19:18', context: 'Love your neighbor' },
  'צדק צדק': { location: 'Deuteronomy 16:20', context: 'Justice' },
  'עשה טוב': { location: 'Psalms 34:15', context: 'Do good' },
  'דרשו שלום': { location: 'Jeremiah 29:7', context: 'Seek peace' },
  'לא תרצח': { location: 'Exodus 20:13', context: 'Ten Commandments' },
  'לא תגנב': { location: 'Exodus 20:13', context: 'Ten Commandments' },
  'כבד את אביך': { location: 'Exodus 20:12', context: 'Honor parents' },
  'אנכי ה\'': { location: 'Exodus 20:2', context: 'Ten Commandments' },
  'קדושים תהיו': { location: 'Leviticus 19:2', context: 'Holiness code' },
  'ועשית הישר': { location: 'Deuteronomy 6:18', context: 'Do right' },
  'ושמרתם את': { location: 'multiple', context: 'Commandment formula' },
  'ויאמר ה\'': { location: 'multiple', context: 'Divine speech formula' },
  'כה אמר ה\'': { location: 'Prophets', context: 'Prophetic formula' }
};

/**
 * Citation detection patterns
 */
const CITATION_PATTERNS = [
  { regex: /שנאמר/, type: 'scripture', meaning: 'as it is said' },
  { regex: /דכתיב/, type: 'scripture', meaning: 'for it is written' },
  { regex: /כדכתיב/, type: 'scripture', meaning: 'as it is written' },
  { regex: /כמו שנאמר/, type: 'scripture', meaning: 'as it is said' },
  { regex: /כתוב/, type: 'scripture', meaning: 'it is written' }
];

export const ParallelTextFinder = {
  /**
   * Find parallel texts for a phrase
   */
  findParallels(phrase) {
    const cleaned = stripVowels(phrase);
    const results = [];

    // Check exact matches
    if (BIBLICAL_PHRASES[cleaned]) {
      results.push({
        type: 'exact',
        phrase: cleaned,
        ...BIBLICAL_PHRASES[cleaned]
      });
    }

    // Check partial matches
    for (const [key, value] of Object.entries(BIBLICAL_PHRASES)) {
      if (key !== cleaned && (cleaned.includes(key) || key.includes(cleaned))) {
        results.push({
          type: 'partial',
          phrase: key,
          matchedIn: cleaned,
          ...value
        });
      }
    }

    return results;
  },

  /**
   * Detect if text contains a citation
   */
  detectCitation(text) {
    for (const pattern of CITATION_PATTERNS) {
      if (pattern.regex.test(text)) {
        return {
          hasCitation: true,
          type: pattern.type,
          meaning: pattern.meaning,
          // Extract what comes after the citation marker
          afterMarker: text.split(pattern.regex)[1]?.trim()
        };
      }
    }
    return { hasCitation: false };
  },

  /**
   * Identify common Biblical formulas
   */
  identifyFormula(phrase) {
    const formulas = [
      { pattern: /^ו(י|ת)[א-ת]{3}$/, name: 'wayyiqtol', description: 'Narrative past tense' },
      { pattern: /כה אמר/, name: 'prophetic', description: 'Thus says the LORD' },
      { pattern: /ויהי/, name: 'narrative', description: 'And it came to pass' },
      { pattern: /הנה/, name: 'presentative', description: 'Behold' }
    ];

    for (const formula of formulas) {
      if (formula.pattern.test(phrase)) {
        return formula;
      }
    }
    return null;
  }
};

// =============================================================================
// 6. UNIFIED ANALYSIS FUNCTION
// Main entry point that orchestrates all services
// =============================================================================

/**
 * Comprehensive word analysis using all Pro Scholar features
 *
 * @param {string} word - Hebrew/Aramaic word to analyze
 * @param {Object} options - Configuration options
 * @returns {Object} - Complete analysis result
 */
export function analyzeWord(word, options = {}) {
  const startTime = performance.now();
  const {
    textType = 'unknown',
    reference = null,
    includeGematria = true,
    includeEvolution = true,
    includeDifficulty = true,
    includeParallels = false,
    context = {}
  } = options;

  // Check cache
  const cacheKey = `analyze:${textType}:${word}`;
  const cached = _cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const cleaned = stripVowels(word);

  // Initialize result
  const result = {
    word,
    cleanedWord: cleaned,
    version: ENGINE_VERSION,
    textType,
    reference,
    timestamp: Date.now()
  };

  // 1. Check particles first (instant lookup)
  const aramaicParticle = ARAMAIC_PARTICLES[cleaned];
  const biblicalParticle = BIBLICAL_PARTICLES[cleaned];

  if (aramaicParticle || biblicalParticle) {
    const particle = textType === 'biblical' ? (biblicalParticle || aramaicParticle) : (aramaicParticle || biblicalParticle);
    result.particle = {
      type: aramaicParticle ? 'aramaic' : 'biblical',
      meaning: particle.meaning,
      root: particle.root,
      form: particle.form,
      confidence: particle.confidence || 95
    };
    result.english = particle.meaning;
    result.isInstantMatch = true;
  }

  // 2. Dictionary lookups
  const sources = [];

  // Jastrow for Talmudic
  if (textType !== 'biblical') {
    const jastrow = lookupJastrowSync(cleaned);
    if (jastrow) {
      sources.push({
        name: 'Jastrow',
        tier: 'gold',
        definition: jastrow.definition || jastrow.gloss,
        headword: jastrow.headword
      });
    }
  }

  // BDB for Biblical/general
  const bdb = lookupBDBSync(cleaned);
  if (bdb) {
    sources.push({
      name: 'BDB',
      tier: 'gold',
      definition: bdb.definition || bdb.gloss,
      headword: bdb.headword
    });
  }

  // Strong's for Biblical only
  if (textType === 'biblical') {
    const strongs = lookupStrongsSync(cleaned);
    if (strongs) {
      sources.push({
        name: "Strong's",
        tier: 'silver',
        definition: strongs.definition || strongs.gloss,
        strongNumber: strongs.strongNumber
      });
    }
  }

  result.sources = sources;
  if (sources.length > 0 && !result.english) {
    result.english = sources[0].definition;
  }

  // 3. Gematria analysis
  if (includeGematria) {
    result.gematria = GematriaCalculator.analyze(cleaned);
  }

  // 4. Word evolution
  if (includeEvolution) {
    result.evolution = WordEvolutionTracker.getEvolution(cleaned);
  }

  // 5. Difficulty scoring
  if (includeDifficulty) {
    result.difficulty = DifficultyScorer.score(cleaned, { textType });
  }

  // 6. Parallel text detection
  if (includeParallels && context.surroundingText) {
    result.parallels = ParallelTextFinder.findParallels(context.surroundingText);
    result.citation = ParallelTextFinder.detectCitation(context.surroundingText);
  }

  // Calculate processing time
  result.processingMs = Math.round((performance.now() - startTime) * 100) / 100;

  // Cache result
  _cache.set(cacheKey, result);

  return result;
}

/**
 * Batch analyze multiple words
 */
export function analyzeWords(words, options = {}) {
  return words.map(word => analyzeWord(word, options));
}

/**
 * Quick lookup (minimal analysis for performance)
 */
export function quickLookup(word, textType = 'unknown') {
  const cleaned = stripVowels(word);

  // Check particles
  const particle = ARAMAIC_PARTICLES[cleaned] || BIBLICAL_PARTICLES[cleaned];
  if (particle) {
    return {
      word,
      english: particle.meaning,
      source: 'Particles',
      confidence: particle.confidence || 95
    };
  }

  // Quick dictionary lookup
  const entry = textType === 'biblical'
    ? (lookupBDBSync(cleaned) || lookupJastrowSync(cleaned))
    : (lookupJastrowSync(cleaned) || lookupBDBSync(cleaned));

  if (entry) {
    return {
      word,
      english: entry.definition || entry.gloss,
      source: entry.source || 'Dictionary',
      confidence: 85
    };
  }

  return { word, english: null, confidence: 0 };
}

// =============================================================================
// 7. ENGINE MANAGEMENT
// =============================================================================

export const EngineManager = {
  getVersion: () => ENGINE_VERSION,
  getCacheStats: () => _cache.getStats(),
  clearCache: () => _cache.clear(),

  /**
   * Get comprehensive engine status
   */
  getStatus() {
    return {
      version: ENGINE_VERSION,
      cache: _cache.getStats(),
      features: {
        gematria: true,
        evolution: true,
        difficulty: true,
        parallels: true,
        particles: {
          aramaic: Object.keys(ARAMAIC_PARTICLES).length,
          biblical: Object.keys(BIBLICAL_PARTICLES).length
        }
      }
    };
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

const ProScholarEngine = {
  VERSION: ENGINE_VERSION,

  // Main analysis functions
  analyzeWord,
  analyzeWords,
  quickLookup,

  // Individual modules
  GematriaCalculator,
  WordEvolutionTracker,
  DifficultyScorer,
  ParallelTextFinder,

  // Engine management
  EngineManager,
  getCacheStats: () => _cache.getStats(),
  clearCache: () => _cache.clear()
};

export default ProScholarEngine;
