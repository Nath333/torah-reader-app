// =============================================================================
// Extraction de racine et détection de binyan — validation par dictionnaires,
// racines communes, termes talmudiques, préfixes.
// (extrait de grammarAnalysisService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { cleanHebrewWordStrict as cleanHebrewWord, stripAllDiacritics } from '../../../utils/hebrewUtils';
import { HEBREW_PREFIXES_ORDERED, STOP_WORDS as CENTRAL_STOP_WORDS, isLikelyCompleteRoot, extractHebrewRoot, HEBREW_BINYANIM as MORPHOLOGY_BINYANIM } from '../../../constants/morphology';
import { isValidDictionaryWord } from './dictionaryHelpers';
import {
  BINYANIM, ARAMAIC_BINYANIM, COMMON_ROOTS, PREFIXES, TALMUDIC_TERMS, lookupTalmudicTerm
} from './data';

/**
 * Extract the likely root from a Hebrew word
 * Enhanced for both Biblical Hebrew and Talmudic Aramaic
 *
 * SMART ALGORITHM:
 * 1. Check if FULL WORD is in Aramaic dictionary (for Gemara context)
 * 2. Try prefix stripping (longest first) with DICTIONARY VALIDATION
 * 3. Only accept stripped result if it's a REAL dictionary word
 */
export function extractRoot(word) {
  if (!word) return { root: null, rootInfo: null, prefixes: [], originalWord: word };

  // Remove nikud and cantillation first
  let cleaned = cleanHebrewWord(word);
  const foundPrefixes = [];

  // === STEP 1: Check if FULL WORD is in dictionaries (no stripping needed) ===
  // This is critical for Aramaic verbs like תפיק which should NOT be stripped
  if (isValidDictionaryWord(cleaned)) {
    // Check if it's a known Talmudic term for additional info
    const talmudicTerm = lookupTalmudicTerm(word);
    return {
      root: cleaned,
      rootInfo: talmudicTerm
        ? { meaning: talmudicTerm.meaning, category: talmudicTerm.type || 'talmud', isAramaic: talmudicTerm.isAramaic }
        : COMMON_ROOTS[cleaned] || null,
      prefixes: [],
      originalWord: word,
      isTalmudicTerm: !!talmudicTerm,
      validatedByDictionary: true
    };
  }

  // Check if it's a known complete root (use centralized function)
  if (isLikelyCompleteRoot(cleaned)) {
    const talmudicTerm = lookupTalmudicTerm(word);
    return {
      root: cleaned,
      rootInfo: talmudicTerm
        ? { meaning: talmudicTerm.meaning, category: talmudicTerm.type || 'talmud', isAramaic: talmudicTerm.isAramaic }
        : COMMON_ROOTS[cleaned] || null,
      prefixes: [],
      originalWord: word,
      isTalmudicTerm: !!talmudicTerm
    };
  }

  // === STEP 2: Try prefix stripping with DICTIONARY VALIDATION ===
  // Use centralized HEBREW_PREFIXES_ORDERED (includes כשה, משה, etc.)
  // Try longest prefixes first
  for (const prefix of HEBREW_PREFIXES_ORDERED) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 1) {
      const afterStrip = cleaned.slice(prefix.length);

      // SMART: Only accept if the remaining word is VALID
      const isValid = CENTRAL_STOP_WORDS.has(afterStrip) ||
                      COMMON_ROOTS[afterStrip] ||
                      TALMUDIC_TERMS[afterStrip] ||
                      isValidDictionaryWord(afterStrip);

      if (isValid) {
        // Record which prefixes were stripped
        for (const letter of prefix) {
          if (PREFIXES[letter]) {
            foundPrefixes.push({ letter, ...PREFIXES[letter] });
          }
        }
        cleaned = afterStrip;
        break; // Found valid stripping, stop
      }
      // If not valid, try shorter prefix (continue loop)
    }
  }

  // Try direct lookup in COMMON_ROOTS first
  if (COMMON_ROOTS[cleaned]) {
    return {
      root: cleaned,
      rootInfo: COMMON_ROOTS[cleaned],
      prefixes: foundPrefixes,
      originalWord: word
    };
  }

  // Try to find matching root by letter sequence
  for (const root of Object.keys(COMMON_ROOTS)) {
    // Check if all root letters are present in order
    let rootIdx = 0;
    for (const char of cleaned) {
      if (char === root[rootIdx]) {
        rootIdx++;
        if (rootIdx === root.length) {
          return {
            root,
            rootInfo: COMMON_ROOTS[root],
            prefixes: foundPrefixes,
            originalWord: word
          };
        }
      }
    }
  }

  // Try removing common suffixes and re-checking
  const suffixes = ['ות', 'ים', 'ין', 'יא', 'תא', 'ה', 'י', 'ת'];
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      const withoutSuffix = cleaned.slice(0, -suffix.length);
      if (COMMON_ROOTS[withoutSuffix]) {
        return {
          root: withoutSuffix,
          rootInfo: COMMON_ROOTS[withoutSuffix],
          prefixes: foundPrefixes,
          originalWord: word,
          suffix
        };
      }
      // Try root matching on the stripped word
      for (const root of Object.keys(COMMON_ROOTS)) {
        let rootIdx = 0;
        for (const char of withoutSuffix) {
          if (char === root[rootIdx]) {
            rootIdx++;
            if (rootIdx === root.length) {
              return {
                root,
                rootInfo: COMMON_ROOTS[root],
                prefixes: foundPrefixes,
                originalWord: word,
                suffix
              };
            }
          }
        }
      }
    }
  }

  // For words that don't match, extract 3-letter root heuristically
  // But only mark as uncertain if we can't determine anything useful
  const consonants = cleaned.replace(/[אהוי]/g, ''); // Remove matres lectionis
  if (consonants.length >= 3) {
    const heuristicRoot = consonants.slice(0, 3);
    // Check if this heuristic root exists in our dictionary
    if (COMMON_ROOTS[heuristicRoot]) {
      return {
        root: heuristicRoot,
        rootInfo: COMMON_ROOTS[heuristicRoot],
        prefixes: foundPrefixes,
        originalWord: word,
        heuristic: true
      };
    }
    return {
      root: heuristicRoot,
      rootInfo: null,
      prefixes: foundPrefixes,
      originalWord: word,
      uncertain: true
    };
  }

  // Return the cleaned word as the "root" if very short
  return {
    root: cleaned || null,
    rootInfo: null,
    prefixes: foundPrefixes,
    originalWord: word,
    uncertain: true
  };
}

/**
 * Detect Binyan pattern from a Hebrew verb
 * @param {string} word - The Hebrew verb (with or without nikud)
 * @returns {Object} Detection result with binyan key, confidence, and indicators
 */
export function detectBinyan(word) {
  if (!word) return { binyan: null, confidence: 'none', indicators: [] };

  const withNikud = word;
  const cleaned = stripAllDiacritics(word);
  const indicators = [];
  let binyan = null;
  let confidence = 'low';
  let isAramaic = false;

  // === Hitpael Detection (must check first - most distinctive) ===
  if (cleaned.startsWith('הת') || cleaned.startsWith('מת') || cleaned.startsWith('להת')) {
    binyan = 'hitpael';
    indicators.push('הת-prefix');
    confidence = 'high';
  }
  // Aramaic Itpeel (את prefix)
  else if (cleaned.startsWith('את') || cleaned.startsWith('אית')) {
    binyan = 'itpeel';
    indicators.push('את-prefix');
    isAramaic = true;
    confidence = 'high';
  }

  // === Niphal Detection ===
  else if (cleaned.startsWith('נ') && cleaned.length > 2) {
    binyan = 'niphal';
    indicators.push('נ-prefix');
    confidence = 'high';
  }
  else if (withNikud.startsWith('יִּ') || withNikud.startsWith('תִּ') || withNikud.startsWith('אֶּ')) {
    // Niphal imperfect with dagesh in first root letter
    binyan = 'niphal';
    indicators.push('dagesh-first-imperfect');
    confidence = 'medium';
  }

  // === Hiphil Detection ===
  else if (cleaned.startsWith('ה') && (withNikud.includes('ִי') || withNikud.includes('ַ'))) {
    binyan = 'hiphil';
    indicators.push('ה-prefix', 'hireq-yod');
    confidence = 'high';
  }
  else if (cleaned.startsWith('להַ') || cleaned.startsWith('להָ')) {
    binyan = 'hiphil';
    indicators.push('infinitive-להַ');
    confidence = 'high';
  }
  else if ((cleaned.startsWith('י') || cleaned.startsWith('ת') || cleaned.startsWith('א') || cleaned.startsWith('נ')) && withNikud.includes('ַ')) {
    // Imperfect with patach under prefix
    if (withNikud.startsWith('יַ') || withNikud.startsWith('תַ') || withNikud.startsWith('אַ') || withNikud.startsWith('נַ')) {
      binyan = 'hiphil';
      indicators.push('patach-prefix-imperfect');
      confidence = 'high';
    }
  }
  else if (cleaned.startsWith('מ') && withNikud.includes('ַ') && !withNikud.includes('ְ')) {
    // Hiphil participle מַקְטִיל
    binyan = 'hiphil';
    indicators.push('מַ-participle');
    confidence = 'medium';
  }

  // === Hophal Detection ===
  else if (cleaned.startsWith('ה') && (withNikud.includes('ָ') || withNikud.includes('ֻ'))) {
    if (withNikud.startsWith('הָ') || withNikud.startsWith('הֻ')) {
      binyan = 'hophal';
      indicators.push('qamats/qubbutz-he');
      confidence = 'high';
    }
  }
  else if (withNikud.startsWith('יֻ') || withNikud.startsWith('תֻ')) {
    binyan = 'hophal';
    indicators.push('qubbutz-prefix-imperfect');
    confidence = 'high';
  }

  // === Piel Detection (intensive with dagesh in middle root letter) ===
  else if (withNikud.match(/^.ִּ/)) {
    // Hireq + dagesh pattern
    binyan = 'piel';
    indicators.push('dagesh-middle-perfect');
    confidence = 'medium';
  }
  else if (withNikud.startsWith('יְ') || withNikud.startsWith('תְ')) {
    if (withNikud.match(/יְ.ַ/)) {
      binyan = 'piel';
      indicators.push('sheva-patach-imperfect');
      confidence = 'medium';
    }
  }
  else if (cleaned.startsWith('מ') && withNikud.match(/מְ.ַ/)) {
    binyan = 'piel';
    indicators.push('מְ-participle-patach');
    confidence = 'medium';
  }

  // === Pual Detection (passive of Piel) ===
  else if (withNikud.match(/^.ֻּ/)) {
    binyan = 'pual';
    indicators.push('qubbutz-dagesh');
    confidence = 'high';
  }

  // === Aramaic Aphel (א prefix + causative) ===
  else if (cleaned.startsWith('א') && cleaned.length > 3) {
    // Could be Aramaic Aphel
    binyan = 'aphel';
    indicators.push('א-prefix');
    isAramaic = true;
    confidence = 'medium';
  }

  // === Default to Qal if no other pattern matches ===
  if (!binyan && cleaned.length >= 3) {
    binyan = 'qal';
    indicators.push('default-simple');
    confidence = 'low';
  }

  const binyanData = isAramaic ? ARAMAIC_BINYANIM[binyan] : BINYANIM[binyan];

  return {
    binyan,
    binyanKey: binyan,
    binyanData,
    confidence,
    indicators,
    isAramaic
  };
}

