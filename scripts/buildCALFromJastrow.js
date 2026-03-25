/**
 * Build CAL Aramaic Data from Jastrow
 * ====================================
 * Jastrow's Dictionary contains ~25,000 entries with excellent Aramaic coverage.
 * This script extracts Aramaic-specific entries to create a comprehensive
 * CAL-compatible dataset.
 *
 * Aramaic indicators in Jastrow:
 * - Entries starting with "ch." (Chaldee = Aramaic)
 * - Words ending in א (emphatic state)
 * - Dialect markers: "Targ.", "b.", "Y.", etc.
 *
 * Usage: node scripts/buildCALFromJastrow.js
 * Output: public/data/cal_aramaic.json (enhanced)
 */

const fs = require('fs');
const path = require('path');

// Paths
const JASTROW_PATH = path.join(__dirname, '../public/data/jastrowComplete.json');
const EXISTING_CAL_PATH = path.join(__dirname, '../public/data/cal_aramaic.json');
const OUTPUT_PATH = EXISTING_CAL_PATH;

// Dialect detection patterns
const DIALECT_PATTERNS = {
  JBA: [/\bb\.\s/i, /\bBab\./i, /Bavli/i, /Babylonian/i],
  JPA: [/\bY\.\s/i, /\bYer\./i, /Yerushalmi/i, /Palestinian/i],
  Tg: [/\bTarg\./i, /Targum/i, /\bTg\./i, /Onk\./i, /Jon\./i],
  BA: [/\bDan\./i, /\bEzr\./i, /Biblical Aram/i],
  Syr: [/\bSyr\./i, /Syriac/i, /Peshitta/i],
  CPA: [/Christian Palestinian/i],
  Sam: [/Samaritan/i, /\bSam\./i]
};

// Aramaic detection patterns
const ARAMAIC_INDICATORS = [
  /^ch\./i,                    // "ch." = Chaldee/Aramaic
  /^aram\./i,                  // Aramaic marker
  /\bAram\b/i,                 // Aramaic reference
  /\bChald\./i,                // Chaldee
  /\bTarg\./i,                 // Targum
  /emphatic\s+state/i,         // Aramaic emphatic
  /^[\u05D0-\u05EA]+א$/,       // Ends in א (emphatic state)
  /\bPe[ʿa]l\b/i,             // Aramaic verb stem
  /\bAph[ʿe]l/i,              // Aramaic causative
  /\bIthp[ʿa]/i,              // Aramaic reflexive
  /\bEthp[ʿa]/i               // Aramaic passive
];

// POS detection
function detectPOS(def) {
  if (!def) return null;
  const lower = def.toLowerCase();

  if (/^(ch\.\s+)?m\.?\s/i.test(def)) return 'noun, m.';
  if (/^(ch\.\s+)?f\.?\s/i.test(def)) return 'noun, f.';
  if (/^(ch\.\s+)?n\.?\s/i.test(def)) return 'noun';
  if (/^(ch\.\s+)?v\.?\s/i.test(def)) return 'verb';
  if (/^(ch\.\s+)?adj\.?\s/i.test(def)) return 'adj.';
  if (/^(ch\.\s+)?adv\.?\s/i.test(def)) return 'adv.';
  if (/^(ch\.\s+)?pr\.?\s*n\.?/i.test(def)) return 'proper noun';
  if (/^(ch\.\s+)?prep\.?\s/i.test(def)) return 'prep.';
  if (/^(ch\.\s+)?conj\.?\s/i.test(def)) return 'conj.';
  if (/^(ch\.\s+)?interj\.?\s/i.test(def)) return 'interj.';
  if (/^(ch\.\s+)?part\.?\s/i.test(def)) return 'particle';

  // Verb detection from content
  if (/\bto\s+\w+\b/.test(lower) && /^[א-ת]/.test(def)) return 'verb';

  return null;
}

// Detect Aramaic dialects from definition
function detectDialects(def) {
  const dialects = [];

  for (const [dialect, patterns] of Object.entries(DIALECT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(def)) {
        if (!dialects.includes(dialect)) {
          dialects.push(dialect);
        }
        break;
      }
    }
  }

  return dialects;
}

// Check if entry is Aramaic
function isAramaic(key, def) {
  // Check word form
  const cleanKey = key.replace(/[\u0591-\u05C7]/g, '').trim();

  // Ends in א (emphatic state) - strong indicator
  if (cleanKey.endsWith('א') && cleanKey.length >= 3) {
    return true;
  }

  // Check definition patterns
  for (const pattern of ARAMAIC_INDICATORS) {
    if (pattern.test(def)) {
      return true;
    }
  }

  return false;
}

// Clean definition
function cleanDefinition(def) {
  if (!def) return '';

  return def
    .replace(/^ch\.\s*/i, '')
    .replace(/^m\.\s*/i, '')
    .replace(/^f\.\s*/i, '')
    .replace(/^n\.\s*/i, '')
    .replace(/^v\.\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract Hebrew cognate if mentioned
function extractHebrewCognate(def) {
  const hebrewMatch = def.match(/(?:h\.|Heb\.?|Hebrew)[:\s]+([א-ת]+)/i);
  if (hebrewMatch) {
    return hebrewMatch[1];
  }

  // Also check for "=Hebrew word" patterns
  const eqMatch = def.match(/=\s*([א-ת]+)\s*(?:q\.v\.|which see|ibid)/i);
  if (eqMatch) {
    return eqMatch[1];
  }

  return null;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CAL Aramaic Builder from Jastrow                          ║');
  console.log('║     Extracting ~15,000+ Aramaic entries                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load Jastrow
  if (!fs.existsSync(JASTROW_PATH)) {
    console.error('Jastrow data not found at', JASTROW_PATH);
    process.exit(1);
  }

  console.log('Loading Jastrow dictionary...');
  const jastrow = JSON.parse(fs.readFileSync(JASTROW_PATH, 'utf8'));

  // Load existing CAL entries (preserve good ones)
  let existingCAL = {};
  if (fs.existsSync(EXISTING_CAL_PATH)) {
    const existing = JSON.parse(fs.readFileSync(EXISTING_CAL_PATH, 'utf8'));
    for (const [k, v] of Object.entries(existing)) {
      if (k !== '_meta' && v.definition && !v.definition.includes('<meta name=')) {
        existingCAL[k] = v;
      }
    }
    console.log(`Loaded ${Object.keys(existingCAL).length} valid existing CAL entries`);
  }

  const results = { ...existingCAL };
  let newEntries = 0;
  let totalAramaic = 0;

  // Process Jastrow entries
  const jastrowEntries = Object.entries(jastrow).filter(([k]) => !k.startsWith('_'));
  console.log(`Processing ${jastrowEntries.length} Jastrow entries...\n`);

  for (const [key, entry] of jastrowEntries) {
    const def = entry.definition || entry.def || '';

    if (!isAramaic(key, def)) continue;

    totalAramaic++;
    const cleanKey = key.replace(/[\u0591-\u05C7]/g, '').trim();

    // Skip if we already have a good entry
    if (results[cleanKey] && results[cleanKey].definition?.length > def.length) {
      continue;
    }

    const pos = detectPOS(def);
    const dialects = detectDialects(def);
    const hebrewCognate = extractHebrewCognate(def);

    // If no specific dialects detected, assume general Talmudic Aramaic
    if (dialects.length === 0 && def.toLowerCase().startsWith('ch.')) {
      dialects.push('JBA', 'JPA'); // Jastrow covers both Talmuds
    }

    results[cleanKey] = {
      lemma: entry.lemma || key,
      key: cleanKey,
      pos: pos || 'unknown',
      definition: cleanDefinition(def),
      dialects: dialects.length > 0 ? dialects : ['JBA', 'JPA'],
      source: 'CAL/Jastrow'
    };

    if (hebrewCognate) {
      results[cleanKey].hebrew = hebrewCognate;
    }

    if (entry.forms) {
      results[cleanKey].forms = entry.forms;
    }

    newEntries++;
  }

  // Build output
  const output = {
    _meta: {
      name: 'CAL',
      fullName: 'Comprehensive Aramaic Lexicon (Enhanced)',
      institution: 'Hebrew Union College / Jastrow',
      url: 'https://cal.huc.edu',
      description: 'Aramaic lexicon combining CAL data with Jastrow Aramaic entries',
      entries: Object.keys(results).length,
      dialects: ['JBA', 'JPA', 'Syr', 'CPA', 'Sam', 'Tg', 'BA'],
      sources: ['CAL (Hebrew Union College)', 'Jastrow Dictionary'],
      license: 'Academic use',
      builtAt: new Date().toISOString()
    },
    ...results
  };

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Count dialects
  const dialectCounts = {};
  for (const entry of Object.values(results)) {
    for (const d of (entry.dialects || [])) {
      dialectCounts[d] = (dialectCounts[d] || 0) + 1;
    }
  }

  // Summary
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        SUMMARY                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`Total Aramaic detected in Jastrow: ${totalAramaic}`);
  console.log(`New entries added: ${newEntries}`);
  console.log(`Total CAL entries: ${Object.keys(results).length}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  console.log('\nDialect coverage:');
  for (const [d, count] of Object.entries(dialectCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${count} entries`);
  }
}

main().catch(console.error);
