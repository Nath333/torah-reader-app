/**
 * Dictionary Analysis Script
 * Analyzes how different dictionaries handle word forms, morphology, and root extraction
 *
 * Usage: node scripts/analyzeDictionaries.js [word]
 * Example: node scripts/analyzeDictionaries.js יְצִיאוֹת
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function stripAllDiacritics(str) {
  return str.replace(/[\u05B0-\u05BD\u05BF-\u05C7]/g, '');
}

function normalizeFinals(str) {
  return str
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');
}

/**
 * PRO SCHOLAR V13: Restore final letter forms after suffix stripping
 * כהנ → כהן, מלכ → מלך (opposite of normalizeFinals)
 */
function restoreFinalLetter(str) {
  if (!str || str.length === 0) return str;
  const lastChar = str[str.length - 1];
  const finalForms = {
    'כ': 'ך',
    'מ': 'ם',
    'נ': 'ן',
    'פ': 'ף',
    'צ': 'ץ'
  };
  if (finalForms[lastChar]) {
    return str.slice(0, -1) + finalForms[lastChar];
  }
  return str;
}

/**
 * Common Hebrew prefixes (order matters: longer first)
 */
const HEBREW_PREFIXES = ['וה', 'וב', 'וכ', 'ול', 'ומ', 'וש', 'הב', 'הכ', 'הל', 'המ', 'מה', 'שה', 'ב', 'כ', 'ל', 'מ', 'ה', 'ו', 'ש'];

/**
 * Generate morphological variants for a word
 * PRO SCHOLAR V13: Now includes prefix stripping and final letter restoration
 * @param {string} word - Hebrew word
 * @returns {Array} Array of {form, desc} objects
 */
function generateVariants(word) {
  const stripped = stripAllDiacritics(word);
  const normalized = normalizeFinals(stripped);

  const variants = [
    { form: word, desc: 'Original (with nikud)' },
    { form: stripped, desc: 'Stripped diacritics' },
  ];

  if (normalized !== stripped) {
    variants.push({ form: normalized, desc: 'Normalized finals' });
  }

  // Plural → singular transformations (with final letter restoration)
  if (stripped.endsWith('ות') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    variants.push({ form: stem + 'ה', desc: 'Fem. singular (ות→ה)' });
    variants.push({ form: restoreFinalLetter(stem), desc: 'Stem with final' });
  }
  if (stripped.endsWith('ים') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    variants.push({ form: restoreFinalLetter(stem), desc: 'Masc. singular (ים→final)' }); // כהנים → כהן
    variants.push({ form: stem, desc: 'Masc. singular raw' }); // Also try without
  }
  if (stripped.endsWith('ין') && stripped.length > 3) {
    const stem = stripped.slice(0, -2);
    variants.push({ form: restoreFinalLetter(stem), desc: 'Aramaic plural (ין→final)' });
    variants.push({ form: stem + 'א', desc: 'Aramaic emphatic (ין→א)' });
  }
  if (stripped.endsWith('ן') && stripped.length > 3) {
    variants.push({ form: stripped.slice(0, -1), desc: 'Remove final nun' });
  }

  // PRO SCHOLAR V13: Prefix stripping (בפנים → פנים, הגדול → גדול)
  for (const prefix of HEBREW_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      if (!variants.some(v => v.form === withoutPrefix)) {
        variants.push({ form: withoutPrefix, desc: `Prefix stripped (${prefix}-)` });
        // Also try plural→singular on the prefix-stripped form
        if (withoutPrefix.endsWith('ים') && withoutPrefix.length > 3) {
          const stem = withoutPrefix.slice(0, -2);
          variants.push({ form: restoreFinalLetter(stem), desc: `Prefix (${prefix}-) + singular` }); // הכהנים → כהן
        }
        if (withoutPrefix.endsWith('ות') && withoutPrefix.length > 3) {
          const stem = withoutPrefix.slice(0, -2);
          variants.push({ form: stem + 'ה', desc: `Prefix (${prefix}-) + fem. singular` });
        }
      }
    }
  }

  return variants;
}

/**
 * Extract possible 3-letter roots from a word
 * @param {string} word - Hebrew word (stripped of diacritics)
 * @returns {Array} Array of {root, reason} objects
 */
function extractPossibleRoots(word) {
  const stripped = stripAllDiacritics(word);
  const roots = [];

  // Remove common suffixes first
  let stem = stripped;
  if (stem.endsWith('ות')) stem = stem.slice(0, -2);
  else if (stem.endsWith('ים')) stem = stem.slice(0, -2);
  else if (stem.endsWith('ין')) stem = stem.slice(0, -2);
  else if (stem.endsWith('ה')) stem = stem.slice(0, -1);
  else if (stem.endsWith('ת')) stem = stem.slice(0, -1);

  // Direct 3-letter root
  if (stem.length === 3) {
    roots.push({ root: stem, reason: 'Direct 3-letter stem' });
  }

  // Remove prefix letters (common: י, ת, מ, ה, נ, א)
  const prefixes = ['י', 'ת', 'מ', 'ה', 'נ', 'א'];
  if (stem.length === 4 && prefixes.includes(stem[0])) {
    roots.push({ root: stem.slice(1), reason: `Remove prefix: ${stem[0]}` });
  }

  // Hollow verbs (ע"ו/ע"י): middle letter is weak (ו or י)
  // יציא → יצא (remove weak middle letter)
  if (stem.length === 4 && (stem[1] === 'י' || stem[1] === 'ו')) {
    const hollowRoot = stem[0] + stem[2] + stem[3];
    roots.push({ root: hollowRoot, reason: `Hollow verb (ע"ו/ע"י): ${stem[1]} is weak` });
  }

  // Geminate verbs (ע"ע): last two letters are the same
  // סב → סבב
  if (stem.length === 2) {
    roots.push({ root: stem + stem[1], reason: 'Geminate verb (ע"ע): doubled last radical' });
  }

  // פ"נ verbs: initial nun assimilates
  // If word starts with נ but 3-letter form doesn't exist, try without
  if (stem.length === 3 && stem[0] === 'נ') {
    // Keep the נ but also note this
    roots.push({ root: stem, reason: 'פ"נ verb (initial נ)' });
  }

  return roots;
}

/**
 * Load a dictionary file
 */
function loadDictionary(filename) {
  const filepath = path.join(__dirname, '..', 'public', 'data', filename);
  try {
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data;
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
    return null;
  }
}

/**
 * Search a dictionary for all variants and roots
 */
function searchDictionary(dict, variants, roots, dictName) {
  const results = {
    name: dictName,
    found: [],
    notFound: [],
    related: []
  };

  // Get the word lookup object
  const lookup = dict.byWord || dict;

  // Test variants
  for (const v of variants) {
    const entry = lookup[v.form];
    if (entry) {
      results.found.push({
        form: v.form,
        desc: v.desc,
        definition: (entry.definition || entry.english || entry.kjv_def || entry.strongs_def || '').substring(0, 80)
      });
    } else {
      results.notFound.push({ form: v.form, desc: v.desc });
    }
  }

  // Test roots
  for (const r of roots) {
    const entry = lookup[r.root];
    if (entry && !results.found.some(f => f.form === r.root)) {
      results.found.push({
        form: r.root,
        desc: `Root: ${r.reason}`,
        definition: (entry.definition || entry.english || entry.kjv_def || entry.strongs_def || '').substring(0, 80)
      });
    }
  }

  return results;
}

/**
 * Find related entries in a dictionary
 */
function findRelatedEntries(dict, searchTerm, maxResults = 10) {
  const lookup = dict.byWord || dict;
  const stripped = stripAllDiacritics(searchTerm);

  return Object.keys(lookup)
    .filter(k => {
      const keyStripped = stripAllDiacritics(k);
      return keyStripped.includes(stripped) || stripped.includes(keyStripped);
    })
    .slice(0, maxResults)
    .map(k => {
      const entry = lookup[k];
      return {
        key: k,
        definition: (entry.definition || entry.english || entry.kjv_def || '').substring(0, 50)
      };
    });
}

// =============================================================================
// MAIN ANALYSIS
// =============================================================================

const testWord = process.argv[2] || 'יְצִיאוֹת';
const stripped = stripAllDiacritics(testWord);

console.log('='.repeat(70));
console.log('DICTIONARY ANALYSIS: How Each Source Handles Word Forms');
console.log('='.repeat(70));
console.log('Test word:', testWord);
console.log('Stripped:', stripped);
console.log('');

// Generate variants and roots
const variants = generateVariants(testWord);
const roots = extractPossibleRoots(testWord);

console.log('Morphological variants to test:');
variants.forEach((v, i) => console.log(`  ${i+1}. ${v.form} (${v.desc})`));
console.log('');

console.log('Possible roots:');
roots.forEach((r, i) => console.log(`  ${i+1}. ${r.root} - ${r.reason}`));
console.log('');

// =============================================================================
// TEST EACH DICTIONARY
// =============================================================================

const dictionaries = [
  { name: 'Jastrow', file: 'jastrowComplete.json', type: 'Aramaic/Rabbinic' },
  { name: 'BDB', file: 'bdbComplete.json', type: 'Biblical Hebrew' },
  { name: "Strong's", file: 'strongsComplete.json', type: 'Concordance' },
  { name: 'Klein', file: 'klein_lexicon.json', type: 'Etymology' },
  { name: 'CAL Aramaic', file: 'cal_aramaic.json', type: 'Comprehensive Aramaic' },
  { name: 'DJBA', file: 'djba_lexicon.json', type: 'Jewish Babylonian Aramaic' },
];

const allResults = [];

for (const d of dictionaries) {
  console.log('─'.repeat(70));
  console.log(`${d.name} (${d.type})`);
  console.log('─'.repeat(70));

  const dict = loadDictionary(d.file);
  if (!dict) {
    console.log('  [Dictionary not available]');
    console.log('');
    continue;
  }

  const lookup = dict.byWord || dict;
  console.log('Total entries:', Object.keys(lookup).length);

  const results = searchDictionary(dict, variants, roots, d.name);
  allResults.push(results);

  console.log('');
  console.log('Search results:');
  if (results.found.length > 0) {
    results.found.forEach(f => {
      console.log(`  ✓ ${f.form} (${f.desc})`);
      console.log(`    → ${f.definition}...`);
    });
  } else {
    console.log('  ✗ No matches found with any variant');
  }

  // Find related entries
  const related = findRelatedEntries(dict, stripped.slice(0, 3));
  if (related.length > 0) {
    console.log('');
    console.log('Related entries (sharing root letters):');
    related.slice(0, 5).forEach(r => {
      console.log(`  • ${r.key} → ${r.definition}...`);
    });
  }

  console.log('');
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('='.repeat(70));
console.log('ANALYSIS SUMMARY');
console.log('='.repeat(70));
console.log('');

for (const result of allResults) {
  if (result.found.length > 0) {
    const bestMatch = result.found[0];
    console.log(`✓ ${result.name}: Found via "${bestMatch.form}" (${bestMatch.desc})`);
  } else {
    console.log(`✗ ${result.name}: No match found`);
  }
}

console.log('');
console.log('─'.repeat(70));
console.log('KEY INSIGHTS');
console.log('─'.repeat(70));
console.log('');

// Analyze the word structure
const isPlural = stripped.endsWith('ות') || stripped.endsWith('ים') || stripped.endsWith('ין');
const isFeminine = stripped.endsWith('ה') || stripped.endsWith('ת') || stripped.endsWith('ות');

console.log('Word Structure Analysis:');
console.log(`  • Is plural: ${isPlural ? 'Yes' : 'No'}`);
console.log(`  • Is feminine: ${isFeminine ? 'Yes' : 'No'}`);
console.log('');

if (roots.length > 0) {
  console.log('Root Analysis:');
  roots.forEach(r => {
    console.log(`  • ${r.root}: ${r.reason}`);
  });
  console.log('');
}

console.log('Optimization Recommendations:');
console.log('  1. Always strip diacritics before lookup');
console.log('  2. For plurals (ות/ים/ין), generate singular forms');
console.log('  3. For nouns, try extracting the verbal root');
console.log('  4. For hollow verbs (ע"ו/ע"י), try removing the weak middle letter');
console.log('  5. Cache successful variant → dictionary matches for faster future lookups');
