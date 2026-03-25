/**
 * Etymology Data Merger Script
 * =============================
 * Merges extracted etymology from BDB, Jastrow, and Strong's into a unified dataset.
 *
 * This script:
 * 1. Loads BDB etymology extraction
 * 2. Loads Jastrow cross-reference extraction
 * 3. Builds Strong's cross-index
 * 4. Merges all sources with deduplication
 * 5. Calculates quality scores
 * 6. Outputs unified root_meanings_enriched.json
 *
 * Usage: node scripts/mergeEtymologyData.js
 * Output: public/data/root_meanings_enriched.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const BDB_COMPLETE_PATH = path.join(__dirname, '../public/data/bdbComplete.json');
const JASTROW_COMPLETE_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const STRONGS_COMPLETE_PATH = path.join(__dirname, '../public/data/strongsComplete.json');
const BDB_EXTRACTED_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');
const JASTROW_EXTRACTED_PATH = path.join(__dirname, '../public/data/etymology_jastrow_extracted.json');
const EXISTING_ROOT_MEANINGS_PATH = path.join(__dirname, '../public/data/root_meanings.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/root_meanings_enriched.json');

// Semantic field mappings (basic)
const SEMANTIC_FIELDS = {
  // Governance
  'מלך': 'governance', 'שפט': 'governance', 'משל': 'governance', 'רדה': 'governance',
  // Movement
  'הלך': 'movement', 'בוא': 'movement', 'יצא': 'movement', 'נפק': 'movement', 'עלה': 'movement', 'ירד': 'movement',
  // Speech
  'אמר': 'speech', 'דבר': 'speech', 'קרא': 'speech', 'ענה': 'speech', 'שאל': 'speech',
  // Perception
  'ראה': 'perception', 'שמע': 'perception', 'ידע': 'perception', 'בין': 'perception',
  // Creation
  'ברא': 'creation', 'עשה': 'creation', 'יצר': 'creation', 'בנה': 'creation',
  // Life/Death
  'חיה': 'life', 'מות': 'death', 'הרג': 'death', 'נפל': 'death',
  // Worship
  'עבד': 'worship', 'קדש': 'worship', 'ברך': 'worship', 'פלל': 'worship',
  // Emotion
  'אהב': 'emotion', 'שנא': 'emotion', 'ירא': 'emotion', 'שמח': 'emotion',
  // Possession
  'נתן': 'possession', 'לקח': 'possession', 'קנה': 'possession', 'ירש': 'possession',
  // Knowledge
  'למד': 'knowledge', 'חכם': 'knowledge', 'בין': 'knowledge', 'שכל': 'knowledge',
};

/**
 * Load JSON file safely
 */
function loadJSON(filepath, description) {
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  ${description} not found: ${filepath}`);
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    console.log(`  ✓ Loaded ${description}`);
    return data;
  } catch (error) {
    console.log(`  ⚠️  Error loading ${description}: ${error.message}`);
    return null;
  }
}

/**
 * Build Strong's cross-index
 */
function buildStrongsIndex(bdbComplete, strongsComplete) {
  console.log('\n📊 Building Strong\'s Cross-Index...');

  const index = {};

  // Index BDB entries by Strong's number
  if (bdbComplete?.byWord) {
    for (const [word, entry] of Object.entries(bdbComplete.byWord)) {
      if (entry.strongs) {
        index[entry.strongs] = index[entry.strongs] || { words: [], bdb: null, strongs: null };
        index[entry.strongs].words.push(word);
        index[entry.strongs].bdb = entry;
      }
    }
  }

  // Add Strong's definitions
  if (strongsComplete?.byNumber) {
    for (const [num, entry] of Object.entries(strongsComplete.byNumber)) {
      if (index[num]) {
        index[num].strongs = entry;
      }
    }
  }

  console.log(`  ✓ Indexed ${Object.keys(index).length} Strong's numbers`);
  return index;
}

/**
 * Extract 2-3 letter root from a word
 */
function extractRoot(word) {
  // Remove common prefixes
  let root = word
    .replace(/^[והבכלמש]/, '')  // Remove single-letter prefixes
    .replace(/^[מת]/, '')       // Remove mem/tav prefix
    .replace(/[ויהתן]$/, '')    // Remove common suffixes
    .replace(/ות$/, '')         // Remove -ot suffix
    .replace(/ים$/, '')         // Remove -im suffix
    .replace(/א$/, '');         // Remove emphatic aleph

  // If too short, use original
  if (root.length < 2) {
    root = word.replace(/[^\u05D0-\u05EA]/g, '').substring(0, 3);
  }

  // Limit to 3 characters
  return root.substring(0, 3);
}

/**
 * Determine semantic field for a root
 */
function getSemanticField(root, definition) {
  // Check direct mapping
  if (SEMANTIC_FIELDS[root]) {
    return SEMANTIC_FIELDS[root];
  }

  // Try to infer from definition keywords
  const def = (definition || '').toLowerCase();

  if (/king|ruler|reign|judge|govern/.test(def)) return 'governance';
  if (/walk|go|come|enter|exit|leave/.test(def)) return 'movement';
  if (/say|speak|tell|call|answer/.test(def)) return 'speech';
  if (/see|hear|know|understand/.test(def)) return 'perception';
  if (/create|make|build|form/.test(def)) return 'creation';
  if (/live|die|kill|death/.test(def)) return 'life';
  if (/worship|holy|bless|pray/.test(def)) return 'worship';
  if (/love|hate|fear|joy/.test(def)) return 'emotion';
  if (/give|take|buy|inherit/.test(def)) return 'possession';
  if (/learn|wise|teach/.test(def)) return 'knowledge';
  if (/eat|drink|food/.test(def)) return 'sustenance';
  if (/write|read|book/.test(def)) return 'literacy';
  if (/fight|war|battle/.test(def)) return 'conflict';
  if (/house|dwell|sit/.test(def)) return 'habitation';

  return null;
}

/**
 * Calculate quality score for an entry
 */
function calculateQualityScore(entry) {
  let score = 0;

  // Source count (max 30)
  const sourceCount = (entry.sources || []).length;
  score += Math.min(sourceCount * 10, 30);

  // Has etymology data (20)
  if (entry.etymology?.cognates && Object.keys(entry.etymology.cognates).length > 0) {
    score += 20;
  }

  // Has Proto-Semitic (15)
  if (entry.etymology?.protoSemitic) {
    score += 15;
  }

  // Has confidence level (5)
  if (entry.etymology?.confidence) {
    score += 5;
  }

  // Has semantic field (5)
  if (entry.semanticField) {
    score += 5;
  }

  // Has cross-references (10)
  if (entry.crossReferences?.hebrewEquivalents?.length > 0 ||
      entry.crossReferences?.seeAlso?.length > 0) {
    score += 10;
  }

  // Has dialect info (10)
  if (entry.dialects?.length > 0) {
    score += 10;
  }

  // Strong's number linked (5)
  if (entry.strongsNumber) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Merge a single entry from multiple sources
 */
function mergeEntry(word, bdbExtracted, jastrowExtracted, strongsIndex, existingRoot) {
  const entry = {
    key: word,
    lemma: null,
    definition: null,
    pos: null,
    strongsNumber: null,
    isAramaic: false,
    isBiblicalHebrew: false,
    root: extractRoot(word),
    semanticField: null,
    etymology: {
      cognates: {},
      protoSemitic: null,
      confidence: null,
      relatedRoots: [],
      references: []
    },
    crossReferences: {
      hebrewEquivalents: [],
      seeAlso: [],
      roots: []
    },
    loanwords: {},
    dialects: [],
    sources: [],
    qualityScore: 0
  };

  // Merge from BDB extraction
  if (bdbExtracted?.entries?.[word]) {
    const bdb = bdbExtracted.entries[word];
    entry.lemma = bdb.lemma || entry.lemma;
    entry.strongsNumber = bdb.strongsNumber || entry.strongsNumber;
    entry.pos = bdb.pos || entry.pos;

    if (bdb.etymology) {
      // Merge cognates
      for (const [lang, cognates] of Object.entries(bdb.etymology.cognates || {})) {
        entry.etymology.cognates[lang] = entry.etymology.cognates[lang] || [];
        for (const cog of cognates) {
          if (!entry.etymology.cognates[lang].find(c => c.word === cog.word)) {
            entry.etymology.cognates[lang].push(cog);
          }
        }
      }

      // Merge related roots
      if (bdb.etymology.relatedRoots) {
        entry.etymology.relatedRoots = [...new Set([
          ...entry.etymology.relatedRoots,
          ...bdb.etymology.relatedRoots
        ])];
      }

      // Merge references
      if (bdb.etymology.references) {
        entry.etymology.references = [...new Set([
          ...entry.etymology.references,
          ...bdb.etymology.references
        ])];
      }

      entry.etymology.confidence = bdb.etymology.confidence || entry.etymology.confidence;
    }

    entry.sources.push('BDB');
  }

  // Merge from Jastrow extraction
  if (jastrowExtracted?.entries?.[word]) {
    const jast = jastrowExtracted.entries[word];
    entry.lemma = entry.lemma || jast.lemma;
    entry.isAramaic = jast.isAramaic || entry.isAramaic;
    entry.isBiblicalHebrew = jast.isBiblicalHebrew || entry.isBiblicalHebrew;

    // Merge cross-references
    if (jast.crossReferences) {
      entry.crossReferences.hebrewEquivalents = [...new Set([
        ...entry.crossReferences.hebrewEquivalents,
        ...(jast.crossReferences.hebrewEquivalents || [])
      ])];
      entry.crossReferences.seeAlso = [...new Set([
        ...entry.crossReferences.seeAlso,
        ...(jast.crossReferences.seeAlso || [])
      ])];
      entry.crossReferences.roots = [...new Set([
        ...entry.crossReferences.roots,
        ...(jast.crossReferences.roots || [])
      ])];
    }

    // Merge loanwords
    for (const [lang, words] of Object.entries(jast.loanwords || {})) {
      entry.loanwords[lang] = [...new Set([
        ...(entry.loanwords[lang] || []),
        ...words
      ])];
    }

    // Merge dialects
    entry.dialects = [...new Set([...entry.dialects, ...(jast.dialects || [])])];

    if (!entry.sources.includes('Jastrow')) {
      entry.sources.push('Jastrow');
    }
  }

  // Add Strong's data if available
  if (entry.strongsNumber && strongsIndex[entry.strongsNumber]) {
    const strongsData = strongsIndex[entry.strongsNumber];
    if (strongsData.strongs) {
      entry.definition = entry.definition || strongsData.strongs.definition;
    }
    if (!entry.sources.includes("Strong's")) {
      entry.sources.push("Strong's");
    }
  }

  // Merge existing root meanings (preserve manual data)
  if (existingRoot) {
    if (existingRoot.etymology?.protoSemitic) {
      entry.etymology.protoSemitic = existingRoot.etymology.protoSemitic;
    }
    if (existingRoot.semanticField) {
      entry.semanticField = existingRoot.semanticField;
    }
    // Merge existing cognates
    if (existingRoot.cognates) {
      for (const [lang, cog] of Object.entries(existingRoot.cognates)) {
        if (!entry.etymology.cognates[lang]) {
          entry.etymology.cognates[lang] = [];
        }
        if (typeof cog === 'string') {
          entry.etymology.cognates[lang].push({ word: cog, source: 'manual' });
        } else if (cog.word) {
          entry.etymology.cognates[lang].push(cog);
        }
      }
    }
  }

  // Determine semantic field if not set
  if (!entry.semanticField) {
    entry.semanticField = getSemanticField(entry.root, entry.definition);
  }

  // Calculate quality score
  entry.qualityScore = calculateQualityScore(entry);

  return entry;
}

/**
 * Main merger function
 */
function mergeEtymologyData() {
  console.log('📚 Etymology Data Merger');
  console.log('========================\n');

  // Load source files
  console.log('Loading source files...');
  const bdbComplete = loadJSON(BDB_COMPLETE_PATH, 'BDB Complete');
  const jastrowComplete = loadJSON(JASTROW_COMPLETE_PATH, 'Jastrow Complete');
  const strongsComplete = loadJSON(STRONGS_COMPLETE_PATH, 'Strong\'s Complete');
  const bdbExtracted = loadJSON(BDB_EXTRACTED_PATH, 'BDB Extracted Etymology');
  const jastrowExtracted = loadJSON(JASTROW_EXTRACTED_PATH, 'Jastrow Extracted Cross-Refs');
  const existingRootMeanings = loadJSON(EXISTING_ROOT_MEANINGS_PATH, 'Existing Root Meanings');

  // Build Strong's index
  const strongsIndex = buildStrongsIndex(bdbComplete, strongsComplete);

  // Collect all unique words
  console.log('\n📊 Collecting unique words...');
  const allWords = new Set();

  if (bdbComplete?.byWord) {
    Object.keys(bdbComplete.byWord).forEach(w => allWords.add(w));
  }
  if (jastrowComplete) {
    Object.keys(jastrowComplete).forEach(w => allWords.add(w));
  }
  if (bdbExtracted?.entries) {
    Object.keys(bdbExtracted.entries).forEach(w => allWords.add(w));
  }
  if (jastrowExtracted?.entries) {
    Object.keys(jastrowExtracted.entries).forEach(w => allWords.add(w));
  }

  console.log(`  Found ${allWords.size} unique words`);

  // Merge entries
  console.log('\n📊 Merging entries...');
  const mergedEntries = {};
  let processed = 0;
  let withEtymology = 0;
  let withCognates = 0;

  for (const word of allWords) {
    const existingRoot = existingRootMeanings?.[word];
    const merged = mergeEntry(word, bdbExtracted, jastrowExtracted, strongsIndex, existingRoot);

    if (merged.sources.length > 0 ||
        Object.keys(merged.etymology.cognates).length > 0 ||
        merged.crossReferences.hebrewEquivalents.length > 0) {
      mergedEntries[word] = merged;
      withEtymology++;

      if (Object.keys(merged.etymology.cognates).length > 0) {
        withCognates++;
      }
    }

    processed++;
    if (processed % 5000 === 0) {
      console.log(`  Processed ${processed}/${allWords.size} words...`);
    }
  }

  // Calculate statistics
  const stats = {
    totalWords: allWords.size,
    entriesWithData: withEtymology,
    entriesWithCognates: withCognates,
    cognateLanguages: {},
    semanticFields: {},
    qualityDistribution: { high: 0, medium: 0, low: 0 }
  };

  for (const entry of Object.values(mergedEntries)) {
    // Count cognate languages
    for (const lang of Object.keys(entry.etymology.cognates)) {
      stats.cognateLanguages[lang] = (stats.cognateLanguages[lang] || 0) + 1;
    }

    // Count semantic fields
    if (entry.semanticField) {
      stats.semanticFields[entry.semanticField] = (stats.semanticFields[entry.semanticField] || 0) + 1;
    }

    // Quality distribution
    if (entry.qualityScore >= 70) stats.qualityDistribution.high++;
    else if (entry.qualityScore >= 40) stats.qualityDistribution.medium++;
    else stats.qualityDistribution.low++;
  }

  // Create output
  const output = {
    _meta: {
      name: 'Enriched Root Meanings',
      description: 'Unified etymology database merged from BDB, Jastrow, and Strong\'s',
      generatedAt: new Date().toISOString(),
      sources: ['BDB (Brown-Driver-Briggs)', 'Jastrow', "Strong's Concordance"],
      statistics: stats,
      license: 'Public Domain (derived from public domain sources)',
      version: '2.0.0'
    },
    entries: mergedEntries
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Merge Complete!');
  console.log('==================');
  console.log(`Total unique words: ${allWords.size}`);
  console.log(`Entries with data: ${withEtymology} (${((withEtymology / allWords.size) * 100).toFixed(1)}%)`);
  console.log(`Entries with cognates: ${withCognates}`);

  console.log('\nCognate language coverage:');
  const sortedLangs = Object.entries(stats.cognateLanguages).sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of sortedLangs) {
    console.log(`  ${lang}: ${count} entries`);
  }

  console.log('\nQuality distribution:');
  console.log(`  High (70+): ${stats.qualityDistribution.high}`);
  console.log(`  Medium (40-69): ${stats.qualityDistribution.medium}`);
  console.log(`  Low (<40): ${stats.qualityDistribution.low}`);

  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  mergeEtymologyData();
}

module.exports = { mergeEtymologyData };
