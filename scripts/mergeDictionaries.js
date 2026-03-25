/**
 * Merge Redundant Dictionary Data into Main Files
 *
 * This script consolidates:
 * 1. bdb_lexicon.json unique entries → bdbComplete.json
 * 2. bdb_aramaic.json unique entries → bdbComplete.json
 * 3. jastrow_aramaic.json unique entries → jastrowComplete.json
 * 4. root_meanings_enriched.json → root_meanings_pro.json
 * 5. root_meanings.json → root_meanings_pro.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              MERGING DICTIONARIES - STRENGTHENING PRO SCHOLAR            ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Helper functions
function loadJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
    return null;
  }
}

function saveJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
  const size = (fs.statSync(path.join(DATA_DIR, filename)).size / 1024 / 1024).toFixed(1);
  console.log(`  ✓ Saved ${filename} (${size} MB)`);
}

function normalizeHebrew(word) {
  if (!word) return '';
  return word
    .replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '')
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
}

let totalMerged = 0;

// ═══════════════════════════════════════════════════════════════════════════
// 1. MERGE INTO bdbComplete.json
// ═══════════════════════════════════════════════════════════════════════════
console.log('1. MERGING INTO bdbComplete.json');
console.log('───────────────────────────────────────────────────────────────────────────');

const bdbComplete = loadJSON('bdbComplete.json');
const bdbLexicon = loadJSON('bdb_lexicon.json');
const bdbAramaic = loadJSON('bdb_aramaic.json');

if (bdbComplete && bdbComplete.byWord) {
  const existingWords = new Set(Object.keys(bdbComplete.byWord));
  let merged = 0;

  // Merge bdb_lexicon.json
  if (bdbLexicon) {
    for (const [word, entry] of Object.entries(bdbLexicon)) {
      if (!existingWords.has(word) && !existingWords.has(normalizeHebrew(word))) {
        bdbComplete.byWord[word] = {
          ...entry,
          _mergedFrom: 'bdb_lexicon.json'
        };
        merged++;
      }
    }
    console.log(`  • bdb_lexicon.json: merged ${merged} unique entries`);
    totalMerged += merged;
  }

  // Merge bdb_aramaic.json
  merged = 0;
  if (bdbAramaic) {
    for (const [word, entry] of Object.entries(bdbAramaic)) {
      if (!existingWords.has(word) && !existingWords.has(normalizeHebrew(word))) {
        bdbComplete.byWord[word] = {
          ...entry,
          language: 'Aramaic',
          _mergedFrom: 'bdb_aramaic.json'
        };
        merged++;
      }
    }
    console.log(`  • bdb_aramaic.json: merged ${merged} unique entries`);
    totalMerged += merged;
  }

  // Update metadata
  bdbComplete._meta = bdbComplete._meta || {};
  bdbComplete._meta.totalEntries = Object.keys(bdbComplete.byWord).length;
  bdbComplete._meta.lastMerge = new Date().toISOString();
  bdbComplete._meta.mergedSources = ['bdb_lexicon.json', 'bdb_aramaic.json'];

  saveJSON('bdbComplete.json', bdbComplete);
  console.log(`  Total BDB entries: ${bdbComplete._meta.totalEntries}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MERGE INTO jastrowComplete.json
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('2. MERGING INTO jastrowComplete.json');
console.log('───────────────────────────────────────────────────────────────────────────');

const jastrowComplete = loadJSON('jastrowComplete.json');
const jastrowAramaic = loadJSON('jastrow_aramaic.json');

if (jastrowComplete) {
  const existingWords = new Set(Object.keys(jastrowComplete).filter(k => !k.startsWith('_')));
  let merged = 0;

  // Merge jastrow_aramaic.json
  if (jastrowAramaic) {
    for (const [word, entry] of Object.entries(jastrowAramaic)) {
      if (!existingWords.has(word) && !existingWords.has(normalizeHebrew(word))) {
        jastrowComplete[word] = {
          ...entry,
          language: 'Aramaic',
          _mergedFrom: 'jastrow_aramaic.json'
        };
        merged++;
      }
    }
    console.log(`  • jastrow_aramaic.json: merged ${merged} unique entries`);
    totalMerged += merged;
  }

  // Update metadata
  jastrowComplete._meta = jastrowComplete._meta || {};
  jastrowComplete._meta.totalEntries = Object.keys(jastrowComplete).filter(k => !k.startsWith('_')).length;
  jastrowComplete._meta.lastMerge = new Date().toISOString();
  jastrowComplete._meta.mergedSources = ['jastrow_aramaic.json'];

  saveJSON('jastrowComplete.json', jastrowComplete);
  console.log(`  Total Jastrow entries: ${jastrowComplete._meta.totalEntries}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MERGE INTO root_meanings_pro.json
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('3. MERGING INTO root_meanings_pro.json');
console.log('───────────────────────────────────────────────────────────────────────────');

const rootMeaningsPro = loadJSON('root_meanings_pro.json');
const rootMeaningsEnriched = loadJSON('root_meanings_enriched.json');
const rootMeanings = loadJSON('root_meanings.json');

if (rootMeaningsPro && rootMeaningsPro.entries) {
  const existingRoots = new Set(Object.keys(rootMeaningsPro.entries));
  let merged = 0;

  // Merge root_meanings_enriched.json
  if (rootMeaningsEnriched && rootMeaningsEnriched.entries) {
    for (const [root, entry] of Object.entries(rootMeaningsEnriched.entries)) {
      if (!existingRoots.has(root)) {
        rootMeaningsPro.entries[root] = {
          ...entry,
          _mergedFrom: 'root_meanings_enriched.json'
        };
        merged++;
      } else {
        // Merge additional data fields that might be missing
        const existing = rootMeaningsPro.entries[root];
        if (entry.cognates && !existing.cognates) {
          existing.cognates = entry.cognates;
        }
        if (entry.etymology && !existing.etymology) {
          existing.etymology = entry.etymology;
        }
        if (entry.semanticField && !existing.semanticField) {
          existing.semanticField = entry.semanticField;
        }
      }
    }
    console.log(`  • root_meanings_enriched.json: merged ${merged} unique entries`);
    totalMerged += merged;
  }

  // Merge root_meanings.json
  merged = 0;
  if (rootMeanings) {
    for (const [root, entry] of Object.entries(rootMeanings)) {
      if (!existingRoots.has(root)) {
        const newEntry = typeof entry === 'string'
          ? { definition: entry, _mergedFrom: 'root_meanings.json' }
          : { ...entry, _mergedFrom: 'root_meanings.json' };
        rootMeaningsPro.entries[root] = newEntry;
        merged++;
      }
    }
    console.log(`  • root_meanings.json: merged ${merged} unique entries`);
    totalMerged += merged;
  }

  // Update metadata
  rootMeaningsPro._meta = rootMeaningsPro._meta || {};
  rootMeaningsPro._meta.totalEntries = Object.keys(rootMeaningsPro.entries).length;
  rootMeaningsPro._meta.lastMerge = new Date().toISOString();
  rootMeaningsPro._meta.mergedSources = ['root_meanings_enriched.json', 'root_meanings.json'];

  saveJSON('root_meanings_pro.json', rootMeaningsPro);
  console.log(`  Total Root PRO entries: ${rootMeaningsPro._meta.totalEntries}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('MERGE COMPLETE');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`Total entries merged: ${totalMerged}`);
console.log('');
console.log('Main dictionaries are now STRONGER with all unique data consolidated!');
console.log('');
console.log('Next steps:');
console.log('  1. Run tests to verify lookups still work');
console.log('  2. Update code to remove dependencies on redundant files');
console.log('  3. Delete redundant files to save ~36 MB');
