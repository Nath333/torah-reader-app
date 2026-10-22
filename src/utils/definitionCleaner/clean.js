// =============================================================================
// Nettoyage des définitions — rejet rapide, extraction Jastrow, nettoyage
// complet (références, notations, articles), extraction de cross-references.
// (extrait de definitionCleaner.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { normalizeArticles } from '../articleUtils';
import { GARBLED_PATTERNS, REFERENCE_ONLY_PATTERNS } from './contextConfig';
import { isObscureNounDefinition, isTransliterationOnly, isProperNounEntry } from './classifiers';

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
export const extractJastrowDefinition = (text) => {
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

