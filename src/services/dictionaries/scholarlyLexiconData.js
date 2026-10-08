// =============================================================================
// Données pures du lexique savant — extraites de scholarlyLexiconService.js
// (recette docs/DECOUPE-MONOLITHES.md : blocs de données d'abord, zéro état).
// La façade ré-exporte tout nom que l'original exposait.
// =============================================================================

// =============================================================================
// SCHOLARLY SOURCES CONFIGURATION
// =============================================================================

export const SCHOLARLY_SOURCES = {
  BDB: {
    id: 'bdb',
    name: 'Brown-Driver-Briggs',
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    abbreviation: 'BDB',
    year: 1906,
    description: 'Standard academic Hebrew lexicon for Biblical Hebrew',
    type: 'biblical',
    language: 'Hebrew'
  },
  JASTROW: {
    id: 'jastrow',
    name: 'Jastrow',
    fullName: "Jastrow's Dictionary of Targumim, Talmud and Midrashic Literature",
    abbreviation: 'Jastrow',
    year: 1903,
    description: 'Comprehensive Aramaic and Rabbinic Hebrew dictionary',
    type: 'rabbinic',
    language: 'Aramaic'
  },
  STRONG: {
    id: 'strong',
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    abbreviation: 'Strong',
    year: 1890,
    description: 'Biblical concordance with Hebrew/Greek numbering system',
    type: 'concordance',
    language: 'Hebrew'
  },
  KLEIN: {
    id: 'klein',
    name: 'Klein Etymology',
    fullName: "Klein's Comprehensive Etymological Dictionary of the Hebrew Language",
    abbreviation: 'Klein',
    year: 1987,
    description: 'Etymological roots and cognate language connections',
    type: 'etymology',
    language: 'Hebrew'
  },
  GESENIUS: {
    id: 'gesenius',
    name: 'Gesenius',
    fullName: "Gesenius' Hebrew Grammar",
    abbreviation: 'GKC',
    year: 1910,
    description: 'Classical Hebrew grammar reference',
    type: 'grammar',
    language: 'Hebrew'
  },
  HALOT: {
    id: 'halot',
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    abbreviation: 'HALOT',
    year: 2000,
    description: 'Modern scholarly lexicon with cognate analysis',
    type: 'biblical',
    language: 'Hebrew'
  },
  EVEN_SHOSHAN: {
    id: 'even_shoshan',
    name: 'Even-Shoshan',
    fullName: 'Even-Shoshan Dictionary',
    abbreviation: 'E-S',
    year: 1969,
    description: 'Comprehensive Modern Hebrew dictionary',
    type: 'modern',
    language: 'Hebrew'
  },
  SEFARIA: {
    id: 'sefaria',
    name: 'Sefaria',
    fullName: 'Sefaria.org Digital Library',
    abbreviation: 'Sefaria',
    year: 2011,
    description: 'Comprehensive Jewish text library and lexicon',
    type: 'digital',
    language: 'Hebrew'
  },
  STEINSALTZ: {
    id: 'steinsaltz',
    name: 'Steinsaltz',
    fullName: 'Steinsaltz Talmud Translation',
    abbreviation: 'Steinsaltz',
    year: 1989,
    description: 'Rabbi Adin Steinsaltz modern Talmud translation and commentary',
    type: 'translation',
    language: 'Aramaic'
  },
  TWOT: {
    id: 'twot',
    name: 'TWOT',
    fullName: 'Theological Wordbook of the Old Testament',
    abbreviation: 'TWOT',
    year: 1980,
    description: 'Theological analysis of Hebrew vocabulary with theological significance',
    type: 'theological',
    language: 'Hebrew'
  },
  BOLLS: {
    id: 'bolls',
    name: 'Bolls.life',
    fullName: 'Bolls.life Bible Dictionary (BDB/Thayer)',
    abbreviation: 'Bolls',
    year: 2020,
    description: 'Online BDB and Thayer\'s dictionary API',
    type: 'digital',
    language: 'Hebrew'
  },
  STEP: {
    id: 'step',
    name: 'STEP Bible',
    fullName: 'Scripture Tools for Every Person',
    abbreviation: 'STEP',
    year: 2021,
    description: 'Open source Bible study tools with Strong\'s definitions',
    type: 'digital',
    language: 'Hebrew'
  },
  CAL: {
    id: 'cal',
    name: 'CAL',
    fullName: 'Comprehensive Aramaic Lexicon',
    abbreviation: 'CAL',
    year: 1986,
    description: 'Premier academic Aramaic dictionary covering Targum, Talmud, and all Aramaic dialects',
    type: 'aramaic',
    language: 'Aramaic',
    url: 'https://cal.huc.edu',
    tier: 1
  },
// New Academic Sources (Sokoloff Aramaic dictionaries)
  DJBA: {
    id: 'djba',
    name: 'DJBA',
    fullName: 'Dictionary of Jewish Babylonian Aramaic',
    abbreviation: 'DJBA',
    year: 2002,
    description: 'Sokoloff\'s premier academic dictionary for Talmud Bavli Aramaic',
    type: 'aramaic',
    language: 'Aramaic',
    dialect: 'Jewish Babylonian Aramaic',
    tier: 1
  },
  DJPA: {
    id: 'djpa',
    name: 'DJPA',
    fullName: 'Dictionary of Jewish Palestinian Aramaic',
    abbreviation: 'DJPA',
    year: 2002,
    description: 'Sokoloff\'s academic dictionary for Jerusalem Talmud and Midrash',
    type: 'aramaic',
    language: 'Aramaic',
    dialect: 'Jewish Palestinian Aramaic',
    tier: 1
  },
  TARGUM: {
    id: 'targum',
    name: 'Targum Lexicon',
    fullName: 'Aramaic Targum Vocabulary',
    abbreviation: 'Targum',
    year: null,
    description: 'Vocabulary and expressions from Aramaic Targum translations',
    type: 'translation',
    language: 'Aramaic',
    tier: 2
  },
  GESENIUS_LEXICON: {
    id: 'gesenius_lexicon',
    name: 'Gesenius Lexicon',
    fullName: "Gesenius' Hebrew-Chaldee Lexicon",
    abbreviation: 'Ges-Lex',
    year: 1847,
    description: 'Classical Hebrew lexicon with detailed etymological analysis',
    type: 'biblical',
    language: 'Hebrew',
    tier: 2
  }
  // NOTE: Modern Hebrew sources (Morfix, Pealim, Wiktionary, Milog, OpenScriptures) removed
  // Focus on scholarly Biblical/Talmudic sources only
};

// =============================================================================
// COGNATE LANGUAGES DATA
// =============================================================================

export const COGNATE_LANGUAGES = {
  akkadian: { name: 'Akkadian', script: 'cuneiform', region: 'Mesopotamia' },
  ugaritic: { name: 'Ugaritic', script: 'cuneiform', region: 'Syria' },
  arabic: { name: 'Arabic', script: 'arabic', region: 'Arabia' },
  aramaic: { name: 'Aramaic', script: 'hebrew', region: 'Levant' },
  syriac: { name: 'Syriac', script: 'syriac', region: 'Mesopotamia' },
  ethiopic: { name: 'Ethiopic (Ge\'ez)', script: 'ethiopic', region: 'Ethiopia' },
  phoenician: { name: 'Phoenician', script: 'phoenician', region: 'Lebanon' }
};

// Common cognate patterns for etymological analysis - Enhanced Torah vocabulary
export const COGNATE_PATTERNS = {
  // === Creation & Nature ===
  'ברא': { meaning: 'to create', cognates: ['Unique to Hebrew - divine creation', 'Arabic barāʾa (to create)'] },
  'אור': { arabic: 'nūr', meaning: 'light', cognates: ['Arabic nūr', 'Akkadian nūru', 'Aramaic נְהוֹר'] },
  'שמים': { arabic: 'samāʾ', meaning: 'sky/heaven', cognates: ['Arabic samāʾ', 'Akkadian šamû', 'Ugaritic šmm'] },
  'ארץ': { arabic: 'arḍ', meaning: 'earth/land', cognates: ['Arabic ʾarḍ', 'Akkadian erṣetu', 'Ugaritic ʾarṣ'] },
  'מים': { arabic: 'māʾ', meaning: 'water', cognates: ['Arabic māʾ', 'Akkadian mû', 'Ugaritic my'] },
  'יום': { arabic: 'yawm', meaning: 'day', cognates: ['Arabic yawm', 'Akkadian ūmu', 'Aramaic יוֹמָא'] },
  'לילה': { arabic: 'layl', meaning: 'night', cognates: ['Arabic layl', 'Akkadian līlītu', 'Aramaic לֵילְיָא'] },
  'חשך': { meaning: 'darkness', cognates: ['Arabic ẓulmah', 'Akkadian ekletu'] },
  'רקיע': { meaning: 'firmament', cognates: ['Related to רקע (to spread out)'] },
  'עשב': { arabic: 'ʿušb', meaning: 'herb/grass', cognates: ['Arabic ʿušb', 'Akkadian šammu'] },
  'עץ': { arabic: 'ʿūd', meaning: 'tree/wood', cognates: ['Arabic ʿūd', 'Akkadian iṣu'] },
  'פרי': { arabic: 'faraʾ', meaning: 'fruit/offspring', cognates: ['Arabic farʿ (branch)', 'Akkadian inbu'] },
  'זרע': { arabic: 'zarʿ', meaning: 'seed', cognates: ['Arabic zarʿ', 'Akkadian zēru', 'Aramaic זַרְעָא'] },

  // === Family & Relationships ===
  'אב': { arabic: 'ab', meaning: 'father', cognates: ['Arabic ʾab', 'Akkadian abu', 'Aramaic אַבָּא'] },
  'אם': { arabic: 'umm', meaning: 'mother', cognates: ['Arabic ʾumm', 'Akkadian ummu', 'Aramaic אִמָּא'] },
  'בן': { arabic: 'ibn', meaning: 'son', cognates: ['Arabic ibn', 'Aramaic בַּר', 'Akkadian māru'] },
  'בת': { arabic: 'bint', meaning: 'daughter', cognates: ['Arabic bint', 'Akkadian mārtu'] },
  'אח': { arabic: 'akh', meaning: 'brother', cognates: ['Arabic ʾakh', 'Akkadian aḫu', 'Aramaic אַחָא'] },
  'אחות': { arabic: 'ukht', meaning: 'sister', cognates: ['Arabic ʾukht', 'Akkadian aḫātu'] },
  'איש': { meaning: 'man', cognates: ['Ugaritic ʾiš', 'Akkadian awīlu'] },
  'אשה': { arabic: 'imraʾa', meaning: 'woman/wife', cognates: ['Arabic ʾunthā', 'Akkadian aššatu'] },
  'בית': { arabic: 'bayt', meaning: 'house', cognates: ['Arabic bayt', 'Akkadian bītu', 'Aramaic בֵּיתָא'] },

  // === Divine & Sacred ===
  'קדש': { arabic: 'quds', meaning: 'holy', cognates: ['Arabic quds', 'Ugaritic qdš', 'Akkadian qadištu'] },
  'ברך': { arabic: 'baraka', meaning: 'blessing', cognates: ['Arabic bāraka', 'Akkadian karābu'] },
  'שלם': { arabic: 'salām', meaning: 'peace/wholeness', cognates: ['Arabic salām', 'Akkadian šalāmu'] },
  'מלך': { arabic: 'malik', meaning: 'king', cognates: ['Arabic malik', 'Akkadian malku', 'Ugaritic mlk'] },
  'כהן': { arabic: 'kāhin', meaning: 'priest', cognates: ['Arabic kāhin', 'Akkadian kānu'] },
  'נביא': { meaning: 'prophet', cognates: ['Akkadian nabû (to call)', 'Arabic nabīy'] },
  'עבד': { arabic: 'ʿabd', meaning: 'servant/slave', cognates: ['Arabic ʿabd', 'Akkadian ardu'] },
  'צדק': { arabic: 'ṣadaqa', meaning: 'righteousness', cognates: ['Arabic ṣadaqa', 'Akkadian ṣidqu'] },
  'חסד': { meaning: 'lovingkindness', cognates: ['Unique Hebrew theological term'] },
  'תורה': { meaning: 'instruction/law', cognates: ['From ירה (to teach/throw)', 'Akkadian têrtu'] },
  'מצוה': { meaning: 'commandment', cognates: ['From צוה (to command)'] },
  'חטא': { arabic: 'khaṭaʾ', meaning: 'sin/miss', cognates: ['Arabic khaṭaʾ', 'Akkadian ḫaṭû'] },
  'כפר': { arabic: 'kafara', meaning: 'to atone/cover', cognates: ['Arabic kafara', 'Akkadian kapāru'] },

  // === Common Verbs ===
  'אמר': { arabic: 'amara', meaning: 'to say/command', cognates: ['Arabic ʾamara', 'Akkadian amāru'] },
  'שמע': { arabic: 'samiʿa', meaning: 'to hear', cognates: ['Arabic samiʿa', 'Akkadian šemû'] },
  'ראה': { arabic: 'raʾā', meaning: 'to see', cognates: ['Arabic raʾā', 'Akkadian amāru'] },
  'ידע': { arabic: 'wadaʿa', meaning: 'to know', cognates: ['Arabic wadaʿa', 'Akkadian idû'] },
  'עשה': { meaning: 'to do/make', cognates: ['Akkadian epēšu'] },
  'נתן': { meaning: 'to give', cognates: ['Akkadian nadānu', 'Ugaritic ytn'] },
  'לקח': { meaning: 'to take', cognates: ['Akkadian leqû'] },
  'הלך': { meaning: 'to go/walk', cognates: ['Akkadian alāku', 'Aramaic אֲזַל'] },
  'בוא': { meaning: 'to come/enter', cognates: ['Akkadian erēbu'] },
  'יצא': { meaning: 'to go out', cognates: ['Akkadian aṣû', 'Arabic kharaja'] },
  'שוב': { meaning: 'to return', cognates: ['Akkadian târu'] },
  'כתב': { arabic: 'kataba', meaning: 'to write', cognates: ['Arabic kataba', 'Ugaritic ktb'] },
  'שמר': { arabic: 'samar', meaning: 'to guard/keep', cognates: ['Arabic samara', 'Akkadian naṣāru'] },
  'אהב': { meaning: 'to love', cognates: ['Ugaritic ʾahb', 'Akkadian rāmu'] },
  'ירא': { meaning: 'to fear', cognates: ['Akkadian palāḫu'] },
  'חיה': { arabic: 'ḥayy', meaning: 'to live', cognates: ['Arabic ḥayy', 'Akkadian balāṭu'] },
  'מות': { arabic: 'māt', meaning: 'to die', cognates: ['Arabic māta', 'Akkadian mâtu', 'Ugaritic mwt'] },

  // === Body Parts ===
  'ראש': { arabic: 'raʾs', meaning: 'head', cognates: ['Arabic raʾs', 'Akkadian rēšu'] },
  'יד': { arabic: 'yad', meaning: 'hand', cognates: ['Arabic yad', 'Akkadian idu'] },
  'עין': { arabic: 'ʿayn', meaning: 'eye', cognates: ['Arabic ʿayn', 'Akkadian īnu'] },
  'אזן': { arabic: 'ʾudhun', meaning: 'ear', cognates: ['Arabic ʾudhun', 'Akkadian uznu'] },
  'פה': { arabic: 'fam', meaning: 'mouth', cognates: ['Arabic fam', 'Akkadian pû'] },
  'לב': { arabic: 'lubb', meaning: 'heart', cognates: ['Arabic lubb', 'Akkadian libbu'] },
  'נפש': { arabic: 'nafs', meaning: 'soul/breath', cognates: ['Arabic nafs', 'Akkadian napištu'] },
  'בשר': { arabic: 'basar', meaning: 'flesh/meat', cognates: ['Arabic basar', 'Akkadian bišru'] },
  'דם': { arabic: 'dam', meaning: 'blood', cognates: ['Arabic dam', 'Akkadian damu'] },

  // === Numbers ===
  'אחד': { arabic: 'ʾaḥad', meaning: 'one', cognates: ['Arabic ʾaḥad', 'Akkadian ištēn'] },
  'שנים': { meaning: 'two', cognates: ['Arabic ithnān', 'Akkadian šina'] },
  'שלש': { arabic: 'thalāth', meaning: 'three', cognates: ['Arabic thalātha', 'Akkadian šalāš'] },
  'שבע': { arabic: 'sabʿ', meaning: 'seven', cognates: ['Arabic sabʿa', 'Akkadian sebe'] },
  'עשר': { arabic: 'ʿashr', meaning: 'ten', cognates: ['Arabic ʿashr', 'Akkadian ešer'] },
  'מאה': { arabic: 'miʾa', meaning: 'hundred', cognates: ['Arabic miʾa', 'Akkadian mēʾatu'] },

  // === Food & Agriculture ===
  'לחם': { arabic: 'laḥm', meaning: 'bread/food', cognates: ['Arabic laḥm (meat)', 'Ugaritic lḥm'] },
  'יין': { meaning: 'wine', cognates: ['Greek oinos', 'Akkadian īnu'] },
  'שמן': { arabic: 'samn', meaning: 'oil', cognates: ['Arabic samn', 'Akkadian šamnu'] },
  'חלב': { arabic: 'ḥalīb', meaning: 'milk', cognates: ['Arabic ḥalīb', 'Akkadian ḫalābu'] },
  'דבש': { meaning: 'honey', cognates: ['Arabic dibs'] },
  'שדה': { meaning: 'field', cognates: ['Akkadian šadû (mountain)', 'Ugaritic šd'] },
  'כרם': { arabic: 'karm', meaning: 'vineyard', cognates: ['Arabic karm', 'Akkadian karmu'] },

  // === Animals ===
  'צאן': { arabic: 'ḍaʾn', meaning: 'sheep/flock', cognates: ['Arabic ḍaʾn', 'Akkadian ṣēnu'] },
  'בקר': { arabic: 'baqar', meaning: 'cattle', cognates: ['Arabic baqar', 'Akkadian alpu'] },
  'סוס': { meaning: 'horse', cognates: ['Akkadian sisû'] },
  'חמור': { arabic: 'ḥimār', meaning: 'donkey', cognates: ['Arabic ḥimār', 'Akkadian imēru'] },
  'כלב': { arabic: 'kalb', meaning: 'dog', cognates: ['Arabic kalb', 'Akkadian kalbu'] },

  // === Ritual & Temple ===
  'זבח': { arabic: 'dhabaḥa', meaning: 'sacrifice', cognates: ['Arabic dhabaḥa', 'Akkadian zibbu'] },
  'קרבן': { meaning: 'offering', cognates: ['From קרב (to draw near)'] },
  'מזבח': { meaning: 'altar', cognates: ['From זבח (sacrifice)'] },
  'משכן': { meaning: 'tabernacle', cognates: ['From שכן (to dwell)', 'Akkadian maškanu'] },
  'ארון': { meaning: 'ark/chest', cognates: ['Akkadian arānu'] },
};

// =============================================================================
// HEBREW GRAMMAR REFERENCE (Gesenius-based)
// =============================================================================

export const BINYAN_INFO = {
  'קל': {
    name: 'Qal (Pa\'al)',
    latin: 'Qal',
    meaning: 'Simple active',
    description: 'Basic stem, simple action',
    example: 'שָׁמַר (he guarded)',
    frequency: 'Most common (~70%)'
  },
  'נפעל': {
    name: 'Nif\'al',
    latin: 'Niphal',
    meaning: 'Simple passive/reflexive',
    description: 'Passive or reflexive of Qal',
    example: 'נִשְׁמַר (he was guarded)',
    frequency: 'Common'
  },
  'פיעל': {
    name: 'Pi\'el',
    latin: 'Piel',
    meaning: 'Intensive active',
    description: 'Intensive, causative, or denominative',
    example: 'שִׁמֵּר (he guarded carefully)',
    frequency: 'Common'
  },
  'פועל': {
    name: 'Pu\'al',
    latin: 'Pual',
    meaning: 'Intensive passive',
    description: 'Passive of Pi\'el',
    example: 'שֻׁמַּר (he was guarded carefully)',
    frequency: 'Less common'
  },
  'הפעיל': {
    name: 'Hif\'il',
    latin: 'Hiphil',
    meaning: 'Causative active',
    description: 'Causative - making someone do action',
    example: 'הִשְׁמִיר (he caused to guard)',
    frequency: 'Common'
  },
  'הופעל': {
    name: 'Hof\'al',
    latin: 'Hophal',
    meaning: 'Causative passive',
    description: 'Passive of Hif\'il',
    example: 'הָשְׁמַר (he was made to guard)',
    frequency: 'Rare'
  },
  'התפעל': {
    name: 'Hitpa\'el',
    latin: 'Hitpael',
    meaning: 'Reflexive/reciprocal',
    description: 'Reflexive action or mutual action',
    example: 'הִשְׁתַּמֵּר (he guarded himself)',
    frequency: 'Fairly common'
  }
};

export const VERB_TENSES = {
  'עבר': { name: 'Perfect (Qatal)', description: 'Completed action', english: 'Past tense' },
  'עתיד': { name: 'Imperfect (Yiqtol)', description: 'Incomplete action', english: 'Future/Present' },
  'ציווי': { name: 'Imperative', description: 'Command', english: 'Command' },
  'שם הפועל': { name: 'Infinitive', description: 'Verbal noun', english: 'To + verb' },
  'בינוני': { name: 'Participle', description: 'Verbal adjective', english: '-ing form' }
};

