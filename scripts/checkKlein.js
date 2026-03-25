const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/klein_lexicon.json', 'utf8'));

// Check structure
console.log('Top-level keys:', Object.keys(data).slice(0, 10));

// Count entries (filter out metadata)
const allKeys = Object.keys(data);
const hebrewKeys = allKeys.filter(k => /[א-ת]/.test(k));
const metaKeys = allKeys.filter(k => k.startsWith('_'));

console.log('\nKlein Lexicon Analysis:');
console.log('  Total keys:', allKeys.length);
console.log('  Hebrew word keys:', hebrewKeys.length);
console.log('  Metadata keys:', metaKeys.length);

// Check if nested under 'entries' or 'byWord'
if (data.entries) {
  const entryKeys = Object.keys(data.entries).filter(k => /[א-ת]/.test(k));
  console.log('  Nested entries:', entryKeys.length);
}
if (data.byWord) {
  const wordKeys = Object.keys(data.byWord).filter(k => /[א-ת]/.test(k));
  console.log('  Nested byWord:', wordKeys.length);
}

// Sample entries
console.log('\nSample entries:');
const samples = hebrewKeys.slice(0, 5);
for (const k of samples) {
  const e = data[k];
  console.log(`  ${k}: ${e?.definition?.substring(0, 50) || e?.gloss || JSON.stringify(e).substring(0, 50)}...`);
}

// Check file size
const stats = fs.statSync('public/data/klein_lexicon.json');
console.log('\nFile size:', (stats.size / 1024).toFixed(2), 'KB');
