// =============================================================================
// LOOKUP CONSTANTS
// Scholarly constants extracted from unifiedLookupService for modularity
// =============================================================================

/**
 * Linguistic periods in Hebrew/Aramaic literature
 */
export const LINGUISTIC_PERIODS = {
  ARCHAIC_BIBLICAL: {
    key: 'archaic_biblical',
    name: 'Archaic Biblical Hebrew',
    abbrev: 'ABH',
    dateRange: 'c. 1200-1000 BCE',
    description: 'Earliest biblical poetry (Song of Deborah, Blessing of Moses)',
    markers: ['archaic verbal forms', 'rare vocabulary', 'unique syntax']
  },
  STANDARD_BIBLICAL: {
    key: 'standard_biblical',
    name: 'Standard Biblical Hebrew',
    abbrev: 'SBH',
    dateRange: 'c. 1000-586 BCE',
    description: 'Classical prose of Torah, Former Prophets',
    markers: ['classical verbal system', 'waw-consecutive', 'standard vocabulary']
  },
  LATE_BIBLICAL: {
    key: 'late_biblical',
    name: 'Late Biblical Hebrew',
    abbrev: 'LBH',
    dateRange: 'c. 586-200 BCE',
    description: 'Post-exilic texts (Esther, Daniel, Chronicles)',
    markers: ['Aramaisms', 'Persian loanwords', 'changed syntax']
  },
  QUMRAN: {
    key: 'qumran',
    name: 'Qumran Hebrew',
    abbrev: 'QH',
    dateRange: 'c. 200 BCE-70 CE',
    description: 'Dead Sea Scrolls sectarian literature',
    markers: ['mixed features', 'archaizing tendencies', 'unique terminology']
  },
  MISHNAIC: {
    key: 'mishnaic',
    name: 'Mishnaic Hebrew',
    abbrev: 'MH',
    dateRange: 'c. 70-200 CE',
    description: 'Tannaitic literature (Mishnah, Tosefta)',
    markers: ['no waw-consecutive', 'Greek/Latin loans', 'participle-based syntax']
  },
  AMORAIC: {
    key: 'amoraic',
    name: 'Amoraic Hebrew',
    abbrev: 'AH',
    dateRange: 'c. 200-500 CE',
    description: 'Hebrew portions of Talmud, Midrash',
    markers: ['mixed with Aramaic', 'reduced verbal system', 'technical terms']
  }
};

/**
 * Aramaic dialects in Jewish literature
 */
export const ARAMAIC_DIALECTS = {
  BIBLICAL_ARAMAIC: {
    key: 'biblical_aramaic', name: 'Biblical Aramaic', abbrev: 'BA',
    texts: 'Daniel 2-7, Ezra 4-7', features: ['Imperial Aramaic influence', 'older orthography']
  },
  TARGUMIC: {
    key: 'targumic', name: 'Targumic Aramaic', abbrev: 'TgA',
    texts: 'Targum Onkelos, Jonathan', features: ['translation Hebrew', 'literary dialect']
  },
  JEWISH_PALESTINIAN: {
    key: 'jewish_palestinian', name: 'Jewish Palestinian Aramaic', abbrev: 'JPA',
    texts: 'Palestinian Talmud', features: ['Western Aramaic', 'Greek influence']
  },
  JEWISH_BABYLONIAN: {
    key: 'jewish_babylonian', name: 'Jewish Babylonian Aramaic', abbrev: 'JBA',
    texts: 'Babylonian Talmud', features: ['Eastern Aramaic', 'Akkadian substrate']
  },
  SYRIAC: {
    key: 'syriac', name: 'Syriac', abbrev: 'Syr',
    texts: 'Peshitta', features: ['Christian literary Aramaic', 'useful cognates']
  }
};

export const HAPAX_DATABASE = {
  '\u05D2\u05D7\u05D5\u05DF': { reference: 'Gen 3:14', meaning: 'belly (of serpent)', etymology: 'uncertain', scholarlyNote: 'Unique term for serpent locomotion' },
  '\u05EA\u05E9\u05C1\u05D5\u05E7\u05D4': { reference: 'Gen 3:16', meaning: 'desire, longing', etymology: 'from \u05E9\u05C1\u05D5\u05E7', scholarlyNote: 'Only 3 occurrences; debated meaning' },
  '\u05E6\u05D4\u05E8': { reference: 'Gen 6:16', meaning: 'roof/window opening', etymology: 'related to \u05E6\u05D4\u05E8\u05D9\u05DD', scholarlyNote: 'Ark term; exact meaning disputed' },
  '\u05D0\u05D7\u05D5': { reference: 'Gen 41:2', meaning: 'reed grass', etymology: 'Egyptian loanword', scholarlyNote: 'Confirms Egyptian setting' },
  '\u05DC\u05D9\u05DC\u05D9\u05EA': { reference: 'Isa 34:14', meaning: 'night creature', etymology: 'from \u05DC\u05D9\u05DC\u05D4 + Akkadian lil\u012Btu', scholarlyNote: 'Mythological; debated interpretation' }
};

export const COMPARATIVE_SEMITIC_DB = {
  '\u05D0\u05D1': { arabic: { word: '\u0623\u0628', meaning: 'father' }, akkadian: { word: 'abu', meaning: 'father' }, ugaritic: { word: 'ab', meaning: 'father' }, protoSemitic: '*\u02BEab-', note: 'Universal Semitic "father"' },
  '\u05D0\u05DD': { arabic: { word: '\u0623\u0645', meaning: 'mother' }, akkadian: { word: 'ummu', meaning: 'mother' }, protoSemitic: '*\u02BEimm-', note: 'Universal Semitic "mother"' },
  '\u05D1\u05DF': { arabic: { word: '\u0627\u0628\u0646', meaning: 'son' }, akkadian: { word: 'm\u0101ru', meaning: 'son' }, ugaritic: { word: 'bn', meaning: 'son' }, protoSemitic: '*bin-', note: 'Proto-Semitic *bin-' },
  '\u05DE\u05D9\u05DD': { arabic: { word: '\u0645\u0627\u0621', meaning: 'water' }, akkadian: { word: 'm\u00FB', meaning: 'water' }, protoSemitic: '*may-', note: 'Dual "waters"' },
  '\u05E9\u05C1\u05DE\u05D9\u05DD': { arabic: { word: '\u0633\u0645\u0627\u0621', meaning: 'sky' }, akkadian: { word: '\u0161am\u00FB', meaning: 'heaven' }, protoSemitic: '*\u0161amay-', note: 'Dual "heavens"' },
  '\u05D0\u05E8\u05E5': { arabic: { word: '\u0623\u0631\u0636', meaning: 'earth' }, akkadian: { word: 'er\u1E63etu', meaning: 'earth' }, protoSemitic: '*\u02BE\u0101r\u1E63-', note: 'Common Semitic "earth"' },
  '\u05D9\u05D5\u05DD': { arabic: { word: '\u064A\u0648\u0645', meaning: 'day' }, akkadian: { word: '\u016Bmu', meaning: 'day' }, protoSemitic: '*yawm-', note: 'Universal time word' },
  '\u05DE\u05DC\u05DA': { arabic: { word: '\u0645\u0644\u0643', meaning: 'king' }, akkadian: { word: 'malku', meaning: 'king' }, protoSemitic: '*malk-', note: 'Semitic royal term' },
  '\u05D0\u05DC\u05D4\u05D9\u05DD': { arabic: { word: '\u0625\u0644\u0647', meaning: 'god' }, akkadian: { word: 'ilu', meaning: 'god' }, protoSemitic: '*\u02BEil-', note: 'Hebrew plural unique' },
  '\u05DC\u05D1': { arabic: { word: '\u0644\u0628', meaning: 'core' }, akkadian: { word: 'libbu', meaning: 'heart' }, protoSemitic: '*libb-', note: 'Seat of intellect' },
  '\u05D3\u05DD': { arabic: { word: '\u062F\u0645', meaning: 'blood' }, akkadian: { word: 'd\u0101mu', meaning: 'blood' }, protoSemitic: '*dam-', note: 'Blood = life' },
  '\u05E9\u05C1\u05DE\u05E9\u05C1': { arabic: { word: '\u0634\u0645\u0633', meaning: 'sun' }, akkadian: { word: '\u0161am\u0161u', meaning: 'sun' }, protoSemitic: '*\u0161am\u0161-', note: 'Celestial term' }
};

export const HISTORICAL_PERIODS = [
  { key: 'patriarchal', name: 'Patriarchal Era', dateRange: 'c. 2000-1500 BCE', order: 1 },
  { key: 'monarchy', name: 'Monarchy', dateRange: 'c. 1020-586 BCE', order: 2 },
  { key: 'exile', name: 'Babylonian Exile', dateRange: '586-538 BCE', order: 3 },
  { key: 'second_temple', name: 'Second Temple', dateRange: '538 BCE-70 CE', order: 4 },
  { key: 'tannaitic', name: 'Tannaitic', dateRange: '70-220 CE', order: 5 },
  { key: 'amoraic', name: 'Amoraic', dateRange: '220-500 CE', order: 6 }
];

export const SEMANTIC_EVOLUTION_DB = {
  '\u05EA\u05D5\u05E8\u05D4': { evolution: [{ period: 'monarchy', meaning: 'instruction, teaching' }, { period: 'second_temple', meaning: 'the Law, Pentateuch' }, { period: 'tannaitic', meaning: 'oral and written law' }], note: 'Narrowing then broadening' },
  '\u05DE\u05E9\u05C1\u05D9\u05D7': { evolution: [{ period: 'monarchy', meaning: 'anointed one (king, priest)' }, { period: 'exile', meaning: 'future deliverer' }, { period: 'second_temple', meaning: 'eschatological redeemer' }], note: 'Common title to specific figure' },
  '\u05E7\u05D3\u05D5\u05E9\u05C1': { evolution: [{ period: 'patriarchal', meaning: 'set apart' }, { period: 'monarchy', meaning: 'holy, sacred' }, { period: 'tannaitic', meaning: 'holy, martyr' }], note: 'Preserved with extensions' }
};

export const CITATION_FORMATS = { SBL: { name: 'Society of Biblical Literature' }, CHICAGO: { name: 'Chicago Manual of Style' } };

export const CROSS_REFERENCE_DB = {
  '\u05D1\u05E8\u05D0\u05E9\u05C1\u05D9\u05EA': { references: [{ ref: 'Gen 1:1', type: 'primary', text: 'In the beginning God created' }, { ref: 'Prov 8:22', type: 'thematic', text: 'The LORD possessed me at the beginning' }] },
  '\u05D7\u05E1\u05D3': { references: [{ ref: 'Exod 34:6', type: 'definition', text: 'Abundant in lovingkindness' }, { ref: 'Ps 136', type: 'liturgical', text: 'His lovingkindness is everlasting' }, { ref: 'Mic 6:8', type: 'ethical', text: 'Love kindness' }] },
  '\u05E6\u05D3\u05E7\u05D4': { references: [{ ref: 'Gen 15:6', type: 'theological', text: 'Counted as righteousness' }, { ref: 'Isa 32:17', type: 'eschatological', text: 'Work of righteousness is peace' }] },
  '\u05E9\u05C1\u05D1\u05EA': { references: [{ ref: 'Gen 2:2-3', type: 'creation', text: 'God rested' }, { ref: 'Exod 20:8', type: 'decalogue', text: 'Remember the Sabbath' }] }
};

/**
 * Scholarly uncertainty levels
 */
export const UNCERTAINTY_LEVELS = {
  CERTAIN: {
    level: 'certain',
    label: 'Scholarly Certainty',
    icon: '\u25CF',
    description: 'All sources agree on core meaning'
  },
  PROBABLE: {
    level: 'probable',
    label: 'Highly Probable',
    icon: '\u25D0',
    description: 'Most sources agree, minor variations'
  },
  DISPUTED: {
    level: 'disputed',
    label: 'Scholarly Dispute',
    icon: '\u25D1',
    description: 'Sources present different interpretations'
  },
  UNCERTAIN: {
    level: 'uncertain',
    label: 'Uncertain Etymology',
    icon: '\u25CB',
    description: 'Limited evidence, possible meanings'
  },
  HAPAX: {
    level: 'hapax',
    label: 'Hapax Legomenon',
    icon: '\u25C7',
    description: 'Word appears only once in corpus'
  }
};
