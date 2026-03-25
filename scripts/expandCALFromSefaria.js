/**
 * Expand CAL Aramaic Lexicon from Sefaria API
 *
 * Fetches Aramaic lexicon data from Sefaria's Jastrow dictionary
 * and merges it into our cal_aramaic.json
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = 'public/data';
const DELAY_MS = 200; // Respectful rate limiting

console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║         EXPAND CAL ARAMAIC FROM SEFARIA API                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Load existing CAL data
const calPath = path.join(DATA_DIR, 'cal_aramaic.json');
let calData = {};
try {
  calData = JSON.parse(fs.readFileSync(calPath, 'utf8'));
  console.log(`Loaded existing CAL data: ${Object.keys(calData).length} entries`);
} catch (e) {
  console.log('No existing CAL data found, starting fresh');
}

// Common Aramaic roots and words to fetch
// These are high-frequency Talmudic terms
const aramaicWords = [
  // Core verbs
  'אמר', 'הוה', 'עבד', 'יהב', 'נסב', 'אזל', 'אתא', 'חזא', 'ידע', 'בעא',
  'קרא', 'נפק', 'עאל', 'יתב', 'קום', 'אכל', 'שתא', 'קטל', 'שרי', 'אסר',
  'סלק', 'נחת', 'פלג', 'סבר', 'טעי', 'גמר', 'תנא', 'שמע', 'כתב', 'מלך',
  // Technical Talmudic terms
  'איבעיא', 'פשיטא', 'תיקו', 'קשיא', 'תיובתא', 'פירוקא', 'סברא',
  'שמעתא', 'מימרא', 'פלוגתא', 'ברייתא', 'משנה', 'גמרא', 'הלכה', 'אגדה',
  // Body parts
  'רישא', 'ידא', 'רגלא', 'עינא', 'פומא', 'לבא', 'נפשא',
  // Family
  'אבא', 'אימא', 'בר', 'ברתא', 'גברא', 'איתתא',
  // Nature/World
  'ארעא', 'שמיא', 'מיא', 'נורא', 'יומא', 'ליליא', 'עלמא',
  // Legal terms
  'דינא', 'דיינא', 'חיובא', 'פטורא', 'איסורא', 'היתרא', 'ממונא',
  'זכותא', 'חובה', 'קנין', 'שטרא', 'חזקה', 'משכנתא',
  // Adjectives
  'טבא', 'בישא', 'רבא', 'זעירא', 'חדת', 'עתיק',
  // Numbers
  'חד', 'תרי', 'תלת', 'ארבע', 'חמש', 'שית', 'שבע',
  // Particles
  'אית', 'לית', 'מאי', 'היכי', 'הכי', 'אלא', 'דלמא', 'השתא',
  // Additional common words
  'מילתא', 'עובדא', 'טעמא', 'לישנא', 'גירסא', 'אורח', 'עידנא',
  // More verbs
  'מוקי', 'שני', 'הדר', 'תלי', 'מפרש', 'מתרץ', 'מקשי',
  // More nouns
  'קדושה', 'טומאה', 'טהרה', 'קרבנא', 'מצוה', 'עבירה', 'תשובה',
  'תפילה', 'ברכה', 'שבתא', 'מועדא', 'פסחא', 'סוכה',
  // Daniel/Biblical Aramaic
  'מלה', 'פתגם', 'רז', 'פשר', 'חלם', 'חזו', 'צלם', 'אלה', 'מלאך',
  // Additional roots from Jastrow
  'אכף', 'אלף', 'אנס', 'אסק', 'בטל', 'בצע', 'ברך', 'גזר', 'גלי',
  'דחק', 'דין', 'זבן', 'זכה', 'חבר', 'חדש', 'חזר', 'חיי', 'חלק',
  'חפץ', 'חשב', 'טען', 'טרח', 'כנס', 'כפר', 'לוה', 'לקה', 'מכר',
  'מלא', 'מנה', 'מנע', 'מסר', 'מצא', 'נהג', 'נהר', 'נטל', 'נכס',
  'נפל', 'נצח', 'סגר', 'סדר', 'סחר', 'סיע', 'סכן', 'סעד', 'ספר',
  'ספק', 'עדף', 'עזר', 'עמד', 'ענה', 'פגם', 'פגע', 'פדה', 'פקד',
  'פרע', 'פרק', 'פשט', 'צדק', 'צור', 'קבל', 'קבע', 'קדם', 'קדש',
  'קנה', 'קפד', 'קרב', 'קשר', 'רבה', 'רדף', 'רחם', 'רחק', 'רצה',
  'רשם', 'שאל', 'שבק', 'שבר', 'שגר', 'שדר', 'שוב', 'שוה', 'שום',
  'שחט', 'שטח', 'שכב', 'שכח', 'שכן', 'שכר', 'שלח', 'שלם', 'שמש',
  'שנה', 'שעה', 'שפך', 'תבע', 'תוב', 'תחם', 'תקן', 'תרץ',
  // Common Aramaic word forms
  'אורייתא', 'דרבנן', 'דאורייתא', 'מדרבנן', 'מדאורייתא',
  'לעולם', 'ודאי', 'מיהו', 'נמי', 'תו', 'כולי',
  // More Talmudic phrases
  'למאי', 'אמאי', 'מפני', 'משום', 'כיון', 'איכא', 'ליכא',
  // Additional words
  'זוזי', 'פרוטה', 'דינר', 'מנה', 'ככר', 'אמה', 'טפח', 'זרת',
  'קב', 'סאה', 'כור', 'לתך', 'עומר', 'איפה', 'בת', 'הין', 'לוג',
  // Places and people terms
  'עיר', 'כפר', 'מתא', 'בי', 'בית', 'היכל', 'עזרה', 'לשכה',
  // Time-related
  'שעתא', 'יומין', 'ירחא', 'שתא', 'שבוע', 'שמיטה', 'יובל',
  // States/Conditions
  'חולה', 'בריא', 'חיים', 'מיתה', 'שינה', 'עירות',
  // Religious terms
  'קריאת שמע', 'תפילין', 'מזוזה', 'ציצית', 'סוכה', 'לולב', 'שופר',
  'מילה', 'פדיון', 'חלה', 'תרומה', 'מעשר', 'ביכורים'
];

// Remove duplicates and existing entries
const wordsToFetch = [...new Set(aramaicWords)].filter(w => !calData[w]);
console.log(`Words to fetch: ${wordsToFetch.length} (excluding ${aramaicWords.length - wordsToFetch.length} already in CAL)`);

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch word from Sefaria API
async function fetchWord(word) {
  try {
    const url = `https://www.sefaria.org/api/words/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (e) {
    console.error(`Error fetching ${word}:`, e.message);
    return null;
  }
}

// Process Sefaria response into CAL format
function processEntry(word, sefariaData) {
  if (!sefariaData || !Array.isArray(sefariaData) || sefariaData.length === 0) {
    return null;
  }

  // Find Jastrow entries (Aramaic focused)
  const jastrowEntries = sefariaData.filter(e =>
    e.parent_lexicon === 'Jastrow Dictionary' ||
    e.parent_lexicon?.includes('Jastrow')
  );

  // Also get other relevant entries
  const otherEntries = sefariaData.filter(e =>
    e.language_code === 'arc' || // Aramaic language code
    e.parent_lexicon?.includes('Aramaic') ||
    (e.content?.senses?.some(s =>
      s.definition?.toLowerCase().includes('aramaic') ||
      s.definition?.toLowerCase().includes('talmud')
    ))
  );

  const relevantEntries = [...jastrowEntries, ...otherEntries];
  if (relevantEntries.length === 0) {
    // Fall back to any entry
    if (sefariaData.length > 0) {
      relevantEntries.push(sefariaData[0]);
    } else {
      return null;
    }
  }

  // Combine definitions from all relevant entries
  const definitions = [];
  const forms = new Set();
  const dialects = new Set();
  let pos = '';
  let etymology = '';
  let hebrew = '';

  for (const entry of relevantEntries) {
    // Get part of speech
    if (entry.morphology && !pos) {
      pos = entry.morphology;
    }

    // Get definitions
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          definitions.push(sense.definition);
        }
      }
    }

    // Get alternate forms
    if (entry.alt_headwords) {
      entry.alt_headwords.forEach(h => forms.add(h));
    }
    if (entry.plural_form) {
      entry.plural_form.forEach(p => forms.add(p));
    }

    // Detect dialect from definition
    const defText = definitions.join(' ').toLowerCase();
    if (defText.includes('babylonian') || defText.includes('bavli')) {
      dialects.add('JBA');
    }
    if (defText.includes('palestinian') || defText.includes('yerushalmi')) {
      dialects.add('JPA');
    }
    if (defText.includes('targum')) {
      dialects.add('Tg');
    }
    if (defText.includes('biblical aramaic') || defText.includes('daniel')) {
      dialects.add('BA');
    }
    if (defText.includes('syriac')) {
      dialects.add('Syr');
    }

    // Get Strong's number for Hebrew cognate reference
    if (entry.strong_number) {
      hebrew = entry.strong_number;
    }
  }

  // Default dialects if none detected
  if (dialects.size === 0) {
    dialects.add('JBA');
    dialects.add('JPA');
  }

  // Clean and combine definitions
  const uniqueDefs = [...new Set(definitions)];
  const definition = uniqueDefs.slice(0, 3).join('; ').substring(0, 500);

  if (!definition) {
    return null;
  }

  return {
    lemma: word,
    pos: pos || 'unknown',
    definition: definition,
    dialects: [...dialects],
    forms: [word, ...forms],
    source: 'Sefaria/Jastrow',
    _fetchedAt: new Date().toISOString()
  };
}

// Main function
async function main() {
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  console.log('');
  console.log('Fetching from Sefaria API...');
  console.log('─'.repeat(60));

  for (let i = 0; i < wordsToFetch.length; i++) {
    const word = wordsToFetch[i];

    // Progress indicator
    if (i % 20 === 0) {
      console.log(`Progress: ${i}/${wordsToFetch.length} (${successCount} success, ${failCount} fail)`);
    }

    const sefariaData = await fetchWord(word);
    const processed = processEntry(word, sefariaData);

    if (processed) {
      calData[word] = processed;
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting
    await sleep(DELAY_MS);
  }

  // Save updated CAL data
  console.log('');
  console.log('─'.repeat(60));
  console.log(`Fetched: ${successCount} entries`);
  console.log(`Failed: ${failCount} entries`);

  // Sort keys alphabetically (Hebrew order)
  const sortedData = {};
  const keys = Object.keys(calData).sort((a, b) => a.localeCompare(b, 'he'));
  for (const key of keys) {
    sortedData[key] = calData[key];
  }

  fs.writeFileSync(calPath, JSON.stringify(sortedData, null, 2));
  console.log(`\n✓ Saved ${Object.keys(sortedData).length} entries to ${calPath}`);

  // Show sample
  console.log('');
  console.log('Sample new entries:');
  const newEntries = Object.entries(sortedData)
    .filter(([k, v]) => v._fetchedAt)
    .slice(0, 5);
  for (const [word, entry] of newEntries) {
    console.log(`  ${word}: ${entry.definition.substring(0, 60)}...`);
  }
}

main().catch(console.error);
