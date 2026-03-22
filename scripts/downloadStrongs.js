/**
 * Download Strong's Hebrew Dictionary from OpenScriptures
 * Source: https://github.com/openscriptures/strongs
 *
 * Run with: node scripts/downloadStrongs.js
 */

const fs = require('fs');
const path = require('path');

const STRONGS_URL = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/StrongHebrewG.xml';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'strongsComplete.js');
const JSON_OUTPUT = path.join(OUTPUT_DIR, 'strongsComplete.json');

/**
 * Parse OSIS XML format to extract Strong's data
 */
function parseEntry(xml) {
  const entries = [];

  // Match each <div type="entry"> element
  const entryRegex = /<div type="entry"[^>]*>([\s\S]*?)<\/div>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    // Find the main <w> tag and extract attributes flexibly
    const wTagMatch = entryXml.match(/<w\s+([^>]+)>([^<]*)<\/w>/);
    if (!wTagMatch) continue;

    const attrs = wTagMatch[1];
    const text = wTagMatch[2];

    // Extract individual attributes
    const idMatch = attrs.match(/ID="(H\d+)"/);
    const lemmaMatch = attrs.match(/lemma="([^"]*)"/);
    const xlitMatch = attrs.match(/xlit="([^"]*)"/);
    const posMatch = attrs.match(/POS="([^"]*)"/);

    if (!idMatch) continue;

    const strongs = idMatch[1];
    const lemma = lemmaMatch ? lemmaMatch[1] : text;
    const xlit = xlitMatch ? xlitMatch[1] : '';
    const pos = posMatch ? posMatch[1] : '';

    processEntry(entries, strongs, lemma, xlit, text, pos, entryXml);
  }

  return entries;
}

function processEntry(entries, strongs, lemma, xlit, text, pos, entryXml) {
  // Extract definitions from <item> elements
  const definitions = [];
  const itemRegex = /<item>([^<]*)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(entryXml)) !== null) {
    definitions.push(cleanText(itemMatch[1]));
  }

  // Extract notes (handle content that may have nested tags)
  const exegesisMatch = entryXml.match(/<note type="exegesis">([\s\S]*?)<\/note>/);
  const explanationMatch = entryXml.match(/<note type="explanation">([\s\S]*?)<\/note>/);
  const translationMatch = entryXml.match(/<note type="translation">([\s\S]*?)<\/note>/);

  const exegesis = exegesisMatch ? cleanText(exegesisMatch[1]) : '';
  const explanation = explanationMatch ? cleanText(explanationMatch[1]) : '';
  const translation = translationMatch ? cleanText(translationMatch[1]) : '';

  // Clean Hebrew word for key
  const cleanKey = lemma.replace(/[\u0591-\u05C7]/g, '').replace(/[^א-ת]/g, '');

  if (!cleanKey && !lemma) return;

  entries.push({
    strongs,
    lemma,
    key: cleanKey || text.replace(/[^א-ת]/g, ''),
    xlit,
    pos,
    definitions: definitions,
    definition: definitions.join('; ').substring(0, 500),
    etymology: exegesis,
    gloss: explanation.replace(/<[^>]+>/g, ''),
    translations: translation,
    dictSource: 'Strong\'s'
  });
}

/**
 * Clean text from XML
 */
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/<[^>]+>/g, '') // Remove XML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

async function main() {
  console.log("Downloading Strong's Hebrew Dictionary...");
  console.log(`URL: ${STRONGS_URL}`);

  try {
    // Fetch the XML file
    const response = await fetch(STRONGS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    console.log(`Downloaded ${(xml.length / 1024).toFixed(1)} KB`);

    // Parse entries
    const entries = parseEntry(xml);
    console.log(`Parsed ${entries.length} entries`);

    // Create lookup objects
    const byWord = {};
    const byStrongs = {};

    for (const entry of entries) {
      if (entry.key) {
        byWord[entry.key] = entry;
      }
      byStrongs[entry.strongs] = entry;
    }

    const wordCount = Object.keys(byWord).length;
    const strongsCount = Object.keys(byStrongs).length;

    console.log(`Indexed ${wordCount} Hebrew words`);
    console.log(`Indexed ${strongsCount} Strong's numbers`);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write JSON output
    const jsonData = {
      byWord,
      byStrongs,
      stats: {
        words: wordCount,
        strongs: strongsCount,
        source: "Strong's Hebrew Dictionary (OpenScriptures)",
        downloadDate: new Date().toISOString().split('T')[0]
      }
    };

    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(jsonData, null, 2));
    console.log(`\nWritten: ${JSON_OUTPUT}`);

    // Write JS module
    const jsContent = `/**
 * Strong's Hebrew Dictionary
 * Source: https://github.com/openscriptures/strongs
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * Total Hebrew words: ${wordCount}
 * Total Strong's numbers: ${strongsCount}
 */

// Indexed by Hebrew word (without nikud)
export const STRONGS_BY_WORD = ${JSON.stringify(byWord, null, 2)};

// Indexed by Strong's number (H1, H2, etc.)
export const STRONGS_BY_NUMBER = ${JSON.stringify(byStrongs, null, 2)};

/**
 * Lookup a word by Hebrew text
 * @param {string} word - Hebrew word (with or without nikud)
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupStrongsByWord = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').replace(/[^א-ת]/g, '');
  return STRONGS_BY_WORD[cleaned] || null;
};

/**
 * Lookup by Strong's number
 * @param {string|number} strongs - Strong's number (e.g., "H1", "430", 430)
 * @returns {Object|null} - Dictionary entry or null
 */
export const lookupStrongsByNumber = (strongs) => {
  if (!strongs && strongs !== 0) return null;
  const str = String(strongs);
  const normalized = str.toUpperCase().startsWith('H') ? str.toUpperCase() : 'H' + str;
  return STRONGS_BY_NUMBER[normalized] || null;
};

/**
 * Search Strong's definitions
 * @param {string} query - English search term
 * @returns {Array} - Matching entries
 */
export const searchStrongs = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();

  return Object.entries(STRONGS_BY_NUMBER)
    .filter(([_, entry]) =>
      (entry.definition && entry.definition.toLowerCase().includes(lowerQuery)) ||
      (entry.usage && entry.usage.toLowerCase().includes(lowerQuery))
    )
    .map(([key, entry]) => ({ key, ...entry }))
    .slice(0, 50);
};

export const getStrongsStats = () => ({
  words: ${wordCount},
  strongs: ${strongsCount},
  source: "Strong's Hebrew (OpenScriptures)"
});

export default STRONGS_BY_NUMBER;
`;

    fs.writeFileSync(OUTPUT_FILE, jsContent);
    console.log(`Written: ${OUTPUT_FILE}`);

    // Show sample entries
    console.log('\nSample entries:');
    const samples = entries.slice(0, 5);
    for (const entry of samples) {
      console.log(`  ${entry.strongs}: ${entry.lemma} (${entry.xlit}) - ${(entry.definition || '').substring(0, 50)}...`);
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
