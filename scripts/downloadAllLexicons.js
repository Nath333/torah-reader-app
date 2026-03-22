/**
 * Download ALL Hebrew/Aramaic Lexicons from Sefaria
 *
 * Downloads entries from:
 * - BDB (Brown-Driver-Briggs) - Biblical Hebrew
 * - BDB Aramaic - Biblical Aramaic
 * - Klein Dictionary - Etymological
 * - Jastrow Dictionary - Talmudic
 * - Strong's Concordance
 *
 * Run with: node scripts/downloadAllLexicons.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, '..', 'src', 'data'),
  progressFile: path.join(__dirname, 'lexicon_progress.json'),
  delayMs: 120,
  batchSize: 100,
  maxRetries: 3,
};

// Hebrew letters
const HEBREW_LETTERS = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

// Common Hebrew/Aramaic words to seed
const SEED_WORDS = [
  // Creation/Genesis vocabulary
  'ברא', 'שמים', 'ארץ', 'אור', 'חשך', 'מים', 'יום', 'לילה', 'רקיע',
  'עשב', 'זרע', 'עץ', 'פרי', 'מאור', 'שמש', 'ירח', 'כוכב', 'נפש',
  'חיה', 'בהמה', 'רמש', 'אדם', 'צלם', 'דמות', 'זכר', 'נקבה', 'ברכה',

  // Common verbs
  'אמר', 'היה', 'הלך', 'בא', 'נתן', 'לקח', 'ראה', 'שמע', 'ידע', 'עשה',
  'שב', 'קום', 'עמד', 'יצא', 'בוא', 'שוב', 'נפל', 'אכל', 'שתה', 'מות',
  'חיה', 'עבר', 'שלח', 'קרא', 'דבר', 'ענה', 'נשא', 'שם', 'פתח', 'סגר',

  // Common nouns
  'איש', 'אשה', 'בן', 'בת', 'אב', 'אם', 'אח', 'אחות', 'עם', 'גוי',
  'בית', 'עיר', 'שדה', 'דרך', 'יד', 'עין', 'פה', 'לב', 'ראש', 'רגל',
  'מלך', 'כהן', 'נביא', 'עבד', 'שר', 'אדון', 'אלהים', 'יהוה', 'רוח',

  // Talmudic terms
  'תנא', 'אמורא', 'משנה', 'גמרא', 'ברייתא', 'הלכה', 'אגדה', 'מדרש',
  'סוגיא', 'קושיא', 'תירוץ', 'פשט', 'דרש', 'רמז', 'סוד', 'פסק',

  // Aramaic common words
  'מילתא', 'עובדא', 'גברא', 'איתתא', 'ביתא', 'מלכא', 'שמיא', 'ארעא',
  'יומא', 'ליליא', 'רבא', 'זעירא', 'אמר', 'הוה', 'עבד', 'יהב', 'נסב',

  // Additional roots (3 letter)
  'כתב', 'ספר', 'למד', 'חכם', 'צדק', 'רשע', 'טוב', 'רע', 'גדל', 'קטן',
  'חזק', 'רפא', 'קדש', 'טמא', 'טהר', 'כפר', 'סלח', 'זכר', 'שכח', 'בחר',
  'אהב', 'שנא', 'ירא', 'בטח', 'חפץ', 'רצה', 'שאל', 'בקש', 'מצא', 'נגע',
];

// Stats
const stats = {
  total: 0,
  bdb: 0,
  bdbAramaic: 0,
  klein: 0,
  jastrow: 0,
  strong: 0,
  errors: 0,
  startTime: Date.now(),
};

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with retry
async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.log('  Rate limited, waiting 5s...');
        await sleep(5000);
        continue;
      }
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

// Clean word
function cleanWord(word) {
  if (!word) return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\u05D0-\u05EA]/g, '')
    .trim();
}

// Clean definition
function cleanDefinition(def) {
  if (!def) return '';
  return def
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 400);
}

// Extract definition from entry
function extractDefinition(entry) {
  const senses = entry.content?.senses || [];

  for (const sense of senses) {
    if (sense.definition) {
      const cleaned = cleanDefinition(sense.definition);
      if (cleaned.length >= 3) return cleaned;
    }
    if (sense.senses) {
      for (const subSense of sense.senses) {
        if (subSense.definition) {
          const cleaned = cleanDefinition(subSense.definition);
          if (cleaned.length >= 3) return cleaned;
        }
      }
    }
  }
  return '';
}

// Process entry by lexicon type
function processEntry(entry, lexiconType) {
  const headword = entry.headword || '';
  const cleanHeadword = cleanWord(headword);

  if (!cleanHeadword || cleanHeadword.length < 2) return null;

  const definition = extractDefinition(entry);
  if (!definition || definition.length < 3) return null;

  let pos = entry.content?.morphology || '';
  if (!pos) {
    const firstSense = entry.content?.senses?.[0];
    pos = firstSense?.grammar?.verbal_stem ||
          firstSense?.part_of_speech ||
          'unknown';
  }

  return {
    lemma: headword.replace(/\s*[ᴵᴵᴵ¹²³]+$/, '').trim(),
    key: cleanHeadword,
    pos: pos,
    definition: definition,
    source: lexiconType,
    strongNum: entry.content?.strong_number || undefined,
  };
}

// Load/save progress
function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
      console.log(`Resuming: ${Object.keys(data.bdb || {}).length} BDB, ${Object.keys(data.klein || {}).length} Klein entries`);
      return data;
    }
  } catch (err) {
    console.log('Starting fresh');
  }
  return {
    bdb: {},
    bdbAramaic: {},
    klein: {},
    jastrow: {},
    strong: {},
    processedWords: []
  };
}

function saveProgress(progress) {
  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

// Generate all search words
function generateSearchWords() {
  const words = new Set(SEED_WORDS);

  // Add 2-letter prefixes
  for (const l1 of HEBREW_LETTERS) {
    for (const l2 of HEBREW_LETTERS) {
      words.add(l1 + l2);
    }
  }

  // Add 3-letter common roots
  for (const l1 of HEBREW_LETTERS.slice(0, 10)) {
    for (const l2 of HEBREW_LETTERS.slice(0, 10)) {
      for (const l3 of HEBREW_LETTERS.slice(0, 10)) {
        words.add(l1 + l2 + l3);
      }
    }
  }

  return Array.from(words);
}

// Main download function
async function downloadLexicons() {
  console.log('='.repeat(60));
  console.log('Downloading All Hebrew/Aramaic Lexicons from Sefaria');
  console.log('='.repeat(60));
  console.log();

  const progress = loadProgress();
  const processedWords = new Set(progress.processedWords || []);

  const allWords = generateSearchWords();
  const pendingWords = allWords.filter(w => !processedWords.has(w));

  console.log(`Total words to search: ${allWords.length}`);
  console.log(`Already processed: ${processedWords.size}`);
  console.log(`Pending: ${pendingWords.length}`);
  console.log();

  let batchCount = 0;

  for (let i = 0; i < pendingWords.length; i++) {
    const word = pendingWords[i];
    const progressPct = ((i / pendingWords.length) * 100).toFixed(1);

    process.stdout.write(`[${progressPct}%] ${word}... `);

    try {
      const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`;
      const data = await fetchWithRetry(url);

      if (data && Array.isArray(data)) {
        let added = { bdb: 0, bdbAram: 0, klein: 0, jastrow: 0, strong: 0 };

        for (const entry of data) {
          const lexicon = entry.parent_lexicon;
          let processed = null;

          if (lexicon === 'BDB Dictionary') {
            processed = processEntry(entry, 'BDB');
            if (processed && !progress.bdb[processed.key]) {
              progress.bdb[processed.key] = processed;
              stats.bdb++;
              added.bdb++;
            }
          } else if (lexicon === 'BDB Aramaic Dictionary') {
            processed = processEntry(entry, 'BDB-Aramaic');
            if (processed && !progress.bdbAramaic[processed.key]) {
              progress.bdbAramaic[processed.key] = processed;
              stats.bdbAramaic++;
              added.bdbAram++;
            }
          } else if (lexicon === 'Klein Dictionary') {
            processed = processEntry(entry, 'Klein');
            if (processed && !progress.klein[processed.key]) {
              progress.klein[processed.key] = processed;
              stats.klein++;
              added.klein++;
            }
          } else if (lexicon === 'Jastrow Dictionary') {
            processed = processEntry(entry, 'Jastrow');
            if (processed && !progress.jastrow[processed.key]) {
              progress.jastrow[processed.key] = processed;
              stats.jastrow++;
              added.jastrow++;
            }
          } else if (lexicon === 'BDB Augmented Strong') {
            processed = processEntry(entry, 'Strong');
            if (processed && !progress.strong[processed.key]) {
              progress.strong[processed.key] = processed;
              stats.strong++;
              added.strong++;
            }
          }
        }

        stats.total += data.length;
        const addedStr = Object.entries(added)
          .filter(([_, v]) => v > 0)
          .map(([k, v]) => `${k}:${v}`)
          .join(' ');
        console.log(addedStr || '-');
      } else {
        console.log('-');
      }

      processedWords.add(word);
      batchCount++;

      if (batchCount >= CONFIG.batchSize) {
        progress.processedWords = Array.from(processedWords);
        saveProgress(progress);
        const total = Object.keys(progress.bdb).length +
                     Object.keys(progress.klein).length +
                     Object.keys(progress.jastrow).length;
        console.log(`  [Saved: ${total} total entries]`);
        batchCount = 0;
      }

      await sleep(CONFIG.delayMs);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      stats.errors++;
    }
  }

  progress.processedWords = Array.from(processedWords);
  saveProgress(progress);

  return progress;
}

// Write output files
function writeOutput(data) {
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const counts = {
    bdb: Object.keys(data.bdb).length,
    bdbAramaic: Object.keys(data.bdbAramaic).length,
    klein: Object.keys(data.klein).length,
    jastrow: Object.keys(data.jastrow).length,
    strong: Object.keys(data.strong).length,
  };

  // Write combined lexicon file
  const jsContent = `/**
 * Combined Hebrew/Aramaic Lexicons - Downloaded from Sefaria
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * Sources:
 * - BDB (Biblical Hebrew): ${counts.bdb} entries
 * - BDB Aramaic: ${counts.bdbAramaic} entries
 * - Klein (Etymological): ${counts.klein} entries
 * - Jastrow (Talmudic): ${counts.jastrow} entries
 * - Strong's: ${counts.strong} entries
 *
 * Total: ${counts.bdb + counts.bdbAramaic + counts.klein + counts.jastrow + counts.strong} entries
 */

// BDB - Brown-Driver-Briggs (Biblical Hebrew)
export const BDB_LEXICON = ${JSON.stringify(data.bdb, null, 2)};

// BDB Aramaic
export const BDB_ARAMAIC = ${JSON.stringify(data.bdbAramaic, null, 2)};

// Klein - Etymological Dictionary
export const KLEIN_LEXICON = ${JSON.stringify(data.klein, null, 2)};

// Jastrow - Talmudic Dictionary
export const JASTROW_LEXICON = ${JSON.stringify(data.jastrow, null, 2)};

// Strong's Concordance
export const STRONG_LEXICON = ${JSON.stringify(data.strong, null, 2)};

/**
 * Lookup word in all lexicons
 */
export const lookupAllLexicons = (word) => {
  if (!word) return null;

  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  const normalized = cleaned
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ');

  const result = {};

  if (BDB_LEXICON[cleaned] || BDB_LEXICON[normalized]) {
    result.bdb = BDB_LEXICON[cleaned] || BDB_LEXICON[normalized];
  }
  if (BDB_ARAMAIC[cleaned] || BDB_ARAMAIC[normalized]) {
    result.bdbAramaic = BDB_ARAMAIC[cleaned] || BDB_ARAMAIC[normalized];
  }
  if (KLEIN_LEXICON[cleaned] || KLEIN_LEXICON[normalized]) {
    result.klein = KLEIN_LEXICON[cleaned] || KLEIN_LEXICON[normalized];
  }
  if (JASTROW_LEXICON[cleaned] || JASTROW_LEXICON[normalized]) {
    result.jastrow = JASTROW_LEXICON[cleaned] || JASTROW_LEXICON[normalized];
  }
  if (STRONG_LEXICON[cleaned] || STRONG_LEXICON[normalized]) {
    result.strong = STRONG_LEXICON[cleaned] || STRONG_LEXICON[normalized];
  }

  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Lookup in specific lexicon
 */
export const lookupBDB = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  return BDB_LEXICON[cleaned] || null;
};

export const lookupKlein = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  return KLEIN_LEXICON[cleaned] || null;
};

export const lookupJastrowLocal = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  return JASTROW_LEXICON[cleaned] || null;
};

export const lookupStrong = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  return STRONG_LEXICON[cleaned] || null;
};

/**
 * Get lexicon statistics
 */
export const getLexiconStats = () => ({
  bdb: ${counts.bdb},
  bdbAramaic: ${counts.bdbAramaic},
  klein: ${counts.klein},
  jastrow: ${counts.jastrow},
  strong: ${counts.strong},
  total: ${counts.bdb + counts.bdbAramaic + counts.klein + counts.jastrow + counts.strong},
  downloadDate: '${new Date().toISOString().split('T')[0]}'
});
`;

  const outputPath = path.join(CONFIG.outputDir, 'hebrewLexicons.js');
  fs.writeFileSync(outputPath, jsContent);
  console.log(`\nWritten: ${outputPath}`);

  // Also write JSON for inspection
  const jsonPath = path.join(CONFIG.outputDir, 'hebrewLexicons.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    bdb: data.bdb,
    bdbAramaic: data.bdbAramaic,
    klein: data.klein,
    jastrow: data.jastrow,
    strong: data.strong,
  }, null, 2));
  console.log(`Written: ${jsonPath}`);

  return counts;
}

// Print stats
function printStats(counts) {
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  const total = counts.bdb + counts.bdbAramaic + counts.klein + counts.jastrow + counts.strong;

  console.log('\n' + '='.repeat(60));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`Duration: ${duration} minutes`);
  console.log(`Total entries: ${total}`);
  console.log(`  - BDB (Biblical): ${counts.bdb}`);
  console.log(`  - BDB Aramaic: ${counts.bdbAramaic}`);
  console.log(`  - Klein: ${counts.klein}`);
  console.log(`  - Jastrow: ${counts.jastrow}`);
  console.log(`  - Strong's: ${counts.strong}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('='.repeat(60));
}

// Main
async function main() {
  try {
    const data = await downloadLexicons();
    const counts = writeOutput(data);
    printStats(counts);

    // Cleanup progress file
    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

    console.log('\nDone! Import with:');
    console.log("  import { lookupAllLexicons, lookupBDB, lookupKlein } from './data/hebrewLexicons';");

  } catch (err) {
    console.error('\nFATAL:', err);
    console.log('Progress saved. Run again to resume.');
    process.exit(1);
  }
}

main();
