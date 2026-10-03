// PRO SCHOLAR V6 — Cognats sémitiques (COGNATE_LANGUAGES, ROOT_COGNATES) (split 03/10/2026)
import { stripVowels } from '../../../utils/hebrewUtils';

export const COGNATE_LANGUAGES = {
  akkadian: {
    name: 'Akkadian',
    native: '𒀝𒅗𒁺𒌑',
    period: 'c. 2500-500 BCE',
    relation: 'East Semitic sister language'
  },
  ugaritic: {
    name: 'Ugaritic',
    native: '𐎜𐎂𐎗𐎚',
    period: 'c. 1400-1200 BCE',
    relation: 'Northwest Semitic, closest to Hebrew'
  },
  phoenician: {
    name: 'Phoenician',
    period: 'c. 1050-150 BCE',
    relation: 'Canaanite, very close to Hebrew'
  },
  arabic: {
    name: 'Arabic',
    native: 'العربية',
    period: 'c. 300 CE-present',
    relation: 'Central Semitic, preserves older forms'
  },
  syriac: {
    name: 'Syriac',
    native: 'ܣܘܪܝܝܐ',
    period: 'c. 100 CE-present',
    relation: 'Aramaic dialect, Christian tradition'
  },
  ethiopic: {
    name: 'Ge\'ez (Ethiopic)',
    native: 'ግዕዝ',
    period: 'c. 400 BCE-present',
    relation: 'South Semitic, preserves archaic features'
  }
};

/**
 * Known cognates for common roots - PRO SCHOLAR V6.2 Expanded Database
 * Based on BDB, HALOT, Jastrow, and comparative Semitic scholarship
 */
export const ROOT_COGNATES = {
  'מלך': {
    meaning: 'to rule, be king',
    cognates: [
      { language: 'akkadian', word: 'malāku', meaning: 'to advise, rule', form: 'verb' },
      { language: 'ugaritic', word: 'mlk', meaning: 'king', form: 'noun' },
      { language: 'arabic', word: 'malik', meaning: 'king, owner', form: 'noun' },
      { language: 'ethiopic', word: 'mal\'ak', meaning: 'messenger, angel', form: 'noun' }
    ],
    note: 'Common Semitic root *mlk with semantic range "to possess, rule, counsel"'
  },
  'שמע': {
    meaning: 'to hear',
    cognates: [
      { language: 'akkadian', word: 'šemû', meaning: 'to hear, obey', form: 'verb' },
      { language: 'arabic', word: 'samiʿa', meaning: 'to hear', form: 'verb' },
      { language: 'ethiopic', word: 'samʿa', meaning: 'to hear', form: 'verb' }
    ],
    note: 'Proto-Semitic *šmʿ preserved across all branches'
  },
  'קדש': {
    meaning: 'to be holy, set apart',
    cognates: [
      { language: 'akkadian', word: 'qadāšu', meaning: 'to be pure, clean', form: 'verb' },
      { language: 'ugaritic', word: 'qdš', meaning: 'holy', form: 'adjective' },
      { language: 'arabic', word: 'quds', meaning: 'holiness', form: 'noun' }
    ],
    note: 'Semantic development from "clean" to "holy" visible in cognates'
  },
  'ברא': {
    meaning: 'to create',
    cognates: [
      { language: 'arabic', word: 'baraʾa', meaning: 'to create, fashion', form: 'verb' },
      { language: 'ethiopic', word: 'baraya', meaning: 'to create', form: 'verb' }
    ],
    note: 'Theological term primarily Hebrew, cognates show broader "fashion" meaning'
  },
  'אמר': {
    meaning: 'to say',
    cognates: [
      { language: 'akkadian', word: 'amāru', meaning: 'to see', form: 'verb' },
      { language: 'arabic', word: 'ʾamara', meaning: 'to command', form: 'verb' },
      { language: 'ethiopic', word: 'ʾamara', meaning: 'to show, indicate', form: 'verb' }
    ],
    note: 'Semantic shift from "see/show" to "say" in Hebrew branch'
  },

  // ============ PRO SCHOLAR V6.2: EXPANDED COGNATE DATABASE ============

  'כתב': {
    meaning: 'to write',
    cognates: [
      { language: 'akkadian', word: 'katābu', meaning: 'to inscribe', form: 'verb' },
      { language: 'arabic', word: 'kataba', meaning: 'to write', form: 'verb' },
      { language: 'ethiopic', word: 'kataba', meaning: 'to write', form: 'verb' },
      { language: 'syriac', word: 'ktab', meaning: 'to write', form: 'verb' }
    ],
    note: 'Pan-Semitic *ktb root for writing, possibly from Proto-Semitic "to mark"'
  },
  'ספר': {
    meaning: 'to count, recount, write',
    cognates: [
      { language: 'akkadian', word: 'šapāru', meaning: 'to send, write', form: 'verb' },
      { language: 'arabic', word: 'safara', meaning: 'to travel, journey', form: 'verb' },
      { language: 'ethiopic', word: 'safara', meaning: 'to write', form: 'verb' }
    ],
    note: 'Semantic range includes "count" (Hebrew), "write" (Akkadian), "travel" (Arabic)'
  },
  'ידע': {
    meaning: 'to know',
    cognates: [
      { language: 'akkadian', word: 'idû', meaning: 'to know', form: 'verb' },
      { language: 'arabic', word: 'wadaʿa', meaning: 'to leave, deposit', form: 'verb' },
      { language: 'ethiopic', word: 'yedʿa', meaning: 'to know', form: 'verb' }
    ],
    note: 'Hebrew yādaʿ covers intellectual AND intimate knowledge (Gen 4:1)'
  },
  'עשה': {
    meaning: 'to do, make',
    cognates: [
      { language: 'akkadian', word: 'ešû', meaning: 'to go out', form: 'verb' },
      { language: 'arabic', word: 'ʿasā', meaning: 'perhaps (auxiliary)', form: 'particle' },
      { language: 'ethiopic', word: 'ʿasaya', meaning: 'to perform', form: 'verb' }
    ],
    note: 'Basic action verb, very frequent in Biblical Hebrew (~2,600 occurrences)'
  },
  'הלך': {
    meaning: 'to go, walk',
    cognates: [
      { language: 'akkadian', word: 'alāku', meaning: 'to go', form: 'verb' },
      { language: 'ugaritic', word: 'hlk', meaning: 'to go', form: 'verb' },
      { language: 'arabic', word: 'halaka', meaning: 'to perish', form: 'verb' }
    ],
    note: 'Akkadian alāku suggests original *wlk (PE-WAW), explaining weak verb behavior'
  },
  'בוא': {
    meaning: 'to come, enter',
    cognates: [
      { language: 'akkadian', word: 'bāʾu', meaning: 'to come', form: 'verb' },
      { language: 'arabic', word: 'bāʾa', meaning: 'to return', form: 'verb' },
      { language: 'ethiopic', word: 'boʾa', meaning: 'to enter', form: 'verb' }
    ],
    note: 'Hollow verb (AYIN-WAW), Proto-Semitic *bwʾ "to come, enter"'
  },
  'נתן': {
    meaning: 'to give',
    cognates: [
      { language: 'akkadian', word: 'nadānu', meaning: 'to give', form: 'verb' },
      { language: 'ugaritic', word: 'ytn', meaning: 'to give', form: 'verb' },
      { language: 'arabic', word: 'ʾaʿṭā', meaning: 'to give (different root)', form: 'verb' }
    ],
    note: 'PE-NUN verb showing nun assimilation; Ugaritic ytn shows YOD prefix'
  },
  'לקח': {
    meaning: 'to take',
    cognates: [
      { language: 'akkadian', word: 'leqû', meaning: 'to take', form: 'verb' },
      { language: 'arabic', word: 'laqiya', meaning: 'to meet, find', form: 'verb' }
    ],
    note: 'Behaves as PE-NUN verb despite initial lamed; paired with נתן conceptually'
  },
  'אכל': {
    meaning: 'to eat',
    cognates: [
      { language: 'akkadian', word: 'akālu', meaning: 'to eat', form: 'verb' },
      { language: 'ugaritic', word: 'ʾkl', meaning: 'to eat', form: 'verb' },
      { language: 'arabic', word: 'ʾakala', meaning: 'to eat', form: 'verb' },
      { language: 'ethiopic', word: 'ʾakala', meaning: 'to eat', form: 'verb' }
    ],
    note: 'Pan-Semitic *ʾkl root, one of most stable verbs across Semitic languages'
  },
  'שתה': {
    meaning: 'to drink',
    cognates: [
      { language: 'akkadian', word: 'šatû', meaning: 'to drink', form: 'verb' },
      { language: 'arabic', word: 'saqā', meaning: 'to water (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'sataya', meaning: 'to drink', form: 'verb' }
    ],
    note: 'LAMED-HE verb; basic sustenance verb paired with אכל'
  },
  'ישב': {
    meaning: 'to sit, dwell',
    cognates: [
      { language: 'akkadian', word: 'ašābu', meaning: 'to sit, dwell', form: 'verb' },
      { language: 'ugaritic', word: 'ythb', meaning: 'to sit', form: 'verb' },
      { language: 'arabic', word: 'waṯaba', meaning: 'to jump (semantic shift)', form: 'verb' }
    ],
    note: 'PE-YOD verb; semantic range includes "inhabit, remain, throne"'
  },
  'קום': {
    meaning: 'to rise, stand',
    cognates: [
      { language: 'akkadian', word: 'qâmu', meaning: 'to burn (different meaning)', form: 'verb' },
      { language: 'arabic', word: 'qāma', meaning: 'to rise, stand', form: 'verb' },
      { language: 'ethiopic', word: 'qoma', meaning: 'to stand', form: 'verb' }
    ],
    note: 'Hollow verb (AYIN-WAW); opposite of ישב in Biblical usage'
  },
  'עמד': {
    meaning: 'to stand',
    cognates: [
      { language: 'akkadian', word: 'emēdu', meaning: 'to lean on', form: 'verb' },
      { language: 'arabic', word: 'ʿamada', meaning: 'to intend, support', form: 'verb' },
      { language: 'syriac', word: 'ʿmed', meaning: 'to stand', form: 'verb' }
    ],
    note: 'Distinct from קום in aspect: עמד = stationary position, קום = rising motion'
  },
  'שמר': {
    meaning: 'to keep, guard',
    cognates: [
      { language: 'akkadian', word: 'naṣāru', meaning: 'to guard (different root)', form: 'verb' },
      { language: 'arabic', word: 'samara', meaning: 'to converse at night', form: 'verb' },
      { language: 'ethiopic', word: 'samara', meaning: 'to harvest', form: 'verb' }
    ],
    note: 'Hebrew semantic: "guard, observe, keep commandments"; key covenantal term'
  },
  'ברך': {
    meaning: 'to bless, kneel',
    cognates: [
      { language: 'akkadian', word: 'karābu', meaning: 'to bless, pray', form: 'verb' },
      { language: 'arabic', word: 'baraka', meaning: 'to kneel (camel)', form: 'verb' },
      { language: 'ethiopic', word: 'baraka', meaning: 'to bless', form: 'verb' }
    ],
    note: 'Related to בֶּרֶךְ (knee); blessing posture involved kneeling'
  },
  'חיה': {
    meaning: 'to live',
    cognates: [
      { language: 'akkadian', word: 'balāṭu', meaning: 'to live (different root)', form: 'verb' },
      { language: 'arabic', word: 'ḥayiya', meaning: 'to live', form: 'verb' },
      { language: 'ethiopic', word: 'ḥaywa', meaning: 'to live', form: 'verb' }
    ],
    note: 'LAMED-HE verb; forms noun חַיִּים (life, always plural in Hebrew)'
  },
  'מות': {
    meaning: 'to die',
    cognates: [
      { language: 'akkadian', word: 'mātu', meaning: 'to die', form: 'verb' },
      { language: 'ugaritic', word: 'mt', meaning: 'death, Mot (god)', form: 'noun' },
      { language: 'arabic', word: 'māta', meaning: 'to die', form: 'verb' }
    ],
    note: 'Hollow verb; מָוֶת personified as deity in Ugaritic mythology'
  },
  'דבר': {
    meaning: 'to speak, word',
    cognates: [
      { language: 'akkadian', word: 'dabābu', meaning: 'to speak, litigate', form: 'verb' },
      { language: 'arabic', word: 'dabbara', meaning: 'to manage, arrange', form: 'verb' },
      { language: 'ethiopic', word: 'dabara', meaning: 'to speak', form: 'verb' }
    ],
    note: 'Forms דָּבָר (word/thing) - Hebrew conflates "word" and "matter/thing"'
  },
  'עבד': {
    meaning: 'to serve, work',
    cognates: [
      { language: 'akkadian', word: 'abādu', meaning: 'to serve', form: 'verb' },
      { language: 'arabic', word: 'ʿabada', meaning: 'to worship', form: 'verb' },
      { language: 'ethiopic', word: 'ʿabada', meaning: 'to make, do', form: 'verb' }
    ],
    note: 'Semantic range: work, serve, worship; עֶבֶד = servant/slave'
  },
  'אהב': {
    meaning: 'to love',
    cognates: [
      { language: 'akkadian', word: 'râmu', meaning: 'to love (different root)', form: 'verb' },
      { language: 'arabic', word: 'ḥabba', meaning: 'to love (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'ʾafqara', meaning: 'to love (different root)', form: 'verb' }
    ],
    note: 'Hebrew אהב is unique; other Semitic languages use different roots for love'
  },
  'ירא': {
    meaning: 'to fear, revere',
    cognates: [
      { language: 'akkadian', word: 'warû', meaning: 'to lead (semantic drift)', form: 'verb' },
      { language: 'arabic', word: 'raʾā', meaning: 'to see (different root)', form: 'verb' },
      { language: 'ethiopic', word: 'farha', meaning: 'to fear (different root)', form: 'verb' }
    ],
    note: 'PE-YOD verb; יִרְאַת ה\' = "fear of the LORD" = reverence/awe'
  },
  'צדק': {
    meaning: 'to be righteous',
    cognates: [
      { language: 'akkadian', word: 'ṣadāqu', meaning: 'to be straight, righteous', form: 'verb' },
      { language: 'arabic', word: 'ṣadaqa', meaning: 'to speak truth', form: 'verb' },
      { language: 'ethiopic', word: 'ṣadaqa', meaning: 'to be just', form: 'verb' }
    ],
    note: 'Core ethical term; צֶדֶק/צְדָקָה = righteousness/justice/charity'
  },
  'חטא': {
    meaning: 'to sin, miss the mark',
    cognates: [
      { language: 'akkadian', word: 'ḫaṭû', meaning: 'to sin, err', form: 'verb' },
      { language: 'arabic', word: 'ḫaṭiʾa', meaning: 'to err, sin', form: 'verb' }
    ],
    note: 'Original meaning "miss target" (cf. Judges 20:16); theological "sin" is derivative'
  },
  'גאל': {
    meaning: 'to redeem',
    cognates: [
      { language: 'akkadian', word: 'gamālu', meaning: 'to spare (semantic connection)', form: 'verb' },
      { language: 'arabic', word: 'jaʿala', meaning: 'to make (different root)', form: 'verb' }
    ],
    note: 'Technical term for kinsman-redeemer (גֹּאֵל); Exodus redemption theology'
  },
  'פדה': {
    meaning: 'to ransom, redeem',
    cognates: [
      { language: 'akkadian', word: 'padû', meaning: 'to spare, release', form: 'verb' },
      { language: 'arabic', word: 'fadā', meaning: 'to ransom', form: 'verb' }
    ],
    note: 'Distinct from גאל: פדה = transactional redemption, גאל = kinship obligation'
  },
  'כפר': {
    meaning: 'to cover, atone',
    cognates: [
      { language: 'akkadian', word: 'kapāru', meaning: 'to wipe, purge', form: 'verb' },
      { language: 'arabic', word: 'kafara', meaning: 'to cover, be ungrateful', form: 'verb' },
      { language: 'syriac', word: 'kpar', meaning: 'to deny, atone', form: 'verb' }
    ],
    note: 'Yom Kippur from this root; כַּפֹּרֶת = ark cover/mercy seat'
  },
  'זכר': {
    meaning: 'to remember',
    cognates: [
      { language: 'akkadian', word: 'zakāru', meaning: 'to speak, name', form: 'verb' },
      { language: 'arabic', word: 'ḏakara', meaning: 'to remember, mention', form: 'verb' },
      { language: 'ethiopic', word: 'zakara', meaning: 'to remember', form: 'verb' }
    ],
    note: 'Theological: God "remembering" means acting on behalf of (Gen 8:1, Ex 2:24)'
  },
  'שלם': {
    meaning: 'to be complete, at peace',
    cognates: [
      { language: 'akkadian', word: 'šalāmu', meaning: 'to be safe, complete', form: 'verb' },
      { language: 'ugaritic', word: 'šlm', meaning: 'peace, completeness', form: 'noun' },
      { language: 'arabic', word: 'salima', meaning: 'to be safe', form: 'verb' }
    ],
    note: 'Root of שָׁלוֹם; semantic: wholeness, completeness, peace, restitution'
  },
  'חכם': {
    meaning: 'to be wise',
    cognates: [
      { language: 'akkadian', word: 'emqu', meaning: 'wise (different root)', form: 'adjective' },
      { language: 'arabic', word: 'ḥakama', meaning: 'to judge, be wise', form: 'verb' },
      { language: 'syriac', word: 'ḥkam', meaning: 'to be wise', form: 'verb' }
    ],
    note: 'חָכְמָה = wisdom; practical skill + moral insight in Biblical conception'
  },
  'יצא': {
    meaning: 'to go out',
    cognates: [
      { language: 'akkadian', word: 'waṣû', meaning: 'to go out', form: 'verb' },
      { language: 'arabic', word: 'waza\'a', meaning: 'to distribute', form: 'verb' }
    ],
    note: 'PE-YOD verb; יְצִיאַת מִצְרַיִם = Exodus from Egypt'
  },
  'שוב': {
    meaning: 'to return, repent',
    cognates: [
      { language: 'akkadian', word: 'târu', meaning: 'to turn, return', form: 'verb' },
      { language: 'arabic', word: 'ṯāba', meaning: 'to return, repent', form: 'verb' }
    ],
    note: 'Hollow verb; תְּשׁוּבָה = repentance (literally "returning")'
  },
  'נשא': {
    meaning: 'to lift, carry',
    cognates: [
      { language: 'akkadian', word: 'našû', meaning: 'to lift, carry', form: 'verb' },
      { language: 'arabic', word: 'nasaʾa', meaning: 'to defer, postpone', form: 'verb' }
    ],
    note: 'PE-NUN with aleph; נָשָׂא פָנִים = "lift face" = show favor'
  },
  'רפא': {
    meaning: 'to heal',
    cognates: [
      { language: 'akkadian', word: 'rapādu', meaning: 'to run, hasten', form: 'verb' },
      { language: 'arabic', word: 'rafaʾa', meaning: 'to mend, patch', form: 'verb' }
    ],
    note: 'רְפוּאָה = healing; God as healer (Ex 15:26 אֲנִי ה\' רֹפְאֶךָ)'
  }
};

/**
 * Get cognate information for a root
 * @param {string} root - Hebrew root
 * @returns {Object|null} - Cognate information
 */
export function getCognates(root) {
  const cleaned = stripVowels(root);

  if (ROOT_COGNATES[cleaned]) {
    return {
      root: cleaned,
      ...ROOT_COGNATES[cleaned],
      hasCognates: true
    };
  }
  return null;
}
