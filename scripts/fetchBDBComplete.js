/**
 * Fetch Complete BDB (Brown-Driver-Briggs) from OpenScriptures
 *
 * BDB is PUBLIC DOMAIN (1906) - we can fetch the full lexicon!
 * Source: https://github.com/openscriptures/HebrewLexicon
 */
const fs = require('fs');
const path = require('path');

const BDB_URL = 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml';
const OUTPUT_PATH = path.join(__dirname, '../public/data/bdbComplete.json');

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     BDB Complete Fetcher (Brown-Driver-Briggs 1906)           ║');
console.log('║     Public Domain - OpenScriptures Project                    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Load existing data
let existingData = {};
try {
  existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
  console.log(`Existing BDB entries: ${Object.keys(existingData.byWord || {}).length}`);
} catch (e) {
  console.log('No existing BDB data found');
}

async function fetchBDB() {
  console.log(`\nFetching BDB XML from OpenScriptures...`);
  console.log(`URL: ${BDB_URL}\n`);

  const response = await fetch(BDB_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const xml = await response.text();
  console.log(`Downloaded ${(xml.length / 1024 / 1024).toFixed(2)} MB`);

  return xml;
}

function parseBDB(xml) {
  const entries = {};
  let entryCount = 0;
  let senseCount = 0;

  // Match all <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    try {
      const entryXml = match[1];

      // Extract Hebrew word(s) from <w> tags
      const hebrewMatches = entryXml.match(/<w[^>]*>([^<]+)<\/w>/g) || [];
      if (hebrewMatches.length === 0) continue;

      // Get primary Hebrew word
      const firstHebrew = hebrewMatches[0].replace(/<[^>]+>/g, '').trim();
      if (!firstHebrew || !/[א-ת]/.test(firstHebrew)) continue;

      // Clean key (remove nikud)
      const key = firstHebrew.replace(/[\u0591-\u05C7]/g, '').trim();
      if (key.length < 1) continue;

      // Extract Strong's number
      const idMatch = entryXml.match(/id="([^"]+)"/);
      const strong = idMatch ? idMatch[1] : null;

      // Extract part of speech
      const posMatch = entryXml.match(/<pos>([^<]+)<\/pos>/);
      const pos = posMatch ? posMatch[1].trim() : null;

      // Extract all definitions
      const defMatches = entryXml.match(/<def>([^<]+)<\/def>/g) || [];
      const definitions = defMatches
        .map(d => d.replace(/<[^>]+>/g, '').trim())
        .filter(d => d.length > 0);

      // Extract senses with their definitions
      const senses = [];
      const senseRegex = /<sense[^>]*n="([^"]*)"[^>]*>([\s\S]*?)<\/sense>/g;
      let senseMatch;
      while ((senseMatch = senseRegex.exec(entryXml)) !== null) {
        const senseNum = senseMatch[1];
        const senseContent = senseMatch[2];
        const senseDefs = senseContent.match(/<def>([^<]+)<\/def>/g) || [];
        const senseText = senseDefs.map(d => d.replace(/<[^>]+>/g, '').trim()).join(', ');
        if (senseText) {
          senses.push(`${senseNum}) ${senseText}`);
          senseCount++;
        }
      }

      // Extract biblical references
      const refMatches = entryXml.match(/<ref[^>]*r="([^"]+)"[^>]*>/g) || [];
      const refs = refMatches.slice(0, 5).map(r => {
        const refMatch = r.match(/r="([^"]+)"/);
        return refMatch ? refMatch[1] : null;
      }).filter(Boolean);

      // Extract cognates
      const cognates = [];
      const foreignMatches = entryXml.match(/<foreign[^>]*xml:lang="([^"]+)"[^>]*>([^<]*)<\/foreign>/g) || [];
      for (const fm of foreignMatches.slice(0, 5)) {
        const langMatch = fm.match(/xml:lang="([^"]+)"/);
        const textMatch = fm.match(/>([^<]*)</);
        if (langMatch && textMatch) {
          const langMap = {
            'akk': 'Akkadian', 'ara': 'Arabic', 'syr': 'Syriac',
            'gez': 'Ethiopic', 'grc': 'Greek', 'lat': 'Latin',
            'uga': 'Ugaritic', 'phn': 'Phoenician', 'arc': 'Aramaic'
          };
          const langName = langMap[langMatch[1]] || langMatch[1];
          cognates.push(`${langName}: ${textMatch[1].trim()}`);
        }
      }

      // Extract etymology/derivation
      let etymology = null;
      const srcMatches = entryXml.match(/src="([^"]+)"/g) || [];
      if (srcMatches.length > 0) {
        etymology = srcMatches.slice(0, 3).map(s => s.replace(/src="|"/g, '')).join(', ');
      }

      // Build definition
      let fullDef = '';
      if (senses.length > 0) {
        fullDef = senses.join('; ');
      } else if (definitions.length > 0) {
        fullDef = definitions.join(', ');
      }

      if (!fullDef || fullDef.length < 2) continue;

      // Build entry
      const entry = {
        lemma: firstHebrew,
        key: key,
        strong: strong,
        pos: pos,
        definition: fullDef.substring(0, 1000),
        source: 'BDB'
      };

      // Add optional fields
      if (refs.length > 0) entry.refs = refs;
      if (cognates.length > 0) entry.cognates = cognates;
      if (etymology) entry.etymology = etymology;

      // Store (prefer entries with more data)
      if (!entries[key] ||
          (entry.definition.length > (entries[key].definition?.length || 0)) ||
          (entry.refs && !entries[key].refs)) {
        entries[key] = entry;
        entryCount++;
      }

    } catch (e) {
      // Skip malformed entries
    }
  }

  console.log(`Parsed ${entryCount} BDB entries (${senseCount} total senses)`);
  return entries;
}

async function main() {
  try {
    const xml = await fetchBDB();
    const newEntries = parseBDB(xml);

    // Merge with existing data
    const existingByWord = existingData.byWord || {};
    const existingByStrong = existingData.byStrong || {};

    const mergedByWord = { ...existingByWord };
    const mergedByStrong = { ...existingByStrong };

    let newCount = 0;
    let updatedCount = 0;

    for (const [key, entry] of Object.entries(newEntries)) {
      if (!mergedByWord[key]) {
        mergedByWord[key] = entry;
        newCount++;
      } else if (entry.definition.length > (mergedByWord[key].definition?.length || 0)) {
        mergedByWord[key] = { ...mergedByWord[key], ...entry };
        updatedCount++;
      }

      if (entry.strong && !mergedByStrong[entry.strong]) {
        mergedByStrong[entry.strong] = entry;
      }
    }

    // Build output
    const output = {
      _meta: {
        name: 'BDB',
        fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
        author: 'Brown, Driver, Briggs',
        year: 1906,
        description: 'Classic Hebrew lexicon, public domain',
        entries: Object.keys(mergedByWord).length,
        source: 'OpenScriptures HebrewLexicon',
        license: 'Public Domain',
        builtAt: new Date().toISOString()
      },
      byWord: mergedByWord,
      byStrong: mergedByStrong
    };

    // Write output
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

    console.log(`\n✅ BDB Complete!`);
    console.log(`   Total entries: ${Object.keys(mergedByWord).length}`);
    console.log(`   New entries: ${newCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Output: ${OUTPUT_PATH}`);

    // Sample entries
    console.log('\nSample entries:');
    const samples = Object.entries(mergedByWord).slice(0, 5);
    for (const [word, entry] of samples) {
      console.log(`  ${word}: ${(entry.definition || '').substring(0, 60)}...`);
    }

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
