/**
 * Enhanced BDB Etymology Extraction Script
 * =========================================
 * Improved extraction with better patterns for ~60%+ cognate yield.
 *
 * Key improvements over v1:
 * - Better parenthetical cognate parsing
 * - Handles BDB notation: "Arabic , id" (= idem, same word)
 * - Extracts meanings alongside cognate words
 * - Better handling of citation refs (Dl W 184, CIS iv, etc.)
 * - Avoids false positives in cognate capture
 *
 * Usage: node scripts/extractBDBEtymologyEnhanced.js
 * Output: public/data/etymology_bdb_extracted.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const BDB_PATH = path.join(__dirname, '../public/data/bdbComplete.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');

// =============================================================================
// LANGUAGE PATTERNS - Enhanced for BDB 1906 notation
// =============================================================================

/**
 * BDB uses specific terminology from 1906:
 * - "Assyrian" = Akkadian (Babylonian/Assyrian)
 * - "MI" = Moabite Inscription (Mesha Stele)
 * - "Ethiopic" = Ge'ez
 * - "Sabean" / "Sab." = South Arabian (Sabaean)
 * - "Syriac" = Syriac Aramaic
 */

// Language markers with their canonical names
const LANGUAGE_MARKERS = {
  akkadian: ['Assyrian', 'Assyria', 'Assyr.', 'Bab.', 'Babylonian', 'Akkadian'],
  arabic: ['Arabic', 'Ar.', 'Arab.'],
  aramaic: ['Aramaic', 'Aram.', 'Syriac', 'Syr.', 'Targumic', 'Targ.', 'Chaldee', 'Chald.'],
  phoenician: ['Phoenician', 'Phoen.', 'Punic'],
  ethiopic: ['Ethiopic', 'Eth.', "Ge'ez", 'Geez'],
  moabite: ['MI', 'Moabite', 'Moab.'],
  sabean: ['Sabean', 'Sab.', 'Sabaean', 'South Arabian', 'S. Arab.', 'Minaean', 'Minean'],
  egyptian: ['Egyptian', 'Egypt.', 'Eg.', 'Copt.', 'Coptic'],
  persian: ['Persian', 'Pers.', 'Old Persian', 'OP', 'Avestan'],
  greek: ['Greek', 'Gr.', 'Gk.'],
  latin: ['Latin', 'Lat.'],
  hebrew: ['Hebrew', 'Heb.', 'h.', 'BH', 'Biblical Hebrew'],
  sumerian: ['Sumerian', 'Sum.'],
};

// Build regex for each language
function buildLanguagePatterns() {
  const patterns = {};

  for (const [lang, markers] of Object.entries(LANGUAGE_MARKERS)) {
    // Create patterns that capture the cognate word/meaning after the marker
    // Pattern: marker + optional space + (Hebrew/Latin word or "id"/"idem" or meaning)
    const markerPattern = markers.map(m => m.replace('.', '\\.')).join('|');
    patterns[lang] = [
      // Primary pattern: Language marker followed by word(s)
      // Captures: language marker, then word(s) before comma/semicolon/parenthesis
      new RegExp(`(?:${markerPattern})\\s+([א-תa-zA-Zʾʿāīūâêîôûṣṭḥḍṃṇàèìòùáéíóú']+(?:\\s+[א-תa-zA-Z]+)?)`, 'gi'),
      // Pattern for "Language , id" meaning same word in that language
      new RegExp(`(?:${markerPattern})\\s*,?\\s*id(?:em)?`, 'gi'),
    ];
  }

  return patterns;
}

const LANGUAGE_PATTERNS = buildLanguagePatterns();

// Scholarly citation patterns in BDB
const CITATION_PATTERNS = {
  delitzsch: /Dl\s*[PWH]?\s*(\d+)/gi,           // Delitzsch (Prolegomena, etc.)
  bdbPage: /BDB\s*(\d+[a-z]?)/gi,               // BDB page reference
  gesenius: /Ges\s*§?\s*(\d+)/gi,               // Gesenius grammar
  kb: /KB\s*(\d+)/gi,                           // Koehler-Baumgartner
  cis: /CIS\s+([ivx]+,?\s*\d+(?:,\s*\d+)*)/gi,  // Corpus Inscriptionum Semiticarum
  diso: /DISO\s*(\d+)/gi,                       // Hoftijzer-Jongeling
  halot: /HALOT\s*(\d+)/gi,                     // HALOT
};

// Root cross-reference patterns
const ROOT_PATTERNS = [
  /√\s*([א-ת]{2,4})/g,               // √ symbol
  /compare\s+([א-ת]{2,4})\b/gi,      // compare root
  /see\s+([א-ת]{2,4})\b/gi,          // see root
  /from\s+([א-ת]{2,4})\b/gi,         // from root
  /\broot\s+([א-ת]{2,4})\b/gi,       // root word
];

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract the etymological parenthetical from a BDB definition.
 * BDB typically has format: "word [POS] definition (cognate info)"
 * or "word [POS] (cognate info) definition"
 */
function extractEtymologyParenthetical(text) {
  // Look for parenthetical content at the beginning containing language markers
  const sections = [];

  // Pattern 1: First parenthetical (often contains cognates)
  const firstParen = text.match(/^[^(]*\(([^)]+)\)/);
  if (firstParen) {
    sections.push(firstParen[1]);
  }

  // Pattern 2: Look for parentheticals anywhere with language markers
  const allParens = text.matchAll(/\(([^)]{10,200})\)/g);
  for (const match of allParens) {
    const content = match[1];
    // Check if this parenthetical has language markers
    const hasLangMarker = Object.values(LANGUAGE_MARKERS).flat().some(marker =>
      content.toLowerCase().includes(marker.toLowerCase().replace('.', ''))
    );
    if (hasLangMarker) {
      sections.push(content);
    }
  }

  // Also include the first 500 chars for broad matching
  sections.push(text.substring(0, 500));

  return sections.join(' ');
}

/**
 * Extract cognate words for all languages from text
 */
function extractCognates(text) {
  const cognates = {};
  const etymSection = extractEtymologyParenthetical(text);

  // Words to skip (false positives)
  const skipWords = new Set([
    'compare', 'see', 'id', 'idem', 'above', 'below', 'etc',
    'only', 'perhaps', 'probably', 'possibly', 'also', 'and',
    'of', 'in', 'to', 'from', 'with', 'the', 'a', 'an',
    'verb', 'noun', 'adj', 'adjective', 'proper', 'name',
    'masculine', 'feminine', 'plural', 'singular',
  ]);

  for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = new Set();

    for (const pattern of patterns) {
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(etymSection)) !== null) {
        // Check for "Language , id" pattern (meaning same word)
        if (match[0].toLowerCase().includes('id')) {
          matches.add('[same as Hebrew]');
          continue;
        }

        const word = match[1]?.trim();
        if (word && word.length > 0) {
          // Clean up the word
          const cleanWord = word
            .replace(/^[,;.\s]+/, '')
            .replace(/[,;.\s]+$/, '')
            .replace(/\s+\d+.*$/, '')  // Remove trailing page numbers
            .trim();

          // Skip false positives
          if (cleanWord.length > 0 &&
              cleanWord.length < 30 &&
              !skipWords.has(cleanWord.toLowerCase()) &&
              !/^\d+$/.test(cleanWord)) {
            matches.add(cleanWord);
          }
        }
      }
    }

    if (matches.size > 0) {
      cognates[language] = Array.from(matches).map(word => ({
        word,
        source: 'BDB'
      }));
    }
  }

  // Don't return Hebrew cognates for Hebrew words (that's the same language)
  delete cognates.hebrew;

  return cognates;
}

/**
 * Extract scholarly references/citations
 */
function extractReferences(text) {
  const refs = [];
  const refSources = {};

  for (const [source, pattern] of Object.entries(CITATION_PATTERNS)) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      refs.push(match[0]);
      refSources[source] = refSources[source] || [];
      refSources[source].push(match[1] || match[0]);
    }
  }

  return {
    raw: [...new Set(refs)],
    bySource: refSources
  };
}

/**
 * Extract related Hebrew roots
 */
function extractRelatedRoots(text) {
  const roots = new Set();

  for (const pattern of ROOT_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const root = match[1];
      if (root && /^[א-ת]{2,4}$/.test(root)) {
        roots.add(root);
      }
    }
  }

  return Array.from(roots);
}

/**
 * Check if word appears to be a loanword based on BDB notation
 */
function detectLoanword(text) {
  const loanwordIndicators = [
    /loan[-\s]?word/i,
    /borrowed from/i,
    /from (?:Greek|Latin|Persian|Egyptian)/i,
    /foreign origin/i,
    /whence\s+(?:probably\s+)?[א-ת]+/i,  // "Persian, whence probably אֱגוֺז"
  ];

  for (const pattern of loanwordIndicators) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate confidence score based on evidence
 */
function calculateConfidence(cognates, refs, relatedRoots) {
  const cognateCount = Object.keys(cognates).length;
  const totalCognateWords = Object.values(cognates).reduce((sum, arr) => sum + arr.length, 0);
  const refCount = refs.raw.length;
  const rootCount = relatedRoots.length;

  // Calculate score (0-100)
  let score = 0;

  // Base: number of cognate languages (max 50 points)
  score += Math.min(cognateCount * 10, 50);

  // Additional cognate words within languages (max 20 points)
  score += Math.min((totalCognateWords - cognateCount) * 5, 20);

  // Scholarly references (max 20 points)
  score += Math.min(refCount * 5, 20);

  // Related roots (max 10 points)
  score += Math.min(rootCount * 5, 10);

  // Determine tier
  let tier;
  if (score >= 60) tier = 'high';
  else if (score >= 30) tier = 'medium';
  else tier = 'low';

  return { score, tier };
}

/**
 * Extract semantic information from definition
 */
function extractSemanticInfo(text, pos) {
  const semanticFields = {
    divine: /\b(god|divine|sacred|holy|worship|temple|priest|sacrifice)\b/i,
    governance: /\b(king|rule|reign|kingdom|judge|law|command)\b/i,
    kinship: /\b(father|mother|son|daughter|brother|sister|family|tribe)\b/i,
    body: /\b(hand|foot|eye|mouth|heart|head|blood)\b/i,
    action: /\b(go|come|walk|stand|sit|lie|rise|fall)\b/i,
    speech: /\b(say|speak|word|voice|cry|call)\b/i,
    cognition: /\b(know|understand|wisdom|think|see|hear)\b/i,
    emotion: /\b(love|hate|fear|joy|anger|desire)\b/i,
    nature: /\b(water|earth|heaven|sun|moon|star|fire)\b/i,
    life: /\b(live|die|death|life|soul|spirit|breath)\b/i,
  };

  for (const [field, pattern] of Object.entries(semanticFields)) {
    if (pattern.test(text)) {
      return field;
    }
  }

  // Fallback based on POS
  if (pos?.includes('verb')) return 'action';
  if (pos?.includes('noun')) return 'entity';

  return null;
}

/**
 * Process a single BDB entry
 */
function processEntry(word, entry) {
  const text = entry.fullDef || entry.definition || '';
  if (!text || text.length < 10) {
    return null;
  }

  // Extract all data
  const cognates = extractCognates(text);
  const references = extractReferences(text);
  const relatedRoots = extractRelatedRoots(text);
  const isLoanword = detectLoanword(text);
  const confidence = calculateConfidence(cognates, references, relatedRoots);
  const semanticField = extractSemanticInfo(text, entry.pos);

  // Skip entries with no etymology data
  const hasCognates = Object.keys(cognates).length > 0;
  const hasRoots = relatedRoots.length > 0;
  const hasRefs = references.raw.length > 0;

  if (!hasCognates && !hasRoots && !hasRefs && !isLoanword) {
    return null;
  }

  // Extract brief definition (first sentence or clause)
  const briefDef = entry.definition?.split(/[.;]/)[0]?.trim() || null;

  return {
    key: word,
    lemma: entry.lemma || word,
    pos: entry.pos || null,
    strongsNumber: entry.strongs || null,
    briefDefinition: briefDef,
    semanticField,
    etymology: {
      cognates,
      relatedRoots,
      references: references.bySource,
      isLoanword,
      confidence: confidence.tier,
      qualityScore: confidence.score,
      extractedFrom: 'BDB',
      rawExcerpt: extractEtymologyParenthetical(text).substring(0, 250)
    }
  };
}

/**
 * Main extraction function
 */
function extractBDBEtymology() {
  console.log('📚 BDB Enhanced Etymology Extraction v2.0');
  console.log('==========================================\n');

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
  let withCognates = 0;
  let withHighConfidence = 0;
  const languageCounts = {};
  const semanticFieldCounts = {};

  for (const [word, entry] of Object.entries(entries)) {
    const extracted = processEntry(word, entry);

    if (extracted) {
      results[word] = extracted;
      withEtymology++;

      // Count cognate languages
      const cognateKeys = Object.keys(extracted.etymology.cognates);
      if (cognateKeys.length > 0) {
        withCognates++;
        for (const lang of cognateKeys) {
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }
      }

      // Count confidence levels
      if (extracted.etymology.confidence === 'high') {
        withHighConfidence++;
      }

      // Count semantic fields
      if (extracted.semanticField) {
        semanticFieldCounts[extracted.semanticField] =
          (semanticFieldCounts[extracted.semanticField] || 0) + 1;
      }
    }

    processed++;
    if (processed % 1000 === 0) {
      console.log(`  Processed ${processed}/${totalEntries} entries...`);
    }
  }

  // Create output
  const output = {
    _meta: {
      source: 'BDB (Brown-Driver-Briggs Hebrew Lexicon)',
      version: '2.0.0',
      extractedAt: new Date().toISOString(),
      totalBDBEntries: totalEntries,
      entriesWithEtymology: withEtymology,
      entriesWithCognates: withCognates,
      entriesWithHighConfidence: withHighConfidence,
      extractionRate: `${((withEtymology / totalEntries) * 100).toFixed(1)}%`,
      cognateRate: `${((withCognates / totalEntries) * 100).toFixed(1)}%`,
      languageCoverage: languageCounts,
      semanticFieldCoverage: semanticFieldCounts,
      license: 'Public Domain (1906)',
      notes: [
        'Enhanced extraction with improved patterns',
        'BDB uses "Assyrian" for Akkadian (1906 terminology)',
        'MI = Moabite Inscription (Mesha Stele)',
        'Ethiopic = Ge\'ez',
        'Sabean = South Arabian (Sabaean)'
      ]
    },
    entries: results
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Enhanced Extraction Complete!');
  console.log('=================================');
  console.log(`Total BDB entries: ${totalEntries}`);
  console.log(`Entries with etymology data: ${withEtymology} (${((withEtymology / totalEntries) * 100).toFixed(1)}%)`);
  console.log(`Entries with cognates: ${withCognates} (${((withCognates / totalEntries) * 100).toFixed(1)}%)`);
  console.log(`High-confidence entries: ${withHighConfidence}`);

  console.log('\nCognate language coverage:');
  const sortedLangs = Object.entries(languageCounts).sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of sortedLangs) {
    console.log(`  ${lang}: ${count} entries`);
  }

  if (Object.keys(semanticFieldCounts).length > 0) {
    console.log('\nSemantic field coverage:');
    for (const [field, count] of Object.entries(semanticFieldCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${field}: ${count} entries`);
    }
  }

  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  extractBDBEtymology();
}

module.exports = { extractBDBEtymology, extractCognates, processEntry };
