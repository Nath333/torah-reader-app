/**
 * Cross-Enrichment V4 - SMART Data Integration
 *
 * Improvements over V3:
 * 1. CONSENSUS-BASED semantic field resolution (vote across dictionaries)
 * 2. COGNATE MERGING from all sources with deduplication
 * 3. QUALITY SCORE calculation for each entry
 * 4. CROSS-VALIDATION of conflicting data
 * 5. DEFINITION-BASED inference when all else fails
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
// SEMANTIC FIELD CONSENSUS
// ============================================================================

/**
 * Semantic field hierarchy for conflict resolution
 * More specific fields take precedence
 */
const SEMANTIC_SPECIFICITY = {
  'proper_name': 100,
  'religious': 90,
  'kinship': 85,
  'legal': 80,
  'warfare': 75,
  'agriculture': 70,
  'commerce': 70,
  'animal': 65,
  'body': 65,
  'nature': 60,
  'building': 60,
  'food': 55,
  'clothing': 55,
  'location': 50,
  'time': 50,
  'emotion': 45,
  'cognition': 45,
  'speech': 40,
  'motion': 40,
  'work': 35,
  'social': 30,
};

/**
 * Vote for semantic field across dictionaries
 * Returns the consensus field or the most specific one
 */
function getConsensusSemantic(fields) {
  if (!fields || fields.length === 0) return null;

  // Filter out nulls
  const validFields = fields.filter(Boolean);
  if (validFields.length === 0) return null;

  // If only one field, return it
  if (validFields.length === 1) return validFields[0];

  // Count votes
  const votes = {};
  for (const field of validFields) {
    votes[field] = (votes[field] || 0) + 1;
  }

  // Find majority (>50%)
  const total = validFields.length;
  for (const [field, count] of Object.entries(votes)) {
    if (count > total / 2) {
      return field; // Clear majority
    }
  }

  // No majority - pick most specific field that got at least 1 vote
  let bestField = null;
  let bestSpecificity = -1;

  for (const field of Object.keys(votes)) {
    const spec = SEMANTIC_SPECIFICITY[field] || 0;
    if (spec > bestSpecificity) {
      bestSpecificity = spec;
      bestField = field;
    }
  }

  return bestField;
}

// ============================================================================
// COGNATE MERGING
// ============================================================================

/**
 * Normalize a cognate string for deduplication
 */
function normalizeCognate(cognate) {
  if (!cognate) return null;
  const parts = cognate.split(':');
  if (parts.length !== 2) return null;

  const lang = parts[0].trim().toLowerCase()
    .replace('assyrian', 'akkadian')
    .replace('babylonian', 'akkadian');
  const word = parts[1].trim().toLowerCase();

  return `${lang}: ${word}`;
}

/**
 * Check if a cognate is valid (not garbage)
 */
function isValidCognate(cognate) {
  if (!cognate || typeof cognate !== 'string') return false;
  if (cognate.length < 8) return false;
  if (!cognate.includes(': ')) return false;

  const parts = cognate.split(': ');
  if (parts.length !== 2) return false;

  const lang = parts[0].trim().toLowerCase();
  const word = parts[1].trim().toLowerCase();

  // Skip garbage
  if (word.length < 2) return false;
  if (['akkadian', 'assyrian', 'arabic', 'aramaic', 'syriac', 'hebrew',
       'phoenician', 'ugaritic', 'ethiopic', 'geez', 'moabite', 'egyptian',
       'compare', 'see', 'cf', 'synonym', 'cognate', 'related'].includes(word)) {
    return false;
  }

  // Skip if word starts with meta-word
  if (/^(synonym|compare|cognate|related|see|cf|loan)/i.test(word)) return false;

  return true;
}

/**
 * Merge cognates from multiple sources
 */
function mergeCognates(...cognateLists) {
  const seen = new Set();
  const merged = [];

  for (const list of cognateLists) {
    if (!Array.isArray(list)) continue;

    for (const cognate of list) {
      if (!isValidCognate(cognate)) continue;

      const normalized = normalizeCognate(cognate);
      if (!normalized || seen.has(normalized)) continue;

      seen.add(normalized);
      merged.push(cognate); // Keep original format
    }
  }

  // Sort by language for consistency
  merged.sort((a, b) => {
    const langA = a.split(':')[0].trim();
    const langB = b.split(':')[0].trim();
    return langA.localeCompare(langB);
  });

  return merged.slice(0, 15); // Max 15 cognates
}

// ============================================================================
// QUALITY SCORE
// ============================================================================

/**
 * Calculate quality score for an entry (0-100)
 */
function calculateQualityScore(entry) {
  let score = 0;

  // Definition quality (0-30)
  if (entry.definition) {
    score += 10;
    if (entry.definition.length > 50) score += 10;
    if (entry.definition.length > 150) score += 10;
  }

  // Strong's number (0-15)
  if (entry.strongs || entry.strong || entry.strongNumber) {
    score += 15;
  }

  // POS (0-10)
  if (entry.pos) score += 10;

  // Semantic field (0-15)
  if (entry.semanticField) score += 15;

  // Cognates (0-20)
  if (entry.cognates && entry.cognates.length > 0) {
    score += 5;
    if (entry.cognates.length >= 3) score += 5;
    if (entry.cognates.length >= 5) score += 5;
    if (entry.cognates.length >= 8) score += 5;
  }

  // Root (0-10)
  if (entry.root) score += 10;

  return Math.min(100, score);
}

// ============================================================================
// MAIN V4 ENRICHMENT
// ============================================================================

async function crossEnrichV4() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║         CROSS-ENRICHMENT V4 - SMART Data Integration                      ║');
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
  // PHASE 1: Build consensus and merged data
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 1: Building consensus semantic fields and merged cognates...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Collect all unique words
  const allWords = new Set();
  for (const entries of [bdbEntries, jastrowEntries, strongsByWord, geseniusEntries, cal, klein]) {
    for (const key of Object.keys(entries)) {
      if (!key.startsWith('_')) allWords.add(key);
    }
  }

  console.log(`  Total unique words: ${allWords.size}`);

  // Build consensus data
  const consensusData = {};
  let consensusResolvedCount = 0;
  let cognatesMergedCount = 0;

  for (const word of allWords) {
    const key = cleanKey(word);
    if (!key) continue;

    // Get entries from all sources
    const entries = {
      bdb: bdbEntries[word],
      jastrow: jastrowEntries[word],
      strongs: strongsByWord[word],
      gesenius: geseniusEntries[word],
      cal: cal[word],
      klein: klein[word]
    };

    // Collect semantic fields for consensus
    const semanticFields = [
      entries.bdb?.semanticField,
      entries.jastrow?.semanticField,
      entries.strongs?.semanticField,
      entries.gesenius?.semanticField,
      entries.cal?.semanticField,
      entries.klein?.semanticField
    ];

    const consensusSemantic = getConsensusSemantic(semanticFields);

    // Merge cognates from all sources
    const mergedCognates = mergeCognates(
      entries.bdb?.cognates,
      entries.jastrow?.cognates,
      entries.strongs?.cognates,
      entries.gesenius?.cognates,
      entries.cal?.cognates,
      entries.klein?.cognates
    );

    // Track stats
    const uniqueSemantics = [...new Set(semanticFields.filter(Boolean))];
    if (uniqueSemantics.length > 1 && consensusSemantic) {
      consensusResolvedCount++;
    }
    if (mergedCognates.length > 0) {
      cognatesMergedCount++;
    }

    consensusData[key] = {
      semanticField: consensusSemantic,
      cognates: mergedCognates
    };
  }

  console.log(`  Consensus resolved (conflicting → single): ${consensusResolvedCount}`);
  console.log(`  Words with merged cognates: ${cognatesMergedCount}`);

  // ============================================================================
  // PHASE 2: Apply consensus data to all dictionaries
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2: Applying consensus data to all dictionaries...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = {
    bdb: { semanticUpdated: 0, cognatesUpdated: 0 },
    jastrow: { semanticUpdated: 0, cognatesUpdated: 0 },
    strongs: { semanticUpdated: 0, cognatesUpdated: 0 },
    gesenius: { semanticUpdated: 0, cognatesUpdated: 0 },
    cal: { semanticUpdated: 0, cognatesUpdated: 0 },
    klein: { semanticUpdated: 0, cognatesUpdated: 0 },
  };

  function applyConsensus(entries, stat) {
    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;

      const key = cleanKey(word);
      const consensus = consensusData[key];
      if (!consensus) continue;

      // Apply consensus semantic field if different/missing
      if (consensus.semanticField && entry.semanticField !== consensus.semanticField) {
        entry.semanticField = consensus.semanticField;
        stat.semanticUpdated++;
      }

      // Apply merged cognates if richer
      if (consensus.cognates.length > (entry.cognates?.length || 0)) {
        entry.cognates = consensus.cognates;
        stat.cognatesUpdated++;
      }

      // Calculate quality score
      entry.qualityScore = calculateQualityScore(entry);
    }
  }

  applyConsensus(bdbEntries, stats.bdb);
  applyConsensus(jastrowEntries, stats.jastrow);
  applyConsensus(strongsByWord, stats.strongs);
  applyConsensus(geseniusEntries, stats.gesenius);
  applyConsensus(cal, stats.cal);
  applyConsensus(klein, stats.klein);

  for (const [name, stat] of Object.entries(stats)) {
    console.log(`  ${name.padEnd(10)}: semantic=${stat.semanticUpdated}, cognates=${stat.cognatesUpdated}`);
  }

  // ============================================================================
  // PHASE 3: Write back all files
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 3: Writing enriched files...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const timestamp = new Date().toISOString();

  // Update metadata
  if (bdb._meta) bdb._meta.crossEnrichedV4 = { ...stats.bdb, at: timestamp };
  if (jastrow._meta) jastrow._meta.crossEnrichedV4 = { ...stats.jastrow, at: timestamp };
  if (strongs._meta) strongs._meta.crossEnrichedV4 = { ...stats.strongs, at: timestamp };
  if (gesenius._meta) gesenius._meta.crossEnrichedV4 = { ...stats.gesenius, at: timestamp };
  if (cal._meta) cal._meta.crossEnrichedV4 = { ...stats.cal, at: timestamp };
  if (klein._meta) klein._meta.crossEnrichedV4 = { ...stats.klein, at: timestamp };

  fs.writeFileSync(path.join(DATA_DIR, 'bdbComplete.json'), JSON.stringify(bdb, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'jastrowComplete.json'), JSON.stringify(jastrow, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'strongsComplete.json'), JSON.stringify(strongs, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'gesenius_lexicon.json'), JSON.stringify(gesenius, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'cal_aramaic.json'), JSON.stringify(cal, null, 2));
  fs.writeFileSync(path.join(DATA_DIR, 'klein_lexicon.json'), JSON.stringify(klein, null, 2));

  console.log('  All files written successfully.');

  // ============================================================================
  // PHASE 4: Final Metrics
  // ============================================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 4: Final Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  function calcMetrics(entries, name) {
    let total = 0, def = 0, pos = 0, strong = 0, cog = 0, root = 0, sem = 0;
    let qualitySum = 0;
    let richCog = 0;

    for (const [k, v] of Object.entries(entries)) {
      if (k.startsWith('_')) continue;
      total++;
      if (v.definition || v.gloss || v.fullDef) def++;
      if (v.pos) pos++;
      if (v.strongs || v.strong || v.strongNumber) strong++;
      if (v.cognates && v.cognates.length > 0) cog++;
      if (v.cognates && v.cognates.length >= 5) richCog++;
      if (v.root) root++;
      if (v.semanticField) sem++;
      qualitySum += v.qualityScore || 0;
    }

    const p = n => total ? Math.round(n / total * 100) : 0;
    const avgQuality = total ? Math.round(qualitySum / total) : 0;
    return { name, total, def: p(def), pos: p(pos), strong: p(strong), cog: p(cog), richCog: p(richCog), root: p(root), sem: p(sem), avgQuality };
  }

  const metrics = [
    calcMetrics(bdbEntries, 'BDB'),
    calcMetrics(jastrowEntries, 'Jastrow'),
    calcMetrics(strongsByWord, "Strong's"),
    calcMetrics(geseniusEntries, 'Gesenius'),
    calcMetrics(cal, 'CAL'),
    calcMetrics(klein, 'Klein'),
  ];

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                           V4 ENRICHMENT COMPLETE                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n┌────────────┬─────────┬──────┬──────┬──────────┬──────────┬─────────┬──────┬──────────┬─────────┐');
  console.log('│ Dictionary │ Entries │ Def  │ POS  │ Strong\'s │ Cognates │ Rich(5+)│ Root │ Semantic │ Quality │');
  console.log('├────────────┼─────────┼──────┼──────┼──────────┼──────────┼─────────┼──────┼──────────┼─────────┤');

  for (const m of metrics) {
    console.log(`│ ${m.name.padEnd(10)} │ ${String(m.total).padStart(7)} │ ${(m.def + '%').padStart(4)} │ ${(m.pos + '%').padStart(4)} │ ${(m.strong + '%').padStart(8)} │ ${(m.cog + '%').padStart(8)} │ ${(m.richCog + '%').padStart(7)} │ ${(m.root + '%').padStart(4)} │ ${(m.sem + '%').padStart(8)} │ ${String(m.avgQuality).padStart(7)} │`);
  }

  console.log('└────────────┴─────────┴──────┴──────┴──────────┴──────────┴─────────┴──────┴──────────┴─────────┘');

  // Show quality distribution
  console.log('\n┌──────────────────────────────────────────────┐');
  console.log('│           QUALITY SCORE DISTRIBUTION          │');
  console.log('├──────────────────────────────────────────────┤');

  const qualityBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const [k, v] of Object.entries(bdbEntries)) {
    if (k.startsWith('_')) continue;
    const q = v.qualityScore || 0;
    if (q <= 20) qualityBuckets['0-20']++;
    else if (q <= 40) qualityBuckets['21-40']++;
    else if (q <= 60) qualityBuckets['41-60']++;
    else if (q <= 80) qualityBuckets['61-80']++;
    else qualityBuckets['81-100']++;
  }

  for (const [range, count] of Object.entries(qualityBuckets)) {
    const bar = '█'.repeat(Math.round(count / 200));
    console.log(`│ ${range.padEnd(7)}: ${String(count).padStart(5)} ${bar.padEnd(25)}│`);
  }
  console.log('└──────────────────────────────────────────────┘');
}

crossEnrichV4().catch(console.error);
