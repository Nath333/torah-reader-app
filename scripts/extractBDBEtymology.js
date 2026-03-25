/**
 * BDB Etymology Extraction Script
 * ================================
 * Extracts cognate languages and etymological data from BDB Complete.
 *
 * BDB (Brown-Driver-Briggs) entries contain embedded etymologies in formats like:
 *   "perish (MI אבד, Assyrian abâtu, Aramaic אֲבַד)"
 *   "father (Phoenician אב, Assyrian abu, Arabic, Sabean אב)"
 *
 * This script parses these patterns to create structured etymology data.
 *
 * Usage: node scripts/extractBDBEtymology.js
 * Output: public/data/etymology_bdb_extracted.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const BDB_PATH = path.join(__dirname, '../public/data/bdbComplete.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');

// Cognate language patterns - matches "Language word" patterns in BDB
const COGNATE_PATTERNS = {
  akkadian: [
    /Assyrian\s+([^\s,;()]+(?:\s+[^\s,;()]+)?)/gi,
    /Akkadian\s+([^\s,;()]+)/gi,
    /Bab(?:ylonian)?\s+([^\s,;()]+)/gi,
  ],
  arabic: [
    /Arabic\s+([^\s,;()]*)/gi,
    /Ar\.\s+([^\s,;()]+)/gi,
  ],
  aramaic: [
    /Aramaic\s+([^\s,;()]+)/gi,
    /Aram\.\s+([^\s,;()]+)/gi,
    /Syriac\s+([^\s,;()]+)/gi,
    /Syr\.\s+([^\s,;()]+)/gi,
    /Targumic\s+([^\s,;()]+)/gi,
  ],
  phoenician: [
    /Phoenician\s+([^\s,;()]+)/gi,
    /Phoen\.\s+([^\s,;()]+)/gi,
  ],
  ugaritic: [
    /Ugaritic\s+([^\s,;()]+)/gi,
    /Ug\.\s+([^\s,;()]+)/gi,
  ],
  ethiopic: [
    /Ethiopic\s+([^\s,;()]+)/gi,
    /Eth\.\s+([^\s,;()]+)/gi,
    /Ge'ez\s+([^\s,;()]+)/gi,
  ],
  moabite: [
    /MI\s+([^\s,;()]+)/gi,  // Moabite Inscription
    /Moabite\s+([^\s,;()]+)/gi,
  ],
  sabean: [
    /Sabean\s+([^\s,;()]+)/gi,
    /Sab\.\s+([^\s,;()]+)/gi,
    /South\s*Arabian?\s+([^\s,;()]+)/gi,
  ],
  egyptian: [
    /Egyptian\s+([^\s,;()]+)/gi,
    /Egypt\.\s+([^\s,;()]+)/gi,
  ],
  persian: [
    /Persian\s+([^\s,;()]+)/gi,
    /Pers\.\s+([^\s,;()]+)/gi,
    /Old\s*Persian\s+([^\s,;()]+)/gi,
  ],
  greek: [
    /Greek\s+([^\s,;()]+)/gi,
    /Gr\.\s+([^\s,;()]+)/gi,
  ],
  latin: [
    /Latin\s+([^\s,;()]+)/gi,
    /Lat\.\s+([^\s,;()]+)/gi,
  ],
};

// Scholarly reference patterns (e.g., "Dl W 184" = Delitzsch, page 184)
const REFERENCE_PATTERNS = [
  /Dl\s*[WP]?\s*(\d+)/gi,      // Delitzsch
  /BDB\s*(\d+)/gi,              // BDB page reference
  /Ges\s*§?\s*(\d+)/gi,         // Gesenius
  /KB\s*(\d+)/gi,               // Koehler-Baumgartner
  /HALOT\s*(\d+)/gi,            // HALOT
];

// Root/etymology patterns
const ROOT_PATTERNS = [
  /√\s*([א-ת]{2,4})/g,          // Hebrew root marker
  /root\s+([א-ת]{2,4})/gi,
  /compare\s+([א-ת]{2,4})/gi,
];

/**
 * Extract cognates from a BDB definition text
 */
function extractCognates(text) {
  const cognates = {};

  for (const [language, patterns] of Object.entries(COGNATE_PATTERNS)) {
    const matches = [];

    for (const pattern of patterns) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const word = match[1]?.trim();
        if (word && word.length > 0 && word !== ',') {
          // Clean up the word
          const cleanWord = word
            .replace(/^[,;.\s]+/, '')
            .replace(/[,;.\s]+$/, '')
            .trim();

          if (cleanWord.length > 0) {
            matches.push(cleanWord);
          }
        }
      }
    }

    if (matches.length > 0) {
      // Deduplicate
      cognates[language] = [...new Set(matches)].map(word => ({
        word,
        source: 'BDB'
      }));
    }
  }

  return cognates;
}

/**
 * Extract scholarly references from text
 */
function extractReferences(text) {
  const refs = [];

  for (const pattern of REFERENCE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      refs.push(match[0]);
    }
  }

  return [...new Set(refs)];
}

/**
 * Extract related roots
 */
function extractRelatedRoots(text) {
  const roots = [];

  for (const pattern of ROOT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const root = match[1];
      if (root && /^[א-ת]{2,4}$/.test(root)) {
        roots.push(root);
      }
    }
  }

  return [...new Set(roots)];
}

/**
 * Determine etymology confidence based on available data
 */
function calculateConfidence(cognates, refs) {
  const cognateCount = Object.keys(cognates).length;
  const refCount = refs.length;

  if (cognateCount >= 3 || (cognateCount >= 2 && refCount >= 1)) {
    return 'high';
  } else if (cognateCount >= 1) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Extract the etymology parenthetical from definition
 * BDB often has format: "definition (cognate info)"
 */
function extractEtymologySection(text) {
  // Look for parenthetical at the start containing cognate info
  const match = text.match(/^[^(]*\(([^)]+)\)/);
  if (match) {
    return match[1];
  }
  // Return first 500 chars as fallback
  return text.substring(0, 500);
}

/**
 * Process a single BDB entry
 */
function processEntry(word, entry) {
  const text = entry.fullDef || entry.definition || '';
  if (!text || text.length < 10) {
    return null;
  }

  // Extract etymology section (usually in parentheses after main definition)
  const etymSection = extractEtymologySection(text);

  // Extract cognates
  const cognates = extractCognates(text);

  // Extract references
  const references = extractReferences(text);

  // Extract related roots
  const relatedRoots = extractRelatedRoots(text);

  // Skip entries with no useful etymology data
  if (Object.keys(cognates).length === 0 && relatedRoots.length === 0) {
    return null;
  }

  // Calculate confidence
  const confidence = calculateConfidence(cognates, references);

  return {
    key: word,
    lemma: entry.lemma || word,
    strongsNumber: entry.strongs || null,
    pos: entry.pos || null,
    etymology: {
      cognates,
      relatedRoots,
      references,
      confidence,
      extractedFrom: 'BDB',
      rawExcerpt: etymSection.substring(0, 200)
    }
  };
}

/**
 * Main extraction function
 */
function extractBDBEtymology() {
  console.log('📚 BDB Etymology Extraction');
  console.log('============================\n');

  // Load BDB Complete
  console.log(`Loading ${BDB_PATH}...`);
  const bdbRaw = fs.readFileSync(BDB_PATH, 'utf8');
  const bdb = JSON.parse(bdbRaw);

  const entries = bdb.byWord || bdb;
  const totalEntries = Object.keys(entries).length;
  console.log(`Loaded ${totalEntries} BDB entries\n`);

  // Process entries
  const results = {};
  let processed = 0;
  let withEtymology = 0;
  const languageCounts = {};

  for (const [word, entry] of Object.entries(entries)) {
    const extracted = processEntry(word, entry);

    if (extracted) {
      results[word] = extracted;
      withEtymology++;

      // Count languages
      for (const lang of Object.keys(extracted.etymology.cognates)) {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
    }

    processed++;
    if (processed % 2000 === 0) {
      console.log(`  Processed ${processed}/${totalEntries} entries...`);
    }
  }

  // Create output
  const output = {
    _meta: {
      source: 'BDB (Brown-Driver-Briggs Hebrew Lexicon)',
      extractedAt: new Date().toISOString(),
      totalBDBEntries: totalEntries,
      entriesWithEtymology: withEtymology,
      extractionRate: `${((withEtymology / totalEntries) * 100).toFixed(1)}%`,
      languageCoverage: languageCounts,
      license: 'Public Domain (1906)',
      note: 'Extracted from BDB Complete - cognates parsed from scholarly notation'
    },
    entries: results
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Extraction Complete!');
  console.log('========================');
  console.log(`Total BDB entries: ${totalEntries}`);
  console.log(`Entries with etymology: ${withEtymology} (${((withEtymology / totalEntries) * 100).toFixed(1)}%)`);
  console.log('\nCognate language coverage:');

  const sortedLangs = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [lang, count] of sortedLangs) {
    console.log(`  ${lang}: ${count} entries`);
  }

  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  extractBDBEtymology();
}

module.exports = { extractBDBEtymology, extractCognates, processEntry };
