/**
 * Root Meanings Pro Builder
 * =========================
 * Unified pipeline that merges all etymology data sources into a single
 * comprehensive scholarly database.
 *
 * Data Sources (in priority order):
 * 1. BDB Complete - Biblical Hebrew definitions + cognates
 * 2. Jastrow Complete - Talmudic vocabulary + cross-refs
 * 3. CAL Cache - Aramaic dialect information (DJBA/DJPA equivalent)
 * 4. Wiktionary - Proto-Semitic reconstructions
 * 5. Strong's - Cross-reference index
 *
 * Output: public/data/root_meanings_pro.json
 *
 * Usage: node scripts/buildRootMeaningsPro.js
 */

const fs = require('fs');
const path = require('path');

// Input paths
const PATHS = {
  bdbExtracted: path.join(__dirname, '../public/data/etymology_bdb_extracted.json'),
  jastrowExtracted: path.join(__dirname, '../public/data/etymology_jastrow_extracted.json'),
  calEnriched: path.join(__dirname, '../public/data/cal_enriched.json'),
  calAramaic: path.join(__dirname, '../public/data/cal_aramaic.json'),  // Curated CAL entries
  wiktionary: path.join(__dirname, '../public/data/etymology_wiktionary.json'),
  strongsComplete: path.join(__dirname, '../public/data/strongsComplete.json'),
  bdbComplete: path.join(__dirname, '../public/data/bdbComplete.json'),
  jastrowComplete: path.join(__dirname, '../public/data/jastrowComplete.json'),
  rootMeaningsEnriched: path.join(__dirname, '../public/data/root_meanings_enriched.json'),
  // Real scholarly sources
  sefariaCache: path.join(__dirname, '../public/data/sefaria_lexicon_cache.json'),
  djbaLexicon: path.join(__dirname, '../public/data/djba_lexicon.json'),
};

const OUTPUT_PATH = path.join(__dirname, '../public/data/root_meanings_pro.json');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Load JSON file safely
 */
function loadJson(filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`  [skip] ${path.basename(filepath)} not found`);
    return null;
  }
  const raw = fs.readFileSync(filepath, 'utf8');
  const data = JSON.parse(raw);
  console.log(`  [load] ${path.basename(filepath)}: ${Object.keys(data.entries || data.byWord || data).length} entries`);
  return data;
}

/**
 * Normalize a Hebrew root
 */
function normalizeRoot(root) {
  if (!root) return null;
  return root
    .replace(/[\u0591-\u05C7]/g, '') // Strip niqqud
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .trim();
}

/**
 * Calculate quality score for an entry
 * Improved scoring to better reflect multi-source scholarly coverage
 */
function calculateQualityScore(entry) {
  let score = 0;

  // Source count - base points (max 25)
  // Each source adds 5 points, rewarding multi-source validation
  score += Math.min((entry.sources?.length || 0) * 5, 25);

  // Tier-1 scholarly sources bonus (max 20)
  // BDB, Jastrow, Klein, DJBA, Sefaria = academic gold standard
  const tier1Sources = (entry.sources || []).filter(s =>
    ['BDB', 'Jastrow', 'Klein', 'DJBA', 'Sefaria', 'CAL-curated', 'CAL'].includes(s)
  ).length;
  score += Math.min(tier1Sources * 5, 20);

  // Has definition (15 points) - essential for usefulness
  if (entry.definition || entry.briefDefinition || entry.fullDefinition) score += 15;

  // Has Sefaria data (10 points) - pre-parsed scholarly data
  if (entry.sefariaData && Object.keys(entry.sefariaData).length > 0) score += 10;

  // Has Proto-Semitic (15 points) - academic etymology
  if (entry.etymology?.protoSemitic) score += 15;

  // Cognate count (max 15) - comparative Semitic data
  const cognateCount = entry.etymology?.cognates
    ? Object.keys(entry.etymology.cognates).length
    : 0;
  score += Math.min(cognateCount * 3, 15);

  // Has dialect info (10 points) - Aramaic dialect coverage
  if (entry.dialectInfo && Object.keys(entry.dialectInfo).length > 0) score += 10;

  // Has Strong's number (5 points) - cross-reference
  if (entry.crossReferences?.strongsNumber) score += 5;

  // Has POS (5 points) - part of speech
  if (entry.pos) score += 5;

  return Math.min(score, 100);
}

/**
 * Determine quality tier with meaningful names
 */
function getQualityTier(score) {
  if (score >= 65) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
}

// =============================================================================
// DATA MERGING FUNCTIONS
// =============================================================================

/**
 * Merge cognates from multiple sources
 */
function mergeCognates(existing, newCognates, source) {
  if (!newCognates) return existing || {};

  // Deep clone existing to avoid mutation and ensure proper structure
  const result = {};
  for (const [key, val] of Object.entries(existing || {})) {
    // Handle different formats of existing cognates
    let words = [];
    let sources = [];

    if (Array.isArray(val)) {
      words = val.map(v => typeof v === 'string' ? v : v?.word).filter(Boolean);
    } else if (val && typeof val === 'object') {
      if (Array.isArray(val.words)) {
        words = [...val.words];
      } else if (val.word) {
        words = [val.word];
      }
      if (Array.isArray(val.sources)) {
        sources = [...val.sources];
      }
    }

    result[key] = { words, sources };
  }

  for (const [lang, data] of Object.entries(newCognates)) {
    // Ensure the language entry exists with proper structure
    if (!result[lang]) {
      result[lang] = {
        words: [],
        sources: [],
      };
    }

    // Handle different data formats from new cognates
    let words = [];
    if (Array.isArray(data)) {
      words = data.map(d => typeof d === 'string' ? d : d?.word).filter(Boolean);
    } else if (data && typeof data === 'object') {
      if (data.word) {
        words = [data.word];
      } else if (Array.isArray(data.words)) {
        words = data.words;
      }
    }

    // Add unique words
    for (const word of words) {
      if (word && !result[lang].words.includes(word)) {
        result[lang].words.push(word);
      }
    }

    // Track source
    if (!result[lang].sources.includes(source)) {
      result[lang].sources.push(source);
    }
  }

  return result;
}

/**
 * Process BDB entry
 */
function processBDBEntry(key, entry, existing) {
  const result = existing || {
    key,
    lemma: entry.lemma || key,
    sources: [],
    etymology: { cognates: {}, protoSemitic: null, references: {} },
    crossReferences: {},
  };

  // Add BDB as source
  if (!result.sources.includes('BDB')) {
    result.sources.push('BDB');
  }

  // Add POS and definition
  if (entry.pos && !result.pos) result.pos = entry.pos;
  if (entry.briefDefinition && !result.definition) result.definition = entry.briefDefinition;
  if (entry.semanticField && !result.semanticField) result.semanticField = entry.semanticField;

  // Merge cognates
  if (entry.etymology?.cognates) {
    result.etymology.cognates = mergeCognates(
      result.etymology.cognates,
      entry.etymology.cognates,
      'BDB'
    );
  }

  // Add Strong's number
  if (entry.strongsNumber && !result.crossReferences.strongsNumber) {
    result.crossReferences.strongsNumber = entry.strongsNumber;
  }

  // Add references
  if (entry.etymology?.references) {
    result.etymology.references = {
      ...result.etymology.references,
      ...entry.etymology.references,
    };
  }

  return result;
}

/**
 * Process Jastrow entry
 */
function processJastrowEntry(key, entry, existing) {
  const result = existing || {
    key,
    lemma: entry.lemma || key,
    sources: [],
    etymology: { cognates: {}, protoSemitic: null },
    crossReferences: {},
  };

  // Add Jastrow as source
  if (!result.sources.includes('Jastrow')) {
    result.sources.push('Jastrow');
  }

  // Track if Aramaic
  if (entry.isAramaic) {
    result.isAramaic = true;
  }

  // Add Hebrew equivalents as cross-references
  if (entry.crossReferences?.hebrewEquivalents?.length > 0) {
    result.crossReferences.hebrewEquivalents = [
      ...(result.crossReferences.hebrewEquivalents || []),
      ...entry.crossReferences.hebrewEquivalents,
    ];
    // Deduplicate
    result.crossReferences.hebrewEquivalents = [...new Set(result.crossReferences.hebrewEquivalents)];
  }

  // Add dialect info
  if (entry.dialects?.length > 0) {
    result.dialectInfo = result.dialectInfo || {};
    for (const dialect of entry.dialects) {
      result.dialectInfo[dialect] = { source: 'Jastrow' };
    }
  }

  // Add loanwords
  if (entry.loanwords) {
    result.loanwords = { ...result.loanwords, ...entry.loanwords };
  }

  return result;
}

/**
 * Process CAL entry
 */
function processCALEntry(key, entry, existing) {
  if (entry.notFound) return existing;

  const result = existing || {
    key,
    lemma: entry.headword || key,
    sources: [],
    etymology: { cognates: {} },
    crossReferences: {},
    dialectInfo: {},
  };

  // Add CAL as source
  if (!result.sources.includes('CAL')) {
    result.sources.push('CAL');
  }

  // Mark as Aramaic
  result.isAramaic = true;

  // Add definitions
  if (entry.definitions?.length > 0 && !result.definition) {
    result.definition = entry.definitions[0];
  }

  // Add dialect info
  if (entry.dialects?.length > 0) {
    for (const { code, name } of entry.dialects) {
      result.dialectInfo[code] = {
        name,
        source: 'CAL',
        headword: entry.headword,
      };
    }
  }

  // Add POS
  if (entry.partOfSpeech && !result.pos) {
    result.pos = entry.partOfSpeech;
  }

  return result;
}

/**
 * Process Wiktionary entry
 */
function processWiktionaryEntry(key, entry, existing) {
  if (entry.notFound || entry.error) return existing;

  const result = existing || {
    key,
    sources: [],
    etymology: { cognates: {} },
    crossReferences: {},
  };

  // Add Wiktionary as source
  if (!result.sources.includes('Wiktionary')) {
    result.sources.push('Wiktionary');
  }

  // Add Proto-Semitic (high priority)
  if (entry.protoSemitic && !result.etymology.protoSemitic) {
    result.etymology.protoSemitic = entry.protoSemitic;
  }

  // Merge cognates
  if (entry.cognates) {
    result.etymology.cognates = mergeCognates(
      result.etymology.cognates,
      entry.cognates,
      'Wiktionary'
    );
  }

  // Add etymology note
  if (entry.etymologyText && !result.etymology.notes) {
    result.etymology.notes = entry.etymologyText;
  }

  return result;
}

/**
 * Process Sefaria entry (contains Klein, BDB, Jastrow, Strong's data)
 */
function processSefariaEntry(key, entry, existing) {
  if (!entry.entries || entry.entries.length === 0) return existing;

  const result = existing || {
    key,
    sources: [],
    etymology: { cognates: {} },
    crossReferences: {},
  };

  // Ensure sefariaData exists
  if (!result.sefariaData) {
    result.sefariaData = {};
  }

  // Track Sefaria as a meta-source
  if (!result.sources.includes('Sefaria')) {
    result.sources.push('Sefaria');
  }

  // Process each lexicon entry from Sefaria
  for (const lexEntry of entry.entries) {
    const lexicon = lexEntry.lexicon || 'Unknown';

    // Store detailed Sefaria data
    if (!result.sefariaData[lexicon]) {
      result.sefariaData[lexicon] = {
        definition: lexEntry.definition,
        pos: lexEntry.pos,
        strongNumber: lexEntry.strongNumber,
      };
    }

    // Add definition if not set
    if (lexEntry.definition && !result.definition) {
      result.definition = lexEntry.definition;
    }

    // Add POS
    if (lexEntry.pos && !result.pos) {
      result.pos = lexEntry.pos;
    }

    // Add Strong's number
    if (lexEntry.strongNumber && !result.crossReferences.strongsNumber) {
      result.crossReferences.strongsNumber = `H${lexEntry.strongNumber}`;
    }

    // Track which scholarly lexicons confirm this entry
    const lexiconSource = lexicon.replace(' Dictionary', '').replace(' Augmented Strong', '');
    if (!result.sources.includes(lexiconSource)) {
      result.sources.push(lexiconSource);
    }
  }

  return result;
}

/**
 * Process DJBA (Sokoloff Dictionary of Jewish Babylonian Aramaic) entry
 */
function processDJBAEntry(key, entry, existing) {
  if (!entry.definition) return existing;

  const result = existing || {
    key,
    lemma: entry.lemma || key,
    sources: [],
    etymology: { cognates: {} },
    crossReferences: {},
  };

  // Ensure dialectInfo exists
  if (!result.dialectInfo) {
    result.dialectInfo = {};
  }

  // Add DJBA as source (highest tier for Aramaic)
  if (!result.sources.includes('DJBA')) {
    result.sources.push('DJBA');
  }

  // Mark as Aramaic
  result.isAramaic = true;

  // Add definition
  if (entry.definition && !result.definition) {
    result.definition = entry.definition;
  }
  if (entry.fullDefinition) {
    result.fullDefinition = entry.fullDefinition;
  }

  // Add POS
  if (entry.pos && !result.pos) {
    result.pos = entry.pos;
  }

  // Add etymology if present
  if (entry.etymology) {
    result.etymology.notes = entry.etymology;
  }

  // Add Talmudic usage
  if (entry.talmudic_usage) {
    result.talmudicUsage = entry.talmudic_usage;
  }

  // Add examples
  if (entry.examples) {
    result.examples = entry.examples;
  }

  // Add citation
  if (entry.citation) {
    result.crossReferences.djbaCitation = entry.citation;
  }

  // Add JBA dialect info
  result.dialectInfo['JBA'] = {
    source: 'DJBA',
    headword: entry.lemma,
    tier: 1, // Highest quality
  };

  return result;
}

/**
 * Process curated CAL Aramaic entry
 */
function processCuratedCALEntry(key, entry, existing) {
  if (!entry.definition) return existing;

  const result = existing || {
    key,
    lemma: entry.lemma || key,
    sources: [],
    etymology: { cognates: {} },
    crossReferences: {},
  };

  // Ensure dialectInfo exists
  if (!result.dialectInfo) {
    result.dialectInfo = {};
  }

  // Add CAL-curated as source
  if (!result.sources.includes('CAL-curated')) {
    result.sources.push('CAL-curated');
  }

  // Mark as Aramaic
  result.isAramaic = true;

  // Add definition
  if (entry.definition && !result.definition) {
    result.definition = entry.definition;
  }

  // Add POS
  if (entry.pos && !result.pos) {
    result.pos = entry.pos;
  }

  // Add CAL transliteration
  if (entry.cal) {
    result.calTransliteration = entry.cal;
  }

  // Add Hebrew equivalent
  if (entry.hebrew) {
    result.crossReferences.hebrewEquivalent = entry.hebrew;
  }

  // Add dialect info
  if (entry.dialects && Array.isArray(entry.dialects)) {
    for (const dialect of entry.dialects) {
      result.dialectInfo[dialect] = {
        source: 'CAL-curated',
        forms: entry.forms,
      };
    }
  }

  // Add related terms
  if (entry.related) {
    result.crossReferences.relatedTerms = entry.related;
  }

  // Add notes
  if (entry.notes) {
    result.etymology.notes = entry.notes;
  }

  return result;
}

// =============================================================================
// MAIN PIPELINE
// =============================================================================

function main() {
  console.log('\n=== Root Meanings Pro Builder ===\n');
  console.log('Loading data sources...');

  // Load all data sources
  const bdbExtracted = loadJson(PATHS.bdbExtracted);
  const jastrowExtracted = loadJson(PATHS.jastrowExtracted);
  const calEnriched = loadJson(PATHS.calEnriched);
  const calAramaic = loadJson(PATHS.calAramaic);  // Curated CAL
  const wiktionary = loadJson(PATHS.wiktionary);
  const strongsComplete = loadJson(PATHS.strongsComplete);
  const existingEnriched = loadJson(PATHS.rootMeaningsEnriched);
  // Real scholarly sources
  const sefariaCache = loadJson(PATHS.sefariaCache);
  const djbaLexicon = loadJson(PATHS.djbaLexicon);

  console.log('\nMerging data sources...');

  // Start with existing enriched data as base
  const results = {};

  // Process existing enriched data first
  if (existingEnriched?.entries) {
    for (const [key, entry] of Object.entries(existingEnriched.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      results[normalized] = {
        key: normalized,
        lemma: entry.lemma || normalized,
        definition: entry.definition,
        pos: entry.pos,
        isAramaic: entry.isAramaic,
        isBiblicalHebrew: entry.isBiblicalHebrew,
        root: entry.root,
        semanticField: entry.semanticField,
        sources: ['enriched-base'],
        etymology: {
          cognates: entry.etymology?.cognates || {},
          protoSemitic: null,
          references: {},
        },
        crossReferences: {
          strongsNumber: entry.strongsNumber,
        },
        dialectInfo: {},
      };
    }
    console.log(`  Base: ${Object.keys(results).length} entries`);
  }

  // Layer 1: BDB extracted (highest priority for Biblical Hebrew)
  if (bdbExtracted?.entries) {
    let added = 0;
    for (const [key, entry] of Object.entries(bdbExtracted.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      results[normalized] = processBDBEntry(normalized, entry, results[normalized]);
      added++;
    }
    console.log(`  +BDB: ${added} entries processed`);
  }

  // Layer 2: Jastrow extracted (Aramaic/Talmudic)
  if (jastrowExtracted?.entries) {
    let added = 0;
    for (const [key, entry] of Object.entries(jastrowExtracted.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      results[normalized] = processJastrowEntry(normalized, entry, results[normalized]);
      added++;
    }
    console.log(`  +Jastrow: ${added} entries processed`);
  }

  // Layer 3: CAL enriched (Aramaic dialect info)
  if (calEnriched?.entries) {
    let added = 0;
    for (const [key, entry] of Object.entries(calEnriched.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      const updated = processCALEntry(normalized, entry, results[normalized]);
      if (updated) {
        results[normalized] = updated;
        added++;
      }
    }
    console.log(`  +CAL: ${added} entries processed`);
  }

  // Layer 4: Wiktionary (Proto-Semitic)
  if (wiktionary?.entries) {
    let added = 0;
    for (const [key, entry] of Object.entries(wiktionary.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      const updated = processWiktionaryEntry(normalized, entry, results[normalized]);
      if (updated) {
        results[normalized] = updated;
        added++;
      }
    }
    console.log(`  +Wiktionary: ${added} entries processed`);
  }

  // Layer 5: Sefaria Cache (REAL scholarly data: Klein, BDB, Jastrow, Strong's)
  if (sefariaCache?.entries) {
    let added = 0;
    for (const [key, entry] of Object.entries(sefariaCache.entries)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      const updated = processSefariaEntry(normalized, entry, results[normalized]);
      if (updated) {
        results[normalized] = updated;
        added++;
      }
    }
    console.log(`  +Sefaria (Klein/BDB/Jastrow/Strong's): ${added} entries processed`);
  }

  // Layer 6: DJBA (Sokoloff - Tier 1 Aramaic)
  if (djbaLexicon) {
    let added = 0;
    for (const [key, entry] of Object.entries(djbaLexicon)) {
      if (key === '_meta') continue;
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      const updated = processDJBAEntry(normalized, entry, results[normalized]);
      if (updated) {
        results[normalized] = updated;
        added++;
      }
    }
    console.log(`  +DJBA (Sokoloff): ${added} entries processed`);
  }

  // Layer 7: Curated CAL Aramaic (dialect coverage)
  if (calAramaic) {
    let added = 0;
    for (const [key, entry] of Object.entries(calAramaic)) {
      const normalized = normalizeRoot(key);
      if (!normalized) continue;

      const updated = processCuratedCALEntry(normalized, entry, results[normalized]);
      if (updated) {
        results[normalized] = updated;
        added++;
      }
    }
    console.log(`  +CAL-curated: ${added} entries processed`);
  }

  // Add Strong's cross-references
  if (strongsComplete?.byWord) {
    let added = 0;
    for (const [key, entry] of Object.entries(strongsComplete.byWord)) {
      const normalized = normalizeRoot(key);
      if (!normalized || !results[normalized]) continue;

      if (entry.strongs && !results[normalized].crossReferences.strongsNumber) {
        results[normalized].crossReferences.strongsNumber = entry.strongs;
        added++;
      }
    }
    console.log(`  +Strong's refs: ${added} entries updated`);
  }

  // Fill in missing definitions from Sefaria data
  console.log('\nFilling missing definitions from Sefaria...');
  let definitionsFilled = 0;
  if (sefariaCache?.entries) {
    for (const entry of Object.values(results)) {
      if (!entry.definition && entry.sefariaData) {
        // Try to get definition from any available lexicon in Sefaria data
        for (const lexicon of ['Klein Dictionary', 'BDB Dictionary', 'Jastrow Dictionary', 'BDB Augmented Strong']) {
          if (entry.sefariaData[lexicon]?.definition) {
            entry.definition = entry.sefariaData[lexicon].definition;
            definitionsFilled++;
            break;
          }
        }
      }
    }
  }
  console.log(`  Definitions filled: ${definitionsFilled}`);

  // Calculate quality scores
  console.log('\nCalculating quality scores...');
  const tierCounts = { Gold: 0, Silver: 0, Bronze: 0 };
  const cognateLanguageCounts = {};
  let withProtoSemitic = 0;
  let withCognates = 0;
  let withDefinition = 0;

  for (const entry of Object.values(results)) {
    // Calculate score
    entry.qualityScore = {
      overall: calculateQualityScore(entry),
      sourceCount: entry.sources.length,
      tier1Sources: entry.sources.filter(s => ['BDB', 'CAL', 'Jastrow', 'DJBA', 'Klein', 'Sefaria', 'CAL-curated'].includes(s)).length,
      hasProtoSemitic: !!entry.etymology?.protoSemitic,
      hasCognates: entry.etymology?.cognates && Object.keys(entry.etymology.cognates).length > 0,
      hasDialectInfo: entry.dialectInfo && Object.keys(entry.dialectInfo).length > 0,
      hasDefinition: !!(entry.definition || entry.briefDefinition),
    };
    entry.qualityTier = getQualityTier(entry.qualityScore.overall);

    // Count stats
    tierCounts[entry.qualityTier] = (tierCounts[entry.qualityTier] || 0) + 1;
    if (entry.etymology?.protoSemitic) withProtoSemitic++;
    if (entry.definition || entry.briefDefinition) withDefinition++;
    if (entry.etymology?.cognates && Object.keys(entry.etymology.cognates).length > 0) {
      withCognates++;
      for (const lang of Object.keys(entry.etymology.cognates)) {
        cognateLanguageCounts[lang] = (cognateLanguageCounts[lang] || 0) + 1;
      }
    }
  }

  // Build output
  const output = {
    _meta: {
      name: 'Root Meanings Pro',
      version: '3.0.0',
      description: 'Unified multi-source etymology database for Hebrew and Aramaic',
      generatedAt: new Date().toISOString(),
      sources: [
        'BDB (Brown-Driver-Briggs) - Biblical Hebrew',
        'Jastrow - Talmudic/Aramaic',
        'CAL (Comprehensive Aramaic Lexicon) - Dialect info',
        'Wiktionary - Proto-Semitic reconstructions',
        "Strong's Concordance - Cross-reference index",
        'Sefaria (Klein/BDB/Jastrow/Strong\'s) - Pre-parsed scholarly data',
        'DJBA (Sokoloff) - Tier 1 Babylonian Aramaic',
        'CAL-curated - Verified Aramaic dialect forms',
      ],
      statistics: {
        totalEntries: Object.keys(results).length,
        withDefinition,
        withCognates,
        withProtoSemitic,
        cognateLanguages: cognateLanguageCounts,
        qualityDistribution: tierCounts,
      },
      license: 'Mixed: BDB/Jastrow/Strong\'s (Public Domain), CAL (Academic), Wiktionary (CC-BY-SA)',
    },
    entries: results,
  };

  // Write output
  console.log(`\nWriting ${Object.keys(results).length} entries to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total entries: ${Object.keys(results).length}`);
  console.log(`With definition: ${withDefinition}`);
  console.log(`With cognates: ${withCognates}`);
  console.log(`With Proto-Semitic: ${withProtoSemitic}`);
  console.log(`\nQuality tiers:`);
  console.log(`  ⭐ Gold (65+):    ${tierCounts.Gold || 0}`);
  console.log(`  🥈 Silver (40-64): ${tierCounts.Silver || 0}`);
  console.log(`  🥉 Bronze (<40):   ${tierCounts.Bronze || 0}`);
  console.log(`\nCognate languages:`);
  for (const [lang, count] of Object.entries(cognateLanguageCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang}: ${count}`);
  }
  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);
}

// Run
main();
