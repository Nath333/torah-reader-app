/**
 * Analyze All Lexicons - Current State vs Expected
 */
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║              LEXICON ANALYSIS - CURRENT vs EXPECTED                        ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

const lexicons = [
  // Primary dictionaries
  { name: 'BDB', file: 'bdbComplete.json', key: 'byWord', expected: 8000, note: 'Public domain - primary Hebrew' },
  { name: 'Jastrow', file: 'jastrowComplete.json', key: null, expected: 30000, note: 'Public domain - Aramaic/Hebrew' },
  { name: "Strong's", file: 'strongsComplete.json', key: 'byWord', expected: 8674, note: 'Public domain - concordance' },

  // Academic lexicons
  { name: 'HALOT', file: 'halot_lexicon.json', key: null, expected: 5000, note: 'Copyrighted - 5 volumes' },
  { name: 'DJBA', file: 'djba_lexicon.json', key: null, expected: 3000, note: 'Copyrighted - Sokoloff' },
  { name: 'Gesenius', file: 'gesenius_lexicon.json', key: null, expected: 8000, note: 'Public domain (1910)' },
  { name: 'TWOT', file: 'twot_lexicon.json', key: null, expected: 2300, note: 'Copyrighted - theological' },
  { name: 'Klein', file: 'klein_lexicon.json', key: null, expected: 8000, note: 'Copyrighted - etymology' },
  { name: 'CAL', file: 'cal_aramaic.json', key: null, expected: 30000, note: 'Free database at cal.huc.edu' },

  // Root/Etymology
  { name: 'Root PRO', file: 'root_meanings_pro.json', key: 'entries', expected: 25000, note: 'Comprehensive root data' },
  { name: 'Etymology', file: 'etymology_unified_pro.json', key: null, expected: 30000, note: 'Unified etymology' },
];

let totalCurrent = 0;
let totalExpected = 0;

console.log('LEXICON           CURRENT   EXPECTED   %FULL    STATUS');
console.log('─'.repeat(70));

for (const lex of lexicons) {
  try {
    const data = JSON.parse(fs.readFileSync('public/data/' + lex.file, 'utf8'));
    const entries = lex.key ? data[lex.key] : data;
    const count = Object.keys(entries).filter(k => !k.startsWith('_')).length;
    const percent = Math.round((count / lex.expected) * 100);

    totalCurrent += count;
    totalExpected += lex.expected;

    let status = '⚠️ NEEDS WORK';
    if (percent >= 80) status = '✅ GOOD';
    else if (percent >= 50) status = '🔶 PARTIAL';
    else if (percent >= 20) status = '🔸 LIMITED';
    else status = '❌ STUB';

    console.log(
      lex.name.padEnd(16) +
      count.toString().padStart(8) +
      lex.expected.toString().padStart(10) +
      (percent + '%').padStart(8) +
      '    ' + status
    );
  } catch (e) {
    console.log(lex.name.padEnd(16) + '   ERROR: ' + e.message.substring(0, 30));
  }
}

console.log('─'.repeat(70));
console.log('TOTAL'.padEnd(16) + totalCurrent.toString().padStart(8) + totalExpected.toString().padStart(10) +
  (Math.round((totalCurrent / totalExpected) * 100) + '%').padStart(8));

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('EXPANSION OPPORTUNITIES:');
console.log('─────────────────────────────────────────────────────────────────────────────');
console.log('');
console.log('🟢 CAN EXPAND (Public Domain / Free Access):');
console.log('   • Gesenius (1910) - Public domain, can fetch more from Sefaria');
console.log('   • CAL Aramaic - Free at cal.huc.edu, can fetch via web scraping');
console.log('   • BDB - Public domain, already comprehensive');
console.log('   • Jastrow - Public domain, excellent coverage');
console.log("   • Strong's - Public domain, nearly complete");
console.log('');
console.log('🔴 CANNOT EXPAND (Copyrighted):');
console.log('   • HALOT - Modern Brill publication, copyrighted');
console.log('   • DJBA - Sokoloff, copyrighted by Johns Hopkins');
console.log('   • TWOT - Moody Press, copyrighted');
console.log('   • Klein - Copyrighted etymology dictionary');
console.log('');
console.log('💡 RECOMMENDATION:');
console.log('   Focus on expanding Gesenius and CAL from free sources.');
console.log('   Mark HALOT/DJBA/TWOT/Klein as "curated excerpts" in metadata.');
