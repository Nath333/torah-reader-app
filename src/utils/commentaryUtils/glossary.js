// =============================================================================
// Moteur de glossaire — lookup morphologique local, construction dynamique
// (Rashi/halachique + dictionnaires), sens primaire, appariement à préfixes,
// application au texte, expansion d'abréviations.
// (extrait de commentaryUtils.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger } from '../debug';
import { pickBestDefinition } from '../definitionCleaner';
import { normalizeArticles } from '../articleUtils';
import { normalizeFinals } from '../hebrewUtils';
import { lookupJastrowSync, lookupBDBSync } from '../../services/dictionaries/dictionaryLoader';
import { HALACHIC_OVERRIDE, RASHI_VOCABULARY, TALMUDIC_ABBREVIATIONS } from './data';

const log = createLogger('CommentaryUtils');

const glossaryCache = new Map(); // glossaryCache

// Hebrew prefixes - use centralized morphology constants (single source of truth)
// SINGLE_PREFIXES imported from '../constants/morphology'
// normalizeFinals imported from './hebrewUtils'

/**
 * Look up a word in a local dictionary with morphological variations
 * Tries: exact match → normalized → prefix stripped → suffix stripped
 * @param {string} word - Hebrew/Aramaic word
 * @param {Function} lookupFn - Sync lookup function (lookupJastrowSync or lookupBDBSync)
 * @returns {Object|null} Dictionary entry or null
 */
const lookupLocalWithMorphology = (word, lookupFn) => {
  if (!word || !lookupFn) return null;

  // Direct match
  const direct = lookupFn(word);
  if (direct) {
    return direct;
  }

  // Normalized match (final letters → regular)
  const normalized = normalizeFinals(word);
  if (normalized !== word) {
    const normalizedMatch = lookupFn(normalized);
    if (normalizedMatch) {
      return normalizedMatch;
    }
  }

  // Try stripping prefixes (using centralized SINGLE_PREFIXES)
  for (const prefix of SINGLE_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 1) {
      const stem = word.slice(prefix.length);
      const stemMatch = lookupFn(stem);
      if (stemMatch) {
        return stemMatch;
      }
      const normalizedStem = normalizeFinals(stem);
      if (normalizedStem !== stem) {
        const normalizedStemMatch = lookupFn(normalizedStem);
        if (normalizedStemMatch) {
          return normalizedStemMatch;
        }
      }
    }
  }

  // Try stripping common suffixes (ים, ות, ין, ה, י)
  const COMMON_SUFFIXES = ['ים', 'ות', 'ין', 'ן', 'ה', 'י', 'א'];
  for (const suffix of COMMON_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const stem = word.slice(0, -suffix.length);
      const stemMatch = lookupFn(stem);
      if (stemMatch) {
        return stemMatch;
      }
      // For ות plural, try adding ה for feminine singular
      if (suffix === 'ות') {
        const femSingular = lookupFn(stem + 'ה');
        if (femSingular) {
          return femSingular;
        }
      }
    }
  }

  return null;
};

/**
 * Build a dynamic glossary for Aramaic/Hebrew words using LOCAL dictionaries
 * Uses Jastrow (25K entries) and BDB for comprehensive coverage
 * @param {string[]} words - Hebrew/Aramaic words to look up
 * @returns {Promise<Map<string, string>>} Map of word → English definition
 */

export const buildDynamicGlossary = async (words) => {
  const glossary = new Map();
  const uniqueWords = [...new Set(words.filter(w => w && w.length >= 2))];

  // Helper to check HALACHIC_OVERRIDE and RASHI_VOCABULARY with prefix stripping
  const checkOverrideWithPrefixes = (word) => {
    // Direct match in HALACHIC_OVERRIDE
    if (HALACHIC_OVERRIDE[word]) {
      return { root: word, definition: HALACHIC_OVERRIDE[word], prefix: '' };
    }
    // Direct match in RASHI_VOCABULARY
    if (RASHI_VOCABULARY[word]) {
      return { root: word, definition: RASHI_VOCABULARY[word], prefix: '' };
    }
    // Try stripping one prefix
    if (word.length > 2 && SINGLE_PREFIXES.includes(word[0])) {
      const stripped = word.substring(1);
      if (HALACHIC_OVERRIDE[stripped]) {
        return { root: stripped, definition: HALACHIC_OVERRIDE[stripped], prefix: getPrefixMeaning(word[0]) || '' };
      }
      if (RASHI_VOCABULARY[stripped]) {
        return { root: stripped, definition: RASHI_VOCABULARY[stripped], prefix: getPrefixMeaning(word[0]) || '' };
      }
    }
    // Try stripping two prefixes
    if (word.length > 3 && SINGLE_PREFIXES.includes(word[0]) && SINGLE_PREFIXES.includes(word[1])) {
      const stripped = word.substring(2);
      if (HALACHIC_OVERRIDE[stripped]) {
        const p1 = getPrefixMeaning(word[0]) || '';
        const p2 = getPrefixMeaning(word[1]) || '';
        return { root: stripped, definition: HALACHIC_OVERRIDE[stripped], prefix: [p1, p2].filter(Boolean).join(' ') };
      }
      if (RASHI_VOCABULARY[stripped]) {
        const p1 = getPrefixMeaning(word[0]) || '';
        const p2 = getPrefixMeaning(word[1]) || '';
        return { root: stripped, definition: RASHI_VOCABULARY[stripped], prefix: [p1, p2].filter(Boolean).join(' ') };
      }
    }
    return null;
  };

  // Check halachic override and cache first
  const toFetch = [];
  for (const word of uniqueWords) {
    const cleanedWord = word.replace(/[^\u0590-\u05FF]/g, '');

    // FIRST: Check halachic override (with prefix stripping)
    const override = checkOverrideWithPrefixes(cleanedWord);
    if (override) {
      // Store with prefix in definition for full translation
      const fullDef = override.prefix ? `${override.prefix} ${override.definition}` : override.definition;
      glossary.set(cleanedWord, fullDef);
      continue;
    }

    // THEN: Check cache
    if (glossaryCache.has(cleanedWord)) {
      const cached = glossaryCache.get(cleanedWord);
      if (cached) glossary.set(cleanedWord, cached);
    } else {
      toFetch.push(cleanedWord);
    }
  }

  if (toFetch.length === 0) {
    log.verbose(`Glossary: Built ${glossary.size}/${uniqueWords.length} (override + cache)`);
    return glossary;
  }

  // Use LOCAL dictionaries instead of slow API calls
  // This uses the 25,224-entry Jastrow and BDB dictionaries
  let jastrowCount = 0, bdbCount = 0;

  for (const word of toFetch) {
    let definition = null;

    // Try Jastrow LOCAL first (best for Talmud/Rashi - 25K entries)
    const jastrowEntry = lookupLocalWithMorphology(word, lookupJastrowSync);
    if (jastrowEntry?.definition) {
      // Use pickBestDefinition to clean scholarly notation
      definition = pickBestDefinition(jastrowEntry.definition);
      jastrowCount++;
    }

    // Fallback to BDB LOCAL (Biblical Hebrew)
    if (!definition) {
      const bdbEntry = lookupLocalWithMorphology(word, lookupBDBSync);
      if (bdbEntry?.definition || bdbEntry?.fullDef) {
        definition = pickBestDefinition(bdbEntry.definition || bdbEntry.fullDef);
        bdbCount++;
      }
    }

    if (definition) {
      // Normalize articles (a/an) in definitions
      definition = normalizeArticles(definition);
      glossaryCache.set(word, definition);
      glossary.set(word, definition);
    } else {
      glossaryCache.set(word, null);
    }
  }

  log.verbose(`Glossary: Built ${glossary.size}/${uniqueWords.length} (Jastrow: ${jastrowCount}, BDB: ${bdbCount})`);
  return glossary;
};

/**
 * Extract the first/primary meaning from a scholarly definition
 * Jastrow definitions contain lots of notation we need to clean:
 * - "(רְשׁוּת) f. (b. h.; רשי) authority, dominion..."
 * - "v. דָּא, a. v. fr."
 * - "Targ. Ex. I, 16" (citations)
 * @param {string} definition - Full definition text
 * @returns {string} Primary meaning only
 */
const extractPrimaryMeaning = (definition) => {
  if (!definition) return '';

  let text = definition;

  // EARLY REJECTION: Detect garbled/notation-heavy text
  const garbledPatterns = [
    /\b(?:ace|Sifra|Thazr|Ḥevah|Tosef|Pesik|Baḥod)\b/i,  // Dictionary notation debris
    /(?:whatsoever|preced|foll|ib\.){2,}/i,               // Repeated notation
    /\.\.\.\s*\.\.\./,                                     // Multiple ellipses
    /^[^a-zA-Z]*$/,                                        // No English letters
  ];

  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) return '';
  }

  // Remove Hebrew/Aramaic text in parentheses
  text = text.replace(/\([^)]*[\u0590-\u05FF][^)]*\)/g, '');

  // Remove scholarly abbreviations and references - EXPANDED LIST
  text = text
    .replace(/\b[mfn]\.\s*/gi, '') // Gender markers
    .replace(/\bb\.\s*h\.\s*/gi, '') // "b. h." = Biblical Hebrew
    .replace(/\bch\.\s*/gi, '') // "ch." = Chaldean
    .replace(/\bcmp\.\s*/gi, '') // "cmp." = compare
    .replace(/\bcf\.\s*/gi, '') // "cf." = compare
    .replace(/\bv\.\s*[^\s,;]+/gi, '') // "v. word" = see word
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '') // "a. v. fr." = and very frequently
    .replace(/\bTarg\.[^,;]+/gi, '') // Targum references
    .replace(/\bGen\.\s*R\.[^,;]+/gi, '') // Genesis Rabbah
    .replace(/\bEx\.\s*R\.[^,;]+/gi, '') // Exodus Rabbah
    .replace(/\bY\.\s*[A-Za-z]+\.[^,;]+/gi, '') // Yerushalmi references
    .replace(/\bBer\.[^,;]+/gi, '') // Berakhot references
    .replace(/\bShab\.[^,;]+/gi, '') // Shabbat references
    .replace(/\bPes\.[^,;]+/gi, '') // Pesachim references
    .replace(/\bSifra[^,;]*/gi, '') // Sifra references
    .replace(/\bThazr[^,;]*/gi, '') // Thazria references
    .replace(/\bace\b/gi, '') // Common notation debris
    .replace(/\bwhatsoever\b/gi, '') // Common debris
    .replace(/\bpreced\.?\s*/gi, '') // "preced." = preceding
    .replace(/\bpreceding\s*/gi, '') // "preceding"
    .replace(/\bfoll\.?\s*/gi, '') // "foll." = following
    .replace(/\bfollowing\s*/gi, '') // "following"
    .replace(/\bib\.?\s*/gi, '') // "ib." = ibidem
    .replace(/\besp\.?\s*/gi, '') // "esp." = especially
    .replace(/\bfreq\.?\s*/gi, '') // "freq." = frequently
    .replace(/\bpart\.?\s*/gi, '') // "part." = participle
    .replace(/\bpl\.?\s*/gi, '') // "pl." = plural
    .replace(/\bsing\.?\s*/gi, '') // "sing." = singular
    .replace(/\blit\.?\s*/gi, '') // "lit." = literally
    .replace(/\bfig\.?\s*/gi, '') // "fig." = figuratively
    .replace(/\bconstr\.?\s*/gi, '') // "constr." = construct
    .replace(/\babs\.?\s*/gi, '') // "abs." = absolute
    .replace(/\bact\.?\s*/gi, '') // "act." = active
    .replace(/\bpass\.?\s*/gi, '') // "pass." = passive
    .replace(/\binf\.?\s*/gi, '') // "inf." = infinitive
    .replace(/\bimp\.?\s*/gi, '') // "imp." = imperative
    .replace(/\bperf\.?\s*/gi, '') // "perf." = perfect
    .replace(/\b[IVXLCDM]+[,\s]*\d*[a-d]?\b/g, '') // Roman numerals
    .replace(/\d+[a-d]?\s*(top|bot|mid)?/gi, '') // Page references like "37c top"
    .replace(/\([^)]*\)/g, ' ') // Remove remaining parentheses
    .replace(/\[[^\]]*\]/g, ' ') // Remove brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Skip if result is just notation remnants
  if (/^[\s.,;:_-]+$/.test(text)) return '';

  // Now extract the first meaningful English word(s)
  // Split on comma, semicolon, period (but not abbreviations)
  const parts = text.split(/[,;]|(?<![a-z])\./);

  for (const part of parts) {
    let cleaned = part
      .replace(/^\d+[.)]\s*/, '') // Remove leading numbers
      .replace(/^\s*-\s*/, '') // Remove leading dash
      .replace(/^\s*[.:;,]+\s*/, '') // Remove leading punctuation
      .trim();

    // Skip if empty, too short, has Hebrew, or looks like notation
    if (!cleaned || cleaned.length < 2) continue;
    if (/[\u0590-\u05FF]/.test(cleaned)) continue;
    if (/^[a-z]\.$/.test(cleaned)) continue; // Single letter abbreviation
    if (/^\d+$/.test(cleaned)) continue; // Just numbers
    if (/^(preced|foll|ib|esp|freq|part|pl|sing|lit|fig|ace|same)\.?$/i.test(cleaned)) continue;

    // Take first 3-4 words max
    const words = cleaned.split(/\s+/).filter(w => w.length > 1).slice(0, 4);
    const result = words.join(' ').trim();

    // Final quality check: must have at least 2 meaningful English words
    const meaningfulWords = result.split(/\s+/).filter(w =>
      /^[a-zA-Z]+$/.test(w) && w.length > 2 &&
      !['the', 'and', 'for', 'that', 'with', 'from', 'this', 'same', 'ace'].includes(w.toLowerCase())
    );

    if (meaningfulWords.length >= 1 && result.length >= 3 && result.length < 40) {
      return result;
    }
  }

  return '';
};

/**
 * Try to match a word, stripping Hebrew prefixes if needed
 * @param {string} word - Hebrew word (possibly with prefix)
 * @param {Map<string, string>} glossary - Word → Definition map
 * @returns {{prefix: string, root: string, definition: string}|null}
 */
const matchWithPrefixes = (word, glossary) => {
  // First try exact match
  if (glossary.has(word)) {
    return { prefix: '', root: word, definition: glossary.get(word) };
  }

  // Try stripping one prefix
  if (word.length > 2) {
    const firstChar = word[0];
    if (SINGLE_PREFIXES.includes(firstChar)) {
      const stripped = word.substring(1);
      if (glossary.has(stripped)) {
        return {
          prefix: getPrefixMeaning(firstChar) || '',
          root: stripped,
          definition: glossary.get(stripped)
        };
      }
    }
  }

  // Try stripping two prefixes (e.g., "ומ" = "and from")
  if (word.length > 3) {
    const first = word[0];
    const second = word[1];
    if (SINGLE_PREFIXES.includes(first) && SINGLE_PREFIXES.includes(second)) {
      const stripped = word.substring(2);
      if (glossary.has(stripped)) {
        const p1 = getPrefixMeaning(first) || '';
        const p2 = getPrefixMeaning(second) || '';
        return {
          prefix: [p1, p2].filter(Boolean).join(' '),
          root: stripped,
          definition: glossary.get(stripped)
        };
      }
    }
  }

  return null;
};

/**
 * Apply multi-word phrases from HALACHIC_OVERRIDE first, then single words
 * This produces better translations for common expressions
 * @param {string} text - Hebrew text
 * @returns {string} Text with phrases replaced
 */
const applyMultiWordPhrases = (text) => {
  if (!text) return text;

  let result = text;

  // Get multi-word phrases (2+ words) sorted by length (longest first)
  const multiWordPhrases = Object.entries(HALACHIC_OVERRIDE)
    .filter(([key]) => key.includes(' '))
    .sort((a, b) => b[0].length - a[0].length);

  // Replace multi-word phrases first
  for (const [phrase, translation] of multiWordPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), `[${translation}]`);
  }

  return result;
};

/**
 * Apply glossary to replace Hebrew technical terms with English
 * Handles Hebrew prefixes (ו, ה, ש, מ, ל, ב, כ, ד)
 * @param {string} text - Hebrew text
 * @param {Map<string, string>} glossary - Word → Definition map
 * @returns {string} Text with technical terms replaced
 */
export const applyGlossaryToText = (text, glossary) => {
  if (!text || glossary.size === 0) return text;

  // FIRST: Apply multi-word phrases from HALACHIC_OVERRIDE
  let processedText = applyMultiWordPhrases(text);

  // Split into words, process each, rejoin
  const words = processedText.split(/(\s+)/); // Keep whitespace
  const result = words.map(word => {
    // Skip whitespace, punctuation, and already-translated brackets
    if (!word.trim() || !/[\u0590-\u05FF]/.test(word)) {
      return word;
    }

    // Skip if already translated (contains brackets)
    if (word.includes('[') || word.includes(']')) {
      return word;
    }

    // Extract Hebrew part (may have punctuation)
    const hebrewMatch = word.match(/^([^\u0590-\u05FF]*)([\u0590-\u05FF]+)([^\u0590-\u05FF]*)$/);
    if (!hebrewMatch) return word;

    const [, before, hebrew, after] = hebrewMatch;

    // Try to match with glossary (with prefix handling)
    const match = matchWithPrefixes(hebrew, glossary);
    if (match) {
      const english = extractPrimaryMeaning(match.definition);
      if (english && english.length >= 1 && english.length < 30) {
        // Combine prefix translation with word translation
        const fullTranslation = match.prefix
          ? `${match.prefix} ${english}`
          : english;
        return `${before}[${fullTranslation}]${after}`;
      }
    }

    return word;
  });

  return result.join('');
};

/**
 * Expand Talmudic abbreviations to help translation
 * Sorted by length (longest first) to match multi-char abbreviations before shorter ones
 * @param {string} text - Text with abbreviations
 * @returns {string} Text with expanded abbreviations
 */
export const expandAbbreviations = (text) => {
  if (!text) return text;
  let expanded = text;

  // Sort by length (longest first) so "ובגמ'" matches before "גמ'"
  const sortedAbbrevs = Object.entries(TALMUDIC_ABBREVIATIONS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [abbr, full] of sortedAbbrevs) {
    expanded = expanded.replace(new RegExp(abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), full);
  }
  return expanded;
};

/**
 * Translate Hebrew/Aramaic text to English using SCHOLARLY DICTIONARIES ONLY.
 * NO AI/Machine translation (Lingva, MyMemory, Google Translate).
 *
 * Approach:
 * 1. Use HALACHIC_OVERRIDE for common Talmudic terms (100+ terms)
 * 2. Use Jastrow/BDB via Sefaria API for remaining words
 * 3. If coverage is too low, return null (better than bad AI translation)
 *
 * @param {string} hebrewText - Hebrew/Aramaic text to translate
 * @returns {Promise<{text: string, isScholarly: boolean}|null>} Translation result or null
 */
