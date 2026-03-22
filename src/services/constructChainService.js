/**
 * Construct Chain Analyzer (סמיכות) - Hebrew Grammar Service
 *
 * Analyzes Hebrew construct chains (סמיכות/smichut) which are
 * noun-noun relationships indicating possession, association, or attribution.
 *
 * Example: בֵּית־דָּוִד = House of David (construct + absolute)
 */

// Construct state patterns - how nouns change in construct
const CONSTRUCT_PATTERNS = {
  // Masculine singular patterns
  MASC_SING: {
    absolute: /ה$/, // ends with ה (like בַּיִת)
    construct: 'drops final vowel or changes', // בֵּית
    examples: ['בַּיִת → בֵּית', 'מֶלֶךְ → מֶלֶךְ', 'דָּבָר → דְּבַר']
  },

  // Masculine plural patterns
  MASC_PLUR: {
    absolute: /ים$/, // -im ending
    construct: /י$/, // -ey ending
    examples: ['בָּתִּים → בָּתֵּי', 'מְלָכִים → מַלְכֵי', 'דְּבָרִים → דִּבְרֵי']
  },

  // Feminine singular patterns
  FEM_SING: {
    absolute: /ה$/, // -ah ending
    construct: /ת$/, // -at ending
    examples: ['תּוֹרָה → תּוֹרַת', 'מִצְוָה → מִצְוַת', 'בְּרָכָה → בִּרְכַּת']
  },

  // Feminine plural patterns
  FEM_PLUR: {
    absolute: /וֹת$/, // -ot ending
    construct: /וֹת$/, // stays -ot
    examples: ['תּוֹרוֹת → תּוֹרוֹת', 'מִצְווֹת → מִצְוֹת', 'בְּרָכוֹת → בִּרְכוֹת']
  },

  // Dual patterns
  DUAL: {
    absolute: /ַיִם$/, // -ayim ending
    construct: /ֵי$/, // -ey ending
    examples: ['יָדַיִם → יְדֵי', 'עֵינַיִם → עֵינֵי', 'רַגְלַיִם → רַגְלֵי']
  }
};

// Common construct chain vocabulary with parsing
const COMMON_CONSTRUCTS = {
  // Divine/Religious
  'בֵּית ה׳': { parsed: 'House of the LORD', chain: ['בֵּית', 'ה׳'], type: 'sacred_place' },
  'בֵּית הַמִּקְדָּשׁ': { parsed: 'House of the Sanctuary', chain: ['בֵּית', 'הַמִּקְדָּשׁ'], type: 'sacred_place' },
  'אֶרֶץ יִשְׂרָאֵל': { parsed: 'Land of Israel', chain: ['אֶרֶץ', 'יִשְׂרָאֵל'], type: 'geography' },
  'תּוֹרַת מֹשֶׁה': { parsed: 'Torah of Moses', chain: ['תּוֹרַת', 'מֹשֶׁה'], type: 'sacred_text' },
  'בְּרִית ה׳': { parsed: 'Covenant of the LORD', chain: ['בְּרִית', 'ה׳'], type: 'covenant' },
  'עֲבוֹדַת ה׳': { parsed: 'Service of the LORD', chain: ['עֲבוֹדַת', 'ה׳'], type: 'worship' },
  'כְּבוֹד ה׳': { parsed: 'Glory of the LORD', chain: ['כְּבוֹד', 'ה׳'], type: 'divine_attribute' },
  'יִרְאַת ה׳': { parsed: 'Fear of the LORD', chain: ['יִרְאַת', 'ה׳'], type: 'religious_virtue' },
  'דְּבַר ה׳': { parsed: 'Word of the LORD', chain: ['דְּבַר', 'ה׳'], type: 'prophecy' },
  'רוּחַ ה׳': { parsed: 'Spirit of the LORD', chain: ['רוּחַ', 'ה׳'], type: 'divine_attribute' },
  'יַד ה׳': { parsed: 'Hand of the LORD', chain: ['יַד', 'ה׳'], type: 'divine_action' },
  'מַלְאַךְ ה׳': { parsed: 'Angel of the LORD', chain: ['מַלְאַךְ', 'ה׳'], type: 'divine_messenger' },
  'עֵץ הַחַיִּים': { parsed: 'Tree of Life', chain: ['עֵץ', 'הַחַיִּים'], type: 'sacred_object' },
  'עֵץ הַדַּעַת': { parsed: 'Tree of Knowledge', chain: ['עֵץ', 'הַדַּעַת'], type: 'sacred_object' },
  'גַּן עֵדֶן': { parsed: 'Garden of Eden', chain: ['גַּן', 'עֵדֶן'], type: 'sacred_place' },
  'קֹדֶשׁ הַקֳּדָשִׁים': { parsed: 'Holy of Holies', chain: ['קֹדֶשׁ', 'הַקֳּדָשִׁים'], type: 'sacred_place' },
  'אֲרוֹן הַבְּרִית': { parsed: 'Ark of the Covenant', chain: ['אֲרוֹן', 'הַבְּרִית'], type: 'sacred_object' },
  'לוּחֹת הַבְּרִית': { parsed: 'Tablets of the Covenant', chain: ['לוּחֹת', 'הַבְּרִית'], type: 'sacred_object' },

  // Royal/Political
  'בֵּית דָּוִד': { parsed: 'House of David', chain: ['בֵּית', 'דָּוִד'], type: 'dynasty' },
  'מֶלֶךְ יִשְׂרָאֵל': { parsed: 'King of Israel', chain: ['מֶלֶךְ', 'יִשְׂרָאֵל'], type: 'royal_title' },
  'מֶלֶךְ יְהוּדָה': { parsed: 'King of Judah', chain: ['מֶלֶךְ', 'יְהוּדָה'], type: 'royal_title' },
  'מַלְכוּת שָׁמַיִם': { parsed: 'Kingdom of Heaven', chain: ['מַלְכוּת', 'שָׁמַיִם'], type: 'religious_concept' },
  'כִּסֵּא דָוִד': { parsed: 'Throne of David', chain: ['כִּסֵּא', 'דָּוִד'], type: 'royal_symbol' },
  'עִיר דָּוִד': { parsed: 'City of David', chain: ['עִיר', 'דָּוִד'], type: 'geography' },
  'שַׂר הַצָּבָא': { parsed: 'Commander of the Army', chain: ['שַׂר', 'הַצָּבָא'], type: 'military_title' },

  // Family/Genealogical
  'בֵּית אָב': { parsed: 'Father\'s house / Patrilineage', chain: ['בֵּית', 'אָב'], type: 'family' },
  'בְּנֵי יִשְׂרָאֵל': { parsed: 'Children of Israel', chain: ['בְּנֵי', 'יִשְׂרָאֵל'], type: 'nation' },
  'בְּנֵי אַהֲרֹן': { parsed: 'Sons of Aaron', chain: ['בְּנֵי', 'אַהֲרֹן'], type: 'priestly_line' },
  'בְּנֵי לֵוִי': { parsed: 'Sons of Levi', chain: ['בְּנֵי', 'לֵוִי'], type: 'levitical_line' },
  'זֶרַע אַבְרָהָם': { parsed: 'Seed of Abraham', chain: ['זֶרַע', 'אַבְרָהָם'], type: 'lineage' },
  'שֵׁבֶט יְהוּדָה': { parsed: 'Tribe of Judah', chain: ['שֵׁבֶט', 'יְהוּדָה'], type: 'tribe' },
  'מִשְׁפַּחַת בֵּית אָב': { parsed: 'Clan of the Father\'s House', chain: ['מִשְׁפַּחַת', 'בֵּית', 'אָב'], type: 'extended_family' },

  // Body/Person
  'לֵב אָדָם': { parsed: 'Heart of man', chain: ['לֵב', 'אָדָם'], type: 'body_metaphor' },
  'רוּחַ אָדָם': { parsed: 'Spirit of man', chain: ['רוּחַ', 'אָדָם'], type: 'body_metaphor' },
  'נֶפֶשׁ חַיָּה': { parsed: 'Living soul', chain: ['נֶפֶשׁ', 'חַיָּה'], type: 'body_soul' },
  'יְדֵי מֹשֶׁה': { parsed: 'Hands of Moses', chain: ['יְדֵי', 'מֹשֶׁה'], type: 'body_person' },
  'פִּי ה׳': { parsed: 'Mouth of the LORD', chain: ['פִּי', 'ה׳'], type: 'anthropomorphism' },
  'עֵינֵי ה׳': { parsed: 'Eyes of the LORD', chain: ['עֵינֵי', 'ה׳'], type: 'anthropomorphism' },
  'אָזְנֵי ה׳': { parsed: 'Ears of the LORD', chain: ['אָזְנֵי', 'ה׳'], type: 'anthropomorphism' },

  // Time
  'יְמֵי קֶדֶם': { parsed: 'Days of old', chain: ['יְמֵי', 'קֶדֶם'], type: 'time' },
  'יוֹם ה׳': { parsed: 'Day of the LORD', chain: ['יוֹם', 'ה׳'], type: 'eschatology' },
  'אַחֲרִית הַיָּמִים': { parsed: 'End of Days', chain: ['אַחֲרִית', 'הַיָּמִים'], type: 'eschatology' },
  'רֵאשִׁית הַשָּׁנָה': { parsed: 'Beginning of the Year', chain: ['רֵאשִׁית', 'הַשָּׁנָה'], type: 'calendar' },
  'שַׁבַּת שַׁבָּתוֹן': { parsed: 'Sabbath of Sabbaths', chain: ['שַׁבַּת', 'שַׁבָּתוֹן'], type: 'superlative' },

  // Superlatives (construct with same root)
  'שִׁיר הַשִּׁירִים': { parsed: 'Song of Songs (Greatest Song)', chain: ['שִׁיר', 'הַשִּׁירִים'], type: 'superlative' },
  'מֶלֶךְ הַמְּלָכִים': { parsed: 'King of Kings', chain: ['מֶלֶךְ', 'הַמְּלָכִים'], type: 'superlative' },
  'אֱלֹהֵי הָאֱלֹהִים': { parsed: 'God of gods', chain: ['אֱלֹהֵי', 'הָאֱלֹהִים'], type: 'superlative' },
  'אֲדֹנֵי הָאֲדֹנִים': { parsed: 'Lord of lords', chain: ['אֲדֹנֵי', 'הָאֲדֹנִים'], type: 'superlative' },
  'עֶבֶד עֲבָדִים': { parsed: 'Slave of slaves (lowest slave)', chain: ['עֶבֶד', 'עֲבָדִים'], type: 'superlative' },
  'הֶבֶל הֲבָלִים': { parsed: 'Vanity of vanities (utter vanity)', chain: ['הֶבֶל', 'הֲבָלִים'], type: 'superlative' }
};

// Chain types and their semantic functions
const CHAIN_TYPES = {
  possession: 'Indicates ownership or belonging',
  attribution: 'Describes a quality or characteristic',
  partitive: 'Part of a whole',
  material: 'Made of or consisting of',
  origin: 'Source or place of origin',
  purpose: 'Intended use or function',
  superlative: 'Intensification (X of X-plural)',
  epexegetical: 'Explanatory (the X which is Y)'
};

/**
 * Analyze a construct chain
 * @param {string} hebrewPhrase - Hebrew phrase to analyze
 * @returns {Object} Analysis results
 */
export const analyzeConstructChain = (hebrewPhrase) => {
  // Clean the phrase
  const cleaned = hebrewPhrase.trim();

  // Check if it's a known construct
  const known = COMMON_CONSTRUCTS[cleaned];
  if (known) {
    return {
      phrase: cleaned,
      isConstruct: true,
      known: true,
      parsed: known.parsed,
      chain: known.chain,
      type: known.type,
      chainLength: known.chain.length,
      nomen_regens: known.chain[0], // construct noun (governing)
      nomen_rectum: known.chain.slice(1).join(' '), // absolute noun(s) (governed)
      semanticFunction: getSemanticFunction(known.type)
    };
  }

  // Try to detect construct patterns
  const detection = detectConstructPattern(cleaned);
  return {
    phrase: cleaned,
    isConstruct: detection.isLikelyConstruct,
    known: false,
    possibleType: detection.possibleType,
    confidence: detection.confidence,
    explanation: detection.explanation
  };
};

/**
 * Detect construct patterns in unknown phrases
 */
function detectConstructPattern(phrase) {
  const words = phrase.split(/[\s־]+/);

  if (words.length < 2) {
    return {
      isLikelyConstruct: false,
      confidence: 0,
      explanation: 'Single word - not a construct chain'
    };
  }

  const firstWord = words[0];
  let confidence = 0;
  let possibleType = 'unknown';
  const indicators = [];

  // Check for construct endings on first word
  if (/ֵי$/.test(firstWord)) {
    confidence += 40;
    indicators.push('First word has -ey ending (construct plural)');
    possibleType = 'possession';
  }

  if (/ַת$/.test(firstWord)) {
    confidence += 40;
    indicators.push('First word has -at ending (feminine construct)');
    possibleType = 'possession';
  }

  // Check for definite article on second word (common pattern)
  if (words.length > 1 && /^הַ|^הָ|^הֶ/.test(words[1])) {
    confidence += 20;
    indicators.push('Second word has definite article');
  }

  // Check for proper noun as second element
  if (words.length > 1 && /^[A-Z]/.test(transliterateStart(words[words.length - 1]))) {
    confidence += 15;
    indicators.push('Chain ends with proper noun');
    possibleType = 'attribution';
  }

  // Check for superlative pattern (X of X-plural)
  if (words.length === 2) {
    const root1 = extractRoot(words[0]);
    const root2 = extractRoot(words[1]);
    if (root1 && root1 === root2) {
      confidence += 30;
      indicators.push('Same root repeated - superlative pattern');
      possibleType = 'superlative';
    }
  }

  return {
    isLikelyConstruct: confidence > 30,
    confidence: Math.min(100, confidence),
    possibleType,
    explanation: indicators.length > 0
      ? indicators.join('; ')
      : 'No clear construct indicators found'
  };
}

/**
 * Get the semantic function description for a chain type
 */
function getSemanticFunction(type) {
  const functions = {
    sacred_place: 'Location associated with the divine',
    sacred_text: 'Authoritative religious document',
    sacred_object: 'Object with religious significance',
    covenant: 'Binding agreement between God and people',
    worship: 'Acts of religious devotion',
    divine_attribute: 'Quality or aspect of God',
    religious_virtue: 'Moral quality in relation to God',
    prophecy: 'Divine communication through prophets',
    divine_action: 'God acting in the world',
    divine_messenger: 'Heavenly being serving God',
    dynasty: 'Royal family line',
    royal_title: 'Title of a king',
    royal_symbol: 'Object representing royal authority',
    military_title: 'Title of military leader',
    geography: 'Place or land',
    family: 'Family unit or lineage',
    nation: 'People group or nation',
    priestly_line: 'Descendants serving as priests',
    levitical_line: 'Descendants of Levi',
    lineage: 'Ancestral descent',
    tribe: 'One of the twelve tribes',
    extended_family: 'Larger family unit',
    body_metaphor: 'Body part as metaphor for inner quality',
    body_soul: 'Combination of physical and spiritual',
    body_person: 'Body part of a specific person',
    anthropomorphism: 'Human attribute applied to God',
    time: 'Temporal reference',
    eschatology: 'Related to end times',
    calendar: 'Calendar or festival reference',
    superlative: 'Intensified meaning (greatest, most)',
    religious_concept: 'Abstract religious idea'
  };
  return functions[type] || 'General construct relationship';
}

// Simple root extraction (basic)
function extractRoot(word) {
  // Remove common prefixes and suffixes
  let root = word
    .replace(/^[וּבְכְלְמְשֶׁהַהָהֶ]+/, '') // prefixes
    .replace(/[ִיםוֹתְָּ]+$/, ''); // suffixes

  // Return if at least 2 consonants
  const consonants = root.replace(/[ְַָּוֹיֳִֵַׇֻ]/g, '');
  return consonants.length >= 2 ? consonants : null;
}

// Simple transliteration for proper noun detection
function transliterateStart(word) {
  const firstChar = word[0];
  const map = {
    'א': 'A', 'ב': 'B', 'ג': 'G', 'ד': 'D', 'ה': 'H',
    'ו': 'V', 'ז': 'Z', 'ח': 'Ch', 'ט': 'T', 'י': 'Y',
    'כ': 'K', 'ל': 'L', 'מ': 'M', 'נ': 'N', 'ס': 'S',
    'ע': 'A', 'פ': 'P', 'צ': 'Tz', 'ק': 'K', 'ר': 'R',
    'ש': 'Sh', 'ת': 'T'
  };
  return map[firstChar] || firstChar;
}

/**
 * Get all constructs of a specific type
 * @param {string} type - Chain type
 * @returns {Object[]} Matching constructs
 */
export const getConstructsByType = (type) => {
  return Object.entries(COMMON_CONSTRUCTS)
    .filter(([, data]) => data.type === type)
    .map(([phrase, data]) => ({ phrase, ...data }));
};

/**
 * Get all chain types with counts
 * @returns {Object} Type statistics
 */
export const getChainTypeStats = () => {
  const stats = {};
  Object.values(COMMON_CONSTRUCTS).forEach(data => {
    stats[data.type] = (stats[data.type] || 0) + 1;
  });
  return stats;
};

/**
 * Find constructs containing a specific word
 * @param {string} word - Hebrew word to search
 * @returns {Object[]} Matching constructs
 */
export const findConstructsWithWord = (word) => {
  return Object.entries(COMMON_CONSTRUCTS)
    .filter(([phrase, data]) =>
      phrase.includes(word) || data.chain.some(w => w.includes(word))
    )
    .map(([phrase, data]) => ({ phrase, ...data }));
};

/**
 * Get construct chain parsing help
 * @returns {Object} Educational material
 */
export const getConstructHelp = () => ({
  definition: 'A construct chain (סמיכות) consists of two or more nouns where the first (nomen regens) is in the construct state and governs the following noun(s) (nomen rectum).',
  identification: [
    'The first noun (construct) loses its stress and definiteness',
    'Masculine plurals change from -im to -ey',
    'Feminine singulars change from -ah to -at',
    'Only the last noun can take the definite article',
    'The whole chain is either definite or indefinite as a unit'
  ],
  semanticRelationships: CHAIN_TYPES,
  patterns: CONSTRUCT_PATTERNS,
  examples: [
    { hebrew: 'סֵפֶר הַתּוֹרָה', english: 'The Book of the Torah', note: 'sefer (construct) + ha-Torah (absolute with article)' },
    { hebrew: 'בְּנֵי יִשְׂרָאֵל', english: 'Sons of Israel', note: 'bney (construct plural) + Yisrael (absolute proper noun)' },
    { hebrew: 'מֶלֶךְ מַלְכֵי הַמְּלָכִים', english: 'King of kings of kings', note: 'Triple chain (very rare)' }
  ]
});

export { CHAIN_TYPES, CONSTRUCT_PATTERNS };
