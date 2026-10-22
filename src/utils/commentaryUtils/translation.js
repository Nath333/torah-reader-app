// =============================================================================
// Traduction hébreu→anglais des commentaires — normalisation de guillemets,
// cache de traduction, pipeline glossaire → texte.
// (extrait de commentaryUtils.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { createLogger } from '../debug';
import { normalizeArticles } from '../articleUtils';
import { buildDynamicGlossary, applyGlossaryToText, expandAbbreviations } from './glossary';

const log = createLogger('CommentaryUtils');

export const translationCache = new Map();

// =============================================================================
// QUOTE NORMALIZATION - Handle gershayim (״) vs ASCII (") variants
// =============================================================================
// Hebrew uses two types of quotation marks for abbreviations:
// - Gershayim (״) U+05F4 - proper Hebrew double mark
// - Geresh (׳) U+05F3 - single mark
// - ASCII double quote (") U+0022
// - ASCII single quote (') U+0027
//
// This function normalizes all variants to ASCII for consistent lookups
// =============================================================================
export const normalizeQuotes = (text) => {
  if (!text) return text;
  return text
    .replace(/״/g, '"')   // Hebrew gershayim → ASCII double quote
    .replace(/׳/g, "'")   // Hebrew geresh → ASCII single quote
    .replace(/"/g, '"')   // Fancy left double quote
    .replace(/"/g, '"')   // Fancy right double quote
    .replace(/'/g, "'")   // Fancy left single quote
    .replace(/'/g, "'");  // Fancy right single quote
};

// Common Talmudic/Rabbinic abbreviations - ENGLISH translations for common ones
// to avoid dictionary disambiguation issues (e.g., משנה = "Mishnah" not "lieutenant")
// NOTE: Keys use ASCII quotes ("). The normalizeQuotes() function converts Hebrew
// gershayim (״) to ASCII before lookup, so both ד״ה and ד"ה will match.

export const translateHebrewText = async (hebrewText) => {
  if (!hebrewText || hebrewText.length < 5) return null;

  // Check cache first
  const cacheKey = hebrewText.substring(0, 100);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Step 1: Expand abbreviations
  let textToTranslate = expandAbbreviations(hebrewText);

  // Step 2: Build dynamic glossary from HALACHIC_OVERRIDE + Jastrow/BDB
  const words = textToTranslate.split(/\s+/).filter(w => w.length >= 2);
  let glossary = new Map();

  try {
    glossary = await buildDynamicGlossary(words);
  } catch (err) {
    log.warn('Translation: Glossary build failed:', err.message);
  }

  // Step 3: Apply glossary - replace Hebrew terms with English
  const textWithGlossary = applyGlossaryToText(textToTranslate, glossary);

  // Count how many words we translated
  const bracketCount = (textWithGlossary.match(/\[/g) || []).length;
  const coverage = words.length > 0 ? bracketCount / words.length : 0;

  log.verbose(`Translation: Glossary coverage ${bracketCount}/${words.length} (${Math.round(coverage * 100)}%)`);

  // If we have at least 30% coverage, create a scholarly translation
  // Raised threshold to reduce garbled output
  if (coverage >= 0.30 || bracketCount >= 4) {
    // Clean up: remove brackets, keep English words, remove untranslated Hebrew
    const cleanedResult = textWithGlossary
      .replace(/\[([^\]]+)\]/g, '$1') // Remove brackets, keep content
      .replace(/[\u0590-\u05FF]+/g, '...') // Replace Hebrew with ellipsis
      .replace(/\.{3,}/g, '...') // Normalize multiple dots
      .replace(/\s+/g, ' ')
      .replace(/^\.\.\.\s*/, '') // Remove leading ellipsis
      .replace(/\s*\.\.\.$/g, '') // Remove trailing ellipsis
      .trim();

    // QUALITY CHECK: Reject garbled translations
    const garbledPatterns = [
      /\b(?:ace|Sifra|Thazr|whatsoever|preced|foll|ib)\b/i,
      /(?:in the same|traditional law)/i,  // Common garbled phrases
      /\.{2,}\s*\.{2,}/,  // Multiple ellipsis groups
    ];

    const isGarbled = garbledPatterns.some(p => p.test(cleanedResult));
    const englishWords = cleanedResult.split(/\s+/).filter(w =>
      /^[a-zA-Z]+$/.test(w) && w.length > 2
    );

    // Normalize articles (a/an) in the final translation
    const normalizedResult = normalizeArticles(cleanedResult);

    // Must have meaningful English content and not be garbled
    if (!isGarbled && normalizedResult && normalizedResult.length > 5 && englishWords.length >= 3) {
      const result = {
        text: normalizedResult,
        isScholarly: true,
        coverage: Math.round(coverage * 100)
      };
      translationCache.set(cacheKey, result);
      log.verbose(`Translation: Scholarly translation: "${cleanedResult.substring(0, 60)}..."`);
      return result;
    } else {
      log.verbose('Translation: Rejected garbled translation:', cleanedResult?.substring(0, 50));
    }
  }

  // Not enough coverage - return null rather than use AI
  // The UI should display Hebrew with "No translation available"
  log.verbose('Translation: Insufficient coverage, skipping AI');
  return null;
};

/**
 * Extract the dibbur haMatchil (opening words) from a commentary comment
 * This is typically bold or appears before a dash/colon
 * @param {string} text - Full comment text
 * @param {Object} options - Configuration options
 * @param {number} options.maxLength - Maximum length for the dibbur (default: 50)
 * @param {number} options.wordCount - Number of words for fallback (default: 4)
 * @returns {string} The dibbur haMatchil or empty string
 */
