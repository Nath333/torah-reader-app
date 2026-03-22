/**
 * Word Relationship Service - PRO SCHOLAR v3
 *
 * Semantic relationship engine for Hebrew/Aramaic vocabulary learning.
 * Tracks and visualizes connections between words for deeper understanding.
 *
 * RELATIONSHIP TYPES:
 * - Root family (same shoresh)
 * - Synonyms (similar meaning)
 * - Antonyms (opposite meaning)
 * - Semantic field (related concepts)
 * - Collocations (frequently appear together)
 * - Derived forms (morphological relationships)
 * - Biblical pairs (hendiadys, merisms)
 */

// =============================================================================
// RELATIONSHIP TYPES
// =============================================================================

export const WORD_RELATIONSHIP_TYPES = {
  ROOT_FAMILY: 'root_family',      // Same Hebrew root (shoresh)
  SYNONYM: 'synonym',              // Similar meaning
  ANTONYM: 'antonym',              // Opposite meaning
  SEMANTIC_FIELD: 'semantic_field',// Conceptual category
  COLLOCATION: 'collocation',      // Frequently co-occur
  DERIVED: 'derived',              // Morphological derivation
  BIBLICAL_PAIR: 'biblical_pair',  // Hendiadys/merisms
  ARAMAIC_COGNATE: 'aramaic_cognate', // Hebrew-Aramaic cognates
  BORROWED: 'borrowed',            // Loanwords
  EUPHEMISM: 'euphemism',          // Euphemistic relationship
};

// =============================================================================
// SEMANTIC FIELDS (Categories of related words)
// =============================================================================

export const SEMANTIC_FIELDS = {
  CREATION: {
    id: 'creation',
    label: 'Creation',
    hebrewLabel: 'בריאה',
    words: ['בָּרָא', 'יָצַר', 'עָשָׂה', 'קָנָה', 'כּוֹנֵן', 'יָסַד'],
    description: 'Words related to creation and making',
  },
  HOLINESS: {
    id: 'holiness',
    label: 'Holiness',
    hebrewLabel: 'קְדֻשָּׁה',
    words: ['קָדוֹשׁ', 'טָהוֹר', 'טָמֵא', 'חֹל', 'קִדֵּשׁ', 'הִתְקַדֵּשׁ'],
    description: 'Sacred vs. profane concepts',
  },
  COVENANT: {
    id: 'covenant',
    label: 'Covenant',
    hebrewLabel: 'בְּרִית',
    words: ['בְּרִית', 'חֶסֶד', 'אֱמוּנָה', 'אוֹת', 'נֶדֶר', 'שְׁבוּעָה'],
    description: 'Covenant and faithfulness terms',
  },
  JUSTICE: {
    id: 'justice',
    label: 'Justice',
    hebrewLabel: 'מִשְׁפָּט',
    words: ['צֶדֶק', 'מִשְׁפָּט', 'דִּין', 'תּוֹרָה', 'חֹק', 'מִצְוָה'],
    description: 'Law and justice terminology',
  },
  PRAYER: {
    id: 'prayer',
    label: 'Prayer',
    hebrewLabel: 'תְּפִלָּה',
    words: ['תְּפִלָּה', 'תְּחִנָּה', 'רִנָּה', 'שִׁירָה', 'בְּרָכָה', 'הוֹדָיָה'],
    description: 'Prayer and worship vocabulary',
  },
  EMOTION: {
    id: 'emotion',
    label: 'Emotion',
    hebrewLabel: 'רֶגֶשׁ',
    words: ['אַהֲבָה', 'שִׂנְאָה', 'יִרְאָה', 'שִׂמְחָה', 'עֶצֶב', 'כַּעַס'],
    description: 'Emotional vocabulary',
  },
  WISDOM: {
    id: 'wisdom',
    label: 'Wisdom',
    hebrewLabel: 'חָכְמָה',
    words: ['חָכְמָה', 'בִּינָה', 'דַּעַת', 'תְּבוּנָה', 'מוּסָר', 'עֵצָה'],
    description: 'Wisdom and understanding terms',
  },
  MOVEMENT: {
    id: 'movement',
    label: 'Movement',
    hebrewLabel: 'תְּנוּעָה',
    words: ['הָלַךְ', 'בָּא', 'יָצָא', 'עָלָה', 'יָרַד', 'שָׁב'],
    description: 'Verbs of motion',
  },
  SPEAKING: {
    id: 'speaking',
    label: 'Speaking',
    hebrewLabel: 'דִּבּוּר',
    words: ['אָמַר', 'דִּבֵּר', 'סִפֵּר', 'קָרָא', 'צִוָּה', 'הִגִּיד'],
    description: 'Speech and communication verbs',
  },
  SEEING: {
    id: 'seeing',
    label: 'Seeing',
    hebrewLabel: 'רְאִיָּה',
    words: ['רָאָה', 'הִבִּיט', 'צָפָה', 'חָזָה', 'שָׁקַף', 'הִשְׁגִּיחַ'],
    description: 'Perception and vision verbs',
  },
  BODY_PARTS: {
    id: 'body_parts',
    label: 'Body Parts',
    hebrewLabel: 'אֵבָרִים',
    words: ['רֹאשׁ', 'יָד', 'רֶגֶל', 'עַיִן', 'לֵב', 'נֶפֶשׁ'],
    description: 'Anatomical terms',
  },
  TIME: {
    id: 'time',
    label: 'Time',
    hebrewLabel: 'זְמַן',
    words: ['יוֹם', 'לַיְלָה', 'עֵת', 'מוֹעֵד', 'עוֹלָם', 'דּוֹר'],
    description: 'Temporal vocabulary',
  },
};

// =============================================================================
// KNOWN WORD RELATIONSHIPS (Built-in knowledge base)
// =============================================================================

export const WORD_RELATIONSHIPS_DB = {
  // Synonyms
  synonyms: {
    'אָמַר': ['דִּבֵּר', 'הִגִּיד'],
    'רָאָה': ['הִבִּיט', 'צָפָה', 'חָזָה'],
    'הָלַךְ': ['צָעַד', 'פָּסַע'],
    'שָׂמַח': ['גִּיל', 'עָלַז', 'רָנַן'],
    'גָּדוֹל': ['רַב', 'עָצוּם', 'כַּבִּיר'],
    'קָטָן': ['צָעִיר', 'דַּק', 'מְעַט'],
    'טוֹב': ['יָפֶה', 'נָעִים', 'מֵיטִיב'],
    'רַע': ['רָשָׁע', 'חַטָּא', 'מֵרֵעַ'],
    'יָדַע': ['הִכִּיר', 'הֵבִין'],
    'אָהַב': ['חָשַׁק', 'חָפֵץ'],
    'יָרֵא': ['פָּחַד', 'חָרַד'],
    'נָתַן': ['שָׂם', 'הֵנִיחַ'],
    'לָקַח': ['אָסַף', 'קִבֵּל'],
    'עָשָׂה': ['פָּעַל', 'בָּנָה'],
  },

  // Antonyms
  antonyms: {
    'טוֹב': ['רַע'],
    'גָּדוֹל': ['קָטָן'],
    'חַי': ['מֵת'],
    'אוֹר': ['חֹשֶׁךְ'],
    'יוֹם': ['לַיְלָה'],
    'שָׁמַיִם': ['אֶרֶץ'],
    'אִישׁ': ['אִשָּׁה'],
    'אָב': ['בֵּן'],
    'עָלָה': ['יָרַד'],
    'בָּא': ['יָצָא'],
    'נָתַן': ['לָקַח'],
    'פָּתַח': ['סָגַר'],
    'קָרוֹב': ['רָחוֹק'],
    'חָדָשׁ': ['יָשָׁן'],
    'רֹאשׁ': ['סוֹף'],
    'צַדִּיק': ['רָשָׁע'],
    'חָכָם': ['כְּסִיל'],
    'חַיִּים': ['מָוֶת'],
  },

  // Biblical pairs (hendiadys, merisms)
  biblicalPairs: {
    'שָׁמַיִם': ['אֶרֶץ'],      // heaven and earth = everything
    'יוֹם': ['לַיְלָה'],         // day and night = always
    'טוֹב': ['רַע'],            // good and evil = everything
    'חֶסֶד': ['אֱמֶת'],         // mercy and truth = covenant loyalty
    'צֶדֶק': ['מִשְׁפָּט'],      // righteousness and justice
    'תֹּהוּ': ['בֹהוּ'],         // formless and void
    'עֵץ': ['אֶבֶן'],           // wood and stone = all materials
    'זָכָר': ['נְקֵבָה'],        // male and female = all people
  },

  // Root families (words from same shoresh)
  rootFamilies: {
    'מלך': {
      root: 'מ-ל-ך',
      meaning: 'to reign/rule',
      words: [
        { word: 'מֶלֶךְ', meaning: 'king', pos: 'noun' },
        { word: 'מַלְכָּה', meaning: 'queen', pos: 'noun' },
        { word: 'מַלְכוּת', meaning: 'kingdom', pos: 'noun' },
        { word: 'מָלַךְ', meaning: 'to reign', pos: 'verb' },
        { word: 'הִמְלִיךְ', meaning: 'to crown', pos: 'verb' },
      ],
    },
    'קדש': {
      root: 'ק-ד-ש',
      meaning: 'holiness/set apart',
      words: [
        { word: 'קָדוֹשׁ', meaning: 'holy', pos: 'adj' },
        { word: 'קֹדֶשׁ', meaning: 'holiness', pos: 'noun' },
        { word: 'קִדֵּשׁ', meaning: 'to sanctify', pos: 'verb' },
        { word: 'מִקְדָּשׁ', meaning: 'sanctuary', pos: 'noun' },
        { word: 'קִדּוּשׁ', meaning: 'sanctification', pos: 'noun' },
      ],
    },
    'ברך': {
      root: 'ב-ר-ך',
      meaning: 'blessing/knee',
      words: [
        { word: 'בְּרָכָה', meaning: 'blessing', pos: 'noun' },
        { word: 'בֵּרַךְ', meaning: 'to bless', pos: 'verb' },
        { word: 'בָּרוּךְ', meaning: 'blessed', pos: 'adj' },
        { word: 'בֶּרֶךְ', meaning: 'knee', pos: 'noun' },
        { word: 'בְּרֵכָה', meaning: 'pool', pos: 'noun' },
      ],
    },
    'שמע': {
      root: 'ש-מ-ע',
      meaning: 'hearing/obeying',
      words: [
        { word: 'שָׁמַע', meaning: 'to hear', pos: 'verb' },
        { word: 'שֵׁמַע', meaning: 'report/fame', pos: 'noun' },
        { word: 'שְׁמִיעָה', meaning: 'hearing', pos: 'noun' },
        { word: 'מִשְׁמַעַת', meaning: 'obedience', pos: 'noun' },
        { word: 'הִשְׁמִיעַ', meaning: 'to proclaim', pos: 'verb' },
      ],
    },
    'אמר': {
      root: 'א-מ-ר',
      meaning: 'saying/speaking',
      words: [
        { word: 'אָמַר', meaning: 'to say', pos: 'verb' },
        { word: 'אֹמֶר', meaning: 'word/speech', pos: 'noun' },
        { word: 'מַאֲמָר', meaning: 'saying', pos: 'noun' },
        { word: 'אֲמִירָה', meaning: 'utterance', pos: 'noun' },
        { word: 'נֶאֱמָר', meaning: 'was said', pos: 'verb' },
      ],
    },
    'ידע': {
      root: 'י-ד-ע',
      meaning: 'knowing',
      words: [
        { word: 'יָדַע', meaning: 'to know', pos: 'verb' },
        { word: 'דַּעַת', meaning: 'knowledge', pos: 'noun' },
        { word: 'יְדִיעָה', meaning: 'knowledge', pos: 'noun' },
        { word: 'מוֹדָע', meaning: 'acquaintance', pos: 'noun' },
        { word: 'הוֹדִיעַ', meaning: 'to inform', pos: 'verb' },
      ],
    },
    'עבד': {
      root: 'ע-ב-ד',
      meaning: 'service/work',
      words: [
        { word: 'עָבַד', meaning: 'to serve', pos: 'verb' },
        { word: 'עֶבֶד', meaning: 'servant', pos: 'noun' },
        { word: 'עֲבוֹדָה', meaning: 'service', pos: 'noun' },
        { word: 'עַבְדוּת', meaning: 'slavery', pos: 'noun' },
        { word: 'הֶעֱבִיד', meaning: 'to enslave', pos: 'verb' },
      ],
    },
    'כתב': {
      root: 'כ-ת-ב',
      meaning: 'writing',
      words: [
        { word: 'כָּתַב', meaning: 'to write', pos: 'verb' },
        { word: 'כְּתָב', meaning: 'writing', pos: 'noun' },
        { word: 'מִכְתָּב', meaning: 'letter', pos: 'noun' },
        { word: 'כָּתוּב', meaning: 'written', pos: 'adj' },
        { word: 'כְּתוּבָה', meaning: 'marriage contract', pos: 'noun' },
      ],
    },
  },

  // Hebrew-Aramaic cognates
  aramaicCognates: {
    'מֶלֶךְ': { aramaic: 'מַלְכָּא', meaning: 'king' },
    'בַּיִת': { aramaic: 'בֵּיתָא', meaning: 'house' },
    'שְׁמָא': { aramaic: 'שְׁמָא', meaning: 'name' },
    'אֲרִי': { aramaic: 'אַרְיָא', meaning: 'lion' },
    'יוֹם': { aramaic: 'יוֹמָא', meaning: 'day' },
    'לֵב': { aramaic: 'לִבָּא', meaning: 'heart' },
    'עַיִן': { aramaic: 'עֵינָא', meaning: 'eye' },
    'אָב': { aramaic: 'אַבָּא', meaning: 'father' },
    'אֵם': { aramaic: 'אִמָּא', meaning: 'mother' },
    'בַּר': { aramaic: 'בְּרָא', meaning: 'son' },
  },

  // Collocations (words that frequently appear together)
  collocations: {
    'נָשָׂא': ['עַיִן', 'קוֹל', 'יָד', 'רֹאשׁ'],  // lift up eyes/voice/hand/head
    'שָׁמַע': ['קוֹל', 'בְּקוֹל'],               // hear voice, obey
    'עָשָׂה': ['חֶסֶד', 'מִשְׁפָּט', 'צְדָקָה'],   // do kindness/justice/righteousness
    'נָתַן': ['לֵב', 'יָד', 'כֹּחַ'],            // give heart/hand/strength
    'הָלַךְ': ['דֶּרֶךְ', 'בְּחֻקּוֹת'],         // walk in way/statutes
    'שָׁמַר': ['מִצְוֹת', 'בְּרִית', 'תּוֹרָה'],   // keep commandments/covenant/Torah
  },
};

// =============================================================================
// WORD GRAPH DATA STRUCTURE
// =============================================================================

let wordGraph = {
  nodes: new Map(),      // word -> { word, data, connections }
  edges: [],             // { source, target, type, weight }
  userLearned: new Set(), // words user has learned
  metadata: {
    created: Date.now(),
    lastUpdated: Date.now(),
  },
};

const STORAGE_KEY = 'word-relationship-graph';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the word graph from storage
 */
export function initializeWordGraph() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      wordGraph.nodes = new Map(data.nodes || []);
      wordGraph.edges = data.edges || [];
      wordGraph.userLearned = new Set(data.userLearned || []);
      wordGraph.metadata = data.metadata || { created: Date.now(), lastUpdated: Date.now() };
    }
  } catch (err) {
    console.warn('Failed to load word graph:', err);
  }

  // Pre-populate with known relationships
  populateBuiltInRelationships();

  return wordGraph;
}

/**
 * Persist word graph to storage
 */
function persistWordGraph() {
  try {
    const data = {
      nodes: Array.from(wordGraph.nodes.entries()),
      edges: wordGraph.edges,
      userLearned: Array.from(wordGraph.userLearned),
      metadata: wordGraph.metadata,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to persist word graph:', err);
  }
}

/**
 * Populate graph with built-in relationships
 */
function populateBuiltInRelationships() {
  // Add root family relationships
  Object.entries(WORD_RELATIONSHIPS_DB.rootFamilies).forEach(([rootKey, family]) => {
    family.words.forEach(wordData => {
      addWordNode(wordData.word, {
        meaning: wordData.meaning,
        pos: wordData.pos,
        root: family.root,
        rootMeaning: family.meaning,
      });

      // Connect all words in the family to each other
      family.words.forEach(otherWord => {
        if (wordData.word !== otherWord.word) {
          addWordRelationship(
            wordData.word,
            otherWord.word,
            WORD_RELATIONSHIP_TYPES.ROOT_FAMILY,
            { root: family.root }
          );
        }
      });
    });
  });

  // Add synonyms
  Object.entries(WORD_RELATIONSHIPS_DB.synonyms).forEach(([word, synonyms]) => {
    addWordNode(word, {});
    synonyms.forEach(syn => {
      addWordNode(syn, {});
      addWordRelationship(word, syn, WORD_RELATIONSHIP_TYPES.SYNONYM);
    });
  });

  // Add antonyms
  Object.entries(WORD_RELATIONSHIPS_DB.antonyms).forEach(([word, antonyms]) => {
    addWordNode(word, {});
    antonyms.forEach(ant => {
      addWordNode(ant, {});
      addWordRelationship(word, ant, WORD_RELATIONSHIP_TYPES.ANTONYM);
    });
  });

  // Add biblical pairs
  Object.entries(WORD_RELATIONSHIPS_DB.biblicalPairs).forEach(([word, pairs]) => {
    addWordNode(word, {});
    pairs.forEach(pair => {
      addWordNode(pair, {});
      addWordRelationship(word, pair, WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR);
    });
  });

  // Add Aramaic cognates
  Object.entries(WORD_RELATIONSHIPS_DB.aramaicCognates).forEach(([hebrew, data]) => {
    addWordNode(hebrew, { language: 'hebrew' });
    addWordNode(data.aramaic, { language: 'aramaic', meaning: data.meaning });
    addWordRelationship(hebrew, data.aramaic, WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE);
  });

  // Add semantic field memberships
  Object.entries(SEMANTIC_FIELDS).forEach(([fieldKey, field]) => {
    field.words.forEach(word => {
      const node = wordGraph.nodes.get(word) || { word, data: {} };
      node.data.semanticFields = node.data.semanticFields || [];
      if (!node.data.semanticFields.includes(field.id)) {
        node.data.semanticFields.push(field.id);
      }
      wordGraph.nodes.set(word, node);
    });
  });
}

// =============================================================================
// NODE OPERATIONS
// =============================================================================

/**
 * Add a word node to the graph
 */
export function addWordNode(word, data = {}) {
  if (!wordGraph.nodes.has(word)) {
    wordGraph.nodes.set(word, {
      word,
      data: {
        ...data,
        addedAt: Date.now(),
      },
      connections: 0,
    });
    wordGraph.metadata.lastUpdated = Date.now();
  }
  return wordGraph.nodes.get(word);
}

/**
 * Add a relationship between two words
 */
export function addWordRelationship(word1, word2, type, metadata = {}) {
  // Ensure nodes exist
  addWordNode(word1, {});
  addWordNode(word2, {});

  // Check for existing edge
  const edgeId = `${word1}-${type}-${word2}`;
  const reverseId = `${word2}-${type}-${word1}`;

  const existing = wordGraph.edges.find(e => e.id === edgeId || e.id === reverseId);
  if (existing) {
    existing.weight = (existing.weight || 1) + 1;
    return existing;
  }

  const edge = {
    id: edgeId,
    source: word1,
    target: word2,
    type,
    weight: 1,
    metadata: {
      ...metadata,
      addedAt: Date.now(),
    },
  };

  wordGraph.edges.push(edge);

  // Update connection counts
  const node1 = wordGraph.nodes.get(word1);
  const node2 = wordGraph.nodes.get(word2);
  if (node1) node1.connections++;
  if (node2) node2.connections++;

  wordGraph.metadata.lastUpdated = Date.now();
  return edge;
}

/**
 * Mark a word as learned by the user
 */
export function markWordLearned(word) {
  wordGraph.userLearned.add(word);
  persistWordGraph();
}

/**
 * Check if a word is learned
 */
export function isWordLearned(word) {
  return wordGraph.userLearned.has(word);
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all relationships for a word
 */
export function getWordRelationships(word) {
  const relationships = {
    word,
    node: wordGraph.nodes.get(word),
    rootFamily: [],
    synonyms: [],
    antonyms: [],
    semanticField: [],
    collocations: [],
    biblicalPairs: [],
    aramaicCognates: [],
    all: [],
  };

  wordGraph.edges.forEach(edge => {
    if (edge.source === word || edge.target === word) {
      const related = edge.source === word ? edge.target : edge.source;
      const relData = {
        word: related,
        node: wordGraph.nodes.get(related),
        type: edge.type,
        weight: edge.weight,
        learned: wordGraph.userLearned.has(related),
      };

      relationships.all.push(relData);

      switch (edge.type) {
        case WORD_RELATIONSHIP_TYPES.ROOT_FAMILY:
          relationships.rootFamily.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.SYNONYM:
          relationships.synonyms.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.ANTONYM:
          relationships.antonyms.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.SEMANTIC_FIELD:
          relationships.semanticField.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.COLLOCATION:
          relationships.collocations.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR:
          relationships.biblicalPairs.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE:
          relationships.aramaicCognates.push(relData);
          break;
        default:
          break;
      }
    }
  });

  return relationships;
}

/**
 * Get words in the same root family
 */
export function getRootFamily(word) {
  const node = wordGraph.nodes.get(word);
  const root = node?.data?.root;

  if (!root) {
    // Try to find from relationships
    const relationships = getWordRelationships(word);
    return relationships.rootFamily;
  }

  // Get all words with the same root
  const family = [];
  wordGraph.nodes.forEach((n, w) => {
    if (n.data?.root === root) {
      family.push({
        word: w,
        meaning: n.data?.meaning,
        pos: n.data?.pos,
        learned: wordGraph.userLearned.has(w),
      });
    }
  });

  return {
    root,
    rootMeaning: node?.data?.rootMeaning,
    words: family,
    learnedCount: family.filter(w => w.learned).length,
  };
}

/**
 * Get words in the same semantic field
 */
export function getSemanticFieldWords(fieldId) {
  const field = SEMANTIC_FIELDS[fieldId.toUpperCase()];
  if (!field) return null;

  const words = field.words.map(word => ({
    word,
    node: wordGraph.nodes.get(word),
    learned: wordGraph.userLearned.has(word),
  }));

  return {
    ...field,
    words,
    learnedCount: words.filter(w => w.learned).length,
    totalCount: words.length,
  };
}

/**
 * Find semantic fields containing a word
 */
export function findSemanticFields(word) {
  const fields = [];

  Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
    if (field.words.includes(word)) {
      fields.push({
        id: field.id,
        label: field.label,
        hebrewLabel: field.hebrewLabel,
        wordCount: field.words.length,
      });
    }
  });

  return fields;
}

/**
 * Get learning suggestions based on what user knows
 */
export function getLearningPath(startWord) {
  const suggestions = [];
  const relationships = getWordRelationships(startWord);

  // Priority 1: Unlearned root family members
  relationships.rootFamily
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Same root family',
        priority: 1,
        type: 'root_family',
      });
    });

  // Priority 2: Unlearned antonyms (contrast learning)
  relationships.antonyms
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Learn the opposite',
        priority: 2,
        type: 'antonym',
      });
    });

  // Priority 3: Unlearned synonyms
  relationships.synonyms
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Similar meaning',
        priority: 3,
        type: 'synonym',
      });
    });

  // Priority 4: Aramaic cognates
  relationships.aramaicCognates
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Aramaic cognate',
        priority: 4,
        type: 'cognate',
      });
    });

  return suggestions.sort((a, b) => a.priority - b.priority);
}

// =============================================================================
// VISUALIZATION
// =============================================================================

/**
 * Generate a visual graph for a word and its relationships
 */
export function generateWordGraph(centerWord, options = {}) {
  const { maxDepth = 1, maxNodes = 20 } = options;

  const nodes = new Set([centerWord]);
  const edges = [];
  const visited = new Set();

  function expand(word, depth) {
    if (depth > maxDepth || visited.has(word) || nodes.size >= maxNodes) return;
    visited.add(word);

    wordGraph.edges.forEach(edge => {
      if (edge.source === word || edge.target === word) {
        const related = edge.source === word ? edge.target : edge.source;
        if (nodes.size < maxNodes) {
          nodes.add(related);
          edges.push({
            source: edge.source,
            target: edge.target,
            type: edge.type,
            weight: edge.weight,
          });
          expand(related, depth + 1);
        }
      }
    });
  }

  expand(centerWord, 0);

  return {
    nodes: Array.from(nodes).map(word => ({
      id: word,
      label: word,
      ...wordGraph.nodes.get(word)?.data,
      learned: wordGraph.userLearned.has(word),
      isCenter: word === centerWord,
    })),
    edges,
    stats: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
    },
  };
}

/**
 * Generate Mermaid diagram for word relationships
 */
export function generateWordMermaid(centerWord, options = {}) {
  const graph = generateWordGraph(centerWord, options);
  const lines = ['graph LR'];

  // Style classes
  lines.push('  classDef center fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef learned fill:#d1fae5,stroke:#059669');
  lines.push('  classDef unlearned fill:#fee2e2,stroke:#dc2626');
  lines.push('  classDef hebrew font-family:David,serif');

  // Node definitions
  graph.nodes.forEach(node => {
    const safeId = node.id.replace(/[^א-תa-zA-Z0-9]/g, '_');
    lines.push(`  ${safeId}["${node.id}"]`);

    if (node.isCenter) {
      lines.push(`  class ${safeId} center`);
    } else if (node.learned) {
      lines.push(`  class ${safeId} learned`);
    } else {
      lines.push(`  class ${safeId} unlearned`);
    }
  });

  // Edge definitions
  const edgeStyles = {
    [WORD_RELATIONSHIP_TYPES.ROOT_FAMILY]: '-->|root|',
    [WORD_RELATIONSHIP_TYPES.SYNONYM]: '-->|syn|',
    [WORD_RELATIONSHIP_TYPES.ANTONYM]: '-.->|ant|',
    [WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR]: '<-->|pair|',
    [WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE]: '-->|aram|',
    [WORD_RELATIONSHIP_TYPES.COLLOCATION]: '-->|with|',
  };

  graph.edges.forEach(edge => {
    const sourceId = edge.source.replace(/[^א-תa-zA-Z0-9]/g, '_');
    const targetId = edge.target.replace(/[^א-תa-zA-Z0-9]/g, '_');
    const style = edgeStyles[edge.type] || '-->';
    lines.push(`  ${sourceId} ${style} ${targetId}`);
  });

  return lines.join('\n');
}

/**
 * Generate ASCII representation of word relationships
 */
export function generateWordAscii(word) {
  const relationships = getWordRelationships(word);
  const lines = [];

  lines.push(`╔${'═'.repeat(word.length + 10)}╗`);
  lines.push(`║    ${word}    ║`);
  lines.push(`╚${'═'.repeat(word.length + 10)}╝`);
  lines.push('');

  if (relationships.rootFamily.length > 0) {
    lines.push('  🌳 Root Family:');
    relationships.rootFamily.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.synonyms.length > 0) {
    lines.push('  ≈ Synonyms:');
    relationships.synonyms.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.antonyms.length > 0) {
    lines.push('  ↔ Antonyms:');
    relationships.antonyms.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.biblicalPairs.length > 0) {
    lines.push('  ⚖ Biblical Pairs:');
    relationships.biblicalPairs.forEach(r => {
      lines.push(`     ${word} + ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.aramaicCognates.length > 0) {
    lines.push('  🔄 Aramaic Cognates:');
    relationships.aramaicCognates.forEach(r => {
      lines.push(`     ${r.word}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get word graph statistics
 */
export function getWordGraphStats() {
  const nodes = Array.from(wordGraph.nodes.values());

  // Count by relationship type
  const relationshipCounts = {};
  wordGraph.edges.forEach(edge => {
    relationshipCounts[edge.type] = (relationshipCounts[edge.type] || 0) + 1;
  });

  // Find most connected words
  const mostConnected = nodes
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10)
    .map(n => ({ word: n.word, connections: n.connections }));

  // Learning progress by semantic field
  const fieldProgress = {};
  Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
    const learned = field.words.filter(w => wordGraph.userLearned.has(w)).length;
    fieldProgress[field.id] = {
      label: field.label,
      learned,
      total: field.words.length,
      percentage: Math.round((learned / field.words.length) * 100),
    };
  });

  return {
    totalWords: nodes.length,
    totalRelationships: wordGraph.edges.length,
    learnedWords: wordGraph.userLearned.size,
    relationshipCounts,
    mostConnected,
    fieldProgress,
    lastUpdated: wordGraph.metadata.lastUpdated,
  };
}

/**
 * Get learning progress summary
 */
export function getLearningProgress() {
  const learned = Array.from(wordGraph.userLearned);

  // Group learned words by root
  const byRoot = {};
  learned.forEach(word => {
    const node = wordGraph.nodes.get(word);
    const root = node?.data?.root || 'unknown';
    if (!byRoot[root]) {
      byRoot[root] = [];
    }
    byRoot[root].push(word);
  });

  // Count complete root families
  let completeRoots = 0;
  Object.entries(WORD_RELATIONSHIPS_DB.rootFamilies).forEach(([rootKey, family]) => {
    const learnedInFamily = family.words.filter(w => wordGraph.userLearned.has(w.word)).length;
    if (learnedInFamily === family.words.length) {
      completeRoots++;
    }
  });

  return {
    totalLearned: learned.length,
    byRoot,
    completeRootFamilies: completeRoots,
    totalRootFamilies: Object.keys(WORD_RELATIONSHIPS_DB.rootFamilies).length,
  };
}

// =============================================================================
// EXPORT & IMPORT
// =============================================================================

/**
 * Export word graph data
 */
export function exportWordGraph() {
  return {
    nodes: Array.from(wordGraph.nodes.entries()),
    edges: wordGraph.edges,
    userLearned: Array.from(wordGraph.userLearned),
    metadata: wordGraph.metadata,
  };
}

/**
 * Import word graph data
 */
export function importWordGraph(data) {
  if (data.nodes) {
    data.nodes.forEach(([word, node]) => {
      wordGraph.nodes.set(word, node);
    });
  }
  if (data.edges) {
    data.edges.forEach(edge => {
      const exists = wordGraph.edges.find(e => e.id === edge.id);
      if (!exists) {
        wordGraph.edges.push(edge);
      }
    });
  }
  if (data.userLearned) {
    data.userLearned.forEach(word => wordGraph.userLearned.add(word));
  }
  wordGraph.metadata.lastUpdated = Date.now();
  persistWordGraph();
}

/**
 * Clear user learning data (keep built-in relationships)
 */
export function clearLearningProgress() {
  wordGraph.userLearned.clear();
  persistWordGraph();
}

// Initialize on module load
initializeWordGraph();

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const wordRelationshipService = {
  // Types
  WORD_RELATIONSHIP_TYPES,
  SEMANTIC_FIELDS,
  WORD_RELATIONSHIPS_DB,
  // Init
  initializeWordGraph,
  // Node operations
  addWordNode,
  addWordRelationship,
  markWordLearned,
  isWordLearned,
  // Query
  getWordRelationships,
  getRootFamily,
  getSemanticFieldWords,
  findSemanticFields,
  getLearningPath,
  // Visualization
  generateWordGraph,
  generateWordMermaid,
  generateWordAscii,
  // Stats
  getWordGraphStats,
  getLearningProgress,
  // Export/Import
  exportWordGraph,
  importWordGraph,
  clearLearningProgress,
};

export default wordRelationshipService;
