/**
 * V3 Analysis Script - Deep analysis for enrichment
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '../public/data');

const klein = JSON.parse(fs.readFileSync(path.join(DATA, 'klein_lexicon.json'), 'utf8'));
const jastrow = JSON.parse(fs.readFileSync(path.join(DATA, 'jastrowComplete.json'), 'utf8'));
const bdb = JSON.parse(fs.readFileSync(path.join(DATA, 'bdbComplete.json'), 'utf8'));
const strongs = JSON.parse(fs.readFileSync(path.join(DATA, 'strongsComplete.json'), 'utf8'));
const cal = JSON.parse(fs.readFileSync(path.join(DATA, 'cal_aramaic.json'), 'utf8'));
const gesenius = JSON.parse(fs.readFileSync(path.join(DATA, 'gesenius_lexicon.json'), 'utf8'));

const jEntries = jastrow.byWord || jastrow;
const bdbEntries = bdb.byWord || bdb;
const strongsByWord = strongs.byWord || {};
const gEntries = gesenius.byWord || gesenius;

console.log('═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS 4: Klein Semantic Fields to Propagate');
console.log('═══════════════════════════════════════════════════════════════');

// Count semantic fields by category
const semanticCounts = {};
const wordToSemantic = {};
for (const [k,v] of Object.entries(klein)) {
  if (k.startsWith('_')) continue;
  if (v.semanticField) {
    semanticCounts[v.semanticField] = (semanticCounts[v.semanticField] || 0) + 1;
    wordToSemantic[k] = v.semanticField;
  }
}

console.log('Klein semantic field distribution:');
const sorted = Object.entries(semanticCounts).sort((a,b) => b[1] - a[1]);
for (const [field, count] of sorted.slice(0,15)) {
  console.log('  ' + field.padEnd(20) + ': ' + count);
}

// Check overlap with Jastrow
let canPropagate = 0;
for (const [k,v] of Object.entries(jEntries)) {
  if (k.startsWith('_')) continue;
  if (!v.semanticField && wordToSemantic[k]) {
    canPropagate++;
  }
}
console.log('\nJastrow entries that can get semantic from Klein:', canPropagate);

// Check overlap with CAL
let calCanGetSem = 0;
for (const [k,v] of Object.entries(cal)) {
  if (k.startsWith('_')) continue;
  if (!v.semanticField && wordToSemantic[k]) {
    calCanGetSem++;
  }
}
console.log('CAL entries that can get semantic from Klein:', calCanGetSem);

// Check overlap with Gesenius
let gesCanGetSem = 0;
for (const [k,v] of Object.entries(gEntries)) {
  if (k.startsWith('_')) continue;
  if (!v.semanticField && wordToSemantic[k]) {
    gesCanGetSem++;
  }
}
console.log('Gesenius entries that can get semantic from Klein:', gesCanGetSem);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS 5: Root-based Strong\'s Propagation Potential');
console.log('═══════════════════════════════════════════════════════════════');

// Build root -> Strong's mapping (use first Strong's found for each root)
const rootToStrong = {};
for (const [k,v] of Object.entries(bdbEntries)) {
  if (k.startsWith('_')) continue;
  const snum = v.strongs || v.strong;
  const root = v.root;
  if (root && snum && !rootToStrong[root]) {
    rootToStrong[root] = snum;
  }
}

for (const [k,v] of Object.entries(strongsByWord)) {
  if (k.startsWith('_')) continue;
  const snum = v.strongs || v.strong;
  const root = v.root;
  if (root && snum && !rootToStrong[root]) {
    rootToStrong[root] = snum;
  }
}

for (const [k,v] of Object.entries(klein)) {
  if (k.startsWith('_')) continue;
  const snum = v.strongs || v.strong || v.strongNumber;
  const root = v.root;
  if (root && snum && !rootToStrong[root]) {
    rootToStrong[root] = snum;
  }
}

console.log('Roots with Strong\'s numbers:', Object.keys(rootToStrong).length);

// Check Jastrow
let jastrowCanGet = 0;
for (const [k,v] of Object.entries(jEntries)) {
  if (k.startsWith('_')) continue;
  if (!v.strongs && !v.strong) {
    const root = v.root;
    if (root && rootToStrong[root]) {
      jastrowCanGet++;
    }
  }
}
console.log('Jastrow entries that can get Strong\'s via root:', jastrowCanGet);

let calCanGet = 0;
for (const [k,v] of Object.entries(cal)) {
  if (k.startsWith('_')) continue;
  if (!v.strongs && !v.strong) {
    const root = v.root;
    if (root && rootToStrong[root]) {
      calCanGet++;
    }
  }
}
console.log('CAL entries that can get Strong\'s via root:', calCanGet);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS 6: BDB fullDef Cognate Extraction Potential');
console.log('═══════════════════════════════════════════════════════════════');

// Languages to look for
const LANG_PATTERNS = {
  'Phoenician': /Phoenician\s+([א-תa-zA-Z]+)/g,
  'Assyrian': /Assyrian\s+([א-תa-zA-Z]+)/g,
  'Arabic': /Arabic\s+([א-תa-zA-Z]+)/g,
  'Aramaic': /Aramaic\s+([א-תa-zA-Z]{2,})/g,
  'Ethiopic': /Ethiopic\s+([א-תa-zA-Z]+)/g,
  'Sabean': /Sabean\s+([א-תa-zA-Z]+)/g,
  'Moabite': /Moabite\s+([א-תa-zA-Z]+)/g,
  'Syriac': /Syriac\s+([א-תa-zA-Z]+)/g,
  'Akkadian': /Akkadian\s+([א-תa-zA-Z]+)/g,
  'Ugaritic': /Ugaritic\s+([א-תa-zA-Z]+)/g,
  'Egyptian': /Egyptian\s+([א-תa-zA-Z]+)/g,
  'Persian': /Persian\s+([א-תa-zA-Z]+)/g,
  'Greek': /Greek\s+([α-ωa-zA-Z]+)/g,
  'Latin': /Latin\s+([a-zA-Z]+)/g,
};

let extractable = 0;
let sampleExtractions = [];

for (const [k,v] of Object.entries(bdbEntries)) {
  if (k.startsWith('_') || !v.fullDef) continue;

  let foundCognates = [];
  for (const [lang, pattern] of Object.entries(LANG_PATTERNS)) {
    const matches = v.fullDef.matchAll(new RegExp(pattern.source, 'g'));
    for (const m of matches) {
      if (m[1] && m[1].length >= 2 && !/^[A-Z]/.test(m[1])) {
        foundCognates.push(`${lang}: ${m[1]}`);
      }
    }
  }

  if (foundCognates.length > 0) {
    extractable++;
    if (sampleExtractions.length < 8) {
      sampleExtractions.push({ word: k, cognates: foundCognates.slice(0, 4) });
    }
  }
}

console.log('BDB entries with extractable cognates:', extractable);
console.log('\nSample extractions:');
for (const s of sampleExtractions) {
  console.log('  ' + s.word + ':');
  for (const c of s.cognates) {
    console.log('    → ' + c);
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SUMMARY: V3 ENRICHMENT POTENTIAL');
console.log('═══════════════════════════════════════════════════════════════');
console.log('1. BDB cognate extraction from fullDef:    ' + extractable + ' entries');
console.log('2. Jastrow Strong\'s via root:             ' + jastrowCanGet + ' entries');
console.log('3. CAL Strong\'s via root:                 ' + calCanGet + ' entries');
console.log('4. Jastrow semantic from Klein:           ' + canPropagate + ' entries');
console.log('5. CAL semantic from Klein:               ' + calCanGetSem + ' entries');
console.log('6. Gesenius semantic from Klein:          ' + gesCanGetSem + ' entries');
