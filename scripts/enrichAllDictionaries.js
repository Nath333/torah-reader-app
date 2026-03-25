/**
 * Cross-Enrich All Dictionaries
 * Adds Strong's numbers, cognates, roots to BDB, Jastrow, Strong's, CAL
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');

// Helper to strip niqqud for matching
function cleanKey(word) {
  return (word || '').replace(/[\u0591-\u05C7]/g, '').trim();
}

async function enrichAllDictionaries() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║              CROSS-ENRICHMENT OF ALL DICTIONARIES                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  // Load enrichment sources
  console.log('Loading enrichment sources...');

  // 1. Strong's for Strong numbers (note: byStrongs with 's', field is 'strongs')
  const strongsPath = path.join(DATA_DIR, 'strongsComplete.json');
  const strongs = JSON.parse(fs.readFileSync(strongsPath, 'utf8'));
  const strongsByWord = strongs.byWord || {};
  const strongsByNum = strongs.byStrongs || {}; // Note: byStrongs (with 's')
  console.log(`  Strong's: ${Object.keys(strongsByWord).length} by word, ${Object.keys(strongsByNum).length} by number`);

  // Build reverse lookup: Hebrew word -> Strong's number (from byWord entries)
  const wordToStrong = {};
  for (const [word, entry] of Object.entries(strongsByWord)) {
    const key = cleanKey(word);
    const strongNum = entry.strongs || entry.strong || entry.strongNumber;
    if (key && strongNum && !wordToStrong[key]) {
      wordToStrong[key] = strongNum;
    }
  }
  console.log(`  Word-to-Strong mapping: ${Object.keys(wordToStrong).length} entries`);

  // 2. Root meanings (nested under 'entries')
  const rootPath = path.join(DATA_DIR, 'root_meanings_pro.json');
  let rootData = {};
  if (fs.existsSync(rootPath)) {
    const rootFile = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
    rootData = rootFile.entries || rootFile;
    console.log(`  Root meanings: ${Object.keys(rootData).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 3. Etymology data (nested under 'entries')
  const etymPath = path.join(DATA_DIR, 'etymology_unified_pro.json');
  let etymData = {};
  if (fs.existsSync(etymPath)) {
    const etymFile = JSON.parse(fs.readFileSync(etymPath, 'utf8'));
    etymData = etymFile.entries || etymFile;
    console.log(`  Etymology unified: ${Object.keys(etymData).filter(k => !k.startsWith('_')).length} entries`);
  }

  // 4. BDB etymology
  const bdbEtymPath = path.join(DATA_DIR, 'etymology_bdb_extracted.json');
  let bdbEtymData = {};
  if (fs.existsSync(bdbEtymPath)) {
    bdbEtymData = JSON.parse(fs.readFileSync(bdbEtymPath, 'utf8'));
    const bdbEntries = bdbEtymData.entries || bdbEtymData;
    console.log(`  BDB etymology: ${Object.keys(bdbEntries).length} entries`);
  }

  // Process each dictionary
  const dictionaries = [
    { name: 'BDB', file: 'bdbComplete.json', structure: 'byWord' },
    { name: 'Jastrow', file: 'jastrowComplete.json', structure: 'byWord' },
    { name: 'Strong\'s', file: 'strongsComplete.json', structure: 'byWord' },
    { name: 'CAL', file: 'cal_aramaic.json', structure: 'flat' }
  ];

  for (const dict of dictionaries) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Enriching ${dict.name}...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const filePath = path.join(DATA_DIR, dict.file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Get entries based on structure
    let entries;
    if (dict.structure === 'byWord') {
      entries = data.byWord || data;
    } else {
      entries = data;
    }

    let strongsAdded = 0, cognatesAdded = 0, rootsAdded = 0, semanticAdded = 0;

    for (const [word, entry] of Object.entries(entries)) {
      if (word.startsWith('_')) continue;

      const key = cleanKey(word);
      if (!key) continue;

      // 1. Add Strong's number if missing (check all variants)
      if (!entry.strong && !entry.strongs && !entry.strongNumber && wordToStrong[key]) {
        entry.strongs = wordToStrong[key];
        strongsAdded++;
      }

      // 2. Add root if missing
      const rootEntry = rootData[key];
      if (rootEntry && !entry.root) {
        if (rootEntry.root) {
          entry.root = rootEntry.root;
          rootsAdded++;
        }
      }

      // 3. Add cognates if missing
      if (!entry.cognates || entry.cognates.length === 0) {
        let cognateList = [];

        // Try etymology unified
        const etymEntry = etymData[key];
        if (etymEntry?.cognates) {
          for (const [lang, cogs] of Object.entries(etymEntry.cognates)) {
            if (Array.isArray(cogs)) {
              for (const cog of cogs.slice(0, 2)) {
                const cogWord = typeof cog === 'string' ? cog : cog.word;
                if (cogWord) {
                  const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                  cognateList.push(`${langName}: ${cogWord}`);
                }
              }
            }
          }
        }

        // Try BDB etymology
        const bdbEntries = bdbEtymData.entries || bdbEtymData;
        const bdbEntry = bdbEntries[key];
        if (bdbEntry?.etymology?.cognates && cognateList.length === 0) {
          for (const [lang, cogs] of Object.entries(bdbEntry.etymology.cognates)) {
            if (Array.isArray(cogs)) {
              for (const cog of cogs.slice(0, 2)) {
                const cogWord = typeof cog === 'string' ? cog : cog.word;
                if (cogWord) {
                  const langName = lang.charAt(0).toUpperCase() + lang.slice(1);
                  cognateList.push(`${langName}: ${cogWord}`);
                }
              }
            }
          }
        }

        if (cognateList.length > 0) {
          entry.cognates = cognateList.slice(0, 6);
          cognatesAdded++;
        }
      }

      // 4. Add semantic field if missing
      if (!entry.semanticField) {
        const etymEntry = etymData[key] || rootData[key];
        if (etymEntry?.semanticField) {
          entry.semanticField = etymEntry.semanticField;
          semanticAdded++;
        }
      }

      // 5. Add Proto-Semitic if missing
      if (!entry.protoSemitic) {
        const etymEntry = etymData[key];
        if (etymEntry?.protoSemitic) {
          entry.protoSemitic = etymEntry.protoSemitic;
        }
      }
    }

    // Update metadata
    if (data._meta) {
      data._meta.enrichedAt = new Date().toISOString();
      data._meta.crossEnriched = {
        strongsAdded,
        cognatesAdded,
        rootsAdded,
        semanticAdded
      };
    }

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`  Strong's added:    ${strongsAdded}`);
    console.log(`  Cognates added:    ${cognatesAdded}`);
    console.log(`  Roots added:       ${rootsAdded}`);
    console.log(`  Semantic added:    ${semanticAdded}`);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    CROSS-ENRICHMENT COMPLETE                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
}

enrichAllDictionaries().catch(console.error);
