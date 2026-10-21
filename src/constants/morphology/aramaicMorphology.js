// =============================================================================
// Morphologie araméenne — règles de conjugaison, ARAMAIC_BINYANIM,
// WEAK_VERB_TYPES, calcul de traduction, extraction de racine araméenne.
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getCommonTalmudicRoots, _getRootMeanings } from './rootValidation';

// =============================================================================
// CONJUGATION RULES - Maps prefixes/suffixes to person/number
// Used to COMPUTE translations systematically
// =============================================================================
// SINGLE SOURCE OF TRUTH for conjugation display labels
// =============================================================================

// IMPERFECT (prefix) conjugations - ת/א/נ/י/מ
export const CONJUGATION_PREFIXES = {
  // Imperfect tense prefixes
  'ת': { person: '2nd', label: 'you', meaning: 'you', tense: 'imperfect' },
  'א': { person: '1st', label: 'I', meaning: 'I', tense: 'imperfect' },
  'נ': { person: '1st-pl', label: 'we', meaning: 'we', tense: 'imperfect' },
  'י': { person: '3rd-m', label: 'he/they', meaning: 'he', tense: 'imperfect' },
  // Participle prefix
  'מ': { person: 'participle', label: 'participle', meaning: 'one who', tense: 'participle' },
  // Infinitive prefix
  'ל': { person: 'infinitive', label: 'infinitive', meaning: 'to', tense: 'infinitive' },
  // Ithpeel/Ithpaal reflexive prefix
  'את': { person: 'reflexive', label: 'reflexive', meaning: 'oneself', tense: 'reflexive' },
};

// PERFECT (suffix) conjugations + number/gender suffixes
export const CONJUGATION_SUFFIXES = {
  // Number/gender suffixes (imperfect)
  'ו': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp' },
  'ון': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp/2mp' },
  'ין': { number: 'plural', label: 'plural', shortLabel: '(pl)', person: '3mp' },
  'י': { number: 'feminine', label: 'feminine', shortLabel: '(f)', person: '2fs' },
  'ת': { number: 'feminine', label: 'feminine', shortLabel: '(f)', person: '3fs' },
  'ה': { number: 'feminine/3fs', label: 'feminine/3fs', shortLabel: '(f/3fs)', person: '3fs' },
  'נא': { number: 'emphatic', label: 'emphatic', shortLabel: '', person: '' },
  '': { number: 'singular', label: 'singular', shortLabel: '', person: '3ms' },
  // Perfect tense suffixes (use suffix + _perf to avoid duplicate keys)
  'ית': { number: 'perfect-1s', label: 'I (perf)', shortLabel: '(1s)', person: '1s', tense: 'perfect' },
  'ת_perf': { number: 'perfect-2ms', label: 'you (perf)', shortLabel: '(2ms)', person: '2ms', tense: 'perfect', suffix: 'ת' },
  'תון': { number: 'perfect-2mp', label: 'you (perf)', shortLabel: '(2mp)', person: '2mp', tense: 'perfect' },
  'נן': { number: 'perfect-1p', label: 'we (perf)', shortLabel: '(1p)', person: '1p', tense: 'perfect' },
  // Object suffixes (pronominal) - use suffix + _obj to avoid duplicate keys
  'ני': { number: 'object', label: 'me', shortLabel: '+me', person: 'object-1s' },
  'ך': { number: 'object', label: 'you', shortLabel: '+you', person: 'object-2ms' },
  'יה': { number: 'object', label: 'him', shortLabel: '+him', person: 'object-3ms' },
  'ה_obj': { number: 'object', label: 'her', shortLabel: '+her', person: 'object-3fs', suffix: 'ה' },
  'נא_obj': { number: 'object', label: 'us', shortLabel: '+us', person: 'object-1p', suffix: 'נא' },
  'כון': { number: 'object', label: 'you(pl)', shortLabel: '+you', person: 'object-2mp' },
  'הון': { number: 'object', label: 'them', shortLabel: '+them', person: 'object-3mp' },
};

// =============================================================================
// ARAMAIC BINYANIM (verb stems/patterns)
// =============================================================================
export const ARAMAIC_BINYANIM = {
  // Active stems
  'peal': {
    name: 'Peal',
    hebrewName: 'פְּעַל',
    type: 'basic',
    meaning: 'simple active',
    hebrewEquivalent: 'Qal',
    markers: [],
    description: 'Basic active stem (like Hebrew Qal)'
  },
  'pael': {
    name: 'Pael',
    hebrewName: 'פַּעֵל',
    type: 'intensive',
    meaning: 'intensive active',
    hebrewEquivalent: "Piel",
    markers: ['doubled middle letter'],
    description: 'Intensive stem with doubled middle radical'
  },
  'aphel': {
    name: 'Aphel',
    hebrewName: 'אַפְעֵל',
    type: 'causative',
    meaning: 'causative',
    hebrewEquivalent: "Hiphil",
    markers: ['א prefix', 'הi vowel pattern'],
    description: 'Causative stem (like Hebrew Hiphil)'
  },
  'shafel': {
    name: 'Shafel',
    hebrewName: 'שַׁפְעֵל',
    type: 'causative',
    meaning: 'causative (rare)',
    hebrewEquivalent: 'Hiphil',
    markers: ['שׁ prefix'],
    description: 'Rare causative form with shin prefix'
  },
  // Passive/reflexive stems
  'ithpeel': {
    name: 'Ithpeel',
    hebrewName: 'אִתְפְּעֵל',
    type: 'reflexive',
    meaning: 'reflexive of Peal',
    hebrewEquivalent: 'Niphal/Hitpael',
    markers: ['אית/את prefix'],
    description: 'Reflexive/passive of Peal'
  },
  'ithpaal': {
    name: 'Ithpaal',
    hebrewName: 'אִתְפַּעַל',
    type: 'reflexive-intensive',
    meaning: 'reflexive of Pael',
    hebrewEquivalent: 'Hitpael',
    markers: ['אית/את prefix', 'doubled middle'],
    description: 'Reflexive of Pael (intensive)'
  },
  'ittaphal': {
    name: 'Ittaphal',
    hebrewName: 'אִתַּפְעַל',
    type: 'passive-causative',
    meaning: 'passive of Aphel',
    hebrewEquivalent: 'Hophal',
    markers: ['אית prefix with t'],
    description: 'Passive of Aphel (causative passive)'
  }
};

// =============================================================================
// WEAK VERB CLASSIFICATIONS
// =============================================================================
export const WEAK_VERB_TYPES = {
  'pe-nun': {
    name: 'Pe-Nun',
    hebrewName: 'פ״נ',
    description: 'First root letter is נ (assimilates)',
    examples: ['נפק', 'נתן', 'נפל', 'נגע', 'נטל'],
    behavior: 'נ assimilates into following letter with dagesh'
  },
  'pe-aleph': {
    name: 'Pe-Aleph',
    hebrewName: 'פ״א',
    description: 'First root letter is א',
    examples: ['אמר', 'אכל', 'אבד', 'אחז', 'אסר'],
    behavior: 'א may quiesce or cause vowel changes'
  },
  'pe-yod': {
    name: 'Pe-Yod',
    hebrewName: 'פ״י',
    description: 'First root letter is י (often from original ו)',
    examples: ['ידע', 'ילד', 'ישב', 'יצא', 'ירד'],
    behavior: 'י may drop or shift to ו'
  },
  'hollow': {
    name: 'Hollow/Ayin-Vav-Yod',
    hebrewName: 'ע״ו / ע״י',
    description: 'Middle root letter is ו or י',
    examples: ['קום', 'שים', 'בוא', 'שוב', 'דין'],
    behavior: 'Middle letter contracts or lengthens'
  },
  'geminate': {
    name: 'Geminate/Double-Ayin',
    hebrewName: 'ע״ע',
    description: 'Second and third root letters are identical',
    examples: ['סבב', 'חלל', 'קלל', 'גלל', 'רנן'],
    behavior: 'Doubled letter may simplify or assimilate'
  },
  'lamed-he': {
    name: 'Lamed-He',
    hebrewName: 'ל״ה',
    description: 'Third root letter is ה (often from original ו/י)',
    examples: ['עשה', 'ראה', 'בנה', 'קנה', 'גלה'],
    behavior: 'Final ה alternates with ת/י in conjugation'
  },
  'lamed-aleph': {
    name: 'Lamed-Aleph',
    hebrewName: 'ל״א',
    description: 'Third root letter is א',
    examples: ['קרא', 'מצא', 'ברא', 'נשא', 'מלא'],
    behavior: 'א often quiesces, affects vowel pattern'
  }
};

/**
 * Get display label for conjugation prefix
 * @param {string} prefix - Hebrew prefix character
 * @returns {string} Display label (e.g., 'you', 'I', 'we')
 */
export const getConjugationPrefixLabel = (prefix) => {
  return CONJUGATION_PREFIXES[prefix]?.label || 'prefix';
};

/**
 * Get display label for conjugation suffix
 * @param {string} suffix - Hebrew suffix character(s)
 * @returns {string} Display label (e.g., 'plural', 'feminine')
 */
export const getConjugationSuffixLabel = (suffix) => {
  return CONJUGATION_SUFFIXES[suffix]?.label || 'suffix';
};

/**
 * COMPUTE translation from pattern analysis (NOT hardcoded!)
 * @param {Object} rootAnalysis - Result from extractAramaicRoot
 * @returns {string} - Computed translation like "you (pl) bring out"
 */
export const computeVerbTranslation = (rootAnalysis) => {
  if (!rootAnalysis || !rootAnalysis.root) return null;

  const rootMeaning = _getRootMeanings()[rootAnalysis.root];
  if (!rootMeaning) return null;

  // Get base or causative meaning based on pattern
  // PRO SCHOLAR V6.2: Check both Aramaic (Aphel) and Hebrew (Hifil) causatives
  const isCausative = rootAnalysis.pattern?.includes('Aphel') ||
                      rootAnalysis.pattern?.includes('causative') ||
                      rootAnalysis.pattern?.includes('Hifil') ||
                      rootAnalysis.pattern?.includes('HIFIL') ||
                      rootAnalysis.binyan === 'HIFIL' ||
                      rootAnalysis.binyan === 'Hifil';
  const verbMeaning = isCausative
    ? (rootMeaning.causative || rootMeaning.base)
    : rootMeaning.base;

  // Get person from conjugation prefix
  const conjPrefix = CONJUGATION_PREFIXES[rootAnalysis.conjugationPrefix];
  const personLabel = conjPrefix?.label || '';

  // Get number from suffix (use shortLabel for compact display in translations)
  const conjSuffix = CONJUGATION_SUFFIXES[rootAnalysis.suffix] ||
                     CONJUGATION_SUFFIXES[''];
  const numberLabel = conjSuffix?.shortLabel || '';

  // Build translation: "you (pl) bring out"
  const parts = [personLabel, numberLabel, verbMeaning].filter(Boolean);
  return parts.join(' ').trim();
};

/**
 * Extract TRUE ROOT from Aramaic verb with weak verb reconstruction
 *
 * Key insight: Pe-Nun verbs (פ"נ) lose their first letter in conjugation
 * Example: נפק → Aphel imperfect: תפיק (the נ disappears!)
 *
 * @param {string} word - The verb form (e.g., תפיקו)
 * @returns {Object} - { root, pattern, confidence, conjugation }
 */
/**
 * ENHANCED Aramaic Root Extraction - PRO SCHOLAR Edition
 *
 * Handles ALL 7 weak verb types:
 * - Pe-Nun (פ"נ): first נ assimilates
 * - Pe-Aleph (פ"א): first א quiesces
 * - Pe-Yod (פ"י): first י drops/shifts
 * - Hollow (ע"ו/ע"י): middle letter contracts
 * - Geminate (ע"ע): doubled letter simplifies
 * - Lamed-He (ל"ה): final ה alternates
 * - Lamed-Aleph (ל"א): final א quiesces
 *
 * Detects Aramaic binyanim:
 * - Peal, Pael, Aphel, Ithpeel, Ithpaal, Ittaphal, Shafel
 *
 * @param {string} word - Word to analyze
 * @returns {Object|null} Root analysis with confidence
 */
export const extractAramaicRoot = (word) => {
  if (!word || word.length < 2) return null;

  // Comprehensive suffix list (ordered by length for greedy matching)
  const ARAMAIC_SUFFIXES = [
    'תון', 'הון', 'כון',  // 3-letter
    'ון', 'ין', 'נא', 'נן', 'ית', 'יה',  // 2-letter
    'ו', 'ן', 'י', 'ת', 'ה', 'ך'  // 1-letter
  ];

  const ARAMAIC_CONJ_PREFIXES = ['ת', 'א', 'מ', 'נ', 'י', 'ל'];

  // Reflexive prefixes (Ithpeel/Ithpaal)
  const REFLEXIVE_PREFIXES = ['את', 'אית', 'אש', 'אשת'];

  // Step 1: Check for reflexive prefix (Ithpeel/Ithpaal/Ittaphal)
  let binyan = null;
  let reflexivePrefix = '';
  let workingWord = word;

  for (const refPre of REFLEXIVE_PREFIXES) {
    if (word.startsWith(refPre) && word.length > refPre.length + 2) {
      reflexivePrefix = refPre;
      workingWord = word.slice(refPre.length);
      binyan = refPre.includes('ש') ? 'ittaphal' : 'ithpeel';
      break;
    }
  }

  // Step 2: Strip suffix
  let stem = workingWord;
  let suffix = '';
  for (const suf of ARAMAIC_SUFFIXES) {
    if (workingWord.endsWith(suf) && workingWord.length > suf.length + 2) {
      stem = workingWord.slice(0, -suf.length);
      suffix = suf;
      break;
    }
  }

  // Step 3: Strip conjugation prefix
  let conjPrefix = '';
  let verbStem = stem;

  if (ARAMAIC_CONJ_PREFIXES.includes(stem[0]) && stem.length >= 3) {
    conjPrefix = stem[0];
    verbStem = stem.slice(1);
  }

  // Step 4: Detect doubled middle letter (Pael pattern)
  if (verbStem.length >= 3 && verbStem[1] === verbStem[2]) {
    // Pael: doubled middle = intensive
    binyan = binyan || 'pael';
  }

  // Step 5: Try to reconstruct root from various weak verb patterns

  // Helper to enhance result with ROOT_MEANINGS data
  const enhanceWithRootData = (result) => {
    const rootInfo = _getRootMeanings()[result.root];
    if (rootInfo) {
      result.rootMeaning = rootInfo.base;
      result.causativeMeaning = rootInfo.causative;
      result.etymology = rootInfo.etymology;
      result.cognates = rootInfo.cognates;
      result.frequency = rootInfo.frequency;
      result.semanticField = rootInfo.semanticField;
      // Boost confidence if root has high Talmud frequency
      if (rootInfo.frequency?.talmud > 500) {
        result.confidence = Math.min(95, result.confidence + 5);
      }
      // Use weakType from ROOT_MEANINGS if available
      if (rootInfo.weakType && !result.weakType) {
        result.weakType = WEAK_VERB_TYPES[rootInfo.weakType]?.hebrewName || rootInfo.weakType;
      }
    }
    // Add binyan info
    if (result.binyan && ARAMAIC_BINYANIM[result.binyan]) {
      result.binyanInfo = ARAMAIC_BINYANIM[result.binyan];
    }
    return result;
  };

  // ==========================================================================
  // WEAK VERB RECONSTRUCTION STRATEGIES
  // ==========================================================================

  // Strategy A: Pe-Nun (פ"נ) - first נ assimilates
  // Pattern: CיC or CוC where first radical dropped
  if (verbStem.length === 3 && ['י', 'ו'].includes(verbStem[1])) {
    const c1 = verbStem[0];
    const c3 = verbStem[2];
    const reconstructedNun = 'נ' + c1 + c3;

    if (getCommonTalmudicRoots().has(reconstructedNun)) {
      return enhanceWithRootData({
        root: reconstructedNun,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Aphel (causative)',
        binyan: binyan || 'aphel',
        weakType: 'פ"נ (Pe-Nun)',
        confidence: 85,
        explanation: `Root ${reconstructedNun} - first נ assimilated`
      });
    }
  }

  // Strategy B: Pe-Yod (פ"י) - first י drops
  if (verbStem.length === 3 && ['י', 'ו'].includes(verbStem[1])) {
    const c1 = verbStem[0];
    const c3 = verbStem[2];
    const reconstructedYod = 'י' + c1 + c3;

    if (getCommonTalmudicRoots().has(reconstructedYod)) {
      return enhanceWithRootData({
        root: reconstructedYod,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Aphel (causative)',
        binyan: binyan || 'aphel',
        weakType: 'פ"י (Pe-Yod)',
        confidence: 80,
        explanation: `Root ${reconstructedYod} - first י dropped`
      });
    }
  }

  // Strategy C: Pe-Aleph (פ"א) - first א quiesces
  if (verbStem.length >= 2) {
    // Try adding א at beginning
    const reconstructedAleph = 'א' + verbStem.slice(0, 2);

    if (getCommonTalmudicRoots().has(reconstructedAleph)) {
      return enhanceWithRootData({
        root: reconstructedAleph,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: conjPrefix ? 'conjugated' : 'Peal',
        binyan: binyan || 'peal',
        weakType: 'פ"א (Pe-Aleph)',
        confidence: 75,
        explanation: `Root ${reconstructedAleph} - first א quiesced`
      });
    }
  }

  // Strategy D: Hollow verbs (ע"ו / ע"י) - middle letter contracts
  if (verbStem.length === 2) {
    const c1 = verbStem[0];
    const c2 = verbStem[1];

    // Try ו middle
    const hollowVav = c1 + 'ו' + c2;
    if (getCommonTalmudicRoots().has(hollowVav)) {
      return enhanceWithRootData({
        root: hollowVav,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'hollow verb',
        binyan: binyan || 'peal',
        weakType: 'ע"ו (Hollow-Vav)',
        confidence: 78,
        explanation: `Root ${hollowVav} - middle ו contracted`
      });
    }

    // Try י middle
    const hollowYod = c1 + 'י' + c2;
    if (getCommonTalmudicRoots().has(hollowYod)) {
      return enhanceWithRootData({
        root: hollowYod,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'hollow verb',
        binyan: binyan || 'peal',
        weakType: 'ע"י (Hollow-Yod)',
        confidence: 75,
        explanation: `Root ${hollowYod} - middle י contracted`
      });
    }
  }

  // Strategy E: Geminate verbs (ע"ע) - doubled letter simplifies
  if (verbStem.length === 2) {
    // The doubled letter might have simplified to single
    const geminate = verbStem[0] + verbStem[1] + verbStem[1];
    if (getCommonTalmudicRoots().has(geminate)) {
      return enhanceWithRootData({
        root: geminate,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'geminate verb',
        binyan: binyan || 'peal',
        weakType: 'ע"ע (Geminate)',
        confidence: 72,
        explanation: `Root ${geminate} - doubled letter simplified`
      });
    }
  }

  // Strategy F: Lamed-He (ל"ה) - final ה alternates with ת/י
  if (verbStem.length >= 2 && ['ת', 'י', 'ה'].includes(verbStem[verbStem.length - 1])) {
    const lamedHe = verbStem.slice(0, -1) + 'ה';
    if (lamedHe.length === 3 && getCommonTalmudicRoots().has(lamedHe)) {
      return enhanceWithRootData({
        root: lamedHe,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Lamed-He verb',
        binyan: binyan || 'peal',
        weakType: 'ל"ה (Lamed-He)',
        confidence: 76,
        explanation: `Root ${lamedHe} - final ה alternated`
      });
    }
  }

  // Strategy G: Lamed-Aleph (ל"א) - final א quiesces
  if (verbStem.length >= 2) {
    const lamedAleph = verbStem.slice(0, 2) + 'א';
    if (getCommonTalmudicRoots().has(lamedAleph)) {
      return enhanceWithRootData({
        root: lamedAleph,
        originalStem: verbStem,
        conjugationPrefix: conjPrefix,
        reflexivePrefix,
        suffix,
        pattern: 'Lamed-Aleph verb',
        binyan: binyan || 'peal',
        weakType: 'ל"א (Lamed-Aleph)',
        confidence: 74,
        explanation: `Root ${lamedAleph} - final א quiesced`
      });
    }
  }

  // Strategy H: Direct match (strong verb or already 3-letter root)
  if (verbStem.length === 3 && getCommonTalmudicRoots().has(verbStem)) {
    // Determine binyan from context
    const detectedBinyan = binyan ||
      (conjPrefix === 'מ' ? 'peal' : // participle
       conjPrefix === 'א' && verbStem[0] === verbStem[1] ? 'pael' : // doubled = Pael
       conjPrefix ? 'peal' : 'peal');

    return enhanceWithRootData({
      root: verbStem,
      conjugationPrefix: conjPrefix,
      reflexivePrefix,
      suffix,
      pattern: reflexivePrefix ? 'reflexive' : (conjPrefix ? 'conjugated' : 'root form'),
      binyan: detectedBinyan,
      confidence: 80
    });
  }

  // Strategy I: Try the original word without stripping (it might be the root)
  if (word.length === 3 && getCommonTalmudicRoots().has(word)) {
    return enhanceWithRootData({
      root: word,
      pattern: 'root form',
      binyan: 'peal',
      confidence: 90
    });
  }

  // No match found
  return null;
};
