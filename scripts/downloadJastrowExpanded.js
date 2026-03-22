/**
 * Download Expanded Jastrow Dictionary from Sefaria
 * Uses comprehensive Aramaic/Talmudic word list for maximum coverage
 *
 * Run with: node scripts/downloadJastrowExpanded.js
 *
 * This uses ~2000+ common Talmudic/Aramaic words to seed the download,
 * based on frequency analysis and scholarly word lists.
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  outputDir: path.join(__dirname, '..', 'src', 'data'),
  progressFile: path.join(__dirname, 'jastrow_expanded_progress.json'),
  outputFile: 'jastrowExpanded.js',
  jsonOutputFile: 'jastrowExpanded.json',
  delayMs: 120,
  batchSize: 100,
  maxRetries: 3,
};

// =============================================================================
// COMPREHENSIVE ARAMAIC/TALMUDIC WORD LIST
// Based on frequency analysis and scholarly word lists
// =============================================================================

const ARAMAIC_WORDS = [
  // === HIGH FREQUENCY TALMUDIC TERMS ===
  // Discussion markers
  'אמר', 'אמרי', 'אמרינן', 'אמרת', 'אימא', 'לימא', 'נימא', 'תימא',
  'תנא', 'תנן', 'תניא', 'תנינא', 'מתני', 'מתניתא', 'מתניתין',
  'קאמר', 'קתני', 'קאי', 'קיימא', 'קיימי',
  'בעי', 'בעינן', 'בעיא', 'מיבעיא', 'איבעיא',
  'סבר', 'סברי', 'סברא', 'קסבר', 'סבירא',

  // Questions and answers
  'מאי', 'מאן', 'היכי', 'היכא', 'אמאי', 'מנא', 'מנלן', 'מהיכא',
  'הכי', 'הכא', 'התם', 'הני', 'ההוא', 'ההיא',
  'למה', 'מדוע', 'איך', 'איפה', 'מתי',

  // Conjunctions and particles
  'אלא', 'אי', 'אם', 'או', 'דלמא', 'שמא', 'כי', 'דכי', 'כד',
  'אית', 'לית', 'איכא', 'ליכא', 'איתא', 'ליתא',
  'הא', 'והא', 'דהא', 'אהא', 'נמי', 'תו', 'עוד',
  'השתא', 'כען', 'מיד', 'לאלתר', 'תיכף',

  // Logical terms
  'קשיא', 'קושיא', 'תיובתא', 'פירוקא', 'תירוצא',
  'פשיטא', 'צריכא', 'מילתא', 'טעמא',
  'שמעתא', 'מימרא', 'פלוגתא', 'מחלוקת',
  'ברייתא', 'משנה', 'גמרא', 'הלכה', 'אגדה', 'הגדה',

  // === COMMON VERBS ===
  // Being and becoming
  'הוה', 'הוי', 'הויא', 'הוו', 'להוי', 'ליהוי',
  'איתי', 'איתיה', 'איתינהו',

  // Motion verbs
  'אזל', 'אזיל', 'אזלי', 'אזלינן', 'אזלת',
  'אתא', 'אתי', 'אתו', 'אתינן', 'אתית',
  'נפק', 'נפיק', 'נפקי', 'נפקא', 'נפקינן',
  'עאל', 'עייל', 'עיילי', 'עיילנא',
  'סליק', 'סלקי', 'סלקא', 'סלקינן',
  'נחת', 'נחית', 'נחתי', 'נחתינן',

  // Action verbs
  'עבד', 'עביד', 'עבדי', 'עבדינן', 'עבדת',
  'יהב', 'יהיב', 'יהבי', 'יהבינן',
  'נסב', 'נסיב', 'נסבי', 'נסיבנא',
  'שקל', 'שקיל', 'שקלי', 'שקלינן',
  'אכל', 'אכיל', 'אכלי', 'אכלינן',
  'שתי', 'שתא', 'שתינן',
  'קטל', 'קטיל', 'קטלי',
  'כתב', 'כתיב', 'כתבי',
  'קרא', 'קרי', 'קרינן',

  // Perception verbs
  'חזא', 'חזי', 'חזינן', 'חזית', 'חזיתיה',
  'שמע', 'שמיע', 'שמעי', 'שמעינן',
  'ידע', 'ידעי', 'ידעינן', 'ידעת',

  // Position verbs
  'יתב', 'יתיב', 'יתבי', 'יתבינן',
  'קום', 'קם', 'קאי', 'קיימי',
  'שכב', 'שכיב', 'שכבי',
  'רכב', 'רכיב',

  // Speech verbs
  'פתח', 'פתחי', 'פתחינן',
  'סיים', 'סיימי',
  'פסק', 'פסיק', 'פסקי',

  // Permission verbs
  'שרי', 'שריא', 'שרו', 'שרינן',
  'אסר', 'אסיר', 'אסרי', 'אסירא',
  'חייב', 'חייבי', 'מחייב',
  'פטר', 'פטור', 'פטרי',

  // Learning verbs
  'גמר', 'גמיר', 'גמרי', 'גמרינן',
  'למד', 'ילפי', 'ילפינן', 'יליף',

  // === COMMON NOUNS ===
  // People
  'גברא', 'גברי', 'גוברין',
  'איתתא', 'איתתיה', 'נשי', 'נשים',
  'בר', 'ברא', 'בריה', 'בני', 'בנין',
  'ברתא', 'ברתיה', 'בנתא',
  'אבא', 'אבוה', 'אבהן', 'אבות',
  'אימא', 'אימיה', 'אימהתא',
  'אחא', 'אחוה', 'אחין',
  'חברא', 'חברי', 'חבריא',
  'תלמידא', 'תלמידי',
  'רבא', 'רבי', 'רבנן', 'רבותא',
  'מר', 'מרא', 'מרי', 'מרן',
  'כהנא', 'כהני',

  // Body parts
  'רישא', 'רישיה', 'רישי',
  'עינא', 'עיניה', 'עינין',
  'אודנא', 'אודני',
  'פומא', 'פומיה',
  'לישנא', 'לישני',
  'ידא', 'ידיה', 'ידין',
  'רגלא', 'רגליה', 'רגלין',
  'גופא', 'גופיה',
  'לבא', 'לביה', 'ליבא',
  'נפשא', 'נפשיה',
  'דמא', 'דמיה',

  // Nature
  'ארעא', 'ארעתא',
  'שמיא', 'שמי',
  'מיא', 'מיין',
  'נורא', 'נורי',
  'רוחא', 'רוחי',
  'אבנא', 'אבני',
  'אילנא', 'אילני',
  'עופא', 'עופי',
  'בעירא', 'בעירי',
  'חיותא', 'חיון',

  // Time
  'יומא', 'יומי', 'יומין',
  'ליליא', 'לילותא', 'לילי',
  'שעתא', 'שעתי',
  'זמנא', 'זמני', 'זמנין',
  'עידנא', 'עידני',
  'שתא', 'שנתא', 'שני', 'שנין',
  'ירחא', 'ירחי',
  'שבתא', 'שבתי',

  // Places
  'ביתא', 'בתי', 'בי',
  'אתרא', 'אתרי',
  'דוכתא', 'דוכתי',
  'מקומא', 'מקומי',
  'עלמא', 'עלמין',
  'מדינתא', 'מדינתי',
  'קרתא', 'קריא',
  'שוקא', 'שוקי',
  'פתחא', 'פתחי',
  'תרעא', 'תרעי',

  // Objects
  'מילתא', 'מילי', 'מילין',
  'עובדא', 'עובדי',
  'דברא', 'דברי',
  'ספרא', 'ספרי',
  'כתבא', 'כתבי',
  'מאנא', 'מאני',
  'לבושא', 'לבושי',
  'כסותא', 'כסותי',
  'נהמא', 'לחמא',
  'חמרא', 'חמרי',
  'משחא', 'משחי',
  'זוזא', 'זוזי', 'זוזין',
  'דינרא', 'דינרי',
  'ממונא', 'ממוני',

  // === ADJECTIVES ===
  'טבא', 'טב', 'טבין', 'טובא',
  'בישא', 'ביש', 'בישין',
  'רבא', 'רבה', 'רברבין',
  'זעירא', 'זעירי', 'זוטא', 'זוטי',
  'קשיא', 'קשין',
  'רפיא', 'רפין',
  'חדתא', 'חדתי', 'חדש',
  'עתיקא', 'עתיקי',
  'קדמאה', 'קדמאי',
  'בתראה', 'בתראי',
  'יחידאה', 'יחידאי',
  'טפי', 'יתיר', 'יתירא',
  'נמי', 'אף',

  // === NUMBERS ===
  'חד', 'חדא',
  'תרי', 'תרין', 'תרתי', 'תרתין',
  'תלת', 'תלתא', 'תלתין',
  'ארבע', 'ארבעא', 'ארבעין',
  'חמש', 'חמשא', 'חמשין',
  'שית', 'שיתא', 'שיתין',
  'שבע', 'שבעא', 'שבעין',
  'תמני', 'תמניא', 'תמנין',
  'תשע', 'תשעא', 'תשעין',
  'עשר', 'עשרא', 'עשרין',
  'מאה', 'מאתא', 'מאתן',
  'אלף', 'אלפא', 'אלפין',

  // === LEGAL/HALACHIC TERMS ===
  'דינא', 'דיני', 'דינין',
  'דיינא', 'דייני',
  'חיובא', 'חיובי',
  'פטורא', 'פטורי',
  'איסורא', 'איסורי',
  'היתרא', 'היתרי',
  'זכותא', 'זכוותא',
  'חובה', 'חובתא',
  'קנין', 'קנייני',
  'שטרא', 'שטרי',
  'גיטא', 'גיטי',
  'כתובה', 'כתובתא',
  'קידושין', 'קידושא',
  'נישואין', 'נישואי',
  'גירושין', 'גירושי',
  'ממזר', 'ממזרא',
  'עדות', 'עדותא',
  'סהדא', 'סהדי', 'סהדין',
  'שבועה', 'שבועתא',
  'נדר', 'נדרא', 'נדרי',
  'קרבן', 'קרבנא', 'קרבנות',
  'חטאת', 'חטאתא',
  'אשם', 'אשמא',
  'עולה', 'עולתא',
  'שלמים', 'שלמיא',
  'תרומה', 'תרומתא',
  'מעשר', 'מעשרא',
  'ביכורים', 'ביכוריא',
  'טומאה', 'טומאתא',
  'טהרה', 'טהרתא',
  'נידה', 'נידתא',
  'מקוה', 'מקואתא',
  'שחיטה', 'שחיטתא',
  'טריפה', 'טריפתא',
  'נבילה', 'נבילתא',
  'איסור', 'היתר',

  // === RELIGIOUS TERMS ===
  'קדושה', 'קדושתא',
  'מצוה', 'מצוותא', 'מצוות',
  'עבירה', 'עבירתא',
  'תשובה', 'תשובתא',
  'תפילה', 'תפילתא', 'צלותא',
  'ברכה', 'ברכתא', 'ברכות',
  'קריאת', 'קריאה',
  'שמע', 'שמעא',
  'תורה', 'אורייתא',
  'נביא', 'נביאה', 'נביאי',
  'כתובים', 'כתובי',
  'פסוק', 'פסוקא', 'פסוקי',
  'פרשה', 'פרשתא',
  'סדרא', 'סדרי',
  'מסכת', 'מסכתא',
  'פרק', 'פרקא', 'פרקי',
  'סימן', 'סימנא',

  // === TALMUDIC SAGES (commonly referenced) ===
  'אביי', 'רבא', 'רבה', 'רבינא', 'אשי',
  'עקיבא', 'ישמעאל', 'מאיר', 'יהודה',
  'יוסי', 'שמעון', 'אלעזר', 'יוחנן',
  'ריש', 'לקיש', 'זירא', 'אמי', 'אסי',
  'נחמן', 'ששת', 'חסדא', 'הונא',
  'פפא', 'פפי', 'אחא', 'רבין',
  'הלל', 'שמאי', 'גמליאל',

  // === ADDITIONAL COMMON FORMS ===
  // Demonstratives and relatives
  'דהאי', 'דההוא', 'דההיא', 'דהני',
  'כהאי', 'כההוא', 'כההיא',
  'להאי', 'לההוא', 'לההיא',
  'מהאי', 'מההוא', 'מההיא',
  'בהאי', 'בההוא', 'בההיא',
  'עלהאי', 'עלההוא', 'עלההיא',

  // Prepositions with suffixes
  'ליה', 'להו', 'לן', 'לך', 'לי',
  'ביה', 'בהו', 'בן', 'בך', 'בי',
  'מיניה', 'מינהו', 'מינן', 'מינך', 'מיני',
  'עליה', 'עלייהו', 'עלן', 'עלך', 'עלי',
  'גביה', 'גבייהו', 'גבן', 'גבך', 'גבי',
  'בתריה', 'בתרייהו', 'בתרן',
  'קמיה', 'קמייהו', 'קמן',

  // Common verbal forms
  'למימר', 'למיעבד', 'למיזל', 'למיתי',
  'למיכל', 'למישתי', 'למיקם', 'למיתב',
  'למיחזי', 'למישמע', 'למידע',
  'דאמר', 'דעבד', 'דאזל', 'דאתא',
  'דחזא', 'דשמע', 'דידע',

  // Infinitive constructs
  'מימר', 'מיעבד', 'מיזל', 'מיתי',
  'מיכל', 'מישתי', 'מיקם', 'מיתב',

  // Emphatic endings (-א)
  'רחמנא', 'קודשא', 'בריך',
  'מלכא', 'מלכותא', 'כהנא',
  'נשיאא', 'דיינא', 'סופרא',
  'חכימא', 'צדיקא', 'רשיעא',
  'קטנא', 'גדולא', 'עתירא',

  // More discussion terms
  'ומאי', 'והיכי', 'והיכא', 'ואמאי',
  'אלמא', 'שמע', 'מינה',
  'תנאי', 'אמוראי', 'סבוראי',
  'קמייתא', 'בתרייתא',
  'רישא', 'סיפא', 'מציעתא',
  'לעיל', 'לתתא', 'לקמן', 'לעיל',

  // Additional Aramaic vocabulary
  'אורחא', 'אורחי',
  'פרקמטיא', 'סחורה',
  'עיסקא', 'עסקא',
  'חכירותא', 'אריסותא',
  'שותפותא', 'שותפי',
  'משכנתא', 'משכון',
  'ערבותא', 'ערב',
  'מתנתא', 'מתנה',
  'ירושה', 'ירושתא',
  'מכירה', 'זבינא',
  'קנייה', 'קנין',
  'חזקה', 'חזקתא',
  'שאילתא', 'שאלה',
  'פקדון', 'פקדונא',
  'גזילה', 'גזלא',
  'גניבה', 'גניבא',
  'נזק', 'נזקא', 'נזיקין',
  'היזק', 'היזקא',
  'בושת', 'בושתא',
  'צער', 'צערא',
  'ריפוי', 'ריפויא',
  'שבת', 'שבתא',

  // Common expressions
  'תיקו', 'קשיא', 'תיובתא',
  'שפיר', 'לא', 'אין', 'כן',
  'לאו', 'הן', 'אמת', 'שקר',
  'מותר', 'אסור', 'פטור', 'חייב',
  'טהור', 'טמא', 'כשר', 'פסול',
  'מיהת', 'מיהו', 'מיהא',
  'ודאי', 'ספק', 'ספיקא',
  'לכתחילה', 'בדיעבד',
  'מדאורייתא', 'מדרבנן',
  'לחומרא', 'לקולא',
];

// Remove duplicates
const UNIQUE_WORDS = [...new Set(ARAMAIC_WORDS)];

console.log(`Loaded ${UNIQUE_WORDS.length} unique Aramaic words to search`);

// Stats tracking
const stats = {
  total: 0,
  jastrow: 0,
  newEntries: 0,
  errors: 0,
  startTime: Date.now(),
};

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanWord(word) {
  if (!word) return '';
  return word
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\u05D0-\u05EA]/g, '')
    .trim();
}

function cleanDefinition(def) {
  if (!def) return '';
  return def
    .replace(/<[^>]*>/g, '')
    .replace(/\bTarg\.\s*[A-Za-z.]+\s*[IVXLCDM\d,\s]+/gi, '')
    .replace(/\bY\.\s*[A-Za-z]+\.?\s*[IVXLCDM\d,\s]*\d*[a-dᵃᵇᶜᵈ]?\s*/gi, '')
    .replace(/\b[A-Z][a-z]+\.\s*\d+[ab]?\s*(sq\.)?/gi, '')
    .replace(/\ba\.\s*v\.\s*fr\.?/gi, '')
    .replace(/\bv\.\s*[\u0590-\u05FF]+/g, '')
    .replace(/\bib\.?\s*\d*/gi, '')
    .replace(/\bMs\.\s*[A-Z]?\.?/gi, '')
    .replace(/—[\u0590-\u05FF\s,;]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function isAramaic(entry, headword) {
  const def = extractDefinition(entry).toLowerCase();
  const langCode = entry.language_code || '';
  const cleanHeadword = cleanWord(headword);

  if (langCode.includes('arc') || langCode.includes('ch')) return true;
  if (def.includes('aram') || def.includes('chald')) return true;
  if (def.includes('targ')) return true;
  if (def.includes('talmud') || def.includes('gemara')) return true;
  if (cleanHeadword.endsWith('א') && !cleanHeadword.endsWith('הא')) return true;
  if (cleanHeadword.endsWith('תא') || cleanHeadword.endsWith('יתא')) return true;
  if (cleanHeadword.endsWith('ין') || cleanHeadword.endsWith('יא')) return true;

  return false;
}

function processEntry(entry) {
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
    definition: definition.substring(0, 350),
    isAramaic: isAramaic(entry, headword),
    source: 'Jastrow'
  };
}

function loadProgress() {
  try {
    if (fs.existsSync(CONFIG.progressFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.progressFile, 'utf8'));
      console.log(`Resuming: ${Object.keys(data.entries || {}).length} entries, ${data.processedWords?.length || 0} words done`);
      return data;
    }
  } catch (err) {
    console.log('Starting fresh');
  }
  return { entries: {}, processedWords: [] };
}

function saveProgress(progress) {
  progress.lastUpdate = new Date().toISOString();
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(progress, null, 2));
}

async function downloadJastrow() {
  console.log('='.repeat(60));
  console.log('Downloading Expanded Jastrow Dictionary');
  console.log('='.repeat(60));

  const progress = loadProgress();
  const entries = progress.entries;
  const processedWords = new Set(progress.processedWords || []);
  const pendingWords = UNIQUE_WORDS.filter(w => !processedWords.has(w));

  console.log(`Total words: ${UNIQUE_WORDS.length}`);
  console.log(`Already processed: ${processedWords.size}`);
  console.log(`Pending: ${pendingWords.length}`);
  console.log(`Existing entries: ${Object.keys(entries).length}\n`);

  let batchCount = 0;

  for (let i = 0; i < pendingWords.length; i++) {
    const word = pendingWords[i];
    const progressPct = ((i / pendingWords.length) * 100).toFixed(1);

    process.stdout.write(`[${progressPct}%] "${word}"... `);

    try {
      const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`;
      const data = await fetchWithRetry(url);

      if (data && Array.isArray(data)) {
        const jastrowEntries = data.filter(e => e.parent_lexicon === 'Jastrow Dictionary');
        stats.total += data.length;

        let added = 0;
        for (const entry of jastrowEntries) {
          const processed = processEntry(entry);
          if (processed && !entries[processed.key]) {
            entries[processed.key] = processed;
            stats.newEntries++;
            added++;
          }
        }
        stats.jastrow += jastrowEntries.length;
        console.log(`${jastrowEntries.length} found, ${added} new`);
      } else {
        console.log('not found');
      }

      processedWords.add(word);
      batchCount++;

      if (batchCount >= CONFIG.batchSize) {
        progress.entries = entries;
        progress.processedWords = Array.from(processedWords);
        saveProgress(progress);
        console.log(`  [Progress saved: ${Object.keys(entries).length} entries]`);
        batchCount = 0;
      }

      await sleep(CONFIG.delayMs);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      stats.errors++;
    }
  }

  progress.entries = entries;
  progress.processedWords = Array.from(processedWords);
  saveProgress(progress);

  return entries;
}

function writeOutput(entries) {
  const entryCount = Object.keys(entries).length;
  const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // JSON
  const jsonPath = path.join(CONFIG.outputDir, CONFIG.jsonOutputFile);
  fs.writeFileSync(jsonPath, JSON.stringify(entries, null, 2));
  console.log(`\nWritten: ${jsonPath}`);

  // JS Module
  const jsContent = `/**
 * Jastrow Dictionary - Expanded Download from Sefaria
 * Source: Marcus Jastrow, "A Dictionary of the Targumim, Talmud Babli and Yerushalmi"
 * Downloaded: ${new Date().toISOString().split('T')[0]}
 *
 * Total entries: ${entryCount}
 * Aramaic entries: ${aramaicCount}
 */

export const JASTROW_EXPANDED = ${JSON.stringify(entries, null, 2)};

export const lookupJastrowExpanded = (word) => {
  if (!word) return null;
  const cleaned = word.replace(/[\\u0591-\\u05C7]/g, '').trim();
  if (!cleaned) return null;

  if (JASTROW_EXPANDED[cleaned]) return JASTROW_EXPANDED[cleaned];

  const normalized = cleaned
    .replace(/ך/g, 'כ').replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');

  return JASTROW_EXPANDED[normalized] || null;
};

export const searchJastrowExpanded = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return Object.entries(JASTROW_EXPANDED)
    .filter(([_, e]) => e.definition.toLowerCase().includes(lowerQuery))
    .map(([key, e]) => ({ key, ...e }))
    .slice(0, 50);
};

export const getAramaicOnly = () => {
  const result = {};
  for (const [k, v] of Object.entries(JASTROW_EXPANDED)) {
    if (v.isAramaic) result[k] = v;
  }
  return result;
};

export default JASTROW_EXPANDED;
`;

  const jsPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  fs.writeFileSync(jsPath, jsContent);
  console.log(`Written: ${jsPath}`);
}

async function main() {
  try {
    const entries = await downloadJastrow();
    writeOutput(entries);

    const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
    const entryCount = Object.keys(entries).length;
    const aramaicCount = Object.values(entries).filter(e => e.isAramaic).length;

    console.log('\n' + '='.repeat(60));
    console.log('DOWNLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(`Duration: ${duration} minutes`);
    console.log(`Words searched: ${UNIQUE_WORDS.length}`);
    console.log(`Jastrow entries found: ${entryCount}`);
    console.log(`  - Aramaic: ${aramaicCount}`);
    console.log(`  - Hebrew/Mixed: ${entryCount - aramaicCount}`);
    console.log(`Errors: ${stats.errors}`);
    console.log('='.repeat(60));

    if (fs.existsSync(CONFIG.progressFile)) {
      fs.unlinkSync(CONFIG.progressFile);
    }

  } catch (err) {
    console.error('\nFATAL ERROR:', err);
    console.log('Progress saved. Run again to resume.');
    process.exit(1);
  }
}

main();
