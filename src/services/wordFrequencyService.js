/**
 * Word Frequency Concordance Service
 *
 * Provides frequency data for Hebrew vocabulary in the Hebrew Bible,
 * enabling scholars to understand how common words are and where they appear.
 *
 * PRO SCHOLAR V8: Migrated to use CacheOrchestrator for root occurrences caching
 */

import { createManagedCache } from './cacheOrchestrator';

// Frequency bands for pedagogical purposes
export const FREQUENCY_BANDS = {
  VERY_COMMON: { min: 5000, label: 'Very Common (5000+)', color: '#22c55e' },
  COMMON: { min: 1000, max: 4999, label: 'Common (1000-4999)', color: '#84cc16' },
  MODERATE: { min: 500, max: 999, label: 'Moderate (500-999)', color: '#eab308' },
  LESS_COMMON: { min: 100, max: 499, label: 'Less Common (100-499)', color: '#f97316' },
  UNCOMMON: { min: 50, max: 99, label: 'Uncommon (50-99)', color: '#ef4444' },
  RARE: { min: 10, max: 49, label: 'Rare (10-49)', color: '#dc2626' },
  VERY_RARE: { min: 1, max: 9, label: 'Very Rare (1-9)', color: '#991b1b' },
  HAPAX: { min: 1, max: 1, label: 'Hapax Legomenon (1)', color: '#7f1d1d' }
};

// Core vocabulary frequency data (top ~500 most common words)
const WORD_FREQUENCIES = {
  // Particles and conjunctions (10000+)
  'וְ': { count: 50524, root: null, gloss: 'and', pos: 'conjunction' },
  'הַ': { count: 30386, root: null, gloss: 'the', pos: 'article' },
  'לְ': { count: 20322, root: null, gloss: 'to/for', pos: 'preposition' },
  'בְּ': { count: 15564, root: null, gloss: 'in/with', pos: 'preposition' },
  'אֶת': { count: 10978, root: null, gloss: 'direct object marker', pos: 'particle' },
  'מִן': { count: 7596, root: null, gloss: 'from', pos: 'preposition' },
  'עַל': { count: 5777, root: null, gloss: 'upon/over', pos: 'preposition' },
  'אֶל': { count: 5518, root: null, gloss: 'to/toward', pos: 'preposition' },
  'כִּי': { count: 4487, root: null, gloss: 'that/because', pos: 'conjunction' },
  'לֹא': { count: 5189, root: null, gloss: 'not', pos: 'adverb' },
  'אֲשֶׁר': { count: 5503, root: null, gloss: 'which/who/that', pos: 'relative' },
  'כֹּל': { count: 5415, root: 'כלל', gloss: 'all/every', pos: 'noun' },
  'עַד': { count: 1263, root: null, gloss: 'until/as far as', pos: 'preposition' },
  'אִם': { count: 1070, root: null, gloss: 'if', pos: 'conjunction' },
  'גַּם': { count: 769, root: null, gloss: 'also/even', pos: 'adverb' },
  'כְּ': { count: 3053, root: null, gloss: 'like/as', pos: 'preposition' },
  'אוֹ': { count: 321, root: null, gloss: 'or', pos: 'conjunction' },
  'פֶּן': { count: 133, root: null, gloss: 'lest', pos: 'conjunction' },

  // Divine names
  'יהוה': { count: 6828, root: null, gloss: 'YHWH/LORD', pos: 'proper_noun', domain: 'divine' },
  'אֱלֹהִים': { count: 2602, root: 'אלה', gloss: 'God/gods', pos: 'noun', domain: 'divine' },
  'אֵל': { count: 242, root: 'אלה', gloss: 'God/mighty one', pos: 'noun', domain: 'divine' },
  'אֲדֹנָי': { count: 439, root: 'אדן', gloss: 'Lord/master', pos: 'noun', domain: 'divine' },
  'שַׁדַּי': { count: 48, root: null, gloss: 'Almighty', pos: 'proper_noun', domain: 'divine' },

  // Common verbs (very frequent)
  'אָמַר': { count: 5316, root: 'אמר', gloss: 'say/speak', pos: 'verb', binyan: 'qal' },
  'הָיָה': { count: 3576, root: 'היה', gloss: 'be/become', pos: 'verb', binyan: 'qal' },
  'עָשָׂה': { count: 2632, root: 'עשה', gloss: 'do/make', pos: 'verb', binyan: 'qal' },
  'בּוֹא': { count: 2592, root: 'בוא', gloss: 'come/go', pos: 'verb', binyan: 'qal' },
  'נָתַן': { count: 2014, root: 'נתן', gloss: 'give/put', pos: 'verb', binyan: 'qal' },
  'הָלַךְ': { count: 1554, root: 'הלך', gloss: 'walk/go', pos: 'verb', binyan: 'qal' },
  'רָאָה': { count: 1313, root: 'ראה', gloss: 'see', pos: 'verb', binyan: 'qal' },
  'לָקַח': { count: 969, root: 'לקח', gloss: 'take', pos: 'verb', binyan: 'qal' },
  'יָדַע': { count: 956, root: 'ידע', gloss: 'know', pos: 'verb', binyan: 'qal' },
  'שָׁמַע': { count: 1165, root: 'שמע', gloss: 'hear/listen', pos: 'verb', binyan: 'qal' },
  'דָּבַר': { count: 1136, root: 'דבר', gloss: 'speak', pos: 'verb', binyan: 'piel' },
  'יָשַׁב': { count: 1088, root: 'ישב', gloss: 'sit/dwell', pos: 'verb', binyan: 'qal' },
  'שׁוּב': { count: 1075, root: 'שוב', gloss: 'return', pos: 'verb', binyan: 'qal' },
  'קָרָא': { count: 739, root: 'קרא', gloss: 'call/proclaim', pos: 'verb', binyan: 'qal' },
  'יָצָא': { count: 1076, root: 'יצא', gloss: 'go out', pos: 'verb', binyan: 'qal' },
  'עָלָה': { count: 894, root: 'עלה', gloss: 'go up', pos: 'verb', binyan: 'qal' },
  'שָׁלַח': { count: 847, root: 'שלח', gloss: 'send', pos: 'verb', binyan: 'qal' },
  'עָמַד': { count: 524, root: 'עמד', gloss: 'stand', pos: 'verb', binyan: 'qal' },
  'שִׂים': { count: 588, root: 'שים', gloss: 'put/place', pos: 'verb', binyan: 'qal' },
  'מָצָא': { count: 457, root: 'מצא', gloss: 'find', pos: 'verb', binyan: 'qal' },
  'כָּתַב': { count: 225, root: 'כתב', gloss: 'write', pos: 'verb', binyan: 'qal' },
  'אָכַל': { count: 820, root: 'אכל', gloss: 'eat', pos: 'verb', binyan: 'qal' },
  'מוּת': { count: 854, root: 'מות', gloss: 'die', pos: 'verb', binyan: 'qal' },
  'חָיָה': { count: 283, root: 'חיה', gloss: 'live', pos: 'verb', binyan: 'qal' },
  'עָבַד': { count: 290, root: 'עבד', gloss: 'serve/work', pos: 'verb', binyan: 'qal' },
  'שָׁמַר': { count: 468, root: 'שמר', gloss: 'keep/guard', pos: 'verb', binyan: 'qal' },
  'צָוָה': { count: 496, root: 'צוה', gloss: 'command', pos: 'verb', binyan: 'piel' },
  'נָשָׂא': { count: 659, root: 'נשא', gloss: 'lift/carry', pos: 'verb', binyan: 'qal' },
  'קוּם': { count: 628, root: 'קום', gloss: 'rise/stand up', pos: 'verb', binyan: 'qal' },
  'שָׁכַב': { count: 213, root: 'שכב', gloss: 'lie down', pos: 'verb', binyan: 'qal' },
  'יָרַד': { count: 382, root: 'ירד', gloss: 'go down', pos: 'verb', binyan: 'qal' },
  'בָּנָה': { count: 377, root: 'בנה', gloss: 'build', pos: 'verb', binyan: 'qal' },
  'אָהַב': { count: 217, root: 'אהב', gloss: 'love', pos: 'verb', binyan: 'qal' },
  'שָׂנֵא': { count: 148, root: 'שנא', gloss: 'hate', pos: 'verb', binyan: 'qal' },
  'יָרֵא': { count: 435, root: 'ירא', gloss: 'fear', pos: 'verb', binyan: 'qal' },
  'נָפַל': { count: 435, root: 'נפל', gloss: 'fall', pos: 'verb', binyan: 'qal' },
  'נָכָה': { count: 501, root: 'נכה', gloss: 'strike', pos: 'verb', binyan: 'hiphil' },
  'זָכַר': { count: 233, root: 'זכר', gloss: 'remember', pos: 'verb', binyan: 'qal' },
  'שָׁכַח': { count: 102, root: 'שכח', gloss: 'forget', pos: 'verb', binyan: 'qal' },

  // Common nouns - People/Kinship
  'אִישׁ': { count: 2183, root: null, gloss: 'man', pos: 'noun', domain: 'person' },
  'אִשָּׁה': { count: 781, root: null, gloss: 'woman/wife', pos: 'noun', domain: 'person' },
  'בֵּן': { count: 4941, root: 'בנה', gloss: 'son', pos: 'noun', domain: 'kinship' },
  'בַּת': { count: 587, root: 'בנה', gloss: 'daughter', pos: 'noun', domain: 'kinship' },
  'אָב': { count: 1210, root: null, gloss: 'father', pos: 'noun', domain: 'kinship' },
  'אֵם': { count: 220, root: null, gloss: 'mother', pos: 'noun', domain: 'kinship' },
  'אָח': { count: 629, root: null, gloss: 'brother', pos: 'noun', domain: 'kinship' },
  'אָחוֹת': { count: 119, root: null, gloss: 'sister', pos: 'noun', domain: 'kinship' },
  'עֶבֶד': { count: 807, root: 'עבד', gloss: 'servant/slave', pos: 'noun', domain: 'person' },
  'עַם': { count: 1868, root: null, gloss: 'people/nation', pos: 'noun', domain: 'collective' },
  'גּוֹי': { count: 567, root: null, gloss: 'nation/gentile', pos: 'noun', domain: 'collective' },
  'מֶלֶךְ': { count: 2530, root: 'מלך', gloss: 'king', pos: 'noun', domain: 'royalty' },
  'כֹּהֵן': { count: 750, root: 'כהן', gloss: 'priest', pos: 'noun', domain: 'religious' },
  'נָבִיא': { count: 317, root: 'נבא', gloss: 'prophet', pos: 'noun', domain: 'religious' },

  // Common nouns - Body
  'יָד': { count: 1627, root: null, gloss: 'hand', pos: 'noun', domain: 'body' },
  'עַיִן': { count: 887, root: null, gloss: 'eye', pos: 'noun', domain: 'body' },
  'פָּנִים': { count: 2126, root: null, gloss: 'face', pos: 'noun', domain: 'body' },
  'לֵב': { count: 854, root: null, gloss: 'heart', pos: 'noun', domain: 'body' },
  'רֹאשׁ': { count: 599, root: null, gloss: 'head', pos: 'noun', domain: 'body' },
  'פֶּה': { count: 498, root: null, gloss: 'mouth', pos: 'noun', domain: 'body' },
  'רֶגֶל': { count: 247, root: null, gloss: 'foot', pos: 'noun', domain: 'body' },
  'אֹזֶן': { count: 188, root: null, gloss: 'ear', pos: 'noun', domain: 'body' },
  'נֶפֶשׁ': { count: 754, root: null, gloss: 'soul/life', pos: 'noun', domain: 'body' },
  'בָּשָׂר': { count: 273, root: null, gloss: 'flesh', pos: 'noun', domain: 'body' },
  'דָּם': { count: 361, root: null, gloss: 'blood', pos: 'noun', domain: 'body' },

  // Common nouns - Place/Geography
  'אֶרֶץ': { count: 2505, root: null, gloss: 'land/earth', pos: 'noun', domain: 'geography' },
  'שָׁמַיִם': { count: 421, root: null, gloss: 'heaven/sky', pos: 'noun', domain: 'geography' },
  'עִיר': { count: 1090, root: null, gloss: 'city', pos: 'noun', domain: 'geography' },
  'בַּיִת': { count: 2047, root: 'בנה', gloss: 'house', pos: 'noun', domain: 'building' },
  'הַר': { count: 558, root: null, gloss: 'mountain', pos: 'noun', domain: 'geography' },
  'מִדְבָּר': { count: 271, root: 'דבר', gloss: 'wilderness', pos: 'noun', domain: 'geography' },
  'יָם': { count: 396, root: null, gloss: 'sea', pos: 'noun', domain: 'geography' },
  'נָהָר': { count: 119, root: null, gloss: 'river', pos: 'noun', domain: 'geography' },
  'דֶּרֶךְ': { count: 712, root: 'דרך', gloss: 'way/road', pos: 'noun', domain: 'geography' },
  'שַׁעַר': { count: 373, root: null, gloss: 'gate', pos: 'noun', domain: 'building' },
  'מָקוֹם': { count: 401, root: 'קום', gloss: 'place', pos: 'noun', domain: 'geography' },

  // Common nouns - Time
  'יוֹם': { count: 2304, root: null, gloss: 'day', pos: 'noun', domain: 'time' },
  'לַיְלָה': { count: 234, root: null, gloss: 'night', pos: 'noun', domain: 'time' },
  'שָׁנָה': { count: 878, root: null, gloss: 'year', pos: 'noun', domain: 'time' },
  'חֹדֶשׁ': { count: 283, root: 'חדש', gloss: 'month/new moon', pos: 'noun', domain: 'time' },
  'עֵת': { count: 296, root: null, gloss: 'time', pos: 'noun', domain: 'time' },
  'עוֹלָם': { count: 439, root: null, gloss: 'eternity/world', pos: 'noun', domain: 'time' },
  'בֹּקֶר': { count: 214, root: 'בקר', gloss: 'morning', pos: 'noun', domain: 'time' },
  'עֶרֶב': { count: 134, root: 'ערב', gloss: 'evening', pos: 'noun', domain: 'time' },
  'שַׁבָּת': { count: 111, root: 'שבת', gloss: 'sabbath', pos: 'noun', domain: 'time' },

  // Common nouns - Objects/Things
  'דָּבָר': { count: 1454, root: 'דבר', gloss: 'word/thing', pos: 'noun', domain: 'abstract' },
  'שֵׁם': { count: 864, root: null, gloss: 'name', pos: 'noun', domain: 'abstract' },
  'כֶּסֶף': { count: 403, root: null, gloss: 'silver/money', pos: 'noun', domain: 'material' },
  'זָהָב': { count: 392, root: null, gloss: 'gold', pos: 'noun', domain: 'material' },
  'אֶבֶן': { count: 276, root: null, gloss: 'stone', pos: 'noun', domain: 'material' },
  'עֵץ': { count: 330, root: null, gloss: 'tree/wood', pos: 'noun', domain: 'nature' },
  'מַיִם': { count: 585, root: null, gloss: 'water', pos: 'noun', domain: 'nature' },
  'אֵשׁ': { count: 379, root: null, gloss: 'fire', pos: 'noun', domain: 'nature' },
  'לֶחֶם': { count: 298, root: null, gloss: 'bread/food', pos: 'noun', domain: 'food' },
  'יַיִן': { count: 141, root: null, gloss: 'wine', pos: 'noun', domain: 'food' },
  'חֶרֶב': { count: 413, root: null, gloss: 'sword', pos: 'noun', domain: 'weapon' },
  'סֵפֶר': { count: 191, root: 'ספר', gloss: 'book/scroll', pos: 'noun', domain: 'writing' },

  // Common nouns - Abstract/Religious
  'תּוֹרָה': { count: 223, root: 'ירה', gloss: 'Torah/instruction', pos: 'noun', domain: 'religious' },
  'מִצְוָה': { count: 184, root: 'צוה', gloss: 'commandment', pos: 'noun', domain: 'religious' },
  'מִשְׁפָּט': { count: 425, root: 'שפט', gloss: 'judgment/justice', pos: 'noun', domain: 'religious' },
  'חֶסֶד': { count: 249, root: 'חסד', gloss: 'lovingkindness', pos: 'noun', domain: 'religious' },
  'אֱמֶת': { count: 127, root: 'אמן', gloss: 'truth', pos: 'noun', domain: 'abstract' },
  'צֶדֶק': { count: 119, root: 'צדק', gloss: 'righteousness', pos: 'noun', domain: 'religious' },
  'שָׁלוֹם': { count: 237, root: 'שלם', gloss: 'peace', pos: 'noun', domain: 'abstract' },
  'חַטָּאת': { count: 296, root: 'חטא', gloss: 'sin/sin offering', pos: 'noun', domain: 'religious' },
  'בְּרִית': { count: 287, root: null, gloss: 'covenant', pos: 'noun', domain: 'religious' },
  'קֹדֶשׁ': { count: 470, root: 'קדש', gloss: 'holiness/holy thing', pos: 'noun', domain: 'religious' },
  'רוּחַ': { count: 389, root: null, gloss: 'spirit/wind', pos: 'noun', domain: 'religious' },
  'כָּבוֹד': { count: 200, root: 'כבד', gloss: 'glory/honor', pos: 'noun', domain: 'religious' },
  'עֹלָה': { count: 289, root: 'עלה', gloss: 'burnt offering', pos: 'noun', domain: 'sacrifice' },
  'זֶבַח': { count: 162, root: 'זבח', gloss: 'sacrifice', pos: 'noun', domain: 'sacrifice' },

  // Numbers
  'אֶחָד': { count: 976, root: null, gloss: 'one', pos: 'numeral' },
  'שְׁנַיִם': { count: 769, root: null, gloss: 'two', pos: 'numeral' },
  'שָׁלֹשׁ': { count: 606, root: null, gloss: 'three', pos: 'numeral' },
  'אַרְבַּע': { count: 455, root: null, gloss: 'four', pos: 'numeral' },
  'חָמֵשׁ': { count: 508, root: null, gloss: 'five', pos: 'numeral' },
  'שֵׁשׁ': { count: 215, root: null, gloss: 'six', pos: 'numeral' },
  'שֶׁבַע': { count: 490, root: null, gloss: 'seven', pos: 'numeral' },
  'שְׁמֹנֶה': { count: 147, root: null, gloss: 'eight', pos: 'numeral' },
  'תֵּשַׁע': { count: 78, root: null, gloss: 'nine', pos: 'numeral' },
  'עֶשֶׂר': { count: 492, root: null, gloss: 'ten', pos: 'numeral' },
  'מֵאָה': { count: 581, root: null, gloss: 'hundred', pos: 'numeral' },
  'אֶלֶף': { count: 496, root: null, gloss: 'thousand', pos: 'numeral' }
};

/**
 * Get frequency data for a word
 * @param {string} word - Hebrew word
 * @returns {Object|null} Frequency data
 */
export const getWordFrequency = (word) => {
  // Direct lookup
  if (WORD_FREQUENCIES[word]) {
    const data = WORD_FREQUENCIES[word];
    return {
      word,
      ...data,
      band: getFrequencyBand(data.count),
      percentile: calculatePercentile(data.count)
    };
  }

  // Try without vowels
  const stripped = stripVowels(word);
  const match = Object.entries(WORD_FREQUENCIES).find(([key]) =>
    stripVowels(key) === stripped
  );

  if (match) {
    const [originalWord, data] = match;
    return {
      word: originalWord,
      searchedAs: word,
      ...data,
      band: getFrequencyBand(data.count),
      percentile: calculatePercentile(data.count)
    };
  }

  return null;
};

/**
 * Get frequency band for a count
 * @param {number} count - Occurrence count
 * @returns {Object} Band information
 */
export const getFrequencyBand = (count) => {
  if (count >= 5000) return FREQUENCY_BANDS.VERY_COMMON;
  if (count >= 1000) return FREQUENCY_BANDS.COMMON;
  if (count >= 500) return FREQUENCY_BANDS.MODERATE;
  if (count >= 100) return FREQUENCY_BANDS.LESS_COMMON;
  if (count >= 50) return FREQUENCY_BANDS.UNCOMMON;
  if (count >= 10) return FREQUENCY_BANDS.RARE;
  if (count > 1) return FREQUENCY_BANDS.VERY_RARE;
  return FREQUENCY_BANDS.HAPAX;
};

/**
 * Calculate percentile ranking
 * @param {number} count - Word frequency
 * @returns {number} Percentile (0-100)
 */
function calculatePercentile(count) {
  // Based on approximately 8000 unique vocabulary items
  if (count >= 5000) return 99;
  if (count >= 1000) return 95;
  if (count >= 500) return 90;
  if (count >= 100) return 75;
  if (count >= 50) return 60;
  if (count >= 10) return 40;
  if (count > 1) return 20;
  return 5;
}

/**
 * Get words by frequency band
 * @param {string} bandKey - Band key from FREQUENCY_BANDS
 * @returns {Object[]} Words in that band
 */
export const getWordsByBand = (bandKey) => {
  const band = FREQUENCY_BANDS[bandKey];
  if (!band) return [];

  return Object.entries(WORD_FREQUENCIES)
    .filter(([, data]) => {
      if (band.min && band.max) {
        return data.count >= band.min && data.count <= band.max;
      }
      return data.count >= band.min;
    })
    .map(([word, data]) => ({ word, ...data }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get words by part of speech
 * @param {string} pos - Part of speech
 * @returns {Object[]} Matching words
 */
export const getWordsByPOS = (pos) => {
  return Object.entries(WORD_FREQUENCIES)
    .filter(([, data]) => data.pos === pos)
    .map(([word, data]) => ({ word, ...data }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get words by domain
 * @param {string} domain - Semantic domain
 * @returns {Object[]} Matching words
 */
export const getWordsByDomain = (domain) => {
  return Object.entries(WORD_FREQUENCIES)
    .filter(([, data]) => data.domain === domain)
    .map(([word, data]) => ({ word, ...data }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get words by root
 * @param {string} root - Hebrew root
 * @returns {Object[]} Words derived from this root
 */
export const getWordsByRoot = (root) => {
  return Object.entries(WORD_FREQUENCIES)
    .filter(([, data]) => data.root === root)
    .map(([word, data]) => ({ word, ...data }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get vocabulary statistics
 * @returns {Object} Statistics about the vocabulary
 */
export const getVocabularyStats = () => {
  const words = Object.entries(WORD_FREQUENCIES);
  const totalOccurrences = words.reduce((sum, [, data]) => sum + data.count, 0);

  const posCounts = {};
  const domainCounts = {};

  words.forEach(([, data]) => {
    posCounts[data.pos] = (posCounts[data.pos] || 0) + 1;
    if (data.domain) {
      domainCounts[data.domain] = (domainCounts[data.domain] || 0) + 1;
    }
  });

  return {
    totalUniqueWords: words.length,
    totalOccurrences,
    byPartOfSpeech: posCounts,
    byDomain: domainCounts,
    bandDistribution: {
      veryCommon: getWordsByBand('VERY_COMMON').length,
      common: getWordsByBand('COMMON').length,
      moderate: getWordsByBand('MODERATE').length,
      lessCommon: getWordsByBand('LESS_COMMON').length,
      uncommon: getWordsByBand('UNCOMMON').length,
      rare: getWordsByBand('RARE').length,
      veryRare: getWordsByBand('VERY_RARE').length
    }
  };
};

/**
 * Search vocabulary
 * @param {Object} options - Search options
 * @returns {Object[]} Matching words
 */
export const searchVocabulary = (options = {}) => {
  const { gloss, minCount, maxCount, pos, domain, root } = options;

  return Object.entries(WORD_FREQUENCIES)
    .filter(([, data]) => {
      if (gloss && !data.gloss.toLowerCase().includes(gloss.toLowerCase())) {
        return false;
      }
      if (minCount && data.count < minCount) return false;
      if (maxCount && data.count > maxCount) return false;
      if (pos && data.pos !== pos) return false;
      if (domain && data.domain !== domain) return false;
      if (root && data.root !== root) return false;
      return true;
    })
    .map(([word, data]) => ({
      word,
      ...data,
      band: getFrequencyBand(data.count)
    }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Get learning recommendations based on frequency
 * @param {number} knownCount - Number of words already known
 * @returns {Object[]} Recommended words to learn
 */
export const getLearningRecommendations = (knownCount = 0) => {
  const allWords = Object.entries(WORD_FREQUENCIES)
    .map(([word, data]) => ({ word, ...data }))
    .sort((a, b) => b.count - a.count);

  // Skip already "known" words and return next batch
  return allWords.slice(knownCount, knownCount + 20).map(word => ({
    ...word,
    band: getFrequencyBand(word.count),
    priority: calculateLearningPriority(word)
  }));
};

/**
 * Calculate learning priority
 */
function calculateLearningPriority(wordData) {
  let priority = 0;

  // Higher frequency = higher priority
  if (wordData.count >= 1000) priority += 5;
  else if (wordData.count >= 500) priority += 4;
  else if (wordData.count >= 100) priority += 3;
  else if (wordData.count >= 50) priority += 2;
  else priority += 1;

  // Content words slightly higher priority than function words
  if (['noun', 'verb'].includes(wordData.pos)) priority += 1;

  // Religious vocabulary for Torah study
  if (wordData.domain === 'religious') priority += 1;

  return priority;
}

// Helper function to strip vowels
function stripVowels(word) {
  return word.replace(/[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '');
}

// Export all band keys for UI
export const BAND_KEYS = Object.keys(FREQUENCY_BANDS);

// =============================================================================
// Sefaria API Integration for Root Occurrences
// =============================================================================

// PRO SCHOLAR V8: Use managed cache for root occurrences with orchestrator telemetry
const rootOccurrencesCache = createManagedCache('rootOccurrences');

/**
 * Fetch all occurrences of a root across Tanakh from Sefaria
 * @param {string} root - Hebrew 3-letter root (e.g., אמר)
 * @returns {Promise<Object>} Root occurrences data
 */
export const getRootOccurrences = async (root) => {
  if (!root) return null;

  // PRO SCHOLAR V8: Check managed cache (returns null for missing entries)
  const cached = rootOccurrencesCache.get(root);
  if (cached) return cached;

  try {
    // Search Sefaria for the root
    const response = await fetch(
      `https://www.sefaria.org/api/search-wrapper?query=${encodeURIComponent(root)}&type=text&field=naive_lemmatizer&slop=0&size=100&filters[0]=Tanakh`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.warn(`[Root Search] Sefaria API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Process results
    const occurrences = [];
    const byBook = {};

    if (data.hits?.hits) {
      for (const hit of data.hits.hits) {
        const ref = hit._source?.ref;
        const text = hit._source?.exact || hit._source?.naive_lemmatizer;
        const heRef = hit._source?.heRef;

        if (ref) {
          // Extract book name
          const book = ref.split(' ')[0];
          if (!byBook[book]) byBook[book] = [];
          byBook[book].push({ ref, heRef, text });

          occurrences.push({
            ref,
            heRef,
            text: text?.slice(0, 100), // Preview only
            sefariaUrl: `https://www.sefaria.org/${ref.replace(/\s/g, '_')}`
          });
        }
      }
    }

    const result = {
      root,
      totalCount: data.hits?.total?.value || occurrences.length,
      occurrences: occurrences.slice(0, 50), // Limit for performance
      byBook,
      books: Object.keys(byBook),
      patterns: analyzeRootPatterns(occurrences, root)
    };

    // Cache the result
    rootOccurrencesCache.set(root, result);

    return result;
  } catch (error) {
    console.error('[Root Search] Error:', error);
    return null;
  }
};

/**
 * Analyze patterns in root usage
 */
function analyzeRootPatterns(occurrences, root) {
  const patterns = {
    firstOccurrence: null,
    mostCommonBooks: [],
    theologicalNote: null
  };

  if (occurrences.length > 0) {
    patterns.firstOccurrence = occurrences[0];
  }

  // Special roots with theological significance
  const theologicalRoots = {
    'ברא': 'This root is used exclusively with God as subject, emphasizing divine creation ex nihilo.',
    'קדש': 'Signifies separation for sacred purpose, foundational to holiness concepts.',
    'אהב': 'Encompasses divine and human love, covenantal loyalty.',
    'ירא': 'Encompasses both fear and reverence, key to understanding awe of God.',
    'חסד': 'Lovingkindness, covenant loyalty - central to divine-human relationship.',
    'אמן': 'Root of faithfulness, truth, and the response "Amen".',
    'שלם': 'Completeness, peace, wholeness - source of "shalom".',
    'ישע': 'Salvation, deliverance - Messianic significance.',
    'גאל': 'Redemption, the role of kinsman-redeemer.',
    'כפר': 'Atonement, covering - central to sacrificial system.'
  };

  if (theologicalRoots[root]) {
    patterns.theologicalNote = theologicalRoots[root];
  }

  return patterns;
}

/**
 * Get words derived from a root with their frequencies
 * @param {string} root - Hebrew root
 * @returns {Object[]} Derived words with frequency data
 */
export const getDerivedWords = (root) => {
  if (!root) return [];

  const derived = getWordsByRoot(root);

  return derived.map(word => ({
    ...word,
    band: getFrequencyBand(word.count),
    percentile: calculatePercentile(word.count)
  }));
};

