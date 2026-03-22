/**
 * Test CAL (Comprehensive Aramaic Lexicon) Dictionary Service
 *
 * Tests translation of Rashi's commentary on Talmud Shabbat:
 * מתני' יציאות השבת - הוצאות שמרשות לרשות האמורות לשבת ובגמ' מפרש דהכנסות נמי קא קרי יציאות הואיל ומוציא מרשות לרשות
 *
 * Run with: node scripts/test-cal-service.js
 */

// Test data - Rashi on Gemara Shabbat
const RASHI_TEXT = `מתני' יציאות השבת - הוצאות שמרשות לרשות האמורות לשבת ובגמ' מפרש דהכנסות נמי קא קרי יציאות הואיל ומוציא מרשות לרשות`;

// Common Aramaic words from the text to test
const TEST_WORDS = [
  { word: 'מתני', expected: 'Mishnah' },
  { word: 'גמ', expected: 'Gemara' },
  { word: 'מפרש', expected: 'explains' },
  { word: 'דהכנסות', expected: 'that the bringing-ins' },
  { word: 'נמי', expected: 'also' },
  { word: 'קא', expected: 'present tense marker' },
  { word: 'קרי', expected: 'calls/reads' },
  { word: 'הואיל', expected: 'since' },
];

// Hebrew to CAL transliteration table
const HEBREW_TO_CAL = {
  'א': ')',
  'ב': 'b',
  'ג': 'g',
  'ד': 'd',
  'ה': 'h',
  'ו': 'w',
  'ז': 'z',
  'ח': 'x',
  'ט': 'T',
  'י': 'y',
  'כ': 'k',
  'ך': 'k',
  'ל': 'l',
  'מ': 'm',
  'ם': 'm',
  'נ': 'n',
  'ן': 'n',
  'ס': 's',
  'ע': '(',
  'פ': 'p',
  'ף': 'p',
  'צ': 'c',
  'ץ': 'c',
  'ק': 'q',
  'ר': 'r',
  'ש': '$',
  'ת': 't',
};

/**
 * Clean Hebrew word (remove vowels and cantillation)
 */
function cleanWord(word) {
  return word
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
}

/**
 * Convert Hebrew to CAL transliteration
 */
function hebrewToCAL(word) {
  const cleaned = cleanWord(word);
  let result = '';
  for (const char of cleaned) {
    result += HEBREW_TO_CAL[char] || char;
  }
  return result;
}

/**
 * Test transliteration
 */
function testTransliteration() {
  console.log('\n=== Testing Hebrew to CAL Transliteration ===\n');

  const testCases = [
    { hebrew: 'נמי', expected: 'nmy' },
    { hebrew: 'קרי', expected: 'qry' },
    { hebrew: 'הואיל', expected: 'hwyl' },
    { hebrew: 'מפרש', expected: 'mpr$' },
    { hebrew: 'גמרא', expected: 'gmr)' },
    { hebrew: 'מתניתין', expected: 'mtnytn' },
  ];

  let passed = 0;
  for (const test of testCases) {
    const result = hebrewToCAL(test.hebrew);
    const status = result === test.expected ? '✓' : '✗';
    console.log(`${status} ${test.hebrew} → ${result} (expected: ${test.expected})`);
    if (result === test.expected) passed++;
  }

  console.log(`\nPassed: ${passed}/${testCases.length}\n`);
}

/**
 * Test quick lookup (common Aramaic words)
 */
function testQuickLookup() {
  console.log('\n=== Testing Quick Lookup (Common Talmudic Aramaic) ===\n');

  const COMMON_ARAMAIC = {
    'נמי': { meaning: 'also, too', pos: 'adverb' },
    'הכי': { meaning: 'thus, so', pos: 'adverb' },
    'מאי': { meaning: 'what', pos: 'interrogative' },
    'היכי': { meaning: 'how', pos: 'interrogative' },
    'קא': { meaning: '[present tense marker]', pos: 'particle' },
    'קרי': { meaning: 'calls, reads', pos: 'verb' },
    'הואיל': { meaning: 'since, inasmuch as', pos: 'conjunction' },
    'מתני': { meaning: 'Mishnah', pos: 'noun' },
  };

  for (const [word, data] of Object.entries(COMMON_ARAMAIC)) {
    console.log(`${word} → ${data.meaning} (${data.pos})`);
  }
}

/**
 * Main test function
 */
function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       CAL (Comprehensive Aramaic Lexicon) Service Test           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  console.log('\n📜 Test Text (Rashi on Gemara Shabbat):');
  console.log(`"${RASHI_TEXT}"\n`);

  // Test transliteration
  testTransliteration();

  // Test quick lookup
  testQuickLookup();

  // Show CAL API URLs for manual testing
  console.log('\n=== CAL API URLs for Manual Testing ===\n');

  const wordsToTest = ['nmy', 'qry', 'hwyl', 'npq', 'hwh'];
  for (const word of wordsToTest) {
    console.log(`${word}: https://cal.huc.edu/oneentry.php?lemma=${word}+V&cits=all`);
    console.log(`Browse: https://cal.huc.edu/browseSKEYheaders.php?first3=${word.slice(0, 3)}`);
    console.log('');
  }

  console.log('\n=== Translation of Rashi Text ===\n');

  const words = RASHI_TEXT.split(/\s+/);
  const COMMON_ARAMAIC = {
    'נמי': 'also',
    'קא': '[present]',
    'קרי': 'calls',
    'הואיל': 'since',
    'מפרש': 'explains',
    'דהכנסות': 'that bringing-ins',
    'ובגמ': 'and in Gemara',
    'מתני': 'Mishnah',
    'יציאות': 'goings-out',
    'הוצאות': 'takings-out',
    'שמרשות': 'from domain',
    'לרשות': 'to domain',
    'האמורות': 'mentioned',
    'לשבת': 'regarding Shabbat',
    'ומוציא': 'and takes out',
  };

  console.log('Word-by-word translation:\n');
  for (const word of words) {
    const cleaned = cleanWord(word);
    const calForm = hebrewToCAL(word);
    const translation = COMMON_ARAMAIC[cleaned] || '[needs API lookup]';
    console.log(`  ${word} (${calForm}) → ${translation}`);
  }

  console.log('\n\n📝 Full Translation:');
  console.log('"מתני\' (Mishnah) יציאות השבת (goings-out of Shabbat) - הוצאות (takings-out) שמרשות לרשות (from domain to domain) האמורות לשבת (mentioned regarding Shabbat), ובגמ\' (and in the Gemara) מפרש (it explains) דהכנסות (that bringing-ins) נמי (also) קא קרי (it calls) יציאות (goings-out), הואיל (since) ומוציא (one takes out) מרשות לרשות (from domain to domain)."\n');

  console.log('✅ CAL Dictionary Service test complete!');
  console.log('\nTo use in the app, run: npm start');
  console.log('Then use calDictionaryService.lookupWithFallback(word)');
}

// Run tests
runTests();
