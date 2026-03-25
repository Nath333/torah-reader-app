/**
 * Unified Etymology Builder - PRO SCHOLAR V12
 * ============================================
 * Combines ALL scholarly sources into a comprehensive etymology database:
 *
 * TIER 1 - Academic Gold Standard:
 * - BDB Complete (6,000 entries) - Brown-Driver-Briggs
 * - Jastrow Complete (25,224 entries) - Talmudic/Aramaic
 * - HALOT (51 entries) - Hebrew & Aramaic Lexicon of OT
 * - DJBA (166 entries) - Sokoloff's Jewish Babylonian Aramaic
 * - DJPA (39 entries) - Jewish Palestinian Aramaic
 * - Klein (644 entries) - Etymological dictionary
 * - Gesenius (44 entries) - Hebrew Grammar
 * - TWOT (25 entries) - Theological Wordbook of OT
 *
 * TIER 2 - Reference Sources:
 * - CAL Aramaic (276 entries) - Curated Aramaic with dialects
 * - Targum (48 entries) - Targumic vocabulary
 * - Sefaria Cache (2,493 entries) - Pre-parsed lexicons
 * - Wiktionary (108 entries) - Proto-Semitic reconstructions
 *
 * SPECIAL:
 * - Critical Words (7 entries) - Deeply researched biblical names
 *
 * Output: public/data/etymology_unified_pro.json
 *
 * Usage: node scripts/buildUnifiedEtymology.js
 */

const fs = require('fs');
const path = require('path');

// Paths - ALL scholarly sources
const PATHS = {
  // Extracted data
  bdbExtracted: path.join(__dirname, '../public/data/etymology_bdb_extracted.json'),
  jastrowExtracted: path.join(__dirname, '../public/data/etymology_jastrow_extracted.json'),

  // Complete lexicons
  bdbComplete: path.join(__dirname, '../public/data/bdbComplete.json'),
  jastrowComplete: path.join(__dirname, '../public/data/jastrowComplete.json'),

  // Academic lexicons (Tier 1)
  halotLexicon: path.join(__dirname, '../public/data/halot_lexicon.json'),
  djbaLexicon: path.join(__dirname, '../public/data/djba_lexicon.json'),
  djpaLexicon: path.join(__dirname, '../public/data/djpa_lexicon.json'),
  kleinLexicon: path.join(__dirname, '../public/data/klein_lexicon.json'),
  geseniusLexicon: path.join(__dirname, '../public/data/gesenius_lexicon.json'),
  twotLexicon: path.join(__dirname, '../public/data/twot_lexicon.json'),

  // Reference lexicons (Tier 2)
  calAramaic: path.join(__dirname, '../public/data/cal_aramaic.json'),
  targumLexicon: path.join(__dirname, '../public/data/targum_lexicon.json'),
  sefariaCache: path.join(__dirname, '../public/data/sefaria_lexicon_cache.json'),
  wiktionaryCache: path.join(__dirname, '../public/data/wiktionary_etymology_cache.json'),

  // Special sources
  criticalWords: path.join(__dirname, '../public/data/critical_words_academic.json'),

  // Legacy
  calCache: path.join(__dirname, '../public/data/cal_enriched_cache.json'),
  rootMeanings: path.join(__dirname, '../public/data/root_meanings.json'),
  rootMeaningsEnriched: path.join(__dirname, '../public/data/root_meanings_enriched.json'),

  // Output
  output: path.join(__dirname, '../public/data/etymology_unified_pro.json')
};

// Source tier weights for quality scoring - PRO SCHOLAR V12
const SOURCE_WEIGHTS = {
  // Tier 1 - Academic Gold Standard
  'BDB': 1.0,
  'Jastrow': 1.0,
  'HALOT': 1.0,
  'DJBA': 1.0,
  'DJPA': 1.0,
  'Klein': 1.0,
  'Gesenius': 1.0,
  'TWOT': 1.0,
  'CAL': 1.0,
  // Tier 2 - Reference
  'Targum': 0.9,
  'Sefaria': 0.85,
  'Strong\'s': 0.8,
  'BDB Dictionary': 0.85,
  'Klein Dictionary': 0.85,
  'Jastrow Dictionary': 0.85,
  // Tier 3 - Supplementary
  'Wiktionary': 0.7,
  'manual': 0.9
};

/**
 * Load JSON file safely
 */
function loadJSON(filepath, description) {
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠️  ${description} not found`);
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const entryCount = data.entries ? Object.keys(data.entries).length :
                       data.byWord ? Object.keys(data.byWord).length :
                       Object.keys(data).length;
    console.log(`  ✓ ${description}: ${entryCount} entries`);
    return data;
  } catch (error) {
    console.log(`  ⚠️  Error loading ${description}: ${error.message}`);
    return null;
  }
}

/**
 * Normalize cognate format
 */
function normalizeCognates(cognates) {
  if (!cognates) return {};

  const normalized = {};

  for (const [lang, data] of Object.entries(cognates)) {
    if (Array.isArray(data)) {
      normalized[lang] = data.map(item => {
        if (typeof item === 'string') {
          return { word: item, source: 'unknown' };
        }
        return item;
      });
    } else if (typeof data === 'object' && data.word) {
      normalized[lang] = [data];
    } else if (typeof data === 'string') {
      normalized[lang] = [{ word: data, source: 'unknown' }];
    }
  }

  return normalized;
}

/**
 * Merge cognates from multiple sources
 */
function mergeCognates(existing, newCognates, source) {
  const merged = { ...existing };

  for (const [lang, cognates] of Object.entries(normalizeCognates(newCognates))) {
    merged[lang] = merged[lang] || [];

    for (const cog of cognates) {
      const word = typeof cog === 'string' ? cog : cog.word;
      const cogSource = typeof cog === 'object' ? cog.source : source;

      // Check if already exists
      if (!merged[lang].find(c => c.word === word)) {
        merged[lang].push({
          word,
          source: cogSource || source
        });
      }
    }
  }

  return merged;
}

/**
 * Calculate quality score for an entry
 */
function calculateQualityScore(entry) {
  let score = 0;

  // Source count and weight
  for (const src of entry.sources || []) {
    const weight = SOURCE_WEIGHTS[src] || 0.5;
    score += weight * 15;
  }

  // Cognate coverage
  const cognateCount = Object.keys(entry.etymology?.cognates || {}).length;
  score += Math.min(cognateCount * 5, 25);

  // Has Proto-Semitic
  if (entry.etymology?.protoSemitic) score += 15;

  // Has dialect info
  if (entry.dialects?.length > 0) score += 10;

  // Has cross-references
  if (entry.crossReferences?.hebrewEquivalents?.length > 0) score += 5;
  if (entry.crossReferences?.seeAlso?.length > 0) score += 3;

  // Has attestations
  if (entry.attestations?.length > 0) score += 5;

  // Has definition
  if (entry.definition) score += 5;

  // Cap at 100
  return Math.min(Math.round(score), 100);
}

/**
 * Get quality level from score
 */
function getQualityLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'minimal';
}

/**
 * Helper: Get entry from lexicon data (handles various formats)
 */
function getLexiconEntry(data, word) {
  if (!data) return null;
  // Direct entry
  if (data[word]) return data[word];
  // In entries object
  if (data.entries?.[word]) return data.entries[word];
  // In byWord object
  if (data.byWord?.[word]) return data.byWord[word];
  // Check nested categories (critical_words_academic.json)
  if (data.biblicalNames?.[word]) return data.biblicalNames[word];
  if (data.commonTerms?.[word]) return data.commonTerms[word];
  return null;
}

/**
 * Parse HALOT cognates string into structured format
 * Example: "Akk. abu, Ug. ʾab, Ar. ʾab, Eth. ʾab"
 */
function parseHalotCognates(cognateStr) {
  if (!cognateStr) return {};
  const cognates = {};
  const langMap = {
    'Akk': 'akkadian', 'Akk.': 'akkadian',
    'Ug': 'ugaritic', 'Ug.': 'ugaritic',
    'Ar': 'arabic', 'Ar.': 'arabic',
    'Eth': 'ethiopic', 'Eth.': 'ethiopic',
    'Aram': 'aramaic', 'Aram.': 'aramaic',
    'Ph': 'phoenician', 'Ph.': 'phoenician',
    'Syr': 'syriac', 'Syr.': 'syriac'
  };

  const parts = cognateStr.split(/[,;]/);
  for (const part of parts) {
    const trimmed = part.trim();
    for (const [abbr, lang] of Object.entries(langMap)) {
      if (trimmed.startsWith(abbr)) {
        const word = trimmed.replace(abbr, '').trim();
        if (word) {
          cognates[lang] = cognates[lang] || [];
          cognates[lang].push({ word, source: 'HALOT' });
        }
        break;
      }
    }
  }
  return cognates;
}

/**
 * Build unified entry from all sources - PRO SCHOLAR V12
 */
function buildUnifiedEntry(word, sources) {
  const entry = {
    key: word,
    lemma: null,
    definition: null,
    pos: null,
    strongsNumber: null,
    isAramaic: false,
    isBiblicalHebrew: false,
    etymology: {
      cognates: {},
      protoSemitic: null,
      confidence: null,
      relatedRoots: [],
      references: {}
    },
    crossReferences: {
      hebrewEquivalents: [],
      seeAlso: [],
      roots: []
    },
    loanwords: {},
    dialects: [],
    attestations: [],
    talmudUsage: null,       // PRO SCHOLAR: Talmudic usage from DJBA
    calTransliteration: null, // PRO SCHOLAR: CAL transliteration
    semanticField: null,      // PRO SCHOLAR: From HALOT
    frequency: null,          // PRO SCHOLAR: Biblical frequency
    definitions: [],          // All definitions from all sources
    sources: []
  };

  // Merge from BDB extracted
  if (sources.bdbExtracted?.entries?.[word]) {
    const bdb = sources.bdbExtracted.entries[word];
    entry.lemma = bdb.lemma || entry.lemma;
    entry.strongsNumber = bdb.strongsNumber || entry.strongsNumber;
    entry.pos = bdb.pos || entry.pos;

    if (bdb.etymology) {
      entry.etymology.cognates = mergeCognates(
        entry.etymology.cognates,
        bdb.etymology.cognates,
        'BDB'
      );
      entry.etymology.relatedRoots = [...new Set([
        ...entry.etymology.relatedRoots,
        ...(bdb.etymology.relatedRoots || [])
      ])];
      // References is an object { source: [refs] }, merge it
      if (bdb.etymology.references && typeof bdb.etymology.references === 'object') {
        for (const [source, refs] of Object.entries(bdb.etymology.references)) {
          if (Array.isArray(refs)) {
            entry.etymology.references[source] = [...new Set([
              ...(entry.etymology.references[source] || []),
              ...refs
            ])];
          }
        }
      }
      entry.etymology.confidence = bdb.etymology.confidence;
    }

    entry.sources.push('BDB');
  }

  // Merge from Jastrow extracted
  if (sources.jastrowExtracted?.entries?.[word]) {
    const jast = sources.jastrowExtracted.entries[word];
    entry.lemma = entry.lemma || jast.lemma;
    entry.isAramaic = jast.isAramaic || entry.isAramaic;
    entry.isBiblicalHebrew = jast.isBiblicalHebrew || entry.isBiblicalHebrew;

    // Cross-references
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

    // Loanwords
    for (const [lang, words] of Object.entries(jast.loanwords || {})) {
      entry.loanwords[lang] = [...new Set([
        ...(entry.loanwords[lang] || []),
        ...words
      ])];
    }

    // Dialects
    entry.dialects = [...new Set([...entry.dialects, ...(jast.dialects || [])])];

    if (!entry.sources.includes('Jastrow')) {
      entry.sources.push('Jastrow');
    }
  }

  // Merge from CAL cache
  if (sources.calCache?.entries?.[word]) {
    const cal = sources.calCache.entries[word];

    // Definitions
    if (cal.definitions?.length > 0) {
      for (const def of cal.definitions) {
        if (!entry.definitions.find(d => d.text === def)) {
          entry.definitions.push({ text: def, source: 'CAL' });
        }
      }
    }

    // Dialects (CAL's strong suit)
    if (cal.dialects?.length > 0) {
      entry.dialects = [...new Set([...entry.dialects, ...cal.dialects])];
    }

    // Attestations
    if (cal.attestations?.length > 0) {
      entry.attestations = [...new Set([
        ...entry.attestations,
        ...cal.attestations
      ])];
    }

    // POS
    if (cal.partOfSpeech) {
      entry.pos = entry.pos || cal.partOfSpeech;
    }

    entry.isAramaic = true; // CAL only has Aramaic
    if (!entry.sources.includes('CAL')) {
      entry.sources.push('CAL');
    }
  }

  // Merge from Sefaria cache
  if (sources.sefariaCache?.entries?.[word]) {
    const sefaria = sources.sefariaCache.entries[word];

    for (const sef of sefaria.entries || []) {
      // Definitions
      if (sef.definition && !entry.definitions.find(d => d.text === sef.definition)) {
        entry.definitions.push({
          text: sef.definition,
          source: sef.lexicon || 'Sefaria'
        });
      }

      // Strong's number
      if (sef.strongNumber) {
        entry.strongsNumber = entry.strongsNumber || sef.strongNumber;
      }

      // POS
      if (sef.pos) {
        entry.pos = entry.pos || sef.pos;
      }

      // Track lexicon source
      if (sef.lexicon && !entry.sources.includes(sef.lexicon)) {
        entry.sources.push(sef.lexicon);
      }
    }

    if (!entry.sources.includes('Sefaria')) {
      entry.sources.push('Sefaria');
    }
  }

  // Merge from Wiktionary cache (Proto-Semitic & cognates)
  if (sources.wiktionaryCache?.entries?.[word]) {
    const wiki = sources.wiktionaryCache.entries[word];

    // Proto-Semitic reconstruction (high value)
    if (wiki.protoSemitic && !entry.etymology.protoSemitic) {
      entry.etymology.protoSemitic = wiki.protoSemitic;
    }

    // Root
    if (wiki.root && !entry.root) {
      entry.root = wiki.root;
    }

    // Merge cognates from Wiktionary
    if (wiki.cognates && Object.keys(wiki.cognates).length > 0) {
      entry.etymology.cognates = mergeCognates(
        entry.etymology.cognates,
        wiki.cognates,
        'Wiktionary'
      );
    }

    // Etymology text as a reference
    if (wiki.etymologyText) {
      entry.etymologyNote = wiki.etymologyText;
    }

    if (!entry.sources.includes('Wiktionary')) {
      entry.sources.push('Wiktionary');
    }
  }

  // Merge from existing root_meanings_enriched
  if (sources.rootMeaningsEnriched?.entries?.[word]) {
    const existing = sources.rootMeaningsEnriched.entries[word];

    // Proto-Semitic (preserve manual data)
    if (existing.etymology?.protoSemitic) {
      entry.etymology.protoSemitic = existing.etymology.protoSemitic;
    }

    // Merge cognates
    if (existing.etymology?.cognates) {
      entry.etymology.cognates = mergeCognates(
        entry.etymology.cognates,
        existing.etymology.cognates,
        'manual'
      );
    }
  }

  // =====================================================================
  // PRO SCHOLAR V12: TIER 1 Academic Lexicons
  // =====================================================================

  // Merge from HALOT (Hebrew & Aramaic Lexicon of OT) - Proto-Semitic gold!
  const halotEntry = getLexiconEntry(sources.halotLexicon, word);
  if (halotEntry) {
    entry.lemma = entry.lemma || halotEntry.lemma;
    entry.pos = entry.pos || halotEntry.pos;
    entry.semanticField = halotEntry.semantic_field || entry.semanticField;
    entry.frequency = halotEntry.frequency || entry.frequency;

    // HALOT has excellent Proto-Semitic data
    if (halotEntry.etymology && !entry.etymology.protoSemitic) {
      const protoMatch = halotEntry.etymology.match(/Proto-Semitic\s+\*([^\s;,]+)/i);
      if (protoMatch) {
        entry.etymology.protoSemitic = protoMatch[1];
      }
    }

    // Parse cognates string
    if (halotEntry.cognates) {
      const halotCognates = parseHalotCognates(halotEntry.cognates);
      entry.etymology.cognates = mergeCognates(entry.etymology.cognates, halotCognates, 'HALOT');
    }

    // Add definition
    if (halotEntry.definition && !entry.definitions.find(d => d.source === 'HALOT')) {
      entry.definitions.push({ text: halotEntry.definition, source: 'HALOT' });
    }

    if (!entry.sources.includes('HALOT')) {
      entry.sources.push('HALOT');
    }
  }

  // Merge from DJBA (Sokoloff) - Jewish Babylonian Aramaic
  const djbaEntry = getLexiconEntry(sources.djbaLexicon, word);
  if (djbaEntry) {
    entry.lemma = entry.lemma || djbaEntry.lemma;
    entry.pos = entry.pos || djbaEntry.pos;
    entry.isAramaic = true;
    entry.talmudUsage = djbaEntry.talmudic_usage || entry.talmudUsage;

    // Add definition
    if (djbaEntry.definition && !entry.definitions.find(d => d.source === 'DJBA')) {
      entry.definitions.push({ text: djbaEntry.definition, source: 'DJBA' });
    }
    if (djbaEntry.fullDefinition && !entry.definitions.find(d => d.text === djbaEntry.fullDefinition)) {
      entry.definitions.push({ text: djbaEntry.fullDefinition, source: 'DJBA (full)' });
    }

    // Dialects
    if (!entry.dialects.includes('Jewish Babylonian Aramaic')) {
      entry.dialects.push('Jewish Babylonian Aramaic');
    }

    if (!entry.sources.includes('DJBA')) {
      entry.sources.push('DJBA');
    }
  }

  // Merge from DJPA - Jewish Palestinian Aramaic
  const djpaEntry = getLexiconEntry(sources.djpaLexicon, word);
  if (djpaEntry) {
    entry.lemma = entry.lemma || djpaEntry.lemma;
    entry.pos = entry.pos || djpaEntry.pos;
    entry.isAramaic = true;

    if (djpaEntry.definition && !entry.definitions.find(d => d.source === 'DJPA')) {
      entry.definitions.push({ text: djpaEntry.definition, source: 'DJPA' });
    }

    if (!entry.dialects.includes('Jewish Palestinian Aramaic')) {
      entry.dialects.push('Jewish Palestinian Aramaic');
    }

    if (!entry.sources.includes('DJPA')) {
      entry.sources.push('DJPA');
    }
  }

  // Merge from Klein - Etymological dictionary
  const kleinEntry = getLexiconEntry(sources.kleinLexicon, word);
  if (kleinEntry) {
    entry.lemma = entry.lemma || kleinEntry.lemma;
    entry.pos = entry.pos || kleinEntry.pos;

    if (kleinEntry.definition && !entry.definitions.find(d => d.source === 'Klein')) {
      entry.definitions.push({ text: kleinEntry.definition, source: 'Klein' });
    }

    if (!entry.sources.includes('Klein')) {
      entry.sources.push('Klein');
    }
  }

  // Merge from Gesenius
  const geseniusEntry = getLexiconEntry(sources.geseniusLexicon, word);
  if (geseniusEntry) {
    entry.lemma = entry.lemma || geseniusEntry.lemma;
    entry.pos = entry.pos || geseniusEntry.pos;

    if (geseniusEntry.definition && !entry.definitions.find(d => d.source === 'Gesenius')) {
      entry.definitions.push({ text: geseniusEntry.definition, source: 'Gesenius' });
    }

    if (!entry.sources.includes('Gesenius')) {
      entry.sources.push('Gesenius');
    }
  }

  // Merge from TWOT (Theological Wordbook of OT)
  const twotEntry = getLexiconEntry(sources.twotLexicon, word);
  if (twotEntry) {
    entry.lemma = entry.lemma || twotEntry.lemma;
    entry.pos = entry.pos || twotEntry.pos;

    if (twotEntry.definition && !entry.definitions.find(d => d.source === 'TWOT')) {
      entry.definitions.push({ text: twotEntry.definition, source: 'TWOT' });
    }

    if (!entry.sources.includes('TWOT')) {
      entry.sources.push('TWOT');
    }
  }

  // =====================================================================
  // PRO SCHOLAR V12: TIER 2 Reference Lexicons
  // =====================================================================

  // Merge from CAL Aramaic (curated) - Rich dialect & Hebrew equivalent data
  const calAramaicEntry = getLexiconEntry(sources.calAramaic, word);
  if (calAramaicEntry) {
    entry.lemma = entry.lemma || calAramaicEntry.lemma;
    entry.pos = entry.pos || calAramaicEntry.pos;
    entry.isAramaic = true;
    entry.calTransliteration = calAramaicEntry.cal || entry.calTransliteration;

    // Hebrew equivalent (cross-reference)
    if (calAramaicEntry.hebrew && !entry.crossReferences.hebrewEquivalents.includes(calAramaicEntry.hebrew)) {
      entry.crossReferences.hebrewEquivalents.push(calAramaicEntry.hebrew);
    }

    // Dialects from CAL
    if (calAramaicEntry.dialects && Array.isArray(calAramaicEntry.dialects)) {
      const dialectMap = {
        'BA': 'Biblical Aramaic',
        'JBA': 'Jewish Babylonian Aramaic',
        'JPA': 'Jewish Palestinian Aramaic',
        'Tg': 'Targumic'
      };
      for (const d of calAramaicEntry.dialects) {
        const fullName = dialectMap[d] || d;
        if (!entry.dialects.includes(fullName)) {
          entry.dialects.push(fullName);
        }
      }
    }

    // Related words
    if (calAramaicEntry.related && Array.isArray(calAramaicEntry.related)) {
      entry.crossReferences.seeAlso = [...new Set([
        ...entry.crossReferences.seeAlso,
        ...calAramaicEntry.related
      ])];
    }

    if (calAramaicEntry.definition && !entry.definitions.find(d => d.source === 'CAL')) {
      entry.definitions.push({ text: calAramaicEntry.definition, source: 'CAL' });
    }

    if (!entry.sources.includes('CAL')) {
      entry.sources.push('CAL');
    }
  }

  // Merge from Targum lexicon
  const targumEntry = getLexiconEntry(sources.targumLexicon, word);
  if (targumEntry) {
    entry.lemma = entry.lemma || targumEntry.lemma;
    entry.isAramaic = true;

    if (targumEntry.definition && !entry.definitions.find(d => d.source === 'Targum')) {
      entry.definitions.push({ text: targumEntry.definition, source: 'Targum' });
    }

    if (!entry.dialects.includes('Targumic')) {
      entry.dialects.push('Targumic');
    }

    if (!entry.sources.includes('Targum')) {
      entry.sources.push('Targum');
    }
  }

  // Merge from Critical Words (deeply researched biblical names)
  const criticalEntry = getLexiconEntry(sources.criticalWords, word);
  if (criticalEntry) {
    entry.lemma = entry.lemma || criticalEntry.lemma;
    entry.pos = entry.pos || criticalEntry.pos;
    entry.frequency = criticalEntry.frequency || entry.frequency;
    entry.isBiblicalHebrew = true;

    if (criticalEntry.etymology && !entry.etymology.protoSemitic) {
      entry.etymology.references['critical'] = criticalEntry.etymology;
    }

    if (criticalEntry.definition && !entry.definitions.find(d => d.source === 'Critical')) {
      entry.definitions.push({ text: criticalEntry.fullDefinition || criticalEntry.definition, source: 'Critical' });
    }

    if (!entry.sources.includes('Critical')) {
      entry.sources.push('Critical');
    }
  }

  // Set primary definition
  if (entry.definitions.length > 0) {
    entry.definition = entry.definitions[0].text;
  }

  // Calculate quality
  entry.qualityScore = calculateQualityScore(entry);
  entry.qualityLevel = getQualityLevel(entry.qualityScore);

  return entry;
}

/**
 * Main builder function - PRO SCHOLAR V12
 */
function buildUnifiedEtymology() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       Unified Etymology Database Builder - PRO SCHOLAR V12    ║');
  console.log('║       ALL Scholarly Sources Integration                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load all sources - PRO SCHOLAR V12: Comprehensive loading
  console.log('Loading TIER 1 - Academic Gold Standard...');
  const sources = {
    // Extracted data
    bdbExtracted: loadJSON(PATHS.bdbExtracted, 'BDB Extracted'),
    jastrowExtracted: loadJSON(PATHS.jastrowExtracted, 'Jastrow Extracted'),

    // Complete lexicons
    bdbComplete: loadJSON(PATHS.bdbComplete, 'BDB Complete'),
    jastrowComplete: loadJSON(PATHS.jastrowComplete, 'Jastrow Complete'),

    // Academic lexicons (Tier 1)
    halotLexicon: loadJSON(PATHS.halotLexicon, 'HALOT Lexicon'),
    djbaLexicon: loadJSON(PATHS.djbaLexicon, 'DJBA (Sokoloff)'),
    djpaLexicon: loadJSON(PATHS.djpaLexicon, 'DJPA Lexicon'),
    kleinLexicon: loadJSON(PATHS.kleinLexicon, 'Klein Etymological'),
    geseniusLexicon: loadJSON(PATHS.geseniusLexicon, 'Gesenius'),
    twotLexicon: loadJSON(PATHS.twotLexicon, 'TWOT'),

    // Reference lexicons (Tier 2)
    calAramaic: loadJSON(PATHS.calAramaic, 'CAL Aramaic (curated)'),
    targumLexicon: loadJSON(PATHS.targumLexicon, 'Targum Lexicon'),
    sefariaCache: loadJSON(PATHS.sefariaCache, 'Sefaria Cache'),
    wiktionaryCache: loadJSON(PATHS.wiktionaryCache, 'Wiktionary Cache'),

    // Special sources
    criticalWords: loadJSON(PATHS.criticalWords, 'Critical Words Academic'),

    // Legacy
    calCache: loadJSON(PATHS.calCache, 'CAL Cache (API)'),
    rootMeaningsEnriched: loadJSON(PATHS.rootMeaningsEnriched, 'Root Meanings Enriched')
  };

  // Helper to get entries from various file structures
  const getEntries = (data) => {
    if (!data) return {};
    if (data.entries) return data.entries;
    if (data.byWord) return data.byWord;
    // Direct object with _meta - filter out _meta
    const entries = { ...data };
    delete entries._meta;
    // Check for nested categories like biblicalNames
    if (entries.biblicalNames) {
      return { ...entries.biblicalNames, ...entries.commonTerms || {} };
    }
    return entries;
  };

  // Collect all unique words
  console.log('\nCollecting unique words from ALL sources...');
  const allWords = new Set();

  // From complete lexicons
  if (sources.bdbComplete?.byWord) {
    Object.keys(sources.bdbComplete.byWord).forEach(w => allWords.add(w));
  }
  if (sources.jastrowComplete) {
    Object.keys(sources.jastrowComplete).filter(k => k !== '_meta').forEach(w => allWords.add(w));
  }

  // From extractions
  if (sources.bdbExtracted?.entries) {
    Object.keys(sources.bdbExtracted.entries).forEach(w => allWords.add(w));
  }
  if (sources.jastrowExtracted?.entries) {
    Object.keys(sources.jastrowExtracted.entries).forEach(w => allWords.add(w));
  }

  // From academic lexicons (Tier 1)
  Object.keys(getEntries(sources.halotLexicon)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.djbaLexicon)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.djpaLexicon)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.kleinLexicon)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.geseniusLexicon)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.twotLexicon)).forEach(w => allWords.add(w));

  // From reference lexicons (Tier 2)
  Object.keys(getEntries(sources.calAramaic)).forEach(w => allWords.add(w));
  Object.keys(getEntries(sources.targumLexicon)).forEach(w => allWords.add(w));

  // From caches
  if (sources.calCache?.entries) {
    Object.keys(sources.calCache.entries).forEach(w => allWords.add(w));
  }
  if (sources.sefariaCache?.entries) {
    Object.keys(sources.sefariaCache.entries).forEach(w => allWords.add(w));
  }
  if (sources.wiktionaryCache?.entries) {
    Object.keys(sources.wiktionaryCache.entries).forEach(w => allWords.add(w));
  }

  // From critical words
  const criticalEntries = getEntries(sources.criticalWords);
  Object.keys(criticalEntries).forEach(w => allWords.add(w));

  console.log(`  Found ${allWords.size} unique words`);

  // Build unified entries
  console.log('\nBuilding unified entries...');
  const unifiedEntries = {};
  const stats = {
    total: 0,
    withCognates: 0,
    withDialects: 0,
    withProtoSemitic: 0,
    aramaic: 0,
    biblical: 0,
    // Academic source tracking (Tier 1)
    withHALOT: 0,
    withDJBA: 0,
    withDJPA: 0,
    withKlein: 0,
    withGesenius: 0,
    withTWOT: 0,
    // Reference source tracking (Tier 2)
    withCAL: 0,
    withTargum: 0,
    withSefaria: 0,
    withWiktionary: 0,
    // Quality
    qualityDistribution: { excellent: 0, high: 0, medium: 0, low: 0, minimal: 0 },
    cognateLanguages: {},
    dialectCounts: {},
    calTransliterations: 0
  };

  let processed = 0;
  for (const word of allWords) {
    const entry = buildUnifiedEntry(word, sources);

    // Only include entries with meaningful data
    if (entry.sources.length > 0 ||
        Object.keys(entry.etymology.cognates).length > 0 ||
        entry.crossReferences.hebrewEquivalents.length > 0 ||
        entry.dialects.length > 0) {

      unifiedEntries[word] = entry;
      stats.total++;

      // Update stats
      if (Object.keys(entry.etymology.cognates).length > 0) stats.withCognates++;
      if (entry.dialects.length > 0) stats.withDialects++;
      if (entry.etymology.protoSemitic) stats.withProtoSemitic++;
      if (entry.isAramaic) stats.aramaic++;
      if (entry.isBiblicalHebrew) stats.biblical++;
      if (entry.calTransliteration) stats.calTransliterations++;

      // Academic source tracking (Tier 1)
      if (entry.sources.includes('HALOT')) stats.withHALOT++;
      if (entry.sources.includes('DJBA')) stats.withDJBA++;
      if (entry.sources.includes('DJPA')) stats.withDJPA++;
      if (entry.sources.includes('Klein')) stats.withKlein++;
      if (entry.sources.includes('Gesenius')) stats.withGesenius++;
      if (entry.sources.includes('TWOT')) stats.withTWOT++;

      // Reference source tracking (Tier 2)
      if (entry.sources.includes('CAL')) stats.withCAL++;
      if (entry.sources.includes('Targum')) stats.withTargum++;
      if (entry.sources.includes('Sefaria')) stats.withSefaria++;
      if (entry.sources.includes('Wiktionary')) stats.withWiktionary++;

      // Quality distribution
      stats.qualityDistribution[entry.qualityLevel]++;

      // Cognate languages
      for (const lang of Object.keys(entry.etymology.cognates)) {
        stats.cognateLanguages[lang] = (stats.cognateLanguages[lang] || 0) + 1;
      }

      // Dialects
      for (const dialect of entry.dialects) {
        stats.dialectCounts[dialect] = (stats.dialectCounts[dialect] || 0) + 1;
      }
    }

    processed++;
    if (processed % 5000 === 0) {
      console.log(`  Processed ${processed}/${allWords.size} words...`);
    }
  }

  // Create output - PRO SCHOLAR V12
  const output = {
    _meta: {
      name: 'Scholar Pro Unified Etymology Database',
      version: '4.0.0',
      description: 'PRO SCHOLAR V12: ALL academic sources integrated - HALOT, DJBA, Klein, Gesenius, TWOT, CAL, Sefaria, Wiktionary',
      generatedAt: new Date().toISOString(),
      sources: [
        // Tier 1 - Academic Gold Standard
        'BDB (Brown-Driver-Briggs) - extracted cognates',
        'Jastrow - cross-references, loanwords, dialects',
        'HALOT (Hebrew & Aramaic Lexicon of OT) - Proto-Semitic, cognates',
        'DJBA (Sokoloff) - Jewish Babylonian Aramaic',
        'DJPA - Jewish Palestinian Aramaic',
        'Klein - Etymological dictionary',
        'Gesenius - Hebrew Grammar',
        'TWOT - Theological Wordbook of OT',
        // Tier 2 - Reference
        'CAL (Comprehensive Aramaic Lexicon) - curated dialects',
        'Targum - Targumic vocabulary',
        'Sefaria Lexicon API - pre-parsed BDB/Klein/Jastrow',
        'Wiktionary - Proto-Semitic reconstructions'
      ],
      statistics: stats,
      license: 'Academic sources - various licenses. Sefaria: CC-BY-NC. Wiktionary: CC-BY-SA.',
      note: 'NO AI-generated definitions - all data from real scholarly sources'
    },
    entries: unifiedEntries
  };

  // Write output
  console.log(`\nWriting to ${PATHS.output}...`);
  fs.writeFileSync(PATHS.output, JSON.stringify(output, null, 2), 'utf8');

  // Summary - PRO SCHOLAR V12
  console.log('\n✅ PRO SCHOLAR V12 - Unified Etymology Database Complete!');
  console.log('=========================================================');
  console.log(`Total entries: ${stats.total}`);
  console.log(`With cognates: ${stats.withCognates}`);
  console.log(`With Proto-Semitic: ${stats.withProtoSemitic}`);
  console.log(`With dialects: ${stats.withDialects}`);
  console.log(`CAL transliterations: ${stats.calTransliterations}`);
  console.log(`Aramaic entries: ${stats.aramaic}`);
  console.log(`Biblical Hebrew: ${stats.biblical}`);

  console.log('\n📚 TIER 1 - Academic Gold Standard:');
  console.log(`  HALOT: ${stats.withHALOT}`);
  console.log(`  DJBA (Sokoloff): ${stats.withDJBA}`);
  console.log(`  DJPA: ${stats.withDJPA}`);
  console.log(`  Klein: ${stats.withKlein}`);
  console.log(`  Gesenius: ${stats.withGesenius}`);
  console.log(`  TWOT: ${stats.withTWOT}`);

  console.log('\n📖 TIER 2 - Reference Sources:');
  console.log(`  CAL: ${stats.withCAL}`);
  console.log(`  Targum: ${stats.withTargum}`);
  console.log(`  Sefaria: ${stats.withSefaria}`);
  console.log(`  Wiktionary: ${stats.withWiktionary}`);

  console.log('\nQuality distribution:');
  for (const [level, count] of Object.entries(stats.qualityDistribution)) {
    const pct = ((count / stats.total) * 100).toFixed(1);
    console.log(`  ${level}: ${count} (${pct}%)`);
  }

  console.log('\nCognate languages:');
  const sortedLangs = Object.entries(stats.cognateLanguages).sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of sortedLangs.slice(0, 10)) {
    console.log(`  ${lang}: ${count}`);
  }

  if (Object.keys(stats.dialectCounts).length > 0) {
    console.log('\nDialect coverage:');
    for (const [dialect, count] of Object.entries(stats.dialectCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${dialect}: ${count}`);
    }
  }

  console.log(`\nOutput saved to: ${PATHS.output}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  buildUnifiedEtymology();
}

module.exports = { buildUnifiedEtymology };
