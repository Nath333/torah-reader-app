// =============================================================================
// Contexte et priorités de sources — CONTEXT_MODES (talmudique/biblique/mixte),
// SOURCE_PRIORITIES, patterns garbled/référence-seule.
// (extrait de definitionCleaner.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// CONTEXT DETECTION SYSTEM (PRO SCHOLAR)
// Automatically detect if word is Talmudic/Aramaic vs Biblical Hebrew
// This drives source priority: Jastrow for Talmud, BDB/Strong's for Biblical
// =============================================================================

/**
 * CONTEXT MODES for dictionary lookup
 * Each mode has different source priorities
 */
export const CONTEXT_MODES = {
  TALMUDIC: 'talmudic',   // Gemara, Mishnah, Aramaic texts
  BIBLICAL: 'biblical',    // Torah, Tanakh, Biblical Hebrew
  MIXED: 'mixed',          // Unknown or mixed context (default)
};

/**
 * SOURCE PRIORITY by CONTEXT
 * Higher priority = tried first, given higher score
 *
 * CRITICAL INSIGHT: Strong's Concordance (1890) is for BIBLICAL Hebrew
 * - Based on King James Version (1611)
 * - Does NOT cover Mishnaic Hebrew or Babylonian Aramaic
 * - Returns WRONG HOMOGRAPHS for Talmudic words (e.g., "behold" for הן instead of "they")
 *
 * For Talmud, Strong's should be SKIPPED or heavily penalized
 */
export const SOURCE_PRIORITIES = {
  [CONTEXT_MODES.TALMUDIC]: {
    // Gold tier: Talmud specialists
    'Jastrow': { priority: 100, boost: 50 },      // THE standard for Talmud
    'CAL': { priority: 95, boost: 45 },           // Comprehensive Aramaic Lexicon
    'BDB Aramaic': { priority: 90, boost: 40 },   // BDB's Aramaic sections
    'Steinsaltz': { priority: 85, boost: 35 },    // Modern Talmud dictionary
    // Silver tier: General Hebrew (useful but not specialized)
    'BDB': { priority: 60, boost: 15 },           // Biblical focus, but helpful
    'Klein': { priority: 55, boost: 10 },         // Etymology, modern Hebrew
    // Bronze tier: SKIP for Talmud - returns wrong homographs
    "Strong's": { priority: 10, boost: -50, skip: true }, // WRONG for Talmud!
  },
  [CONTEXT_MODES.BIBLICAL]: {
    // Gold tier: Biblical specialists
    'BDB': { priority: 100, boost: 50 },          // THE standard for Biblical Hebrew
    "Strong's": { priority: 90, boost: 40 },      // Good for Biblical KJV context
    'HALOT': { priority: 85, boost: 35 },         // Modern scholarly standard
    'Gesenius': { priority: 80, boost: 30 },      // Classical grammar/lexicon
    // Silver tier: General
    'Klein': { priority: 60, boost: 15 },
    'Jastrow': { priority: 50, boost: 10 },       // Talmud focus, less useful
    'CAL': { priority: 40, boost: 5 },            // Aramaic, less relevant
  },
  [CONTEXT_MODES.MIXED]: {
    // Balanced priorities - Jastrow and BDB both high
    'Jastrow': { priority: 90, boost: 35 },
    'BDB': { priority: 90, boost: 35 },
    'CAL': { priority: 75, boost: 25 },
    'BDB Aramaic': { priority: 75, boost: 25 },
    'Klein': { priority: 60, boost: 15 },
    'Steinsaltz': { priority: 55, boost: 10 },
    "Strong's": { priority: 40, boost: -10 },     // Slight penalty in mixed context
  },
};

/**
 * Get source priority config for a given context and source
 * @param {string} source - Dictionary source name
 * @param {string} contextMode - CONTEXT_MODES value
 * @returns {object} - { priority, boost, skip }
 */
export const getSourcePriority = (source, contextMode = CONTEXT_MODES.MIXED) => {
  const priorities = SOURCE_PRIORITIES[contextMode] || SOURCE_PRIORITIES[CONTEXT_MODES.MIXED];

  // Find matching source (case-insensitive partial match)
  for (const [key, config] of Object.entries(priorities)) {
    if (source.toLowerCase().includes(key.toLowerCase())) {
      return config;
    }
  }

  // Default for unknown sources
  return { priority: 30, boost: 0, skip: false };
};

/**
 * Check if a source should be SKIPPED in the given context
 * PRO SCHOLAR: Skip Strong's entirely for Talmudic lookups
 * @param {string} source - Dictionary source name
 * @param {string} contextMode - CONTEXT_MODES value
 * @returns {boolean} - True if should skip
 */
export const shouldSkipSource = (source, contextMode) => {
  const config = getSourcePriority(source, contextMode);
  return config.skip === true;
};

// Patterns indicating garbled/broken definitions (from machine translation or notation debris)
export const GARBLED_PATTERNS = [
  /(?:prefix|suffix|comp'|height|Shebi|Ḥevah|Tosef|Pesik|intimation){2,}/i,
  /(?:to be bound|to hammer|to meet with|to hold in hand|to pound){2,}/i,
  /(?:entrance|darkness|light|that is|becoming|rather){3,}/i,
  /\.\.\.\s*\.\.\./,                                     // Multiple ellipses
  /^\s*[.,:;—-]+/,                                       // Starts with punctuation
  /\b(?:ace|Sifra|Thazr|Ḥevah|Tosef|Pesik|Baḥod)\b/i,  // Dictionary notation debris
  /(?:whatsoever|preced|foll|ib\.){2,}/i,               // Repeated notation
];

// Reference-only definitions that should be rejected entirely
// These are dictionary cross-references, not actual definitions
export const REFERENCE_ONLY_PATTERNS = [
  /^\s*\(?preced\.?\)?\.?\s*$/i,             // "preced.)" or "(preced.)"
  /^\s*\(?foll\.?\)?\.?\s*$/i,               // "foll.)" = following entry
  /^\s*\(?see\s+preced\.?\)?\.?\s*$/i,       // "see preced."
  /^\s*\(?see\s+foll\.?\)?\.?\s*$/i,         // "see foll."
  /^\s*\(?v\.\s*\w+\.?\)?\.?\s*$/i,          // "v. word" = see word
  /^\s*\(?ib\.?\)?\.?\s*$/i,                 // "ib." = ibidem (same place)
  /^\s*\(?same\.?\)?\.?\s*$/i,               // "same."
  /^\s*\(?id\.?\)?\.?\s*$/i,                 // "id." = idem (same)
  /^\s*\(?l\.c\.?\)?\.?\s*$/i,               // "l.c." = loco citato
  /^\s*\(?q\.v\.?\)?\.?\s*$/i,               // "q.v." = quod vide
  /^\s*\(?s\.v\.?\)?\.?\s*$/i,               // "s.v." = sub voce
  /^\s*\(?cf\.?\s*\w*\.?\)?\.?\s*$/i,        // "cf." = compare
  /^\s*\(?cmp\.?\s*\w*\.?\)?\.?\s*$/i,       // "cmp." = compare
  /^\s*\)?\s*$/,                              // Just orphan parenthesis
  /^\s*[[\]()]+\s*$/,                          // Just brackets/parens
  /^\s*→\s*[\u0590-\u05FF]+\s*$/,            // Jastrow arrow reference "→ שַׁבָּת"
  /^\s*see\s+[\u0590-\u05FF]+\s*$/i,         // "see [Hebrew word]"
  /^\s*=\s*[\u0590-\u05FF]+\s*$/,            // "= [Hebrew word]"
  /^\s*\(\s*[A-Z][a-z]{1,4}\.?\s*$/,         // Unclosed ref like "( Pfl."
  /^\s*\{[^}]+\}\s*$/,                        // Bracketed-only Strong's format
  /^,\s*i\s*$/i,                              // Just ", i" (truncated)
];

