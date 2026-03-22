// =============================================================================
// Hebrew/Aramaic Verb Patterns - SINGLE SOURCE OF TRUTH
// Contains: Binyanim, Tense Patterns, Conjugation Markers
// Used by: verbGrammarAnalyzer, morphologyAnalyzer
// =============================================================================

// =============================================================================
// HEBREW BINYANIM (בניינים) - The 7 Verb Patterns
// =============================================================================

export const BINYANIM = {
  QAL: {
    name: 'Qal',
    hebrew: 'קַל',
    type: 'active',
    meaning: 'simple active',
    patterns: {
      perfect: /^[א-ת]{3}$/,
      participle: /^[א-ת]ו[א-ת][א-ת]$/,
    }
  },
  NIFAL: {
    name: "Nif'al",
    hebrew: 'נִפְעַל',
    type: 'passive/reflexive',
    meaning: 'simple passive',
    markers: ['נ'],
    patterns: {
      perfect: /^נ[א-ת]{3}$/,
      imperfect: /^י[א-ת]{3}$/,
      participle: /^נ[א-ת]{3}$/,
    }
  },
  PIEL: {
    name: "Pi'el",
    hebrew: 'פִּעֵל',
    type: 'intensive active',
    meaning: 'intensive',
    patterns: {
      perfect: /^[א-ת][א-ת]{2}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  PUAL: {
    name: "Pu'al",
    hebrew: 'פֻּעַל',
    type: 'intensive passive',
    meaning: 'intensive passive',
    patterns: {
      perfect: /^[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HIFIL: {
    name: "Hif'il",
    hebrew: 'הִפְעִיל',
    type: 'causative active',
    meaning: 'causative',
    markers: ['ה'],
    patterns: {
      perfect: /^ה[א-ת]{3}$/,
      imperfect: /^י[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HUFAL: {
    name: "Huf'al",
    hebrew: 'הֻפְעַל',
    type: 'causative passive',
    meaning: 'causative passive',
    markers: ['ה'],
    patterns: {
      perfect: /^ה[א-ת]{3}$/,
      participle: /^מ[א-ת]{3}$/,
    }
  },
  HITPAEL: {
    name: "Hitpa'el",
    hebrew: 'הִתְפַּעֵל',
    type: 'reflexive',
    meaning: 'reflexive',
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
    name: "Pe'al",
    hebrew: 'פְּעַל',
    type: 'active',
    meaning: 'simple active (Aramaic Qal)',
  },
  PAEL: {
    name: "Pa'el",
    hebrew: 'פַּעֵל',
    type: 'intensive',
    meaning: 'intensive (Aramaic Piel)',
  },
  AFEL: {
    name: "Af'el",
    hebrew: 'אַפְעֵל',
    type: 'causative',
    meaning: 'causative (Aramaic Hifil)',
    markers: ['א'],
  },
  ITPEEL: {
    name: "Itpe'el",
    hebrew: 'אִתְפְּעֵל',
    type: 'reflexive',
    meaning: 'reflexive (Aramaic Hitpael)',
    markers: ['את', 'אית', 'מת'],
  },
  ITPAAL: {
    name: "Itpa'al",
    hebrew: 'אִתְפַּעַל',
    type: 'passive',
    meaning: 'passive',
    markers: ['את'],
  },
  SHAFEL: {
    name: 'Shafel',
    hebrew: 'שַׁפְעֵל',
    type: 'causative',
    meaning: 'causative (ש prefix)',
    markers: ['ש', 'שת', 'אשת'],
  },
};

// =============================================================================
// TENSE/ASPECT PATTERNS
// =============================================================================

export const TENSE_PATTERNS = {
  PERFECT: {
    name: 'Perfect',
    hebrew: 'עָבָר',
    englishTense: 'past',
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
    name: 'Imperfect',
    hebrew: 'עָתִיד',
    englishTense: 'future/present',
    prefixes: {
      'י': { person: 3, gender: 'm', number: 's', label: '3ms', meaning: 'he will' },
      'ת': { person: 3, gender: 'f', number: 's', label: '3fs', meaning: 'she will' },
      'א': { person: 1, gender: 'c', number: 's', label: '1cs', meaning: 'I will' },
      'נ': { person: 1, gender: 'c', number: 'p', label: '1cp', meaning: 'we will' },
    }
  },
  IMPERATIVE: {
    name: 'Imperative',
    hebrew: 'צִוּוּי',
    englishTense: 'command',
  },
  PARTICIPLE: {
    name: 'Participle',
    hebrew: 'בֵּינוֹנִי',
    englishTense: 'present/-ing',
    markers: ['מ'],
  },
  INFINITIVE: {
    name: 'Infinitive',
    hebrew: 'שֵׁם הַפֹּעַל',
    englishTense: 'to...',
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
// WEAK VERB LETTERS
// =============================================================================

export const WEAK_VERB_LETTERS = {
  'א': 'guttural',
  'ה': 'guttural',
  'ח': 'guttural',
  'ע': 'guttural',
  'ו': 'hollow',
  'י': 'hollow',
  'נ': 'assimilating',
};
