// Text Attestations — extrait de dictionaryLoader.js (split 04/10/2026)
// Montre OÙ un mot apparaît (Talmud, Mishnah, Midrash…) via le cache Sefaria.

import { cache, loadDictionary, extractRootHelper } from './loaderCore';
import { stripAllDiacritics, normalizeFinals, restoreFinals } from '../../utils/hebrewUtils';
import { SOURCE_CONFIG } from '../../constants/sourceConfig';
import { getSefariaBase } from '../sefariaBase';
import { createLogger } from '../../utils/debug';

const log = createLogger('DictionaryLoader');

// TEXT ATTESTATIONS FROM SEFARIA CACHE
// Shows WHERE a word appears in Talmud, Mishnah, Midrash, etc.
// =============================================================================

/**
 * Patterns to identify dictionary cross-references (NOT text attestations)
 * These should be filtered out - we only want real text references
 */
const DICTIONARY_REF_PATTERNS = [
  /^Klein Dictionary/i,
  /^BDB/i,
  /^Jastrow/i,
  /^HALOT/i,
  /^Gesenius/i,
  /^Strong/i,
  /^TWOT/i,
  /^CAL/i
];

/**
 * Check if a reference is a dictionary cross-reference (not a text)
 * @param {string} ref - Reference string
 * @returns {boolean} True if this is a dictionary reference
 */
const isDictionaryRef = (ref) => {
  if (!ref || typeof ref !== 'string') return true;
  return DICTIONARY_REF_PATTERNS.some(pattern => pattern.test(ref));
};

/**
 * Categorize a text reference by type
 * @param {string} ref - Reference string like "Shabbat 73a" or "Mishnah Berakhot 1:1"
 * @returns {string} Category: 'talmud', 'mishnah', 'midrash', 'tanakh', 'targum', 'other'
 */
const categorizeTextRef = (ref) => {
  if (!ref) return 'other';
  const lower = ref.toLowerCase();

  // Mishnah (must check before Talmud since some tractates overlap)
  if (lower.startsWith('mishnah') || lower.startsWith('mishna')) return 'mishnah';

  // Jerusalem Talmud
  if (lower.startsWith('jerusalem talmud') || lower.startsWith('yerushalmi')) return 'yerushalmi';

  // Tosefta
  if (lower.startsWith('tosefta')) return 'tosefta';

  // Midrash
  if (lower.includes('rabbah') || lower.includes('midrash') ||
      lower.startsWith('sifra') || lower.startsWith('sifrei') || lower.startsWith('sifre') ||
      lower.includes('tehillim') || lower.includes('tanchuma')) return 'midrash';

  // Targum
  if (lower.startsWith('targum')) return 'targum';

  // Tanakh references (book names)
  const tanakhBooks = ['genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
    'joshua', 'judges', 'samuel', 'kings', 'isaiah', 'jeremiah', 'ezekiel',
    'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
    'zephaniah', 'haggai', 'zechariah', 'malachi', 'psalms', 'proverbs', 'job',
    'song of songs', 'ruth', 'lamentations', 'ecclesiastes', 'esther', 'daniel',
    'ezra', 'nehemiah', 'chronicles'];
  if (tanakhBooks.some(book => lower.startsWith(book))) return 'tanakh';

  // Babylonian Talmud (tractate names with daf)
  if (/\d+[ab]/.test(ref)) return 'bavli';

  return 'other';
};

/**
 * Get text attestations for a word from Sefaria cache
 * Returns WHERE this word appears in Talmud, Mishnah, Midrash, etc.
 *
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} Text attestations grouped by category
 *
 * @example
 * getTextAttestations('אב')
 * // Returns:
 * // {
 * //   word: 'אב',
 * //   totalRefs: 12,
 * //   categories: {
 * //     bavli: ['Shabbat 73a', 'Rosh Hashanah 18b'],
 * //     mishnah: ['Mishnah Shabbat 7:1'],
 * //     midrash: ['Shemot Rabbah 46:5'],
 * //     yerushalmi: ['Jerusalem Talmud Nedarim 5:6:3']
 * //   },
 * //   allRefs: [...] // flat array of all refs
 * // }
 */
export function getTextAttestations(word) {
  const sefariaCache = cache.sefariaCache;
  if (!sefariaCache?.entries) {
    return null;
  }

  // Try exact match first
  let entry = sefariaCache.entries[word];

  // Try without vowel points
  if (!entry) {
    const stripped = stripAllDiacritics(word);
    entry = sefariaCache.entries[stripped];
  }

  if (!entry?.entries) {
    return null;
  }

  // Collect all refs from all lexicon entries
  const allRefs = new Set();
  const dictionaryRefs = new Set(); // Track dictionary cross-refs separately
  const categories = {
    bavli: [],
    yerushalmi: [],
    mishnah: [],
    tosefta: [],
    midrash: [],
    targum: [],
    tanakh: [],
    other: []
  };

// Also collect dictionary sources info
  const dictionarySources = {};

  for (const lexiconEntry of entry.entries) {
    // Track which dictionaries have this word
    if (lexiconEntry.lexicon) {
      const lexName = lexiconEntry.lexicon.replace(' Dictionary', '');
      if (!dictionarySources[lexName]) {
        dictionarySources[lexName] = {
          name: lexName,
          definition: lexiconEntry.definition,
          pos: lexiconEntry.pos,
          strongNumber: lexiconEntry.strongNumber
        };
      }
    }

    const refs = lexiconEntry.refs || [];
    for (const ref of refs) {
      // Separate dictionary cross-references from text references
      if (isDictionaryRef(ref)) {
        dictionaryRefs.add(ref);
        continue;
      }

      // Skip duplicates
      if (allRefs.has(ref)) continue;
      allRefs.add(ref);

      // Categorize the reference
      const category = categorizeTextRef(ref);
      if (categories[category]) {
        categories[category].push(ref);
      } else {
        categories.other.push(ref);
      }
    }
  }

// Return data even if no text refs (we have dictionary sources)
  const hasTextRefs = allRefs.size > 0;
  const hasDictSources = Object.keys(dictionarySources).length > 0;

  if (!hasTextRefs && !hasDictSources) {
    return null;
  }

  return {
    word: entry.word || word,
    totalRefs: allRefs.size,
    categories,
    allRefs: Array.from(allRefs),
// Include dictionary sources even when no text refs
    dictionarySources: Object.values(dictionarySources),
    dictionaryRefsCount: dictionaryRefs.size,
    hasTextRefs,
    source: 'Sefaria Lexicon Cache'
  };
}

/**
 * Get text attestations with async loading (ensures cache is loaded)
 * Enhanced with local dictionary fallback for rich detail
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Object|null>} Text attestations with dictionary sources
 */
export async function getTextAttestationsAsync(word) {
  if (!word) return null;

  // Ensure Sefaria cache is loaded
  await loadDictionary('sefariaCache');

  // Helper to check if result has useful data (text refs OR dictionary sources)
  const hasUsefulData = (r) => r && (r.totalRefs > 0 || r.dictionarySources?.length > 0);

  // Helper to try lookup and return if found
  const tryLookup = (w, method, metadata = {}) => {
    const result = getTextAttestations(w);
    if (hasUsefulData(result)) {
      return { ...result, lookupMethod: method, ...metadata };
    }
    return null;
  };

  // 1. Try direct lookup
  let result = tryLookup(word, 'exact');
  if (result?.totalRefs > 0) return result;

  // Keep best partial result (has dict sources but no text refs)
  let bestPartial = result;

  // 2. Try normalized finals
  const withFinals = restoreFinals(stripAllDiacritics(word));
  if (withFinals !== word) {
    result = tryLookup(withFinals, 'normalized-finals');
    if (result?.totalRefs > 0) return result;
    if (hasUsefulData(result) && !bestPartial) bestPartial = result;
  }

  // 3. Try root-based lookup using shared helper
  const { root: extractedRoot } = await extractRootHelper(word);
  if (extractedRoot && extractedRoot !== word) {
    result = tryLookup(extractedRoot, 'root-fallback', { originalWord: word, usedRoot: extractedRoot });
    if (result?.totalRefs > 0) return result;
    if (hasUsefulData(result) && !bestPartial) bestPartial = result;

    // Also try with finals restored
    const rootWithFinals = restoreFinals(extractedRoot);
    if (rootWithFinals !== extractedRoot) {
      result = tryLookup(rootWithFinals, 'root-fallback-finals', { originalWord: word, usedRoot: rootWithFinals });
      if (result?.totalRefs > 0) return result;
      if (hasUsefulData(result) && !bestPartial) bestPartial = result;
    }
  }

  // 4. Try prefix stripping using shared constant
  const stripped = stripAllDiacritics(word);
  for (const prefix of COMMON_PREFIXES) {
    if (stripped.startsWith(prefix) && stripped.length > prefix.length + 1) {
      const withoutPrefix = stripped.slice(prefix.length);
      result = tryLookup(withoutPrefix, 'prefix-stripped', { originalWord: word, strippedPrefix: prefix });
      if (result?.totalRefs > 0) return result;
      if (hasUsefulData(result) && !bestPartial) bestPartial = result;
    }
  }

// If we found dictionary sources but no text refs, return that
  if (bestPartial) {
    return { ...bestPartial, hasTextRefs: false };
  }

// Final fallback - check local dictionaries for sources
  const localSources = await getLocalDictionarySources(word, extractedRoot);
  if (localSources.length > 0) {
    return {
      word,
      totalRefs: 0,
      categories: {},
      allRefs: [],
      dictionarySources: localSources,
      hasTextRefs: false,
      lookupMethod: 'local-dictionaries',
      source: 'Local Dictionaries'
    };
  }

// Try live Sefaria API as final fallback (if enabled)
  const liveSources = await fetchSefariaLexiconLive(word);
  if (liveSources && liveSources.length > 0) {
    return {
      word,
      totalRefs: 0,
      categories: {},
      allRefs: [],
      dictionarySources: liveSources,
      hasTextRefs: false,
      lookupMethod: 'sefaria-api-live',
      source: 'Sefaria API (Live)'
    };
  }

  // Return "not found" metadata for UI
  return {
    word,
    totalRefs: 0,
    categories: {},
    allRefs: [],
    dictionarySources: [],
    hasTextRefs: false,
    lookupMethod: 'not-found',
    source: 'Sefaria Lexicon Cache'
  };
}

/**
 * Fetch lexicon data from live Sefaria API
 * Used when local caches don't have the word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Array>} Array of dictionary source objects
 */
async function fetchSefariaLexiconLive(word) {
  if (!word || word.length < 2) return [];

  const SEFARIA_BASE = getSefariaBase();

  try {
    const cleaned = stripAllDiacritics(word);
    const response = await fetch(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // Transform Sefaria response to our format
    return data.map((entry, idx) => {
      const source = entry.parent_lexicon || entry.lexicon || 'Sefaria';
      const tierInfo = getDictionaryTierInfo(source);
      return {
        name: source,
        fullName: tierInfo.fullName,
        definition: entry.content?.definition || entry.content?.senses?.[0]?.definition || '',
        pos: entry.content?.morphology || '',
        strongNumber: entry.content?.strong_number || null,
        tier: tierInfo.tier,
        tierIcon: tierInfo.icon,
        priority: tierInfo.priority + idx,
        lemma: entry.headword || null,
        fromLiveApi: true
      };
    }).filter(s => s.definition);
  } catch (err) {
    log.debug('[SefariaLive] API fetch failed:', err.message);
    return [];
  }
}

/**
 * Get dictionary sources from local caches
 * Fallback when Sefaria cache doesn't have the word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<Array>} Array of dictionary source objects
 */
/**
 * Dictionary tier configuration (DRY - derived from SOURCE_CONFIG)
 * Maps display names to SOURCE_CONFIG keys with additional UI metadata
 */
const TIER_ICONS = { gold: '🎓', silver: '📚', bronze: '📖' };
const TIER_NAMES = { gold: 'academic', silver: 'standard', bronze: 'supplementary' };

const getDictionaryTierInfo = (name) => {
  // Map display names to SOURCE_CONFIG keys
  const keyMap = {
    'BDB': 'bdb', 'Jastrow': 'jastrow', 'Gesenius': 'gesenius',
    'Klein': 'klein', "Strong's": 'strongs', 'CAL': 'cal'
  };
  const key = keyMap[name] || name.toLowerCase();
  const config = SOURCE_CONFIG[key];
  if (!config) return { tier: 'standard', icon: '📖', priority: 99, fullName: name };

  const tier = config.tier || 'bronze';
  const priorityMap = { gold: 1, silver: 5, bronze: 9 };
  return {
    tier: TIER_NAMES[tier] || tier,
    icon: TIER_ICONS[tier] || '📖',
    priority: priorityMap[tier] + (key === 'bdb' ? 0 : key === 'jastrow' ? 1 : key === 'gesenius' ? 2 : key === 'klein' ? 3 : key === 'cal' ? 4 : 5),
    fullName: config.fullName || name
  };
};

async function getLocalDictionarySources(word, preExtractedRoot = null) {
  const sources = [];
  const cleaned = stripAllDiacritics(word);

// Ensure all dictionaries are loaded first (critical fix)
  await Promise.all([
    loadDictionary('bdb').catch(() => null),
    loadDictionary('jastrow').catch(() => null),
    loadDictionary('strongs').catch(() => null),
    loadDictionary('geseniusLexicon').catch(() => null),
    loadDictionary('kleinLexicon').catch(() => null),
    loadDictionary('calAramaic').catch(() => null)
  ]);

  const wordsToTry = new Set([word, cleaned, normalizeFinals(cleaned), restoreFinals(cleaned)]);

  // Try root extraction for better coverage (use pre-extracted root if available)
  const extractedRoot = preExtractedRoot || (await extractRootHelper(word)).root;
  if (extractedRoot && extractedRoot.length >= 2) {
    wordsToTry.add(extractedRoot);
    wordsToTry.add(normalizeFinals(extractedRoot));
    wordsToTry.add(restoreFinals(extractedRoot));
  }

// Check each dictionary with tier info
  const dictChecks = [
    { cacheRef: () => cache.bdb, name: 'BDB', getEntry: (d, w) => d?.byWord?.[w] || d?.[w] },
    { cacheRef: () => cache.jastrow, name: 'Jastrow', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.strongs, name: "Strong's", getEntry: (d, w) => d?.byWord?.[w] || d?.[w] },
    { cacheRef: () => cache.geseniusLexicon, name: 'Gesenius', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.kleinLexicon, name: 'Klein', getEntry: (d, w) => d?.[w] },
    { cacheRef: () => cache.calAramaic, name: 'CAL', getEntry: (d, w) => d?.[w] },
  ];

  for (const { cacheRef, name, getEntry } of dictChecks) {
    const dictCache = cacheRef(); // Get fresh reference after load
    if (!dictCache) continue;

    let entry = null;
    let foundWord = null;
    for (const w of wordsToTry) {
      entry = getEntry(dictCache, w);
      if (entry) {
        foundWord = w;
        break;
      }
    }

    if (entry) {
      const def = entry.definition || entry.gloss || entry.english || entry.meaning || '';
      if (def) {
// Use DRY helper derived from SOURCE_CONFIG
        const tierInfo = getDictionaryTierInfo(name);
        sources.push({
          name,
          fullName: tierInfo.fullName,
          definition: def,
          pos: entry.pos || entry.partOfSpeech || '',
          strongNumber: entry.strongNumber || entry.strongs || entry.strong || null,
          tier: tierInfo.tier,
          tierIcon: tierInfo.icon,
          priority: tierInfo.priority,
// Additional scholarly metadata
          lemma: entry.lemma || entry.headword || null,
          etymology: entry.etymology || entry.cognates || null,
          references: entry.refs || entry.references || null,
          foundVia: foundWord !== word && foundWord !== cleaned ? foundWord : null
        });
      }
    }
  }

  // Sort by priority (academic dictionaries first)
  sources.sort((a, b) => a.priority - b.priority);

  return sources;
}
