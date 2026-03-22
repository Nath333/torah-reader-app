/**
 * PRO SCHOLAR V6: Morphology Patterns - SINGLE SOURCE OF TRUTH
 *
 * Consolidates weak verb rules, binyanim, and conjugation patterns that were
 * previously duplicated across:
 * - morphology.js
 * - unifiedRootService.js
 * - morphology/verbPatterns.js
 * - useProScholarV6.js (display config)
 * - WeakVerbIndicator.js (UI patterns)
 *
 * USAGE: Import from this file ONLY. Do not redefine these constants elsewhere.
 *
 * import { WEAK_VERB_RULES, BINYANIM, ARAMAIC_BINYANIM } from '../constants/morphologyPatterns';
 */

// =============================================================================
// WEAK VERB CLASSIFICATION - Complete Rules with Display Config
// =============================================================================

/**
 * Weak verb types with full linguistic AND display information
 * These verbs have root letters that undergo changes during conjugation
 *
 * @property {string} code - Hebrew abbreviation (e.g., 'פ"נ')
 * @property {string} name - English name (e.g., 'Pe-Nun')
 * @property {string} hebrewName - Hebrew label with example (e.g., 'פ״נ (נפל)')
 * @property {string} description - Brief explanation
 * @property {string} behavior - Detailed linguistic behavior
 * @property {string} explanation - User-friendly explanation for UI
 * @property {string[]} examples - Common root examples
 * @property {string[]} commonVerbs - Most common verbs of this type
 * @property {Object} exampleForms - Example verb with forms
 * @property {string} color - Primary UI color (hex)
 * @property {string} bg - Background color for badges (hex)
 * @property {string} icon - Emoji icon for badges
 * @property {Function} reconstruction - Function to reconstruct roots
 * @property {Function} detect - Function to detect this type from a root
 */
export const WEAK_VERB_RULES = {
  PE_NUN: {
    code: 'פ"נ',
    name: 'Pe-Nun',
    hebrewName: 'פ״נ (נפל)',
    description: 'First root letter is נ (assimilates)',
    behavior: 'נ assimilates into following letter with dagesh',
    explanation: 'The נ disappears and the next letter doubles (dagesh)',
    examples: ['נפק', 'נתן', 'נפל', 'נגע', 'נטל'],
    commonVerbs: ['נתן', 'נגע', 'נשׂא', 'נגשׁ', 'נכה'],
    exampleForms: { root: 'נפל', meaning: 'to fall', forms: ['יִפֹּל', 'נָפַל', 'נֹפֵל'] },
    color: '#3B82F6',
    bg: '#DBEAFE',
    icon: '🔷',
    reconstruction: (stem) => ['נ' + stem],
    detect: (root) => root.startsWith('נ'),
  },
  PE_YOD: {
    code: 'פ"י',
    name: 'Pe-Yod',
    hebrewName: 'פ״י (ישׁב)',
    description: 'First root letter is י (often from original ו)',
    behavior: 'י may drop or shift to ו',
    explanation: 'The י disappears in some forms, leaving characteristic vowel patterns',
    examples: ['ידע', 'ילד', 'ישב', 'יצא', 'ירד'],
    commonVerbs: ['ילד', 'ירד', 'יצא', 'ידע', 'יכל'],
    exampleForms: { root: 'ישׁב', meaning: 'to sit/dwell', forms: ['יֵשֵׁב', 'יָשַׁב', 'יוֹשֵׁב'] },
    color: '#8B5CF6',
    bg: '#E0E7FF',
    icon: '💜',
    reconstruction: (stem) => ['י' + stem, 'ו' + stem],
    detect: (root) => root.startsWith('י') || root.startsWith('ו'),
  },
  PE_ALEPH: {
    code: 'פ"א',
    name: 'Pe-Aleph',
    hebrewName: 'פ״א (אמר)',
    description: 'First root letter is א',
    behavior: 'א may quiesce or cause vowel changes',
    explanation: 'The א becomes silent and affects surrounding vowels',
    examples: ['אמר', 'אכל', 'אבד', 'אחז', 'אסר'],
    commonVerbs: ['אכל', 'אבד', 'אהב', 'אסף', 'אפה'],
    exampleForms: { root: 'אמר', meaning: 'to say', forms: ['יֹאמַר', 'אָמַר', 'אֹמֵר'] },
    color: '#06B6D4',
    bg: '#CFFAFE',
    icon: '🔵',
    reconstruction: (stem) => ['א' + stem],
    detect: (root) => root.startsWith('א'),
  },
  AYIN_VAV: {
    code: 'ע"ו',
    name: 'Ayin-Vav',
    hebrewName: 'ע״ו (קום)',
    description: 'Middle root letter is ו (hollow verb)',
    behavior: 'Middle letter contracts or lengthens',
    explanation: 'The ו becomes a long vowel (usually ū or ō), root appears biconsonantal',
    examples: ['קום', 'שוב', 'בוא', 'מות', 'רוץ'],
    commonVerbs: ['שׂום', 'בוא', 'מות', 'שׁוב', 'רום'],
    exampleForms: { root: 'קום', meaning: 'to rise', forms: ['יָקוּם', 'קָם', 'קָם'] },
    color: '#22C55E',
    bg: '#D1FAE5',
    icon: '💚',
    reconstruction: (stem) => {
      if (stem.length === 2) return [stem[0] + 'ו' + stem[1]];
      return [];
    },
    detect: (root) => root.length === 3 && root[1] === 'ו',
  },
  AYIN_YOD: {
    code: 'ע"י',
    name: 'Ayin-Yod',
    hebrewName: 'ע״י (שׂים)',
    description: 'Middle root letter is י (hollow verb)',
    behavior: 'Middle letter contracts or lengthens',
    explanation: 'The י becomes a long vowel (usually ī), root appears biconsonantal',
    examples: ['שים', 'דין', 'בין', 'שיר', 'ריב'],
    commonVerbs: ['בין', 'דין', 'ריב', 'שׁיר'],
    exampleForms: { root: 'שׂים', meaning: 'to put', forms: ['יָשִׂים', 'שָׂם', 'שָׂם'] },
    color: '#10B981',
    bg: '#D1FAE5',
    icon: '🌿',
    reconstruction: (stem) => {
      if (stem.length === 2) return [stem[0] + 'י' + stem[1]];
      return [];
    },
    detect: (root) => root.length === 3 && root[1] === 'י',
  },
  GEMINATE: {
    code: 'ע"ע',
    name: 'Geminate',
    hebrewName: 'ע״ע / כפל (סבב)',
    description: 'Second and third root letters are identical',
    behavior: 'Doubled letter may simplify or assimilate',
    explanation: 'The doubled letter may appear once or twice depending on form',
    examples: ['סבב', 'חלל', 'קלל', 'גלל', 'רנן'],
    commonVerbs: ['חלל', 'גלל', 'סבב', 'רנן', 'שׁמם'],
    exampleForms: { root: 'סבב', meaning: 'to surround', forms: ['יָסֹב', 'סָבַב', 'סוֹבֵב'] },
    color: '#EF4444',
    bg: '#FEE2E2',
    icon: '🔴',
    reconstruction: (stem) => {
      if (stem.length === 2) return [stem[0] + stem[1] + stem[1]];
      return [];
    },
    detect: (root) => root.length === 3 && root[1] === root[2],
  },
  LAMED_HE: {
    code: 'ל"ה',
    name: 'Lamed-He',
    hebrewName: 'ל״ה (עשׂה)',
    description: 'Third root letter is ה (often from original ו/י)',
    behavior: 'Final ה alternates with ת/י in conjugation',
    explanation: 'Final ה appears/disappears; may become י or ת with suffixes',
    examples: ['עשה', 'ראה', 'בנה', 'קנה', 'גלה'],
    commonVerbs: ['ראה', 'היה', 'בנה', 'קנה', 'גלה'],
    exampleForms: { root: 'עשׂה', meaning: 'to do/make', forms: ['יַעֲשֶׂה', 'עָשָׂה', 'עוֹשֶׂה'] },
    color: '#F59E0B',
    bg: '#FEF3C7',
    icon: '🔶',
    reconstruction: (stem) => [stem + 'ה', stem + 'י', stem + 'ו'],
    detect: (root) => root.endsWith('ה'),
  },
  LAMED_ALEPH: {
    code: 'ל"א',
    name: 'Lamed-Aleph',
    hebrewName: 'ל״א (מצא)',
    description: 'Third root letter is א',
    behavior: 'א often quiesces, affects vowel pattern',
    explanation: 'Final א is silent, lengthens preceding vowel',
    examples: ['קרא', 'מצא', 'ברא', 'נשא', 'מלא'],
    commonVerbs: ['קרא', 'נשׂא', 'בא', 'ירא', 'מלא'],
    exampleForms: { root: 'מצא', meaning: 'to find', forms: ['יִמְצָא', 'מָצָא', 'מוֹצֵא'] },
    color: '#EC4899',
    bg: '#FCE7F3',
    icon: '💗',
    reconstruction: (stem) => [stem + 'א'],
    detect: (root) => root.endsWith('א'),
  },
};

/**
 * Extract display-only properties for UI components
 * @param {string} type - Weak verb type key (e.g., 'PE_NUN')
 * @returns {Object|null} Display configuration
 */
export function getWeakVerbDisplay(type) {
  const rule = WEAK_VERB_RULES[type];
  if (!rule) return null;
  return {
    hebrew: rule.code,
    name: rule.name,
    hebrewName: rule.hebrewName,
    color: rule.color,
    bg: rule.bg,
    icon: rule.icon,
    description: rule.description,
    explanation: rule.explanation
  };
}

/**
 * Get all display configurations for UI rendering
 * @returns {Object} Map of type keys to display configs
 */
export const WEAK_VERB_DISPLAY = Object.fromEntries(
  Object.keys(WEAK_VERB_RULES).map(key => [key, getWeakVerbDisplay(key)])
);

/**
 * Quick lookup by Hebrew code
 */
export const WEAK_VERB_BY_CODE = Object.fromEntries(
  Object.values(WEAK_VERB_RULES).map(v => [v.code, v])
);

/**
 * Letters that indicate weak verb types
 */
export const WEAK_VERB_LETTERS = {
  'א': 'guttural',
  'ה': 'guttural',
  'ח': 'guttural',
  'ע': 'guttural',
  'ו': 'hollow',
  'י': 'hollow',
  'נ': 'assimilating',
};

// =============================================================================
// HEBREW BINYANIM (בניינים) - The 7 Verb Patterns
// =============================================================================

export const BINYANIM = {
  QAL: {
    key: 'QAL',
    name: 'Qal',
    hebrew: 'קַל',
    type: 'active',
    meaning: 'simple active',
    description: 'Basic verb form (e.g., שָׁמַר = he guarded)',
    prefix: null,
    patterns: {
      perfect: /^[א-ת]{3}$/,
      participle: /^[א-ת]ו[א-ת][א-ת]$/,
    }
  },
  NIFAL: {
    key: 'NIFAL',
    name: "Nif'al",
    hebrew: 'נִפְעַל',
    type: 'passive/reflexive',
    meaning: 'simple passive',
    description: 'Passive/reflexive (e.g., נִשְׁמַר = he was guarded)',
    prefix: 'נ',
    markers: ['נ'],
    patterns: {
      perfect: /^נ[א-ת]{3}$/,
      imperfect: /^י[א-ת]{3}$/,
      participle: /^נ[א-ת]{3}$/,
    }
  },
  PIEL: {
    key: 'PIEL',
    name: "Pi'el",
    hebrew: 'פִּעֵל',
    type: 'intensive active',
    meaning: 'intensive',
    description: 'Intensive active (e.g., שִׁמֵּר = he guarded carefully)',
    prefix: null,
    doubling: 'middle letter',
    patterns: {
      perfect: /^[א-ת][א-ת]{2}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  PUAL: {
    key: 'PUAL',
    name: "Pu'al",
    hebrew: 'פֻּעַל',
    type: 'intensive passive',
    meaning: 'intensive passive',
    description: 'Intensive passive (e.g., שֻׁמַּר = he was guarded carefully)',
    prefix: null,
    doubling: 'middle letter',
    patterns: {
      perfect: /^[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HIFIL: {
    key: 'HIFIL',
    name: "Hif'il",
    hebrew: 'הִפְעִיל',
    type: 'causative active',
    meaning: 'causative',
    description: 'Causative active (e.g., הִשְׁמִיר = he caused to guard)',
    prefix: 'ה',
    markers: ['ה'],
    patterns: {
      perfect: /^ה[א-ת]{3}$/,
      imperfect: /^י[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HUFAL: {
    key: 'HUFAL',
    name: "Huf'al",
    hebrew: 'הֻפְעַל',
    type: 'causative passive',
    meaning: 'causative passive',
    description: 'Causative passive (e.g., הֻשְׁמַר = he was caused to guard)',
    prefix: 'הו',
    markers: ['ה'],
    patterns: {
      perfect: /^ה[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HITPAEL: {
    key: 'HITPAEL',
    name: "Hitpa'el",
    hebrew: 'הִתְפַּעֵל',
    type: 'reflexive',
    meaning: 'reflexive',
    description: 'Reflexive (e.g., הִשְׁתַּמֵּר = he guarded himself)',
    prefix: 'הת',
    markers: ['הת', 'מת'],
    patterns: {
      perfect: /^הת[א-ת]{3}$/,
      imperfect: /^ית[א-ת]{3}$/,
      participle: /^מת[א-ת]{3}$/,
    }
  },
};

// =============================================================================
// ARAMAIC BINYANIM (Talmudic Aramaic)
// =============================================================================

export const ARAMAIC_BINYANIM = {
  PEAL: {
    key: 'PEAL',
    name: "Pe'al",
    hebrew: 'פְּעַל',
    type: 'active',
    meaning: 'simple active (Aramaic Qal)',
    description: 'Aramaic equivalent of Hebrew Qal',
    prefix: null,
  },
  PAEL: {
    key: 'PAEL',
    name: "Pa'el",
    hebrew: 'פַּעֵל',
    type: 'intensive',
    meaning: 'intensive (Aramaic Piel)',
    description: 'Aramaic equivalent of Hebrew Piel',
    prefix: null,
  },
  APHEL: {
    key: 'APHEL',
    name: "Af'el",
    hebrew: 'אַפְעֵל',
    type: 'causative',
    meaning: 'causative (Aramaic Hifil)',
    description: 'Aramaic causative - "to cause to X"',
    prefix: 'א',
    markers: ['א'],
  },
  ITHPEEL: {
    key: 'ITHPEEL',
    name: "Itpe'el",
    hebrew: 'אִתְפְּעֵל',
    type: 'reflexive',
    meaning: 'reflexive (Aramaic Hitpael)',
    description: 'Aramaic reflexive/passive',
    prefix: 'את',
    markers: ['את', 'אית', 'מת'],
  },
  ITHPAAL: {
    key: 'ITHPAAL',
    name: "Itpa'al",
    hebrew: 'אִתְפַּעַל',
    type: 'passive',
    meaning: 'passive',
    description: 'Aramaic passive of Pa\'el',
    prefix: 'את',
    markers: ['את'],
  },
  SHAFEL: {
    key: 'SHAFEL',
    name: 'Shafel',
    hebrew: 'שַׁפְעֵל',
    type: 'causative',
    meaning: 'causative (ש prefix)',
    description: 'Alternate causative form',
    prefix: 'ש',
    markers: ['ש', 'שת', 'אשת'],
  },
};

// =============================================================================
// TENSE/ASPECT PATTERNS
// =============================================================================

export const TENSE_PATTERNS = {
  PERFECT: {
    key: 'PERFECT',
    name: 'Perfect',
    hebrew: 'עָבָר',
    englishTense: 'past',
    description: 'Completed action',
    suffixes: {
      '': { person: 3, gender: 'm', number: 's', label: '3ms', meaning: 'he' },
      'ה': { person: 3, gender: 'f', number: 's', label: '3fs', meaning: 'she' },
      'ת': { person: 2, gender: 'm', number: 's', label: '2ms', meaning: 'you (m)' },
      'תי': { person: 1, gender: 'c', number: 's', label: '1cs', meaning: 'I' },
      'ו': { person: 3, gender: 'c', number: 'p', label: '3cp', meaning: 'they' },
      'תם': { person: 2, gender: 'm', number: 'p', label: '2mp', meaning: 'you (m.pl)' },
      'תן': { person: 2, gender: 'f', number: 'p', label: '2fp', meaning: 'you (f.pl)' },
      'נו': { person: 1, gender: 'c', number: 'p', label: '1cp', meaning: 'we' },
    }
  },
  IMPERFECT: {
    key: 'IMPERFECT',
    name: 'Imperfect',
    hebrew: 'עָתִיד',
    englishTense: 'future/present',
    description: 'Incomplete action',
    prefixes: {
      'י': { person: 3, gender: 'm', number: 's', label: '3ms', meaning: 'he will' },
      'ת': { person: 3, gender: 'f', number: 's', label: '3fs', meaning: 'she will' },
      'א': { person: 1, gender: 'c', number: 's', label: '1cs', meaning: 'I will' },
      'נ': { person: 1, gender: 'c', number: 'p', label: '1cp', meaning: 'we will' },
    }
  },
  IMPERATIVE: {
    key: 'IMPERATIVE',
    name: 'Imperative',
    hebrew: 'צִוּוּי',
    englishTense: 'command',
    description: 'Direct command',
  },
  PARTICIPLE: {
    key: 'PARTICIPLE',
    name: 'Participle',
    hebrew: 'בֵּינוֹנִי',
    englishTense: 'present/-ing',
    description: 'Verbal adjective (ongoing action)',
    markers: ['מ'],
  },
  INFINITIVE: {
    key: 'INFINITIVE',
    name: 'Infinitive',
    hebrew: 'שֵׁם הַפֹּעַל',
    englishTense: 'to...',
    description: 'Verbal noun',
    markers: ['ל'],
  },
};

// =============================================================================
// ARAMAIC TENSE MARKERS
// =============================================================================

export const ARAMAIC_TENSE = {
  PERFECT: {
    suffixes: {
      '': '3ms',
      'ת': '3fs',
      'ית': '1cs/2ms',
      'ו': '3mp',
      'י': '3fp',
      'תון': '2mp',
      'נא': '1cp',
    }
  },
  PARTICIPLE: {
    suffixes: {
      '': '3ms',
      'א': '3ms (emphatic)',
      'ין': 'mp',
      'ן': 'fp',
      'ינן': '1cp (we)',
      'יתו': '2mp',
    }
  },
};

// =============================================================================
// CONJUGATION MARKERS (for verb analysis)
// =============================================================================

export const CONJUGATION_PREFIXES = {
  'י': { person: 3, gender: 'm', number: 's', label: 'he/it' },
  'ת': { person: 2, gender: 'm', number: 's', label: 'you' },
  'א': { person: 1, gender: 'c', number: 's', label: 'I' },
  'נ': { person: 1, gender: 'c', number: 'p', label: 'we' },
  'מ': { type: 'participle', label: 'one who' },
  'ל': { type: 'infinitive', label: 'to' },
};

export const CONJUGATION_SUFFIXES = {
  '': { number: 's', gender: 'm', shortLabel: '' },
  'ה': { number: 's', gender: 'f', shortLabel: '(f)' },
  'ו': { number: 'p', gender: 'c', shortLabel: '(pl)' },
  'ון': { number: 'p', gender: 'm', shortLabel: '(pl)' },
  'ין': { number: 'p', gender: 'm', shortLabel: '(pl)' },
  'ן': { number: 'p', gender: 'f', shortLabel: '(f.pl)' },
  'נא': { number: 'p', gender: 'c', person: 1, shortLabel: '(we)' },
  'ת': { number: 's', gender: 'f', shortLabel: '(f)' },
  'תי': { number: 's', person: 1, shortLabel: '(I)' },
  'נו': { number: 'p', person: 1, shortLabel: '(we)' },
};

// =============================================================================
// REGEX PATTERNS FOR VERB DETECTION
// =============================================================================

/**
 * Hebrew verb patterns (for detecting complete verbs)
 */
export const HEBREW_VERB_REGEX = [
  /^ה[א-ת][א-ת][א-ת]$/,     // Hifil past 3ms
  /^מ[א-ת][א-ת][א-ת]$/,     // Hifil/Piel participle
  /^ת[א-ת][א-ת][א-ת]$/,     // Hifil future 2ms/3fs
  /^הת[א-ת][א-ת][א-ת]$/,    // Hitpael
  /^נ[א-ת][א-ת][א-ת]$/,     // Nifal/some Qal
  /^[א-ת][א-ת][א-ת][א-ת]$/, // 4-letter intensive form
];

/**
 * Aramaic verb patterns
 * CRITICAL: ת/א/מ/נ at the start are CONJUGATION MARKERS, not prefixes
 */
export const ARAMAIC_VERB_REGEX = [
  /^[תאמני][א-ת][יו][א-ת]$/,         // Aphel with י
  /^[תאמני][א-ת][א-ת][יו][א-ת]$/,   // Longer Aphel with י
  /^[תאמני][א-ת][ו][א-ת]$/,         // Peal imperfect with ו
  /^[מתא][א-ת][א-ת][א-ת][א-ת]$/,    // Pael participle
  /^א[תי][א-ת][א-ת][א-ת]$/,         // Ithpeel
  /^מ[תי][א-ת][א-ת][א-ת]$/,         // Ithpeel participle
  /^ש[א-ת][א-ת][א-ת]$/,             // Shaphel
  /^[א-ת][א-ת][א-ת]ת$/,             // Perfect with ת ending
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Detect weak verb type from a root
 * @param {string} root - 3-letter Hebrew/Aramaic root
 * @returns {Object|null} - Weak verb info or null if strong
 */
export function detectWeakVerbType(root) {
  if (!root || root.length < 2) return null;

  const cleaned = root.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');

  for (const [key, rule] of Object.entries(WEAK_VERB_RULES)) {
    if (rule.detect && rule.detect(cleaned)) {
      return { type: key, ...rule };
    }
  }

  return null;
}

/**
 * Reconstruct possible roots from a stem using weak verb rules
 * @param {string} stem - Stem after prefix/suffix stripping
 * @returns {Array} - Array of { root, weakType, confidence }
 */
export function reconstructWeakRoots(stem) {
  if (!stem || stem.length < 2) return [];

  const results = [];

  for (const [key, rule] of Object.entries(WEAK_VERB_RULES)) {
    if (rule.reconstruction) {
      const roots = rule.reconstruction(stem);
      for (const root of roots) {
        if (root.length >= 3) {
          results.push({
            root,
            weakType: key,
            weakInfo: rule,
            confidence: 70,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Get binyan info by key
 * @param {string} key - Binyan key (QAL, NIFAL, etc.)
 * @returns {Object|null}
 */
export function getBinyanInfo(key) {
  return BINYANIM[key] || ARAMAIC_BINYANIM[key] || null;
}

/**
 * Detect binyan from word form
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} - { binyan, confidence }
 */
export function detectBinyan(word) {
  if (!word || word.length < 3) return null;

  // Hitpael detection
  if (word.startsWith('הת') || word.startsWith('מת')) {
    return { binyan: BINYANIM.HITPAEL, confidence: 85 };
  }

  // Hifil detection
  if (word.startsWith('ה') && word.length >= 4) {
    return { binyan: BINYANIM.HIFIL, confidence: 75 };
  }

  // Nifal detection
  if (word.startsWith('נ') && word.length >= 4) {
    return { binyan: BINYANIM.NIFAL, confidence: 75 };
  }

  // Aramaic Ithpeel
  if (word.startsWith('את') || word.startsWith('אית')) {
    return { binyan: ARAMAIC_BINYANIM.ITHPEEL, confidence: 80 };
  }

  // Aramaic Aphel (causative with א prefix in imperfect)
  if (word.length >= 4 && word[1] === 'פ') {
    return { binyan: ARAMAIC_BINYANIM.APHEL, confidence: 70 };
  }

  return null;
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

const MorphologyPatterns = {
  WEAK_VERB_RULES,
  WEAK_VERB_BY_CODE,
  WEAK_VERB_LETTERS,
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSE_PATTERNS,
  ARAMAIC_TENSE,
  CONJUGATION_PREFIXES,
  CONJUGATION_SUFFIXES,
  HEBREW_VERB_REGEX,
  ARAMAIC_VERB_REGEX,
  detectWeakVerbType,
  reconstructWeakRoots,
  getBinyanInfo,
  detectBinyan,
};

export default MorphologyPatterns;
