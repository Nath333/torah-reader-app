// =============================================================================
// PRO SCHOLAR V3: Morphological Analysis Service
// Systematic pattern-based analysis for Hebrew/Aramaic words
// NO HARDCODING - uses pattern matching and root databases
// Returns MULTIPLE possible analyses with confidence scores
// =============================================================================

import { createLogger } from '../../utils/debug';
import { ROOT_MEANINGS } from '../../data/rootDatabase';
import { stripAllDiacritics } from '../../utils/hebrewUtils';

const log = createLogger('MorphAnalysis');
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// ARAMAIC NOUN DATABASE (Common Talmudic nouns)
// These are NOT hardcoded translations - they are ROOT FORMS for lookup
// =============================================================================

const ARAMAIC_NOUNS = {
  // Body/Position terms (very common in Talmud)
  'ריש': { meaning: 'head, beginning, top', hebrew: 'ראש', emphatic: 'רישא' },
  'רישא': { meaning: 'head, beginning', hebrew: 'ראש', isEmphatic: true },
  'קמ': { meaning: 'before, in front of', hebrew: 'לפני' },
  'בתר': { meaning: 'after, behind', hebrew: 'אחר' },
  'גב': { meaning: 'back, top, upon', hebrew: 'גב' },
  'גו': { meaning: 'inside, within', hebrew: 'תוך' },
  'בר': { meaning: 'outside, son', hebrew: 'חוץ/בן' },

  // Common Talmudic nouns
  'מלתא': { meaning: 'word, matter, thing', hebrew: 'דבר', isEmphatic: true },
  'מלת': { meaning: 'word, matter', hebrew: 'דבר' },
  'מילתא': { meaning: 'word, matter', hebrew: 'דבר', isEmphatic: true },
  'שמעתא': { meaning: 'tradition, teaching', hebrew: 'שמועה', isEmphatic: true },
  'סוגיא': { meaning: 'passage, discussion', hebrew: 'סוגיה', isEmphatic: true },
  'מתניתא': { meaning: 'Mishnah teaching', hebrew: 'משנה', isEmphatic: true },
  'ברייתא': { meaning: 'external teaching', hebrew: 'ברייתא', isEmphatic: true },
  'טעמא': { meaning: 'reason, taste', hebrew: 'טעם', isEmphatic: true },
  'דינא': { meaning: 'law, judgment', hebrew: 'דין', isEmphatic: true },
  'עלמא': { meaning: 'world, eternity', hebrew: 'עולם', isEmphatic: true },
  'אתרא': { meaning: 'place', hebrew: 'מקום', isEmphatic: true },
  'זמנא': { meaning: 'time', hebrew: 'זמן', isEmphatic: true },
  'גברא': { meaning: 'man, person', hebrew: 'איש', isEmphatic: true },

  // Legal terms
  'רשותא': { meaning: 'domain, permission', hebrew: 'רשות', isEmphatic: true },
  'איסורא': { meaning: 'prohibition', hebrew: 'איסור', isEmphatic: true },
  'היתרא': { meaning: 'permission', hebrew: 'היתר', isEmphatic: true },
};

// =============================================================================
// PREFIX MEANINGS (Systematic - not word-specific)
// =============================================================================

const PREFIX_MEANINGS = {
  'ב': { meaning: 'in, at, with', type: 'preposition' },
  'ל': { meaning: 'to, for', type: 'preposition' },
  'מ': { meaning: 'from', type: 'preposition' },
  'כ': { meaning: 'like, as, when', type: 'preposition' },
  'ד': { meaning: 'of, that (Aramaic)', type: 'genitive/relative' },
  'ו': { meaning: 'and', type: 'conjunction' },
  'ה': { meaning: 'the', type: 'article' },
  'ש': { meaning: 'that, which', type: 'relative' },
};

// =============================================================================
// SUFFIX MEANINGS (Systematic - not word-specific)
// =============================================================================

const ARAMAIC_POSSESSIVE_SUFFIXES = {
  // Singular
  'י': { meaning: 'my', person: 1, number: 'singular', gender: 'common' },
  'ך': { meaning: 'your (m)', person: 2, number: 'singular', gender: 'masculine' },
  'יך': { meaning: 'your (f)', person: 2, number: 'singular', gender: 'feminine' },
  'יה': { meaning: 'his/its', person: 3, number: 'singular', gender: 'masculine' },
  'ה': { meaning: 'her/its', person: 3, number: 'singular', gender: 'feminine' },

  // Plural
  'נא': { meaning: 'our', person: 1, number: 'plural', gender: 'common' },
  'נן': { meaning: 'our', person: 1, number: 'plural', gender: 'common' },
  'כון': { meaning: 'your (pl)', person: 2, number: 'plural', gender: 'common' },
  'הון': { meaning: 'their', person: 3, number: 'plural', gender: 'masculine' },
  'הן': { meaning: 'their (f)', person: 3, number: 'plural', gender: 'feminine' },
};

// PRO SCHOLAR V5: State suffixes for Aramaic emphatic state detection
const ARAMAIC_STATE_SUFFIXES = {
  'תא': { meaning: 'the (feminine emphatic)', type: 'determinate' },
  'א': { meaning: 'the (emphatic state)', type: 'determinate' },
};

const HEBREW_POSSESSIVE_SUFFIXES = {
  'י': { meaning: 'my', person: 1, number: 'singular' },
  'ך': { meaning: 'your (m.s.)', person: 2, number: 'singular', gender: 'masculine' },
  'ו': { meaning: 'his', person: 3, number: 'singular', gender: 'masculine' },
  'ה': { meaning: 'her', person: 3, number: 'singular', gender: 'feminine' },
  'נו': { meaning: 'our', person: 1, number: 'plural' },
  'כם': { meaning: 'your (m.pl.)', person: 2, number: 'plural', gender: 'masculine' },
  'כן': { meaning: 'your (f.pl.)', person: 2, number: 'plural', gender: 'feminine' },
  'הם': { meaning: 'their (m.)', person: 3, number: 'plural', gender: 'masculine' },
  'הן': { meaning: 'their (f.)', person: 3, number: 'plural', gender: 'feminine' },
};

// =============================================================================
// MULTI-ROOT ANALYSIS FUNCTION
// Returns ALL possible analyses with confidence scores
// =============================================================================

/**
 * Analyze a word and return ALL possible morphological breakdowns
 * This is the PRO SCHOLAR approach - show multiple possibilities
 *
 * @param {string} word - The Hebrew/Aramaic word
 * @param {object} options - Analysis options
 * @returns {Array} - Array of possible analyses, sorted by confidence
 */
export const analyzeWordMorphology = (word, options = {}) => {
  if (!word || word.length < 2) return [];

  const cleaned = stripAllDiacritics(word); // Remove vowels
  const analyses = [];

  // Strategy 1: Try as Aramaic noun with possessive suffix
  const aramaicNounAnalyses = tryAramaicNounWithSuffix(cleaned);
  analyses.push(...aramaicNounAnalyses);

  // Strategy 2: Try as Aramaic emphatic state (detect -א/-תא endings)
  const aramaicStateAnalyses = tryAramaicEmphatic(cleaned);
  analyses.push(...aramaicStateAnalyses);

  // Strategy 3: Try as Hebrew noun with possessive suffix
  const hebrewNounAnalyses = tryHebrewNounWithSuffix(cleaned);
  analyses.push(...hebrewNounAnalyses);

  // Strategy 4: Try as Hebrew verb with binyan pattern
  const hebrewVerbAnalyses = tryHebrewVerbPatterns(cleaned);
  analyses.push(...hebrewVerbAnalyses);

  // Strategy 5: Try as prefixed word (strip prefix, look up root)
  const prefixedAnalyses = tryPrefixStripping(cleaned);
  analyses.push(...prefixedAnalyses);

  // Strategy 6: Direct root lookup
  const directAnalysis = tryDirectLookup(cleaned);
  if (directAnalysis) analyses.push(directAnalysis);

  // Sort by confidence (highest first)
  analyses.sort((a, b) => b.confidence - a.confidence);

  // Deduplicate similar analyses
  const unique = deduplicateAnalyses(analyses);

  if (DEBUG && unique.length > 0) {
    log.debug(`[MorphAnalysis] ${word} → ${unique.length} analyses:`);
    unique.forEach(a => log.debug(`  - ${a.translation} (${a.confidence}%): ${a.breakdown}`));
  }

  return unique;
};

/**
 * Try to analyze as Aramaic noun with possessive suffix
 * Pattern: PREFIX + NOUN_ROOT + POSSESSIVE_SUFFIX
 */
const tryAramaicNounWithSuffix = (word) => {
  const analyses = [];

  // Try all prefix combinations
  const prefixes = ['', 'ב', 'ל', 'מ', 'כ', 'ד', 'ו', 'וב', 'ול', 'דב', 'דל'];

  for (const prefix of prefixes) {
    if (prefix && !word.startsWith(prefix)) continue;

    const afterPrefix = prefix ? word.slice(prefix.length) : word;
    if (afterPrefix.length < 2) continue;

    // Try all possessive suffix combinations
    const suffixes = Object.keys(ARAMAIC_POSSESSIVE_SUFFIXES).sort((a, b) => b.length - a.length);

    for (const suffix of suffixes) {
      if (!afterPrefix.endsWith(suffix)) continue;
      if (afterPrefix.length <= suffix.length) continue;

      const stem = afterPrefix.slice(0, -suffix.length);
      if (stem.length < 1) continue;

      // Check if stem (or stem + emphatic א) is a known Aramaic noun
      const nounInfo = ARAMAIC_NOUNS[stem] || ARAMAIC_NOUNS[stem + 'א'];

      if (nounInfo) {
        const prefixInfo = prefix ? PREFIX_MEANINGS[prefix[0]] || PREFIX_MEANINGS[prefix] : null;
        const suffixInfo = ARAMAIC_POSSESSIVE_SUFFIXES[suffix];

        // Build translation
        let translation = '';
        if (prefixInfo) translation += prefixInfo.meaning + ' ';
        translation += nounInfo.meaning;
        if (suffixInfo) translation += ` (${suffixInfo.meaning})`;

        // Build breakdown
        const parts = [];
        if (prefix) parts.push(`${prefix} (${prefixInfo?.meaning || 'prefix'})`);
        parts.push(`${stem} (${nounInfo.meaning})`);
        parts.push(`${suffix} (${suffixInfo.meaning})`);

        analyses.push({
          type: 'aramaic_noun_possessive',
          original: word,
          prefix: prefix || null,
          prefixMeaning: prefixInfo?.meaning,
          root: stem,
          rootMeaning: nounInfo.meaning,
          suffix: suffix,
          suffixMeaning: suffixInfo.meaning,
          hebrewEquivalent: nounInfo.hebrew,
          translation: translation.trim(),
          breakdown: parts.join(' + '),
          confidence: 85 + (prefix ? 5 : 0), // Higher if has prefix
          language: 'Aramaic',
          source: 'Morphological Analysis'
        });
      }

      // Also check if stem matches a root in ROOT_MEANINGS
      const rootInfo = ROOT_MEANINGS[stem];
      if (rootInfo && !ARAMAIC_NOUNS[stem]) {
        const prefixInfo = prefix ? PREFIX_MEANINGS[prefix[0]] : null;
        const suffixInfo = ARAMAIC_POSSESSIVE_SUFFIXES[suffix];

        let translation = '';
        if (prefixInfo) translation += prefixInfo.meaning + ' ';
        translation += rootInfo.base;
        if (suffixInfo) translation += ` (${suffixInfo.meaning})`;

        analyses.push({
          type: 'root_with_suffix',
          original: word,
          prefix: prefix || null,
          root: stem,
          rootMeaning: rootInfo.base,
          suffix: suffix,
          suffixMeaning: suffixInfo?.meaning,
          translation: translation.trim(),
          breakdown: `${prefix || ''}${stem}+${suffix}`,
          confidence: 70,
          language: rootInfo.etymology?.includes('Aramaic') ? 'Aramaic' : 'Hebrew',
          source: 'Root Database'
        });
      }
    }
  }

  return analyses;
};

/**
 * Try to detect Aramaic emphatic state (-א/-תא endings)
 * Uses ARAMAIC_STATE_SUFFIXES to identify determinate nouns
 */
const tryAramaicEmphatic = (word) => {
  const analyses = [];
  const prefixes = ['', 'ב', 'ל', 'מ', 'כ', 'ד', 'ו'];

  for (const prefix of prefixes) {
    if (prefix && !word.startsWith(prefix)) continue;
    const afterPrefix = prefix ? word.slice(prefix.length) : word;
    if (afterPrefix.length < 3) continue;

    // Check emphatic state suffixes (longest first: תא before א)
    for (const [suffix, suffixInfo] of Object.entries(ARAMAIC_STATE_SUFFIXES)) {
      if (!afterPrefix.endsWith(suffix)) continue;
      const stem = afterPrefix.slice(0, -suffix.length);
      if (stem.length < 2) continue;

      // Check if the full emphatic form is a known Aramaic noun
      const nounInfo = ARAMAIC_NOUNS[afterPrefix] || ARAMAIC_NOUNS[stem];
      if (!nounInfo) continue;

      const prefixInfo = prefix ? PREFIX_MEANINGS[prefix] : null;
      let translation = '';
      if (prefixInfo) translation += prefixInfo.meaning + ' ';
      translation += `the ${nounInfo.meaning}`;

      analyses.push({
        type: 'aramaic_emphatic_state',
        original: word,
        prefix: prefix || null,
        prefixMeaning: prefixInfo?.meaning,
        root: stem,
        rootMeaning: nounInfo.meaning,
        suffix: suffix,
        suffixMeaning: suffixInfo.meaning,
        hebrewEquivalent: nounInfo.hebrew,
        translation: translation.trim(),
        breakdown: `${prefix ? prefix + ' + ' : ''}${stem} + ${suffix} (${suffixInfo.meaning})`,
        confidence: 82,
        language: 'Aramaic',
        source: 'Emphatic State Analysis'
      });
    }
  }
  return analyses;
};

/**
 * Try to analyze as Hebrew noun with possessive suffix
 * Pattern: PREFIX + NOUN_ROOT + POSSESSIVE_SUFFIX
 * Examples: בביתי = ב + בית + י = "in my house"
 */
const tryHebrewNounWithSuffix = (word) => {
  const analyses = [];
  const prefixes = ['', 'ב', 'ל', 'מ', 'כ', 'ו', 'ה', 'ש', 'וב', 'ול', 'וה'];

  for (const prefix of prefixes) {
    if (prefix && !word.startsWith(prefix)) continue;
    const afterPrefix = prefix ? word.slice(prefix.length) : word;
    if (afterPrefix.length < 2) continue;

    // Try all Hebrew possessive suffixes (longest first)
    const suffixes = Object.keys(HEBREW_POSSESSIVE_SUFFIXES).sort((a, b) => b.length - a.length);

    for (const suffix of suffixes) {
      if (!afterPrefix.endsWith(suffix)) continue;
      if (afterPrefix.length <= suffix.length) continue;

      const stem = afterPrefix.slice(0, -suffix.length);
      if (stem.length < 2) continue;

      // Check if stem matches a known root
      const rootInfo = ROOT_MEANINGS[stem];
      if (!rootInfo) continue;

      const prefixInfo = prefix ? PREFIX_MEANINGS[prefix[0]] || PREFIX_MEANINGS[prefix] : null;
      const suffixInfo = HEBREW_POSSESSIVE_SUFFIXES[suffix];

      let translation = '';
      if (prefixInfo) translation += prefixInfo.meaning + ' ';
      translation += rootInfo.base;
      if (suffixInfo) translation += ` (${suffixInfo.meaning})`;

      const parts = [];
      if (prefix) parts.push(`${prefix} (${prefixInfo?.meaning || 'prefix'})`);
      parts.push(`${stem} (${rootInfo.base})`);
      parts.push(`${suffix} (${suffixInfo.meaning})`);

      analyses.push({
        type: 'hebrew_noun_possessive',
        original: word,
        prefix: prefix || null,
        prefixMeaning: prefixInfo?.meaning,
        root: stem,
        rootMeaning: rootInfo.base,
        suffix: suffix,
        suffixMeaning: suffixInfo.meaning,
        translation: translation.trim(),
        breakdown: parts.join(' + '),
        confidence: 75 + (prefix ? 5 : 0),
        language: 'Hebrew',
        source: 'Hebrew Possessive Analysis'
      });
    }
  }
  return analyses;
};

/**
 * Try to analyze as Hebrew verb with binyan pattern
 */
const tryHebrewVerbPatterns = (word) => {
  const analyses = [];

  // Hiphil pattern: הXXיX or prefix + הXXיX
  const hiphilMatch = word.match(/^([לוהב])?ה([א-ת])([א-ת])י([א-ת])$/);
  if (hiphilMatch) {
    const [, prefix, c1, c2, c3] = hiphilMatch;
    const possibleRoots = [
      c1 + c2 + c3,           // Try as 3-letter root
      c1 + 'ו' + c3,          // Try as hollow verb (middle ו)
      c1 + 'י' + c3,          // Try as hollow verb (middle י)
      'נ' + c1 + c2,          // Try as Pe-Nun (first נ dropped)
    ];

    for (const root of possibleRoots) {
      const rootInfo = ROOT_MEANINGS[root];
      if (rootInfo) {
        let translation = rootInfo.causative || `to cause to ${rootInfo.base}`;
        if (prefix === 'ל') translation = 'to ' + translation;

        analyses.push({
          type: 'hebrew_verb_hiphil',
          original: word,
          prefix: prefix || null,
          root: root,
          binyan: 'Hiphil',
          binyanMeaning: 'causative',
          rootMeaning: rootInfo.base,
          translation: translation,
          breakdown: `${prefix || ''}ה${c1}${c2}י${c3} = Hiphil of ${root}`,
          confidence: 80,
          language: 'Hebrew',
          source: 'Binyan Analysis'
        });
      }
    }
  }

  // Niphal pattern: נXXX or prefix + נXXX
  const niphalMatch = word.match(/^([לוב])?נ([א-ת])([א-ת])([א-ת])$/);
  if (niphalMatch) {
    const [, prefix, c1, c2, c3] = niphalMatch;
    const root = c1 + c2 + c3;
    const rootInfo = ROOT_MEANINGS[root];
    if (rootInfo) {
      let translation = rootInfo.passive || `was ${rootInfo.base}`;
      if (prefix === 'ל') translation = 'to be ' + rootInfo.base;

      analyses.push({
        type: 'hebrew_verb_niphal',
        original: word,
        prefix: prefix || null,
        root,
        binyan: 'Niphal',
        binyanMeaning: 'passive/reflexive',
        rootMeaning: rootInfo.base,
        translation,
        breakdown: `${prefix || ''}נ${c1}${c2}${c3} = Niphal of ${root}`,
        confidence: 78,
        language: 'Hebrew',
        source: 'Binyan Analysis'
      });
    }
  }

  // Piel pattern: XXיX (with dagesh on middle letter, approximated as doubled)
  const pielMatch = word.match(/^([לוהב])?([א-ת])([א-ת])י?([א-ת])$/);
  if (pielMatch && !hiphilMatch && !niphalMatch) {
    const [, prefix, c1, c2, c3] = pielMatch;
    const root = c1 + c2 + c3;
    const rootInfo = ROOT_MEANINGS[root];
    if (rootInfo) {
      let translation = rootInfo.intensive || rootInfo.base;
      if (prefix === 'ל') translation = 'to ' + translation;

      analyses.push({
        type: 'hebrew_verb_piel',
        original: word,
        prefix: prefix || null,
        root,
        binyan: 'Piel',
        binyanMeaning: 'intensive',
        rootMeaning: rootInfo.base,
        translation,
        breakdown: `${prefix || ''}${c1}${c2}${c3} = Piel of ${root}`,
        confidence: 60, // Lower confidence - pattern is ambiguous without nikkud
        language: 'Hebrew',
        source: 'Binyan Analysis'
      });
    }
  }

  // Hitpael pattern: הת/את + XXX or prefix + התXXX
  const hitpaelMatch = word.match(/^([לוב])?(הת|את)([א-ת])([א-ת])([א-ת])$/);
  if (hitpaelMatch) {
    const [, prefix, hitPrefix, c1, c2, c3] = hitpaelMatch;
    const root = c1 + c2 + c3;
    const rootInfo = ROOT_MEANINGS[root];
    if (rootInfo) {
      let translation = rootInfo.reflexive || `${rootInfo.base} oneself`;
      if (prefix === 'ל') translation = 'to ' + translation;

      analyses.push({
        type: 'hebrew_verb_hitpael',
        original: word,
        prefix: prefix || null,
        root,
        binyan: 'Hitpael',
        binyanMeaning: 'reflexive',
        rootMeaning: rootInfo.base,
        translation,
        breakdown: `${prefix || ''}${hitPrefix}${c1}${c2}${c3} = Hitpael of ${root}`,
        confidence: 82,
        language: 'Hebrew',
        source: 'Binyan Analysis'
      });
    }
  }

  // Hufal pattern: הוXXX (passive of Hiphil)
  const hufalMatch = word.match(/^([לוב])?הו([א-ת])([א-ת])([א-ת])$/);
  if (hufalMatch) {
    const [, prefix, c1, c2, c3] = hufalMatch;
    const root = c1 + c2 + c3;
    const rootInfo = ROOT_MEANINGS[root];
    if (rootInfo) {
      let translation = `was caused to ${rootInfo.base}`;
      if (prefix === 'ל') translation = 'to be caused to ' + rootInfo.base;

      analyses.push({
        type: 'hebrew_verb_hufal',
        original: word,
        prefix: prefix || null,
        root,
        binyan: 'Hufal',
        binyanMeaning: 'causative passive',
        rootMeaning: rootInfo.base,
        translation,
        breakdown: `${prefix || ''}הו${c1}${c2}${c3} = Hufal of ${root}`,
        confidence: 78,
        language: 'Hebrew',
        source: 'Binyan Analysis'
      });
    }
  }

  return analyses;
};

/**
 * Try stripping prefixes and looking up the remainder
 */
const tryPrefixStripping = (word) => {
  const analyses = [];
  const prefixes = ['ב', 'ל', 'מ', 'כ', 'ד', 'ו', 'ה', 'ש', 'וב', 'ול', 'וה', 'והב', 'כש', 'מש', 'לב'];

  // Sort by length (longest first) for greedy matching
  prefixes.sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    if (!word.startsWith(prefix)) continue;

    const remainder = word.slice(prefix.length);
    if (remainder.length < 2) continue;

    // Check Aramaic nouns
    const aramaicNoun = ARAMAIC_NOUNS[remainder];
    if (aramaicNoun) {
      const prefixInfo = PREFIX_MEANINGS[prefix[0]];
      analyses.push({
        type: 'prefixed_aramaic_noun',
        original: word,
        prefix: prefix,
        prefixMeaning: prefixInfo?.meaning,
        root: remainder,
        rootMeaning: aramaicNoun.meaning,
        translation: `${prefixInfo?.meaning || prefix} ${aramaicNoun.meaning}`,
        breakdown: `${prefix} (${prefixInfo?.meaning}) + ${remainder} (${aramaicNoun.meaning})`,
        confidence: 75,
        language: 'Aramaic',
        source: 'Prefix Analysis'
      });
    }

    // Check ROOT_MEANINGS
    const rootInfo = ROOT_MEANINGS[remainder];
    if (rootInfo) {
      const prefixInfo = PREFIX_MEANINGS[prefix[0]];
      analyses.push({
        type: 'prefixed_root',
        original: word,
        prefix: prefix,
        prefixMeaning: prefixInfo?.meaning,
        root: remainder,
        rootMeaning: rootInfo.base,
        translation: `${prefixInfo?.meaning || prefix} ${rootInfo.base}`,
        breakdown: `${prefix} + ${remainder} (${rootInfo.base})`,
        confidence: 65,
        language: 'Hebrew',
        source: 'Prefix + Root'
      });
    }
  }

  return analyses;
};

/**
 * Try direct lookup in ROOT_MEANINGS
 */
const tryDirectLookup = (word) => {
  const rootInfo = ROOT_MEANINGS[word];
  if (rootInfo) {
    return {
      type: 'direct_root',
      original: word,
      root: word,
      rootMeaning: rootInfo.base,
      translation: rootInfo.base,
      breakdown: `${word} = ${rootInfo.base}`,
      confidence: 90,
      language: 'Hebrew',
      source: 'Root Database'
    };
  }

  const aramaicNoun = ARAMAIC_NOUNS[word];
  if (aramaicNoun) {
    return {
      type: 'direct_aramaic',
      original: word,
      root: word,
      rootMeaning: aramaicNoun.meaning,
      translation: aramaicNoun.meaning,
      breakdown: `${word} = ${aramaicNoun.meaning}`,
      confidence: 90,
      language: 'Aramaic',
      source: 'Aramaic Lexicon'
    };
  }

  return null;
};

/**
 * Deduplicate similar analyses
 */
const deduplicateAnalyses = (analyses) => {
  const seen = new Set();
  return analyses.filter(a => {
    const key = `${a.root}-${a.translation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Get the best analysis (highest confidence)
 */
export const getBestAnalysis = (word, options = {}) => {
  const analyses = analyzeWordMorphology(word, options);
  return analyses.length > 0 ? analyses[0] : null;
};

/**
 * Backward-compatible alias: returns the best single analysis object (or null).
 * Consumers that expect a single-object API should use this instead of analyzeWordMorphology.
 */
export const analyzeMorphology = (word, options = {}) => {
  return getBestAnalysis(word, options);
};

/**
 * Returns a plain-text breakdown string for a word, or null if unanalyzable.
 */
export const getMorphologyBreakdown = (word, options = {}) => {
  const best = getBestAnalysis(word, options);
  return best ? best.breakdown : null;
};

/**
 * Returns only verb (binyan-based) morphology, or null if the word is not verbal.
 */
export const getVerbMorphology = (word, options = {}) => {
  const analyses = analyzeWordMorphology(word, options);
  return analyses.find(a => a.binyan) || null;
};

/**
 * Returns only noun morphology (nominal analyses), or null if the word is not nominal.
 */
export const getNounMorphology = (word, options = {}) => {
  const analyses = analyzeWordMorphology(word, options);
  const nounTypes = new Set([
    'aramaic_noun_possessive',
    'aramaic_emphatic_state',
    'hebrew_noun_possessive',
    'prefixed_aramaic_noun',
    'direct_aramaic',
    'direct_root'
  ]);
  return analyses.find(a => nounTypes.has(a.type)) || null;
};

/**
 * Format analysis for display
 */
export const formatAnalysisForDisplay = (analysis) => {
  if (!analysis) return null;

  return {
    translation: analysis.translation,
    breakdown: analysis.breakdown,
    root: analysis.root,
    rootMeaning: analysis.rootMeaning,
    language: analysis.language,
    confidence: analysis.confidence,
    source: analysis.source,
    details: {
      prefix: analysis.prefix,
      prefixMeaning: analysis.prefixMeaning,
      suffix: analysis.suffix,
      suffixMeaning: analysis.suffixMeaning,
      binyan: analysis.binyan,
      hebrewEquivalent: analysis.hebrewEquivalent
    }
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

const morphologicalAnalysisService = {
  analyzeWordMorphology,
  getBestAnalysis,
  formatAnalysisForDisplay,
  analyzeMorphology,
  getMorphologyBreakdown,
  getVerbMorphology,
  getNounMorphology,
  ARAMAIC_NOUNS,
  PREFIX_MEANINGS,
  ARAMAIC_POSSESSIVE_SUFFIXES,
  HEBREW_POSSESSIVE_SUFFIXES
};

export default morphologicalAnalysisService;
