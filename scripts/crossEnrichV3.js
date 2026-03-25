/**
 * Cross-Enrichment V3 - Deep Analysis & Maximum Quality
 *
 * Improvements over V2:
 * 1. CLEAN malformed cognates (e.g., "Aramaic: א")
 * 2. EXTRACT cognates from BDB/Gesenius fullDef with better patterns
 * 3. PROPAGATE Strong's via shared roots (5689 Jastrow, 4123 CAL potential)
 * 4. PROPAGATE semantic fields from Klein (1034+ entries)
 * 5. INFER POS from definition patterns
 * 6. BIDIRECTIONAL cognate sharing between all dictionaries
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

function extractRoot(word) {
  if (!word) return null;
  let clean = word.replace(/[\u0591-\u05C7]/g, '').trim();
  clean = clean.replace(/^[והבכלמש]/, '');
  clean = clean.replace(/[ויתםןה]$/, '');
  if (clean.length >= 3) return clean.substring(0, 3);
  return clean.length >= 2 ? clean : null;
}

// ============================================================================
// COGNATE CLEANING - Remove malformed entries
// ============================================================================

// Language names to detect self-references like "Arabic: Arabic"
const LANGUAGE_NAMES = new Set([
  'akkadian', 'assyrian', 'babylonian', 'sumerian',
  'phoenician', 'punic', 'canaanite',
  'arabic', 'ethiopic', 'geez', 'amharic', 'tigrinya',
  'aramaic', 'syriac', 'mandaic', 'nabataean', 'palmyrene',
  'ugaritic', 'eblaite',
  'egyptian', 'coptic', 'demotic',
  'persian', 'avestan', 'pahlavi',
  'greek', 'latin', 'hebrew',
  'moabite', 'edomite', 'ammonite', 'sabean', 'minean'
]);

// Common garbage words that appear after "Language:"
const GARBAGE_COGNATE_WORDS = new Set([
  // Meta words
  'compare', 'see', 'cf', 'etc', 'id', 'ib', 'ibid', 'viz', 'also',
  'synonym', 'cognate', 'related', 'similar', 'loan', 'borrowed',
  // Partial patterns from BDB that aren't real cognates
  'synonym מ', 'synonym', 'probably', 'perhaps', 'possibly', 'apparently',
  // Common English verbs/words that sneak in
  'come', 'refuse', 'fruit', 'alas', 'probably', 'perhaps', 'maybe',
  'verb', 'noun', 'adj', 'adv', 'prep', 'conj', 'particle',
  'the', 'and', 'or', 'but', 'for', 'from', 'with', 'to', 'of', 'in', 'on',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'which', 'who', 'what', 'where', 'when',
  'also', 'only', 'even', 'just', 'still', 'yet', 'not', 'no', 'yes',
  'same', 'meaning', 'word', 'root', 'form', 'stem', 'base',
  // Single letter patterns that slip through
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ך', 'ל', 'מ', 'ם', 'נ', 'ן', 'ס', 'ע', 'פ', 'ף', 'צ', 'ץ', 'ק', 'ר', 'ש', 'ת',
  // Short meaningless combos
  'מ', 'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט'
]);

function isValidCognate(cognate) {
  if (!cognate || typeof cognate !== 'string') return false;
  if (cognate.length < 8) return false;

  // Bad patterns
  if (cognate.endsWith(': ')) return false;
  if (cognate.includes(': :')) return false;
  if (/: [א-ת]$/.test(cognate)) return false;  // Single Hebrew letter
  if (/: [A-Z]$/.test(cognate)) return false;  // Single capital letter
  if (/: (compare|see|cf\.|etc|id\.)$/i.test(cognate)) return false;

  // Must have language: word format
  if (!cognate.includes(': ')) return false;

  const parts = cognate.split(': ');
  if (parts.length !== 2) return false;

  const lang = parts[0].trim().toLowerCase();
  const word = parts[1].trim().toLowerCase();

  if (word.length < 2) return false;

  // Check if word is same as language name (e.g., "Arabic: Arabic")
  if (LANGUAGE_NAMES.has(word)) return false;

  // Check if word is garbage
  if (GARBAGE_COGNATE_WORDS.has(word)) return false;

  // Check for partial language name matches
  if (lang.includes(word) || word.includes(lang)) return false;

  // Check for meta-word patterns (e.g., "synonym מ", "compare with")
  if (/^(synonym|compare|cognate|related|see|cf|loan)/i.test(word)) return false;

  // Check for incomplete patterns (word + single Hebrew letter)
  if (/^[a-z]+\s+[א-ת]$/i.test(word)) return false;

  return true;
}

function cleanCognateList(cognates) {
  if (!cognates || !Array.isArray(cognates)) return [];
  return cognates.filter(isValidCognate);
}

// ============================================================================
// COGNATE EXTRACTION FROM FULLDEFS
// ============================================================================

const COGNATE_EXTRACTORS = [
  // Pattern: "Phoenician אב" or "Assyrian abu"
  { lang: 'Akkadian', pattern: /Assyrian\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Akkadian', pattern: /Akkadian\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Phoenician', pattern: /Phoenician\s+([א-ת]{2,8})\b/gi },
  { lang: 'Arabic', pattern: /Arabic\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Aramaic', pattern: /Aramaic\s+([א-ת]{2,8})\b/gi },
  { lang: 'Ethiopic', pattern: /Ethiopic\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Sabean', pattern: /Sabean\s+([א-ת]{2,8})\b/gi },
  { lang: 'Moabite', pattern: /Moabite\s+([א-ת]{2,8})\b/gi },
  { lang: 'Syriac', pattern: /Syriac\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Ugaritic', pattern: /Ugaritic\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Egyptian', pattern: /Egyptian\s+([a-z]{2,12})\b/gi },
  { lang: 'Persian', pattern: /Persian\s+([א-תa-z]{2,12})\b/gi },
  { lang: 'Greek', pattern: /Greek\s+([α-ωa-z]{2,12})\b/gi },
  { lang: 'Latin', pattern: /Latin\s+([a-z]{3,12})\b/gi },
];

// Words to exclude from cognate extraction
const EXCLUDED_WORDS = new Set([
  'compare', 'see', 'cf', 'etc', 'id', 'ib', 'ibid',
  'come', 'refuse', 'fruit', 'alas', 'probably', 'perhaps',
  'verb', 'noun', 'adj', 'adv', 'prep', 'conj',
  'the', 'and', 'or', 'but', 'for', 'from', 'with',
  'is', 'are', 'was', 'were', 'be', 'been',
  'this', 'that', 'these', 'those', 'which', 'who',
  'also', 'only', 'even', 'just', 'still', 'yet'
]);

function extractCognatesFromFullDef(fullDef) {
  if (!fullDef) return [];

  const extracted = [];
  const seen = new Set();

  for (const { lang, pattern } of COGNATE_EXTRACTORS) {
    const matches = fullDef.matchAll(new RegExp(pattern.source, 'gi'));
    for (const m of matches) {
      const word = m[1];
      if (!word || word.length < 2) continue;
      if (EXCLUDED_WORDS.has(word.toLowerCase())) continue;
      if (/^[A-Z]/.test(word)) continue;  // Skip capitalized (likely proper names)

      const cognate = `${lang}: ${word}`;
      if (!seen.has(cognate.toLowerCase())) {
        seen.add(cognate.toLowerCase());
        extracted.push(cognate);
      }
    }
  }

  return extracted;
}

// ============================================================================
// SEMANTIC FIELD INFERENCE (Enhanced)
// ============================================================================

const SEMANTIC_PATTERNS = {
  // LOCATION must come first to catch "outside/street" before "building" catches "wall"
  'location': /\b(outside|inside|within|without|street|road|path|way|place|area|region|direction|north|south|east|west|beside|near|far|distant|abroad|abroad|exterior|interior|threshold|boundary|border)\b/i,
  'religious': /\b(god|lord|divine|holy|sacred|priest|temple|altar|sacrifice|worship|pray|bless|curse|sabbath|festival|covenant|torah|commandment|sin|atonement|purif|consecrat|sanctif|prophet|vision|oracle)\b/i,
  'kinship': /\b(father|mother|son|daughter|brother|sister|wife|husband|child|family|clan|tribe|ancestor|descend|kinsman|relative|widow|orphan|parent|offspring|heir)\b/i,
  'body': /\b(head|face|eye|ear|nose|mouth|lip|tongue|tooth|hand|arm|foot|leg|heart|blood|bone|flesh|skin|hair|neck|shoulder|finger|palm|belly|womb)\b/i,
  'nature': /\b(water|sea|river|rain|cloud|wind|fire|earth|land|mountain|hill|valley|desert|stone|rock|sun|moon|star|heaven|sky|tree|plant|flower|grass)\b/i,
  'animal': /\b(ox|cow|sheep|goat|lamb|donkey|horse|camel|lion|bird|fish|serpent|beast|cattle|flock|herd|eagle|dove|dog|wolf|bear|deer)\b/i,
  'agriculture': /\b(plant|sow|reap|harvest|field|vineyard|grain|wheat|barley|fruit|seed|plow|thresh|wine|olive|fig|date|garden)\b/i,
  'emotion': /\b(love|hate|fear|anger|joy|sorrow|grief|weep|rejoice|happy|sad|anxious|hope|despair|desire|jealous|envy|pride|shame)\b/i,
  'cognition': /\b(know|think|understand|wisdom|wise|fool|learn|teach|remember|forget|mind|thought|counsel|discern|perceive|reason)\b/i,
  'speech': /\b(speak|say|tell|word|voice|call|cry|answer|ask|command|declare|proclaim|swear|oath|praise|sing|shout|whisper)\b/i,
  'motion': /\b(go|come|walk|run|flee|return|send|bring|take|give|put|rise|fall|sit|stand|lie|dwell|enter|leave|pass|cross|ascend|descend)\b/i,
  'warfare': /\b(war|battle|fight|army|soldier|sword|spear|shield|bow|arrow|enemy|conquer|victory|defeat|kill|slay|smite|destroy)\b/i,
  'social': /\b(king|queen|prince|chief|ruler|judge|elder|servant|slave|master|people|nation|assembly|congregation|stranger|neighbor)\b/i,
  'legal': /\b(statute|ordinance|judgment|decree|witness|testimony|inherit|possess|guilt|innocent|judge|justice|righteous)\b/i,
  'building': /\b(house|tent|door|gate|wall|roof|tower|city|village|build|palace|fortress|foundation|pillar|room)\b/i,
  'food': /\b(eat|drink|bread|wine|oil|honey|meat|milk|food|meal|feast|fast|hunger|thirst|bitter|sweet|salt)\b/i,
  'clothing': /\b(garment|cloth|robe|tunic|cloak|linen|wool|wear|dress|naked|cover|veil|belt|shoe|sandal)\b/i,
  'commerce': /\b(buy|sell|price|money|silver|gold|weight|measure|trade|merchant|wage|debt|loan|rich|poor)\b/i,
  'time': /\b(day|night|morning|evening|year|month|week|season|time|hour|moment|eternal|forever|ancient|new|old|begin|end)\b/i,
  'work': /\b(work|labor|make|create|break|cut|strike|write|count|measure|serve|craft|skill)\b/i,
};

function inferSemanticField(definition, pos) {
  if (!definition) return null;
  const def = definition.toLowerCase();

  for (const [field, pattern] of Object.entries(SEMANTIC_PATTERNS)) {
    if (pattern.test(def)) {
      return field;
    }
  }

  // POS-based fallback
  if (pos) {
    const posLower = pos.toLowerCase();
    if (/proper.?name|pr\.?n/i.test(posLower)) return 'proper_name';
    if (/interj/i.test(posLower)) return 'exclamation';
  }

  return null;
}

// ============================================================================
// POS INFERENCE
// ============================================================================

function inferPOS(definition) {
  if (!definition) return null;
  const def = definition.toLowerCase();

  // Check start of definition
  if (/^to\s/i.test(def)) return 'verb';
  if (/^(vb\.|verb)/i.test(def)) return 'verb';
  if (/^(n\.|noun)/i.test(def)) return 'noun';
  if (/^(adj\.|adjective)/i.test(def)) return 'adjective';
  if (/^(adv\.|adverb)/i.test(def)) return 'adverb';
  if (/^(prep\.|preposition)/i.test(def)) return 'preposition';
  if (/^(conj\.|conjunction)/i.test(def)) return 'conjunction';
  if (/^(interj\.|interjection)/i.test(def)) return 'interjection';
  if (/proper name|pr\.n\./i.test(def)) return 'proper name';

  // Check content patterns
  if (/\bmasculine\b|\bfeminine\b/i.test(def)) return 'noun';
  if (/\bplural\b.*\bnoun\b/i.test(def)) return 'noun';

  return null;
}

// ============================================================================
// MAIN V3 ENRICHMENT
// ============================================================================

async function crossEnrichV3() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║         CROSS-ENRICHMENT V3 - Maximum Data Quality                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Load all dictionaries
  console.log('Loading dictionaries...');

  const bdb = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bdbComplete.json'), 'utf8'));
  const jastrow = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'jastrowComplete.json'), 'utf8'));
  const strongs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'strongsComplete.json'), 'utf8'));
  const gesenius = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'gesenius_lexicon.json'), 'utf8'));
  const cal = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cal_aramaic.json'), 'utf8'));
  const klein = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'klein_lexicon.json'), 'utf8'));

  const bdbEntries = bdb.byWord || bdb;
  const jastrowEntries = jastrow.byWord || jastrow;
  const strongsByWord = strongs.byWord || {};
  const geseniusEntries = gesenius.byWord || gesenius;

  console.log(`  BDB: ${Object.keys(bdbEntries).filter(k => !k.startsWith('_')).length}`);
  console.log(`  Jastrow: ${Object.keys(jastrowEntries).filter(k => !k.startsWith('_')).length}`);
  console.log(`  Strong's: ${Object.keys(strongsByWord).filter(k => !k.startsWith('_')).length}`);
  console.log(`  Gesenius: ${Object.keys(geseniusEntries).filter(k => !k.startsWith('_')).length}`);
  console.log(`  CAL: ${Object.keys(cal).filter(k => !k.startsWith('_')).length}`);
  console.log(`  Klein: ${Object.keys(klein).filter(k => !k.startsWith('_')).length}`);

  // ============================================================================
  // PHASE 1: Build comprehensive indices
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Building indices...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Word -> Strong's number
  const wordToStrong = {};
  const rootToStrong = {};

  // From Strong's
  for (const [word, entry] of Object.entries(strongsByWord)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    const snum = entry.strongs || entry.strong;
    if (key && snum) {
      wordToStrong[key] = snum;
      const root = entry.root || extractRoot(key);
      if (root && !rootToStrong[root]) {
        rootToStrong[root] = snum;
      }
    }
  }

  // From BDB
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    const snum = entry.strongs || entry.strong;
    if (key && snum) {
      if (!wordToStrong[key]) wordToStrong[key] = snum;
      const root = entry.root || extractRoot(key);
      if (root && !rootToStrong[root]) {
        rootToStrong[root] = snum;
      }
    }
  }

  // From Klein
  for (const [word, entry] of Object.entries(klein)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    const snum = entry.strongs || entry.strong || entry.strongNumber;
    if (key && snum) {
      if (!wordToStrong[key]) wordToStrong[key] = snum;
      const root = entry.root || extractRoot(key);
      if (root && !rootToStrong[root]) {
        rootToStrong[root] = snum;
      }
    }
  }

  console.log(`  Word->Strong: ${Object.keys(wordToStrong).length} mappings`);
  console.log(`  Root->Strong: ${Object.keys(rootToStrong).length} roots`);

  // Word -> Semantic field (from Klein)
  const wordToSemantic = {};
  const rootToSemantic = {};

  for (const [word, entry] of Object.entries(klein)) {
    if (word.startsWith('_')) continue;
    if (entry.semanticField) {
      const key = cleanKey(word);
      wordToSemantic[key] = entry.semanticField;
      const root = entry.root || extractRoot(key);
      if (root && !rootToSemantic[root]) {
        rootToSemantic[root] = entry.semanticField;
      }
    }
  }

  // Also from BDB
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    if (entry.semanticField) {
      const key = cleanKey(word);
      if (!wordToSemantic[key]) wordToSemantic[key] = entry.semanticField;
      const root = entry.root || extractRoot(key);
      if (root && !rootToSemantic[root]) {
        rootToSemantic[root] = entry.semanticField;
      }
    }
  }

  console.log(`  Word->Semantic: ${Object.keys(wordToSemantic).length} mappings`);
  console.log(`  Root->Semantic: ${Object.keys(rootToSemantic).length} roots`);

  // Collect all valid cognates for sharing
  const wordToCognates = {};
  const rootToCognates = {};

  function addCognates(key, cognates, root) {
    if (!cognates || cognates.length === 0) return;
    const validCognates = cleanCognateList(cognates);
    if (validCognates.length === 0) return;

    if (!wordToCognates[key]) wordToCognates[key] = [];
    for (const c of validCognates) {
      if (!wordToCognates[key].includes(c)) {
        wordToCognates[key].push(c);
      }
    }

    if (root) {
      if (!rootToCognates[root]) rootToCognates[root] = [];
      for (const c of validCognates) {
        if (!rootToCognates[root].includes(c)) {
          rootToCognates[root].push(c);
        }
      }
    }
  }

  // Collect from all sources
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    addCognates(key, entry.cognates, entry.root || extractRoot(key));

    // Extract from fullDef
    if (entry.fullDef) {
      const extracted = extractCognatesFromFullDef(entry.fullDef);
      addCognates(key, extracted, entry.root || extractRoot(key));
    }
  }

  for (const [word, entry] of Object.entries(strongsByWord)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    addCognates(key, entry.cognates, entry.root || extractRoot(key));
  }

  for (const [word, entry] of Object.entries(klein)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    addCognates(key, entry.cognates, entry.root || extractRoot(key));
  }

  for (const [word, entry] of Object.entries(geseniusEntries)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    addCognates(key, entry.cognates, entry.root || extractRoot(key));

    // Extract from fullDef/definition
    const fullDef = entry.fullDef || entry.definition || '';
    if (fullDef.length > 50) {
      const extracted = extractCognatesFromFullDef(fullDef);
      addCognates(key, extracted, entry.root || extractRoot(key));
    }
  }

  console.log(`  Word->Cognates: ${Object.keys(wordToCognates).length} words`);
  console.log(`  Root->Cognates: ${Object.keys(rootToCognates).length} roots`);

  // ============================================================================
  // PHASE 2: Enrich each dictionary
  // ============================================================================

  const stats = {
    bdb: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
    jastrow: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
    strongs: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
    gesenius: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
    cal: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
    klein: { cleaned: 0, strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0, posAdded: 0 },
  };

  function enrichEntry(entry, key, stat) {
    const root = entry.root || extractRoot(key);

    // 1. CLEAN malformed cognates
    if (entry.cognates && entry.cognates.length > 0) {
      const before = entry.cognates.length;
      entry.cognates = cleanCognateList(entry.cognates);
      if (entry.cognates.length < before) {
        stat.cleaned += (before - entry.cognates.length);
      }
    }

    // 2. ADD Strong's if missing (try word, then root)
    if (!entry.strongs && !entry.strong && !entry.strongNumber) {
      if (wordToStrong[key]) {
        entry.strongs = wordToStrong[key];
        stat.strongsAdded++;
      } else if (root && rootToStrong[root]) {
        entry.strongs = rootToStrong[root];
        stat.strongsAdded++;
      }
    }

    // 3. ADD/EXPAND cognates
    let cognateList = entry.cognates ? [...entry.cognates] : [];

    // From word match
    if (wordToCognates[key]) {
      for (const c of wordToCognates[key]) {
        if (!cognateList.includes(c)) cognateList.push(c);
      }
    }

    // From root match
    if (root && rootToCognates[root]) {
      for (const c of rootToCognates[root]) {
        if (!cognateList.includes(c)) cognateList.push(c);
      }
    }

    if (cognateList.length > (entry.cognates?.length || 0)) {
      entry.cognates = cognateList.slice(0, 10);
      stat.cognatesAdded++;
    }

    // 4. ADD or FIX semantic field
    const def = entry.definition || entry.gloss || entry.fullDef || '';
    const inferred = inferSemanticField(def, entry.pos);

    // Re-evaluate if current semantic field seems wrong
    // (e.g., "divine" for a word whose definition says "outside, street")
    const shouldReEvaluate = entry.semanticField && inferred &&
      entry.semanticField !== inferred &&
      def.length > 20; // Only re-evaluate if we have enough definition text

    if (!entry.semanticField || shouldReEvaluate) {
      // Prefer inference from definition (most accurate)
      if (inferred) {
        if (entry.semanticField !== inferred) {
          entry.semanticField = inferred;
          stat.semanticAdded++;
        }
      }
      // Fallback: Try direct word match
      else if (wordToSemantic[key]) {
        entry.semanticField = wordToSemantic[key];
        stat.semanticAdded++;
      }
      // Fallback: Try root match
      else if (root && rootToSemantic[root]) {
        entry.semanticField = rootToSemantic[root];
        stat.semanticAdded++;
      }
    }

    // 5. ADD POS if missing
    if (!entry.pos) {
      const defText = entry.definition || entry.fullDef || '';
      const inferredPOS = inferPOS(defText);
      if (inferredPOS) {
        entry.pos = inferredPOS;
        stat.posAdded++;
      }
    }
  }

  // Process each dictionary
  const dictionaries = [
    { name: 'BDB', entries: bdbEntries, stat: stats.bdb },
    { name: 'Jastrow', entries: jastrowEntries, stat: stats.jastrow },
    { name: "Strong's", entries: strongsByWord, stat: stats.strongs },
    { name: 'Gesenius', entries: geseniusEntries, stat: stats.gesenius },
    { name: 'CAL', entries: cal, stat: stats.cal },
    { name: 'Klein', entries: klein, stat: stats.klein },
  ];

  for (const dict of dictionaries) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`PHASE 2: Enriching ${dict.name}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const [word, entry] of Object.entries(dict.entries)) {
      if (word.startsWith('_')) continue;
      enrichEntry(entry, cleanKey(word), dict.stat);
    }

    console.log(`  Cognates cleaned: ${dict.stat.cleaned}`);
    console.log(`  Strong's added:   ${dict.stat.strongsAdded}`);
    console.log(`  Cognates added:   ${dict.stat.cognatesAdded}`);
    console.log(`  Semantic added:   ${dict.stat.semanticAdded}`);
    console.log(`  POS added:        ${dict.stat.posAdded}`);
  }

  // ============================================================================
  // PHASE 3: Write back all files
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 3: Writing enriched files...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const timestamp = new Date().toISOString();

  // Update metadata and write
  if (bdb._meta) bdb._meta.crossEnrichedV3 = { ...stats.bdb, at: timestamp };
  if (jastrow._meta) jastrow._meta.crossEnrichedV3 = { ...stats.jastrow, at: timestamp };
  if (strongs._meta) strongs._meta.crossEnrichedV3 = { ...stats.strongs, at: timestamp };
  if (gesenius._meta) gesenius._meta.crossEnrichedV3 = { ...stats.gesenius, at: timestamp };
  if (cal._meta) cal._meta.crossEnrichedV3 = { ...stats.cal, at: timestamp };
  if (klein._meta) klein._meta.crossEnrichedV3 = { ...stats.klein, at: timestamp };

  fs.writeFileSync(path.join(DATA_DIR, 'bdbComplete.json'), JSON.stringify(bdb, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'jastrowComplete.json'), JSON.stringify(jastrow, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'strongsComplete.json'), JSON.stringify(strongs, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'gesenius_lexicon.json'), JSON.stringify(gesenius, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'cal_aramaic.json'), JSON.stringify(cal, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'klein_lexicon.json'), JSON.stringify(klein, null, 2));

  console.log('  All files written successfully.');

  // ============================================================================
  // PHASE 4: Calculate final metrics
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 4: Final Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  function calcMetrics(entries, name) {
    let total = 0, def = 0, pos = 0, strong = 0, cog = 0, root = 0, sem = 0;

    for (const [k, v] of Object.entries(entries)) {
      if (k.startsWith('_')) continue;
      total++;
      if (v.definition || v.gloss || v.fullDef) def++;
      if (v.pos) pos++;
      if (v.strongs || v.strong || v.strongNumber) strong++;
      if (v.cognates && v.cognates.length > 0) cog++;
      if (v.root) root++;
      if (v.semanticField) sem++;
    }

    const p = n => total ? Math.round(n / total * 100) : 0;
    return { name, total, def: p(def), pos: p(pos), strong: p(strong), cog: p(cog), root: p(root), sem: p(sem) };
  }

  const metrics = [
    calcMetrics(bdbEntries, 'BDB'),
    calcMetrics(jastrowEntries, 'Jastrow'),
    calcMetrics(strongsByWord, "Strong's"),
    calcMetrics(geseniusEntries, 'Gesenius'),
    calcMetrics(cal, 'CAL'),
    calcMetrics(klein, 'Klein'),
  ];

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    V3 ENRICHMENT COMPLETE                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  console.log('\n┌────────────┬─────────┬──────┬──────┬──────────┬──────────┬──────┬──────────┐');
  console.log('│ Dictionary │ Entries │ Def  │ POS  │ Strong\'s │ Cognates │ Root │ Semantic │');
  console.log('├────────────┼─────────┼──────┼──────┼──────────┼──────────┼──────┼──────────┤');

  for (const m of metrics) {
    console.log(`│ ${m.name.padEnd(10)} │ ${String(m.total).padStart(7)} │ ${(m.def + '%').padStart(4)} │ ${(m.pos + '%').padStart(4)} │ ${(m.strong + '%').padStart(8)} │ ${(m.cog + '%').padStart(8)} │ ${(m.root + '%').padStart(4)} │ ${(m.sem + '%').padStart(8)} │`);
  }

  console.log('└────────────┴─────────┴──────┴──────┴──────────┴──────────┴──────┴──────────┘');
}

crossEnrichV3().catch(console.error);
