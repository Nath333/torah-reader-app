// =============================================================================
// Definition Cleaner Utility
// Unified text cleaning for dictionary definitions across all services
// PRO SCHOLAR MODE: Context-aware source prioritization for Talmud vs Biblical
// =============================================================================

// =============================================================================
// IMPORTS
// =============================================================================
import { normalizeArticles } from './articleUtils';

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
const GARBLED_PATTERNS = [
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
const REFERENCE_ONLY_PATTERNS = [
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

// =============================================================================
// INLINE OBSCURE DEFINITION CHECK (used by extractJastrowDefinition)
// These patterns detect wrong homograph meanings BEFORE they're returned
// This is the CRITICAL fix - we check patterns AT EXTRACTION TIME
// =============================================================================
const QUICK_REJECT_PATTERNS = [
  // Abstract nouns that are wrong homographs for common Talmudic words
  /^(?:poverty|wretchedness|misery|trouble|calamity|ruin|destruction)$/i,
  /^(?:intermission|bisection|carelessness|custom|issue|outgo|output|debt)$/i,
  // "a X" / "an X" obscure nouns - wrong meanings for common words
  /^an?\s+(?:debt|flash|injunction|utterance|issuance|outgo|signal|encampment)/i,
  /^an?\s+(?:musical|portion|yoke|gnat|louse|dwelling|bath|measure)/i,
  /^an?\s+(?:stringed\s+instrument|Hebrew\s+measure)/i,
  // Known transliterations that appear as "definitions" - explicit list only
  // NOTE: Do NOT filter all short words - "king", "rest", "hand" are valid!
  /^(?:kanas|nephaq|tsav|gav|reshut|nafak|sarah|moshe|tima|tama|hen|jah|ath|eth|vav)$/i,
  // BDB format garbage: "word . Hebrew verb"
  /^[a-z]+\s*\.\s*[\u0590-\u05FF]/i,
  // Adverbs that are often wrong homograph meanings
  /^(?:properly|certainly|surely|truly|verily)$/i,
  // Single-word interjections (often wrong for pronouns like הן)
  /^(?:behold|lo|indeed|alas)$/i,
];

/**
 * Quick check if a definition should be rejected
 * Used by extractJastrowDefinition to filter bad results BEFORE returning
 * This prevents "poverty", "a debt", "kanas" etc. from ever being returned
 */
const shouldRejectDefinition = (def) => {
  if (!def) return true;
  const trimmed = def.trim();
  if (trimmed.length < 2) return true;
  for (const pattern of QUICK_REJECT_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
};

/**
 * Extract the ACTUAL definition from a Jastrow-style dictionary entry
 * Pattern: "headword (grammar) DEFINITION. references..."
 * We want just "DEFINITION"
 *
 * SMART: Rejects proper noun entries AND obscure noun definitions
 * Now checks QUICK_REJECT_PATTERNS before returning ANY definition
 */
const extractJastrowDefinition = (text) => {
  if (!text) return null;

  // Remove leading Hebrew headword and grammar markers
  let cleaned = text
    .replace(/^[\u0590-\u05FF\s]+/g, '') // Leading Hebrew
    .replace(/^[IVX]+\s+/g, '')          // Roman numeral
    .replace(/^[mfn]\.\s*/i, '')         // Gender marker
    .replace(/^\([^)]+\)\s*/g, '')       // Parenthetical grammar info
    .replace(/^ch\.\s*=?\s*h\.\s*/i, '') // "ch. = h." marker
    .replace(/^pr\.?\s*n\.?\s*/i, '')    // "pr.n." proper noun marker
    .trim();

  // EARLY CHECK: Reject if this looks like a proper noun entry
  // Pattern: "hen I", "Adam II", "Moses" (just a name)
  if (/^[a-z]+\s+[IVX]+$/i.test(cleaned)) {
    return null; // "hen I" = person named Hen #1
  }
  if (/^[A-Z][a-z]+$/.test(cleaned)) {
    // Single capitalized word - likely a proper name
    // Exception: common English words
    const allowedCaps = ['King', 'Lord', 'God', 'Law', 'Torah', 'Sabbath', 'Heaven', 'Earth'];
    if (!allowedCaps.includes(cleaned)) {
      return null;
    }
  }

  // Common Jastrow patterns for actual definitions
  // Pattern 1: Definition followed by period then example
  // "poverty. Midr. Till. to Ps..."
  const periodMatch = cleaned.match(/^([a-zA-Z][^.]{2,50})\./);
  if (periodMatch) {
    const def = periodMatch[1].trim();
    // Make sure it's not just a reference or proper noun
    if (!/^(v\.|see|cf\.|cmp\.)/i.test(def) && def.length > 2) {
      // Check if extracted def is a proper noun
      if (!/^[a-z]+\s+[IVX]+$/i.test(def) && !/^[A-Z][a-z]+$/.test(def)) {
        // CRITICAL FIX: Check against obscure patterns BEFORE returning
        if (!shouldRejectDefinition(def)) {
          return def;
        }
      }
    }
  }

  // Pattern 2: "to X, to Y" verbs - these are almost always correct
  const verbMatch = cleaned.match(/^(to\s+[a-z]+(?:,\s*to\s+[a-z]+)*)/i);
  if (verbMatch) {
    return verbMatch[1]; // Verb definitions are reliable, no rejection check needed
  }

  // Pattern 3: Comma-separated definitions "king, ruler, sovereign"
  const commaMatch = cleaned.match(/^([a-zA-Z][a-zA-Z,\s]{2,40}?)(?:\.|;|\()/);
  if (commaMatch) {
    const def = commaMatch[1].trim().replace(/,\s*$/, '');
    if (!/^(v\.|see|cf\.)/i.test(def)) {
      // Check not a proper noun
      if (!/^[a-z]+\s+[IVX]+$/i.test(def)) {
        // CRITICAL FIX: Check against obscure patterns
        if (!shouldRejectDefinition(def)) {
          return def;
        }
      }
    }
  }

  // Pattern 4: Just the first word(s) before any punctuation
  const simpleMatch = cleaned.match(/^([a-zA-Z][a-zA-Z\s]{1,30}?)(?:\.|,|;|\(|\[)/);
  if (simpleMatch) {
    const def = simpleMatch[1].trim();
    // Check not a proper noun
    if (!/^[a-z]+\s+[IVX]+$/i.test(def) && !/^[A-Z][a-z]+$/.test(def)) {
      // CRITICAL FIX: Check against obscure patterns
      if (!shouldRejectDefinition(def)) {
        return def;
      }
    }
  }

  return null;
};

/**
 * Clean and format a dictionary definition for display
 * Enhanced with garbled text detection and quality validation
 *
 * @param {string} text - Raw definition text
 * @param {Object} options - Cleaning options
 * @param {number} options.maxLength - Maximum length (default: 180)
 * @param {boolean} options.forHover - Optimize for hover tooltip (shorter)
 * @param {boolean} options.removeReferences - Remove scholarly references
 * @param {boolean} options.removeHebrew - Remove Hebrew text from definition
 * @param {boolean} options.strictQuality - Reject garbled/low quality definitions
 * @returns {string} - Cleaned definition text
 */
export const cleanDefinition = (text, options = {}) => {
  const {
    maxLength = 180,
    forHover = false,
    removeReferences = true,
    removeHebrew = true,
    strictQuality = true
  } = options;

  if (!text || typeof text !== 'string') return '';

  // FIRST: Try to extract Jastrow-style definition
  const jastrowDef = extractJastrowDefinition(text);
  if (jastrowDef && jastrowDef.length >= 3 && jastrowDef.length <= 60) {
    return jastrowDef;
  }

  let cleaned = text;

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // EARLY REJECTION: Detect garbled/notation-heavy text
  if (strictQuality) {
    for (const pattern of GARBLED_PATTERNS) {
      if (pattern.test(cleaned)) return '';
    }
    // Reject reference-only definitions (cross-references to other entries)
    for (const pattern of REFERENCE_ONLY_PATTERNS) {
      if (pattern.test(cleaned)) return '';
    }
  }

  // Remove Hebrew/Aramaic text if requested (headwords, references)
  if (removeHebrew) {
    cleaned = cleaned.replace(/^[\u0590-\u05FF\s,;.]+/g, ''); // Leading Hebrew
    cleaned = cleaned.replace(/\([^)]*[\u0590-\u05FF][^)]*\)/g, ''); // Hebrew in parens
  }

  if (removeReferences) {
    // Remove Talmudic/scholarly references - EXPANDED
    cleaned = cleaned
      // Talmudic tractate references
      .replace(/\b[YB]\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d]+,?\s*\d*[a-dᵃᵇᶜᵈ]?\s*(top|bot|mid)?/gi, '')
      .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s]+/gi, '')
      .replace(/\b(Gen|Ex|Lev|Num|Deut|Pes|Ber|Shab|Sanh|Ps|Isa|Jer)\.\s*R?\.\s*[IVXLCDM\d:,\s]+/gi, '')
      // Cross-references
      .replace(/\bv\.\s*[\u0590-\u05FF]+/g, '')
      .replace(/\bv\.\s*[^\s,;]+/gi, '') // v. word = see word
      .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
      .replace(/\bcf\.\s*[^,;.]+/gi, '')
      .replace(/\bcmp\.\s*[^,;.]+/gi, '')
      .replace(/\bs\.\s*v\.?/gi, '')
      .replace(/\bib\.?\s*\d*/gi, '')
      .replace(/\bq\.?\s*v\.?\b/gi, '')
      // Manuscript references
      .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
      .replace(/\bVar\.\s*\w+/gi, '')
      // Language notation
      .replace(/\(b\.?\s*h\.?\)/gi, '') // (b.h.) = biblical Hebrew
      .replace(/\(m\.?\s*h\.?\)/gi, '') // (M.H.) = Mishnaic Hebrew
      .replace(/\(n\.?\s*h\.?\)/gi, '') // (N.H.) = New Hebrew
      .replace(/\(a\.?\s*h\.?\)/gi, '') // (a.h.) = Aramaic/Hebrew
      .replace(/\(ch\.?\)/gi, '')        // (CH) = Chaldean
      .replace(/\(nh\.?\)/gi, '')
      .replace(/\(bh\.?\)/gi, '')
      .replace(/\(mh\.?\)/gi, '')
      // Bracketed references
      .replace(/\[[^\]]{1,30}\]/g, '')
      // Em-dash references
      .replace(/—[\u0590-\u05FF\s,]+/g, '')
      // Strong's numbers
      .replace(/\bH\d{1,5}\b\.?\s*/gi, '')
      .replace(/\bStrong[''']?s?\s*#?\d+/gi, '')
      // Roman numerals (headings)
      .replace(/^[IVX]+\.\s*/g, '')
      .replace(/\b[IVXLCDM]+[,\s]*\d*[a-d]?\b/g, '')
      // Page references
      .replace(/\d+[a-d]?\s*(top|bot|mid)?/gi, '');
  }

  // Remove grammatical abbreviations
  cleaned = cleaned
    .replace(/^[mfn]\.\s*/i, '')    // gender markers
    .replace(/^ch\.\s*/i, '')       // Chaldean
    .replace(/^adj\.\s*/i, '')      // adjective
    .replace(/^adv\.\s*/i, '')      // adverb
    .replace(/^subst\.\s*/i, '')    // substantive
    .replace(/^v\.\s*/i, '')        // verb
    .replace(/^pr\.\s*n\.\s*/i, '') // proper noun
    .replace(/^interj\.\s*/i, '')   // interjection
    .replace(/^prep\.\s*/i, '')     // preposition
    .replace(/^conj\.\s*/i, '')     // conjunction
    // Common notation debris
    .replace(/\b(?:preced\.?|foll\.?|esp\.?|freq\.?|part\.?|pl\.?|sing\.?|lit\.?|fig\.?)\s*/gi, '')
    .replace(/\b(?:constr\.?|abs\.?|act\.?|pass\.?|inf\.?|imp\.?|perf\.?)\s*/gi, '');

  // Clean up punctuation
  cleaned = cleaned
    .replace(/,\s*,/g, ',')
    .replace(/;\s*;/g, ';')
    .replace(/\.{3,}/g, '...')
    .replace(/^\s*[,;.—-]+\s*/g, '') // Leading punctuation
    .replace(/\s*[,;—-]+\s*$/g, '')  // Trailing punctuation
    .replace(/,\s*i$/i, '')          // Remove truncated ", i" from "i.e."
    .replace(/\s+i$/i, '')           // Remove lone trailing "i"
    .replace(/^\{[^}]+\}$/, '')      // Remove bracketed-only content
    .replace(/^\([^)]*$/, '')        // Remove unclosed parentheses
    .replace(/\s+/g, ' ')
    .trim();

  // Quality check: ensure meaningful content
  if (strictQuality) {
    // CRITICAL: Check for wrong definition patterns FIRST
    // These are the main filters for garbage Strong's/BDB definitions
    if (isObscureNounDefinition(cleaned)) return '';
    if (isTransliterationOnly(cleaned)) return '';
    if (isProperNounEntry(cleaned)) return '';

    // POST-CLEAN check: After cleaning, we might have just a transliteration left
    // e.g., "sarah . שָׂרָה verb persist" → "sarah" after Hebrew removal
    // Only filter KNOWN transliterations, not all short words (to preserve "king", "stoning", etc.)
    // COMPREHENSIVE LIST - matches TRANSLITERATION_PATTERNS for consistency
    const KNOWN_TRANSLITERATIONS = /^(?:sarah|kanas|nephaq|tsav|gav|reshut|nafak|moshe|adam|hen|jah|shabbat|yom|kol|ben|bar|tov|ra|chai|met|ish|isha|av|em|bat|am|goy|tama|tima|baal|cohen|kohen|levi|torah|mitzvah|mitzva|tefila|bracha|beracha|shema|kadosh|kodesh|olam|malakh|malach|chesed|hesed|emeth|emet|tzedek|tsedek|shalom|kavod|ruach|nefesh|neshamah|lev|shamayim|eretz|mayim|avodah|korban|ohel|mishkan|mikdash|beit|bayit|kedusha|tahara|tumah|issur|heter|gemara|sugya|amora|tanna|halakha|halacha|aggada|midrash|tosefta|baraita|mishna|masechet|dina|alma|milta|gavra|mara|rav|rabbi|abba|ima|beith|ath|eth|vav|waw)$/i;
    if (KNOWN_TRANSLITERATIONS.test(cleaned)) {
      return ''; // Known transliteration, not a definition
    }

    const words = cleaned.split(/\s+/).filter(w => w.length > 1);
    const meaningfulWords = words.filter(w =>
      /^[a-zA-Z]+$/.test(w) && w.length > 2 &&
      !['the', 'and', 'for', 'that', 'with', 'from', 'this', 'into', 'onto', 'same', 'ace'].includes(w.toLowerCase())
    );

    // Need at least 1-2 meaningful words
    if (meaningfulWords.length < 1 && cleaned.length > 15) {
      // Check if it's a simple valid definition like "king" or "to rule"
      if (!/^(?:to\s+)?[a-z]+$/i.test(cleaned)) {
        return '';
      }
    }

    // Final validation: must have English content
    const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (englishChars < 3) return '';
  }

  // For hover, use shorter length
  const targetLength = forHover ? Math.min(maxLength, 100) : maxLength;

  // Truncate if too long - SMART TRUNCATION: never cut mid-word
  if (cleaned.length > targetLength) {
    const truncateAt = (str, delim, minPos) => {
      const pos = str.lastIndexOf(delim);
      return pos > minPos ? pos : -1;
    };

    const minCutoff = targetLength * 0.5; // Allow more flexibility
    const searchStr = cleaned.substring(0, targetLength);

    // Try to cut at natural break points (preferred order)
    let cutPoint = truncateAt(searchStr, ';', minCutoff);
    if (cutPoint === -1) cutPoint = truncateAt(searchStr, '.', minCutoff);
    if (cutPoint === -1) cutPoint = truncateAt(searchStr, ',', minCutoff);
    if (cutPoint === -1) cutPoint = truncateAt(searchStr, ' ', minCutoff);

    // IMPORTANT: Always cut at word boundary, never mid-word
    if (cutPoint === -1) {
      // Find last space before targetLength
      const lastSpace = searchStr.lastIndexOf(' ');
      if (lastSpace > 5) {
        cutPoint = lastSpace;
      } else {
        cutPoint = targetLength - 3;
      }
    }

    if (cutPoint > 5) {
      cleaned = cleaned.substring(0, cutPoint).trim();
      // Only add ellipsis if we actually truncated meaningful content
      if (cutPoint < cleaned.length - 5) {
        cleaned += '...';
      }
    } else {
      cleaned = cleaned.substring(0, targetLength - 3).trim() + '...';
    }
  }

  // Normalize articles (a/an) in the final cleaned text
  cleaned = normalizeArticles(cleaned);

  return cleaned;
};

/**
 * Extract cross-reference target from Jastrow notation
 * @param {string} definition - Raw definition like "→ שַׁבָּת" or "v. שָׁבַת"
 * @returns {string|null} - Hebrew word to look up, or null if not a cross-reference
 */
export const extractCrossReference = (definition) => {
  if (!definition || typeof definition !== 'string') return null;

  const trimmed = definition.trim();

  // Arrow reference: "→ שַׁבָּת" or "→שַׁבָּת"
  const arrowMatch = trimmed.match(/^→\s*([\u0590-\u05FF]+)/);
  if (arrowMatch) return arrowMatch[1];

  // "v. word" reference: "v. שָׁבַת"
  const vMatch = trimmed.match(/^v\.\s*([\u0590-\u05FF]+)/i);
  if (vMatch) return vMatch[1];

  // "see word" reference
  const seeMatch = trimmed.match(/^see\s+([\u0590-\u05FF]+)/i);
  if (seeMatch) return seeMatch[1];

  // "= word" reference
  const eqMatch = trimmed.match(/^=\s*([\u0590-\u05FF]+)/);
  if (eqMatch) return eqMatch[1];

  return null;
};

// Garbage definitions that are just grammatical markers - REJECT these
const GARBAGE_DEFINITIONS = [
  /^(noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun)\.?$/i,
  /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|interj\.|pron\.)$/i,
  /^(masculine|feminine|plural|singular)\.?$/i,
  /^(m\.|f\.|pl\.|sing\.)$/i,
  /^(unknown|uncertain)\.?$/i,
  /^(proper noun|pr\. n\.)$/i,
  /^[mfn]\.\s*$/i,
  /^\s*$/,
];

// =============================================================================
// PROPER NOUN DETECTION
// Dictionary entries for people/places should be SKIPPED for common word lookup
// Pattern: "hen I", "adam II", "Moses III" = multiple people with same name
// Pattern: "Tima, an Amora" = Rabbi's name with title
// =============================================================================
const PROPER_NOUN_PATTERNS = [
  // **CRITICAL** "name of X Israelites" - Jastrow entries for proper names
  /name\s+of\s+(?:\w+\s+)?(?:Israelites?|Amoras?|Tannas?|persons?|rabbis?|men|women)/i,
  // "name of a place", "name of a city"
  /name\s+of\s+(?:a\s+)?(?:place|city|town|village|mountain|river|region)/i,
  // Name followed by Roman numeral (person number): "hen I", "adam II"
  /^[a-z]+\s+[IVX]+$/i,
  // Name followed by number in parens: "hen (1)", "adam (2)"
  /^[a-z]+\s*\(\d+\)$/i,
  // Starts with "pr.n." marker
  /^pr\.?\s*n\.?\s/i,
  // "proper name" marker
  /proper\s+name/i,
  // "n.pr." marker (noun proper)
  /^n\.?\s*pr\.?\s/i,
  // Single capitalized name (but allow phrases like "the king")
  /^[A-Z][a-z]+$/,
  // Name with "son of" pattern
  /^[A-Z][a-z]+\s+(?:son|daughter)\s+of/i,
  // Location marker "in Judah", "of Israel"
  /^(?:in|of|from)\s+[A-Z][a-z]+$/i,
  // BDB format "word . part-of-speech": "hen . pronoun", "tsav . noun"
  /^[a-z]+\s*\.\s*(?:pronoun|noun|verb|adj|adv|prep|conj|interj)/i,
  // Rabbi/person names with titles: "Tima, an Amora", "Rav Huna", "Rabbi Akiva"
  /^[A-Za-z]+,?\s+(?:an?\s+)?(?:Amora|Tanna|Sage|Rabbi|Rav|Mar|Abba)/i,
  // Name followed by description: "m. Tima, an Amora" (m. = masculine marker)
  /^[mfn]\.\s*[A-Za-z]+,?\s+(?:an?\s+)?(?:Amora|Tanna|Sage)/i,
  // Place names with location markers
  /^[A-Za-z]+,?\s+(?:a city|a town|a village|in\s+)/i,
  // "m. = אוּמָד" format (gender marker = Hebrew word) - not a real definition
  /^[mfn]\.\s*=\s*[\u0590-\u05FF]/,
  // "בי"ת Beth" format - Hebrew + transliteration only
  /^[\u0590-\u05FF]+\s+[A-Z][a-z]+$/,
];

// =============================================================================
// SMART HOMOGRAPH DETECTION
// Instead of hardcoding specific wrong definitions, use SEMANTIC ANALYSIS:
// - Function words (מן, על, ב, ל, כ) should have GRAMMATICAL definitions
// - Nouns like "a musical chord" are wrong for common function words
// - Detect by definition PATTERN, not specific words
// =============================================================================

/**
 * GRAMMATICAL DEFINITION PATTERNS
 * These are patterns that indicate a word is being used grammatically
 * (preposition, conjunction, particle, etc.)
 */
const GRAMMATICAL_PATTERNS = [
  // Prepositions
  /^(from|to|in|on|upon|at|by|with|for|of|into|onto|against|before|after|under|over|between|among|through|about|concerning)$/i,
  // Conjunctions
  /^(and|or|but|that|which|who|whom|because|if|when|while|although|though|whether|since|until|unless|so|yet|nor)$/i,
  // Particles/demonstratives
  /^(the|this|that|these|those|what|how|there|here|thus|so|then|now|not|no|yes|also|even|only|just|very|more)$/i,
  // Pronouns
  /^(he|she|it|they|we|you|I|him|her|them|us|me|his|hers|its|their|our|my|your)$/i,
  // Question words
  /^(who|what|where|when|why|how|which|whose)$/i,
  // Relative particles
  /^(that which|which is|who is|where|when|because|since)$/i,
  // Short preposition phrases
  /^(in the|to the|from the|on the|with the|by the|for the)$/i,
];

/**
 * OBSCURE NOUN PATTERNS
 * Definitions that are clearly NOUNS (not grammatical) and likely wrong for common words
 * These are patterns, not specific words - DICTIONARY-DRIVEN
 */
const OBSCURE_NOUN_PATTERNS = [
  // "a X" or "an X" pattern where X is an obscure/technical noun
  /^an?\s+(?:musical|portion|yoke|gnat|louse|debt|flash|signal|encampment|dwelling)/i,
  /^an?\s+(?:outgo|injunction|utterance|issuance|bath|Hebrew measure|custom)/i,
  // Musical/technical terms that are almost never right in Talmudic context
  /^an?\s+(?:musical\s+chord|stringed\s+instrument)/i,
  // Scientific/technical terms unlikely for common Talmudic words
  /^(?:an?\s+)?(?:insect|pest|parasite|reptile|amphibian)/i,
  // Rare concrete nouns
  /^(?:an?\s+)?(?:strap|thong|cord|string|rope|whip|lash)/i,
  // Abstract nouns that are rarely primary meanings (EXPANDED)
  /^(?:calamity|ruin|destruction|poverty|wretchedness|misery|trouble|intermission|bisection|carelessness)$/i,
  // Physical objects unlikely for function words
  /^(?:an?\s+)?(?:vessel|container|pot|jar|utensil)/i,
  // BDB format showing wrong entry: "sarah . שָׂרָה verb persist" or "word . Hebrew definition"
  /^[a-z]+\s*\.\s*[\u0590-\u05FF]+\s+(?:verb|noun|adj)/i,
  /^[a-z]+\s+[\u0590-\u05FF]+\s+verb\b/i,
  // Truncated definitions with "i" at end (from "i.e." or similar)
  /,\s*i$/i,
  /\s+i$/i,  // Ends with lone "i" with space before
  // Truncated definitions: "word, i" pattern
  /^[a-z]+,\s*i$/i,
  // Adverbs that are often wrong (e.g., "properly" for נדבה)
  /^(?:properly|certainly|surely|truly)$/i,
  // Bracketed content that got extracted wrong
  /^\{[^}]+\}$/,
  // Definition is just a measure/unit description
  /^(?:a\s+)?(?:bath|measure|liquid measure)/i,
  // Parenthetical fragments: "( Pfl.", "(word" without closing
  /^\(\s*[A-Za-z]+\.?\s*$/,
  // Just "issue" or similar single vague noun (often wrong homograph)
  /^(?:issue|outgo|output|debt|trouble|custom)$/i,
  // Starts with lowercase then has Hebrew + verb (BDB format)
  /^[a-z]+\s+[\u0590-\u05FF]+\s+(?:verb|noun|adj|to\s)/i,
  // Numbers and codes (Strong's number only, no definition)
  /^H\d{4,5}$/i,
  // Two prepositions together (parse error): "in on", "to from", etc.
  /^(?:in|on|to|from|at|by|with|for)\s+(?:in|on|to|from|at|by|with|for)$/i,
  // Single number/digit definitions
  /^\d+$/,
  // Jastrow reference format: "* תּוֹכָה f. (v."
  /^\*\s*[\u0590-\u05FF]+\s*[mfn]\.\s*\(/,
  // Just a Hebrew word with parenthetical: "* תּוֹכָה f. (v. תּוֹךְ"
  /^\*?\s*[\u0590-\u05FF]+\s*[mfn]?\.\s*\(v\./i,
  // Object marker (particle, not definition): "(object marker)"
  /^\(?object\s*marker\)?$/i,
  // Just says "prefix" or "suffix" (with optional number)
  /^(?:\d+\)\s*)?prefix$/i,
  /^(?:\d+\)\s*)?suffix$/i,
  // Numbered entries: "1) prefix", "2) word", etc. - dictionary notation
  /^\d+\)\s*\w+$/,
  // NOTE: Short words (2-4 letters) are NOT filtered here by length alone
  // Valid definitions like "king", "rest", "hand", "from", "they" would be lost
  // Known transliterations are filtered explicitly in TRANSLITERATION_PATTERNS
];

/**
 * Check if a definition looks grammatical (preposition, conjunction, etc.)
 * @param {string} def - Definition text
 * @returns {boolean} - True if grammatical
 */
const isGrammaticalDefinition = (def) => {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim().toLowerCase();

  // Very short = likely grammatical
  if (trimmed.length <= 6) return true;

  // Check patterns
  for (const pattern of GRAMMATICAL_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
};

/**
 * Check if a definition looks like an obscure noun (likely wrong for common words)
 * @param {string} def - Definition text
 * @returns {boolean} - True if this looks like a wrong/obscure noun entry
 */
function isObscureNounDefinition(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check patterns
  for (const pattern of OBSCURE_NOUN_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

// =============================================================================
// TRANSLITERATION-ONLY DETECTION
// BDB/Strong's sometimes returns just the transliteration without definition
// These should be SKIPPED - they're not useful translations
// =============================================================================
const TRANSLITERATION_PATTERNS = [
  // Transliteration with special vowel marks REQUIRED: "kānās", "shābhāth"
  // Must contain at least one diacritic (ā, ē, ī, ō, ū, â, ê, î, ô, û, ḥ, ṣ, etc.) to match
  // This prevents filtering valid English words like "king", "rest", "stoning"
  /^[a-zāēīōūâêîôûḥṣśṭ]*[āēīōūâêîôûḥṣśṭ][a-zāēīōūâêîôûḥṣśṭ]*$/i,
  // Hebrew transliteration followed by Hebrew: "nephaq נְפַק"
  /^[a-z]+\s+[\u0590-\u05FF]/i,
  // Common Hebrew/Aramaic transliterations that are NOT definitions
  // Expanded list based on actual dictionary entries that get confused with definitions
  /^(?:kanas|nephaq|tsav|gav|reshut|nafak|shabbat|yom|kol|ben|bar|sarah|moshe|adam|hen|jah|tov|ra|chai|met|ish|isha|av|em|bat|am|goy|tama|tima)$/i,
  /^(?:baal|cohen|kohen|levi|torah|mitzvah|mitzva|tefila|bracha|beracha|shema|kadosh|kodesh|olam|malakh|malach)$/i,
  /^(?:chesed|hesed|emeth|emet|tzedek|tsedek|shalom|kavod|ruach|nefesh|neshamah|lev|shamayim|eretz|mayim)$/i,
  /^(?:avodah|korban|ohel|mishkan|mikdash|beit|bayit|kedusha|tahara|tumah|issur|heter)$/i,
  // Aramaic transliterations (Talmudic terms)
  /^(?:gemara|sugya|amora|tanna|halakha|halacha|aggada|midrash|tosefta|baraita|mishna|masechet)$/i,
  /^(?:dina|alma|milta|gavra|isha|mara|rav|rabbi|abba|ima|bar|bat|beith|beit)$/i,
  // Definition in brackets (Strong's format) - usually just transliteration
  /^\([a-z]{2,10}\)$/i,
  // Parenthetical at start with just letters: "(Pfl." etc.
  /^\(\s*[A-Za-z]{2,6}\.?\s*$/,
];

/**
 * Check if definition is just a transliteration (not a real translation)
 * IMPORTANT: Be conservative - only filter KNOWN transliterations
 * Valid short words like "king", "rest", "from" should NOT be filtered
 */
function isTransliterationOnly(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check explicit patterns only - don't filter based on length alone
  // Many valid English definitions are short: "king", "from", "cut", "rest"
  for (const pattern of TRANSLITERATION_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

/**
 * Check if a definition looks like a proper noun entry
 * These should be SKIPPED when looking up common words
 * @param {string} def - Definition text
 * @returns {boolean} - True if this looks like a proper noun
 */
function isProperNounEntry(def) {
  if (!def || typeof def !== 'string') return false;
  const trimmed = def.trim();

  // Check against proper noun patterns
  for (const pattern of PROPER_NOUN_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Additional check: very short text that's just a capitalized name
  // "Hen", "Adam", "Moses" - but NOT "king", "ruler", "they"
  if (/^[A-Z][a-z]{1,10}$/.test(trimmed)) {
    // Common nouns that happen to start with capital are OK
    const commonCapitalized = ['King', 'Lord', 'God', 'Law', 'Torah', 'Sabbath'];
    if (!commonCapitalized.includes(trimmed)) {
      return true;
    }
  }

  return false;
};

/**
 * Extract the most meaningful part from a comma-separated definition
 *
 * @param {string} definition - Full definition text
 * @param {Object} options - Options
 * @param {boolean} options.returnCrossRef - If true, return cross-reference target instead of null
 * @returns {string|null} - Best meaningful part, cross-ref target (prefixed with "→"), or null
 */
export const pickBestDefinition = (definition, options = {}) => {
  if (!definition || typeof definition !== 'string') return null;

  const { returnCrossRef = false } = options;
  const trimmed = definition.trim();

  // FIRST: Reject garbage definitions (just "noun", "verb", etc.)
  for (const pattern of GARBAGE_DEFINITIONS) {
    if (pattern.test(trimmed)) return null;
  }

  // SECOND: Reject proper noun entries ("hen I", "Adam II", etc.)
  // These are dictionary entries for PEOPLE, not common words
  if (isProperNounEntry(trimmed)) {
    return null;
  }

  // THIRD: Smart homograph detection (DICTIONARY-DRIVEN, not hardcoded)
  // Reject obscure noun definitions for what are likely function words
  // Uses SEMANTIC ANALYSIS of definition patterns
  if (isObscureNounDefinition(trimmed)) {
    return null;
  }

  // FOURTH: Reject transliteration-only definitions
  // e.g., "kanas" instead of "to gather, assemble"
  if (isTransliterationOnly(trimmed)) {
    return null;
  }

  // Check for cross-reference - return target word if requested
  const crossRef = extractCrossReference(trimmed);
  if (crossRef) {
    // Return cross-reference target prefixed with → so caller can follow it
    return returnCrossRef ? `→${crossRef}` : null;
  }

  // Check against reference-only patterns
  for (const pattern of REFERENCE_ONLY_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  // Check for garbled patterns
  for (const pattern of GARBLED_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  // SECOND: Try Jastrow-style extraction for long entries
  const jastrowDef = extractJastrowDefinition(trimmed);
  if (jastrowDef && jastrowDef.length >= 3 && jastrowDef.length <= 60) {
    return jastrowDef;
  }

  // Words/patterns to skip
  const skipPatterns = /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|interj\.|pl\.|sing\.|m\.|f\.|lit\.|fig\.)$/i;
  const skipWords = ['or', 'and', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'as', 'at', 'by'];

  const isMeaningful = (text) => {
    if (!text) return false;
    const cleaned = text.trim().toLowerCase();
    if (cleaned.length < 3) return false;
    if (skipWords.includes(cleaned)) return false;
    if (skipPatterns.test(cleaned)) return false;
    if (/^[\d\s.,:;!?]+$/.test(cleaned)) return false;
    if (cleaned.length > 80) return false;
    // Reject reference-only parts
    if (/^(?:preced|foll|same|ib|id|cf|cmp|v)\./i.test(cleaned)) return false;
    // Reject garbage definitions
    for (const pattern of GARBAGE_DEFINITIONS) {
      if (pattern.test(cleaned)) return false;
    }
    // Reject proper noun entries ("hen I", "Adam II")
    if (isProperNounEntry(text.trim())) return false;
    return true;
  };

  // If has commas, pick first meaningful part
  if (definition.includes(',')) {
    const parts = definition.split(',').map(p => p.trim()).filter(isMeaningful);
    if (parts.length > 0) return parts[0];
  }

  // If very long, get first part before parentheses
  if (definition.length > 80) {
    const match = definition.match(/^([^(;]+)/);
    if (match && isMeaningful(match[1])) {
      return match[1].trim();
    }
  }

  // Check whole definition
  const cleaned = definition.replace(/[,;.]+$/, '').trim();
  return isMeaningful(cleaned) ? cleaned : null;
};

/**
 * Format a definition for tooltip display
 *
 * @param {string} definition - Definition text
 * @param {string} source - Source name (BDB, Jastrow, etc.)
 * @returns {string} - Formatted tooltip text
 */
export const formatForTooltip = (definition, source = '') => {
  const cleaned = cleanDefinition(definition, { forHover: true, maxLength: 100 });
  if (!cleaned) return '';
  return source ? `${cleaned} (${source})` : cleaned;
};

/**
 * Follow a cross-reference in a dictionary definition
 * This enables DYNAMIC lookup instead of hardcoding translations
 *
 * When Jastrow returns "→ שַׁבָּת", instead of returning null, we:
 * 1. Extract the target word "שַׁבָּת"
 * 2. Look it up in the dictionary
 * 3. Return the real definition
 *
 * @param {string} definition - Raw definition that might be a cross-reference
 * @param {Function} lookupFn - Function to look up the target word (sync)
 * @param {number} maxDepth - Maximum recursion depth (default: 3)
 * @param {Set} visited - Track visited words to prevent infinite loops
 * @returns {object|null} - { resolvedDefinition, chain: ['word1', 'word2', ...] }
 */
export const followCrossReference = (definition, lookupFn, maxDepth = 3, visited = new Set()) => {
  if (!definition || typeof definition !== 'string' || maxDepth <= 0) return null;

  const targetWord = extractCrossReference(definition);
  if (!targetWord) return null;

  // Prevent infinite loops
  if (visited.has(targetWord)) {
    return null;
  }
  visited.add(targetWord);

  // Look up the target word
  const result = lookupFn(targetWord);
  if (!result) return null;

  // Check if the result is ALSO a cross-reference (chain following)
  const targetDef = result.definition || result.english || result.shortDefinition;
  const nested = extractCrossReference(targetDef);

  if (nested && maxDepth > 1) {
    // Follow the chain
    const chainResult = followCrossReference(targetDef, lookupFn, maxDepth - 1, visited);
    if (chainResult) {
      return {
        resolvedDefinition: chainResult.resolvedDefinition,
        chain: [targetWord, ...chainResult.chain],
        finalWord: chainResult.finalWord || targetWord
      };
    }
  }

  // We found a real definition (not a cross-reference)
  const cleanDef = pickBestDefinition(targetDef, { returnCrossRef: false });
  if (cleanDef) {
    return {
      resolvedDefinition: cleanDef,
      chain: [targetWord],
      finalWord: targetWord
    };
  }

  return null;
};

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

const definitionCleaner = {
  cleanDefinition,
  pickBestDefinition,
  formatForTooltip,
  extractCrossReference,
  followCrossReference,
  isProperNounEntry,
  isGrammaticalDefinition,
  isObscureNounDefinition,
  scoreDefinition,
  pickBestFromCandidates,
  // PRO SCHOLAR v2: Context-aware source prioritization
  CONTEXT_MODES,
  SOURCE_PRIORITIES,
  getSourcePriority,
  shouldSkipSource,
};

export default definitionCleaner;
