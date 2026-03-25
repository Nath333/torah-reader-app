/**
 * Test Wiktionary fetch for high-frequency Hebrew words
 */
const https = require('https');

const HIGH_FREQ_WORDS = [
  'מלך', // king - very common
  'אב',  // father
  'אם',  // mother
  'בן',  // son
  'יד',  // hand
  'לב',  // heart
  'עין', // eye
  'שמים', // heaven
  'ארץ', // earth
  'מים', // water
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TestScript/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testWord(word) {
  const params = new URLSearchParams({
    action: 'query',
    titles: word,
    prop: 'revisions',
    rvprop: 'content',
    format: 'json',
    rvslots: 'main',
  });

  const url = `https://en.wiktionary.org/w/api.php?${params.toString()}`;

  try {
    const response = await httpsGet(url);
    const data = JSON.parse(response.data);
    const pages = data.query?.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
      console.log(`${word}: NO PAGE`);
      return null;
    }

    const content = pages[pageId]?.revisions?.[0]?.slots?.main?.['*'];

    // Check for Hebrew section
    const hasHebrew = content?.includes('==Hebrew==');
    const hasEtymology = content?.includes('===Etymology===');
    const hasProtoSemitic = content?.includes('Proto-Semitic') || content?.includes('sem-pro');

    console.log(`${word}: ${hasHebrew ? 'HAS Hebrew' : 'no Hebrew'} | ${hasEtymology ? 'HAS Etymology' : 'no etymology'} | ${hasProtoSemitic ? 'HAS Proto-Semitic' : '-'}`);

    if (hasProtoSemitic) {
      // Extract Proto-Semitic
      const psMatch = content.match(/\{\{(?:inh|der)\|he\|sem-pro\|([^|}]+)/);
      if (psMatch) {
        console.log(`  -> PS: ${psMatch[1]}`);
      }
    }

    return { hasHebrew, hasEtymology, hasProtoSemitic };
  } catch (err) {
    console.log(`${word}: ERROR - ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Testing Wiktionary for Hebrew words...\n');

  for (const word of HIGH_FREQ_WORDS) {
    await testWord(word);
    await new Promise(r => setTimeout(r, 500));
  }
}

main();
