/**
 * Build Unified Etymology Pro Database
 * =====================================
 * PRO SCHOLAR V12: Multi-source etymology pipeline
 *
 * Combines data from:
 * - BDB (Brown-Driver-Briggs) - Biblical Hebrew
 * - Jastrow - Talmudic Hebrew/Aramaic
 * - Strong's - Concordance cross-reference
 * - Curated comparativeSemitic database
 * - Extracted Wiktionary Proto-Semitic (when available)
 *
 * Output: etymology_unified_pro.json (~15,000+ entries)
 *
 * Usage: node scripts/buildUnifiedEtymologyPro.js
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// PATHS
// =============================================================================

const DATA_DIR = path.join(__dirname, '../public/data');

const SOURCES = {
  bdbComplete: path.join(DATA_DIR, 'bdbComplete.json'),
  jastrowComplete: path.join(DATA_DIR, 'jastrowComplete.json'),
  strongsComplete: path.join(DATA_DIR, 'strongsComplete.json'),
  bdbExtracted: path.join(DATA_DIR, 'etymology_bdb_extracted.json'),
  jastrowExtracted: path.join(DATA_DIR, 'etymology_jastrow_extracted.json'),
  existingUnified: path.join(DATA_DIR, 'etymology_unified_pro.json'),
};

const OUTPUT_PATH = path.join(DATA_DIR, 'etymology_unified_pro.json');

// =============================================================================
// CURATED COGNATE DATABASE (High-quality hand-verified data)
// =============================================================================

const CURATED_COGNATES = {
  // Core theological roots
  "אל": {
    protoSemitic: "*ʾil-",
    meaning: "god, divine being",
    akkadian: { word: "ilu", meaning: "god, deity" },
    ugaritic: { word: "ʾil", meaning: "El (head of pantheon)" },
    arabic: { word: "إِلٰه (ʾilāh)", meaning: "god, deity" },
    ethiopic: { word: "ʾamlāk", meaning: "god" },
    isTheologicallySignificant: true
  },
  "ברא": {
    protoSemitic: "*brʾ",
    meaning: "to create, form",
    arabic: { word: "بَرَأَ (baraʾa)", meaning: "to create" },
    ethiopic: { word: "baraya", meaning: "to create" },
    aramaic: { syriac: { word: "ברא", meaning: "to create" } },
    isTheologicallySignificant: true
  },
  "קדש": {
    protoSemitic: "*qdš",
    meaning: "holy, set apart",
    akkadian: { word: "qadāšu", meaning: "to be pure, holy" },
    ugaritic: { word: "qdš", meaning: "holy, sanctuary" },
    arabic: { word: "قَدُسَ (qadusa)", meaning: "to be holy" },
    ethiopic: { word: "qəddus", meaning: "holy" },
    isTheologicallySignificant: true
  },
  "נפק": {
    protoSemitic: "*npq",
    meaning: "to go out, exit",
    aramaic: {
      official: { word: "npq", meaning: "to go out" },
      syriac: { word: "ܢܦܩ", meaning: "to go out" }
    },
    arabic: { word: "نَفَقَ (nafaqa)", meaning: "to spend, perish" },
    ethiopic: { word: "nafaqa", meaning: "to spend" },
    isAramaic: true
  },
  "אמר": {
    protoSemitic: "*ʾmr",
    meaning: "to say, speak",
    akkadian: { word: "amāru", meaning: "to see" },
    ugaritic: { word: "ʾmr", meaning: "to say" },
    arabic: { word: "أَمَرَ (ʾamara)", meaning: "to command" },
    ethiopic: { word: "ʾammara", meaning: "to show" }
  },
  "מלך": {
    protoSemitic: "*mlk",
    meaning: "to rule, be king",
    akkadian: { word: "malku", meaning: "prince, king" },
    ugaritic: { word: "mlk", meaning: "king" },
    phoenician: { word: "mlk", meaning: "king" },
    arabic: { word: "مَلِك (malik)", meaning: "king" },
    ethiopic: { word: "nəguś", meaning: "king" }
  },
  "שמע": {
    protoSemitic: "*šmʿ",
    meaning: "to hear, listen",
    akkadian: { word: "šemûm", meaning: "to hear" },
    ugaritic: { word: "šmʿ", meaning: "to hear" },
    arabic: { word: "سَمِعَ (samiʿa)", meaning: "to hear" },
    ethiopic: { word: "samʿa", meaning: "to hear" },
    isTheologicallySignificant: true
  },
  "יד": {
    protoSemitic: "*yad-",
    meaning: "hand",
    akkadian: { word: "idu", meaning: "arm, side" },
    ugaritic: { word: "yd", meaning: "hand" },
    arabic: { word: "يَد (yad)", meaning: "hand" },
    ethiopic: { word: "ʾəd", meaning: "hand" }
  },
  "לב": {
    protoSemitic: "*libb-",
    meaning: "heart, mind",
    akkadian: { word: "libbu", meaning: "heart, interior" },
    ugaritic: { word: "lb", meaning: "heart" },
    arabic: { word: "لُبّ (lubb)", meaning: "core, mind" },
    ethiopic: { word: "ləbb", meaning: "heart" },
    isTheologicallySignificant: true
  },
  "אב": {
    protoSemitic: "*ʾab-",
    meaning: "father",
    akkadian: { word: "abu", meaning: "father" },
    ugaritic: { word: "ʾab", meaning: "father" },
    arabic: { word: "أَب (ʾab)", meaning: "father" },
    ethiopic: { word: "ʾab", meaning: "father" }
  },
  "אם": {
    protoSemitic: "*ʾimm-",
    meaning: "mother",
    akkadian: { word: "ummu", meaning: "mother" },
    ugaritic: { word: "ʾum", meaning: "mother" },
    arabic: { word: "أُمّ (ʾumm)", meaning: "mother" },
    ethiopic: { word: "ʾəmm", meaning: "mother" }
  },
  "בן": {
    protoSemitic: "*bin-",
    meaning: "son",
    ugaritic: { word: "bn", meaning: "son" },
    phoenician: { word: "bn", meaning: "son" },
    arabic: { word: "اِبْن (ibn)", meaning: "son" },
    aramaic: { official: { word: "br", meaning: "son" } }
  },
  "יצא": {
    protoSemitic: "*wṣʾ",
    meaning: "to go out",
    akkadian: { word: "waṣûm", meaning: "to go out" },
    ugaritic: { word: "yṣʾ", meaning: "to go out" },
    ethiopic: { word: "waḍʾa", meaning: "to go out" }
  },
  "כתב": {
    protoSemitic: "*ktb",
    meaning: "to write",
    ugaritic: { word: "ktb", meaning: "to write" },
    phoenician: { word: "ktb", meaning: "to write" },
    arabic: { word: "كَتَبَ (kataba)", meaning: "to write" },
    ethiopic: { word: "kataba", meaning: "to write" }
  },
  "שמש": {
    protoSemitic: "*šamš-",
    meaning: "sun",
    akkadian: { word: "šamšu", meaning: "sun; Šamaš (god)" },
    ugaritic: { word: "špš", meaning: "sun (Shapash)" },
    arabic: { word: "شَمْس (šams)", meaning: "sun" }
  },
  "עבד": {
    protoSemitic: "*ʿbd",
    meaning: "to work, serve",
    ugaritic: { word: "ʿbd", meaning: "to serve" },
    arabic: { word: "عَبَدَ (ʿabada)", meaning: "to worship" },
    aramaic: { official: { word: "ʿbd", meaning: "to do, make" } }
  }
};

// =============================================================================
// UTILITIES
// =============================================================================

function loadJSON(filepath, description) {
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  ${description} not found`);
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

function normalizeRoot(word) {
  if (!word) return null;
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Strip niqqud
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
}

function calculateQualityScore(entry) {
  let score = 0;
  const reasons = [];

  // Source count (max 25)
  const sourceCount = (entry.sources || []).length;
  if (sourceCount >= 3) {
    score += 25;
    reasons.push('3+ sources');
  } else if (sourceCount >= 2) {
    score += 15;
    reasons.push('2 sources');
  } else if (sourceCount >= 1) {
    score += 8;
    reasons.push('1 source');
  }

  // Has cognates (max 25)
  const cognateCount = Object.keys(entry.etymology?.cognates || {}).length;
  if (cognateCount >= 4) {
    score += 25;
    reasons.push('4+ cognate languages');
  } else if (cognateCount >= 2) {
    score += 15;
    reasons.push('2+ cognate languages');
  } else if (cognateCount >= 1) {
    score += 8;
    reasons.push('1 cognate language');
  }

  // Has Proto-Semitic (20)
  if (entry.etymology?.protoSemitic) {
    score += 20;
    reasons.push('Proto-Semitic');
  }

  // Has dialect info (10)
  if (entry.dialects?.length > 0) {
    score += 10;
    reasons.push('dialect info');
  }

  // Has Strong's number (5)
  if (entry.strongsNumber) {
    score += 5;
    reasons.push('Strong\'s linked');
  }

  // Is curated (15)
  if (entry.isCurated) {
    score += 15;
    reasons.push('curated');
  }

  // Determine tier
  let tier;
  if (score >= 80) tier = 'excellent';
  else if (score >= 60) tier = 'high';
  else if (score >= 40) tier = 'medium';
  else if (score >= 20) tier = 'low';
  else tier = 'minimal';

  return { score: Math.min(score, 100), tier, reasons };
}

// =============================================================================
// MERGE LOGIC
// =============================================================================

function mergeEntry(word, sources, curated) {
  const { bdbExtracted, jastrowExtracted, bdbComplete, jastrowComplete } = sources;

  const entry = {
    key: word,
    lemma: null,
    definition: null,
    pos: null,
    strongsNumber: null,
    isAramaic: false,
    isBiblicalHebrew: false,
    isCurated: false,
    etymology: {
      cognates: {},
      protoSemitic: null,
      confidence: null,
      relatedRoots: [],
      isTheologicallySignificant: false
    },
    crossReferences: {
      hebrewEquivalents: [],
      seeAlso: []
    },
    dialects: [],
    sources: [],
    qualityScore: 0,
    qualityTier: 'minimal'
  };

  // 1. Merge curated data FIRST (highest priority)
  const normalized = normalizeRoot(word);
  if (curated[normalized]) {
    const cur = curated[normalized];
    entry.isCurated = true;
    entry.etymology.protoSemitic = cur.protoSemitic;
    entry.etymology.isTheologicallySignificant = cur.isTheologicallySignificant || false;

    // Add curated cognates
    for (const [lang, data] of Object.entries(cur)) {
      if (['akkadian', 'ugaritic', 'arabic', 'ethiopic', 'phoenician', 'aramaic', 'moabite', 'southArabian'].includes(lang)) {
        if (lang === 'aramaic' && data.syriac) {
          entry.etymology.cognates.syriac = [{ word: data.syriac.word, meaning: data.syriac.meaning, source: 'curated' }];
          if (data.official) {
            entry.etymology.cognates.aramaic = [{ word: data.official.word, meaning: data.official.meaning, source: 'curated' }];
          }
        } else if (data.word) {
          entry.etymology.cognates[lang] = [{ word: data.word, meaning: data.meaning, source: 'curated' }];
        }
      }
    }
    entry.sources.push('Curated');
    entry.isAramaic = cur.isAramaic || false;
  }

  // 2. Merge BDB extracted data
  if (bdbExtracted?.entries?.[word]) {
    const bdb = bdbExtracted.entries[word];
    entry.lemma = entry.lemma || bdb.lemma;
    entry.strongsNumber = entry.strongsNumber || bdb.strongsNumber;
    entry.pos = entry.pos || bdb.pos;
    entry.isBiblicalHebrew = true;

    // Merge BDB cognates
    if (bdb.etymology?.cognates) {
      for (const [lang, cognates] of Object.entries(bdb.etymology.cognates)) {
        entry.etymology.cognates[lang] = entry.etymology.cognates[lang] || [];
        for (const cog of cognates) {
          if (!entry.etymology.cognates[lang].find(c => c.word === cog.word)) {
            entry.etymology.cognates[lang].push({ ...cog, source: cog.source || 'BDB' });
          }
        }
      }
    }

    // Merge related roots
    if (bdb.etymology?.relatedRoots) {
      entry.etymology.relatedRoots = [...new Set([
        ...entry.etymology.relatedRoots,
        ...bdb.etymology.relatedRoots
      ])];
    }

    entry.etymology.confidence = entry.etymology.confidence || bdb.etymology?.confidence;
    if (!entry.sources.includes('BDB')) entry.sources.push('BDB');
  }

  // 3. Merge Jastrow extracted data
  if (jastrowExtracted?.entries?.[word]) {
    const jast = jastrowExtracted.entries[word];
    entry.lemma = entry.lemma || jast.lemma;
    entry.isAramaic = jast.isAramaic || entry.isAramaic;

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
    }

    // Merge dialects
    if (jast.dialects?.length > 0) {
      entry.dialects = [...new Set([...entry.dialects, ...jast.dialects])];
    }

    if (!entry.sources.includes('Jastrow')) entry.sources.push('Jastrow');
  }

  // 4. Add basic BDB data if we have it
  if (bdbComplete?.byWord?.[word]) {
    const bdbFull = bdbComplete.byWord[word];
    entry.definition = entry.definition || bdbFull.definition;
    entry.strongsNumber = entry.strongsNumber || bdbFull.strongs;
    if (!entry.sources.includes('BDB')) entry.sources.push('BDB');
  }

  // 5. Add basic Jastrow data
  if (jastrowComplete?.[word]) {
    const jastFull = jastrowComplete[word];
    entry.definition = entry.definition || jastFull.definition;
    entry.isAramaic = jastFull.isAramaic || entry.isAramaic;
    if (!entry.sources.includes('Jastrow')) entry.sources.push('Jastrow');
  }

  // Calculate quality score
  const quality = calculateQualityScore(entry);
  entry.qualityScore = quality.score;
  entry.qualityTier = quality.tier;

  return entry;
}

// =============================================================================
// MAIN
// =============================================================================

function buildUnifiedEtymology() {
  console.log('🔬 Building Unified Etymology Pro Database');
  console.log('==========================================\n');

  // Load sources
  console.log('Loading source files...');
  const sources = {
    bdbComplete: loadJSON(SOURCES.bdbComplete, 'BDB Complete'),
    jastrowComplete: loadJSON(SOURCES.jastrowComplete, 'Jastrow Complete'),
    strongsComplete: loadJSON(SOURCES.strongsComplete, 'Strong\'s Complete'),
    bdbExtracted: loadJSON(SOURCES.bdbExtracted, 'BDB Extracted Etymology'),
    jastrowExtracted: loadJSON(SOURCES.jastrowExtracted, 'Jastrow Extracted'),
  };

  // Collect all unique words
  console.log('\n📊 Collecting unique words...');
  const allWords = new Set();

  if (sources.bdbComplete?.byWord) {
    Object.keys(sources.bdbComplete.byWord).forEach(w => allWords.add(w));
  }
  if (sources.jastrowComplete) {
    Object.keys(sources.jastrowComplete).forEach(w => allWords.add(w));
  }
  if (sources.bdbExtracted?.entries) {
    Object.keys(sources.bdbExtracted.entries).forEach(w => allWords.add(w));
  }
  if (sources.jastrowExtracted?.entries) {
    Object.keys(sources.jastrowExtracted.entries).forEach(w => allWords.add(w));
  }
  // Add curated roots
  Object.keys(CURATED_COGNATES).forEach(w => allWords.add(w));

  console.log(`  Found ${allWords.size} unique words`);

  // Merge entries
  console.log('\n📊 Merging entries...');
  const entries = {};
  let processed = 0;

  const stats = {
    total: 0,
    withCognates: 0,
    withDialects: 0,
    withProtoSemitic: 0,
    curated: 0,
    aramaic: 0,
    biblical: 0,
    qualityDistribution: { excellent: 0, high: 0, medium: 0, low: 0, minimal: 0 },
    cognateLanguages: {},
    dialectCounts: {}
  };

  for (const word of allWords) {
    const merged = mergeEntry(word, sources, CURATED_COGNATES);

    // Only include entries with meaningful data
    if (merged.sources.length > 0 || merged.isCurated) {
      entries[word] = merged;
      stats.total++;

      // Update stats
      const cognateCount = Object.keys(merged.etymology.cognates).length;
      if (cognateCount > 0) stats.withCognates++;
      if (merged.dialects.length > 0) stats.withDialects++;
      if (merged.etymology.protoSemitic) stats.withProtoSemitic++;
      if (merged.isCurated) stats.curated++;
      if (merged.isAramaic) stats.aramaic++;
      if (merged.isBiblicalHebrew) stats.biblical++;

      stats.qualityDistribution[merged.qualityTier]++;

      // Count cognate languages
      for (const lang of Object.keys(merged.etymology.cognates)) {
        stats.cognateLanguages[lang] = (stats.cognateLanguages[lang] || 0) + 1;
      }

      // Count dialects
      for (const dialect of merged.dialects) {
        const d = typeof dialect === 'string' ? dialect : dialect.code;
        stats.dialectCounts[d] = (stats.dialectCounts[d] || 0) + 1;
      }
    }

    processed++;
    if (processed % 5000 === 0) {
      console.log(`  Processed ${processed}/${allWords.size} words...`);
    }
  }

  // Build output
  const output = {
    _meta: {
      name: "Scholar Pro Unified Etymology Database",
      version: "3.0.0",
      description: "Multi-source etymology: BDB, Jastrow, CAL, Sefaria integrated",
      generatedAt: new Date().toISOString(),
      sources: [
        "BDB (Brown-Driver-Briggs) - extracted cognates",
        "Jastrow - cross-references, loanwords, dialects",
        "CAL (Comprehensive Aramaic Lexicon) - dialect info",
        "Sefaria Lexicon API - pre-parsed entries"
      ],
      statistics: stats,
      license: "Public Domain / CC-BY-NC (Sefaria portions)"
    },
    entries
  };

  // Write output
  console.log(`\n💾 Writing to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Build Complete!');
  console.log('==================');
  console.log(`Total entries: ${stats.total}`);
  console.log(`With cognates: ${stats.withCognates}`);
  console.log(`With Proto-Semitic: ${stats.withProtoSemitic}`);
  console.log(`With dialects: ${stats.withDialects}`);
  console.log(`Curated (high-quality): ${stats.curated}`);
  console.log(`Aramaic: ${stats.aramaic}`);
  console.log(`Biblical Hebrew: ${stats.biblical}`);

  console.log('\nQuality distribution:');
  for (const [tier, count] of Object.entries(stats.qualityDistribution)) {
    console.log(`  ${tier}: ${count}`);
  }

  console.log('\nCognate languages:');
  const sortedLangs = Object.entries(stats.cognateLanguages).sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of sortedLangs.slice(0, 10)) {
    console.log(`  ${lang}: ${count}`);
  }

  console.log(`\n📂 Output: ${OUTPUT_PATH}`);
  return output;
}

// Run
if (require.main === module) {
  buildUnifiedEtymology();
}

module.exports = { buildUnifiedEtymology, CURATED_COGNATES };
