// =============================================================================
// BASES DE DONNÉES SCHOLARLIQUES & CITATIONS — extrait de
// unifiedLookupService.js (split 04/10/2026). Données pures + fonctions
// pures : aucune dépendance sur le pipeline de lookup.
// =============================================================================

// =============================================================================
// SCHOLARLY CITATION GENERATION
// =============================================================================

/**
 * Generate a scholarly citation for a dictionary source
 * Follows academic citation standards for lexicographical references
 *
 * @param {string} sourceName - Name of the source (BDB, Jastrow, etc.)
 * @param {string} headword - The dictionary headword
 * @param {Object} options - Citation options
 * @returns {Object} Citation object with full and short forms
 */

import { stripAllDiacritics, cleanHebrewWord } from '../../utils/hebrewUtils';
import { normalizeFinals } from '../../utils/hebrewUtils';
import { getSourceInfo } from '../../constants/dictionarySources';
import { createLogger } from '../../utils/debug';

const log = createLogger('LookupDatabases');
export const generateCitation = (sourceName, headword, options = {}) => {
  const info = getSourceInfo(sourceName);
  if (!info) {
    return { full: sourceName, short: sourceName, bibtex: null };
  }

  const { includeHeadword = true, format = 'chicago' } = options;
  const hw = includeHeadword && headword ? `, s.v. "${headword}"` : '';

  // Full citation formats
  const citations = {
    chicago: `${info.author}, *${info.title}* (${info.location}: ${info.publisher}, ${info.year})${hw}.`,
    apa: `${info.author} (${info.year}). *${info.title}*. ${info.publisher}${hw}.`,
    mla: `${info.author}. *${info.title}*. ${info.publisher}, ${info.year}${hw}.`
  };

  // Short inline citation
  const short = `${info.shortName || info.author.split(',')[0]} (${info.year})${hw}`;

  // BibTeX entry
  const bibtex = `@book{${sourceName.toLowerCase().replace(/[^a-z]/g, '')},
  author = {${info.author}},
  title = {${info.title}},
  publisher = {${info.publisher}},
  year = {${info.year}},
  address = {${info.location}}
}`;

  return {
    full: citations[format] || citations.chicago,
    short,
    bibtex,
    metadata: info
  };
};

/**
 * Generate citations for all sources in a lookup result
 * @param {Array} sources - Array of source objects
 * @returns {Array} Array of citation objects
 */
export const generateAllCitations = (sources) => {
  if (!sources || sources.length === 0) return [];

  return sources.map(src => ({
    source: src.name,
    headword: src.headword,
    citation: generateCitation(src.name, src.headword)
  }));
};



// =============================================================================
// DIALECTAL AND PERIOD ANALYSIS
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

const PERIOD_MARKERS = {
  lbh_markers: [
    { pattern: /מלכות/, type: 'kingdom_term', period: 'late_biblical' },
    { pattern: /זמן/, type: 'time_word', period: 'late_biblical' },
    { pattern: /דת/, type: 'persian_loan', period: 'late_biblical' }
  ],
  mh_markers: [
    { pattern: /של/, type: 'genitive_shel', period: 'mishnaic' },
    { pattern: /כדי/, type: 'purpose_kedei', period: 'mishnaic' },
    { pattern: /הלכה/, type: 'legal_term', period: 'mishnaic' }
  ],
  aramaic_markers: [
    { pattern: /די/, type: 'relative', dialect: 'general' },
    { pattern: /קדם/, type: 'preposition', dialect: 'general' }
  ]
};

/**
 * Analyze the dialectal period of a word
 */
export const analyzeDialectalPeriod = (word, lookupResult = null) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const analysis = { word: cleaned, detectedPeriods: [], primaryPeriod: null, aramaicDialect: null, confidence: 'low', markers: [], evidence: [] };
  for (const [category, markers] of Object.entries(PERIOD_MARKERS)) {
    for (const marker of markers) {
      if (marker.pattern.test(cleaned)) {
        analysis.markers.push({ type: marker.type, category, period: marker.period || marker.dialect });
        if (marker.period) analysis.detectedPeriods.push(marker.period);
        if (marker.dialect) analysis.aramaicDialect = marker.dialect;
      }
    }
  }
  if (lookupResult?.sources) {
    for (const source of lookupResult.sources) {
      const combined = `${source.definition || ''} ${source.fullDefinition || ''}`.toLowerCase();
      if (combined.includes('late') || combined.includes('post-exilic')) { analysis.evidence.push({ source: source.name, indicator: 'late biblical' }); analysis.detectedPeriods.push('late_biblical'); }
      if (combined.includes('mishnaic') || combined.includes('rabbinic')) { analysis.evidence.push({ source: source.name, indicator: 'mishnaic' }); analysis.detectedPeriods.push('mishnaic'); }
      if (combined.includes('aramaic')) { analysis.evidence.push({ source: source.name, indicator: 'aramaic' }); if (!analysis.aramaicDialect) analysis.aramaicDialect = 'general'; }
      if (combined.includes('archaic') || combined.includes('poetic')) { analysis.evidence.push({ source: source.name, indicator: 'archaic' }); analysis.detectedPeriods.push('archaic_biblical'); }
    }
  }
  if (lookupResult?.isAramaic) { analysis.isAramaic = true; if (lookupResult?.contextMode === 'talmudic') analysis.aramaicDialect = 'jewish_babylonian'; }
  if (analysis.detectedPeriods.length > 0) {
    const counts = {}; for (const p of analysis.detectedPeriods) counts[p] = (counts[p] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    analysis.primaryPeriod = LINGUISTIC_PERIODS[sorted[0][0].toUpperCase()] || null;
    analysis.confidence = sorted[0][1] >= 2 ? 'high' : 'moderate';
  } else { analysis.primaryPeriod = LINGUISTIC_PERIODS.STANDARD_BIBLICAL; analysis.confidence = 'low'; }
  if (analysis.aramaicDialect && analysis.aramaicDialect !== 'general') analysis.dialectDetails = ARAMAIC_DIALECTS[analysis.aramaicDialect.toUpperCase()] || null;
  return analysis;
};

// =============================================================================
// HAPAX LEGOMENA DATABASE
// =============================================================================

export const HAPAX_DATABASE = {
  'גחון': { reference: 'Gen 3:14', meaning: 'belly (of serpent)', etymology: 'uncertain', scholarlyNote: 'Unique term for serpent locomotion' },
  'תשׁוקה': { reference: 'Gen 3:16', meaning: 'desire, longing', etymology: 'from שׁוק', scholarlyNote: 'Only 3 occurrences; debated meaning' },
  'צהר': { reference: 'Gen 6:16', meaning: 'roof/window opening', etymology: 'related to צהרים', scholarlyNote: 'Ark term; exact meaning disputed' },
  'אחו': { reference: 'Gen 41:2', meaning: 'reed grass', etymology: 'Egyptian loanword', scholarlyNote: 'Confirms Egyptian setting' },
  'לילית': { reference: 'Isa 34:14', meaning: 'night creature', etymology: 'from לילה + Akkadian lilītu', scholarlyNote: 'Mythological; debated interpretation' }
};

export const getHapaxInfo = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = HAPAX_DATABASE[cleaned] || HAPAX_DATABASE[normalizeFinals(cleaned)];
  if (entry) return { isHapax: true, ...entry, word: cleaned, scholarlySignificance: 'high', interpretationCaution: 'Meaning derived from context; scholarly debate exists' };
  return null;
};

export const isLikelyHapax = (lookupResult) => {
  if (!lookupResult) return false;
  const allText = (lookupResult.sources || []).map(s => `${s.definition || ''} ${s.fullDefinition || ''}`.toLowerCase()).join(' ');
  return allText.includes('hapax') || allText.includes('only once') || allText.includes('occurs once') || lookupResult.uncertainty?.level?.level === 'hapax';
};

// =============================================================================
// COMPARATIVE SEMITIC DATA
// =============================================================================

export const COMPARATIVE_SEMITIC_DB = {
  'אב': { arabic: { word: 'أب', meaning: 'father' }, akkadian: { word: 'abu', meaning: 'father' }, ugaritic: { word: 'ab', meaning: 'father' }, protoSemitic: '*ʾab-', note: 'Universal Semitic "father"' },
  'אם': { arabic: { word: 'أم', meaning: 'mother' }, akkadian: { word: 'ummu', meaning: 'mother' }, protoSemitic: '*ʾimm-', note: 'Universal Semitic "mother"' },
  'בן': { arabic: { word: 'ابن', meaning: 'son' }, akkadian: { word: 'māru', meaning: 'son' }, ugaritic: { word: 'bn', meaning: 'son' }, protoSemitic: '*bin-', note: 'Proto-Semitic *bin-' },
  'מים': { arabic: { word: 'ماء', meaning: 'water' }, akkadian: { word: 'mû', meaning: 'water' }, protoSemitic: '*may-', note: 'Dual "waters"' },
  'שׁמים': { arabic: { word: 'سماء', meaning: 'sky' }, akkadian: { word: 'šamû', meaning: 'heaven' }, protoSemitic: '*šamay-', note: 'Dual "heavens"' },
  'ארץ': { arabic: { word: 'أرض', meaning: 'earth' }, akkadian: { word: 'erṣetu', meaning: 'earth' }, protoSemitic: '*ʾarṣ-', note: 'Common Semitic "earth"' },
  'יום': { arabic: { word: 'يوم', meaning: 'day' }, akkadian: { word: 'ūmu', meaning: 'day' }, protoSemitic: '*yawm-', note: 'Universal time word' },
  'מלך': { arabic: { word: 'ملك', meaning: 'king' }, akkadian: { word: 'malku', meaning: 'king' }, protoSemitic: '*malk-', note: 'Semitic royal term' },
  'אלהים': { arabic: { word: 'إله', meaning: 'god' }, akkadian: { word: 'ilu', meaning: 'god' }, protoSemitic: '*ʾil-', note: 'Hebrew plural unique' },
  'לב': { arabic: { word: 'لب', meaning: 'core' }, akkadian: { word: 'libbu', meaning: 'heart' }, protoSemitic: '*libb-', note: 'Seat of intellect' },
  'דם': { arabic: { word: 'دم', meaning: 'blood' }, akkadian: { word: 'dāmu', meaning: 'blood' }, protoSemitic: '*dam-', note: 'Blood = life' },
  'שׁמשׁ': { arabic: { word: 'شمس', meaning: 'sun' }, akkadian: { word: 'šamšu', meaning: 'sun' }, protoSemitic: '*šamš-', note: 'Celestial term' }
};

export const getComparativeSemiticData = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = COMPARATIVE_SEMITIC_DB[cleaned] || COMPARATIVE_SEMITIC_DB[normalizeFinals(cleaned)] || COMPARATIVE_SEMITIC_DB[stripAllDiacritics(cleaned)];
  if (entry) return { hebrewWord: cleaned, ...entry, hasComparativeData: true, cognateCount: Object.keys(entry).filter(k => ['arabic', 'akkadian', 'ugaritic', 'ethiopic'].includes(k)).length };
  return null;
};

// =============================================================================
// HISTORICAL USAGE TIMELINE
// =============================================================================

export const HISTORICAL_PERIODS = [
  { key: 'patriarchal', name: 'Patriarchal Era', dateRange: 'c. 2000-1500 BCE', order: 1 },
  { key: 'monarchy', name: 'Monarchy', dateRange: 'c. 1020-586 BCE', order: 2 },
  { key: 'exile', name: 'Babylonian Exile', dateRange: '586-538 BCE', order: 3 },
  { key: 'second_temple', name: 'Second Temple', dateRange: '538 BCE-70 CE', order: 4 },
  { key: 'tannaitic', name: 'Tannaitic', dateRange: '70-220 CE', order: 5 },
  { key: 'amoraic', name: 'Amoraic', dateRange: '220-500 CE', order: 6 }
];

export const SEMANTIC_EVOLUTION_DB = {
  'תורה': { evolution: [{ period: 'monarchy', meaning: 'instruction, teaching' }, { period: 'second_temple', meaning: 'the Law, Pentateuch' }, { period: 'tannaitic', meaning: 'oral and written law' }], note: 'Narrowing then broadening' },
  'משׁיח': { evolution: [{ period: 'monarchy', meaning: 'anointed one (king, priest)' }, { period: 'exile', meaning: 'future deliverer' }, { period: 'second_temple', meaning: 'eschatological redeemer' }], note: 'Common title to specific figure' },
  'קדושׁ': { evolution: [{ period: 'patriarchal', meaning: 'set apart' }, { period: 'monarchy', meaning: 'holy, sacred' }, { period: 'tannaitic', meaning: 'holy, martyr' }], note: 'Preserved with extensions' }
};

export const getHistoricalUsageTimeline = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const entry = SEMANTIC_EVOLUTION_DB[cleaned] || SEMANTIC_EVOLUTION_DB[normalizeFinals(cleaned)];
  if (entry) return { word: cleaned, hasEvolution: true, evolution: entry.evolution.map(e => ({ ...e, periodInfo: HISTORICAL_PERIODS.find(p => p.key === e.period) })), note: entry.note, periodsCovered: entry.evolution.length };
  return null;
};

// =============================================================================
// ENHANCED CITATIONS & CROSS-REFERENCES
// =============================================================================

export const CITATION_FORMATS = { SBL: { name: 'Society of Biblical Literature' }, CHICAGO: { name: 'Chicago Manual of Style' } };

/**
 * PRO SCHOLAR V12: Enhanced SBL citation with page numbers
 * @param {string} sourceName - Dictionary name
 * @param {string} headword - Entry headword
 * @param {Object} citationData - Optional { page, entryId } from dictionary entry
 * @returns {Object} Full academic citation
 */
export const generateSBLCitation = (sourceName, headword, citationData = {}) => {
  const info = getSourceInfo(sourceName);
  if (!info) return { footnote: sourceName, bibliography: sourceName, short: sourceName };

  // Build page reference if available (PRO SCHOLAR V12)
  const pageRef = citationData.page ? `, ${citationData.page}` : '';
  const entryRef = citationData.entryId ? ` (${citationData.entryId})` : '';

  // SBL Handbook format for lexicons
  const footnote = `${info.author}, "${headword},"${entryRef} *${info.title}* (${info.location}: ${info.publisher}, ${info.year})${pageRef}.`;
  const bibliography = `${info.author}. *${info.title}*. ${info.location}: ${info.publisher}, ${info.year}.`;
  const short = `${info.shortName || info.author.split(',')[0]}${pageRef ? pageRef : `, s.v. "${headword}"`}`;

  return {
    footnote,
    bibliography,
    short,
    format: 'SBL',
    page: citationData.page || null,
    entryId: citationData.entryId || null
  };
};

export const generateAcademicCitations = (sources, format = 'SBL') => {
  if (!sources?.length) return [];
  return sources.map(src => format === 'SBL' ? { source: src.name, headword: src.headword, ...generateSBLCitation(src.name, src.headword) } : { source: src.name, ...generateCitation(src.name, src.headword, { format: format.toLowerCase() }) });
};

export const CROSS_REFERENCE_DB = {
  'בראשׁית': { references: [{ ref: 'Gen 1:1', type: 'primary', text: 'In the beginning God created' }, { ref: 'Prov 8:22', type: 'thematic', text: 'The LORD possessed me at the beginning' }] },
  'חסד': { references: [{ ref: 'Exod 34:6', type: 'definition', text: 'Abundant in lovingkindness' }, { ref: 'Ps 136', type: 'liturgical', text: 'His lovingkindness is everlasting' }, { ref: 'Mic 6:8', type: 'ethical', text: 'Love kindness' }] },
  'צדקה': { references: [{ ref: 'Gen 15:6', type: 'theological', text: 'Counted as righteousness' }, { ref: 'Isa 32:17', type: 'eschatological', text: 'Work of righteousness is peace' }] },
  'שׁבת': { references: [{ ref: 'Gen 2:2-3', type: 'creation', text: 'God rested' }, { ref: 'Exod 20:8', type: 'decalogue', text: 'Remember the Sabbath' }] }
};

export const getCrossReferences = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;
  const refs = CROSS_REFERENCE_DB[cleaned] || CROSS_REFERENCE_DB[normalizeFinals(cleaned)];
  if (refs) return { word: cleaned, hasCrossReferences: true, references: refs.references, referenceCount: refs.references.length, types: [...new Set(refs.references.map(r => r.type))] };
  return null;
};

// =============================================================================
// ULTIMATE ENRICHED LOOKUP
// =============================================================================

