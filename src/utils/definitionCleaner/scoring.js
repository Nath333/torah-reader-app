// =============================================================================
// Scoring systématique — hautes fréquences, scoreDefinition (qualité +
// contexte + source), pickBestFromCandidates.
// (extrait de definitionCleaner.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { CONTEXT_MODES, SOURCE_PRIORITIES, getSourcePriority, shouldSkipSource, GARBLED_PATTERNS, REFERENCE_ONLY_PATTERNS } from './contextConfig';
import {
  GARBAGE_DEFINITIONS, isProperNounEntry, isTransliterationOnly,
  isObscureNounDefinition, isGrammaticalDefinition
} from './classifiers';


// =============================================================================
// DEFINITION QUALITY SCORING SYSTEM
// Systematic approach: score ALL definitions, pick the BEST one
// This replaces hardcoding individual words
// =============================================================================

// =============================================================================
// HIGH-FREQUENCY DEFINITION PATTERNS
// These patterns indicate common meanings that should be preferred over rare ones
// This is the PRO approach: use FREQUENCY DATA to disambiguate homographs
// e.g., "of" is 1000x more common than "negligence" for של
// =============================================================================
const HIGH_FREQUENCY_DEFINITIONS = {
  // === POSSESSIVES & PARTICLES (extremely high frequency) ===
  // These appear thousands of times per chapter in Talmud
  'of': 200,           // של - possessive particle (vs. "negligence")
  'or': 200,           // או - conjunction (vs. "desire")
  'and': 200,          // ו prefix meaning
  'the': 200,          // ה prefix meaning
  'in': 180,           // ב prefix
  'to': 180,           // ל prefix
  'from': 180,         // מ prefix
  'like': 150,         // כ prefix
  'that': 150,         // ש prefix / אשר
  'which': 150,
  'who': 150,
  'if': 150,           // אם
  'not': 150,          // לא
  'but': 140,
  'also': 140,         // גם
  'even': 130,
  'only': 130,         // רק
  'until': 120,        // עד
  'because': 120,      // כי
  'for': 120,

  // === PRONOUNS (very high frequency) ===
  'he': 180,           // הוא
  'she': 180,          // היא
  'they': 180,         // הם/הן - NOT "behold"!
  'it': 170,
  'we': 160,
  'I': 160,
  'you': 160,
  'this': 160,         // זה/זאת
  'these': 140,
  'those': 140,

  // === COMMON NOUNS (high frequency in Talmud) ===
  'master': 150,       // בעל (vs. "in on")
  'owner': 150,        // בעל
  'house': 150,        // בית
  'hand': 150,         // יד
  'day': 140,          // יום
  'word': 140,         // דבר
  'thing': 140,
  'man': 140,          // איש/אדם
  'person': 140,
  'place': 130,        // מקום
  'time': 130,         // זמן/עת
  'way': 120,          // דרך
  'name': 120,         // שם
  'king': 120,         // מלך
  'father': 120,       // אב
  'mother': 120,       // אם
  'son': 120,          // בן
  'daughter': 110,     // בת

  // === TALMUDIC LEGAL TERMS (domain-specific high frequency) ===
  'liable': 150,       // חייב
  'exempt': 150,       // פטור
  'permitted': 140,    // מותר
  'forbidden': 140,    // אסור
  'pure': 130,         // טהור
  'impure': 130,       // טמא

  // === COMMON VERBS ===
  'said': 150,         // אמר
  'gave': 140,         // נתן
  'took': 140,         // לקח/נטל
  'came': 140,         // בא
  'went': 140,         // הלך
  'made': 130,         // עשה
  'stood': 130,        // עמד
  'extended': 120,     // פשט (NOT "spread" in rare sense)
  'standing': 120,     // עומד
};

/**
 * Get frequency boost for a definition
 * Returns bonus score if the definition matches a high-frequency pattern
 */
const getFrequencyBoost = (definition) => {
  if (!definition) return 0;

  const lower = definition.toLowerCase().trim();

  // Exact match gets full boost
  if (HIGH_FREQUENCY_DEFINITIONS[lower]) {
    return HIGH_FREQUENCY_DEFINITIONS[lower];
  }

  // Partial match (definition starts with high-frequency word)
  for (const [pattern, boost] of Object.entries(HIGH_FREQUENCY_DEFINITIONS)) {
    if (lower.startsWith(pattern + ' ') || lower.startsWith(pattern + ',')) {
      return Math.floor(boost * 0.7); // 70% boost for partial match
    }
  }

  return 0;
};

/**
 * Score a definition for quality and relevance
 * Higher score = better/more common definition
 * Used by lookupLocalDictionaries to pick best definition from multiple sources
 *
 * SCORING SYSTEM:
 * - Base score: 50
 * - Reject (return -1000): proper nouns, obscure nouns, transliterations, garbage
 * - Positive: grammatical definitions, verbs, good length, gold-tier sources
 * - HIGH-FREQUENCY BOOST: common definitions get major boost (up to +200)
 * - Negative: single capitalized words, "name" mentions, excessive length
 *
 * @param {string} definition - The definition text
 * @param {string} source - Source dictionary name (BDB, Jastrow, etc.)
 * @param {object} options - Additional context for scoring
 * @param {boolean} options.hasTalmudicSource - True if Jastrow or BDB already has a valid definition
 * @param {boolean} options.isAramaicContext - True if word appears to be Aramaic
 * @param {string} options.contextMode - CONTEXT_MODES value for source prioritization
 * @returns {number} - Quality score (higher = better, -1000 = reject)
 */
export const scoreDefinition = (definition, source = '', options = {}) => {
  const {
    hasTalmudicSource = false,
    isAramaicContext = false,
    contextMode = isAramaicContext ? CONTEXT_MODES.TALMUDIC : CONTEXT_MODES.MIXED
  } = options;
  if (!definition || typeof definition !== 'string') return -1000;

  const trimmed = definition.trim();
  if (trimmed.length < 2) return -1000;

  // === HARD REJECTIONS (return -1000) ===
  // These definitions should NEVER be used

  // Reject proper noun entries ("hen I", "Adam II", "Tima, an Amora")
  if (isProperNounEntry(trimmed)) return -1000;

  // Reject obscure noun definitions (wrong homograph meanings)
  if (isObscureNounDefinition(trimmed)) return -1000;

  // Reject transliteration-only (not a real definition)
  if (isTransliterationOnly(trimmed)) return -1000;

  // Reject garbage definitions (just "noun", "verb", etc.)
  for (const pattern of GARBAGE_DEFINITIONS) {
    if (pattern.test(trimmed)) return -1000;
  }

  // Reject reference-only definitions
  for (const pattern of REFERENCE_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return -1000;
  }

  // Reject garbled patterns
  for (const pattern of GARBLED_PATTERNS) {
    if (pattern.test(trimmed)) return -1000;
  }

  // === BASE SCORE ===
  let score = 50;

  // === HIGH-FREQUENCY BOOST (PRO SCHOLAR feature) ===
  // Common words like "of", "or", "they" get major score boost
  // This disambiguates homographs: של="of" (+200) beats שְׁלָוָה="negligence" (+0)
  const frequencyBoost = getFrequencyBoost(trimmed);
  if (frequencyBoost > 0) {
    score += frequencyBoost;
  }

  // === POSITIVE SIGNALS (increase score) ===

  // Grammatical definitions (prepositions, conjunctions, etc.) - very reliable
  if (isGrammaticalDefinition(trimmed)) {
    score += 40;
  }

  // Verb definitions starting with "to X" - usually correct
  if (/^to\s+[a-z]+/i.test(trimmed)) {
    score += 30;
  }

  // Short, clean definitions (3-40 chars) - ideal length
  if (trimmed.length >= 3 && trimmed.length <= 40) {
    score += 20;
  }

  // Multiple meanings (comma-separated) - more comprehensive
  if (/^[a-z]+,\s*[a-z]+/i.test(trimmed) && trimmed.length < 60) {
    score += 15;
  }

  // === CONTEXT-AWARE SOURCE SCORING (PRO SCHOLAR v2) ===
  // Use SOURCE_PRIORITIES to get boost/penalty based on context
  // This SYSTEMATICALLY handles all sources, not just Strong's
  const sourcePriority = getSourcePriority(source, contextMode);
  score += sourcePriority.boost;

  // === STRONG'S EXTRA PENALTY ===
  // Strong's Concordance is designed for BIBLICAL Hebrew (1890s, based on KJV 1611)
  // In Talmudic/Aramaic context, Strong's often returns WRONG HOMOGRAPHS
  // The context-aware boost already penalizes Strong's, but we add more when:
  // 1. A better Talmudic source (Jastrow/BDB) already has a valid definition
  // 2. The word is Aramaic (Strong's doesn't cover Aramaic properly)
  if (/^Strong/i.test(source)) {
    if (hasTalmudicSource) {
      // Strong's has a definition BUT Jastrow/BDB already has one
      // In Talmudic context, Strong's is likely WRONG homograph
      score -= 80; // VERY heavy penalty - almost always prefer Talmudic sources
    } else if (contextMode === CONTEXT_MODES.TALMUDIC || isAramaicContext) {
      // Talmudic context without better source - still penalize
      score -= 50;
    }
    // In BIBLICAL context, Strong's keeps its boost from SOURCE_PRIORITIES
  }

  // === CAL (Comprehensive Aramaic Lexicon) BOOST ===
  // CAL is the GOLD STANDARD for Aramaic - highest priority for Talmud
  if (/^CAL/i.test(source) && (contextMode === CONTEXT_MODES.TALMUDIC || isAramaicContext)) {
    score += 30; // Extra boost beyond SOURCE_PRIORITIES for Aramaic context
  }

  // === JASTROW ARAMAIC SPECIALIST BOOST ===
  // Jastrow (1903) is specifically designed for Talmudic/Aramaic vocabulary
  if (/^Jastrow/i.test(source) && (contextMode === CONTEXT_MODES.TALMUDIC || isAramaicContext)) {
    score += 25; // Extra boost for Jastrow in Talmudic context
  }

  // Common semantic patterns for high-frequency words
  const commonPatterns = [
    // PRONOUNS - extremely common, highest priority
    // "they" should win over "behold" for הן, "he" over obscure meanings, etc.
    /^(they|he|she|we|I|you|it|one|who|whom|what|which)$/i,
    /^(this|that|these|those|here|there)$/i,
    // Body parts
    /^(hand|eye|foot|head|heart|mouth|ear|nose|face|arm|leg|body)/i,
    /^(father|mother|son|daughter|brother|sister|child|man|woman|person)/i,
    /^(king|lord|god|master|servant|priest|judge|ruler)/i,
    /^(day|night|year|month|time|morning|evening)/i,
    /^(word|thing|name|place|way|path|road)/i,
    /^(good|bad|great|small|new|old|holy|pure)/i,
    /^(life|death|blood|water|fire|earth|heaven|world)/i,
    /^(law|commandment|covenant|blessing|curse|prayer)/i,
    /^(rest|peace|war|battle|judgment|justice)/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(trimmed)) {
      score += 35;
      break;
    }
  }

  // === NEGATIVE SIGNALS (decrease score) ===

  // === RARE/OBSCURE DEFINITION PENALTIES (PRO SCHOLAR) ===
  // These definitions appear in dictionaries but are almost NEVER the correct meaning
  // for common Talmudic words. They're homograph traps.
  const RARE_DEFINITIONS = [
    // Wrong homographs for common function words
    /^(carelessness|negligence|slackness)$/i,   // Wrong for של
    /^(desire|longing|craving|lust)$/i,          // Wrong for או
    /^(spread|spreading)$/i,                      // Wrong for פשט (should be "extended")
    // Abstract obscure nouns
    /^(intermission|bisection|custom|issue)$/i,
    /^(outgo|outgoing|output|outcome)$/i,
    // Rare technical/archaic meanings
    /^(encampment|yoke|portion|louse|gnat)$/i,
    /^(musical|stringed instrument|chord)$/i,
    // Wrong direction/position meanings (should be specific like "inside/outside")
    /^(in on|on in|in at)$/i,                     // Wrong parse for בעל etc.
  ];

  for (const pattern of RARE_DEFINITIONS) {
    if (pattern.test(trimmed)) {
      score -= 150; // Heavy penalty - these are almost always wrong
    }
  }

  // Interjection definitions - often wrong homograph (e.g., "behold" for הן instead of "they")
  // These archaic interjections are rarely the correct meaning for common words
  if (/^(behold|lo|indeed|surely|verily|alas|oh|ah)$/i.test(trimmed)) {
    score -= 30;
  }

  // Single capitalized word (likely a name, but not caught by proper noun filter)
  if (/^[A-Z][a-z]{2,15}$/.test(trimmed)) {
    score -= 40;
  }

  // Contains "name" anywhere (proper noun indicator)
  if (/\bname\b/i.test(trimmed) && !/\bname of God\b/i.test(trimmed)) {
    score -= 60;
  }

  // Contains "Israelite" or similar (person reference)
  if (/\b(Israelite|Amora|Tanna|rabbi|sage)\b/i.test(trimmed)) {
    score -= 80;
  }

  // Overly long definitions (probably not a clean match)
  if (trimmed.length > 100) {
    score -= 15;
  }
  if (trimmed.length > 150) {
    score -= 25;
  }

  // Roman numerals in definition (entry number, not meaning)
  if (/\s[IVX]+\s*$/.test(trimmed)) {
    score -= 50;
  }

  // Technical notation debris
  if (/[,;]\s*i$/i.test(trimmed)) {
    score -= 30;
  }

  // Definitions with excessive punctuation (parsing issues)
  const punctCount = (trimmed.match(/[.,;:!?]/g) || []).length;
  if (punctCount > 5) {
    score -= punctCount * 3;
  }

  return score;
};

/**
 * Pick the best definition from multiple candidates using scoring
 * Uses context-aware scoring to prefer Talmudic sources over Strong's
 *
 * PRO SCHOLAR v2: Now uses CONTEXT_MODES for systematic source prioritization
 *
 * @param {Array} candidates - Array of {definition, source} objects
 * @param {object} options - Context for scoring
 * @param {boolean} options.isAramaicContext - True if word appears Aramaic
 * @param {string} options.contextMode - CONTEXT_MODES value (talmudic, biblical, mixed)
 * @returns {object|null} - Best candidate or null if all rejected
 */
export const pickBestFromCandidates = (candidates, options = {}) => {
  if (!candidates || candidates.length === 0) return null;

  const {
    isAramaicContext = false,
    contextMode = isAramaicContext ? CONTEXT_MODES.TALMUDIC : CONTEXT_MODES.MIXED
  } = options;

  // SMART: Check if Jastrow or BDB has a valid candidate
  // This tells Strong's scoring to heavily penalize itself
  const hasTalmudicSource = candidates.some(c =>
    /^(Jastrow|BDB)/i.test(c.source) &&
    scoreDefinition(c.definition, c.source, { hasTalmudicSource: false, isAramaicContext, contextMode }) > 0
  );

  // PRO SCHOLAR: Skip candidates from sources that should be skipped in this context
  // e.g., Skip Strong's entirely in TALMUDIC context
  const filteredCandidates = candidates.filter(c => !shouldSkipSource(c.source, contextMode));

  let bestCandidate = null;
  let bestScore = -1000;

  for (const candidate of filteredCandidates) {
    const score = scoreDefinition(candidate.definition, candidate.source, {
      hasTalmudicSource,
      isAramaicContext,
      contextMode
    });
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { ...candidate, score };
    }
  }

  // Only return if score is acceptable (above rejection threshold)
  return bestScore > 0 ? bestCandidate : null;
};

