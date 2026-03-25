/**
 * Test the root extraction logic for יציאות
 */

// Check if the rootExtraction module returns anything
async function testRootExtractionModule() {
  console.log('\n=== Testing rootExtraction module ===');
  try {
    // Dynamic import won't work here since we're running in Node without bundler
    // Let's test the fallback logic directly instead
    console.log('Note: rootExtraction module requires bundler, testing fallback logic only');
  } catch (e) {
    console.log('rootExtraction module error:', e.message);
  }
}

// Normalize final letters (כ→ך, מ→ם, נ→ן, פ→ף, צ→ץ)
function normalizeFinalLetter(word) {
  if (!word || word.length === 0) return word;
  const lastChar = word[word.length - 1];
  const finalForms = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  if (finalForms[lastChar]) {
    return word.slice(0, -1) + finalForms[lastChar];
  }
  return word;
}

// Simulate the UPDATED root extraction logic from dictionaryLoader.js
function extractRoot(word) {
  let stem = word;
  let strippedPrefix = null;
  let strippedSuffix = null;
  let extractedRoot = null;
  let alternativeRoots = [];

  const commonWords = ['שבת', 'תורה', 'משנה', 'גמרא', 'ברכה', 'תפלה', 'מצוה', 'עולם', 'ישראל', 'אדם'];
  if (commonWords.includes(word)) {
    return { root: word, note: 'common-word', stem, strippedPrefix, strippedSuffix };
  }

  // PRO SCHOLAR V12: Smart prefix detection
  let skipPrefixStrip = false;

  // Check if this looks like a hollow verb (X-ו-X-X + optional suffix)
  if (word.length >= 4) {
    let tempStem = word;
    const suffixes = ['ים', 'ות', 'ין'];
    for (const suf of suffixes) {
      if (tempStem.endsWith(suf)) {
        tempStem = tempStem.slice(0, -suf.length);
        break;
      }
    }
    // If 4-letter stem with ו at position 1 = hollow verb participle
    if (tempStem.length === 4 && tempStem[1] === 'ו') {
      skipPrefixStrip = true;
    }
    // If 3-letter stem after suffix, first letter is likely part of root
    if (tempStem.length === 3 && !['ה', 'ו', 'ב', 'כ', 'ל'].includes(tempStem[0])) {
      skipPrefixStrip = true;
    }
  }

  // Strip prefixes only if safe
  if (!skipPrefixStrip) {
    const prefixes = ['וה', 'בה', 'לה', 'מה', 'שה', 'וב', 'ול', 'ומ', 'וכ', 'ה', 'ו', 'ב', 'כ', 'ל', 'מ', 'ש'];
    for (const pre of prefixes) {
      if (stem.startsWith(pre) && stem.length > pre.length + 2) {
        strippedPrefix = pre;
        stem = stem.slice(pre.length);
        break;
      }
    }
  }

  // INFINITIVE PATTERN: לכתוב, לראות, לעשות → כתב, ראה, עשה
  if (strippedPrefix === 'ל' && stem.length >= 4) {
    // Check for infinitive ending in ות (לראות → ראה) - LAMED-HE verbs
    if (stem.endsWith('ות')) {
      extractedRoot = stem.slice(0, -2) + 'ה';
      return { root: extractedRoot, note: 'infinitive-lamed-he', stem, strippedPrefix, strippedSuffix };
    }
    // Check for infinitive with ו before last letter (לכתוב → כתב)
    if (stem.length >= 4 && stem[stem.length - 2] === 'ו') {
      extractedRoot = stem.slice(0, -2) + stem.slice(-1);
      return { root: extractedRoot, note: 'infinitive-regular', stem, strippedPrefix, strippedSuffix };
    }
  }

  // Strip suffixes
  const suffixes = ['ות', 'ים', 'ין', 'ה', 'ת', 'ן', 'נו', 'כם', 'הם', 'הן'];
  for (const suf of suffixes) {
    if (stem.endsWith(suf) && stem.length > suf.length + 1) {
      strippedSuffix = suf;
      stem = stem.slice(0, -suf.length);
      break;
    }
  }

  // Extract root based on stem length
  if (stem.length === 4 && stem[2] === 'י') {
    // ACTION NOUN: יציא → יצא (positions 0,1,3)
    extractedRoot = stem[0] + stem[1] + stem[3];
    return { root: extractedRoot, note: 'action-noun', stem, strippedPrefix, strippedSuffix };
  }
  if (stem.length === 4 && stem[1] === 'ו') {
    // HOLLOW VERB: שומר → שמר
    extractedRoot = stem[0] + stem[2] + stem[3];
    alternativeRoots.push({ root: stem.slice(0, 3), confidence: 60, note: 'first-3' });
    return { root: extractedRoot, note: 'hollow-verb', stem, strippedPrefix, strippedSuffix, alternativeRoots };
  }
  if (stem.length === 4) {
    // First 3 letters
    extractedRoot = stem.slice(0, 3);
    alternativeRoots.push({ root: stem.slice(1), confidence: 50, note: 'last-3' });
    return { root: extractedRoot, note: 'first-3', stem, strippedPrefix, strippedSuffix, alternativeRoots };
  }
  if (stem.length === 3) {
    extractedRoot = normalizeFinalLetter(stem);
    return { root: extractedRoot, note: 'direct-3-letter', stem, strippedPrefix, strippedSuffix };
  }
  if (stem.length === 2) {
    // LAMED-HE
    extractedRoot = stem + 'ה';
    alternativeRoots.push({ root: stem + 'א', confidence: 60, note: 'LAMED-ALEPH' });
    alternativeRoots.push({ root: stem + 'י', confidence: 50, note: 'LAMED-YOD' });
    return { root: extractedRoot, note: 'lamed-he', stem, strippedPrefix, strippedSuffix, alternativeRoots };
  }

  return { root: stem, note: 'fallback', stem, strippedPrefix, strippedSuffix };
}

// Test cases
const testCases = [
  { word: 'יציאות', expected: 'יצא' },
  { word: 'בפנים', expected: 'פנה' },
  { word: 'לכתוב', expected: 'כתב' },
  { word: 'לראות', expected: 'ראה' },
  { word: 'שבת', expected: 'שבת' },
  { word: 'שומרים', expected: 'שמר' },
  { word: 'מלכים', expected: 'מלך' },
  { word: 'הולך', expected: 'הלך' }
];

console.log('Root Extraction Test:');
console.log('='.repeat(60));
for (const tc of testCases) {
  const result = extractRoot(tc.word);
  const status = result.root === tc.expected ? '✅' : '❌';
  console.log(`${status} "${tc.word}" → "${result.root}" (${result.note})`);
  console.log(`   stem: "${result.stem}", prefix: ${result.strippedPrefix || 'none'}, suffix: ${result.strippedSuffix || 'none'}`);
  if (result.root !== tc.expected) {
    console.log(`   Expected: "${tc.expected}"`);
  }
}
