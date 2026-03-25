/**
 * Jastrow Cross-Reference Extraction Script
 * ==========================================
 * Extracts Hebrew-Aramaic cross-references and loanword data from Jastrow Complete.
 *
 * Jastrow entries contain patterns like:
 *   "ch. = h. אָב" (Chaldean = Hebrew אב)
 *   "v. אַוָּארָא" (see entry אוארא)
 *   "Greek origin" / "from Greek αὐτόματος"
 *   "(b. h.)" = Biblical Hebrew
 *
 * This script parses these patterns to create structured cross-reference data.
 *
 * Usage: node scripts/extractJastrowCrossRefs.js
 * Output: public/data/etymology_jastrow_extracted.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const JASTROW_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const OUTPUT_PATH = path.join(__dirname, '../public/data/etymology_jastrow_extracted.json');

// Cross-reference patterns in Jastrow
const CROSS_REF_PATTERNS = {
  // Hebrew equivalents: "ch. = h. אב" or "= h. אב"
  hebrewEquivalent: [
    /=\s*h\.\s*([א-ת]+)/gi,
    /ch\.\s*=\s*h\.\s*([א-ת]+)/gi,
    /Chald(?:ean)?\s*=\s*Heb(?:rew)?\s*([א-ת]+)/gi,
    /\(h\.\s*([א-ת]+)\)/gi,
  ],

  // Biblical Hebrew marker
  biblicalHebrew: [
    /\(b\.\s*h\.?\)/gi,
    /\(bibl(?:ical)?\)/gi,
  ],

  // Cross-reference to other entries
  seeAlso: [
    /v\.\s+([א-ת״׳]+)/gi,       // "v. אוארא" = see entry
    /see\s+([א-ת״׳]+)/gi,
    /comp(?:are)?\s+([א-ת״׳]+)/gi,
  ],

  // Root references
  rootRef: [
    /\(\s*([א-ת]{2,3})\s*\)/g,   // Root in parentheses
    /√\s*([א-ת]{2,3})/g,
    /from\s+([א-ת]{2,3})\b/gi,
  ],
};

// Loanword patterns
const LOANWORD_PATTERNS = {
  greek: [
    /Greek\s+([^\s,;()]+)/gi,
    /Gr\.\s+([^\s,;()]+)/gi,
    /from\s+Greek\s+([^\s,;()]+)/gi,
    /=\s*([αβγδεζηθικλμνξοπρστυφχψω]+)/gi,  // Greek letters
    /αὐ/gi,  // Common Greek prefixes
  ],

  latin: [
    /Latin\s+([^\s,;()]+)/gi,
    /Lat\.\s+([^\s,;()]+)/gi,
    /from\s+Latin\s+([^\s,;()]+)/gi,
  ],

  persian: [
    /Persian\s+([^\s,;()]+)/gi,
    /Pers\.\s+([^\s,;()]+)/gi,
  ],

  aramaic: [
    /Syriac\s+([^\s,;()]+)/gi,
    /Syr\.\s+([^\s,;()]+)/gi,
  ],
};

// Dialect markers
const DIALECT_PATTERNS = {
  babylonian: [
    /\bBab\b/gi,
    /Babylonian/gi,
    /\bB\.\s*Talmud\b/gi,
  ],
  palestinian: [
    /\bPal\b/gi,
    /Palestinian/gi,
    /\bY\.\b/gi,  // Yerushalmi
    /\bJer\.\b/gi,
  ],
  targumic: [
    /Targ(?:um)?/gi,
    /\bO\.\b/gi,  // Onkelos
  ],
};

// Text reference patterns (tractate citations)
const CITATION_PATTERNS = [
  /\b(Ber(?:akhot)?|Shab(?:bat)?|Erub(?:in)?|Pes(?:achim)?|Yoma|Sukk(?:ah)?|Bets(?:ah)?|R\.?\s*H(?:ashana)?|Taan(?:it)?|Meg(?:illah)?|M\.?\s*K(?:atan)?|Hag(?:igah)?|Yeb(?:amot)?|Ket(?:ubot)?|Ned(?:arim)?|Naz(?:ir)?|Sotah?|Git(?:tin)?|Kid(?:dushin)?|B\.?\s*K(?:amma)?|B\.?\s*M(?:etsia)?|B\.?\s*B(?:atra)?|Sanh(?:edrin)?|Mak(?:kot)?|Shebu(?:ot)?|A\.?\s*Z(?:arah)?|Hor(?:ayot)?|Zeb(?:achim)?|Men(?:achot)?|Hul(?:lin)?|Bekh(?:orot)?|Arak(?:hin)?|Tem(?:urah)?|Ker(?:itot)?|Me'il(?:ah)?|Tam(?:id)?|Mid(?:dot)?|Kin(?:nim)?|Kel(?:im)?|Ohal(?:ot)?|Neg(?:aim)?|Par(?:ah)?|Tohar(?:ot)?|Mikw(?:aot)?|Nidd(?:ah)?|Makhsh(?:irin)?|Zab(?:im)?|Teb(?:ul)?|Yad(?:ayim)?|Uk(?:tsin)?)\b\.?\s*(\d+[ab]?)/gi,
  /\b(Gen|Exod?|Lev|Num|Deut|Josh|Judg|Sam|Kgs?|Isa|Jer|Ezek|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Ps|Prov|Job|Song|Ruth|Lam|Eccl?|Esth?|Dan|Ezra|Neh|Chr)\b\.?\s*(\d+[,:]\d+)/gi,
];

/**
 * Detect if entry is Aramaic
 */
function isAramaicEntry(entry) {
  const def = entry.definition || '';
  const indicators = [
    entry.isAramaic === true,
    /^ch\./i.test(def),
    /emphatic state/i.test(def),
    /\bAram(?:aic)?\b/i.test(def),
    /א$/.test(entry.key || ''),  // Ends in emphatic aleph
    /תא$/.test(entry.key || ''), // Ends in -ta
  ];
  return indicators.some(Boolean);
}

/**
 * Extract Hebrew equivalents
 */
function extractHebrewEquivalents(text) {
  const equivalents = [];

  for (const pattern of CROSS_REF_PATTERNS.hebrewEquivalent) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const word = match[1]?.trim();
      if (word && /^[א-ת]+$/.test(word)) {
        equivalents.push(word);
      }
    }
  }

  return [...new Set(equivalents)];
}

/**
 * Extract cross-references
 */
function extractCrossRefs(text) {
  const refs = [];

  for (const pattern of CROSS_REF_PATTERNS.seeAlso) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const word = match[1]?.trim();
      if (word && word.length > 1) {
        refs.push(word);
      }
    }
  }

  return [...new Set(refs)];
}

/**
 * Extract root references
 */
function extractRoots(text) {
  const roots = [];

  for (const pattern of CROSS_REF_PATTERNS.rootRef) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const root = match[1]?.trim();
      if (root && /^[א-ת]{2,3}$/.test(root)) {
        roots.push(root);
      }
    }
  }

  return [...new Set(roots)];
}

/**
 * Extract loanword information
 */
function extractLoanwords(text) {
  const loanwords = {};

  for (const [language, patterns] of Object.entries(LOANWORD_PATTERNS)) {
    const matches = [];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const word = match[1].trim();
          if (word.length > 1) {
            matches.push(word);
          }
        } else {
          // Pattern matched but no capture group (like Greek letter detection)
          matches.push('[detected]');
        }
      }
    }

    if (matches.length > 0) {
      loanwords[language] = [...new Set(matches)];
    }
  }

  return loanwords;
}

/**
 * Detect dialect
 */
function detectDialect(text) {
  const dialects = [];

  for (const [dialect, patterns] of Object.entries(DIALECT_PATTERNS)) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        dialects.push(dialect);
        break;
      }
    }
  }

  return [...new Set(dialects)];
}

/**
 * Check if biblical Hebrew
 */
function isBiblicalHebrew(text) {
  for (const pattern of CROSS_REF_PATTERNS.biblicalHebrew) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract citations
 */
function extractCitations(text) {
  const citations = [];

  for (const pattern of CITATION_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      citations.push(match[0]);
    }
  }

  return [...new Set(citations)].slice(0, 5); // Limit to 5 citations
}

/**
 * Process a single Jastrow entry
 */
function processEntry(word, entry) {
  const text = entry.definition || '';
  if (!text || text.length < 3) {
    return null;
  }

  // Extract data
  const hebrewEquivalents = extractHebrewEquivalents(text);
  const crossRefs = extractCrossRefs(text);
  const roots = extractRoots(text);
  const loanwords = extractLoanwords(text);
  const dialects = detectDialect(text);
  const citations = extractCitations(text);
  const biblicalHebrew = isBiblicalHebrew(text);
  const isAramaic = isAramaicEntry(entry);

  // Check if we have useful data
  const hasUsefulData =
    hebrewEquivalents.length > 0 ||
    crossRefs.length > 0 ||
    roots.length > 0 ||
    Object.keys(loanwords).length > 0 ||
    dialects.length > 0;

  if (!hasUsefulData && !isAramaic && !biblicalHebrew) {
    return null;
  }

  return {
    key: word,
    lemma: entry.lemma || word,
    isAramaic,
    isBiblicalHebrew: biblicalHebrew,
    crossReferences: {
      hebrewEquivalents,
      seeAlso: crossRefs,
      roots,
    },
    loanwords,
    dialects,
    citations: citations.length > 0 ? citations : undefined,
    source: 'Jastrow',
    excerpt: text.substring(0, 150)
  };
}

/**
 * Main extraction function
 */
function extractJastrowCrossRefs() {
  console.log('📚 Jastrow Cross-Reference Extraction');
  console.log('======================================\n');

  // Load Jastrow Complete
  console.log(`Loading ${JASTROW_PATH}...`);
  const jastrowRaw = fs.readFileSync(JASTROW_PATH, 'utf8');
  const jastrow = JSON.parse(jastrowRaw);

  const totalEntries = Object.keys(jastrow).length;
  console.log(`Loaded ${totalEntries} Jastrow entries\n`);

  // Process entries
  const results = {};
  let processed = 0;
  let withData = 0;
  let aramaicCount = 0;
  let hebrewEquivCount = 0;
  const loanwordCounts = {};
  const dialectCounts = {};

  for (const [word, entry] of Object.entries(jastrow)) {
    const extracted = processEntry(word, entry);

    if (extracted) {
      results[word] = extracted;
      withData++;

      if (extracted.isAramaic) aramaicCount++;
      if (extracted.crossReferences.hebrewEquivalents.length > 0) hebrewEquivCount++;

      // Count loanwords
      for (const lang of Object.keys(extracted.loanwords)) {
        loanwordCounts[lang] = (loanwordCounts[lang] || 0) + 1;
      }

      // Count dialects
      for (const dialect of extracted.dialects) {
        dialectCounts[dialect] = (dialectCounts[dialect] || 0) + 1;
      }
    }

    processed++;
    if (processed % 5000 === 0) {
      console.log(`  Processed ${processed}/${totalEntries} entries...`);
    }
  }

  // Create output
  const output = {
    _meta: {
      source: 'Jastrow Dictionary of Talmud Bavli, Yerushalmi, Midrashic Literature and Targumim',
      extractedAt: new Date().toISOString(),
      totalJastrowEntries: totalEntries,
      entriesWithData: withData,
      aramaicEntries: aramaicCount,
      entriesWithHebrewEquivalents: hebrewEquivCount,
      extractionRate: `${((withData / totalEntries) * 100).toFixed(1)}%`,
      loanwordCoverage: loanwordCounts,
      dialectCoverage: dialectCounts,
      license: 'Public Domain (1903)',
      note: 'Extracted from Jastrow Complete - Hebrew-Aramaic cross-refs and loanwords'
    },
    entries: results
  };

  // Write output
  console.log(`\nWriting to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n✅ Extraction Complete!');
  console.log('========================');
  console.log(`Total Jastrow entries: ${totalEntries}`);
  console.log(`Entries with cross-ref data: ${withData} (${((withData / totalEntries) * 100).toFixed(1)}%)`);
  console.log(`Aramaic entries: ${aramaicCount}`);
  console.log(`With Hebrew equivalents: ${hebrewEquivCount}`);

  if (Object.keys(loanwordCounts).length > 0) {
    console.log('\nLoanword language coverage:');
    for (const [lang, count] of Object.entries(loanwordCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${lang}: ${count} entries`);
    }
  }

  if (Object.keys(dialectCounts).length > 0) {
    console.log('\nDialect coverage:');
    for (const [dialect, count] of Object.entries(dialectCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${dialect}: ${count} entries`);
    }
  }

  console.log(`\nOutput saved to: ${OUTPUT_PATH}`);

  return output;
}

// Run if called directly
if (require.main === module) {
  extractJastrowCrossRefs();
}

module.exports = { extractJastrowCrossRefs, processEntry };
