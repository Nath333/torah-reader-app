const fs = require('fs');

console.log('WIKTIONARY DATA LOCATIONS');
console.log('=========================\n');

// Check wiktionary_etymology_cache.json
const cachePath = 'public/data/wiktionary_etymology_cache.json';
if (fs.existsSync(cachePath)) {
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const entries = cache.entries || cache;
  const keys = Object.keys(entries).filter(k => !k.startsWith('_'));
  console.log('1. wiktionary_etymology_cache.json');
  console.log('   Entries:', keys.length);
  console.log('   Size:', (fs.statSync(cachePath).size / 1024).toFixed(1), 'KB');

  // Sample
  const sample = keys.slice(0, 3);
  console.log('   Samples:');
  for (const k of sample) {
    const e = entries[k];
    console.log('     ', k, '- Proto:', e?.protoSemitic || 'none');
  }
}

// Check etymology_wiktionary.json
const etymPath = 'public/data/etymology_wiktionary.json';
if (fs.existsSync(etymPath)) {
  const etym = JSON.parse(fs.readFileSync(etymPath, 'utf8'));
  const entries = etym.entries || etym;
  const keys = Object.keys(entries).filter(k => !k.startsWith('_'));
  console.log('\n2. etymology_wiktionary.json');
  console.log('   Entries:', keys.length);
  console.log('   Size:', (fs.statSync(etymPath).size / 1024).toFixed(1), 'KB');

  // Count Proto-Semitic
  let protoCount = 0;
  for (const k of keys) {
    if (entries[k] && entries[k].protoSemitic) protoCount++;
  }
  console.log('   With Proto-Semitic:', protoCount);
}

console.log('\n=========================');
console.log('WHERE USED:');
console.log('  File: scripts/fetchGeseniusLexicon.js');
console.log('  Function: enrichWithProtoSemitic()');
console.log('  Purpose: Adds protoSemitic field to dictionary entries');
console.log('  Currently adds to: ~207 entries in Gesenius');
