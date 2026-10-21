// =============================================================================
// Génération d'hypothèses de racine — generateHypotheses + add*Hypotheses
// (préfixes, binyanim, verbes faibles).
// (extrait de rootExtraction.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getAllPrefixVariants } from '../../../utils/prefixTrie';
import { STOP_WORDS } from '../../../constants/morphology';
import { ARAMAIC_PARTICLES } from '../preClassificationService';
import { normalizeFinals, stripVowels } from '../../../utils/hebrewUtils';
import { BINYANIM, WEAK_VERB_TYPES } from './patterns';

// =============================================================================
// HYPOTHESIS GENERATION
// =============================================================================

/**
 * Generate all possible root hypotheses for a word
 * @param {string} word - The Hebrew/Aramaic word
 * @param {Object} options - { textType, maxHypotheses, validateFn }
 * @returns {Array} - Array of { root, confidence, morphology, weakVerb, note }
 */
export function generateHypotheses(word, options = {}) {
  // eslint-disable-next-line no-unused-vars
  const { textType = 'unknown', maxHypotheses = 20, validateFn = null } = options;

  if (!word || word.length < 2) return [];

  // Clean word (remove nikud) and normalize final letters for dictionary lookup
  const cleaned = normalizeFinals(stripVowels(word));

  // === Check ARAMAIC_PARTICLES first (instant lookup) ===
  const particle = ARAMAIC_PARTICLES[cleaned] || ARAMAIC_PARTICLES[word];
  if (particle) {
    return [{
      id: 'aramaic-particle',
      root: particle.root || cleaned,
      confidence: particle.confidence || 95,
      definition: particle.meaning,
      type: particle.type || 'particle',
      form: particle.form,
      isParticle: true,
      morphology: { pattern: 'aramaic-particle' },
      note: `Aramaic particle: ${particle.meaning}`
    }];
  }

  // Check stop words
  if (STOP_WORDS.has(cleaned)) {
    return [{
      root: cleaned,
      confidence: 100,
      morphology: { pattern: 'stop-word' },
      note: 'Protected word (no stripping)'
    }];
  }

  const hypotheses = [];

  // Strategy 1: Try prefix stripping with trie
  const prefixVariants = getAllPrefixVariants(cleaned);
  for (const { prefix, stem } of prefixVariants) {
    if (stem.length >= 2) {
      addRootHypotheses(hypotheses, stem, {
        prefixes: prefix ? [prefix] : [],
        baseConfidence: prefix ? 75 : 85,
        source: prefix ? `prefix-${prefix}` : 'direct'
      });
    }
  }

  // Strategy 2: Suffix stripping
  const suffixPatterns = [
    { suffix: 'ים', type: 'plural-masc', confidence: 85 },
    { suffix: 'ות', type: 'plural-fem', confidence: 85 },
    { suffix: 'ין', type: 'plural-aramaic', confidence: 82 },
    { suffix: 'תי', type: 'past-1s', confidence: 80 },
    { suffix: 'נו', type: 'past-1p', confidence: 80 },
    { suffix: 'תם', type: 'past-2mp', confidence: 80 },
    { suffix: 'ו', type: 'past-3p/suffix', confidence: 75 },
    { suffix: 'ה', type: 'fem/direction', confidence: 70 },
  ];

  for (const { suffix, type, confidence } of suffixPatterns) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 1) {
      const stem = cleaned.slice(0, -suffix.length);
      addRootHypotheses(hypotheses, stem, {
        suffixes: [suffix],
        baseConfidence: confidence,
        source: `suffix-${type}`
      });
    }
  }

  // Strategy 3: Binyan detection
  addBinyanHypotheses(hypotheses, cleaned);

  // Strategy 4: Weak verb reconstructions
  addWeakVerbHypotheses(hypotheses, cleaned);

  // Deduplicate and sort by confidence
  const uniqueRoots = new Map();
  for (const hyp of hypotheses) {
    const key = hyp.root;
    if (!uniqueRoots.has(key) || uniqueRoots.get(key).confidence < hyp.confidence) {
      uniqueRoots.set(key, hyp);
    }
  }

  let results = Array.from(uniqueRoots.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxHypotheses);

  // Optional validation against dictionary
  if (validateFn) {
    results = results.map(hyp => {
      const validation = validateFn(hyp.root);
      if (validation) {
        return {
          ...hyp,
          validated: true,
          confidence: Math.min(hyp.confidence + 15, 100),
          dictionaryEntry: validation
        };
      }
      return { ...hyp, validated: false };
    });

    // Boost validated entries
    results.sort((a, b) => {
      if (a.validated !== b.validated) return b.validated ? 1 : -1;
      return b.confidence - a.confidence;
    });
  }

  return results;
}

/**
 * Add root hypotheses from a stem
 */
function addRootHypotheses(hypotheses, stem, context) {
  const { prefixes = [], suffixes = [], baseConfidence = 70, source = 'stem' } = context;

  // Direct 3-letter root
  if (stem.length === 3) {
    hypotheses.push({
      id: `${source}-direct-${stem}`,
      root: stem,
      confidence: baseConfidence,
      morphology: { prefixes, suffixes, pattern: 'triliteral' },
      note: `Direct triliteral root`
    });
  }

  // 4-letter stem: action noun patterns (קְטִילָה like יציאה from יצא)
  // Pattern: R1-R2-י-R3 where י is inserted for action nouns
  if (stem.length === 4) {
    // Check if 3rd letter is י (common in action nouns like יציאה, בריאה, קריאה)
    if (stem[2] === 'י') {
      const root = stem[0] + stem[1] + stem[3];
      hypotheses.push({
        id: `${source}-actionnoun-${root}`,
        root: root,
        confidence: baseConfidence - 5,
        morphology: { prefixes, suffixes, pattern: 'action-noun', nounPattern: 'קְטִילָה' },
        note: 'Action noun pattern (CeCi\'ah)'
      });
    }
    // Also try dropping last letter for segolate nouns
    const threeLetterRoot = stem.slice(0, 3);
    hypotheses.push({
      id: `${source}-segolate-${threeLetterRoot}`,
      root: threeLetterRoot,
      confidence: baseConfidence - 15,
      morphology: { prefixes, suffixes, pattern: 'segolate' },
      note: 'Possible segolate noun base'
    });
  }

  // 2-letter stem: try weak verb reconstructions
  if (stem.length === 2) {
    // Geminate (doubled middle)
    hypotheses.push({
      id: `${source}-geminate-${stem}`,
      root: stem[0] + stem[1] + stem[1],
      confidence: baseConfidence - 10,
      morphology: { prefixes, suffixes, weakType: WEAK_VERB_TYPES.GEMINATE },
      weakVerb: 'ע"ע',
      note: 'Geminate: doubled middle letter'
    });

    // Lamed-He
    hypotheses.push({
      id: `${source}-lamedhe-${stem}`,
      root: stem + 'ה',
      confidence: baseConfidence - 8,
      morphology: { prefixes, suffixes, weakType: WEAK_VERB_TYPES.LAMED_HE },
      weakVerb: 'ל"ה',
      note: 'Lamed-He: final ה dropped'
    });

    // Ayin-Vav
    hypotheses.push({
      id: `${source}-ayinvav-${stem}`,
      root: stem[0] + 'ו' + stem[1],
      confidence: baseConfidence - 12,
      morphology: { prefixes, suffixes, weakType: WEAK_VERB_TYPES.AYIN_VAV },
      weakVerb: 'ע"ו',
      note: 'Ayin-Vav: hollow verb'
    });

    // Ayin-Yod
    hypotheses.push({
      id: `${source}-ayinyod-${stem}`,
      root: stem[0] + 'י' + stem[1],
      confidence: baseConfidence - 15,
      morphology: { prefixes, suffixes, weakType: WEAK_VERB_TYPES.AYIN_YOD },
      weakVerb: 'ע"י',
      note: 'Ayin-Yod: hollow verb'
    });
  }
}

/**
 * Add binyan-based hypotheses
 */
function addBinyanHypotheses(hypotheses, word) {
  // Hitpael: הת prefix
  if (word.startsWith('הת') && word.length >= 5) {
    const stem = word.slice(2);
    hypotheses.push({
      id: `binyan-hitpael-${stem}`,
      root: stem.slice(0, 3),
      confidence: 78,
      morphology: { binyan: BINYANIM.HITPAEL, prefixes: ['הת'] },
      note: 'Hitpael pattern detected'
    });
  }

  // Hifil: ה prefix (not הת)
  if (word.startsWith('ה') && !word.startsWith('הת') && word.length >= 4) {
    const stem = word.slice(1);
    if (stem.length >= 3) {
      hypotheses.push({
        id: `binyan-hifil-${stem}`,
        root: stem.slice(0, 3),
        confidence: 72,
        morphology: { binyan: BINYANIM.HIFIL, prefixes: ['ה'] },
        note: 'Hifil pattern detected'
      });
    }
  }

  // Nifal: נ prefix
  if (word.startsWith('נ') && word.length >= 4) {
    const stem = word.slice(1);
    if (stem.length >= 3) {
      hypotheses.push({
        id: `binyan-nifal-${stem}`,
        root: stem.slice(0, 3),
        confidence: 75,
        morphology: { binyan: BINYANIM.NIFAL, prefixes: ['נ'] },
        note: 'Nifal pattern detected'
      });
    }
  }

  // Aphel (Aramaic): א prefix
  if (word.startsWith('א') && word.length >= 4) {
    const stem = word.slice(1);
    hypotheses.push({
      id: `binyan-aphel-${stem}`,
      root: stem.slice(0, 3),
      confidence: 70,
      morphology: { binyan: BINYANIM.APHEL, prefixes: ['א'], language: 'aramaic' },
      note: 'Aphel (Aramaic causative) pattern'
    });
  }

  // Ithpeel (Aramaic): את/אית prefix
  if ((word.startsWith('את') || word.startsWith('אית')) && word.length >= 5) {
    const prefixLen = word.startsWith('אית') ? 3 : 2;
    const stem = word.slice(prefixLen);
    hypotheses.push({
      id: `binyan-ithpeel-${stem}`,
      root: stem.slice(0, 3),
      confidence: 72,
      morphology: { binyan: BINYANIM.ITHPEEL, prefixes: [word.slice(0, prefixLen)], language: 'aramaic' },
      note: 'Ithpeel (Aramaic reflexive) pattern'
    });
  }
}

/**
 * Add weak verb specific hypotheses
 * Complete weak verb support (PE-NUN, PE-YOD, LAMED-HE, etc.)
 */
function addWeakVerbHypotheses(hypotheses, word) {
  // ==========================================================================
  // PE-NUN (פ"נ): First נ assimilates
  // Common verbs: נפק (go out), נתן (give), נפל (fall), נגע (touch), נטל (take)
  // CRITICAL: תפיקו → ת + פיק + ו = Aphel of נפק (the נ disappeared)
  // ==========================================================================
  const peNunPatterns = [
    // Pattern: XיX (2 consonants with yod in middle) → נXX
    { regex: /^([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 82 },
    // Pattern: תXיXו (Aphel 2mp) → נXX
    { regex: /^ת([א-ת])י([א-ת])ו$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 85 },
    // Pattern: תXיX (Aphel 3fs/2ms) → נXX
    { regex: /^ת([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 83 },
    // Pattern: מXיX (Aphel participle) → נXX
    { regex: /^מ([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 80 },
    // Pattern: יXיX (3ms imperfect) → נXX
    { regex: /^י([א-ת])י([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 78 },
    // Pattern: XX (2 consonants) → נXX (assimilated נ) - lower confidence
    { regex: /^([א-ת])([א-ת])$/, reconstruct: (m) => 'נ' + m[1] + m[2], conf: 65 },
  ];

  for (const { regex, reconstruct, conf } of peNunPatterns) {
    const match = word.match(regex);
    if (match) {
      const root = reconstruct(match);
      if (root.length === 3) {
        hypotheses.push({
          id: `weak-penun-${root}`,
          root,
          confidence: conf,
          morphology: { weakType: WEAK_VERB_TYPES.PE_NUN },
          weakVerb: 'פ"נ',
          note: `Pe-Nun: נ assimilated → ${root}`
        });
      }
    }
  }

  // ==========================================================================
  // PE-YOD (פ"י): First י drops or becomes ו
  // Common verbs: ילד (give birth), ישב (sit), ירד (descend), ידע (know)
  // ==========================================================================
  if (word.length >= 2 && word[0] === 'ו') {
    hypotheses.push({
      id: `weak-peyod-${word}`,
      root: 'י' + word.slice(1),
      confidence: 78,
      morphology: { weakType: WEAK_VERB_TYPES.PE_YOD },
      weakVerb: 'פ"י',
      note: `Pe-Yod: י→ו → ${'י' + word.slice(1)}`
    });
  }
  if (word.length === 2) {
    hypotheses.push({
      id: `weak-peyod-dropped-${word}`,
      root: 'י' + word,
      confidence: 70,
      morphology: { weakType: WEAK_VERB_TYPES.PE_YOD },
      weakVerb: 'פ"י',
      note: `Pe-Yod: initial י dropped → ${'י' + word}`
    });
  }

  // ==========================================================================
  // PE-ALEPH (פ"א): First א quiesces
  // Common verbs: אמר (say), אכל (eat), אבד (lose), אהב (love)
  // ==========================================================================
  if (word.length === 2) {
    hypotheses.push({
      id: `weak-pealeph-${word}`,
      root: 'א' + word,
      confidence: 72,
      morphology: { weakType: WEAK_VERB_TYPES.PE_ALEPH },
      weakVerb: 'פ"א',
      note: `Pe-Aleph: initial א quiesced → ${'א' + word}`
    });
  }

  // ==========================================================================
  // LAMED-HE (ל"ה): Final ה alternates with י/ת
  // Common verbs: בנה (build), עשה (do), ראה (see), היה (be)
  // ==========================================================================
  if (word.length >= 2 && /[יהת]$/.test(word)) {
    const base = word.slice(0, -1);
    if (base.length >= 2) {
      hypotheses.push({
        id: `weak-lamedhe-${base}ה`,
        root: base + 'ה',
        confidence: 75,
        morphology: { weakType: WEAK_VERB_TYPES.LAMED_HE },
        weakVerb: 'ל"ה',
        note: `Lamed-He: final alternation → ${base}ה`
      });
    }
  }
  // Also try adding ה to 2-letter stems
  for (const hyp of [...hypotheses]) {
    if (hyp.root && hyp.root.length === 2 && !hyp.weakVerb?.includes('ל"ה')) {
      hypotheses.push({
        id: `${hyp.id}-lamedhe`,
        root: hyp.root + 'ה',
        confidence: hyp.confidence - 5,
        morphology: { ...hyp.morphology, weakType: WEAK_VERB_TYPES.LAMED_HE },
        weakVerb: 'ל"ה',
        note: `${hyp.note || ''} + lamed-he restoration`
      });
    }
  }

  // ==========================================================================
  // LAMED-ALEPH (ל"א): Final א quiesces
  // Common verbs: קרא (call), מצא (find), נשא (carry), בוא (come)
  // ==========================================================================
  for (const hyp of [...hypotheses]) {
    if (hyp.root && hyp.root.length === 2 && !hyp.root.endsWith('א') && !hyp.weakVerb?.includes('ל"א')) {
      hypotheses.push({
        id: `${hyp.id}-lamedaleph`,
        root: hyp.root + 'א',
        confidence: hyp.confidence - 8,
        morphology: { ...hyp.morphology, weakType: WEAK_VERB_TYPES.LAMED_ALEPH },
        weakVerb: 'ל"א',
        note: `${hyp.note || ''} + lamed-aleph restoration`
      });
    }
  }

  // ==========================================================================
  // AYIN-VAV (ע"ו): Middle ו contracts (hollow verbs)
  // Common verbs: קום (rise), שוב (return), בוא (come), מות (die)
  // ==========================================================================
  if (word.length >= 2 && word.length <= 3) {
    const firstLetter = word[0];
    const lastLetter = word[word.length - 1];
    hypotheses.push({
      id: `weak-ayinvav-${firstLetter}ו${lastLetter}`,
      root: firstLetter + 'ו' + lastLetter,
      confidence: 73,
      morphology: { weakType: WEAK_VERB_TYPES.AYIN_VAV },
      weakVerb: 'ע"ו',
      note: `Ayin-Vav hollow verb: ${firstLetter}ו${lastLetter}`
    });
  }

  // ==========================================================================
  // AYIN-YOD (ע"י): Middle י contracts
  // Common verbs: שים (put), שיר (sing), דין (judge)
  // ==========================================================================
  if (word.length === 2) {
    hypotheses.push({
      id: `weak-ayinyod-${word[0]}י${word[1]}`,
      root: word[0] + 'י' + word[1],
      confidence: 70,
      morphology: { weakType: WEAK_VERB_TYPES.AYIN_YOD },
      weakVerb: 'ע"י',
      note: `Ayin-Yod hollow verb: ${word[0]}י${word[1]}`
    });
  }

  // ==========================================================================
  // GEMINATE (ע"ע): Doubled middle letter
  // Common verbs: סבב (turn), שמם (be desolate), גלל (roll)
  // ==========================================================================
  for (const hyp of [...hypotheses]) {
    if (hyp.root && hyp.root.length === 2 && !hyp.weakVerb?.includes('ע"ע')) {
      hypotheses.push({
        id: `${hyp.id}-geminate`,
        root: hyp.root + hyp.root[1],
        confidence: hyp.confidence - 8,
        morphology: { ...hyp.morphology, weakType: WEAK_VERB_TYPES.GEMINATE },
        weakVerb: 'ע"ע',
        note: `${hyp.note || ''} + geminate reconstruction`
      });
    }
  }
}

