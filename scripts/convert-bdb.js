/**
 * Convert unabridged BDB Hebrew Lexicon to app format
 * Source: https://github.com/eliranwong/unabridged-BDB-Hebrew-lexicon
 *
 * Converts 8,091 entries to the format used by bdbComplete.json
 */

const fs = require('fs');
const path = require('path');

// Read the raw JSON file
const rawPath = path.join(__dirname, 'bdb-raw.json');
const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

// Hebrew presentation forms to base letters mapping
// Unicode range U+FB1D-U+FB4F contains precomposed Hebrew letters with vowels/dagesh
const PRESENTATION_FORMS = {
  '\uFB1D': 'י', // HEBREW LETTER YOD WITH HIRIQ
  '\uFB1F': 'י', // HEBREW LIGATURE YIDDISH YOD YOD PATAH -> yod
  '\uFB20': 'ע', // HEBREW LETTER ALTERNATIVE AYIN
  '\uFB21': 'א', // HEBREW LETTER WIDE ALEF
  '\uFB22': 'ד', // HEBREW LETTER WIDE DALET
  '\uFB23': 'ה', // HEBREW LETTER WIDE HE
  '\uFB24': 'כ', // HEBREW LETTER WIDE KAF
  '\uFB25': 'ל', // HEBREW LETTER WIDE LAMED
  '\uFB26': 'ם', // HEBREW LETTER WIDE FINAL MEM
  '\uFB27': 'ר', // HEBREW LETTER WIDE RESH
  '\uFB28': 'ת', // HEBREW LETTER WIDE TAV
  '\uFB29': '+', // HEBREW LETTER ALTERNATIVE PLUS SIGN (not a letter)
  '\uFB2A': 'ש', // HEBREW LETTER SHIN WITH SHIN DOT
  '\uFB2B': 'ש', // HEBREW LETTER SHIN WITH SIN DOT
  '\uFB2C': 'ש', // HEBREW LETTER SHIN WITH DAGESH AND SHIN DOT
  '\uFB2D': 'ש', // HEBREW LETTER SHIN WITH DAGESH AND SIN DOT
  '\uFB2E': 'א', // HEBREW LETTER ALEF WITH PATAH
  '\uFB2F': 'א', // HEBREW LETTER ALEF WITH QAMATS
  '\uFB30': 'א', // HEBREW LETTER ALEF WITH MAPIQ
  '\uFB31': 'ב', // HEBREW LETTER BET WITH DAGESH
  '\uFB32': 'ג', // HEBREW LETTER GIMEL WITH DAGESH
  '\uFB33': 'ד', // HEBREW LETTER DALET WITH DAGESH
  '\uFB34': 'ה', // HEBREW LETTER HE WITH MAPIQ
  '\uFB35': 'ו', // HEBREW LETTER VAV WITH DAGESH
  '\uFB36': 'ז', // HEBREW LETTER ZAYIN WITH DAGESH
  '\uFB38': 'ט', // HEBREW LETTER TET WITH DAGESH
  '\uFB39': 'י', // HEBREW LETTER YOD WITH DAGESH
  '\uFB3A': 'ך', // HEBREW LETTER FINAL KAF WITH DAGESH
  '\uFB3B': 'כ', // HEBREW LETTER KAF WITH DAGESH
  '\uFB3C': 'ל', // HEBREW LETTER LAMED WITH DAGESH
  '\uFB3E': 'מ', // HEBREW LETTER MEM WITH DAGESH
  '\uFB40': 'נ', // HEBREW LETTER NUN WITH DAGESH
  '\uFB41': 'ס', // HEBREW LETTER SAMEKH WITH DAGESH
  '\uFB43': 'ף', // HEBREW LETTER FINAL PE WITH DAGESH
  '\uFB44': 'פ', // HEBREW LETTER PE WITH DAGESH
  '\uFB46': 'צ', // HEBREW LETTER TSADI WITH DAGESH
  '\uFB47': 'ק', // HEBREW LETTER QOF WITH DAGESH
  '\uFB48': 'ר', // HEBREW LETTER RESH WITH DAGESH
  '\uFB49': 'ש', // HEBREW LETTER SHIN WITH DAGESH
  '\uFB4A': 'ת', // HEBREW LETTER TAV WITH DAGESH
  '\uFB4B': 'ו', // HEBREW LETTER VAV WITH HOLAM
  '\uFB4C': 'ב', // HEBREW LETTER BET WITH RAFE
  '\uFB4D': 'כ', // HEBREW LETTER KAF WITH RAFE
  '\uFB4E': 'פ', // HEBREW LETTER PE WITH RAFE
  '\uFB4F': 'א', // HEBREW LIGATURE ALEF LAMED -> alef (simplified)
};

// Remove niqqud/vowels from Hebrew text for key lookup
function cleanHebrewForKey(text) {
  if (!text) return '';

  // First, convert presentation forms to base letters
  let result = '';
  for (const char of text) {
    if (PRESENTATION_FORMS[char]) {
      result += PRESENTATION_FORMS[char];
    } else {
      result += char;
    }
  }

  // Then remove cantillation and vowels, keep only Hebrew letters
  return result
    .replace(/[\u0591-\u05C7]/g, '') // Remove cantillation and vowels
    .replace(/[^\u05D0-\u05EA]/g, ''); // Keep only Hebrew letters
}

// Extract Hebrew word from HTML definition
function extractHebrewWord(html) {
  // Look for Hebrew text in <font class='c3'> tags or just plain Hebrew
  const fontMatch = html.match(/<font class='c3'>([^<]+)<\/font>/);
  if (fontMatch) {
    return fontMatch[1];
  }
  // Fallback: look for Hebrew characters
  const hebrewMatch = html.match(/[\u05D0-\u05EA][\u05D0-\u05EA\u0591-\u05C7]+/);
  return hebrewMatch ? hebrewMatch[0] : '';
}

// Extract part of speech from definition
function extractPOS(html) {
  const posPatterns = [
    /\b(noun masculine|noun feminine|noun|verb|adjective|adverb|particle|preposition|conjunction|interjection|proper name|pronoun)\b/i
  ];
  for (const pattern of posPatterns) {
    const match = html.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

// Clean HTML to plain text
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/&#x200E;/g, '')   // Remove LTR mark
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
}

// Extract a shorter definition (first sentence or two)
function extractShortDef(html) {
  const text = htmlToText(html);
  // Try to get the definition part (after the headword info)
  const parts = text.split(/\b(noun|verb|adjective|adverb|particle|preposition)\b/i);
  if (parts.length > 2) {
    // Take the part after POS indicator
    const defPart = parts.slice(2).join(' ');
    // Get first 200 chars or first sentence
    const sentences = defPart.split(/[.;]/);
    if (sentences[0] && sentences[0].length > 10) {
      return sentences[0].trim().substring(0, 200);
    }
  }
  // Fallback: just get first 200 chars after Strong's number
  const cleaned = text.replace(/^H\d+\.\s*\w+\s*/, '');
  return cleaned.substring(0, 200);
}

// Convert to app format
const byWord = {};
const byStrongs = {};

let count = 0;
let skipped = 0;

for (const entry of rawData) {
  // Skip the first entry (DictInfo)
  if (entry.top === 'DictInfo') continue;

  const strongsNum = entry.top;
  const html = entry.def;

  // Extract Hebrew word
  const hebrewWord = extractHebrewWord(html);
  const hebrewKey = cleanHebrewForKey(hebrewWord);

  if (!hebrewKey || hebrewKey.length < 2) {
    skipped++;
    continue;
  }

  const converted = {
    strongs: strongsNum,
    lemma: hebrewWord,
    key: hebrewKey,
    pos: extractPOS(html),
    definition: extractShortDef(html),
    fullDef: htmlToText(html),
    source: 'BDB'
  };

  // Store by Hebrew word (first occurrence)
  if (!byWord[hebrewKey]) {
    byWord[hebrewKey] = converted;
  }

  // Store by Strong's number
  byStrongs[strongsNum] = converted;

  count++;
}

// Output statistics
console.log(`Converted ${count} BDB entries`);
console.log(`Skipped ${skipped} entries (no Hebrew key)`);
console.log(`Unique Hebrew words: ${Object.keys(byWord).length}`);
console.log(`Strong's numbers: ${Object.keys(byStrongs).length}`);

// Write the converted data
const output = {
  byWord,
  byStrongs,
  metadata: {
    source: 'eliranwong/unabridged-BDB-Hebrew-lexicon',
    license: 'Public Domain',
    totalEntries: count,
    uniqueWords: Object.keys(byWord).length,
    generatedAt: new Date().toISOString()
  }
};

const outputPath = path.join(__dirname, '..', 'public', 'data', 'bdbComplete.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Written to: ${outputPath}`);

// Also update src/data for reference
const srcOutputPath = path.join(__dirname, '..', 'src', 'data', 'bdbComplete.json');
fs.writeFileSync(srcOutputPath, JSON.stringify(output, null, 2));
console.log(`Written to: ${srcOutputPath}`);
