// =============================================================================
// Données grammaticales — binyanim (hébreu + araméen), temps, parties du
// discours, racines communes, termes talmudiques, préfixes/suffixes.
// (extrait de grammarAnalysisService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { cleanHebrewWordStrict as cleanHebrewWord } from '../../../utils/hebrewUtils';

// Hebrew verb patterns (binyanim) with full conjugation info
export const BINYANIM = {
  'qal': {
    name: 'Qal',
    hebrew: 'קל',
    meaning: 'Simple active',
    description: 'Basic active voice - the simple, unmofidied meaning of the root',
    example: { root: 'כתב', form: 'כָּתַב', meaning: 'he wrote' },
    patterns: {
      perfect: { prefix: '', infix: 'ָ', suffix: '' },
      imperfect: { prefix: 'י', infix: 'ְ', suffix: '' },
      participle: { prefix: '', infix: 'ֹ', suffix: 'ֵ' },
      infinitive: { prefix: 'לִ', infix: '', suffix: 'וֹ' }
    },
    indicators: ['simple-active']
  },
  'niphal': {
    name: "Nif'al",
    hebrew: 'נפעל',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal - action done to or by oneself',
    example: { root: 'כתב', form: 'נִכְתַּב', meaning: 'it was written' },
    patterns: {
      perfect: { prefix: 'נִ', infix: '', suffix: '' },
      imperfect: { prefix: 'יִ', infix: '', suffix: '' },
      participle: { prefix: 'נִ', infix: '', suffix: '' },
      infinitive: { prefix: 'הִ', infix: '', suffix: '' }
    },
    indicators: ['נ-prefix', 'passive', 'reflexive']
  },
  'piel': {
    name: "Pi'el",
    hebrew: 'פיעל',
    meaning: 'Intensive active',
    description: 'Intensified action - repeated, thorough, or causative nuance',
    example: { root: 'דבר', form: 'דִּבֵּר', meaning: 'he spoke (repeatedly/formally)' },
    patterns: {
      perfect: { prefix: '', infix: 'ִּ', suffix: '' },
      imperfect: { prefix: 'יְ', infix: 'ַ', suffix: '' },
      participle: { prefix: 'מְ', infix: 'ַ', suffix: '' },
      infinitive: { prefix: 'לְ', infix: 'ַ', suffix: '' }
    },
    indicators: ['dagesh-middle', 'intensive']
  },
  'pual': {
    name: "Pu'al",
    hebrew: 'פועל',
    meaning: 'Intensive passive',
    description: 'Passive of Piel - intensive action received',
    example: { root: 'דבר', form: 'דֻּבַּר', meaning: 'it was spoken' },
    patterns: {
      perfect: { prefix: '', infix: 'ֻ', suffix: '' },
      imperfect: { prefix: 'יְ', infix: 'ֻ', suffix: '' },
      participle: { prefix: 'מְ', infix: 'ֻ', suffix: '' }
    },
    indicators: ['qubbutz-first', 'passive']
  },
  'hiphil': {
    name: "Hif'il",
    hebrew: 'הפעיל',
    meaning: 'Causative active',
    description: 'Causing someone else to do the action',
    example: { root: 'מלך', form: 'הִמְלִיךְ', meaning: 'he made king/crowned' },
    patterns: {
      perfect: { prefix: 'הִ', infix: '', suffix: '' },
      imperfect: { prefix: 'יַ', infix: '', suffix: '' },
      participle: { prefix: 'מַ', infix: '', suffix: '' },
      infinitive: { prefix: 'לְהַ', infix: '', suffix: '' }
    },
    indicators: ['ה-prefix', 'causative', 'יַ-imperfect']
  },
  'hophal': {
    name: "Hof'al",
    hebrew: 'הופעל',
    meaning: 'Causative passive',
    description: 'Passive of Hiphil - being caused to do/receive action',
    example: { root: 'מלך', form: 'הָמְלַךְ', meaning: 'he was made king' },
    patterns: {
      perfect: { prefix: 'הָ', infix: '', suffix: '' },
      imperfect: { prefix: 'יָ', infix: '', suffix: '' },
      participle: { prefix: 'מָ', infix: '', suffix: '' }
    },
    indicators: ['qamats-he', 'passive']
  },
  'hitpael': {
    name: "Hitpa'el",
    hebrew: 'התפעל',
    meaning: 'Reflexive/reciprocal',
    description: 'Action done to oneself or mutual action between parties',
    example: { root: 'קדש', form: 'הִתְקַדֵּשׁ', meaning: 'he sanctified himself' },
    patterns: {
      perfect: { prefix: 'הִתְ', infix: '', suffix: '' },
      imperfect: { prefix: 'יִתְ', infix: '', suffix: '' },
      participle: { prefix: 'מִתְ', infix: '', suffix: '' },
      infinitive: { prefix: 'לְהִתְ', infix: '', suffix: '' }
    },
    indicators: ['הת-prefix', 'reflexive', 'reciprocal']
  }
};

// Aramaic verb patterns (common in Talmud)
export const ARAMAIC_BINYANIM = {
  'peal': {
    name: "Pe'al",
    hebrew: 'פעל',
    meaning: 'Simple active (Aramaic Qal)',
    description: 'Basic Aramaic active voice',
    indicators: ['simple-aramaic']
  },
  'pael': {
    name: "Pa'el",
    hebrew: 'פעל',
    meaning: 'Intensive active (Aramaic Piel)',
    description: 'Aramaic intensive form',
    indicators: ['intensive-aramaic']
  },
  'aphel': {
    name: "Af'el",
    hebrew: 'אפעל',
    meaning: 'Causative (Aramaic Hiphil)',
    description: 'Aramaic causative form with א prefix',
    indicators: ['א-prefix', 'causative-aramaic']
  },
  'itpeel': {
    name: "Itpe'el",
    hebrew: 'אתפעל',
    meaning: 'Reflexive (Aramaic Hitpael)',
    description: 'Aramaic reflexive form with את prefix',
    indicators: ['את-prefix', 'reflexive-aramaic']
  },
  'ittaphal': {
    name: "Ittaf'al",
    hebrew: 'אתפעל',
    meaning: 'Passive (Aramaic Hophal)',
    description: 'Aramaic passive causative',
    indicators: ['את-prefix', 'passive-aramaic']
  }
};

// Hebrew tenses/aspects
export const TENSES = {
  'perfect': { name: 'Perfect', hebrew: 'עבר', meaning: 'Completed action' },
  'imperfect': { name: 'Imperfect', hebrew: 'עתיד', meaning: 'Incomplete action' },
  'imperative': { name: 'Imperative', hebrew: 'ציווי', meaning: 'Command' },
  'infinitive_construct': { name: 'Infinitive Construct', hebrew: 'שם הפועל', meaning: 'Verbal noun' },
  'infinitive_absolute': { name: 'Infinitive Absolute', hebrew: 'מקור מוחלט', meaning: 'Emphasis/continuity' },
  'participle_active': { name: 'Active Participle', hebrew: 'בינוני פועל', meaning: 'One who does' },
  'participle_passive': { name: 'Passive Participle', hebrew: 'בינוני פעול', meaning: 'One who is done to' },
  'wayyiqtol': { name: 'Wayyiqtol', hebrew: 'ויקטול', meaning: 'Narrative past (vav-consecutive)' },
  'weqatal': { name: 'Weqatal', hebrew: 'וקטל', meaning: 'Narrative future (vav-consecutive)' }
};

// Parts of speech
export const PARTS_OF_SPEECH = {
  'verb': { name: 'Verb', hebrew: 'פועל', abbr: 'V' },
  'noun': { name: 'Noun', hebrew: 'שם עצם', abbr: 'N' },
  'adjective': { name: 'Adjective', hebrew: 'שם תואר', abbr: 'Adj' },
  'pronoun': { name: 'Pronoun', hebrew: 'כינוי גוף', abbr: 'Pron' },
  'preposition': { name: 'Preposition', hebrew: 'מילת יחס', abbr: 'Prep' },
  'conjunction': { name: 'Conjunction', hebrew: 'מילת חיבור', abbr: 'Conj' },
  'adverb': { name: 'Adverb', hebrew: 'תואר הפועל', abbr: 'Adv' },
  'particle': { name: 'Particle', hebrew: 'מילית', abbr: 'Part' },
  'interjection': { name: 'Interjection', hebrew: 'מילת קריאה', abbr: 'Interj' },
  'proper_noun': { name: 'Proper Noun', hebrew: 'שם פרטי', abbr: 'PN' },
  'numeral': { name: 'Numeral', hebrew: 'מספר', abbr: 'Num' }
};

// Common Hebrew roots with meanings (Biblical + Talmudic/Aramaic)
export const COMMON_ROOTS = {
  // === Biblical Hebrew Core Roots ===
  'אמר': { meaning: 'say, speak', category: 'communication' },
  'הלך': { meaning: 'go, walk', category: 'movement' },
  'עשה': { meaning: 'do, make', category: 'action' },
  'נתן': { meaning: 'give', category: 'transfer' },
  'לקח': { meaning: 'take', category: 'transfer' },
  'ראה': { meaning: 'see', category: 'perception' },
  'שמע': { meaning: 'hear, obey', category: 'perception' },
  'ידע': { meaning: 'know', category: 'cognition' },
  'בוא': { meaning: 'come, enter', category: 'movement' },
  'יצא': { meaning: 'go out, exit', category: 'movement' },
  'שוב': { meaning: 'return, repent', category: 'movement' },
  'עלה': { meaning: 'go up, ascend', category: 'movement' },
  'ירד': { meaning: 'go down, descend', category: 'movement' },
  'שלח': { meaning: 'send', category: 'transfer' },
  'קרא': { meaning: 'call, read', category: 'communication' },
  'דבר': { meaning: 'speak, word', category: 'communication' },
  'עמד': { meaning: 'stand', category: 'position' },
  'ישב': { meaning: 'sit, dwell', category: 'position' },
  'שכב': { meaning: 'lie down', category: 'position' },
  'קום': { meaning: 'arise, stand up', category: 'movement' },
  'אכל': { meaning: 'eat', category: 'consumption' },
  'שתה': { meaning: 'drink', category: 'consumption' },
  'מות': { meaning: 'die', category: 'life' },
  'חיה': { meaning: 'live', category: 'life' },
  'ילד': { meaning: 'bear, give birth', category: 'life' },
  'אהב': { meaning: 'love', category: 'emotion' },
  'שנא': { meaning: 'hate', category: 'emotion' },
  'ירא': { meaning: 'fear', category: 'emotion' },
  'שמר': { meaning: 'keep, guard, observe', category: 'action' },
  'עבד': { meaning: 'serve, work', category: 'action' },
  'כתב': { meaning: 'write', category: 'communication' },
  'ברך': { meaning: 'bless, kneel', category: 'worship' },
  'קדש': { meaning: 'be holy, sanctify', category: 'worship' },
  'טהר': { meaning: 'be pure, purify', category: 'purity' },
  'טמא': { meaning: 'be unclean', category: 'purity' },
  'מלך': { meaning: 'reign, be king', category: 'authority' },
  'שפט': { meaning: 'judge', category: 'authority' },
  'צוה': { meaning: 'command', category: 'authority' },
  'בנה': { meaning: 'build', category: 'creation' },
  'ברא': { meaning: 'create', category: 'creation' },
  'פתח': { meaning: 'open', category: 'action' },
  'סגר': { meaning: 'close, shut', category: 'action' },
  'מצא': { meaning: 'find', category: 'discovery' },
  'בקש': { meaning: 'seek, request', category: 'desire' },
  'חפץ': { meaning: 'desire, delight', category: 'desire' },
  'זכר': { meaning: 'remember', category: 'cognition' },
  'שכח': { meaning: 'forget', category: 'cognition' },
  'למד': { meaning: 'learn, teach', category: 'education' },
  'בין': { meaning: 'understand, discern', category: 'cognition' },
  'חשב': { meaning: 'think, reckon', category: 'cognition' },
  'נשא': { meaning: 'lift, carry, bear', category: 'action' },
  'שים': { meaning: 'put, place, set', category: 'action' },
  'נפל': { meaning: 'fall', category: 'movement' },
  'הרג': { meaning: 'kill, slay', category: 'violence' },
  'נכה': { meaning: 'strike, smite', category: 'violence' },
  'לחם': { meaning: 'fight, wage war', category: 'violence' },
  'שלם': { meaning: 'be complete, pay', category: 'completion' },
  'כלה': { meaning: 'complete, finish', category: 'completion' },
  'חטא': { meaning: 'sin, miss', category: 'transgression' },
  'עון': { meaning: 'iniquity', category: 'transgression' },
  'סלח': { meaning: 'forgive', category: 'forgiveness' },
  'כפר': { meaning: 'atone, cover', category: 'forgiveness' },
  'גאל': { meaning: 'redeem', category: 'redemption' },
  'פדה': { meaning: 'ransom, redeem', category: 'redemption' },
  'ישע': { meaning: 'save, deliver', category: 'salvation' },
  'נצל': { meaning: 'deliver, rescue', category: 'salvation' },

  // === Additional Biblical Hebrew Roots ===
  'שבת': { meaning: 'Shabbat, rest', category: 'time' }, // Primary: noun "Shabbat", secondary: verb "rest"
  'רבע': { meaning: 'four, fourth', category: 'number' },
  'שנה': { meaning: 'two, repeat, change', category: 'number' },
  'פנה': { meaning: 'turn, face', category: 'movement' },
  'הוה': { meaning: 'be, exist', category: 'existence' },
  'היה': { meaning: 'be, become', category: 'existence' },
  'כנס': { meaning: 'gather, enter', category: 'movement' },
  'נכנס': { meaning: 'enter', category: 'movement' },
  'חוץ': { meaning: 'outside', category: 'location' },
  'פנם': { meaning: 'inside, face', category: 'location' },

  // === Talmudic/Aramaic Technical Terms ===
  'תנא': { meaning: 'teach (Tannaitic)', category: 'talmud', isAramaic: true },
  'תני': { meaning: 'teaches, taught', category: 'talmud', isAramaic: true },
  'תנן': { meaning: 'we learned (Mishnah)', category: 'talmud', isAramaic: true },
  'אתי': { meaning: 'come', category: 'talmud', isAramaic: true },
  'אזל': { meaning: 'go', category: 'talmud', isAramaic: true },
  'בעי': { meaning: 'ask, want, require', category: 'talmud', isAramaic: true },
  'סבר': { meaning: 'think, hold (opinion)', category: 'talmud', isAramaic: true },
  'קרי': { meaning: 'call, read', category: 'talmud', isAramaic: true },
  'נפק': { meaning: 'go out, derive', category: 'talmud', isAramaic: true },
  'חזי': { meaning: 'see, is fitting', category: 'talmud', isAramaic: true },
  'יהב': { meaning: 'give', category: 'talmud', isAramaic: true },

  // === Talmudic Discourse Markers ===
  'קשי': { meaning: 'difficulty, question', category: 'discourse', isAramaic: true },
  'תרץ': { meaning: 'answer, resolve', category: 'discourse', isAramaic: true },
  'פלג': { meaning: 'dispute, divide', category: 'discourse', isAramaic: true },
  'סלק': { meaning: 'conclude, remove', category: 'discourse', isAramaic: true },

  // === Shabbat-specific roots ===
  'הוצא': { meaning: 'carry out', category: 'shabbat' },
  'הכנס': { meaning: 'bring in', category: 'shabbat' },
  'חיב': { meaning: 'liable, obligate', category: 'halacha' },
  'פטר': { meaning: 'exempt', category: 'halacha' },
  'אסר': { meaning: 'forbid', category: 'halacha' },
  'התר': { meaning: 'permit', category: 'halacha' }
};

// Common Talmudic terms (abbreviations and technical vocabulary)
export const TALMUDIC_TERMS = {
  'מתני': { word: 'מתניתין', meaning: 'Mishnah (our teaching)', type: 'abbreviation' },
  'גמ': { word: 'גמרא', meaning: 'Gemara', type: 'abbreviation' },
  'תר': { word: 'תנו רבנן', meaning: 'Our Rabbis taught', type: 'abbreviation' },
  'מאי': { word: 'מאי', meaning: 'what', type: 'interrogative', isAramaic: true },
  'היכי': { word: 'היכי', meaning: 'how', type: 'interrogative', isAramaic: true },
  'אמאי': { word: 'אמאי', meaning: 'why', type: 'interrogative', isAramaic: true },
  'היכא': { word: 'היכא', meaning: 'where', type: 'interrogative', isAramaic: true },
  'מאן': { word: 'מאן', meaning: 'who', type: 'interrogative', isAramaic: true },
  'הכי': { word: 'הכי', meaning: 'thus, so', type: 'adverb', isAramaic: true },
  'הכא': { word: 'הכא', meaning: 'here', type: 'adverb', isAramaic: true },
  'התם': { word: 'התם', meaning: 'there', type: 'adverb', isAramaic: true },
  'השתא': { word: 'השתא', meaning: 'now', type: 'adverb', isAramaic: true },
  'נמי': { word: 'נמי', meaning: 'also, too', type: 'adverb', isAramaic: true },
  'אלא': { word: 'אלא', meaning: 'but, rather', type: 'conjunction', isAramaic: true },
  'דילמא': { word: 'דילמא', meaning: 'perhaps, lest', type: 'conjunction', isAramaic: true },
  'איכא': { word: 'איכא', meaning: 'there is', type: 'existential', isAramaic: true },
  'ליכא': { word: 'ליכא', meaning: 'there is not', type: 'existential', isAramaic: true },
  'פשיטא': { word: 'פשיטא', meaning: 'obviously', type: 'expression', isAramaic: true },
  'תיקו': { word: 'תיקו', meaning: 'unresolved question', type: 'expression', isAramaic: true }
};

// Common prefixes
export const PREFIXES = {
  'ו': { name: 'Vav', meaning: 'and/but (conjunction)', type: 'conjunction' },
  'ה': { name: 'He', meaning: 'the (definite article)', type: 'article' },
  'ב': { name: 'Bet', meaning: 'in/with/by', type: 'preposition' },
  'כ': { name: 'Kaf', meaning: 'like/as/when', type: 'preposition' },
  'ל': { name: 'Lamed', meaning: 'to/for', type: 'preposition' },
  'מ': { name: 'Mem', meaning: 'from', type: 'preposition' },
  'ש': { name: 'Shin', meaning: 'that/which/who (relative)', type: 'relative' }
};

// Common suffixes (pronominal) - used in grammar analysis
export const PRONOMINAL_SUFFIXES = {
  'י': { person: '1st', number: 'singular', gender: 'common', meaning: 'my/me' },
  'ךָ': { person: '2nd', number: 'singular', gender: 'masculine', meaning: 'your/you (m.s.)' },
  'ךְ': { person: '2nd', number: 'singular', gender: 'feminine', meaning: 'your/you (f.s.)' },
  'ו': { person: '3rd', number: 'singular', gender: 'masculine', meaning: 'his/him' },
  'ה': { person: '3rd', number: 'singular', gender: 'feminine', meaning: 'her' },
  'נו': { person: '1st', number: 'plural', gender: 'common', meaning: 'our/us' },
  'כם': { person: '2nd', number: 'plural', gender: 'masculine', meaning: 'your/you (m.p.)' },
  'כן': { person: '2nd', number: 'plural', gender: 'feminine', meaning: 'your/you (f.p.)' },
  'ם': { person: '3rd', number: 'plural', gender: 'masculine', meaning: 'their/them (m.)' },
  'ן': { person: '3rd', number: 'plural', gender: 'feminine', meaning: 'their/them (f.)' }
};

// Unified SUFFIXES - combines grammatical (plural) and pronominal suffixes
// Single source of truth for suffix meanings in UI display
export const SUFFIXES = {
  // Plural suffixes (grammatical)
  'ים': { type: 'plural', gender: 'masculine', meaning: 'masc. plural' },
  'ות': { type: 'plural', gender: 'feminine', meaning: 'fem. plural' },
  'ין': { type: 'plural', gender: 'common', meaning: 'plural (Aramaic)', isAramaic: true },
  // Emphatic/Definite (Aramaic)
  'תא': { type: 'emphatic', meaning: 'emphatic (Aramaic)', isAramaic: true },
  'א': { type: 'emphatic', meaning: 'emphatic (Aramaic)', isAramaic: true },
  // Construct / Pronominal
  'י': { type: 'pronominal', person: '1st', meaning: 'my / construct' },
  'ו': { type: 'pronominal', person: '3rd', gender: 'masculine', meaning: 'his' },
  'ה': { type: 'mixed', meaning: 'her / directional' }, // Can be pronominal or locative ה
  'ך': { type: 'pronominal', person: '2nd', meaning: 'your' },
  'נו': { type: 'pronominal', person: '1st', number: 'plural', meaning: 'our / we' },
  'כם': { type: 'pronominal', person: '2nd', number: 'plural', gender: 'masculine', meaning: 'your (m.p.)' },
  'הם': { type: 'pronominal', person: '3rd', number: 'plural', gender: 'masculine', meaning: 'their (m.)' },
  'הן': { type: 'pronominal', person: '3rd', number: 'plural', gender: 'feminine', meaning: 'their (f.)' }
};

// cleanHebrewWord imported from hebrewUtils (PRO SCHOLAR V12: DRY)


/**
 * Check if word is a known Talmudic term/abbreviation
 */
export const lookupTalmudicTerm = (word) => {
  const cleaned = cleanHebrewWord(word);
  return TALMUDIC_TERMS[cleaned] || null;
};

