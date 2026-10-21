// =============================================================================
// Analyse morphologique à confiance (PRO SCHOLAR) — multiples lectures
// scorées, verbes faibles, abréviations, score araméen.
// (extrait de constants/morphology.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics } from '../../utils/hebrewUtils';
import { STOP_WORDS, FUNCTION_WORDS } from './functionWords';
import { HEBREW_PREFIX_MEANINGS, getCombinedPrefixMeaning } from './prefixSuffixData';
import { VERB_PATTERNS, ARAMAIC_VERB_PATTERNS, NOUN_PATTERNS } from './patternsData';
import { extractAramaicRoot } from './aramaicMorphology';

// =============================================================================
// PRO SCHOLAR: CONFIDENCE-BASED MORPHOLOGY ANALYSIS
// =============================================================================
// Instead of binary yes/no decisions, this system returns:
// - Multiple interpretations with confidence scores (0-100)
// - Pattern-based detection (not just hardcoded lists)
// - Weak verb detection (א, ה, ו, י, נ roots)
// - Abbreviation detection
// - Ambiguity handling (all possibilities ranked)
// =============================================================================

/**
 * Weak verb root letters - these can drop/change in conjugations
 * This is crucial for accurate morphology analysis
 */
const WEAK_VERB_LETTERS = {
  'א': 'guttural',   // Aleph - often quiesces (becomes silent)
  'ה': 'guttural',   // He - often drops, especially in Hifil
  'ח': 'guttural',   // Chet - affects vowel patterns
  'ע': 'guttural',   // Ayin - affects vowel patterns
  'ו': 'hollow',     // Vav - middle weak (קום, שים, בוא)
  'י': 'hollow',     // Yod - middle weak, initial weak (ישב, ילד)
  'נ': 'assimilating', // Nun - assimilates into following letter (נתן → תן)
};

/**
 * Detect if a word might be from a weak verb root
 * Returns { isWeak, type, possibleRoots }
 */
const detectWeakVerb = (word) => {
  if (!word || word.length < 2) return { isWeak: false };

  const results = [];

  // Check if word contains weak letters (for metadata)
  const weakLettersInWord = [...word].filter(c => WEAK_VERB_LETTERS[c]);
  const hasGuttural = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'guttural');
  const hasHollow = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'hollow');
  const hasAssimilating = weakLettersInWord.some(c => WEAK_VERB_LETTERS[c] === 'assimilating');

  // Check for nun-assimilation (initial nun dropped)
  // Pattern: If word starts with doubled consonant, original might have נ
  // Example: תן (give!) from נתן, גש (approach!) from נגש
  if (word.length >= 2) {
    const possibleNunRoot = 'נ' + word;
    results.push({
      type: 'nun-assimilating',
      originalRoot: possibleNunRoot,
      confidence: 40, // Low confidence - needs dictionary verification
      reason: 'Possible נ assimilation'
    });
  }

  // Check for hollow verbs (middle ו/י dropped)
  // Pattern: 2-letter stem might be from 3-letter hollow root
  // Example: קם (stood) from קום, שם (put) from שים
  if (word.length === 2) {
    results.push({
      type: 'hollow-vav',
      originalRoot: word[0] + 'ו' + word[1],
      confidence: 50,
      reason: 'Possible hollow verb (middle ו)'
    });
    results.push({
      type: 'hollow-yod',
      originalRoot: word[0] + 'י' + word[1],
      confidence: 45,
      reason: 'Possible hollow verb (middle י)'
    });
  }

  // Check for initial yod verbs (yod might have dropped)
  // Pattern: Forms that start with conjugation prefix + 2 letters
  // Example: תשב (you sit) from ישב - yod dropped
  const conjPrefixes = ['א', 'ת', 'י', 'נ', 'מ'];
  if (word.length >= 3 && conjPrefixes.includes(word[0])) {
    const stem = word.slice(1);
    if (stem.length === 2) {
      results.push({
        type: 'initial-yod',
        originalRoot: 'י' + stem,
        confidence: 55,
        reason: 'Possible initial י verb'
      });
    }
  }

  // Check for he-ending verbs (lamed-he verbs)
  // Pattern: Root ends with ה which changes to י/ת in conjugations
  // Example: בנה (build), עשה (do), ראה (see)
  if (word.endsWith('ה') && word.length >= 3) {
    results.push({
      type: 'lamed-he',
      originalRoot: word,
      confidence: 60,
      reason: 'Lamed-ה verb (ה as third radical)'
    });
  }

  // Check if word ends with ית/ות (feminine/abstract from lamed-he)
  if (word.endsWith('ית') || word.endsWith('ות')) {
    const stem = word.slice(0, -2);
    if (stem.length >= 2) {
      results.push({
        type: 'lamed-he-derived',
        originalRoot: stem + 'ה',
        confidence: 55,
        reason: 'Derived from lamed-ה verb'
      });
    }
  }

  return {
    isWeak: results.length > 0 || weakLettersInWord.length > 0,
    possibilities: results,
    metadata: {
      weakLettersFound: weakLettersInWord,
      hasGuttural,
      hasHollow,
      hasAssimilating
    }
  };
};

/**
 * Detect if a word is an abbreviation
 * Returns { isAbbreviation, expansion, confidence }
 */
const detectAbbreviation = (word) => {
  if (!word) return { isAbbreviation: false };

  const results = [];

  // Check for geresh (') - common abbreviation marker
  // Example: ר' = רבי (Rabbi), ה' = השם (God's name)
  if (word.includes("'") || word.includes('׳')) {
    const parts = word.split(/[׳']/);
    results.push({
      type: 'geresh-abbreviation',
      confidence: 85,
      reason: 'Contains geresh (abbreviation marker)',
      letters: parts[0]
    });
  }

  // Check for gershayim (") - acronym marker
  // Example: רש"י = רבי שלמה יצחקי, ב"ה = בית הלל
  if (word.includes('"') || word.includes('״')) {
    results.push({
      type: 'acronym',
      confidence: 90,
      reason: 'Contains gershayim (acronym marker)',
      letters: word.replace(/[״"]/g, '')
    });
  }

  // Common single-letter abbreviations in context
  const singleLetterAbbrevs = {
    'ר': { expansion: 'רבי', meaning: 'Rabbi' },
    'ד': { expansion: 'דף', meaning: 'page' },
    'פ': { expansion: 'פרק', meaning: 'chapter' },
    'ע': { expansion: 'עמוד', meaning: 'column/page' },
    'ג': { expansion: 'גמרא', meaning: 'Gemara' },
    'מ': { expansion: 'משנה', meaning: 'Mishnah' },
  };

  if (word.length === 1 && singleLetterAbbrevs[word]) {
    const abbrev = singleLetterAbbrevs[word];
    results.push({
      type: 'single-letter',
      expansion: abbrev.expansion,
      meaning: abbrev.meaning,
      confidence: 70, // Medium - depends on context
      reason: 'Single letter (common abbreviation)'
    });
  }

  return {
    isAbbreviation: results.length > 0,
    possibilities: results
  };
};

/**
 * PRO SCHOLAR: Comprehensive word analysis with confidence scores
 * Returns ALL possible interpretations ranked by confidence
 *
 * @param {string} word - Hebrew/Aramaic word to analyze
 * @param {object} options - { context: 'talmudic'|'biblical'|'mixed' }
 * @returns {object} - { interpretations: [...], bestGuess: {...}, metadata: {...} }
 */
export const analyzeWordWithConfidence = (word, options = {}) => {
  if (!word || word.length === 0) {
    return { interpretations: [], bestGuess: null, metadata: { error: 'Empty word' } };
  }

  const context = options.context || 'mixed';
  const interpretations = [];

  // Clean word (remove nikud for analysis) - use hebrewUtils (DRY)
  const cleanWord = stripAllDiacritics(word);

  // =========================================================================
  // LAYER 1: Check for abbreviations FIRST
  // =========================================================================
  const abbrevResult = detectAbbreviation(cleanWord);
  if (abbrevResult.isAbbreviation) {
    for (const poss of abbrevResult.possibilities) {
      interpretations.push({
        type: 'abbreviation',
        word: cleanWord,
        interpretation: poss.expansion || 'abbreviated form',
        confidence: poss.confidence,
        reason: poss.reason,
        source: 'pattern-detection'
      });
    }
  }

  // =========================================================================
  // LAYER 2: Check FUNCTION_WORDS (known common words)
  // =========================================================================
  if (FUNCTION_WORDS[cleanWord]) {
    interpretations.push({
      type: 'function-word',
      word: cleanWord,
      interpretation: FUNCTION_WORDS[cleanWord],
      confidence: 95,
      reason: 'Known function word',
      source: 'curated-list'
    });
  }

  // =========================================================================
  // LAYER 3: Check STOP_WORDS (complete words that shouldn't be parsed)
  // =========================================================================
  if (STOP_WORDS.has(cleanWord)) {
    interpretations.push({
      type: 'complete-word',
      word: cleanWord,
      interpretation: cleanWord,
      confidence: 90,
      reason: 'Known complete word (stop word)',
      source: 'curated-list'
    });
  }

  // =========================================================================
  // LAYER 4: Pattern-based detection (SYSTEMATIC - replaces hardcoding)
  // =========================================================================

  // 4a. Aramaic emphatic state (ends with א)
  if (cleanWord.length >= 4 && cleanWord.endsWith('א')) {
    const beforeAleph = cleanWord[cleanWord.length - 2];
    if (!['א', 'ו', 'י'].includes(beforeAleph)) {
      interpretations.push({
        type: 'aramaic-emphatic',
        word: cleanWord,
        interpretation: cleanWord + ' (definite)',
        confidence: 75,
        reason: 'Aramaic emphatic state (ends with א)',
        source: 'pattern-detection'
      });
    }
  }

  // 4b. Aramaic plural (ends with ין, יא, ן)
  if (cleanWord.length >= 4) {
    if (cleanWord.endsWith('ין')) {
      interpretations.push({
        type: 'aramaic-plural',
        word: cleanWord,
        interpretation: cleanWord.slice(0, -2) + ' (plural)',
        confidence: 70,
        reason: 'Aramaic masculine plural ending',
        source: 'pattern-detection'
      });
    }
    if (cleanWord.endsWith('ן') && !cleanWord.endsWith('ין')) {
      interpretations.push({
        type: 'aramaic-plural-short',
        word: cleanWord,
        interpretation: cleanWord.slice(0, -1) + ' (plural)',
        confidence: 60,
        reason: 'Aramaic plural (short form)',
        source: 'pattern-detection'
      });
    }
  }

  // 4c. Hebrew verb patterns
  for (const pattern of VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'hebrew-verb',
        word: cleanWord,
        interpretation: cleanWord + ' (verb form)',
        confidence: 70,
        reason: 'Matches Hebrew verb pattern',
        source: 'pattern-detection'
      });
      break; // Only add once
    }
  }

  // 4d. Aramaic verb patterns
  for (const pattern of ARAMAIC_VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'aramaic-verb',
        word: cleanWord,
        interpretation: cleanWord + ' (Aramaic verb)',
        confidence: context === 'talmudic' ? 80 : 65,
        reason: 'Matches Aramaic verb pattern',
        source: 'pattern-detection'
      });
      break;
    }
  }

  // 4e. Noun patterns (mishkalim)
  for (const pattern of NOUN_PATTERNS) {
    if (pattern.test(cleanWord)) {
      interpretations.push({
        type: 'hebrew-noun',
        word: cleanWord,
        interpretation: cleanWord + ' (noun form)',
        confidence: 65,
        reason: 'Matches Hebrew noun pattern',
        source: 'pattern-detection'
      });
      break;
    }
  }

  // =========================================================================
  // 4f. PRO SCHOLAR: SMART ROOT EXTRACTION (THE KEY FIX!)
  // =========================================================================
  // This is the SYSTEMATIC solution for verbs like תפיקו:
  // - Strips suffix (ו) → תפיק
  // - Identifies conjugation prefix (ת) → stem is פיק
  // - Reconstructs weak root: נ + פק = נפק ← VALIDATED against common roots
  // - Returns high confidence because נפק is a known Talmudic root
  // =========================================================================
  const aramaicRoot = extractAramaicRoot(cleanWord);
  if (aramaicRoot && aramaicRoot.confidence >= 70) {
    interpretations.push({
      type: 'aramaic-verb-reconstructed',
      word: cleanWord,
      root: aramaicRoot.root,
      interpretation: `from root ${aramaicRoot.root}`,
      confidence: aramaicRoot.confidence,
      reason: aramaicRoot.explanation || `${aramaicRoot.pattern}`,
      weakType: aramaicRoot.weakType,
      conjugation: aramaicRoot.conjugationPrefix ? {
        prefix: aramaicRoot.conjugationPrefix,
        suffix: aramaicRoot.suffix
      } : null,
      source: 'smart-root-extraction'
    });
  }

  // =========================================================================
  // LAYER 5: Weak verb analysis
  // =========================================================================
  const weakResult = detectWeakVerb(cleanWord);
  if (weakResult.isWeak) {
    for (const poss of weakResult.possibilities) {
      interpretations.push({
        type: 'weak-verb-root',
        word: cleanWord,
        interpretation: poss.originalRoot,
        confidence: poss.confidence,
        reason: poss.reason,
        source: 'pattern-detection'
      });
    }
  }

  // =========================================================================
  // LAYER 6: Prefix analysis (if no high-confidence match yet)
  // =========================================================================
  const highConfidenceExists = interpretations.some(i => i.confidence >= 80);

  if (!highConfidenceExists && cleanWord.length >= 3) {
    // Try prefix stripping
    const firstLetter = cleanWord[0];
    if (HEBREW_PREFIX_MEANINGS[firstLetter]) {
      const stem = cleanWord.slice(1);
      const prefixInfo = HEBREW_PREFIX_MEANINGS[firstLetter];

      // Calculate confidence based on stem quality
      let confidence = 50;

      // Boost if stem is a known word
      if (STOP_WORDS.has(stem) || FUNCTION_WORDS[stem]) {
        confidence = 75;
      }
      // Boost if stem is long enough
      else if (stem.length >= 3) {
        confidence = 60;
      }
      // Penalty if stem is too short
      else if (stem.length <= 2) {
        confidence = 35;
      }

      interpretations.push({
        type: 'prefixed-word',
        word: cleanWord,
        prefix: firstLetter,
        prefixMeaning: prefixInfo.short,
        stem: stem,
        interpretation: `${prefixInfo.short} + ${stem}`,
        confidence: confidence,
        reason: `Prefix ${firstLetter} (${prefixInfo.short}) + stem`,
        source: 'morphology-analysis'
      });
    }

    // Try 2-letter prefix combinations
    if (cleanWord.length >= 4) {
      const first2 = cleanWord.slice(0, 2);
      const stem2 = cleanWord.slice(2);

      if (HEBREW_PREFIX_MEANINGS[first2[0]] && HEBREW_PREFIX_MEANINGS[first2[1]]) {
        const meaning = getCombinedPrefixMeaning(first2);
        let confidence = 45;

        if (STOP_WORDS.has(stem2) || FUNCTION_WORDS[stem2]) {
          confidence = 70;
        } else if (stem2.length >= 3) {
          confidence = 55;
        }

        interpretations.push({
          type: 'double-prefixed-word',
          word: cleanWord,
          prefix: first2,
          prefixMeaning: meaning,
          stem: stem2,
          interpretation: `${meaning} + ${stem2}`,
          confidence: confidence,
          reason: `Double prefix ${first2} (${meaning}) + stem`,
          source: 'morphology-analysis'
        });
      }
    }
  }

  // =========================================================================
  // LAYER 7: If no interpretations found, return low-confidence guess
  // =========================================================================
  if (interpretations.length === 0) {
    interpretations.push({
      type: 'unknown',
      word: cleanWord,
      interpretation: cleanWord,
      confidence: 20,
      reason: 'No pattern matched - raw word',
      source: 'fallback'
    });
  }

  // =========================================================================
  // SORT by confidence and return
  // =========================================================================
  interpretations.sort((a, b) => b.confidence - a.confidence);

  return {
    interpretations,
    bestGuess: interpretations[0],
    metadata: {
      wordLength: cleanWord.length,
      context,
      totalInterpretations: interpretations.length,
      highConfidenceCount: interpretations.filter(i => i.confidence >= 70).length
    }
  };
};

/**
 * Quick check: Is this word likely Aramaic based on patterns?
 * Returns confidence score 0-100
 */
export const getAramaicConfidence = (word) => {
  if (!word) return 0;

  const cleanWord = stripAllDiacritics(word);
  let score = 0;

  // Emphatic state ending (א)
  if (cleanWord.length >= 4 && cleanWord.endsWith('א')) {
    const beforeAleph = cleanWord[cleanWord.length - 2];
    if (!['א', 'ו', 'י'].includes(beforeAleph)) {
      score += 30;
    }
  }

  // Aramaic plural endings
  if (cleanWord.endsWith('ין') || cleanWord.endsWith('יא')) {
    score += 25;
  }

  // Known Aramaic markers
  const aramaicMarkers = ['קא', 'דא', 'הא', 'דק', 'דמ', 'דכ'];
  for (const marker of aramaicMarkers) {
    if (cleanWord.startsWith(marker)) {
      score += 20;
      break;
    }
  }

  // Check Aramaic verb patterns
  for (const pattern of ARAMAIC_VERB_PATTERNS) {
    if (pattern.test(cleanWord)) {
      score += 25;
      break;
    }
  }

  // In FUNCTION_WORDS as Aramaic term
  if (FUNCTION_WORDS[cleanWord] && STOP_WORDS.has(cleanWord)) {
    score += 15;
  }

  return Math.min(score, 100);
};

// =============================================================================
// FUNCTION WORDS - Common particles that need priority lookup
// These often get wrong matches from dictionary morphology
// Used by GlossedText for instant inline translations
// =============================================================================


// =============================================================================
// COMMON ABBREVIATION EXPANSIONS
// Used by abbreviation detection for accurate glossing
// =============================================================================

export const ABBREVIATION_EXPANSIONS = {
  // Single letter with geresh
  "ר'": { expansion: 'רבי', meaning: 'Rabbi' },
  "ה'": { expansion: 'השם', meaning: 'God' },
  "ד'": { expansion: 'דף', meaning: 'page' },
  "פ'": { expansion: 'פרק', meaning: 'chapter' },

  // Common acronyms (ASCII quotes)
  'רש"י': { expansion: 'רבי שלמה יצחקי', meaning: 'Rashi' },
  'רמב"ם': { expansion: 'רבי משה בן מימון', meaning: 'Maimonides' },
  'רמב"ן': { expansion: 'רבי משה בן נחמן', meaning: 'Nachmanides' },
  'ב"ה': { expansion: 'בית הלל', meaning: 'Beit Hillel' },
  'ב"ש': { expansion: 'בית שמאי', meaning: 'Beit Shammai' },
  'ר"ה': { expansion: 'ראש השנה / רשות הרבים', meaning: 'Rosh Hashanah / Public domain' },
  'רה"י': { expansion: 'רשות היחיד', meaning: 'Private domain' },
  'רה"ר': { expansion: 'רשות הרבים', meaning: 'Public domain' },
  'בע"ה': { expansion: 'בעל הבית', meaning: 'homeowner' },
  'דבע"ה': { expansion: 'דבעל הבית', meaning: 'of homeowner' },
  "וגו'": { expansion: 'וגומר', meaning: 'etc.' },
  "וכו'": { expansion: 'וכולי', meaning: 'etc.' },

  // Hebrew gershayim (״) variants - same acronyms with proper Hebrew quotation mark
  'רש״י': { expansion: 'רבי שלמה יצחקי', meaning: 'Rashi' },
  'רמב״ם': { expansion: 'רבי משה בן מימון', meaning: 'Maimonides' },
  'רמב״ן': { expansion: 'רבי משה בן נחמן', meaning: 'Nachmanides' },
  'ב״ה': { expansion: 'בית הלל', meaning: 'Beit Hillel' },
  'ב״ש': { expansion: 'בית שמאי', meaning: 'Beit Shammai' },
  'ר״ה': { expansion: 'ראש השנה / רשות הרבים', meaning: 'Rosh Hashanah / Public domain' },
  'רה״י': { expansion: 'רשות היחיד', meaning: 'Private domain' },
  'רה״ר': { expansion: 'רשות הרבים', meaning: 'Public domain' },
  'בע״ה': { expansion: 'בעל הבית', meaning: 'homeowner' },
  'דבע״ה': { expansion: 'דבעל הבית', meaning: 'of homeowner' },
};


