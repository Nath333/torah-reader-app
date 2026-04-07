/**
 * Manuscript Variants Service
 *
 * Provides textual variants from major Hebrew Bible manuscripts for scholarly comparison.
 * Sources: Aleppo Codex, Leningrad Codex, Dead Sea Scrolls, Samaritan Pentateuch
 */

import { normalizeReference, normalizeBookName } from '../../utils/referenceUtils';

// Major manuscript sources
export const MANUSCRIPT_SOURCES = {
  LENINGRAD: {
    key: 'leningrad',
    name: 'Leningrad Codex',
    hebrewName: 'כתר לנינגרד',
    abbreviation: 'L',
    date: '1008 CE',
    description: 'Oldest complete manuscript of the Hebrew Bible',
    type: 'masoretic',
    language: 'Hebrew'
  },
  ALEPPO: {
    key: 'aleppo',
    name: 'Aleppo Codex',
    hebrewName: 'כתר ארם צובא',
    abbreviation: 'A',
    date: '930 CE',
    description: 'Most authoritative Masoretic text, partially damaged',
    type: 'masoretic',
    language: 'Hebrew'
  },
  DEAD_SEA: {
    key: 'dss',
    name: 'Dead Sea Scrolls',
    hebrewName: 'מגילות ים המלח',
    abbreviation: 'DSS',
    date: '300 BCE - 100 CE',
    description: 'Ancient scrolls from Qumran caves',
    type: 'pre-masoretic',
    language: 'Hebrew'
  },
  SAMARITAN: {
    key: 'samaritan',
    name: 'Samaritan Pentateuch',
    hebrewName: 'תורה שומרונית',
    abbreviation: 'SP',
    date: '~200 BCE',
    description: 'Samaritan version of the Torah',
    type: 'independent',
    language: 'Hebrew (Samaritan script)'
  },
  SEPTUAGINT: {
    key: 'lxx',
    name: 'Septuagint',
    hebrewName: 'תרגום השבעים',
    abbreviation: 'LXX',
    date: '300-100 BCE',
    description: 'Greek translation, preserves ancient Hebrew variants',
    type: 'translation',
    language: 'Greek'
  },
  PESHITTA: {
    key: 'peshitta',
    name: 'Peshitta',
    hebrewName: 'פשיטתא',
    abbreviation: 'Pesh',
    date: '2nd-3rd century CE',
    description: 'Syriac translation of the Bible',
    type: 'translation',
    language: 'Syriac'
  },
  VULGATE: {
    key: 'vulgate',
    name: 'Vulgate',
    hebrewName: 'וולגטה',
    abbreviation: 'Vg',
    date: '382-405 CE',
    description: 'Jerome\'s Latin translation from Hebrew',
    type: 'translation',
    language: 'Latin'
  },
  TARGUM_ONKELOS: {
    key: 'onkelos',
    name: 'Targum Onkelos',
    hebrewName: 'תרגום אונקלוס',
    abbreviation: 'TgO',
    date: '2nd century CE',
    description: 'Official Aramaic translation of Torah',
    type: 'targum',
    language: 'Aramaic'
  }
};

// Significant textual variants database
// Format: { ref, mt (Masoretic), variants: [{ source, reading, significance, notes }] }
const TEXTUAL_VARIANTS = [
  // Genesis variants
  {
    ref: 'Genesis.1.1',
    mt: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים',
    variants: [
      { source: 'lxx', reading: 'Ἐν ἀρχῇ ἐποίησεν ὁ θεός', significance: 'similar', notes: 'Greek translation confirms MT' },
      { source: 'onkelos', reading: 'בְּקַדְמִין בְּרָא יְיָ', significance: 'theological', notes: 'Uses ה׳ instead of אלהים' }
    ]
  },
  {
    ref: 'Genesis.2.2',
    mt: 'וַיְכַל אֱלֹהִים בַּיּוֹם הַשְּׁבִיעִי',
    variants: [
      { source: 'lxx', reading: 'ἡμέρᾳ τῇ ἕκτῃ', significance: 'major', notes: 'LXX reads "sixth day" to avoid God working on Sabbath' },
      { source: 'samaritan', reading: 'בַּיּוֹם הַשִּׁשִּׁי', significance: 'major', notes: 'SP also reads "sixth day"' },
      { source: 'peshitta', reading: 'sixth day', significance: 'major', notes: 'Peshitta follows LXX/SP tradition' }
    ]
  },
  {
    ref: 'Genesis.4.8',
    mt: 'וַיֹּאמֶר קַיִן אֶל־הֶבֶל אָחִיו',
    variants: [
      { source: 'lxx', reading: 'Διέλθωμεν εἰς τὸ πεδίον', significance: 'major', notes: 'LXX adds "Let us go into the field"' },
      { source: 'samaritan', reading: 'נֵלְכָה הַשָּׂדֶה', significance: 'major', notes: 'SP has "Let us go to the field"' },
      { source: 'vulgate', reading: 'Egrediamur foras', significance: 'major', notes: 'Vulgate follows LXX' }
    ]
  },
  {
    ref: 'Genesis.49.10',
    mt: 'עַד כִּי־יָבֹא שִׁילֹה',
    variants: [
      { source: 'lxx', reading: 'ἕως ἂν ἔλθῃ τὰ ἀποκείμενα αὐτῷ', significance: 'messianic', notes: '"Until he comes to whom it belongs"' },
      { source: 'samaritan', reading: 'שילה', significance: 'similar', notes: 'SP same but different interpretation' },
      { source: 'dss', reading: 'שילוה (4Q252)', significance: 'variant', notes: 'Plene spelling in Qumran' }
    ]
  },

  // Exodus variants
  {
    ref: 'Exodus.1.5',
    mt: 'שִׁבְעִים נָפֶשׁ',
    variants: [
      { source: 'lxx', reading: 'πέντε καὶ ἑβδομήκοντα', significance: 'major', notes: 'LXX: 75 persons (adds 5)' },
      { source: 'dss', reading: 'שבעים וחמשה (4QExod)', significance: 'major', notes: 'DSS agrees with LXX: 75' }
    ]
  },
  {
    ref: 'Exodus.12.40',
    mt: 'אֶרֶץ מִצְרָיִם שְׁלֹשִׁים שָׁנָה וְאַרְבַּע מֵאוֹת שָׁנָה',
    variants: [
      { source: 'lxx', reading: 'ἐν γῇ Αἰγύπτῳ καὶ ἐν γῇ Χανάαν', significance: 'major', notes: 'LXX adds "and land of Canaan" - 430 years total including patriarchs' },
      { source: 'samaritan', reading: 'בארץ מצרים ובארץ כנען', significance: 'major', notes: 'SP also adds Canaan' }
    ]
  },
  {
    ref: 'Exodus.20.11',
    mt: 'כִּי שֵׁשֶׁת־יָמִים עָשָׂה יְהוָה',
    variants: [
      { source: 'samaritan', reading: 'Additional commandment about Gerizim', significance: 'major', notes: 'SP has 10th commandment about Mt. Gerizim after Decalogue' }
    ]
  },

  // Deuteronomy variants
  {
    ref: 'Deuteronomy.5.21',
    mt: 'וְלֹא תִתְאַוֶּה',
    variants: [
      { source: 'lxx', reading: 'order differs', significance: 'structural', notes: 'LXX has different order of "wife" and "house"' },
      { source: 'samaritan', reading: 'different order', significance: 'structural', notes: 'SP follows LXX order' }
    ]
  },
  {
    ref: 'Deuteronomy.27.4',
    mt: 'בְּהַר עֵיבָל',
    variants: [
      { source: 'samaritan', reading: 'בְּהַר גְּרִזִּים', significance: 'sectarian', notes: 'SP reads Mt. Gerizim instead of Mt. Ebal' },
      { source: 'dss', reading: 'הר גריזים (4QDeutⁿ)', significance: 'major', notes: 'DSS fragment supports SP reading' }
    ]
  },
  {
    ref: 'Deuteronomy.32.8',
    mt: 'לְמִסְפַּר בְּנֵי יִשְׂרָאֵל',
    variants: [
      { source: 'lxx', reading: 'κατὰ ἀριθμὸν ἀγγέλων θεοῦ', significance: 'major', notes: 'LXX: "according to the number of angels of God"' },
      { source: 'dss', reading: 'למספר בני אלהים (4QDeutʲ)', significance: 'major', notes: 'DSS: "sons of God/gods" - supports polytheistic background' }
    ]
  },
  {
    ref: 'Deuteronomy.32.43',
    mt: 'הַרְנִינוּ גוֹיִם עַמּוֹ',
    variants: [
      { source: 'dss', reading: 'Extended text (4QDeutᵠ)', significance: 'major', notes: 'DSS has longer reading: "Rejoice, O heavens, with him; and bow down to him, all gods"' },
      { source: 'lxx', reading: 'Extended text', significance: 'major', notes: 'LXX preserves similar longer reading' }
    ]
  },

  // Samuel variants (many DSS differences)
  {
    ref: '1 Samuel.1.24',
    mt: 'בְּפָרִים שְׁלֹשָׁה',
    variants: [
      { source: 'lxx', reading: 'ἐν μόσχῳ τριετίζοντι', significance: 'minor', notes: 'LXX: "with a three-year-old bull" (singular)' },
      { source: 'dss', reading: 'בפר משלש (4QSamᵃ)', significance: 'variant', notes: 'DSS supports LXX singular bull' }
    ]
  },
  {
    ref: '1 Samuel.10.27-11.1',
    mt: 'Standard text',
    variants: [
      { source: 'dss', reading: 'Extended paragraph (4QSamᵃ)', significance: 'major', notes: 'DSS has extensive additional text about Nahash gouging eyes - now in NRSV' }
    ]
  },
  {
    ref: '1 Samuel.17.4',
    mt: 'שֵׁשׁ אַמּוֹת וָזָרֶת',
    variants: [
      { source: 'lxx', reading: 'τέσσαρες πήχεις καὶ σπιθαμῆς', significance: 'numerical', notes: 'LXX: "four cubits and a span" (6\'9" vs 9\'9")' },
      { source: 'dss', reading: 'ארבע אמות וזרת (4QSamᵃ)', significance: 'major', notes: 'DSS supports LXX shorter Goliath' }
    ]
  },

  // Isaiah variants (Great Isaiah Scroll)
  {
    ref: 'Isaiah.7.14',
    mt: 'הָעַלְמָה',
    variants: [
      { source: 'lxx', reading: 'ἡ παρθένος', significance: 'major', notes: 'LXX translates as "virgin" (parthenos)' },
      { source: 'dss', reading: 'העלמה (1QIsaᵃ)', significance: 'supports MT', notes: 'Great Isaiah Scroll confirms "young woman"' }
    ]
  },
  {
    ref: 'Isaiah.9.5',
    mt: 'פֶּלֶא יוֹעֵץ אֵל גִּבּוֹר',
    variants: [
      { source: 'lxx', reading: 'Μεγάλης βουλῆς ἄγγελος', significance: 'theological', notes: 'LXX: "Angel of Great Counsel" - avoids divine titles' },
      { source: 'dss', reading: 'Supports MT (1QIsaᵃ)', significance: 'supports MT', notes: 'DSS confirms MT reading' }
    ]
  },
  {
    ref: 'Isaiah.40.3',
    mt: 'בַּמִּדְבָּר פַּנּוּ דֶּרֶךְ יְהוָה',
    variants: [
      { source: 'lxx', reading: 'Φωνὴ βοῶντος ἐν τῇ ἐρήμῳ', significance: 'punctuation', notes: '"Voice crying in the wilderness" - different phrase division' },
      { source: 'dss', reading: 'Supports MT (1QIsaᵃ)', significance: 'supports MT', notes: 'Community Rule interprets as LXX' }
    ]
  },
  {
    ref: 'Isaiah.53.11',
    mt: 'מֵעֲמַל נַפְשׁוֹ יִרְאֶה',
    variants: [
      { source: 'lxx', reading: 'ἀπὸ τοῦ πόνου τῆς ψυχῆς αὐτοῦ δεῖξαι αὐτῷ φῶς', significance: 'major', notes: 'LXX adds "light" - "he will see light"' },
      { source: 'dss', reading: 'יראה אור (1QIsaᵃ,ᵇ)', significance: 'major', notes: 'DSS confirms "he will see light"' }
    ]
  },

  // Psalms variants
  {
    ref: 'Psalms.22.17',
    mt: 'כָּאֲרִי יָדַי וְרַגְלָי',
    variants: [
      { source: 'lxx', reading: 'ὤρυξαν χεῖράς μου καὶ πόδας', significance: 'major', notes: 'LXX: "they pierced my hands and feet"' },
      { source: 'dss', reading: 'כארו (5/6HevPs)', significance: 'disputed', notes: 'Some read "pierced" others "like a lion"' }
    ]
  },
  {
    ref: 'Psalms.145',
    mt: 'Missing נ verse',
    variants: [
      { source: 'lxx', reading: 'πιστὸς κύριος ἐν τοῖς λόγοις αὐτοῦ', significance: 'structural', notes: 'LXX has additional nun verse' },
      { source: 'dss', reading: 'נאמן אלהים בדבריו (11QPsᵃ)', significance: 'major', notes: 'DSS confirms the nun verse existed' }
    ]
  },

  // Jeremiah variants (major LXX/MT differences)
  {
    ref: 'Jeremiah.10.6-8',
    mt: 'Full text',
    variants: [
      { source: 'lxx', reading: 'Shorter text', significance: 'major', notes: 'LXX lacks these verses entirely' },
      { source: 'dss', reading: 'Shorter (4QJerᵇ)', significance: 'major', notes: 'DSS supports shorter LXX text' }
    ]
  },
  {
    ref: 'Jeremiah.33.14-26',
    mt: 'Full Davidic promises',
    variants: [
      { source: 'lxx', reading: 'Missing', significance: 'major', notes: 'LXX lacks this entire section' }
    ]
  }
];

// Dead Sea Scrolls specific manuscripts
const DSS_MANUSCRIPTS = {
  '1QIsaᵃ': { name: 'Great Isaiah Scroll', contents: 'Complete Isaiah', date: '~125 BCE' },
  '1QIsaᵇ': { name: 'Isaiah B', contents: 'Fragmentary Isaiah', date: '~1st century BCE' },
  '4QSamᵃ': { name: '4QSamuel-a', contents: 'Samuel fragments', date: '~50 BCE' },
  '4QSamᵇ': { name: '4QSamuel-b', contents: 'Samuel fragments', date: '~250 BCE' },
  '4QJerᵃ': { name: '4QJeremiah-a', contents: 'Jeremiah (MT type)', date: '~200 BCE' },
  '4QJerᵇ': { name: '4QJeremiah-b', contents: 'Jeremiah (LXX type)', date: '~150 BCE' },
  '4QDeutⁿ': { name: '4QDeuteronomy-n', contents: 'Deuteronomy', date: '~150 BCE' },
  '4QExod': { name: '4QExodus', contents: 'Exodus fragments', date: '~250 BCE' },
  '11QPsᵃ': { name: 'Great Psalms Scroll', contents: 'Psalms (different order)', date: '~50 CE' },
  '4Q252': { name: 'Commentary on Genesis', contents: 'Genesis commentary', date: '~100 BCE' }
};

/**
 * Get variants for a specific reference
 * @param {string} reference - Book.Chapter.Verse format
 * @returns {Object|null} Variant data or null
 */
export const getVariantsForVerse = (reference) => {
  const normalizedRef = normalizeReference(reference);
  const variant = TEXTUAL_VARIANTS.find(v =>
    normalizeReference(v.ref) === normalizedRef
  );

  if (!variant) return null;

  return {
    reference: variant.ref,
    masoreticText: variant.mt,
    variants: variant.variants.map(v => ({
      ...v,
      sourceInfo: MANUSCRIPT_SOURCES[v.source.toUpperCase()] || { name: v.source }
    })),
    hasSignificantVariants: variant.variants.some(v =>
      v.significance === 'major' || v.significance === 'messianic'
    )
  };
};

/**
 * Get all variants for a chapter
 * @param {string} book - Book name
 * @param {number} chapter - Chapter number
 * @returns {Object[]} Array of variant entries
 */
export const getVariantsForChapter = (book, chapter) => {
  const bookNorm = normalizeBookName(book);
  return TEXTUAL_VARIANTS
    .filter(v => {
      const [refBook, refChapter] = v.ref.split('.');
      return normalizeBookName(refBook) === bookNorm && parseInt(refChapter) === chapter;
    })
    .map(v => ({
      reference: v.ref,
      masoreticText: v.mt,
      variants: v.variants.map(var_ => ({
        ...var_,
        sourceInfo: MANUSCRIPT_SOURCES[var_.source.toUpperCase()] || { name: var_.source }
      })),
      hasSignificantVariants: v.variants.some(var_ =>
        var_.significance === 'major' || var_.significance === 'messianic'
      )
    }));
};

/**
 * Search variants by manuscript source
 * @param {string} source - Manuscript source key
 * @returns {Object[]} Variants from that source
 */
export const searchVariantsBySource = (source) => {
  const sourceLower = source.toLowerCase();
  return TEXTUAL_VARIANTS
    .filter(v => v.variants.some(var_ => var_.source.toLowerCase() === sourceLower))
    .map(v => ({
      reference: v.ref,
      masoreticText: v.mt,
      variant: v.variants.find(var_ => var_.source.toLowerCase() === sourceLower)
    }));
};

/**
 * Get DSS manuscript information
 * @param {string} siglum - Manuscript siglum (e.g., "1QIsaᵃ")
 * @returns {Object|null} Manuscript info
 */
export const getDSSManuscript = (siglum) => {
  return DSS_MANUSCRIPTS[siglum] || null;
};

/**
 * Get all available DSS manuscripts
 * @returns {Object} All DSS manuscripts
 */
export const getAllDSSManuscripts = () => {
  return { ...DSS_MANUSCRIPTS };
};

/**
 * Get statistics about textual variants
 * @returns {Object} Statistics
 */
export const getVariantStatistics = () => {
  const stats = {
    totalVariants: TEXTUAL_VARIANTS.length,
    byBook: {},
    bySignificance: { major: 0, minor: 0, similar: 0, theological: 0, structural: 0 },
    bySource: {}
  };

  TEXTUAL_VARIANTS.forEach(v => {
    const book = v.ref.split('.')[0];
    stats.byBook[book] = (stats.byBook[book] || 0) + 1;

    v.variants.forEach(var_ => {
      if (var_.significance) {
        stats.bySignificance[var_.significance] = (stats.bySignificance[var_.significance] || 0) + 1;
      }
      stats.bySource[var_.source] = (stats.bySource[var_.source] || 0) + 1;
    });
  });

  return stats;
};

/**
 * Get scholarly explanation of a variant
 * @param {string} reference - Verse reference
 * @returns {Object|null} Scholarly analysis
 */
export const getScholarlyAnalysis = (reference) => {
  const variantData = getVariantsForVerse(reference);
  if (!variantData) return null;

  const hasDSS = variantData.variants.some(v => v.source === 'dss');
  const hasLXX = variantData.variants.some(v => v.source === 'lxx');
  const hasSP = variantData.variants.some(v => v.source === 'samaritan');

  return {
    ...variantData,
    textualHistory: {
      preserMainText: 'Masoretic Text (MT) - standard Hebrew Bible text',
      witnesses: [
        hasDSS && 'Dead Sea Scrolls (pre-70 CE Hebrew witnesses)',
        hasLXX && 'Septuagint (Greek translation, reflects ancient Hebrew Vorlage)',
        hasSP && 'Samaritan Pentateuch (independent textual tradition)'
      ].filter(Boolean),
      criticalNote: variantData.hasSignificantVariants
        ? 'This verse has textually significant variants that may affect interpretation'
        : 'Minor orthographic or translational differences'
    }
  };
};

// Export significance level descriptions
export const SIGNIFICANCE_LEVELS = {
  major: 'Significant textual difference affecting meaning',
  minor: 'Minor difference (orthography, word order)',
  similar: 'Substantially agrees with MT',
  theological: 'Variant with theological implications',
  structural: 'Structural or organizational difference',
  messianic: 'Variant affecting messianic interpretation',
  numerical: 'Numerical/measurement difference',
  sectarian: 'Reflects sectarian concerns',
  disputed: 'Reading is debated among scholars'
};
