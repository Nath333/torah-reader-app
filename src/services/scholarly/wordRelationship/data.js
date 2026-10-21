// =============================================================================
// Données du moteur de relations lexicales — types, champs sémantiques, base.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

// =============================================================================
// RELATIONSHIP TYPES
// =============================================================================

export const WORD_RELATIONSHIP_TYPES = {
  ROOT_FAMILY: 'root_family',         // Same Hebrew root (shoresh)
  SYNONYM: 'synonym',                 // Similar meaning
  ANTONYM: 'antonym',                 // Opposite meaning
  SEMANTIC_FIELD: 'semantic_field',   // Conceptual category
  COLLOCATION: 'collocation',         // Frequently co-occur
  DERIVED: 'derived',                 // Morphological derivation
  BIBLICAL_PAIR: 'biblical_pair',     // Hendiadys/merisms
  ARAMAIC_COGNATE: 'aramaic_cognate', // Hebrew-Aramaic cognates
  BORROWED: 'borrowed',               // Loanwords
  EUPHEMISM: 'euphemism',             // Euphemistic relationship
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

