// =============================================================================
// Verb Grammar Analyzer - PRO SCHOLAR v3
// Analyzes Hebrew/Aramaic verbs for binyan, tense, person
// =============================================================================

import {
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS,
  ARAMAIC_TENSE,
} from '../../constants/morphology/verbPatterns';

/**
 * Analyze a Hebrew/Aramaic verb for grammatical information
 * @param {string} word - The verb form
 * @param {Object} lookupResult - Dictionary lookup result (optional)
 * @returns {Object|null} - Grammatical analysis or null if not a verb
 */
export const analyzeVerbGrammar = (word, lookupResult = null) => {
  if (!word || typeof word !== 'string' || word.length < 2) {
    return null;
  }

  const isAramaic = lookupResult?.isAramaic || lookupResult?.language === 'Aramaic';

  let detectedBinyan = null;
  let detectedTense = null;
  let detectedPerson = null;
  let confidence = 50;

  // =========================================================================
  // Check for Aramaic verb endings (highly distinctive)
  // =========================================================================
  if (/ינן$/.test(word)) {
    // אמרינן - "we say"
    detectedTense = ARAMAIC_TENSE.PARTICIPLE;
    detectedPerson = { person: 1, number: 'p', label: '1cp', meaning: 'we' };
    confidence = 90;
  } else if (/יתו$/.test(word)) {
    // אמריתו - "you (pl) said"
    detectedTense = ARAMAIC_TENSE.PARTICIPLE;
    detectedPerson = { person: 2, number: 'p', label: '2mp', meaning: 'you (pl)' };
    confidence = 85;
  } else if (/ינהו$/.test(word)) {
    // קטלינהו - "they killed them"
    detectedPerson = { person: 3, number: 'p', label: '3mp+suffix', meaning: 'they...them' };
    confidence = 85;
  }

  // =========================================================================
  // Check for Hebrew imperfect prefixes (future tense)
  // =========================================================================
  if (!detectedTense) {
    const firstLetter = word[0];
    if ('יתאנ'.includes(firstLetter) && word.length >= 3) {
      const prefixInfo = TENSE_PATTERNS.IMPERFECT.prefixes[firstLetter];
      if (prefixInfo) {
        detectedTense = TENSE_PATTERNS.IMPERFECT;
        detectedPerson = prefixInfo;
        confidence = 70;
      }
    }
  }

  // =========================================================================
  // Check for perfect suffixes (past tense)
  // =========================================================================
  if (!detectedTense) {
    for (const [suffix, personInfo] of Object.entries(TENSE_PATTERNS.PERFECT.suffixes)) {
      if (suffix && word.endsWith(suffix)) {
        detectedTense = TENSE_PATTERNS.PERFECT;
        detectedPerson = personInfo;
        confidence = 65;
        break;
      }
    }
  }

  // =========================================================================
  // Check for binyan markers
  // =========================================================================
  if (word.startsWith('הת') || word.startsWith('מת')) {
    detectedBinyan = BINYANIM.HITPAEL;
    confidence = Math.min(confidence + 10, 95);
  } else if (word.startsWith('נ') && word.length >= 4) {
    detectedBinyan = BINYANIM.NIFAL;
    confidence = Math.min(confidence + 5, 90);
  } else if (word.startsWith('ה') && word.length >= 4) {
    detectedBinyan = BINYANIM.HIFIL;
    confidence = Math.min(confidence + 5, 85);
  } else if (word.startsWith('מ') && word.length >= 4) {
    detectedTense = TENSE_PATTERNS.PARTICIPLE;
    confidence = Math.min(confidence + 5, 80);
  }

  // =========================================================================
  // Aramaic binyan detection
  // =========================================================================
  if (isAramaic) {
    if (word.startsWith('א') && !word.startsWith('את')) {
      detectedBinyan = ARAMAIC_BINYANIM.AFEL;
    } else if (word.startsWith('את') || word.startsWith('אית') || word.startsWith('מת')) {
      detectedBinyan = ARAMAIC_BINYANIM.ITPEEL;
    } else if (word.startsWith('ש') || word.startsWith('אשת')) {
      detectedBinyan = ARAMAIC_BINYANIM.SHAFEL;
    }
  }

  // =========================================================================
  // Extract likely root (3-letter)
  // =========================================================================
  let root = lookupResult?.headword || lookupResult?.root || null;
  if (!root && word.length >= 3) {
    root = word.replace(/^[והבלמכשדנאת]+/, '').replace(/[ותיםןהא]+$/, '');
    if (root.length > 3) root = root.substring(0, 3);
    if (root.length < 3) root = null;
  }

  // If nothing detected, probably not a verb
  if (!detectedBinyan && !detectedTense && !detectedPerson) {
    return null;
  }

  return {
    isVerb: true,
    root,
    binyan: detectedBinyan ? {
      name: detectedBinyan.name,
      hebrew: detectedBinyan.hebrew,
      type: detectedBinyan.type,
      meaning: detectedBinyan.meaning,
    } : null,
    tense: detectedTense ? {
      name: detectedTense.name,
      hebrew: detectedTense.hebrew,
      englishTense: detectedTense.englishTense,
    } : null,
    person: detectedPerson ? {
      person: detectedPerson.person,
      gender: detectedPerson.gender,
      number: detectedPerson.number,
      label: detectedPerson.label,
      meaning: detectedPerson.meaning,
    } : null,
    language: isAramaic ? 'Aramaic' : 'Hebrew',
    confidence,
  };
};

/**
 * Format verb grammar as display object
 * @param {Object} grammar - Result from analyzeVerbGrammar
 * @returns {Object|null} - Formatted for UI display
 */
export const formatVerbGrammar = (grammar) => {
  if (!grammar || !grammar.isVerb) return null;

  const parts = [];

  if (grammar.root) {
    parts.push({
      label: 'Root',
      value: grammar.root,
      hebrew: 'שׁוֹרֶשׁ'
    });
  }

  if (grammar.binyan) {
    parts.push({
      label: 'Binyan',
      value: grammar.binyan.name,
      hebrew: grammar.binyan.hebrew,
      description: grammar.binyan.meaning
    });
  }

  if (grammar.tense) {
    parts.push({
      label: 'Tense',
      value: grammar.tense.name,
      hebrew: grammar.tense.hebrew,
      englishTense: grammar.tense.englishTense
    });
  }

  if (grammar.person) {
    parts.push({
      label: 'Person',
      value: grammar.person.label,
      meaning: grammar.person.meaning
    });
  }

  return {
    parts,
    confidence: grammar.confidence,
    language: grammar.language,
    summary: parts.map(p => `${p.label}: ${p.value}`).join(' | ')
  };
};

/**
 * Get binyan info by name
 * @param {string} name - Binyan name (e.g., 'Qal', "Nif'al")
 * @param {boolean} isAramaic - Whether to use Aramaic binyanim
 * @returns {Object|null}
 */
export const getBinyanInfo = (name, isAramaic = false) => {
  const binyanim = isAramaic ? ARAMAIC_BINYANIM : BINYANIM;
  const key = Object.keys(binyanim).find(k =>
    binyanim[k].name.toLowerCase() === name.toLowerCase()
  );
  return key ? binyanim[key] : null;
};
