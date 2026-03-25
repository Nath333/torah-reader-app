/**
 * Cross-Enrichment V2 - Improved Data Quality
 *
 * Targets:
 * - Cognates: 36% -> 70%+
 * - Semantic: 1% -> 50%+
 * - Strong's: Jastrow 14% -> 40%+, CAL 9% -> 30%+
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

// ============================================================================
// SEMANTIC FIELD MAPPING - Infer from definitions and POS
// ============================================================================
const SEMANTIC_PATTERNS = {
  // Religious/Ritual
  'religious': /\b(god|lord|divine|holy|sacred|priest|temple|altar|sacrifice|worship|pray|bless|curse|sabbath|festival|covenant|torah|law|commandment|sin|atonement|purif|consecrat|sanctif)\b/i,
  'worship': /\b(pray|worship|bow|prostrat|offer|sacrifice|incense|libation|vow|nazir)\b/i,

  // Family/Social
  'kinship': /\b(father|mother|son|daughter|brother|sister|wife|husband|child|family|clan|tribe|ancestor|descend|kinsman|relative|widow|orphan)\b/i,
  'social': /\b(king|queen|prince|chief|ruler|judge|elder|servant|slave|master|people|nation|assembly|congregation)\b/i,

  // Body/Physical
  'body': /\b(head|face|eye|ear|nose|mouth|lip|tongue|tooth|hand|arm|foot|leg|heart|blood|bone|flesh|skin|hair|body)\b/i,
  'health': /\b(heal|sick|disease|plague|leprosy|wound|pain|death|die|kill|life|live|birth|bear|conceive)\b/i,

  // Nature/Agriculture
  'agriculture': /\b(plant|sow|reap|harvest|field|vineyard|grain|wheat|barley|fruit|tree|seed|plow|thresh)\b/i,
  'animal': /\b(ox|cow|sheep|goat|lamb|donkey|horse|camel|lion|bird|fish|serpent|beast|cattle|flock|herd)\b/i,
  'nature': /\b(water|sea|river|rain|cloud|wind|fire|earth|land|mountain|hill|valley|desert|stone|rock)\b/i,
  'time': /\b(day|night|morning|evening|year|month|week|season|time|hour|moment|eternal|forever)\b/i,

  // Abstract/Cognitive
  'emotion': /\b(love|hate|fear|anger|joy|sorrow|grief|weep|rejoice|happy|sad|anxious|hope|despair)\b/i,
  'cognition': /\b(know|think|understand|wisdom|wise|fool|learn|teach|remember|forget|mind|thought|counsel)\b/i,
  'speech': /\b(speak|say|tell|word|voice|call|cry|answer|ask|command|declare|proclaim|swear|oath)\b/i,
  'ethics': /\b(good|evil|righteous|wicked|just|unjust|true|false|honest|deceit|guilt|innocent|judge|judgment)\b/i,

  // Actions/Movement
  'motion': /\b(go|come|walk|run|flee|return|send|bring|take|give|put|rise|fall|sit|stand|lie|dwell)\b/i,
  'work': /\b(work|labor|make|build|create|destroy|break|cut|strike|write|count|measure)\b/i,
  'warfare': /\b(war|battle|fight|army|soldier|sword|spear|shield|bow|arrow|enemy|conquer|victory|defeat)\b/i,

  // Material/Objects
  'clothing': /\b(garment|cloth|robe|tunic|cloak|linen|wool|wear|dress|naked)\b/i,
  'food': /\b(eat|drink|bread|wine|oil|honey|meat|milk|food|meal|feast|fast|hunger|thirst)\b/i,
  'building': /\b(house|tent|door|gate|wall|roof|tower|city|village|dwell|build)\b/i,
  'commerce': /\b(buy|sell|price|money|silver|gold|weight|measure|trade|merchant)\b/i,

  // Legal/Covenant
  'legal': /\b(law|statute|ordinance|judgment|decree|witness|testimony|inherit|possess)\b/i,
  'covenant': /\b(covenant|promise|oath|swear|vow|faithful|loyalty|treaty)\b/i
};

function inferSemanticField(definition, pos) {
  if (!definition) return null;
  const def = definition.toLowerCase();

  // Check each pattern
  for (const [field, pattern] of Object.entries(SEMANTIC_PATTERNS)) {
    if (pattern.test(def)) {
      return field;
    }
  }

  // POS-based inference
  if (pos) {
    const posLower = pos.toLowerCase();
    if (/verb|vb\.?/.test(posLower)) {
      if (/speak|say|tell/.test(def)) return 'speech';
      if (/go|come|walk|run/.test(def)) return 'motion';
      if (/make|build|create/.test(def)) return 'work';
    }
    if (/proper.?name|pr\.?n/.test(posLower)) return 'proper_name';
    if (/interj/.test(posLower)) return 'exclamation';
  }

  return null;
}

// ============================================================================
// ROOT EXTRACTION - For matching
// ============================================================================
function extractRoot(word) {
  if (!word) return null;
  // Remove niqqud
  let clean = word.replace(/[\u0591-\u05C7]/g, '').trim();
  // Remove common prefixes/suffixes
  clean = clean.replace(/^[והבכלמש]/, ''); // Prefixes
  clean = clean.replace(/[ויתםןה]$/, ''); // Suffixes
  // Get 3-letter root if possible
  if (clean.length >= 3) {
    return clean.substring(0, 3);
  }
  return clean;
}

function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

// ============================================================================
// MAIN ENRICHMENT
// ============================================================================
async function crossEnrichV2() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           CROSS-ENRICHMENT V2 - Improved Data Quality                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Load all dictionaries
  console.log('Loading dictionaries...');

  const bdbPath = path.join(DATA_DIR, 'bdbComplete.json');
  const jastrowPath = path.join(DATA_DIR, 'jastrowComplete.json');
  const strongsPath = path.join(DATA_DIR, 'strongsComplete.json');
  const geseniusPath = path.join(DATA_DIR, 'gesenius_lexicon.json');
  const calPath = path.join(DATA_DIR, 'cal_aramaic.json');
  const etymPath = path.join(DATA_DIR, 'etymology_unified_pro.json');
  const rootPath = path.join(DATA_DIR, 'root_meanings_pro.json');

  const bdb = JSON.parse(fs.readFileSync(bdbPath, 'utf8'));
  const jastrow = JSON.parse(fs.readFileSync(jastrowPath, 'utf8'));
  const strongs = JSON.parse(fs.readFileSync(strongsPath, 'utf8'));
  const gesenius = JSON.parse(fs.readFileSync(geseniusPath, 'utf8'));
  const cal = JSON.parse(fs.readFileSync(calPath, 'utf8'));

  let etymData = {};
  if (fs.existsSync(etymPath)) {
    const etymFile = JSON.parse(fs.readFileSync(etymPath, 'utf8'));
    etymData = etymFile.entries || etymFile;
  }

  let rootData = {};
  if (fs.existsSync(rootPath)) {
    const rootFile = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
    rootData = rootFile.entries || rootFile;
  }

  const bdbEntries = bdb.byWord || bdb;
  const jastrowEntries = jastrow.byWord || jastrow;
  const strongsByWord = strongs.byWord || {};
  const strongsByNum = strongs.byStrongs || {};
  const geseniusEntries = gesenius.byWord || gesenius;

  console.log(`  BDB: ${Object.keys(bdbEntries).length} entries`);
  console.log(`  Jastrow: ${Object.keys(jastrowEntries).length} entries`);
  console.log(`  Strong's: ${Object.keys(strongsByWord).length} by word`);
  console.log(`  Gesenius: ${Object.keys(geseniusEntries).length} entries`);
  console.log(`  CAL: ${Object.keys(cal).filter(k => !k.startsWith('_')).length} entries`);
  console.log(`  Etymology: ${Object.keys(etymData).filter(k => !k.startsWith('_')).length} entries`);

  // ============================================================================
  // PHASE 1: Build comprehensive indices
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Building indices...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Word -> Strong's number (from multiple sources)
  const wordToStrong = {};
  const rootToStrongs = {};  // Root -> list of Strong's numbers
  const strongToRoot = {};   // Strong's -> root

  // From Strong's dictionary
  for (const [word, entry] of Object.entries(strongsByWord)) {
    const key = cleanKey(word);
    const strongNum = entry.strongs || entry.strong || entry.strongNumber;
    if (key && strongNum) {
      wordToStrong[key] = strongNum;
      const root = entry.root || extractRoot(key);
      if (root) {
        strongToRoot[strongNum] = root;
        if (!rootToStrongs[root]) rootToStrongs[root] = [];
        if (!rootToStrongs[root].includes(strongNum)) {
          rootToStrongs[root].push(strongNum);
        }
      }
    }
  }

  // From BDB
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    const strongNum = entry.strongs || entry.strong;
    if (key && strongNum && !wordToStrong[key]) {
      wordToStrong[key] = strongNum;
    }
    if (entry.root && strongNum) {
      if (!rootToStrongs[entry.root]) rootToStrongs[entry.root] = [];
      if (!rootToStrongs[entry.root].includes(strongNum)) {
        rootToStrongs[entry.root].push(strongNum);
      }
    }
  }

  console.log(`  Word->Strong: ${Object.keys(wordToStrong).length} mappings`);
  console.log(`  Root->Strongs: ${Object.keys(rootToStrongs).length} roots`);

  // Collect all cognates from all sources for sharing
  const wordToCognates = {};
  const rootToCognates = {};

  // From etymology
  for (const [word, entry] of Object.entries(etymData)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    if (entry?.etymology?.cognates || entry?.cognates) {
      const cognates = entry?.etymology?.cognates || entry?.cognates;
      const cognateList = [];
      for (const [lang, cogs] of Object.entries(cognates)) {
        if (Array.isArray(cogs)) {
          for (const cog of cogs.slice(0, 3)) {
            const cogWord = typeof cog === 'string' ? cog : cog.word;
            if (cogWord) {
              const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
              const formatted = `${langName}: ${cogWord}`;
              if (!cognateList.includes(formatted)) {
                cognateList.push(formatted);
              }
            }
          }
        }
      }
      if (cognateList.length > 0) {
        wordToCognates[key] = cognateList;
        const root = entry.root || extractRoot(key);
        if (root) {
          if (!rootToCognates[root]) rootToCognates[root] = [];
          for (const c of cognateList) {
            if (!rootToCognates[root].includes(c)) {
              rootToCognates[root].push(c);
            }
          }
        }
      }
    }
  }

  // From BDB (rich in cognates)
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    const key = cleanKey(word);
    if (entry.cognates && entry.cognates.length > 0) {
      if (!wordToCognates[key]) wordToCognates[key] = [];
      for (const c of entry.cognates) {
        if (!wordToCognates[key].includes(c)) {
          wordToCognates[key].push(c);
        }
      }
      const root = entry.root || extractRoot(key);
      if (root) {
        if (!rootToCognates[root]) rootToCognates[root] = [];
        for (const c of entry.cognates) {
          if (!rootToCognates[root].includes(c)) {
            rootToCognates[root].push(c);
          }
        }
      }
    }
  }

  console.log(`  Word->Cognates: ${Object.keys(wordToCognates).length} words with cognates`);
  console.log(`  Root->Cognates: ${Object.keys(rootToCognates).length} roots with cognates`);

  // ============================================================================
  // PHASE 2: Enrich each dictionary
  // ============================================================================

  const results = {
    bdb: { strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0 },
    jastrow: { strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0 },
    strongs: { strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0 },
    gesenius: { strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0 },
    cal: { strongsAdded: 0, cognatesAdded: 0, semanticAdded: 0 }
  };

  // Helper function to enrich an entry
  function enrichEntry(entry, key, stats) {
    // 1. Add Strong's if missing (try word, then root)
    if (!entry.strongs && !entry.strong && !entry.strongNumber) {
      if (wordToStrong[key]) {
        entry.strongs = wordToStrong[key];
        stats.strongsAdded++;
      } else {
        // Try root-based matching
        const root = entry.root || extractRoot(key);
        if (root && rootToStrongs[root] && rootToStrongs[root].length === 1) {
          // Only assign if unambiguous (single Strong's for this root)
          entry.strongs = rootToStrongs[root][0];
          stats.strongsAdded++;
        }
      }
    }

    // 2. Add cognates if missing or few
    if (!entry.cognates || entry.cognates.length < 2) {
      let newCognates = entry.cognates ? [...entry.cognates] : [];

      // Try direct word match
      if (wordToCognates[key]) {
        for (const c of wordToCognates[key]) {
          if (!newCognates.includes(c)) newCognates.push(c);
        }
      }

      // Try root match
      const root = entry.root || extractRoot(key);
      if (root && rootToCognates[root]) {
        for (const c of rootToCognates[root]) {
          if (!newCognates.includes(c)) newCognates.push(c);
        }
      }

      if (newCognates.length > (entry.cognates?.length || 0)) {
        entry.cognates = newCognates.slice(0, 8);
        stats.cognatesAdded++;
      }
    }

    // 3. Add semantic field if missing
    if (!entry.semanticField) {
      const def = entry.definition || entry.gloss || entry.fullDef || '';
      const pos = entry.pos || '';
      const semantic = inferSemanticField(def, pos);
      if (semantic) {
        entry.semanticField = semantic;
        stats.semanticAdded++;
      }
    }
  }

  // Enrich BDB
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2a: Enriching BDB...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [word, entry] of Object.entries(bdbEntries)) {
    if (word.startsWith('_')) continue;
    enrichEntry(entry, cleanKey(word), results.bdb);
  }
  console.log(`  Strong's added: ${results.bdb.strongsAdded}`);
  console.log(`  Cognates added: ${results.bdb.cognatesAdded}`);
  console.log(`  Semantic added: ${results.bdb.semanticAdded}`);

  // Enrich Jastrow
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2b: Enriching Jastrow...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [word, entry] of Object.entries(jastrowEntries)) {
    if (word.startsWith('_')) continue;
    enrichEntry(entry, cleanKey(word), results.jastrow);
  }
  console.log(`  Strong's added: ${results.jastrow.strongsAdded}`);
  console.log(`  Cognates added: ${results.jastrow.cognatesAdded}`);
  console.log(`  Semantic added: ${results.jastrow.semanticAdded}`);

  // Enrich Strong's
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2c: Enriching Strong\'s...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [word, entry] of Object.entries(strongsByWord)) {
    if (word.startsWith('_')) continue;
    enrichEntry(entry, cleanKey(word), results.strongs);
  }
  console.log(`  Strong's added: ${results.strongs.strongsAdded}`);
  console.log(`  Cognates added: ${results.strongs.cognatesAdded}`);
  console.log(`  Semantic added: ${results.strongs.semanticAdded}`);

  // Enrich Gesenius
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2d: Enriching Gesenius...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [word, entry] of Object.entries(geseniusEntries)) {
    if (word.startsWith('_')) continue;
    enrichEntry(entry, cleanKey(word), results.gesenius);
  }
  console.log(`  Strong's added: ${results.gesenius.strongsAdded}`);
  console.log(`  Cognates added: ${results.gesenius.cognatesAdded}`);
  console.log(`  Semantic added: ${results.gesenius.semanticAdded}`);

  // Enrich CAL
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2e: Enriching CAL...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [word, entry] of Object.entries(cal)) {
    if (word.startsWith('_')) continue;
    enrichEntry(entry, cleanKey(word), results.cal);
  }
  console.log(`  Strong's added: ${results.cal.strongsAdded}`);
  console.log(`  Cognates added: ${results.cal.cognatesAdded}`);
  console.log(`  Semantic added: ${results.cal.semanticAdded}`);

  // ============================================================================
  // PHASE 3: Write back all files
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 3: Writing enriched files...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Update metadata
  const timestamp = new Date().toISOString();

  if (bdb._meta) {
    bdb._meta.crossEnrichedV2 = { ...results.bdb, at: timestamp };
  }
  if (jastrow._meta) {
    jastrow._meta.crossEnrichedV2 = { ...results.jastrow, at: timestamp };
  }
  if (strongs._meta) {
    strongs._meta.crossEnrichedV2 = { ...results.strongs, at: timestamp };
  }
  if (gesenius._meta) {
    gesenius._meta.crossEnrichedV2 = { ...results.gesenius, at: timestamp };
  }
  if (cal._meta) {
    cal._meta.crossEnrichedV2 = { ...results.cal, at: timestamp };
  }

  fs.writeFileSync(bdbPath, JSON.stringify(bdb, null, 2), 'utf8');
  console.log('  Written: bdbComplete.json');

  fs.writeFileSync(jastrowPath, JSON.stringify(jastrow, null, 2), 'utf8');
  console.log('  Written: jastrowComplete.json');

  fs.writeFileSync(strongsPath, JSON.stringify(strongs, null, 2), 'utf8');
  console.log('  Written: strongsComplete.json');

  fs.writeFileSync(geseniusPath, JSON.stringify(gesenius, null, 2), 'utf8');
  console.log('  Written: gesenius_lexicon.json');

  fs.writeFileSync(calPath, JSON.stringify(cal, null, 2), 'utf8');
  console.log('  Written: cal_aramaic.json');

  // ============================================================================
  // PHASE 4: Calculate and display new metrics
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 4: Calculating new metrics...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  function calcMetrics(entries, name) {
    let total = 0, withDef = 0, withPos = 0, withStrong = 0;
    let withCognates = 0, withRoot = 0, withSemantic = 0;

    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;
      total++;
      if (entry.definition || entry.gloss || entry.fullDef) withDef++;
      if (entry.pos) withPos++;
      if (entry.strongs || entry.strong || entry.strongNumber) withStrong++;
      if (entry.cognates && entry.cognates.length > 0) withCognates++;
      if (entry.root) withRoot++;
      if (entry.semanticField) withSemantic++;
    }

    const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;

    console.log(`\n${name}:`);
    console.log(`  Entries:    ${total}`);
    console.log(`  Definition: ${pct(withDef)}%`);
    console.log(`  POS:        ${pct(withPos)}%`);
    console.log(`  Strong's:   ${pct(withStrong)}%`);
    console.log(`  Cognates:   ${pct(withCognates)}%`);
    console.log(`  Root:       ${pct(withRoot)}%`);
    console.log(`  Semantic:   ${pct(withSemantic)}%`);

    return { name, total, withDef, withPos, withStrong, withCognates, withRoot, withSemantic };
  }

  const metrics = [
    calcMetrics(bdbEntries, 'BDB'),
    calcMetrics(jastrowEntries, 'Jastrow'),
    calcMetrics(strongsByWord, "Strong's"),
    calcMetrics(geseniusEntries, 'Gesenius'),
    calcMetrics(cal, 'CAL')
  ];

  // Summary table
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    ENRICHMENT V2 COMPLETE                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');

  console.log('\nData Quality Summary:');
  console.log('┌────────────┬─────────┬──────┬──────┬──────────┬──────────┬──────┬──────────┐');
  console.log('│ Dictionary │ Entries │ Def  │ POS  │ Strong\'s │ Cognates │ Root │ Semantic │');
  console.log('├────────────┼─────────┼──────┼──────┼──────────┼──────────┼──────┼──────────┤');

  for (const m of metrics) {
    const pct = (n) => m.total > 0 ? Math.round(n / m.total * 100) : 0;
    console.log(`│ ${m.name.padEnd(10)} │ ${String(m.total).padStart(7)} │ ${String(pct(m.withDef) + '%').padStart(4)} │ ${String(pct(m.withPos) + '%').padStart(4)} │ ${String(pct(m.withStrong) + '%').padStart(8)} │ ${String(pct(m.withCognates) + '%').padStart(8)} │ ${String(pct(m.withRoot) + '%').padStart(4)} │ ${String(pct(m.withSemantic) + '%').padStart(8)} │`);
  }

  console.log('└────────────┴─────────┴──────┴──────┴──────────┴──────────┴──────┴──────────┘');
}

crossEnrichV2().catch(console.error);
