// =============================================================================
// Sélection de la meilleure définition — pickBestDefinition, formatage
// tooltip, suivi de cross-references.
// (extrait de definitionCleaner.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { GARBLED_PATTERNS, REFERENCE_ONLY_PATTERNS } from './contextConfig';
import { extractJastrowDefinition, cleanDefinition, extractCrossReference } from './clean';
import {
  GARBAGE_DEFINITIONS, isProperNounEntry, isTransliterationOnly,
  isObscureNounDefinition
} from './classifiers';

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
