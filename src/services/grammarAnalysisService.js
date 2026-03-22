/**
 * Grammar Analysis Service
 *
 * Provides morphological analysis, parsing, and grammatical breakdown
 * for Hebrew and Aramaic text. Essential for professional Torah/Talmud study.
 */

// =============================================================================
// IMPORTS - Use centralized morphology constants and dictionaries
// =============================================================================
import {
  HEBREW_PREFIXES_ORDERED,
  STOP_WORDS as CENTRAL_STOP_WORDS,
  isLikelyCompleteRoot
} from '../constants/morphology';

// =============================================================================
// ALL AVAILABLE DICTIONARIES for validation
// =============================================================================
// 📚 LOCAL DICTIONARIES (Offline - instant lookup):
//
// ARAMAIC (for Talmud/Gemara):
//   - JASTROW_COMPLETE (25,224 entries) - PRIMARY for Talmudic Aramaic
//   - CAL_ARAMAIC (~1,500 entries) - Comprehensive Aramaic Lexicon (HUC)
//   - BDB_ARAMAIC (~640 entries) - Aramaic section of BDB
//   - JASTROW_ARAMAIC (86 entries) - Small subset
//
// HEBREW (for Torah/Tanakh):
//   - BDB_BY_WORD (8,050 entries) - Biblical Hebrew
//   - STRONGS_BY_WORD (8,674 entries) - Strong's Concordance
//   - KLEIN_LEXICON (~4,500 entries) - Etymology dictionary
//
// 🌐 ONLINE APIs (scholarlyLexiconService.js, calDictionaryService.js):
//   - Sefaria API (BDB, Jastrow, Strong's online)
//   - CAL API (Comprehensive Aramaic Lexicon - full database)
// =============================================================================

// ARAMAIC dictionaries (for Talmud)
import { JASTROW_COMPLETE } from '../data/jastrowComplete';
import { CAL_ARAMAIC } from '../data/calAramaic';
import { JASTROW_ARAMAIC } from '../data/jastrowAramaic';
import { BDB_ARAMAIC, KLEIN_LEXICON } from '../data/hebrewLexicons';

// HEBREW dictionaries (for Torah/Tanakh)
import { BDB_BY_WORD } from '../data/bdbComplete';
import { STRONGS_BY_WORD } from '../data/strongsComplete';

/**
 * SMART: Check if a word exists in ANY of our dictionaries
 * This validates that prefix stripping produced a REAL word
 *
 * For TALMUD/ARAMAIC context (Gemara, Rashi on Talmud):
 *   1. JASTROW_COMPLETE - 25K entries, best for Talmud
 *   2. CAL_ARAMAIC - Comprehensive Aramaic Lexicon
 *   3. BDB_ARAMAIC - Aramaic section
 *   4. JASTROW_ARAMAIC - Small subset
 *
 * For TORAH/HEBREW context (Chumash, Tanakh):
 *   5. BDB_BY_WORD - Biblical Hebrew
 *   6. KLEIN_LEXICON - Etymology
 *   7. STRONGS_BY_WORD - Last resort (often wrong for Talmud)
 */
const isValidDictionaryWord = (word) => {
  if (!word || word.length < 2) return false;

  // === ARAMAIC DICTIONARIES (check first for Talmud) ===

  // 1. Jastrow Complete - PRIMARY for Talmudic Aramaic (25K entries)
  if (JASTROW_COMPLETE?.[word]) return true;

  // 2. CAL - Comprehensive Aramaic Lexicon
  if (CAL_ARAMAIC?.[word]) return true;

  // 3. BDB Aramaic section
  if (BDB_ARAMAIC?.[word]) return true;

  // 4. Jastrow Aramaic subset (small)
  if (JASTROW_ARAMAIC?.[word]) return true;

  // === HEBREW DICTIONARIES ===

  // 5. BDB - Biblical Hebrew
  if (BDB_BY_WORD?.[word]) return true;

  // 6. Klein - Etymology
  if (KLEIN_LEXICON?.[word]) return true;

  // 7. Strong's - Biblical (skip for Talmud, but include for validation)
  if (STRONGS_BY_WORD?.[word]) return true;

  return false;
};

/**
 * Get the dictionary source for a word
 * Returns: { source: string, entry: object, isAramaic: boolean }
 */
const getDictionarySource = (word) => {
  if (!word || word.length < 2) return null;

  // Aramaic sources (for Talmud)
  if (JASTROW_COMPLETE?.[word]) return { source: 'Jastrow', entry: JASTROW_COMPLETE[word], isAramaic: true };
  if (CAL_ARAMAIC?.[word]) return { source: 'CAL', entry: CAL_ARAMAIC[word], isAramaic: true };
  if (BDB_ARAMAIC?.[word]) return { source: 'BDB-Aramaic', entry: BDB_ARAMAIC[word], isAramaic: true };
  if (JASTROW_ARAMAIC?.[word]) return { source: 'Jastrow', entry: JASTROW_ARAMAIC[word], isAramaic: true };

  // Hebrew sources (for Torah)
  if (BDB_BY_WORD?.[word]) return { source: 'BDB', entry: BDB_BY_WORD[word], isAramaic: false };
  if (KLEIN_LEXICON?.[word]) return { source: 'Klein', entry: KLEIN_LEXICON[word], isAramaic: false };
  if (STRONGS_BY_WORD?.[word]) return { source: "Strong's", entry: STRONGS_BY_WORD[word], isAramaic: false };

  return null;
};

// Hebrew verb patterns (binyanim) with full conjugation info
const BINYANIM = {
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
const ARAMAIC_BINYANIM = {
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
const TENSES = {
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
const PARTS_OF_SPEECH = {
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
const COMMON_ROOTS = {
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
const TALMUDIC_TERMS = {
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
const PREFIXES = {
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

/**
 * Clean Hebrew/Aramaic word by removing vowels, cantillation, and punctuation
 */
const cleanHebrewWord = (word) => {
  if (!word) return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and nikud
    .replace(/[׳״'`"]/g, '')         // Remove geresh and gershayim (abbreviation marks)
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
};

/**
 * Check if word is a known Talmudic term/abbreviation
 */
const lookupTalmudicTerm = (word) => {
  const cleaned = cleanHebrewWord(word);
  return TALMUDIC_TERMS[cleaned] || null;
};

/**
 * Extract the likely root from a Hebrew word
 * Enhanced for both Biblical Hebrew and Talmudic Aramaic
 *
 * SMART ALGORITHM:
 * 1. Check if FULL WORD is in Aramaic dictionary (for Gemara context)
 * 2. Try prefix stripping (longest first) with DICTIONARY VALIDATION
 * 3. Only accept stripped result if it's a REAL dictionary word
 */
export function extractRoot(word) {
  if (!word) return { root: null, rootInfo: null, prefixes: [], originalWord: word };

  // Remove nikud and cantillation first
  let cleaned = cleanHebrewWord(word);
  const foundPrefixes = [];

  // === STEP 1: Check if FULL WORD is in dictionaries (no stripping needed) ===
  // This is critical for Aramaic verbs like תפיק which should NOT be stripped
  if (isValidDictionaryWord(cleaned)) {
    // Check if it's a known Talmudic term for additional info
    const talmudicTerm = lookupTalmudicTerm(word);
    return {
      root: cleaned,
      rootInfo: talmudicTerm
        ? { meaning: talmudicTerm.meaning, category: talmudicTerm.type || 'talmud', isAramaic: talmudicTerm.isAramaic }
        : COMMON_ROOTS[cleaned] || null,
      prefixes: [],
      originalWord: word,
      isTalmudicTerm: !!talmudicTerm,
      validatedByDictionary: true
    };
  }

  // Check if it's a known complete root (use centralized function)
  if (isLikelyCompleteRoot(cleaned)) {
    const talmudicTerm = lookupTalmudicTerm(word);
    return {
      root: cleaned,
      rootInfo: talmudicTerm
        ? { meaning: talmudicTerm.meaning, category: talmudicTerm.type || 'talmud', isAramaic: talmudicTerm.isAramaic }
        : COMMON_ROOTS[cleaned] || null,
      prefixes: [],
      originalWord: word,
      isTalmudicTerm: !!talmudicTerm
    };
  }

  // === STEP 2: Try prefix stripping with DICTIONARY VALIDATION ===
  // Use centralized HEBREW_PREFIXES_ORDERED (includes כשה, משה, etc.)
  // Try longest prefixes first
  for (const prefix of HEBREW_PREFIXES_ORDERED) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length + 1) {
      const afterStrip = cleaned.slice(prefix.length);

      // SMART: Only accept if the remaining word is VALID
      const isValid = CENTRAL_STOP_WORDS.has(afterStrip) ||
                      COMMON_ROOTS[afterStrip] ||
                      TALMUDIC_TERMS[afterStrip] ||
                      isValidDictionaryWord(afterStrip);

      if (isValid) {
        // Record which prefixes were stripped
        for (const letter of prefix) {
          if (PREFIXES[letter]) {
            foundPrefixes.push({ letter, ...PREFIXES[letter] });
          }
        }
        cleaned = afterStrip;
        break; // Found valid stripping, stop
      }
      // If not valid, try shorter prefix (continue loop)
    }
  }

  // Try direct lookup in COMMON_ROOTS first
  if (COMMON_ROOTS[cleaned]) {
    return {
      root: cleaned,
      rootInfo: COMMON_ROOTS[cleaned],
      prefixes: foundPrefixes,
      originalWord: word
    };
  }

  // Try to find matching root by letter sequence
  for (const root of Object.keys(COMMON_ROOTS)) {
    // Check if all root letters are present in order
    let rootIdx = 0;
    for (const char of cleaned) {
      if (char === root[rootIdx]) {
        rootIdx++;
        if (rootIdx === root.length) {
          return {
            root,
            rootInfo: COMMON_ROOTS[root],
            prefixes: foundPrefixes,
            originalWord: word
          };
        }
      }
    }
  }

  // Try removing common suffixes and re-checking
  const suffixes = ['ות', 'ים', 'ין', 'יא', 'תא', 'ה', 'י', 'ת'];
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix) && cleaned.length > suffix.length + 2) {
      const withoutSuffix = cleaned.slice(0, -suffix.length);
      if (COMMON_ROOTS[withoutSuffix]) {
        return {
          root: withoutSuffix,
          rootInfo: COMMON_ROOTS[withoutSuffix],
          prefixes: foundPrefixes,
          originalWord: word,
          suffix
        };
      }
      // Try root matching on the stripped word
      for (const root of Object.keys(COMMON_ROOTS)) {
        let rootIdx = 0;
        for (const char of withoutSuffix) {
          if (char === root[rootIdx]) {
            rootIdx++;
            if (rootIdx === root.length) {
              return {
                root,
                rootInfo: COMMON_ROOTS[root],
                prefixes: foundPrefixes,
                originalWord: word,
                suffix
              };
            }
          }
        }
      }
    }
  }

  // For words that don't match, extract 3-letter root heuristically
  // But only mark as uncertain if we can't determine anything useful
  const consonants = cleaned.replace(/[אהוי]/g, ''); // Remove matres lectionis
  if (consonants.length >= 3) {
    const heuristicRoot = consonants.slice(0, 3);
    // Check if this heuristic root exists in our dictionary
    if (COMMON_ROOTS[heuristicRoot]) {
      return {
        root: heuristicRoot,
        rootInfo: COMMON_ROOTS[heuristicRoot],
        prefixes: foundPrefixes,
        originalWord: word,
        heuristic: true
      };
    }
    return {
      root: heuristicRoot,
      rootInfo: null,
      prefixes: foundPrefixes,
      originalWord: word,
      uncertain: true
    };
  }

  // Return the cleaned word as the "root" if very short
  return {
    root: cleaned || null,
    rootInfo: null,
    prefixes: foundPrefixes,
    originalWord: word,
    uncertain: true
  };
}

/**
 * Detect Binyan pattern from a Hebrew verb
 * @param {string} word - The Hebrew verb (with or without nikud)
 * @returns {Object} Detection result with binyan key, confidence, and indicators
 */
export function detectBinyan(word) {
  if (!word) return { binyan: null, confidence: 'none', indicators: [] };

  const withNikud = word;
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');
  const indicators = [];
  let binyan = null;
  let confidence = 'low';
  let isAramaic = false;

  // === Hitpael Detection (must check first - most distinctive) ===
  if (cleaned.startsWith('הת') || cleaned.startsWith('מת') || cleaned.startsWith('להת')) {
    binyan = 'hitpael';
    indicators.push('הת-prefix');
    confidence = 'high';
  }
  // Aramaic Itpeel (את prefix)
  else if (cleaned.startsWith('את') || cleaned.startsWith('אית')) {
    binyan = 'itpeel';
    indicators.push('את-prefix');
    isAramaic = true;
    confidence = 'high';
  }

  // === Niphal Detection ===
  else if (cleaned.startsWith('נ') && cleaned.length > 2) {
    binyan = 'niphal';
    indicators.push('נ-prefix');
    confidence = 'high';
  }
  else if (withNikud.startsWith('יִּ') || withNikud.startsWith('תִּ') || withNikud.startsWith('אֶּ')) {
    // Niphal imperfect with dagesh in first root letter
    binyan = 'niphal';
    indicators.push('dagesh-first-imperfect');
    confidence = 'medium';
  }

  // === Hiphil Detection ===
  else if (cleaned.startsWith('ה') && (withNikud.includes('ִי') || withNikud.includes('ַ'))) {
    binyan = 'hiphil';
    indicators.push('ה-prefix', 'hireq-yod');
    confidence = 'high';
  }
  else if (cleaned.startsWith('להַ') || cleaned.startsWith('להָ')) {
    binyan = 'hiphil';
    indicators.push('infinitive-להַ');
    confidence = 'high';
  }
  else if ((cleaned.startsWith('י') || cleaned.startsWith('ת') || cleaned.startsWith('א') || cleaned.startsWith('נ')) && withNikud.includes('ַ')) {
    // Imperfect with patach under prefix
    if (withNikud.startsWith('יַ') || withNikud.startsWith('תַ') || withNikud.startsWith('אַ') || withNikud.startsWith('נַ')) {
      binyan = 'hiphil';
      indicators.push('patach-prefix-imperfect');
      confidence = 'high';
    }
  }
  else if (cleaned.startsWith('מ') && withNikud.includes('ַ') && !withNikud.includes('ְ')) {
    // Hiphil participle מַקְטִיל
    binyan = 'hiphil';
    indicators.push('מַ-participle');
    confidence = 'medium';
  }

  // === Hophal Detection ===
  else if (cleaned.startsWith('ה') && (withNikud.includes('ָ') || withNikud.includes('ֻ'))) {
    if (withNikud.startsWith('הָ') || withNikud.startsWith('הֻ')) {
      binyan = 'hophal';
      indicators.push('qamats/qubbutz-he');
      confidence = 'high';
    }
  }
  else if (withNikud.startsWith('יֻ') || withNikud.startsWith('תֻ')) {
    binyan = 'hophal';
    indicators.push('qubbutz-prefix-imperfect');
    confidence = 'high';
  }

  // === Piel Detection (intensive with dagesh in middle root letter) ===
  else if (withNikud.match(/^.ִּ/)) {
    // Hireq + dagesh pattern
    binyan = 'piel';
    indicators.push('dagesh-middle-perfect');
    confidence = 'medium';
  }
  else if (withNikud.startsWith('יְ') || withNikud.startsWith('תְ')) {
    if (withNikud.match(/יְ.ַ/)) {
      binyan = 'piel';
      indicators.push('sheva-patach-imperfect');
      confidence = 'medium';
    }
  }
  else if (cleaned.startsWith('מ') && withNikud.match(/מְ.ַ/)) {
    binyan = 'piel';
    indicators.push('מְ-participle-patach');
    confidence = 'medium';
  }

  // === Pual Detection (passive of Piel) ===
  else if (withNikud.match(/^.ֻּ/)) {
    binyan = 'pual';
    indicators.push('qubbutz-dagesh');
    confidence = 'high';
  }

  // === Aramaic Aphel (א prefix + causative) ===
  else if (cleaned.startsWith('א') && cleaned.length > 3) {
    // Could be Aramaic Aphel
    binyan = 'aphel';
    indicators.push('א-prefix');
    isAramaic = true;
    confidence = 'medium';
  }

  // === Default to Qal if no other pattern matches ===
  if (!binyan && cleaned.length >= 3) {
    binyan = 'qal';
    indicators.push('default-simple');
    confidence = 'low';
  }

  const binyanData = isAramaic ? ARAMAIC_BINYANIM[binyan] : BINYANIM[binyan];

  return {
    binyan,
    binyanKey: binyan,
    binyanData,
    confidence,
    indicators,
    isAramaic
  };
}

/**
 * Analyze verb morphology with enhanced Binyan detection
 */
export function analyzeVerb(word, context = {}) {
  const rootAnalysis = extractRoot(word);

  // Use enhanced Binyan detection
  const binyanResult = detectBinyan(word);

  // Detect tense from context and form
  const cleaned = word.replace(/[\u0591-\u05C7]/g, '');
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
  const withoutNikud = word.replace(/[\u0591-\u05C7]/g, '');
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

// Export constants for use in UI
export const GRAMMAR_CONSTANTS = {
  BINYANIM,
  ARAMAIC_BINYANIM,
  TENSES,
  PARTS_OF_SPEECH,
  PREFIXES,
  SUFFIXES,
  PRONOMINAL_SUFFIXES,
  COMMON_ROOTS,
  TALMUDIC_TERMS
};

/**
 * Get Binyan information for display
 * @param {string} binyanKey - The binyan key (qal, piel, etc.)
 * @param {boolean} isAramaic - Whether to use Aramaic binyanim
 * @returns {Object|null} Full binyan data
 */
export function getBinyanInfo(binyanKey, isAramaic = false) {
  if (!binyanKey) return null;
  const source = isAramaic ? ARAMAIC_BINYANIM : BINYANIM;
  return source[binyanKey] || null;
}

/**
 * Get all binyanim for display/selection
 * @param {boolean} includeAramaic - Include Aramaic binyanim
 * @returns {Array} Array of binyan objects
 */
export function getAllBinyanim(includeAramaic = false) {
  const result = Object.entries(BINYANIM).map(([key, data]) => ({
    key,
    ...data,
    isAramaic: false
  }));

  if (includeAramaic) {
    const aramaic = Object.entries(ARAMAIC_BINYANIM).map(([key, data]) => ({
      key,
      ...data,
      isAramaic: true
    }));
    result.push(...aramaic);
  }

  return result;
}

const grammarAnalysisService = {
  analyzeWord,
  analyzeVerb,
  analyzePhrase,
  extractRoot,
  detectBinyan,
  getBinyanInfo,
  getAllBinyanim,
  getGrammarSummary,
  getInlineGloss,
  getDictionarySource,
  isValidDictionaryWord,
  GRAMMAR_CONSTANTS
};

export default grammarAnalysisService;
