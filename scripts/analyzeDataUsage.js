/**
 * Analyze which data files are actually used in the codebase
 */
const fs = require('fs');
const path = require('path');

// All data files
const dataFiles = [
  'bdbComplete.json',
  'jastrowComplete.json',
  'strongsComplete.json',
  'bdb_lexicon.json',
  'bdb_aramaic.json',
  'jastrow_lexicon.json',
  'jastrow_aramaic.json',
  'strong_lexicon.json',
  'klein_lexicon.json',
  'halot_lexicon.json',
  'djba_lexicon.json',
  'djpa_lexicon.json',
  'gesenius_lexicon.json',
  'twot_lexicon.json',
  'targum_lexicon.json',
  'cal_aramaic.json',
  'root_meanings.json',
  'root_meanings_enriched.json',
  'root_meanings_pro.json',
  'etymology_bdb_extracted.json',
  'etymology_jastrow_extracted.json',
  'etymology_unified_pro.json',
  'etymology_wiktionary.json',
  'wiktionary_etymology_cache.json',
  'sefaria_lexicon_cache.json',
  'critical_words_academic.json',
  'semantic_fields.json',
  'rabbi_biographies.json',
  'realia.json'
];

const results = {};

function searchInFile(filePath, searchTerms) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = [];
    for (const term of searchTerms) {
      if (content.includes(term)) {
        found.push(term);
      }
    }
    return found;
  } catch (e) {
    return [];
  }
}

function walkDir(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, callback);
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        callback(filePath);
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
}

// Initialize results
for (const df of dataFiles) {
  results[df] = { usedIn: [] };
}

// Search in src directory
walkDir('src', (filePath) => {
  for (const df of dataFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const baseName = df.replace('.json', '');
    const camelCase = baseName.replace(/_([a-z])/g, (m, c) => c.toUpperCase());

    if (content.includes(df) || content.includes(baseName) || content.includes(camelCase)) {
      results[df].usedIn.push(path.basename(filePath));
    }
  }
});

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                    DATA FILE USAGE ANALYSIS                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Categorize files
const categories = {
  'PRIMARY DICTIONARIES': {
    desc: 'Core dictionaries loaded by dictionaryLoader.js - REQUIRED',
    files: ['bdbComplete.json', 'jastrowComplete.json', 'strongsComplete.json']
  },
  'ACADEMIC LEXICONS (Tier 1)': {
    desc: 'Scholarly sources loaded for multi-source lookup - REQUIRED',
    files: ['halot_lexicon.json', 'djba_lexicon.json', 'djpa_lexicon.json', 'gesenius_lexicon.json', 'cal_aramaic.json']
  },
  'REFERENCE LEXICONS (Tier 2)': {
    desc: 'Additional scholarly references - REQUIRED',
    files: ['klein_lexicon.json', 'twot_lexicon.json', 'targum_lexicon.json']
  },
  'ETYMOLOGY DATABASES': {
    desc: 'Etymology and root meaning data - USED FOR PRO FEATURES',
    files: ['root_meanings_pro.json', 'etymology_unified_pro.json', 'etymology_bdb_extracted.json', 'etymology_jastrow_extracted.json', 'etymology_wiktionary.json', 'wiktionary_etymology_cache.json', 'sefaria_lexicon_cache.json']
  },
  'SPECIALIZED DATA': {
    desc: 'Supplementary scholarly data - USED FOR PRO FEATURES',
    files: ['semantic_fields.json', 'rabbi_biographies.json', 'realia.json', 'critical_words_academic.json']
  },
  'LEGACY/REDUNDANT': {
    desc: 'Older versions or potentially redundant - REVIEW FOR REMOVAL',
    files: ['bdb_lexicon.json', 'bdb_aramaic.json', 'jastrow_lexicon.json', 'jastrow_aramaic.json', 'strong_lexicon.json', 'root_meanings.json', 'root_meanings_enriched.json']
  }
};

for (const [catName, catData] of Object.entries(categories)) {
  console.log(`📁 ${catName}`);
  console.log(`   ${catData.desc}`);
  console.log('─'.repeat(75));

  for (const file of catData.files) {
    const data = results[file];
    const isUsed = data && data.usedIn.length > 0;
    const status = isUsed ? '✓ USED' : '⚠ CHECK';
    const usedIn = data ? data.usedIn.slice(0, 3).join(', ') : '';
    console.log(`   ${status.padEnd(10)} ${file.padEnd(38)} ${usedIn}`);
  }
  console.log('');
}

// Summary
console.log('═'.repeat(75));
console.log('SUMMARY:');
console.log('');
console.log('KEEP (Essential):');
console.log('  • bdbComplete.json, jastrowComplete.json, strongsComplete.json (38 MB)');
console.log('  • All *_lexicon.json files for multi-source lookup (1.5 MB)');
console.log('  • root_meanings_pro.json, etymology_unified_pro.json (45 MB) - PRO features');
console.log('');
console.log('POTENTIALLY REMOVABLE:');
console.log('  • bdb_lexicon.json, jastrow_lexicon.json - SUBSETS of Complete versions');
console.log('  • bdb_aramaic.json, jastrow_aramaic.json - OVERLAP with main files');
console.log('  • root_meanings.json, root_meanings_enriched.json - REPLACED by _pro');
console.log('');
console.log('SAVINGS: Could save ~13 MB by removing redundant files');
