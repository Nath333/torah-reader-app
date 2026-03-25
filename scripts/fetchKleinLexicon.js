/**
 * Klein Hebrew Lexicon Enhancer
 * ==============================
 * Ernest Klein's "A Comprehensive Etymological Dictionary of the Hebrew Language" (1987)
 * is renowned for its etymology focus. This script enhances our excerpt with:
 *
 * 1. Sefaria's Klein data (API access)
 * 2. Etymology enrichment from BDB/Wiktionary
 * 3. Cognate language data
 * 4. Proto-Semitic reconstructions
 *
 * Note: Full Klein is copyrighted (Carta Jerusalem). This builds on public sources.
 *
 * Usage: node scripts/fetchKleinLexicon.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const OUTPUT_PATH = path.join(__dirname, '../public/data/klein_lexicon.json');
const EXISTING_PATH = OUTPUT_PATH;
const BDB_ETYMOLOGY_PATH = path.join(__dirname, '../public/data/etymology_bdb_extracted.json');
const WIKTIONARY_PATH = path.join(__dirname, '../public/data/etymology_wiktionary.json');
const ROOT_MEANINGS_PATH = path.join(__dirname, '../public/data/root_meanings_pro.json');
const GESENIUS_PATH = path.join(__dirname, '../public/data/gesenius_lexicon.json');
const STRONGS_PATH = path.join(__dirname, '../public/data/strongsComplete.json');

// Sefaria API for Klein data
const SEFARIA_LEXICON_API = 'https://www.sefaria.org/api/words/';

// Rate limiting
const DELAY_MS = 100;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch word data from Sefaria API
 */
async function fetchSefariaWord(word) {
  try {
    const url = `${SEFARIA_LEXICON_API}${encodeURIComponent(word)}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

/**
 * Extract Klein-specific data from Sefaria response
 */
function extractKleinData(sefariaData, word) {
  if (!sefariaData || !Array.isArray(sefariaData)) return null;

  // Look for Klein entries in the response
  for (const entry of sefariaData) {
    if (entry.parent_lexicon === 'Klein Dictionary' ||
        entry.parent_lexicon?.includes('Klein') ||
        entry.headword === word) {

      const result = {
        lemma: entry.headword || word,
        key: word.replace(/[\u0591-\u05C7]/g, '').trim(),
        definition: '',
        source: 'Klein'
      };

      // Extract definition
      if (entry.content?.senses) {
        const defs = [];
        for (const sense of entry.content.senses) {
          if (sense.definition) {
            defs.push(sense.definition);
          }
        }
        result.definition = defs.join('; ');
      } else if (entry.content?.definition) {
        result.definition = entry.content.definition;
      }

      // Extract part of speech
      if (entry.content?.morphology) {
        result.pos = entry.content.morphology;
      }

      // Extract etymology (Klein's specialty!)
      if (entry.content?.etymology) {
        result.etymology = entry.content.etymology;
      }

      // Extract cognates
      if (entry.content?.cognates || entry.content?.related_words) {
        result.cognates = entry.content.cognates || entry.content.related_words;
      }

      // Extract forms
      if (entry.content?.forms) {
        result.forms = entry.content.forms;
      }

      if (result.definition) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Load existing Klein entries
 */
function loadExisting() {
  if (!fs.existsSync(EXISTING_PATH)) {
    return {};
  }

  try {
    const data = JSON.parse(fs.readFileSync(EXISTING_PATH, 'utf8'));
    const entries = {};

    for (const [key, value] of Object.entries(data)) {
      if (key !== '_meta') {
        entries[key] = value;
      }
    }

    return entries;
  } catch (e) {
    return {};
  }
}

/**
 * Get common Biblical Hebrew words to fetch
 */
function getCommonWords() {
  // Core Biblical Hebrew vocabulary - words likely to have Klein entries
  const coreWords = [
    // Creation/Nature
    'אלהים', 'יהוה', 'אדם', 'חוה', 'גן', 'עדן', 'עץ', 'פרי', 'נהר', 'זהב',
    'כסף', 'אבן', 'הר', 'גבעה', 'עמק', 'נחל', 'ים', 'ענן', 'גשם', 'שלג',
    // Body
    'ראש', 'עין', 'אזן', 'פה', 'לשון', 'שן', 'יד', 'רגל', 'לב', 'נפש',
    'רוח', 'בשר', 'עצם', 'דם', 'כתף', 'זרוע', 'אצבע', 'ברך', 'פנים',
    // Family
    'אב', 'אם', 'בן', 'בת', 'אח', 'אחות', 'איש', 'אשה', 'נער', 'נערה',
    'זקן', 'ילד', 'בכור', 'משפחה', 'בית', 'שבט', 'עם', 'גוי',
    // Actions
    'הלך', 'בוא', 'יצא', 'עלה', 'ירד', 'שוב', 'עמד', 'ישב', 'שכב', 'קום',
    'נתן', 'לקח', 'שלח', 'שמע', 'ראה', 'ידע', 'אמר', 'דבר', 'קרא', 'כתב',
    'אכל', 'שתה', 'עשה', 'ברך', 'קדש', 'טהר', 'חטא', 'סלח', 'נשא', 'שמר',
    // Abstract
    'טוב', 'רע', 'חכמה', 'בינה', 'דעת', 'אמת', 'שקר', 'צדק', 'משפט', 'חסד',
    'רחמים', 'אהבה', 'שנאה', 'יראה', 'תקוה', 'שלום', 'מלחמה', 'חיים', 'מות',
    // Religious
    'תורה', 'מצוה', 'חק', 'ברית', 'קרבן', 'עולה', 'זבח', 'כהן', 'לוי', 'נביא',
    'מלך', 'משיח', 'קדוש', 'טמא', 'חול', 'שבת', 'מועד', 'חג', 'פסח',
    // Objects
    'כלי', 'בגד', 'לחם', 'יין', 'שמן', 'מים', 'אש', 'אור', 'חשך', 'ספר',
    'שער', 'דלת', 'חומה', 'מגדל', 'היכל', 'מזבח', 'ארון', 'מנורה', 'שלחן'
  ];

  return coreWords;
}

/**
 * Enrich with BDB etymology data
 */
function enrichWithBDBEtymology(entries) {
  if (!fs.existsSync(BDB_ETYMOLOGY_PATH)) {
    console.log('  BDB etymology not found, skipping...');
    return entries;
  }

  try {
    const bdb = JSON.parse(fs.readFileSync(BDB_ETYMOLOGY_PATH, 'utf8'));
    const bdbEntries = bdb.entries || bdb;

    let enriched = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const bdbEntry = bdbEntries[key];
      if (!bdbEntry) continue;

      // Add cognates
      if (bdbEntry.etymology?.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(bdbEntry.etymology.cognates)) {
          for (const cog of cognates) {
            const word = typeof cog === 'string' ? cog : cog.word;
            if (word) {
              const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
              cognateList.push(`${langName}: ${word}`);
            }
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
          enriched++;
        }
      }

      // Add semantic field
      if (bdbEntry.semanticField && !entry.semanticField) {
        entry.semanticField = bdbEntry.semanticField;
      }
    }

    console.log(`  Enriched ${enriched} entries with BDB etymology`);
    return entries;

  } catch (e) {
    console.log(`  BDB enrichment error: ${e.message}`);
    return entries;
  }
}

/**
 * Enrich with Wiktionary Proto-Semitic data
 */
function enrichWithWiktionary(entries) {
  if (!fs.existsSync(WIKTIONARY_PATH)) {
    console.log('  Wiktionary data not found, skipping...');
    return entries;
  }

  try {
    const wikt = JSON.parse(fs.readFileSync(WIKTIONARY_PATH, 'utf8'));
    const wiktEntries = wikt.entries || wikt;

    let enriched = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const wiktEntry = wiktEntries[key];
      if (!wiktEntry) continue;

      // Add Proto-Semitic
      if (wiktEntry.protoSemitic && !entry.protoSemitic) {
        entry.protoSemitic = wiktEntry.protoSemitic;
        enriched++;
      }

      // Add etymology text
      if (wiktEntry.etymologyText && !entry.etymologyText) {
        entry.etymologyText = wiktEntry.etymologyText;
      }

      // Add cognates if missing
      if (wiktEntry.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(wiktEntry.cognates)) {
          for (const word of cognates) {
            const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
            cognateList.push(`${langName}: ${word}`);
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
        }
      }
    }

    console.log(`  Added Proto-Semitic to ${enriched} entries`);
    return entries;

  } catch (e) {
    console.log(`  Wiktionary enrichment error: ${e.message}`);
    return entries;
  }
}

/**
 * Enrich with root meanings data
 */
function enrichWithRootMeanings(entries) {
  if (!fs.existsSync(ROOT_MEANINGS_PATH)) {
    console.log('  Root meanings not found, skipping...');
    return entries;
  }

  try {
    const rootData = JSON.parse(fs.readFileSync(ROOT_MEANINGS_PATH, 'utf8'));
    const rootEntries = rootData.entries || rootData;

    let enriched = 0;

    for (const [key, entry] of Object.entries(entries)) {
      const rootEntry = rootEntries[key];
      if (!rootEntry) continue;

      // Add root
      if (rootEntry.root && !entry.root) {
        entry.root = rootEntry.root;
        enriched++;
      }

      // Add cognates if missing
      if (rootEntry.cognates && !entry.cognates) {
        const cognateList = [];
        for (const [lang, cognates] of Object.entries(rootEntry.cognates)) {
          if (Array.isArray(cognates)) {
            for (const cog of cognates) {
              const word = typeof cog === 'string' ? cog : cog.word;
              if (word) {
                const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                cognateList.push(`${langName}: ${word}`);
              }
            }
          }
        }
        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
        }
      }

      // Add semantic field
      if (rootEntry.semanticField && !entry.semanticField) {
        entry.semanticField = rootEntry.semanticField;
      }

      // Add Proto-Semitic
      if (rootEntry.protoSemitic && !entry.protoSemitic) {
        entry.protoSemitic = rootEntry.protoSemitic;
      }
    }

    console.log(`  Added root info to ${enriched} entries`);
    return entries;

  } catch (e) {
    console.log(`  Root meanings error: ${e.message}`);
    return entries;
  }
}

/**
 * Import entries from Gesenius that Klein doesn't have
 */
function importFromGesenius(entries) {
  if (!fs.existsSync(GESENIUS_PATH)) {
    console.log('  Gesenius not found, skipping...');
    return entries;
  }

  try {
    const gesenius = JSON.parse(fs.readFileSync(GESENIUS_PATH, 'utf8'));
    let imported = 0;
    let enriched = 0;

    for (const [key, gEntry] of Object.entries(gesenius)) {
      if (key === '_meta') continue;

      // If we already have it, enrich with missing data
      if (entries[key]) {
        if (gEntry.cognates && !entries[key].cognates) {
          entries[key].cognates = gEntry.cognates;
          enriched++;
        }
        if (gEntry.protoSemitic && !entries[key].protoSemitic) {
          entries[key].protoSemitic = gEntry.protoSemitic;
        }
        if (gEntry.semanticField && !entries[key].semanticField) {
          entries[key].semanticField = gEntry.semanticField;
        }
        if (gEntry.strong && !entries[key].strong) {
          entries[key].strong = gEntry.strong;
        }
        continue;
      }

      // Import ALL Gesenius entries with definitions (not just etymology-rich)
      if (gEntry.definition || gEntry.gloss) {
        entries[key] = {
          lemma: gEntry.lemma,
          key: key,
          pos: gEntry.pos,
          definition: gEntry.gloss || gEntry.definition?.substring(0, 150),
          source: gEntry.cognates ? 'Klein/Gesenius' : 'Gesenius',
          strong: gEntry.strong,
          transliteration: gEntry.transliteration
        };

        // Add etymology data if available
        if (gEntry.cognates) entries[key].cognates = gEntry.cognates;
        if (gEntry.protoSemitic) entries[key].protoSemitic = gEntry.protoSemitic;
        if (gEntry.etymologyText) entries[key].etymologyText = gEntry.etymologyText;
        if (gEntry.semanticField) entries[key].semanticField = gEntry.semanticField;
        if (gEntry.root) entries[key].root = gEntry.root;

        imported++;
      }
    }

    console.log(`  Imported ${imported} entries from Gesenius`);
    console.log(`  Enriched ${enriched} existing entries`);
    return entries;

  } catch (e) {
    console.log(`  Gesenius import error: ${e.message}`);
    return entries;
  }
}

/**
 * Add Strong's numbers where missing
 */
function addStrongsNumbers(entries) {
  if (!fs.existsSync(STRONGS_PATH)) {
    console.log('  Strong\'s data not found, skipping...');
    return entries;
  }

  try {
    const strongs = JSON.parse(fs.readFileSync(STRONGS_PATH, 'utf8'));
    const strongsEntries = strongs.byWord || strongs.byStrong || strongs;

    let added = 0;

    for (const [key, entry] of Object.entries(entries)) {
      if (entry.strong) continue;

      if (strongsEntries[key]) {
        const sEntry = strongsEntries[key];
        if (sEntry.strongs) {
          entry.strong = sEntry.strongs;
          added++;
        }
        if (sEntry.xlit && !entry.transliteration) {
          entry.transliteration = sEntry.xlit;
        }
      }
    }

    console.log(`  Added Strong's numbers to ${added} entries`);
    return entries;

  } catch (e) {
    console.log(`  Strong's error: ${e.message}`);
    return entries;
  }
}

/**
 * Main build function
 */
async function buildKleinLexicon() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       Klein Hebrew Lexicon Enhancer                           ║');
  console.log('║       Etymology-focused enhancement                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load existing entries
  console.log('1. Loading existing Klein entries...');
  let entries = loadExisting();
  console.log(`   Found ${Object.keys(entries).length} existing entries`);

  // Fetch from Sefaria for common words
  console.log('\n2. Fetching Klein data from Sefaria API...');
  const commonWords = getCommonWords();
  let fetched = 0;

  for (const word of commonWords) {
    if (entries[word]) continue; // Already have it

    const sefariaData = await fetchSefariaWord(word);
    if (sefariaData) {
      const kleinEntry = extractKleinData(sefariaData, word);
      if (kleinEntry) {
        entries[word] = kleinEntry;
        fetched++;
        process.stdout.write(`\r   Fetched: ${fetched} new entries`);
      }
    }

    await sleep(DELAY_MS);
  }
  console.log(`\n   Total new entries from Sefaria: ${fetched}`);

  // Import etymology-rich entries from Gesenius
  console.log('\n3. Importing etymology entries from Gesenius...');
  entries = importFromGesenius(entries);

  // Enrich with BDB etymology
  console.log('\n4. Enriching with BDB etymology data...');
  entries = enrichWithBDBEtymology(entries);

  // Enrich with Wiktionary Proto-Semitic
  console.log('\n5. Adding Proto-Semitic reconstructions...');
  entries = enrichWithWiktionary(entries);

  // Enrich with root meanings
  console.log('\n6. Adding root meanings...');
  entries = enrichWithRootMeanings(entries);

  // Add Strong's numbers
  console.log('\n7. Adding Strong\'s numbers...');
  entries = addStrongsNumbers(entries);

  // Count stats
  const entryCount = Object.keys(entries).length;
  const withCognates = Object.values(entries).filter(e => e.cognates).length;
  const withProtoSemitic = Object.values(entries).filter(e => e.protoSemitic).length;
  const withEtymology = Object.values(entries).filter(e => e.etymology || e.etymologyText).length;
  const withSemanticField = Object.values(entries).filter(e => e.semanticField).length;
  const withStrongs = Object.values(entries).filter(e => e.strong).length;

  // Build output
  const output = {
    _meta: {
      name: 'Klein',
      fullName: "Klein's Etymological Dictionary of Hebrew (Enhanced)",
      author: 'Ernest Klein (enhanced with public sources)',
      year: 1987,
      publisher: 'Carta Jerusalem',
      description: 'Etymology-focused Hebrew dictionary enhanced with Proto-Semitic reconstructions and cognate data',
      entries: entryCount,
      tier: 2,
      status: 'PRO_ENHANCED',
      note: 'Enhanced excerpt combining Klein data with BDB, Wiktionary, and comparative Semitic sources',
      sources: ['Klein Dictionary', 'Sefaria API', 'BDB Etymology', 'Wiktionary Proto-Semitic', 'Gesenius'],
      license: 'Mixed: Klein (Carta Jerusalem), BDB (Public Domain), Wiktionary (CC-BY-SA)',
      scholarlyData: {
        entriesWithCognates: withCognates,
        entriesWithProtoSemitic: withProtoSemitic,
        entriesWithEtymology: withEtymology,
        entriesWithSemanticField: withSemanticField,
        entriesWithStrongs: withStrongs
      },
      builtAt: new Date().toISOString()
    },
    ...entries
  };

  // Write output
  console.log(`\n8. Writing ${entryCount} entries to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ✅ Klein Lexicon Enhancement Complete!                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal entries: ${entryCount}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  console.log('\nScholarly enrichment:');
  console.log(`  Entries with cognates:      ${withCognates}`);
  console.log(`  Entries with Proto-Semitic: ${withProtoSemitic}`);
  console.log(`  Entries with etymology:     ${withEtymology}`);
  console.log(`  Entries with semantic field:${withSemanticField}`);
  console.log(`  Entries with Strong's:      ${withStrongs}`);

  // Sample
  console.log('\nSample entries:');
  const sampleKeys = ['אב', 'בן', 'ברא'].filter(k => entries[k]);
  for (const key of sampleKeys) {
    const e = entries[key];
    console.log(`  ${key}: ${e.definition?.substring(0, 50)}...`);
    if (e.cognates) console.log(`    Cognates: ${e.cognates.slice(0,2).join(', ')}`);
    if (e.protoSemitic) console.log(`    Proto-Semitic: ${e.protoSemitic}`);
  }

  return output;
}

// Run
if (require.main === module) {
  buildKleinLexicon().catch(console.error);
}

module.exports = { buildKleinLexicon };
