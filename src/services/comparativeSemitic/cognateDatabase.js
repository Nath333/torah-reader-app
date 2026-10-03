// Comparative Semitic — BASE DE DONNÉES (split 03/10/2026)
// Données pures, aucune dépendance. Le service (comparativeSemiticService.js)
// importe et ré-exporte COGNATE_DATABASE ; COGNATE_LANGUAGE_PATTERNS sert au
// parsing des fullDef BDB.

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

/**
 * Language patterns for extracting cognates from BDB fullDef text
 * BDB format: "(Phoenician אב , Assyrian abu , Arabic , Sabean אב ...)"
 */
export const COGNATE_LANGUAGE_PATTERNS = {
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
