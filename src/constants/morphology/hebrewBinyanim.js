// =============================================================================
// Binyanim hébreux — HEBREW_BINYANIM, détection, info, racine hébraïque.
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics } from '../../utils/hebrewUtils';
import { getCommonTalmudicRoots } from './rootValidation';

// =============================================================================
// PRO SCHOLAR: HEBREW BINYANIM DETECTION
// =============================================================================
// Detects the 7 Hebrew binyanim (verb patterns) from word morphology:
// - Qal (פָּעַל) - Simple active
// - Nifal (נִפְעַל) - Simple passive/reflexive
// - Piel (פִּעֵל) - Intensive active
// - Pual (פֻּעַל) - Intensive passive
// - Hifil (הִפְעִיל) - Causative active
// - Hufal (הֻפְעַל) - Causative passive
// - Hitpael (הִתְפַּעֵל) - Reflexive/intensive
// =============================================================================

/**
 * Hebrew Binyanim patterns with their markers
 */
export const HEBREW_BINYANIM = {
  qal: {
    name: 'Qal',
    hebrew: 'קַל',
    meaning: 'Simple active',
    example: { word: 'שָׁמַר', translation: 'he guarded' },
    markers: {
      perfect: { prefix: '', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', doubling: false },
      participle: { prefix: '', doubling: false },
    }
  },
  nifal: {
    name: 'Nifal',
    hebrew: 'נִפְעַל',
    meaning: 'Simple passive/reflexive',
    example: { word: 'נִשְׁמַר', translation: 'he was guarded' },
    markers: {
      perfect: { prefix: 'נ', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'נ', doubling: false },
      participle: { prefix: 'נ', doubling: false },
    }
  },
  piel: {
    name: 'Piel',
    hebrew: 'פִּעֵל',
    meaning: 'Intensive active',
    example: { word: 'שִׁמֵּר', translation: 'he guarded intensively' },
    markers: {
      perfect: { prefix: '', doubling: true }, // middle radical doubled
      imperfect: { prefix: 'י/ת/א/נ', doubling: true },
      participle: { prefix: 'מ', doubling: true },
    }
  },
  pual: {
    name: 'Pual',
    hebrew: 'פֻּעַל',
    meaning: 'Intensive passive',
    example: { word: 'שֻׁמַּר', translation: 'was guarded intensively' },
    markers: {
      perfect: { prefix: '', doubling: true, qubbutz: true },
      imperfect: { prefix: 'י/ת/א/נ', doubling: true, qubbutz: true },
      participle: { prefix: 'מ', doubling: true, qubbutz: true },
    }
  },
  hifil: {
    name: 'Hifil',
    hebrew: 'הִפְעִיל',
    meaning: 'Causative active',
    example: { word: 'הִשְׁמִיר', translation: 'he caused to guard' },
    markers: {
      perfect: { prefix: 'ה', doubling: false },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'הי', doubling: false },
      participle: { prefix: 'מ', doubling: false },
    }
  },
  hufal: {
    name: 'Hufal',
    hebrew: 'הֻפְעַל',
    meaning: 'Causative passive',
    example: { word: 'הֻשְׁמַר', translation: 'was caused to guard' },
    markers: {
      perfect: { prefix: 'ה', doubling: false, qubbutz: true },
      imperfect: { prefix: 'י/ת/א/נ', doubling: false, qubbutz: true },
      participle: { prefix: 'מ', doubling: false, qubbutz: true },
    }
  },
  hitpael: {
    name: 'Hitpael',
    hebrew: 'הִתְפַּעֵל',
    meaning: 'Reflexive/intensive',
    example: { word: 'הִשְׁתַּמֵּר', translation: 'he guarded himself' },
    markers: {
      perfect: { prefix: 'הת', doubling: true },
      imperfect: { prefix: 'י/ת/א/נ', infix: 'ת', doubling: true },
      participle: { prefix: 'מת', doubling: true },
    }
  },
};

/**
 * Detect Hebrew Binyan from a verb form
 * @param {string} word - Hebrew verb form
 * @returns {Object} - { binyan, confidence, tense, markers }
 */
export const detectHebrewBinyan = (word) => {
  if (!word || word.length < 3) return null;

  // Strip nikud for pattern matching - use hebrewUtils (DRY)
  const cleanWord = stripAllDiacritics(word);
  const results = [];

  // Hitpael detection: הת prefix or internal ת after prefix
  if (cleanWord.startsWith('הת') || cleanWord.startsWith('מת')) {
    results.push({
      binyan: HEBREW_BINYANIM.hitpael,
      confidence: 90,
      tense: cleanWord.startsWith('מת') ? 'participle' : 'perfect',
      markers: ['הת/מת prefix'],
    });
  } else if (['י', 'ת', 'א', 'נ'].includes(cleanWord[0]) && cleanWord[1] === 'ת') {
    // Imperfect hitpael: יתשמר, תתשמר
    results.push({
      binyan: HEBREW_BINYANIM.hitpael,
      confidence: 85,
      tense: 'imperfect',
      markers: ['infix ת after conjugation prefix'],
    });
  }

  // Nifal detection: נ prefix
  if (cleanWord.startsWith('נ') && cleanWord.length >= 4) {
    results.push({
      binyan: HEBREW_BINYANIM.nifal,
      confidence: 80,
      tense: 'perfect/participle',
      markers: ['נ prefix'],
    });
  } else if (['י', 'ת', 'א'].includes(cleanWord[0]) && cleanWord.length >= 4) {
    // Check for Nifal imperfect (internal נ after prefix)
    if (cleanWord[1] === 'נ' || (cleanWord[1] === 'י' && cleanWord[2] === 'נ')) {
      results.push({
        binyan: HEBREW_BINYANIM.nifal,
        confidence: 75,
        tense: 'imperfect',
        markers: ['infix נ'],
      });
    }
  }

  // Hifil detection: ה prefix (perfect) or hirik pattern
  if (cleanWord.startsWith('ה') && cleanWord.length >= 4) {
    // Check for Hifil vs Hufal (Hufal has qubbutz/shureq)
    if (word.includes('\u05BB') || word.includes('\u05BC')) { // qubbutz or shureq in original
      results.push({
        binyan: HEBREW_BINYANIM.hufal,
        confidence: 85,
        tense: 'perfect',
        markers: ['ה prefix with qubbutz'],
      });
    } else {
      results.push({
        binyan: HEBREW_BINYANIM.hifil,
        confidence: 80,
        tense: 'perfect',
        markers: ['ה prefix'],
      });
    }
  }

  // Piel/Pual detection: Middle letter doubling (dagesh hazak)
  // Look for dagesh in second position of root
  const hasDageshHazak = word.length >= 3 && word.includes('\u05BC');
  if (hasDageshHazak && !cleanWord.startsWith('ה') && !cleanWord.startsWith('נ')) {
    // Check for Pual vowel pattern (qubbutz under first radical)
    if (word.includes('\u05BB')) { // qubbutz
      results.push({
        binyan: HEBREW_BINYANIM.pual,
        confidence: 75,
        tense: 'perfect/participle',
        markers: ['middle doubling with qubbutz'],
      });
    } else {
      results.push({
        binyan: HEBREW_BINYANIM.piel,
        confidence: 75,
        tense: 'perfect/participle',
        markers: ['middle doubling'],
      });
    }
  }

  // Qal: Default if no other pattern detected and word looks verbal
  if (results.length === 0 && cleanWord.length >= 3) {
    results.push({
      binyan: HEBREW_BINYANIM.qal,
      confidence: 50,
      tense: 'unknown',
      markers: ['default - no special markers'],
    });
  }

  // Sort by confidence and return best match
  results.sort((a, b) => b.confidence - a.confidence);

  return {
    bestMatch: results[0] || null,
    allMatches: results,
    word: cleanWord,
  };
};

/**
 * Get binyan info for display
 * @param {string} binyanName - Name like 'Hifil', 'Piel', etc.
 * @returns {Object} - Binyan information
 */
export const getBinyanInfo = (binyanName) => {
  const key = binyanName?.toLowerCase();
  return HEBREW_BINYANIM[key] || null;
};

/**
 * Extract Hebrew root from conjugated verb using binyan patterns
 * @param {string} word - Hebrew verb
 * @returns {Object} - { root, binyan, confidence }
 */
export const extractHebrewRoot = (word) => {
  if (!word || word.length < 3) return null;

  const cleanWord = stripAllDiacritics(word);
  const binyanResult = detectHebrewBinyan(word);

  if (!binyanResult?.bestMatch) {
    // Try simple 3-letter extraction
    if (cleanWord.length === 3 && getCommonTalmudicRoots().has(cleanWord)) {
      return {
        root: cleanWord,
        binyan: HEBREW_BINYANIM.qal,
        confidence: 70,
      };
    }
    return null;
  }

  const binyan = binyanResult.bestMatch.binyan;
  let possibleRoot = cleanWord;

  // Strip binyan prefixes to get root
  if (binyan.name === 'Hitpael') {
    // Remove הת/מת prefix
    if (cleanWord.startsWith('הת') || cleanWord.startsWith('מת')) {
      possibleRoot = cleanWord.slice(2);
    } else if (['י', 'ת', 'א', 'נ'].includes(cleanWord[0]) && cleanWord[1] === 'ת') {
      possibleRoot = cleanWord[0] + cleanWord.slice(2);
    }
  } else if (binyan.name === 'Nifal') {
    if (cleanWord.startsWith('נ')) {
      possibleRoot = cleanWord.slice(1);
    }
  } else if (binyan.name === 'Hifil' || binyan.name === 'Hufal') {
    if (cleanWord.startsWith('ה')) {
      possibleRoot = cleanWord.slice(1);
    }
  }

  // Validate against known roots
  if (possibleRoot.length === 3 && getCommonTalmudicRoots().has(possibleRoot)) {
    return {
      root: possibleRoot,
      binyan: binyan,
      confidence: binyanResult.bestMatch.confidence,
      tense: binyanResult.bestMatch.tense,
    };
  }

  // Try stripping common suffixes
  const VERB_SUFFIXES = ['ה', 'ו', 'ת', 'י', 'נו', 'תם', 'תן'];
  for (const suffix of VERB_SUFFIXES) {
    if (possibleRoot.endsWith(suffix) && possibleRoot.length > suffix.length + 2) {
      const stripped = possibleRoot.slice(0, -suffix.length);
      if (stripped.length === 3 && getCommonTalmudicRoots().has(stripped)) {
        return {
          root: stripped,
          binyan: binyan,
          confidence: binyanResult.bestMatch.confidence - 5,
          tense: binyanResult.bestMatch.tense,
          suffix: suffix,
        };
      }
    }
  }

  return {
    root: possibleRoot.slice(0, 3),
    binyan: binyan,
    confidence: Math.max(binyanResult.bestMatch.confidence - 20, 30),
    tense: binyanResult.bestMatch.tense,
    uncertain: true,
  };
};

