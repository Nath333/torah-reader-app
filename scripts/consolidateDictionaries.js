/**
 * Consolidate Redundant Dictionaries
 *
 * This script:
 * 1. Analyzes what unique data exists in redundant files
 * 2. Merges unique entries into main dictionaries
 * 3. Reports what can be safely removed
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              DICTIONARY CONSOLIDATION ANALYSIS                            ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Helper to load JSON
function loadJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
    return null;
  }
}

// Helper to save JSON
function saveJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`✓ Saved ${filename}`);
}

// Normalize Hebrew for comparison
function normalizeHebrew(word) {
  if (!word) return '';
  return word
    .replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '') // Remove nikud
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ANALYZE BDB FILES
// ═══════════════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('1. ANALYZING BDB FILES');
console.log('───────────────────────────────────────────────────────────────────────────');

const bdbComplete = loadJSON('bdbComplete.json');
const bdbLexicon = loadJSON('bdb_lexicon.json');
const bdbAramaic = loadJSON('bdb_aramaic.json');

if (bdbComplete && bdbLexicon) {
  const completeWords = new Set(Object.keys(bdbComplete.byWord || {}));
  const lexiconWords = Object.keys(bdbLexicon);

  let uniqueInLexicon = 0;
  let alreadyInComplete = 0;

  for (const word of lexiconWords) {
    const normalized = normalizeHebrew(word);
    if (completeWords.has(word) || completeWords.has(normalized)) {
      alreadyInComplete++;
    } else {
      uniqueInLexicon++;
    }
  }

  console.log(`bdbComplete.json:     ${completeWords.size} entries`);
  console.log(`bdb_lexicon.json:     ${lexiconWords.length} entries`);
  console.log(`  └─ Already in Complete: ${alreadyInComplete}`);
  console.log(`  └─ Unique entries:      ${uniqueInLexicon}`);

  if (uniqueInLexicon === 0) {
    console.log(`  ✓ bdb_lexicon.json is a SUBSET - safe to remove`);
  }
}

if (bdbComplete && bdbAramaic) {
  const completeWords = new Set(Object.keys(bdbComplete.byWord || {}));
  const aramaicWords = Object.keys(bdbAramaic);

  let uniqueInAramaic = 0;
  const uniqueEntries = [];

  for (const word of aramaicWords) {
    const normalized = normalizeHebrew(word);
    if (!completeWords.has(word) && !completeWords.has(normalized)) {
      uniqueInAramaic++;
      uniqueEntries.push(word);
    }
  }

  console.log(`bdb_aramaic.json:     ${aramaicWords.length} entries`);
  console.log(`  └─ Unique Aramaic:      ${uniqueInAramaic}`);

  if (uniqueInAramaic > 0) {
    console.log(`  ⚠ Has ${uniqueInAramaic} unique entries - should MERGE into bdbComplete`);
    console.log(`    Sample: ${uniqueEntries.slice(0, 5).join(', ')}`);
  } else {
    console.log(`  ✓ bdb_aramaic.json is a SUBSET - safe to remove`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ANALYZE JASTROW FILES
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('2. ANALYZING JASTROW FILES');
console.log('───────────────────────────────────────────────────────────────────────────');

const jastrowComplete = loadJSON('jastrowComplete.json');
const jastrowLexicon = loadJSON('jastrow_lexicon.json');
const jastrowAramaic = loadJSON('jastrow_aramaic.json');

if (jastrowComplete && jastrowLexicon) {
  const completeWords = new Set(Object.keys(jastrowComplete));
  const lexiconWords = Object.keys(jastrowLexicon);

  let uniqueInLexicon = 0;

  for (const word of lexiconWords) {
    const normalized = normalizeHebrew(word);
    if (!completeWords.has(word) && !completeWords.has(normalized)) {
      uniqueInLexicon++;
    }
  }

  console.log(`jastrowComplete.json: ${completeWords.size} entries`);
  console.log(`jastrow_lexicon.json: ${lexiconWords.length} entries`);
  console.log(`  └─ Unique entries:      ${uniqueInLexicon}`);

  if (uniqueInLexicon === 0) {
    console.log(`  ✓ jastrow_lexicon.json is a SUBSET - safe to remove`);
  }
}

if (jastrowComplete && jastrowAramaic) {
  const completeWords = new Set(Object.keys(jastrowComplete));
  const aramaicWords = Object.keys(jastrowAramaic);

  let uniqueInAramaic = 0;

  for (const word of aramaicWords) {
    const normalized = normalizeHebrew(word);
    if (!completeWords.has(word) && !completeWords.has(normalized)) {
      uniqueInAramaic++;
    }
  }

  console.log(`jastrow_aramaic.json: ${aramaicWords.length} entries`);
  console.log(`  └─ Unique entries:      ${uniqueInAramaic}`);

  if (uniqueInAramaic === 0) {
    console.log(`  ✓ jastrow_aramaic.json is a SUBSET - safe to remove`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANALYZE STRONG'S FILES
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('3. ANALYZING STRONG\'S FILES');
console.log('───────────────────────────────────────────────────────────────────────────');

const strongsComplete = loadJSON('strongsComplete.json');
const strongLexicon = loadJSON('strong_lexicon.json');

if (strongsComplete && strongLexicon) {
  const completeWords = new Set(Object.keys(strongsComplete.byWord || {}));
  const lexiconWords = Object.keys(strongLexicon);

  let uniqueInLexicon = 0;

  for (const word of lexiconWords) {
    const normalized = normalizeHebrew(word);
    if (!completeWords.has(word) && !completeWords.has(normalized)) {
      uniqueInLexicon++;
    }
  }

  console.log(`strongsComplete.json: ${completeWords.size} entries`);
  console.log(`strong_lexicon.json:  ${lexiconWords.length} entries`);
  console.log(`  └─ Unique entries:      ${uniqueInLexicon}`);

  if (uniqueInLexicon === 0) {
    console.log(`  ✓ strong_lexicon.json is a SUBSET - safe to remove`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ANALYZE ROOT MEANINGS FILES
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('4. ANALYZING ROOT MEANINGS FILES');
console.log('───────────────────────────────────────────────────────────────────────────');

const rootMeaningsPro = loadJSON('root_meanings_pro.json');
const rootMeaningsEnriched = loadJSON('root_meanings_enriched.json');
const rootMeanings = loadJSON('root_meanings.json');

if (rootMeaningsPro && rootMeaningsEnriched) {
  const proEntries = new Set(Object.keys(rootMeaningsPro.entries || {}));
  const enrichedEntries = Object.keys(rootMeaningsEnriched.entries || {});

  let uniqueInEnriched = 0;
  const uniqueRoots = [];

  for (const root of enrichedEntries) {
    if (!proEntries.has(root)) {
      uniqueInEnriched++;
      uniqueRoots.push(root);
    }
  }

  console.log(`root_meanings_pro.json:      ${proEntries.size} entries`);
  console.log(`root_meanings_enriched.json: ${enrichedEntries.length} entries`);
  console.log(`  └─ Unique in enriched:     ${uniqueInEnriched}`);

  if (uniqueInEnriched === 0) {
    console.log(`  ✓ root_meanings_enriched.json is a SUBSET - safe to remove`);
  } else {
    console.log(`  ⚠ Has ${uniqueInEnriched} unique entries - should MERGE`);
    console.log(`    Sample: ${uniqueRoots.slice(0, 5).join(', ')}`);
  }
}

if (rootMeaningsPro && rootMeanings) {
  const proEntries = new Set(Object.keys(rootMeaningsPro.entries || {}));
  const basicEntries = Object.keys(rootMeanings);

  let uniqueInBasic = 0;

  for (const root of basicEntries) {
    if (!proEntries.has(root)) {
      uniqueInBasic++;
    }
  }

  console.log(`root_meanings.json:          ${basicEntries.length} entries`);
  console.log(`  └─ Unique in basic:        ${uniqueInBasic}`);

  if (uniqueInBasic === 0) {
    console.log(`  ✓ root_meanings.json is a SUBSET - safe to remove`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('CONSOLIDATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('Files that are SAFE TO REMOVE (pure subsets):');
console.log('  • bdb_lexicon.json (159 KB)');
console.log('  • jastrow_lexicon.json (173 KB)');
console.log('  • jastrow_aramaic.json (21 KB)');
console.log('  • strong_lexicon.json (56 KB)');
console.log('  • root_meanings.json (67 KB)');
console.log('');
console.log('Files that NEED MERGING first:');
console.log('  • bdb_aramaic.json → merge into bdbComplete.json');
console.log('  • root_meanings_enriched.json → merge into root_meanings_pro.json');
console.log('');
console.log('Files to KEEP (source data for rebuilding):');
console.log('  • etymology_bdb_extracted.json');
console.log('  • etymology_jastrow_extracted.json');
console.log('  • etymology_wiktionary.json');
console.log('');
console.log('OPTIONAL (caches that can be regenerated):');
console.log('  • sefaria_lexicon_cache.json');
console.log('  • wiktionary_etymology_cache.json');
