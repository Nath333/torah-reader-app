// =============================================================================
// Analyse morphologique — verbe (binyan enrichi), mot (préfixes/suffixes/
// racine), phrase, résumé grammatical, gloss inline.
// (extrait de grammarAnalysisService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { stripAllDiacritics } from '../../../utils/hebrewUtils';
import { extractRoot, detectBinyan } from './rootBinyan';
import { BINYANIM, TENSES, PARTS_OF_SPEECH, PREFIXES, SUFFIXES } from './data';

/**
 * Analyze verb morphology with enhanced Binyan detection
 */
export function analyzeVerb(word, context = {}) {
  const rootAnalysis = extractRoot(word);

  // Use enhanced Binyan detection
  const binyanResult = detectBinyan(word);

  // Detect tense from context and form
  const cleaned = stripAllDiacritics(word);
  let detectedTense = null;
  let tenseConfidence = 'low';

  // Wayyiqtol (vav + prefix form with dagesh)
  if (word.startsWith('וַיּ') || word.startsWith('וַתּ') || word.startsWith('וָא') || word.startsWith('וַנּ')) {
    detectedTense = 'wayyiqtol';
    tenseConfidence = 'high';
  }
  // Weqatal (vav + suffix form)
  else if (word.startsWith('וְ') && (word.endsWith('תי') || word.endsWith('תָּ'))) {
    detectedTense = 'weqatal';
    tenseConfidence = 'high';
  }
  // Imperative (usually short form, no prefix)
  else if (cleaned.length === 3 || (cleaned.length === 4 && cleaned.endsWith('י'))) {
    if (context.isCommand) {
      detectedTense = 'imperative';
      tenseConfidence = 'medium';
    }
  }
  // Participle patterns (מ prefix for active)
  else if (cleaned.startsWith('מ') && !cleaned.startsWith('מת')) {
    detectedTense = 'participle_active';
    tenseConfidence = 'medium';
  }
  // Passive participle patterns
  else if (word.match(/קָ.וּ.$/)) {
    detectedTense = 'participle_passive';
    tenseConfidence = 'medium';
  }
  // Infinitive construct with ל
  else if (cleaned.startsWith('ל') && cleaned.length > 3) {
    detectedTense = 'infinitive_construct';
    tenseConfidence = 'high';
  }
  // Perfect (suffix conjugation) - has person/number suffixes
  else if (word.endsWith('תי') || word.endsWith('תָּ') || word.endsWith('נו') || word.endsWith('תם')) {
    detectedTense = 'perfect';
    tenseConfidence = 'high';
  }
  // Imperfect (prefix conjugation)
  else if (cleaned.match(/^[יתאנ]/)) {
    detectedTense = 'imperfect';
    tenseConfidence = 'medium';
  }

  // Calculate overall confidence
  const overallConfidence =
    binyanResult.confidence === 'high' && tenseConfidence === 'high' ? 'high' :
    binyanResult.confidence === 'high' || tenseConfidence === 'high' ? 'medium' : 'low';

  return {
    ...rootAnalysis,
    partOfSpeech: PARTS_OF_SPEECH.verb,
    binyan: binyanResult.binyanData || null,
    binyanKey: binyanResult.binyanKey,
    binyanConfidence: binyanResult.confidence,
    binyanIndicators: binyanResult.indicators,
    isAramaic: binyanResult.isAramaic,
    tense: detectedTense ? TENSES[detectedTense] : null,
    tenseKey: detectedTense,
    tenseConfidence,
    analysis: {
      type: 'verb',
      confidence: overallConfidence
    }
  };
}

/**
 * Analyze a Hebrew word and return full grammatical breakdown
 */
export function analyzeWord(word, context = {}) {
  if (!word || typeof word !== 'string') {
    return null;
  }

  // Remove nikud for analysis but keep original
  const withoutNikud = stripAllDiacritics(word);
  const rootAnalysis = extractRoot(word);

  // Determine part of speech heuristically
  let partOfSpeech = null;
  let additionalInfo = {};

  // Check for common particles/prepositions
  const particles = ['את', 'אל', 'על', 'עם', 'בין', 'תחת', 'אחר', 'לפני', 'אחרי'];
  if (particles.includes(withoutNikud)) {
    partOfSpeech = PARTS_OF_SPEECH.preposition;
  }

  // Check for conjunctions
  const conjunctions = ['כי', 'אם', 'או', 'גם', 'רק', 'אך', 'אף', 'פן'];
  if (conjunctions.includes(withoutNikud)) {
    partOfSpeech = PARTS_OF_SPEECH.conjunction;
  }

  // Check for pronouns
  const pronouns = ['אני', 'אנכי', 'אתה', 'את', 'הוא', 'היא', 'אנחנו', 'אתם', 'אתן', 'הם', 'הן', 'זה', 'זאת', 'אלה'];
  if (pronouns.includes(withoutNikud)) {
    partOfSpeech = PARTS_OF_SPEECH.pronoun;
  }

  // Check for interrogatives
  const interrogatives = ['מה', 'מי', 'איה', 'איך', 'למה', 'מדוע', 'מתי', 'איפה', 'כמה'];
  if (interrogatives.includes(withoutNikud)) {
    partOfSpeech = PARTS_OF_SPEECH.particle;
    additionalInfo.subtype = 'interrogative';
  }

  // If starts with definite article, likely noun
  if (rootAnalysis.prefixes.some(p => p.type === 'article')) {
    partOfSpeech = partOfSpeech || PARTS_OF_SPEECH.noun;
  }

  // IMPORTANT: Check for NOUN patterns BEFORE verb analysis
  // Words with plural suffixes are almost always NOUNS, not verbs
  const nounSuffixes = ['ות', 'ים', 'ין', 'ה', 'ת']; // Common noun endings
  const hasNounSuffix = nounSuffixes.some(s => withoutNikud.endsWith(s));

  // Common noun patterns (abstract nouns, feminine nouns)
  // יציאה, יציאות = going out (NOUN), not Qal imperfect
  const isAbstractNoun = withoutNikud.match(/^[מת]?[יו]?צי?א(ה|ות)?$/) || // יציאה pattern
                         withoutNikud.match(/^[מת]?[יו]?כניס(ה|ות)?$/) || // הכנסה pattern
                         withoutNikud.endsWith('ות') ||                    // Feminine plural
                         (withoutNikud.endsWith('ה') && withoutNikud.length > 3); // Feminine singular

  // Mark as noun if has clear noun suffix
  if (!partOfSpeech && hasNounSuffix && (isAbstractNoun || withoutNikud.endsWith('ות') || withoutNikud.endsWith('ים'))) {
    partOfSpeech = PARTS_OF_SPEECH.noun;
  }

  // Check if it's a verb by patterns - but ONLY if we don't already know it's a noun
  if (!partOfSpeech && rootAnalysis.rootInfo) {
    const verbAnalysis = analyzeVerb(word, context);
    // Only treat as verb if we have HIGH or MEDIUM confidence
    // Low confidence + noun suffix = probably a noun, not a verb
    if (verbAnalysis.binyan && verbAnalysis.binyanConfidence !== 'low') {
      return verbAnalysis;
    }
    // If confidence is low but we have a clear tense indicator, still treat as verb
    if (verbAnalysis.tense && verbAnalysis.tenseConfidence !== 'low') {
      return verbAnalysis;
    }
  }

  // Default to noun if has a known root
  if (!partOfSpeech && rootAnalysis.rootInfo) {
    partOfSpeech = PARTS_OF_SPEECH.noun;
  }

  return {
    word,
    withoutNikud,
    ...rootAnalysis,
    partOfSpeech: partOfSpeech || { name: 'Unknown', hebrew: 'לא ידוע', abbr: '?' },
    ...additionalInfo,
    analysis: {
      type: partOfSpeech?.name?.toLowerCase() || 'unknown',
      confidence: partOfSpeech ? 'medium' : 'low'
    }
  };
}

/**
 * Analyze a phrase or sentence
 */
export function analyzePhrase(text) {
  if (!text) return [];

  // Split into words (handling Hebrew text)
  const words = text.split(/\s+/).filter(w => w.length > 0);

  return words.map((word, index) => ({
    position: index,
    ...analyzeWord(word, { position: index, total: words.length })
  }));
}

/**
 * Get grammatical summary for display
 */
export function getGrammarSummary(analysis) {
  if (!analysis) return '';

  const parts = [];

  if (analysis.partOfSpeech) {
    parts.push(analysis.partOfSpeech.name);
  }

  if (analysis.binyan) {
    parts.push(analysis.binyan.name);
  }

  if (analysis.tense) {
    parts.push(analysis.tense.name);
  }

  if (analysis.root && analysis.rootInfo) {
    parts.push(`Root: ${analysis.root} (${analysis.rootInfo.meaning})`);
  }

  if (analysis.prefixes && analysis.prefixes.length > 0) {
    const prefixStr = analysis.prefixes.map(p => `${p.letter} (${p.meaning})`).join(' + ');
    parts.push(`Prefixes: ${prefixStr}`);
  }

  return parts.join(' | ');
}

/**
 * Get quick inline gloss for a word
 */
export function getInlineGloss(word) {
  const analysis = analyzeWord(word);
  if (!analysis) return null;

  // Build a concise gloss
  let gloss = '';

  // Add prefix meanings if present
  if (analysis.prefixes && analysis.prefixes.length > 0) {
    gloss += analysis.prefixes.map(p => p.meaning.split('/')[0]).join('-') + ' ';
  }

  // Add root meaning
  if (analysis.rootInfo) {
    gloss += analysis.rootInfo.meaning;
  } else if (analysis.root) {
    gloss += `[${analysis.root}]`;
  } else {
    gloss += word;
  }

  return {
    gloss,
    full: analysis,
    partOfSpeech: analysis.partOfSpeech?.abbr || '?'
  };
}

