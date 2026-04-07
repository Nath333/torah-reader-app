// =============================================================================
// Semantic Field Service - Hebrew vocabulary semantic domains
// Professional-grade thematic vocabulary analysis
// =============================================================================

import { stripAllDiacritics } from '../../utils/hebrewUtils';

/**
 * SEMANTIC DOMAINS - Major categories of meaning in Biblical Hebrew
 * Based on Louw-Nida semantic domain model adapted for Hebrew Bible
 */
export const SEMANTIC_DOMAINS = {
  DEITY: {
    name: 'Divine/Deity',
    hebrewName: 'אלוהות',
    description: 'Terms relating to God, divine attributes, and divine activity',
    color: '#FFD700'
  },
  CREATION: {
    name: 'Creation/Nature',
    hebrewName: 'בריאה/טבע',
    description: 'Natural world, cosmology, elements',
    color: '#228B22'
  },
  HUMANITY: {
    name: 'Humanity/Person',
    hebrewName: 'אדם/אנושות',
    description: 'Human beings, body parts, human nature',
    color: '#DEB887'
  },
  COVENANT: {
    name: 'Covenant/Agreement',
    hebrewName: 'ברית',
    description: 'Covenantal terms, oaths, promises',
    color: '#4169E1'
  },
  HOLINESS: {
    name: 'Holiness/Sacred',
    hebrewName: 'קדושה',
    description: 'Sacred space, purity, consecration',
    color: '#9400D3'
  },
  SIN: {
    name: 'Sin/Transgression',
    hebrewName: 'חטא/עבירה',
    description: 'Sin, guilt, wrongdoing',
    color: '#8B0000'
  },
  SALVATION: {
    name: 'Salvation/Deliverance',
    hebrewName: 'ישועה/גאולה',
    description: 'Redemption, rescue, liberation',
    color: '#00CED1'
  },
  WORSHIP: {
    name: 'Worship/Ritual',
    hebrewName: 'עבודה/פולחן',
    description: 'Sacrifices, offerings, temple service',
    color: '#FF8C00'
  },
  LAW: {
    name: 'Law/Commandment',
    hebrewName: 'תורה/מצווה',
    description: 'Legal terms, statutes, judgments',
    color: '#708090'
  },
  WISDOM: {
    name: 'Wisdom/Knowledge',
    hebrewName: 'חכמה/דעת',
    description: 'Wisdom literature terms, understanding',
    color: '#20B2AA'
  },
  EMOTION: {
    name: 'Emotion/Feeling',
    hebrewName: 'רגש',
    description: 'Emotional states, psychological terms',
    color: '#FF69B4'
  },
  SOCIAL: {
    name: 'Social Relations',
    hebrewName: 'יחסים חברתיים',
    description: 'Family, community, social structures',
    color: '#FFA500'
  },
  WARFARE: {
    name: 'Warfare/Conflict',
    hebrewName: 'מלחמה',
    description: 'Military terms, conflict, victory',
    color: '#B22222'
  },
  KINGSHIP: {
    name: 'Kingship/Authority',
    hebrewName: 'מלכות/שלטון',
    description: 'Royal terms, governance, power',
    color: '#800080'
  },
  PROPHECY: {
    name: 'Prophecy/Vision',
    hebrewName: 'נבואה/חזון',
    description: 'Prophetic terms, revelation, vision',
    color: '#4B0082'
  },
  TIME: {
    name: 'Time/Season',
    hebrewName: 'זמן/עת',
    description: 'Temporal terms, festivals, seasons',
    color: '#2F4F4F'
  },
  SPACE: {
    name: 'Space/Place',
    hebrewName: 'מקום/מרחב',
    description: 'Geographical terms, directions, locations',
    color: '#556B2F'
  },
  COMMUNICATION: {
    name: 'Speech/Communication',
    hebrewName: 'דיבור/תקשורת',
    description: 'Speaking, blessing, cursing',
    color: '#6495ED'
  },
  ETHICS: {
    name: 'Ethics/Morality',
    hebrewName: 'מוסר/מידות',
    description: 'Righteous, wicked, justice',
    color: '#DAA520'
  },
  LIFE_DEATH: {
    name: 'Life/Death',
    hebrewName: 'חיים/מוות',
    description: 'Existence, mortality, afterlife concepts',
    color: '#2E8B57'
  }
};

/**
 * HEBREW VOCABULARY WITH SEMANTIC FIELDS
 * Each word includes: root, meaning, domain(s), synonyms, antonyms, cognates
 */
export const VOCABULARY = {
  // ========== DIVINE/DEITY DOMAIN ==========
  'אלהים': {
    root: 'אלה',
    meanings: ['God', 'gods', 'divine beings', 'judges'],
    primaryDomain: 'DEITY',
    secondaryDomains: ['KINGSHIP'],
    synonyms: ['יהוה', 'אל', 'שדי', 'אדני', 'עליון'],
    relatedTerms: ['אלוה', 'אלהות'],
    frequency: 2602,
    notes: 'Plural form used for singular God (plural of majesty)'
  },
  'יהוה': {
    root: 'הוה',
    meanings: ['LORD', 'YHWH', 'the Eternal', 'I AM'],
    primaryDomain: 'DEITY',
    synonyms: ['אלהים', 'אדני', 'השם'],
    frequency: 6828,
    notes: 'Tetragrammaton - the personal name of God'
  },
  'אל': {
    root: 'אל',
    meanings: ['God', 'mighty one', 'power'],
    primaryDomain: 'DEITY',
    synonyms: ['אלהים', 'שדי'],
    cognates: ['Akkadian: ilu', 'Ugaritic: il'],
    frequency: 236,
    notes: 'Often used in compound names (El Shaddai, El Elyon)'
  },
  'שדי': {
    root: 'שדד',
    meanings: ['Almighty', 'All-Sufficient'],
    primaryDomain: 'DEITY',
    synonyms: ['אל', 'אלהים'],
    frequency: 48,
    notes: 'Often paired with El (El Shaddai)'
  },
  'קדוש': {
    root: 'קדש',
    meanings: ['holy', 'sacred', 'set apart'],
    primaryDomain: 'HOLINESS',
    secondaryDomains: ['DEITY'],
    synonyms: ['טהור'],
    antonyms: ['חול', 'טמא'],
    frequency: 116,
    notes: 'Primary term for divine separateness'
  },

  // ========== COVENANT DOMAIN ==========
  'ברית': {
    root: 'ברת',
    meanings: ['covenant', 'treaty', 'agreement'],
    primaryDomain: 'COVENANT',
    secondaryDomains: ['LAW', 'SOCIAL'],
    relatedTerms: ['אות', 'עדות', 'שבועה'],
    frequency: 287,
    notes: 'Central theological concept - divine-human relationship'
  },
  'חסד': {
    root: 'חסד',
    meanings: ['lovingkindness', 'steadfast love', 'covenant loyalty', 'mercy'],
    primaryDomain: 'COVENANT',
    secondaryDomains: ['EMOTION', 'ETHICS'],
    synonyms: ['רחמים', 'אהבה'],
    antonyms: ['חמס'],
    frequency: 248,
    notes: 'Often paired with אמת (truth/faithfulness)'
  },
  'אמת': {
    root: 'אמן',
    meanings: ['truth', 'faithfulness', 'reliability'],
    primaryDomain: 'COVENANT',
    secondaryDomains: ['ETHICS', 'COMMUNICATION'],
    synonyms: ['אמונה', 'נאמן'],
    antonyms: ['שקר', 'כזב'],
    frequency: 127,
    notes: 'Root of "Amen" - emphasizes reliability and trustworthiness'
  },
  'שבועה': {
    root: 'שבע',
    meanings: ['oath', 'sworn promise'],
    primaryDomain: 'COVENANT',
    secondaryDomains: ['COMMUNICATION'],
    relatedTerms: ['נדר', 'ברית'],
    frequency: 30,
    notes: 'Binding verbal commitment'
  },

  // ========== SIN/TRANSGRESSION DOMAIN ==========
  'חטא': {
    root: 'חטא',
    meanings: ['sin', 'miss the mark', 'offense'],
    primaryDomain: 'SIN',
    synonyms: ['עון', 'פשע', 'אשם'],
    antonyms: ['צדק', 'זכה'],
    frequency: 595,
    notes: 'Most common term for sin - implies missing target'
  },
  'עון': {
    root: 'עוה',
    meanings: ['iniquity', 'guilt', 'punishment for guilt'],
    primaryDomain: 'SIN',
    synonyms: ['חטא', 'פשע'],
    frequency: 231,
    notes: 'Emphasizes distortion/perversion of what is right'
  },
  'פשע': {
    root: 'פשע',
    meanings: ['transgression', 'rebellion', 'revolt'],
    primaryDomain: 'SIN',
    synonyms: ['חטא', 'מרי'],
    frequency: 136,
    notes: 'Emphasizes willful rebellion against authority'
  },
  'אשם': {
    root: 'אשם',
    meanings: ['guilt', 'guilt offering', 'trespass'],
    primaryDomain: 'SIN',
    secondaryDomains: ['WORSHIP'],
    synonyms: ['עון'],
    frequency: 46,
    notes: 'Both the state of guilt and the offering to remove it'
  },
  'טמא': {
    root: 'טמא',
    meanings: ['unclean', 'impure', 'defiled'],
    primaryDomain: 'HOLINESS',
    secondaryDomains: ['SIN'],
    antonyms: ['טהור', 'קדוש'],
    frequency: 162,
    notes: 'Ritual impurity - opposite of holiness'
  },

  // ========== SALVATION/REDEMPTION DOMAIN ==========
  'ישע': {
    root: 'ישע',
    meanings: ['salvation', 'deliverance', 'victory'],
    primaryDomain: 'SALVATION',
    synonyms: ['גאל', 'פדה', 'נצל'],
    relatedTerms: ['ישועה', 'מושיע'],
    frequency: 205,
    notes: 'Root of names Joshua/Jesus (Yeshua)'
  },
  'גאל': {
    root: 'גאל',
    meanings: ['redeem', 'act as kinsman-redeemer', 'avenge'],
    primaryDomain: 'SALVATION',
    secondaryDomains: ['SOCIAL'],
    synonyms: ['פדה', 'ישע'],
    frequency: 104,
    notes: 'Legal/family redemption - kinsman-redeemer concept'
  },
  'פדה': {
    root: 'פדה',
    meanings: ['ransom', 'redeem', 'rescue'],
    primaryDomain: 'SALVATION',
    synonyms: ['גאל', 'ישע'],
    frequency: 59,
    notes: 'Redemption through payment of price'
  },
  'נצל': {
    root: 'נצל',
    meanings: ['deliver', 'rescue', 'snatch away'],
    primaryDomain: 'SALVATION',
    synonyms: ['ישע', 'מלט'],
    frequency: 213,
    notes: 'Physical rescue from danger'
  },

  // ========== RIGHTEOUSNESS/ETHICS DOMAIN ==========
  'צדק': {
    root: 'צדק',
    meanings: ['righteousness', 'justice', 'rightness'],
    primaryDomain: 'ETHICS',
    secondaryDomains: ['LAW'],
    synonyms: ['משפט', 'ישר'],
    antonyms: ['רשע', 'עול'],
    frequency: 523,
    notes: 'Both ethical righteousness and legal justice'
  },
  'רשע': {
    root: 'רשע',
    meanings: ['wicked', 'guilty', 'criminal'],
    primaryDomain: 'ETHICS',
    antonyms: ['צדיק', 'ישר', 'תמים'],
    frequency: 264,
    notes: 'Opposite of צדיק in wisdom literature'
  },
  'משפט': {
    root: 'שפט',
    meanings: ['judgment', 'justice', 'ordinance', 'court case'],
    primaryDomain: 'LAW',
    secondaryDomains: ['ETHICS'],
    synonyms: ['דין', 'צדק'],
    frequency: 425,
    notes: 'Both the act of judging and the resulting verdict'
  },
  'ישר': {
    root: 'ישר',
    meanings: ['upright', 'straight', 'level'],
    primaryDomain: 'ETHICS',
    synonyms: ['צדיק', 'תמים'],
    antonyms: ['עקש'],
    frequency: 119,
    notes: 'Moral straightness/integrity'
  },
  'תמים': {
    root: 'תמם',
    meanings: ['complete', 'perfect', 'blameless', 'whole'],
    primaryDomain: 'ETHICS',
    secondaryDomains: ['WORSHIP'],
    synonyms: ['ישר', 'צדיק'],
    frequency: 91,
    notes: 'Used for Noah, Abraham - wholeness/integrity'
  },

  // ========== WISDOM DOMAIN ==========
  'חכמה': {
    root: 'חכם',
    meanings: ['wisdom', 'skill', 'prudence'],
    primaryDomain: 'WISDOM',
    synonyms: ['בינה', 'דעת', 'שכל'],
    antonyms: ['אולת', 'כסילות'],
    frequency: 153,
    notes: 'Central concept in wisdom literature'
  },
  'בינה': {
    root: 'בין',
    meanings: ['understanding', 'insight', 'discernment'],
    primaryDomain: 'WISDOM',
    synonyms: ['חכמה', 'תבונה'],
    frequency: 38,
    notes: 'Ability to distinguish and discern'
  },
  'דעת': {
    root: 'ידע',
    meanings: ['knowledge', 'perception', 'awareness'],
    primaryDomain: 'WISDOM',
    synonyms: ['חכמה', 'שכל'],
    frequency: 93,
    notes: 'Includes experiential/relational knowledge'
  },
  'מוסר': {
    root: 'יסר',
    meanings: ['discipline', 'instruction', 'correction'],
    primaryDomain: 'WISDOM',
    secondaryDomains: ['ETHICS'],
    synonyms: ['תוכחת'],
    frequency: 50,
    notes: 'Both teaching and correction/discipline'
  },

  // ========== WORSHIP/RITUAL DOMAIN ==========
  'קרבן': {
    root: 'קרב',
    meanings: ['offering', 'sacrifice', 'gift'],
    primaryDomain: 'WORSHIP',
    relatedTerms: ['עלה', 'זבח', 'מנחה', 'שלמים', 'חטאת', 'אשם'],
    frequency: 80,
    notes: 'Generic term for sacrifice - "that which is brought near"'
  },
  'עלה': {
    root: 'עלה',
    meanings: ['burnt offering', 'whole offering'],
    primaryDomain: 'WORSHIP',
    relatedTerms: ['קרבן', 'זבח'],
    frequency: 286,
    notes: 'Completely consumed on altar - ascends to God'
  },
  'זבח': {
    root: 'זבח',
    meanings: ['sacrifice', 'slaughter', 'feast'],
    primaryDomain: 'WORSHIP',
    relatedTerms: ['קרבן', 'שלמים'],
    frequency: 162,
    notes: 'Animal sacrifice involving communal meal'
  },
  'כהן': {
    root: 'כהן',
    meanings: ['priest', 'minister'],
    primaryDomain: 'WORSHIP',
    secondaryDomains: ['SOCIAL'],
    relatedTerms: ['לוי', 'כהונה'],
    frequency: 750,
    notes: 'Aaronic priesthood - mediators between God and people'
  },
  'מזבח': {
    root: 'זבח',
    meanings: ['altar', 'place of sacrifice'],
    primaryDomain: 'WORSHIP',
    relatedTerms: ['קרבן', 'זבח'],
    frequency: 403,
    notes: 'Place where sacrifices are offered'
  },

  // ========== CREATION/NATURE DOMAIN ==========
  'ברא': {
    root: 'ברא',
    meanings: ['create', 'shape', 'form'],
    primaryDomain: 'CREATION',
    secondaryDomains: ['DEITY'],
    synonyms: ['יצר', 'עשה'],
    frequency: 54,
    notes: 'Used exclusively with God as subject - creation ex nihilo'
  },
  'שמים': {
    root: 'שמם',
    meanings: ['heaven(s)', 'sky', 'celestial realm'],
    primaryDomain: 'CREATION',
    secondaryDomains: ['SPACE'],
    relatedTerms: ['ארץ', 'רקיע'],
    frequency: 421,
    notes: 'Always plural in Hebrew - both physical sky and divine dwelling'
  },
  'ארץ': {
    root: 'ארץ',
    meanings: ['earth', 'land', 'ground', 'country'],
    primaryDomain: 'CREATION',
    secondaryDomains: ['SPACE'],
    relatedTerms: ['אדמה', 'שדה'],
    frequency: 2505,
    notes: 'Both the planet and specific territories'
  },
  'נפש': {
    root: 'נפש',
    meanings: ['soul', 'life', 'self', 'breath', 'person'],
    primaryDomain: 'HUMANITY',
    secondaryDomains: ['LIFE_DEATH'],
    synonyms: ['רוח', 'לב'],
    frequency: 755,
    notes: 'Whole living being, not just spiritual part'
  },
  'רוח': {
    root: 'רוח',
    meanings: ['spirit', 'wind', 'breath'],
    primaryDomain: 'DEITY',
    secondaryDomains: ['CREATION', 'HUMANITY'],
    synonyms: ['נשמה', 'נפש'],
    frequency: 378,
    notes: 'Divine spirit, human spirit, or natural wind'
  },

  // ========== SOCIAL/FAMILY DOMAIN ==========
  'אב': {
    root: 'אב',
    meanings: ['father', 'ancestor', 'patriarch'],
    primaryDomain: 'SOCIAL',
    relatedTerms: ['אם', 'בן', 'בת', 'אח'],
    frequency: 1191,
    notes: 'Head of household, also used for God'
  },
  'בן': {
    root: 'בן',
    meanings: ['son', 'child', 'member of group'],
    primaryDomain: 'SOCIAL',
    relatedTerms: ['אב', 'אח', 'בת'],
    frequency: 4929,
    notes: 'Used in compound expressions (ben adam = human)'
  },
  'עם': {
    root: 'עם',
    meanings: ['people', 'nation', 'kinfolk'],
    primaryDomain: 'SOCIAL',
    synonyms: ['גוי', 'לאום'],
    frequency: 1868,
    notes: 'Often specifically Israel as God\'s people'
  },
  'גוי': {
    root: 'גוי',
    meanings: ['nation', 'people', 'gentiles'],
    primaryDomain: 'SOCIAL',
    synonyms: ['עם', 'לאום'],
    frequency: 567,
    notes: 'Used for Israel and other nations'
  },

  // ========== KINGSHIP/AUTHORITY DOMAIN ==========
  'מלך': {
    root: 'מלך',
    meanings: ['king', 'reign', 'rule'],
    primaryDomain: 'KINGSHIP',
    relatedTerms: ['מלכות', 'משח'],
    frequency: 2523,
    notes: 'Human kings and divine kingship'
  },
  'משח': {
    root: 'משח',
    meanings: ['anoint', 'consecrate'],
    primaryDomain: 'KINGSHIP',
    secondaryDomains: ['WORSHIP', 'HOLINESS'],
    relatedTerms: ['משיח', 'מלך'],
    frequency: 69,
    notes: 'Root of "Messiah" (anointed one)'
  },
  'עבד': {
    root: 'עבד',
    meanings: ['servant', 'slave', 'worship', 'serve'],
    primaryDomain: 'SOCIAL',
    secondaryDomains: ['WORSHIP', 'KINGSHIP'],
    relatedTerms: ['עבודה'],
    frequency: 799,
    notes: 'Both human servitude and divine service'
  },

  // ========== PROPHECY DOMAIN ==========
  'נביא': {
    root: 'נבא',
    meanings: ['prophet', 'spokesperson'],
    primaryDomain: 'PROPHECY',
    relatedTerms: ['חזון', 'ראה', 'דבר'],
    frequency: 317,
    notes: 'One who speaks for God'
  },
  'חזון': {
    root: 'חזה',
    meanings: ['vision', 'revelation', 'oracle'],
    primaryDomain: 'PROPHECY',
    synonyms: ['מראה', 'חלום'],
    frequency: 35,
    notes: 'Prophetic vision or revelation'
  },
  'דבר': {
    root: 'דבר',
    meanings: ['word', 'thing', 'matter', 'speak'],
    primaryDomain: 'COMMUNICATION',
    secondaryDomains: ['PROPHECY'],
    relatedTerms: ['אמר', 'מלה'],
    frequency: 2555,
    notes: '"Word of the LORD" - prophetic formula'
  },

  // ========== EMOTION DOMAIN ==========
  'אהבה': {
    root: 'אהב',
    meanings: ['love', 'affection', 'devotion'],
    primaryDomain: 'EMOTION',
    secondaryDomains: ['COVENANT'],
    synonyms: ['חשק', 'רחם'],
    antonyms: ['שנא'],
    frequency: 40,
    notes: 'Divine and human love'
  },
  'יראה': {
    root: 'ירא',
    meanings: ['fear', 'awe', 'reverence'],
    primaryDomain: 'EMOTION',
    secondaryDomains: ['WORSHIP', 'WISDOM'],
    relatedTerms: ['פחד', 'חרד'],
    frequency: 45,
    notes: '"Fear of the LORD" - fundamental wisdom concept'
  },
  'רחמים': {
    root: 'רחם',
    meanings: ['compassion', 'mercy', 'womb'],
    primaryDomain: 'EMOTION',
    secondaryDomains: ['COVENANT'],
    synonyms: ['חסד', 'חנן'],
    frequency: 44,
    notes: 'Womb-love - deep maternal compassion'
  },
  'שמחה': {
    root: 'שמח',
    meanings: ['joy', 'gladness', 'rejoicing'],
    primaryDomain: 'EMOTION',
    synonyms: ['גיל', 'ששון'],
    antonyms: ['אבל', 'עצב'],
    frequency: 94,
    notes: 'Joy in worship and festivals'
  }
};

// =============================================================================
// SEMANTIC ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Get word with full semantic data
 */
export const getWordSemantics = (word) => {
  const cleanWord = stripAllDiacritics(word);
  return VOCABULARY[cleanWord] || null;
};

/**
 * Get all words in a semantic domain
 */
export const getWordsByDomain = (domainKey) => {
  return Object.entries(VOCABULARY)
    .filter(([_, data]) =>
      data.primaryDomain === domainKey ||
      (data.secondaryDomains || []).includes(domainKey)
    )
    .map(([word, data]) => ({
      word,
      ...data,
      isPrimary: data.primaryDomain === domainKey
    }))
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
};

/**
 * Get synonyms for a word
 */
export const getSynonyms = (word) => {
  const cleanWord = stripAllDiacritics(word);
  const wordData = VOCABULARY[cleanWord];

  if (!wordData || !wordData.synonyms) return [];

  return wordData.synonyms
    .map(syn => ({
      word: syn,
      ...VOCABULARY[syn]
    }))
    .filter(s => s.root); // Only return words in our database
};

/**
 * Get antonyms for a word
 */
export const getAntonyms = (word) => {
  const cleanWord = stripAllDiacritics(word);
  const wordData = VOCABULARY[cleanWord];

  if (!wordData || !wordData.antonyms) return [];

  return wordData.antonyms
    .map(ant => ({
      word: ant,
      ...VOCABULARY[ant]
    }))
    .filter(a => a.root);
};

/**
 * Get semantically related words (same domain)
 */
export const getRelatedWords = (word, limit = 10) => {
  const cleanWord = stripAllDiacritics(word);
  const wordData = VOCABULARY[cleanWord];

  if (!wordData) return [];

  // Get words from same primary domain
  const domain = wordData.primaryDomain;
  const related = getWordsByDomain(domain)
    .filter(w => w.word !== cleanWord)
    .slice(0, limit);

  return related;
};

/**
 * Analyze semantic content of a text passage
 */
export const analyzePassageSemantics = (hebrewText) => {
  const words = hebrewText.split(/[\s\u05BE]+/);
  const domains = {};
  const foundWords = [];

  for (const word of words) {
    const cleanWord = stripAllDiacritics(word).replace(/[^\u0590-\u05FF]/g, '');
    const wordData = VOCABULARY[cleanWord];

    if (wordData) {
      foundWords.push({ word: cleanWord, ...wordData });

      // Count domains
      const domain = wordData.primaryDomain;
      domains[domain] = (domains[domain] || 0) + 1;

      // Count secondary domains
      (wordData.secondaryDomains || []).forEach(d => {
        domains[d] = (domains[d] || 0) + 0.5; // Half weight for secondary
      });
    }
  }

  // Sort domains by frequency
  const sortedDomains = Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      ...SEMANTIC_DOMAINS[key],
      count
    }));

  return {
    totalWords: words.length,
    analyzedWords: foundWords.length,
    coverage: foundWords.length / words.length,
    dominantDomains: sortedDomains.slice(0, 5),
    allDomains: sortedDomains,
    foundWords
  };
};

/**
 * Get domain information
 */
export const getDomain = (domainKey) => {
  return SEMANTIC_DOMAINS[domainKey] || null;
};

/**
 * Get all domains
 */
export const getAllDomains = () => {
  return Object.entries(SEMANTIC_DOMAINS).map(([key, data]) => ({
    key,
    ...data,
    wordCount: getWordsByDomain(key).length
  }));
};

/**
 * Search vocabulary by meaning
 */
export const searchByMeaning = (query, limit = 20) => {
  const q = query.toLowerCase();

  return Object.entries(VOCABULARY)
    .filter(([_, data]) =>
      data.meanings.some(m => m.toLowerCase().includes(q)) ||
      (data.notes || '').toLowerCase().includes(q)
    )
    .map(([word, data]) => ({ word, ...data }))
    .slice(0, limit);
};

// =============================================================================
// EXPORT
// =============================================================================

const semanticFieldService = {
  SEMANTIC_DOMAINS,
  VOCABULARY,
  getWordSemantics,
  getWordsByDomain,
  getSynonyms,
  getAntonyms,
  getRelatedWords,
  analyzePassageSemantics,
  getDomain,
  getAllDomains,
  searchByMeaning
};

export default semanticFieldService;
