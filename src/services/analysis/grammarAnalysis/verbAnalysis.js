// =============================================================================
// Analyse verbale renforcée (tryHebrewVerbAnalysis) — racines ROOT_MEANINGS,
// validation morphologique complète.
// (extrait de grammarAnalysisService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { ROOT_MEANINGS } from '../../../data/rootDatabase';
import { extractHebrewRoot, HEBREW_BINYANIM as MORPHOLOGY_BINYANIM } from '../../../constants/morphology';
import { stripAllDiacritics } from '../../../utils/hebrewUtils';

// =============================================================================
// PRO SCHOLAR V10.2: tryHebrewVerbAnalysis
// Moved from combinedTranslationService to break circular dependency
// =============================================================================

/**
 * Try to analyze a Hebrew verb and return root + binyan + translation
 * Uses extractHebrewRoot from morphology constants for root extraction
 *
 * @param {string} word - Hebrew word (may include vowels)
 * @returns {object|null} - { root, binyan, translation, ... } or null
 */
export const tryHebrewVerbAnalysis = (word) => {
  if (!word || word.length < 3) return null;

  const cleanedWord = stripAllDiacritics(word);

  // Common prefixes to try stripping
  const VERB_PREFIXES = ['ל', 'ה', 'ו', 'וה', 'ול', 'וב', 'ומ', 'וכ'];

  // Try the word as-is first
  let verbResult = extractHebrewRoot(cleanedWord);

  // If no result, try stripping prefixes
  if (!verbResult || verbResult.uncertain) {
    for (const prefix of VERB_PREFIXES) {
      if (cleanedWord.startsWith(prefix) && cleanedWord.length > prefix.length + 2) {
        const stem = cleanedWord.slice(prefix.length);
        const stemResult = extractHebrewRoot(stem);

        if (stemResult && stemResult.root && stemResult.confidence > 60) {
          verbResult = {
            ...stemResult,
            strippedPrefix: prefix
          };
          break;
        }
      }
    }
  }

  // If we found a valid verb with good confidence
  if (verbResult && verbResult.root && verbResult.confidence >= 65) {
    const rootInfo = ROOT_MEANINGS[verbResult.root];

    if (rootInfo) {
      // Determine the translation based on binyan
      let translation = rootInfo.base || '';
      let binyanEffect = '';

      if (verbResult.binyan) {
        const binyanName = verbResult.binyan.name || verbResult.binyan;

        switch (binyanName) {
          case 'Hifil':
          case 'Hiphil':
            // Causative: "come" → "bring", "know" → "make known"
            translation = rootInfo.causative || `to cause to ${rootInfo.base}`;
            binyanEffect = 'causative';
            break;
          case 'Piel':
            // Intensive: "break" → "shatter"
            translation = rootInfo.intensive || rootInfo.base;
            binyanEffect = 'intensive';
            break;
          case 'Pual':
            // Intensive passive
            translation = `to be ${rootInfo.intensive || rootInfo.base}`;
            binyanEffect = 'intensive passive';
            break;
          case 'Hitpael':
            // Reflexive
            translation = rootInfo.reflexive || `to ${rootInfo.base} oneself`;
            binyanEffect = 'reflexive';
            break;
          case 'Nifal':
            // Passive/reflexive
            translation = rootInfo.passive || `to be ${rootInfo.base}`;
            binyanEffect = 'passive';
            break;
          case 'Hufal':
            // Causative passive
            translation = `to be caused to ${rootInfo.base}`;
            binyanEffect = 'causative passive';
            break;
          default:
            // Qal (basic)
            translation = rootInfo.base;
            binyanEffect = 'basic';
        }
      }

      // Add prefix meaning if stripped (infinitive construct)
      if (verbResult.strippedPrefix === 'ל' && !translation.startsWith('to ')) {
        translation = `to ${translation}`;
      }

      return {
        root: verbResult.root,
        binyan: verbResult.binyan || MORPHOLOGY_BINYANIM?.qal,
        binyanEffect,
        translation: translation,
        fullTranslation: `${verbResult.binyan?.name || 'Qal'} of ${verbResult.root}: ${translation}`,
        rootMeaning: rootInfo.base,
        confidence: verbResult.confidence,
        strippedPrefix: verbResult.strippedPrefix,
        source: 'Root Database + Binyan',
        etymology: rootInfo.etymology,
        cognates: rootInfo.cognates
      };
    }
  }

  return null;
};

