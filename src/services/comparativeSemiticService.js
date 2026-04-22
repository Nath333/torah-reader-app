// =============================================================================
// PRO SCHOLAR V12: COMPARATIVE SEMITIC SERVICE
// Academic cognate database for Hebrew/Aramaic with sister Semitic languages
// =============================================================================
//
// Provides etymological and comparative data from:
// - Proto-Semitic reconstructions
// - Akkadian (Babylonian/Assyrian)
// - Ugaritic
// - Phoenician
// - Aramaic (Official, Syriac, Mandaic)
// - Arabic (Classical)
// - Ethiopic (Ge'ez)
// - South Arabian (Sabaean)
//
// ACADEMIC SOURCES:
// - Koehler-Baumgartner, HALOT (cognate sections)
// - Sokoloff, DJBA/DJPA
// - CAD (Chicago Assyrian Dictionary)
// - DUL (Dictionary of Ugaritic Language)
// - Lane's Arabic-English Lexicon
// - Leslau, Comparative Dictionary of Ge'ez
// =============================================================================

import { createLogger } from '../utils/debug';
import { lookupCAL, lookupCALSync } from './calService';
// PRO SCHOLAR V12: Use centralized dictionaryLoader to prevent duplicate fetches
import { getEtymologyJastrow } from './dictionaries/dictionaryLoader';
import { stripAllDiacritics, normalizeFinals } from '../utils/hebrewUtils';

const log = createLogger('ComparativeSemitic');

// =============================================================================
// COGNATE DATABASE - Core Semitic Roots
// =============================================================================

/**
 * Comprehensive cognate database for ~150 core Hebrew/Aramaic roots
 * Each entry includes proto-Semitic reconstruction and attestations
 *
 * Structure:
 * {
 *   protoSemitic: "*root" - Reconstructed PS form
 *   meaning: "core semantic" - Original meaning
 *   akkadian: { word, meaning, period, source }
 *   ugaritic: { word, meaning }
 *   phoenician: { word, meaning }
 *   aramaic: {
 *     official: {},  // Imperial Aramaic
 *     syriac: {},    // Classical Syriac
 *     mandaic: {}    // Mandaic
 *   }
 *   arabic: { word, meaning, root }
 *   ethiopic: { word, meaning }
 *   southArabian: { word, meaning }
 *   semanticDevelopment: [] - How meaning evolved
 *   isLoanword: boolean - If borrowed into Hebrew
 *   scholarlyNotes: string - Academic commentary
 * }
 */
export const COGNATE_DATABASE = {
  // ==========================================================================
  // THEOLOGICAL ROOTS
  // ==========================================================================

  "אל": {
    protoSemitic: "*ʾil-",
    meaning: "god, divine being",
    akkadian: {
      word: "ilu",
      meaning: "god, deity",
      period: "Old Akkadian onwards",
      source: "CAD I/J 91"
    },
    ugaritic: {
      word: "ʾil",
      meaning: "El (head of pantheon), god",
      source: "DUL 48-51"
    },
    phoenician: { word: "ʾl", meaning: "god, El" },
    aramaic: {
      official: { word: "ʾl", meaning: "god" },
      syriac: { word: "ܐܠܗܐ (ʾalāhā)", meaning: "God" }
    },
    arabic: {
      word: "إِلٰه (ʾilāh)",
      meaning: "god, deity",
      root: "ʾ-l-h",
      note: "Related: الله (Allāh) = 'the God'"
    },
    ethiopic: { word: "ʾamlāk", meaning: "god (different root)" },
    southArabian: { word: "ʾl", meaning: "god" },
    semanticDevelopment: [
      { stage: 1, meaning: "god, divine being (common Semitic)" },
      { stage: 2, meaning: "El - supreme deity (Canaanite)" },
      { stage: 3, meaning: "poetic name for YHWH (Hebrew)" }
    ],
    scholarlyNotes: "Pan-Semitic divine designation. In Ugaritic texts, El heads the divine council. Hebrew uses both as generic 'god' and as divine name."
  },

  "ברא": {
    protoSemitic: "*brʾ",
    meaning: "to create, form",
    akkadian: {
      word: "barû",
      meaning: "to see, examine, divine",
      period: "Old Babylonian",
      note: "Semantic shift: 'examine' → 'determine' (different semantic field)"
    },
    ugaritic: null,
    phoenician: null,
    aramaic: {
      syriac: { word: "ܒܪܐ (brāʾ)", meaning: "to create" }
    },
    arabic: {
      word: "بَرَأَ (baraʾa)",
      meaning: "to create; to be free from",
      root: "b-r-ʾ"
    },
    ethiopic: { word: "baraya", meaning: "to create" },
    semanticDevelopment: [
      { stage: 1, meaning: "to cut, separate (?)" },
      { stage: 2, meaning: "to create by divine action" },
      { stage: 3, meaning: "exclusive divine creation (BH)" }
    ],
    scholarlyNotes: "In Biblical Hebrew, exclusively used for divine creation (never human making). This theological specialization is unique to Hebrew.",
    isTheologicallySignificant: true
  },

  "קדש": {
    protoSemitic: "*qdš",
    meaning: "holy, set apart, sacred",
    akkadian: {
      word: "qadāšu / qadištu",
      meaning: "to be pure, holy; sacred prostitute",
      period: "Old Babylonian",
      source: "CAD Q 47-52"
    },
    ugaritic: {
      word: "qdš",
      meaning: "holy, sanctuary",
      source: "DUL 696-698"
    },
    phoenician: { word: "qdš", meaning: "holy, consecrated" },
    aramaic: {
      official: { word: "qdš", meaning: "holy" },
      syriac: { word: "ܩܕܫ (qaddīš)", meaning: "holy" }
    },
    arabic: {
      word: "قَدُسَ (qadusa)",
      meaning: "to be holy, pure",
      root: "q-d-s",
      note: "القُدس (al-Quds) = Jerusalem"
    },
    ethiopic: { word: "qəddus", meaning: "holy" },
    semanticDevelopment: [
      { stage: 1, meaning: "set apart, separated" },
      { stage: 2, meaning: "consecrated to deity" },
      { stage: 3, meaning: "morally/ritually pure" }
    ],
    scholarlyNotes: "Core concept in Israelite religion. The 'separation' meaning underlies both cultic purity and moral holiness.",
    isTheologicallySignificant: true
  },

  // ==========================================================================
  // COMMON VERBS
  // ==========================================================================

  "נפק": {
    protoSemitic: "*npq",
    meaning: "to go out, come forth",
    akkadian: {
      word: "napāqu",
      meaning: "to gore, push (rare)",
      note: "Different semantic field; Hebrew יצא is cognate to Akk. waṣûm"
    },
    ugaritic: null,
    aramaic: {
      official: { word: "npq", meaning: "to go out" },
      syriac: { word: "ܢܦܩ (npaq)", meaning: "to go out, exit" },
      mandaic: { word: "npq", meaning: "to go out" }
    },
    arabic: {
      word: "نَفَقَ (nafaqa)",
      meaning: "to be spent, perish; to sell well",
      root: "n-f-q",
      note: "Semantic shift: 'go out' → 'be spent/exhausted'"
    },
    ethiopic: { word: "nafaqa", meaning: "to spend, expend" },
    semanticDevelopment: [
      { stage: 1, meaning: "to go out, exit (Aramaic primary)" },
      { stage: 2, meaning: "to derive, result from (Talmudic)" },
      { stage: 3, meaning: "to exclude (legal: לאפוקי)" }
    ],
    isAramaic: true,
    scholarlyNotes: "Primary Aramaic verb for 'exit' replacing Hebrew יצא. The Aphel form (אפיק/תפיק) developed specialized legal usage in Talmudic discourse.",
    talmudic: {
      frequency: "extremely high",
      technicalUsages: [
        { phrase: "נפקא מינה", meaning: "practical difference/result" },
        { phrase: "לאפוקי", meaning: "to exclude (in legal reasoning)" },
        { phrase: "מנא לן", meaning: "from where do we derive?" }
      ]
    }
  },

  "אמר": {
    protoSemitic: "*ʾmr",
    meaning: "to say, speak, command",
    akkadian: {
      word: "amāru",
      meaning: "to see, look at",
      period: "Old Akkadian",
      note: "Different semantic field! ('see' not 'say')"
    },
    ugaritic: {
      word: "ʾmr",
      meaning: "to say, speak",
      source: "DUL 72"
    },
    phoenician: { word: "ʾmr", meaning: "to say" },
    aramaic: {
      official: { word: "ʾmr", meaning: "to say" },
      syriac: { word: "ܐܡܪ (ʾemar)", meaning: "to say" }
    },
    arabic: {
      word: "أَمَرَ (ʾamara)",
      meaning: "to command, order",
      root: "ʾ-m-r",
      note: "Semantic specialization: 'say' → 'command'"
    },
    ethiopic: { word: "ʾammara", meaning: "to show, indicate" },
    semanticDevelopment: [
      { stage: 1, meaning: "to say, speak (common Semitic)" },
      { stage: 2, meaning: "to command (Arabic specialization)" }
    ],
    scholarlyNotes: "Curious that Akkadian amāru means 'to see' - possible ancient semantic connection between 'seeing' and 'declaring'?"
  },

  "עבד": {
    protoSemitic: "*ʿbd",
    meaning: "to work, serve",
    akkadian: {
      word: "abādu",
      meaning: "to destroy (different root!)",
      note: "Akkadian epēšu 'to do' is the semantic equivalent"
    },
    ugaritic: {
      word: "ʿbd",
      meaning: "to serve, work; servant",
      source: "DUL 148"
    },
    phoenician: { word: "ʿbd", meaning: "to serve; servant" },
    aramaic: {
      official: { word: "ʿbd", meaning: "to do, make" },
      syriac: { word: "ܥܒܕ (ʿbad)", meaning: "to do, make, work" }
    },
    arabic: {
      word: "عَبَدَ (ʿabada)",
      meaning: "to worship, serve",
      root: "ʿ-b-d",
      note: "عَبْد (ʿabd) = servant/slave"
    },
    ethiopic: { word: "gabra", meaning: "to do, make (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to serve (a master/deity)" },
      { stage: 2, meaning: "to work, labor" },
      { stage: 3, meaning: "to do, make (Aramaic expansion)" }
    ],
    isAramaic: true,
    scholarlyNotes: "In Aramaic, broader meaning 'to do/make' (Hebrew עשה equivalent). The 'servant' nominal (עבדא) remains common."
  },

  "יצא": {
    protoSemitic: "*wṣʾ / *yṣʾ",
    meaning: "to go out, exit, come forth",
    akkadian: {
      word: "waṣûm",
      meaning: "to go out, exit, come forth",
      period: "Old Akkadian",
      source: "CAD A/2 359"
    },
    ugaritic: {
      word: "yṣʾ",
      meaning: "to go out",
      source: "DUL 412"
    },
    phoenician: { word: "yṣʾ", meaning: "to go out" },
    aramaic: {
      official: { word: "נפק", meaning: "to go out" },
      syriac: { word: "ܢܦܩ (npaq)", meaning: "to go out" },
      note: "נפק replaces יצא in Aramaic dialects"
    },
    arabic: {
      word: "وَضَأَ (waḍaʾa)",
      meaning: "to be bright, clean",
      note: "Semantic divergence; خَرَجَ (xaraja) = 'go out'"
    },
    ethiopic: { word: "waḍʾa", meaning: "to go out" },
    semanticDevelopment: [
      { stage: 1, meaning: "to go out physically (common Semitic)" },
      { stage: 2, meaning: "to come forth, emerge" },
      { stage: 3, meaning: "to descend from (יוצא חלציו)" }
    ],
    scholarlyNotes: "Hebrew יָצָא / Aramaic נְפַק is a key dialect marker. יְצִיאַת מִצְרַיִם (Exodus) is theologically central. The Mishnaic tractate Shabbat opens with יְצִיאוֹת הַשַּׁבָּת.",
    isTheologicallySignificant: true
  },

  "מלך": {
    protoSemitic: "*mlk",
    meaning: "to rule, be king",
    akkadian: {
      word: "malku",
      meaning: "prince, king, ruler",
      period: "Old Akkadian",
      source: "CAD M/1 165"
    },
    ugaritic: {
      word: "mlk",
      meaning: "king; to reign",
      source: "DUL 548-550"
    },
    phoenician: { word: "mlk", meaning: "king" },
    aramaic: {
      official: { word: "mlk", meaning: "king" },
      syriac: { word: "ܡܠܟܐ (malkā)", meaning: "king" }
    },
    arabic: {
      word: "مَلِك (malik)",
      meaning: "king, ruler",
      root: "m-l-k"
    },
    ethiopic: { word: "nəguś", meaning: "king (different root)" },
    southArabian: { word: "mlk", meaning: "king" },
    semanticDevelopment: [
      { stage: 1, meaning: "ruler, king (pan-Semitic)" },
      { stage: 2, meaning: "to counsel → to rule (proposed etymology)" }
    ],
    scholarlyNotes: "One of the most stable Semitic roots. Found across all branches with consistent meaning."
  },

  "כתב": {
    protoSemitic: "*ktb",
    meaning: "to write",
    akkadian: null,
    ugaritic: {
      word: "ktb",
      meaning: "to write",
      source: "DUL 457"
    },
    phoenician: { word: "ktb", meaning: "to write" },
    aramaic: {
      official: { word: "ktb", meaning: "to write" },
      syriac: { word: "ܟܬܒ (ktab)", meaning: "to write" }
    },
    arabic: {
      word: "كَتَبَ (kataba)",
      meaning: "to write",
      root: "k-t-b",
      note: "كِتَاب (kitāb) = book"
    },
    ethiopic: { word: "kataba", meaning: "to write" },
    semanticDevelopment: [
      { stage: 1, meaning: "to write, inscribe" }
    ],
    scholarlyNotes: "West Semitic innovation; Akkadian used šaṭāru for 'to write'. The alphabetic writing system spread with this root."
  },

  "שמע": {
    protoSemitic: "*šmʿ",
    meaning: "to hear, listen, obey",
    akkadian: {
      word: "šemûm",
      meaning: "to hear",
      period: "Old Akkadian",
      source: "CAD Š/2 277"
    },
    ugaritic: {
      word: "šmʿ",
      meaning: "to hear",
      source: "DUL 827"
    },
    phoenician: { word: "šmʿ", meaning: "to hear" },
    aramaic: {
      official: { word: "šmʿ", meaning: "to hear" },
      syriac: { word: "ܫܡܥ (šmaʿ)", meaning: "to hear" }
    },
    arabic: {
      word: "سَمِعَ (samiʿa)",
      meaning: "to hear",
      root: "s-m-ʿ"
    },
    ethiopic: { word: "samʿa", meaning: "to hear" },
    semanticDevelopment: [
      { stage: 1, meaning: "to hear (perception)" },
      { stage: 2, meaning: "to obey (Hebrew 'hear' → 'obey')" }
    ],
    scholarlyNotes: "The Hebrew semantic range includes 'obey' (שמע בקול = 'listen to the voice of' = 'obey').",
    isTheologicallySignificant: true
  },

  // ==========================================================================
  // BODY PARTS & NATURE
  // ==========================================================================

  "יד": {
    protoSemitic: "*yad-",
    meaning: "hand",
    akkadian: {
      word: "idu",
      meaning: "arm, side, bank",
      period: "Old Akkadian",
      note: "Semantic shift: 'hand' → 'arm/side'"
    },
    ugaritic: { word: "yd", meaning: "hand" },
    phoenician: { word: "yd", meaning: "hand" },
    aramaic: {
      official: { word: "yd", meaning: "hand" },
      syriac: { word: "ܐܝܕܐ (ʾīḏā)", meaning: "hand" }
    },
    arabic: {
      word: "يَد (yad)",
      meaning: "hand",
      root: "y-d"
    },
    ethiopic: { word: "ʾəd", meaning: "hand" },
    southArabian: { word: "yd", meaning: "hand" },
    semanticDevelopment: [
      { stage: 1, meaning: "hand (body part)" },
      { stage: 2, meaning: "power, possession (metonymy)" },
      { stage: 3, meaning: "side, bank (Akkadian)" }
    ],
    scholarlyNotes: "Pan-Semitic. Hebrew יד has extensive metaphorical usage: 'hand of God', 'by the hand of', etc."
  },

  "לב": {
    protoSemitic: "*libb-",
    meaning: "heart, mind, interior",
    akkadian: {
      word: "libbu",
      meaning: "heart, interior, midst",
      period: "Old Akkadian",
      source: "CAD L 169"
    },
    ugaritic: { word: "lb", meaning: "heart" },
    phoenician: { word: "lb", meaning: "heart" },
    aramaic: {
      official: { word: "lb", meaning: "heart" },
      syriac: { word: "ܠܒܐ (lebbā)", meaning: "heart" }
    },
    arabic: {
      word: "لُبّ (lubb)",
      meaning: "core, essence, mind",
      root: "l-b-b",
      note: "قَلْب (qalb) more common for 'heart'"
    },
    ethiopic: { word: "ləbb", meaning: "heart, mind" },
    semanticDevelopment: [
      { stage: 1, meaning: "heart (organ)" },
      { stage: 2, meaning: "mind, will, intention (Hebrew)" },
      { stage: 3, meaning: "interior, midst (Akkadian)" }
    ],
    scholarlyNotes: "In Hebrew, לב is the seat of intellect and will (not emotion - that's כליות/מעים). 'Heart' in English misleadingly implies emotion.",
    isTheologicallySignificant: true
  },

  "שמש": {
    protoSemitic: "*šamš-",
    meaning: "sun",
    akkadian: {
      word: "šamšu (Šamaš)",
      meaning: "sun; sun-god",
      period: "Old Akkadian",
      note: "Šamaš = major deity"
    },
    ugaritic: { word: "špš", meaning: "sun (Shapash goddess)" },
    phoenician: { word: "šmš", meaning: "sun" },
    aramaic: {
      official: { word: "šmš", meaning: "sun" },
      syriac: { word: "ܫܡܫܐ (šemšā)", meaning: "sun" }
    },
    arabic: {
      word: "شَمْس (šams)",
      meaning: "sun",
      root: "š-m-s"
    },
    ethiopic: { word: "śamāy", meaning: "heaven (related?)" },
    semanticDevelopment: [
      { stage: 1, meaning: "sun (celestial body)" },
      { stage: 2, meaning: "sun deity (Mesopotamia, Ugarit)" },
      { stage: 3, meaning: "servant (שמש - semantic extension)" }
    ],
    scholarlyNotes: "In Hebrew, שמש is demythologized - just a celestial body, not a deity. The verb שמש 'to serve' may be a denominative."
  },

  // ==========================================================================
  // RELATIONAL TERMS
  // ==========================================================================

  "אב": {
    protoSemitic: "*ʾab-",
    meaning: "father",
    akkadian: { word: "abu", meaning: "father", period: "Old Akkadian" },
    ugaritic: { word: "ʾab", meaning: "father" },
    phoenician: { word: "ʾb", meaning: "father" },
    aramaic: {
      official: { word: "ʾb", meaning: "father" },
      syriac: { word: "ܐܒܐ (ʾabbā)", meaning: "father" }
    },
    arabic: {
      word: "أَب (ʾab)",
      meaning: "father",
      root: "ʾ-b"
    },
    ethiopic: { word: "ʾab", meaning: "father" },
    southArabian: { word: "ʾb", meaning: "father" },
    scholarlyNotes: "One of the most stable Semitic kinship terms. אַבָּא (Aramaic emphatic) entered Hebrew as intimate address."
  },

  "אם": {
    protoSemitic: "*ʾimm-",
    meaning: "mother",
    akkadian: { word: "ummu", meaning: "mother", period: "Old Akkadian" },
    ugaritic: { word: "ʾum", meaning: "mother" },
    phoenician: { word: "ʾm", meaning: "mother" },
    aramaic: {
      official: { word: "ʾm", meaning: "mother" },
      syriac: { word: "ܐܡܐ (ʾemmā)", meaning: "mother" }
    },
    arabic: {
      word: "أُمّ (ʾumm)",
      meaning: "mother",
      root: "ʾ-m-m"
    },
    ethiopic: { word: "ʾəmm", meaning: "mother" },
    scholarlyNotes: "Pan-Semitic kinship term. Also 'clan' or 'people' metaphorically."
  },

  "בן": {
    protoSemitic: "*bin-/*ban-",
    meaning: "son",
    akkadian: {
      word: "māru",
      meaning: "son",
      note: "Different root! Akk. bīnu = 'offspring' (rare)"
    },
    ugaritic: { word: "bn", meaning: "son" },
    phoenician: { word: "bn", meaning: "son" },
    aramaic: {
      official: { word: "br", meaning: "son (different form!)" },
      syriac: { word: "ܒܪܐ (brā)", meaning: "son" }
    },
    arabic: {
      word: "اِبْن (ibn)",
      meaning: "son",
      root: "b-n-y"
    },
    ethiopic: { word: "wəld", meaning: "son (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "son (literal)" },
      { stage: 2, meaning: "member of class (בן ישראל, בני נביאים)" }
    ],
    scholarlyNotes: "Hebrew בן vs. Aramaic בר is a key dialect marker. 'Son of' constructions are common Semitic idiom for class membership."
  },

  // ==========================================================================
  // ADDITIONAL HIGH-FREQUENCY ROOTS - PRO SCHOLAR V12
  // ==========================================================================

  "דבר": {
    protoSemitic: "*dbr",
    meaning: "word, matter, thing; to speak",
    akkadian: {
      word: "dabābu",
      meaning: "to speak, talk",
      period: "Old Babylonian"
    },
    ugaritic: { word: "dbr", meaning: "to speak" },
    aramaic: {
      official: { word: "dbr", meaning: "to lead, drive" },
      syriac: { word: "ܕܒܪ (dbar)", meaning: "to lead; word" }
    },
    arabic: {
      word: "دَبَرَ (dabara)",
      meaning: "to be behind, follow",
      note: "Semantic shift from 'drive/lead'"
    },
    ethiopic: { word: "nagara", meaning: "to speak (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to drive, lead (animals)" },
      { stage: 2, meaning: "to speak (metaphor: driving words)" },
      { stage: 3, meaning: "word, matter, thing (nominalization)" }
    ],
    scholarlyNotes: "The Hebrew דָּבָר encompasses 'word', 'thing', and 'matter' - a semantic range not found in English. Divine speech creates reality (Gen 1).",
    isTheologicallySignificant: true
  },

  "ידע": {
    protoSemitic: "*ydʿ",
    meaning: "to know, perceive",
    akkadian: {
      word: "idû",
      meaning: "to know",
      period: "Old Akkadian"
    },
    ugaritic: { word: "ydʿ", meaning: "to know" },
    aramaic: {
      official: { word: "ydʿ", meaning: "to know" },
      syriac: { word: "ܝܕܥ (ydaʿ)", meaning: "to know" }
    },
    arabic: {
      word: "وَدَعَ (wadaʿa)",
      meaning: "to leave, let be",
      note: "Different semantic field"
    },
    ethiopic: { word: "ʾamara", meaning: "to know (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to perceive, recognize" },
      { stage: 2, meaning: "to know (cognitive)" },
      { stage: 3, meaning: "to know intimately (Gen 4:1)" }
    ],
    scholarlyNotes: "Biblical Hebrew ידע includes experiential/intimate knowledge, not just cognitive. 'Adam knew Eve' = intimate union.",
    isTheologicallySignificant: true
  },

  "הלך": {
    protoSemitic: "*hlk",
    meaning: "to walk, go",
    akkadian: {
      word: "alāku",
      meaning: "to go, walk",
      period: "Old Akkadian"
    },
    ugaritic: { word: "hlk", meaning: "to go" },
    phoenician: { word: "hlk", meaning: "to go" },
    aramaic: {
      official: { word: "hlk", meaning: "to go (rare)" },
      note: "Replaced by אזל in most Aramaic"
    },
    arabic: {
      word: "هَلَكَ (halaka)",
      meaning: "to perish, die",
      note: "Semantic shift: 'go away' → 'perish'"
    },
    ethiopic: { word: "hora", meaning: "to go (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to walk physically" },
      { stage: 2, meaning: "to conduct oneself, live (הלך בדרכי ה')" }
    ],
    scholarlyNotes: "Hebrew הלך has ethical/religious usage: 'walking in God's ways' = ethical conduct. Aramaic replaced with אזל."
  },

  "עשה": {
    protoSemitic: "*ʿśy",
    meaning: "to do, make",
    akkadian: {
      word: "epēšu",
      meaning: "to do, make",
      note: "Different root but same semantic"
    },
    ugaritic: { word: "ʿśy", meaning: "to make" },
    phoenician: { word: "ʿś", meaning: "to make" },
    aramaic: {
      official: { word: "ʿbd", meaning: "to do, make" },
      note: "עבד replaces עשה in Aramaic"
    },
    arabic: {
      word: "عَسَى (ʿasā)",
      meaning: "perhaps, may",
      note: "Different semantic; فَعَلَ (faʿala) = 'to do'"
    },
    semanticDevelopment: [
      { stage: 1, meaning: "to make, produce" },
      { stage: 2, meaning: "to do, perform" }
    ],
    scholarlyNotes: "Hebrew עשה is the general verb for human making (vs. ברא for divine creation). Aramaic uses עבד instead."
  },

  "בוא": {
    protoSemitic: "*bwʾ",
    meaning: "to come, enter",
    akkadian: null,
    ugaritic: { word: "bʾ", meaning: "to come" },
    phoenician: { word: "bʾ", meaning: "to come" },
    aramaic: {
      official: { word: "עלל", meaning: "to enter" },
      note: "עלל replaces בוא in Aramaic"
    },
    arabic: {
      word: "جَاءَ (jāʾa)",
      meaning: "to come",
      note: "Different root"
    },
    ethiopic: { word: "boʾa", meaning: "to come" },
    semanticDevelopment: [
      { stage: 1, meaning: "to come, arrive" },
      { stage: 2, meaning: "to enter (בוא אל)" },
      { stage: 3, meaning: "euphemism for intimacy (בא אליה)" }
    ],
    scholarlyNotes: "Hebrew בוא + יצא form a merism meaning 'all activities'. Aramaic uses עלל for 'enter'."
  },

  "נתן": {
    protoSemitic: "*ntn",
    meaning: "to give",
    akkadian: {
      word: "nadānu",
      meaning: "to give",
      period: "Old Akkadian"
    },
    ugaritic: { word: "ytn", meaning: "to give" },
    phoenician: { word: "ntn", meaning: "to give" },
    aramaic: {
      official: { word: "yhb", meaning: "to give" },
      syriac: { word: "ܝܗܒ (yhab)", meaning: "to give" },
      note: "יהב replaces נתן in Aramaic"
    },
    arabic: {
      word: "أَعْطَى (ʾaʿṭā)",
      meaning: "to give",
      note: "Different root"
    },
    ethiopic: { word: "wahaba", meaning: "to give (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to give, hand over" },
      { stage: 2, meaning: "to permit, allow (נתן + inf.)" }
    ],
    scholarlyNotes: "Hebrew נתן / Aramaic יהב is a classic vocabulary difference marking the two languages. The n-t-n root shows geminate assimilation."
  },

  "ראה": {
    protoSemitic: "*rʾy",
    meaning: "to see",
    akkadian: {
      word: "amāru",
      meaning: "to see",
      note: "Different root!"
    },
    ugaritic: { word: "rʾy", meaning: "to see" },
    phoenician: { word: "rʾ", meaning: "to see" },
    aramaic: {
      official: { word: "חזה", meaning: "to see" },
      syriac: { word: "ܚܙܐ (ḥzā)", meaning: "to see" },
      note: "חזה replaces ראה in Aramaic"
    },
    arabic: {
      word: "رَأَى (raʾā)",
      meaning: "to see",
      root: "r-ʾ-y"
    },
    ethiopic: { word: "rəʾya", meaning: "to see" },
    semanticDevelopment: [
      { stage: 1, meaning: "to see physically" },
      { stage: 2, meaning: "to perceive, understand" },
      { stage: 3, meaning: "prophetic vision (רֹאֶה = seer)" }
    ],
    scholarlyNotes: "Hebrew ראה / Aramaic חזה - another key dialect marker. Both developed 'prophetic vision' sense."
  },

  "קרא": {
    protoSemitic: "*qrʾ",
    meaning: "to call, read, proclaim",
    akkadian: {
      word: "qarāʾu",
      meaning: "to call, invite",
      period: "Old Babylonian"
    },
    ugaritic: { word: "qrʾ", meaning: "to call" },
    aramaic: {
      official: { word: "qrʾ", meaning: "to call, read" },
      syriac: { word: "ܩܪܐ (qrā)", meaning: "to call, read" }
    },
    arabic: {
      word: "قَرَأَ (qaraʾa)",
      meaning: "to read, recite",
      note: "القُرْآن (Qurʾān) = 'the recitation'"
    },
    ethiopic: { word: "ḳarāʾa", meaning: "to call" },
    semanticDevelopment: [
      { stage: 1, meaning: "to call out" },
      { stage: 2, meaning: "to summon, invite" },
      { stage: 3, meaning: "to read aloud (public proclamation)" }
    ],
    scholarlyNotes: "The 'reading' sense developed from public proclamation. Arabic القرآن 'Quran' derives from this root.",
    isTheologicallySignificant: true
  },

  "שוב": {
    protoSemitic: "*ṯwb",
    meaning: "to return, repent",
    akkadian: {
      word: "tāru",
      meaning: "to turn, return",
      period: "Old Akkadian"
    },
    ugaritic: { word: "ṯb", meaning: "to return" },
    aramaic: {
      syriac: { word: "ܬܘܒ (tūb)", meaning: "to return, repent" }
    },
    arabic: {
      word: "تَابَ (tāba)",
      meaning: "to repent",
      note: "Theological specialization"
    },
    ethiopic: { word: "gabaʾa", meaning: "to return (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to turn back physically" },
      { stage: 2, meaning: "to return, restore" },
      { stage: 3, meaning: "to repent (תְּשׁוּבָה)" }
    ],
    scholarlyNotes: "Hebrew תְּשׁוּבָה 'repentance' is literally 'returning' to God. Central concept in Jewish theology.",
    isTheologicallySignificant: true
  },

  "חיה": {
    protoSemitic: "*ḥyw",
    meaning: "to live, be alive",
    akkadian: null,
    ugaritic: { word: "ḥy", meaning: "to live" },
    phoenician: { word: "ḥy", meaning: "life" },
    aramaic: {
      syriac: { word: "ܚܝܐ (ḥyā)", meaning: "to live" }
    },
    arabic: {
      word: "حَيَّ (ḥayya)",
      meaning: "to live",
      root: "ḥ-y-y"
    },
    ethiopic: { word: "ḥaywat", meaning: "life" },
    semanticDevelopment: [
      { stage: 1, meaning: "to be alive" },
      { stage: 2, meaning: "to live, sustain life" }
    ],
    scholarlyNotes: "Pan-Semitic root. Hebrew חַי 'living' is also a divine name element (אֵל חַי 'living God').",
    isTheologicallySignificant: true
  },

  "מות": {
    protoSemitic: "*mwt",
    meaning: "to die, death",
    akkadian: {
      word: "mātu",
      meaning: "to die",
      period: "Old Akkadian"
    },
    ugaritic: {
      word: "mt",
      meaning: "death; Mot (god of death)"
    },
    phoenician: { word: "mt", meaning: "to die" },
    aramaic: {
      syriac: { word: "ܡܝܬ (mīt)", meaning: "to die" }
    },
    arabic: {
      word: "مَاتَ (māta)",
      meaning: "to die",
      root: "m-w-t"
    },
    ethiopic: { word: "mota", meaning: "to die" },
    semanticDevelopment: [
      { stage: 1, meaning: "to die" },
      { stage: 2, meaning: "death (personified in Ugarit as Mot)" }
    ],
    scholarlyNotes: "In Ugaritic mythology, Mot is the god of death who battles Baal. Hebrew demythologized this."
  },

  "שמר": {
    protoSemitic: "*ṯmr",
    meaning: "to keep, guard, observe",
    akkadian: null,
    ugaritic: { word: "ṯmr", meaning: "to guard" },
    aramaic: {
      syriac: { word: "ܢܛܪ (nṭar)", meaning: "to guard (different root)" }
    },
    arabic: {
      word: "سَمَرَ (samara)",
      meaning: "to converse at night",
      note: "Different semantic"
    },
    ethiopic: { word: "ṣanʿa", meaning: "to observe (different root)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to guard, protect" },
      { stage: 2, meaning: "to observe, keep (commandments)" }
    ],
    scholarlyNotes: "Hebrew שָׁמַר is key for covenant theology: 'keeping' the commandments. Aramaic uses נטר instead."
  },

  "שבת": {
    protoSemitic: "*ṯbt",
    meaning: "to cease, rest, stop",
    akkadian: {
      word: "šabātu",
      meaning: "to strike, beat",
      note: "Different semantic (homophone)"
    },
    ugaritic: { word: "ṯbt", meaning: "to sit, dwell" },
    aramaic: {
      syriac: { word: "ܫܒܬ (šbat)", meaning: "to cease, rest" }
    },
    arabic: {
      word: "سَبَتَ (sabata)",
      meaning: "to rest",
      note: "السَّبْت (as-sabt) = Saturday"
    },
    ethiopic: { word: "sanbat", meaning: "Sabbath (borrowed)" },
    semanticDevelopment: [
      { stage: 1, meaning: "to cease activity" },
      { stage: 2, meaning: "to rest (divine rest, Gen 2:2)" },
      { stage: 3, meaning: "Sabbath (institution)" }
    ],
    scholarlyNotes: "The שַׁבָּת is uniquely Israelite - the 7-day week with rest day has no parallel in ancient Near East. God's rest models human rest.",
    isTheologicallySignificant: true
  }
};

// =============================================================================
// DYNAMIC DATA LOADING - Integrate with extracted etymology
// =============================================================================

// Cache for loaded extracted data
let unifiedEtymologyData = null;
let extractedBDBData = null;
let extractedJastrowData = null;
let enrichedRootData = null;

/**
 * Load unified etymology PRO data (primary source)
 * Uses root_meanings_pro.json (consolidated etymology)
 */
const loadUnifiedEtymology = async () => {
  if (unifiedEtymologyData) return unifiedEtymologyData;
  try {
    const response = await fetch('/data/root_meanings_pro.json');
    if (response.ok) {
      const data = await response.json();
      unifiedEtymologyData = data.entries || {};
      log(`Loaded ${Object.keys(unifiedEtymologyData).length} unified etymology entries`);
    }
  } catch (err) {
    log('Could not load unified etymology data:', err.message);
    unifiedEtymologyData = {};
  }
  return unifiedEtymologyData;
};

/**
 * Load extracted BDB etymology data
 * DEPRECATED: etymology_bdb_extracted.json removed - data consolidated into root_meanings_pro
 * Returns empty object for backward compatibility
 */
const loadExtractedBDB = async () => {
  if (extractedBDBData) return extractedBDBData;
  extractedBDBData = {};
  return extractedBDBData;
};

/**
 * Load extracted Jastrow cross-reference data (via centralized dictionaryLoader)
 * PRO SCHOLAR V12: Uses shared cache to prevent duplicate network fetches
 */
const loadExtractedJastrow = async () => {
  if (extractedJastrowData) return extractedJastrowData;
  try {
    // Use centralized loader (shares cache with etymologyEnrichmentService)
    const data = await getEtymologyJastrow();
    extractedJastrowData = data?.entries || data || {};
    log(`Loaded ${Object.keys(extractedJastrowData).length} Jastrow etymology entries (via dictionaryLoader)`);
  } catch (err) {
    log('Could not load Jastrow etymology data:', err.message);
    extractedJastrowData = {};
  }
  return extractedJastrowData;
};

/**
 * Load enriched root meanings data
 */
const loadEnrichedRoots = async () => {
  if (enrichedRootData) return enrichedRootData;
  try {
    // PRO SCHOLAR V14: Use consolidated root_meanings_pro.json (merged from enriched)
    const response = await fetch('/data/root_meanings_pro.json');
    if (response.ok) {
      const data = await response.json();
      enrichedRootData = data.entries || {};
      log(`Loaded ${Object.keys(enrichedRootData).length} enriched root entries`);
    }
  } catch (err) {
    log('Could not load enriched root data:', err.message);
    enrichedRootData = {};
  }
  return enrichedRootData;
};

/**
 * Normalize a root string for lookup
 */
const normalizeRoot = (root) => {
  if (!root) return null;
  return normalizeFinals(stripAllDiacritics(root));
};

/**
 * Convert unified etymology PRO data to standard cognate format
 */
const convertUnifiedToStandard = (entry) => {
  if (!entry) return null;

  const result = {
    meaning: entry.meaning || entry.briefDefinition || null,
    protoSemitic: entry.protoSemitic || null,
    source: entry.sources?.join(' + ') || 'unified',
    confidence: entry.confidence || 'medium',
    qualityScore: entry.qualityScore || 50,
    scholarlyNotes: entry.scholarlyNotes || null,
    isTheologicallySignificant: entry.isTheological || false
  };

  // Handle cognates object
  const cognates = entry.cognates || {};

  if (cognates.akkadian) {
    result.akkadian = typeof cognates.akkadian === 'string'
      ? { word: cognates.akkadian, meaning: '(cognate)' }
      : cognates.akkadian;
  }

  if (cognates.ugaritic) {
    result.ugaritic = typeof cognates.ugaritic === 'string'
      ? { word: cognates.ugaritic, meaning: '(cognate)' }
      : cognates.ugaritic;
  }

  if (cognates.aramaic) {
    result.aramaic = typeof cognates.aramaic === 'string'
      ? { official: { word: cognates.aramaic, meaning: '(cognate)' } }
      : cognates.aramaic;
  }

  if (cognates.syriac) {
    result.aramaic = result.aramaic || {};
    result.aramaic.syriac = typeof cognates.syriac === 'string'
      ? { word: cognates.syriac, meaning: '(cognate)' }
      : cognates.syriac;
  }

  if (cognates.arabic) {
    result.arabic = typeof cognates.arabic === 'string'
      ? { word: cognates.arabic, meaning: '(cognate)' }
      : cognates.arabic;
  }

  if (cognates.ethiopic || cognates.geez) {
    result.ethiopic = typeof (cognates.ethiopic || cognates.geez) === 'string'
      ? { word: cognates.ethiopic || cognates.geez, meaning: '(cognate)' }
      : (cognates.ethiopic || cognates.geez);
  }

  if (cognates.phoenician) {
    result.phoenician = typeof cognates.phoenician === 'string'
      ? { word: cognates.phoenician, meaning: '(cognate)' }
      : cognates.phoenician;
  }

  if (cognates.moabite) {
    result.moabite = typeof cognates.moabite === 'string'
      ? { word: cognates.moabite, meaning: '(cognate)' }
      : cognates.moabite;
  }

  if (cognates.southArabian || cognates.sabaean) {
    result.southArabian = typeof (cognates.southArabian || cognates.sabaean) === 'string'
      ? { word: cognates.southArabian || cognates.sabaean, meaning: '(cognate)' }
      : (cognates.southArabian || cognates.sabaean);
  }

  // Semantic development
  if (entry.semanticDevelopment) {
    result.semanticDevelopment = entry.semanticDevelopment;
  }

  return result;
};

/**
 * Convert CAL data to standard cognate format
 */
const convertCALToStandard = (calEntry) => {
  if (!calEntry) return null;

  const result = {
    meaning: calEntry.definition || null,
    source: 'CAL',
    confidence: 'high',
    isAramaic: true,
    aramaic: {}
  };

  // Map CAL dialects to our structure
  if (calEntry.dialects?.length > 0) {
    for (const dialect of calEntry.dialects) {
      if (dialect.code === 'JBA') {
        result.aramaic.babylonian = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'JPA') {
        result.aramaic.palestinian = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'Syr') {
        result.aramaic.syriac = { word: calEntry.lemma, meaning: calEntry.definition };
      } else if (dialect.code === 'Tg') {
        result.aramaic.targumic = { word: calEntry.lemma, meaning: calEntry.definition };
      }
    }
  }

  if (calEntry.etymology) {
    result.scholarlyNotes = calEntry.etymology;
  }

  if (calEntry.attestations?.length > 0) {
    result.attestations = calEntry.attestations;
  }

  return result;
};

/**
 * Convert extracted BDB cognates to standard format
 */
const convertBDBToStandard = (bdbEntry) => {
  if (!bdbEntry?.etymology?.cognates) return null;

  const cognates = bdbEntry.etymology.cognates;
  const result = {
    meaning: bdbEntry.briefDefinition || null,
    source: 'BDB (extracted)',
    confidence: bdbEntry.etymology.confidence || 'medium',
    qualityScore: bdbEntry.etymology.qualityScore || 30,
  };

  // Map extracted cognates to standard structure
  if (cognates.akkadian?.length > 0) {
    result.akkadian = {
      word: cognates.akkadian.map(c => c.word).join(', '),
      meaning: '(see BDB)',
      source: 'BDB extraction'
    };
  }

  if (cognates.aramaic?.length > 0) {
    result.aramaic = {
      official: {
        word: cognates.aramaic.map(c => c.word).join(', '),
        meaning: '(cognate)'
      }
    };
  }

  if (cognates.arabic?.length > 0) {
    result.arabic = {
      word: cognates.arabic.map(c => c.word).join(', '),
      meaning: '(cognate)',
      source: 'BDB'
    };
  }

  if (cognates.phoenician?.length > 0) {
    result.phoenician = {
      word: cognates.phoenician.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.ethiopic?.length > 0) {
    result.ethiopic = {
      word: cognates.ethiopic.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.sabean?.length > 0) {
    result.southArabian = {
      word: cognates.sabean.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.moabite?.length > 0) {
    result.moabite = {
      word: cognates.moabite.map(c => c.word).join(', '),
      meaning: '(cognate)'
    };
  }

  if (cognates.egyptian?.length > 0) {
    result.egyptian = {
      word: cognates.egyptian.map(c => c.word).join(', '),
      meaning: '(cognate)',
      note: 'Possible loanword connection'
    };
  }

  return result;
};

// =============================================================================
// DYNAMIC COGNATE EXTRACTION FROM DICTIONARY DEFINITIONS
// =============================================================================

// Cache for loaded dictionaries
let bdbDictionary = null;
let jastrowDictionary = null;

// =============================================================================
// PRO SCHOLAR V19: PARSE PRE-EXTRACTED COGNATE ARRAYS FROM DICTIONARIES
// =============================================================================

/**
 * Language name normalization map
 * Maps various spellings to our standard language keys
 */
const LANGUAGE_NAME_MAP = {
  'akkadian': 'akkadian',
  'assyrian': 'akkadian',
  'babylonian': 'akkadian',
  'akk': 'akkadian',
  'ugaritic': 'ugaritic',
  'ug': 'ugaritic',
  'phoenician': 'phoenician',
  'phoen': 'phoenician',
  'aramaic': 'aramaic',
  'aram': 'aramaic',
  'targumic': 'aramaic',
  'syriac': 'syriac',
  'syr': 'syriac',
  'arabic': 'arabic',
  'ar': 'arabic',
  'ethiopic': 'ethiopic',
  'geez': 'ethiopic',
  "ge'ez": 'ethiopic',
  'eth': 'ethiopic',
  'sabaean': 'southArabian',
  'sabean': 'southArabian',
  'south arabian': 'southArabian',
  'southarabian': 'southArabian',
  'moabite': 'moabite',
  'egyptian': 'egyptian',
  'greek': 'greek',
  'persian': 'persian',
};

/**
 * Parse a single cognate string like "Akkadian: abu" or "Arabic: أَب"
 * @param {string} cognateStr - The cognate string
 * @returns {{ language: string, word: string } | null}
 */
const parseCognateString = (cognateStr) => {
  if (!cognateStr || typeof cognateStr !== 'string') return null;

  // Pattern: "Language: word" or "Language word" or just "Language: text"
  const colonMatch = cognateStr.match(/^([A-Za-z\s']+):\s*(.+)$/);
  if (colonMatch) {
    const langRaw = colonMatch[1].trim().toLowerCase();
    const word = colonMatch[2].trim();
    const language = LANGUAGE_NAME_MAP[langRaw];

    if (language && word && word.length > 0) {
      // Skip garbage words
      if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return null;
      // Skip very short non-Hebrew words (likely abbreviations)
      if (word.length < 2 && !/[א-ת]/.test(word)) return null;
      // Skip if it's just "Aramaic" or similar without actual word
      if (word.toLowerCase() === langRaw) return null;

      return { language, word };
    }
  }

  // Pattern: "Language word" (space-separated)
  const spaceMatch = cognateStr.match(/^([A-Za-z]+)\s+([א-תa-zA-Z\u0600-\u06FF\u1200-\u137F]+.*)$/);
  if (spaceMatch) {
    const langRaw = spaceMatch[1].trim().toLowerCase();
    const word = spaceMatch[2].trim();
    const language = LANGUAGE_NAME_MAP[langRaw];

    if (language && word && word.length > 1) {
      if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return null;
      return { language, word };
    }
  }

  return null;
};

/**
 * Parse pre-extracted cognate arrays from BDB/Jastrow dictionary entries
 * These are stored as arrays like ["Akkadian: abu", "Arabic: أَب"]
 * @param {string[]} cognatesArray - Array of cognate strings
 * @returns {Object} Structured cognate data
 */
const parseCognateArray = (cognatesArray) => {
  if (!Array.isArray(cognatesArray) || cognatesArray.length === 0) return null;

  const result = {};
  const languageWords = {};

  for (const cognateStr of cognatesArray) {
    const parsed = parseCognateString(cognateStr);
    if (parsed) {
      // Collect words per language
      if (!languageWords[parsed.language]) {
        languageWords[parsed.language] = [];
      }
      // Avoid duplicates
      if (!languageWords[parsed.language].includes(parsed.word)) {
        languageWords[parsed.language].push(parsed.word);
      }
    }
  }

  // Convert to standard structure
  for (const [lang, words] of Object.entries(languageWords)) {
    if (words.length === 0) continue;

    const wordStr = words.slice(0, 3).join(', '); // Max 3 per language

    switch (lang) {
      case 'akkadian':
        result.akkadian = { word: wordStr, meaning: '(cognate)', source: 'dictionary' };
        break;
      case 'ugaritic':
        result.ugaritic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'phoenician':
        result.phoenician = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'aramaic':
        result.aramaic = result.aramaic || {};
        result.aramaic.official = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'syriac':
        result.aramaic = result.aramaic || {};
        result.aramaic.syriac = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'arabic':
        result.arabic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'ethiopic':
        result.ethiopic = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'southArabian':
        result.southArabian = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'moabite':
        result.moabite = { word: wordStr, meaning: '(cognate)' };
        break;
      case 'egyptian':
        result.egyptian = { word: wordStr, meaning: '(cognate)', note: 'Possible loanword' };
        break;
      case 'greek':
        result.greek = { word: wordStr, meaning: '(loanword)' };
        break;
      case 'persian':
        result.persian = { word: wordStr, meaning: '(loanword)' };
        break;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};

// Words to exclude from cognate extraction (garbage/noise)
const EXCLUDED_COGNATE_WORDS = new Set([
  'compare', 'see', 'cf', 'etc', 'id', 'ib', 'ibid', 'perhaps', 'probably',
  'similar', 'related', 'cognate', 'synonym', 'loan', 'borrowed',
  'verb', 'noun', 'adj', 'adv', 'prep', 'conj', 'interj',
  'the', 'and', 'or', 'but', 'for', 'from', 'with', 'to', 'of', 'in', 'on',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'which', 'who', 'whom',
  'also', 'only', 'even', 'just', 'still', 'yet', 'already',
  'may', 'might', 'can', 'could', 'shall', 'should', 'will', 'would',
  // Short garbage
  'ab', 'ba', 'id', 'aq', 'dl', 'w', 'dw', 'hw',
  // Language names that appear as "word" but shouldn't
  'akkadian', 'assyrian', 'arabic', 'aramaic', 'syriac', 'hebrew',
  'phoenician', 'ugaritic', 'ethiopic', 'geez', 'moabite', 'egyptian',
]);

/**
 * Load BDB dictionary for dynamic cognate extraction
 */
const loadBDBDictionary = async () => {
  if (bdbDictionary) return bdbDictionary;
  try {
    const response = await fetch('/data/bdbComplete.json');
    if (response.ok) {
      const data = await response.json();
      bdbDictionary = data.byWord || data;
      log(`Loaded BDB dictionary: ${Object.keys(bdbDictionary).length} entries`);
    }
  } catch (err) {
    log('Could not load BDB dictionary:', err.message);
    bdbDictionary = {};
  }
  return bdbDictionary;
};

/**
 * Load Jastrow dictionary for dynamic cognate extraction
 */
const loadJastrowDictionary = async () => {
  if (jastrowDictionary) return jastrowDictionary;
  try {
    const response = await fetch('/data/jastrowComplete.json');
    if (response.ok) {
      const data = await response.json();
      jastrowDictionary = data.byWord || data;
      log(`Loaded Jastrow dictionary: ${Object.keys(jastrowDictionary).length} entries`);
    }
  } catch (err) {
    log('Could not load Jastrow dictionary:', err.message);
    jastrowDictionary = {};
  }
  return jastrowDictionary;
};

/**
 * Language patterns for extracting cognates from BDB fullDef text
 * BDB format: "(Phoenician אב , Assyrian abu , Arabic , Sabean אב ...)"
 */
const COGNATE_LANGUAGE_PATTERNS = {
  akkadian: [
    /Assyrian\s+([א-תa-zA-Z]{2,15})/gi,
    /Akkadian\s+([א-תa-zA-Z]{2,15})/gi,
    /Babylonian\s+([א-תa-zA-Z]{2,15})/gi,
  ],
  ugaritic: [
    /Ugaritic\s+([א-תa-zA-Z]{2,12})/gi,
  ],
  phoenician: [
    /Phoenician\s+([א-ת]{2,8})/gi,
  ],
  aramaic: [
    /Aramaic\s+([א-ת]{2,10})/gi,
    /Targumic\s+([א-ת]{2,10})/gi,
  ],
  syriac: [
    /Syriac\s+([א-תa-zA-Z]{2,15})/gi,
  ],
  arabic: [
    /Arabic\s+([א-תa-zA-Z]{2,15})/gi,
  ],
  ethiopic: [
    /Ethiopic\s+([א-תa-zA-Z]{2,15})/gi,
    /Ge.?ez\s+([א-תa-zA-Z]{2,15})/gi,
  ],
  sabaean: [
    /Sabean\s+([א-ת]{2,8})/gi,
    /South.?Arabian?\s+([א-ת]{2,8})/gi,
  ],
  moabite: [
    /Moabite\s+([א-ת]{2,8})/gi,
    /MI\s+([א-ת]{2,8})/gi,  // Mesha Inscription
  ],
  egyptian: [
    /Egyptian\s+([a-zA-Z]{2,15})/gi,
  ],
};

/**
 * Check if extracted word is a valid cognate (not noise/garbage)
 */
const isValidExtractedCognate = (word) => {
  if (!word || word.length < 2) return false;
  if (EXCLUDED_COGNATE_WORDS.has(word.toLowerCase())) return false;
  // Skip if it's just uppercase letters (likely abbreviation)
  if (/^[A-Z]{2,}$/.test(word)) return false;
  // Skip if starts with capital (likely proper name or reference)
  if (/^[A-Z][a-z]/.test(word) && word.length < 4) return false;
  return true;
};

/**
 * Extract cognates dynamically from BDB fullDef text
 * @param {string} fullDef - The full definition text from BDB
 * @returns {Object} Cognate data in standard format
 */
const extractCognatesFromFullDef = (fullDef) => {
  if (!fullDef || fullDef.length < 20) return null;

  const result = {};
  let foundAny = false;

  for (const [lang, patterns] of Object.entries(COGNATE_LANGUAGE_PATTERNS)) {
    const words = new Set();

    for (const pattern of patterns) {
      const matches = fullDef.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const word = match[1]?.trim();
        if (word && isValidExtractedCognate(word)) {
          words.add(word);
        }
      }
    }

    if (words.size > 0) {
      const wordList = Array.from(words).slice(0, 3); // Max 3 per language
      foundAny = true;

      // Map to standard structure
      switch (lang) {
        case 'akkadian':
          result.akkadian = { word: wordList.join(', '), meaning: '(cognate)', source: 'BDB' };
          break;
        case 'ugaritic':
          result.ugaritic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'phoenician':
          result.phoenician = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'aramaic':
          result.aramaic = result.aramaic || {};
          result.aramaic.official = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'syriac':
          result.aramaic = result.aramaic || {};
          result.aramaic.syriac = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'arabic':
          result.arabic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'ethiopic':
          result.ethiopic = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'sabaean':
          result.southArabian = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'moabite':
          result.moabite = { word: wordList.join(', '), meaning: '(cognate)' };
          break;
        case 'egyptian':
          result.egyptian = { word: wordList.join(', '), meaning: '(cognate)', note: 'Possible loanword' };
          break;
      }
    }
  }

  return foundAny ? result : null;
};

/**
 * PRO SCHOLAR V19: Get cognates from dictionary with enhanced fallback chain
 *
 * Extraction priority:
 * 1. Pre-extracted cognates array (already parsed from definition)
 * 2. Dynamic extraction from fullDef text (regex-based)
 *
 * @param {string} root - The Hebrew/Aramaic root
 * @returns {Promise<Object|null>} Cognate data
 */
const getCognatesFromDictionary = async (root) => {
  const normalized = normalizeRoot(root);
  let combinedCognates = {};
  let foundAny = false;
  let primarySource = null;
  let meaning = null;
  let isAramaic = false;

  // Try BDB first
  const bdb = await loadBDBDictionary();
  const bdbEntry = bdb[normalized];

  if (bdbEntry) {
    meaning = bdbEntry.definition || bdbEntry.gloss;

    // Priority 1: Try pre-extracted cognates array
    if (bdbEntry.cognates && Array.isArray(bdbEntry.cognates)) {
      const parsed = parseCognateArray(bdbEntry.cognates);
      if (parsed && Object.keys(parsed).length > 0) {
        combinedCognates = { ...combinedCognates, ...parsed };
        foundAny = true;
        primarySource = 'BDB';
        log(`Found ${Object.keys(parsed).length} cognates from BDB cognates array for ${normalized}`);
      }
    }

    // Priority 2: Dynamic extraction from fullDef
    if (bdbEntry.fullDef) {
      const extracted = extractCognatesFromFullDef(bdbEntry.fullDef);
      if (extracted && Object.keys(extracted).length > 0) {
        // Merge (don't overwrite existing)
        for (const [lang, data] of Object.entries(extracted)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'BDB';
      }
    }
  }

  // Try Jastrow as additional source
  const jastrow = await loadJastrowDictionary();
  const jastrowEntry = jastrow[normalized];

  if (jastrowEntry) {
    if (!meaning) meaning = jastrowEntry.definition?.slice(0, 100);
    isAramaic = jastrowEntry.isAramaic || false;

    // Priority 1: Try pre-extracted cognates array
    if (jastrowEntry.cognates && Array.isArray(jastrowEntry.cognates)) {
      const parsed = parseCognateArray(jastrowEntry.cognates);
      if (parsed && Object.keys(parsed).length > 0) {
        // Merge (don't overwrite existing)
        for (const [lang, data] of Object.entries(parsed)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'Jastrow';
        log(`Found ${Object.keys(parsed).length} cognates from Jastrow cognates array for ${normalized}`);
      }
    }

    // Priority 2: Dynamic extraction from definition
    if (jastrowEntry.definition) {
      const extracted = extractCognatesFromFullDef(jastrowEntry.definition);
      if (extracted && Object.keys(extracted).length > 0) {
        for (const [lang, data] of Object.entries(extracted)) {
          if (!combinedCognates[lang]) {
            combinedCognates[lang] = data;
            foundAny = true;
          }
        }
        if (!primarySource) primarySource = 'Jastrow';
      }
    }
  }

  if (!foundAny) return null;

  return {
    meaning,
    source: `${primarySource} (dynamic)`,
    tier: 3,
    tierName: `Silver (${primarySource})`,
    confidence: 'medium',
    isAramaic,
    ...combinedCognates
  };
};

// =============================================================================
// LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get comparative Semitic data for a root
 * Uses a fallback chain: curated database → extracted BDB → extracted Jastrow → enriched
 * @param {string} root - Hebrew/Aramaic root (3-4 letters)
 * @returns {Object|null} Cognate data with all Semitic attestations
 */
export const getCognates = (root) => {
  if (!root) return null;

  const normalized = normalizeRoot(root);

  // Priority 1: Curated high-quality database
  if (COGNATE_DATABASE[normalized]) {
    return { ...COGNATE_DATABASE[normalized], source: 'curated' };
  }

  // For sync access, return null (use getCognatesAsync for full lookup)
  return null;
};

/**
 * Get comparative Semitic data asynchronously (with multi-source fallback chain)
 *
 * Lookup priority:
 * 1. Curated high-quality database (handcrafted scholarly data)
 * 2. Unified PRO etymology data (merged BDB + Jastrow + curated)
 * 3. CAL Database (for Aramaic terms)
 * 4. Extracted BDB data
 * 5. Extracted Jastrow data
 * 6. Enriched root data
 * 7. Dynamic extraction from BDB/Jastrow fullDef text (NEW - parses definitions for cognates)
 *
 * @param {string} root - Hebrew/Aramaic root (3-4 letters)
 * @param {Object} options - Lookup options
 * @param {boolean} options.includeCAL - Include CAL lookup (slower, async)
 * @returns {Promise<Object|null>} Cognate data
 */
export const getCognatesAsync = async (root, options = {}) => {
  if (!root) return null;

  const normalized = normalizeRoot(root);
  const { includeCAL = true } = options;

  // Priority 1: Curated high-quality database (best quality)
  if (COGNATE_DATABASE[normalized]) {
    log(`Found curated data for ${normalized}`);
    return { ...COGNATE_DATABASE[normalized], source: 'curated', tier: 1, tierName: 'Gold (Academic)' };
  }

  // Priority 2: Unified PRO etymology data
  const unifiedData = await loadUnifiedEtymology();
  if (unifiedData[normalized]) {
    const converted = convertUnifiedToStandard(unifiedData[normalized]);
    if (converted && (converted.protoSemitic || Object.keys(converted).length > 3)) {
      log(`Found unified PRO data for ${normalized}`);
      return { ...converted, tier: 1, tierName: 'Gold (Academic)' };
    }
  }

  // Priority 3: CAL Database (excellent for Aramaic)
  if (includeCAL) {
    try {
      const calData = await lookupCAL(normalized);
      if (calData) {
        const converted = convertCALToStandard(calData);
        if (converted) {
          log(`Found CAL data for ${normalized}`);
          return { ...converted, tier: 1, tierName: 'Gold (CAL)' };
        }
      }
    } catch (err) {
      log(`CAL lookup failed for ${normalized}:`, err.message);
    }
  }

  // Priority 4: Extracted BDB data
  const bdbData = await loadExtractedBDB();
  if (bdbData[normalized]) {
    const converted = convertBDBToStandard(bdbData[normalized]);
    if (converted && Object.keys(converted).length > 2) {
      log(`Found BDB extracted data for ${normalized}`);
      return { ...converted, source: 'BDB-extracted', tier: 2, tierName: 'Silver (BDB)' };
    }
  }

  // Priority 5: Extracted Jastrow data (for Aramaic/Talmudic)
  const jastrowData = await loadExtractedJastrow();
  if (jastrowData[normalized]) {
    const entry = jastrowData[normalized];
    const converted = convertBDBToStandard({
      etymology: entry.etymology,
      briefDefinition: entry.definition
    });
    if (converted) {
      log(`Found Jastrow data for ${normalized}`);
      return { ...converted, source: 'Jastrow-extracted', tier: 2, tierName: 'Silver (Jastrow)' };
    }
  }

  // Priority 6: Enriched root data
  const enrichedData = await loadEnrichedRoots();
  if (enrichedData[normalized]?.etymology?.cognates) {
    const entry = enrichedData[normalized];
    const converted = convertBDBToStandard({ etymology: entry.etymology });
    if (converted) {
      log(`Found enriched data for ${normalized}`);
      return { ...converted, source: 'enriched', tier: 3, tierName: 'Bronze (Enriched)' };
    }
  }

  // Priority 7: Dynamic extraction from dictionary fullDef (NEW!)
  // This parses BDB/Jastrow definitions to find cognate references
  const dynamicData = await getCognatesFromDictionary(normalized);
  if (dynamicData && Object.keys(dynamicData).length > 2) {
    log(`Found dynamic cognate data for ${normalized}`);
    return { ...dynamicData, tier: 3, tierName: 'Bronze (Dictionary)' };
  }

  log(`No cognate data found for ${normalized}`);
  return null;
};

/**
 * Get cognates with sync CAL fallback (for when you already have sync CAL data)
 */
export const getCognatesWithCALSync = (root) => {
  if (!root) return null;
  const normalized = normalizeRoot(root);

  // Check curated first
  if (COGNATE_DATABASE[normalized]) {
    return { ...COGNATE_DATABASE[normalized], source: 'curated', tier: 1 };
  }

  // Check CAL sync cache
  const calData = lookupCALSync(normalized);
  if (calData) {
    const converted = convertCALToStandard(calData);
    if (converted) {
      return { ...converted, tier: 1, tierName: 'Gold (CAL)' };
    }
  }

  return null;
};

/**
 * Check if we have cognate data for a root (sync - curated only)
 */
export const hasCognates = (root) => {
  return getCognates(root) !== null;
};

/**
 * Check if we have any cognate data (async - includes extracted)
 */
export const hasCognatesAsync = async (root) => {
  return (await getCognatesAsync(root)) !== null;
};

/**
 * Get total number of roots with cognate data (multi-source)
 */
export const getCognateStats = async () => {
  const unifiedData = await loadUnifiedEtymology();
  const bdbData = await loadExtractedBDB();
  const jastrowData = await loadExtractedJastrow();
  const enrichedData = await loadEnrichedRoots();

  const curatedCount = Object.keys(COGNATE_DATABASE).length;

  // Count unified entries with actual cognate data
  const unifiedCount = Object.keys(unifiedData).filter(k => {
    const entry = unifiedData[k];
    return entry?.cognates && Object.keys(entry.cognates).length > 0;
  }).length;

  const bdbCount = Object.keys(bdbData).filter(k =>
    bdbData[k]?.etymology?.cognates &&
    Object.keys(bdbData[k].etymology.cognates).length > 0
  ).length;

  const jastrowCount = Object.keys(jastrowData).filter(k =>
    jastrowData[k]?.etymology?.cognates
  ).length;

  const enrichedCount = Object.keys(enrichedData).filter(k =>
    enrichedData[k]?.etymology?.cognates
  ).length;

  // Calculate unique roots across all sources
  const allRoots = new Set([
    ...Object.keys(COGNATE_DATABASE),
    ...Object.keys(unifiedData).filter(k => unifiedData[k]?.cognates),
    ...Object.keys(bdbData).filter(k => bdbData[k]?.etymology?.cognates),
    ...Object.keys(jastrowData).filter(k => jastrowData[k]?.etymology),
    ...Object.keys(enrichedData).filter(k => enrichedData[k]?.etymology?.cognates)
  ]);

  return {
    curated: curatedCount,
    unified: unifiedCount,
    bdbExtracted: bdbCount,
    jastrowExtracted: jastrowCount,
    enriched: enrichedCount,
    totalUnique: allRoots.size,
    coverage: {
      tier1_gold: curatedCount + unifiedCount, // Academic quality
      tier2_silver: bdbCount + jastrowCount,   // Dictionary extracted
      tier3_bronze: enrichedCount               // Enriched/reference
    },
    sources: {
      curated: curatedCount,
      unified: unifiedCount,
      bdb: bdbCount,
      jastrow: jastrowCount,
      enriched: enrichedCount
    }
  };
};

/**
 * Get all roots in a specific semantic category
 * @param {string} category - 'theological', 'verbs', 'bodyParts', etc.
 * @returns {string[]} List of roots
 */
export const getRootsByCategory = (category) => {
  const categories = {
    theological: ['אל', 'ברא', 'קדש', 'שמע'],
    verbs: ['נפק', 'אמר', 'עבד', 'יצא', 'מלך', 'כתב', 'שמע'],
    bodyParts: ['יד', 'לב'],
    nature: ['שמש'],
    kinship: ['אב', 'אם', 'בן']
  };

  return categories[category] || [];
};

/**
 * Format cognate data for display
 * @param {Object} cognateData - Data from getCognates()
 * @returns {Object} Formatted for UI display
 */
export const formatCognatesForDisplay = (cognateData) => {
  if (!cognateData) return null;

  const languages = [];

  // Akkadian - East Semitic
  if (cognateData.akkadian) {
    languages.push({
      language: 'Akkadian',
      script: 'Cuneiform',
      branch: 'East Semitic',
      word: cognateData.akkadian.word,
      meaning: cognateData.akkadian.meaning,
      period: cognateData.akkadian.period,
      note: cognateData.akkadian.note,
      flag: '🏛️'
    });
  }

  // Ugaritic - Northwest Semitic
  if (cognateData.ugaritic) {
    languages.push({
      language: 'Ugaritic',
      script: 'Cuneiform Alphabet',
      branch: 'Northwest Semitic',
      word: cognateData.ugaritic.word,
      meaning: cognateData.ugaritic.meaning,
      flag: '📜'
    });
  }

  // Phoenician - Northwest Semitic
  if (cognateData.phoenician) {
    languages.push({
      language: 'Phoenician',
      script: 'Phoenician Alphabet',
      branch: 'Northwest Semitic (Canaanite)',
      word: cognateData.phoenician.word,
      meaning: cognateData.phoenician.meaning,
      flag: '⚓'
    });
  }

  // Moabite - Northwest Semitic (Canaanite)
  if (cognateData.moabite) {
    languages.push({
      language: 'Moabite',
      script: 'Phoenician Alphabet',
      branch: 'Northwest Semitic (Canaanite)',
      word: cognateData.moabite.word,
      meaning: cognateData.moabite.meaning,
      note: 'Mesha Stele',
      flag: '🪨'
    });
  }

  // Aramaic dialects
  if (cognateData.aramaic) {
    // Official/Imperial Aramaic
    if (cognateData.aramaic.official) {
      languages.push({
        language: 'Imperial Aramaic',
        script: 'Aramaic',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.official.word,
        meaning: cognateData.aramaic.official.meaning,
        period: 'Persian Period',
        flag: '🏺'
      });
    }

    // Syriac
    if (cognateData.aramaic.syriac) {
      languages.push({
        language: 'Syriac',
        script: 'Syriac',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.syriac.word,
        meaning: cognateData.aramaic.syriac.meaning,
        flag: '✝️'
      });
    }

    // Jewish Babylonian Aramaic
    if (cognateData.aramaic.babylonian) {
      languages.push({
        language: 'Jewish Babylonian Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.babylonian.word,
        meaning: cognateData.aramaic.babylonian.meaning,
        period: 'Talmudic',
        flag: '📚'
      });
    }

    // Jewish Palestinian Aramaic
    if (cognateData.aramaic.palestinian) {
      languages.push({
        language: 'Jewish Palestinian Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.palestinian.word,
        meaning: cognateData.aramaic.palestinian.meaning,
        period: 'Talmudic',
        flag: '🏛️'
      });
    }

    // Targumic
    if (cognateData.aramaic.targumic) {
      languages.push({
        language: 'Targumic Aramaic',
        script: 'Hebrew Square',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.targumic.word,
        meaning: cognateData.aramaic.targumic.meaning,
        flag: '📖'
      });
    }

    // Mandaic
    if (cognateData.aramaic.mandaic) {
      languages.push({
        language: 'Mandaic',
        script: 'Mandaic',
        branch: 'Northwest Semitic (Aramaic)',
        word: cognateData.aramaic.mandaic.word,
        meaning: cognateData.aramaic.mandaic.meaning,
        flag: '☀️'
      });
    }
  }

  // Arabic - Central Semitic
  if (cognateData.arabic) {
    languages.push({
      language: 'Arabic',
      script: 'Arabic',
      branch: 'Central Semitic',
      word: cognateData.arabic.word,
      meaning: cognateData.arabic.meaning,
      root: cognateData.arabic.root,
      note: cognateData.arabic.note,
      flag: '🕌'
    });
  }

  // Ethiopic/Ge'ez - South Semitic
  if (cognateData.ethiopic) {
    languages.push({
      language: "Ge'ez (Ethiopic)",
      script: 'Ethiopic',
      branch: 'South Semitic',
      word: cognateData.ethiopic.word,
      meaning: cognateData.ethiopic.meaning,
      flag: '⛪'
    });
  }

  // South Arabian - South Semitic
  if (cognateData.southArabian) {
    languages.push({
      language: 'Old South Arabian',
      script: 'South Arabian',
      branch: 'South Semitic',
      word: cognateData.southArabian.word,
      meaning: cognateData.southArabian.meaning,
      note: 'Sabaean, Minaic',
      flag: '🏜️'
    });
  }

  // Egyptian (loanword connection)
  if (cognateData.egyptian) {
    languages.push({
      language: 'Egyptian',
      script: 'Hieroglyphic/Demotic',
      branch: 'Afroasiatic (non-Semitic)',
      word: cognateData.egyptian.word,
      meaning: cognateData.egyptian.meaning,
      note: cognateData.egyptian.note || 'Possible loanword',
      flag: '🏺',
      isLoanword: true
    });
  }

  return {
    protoSemitic: cognateData.protoSemitic,
    coreMeaning: cognateData.meaning,
    languages,
    semanticDevelopment: cognateData.semanticDevelopment || [],
    scholarlyNotes: cognateData.scholarlyNotes,
    isTheologicallySignificant: cognateData.isTheologicallySignificant || false,
    isAramaic: cognateData.isAramaic || false,
    source: cognateData.source,
    tier: cognateData.tier,
    tierName: cognateData.tierName
  };
};

/**
 * Get a brief cognate summary for inline display
 * @param {string} root - Root to summarize
 * @returns {string|null} Brief summary
 */
export const getCognateSummary = (root) => {
  const data = getCognates(root);
  if (!data) return null;

  const parts = [`PS *${data.protoSemitic?.replace('*', '') || '?'}`];

  if (data.akkadian) parts.push(`Akk. ${data.akkadian.word}`);
  if (data.arabic) parts.push(`Ar. ${data.arabic.word}`);
  if (data.aramaic?.syriac) parts.push(`Syr. ${data.aramaic.syriac.word}`);

  return parts.join('; ');
};

// =============================================================================
// EXPORTS
// =============================================================================

const comparativeSemiticService = {
  COGNATE_DATABASE,
  getCognates,
  getCognatesAsync,
  getCognatesWithCALSync,
  hasCognates,
  hasCognatesAsync,
  getCognateStats,
  getRootsByCategory,
  formatCognatesForDisplay,
  getCognateSummary,
  // Data loaders for direct access
  loadUnifiedEtymology,
  loadExtractedBDB,
  loadExtractedJastrow,
  loadEnrichedRoots
};

export default comparativeSemiticService;
