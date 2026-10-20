// =============================================================================
// Nettoyage du texte des définitions — Jastrow/BDB et notation savante
// (extrait de scholarlyLexiconService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { cleanHtml } from '../../../utils/sanitize';

/**
 * Clean definition text - removes HTML, scholarly notation, and normalizes
 * Enhanced to handle Jastrow and other scholarly dictionary notation
 * @param {string} text - Raw definition text
 * @returns {string} - Cleaned text
 */
export const cleanDefinitionText = (text) => {
  if (!text || typeof text !== 'string') return '';

  // First strip HTML tags
  let cleaned = cleanHtml(text);

  // Remove Talmudic/Targum references (Jastrow-specific patterns)
  cleaned = cleaned
    // Remove Talmudic tractate references (Y. Shebi. VII, 37ᶜ top, Targ. Ex. I, 16, etc.)
    .replace(/\bY\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d]+,?\s*\d*[a-dᵃᵇᶜᵈ]?\s*(top|bot|mid)?/gi, '')
    .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bGen\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bEx\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bLev\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bNum\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bDeut\.\s*R\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bPes\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bBer\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bShab\.\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bSanh\.\s*[IVXLCDM\d,\s]+/gi, '')
    // Remove cross-references (v. דָּא, a. v. fr., etc.)
    .replace(/\bv\.\s*[\u0590-\u05FF]+/g, '')
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
    .replace(/\bch\.\s*same\.?/gi, '')
    .replace(/\bs\.\s*v\.?/gi, '')
    .replace(/\bib\.?/gi, '')
    .replace(/\bib\s*\d+/gi, '')
    // Remove manuscript references
    .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
    .replace(/\bVar\.\s*\w+/gi, '')
    .replace(/\bArukh\s*\w*/gi, '')
    // Remove "fr." and other frequency markers
    .replace(/\ba\.\s*fr\./gi, '')
    .replace(/\bfreq\./gi, '')
    .replace(/\b&c\.?/gi, '')
    // Remove em-dashes with Hebrew text after (cross-refs)
    .replace(/—[\u0590-\u05FF\s,]+/g, '')
    .replace(/—\s*v\.\s*[\u0590-\u05FF]+/g, '');

  // Remove common scholarly notation patterns
  cleaned = cleaned
    // Remove Jastrow language cross-reference notations (empty references to other dictionaries)
    .replace(/^\s*\(b\.?\s*h\.?\)\s*$/gi, '')  // Whole text is just "(b. h.)"
    .replace(/\(b\.?\s*h\.?\)/gi, '')           // (b. h.) or (b.h.) = biblical Hebrew reference
    .replace(/\(a\.?\s*h\.?\)/gi, '')           // (a. h.) = Aramaic/Hebrew
    .replace(/\(m\.?\s*h\.?\)/gi, '')           // (M. H.) = Mishnaic Hebrew
    .replace(/\(n\.?\s*h\.?\)/gi, '')           // (N. H.) = New Hebrew
    .replace(/\(nh\.?\)/gi, '')                 // (NH) = New Hebrew variant
    .replace(/\(bh\.?\)/gi, '')                 // (BH) = Biblical Hebrew variant
    .replace(/\(mh\.?\)/gi, '')                 // (MH) = Mishnaic Hebrew variant
    .replace(/\(ch\.?\)/gi, '')                 // (CH) = Chaldean/late Aramaic
    .replace(/\(a hapax legomenon[^)]*\)/gi, '')
    .replace(/\(occurring[^)]*\)/gi, '')
    .replace(/\(in the c\. st\.[^)]*\)/gi, '')
    .replace(/\(from[^)]*\)/gi, '')
    .replace(/\(cf\.[^)]*\)/gi, '')
    .replace(/\(see[^)]*\)/gi, '')
    .replace(/\(lit\.[^)]*\)/gi, '')
    .replace(/\(fig\.[^)]*\)/gi, '')
    .replace(/\(pl\.[^)]*\)/gi, '')
    .replace(/\(comp\.[^)]*\)/gi, '')
    .replace(/\(cmp\.[^)]*\)/gi, '')
    .replace(/\(v\.[^)]*\)/gi, '')              // (v. ...) = see/verse reference
    .replace(/\[[^\]]*\]/g, '') // Remove bracketed references
    // Clean up punctuation issues
    .replace(/,\s*,/g, ',')
    .replace(/;\s*;/g, ';')
    .replace(/^\s*[,;.—-]+\s*/g, '') // Remove leading punctuation
    .replace(/\s*[,;—-]+\s*$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();

  // If result is mostly Hebrew text or references, return empty
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  const totalChars = cleaned.replace(/\s/g, '').length;
  if (totalChars > 0 && englishChars / totalChars < 0.3 && totalChars > 5) {
    // Mostly non-English, likely just references
    return '';
  }

  // Filter out non-definition metadata phrases
  const metadataPhrases = [
    'with more detail',
    'see entry',
    'see also',
    'compare',
    'note:',
    'note that',
    'for more',
    'details in',
    'fuller treatment',
    'see above',
    'see below',
    'cf. above',
    'cf. below',
    'as above',
    'as below',
  ];
  const lowerCleaned = cleaned.toLowerCase();
  for (const phrase of metadataPhrases) {
    if (lowerCleaned === phrase || lowerCleaned.startsWith(phrase + ' ') ||
        (lowerCleaned.length < 25 && lowerCleaned.includes(phrase))) {
      return '';
    }
  }

  return cleaned;
};

/**
 * Extract the actual English meaning from Jastrow/scholarly definition
 * IMPROVED: Properly extracts numbered senses and stops at examples
 *
 * Jastrow format example:
 *   "רָשׁוּת I  1 poverty. Midr. Till. to Ps. XXIV יש... 2 power, authority. Ned. X, 2..."
 *
 * We want: "poverty; power, authority; dominion; permission"
 * NOT example text like "but his reputation is not in harmony..."
 *
 * @param {string} text - Raw Jastrow definition text
 * @returns {string|null} - Extracted meaning or null
 */
export const extractJastrowMeaning = (text) => {
  if (!text || typeof text !== 'string') return null;

  // First clean HTML
  let cleaned = cleanHtml(text);

  // === STEP 1: Remove Hebrew headword at start ===
  cleaned = cleaned.replace(/^[\u0590-\u05FF]+\s*[IVX]*\s*/, '');

  // === STEP 2: Extract NUMBERED SENSES (1, 2, 3...) ===
  // Jastrow uses "1 definition. Reference... 2 definition. Reference..."
  const numberedSensePattern = /\b(\d)\s+([a-zA-Z][a-zA-Z\s,;'()-]{2,}?)(?=\.\s*[A-Z]|\.\s*[\u0590-\u05FF]|\.\s*\d|\s*$)/g;
  const senses = [];
  let match;

  while ((match = numberedSensePattern.exec(cleaned)) !== null) {
    // match[1] is sense number, match[2] is the definition text
    let senseText = match[2].trim();

    // Stop at first Talmudic reference (indicates example, not definition)
    // Patterns: "Midr.", "Targ.", "Y. ", "B. ", tractate names, etc.
    const refPatterns = [
      /\b(?:Midr|Targ|Yalk|Tosef|Mekh|Sifr[ae]|Cant|Gen|Ex|Lev|Num|Deut|Pes|Ber|Shab|Sabb|Sanh|Ned|Yoma|Meg|Erub|Kidd|Ḥull?|Ḥag|Bets?|Makhsh|Mak)\.\s/i,
      /\b[YB]\.\s*[A-Z]/,           // Y. Ber., B. Kam., etc.
      /\bR\.\s+s\.\s/,              // R. s. = Midrash Rabbah section
      /\s+[IVXLCDM]+[,\s]/,         // Roman numerals (references)
      /\s+\d+[a-dᵃᵇᶜᵈ]/,             // Folio references (22a, 15b)
    ];

    for (const refPattern of refPatterns) {
      const refMatch = senseText.search(refPattern);
      if (refMatch > 3) {
        senseText = senseText.substring(0, refMatch).trim();
      }
    }

    // Clean trailing punctuation
    senseText = senseText.replace(/[,;.\s]+$/, '').trim();

    if (senseText && senseText.length >= 3 && /[a-zA-Z]{3,}/.test(senseText)) {
      senses.push(senseText);
    }
  }

  // If we found numbered senses, join them
  if (senses.length > 0) {
    return senses.slice(0, 4).join('; '); // Max 4 senses for brevity
  }

  // === STEP 3: Fallback - Extract definition before first reference ===
  // Remove grammatical markers first
  cleaned = cleaned
    .replace(/^[mfn]\.\s*/i, '')
    .replace(/^ch\.\s*/i, '')
    .replace(/^adj\.\s*/i, '')
    .replace(/^subst\.\s*/i, '')
    .replace(/^v\.\s*/i, '')
    .replace(/^\([^)]*\)\s*/, '');

  // Stop at first Talmudic reference
  const firstRefPatterns = [
    /\.\s*(?:Midr|Targ|Yalk|Tosef|Gen|Ex|Lev|Num|Deut|Ps|Isa|Jer|Cant|Koh)\.\s/i,
    /\.\s*[YB]\.\s*[A-Z]/,
    /\.\s*[\u0590-\u05FF]/,  // Hebrew text (examples)
    /\.\s*\d+[a-dᵃᵇᶜᵈ]/,     // Folio refs
  ];

  for (const refPat of firstRefPatterns) {
    const idx = cleaned.search(refPat);
    if (idx > 3) {
      cleaned = cleaned.substring(0, idx + 1); // Include the period
      break;
    }
  }

  // Extract English words
  const englishMatch = cleaned.match(/([a-zA-Z][a-zA-Z\s,;'()-]{3,})/);
  if (englishMatch) {
    const extracted = englishMatch[1].replace(/[,;.\s]+$/, '').trim();
    if (extracted.length >= 3 && !isGarbageText(extracted)) {
      return extracted;
    }
  }

  return null;
};

/**
 * Check if text is garbage/meaningless fragments
 * @param {string} text - Text to check
 * @returns {boolean} - True if text is garbage
 */
export const isGarbageText = (text) => {
  if (!text) return true;

  const cleaned = text.trim().toLowerCase();

  // Too short
  if (cleaned.length < 3) return true;

  // Just punctuation or numbers
  if (/^[\d\s.,;:!?-]+$/.test(cleaned)) return true;

  // Just single letters or abbreviations repeated
  if (/^([a-z]\.?\s*)+$/i.test(cleaned)) return true;

  // Contains "..." suggesting incomplete/fragmented
  if (cleaned.includes('...')) return true;

  // Mostly Hebrew characters (shouldn't be in English definition)
  const hebrewChars = (cleaned.match(/[\u0590-\u05FF]/g) || []).length;
  const englishChars = (cleaned.match(/[a-zA-Z]/g) || []).length;
  if (hebrewChars > englishChars && hebrewChars > 3) return true;

  // Reference-only text
  if (/^(see|cf\.|compare|v\.|note)/i.test(cleaned)) return true;

  return false;
};
