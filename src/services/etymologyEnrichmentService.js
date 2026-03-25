/**
 * Etymology Enrichment Service
 * =============================
 * PRO SCHOLAR V12: Multi-source etymology with BDB, Jastrow, CAL, Sefaria, and Wiktionary.
 *
 * Data sources (in priority order):
 * 1. public/data/root_meanings_pro.json (22,049 entries - Consolidated PRO)
 * 2. public/data/etymology_unified_pro.json (Full Scholar Pro - CAL + Sefaria)
 * 3. public/data/sefaria_lexicon_cache.json (2,493 pre-parsed entries)
 * 4. public/data/etymology_bdb_extracted.json (2,591 BDB cognates - source data)
 * 5. public/data/etymology_jastrow_extracted.json (16,794 Jastrow cross-refs - source data)
 * NOTE: root_meanings_enriched.json merged into root_meanings_pro.json (V14)
 * 7. Wiktionary cache/API (fallback for Proto-Semitic and cognates)
 *
 * Features:
 * - 12+ cognate languages (Akkadian, Arabic, Aramaic, Phoenician, etc.)
 * - Aramaic dialect info (Babylonian, Palestinian, Targumic)
 * - Cross-reference resolution (Hebrew-Aramaic parallels)
 * - Quality scoring with source weighting
 * - Semantic field categorization
 * - 78,000+ entries across all scholarly sources
 * - Wiktionary fallback for Proto-Semitic reconstructions
 */

// Wiktionary integration for Proto-Semitic fallback (API + cached offline data)
import { fetchWiktionaryEtymology, getProtoSemitic } from './wiktionaryService';

// PRO SCHOLAR V12: Import all etymology databases from dictionaryLoader
// lookupAllEtymology now handles root extraction internally (smart lookup)
import {
  lookupAllEtymology
} from './dictionaryLoader';
import { stripAllDiacritics } from '../utils/hebrewUtils';

// Lazy-loaded data cache
let enrichedData = null;
let dataSource = null;

// Loading promises to prevent duplicate loads
let loadingPromise = null;

// PRO SCHOLAR V12: Data file paths (in priority order by scholarly quality)
// PRO SCHOLAR V14: root_meanings_enriched.json merged into root_meanings_pro.json
const DATA_FILES = [
  { path: '/data/root_meanings_pro.json', name: 'Root Meanings Pro (22,049)' },
  { path: '/data/etymology_unified_pro.json', name: 'Scholar Pro (Full)' }
];

/**
 * Load enriched etymology data (lazy, singleton)
 * Tries Scholar Pro unified data first, falls back to enriched
 */
async function loadEnrichedData() {
  if (enrichedData) {
    return enrichedData;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    // Try each data file in priority order
    for (const { path, name } of DATA_FILES) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;

        const data = await response.json();
        if (data?.entries && Object.keys(data.entries).length > 0) {
          enrichedData = data;
          dataSource = name;
          console.log(`[EtymologyService] Loaded ${name}:`, {
            totalEntries: Object.keys(data.entries).length,
            version: data._meta?.version,
            sources: data._meta?.sources?.length || 'N/A'
          });
          return data;
        }
      } catch (error) {
        // Try next file
        continue;
      }
    }

    console.warn('[EtymologyService] No etymology data found');
    return null;
  })();

  loadingPromise.finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

/**
 * Get enriched etymology for a word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object|null} Enriched etymology data
 */
export async function getEnrichedEtymology(word) {
  const data = await loadEnrichedData();
  if (!data?.entries) {
    return null;
  }

  // Direct lookup
  let entry = data.entries[word];

  // Try without vowel points if not found
  if (!entry) {
    const stripped = stripAllDiacritics(word);
    entry = data.entries[stripped];
  }

  if (!entry) {
    return null;
  }

  return {
    word: entry.key,
    lemma: entry.lemma,
    root: entry.root,
    pos: entry.pos,
    strongsNumber: entry.strongsNumber,
    isAramaic: entry.isAramaic,
    isBiblicalHebrew: entry.isBiblicalHebrew,
    semanticField: entry.semanticField,
    // PRO SCHOLAR V12: New academic fields
    talmudUsage: entry.talmudUsage || null,
    calTransliteration: entry.calTransliteration || null,
    frequency: entry.frequency || null,
    definitions: entry.definitions || [],
    attestations: entry.attestations || [],
    etymology: {
      cognates: formatCognates(entry.etymology?.cognates),
      protoSemitic: entry.etymology?.protoSemitic,
      confidence: entry.etymology?.confidence,
      relatedRoots: entry.etymology?.relatedRoots || [],
      references: entry.etymology?.references || {}
    },
    crossReferences: {
      hebrewEquivalents: entry.crossReferences?.hebrewEquivalents || [],
      seeAlso: entry.crossReferences?.seeAlso || [],
      roots: entry.crossReferences?.roots || []
    },
    loanwords: entry.loanwords || {},
    dialects: entry.dialects || [],
    sources: entry.sources || [],
    qualityScore: entry.qualityScore || 0,
    qualityLevel: getQualityLevel(entry.qualityScore)
  };
}

/**
 * Synchronous version for quick lookups (requires data to be preloaded)
 */
export function getEnrichedEtymologySync(word) {
  if (!enrichedData?.entries) {
    return null;
  }

  let entry = enrichedData.entries[word];

  if (!entry) {
    const stripped = stripAllDiacritics(word);
    entry = enrichedData.entries[stripped];
  }

  if (!entry) {
    return null;
  }

  return {
    word: entry.key,
    lemma: entry.lemma,
    root: entry.root,
    pos: entry.pos,
    isAramaic: entry.isAramaic,
    semanticField: entry.semanticField,
    // PRO SCHOLAR V12: New academic fields
    talmudUsage: entry.talmudUsage || null,
    calTransliteration: entry.calTransliteration || null,
    dialects: entry.dialects || [],
    definitions: entry.definitions || [],
    cognates: formatCognates(entry.etymology?.cognates),
    protoSemitic: entry.etymology?.protoSemitic,
    confidence: entry.etymology?.confidence,
    sources: entry.sources || [],
    qualityScore: entry.qualityScore || 0
  };
}

/**
 * PRO SCHOLAR: Get enriched etymology with Wiktionary fallback
 * Fetches local data first, then supplements with Wiktionary if:
 * - No Proto-Semitic reconstruction found
 * - Missing cognate languages
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Options
 * @param {boolean} options.includeWiktionary - Enable Wiktionary fallback (default: true)
 * @returns {Object|null} Enriched etymology with Wiktionary data merged
 */
export async function getEnrichedEtymologyWithFallback(word, options = {}) {
  const { includeWiktionary = true } = options;

  // Get local etymology first
  const localEtymology = await getEnrichedEtymology(word);

  // If we have good local data with Proto-Semitic, return it
  if (localEtymology?.etymology?.protoSemitic && !includeWiktionary) {
    return localEtymology;
  }

  // If no local data or missing Proto-Semitic, try Wiktionary
  if (includeWiktionary) {
    try {
      // PRO SCHOLAR: Try cached Wiktionary data first (fast/offline), then API
      let wiktionaryData = await getProtoSemitic(word);

      // If no cached data, fall back to API
      if (!wiktionaryData) {
        wiktionaryData = await fetchWiktionaryEtymology(word);
      }

      if (wiktionaryData) {
        // Merge Wiktionary data with local data
        if (localEtymology) {
          return mergeEtymologyWithWiktionary(localEtymology, wiktionaryData);
        }

        // No local data - return Wiktionary-only result
        return {
          word,
          lemma: word,
          root: wiktionaryData.root,
          etymology: {
            protoSemitic: wiktionaryData.protoSemitic,
            cognates: formatWiktionaryCognates(wiktionaryData.cognates),
            confidence: 'reference',
            relatedRoots: [],
            references: { wiktionary: wiktionaryData.etymologyText }
          },
          crossReferences: { hebrewEquivalents: [], seeAlso: [], roots: [] },
          sources: [wiktionaryData.source || 'Wiktionary'],
          qualityScore: 30, // Lower score for Wiktionary-only
          qualityLevel: 'low',
          wiktionaryEnriched: true
        };
      }
    } catch (error) {
      // Wiktionary failed, return local data if available
      console.debug('[Etymology] Wiktionary fallback failed:', error.message);
    }
  }

  return localEtymology;
}

/**
 * PRO SCHOLAR V12: Comprehensive multi-source etymology lookup
 * Uses all available databases: Sefaria cache, Root Pro, BDB, Jastrow, Wiktionary
 * Returns aggregated data from ALL sources that have matches
 * SMART: lookupAllEtymology automatically handles root extraction fallback
 *
 * @param {string} word - Hebrew/Aramaic word (inflected forms like יציאות work automatically)
 * @returns {Object} Combined etymology from all sources
 */
export async function getComprehensiveEtymology(word) {
  if (!word) return null;

  const stripped = stripAllDiacritics(word);

  // PRO SCHOLAR V12: Smart lookup - automatically tries root if word not found
  // lookupAllEtymology now handles root extraction internally
  const lookupPromise = typeof lookupAllEtymology === 'function'
    ? lookupAllEtymology(stripped)?.catch?.(() => ({})) ?? Promise.resolve({})
    : Promise.resolve({});

  const [allEtymology, localEtymology, protoSemitic] = await Promise.all([
    lookupPromise,
    getEnrichedEtymology(word).catch(() => null),
    getProtoSemitic(stripped).catch(() => null)
  ]);

  // Use the extracted root from smart lookup (if root fallback was used)
  const extractedRoot = allEtymology.extractedRoot || null;

  // If smart lookup used root fallback, also try Proto-Semitic with that root
  let protoSemiticFromRoot = protoSemitic;
  if (extractedRoot && !protoSemitic) {
    try {
      protoSemiticFromRoot = await getProtoSemitic(extractedRoot);
    } catch (e) {
      // Silent fail
    }
  }

  // Aggregate all sources - PRO SCHOLAR V12: Full source objects for WordDefinitionCard
  const sources = [];
  const sourceNames = []; // Track names to avoid duplicates
  let cognates = {};
  let protoSemiticForm = null;
  let root = extractedRoot || null;
  let definition = null;
  let qualityScore = 0;

  // 1. Check Sefaria cache (pre-parsed Klein, BDB, Jastrow, Strong's)
  if (allEtymology.sefaria) {
    sourceNames.push('Sefaria');
    sources.push({
      name: 'Sefaria',
      fullName: 'Sefaria Lexicon',
      definition: allEtymology.sefaria.definition || '',
      year: 2013,
      searchedWord: stripped,
      tier: 'silver' // PRO SCHOLAR V12: Aggregator with multiple academic sources
    });
    if (allEtymology.sefaria.definition) {
      definition = definition || allEtymology.sefaria.definition;
    }
    if (allEtymology.sefaria.root) {
      root = root || allEtymology.sefaria.root;
    }
    qualityScore = Math.max(qualityScore, 85);
  }

  // 2. Check Root Meanings Pro (18,898 entries)
  if (allEtymology.rootMeaningsPro) {
    const entry = allEtymology.rootMeaningsPro;
    sourceNames.push('Root Pro');
    sources.push({
      name: 'Root Pro',
      fullName: 'Root Meanings Pro',
      definition: entry.meaning || entry.definition || '',
      year: 2024,
      searchedWord: entry.root || stripped,
      tier: 'silver' // PRO SCHOLAR V12: Compiled from multiple academic sources
    });
    if (entry.cognates) {
      cognates = { ...cognates, ...formatStoredCognates(entry.cognates) };
    }
    if (entry.protoSemitic) {
      protoSemiticForm = protoSemiticForm || entry.protoSemitic;
    }
    if (entry.root) {
      root = root || entry.root;
    }
    qualityScore = Math.max(qualityScore, entry.qualityScore || 70);
  }

  // 3. Check BDB extracted etymology (2,591 entries)
  if (allEtymology.etymologyBDB) {
    const entry = allEtymology.etymologyBDB;
    sourceNames.push('BDB');
    sources.push({
      name: 'BDB',
      fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
      definition: entry.definition || entry.headword || '',
      year: 1906,
      searchedWord: entry.headword || stripped,
      tier: 'gold' // PRO SCHOLAR V12: Academic standard for Biblical Hebrew
    });
    if (entry.cognates) {
      cognates = mergeCognates(cognates, formatStoredCognates(entry.cognates));
    }
    qualityScore = Math.max(qualityScore, 75);
  }

  // 4. Check Jastrow extracted etymology (16,794 entries)
  if (allEtymology.etymologyJastrow) {
    const entry = allEtymology.etymologyJastrow;
    sourceNames.push('Jastrow');
    sources.push({
      name: 'Jastrow',
      fullName: 'Jastrow Dictionary of Talmud',
      definition: entry.definition || entry.headword || '',
      year: 1903,
      searchedWord: entry.headword || stripped,
      tier: 'gold' // PRO SCHOLAR V12: Academic standard for Talmudic Hebrew/Aramaic
    });
    if (entry.crossRefs) {
      // Add Jastrow cross-references as related words
      cognates.aramaic = cognates.aramaic || { words: [], displayName: 'Aramaic' };
      if (Array.isArray(entry.crossRefs)) {
        cognates.aramaic.words.push(...entry.crossRefs.filter(r => typeof r === 'string'));
      }
    }
    qualityScore = Math.max(qualityScore, 70);
  }

  // 5. Check Wiktionary cache (Proto-Semitic)
  if (allEtymology.wiktionary || protoSemiticFromRoot) {
    const wikiData = allEtymology.wiktionary || protoSemiticFromRoot;
    sourceNames.push('Wiktionary');
    sources.push({
      name: 'Wiktionary',
      fullName: 'Wiktionary Proto-Semitic',
      definition: wikiData.protoSemitic ? `Proto-Semitic: ${wikiData.protoSemitic}` : '',
      year: 2024,
      searchedWord: stripped,
      tier: 'bronze' // PRO SCHOLAR V12: Community-sourced, supplementary
    });
    if (wikiData.protoSemitic) {
      protoSemiticForm = protoSemiticForm || wikiData.protoSemitic;
    }
    if (wikiData.cognates) {
      cognates = mergeCognates(cognates, formatWiktionaryCognates(wikiData.cognates));
    }
    qualityScore = Math.max(qualityScore, 50);
  }

  // 6. Merge with local enriched data if available
  if (localEtymology) {
    if (!sourceNames.includes('Enriched')) {
      sourceNames.push('Enriched');
      sources.push({
        name: 'Enriched',
        fullName: 'Enriched Local Database',
        definition: localEtymology.definition || localEtymology.lemma || '',
        year: 2024,
        searchedWord: localEtymology.lemma || stripped,
        tier: 'bronze' // PRO SCHOLAR V12: Local curated data
      });
    }
    if (localEtymology.etymology?.cognates) {
      cognates = mergeCognates(cognates, localEtymology.etymology.cognates);
    }
    if (localEtymology.etymology?.protoSemitic) {
      protoSemiticForm = protoSemiticForm || localEtymology.etymology.protoSemitic;
    }
    root = root || localEtymology.root;
    qualityScore = Math.max(qualityScore, localEtymology.qualityScore || 0);
  }

  // PRO SCHOLAR V12: Even if no dictionary sources found, return extractedRoot if available
  // This ensures the UI can display the computed root (e.g., יציאות → יצא)
  if (sources.length === 0) {
    if (extractedRoot) {
      return {
        word: stripped,
        lemma: stripped,
        root: extractedRoot,
        definition: null,
        etymology: { cognates: {}, protoSemitic: null, confidence: 'low', relatedRoots: [] },
        sources: [],
        qualityScore: 0,
        qualityLevel: 'low',
        multiSourceMatch: false,
        hasEtymology: false,
        extractedRoot: extractedRoot,
        usedRootFallback: true,
        alternativeRoots: allEtymology.alternativeRoots || []
      };
    }
    return null;
  }

  return {
    word: stripped,
    lemma: localEtymology?.lemma || stripped,
    root,
    definition,
    etymology: {
      cognates,
      protoSemitic: protoSemiticForm,
      confidence: qualityScore >= 70 ? 'high' : qualityScore >= 40 ? 'medium' : 'low',
      relatedRoots: localEtymology?.etymology?.relatedRoots || []
    },
    sources,
    qualityScore,
    qualityLevel: getQualityLevel(qualityScore),
    multiSourceMatch: sources.length > 1,
    hasEtymology: true,
    // PRO SCHOLAR V12: Smart lookup info
    extractedRoot: extractedRoot,
    usedRootFallback: !!allEtymology.usedRootFallback,
    alternativeRoots: allEtymology.alternativeRoots || []
  };
}

/**
 * Format stored cognates from JSON databases
 */
function formatStoredCognates(cognates) {
  if (!cognates) return {};
  if (typeof cognates !== 'object') return {};

  const formatted = {};
  for (const [lang, data] of Object.entries(cognates)) {
    if (Array.isArray(data)) {
      formatted[lang] = {
        words: data,
        displayName: getLanguageDisplayName(lang),
        count: data.length
      };
    } else if (data?.words) {
      formatted[lang] = data;
    } else if (typeof data === 'string') {
      formatted[lang] = {
        words: [data],
        displayName: getLanguageDisplayName(lang),
        count: 1
      };
    }
  }
  return formatted;
}

/**
 * Merge two cognate objects, combining words from same languages
 */
function mergeCognates(base, additional) {
  if (!additional) return base;
  const merged = { ...base };

  for (const [lang, data] of Object.entries(additional)) {
    if (!merged[lang]) {
      merged[lang] = data;
    } else {
      // Merge words from same language, avoiding duplicates
      const existingWords = new Set(merged[lang].words || []);
      const newWords = data.words || [];
      for (const w of newWords) {
        if (!existingWords.has(w)) {
          merged[lang].words = merged[lang].words || [];
          merged[lang].words.push(w);
        }
      }
      merged[lang].count = (merged[lang].words || []).length;
    }
  }

  return merged;
}

/**
 * Merge local etymology with Wiktionary data
 * Wiktionary supplements missing fields, doesn't override
 */
function mergeEtymologyWithWiktionary(local, wiktionary) {
  const merged = { ...local };

  // Add Proto-Semitic if missing locally
  if (!local.etymology?.protoSemitic && wiktionary.protoSemitic) {
    merged.etymology = {
      ...merged.etymology,
      protoSemitic: wiktionary.protoSemitic,
      protoSemiticSource: 'Wiktionary'
    };
  }

  // Merge cognates (add missing languages)
  if (wiktionary.cognates && Object.keys(wiktionary.cognates).length > 0) {
    const localCognates = merged.etymology?.cognates || {};
    const wiktionaryCognates = formatWiktionaryCognates(wiktionary.cognates);

    for (const [lang, data] of Object.entries(wiktionaryCognates)) {
      if (!localCognates[lang]) {
        localCognates[lang] = { ...data, source: 'Wiktionary' };
      }
    }

    merged.etymology = {
      ...merged.etymology,
      cognates: localCognates
    };
  }

  // Add root if missing
  if (!local.root && wiktionary.root) {
    merged.root = wiktionary.root;
  }

  // Mark as Wiktionary-enriched
  merged.wiktionaryEnriched = true;
  if (!merged.sources.includes('Wiktionary')) {
    merged.sources = [...merged.sources, 'Wiktionary'];
  }

  return merged;
}

/**
 * Format Wiktionary cognates to match local format
 */
function formatWiktionaryCognates(cognates) {
  if (!cognates) return {};

  const formatted = {};
  for (const [lang, words] of Object.entries(cognates)) {
    if (Array.isArray(words) && words.length > 0) {
      formatted[lang] = {
        words,
        displayName: getLanguageDisplayName(lang),
        count: words.length,
        source: 'Wiktionary'
      };
    }
  }
  return formatted;
}

/**
 * Format cognates for display
 */
function formatCognates(cognates) {
  if (!cognates) return {};

  const formatted = {};

  for (const [lang, entries] of Object.entries(cognates)) {
    const words = entries.map(e => {
      if (typeof e === 'string') return e;
      return e.word;
    }).filter(Boolean);

    if (words.length > 0) {
      formatted[lang] = {
        words,
        displayName: getLanguageDisplayName(lang),
        count: words.length
      };
    }
  }

  return formatted;
}

/**
 * Get human-readable language name
 */
function getLanguageDisplayName(lang) {
  const names = {
    akkadian: 'Akkadian',
    arabic: 'Arabic',
    aramaic: 'Aramaic',
    phoenician: 'Phoenician',
    ugaritic: 'Ugaritic',
    ethiopic: 'Ethiopic (Ge\'ez)',
    moabite: 'Moabite',
    sabean: 'Sabean',
    egyptian: 'Egyptian',
    persian: 'Persian',
    greek: 'Greek',
    latin: 'Latin',
    syriac: 'Syriac'
  };
  return names[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

/**
 * Get quality level from score
 */
function getQualityLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Get all cognates for a word
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Object} Cognates by language
 */
export async function getCognates(word) {
  const enriched = await getEnrichedEtymology(word);
  if (!enriched) {
    return {};
  }
  return enriched.etymology.cognates;
}

/**
 * Get cross-references (Hebrew equivalents for Aramaic words, related entries)
 */
export async function getCrossReferences(word) {
  const enriched = await getEnrichedEtymology(word);
  if (!enriched) {
    return { hebrewEquivalents: [], seeAlso: [], roots: [] };
  }
  return enriched.crossReferences;
}

/**
 * Check if a word is Aramaic
 */
export async function isAramaic(word) {
  const enriched = await getEnrichedEtymology(word);
  return enriched?.isAramaic ?? false;
}

/**
 * Get semantic field for a word
 */
export async function getSemanticField(word) {
  const enriched = await getEnrichedEtymology(word);
  return enriched?.semanticField ?? null;
}

/**
 * Search for words by cognate language
 * @param {string} language - Language code (akkadian, arabic, aramaic, etc.)
 * @param {number} limit - Maximum results
 */
export async function findWordsByCognateLanguage(language, limit = 50) {
  const data = await loadEnrichedData();
  if (!data?.entries) {
    return [];
  }

  const results = [];
  for (const [word, entry] of Object.entries(data.entries)) {
    if (entry.etymology?.cognates?.[language]) {
      results.push({
        word,
        lemma: entry.lemma,
        cognates: entry.etymology.cognates[language]
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Search for words by semantic field
 * @param {string} field - Semantic field (governance, movement, speech, etc.)
 * @param {number} limit - Maximum results
 */
export async function findWordsBySemanticField(field, limit = 50) {
  const data = await loadEnrichedData();
  if (!data?.entries) {
    return [];
  }

  const results = [];
  for (const [word, entry] of Object.entries(data.entries)) {
    if (entry.semanticField === field) {
      results.push({
        word,
        lemma: entry.lemma,
        definition: entry.definition
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get statistics about the enriched data
 */
export async function getDataStatistics() {
  const data = await loadEnrichedData();
  if (!data?._meta?.statistics) {
    return null;
  }
  return {
    ...data._meta.statistics,
    dataSource,
    version: data._meta?.version
  };
}

/**
 * Get dialect information for an Aramaic word
 * @param {string} word - Aramaic word
 * @returns {Array} List of dialects (e.g., ['Jewish Babylonian Aramaic', 'Targumic'])
 */
export async function getDialects(word) {
  const enriched = await getEnrichedEtymology(word);
  return enriched?.dialects || [];
}

/**
 * Get attestations (where the word appears in texts)
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Array} List of attestation references
 */
export async function getAttestations(word) {
  const data = await loadEnrichedData();
  if (!data?.entries?.[word]) {
    const stripped = stripAllDiacritics(word);
    return data?.entries?.[stripped]?.attestations || [];
  }
  return data.entries[word].attestations || [];
}

/**
 * Get all definitions from multiple sources
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Array} Definitions with source attribution
 */
export async function getAllDefinitions(word) {
  const data = await loadEnrichedData();
  let entry = data?.entries?.[word];

  if (!entry) {
    const stripped = stripAllDiacritics(word);
    entry = data?.entries?.[stripped];
  }

  if (!entry) return [];

  return entry.definitions || (entry.definition ? [{ text: entry.definition, source: 'primary' }] : []);
}

/**
 * Search for words by dialect
 * @param {string} dialect - Dialect name (e.g., 'Jewish Babylonian Aramaic')
 * @param {number} limit - Maximum results
 */
export async function findWordsByDialect(dialect, limit = 50) {
  const data = await loadEnrichedData();
  if (!data?.entries) {
    return [];
  }

  const results = [];
  const dialectLower = dialect.toLowerCase();

  for (const [word, entry] of Object.entries(data.entries)) {
    const hasDialect = (entry.dialects || []).some(d =>
      d.toLowerCase().includes(dialectLower)
    );

    if (hasDialect) {
      results.push({
        word,
        lemma: entry.lemma,
        dialects: entry.dialects,
        definition: entry.definition
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get current data source name
 */
export function getDataSource() {
  return dataSource;
}

/**
 * Preload data (call during app initialization)
 */
export async function preloadEnrichedData() {
  return loadEnrichedData();
}

/**
 * Check if data is loaded
 */
export function isDataLoaded() {
  return enrichedData !== null;
}

/**
 * Get raw entry (for debugging/advanced use)
 */
export async function getRawEntry(word) {
  const data = await loadEnrichedData();
  return data?.entries?.[word] || null;
}

// Export for testing
export const _internal = {
  formatCognates,
  formatWiktionaryCognates,
  mergeEtymologyWithWiktionary,
  getLanguageDisplayName,
  getQualityLevel
};

const etymologyEnrichmentService = {
  // Core lookup
  getEnrichedEtymology,
  getEnrichedEtymologySync,
  getEnrichedEtymologyWithFallback, // PRO SCHOLAR: Wiktionary-enriched
  getComprehensiveEtymology, // PRO SCHOLAR V12: Multi-source lookup
  getCognates,
  getCrossReferences,
  isAramaic,
  getSemanticField,

  // Scholar Pro: Dialect & Attestation (CAL data)
  getDialects,
  getAttestations,
  getAllDefinitions,

  // Search functions
  findWordsByCognateLanguage,
  findWordsBySemanticField,
  findWordsByDialect,

  // Data management
  getDataStatistics,
  getDataSource,
  preloadEnrichedData,
  isDataLoaded,
  getRawEntry
};

export default etymologyEnrichmentService;
