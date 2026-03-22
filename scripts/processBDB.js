/**
 * Process downloaded Unabridged BDB (Brown-Driver-Briggs) into usable format
 * Source: https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon
 *
 * Run with: node scripts/processBDB.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'DictBDB_raw.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'bdbComplete.js');
const JSON_OUTPUT = path.join(__dirname, '..', 'src', 'data', 'bdbComplete.json');

/**
 * Clean HTML from definition text
 */
function cleanHtml(text) {
  if (!text) return '';

  return text
    // Remove HTML tags but extract useful content
    .replace(/<b>([^<]*)<\/b>/g, '$1') // Bold to plain
    .replace(/<i>([^<]*)<\/i>/g, '$1') // Italic to plain
    .replace(/<sup>([^<]*)<\/sup>/g, '($1)') // Superscript to parens
    .replace(/<sub>([^<]*)<\/sub>/g, '') // Remove subscripts (usually refs)
    .replace(/<heb>([^<]*)<\/heb>/g, '$1') // Hebrew tags
    .replace(/<font[^>]*>([^<]*)<\/font>/g, '$1') // Font tags
    .replace(/<ref0[^>]*>([^<]*)<\/ref0>/g, '$1') // Reference tags
    .replace(/<a[^>]*>([^<]*)<\/a>/g, '$1') // Links
    .replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '') // Divs
    .replace(/<p[^>]*>/g, '').replace(/<\/p>/g, ' ') // Paragraphs
    .replace(/<h2[^>]*>([^<]*)<\/h2>/g, '$1 ') // Headers
    .replace(/<[^>]+>/g, '') // Any remaining tags
    .replace(/&#x200E;/g, '') // LTR marks
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract Hebrew word from definition
 */
function extractHebrewWord(def) {
  // Look for Hebrew word patterns
  const hebrewMatch = def.match(/[\u05D0-\u05EA\u0591-\u05C7]+/);
  return hebrewMatch ? hebrewMatch[0] : '';
}

/**
 * Extract primary meaning from definition
 */
function extractMeaning(def) {
  const cleaned = cleanHtml(def);

  // Try to extract the first main definition
  // Usually after "noun masculine/feminine" or similar
  const patterns = [
    /\b(noun|verb|adjective|adverb|preposition|conjunction|particle|interjection)\s+\w*\s+(.{10,200}?)(?=\s+\d|$|\.|;)/i,
    /^[^.]+\.\s*(.{10,200}?)(?=\s+\d|$|\.|;)/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return match[1].substring(0, 300).trim();
    }
  }

  // Fallback: return first 300 chars
  return cleaned.substring(0, 300);
}

/**
 * Extract part of speech
 */
function extractPos(def) {
  const cleaned = cleanHtml(def).toLowerCase();

  if (cleaned.includes('noun masculine')) return 'noun (m)';
  if (cleaned.includes('noun feminine')) return 'noun (f)';
  if (cleaned.includes('noun')) return 'noun';
  if (cleaned.includes('verb')) return 'verb';
  if (cleaned.includes('adjective')) return 'adjective';
  if (cleaned.includes('adverb')) return 'adverb';
  if (cleaned.includes('preposition')) return 'preposition';
  if (cleaned.includes('conjunction')) return 'conjunction';
  if (cleaned.includes('particle')) return 'particle';
  if (cleaned.includes('interjection')) return 'interjection';
  if (cleaned.includes('proper name')) return 'proper noun';

  return 'unknown';
}

/**
 * Process a single entry
 */
function processEntry(entry) {
  const { top, def } = entry;

  // Skip non-entry items
  if (!top || top === 'DictInfo' || !def) return null;

  // Extract Strong's number (H1, H2, etc.)
  const strongMatch = top.match(/^H(\d+)/);
  if (!strongMatch) return null;

  const strongNum = strongMatch[1];
  const hebrewWord = extractHebrewWord(def);
  const cleanedDef = cleanHtml(def);
  const meaning = extractMeaning(def);
  const pos = extractPos(def);

  // Clean Hebrew word (remove nikud for key)
  const cleanKey = hebrewWord.replace(/[\u0591-\u05C7]/g, '');

  if (!cleanKey) return null;

  return {
    strongs: `H${strongNum}`,
    lemma: hebrewWord,
    key: cleanKey,
    pos: pos,
    definition: meaning,
    fullDef: cleanedDef.substring(0, 1000), // Keep longer version
    source: 'BDB'
  };
}

async function main() {
  console.log('Processing Unabridged BDB Dictionary...');
  console.log(`Input: ${INPUT_FILE}`);

  // Read and parse input
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  const entries = JSON.parse(rawData);

  console.log(`Total raw entries: ${entries.length}`);

  // Process entries
  const processed = {};
  const byStrongs = {};
  let skipped = 0;

  for (const entry of entries) {
    const result = processEntry(entry);
    if (result) {
      // Index by Hebrew word
      if (!processed[result.key]) {
        processed[result.key] = result;
      }
      // Also index by Strong's number
      byStrongs[result.strongs] = result;
    } else {
      skipped++;
    }
  }

  const wordCount = Object.keys(processed).length;
  const strongsCount = Object.keys(byStrongs).length;

  console.log(`Processed ${wordCount} Hebrew words`);
  console.log(`Indexed ${strongsCount} Strong's numbers`);
  console.log(`Skipped ${skipped} entries`);

  // Write JSON output
  const jsonData = {
    byWord: processed,
    byStrongs: byStrongs,
    stats: {
      words: wordCount,
      strongs: strongsCount,
      source: 'Brown-Driver-Briggs Hebrew Lexicon (Unabridged)',
      processedDate: new Date().toISOString().split('T')[0]
    }
  };

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(jsonData, null, 2));
  console.log(`\nWritten: ${JSON_OUTPUT}`);

  // Write JS module
  const jsContent = `/**
 * Brown-Driver-Briggs Hebrew Lexicon (Unabridged)
 * Source: https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon
 * Processed: ${new Date().toISOString().split('T')[0]}
 *
 * Total Hebrew words: ${wordCount}
 * Total Strong's numbers: ${strongsCount}
 */

// Indexed by Hebrew word (without nikud)
export const BDB_BY_WORD = ${JSON.stringify(processed, null, 2)};

// Indexed by Strong's number (H1, H2, etc.)
export const BDB_BY_STRONGS = ${JSON.stringify(byStrongs, null, 2)};

/**
 * Lookup a word in BDB by Hebrew text
 * @param {string} word - Hebrew word (with or without nikud)
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupBDBByWord = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  return BDB_BY_WORD[cleaned] || null;
};

/**
 * Lookup by Strong's number
 * @param {string} strongs - Strong's number (e.g., "H1", "H430")
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupBDBByStrongs = (strongs) => {
  if (!strongs) return null;
  const normalized = strongs.toUpperCase().replace(/^0+/, '');
  return BDB_BY_STRONGS[normalized] || BDB_BY_STRONGS['H' + normalized.replace('H', '')] || null;
};

/**
 * Search BDB definitions
 * @param {string} query - English search term
 * @returns {Array} - Matching entries
 */
export const searchBDB = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return Object.entries(BDB_BY_WORD)
    .filter(([_, entry]) =>
      entry.definition.toLowerCase().includes(lowerQuery) ||
      entry.fullDef.toLowerCase().includes(lowerQuery)
    )
    .map(([key, entry]) => ({ key, ...entry }))
    .slice(0, 50);
};

export const getBDBStats = () => ({
  words: ${wordCount},
  strongs: ${strongsCount},
  source: 'BDB Unabridged'
});

export default BDB_BY_WORD;
`;

  fs.writeFileSync(OUTPUT_FILE, jsContent);
  console.log(`Written: ${OUTPUT_FILE}`);

  // Show some sample entries
  console.log('\nSample entries:');
  const samples = Object.entries(processed).slice(0, 5);
  for (const [key, entry] of samples) {
    console.log(`  ${entry.strongs}: ${entry.lemma} - ${entry.definition.substring(0, 60)}...`);
  }
}

main().catch(console.error);
