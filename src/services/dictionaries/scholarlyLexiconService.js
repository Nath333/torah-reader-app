// =============================================================================
// Scholarly Lexicon Service — FAÇADE
// Academic-grade Hebrew/Aramaic dictionary with multiple scholarly sources
// Integrates: BDB, Jastrow, Strong's, Klein Etymology, Gesenius, HALOT refs
//
// Split docs/DECOUPE-MONOLITHES.md — modules sous ./scholarlyLexicon/ :
//   state.js        caches + version de cache (état partagé)
//   rootUtils.js    nettoyage de mot, racines protégées, translittération
//   textCleaning.js nettoyage des définitions (notation savante)
//   localLookup.js  dictionnaires locaux offline (Jastrow, BDB, Strong's)
//   fetchers.js     sources en ligne (Sefaria, Bolls, STEP Bible, CAL)
//   parsers.js      filtrage headword + parsing par source
//   wordForms.js    variantes morphologiques
// La façade garde le pipeline scholarlyLookup et l'API publique ; tous les
// exports d'origine sont conservés (aucun importeur à modifier).
// =============================================================================

// Use CacheOrchestrator for unified cache management (via ./scholarlyLexicon/state)
import { createLogger } from '../../utils/debug';
import { fetchWithFallback } from '../../utils/http';
// Import halachic overrides for context-specific translations
import { HALACHIC_OVERRIDE } from '../../utils/commentaryUtils';
import { analyzeWord as analyzeGrammar } from '../analysis/grammarAnalysisService';
// Telemetry integration for tracking lookup performance
import { recordLookup, recordDictionaryLookup } from '../telemetryService';
import {
  SCHOLARLY_SOURCES,
  COGNATE_LANGUAGES,
  COGNATE_PATTERNS,
  BINYAN_INFO,
  VERB_TENSES
} from './scholarlyLexiconData';
// Modules extraits du monolithe d'origine
import { cleanWord, cleanWordForLookup, extractRoot, transliterateHebrew } from './scholarlyLexicon/rootUtils';
import {
  preloadDictionaries,
  getDictionaryStats,
  lookupLocalDictionaries,
  lookupAllLocalDictionaries,
  lookupLocalJastrow,
  loadLocalJastrow
} from './scholarlyLexicon/localLookup';
import { generateWordForms } from './scholarlyLexicon/wordForms';
import {
  SEFARIA_BASE,
  fetchSefariaLexicon,
  fetchSefariaWordAlternative,
  fetchBollsLifeDefinition,
  fetchStepBibleDefinition,
  fetchCALDefinition
} from './scholarlyLexicon/fetchers';
import { cleanDefinitionText, extractJastrowMeaning } from './scholarlyLexicon/textCleaning';
import { parseBySource, prioritizeJastrowEntries, extractDefinitions } from './scholarlyLexicon/parsers';
import { scholarlyCache, CACHE_VERSION } from './scholarlyLexicon/state';

const log = createLogger('ScholarlyLexicon');

// Données pures (sources, cognats, grammaire Gesenius) déplacées dans
// ./scholarlyLexiconData.js — ré-exportées pour les consommateurs de la façade.
// Idem pour l'offline (localLookup) — l'API d'origine est intégralement conservée.
export {
  SCHOLARLY_SOURCES,
  preloadDictionaries,
  getDictionaryStats,
  lookupLocalDictionaries
};

// =============================================================================
// MAIN SCHOLARLY LOOKUP FUNCTION
// =============================================================================

/**
 * Comprehensive scholarly word lookup
 * Tries multiple word forms if exact match not found
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object>} Full scholarly analysis
 */
export const scholarlyLookup = async (word) => {
  const startTime = performance.now();
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  const cacheKey = `scholarly:${CACHE_VERSION}:${cleaned}`;
  const cached = scholarlyCache.get(cacheKey);
  if (cached) {
    // Record cache hit telemetry
    const durationMs = performance.now() - startTime;
    recordLookup({
      word: cleaned,
      success: true,
      fromCache: true,
      durationMs,
      source: cached.primarySource || 'cache'
    });
    return cached;
  }

  // ==========================================================================
  // HALACHIC OVERRIDE: Check context-specific translations FIRST
  // This ensures words like השבת → "the Shabbat" (not "intermission")
  // NOTE: We no longer short-circuit here - we continue to fetch scholarly sources
  // and add the halachic override as a "recommended" source alongside them
  // ==========================================================================
  let halachicOverride = null;
  if (HALACHIC_OVERRIDE[cleaned]) {
    halachicOverride = {
      source: { name: 'Halachic', fullName: 'Halachic Context (recommended for Talmud study)' },
      headword: cleaned,
      definitions: [{ text: HALACHIC_OVERRIDE[cleaned], recommended: true }],
      _isOverride: true,
      recommended: true
    };
  }

  // ==========================================================================
  // LOCAL-FIRST: Get ALL local dictionaries (36k+ entries) for comprehensive data
  // These will be merged with API results to provide multiple scholarly sources
  // ==========================================================================
  const allLocalResults = await lookupAllLocalDictionaries(cleaned);

  // Generate word forms to try
  const wordForms = generateWordForms(cleaned);

  // Try each form until we find results
  let sefariaData = null;
  let matchedForm = cleaned;

  for (const form of wordForms) {
    const data = await fetchSefariaLexicon(form);
    if (data && Array.isArray(data) && data.length > 0) {
      sefariaData = data;
      matchedForm = form;
      break;
    }
  }

  // If no results from main API, try alternative endpoints
  if (!sefariaData || sefariaData.length === 0) {
    for (const form of wordForms.slice(0, 3)) { // Try first 3 forms only
      const altData = await fetchSefariaWordAlternative(form);
      if (altData && altData.length > 0) {
        sefariaData = altData;
        matchedForm = form;
        break;
      }
    }
  }

  // Parse entries by source, filtering by headword match to get accurate definitions
  const bySource = parseBySource(sefariaData, matchedForm);

  // Always try local Jastrow (25,000+ entries with morphological analysis)
  // Local is faster and handles prefixes/suffixes better than API
  try {
    const localEntry = await lookupLocalJastrow(cleaned);
    if (localEntry) {
      // Build morphological analysis note
      let morphNote = '';
      if (localEntry._strippedPrefix) {
        const prefixMeanings = {
          'ו': 'and', 'ה': 'the', 'ב': 'in', 'ל': 'to', 'מ': 'from', 'כ': 'like', 'ש': 'that',
          'וה': 'and the', 'וב': 'and in', 'ול': 'and to', 'ומ': 'and from',
          'שה': 'that the', 'כש': 'when'
        };
        const prefixMeaning = prefixMeanings[localEntry._strippedPrefix] || localEntry._strippedPrefix;
        morphNote += `[${prefixMeaning} + `;
      }
      if (localEntry._strippedSuffix) {
        const suffixMeanings = {
          'ים': 'pl.masc', 'ות': 'pl.fem', 'ין': 'pl.Aram', 'י': 'my', 'ך': 'your',
          'הם': 'their', 'נו': 'our'
        };
        morphNote += morphNote ? '' : '[';
        morphNote += `${localEntry._matchedForm} + ${suffixMeanings[localEntry._strippedSuffix] || localEntry._strippedSuffix}]`;
      } else if (morphNote) {
        morphNote += `${localEntry._matchedForm}]`;
      }

      // Add to results - prioritize local if API also returned results
      const localFormatted = {
        headword: localEntry.lemma || localEntry._matchedForm || cleaned,
        parent_lexicon: 'Jastrow Dictionary',
        content: localEntry.definition,
        short_definition: localEntry.definition,
        _isLocal: true,
        _ref: localEntry.ref,
        _matchType: localEntry._matchType,
        _morphNote: morphNote || null,
        _matchedForm: localEntry._matchedForm,
        // Copy morphological metadata so strictHeadwordFilter accepts these
        _strippedPrefix: localEntry._strippedPrefix,
        _strippedSuffix: localEntry._strippedSuffix
      };

      // If API didn't find Jastrow, use local
      if (bySource.jastrow.length === 0) {
        bySource.jastrow.push(localFormatted);
      } else {
        // API found something - check if local found a better/different match
        const apiHeadwords = bySource.jastrow.map(e => cleanWordForLookup(e.headword || ''));
        const localHeadword = cleanWordForLookup(localEntry._matchedForm || '');
        if (!apiHeadwords.includes(localHeadword)) {
          // Local found a different entry - add it
          bySource.jastrow.unshift(localFormatted);
        }
      }
    }
  } catch (e) { /* silent */ }

  // ==========================================================================
  // ADD ALL LOCAL DICTIONARY RESULTS (BDB, Strong's) for comprehensive scholarly data
  // This ensures users see multiple sources even when API is limited
  // ==========================================================================

  // Add local BDB if API didn't find it
  if (allLocalResults?.bdb && bySource.bdb.length === 0) {
    bySource.bdb.push(allLocalResults.bdb);
  }

  // Add local Strong's if API didn't find it
  if (allLocalResults?.strongs && bySource.strong.length === 0) {
    bySource.strong.push(allLocalResults.strongs);
  }

  // Also add local Jastrow from allLocalResults if not already added
  if (allLocalResults?.jastrow && bySource.jastrow.length === 0) {
    bySource.jastrow.push(allLocalResults.jastrow);
  }

  // Add Aramaic variant from Jastrow if found (e.g., רשות → רשותא = domain)
  // This provides the Talmudic meaning alongside the Hebrew meaning
  if (allLocalResults?.jastrowAlt) {
    // Add as a separate Jastrow entry with Aramaic context
    bySource.jastrow.push(allLocalResults.jastrowAlt);
  }

  /**
   * SMART headword filter - LCS + edit distance with prefix penalty
   */
  const strictHeadwordFilter = (entries) => {
    if (!entries || entries.length === 0) return [];

    // Edit distance
    const editDist = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
      for (let i = 0; i <= a.length; i++) m[0][i] = i;
      for (let j = 0; j <= b.length; j++) m[j][0] = j;
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          m[j][i] = Math.min(m[j][i-1] + 1, m[j-1][i] + 1, m[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1));
        }
      }
      return m[b.length][a.length];
    };

    // LCS length (preserves character order)
    const lcs = (a, b) => {
      const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
        }
      }
      return m[b.length][a.length];
    };

    const scored = entries.map(entry => {
      const head = cleanWord(entry.headword || entry.word || entry.term || '');
      if (!head) return { entry, score: 0 };
      if (head === cleaned) return { entry, score: 1 };

      // MORPHOLOGICAL MATCH: Local entries with suffix/prefix stripping should pass
      // These are INTENTIONAL matches (e.g., הוצאות → הוצא via suffix strip)
      if (entry._strippedSuffix || entry._strippedPrefix || entry._isLocal) {
        return { entry, score: 0.95 }; // High score - valid morphological match
      }

      const maxLen = Math.max(cleaned.length, head.length);
      const minLen = Math.min(cleaned.length, head.length);

      // Core metrics
      const editSim = 1 - editDist(cleaned, head) / maxLen;
      const lcsRatio = lcs(cleaned, head) / maxLen;
      const lenRatio = minLen / maxLen;

      // Combined score emphasizing LCS
      let score = (editSim * 0.35) + (lcsRatio * 0.45) + (lenRatio * 0.2);

      // PENALTY: If search is longer and head is prefix, reduce score strongly
      // BUT skip for entries with _matchedForm (already verified morphologically)
      if (cleaned.startsWith(head) && head.length < cleaned.length && !entry._matchedForm) {
        const extraRatio = (cleaned.length - head.length) / cleaned.length;
        score *= (1 - extraRatio * 0.8); // Strong penalty
      }

      return { entry, score };
    });

    const maxScore = Math.max(...scored.map(s => s.score), 0);
    const threshold = Math.max(0.6, maxScore * 0.75); // Higher thresholds

    return scored.filter(s => s.score >= threshold).sort((a, b) => b.score - a.score).map(s => s.entry);
  };

  // Try Bolls.life API as additional source (if no BDB results from Sefaria)
  let bollsResult = null;
  if (bySource.bdb.length === 0) {
    for (const form of wordForms.slice(0, 2)) { // Try first 2 forms
      bollsResult = await fetchBollsLifeDefinition(form);
      if (bollsResult && bollsResult.definition) {
        break;
      }
    }
  }

  // Try STEP Bible if we have a Strong's number (primary scholarly source)
  let stepBibleResult = null;
  const strongNumber = bySource.strong?.[0]?.strong_number || bollsResult?.strongNumber;
  if (strongNumber) {
    try {
      stepBibleResult = await fetchStepBibleDefinition(strongNumber);
    } catch (e) { /* silent */ }
  }

  // Try CAL (Comprehensive Aramaic Lexicon) for Aramaic words
  // CAL is the premier academic Aramaic dictionary - essential for Talmud/Targum study
  let calResult = null;
  // Always try CAL for Aramaic lookups, or if Jastrow had results (indicates Aramaic)
  if (bySource.jastrow.length > 0 || bySource.steinsaltz?.length > 0) {
    try {
      calResult = await fetchCALDefinition(cleaned);
    } catch (e) { /* silent */ }
  }

  // Check if we have scholarly results (include halachic override)
  const hasResults = halachicOverride ||
                     bySource.bdb.length > 0 || bySource.jastrow.length > 0 ||
                     bySource.strong.length > 0 || bySource.klein.length > 0 ||
                     bySource.steinsaltz?.length > 0 || bySource.sefaria?.length > 0 ||
                     bySource.halot?.length > 0 || bySource.gesenius?.length > 0 ||
                     bySource.twot?.length > 0 || (bollsResult && bollsResult.definition) ||
                     (stepBibleResult && stepBibleResult.definition) ||
                     (calResult && calResult.definitions?.length > 0);

  // Build comprehensive result
  const result = {
    word: word,
    cleaned: cleaned,
    transliteration: transliterateHebrew(word), // Scholarly Latin script
    matchedForm: hasResults || bySource.other?.length > 0 ? matchedForm : null,
    root: extractRoot(cleaned),
    timestamp: Date.now(),

    // Dictionary entries by source - ALL use strictHeadwordFilter for safety
    sources: {
      // Halachic override (if applicable) - recommended for Talmud study context
      halachic: halachicOverride || null,

      bdb: (() => {
        const valid = strictHeadwordFilter(bySource.bdb);
        if (valid.length > 0) {
          return {
            source: SCHOLARLY_SOURCES.BDB,
            headword: valid[0]?.headword || cleaned,
            definitions: valid.flatMap(extractDefinitions),
            morphology: valid[0]?.content?.morphology || null,
            strongNumber: valid[0]?.strong_number || null
          };
        }
        // FALLBACK: Use local BDB if API results were filtered out
        if (allLocalResults?.bdb) {
          const localDef = extractJastrowMeaning(allLocalResults.bdb.content) ||
                           allLocalResults.bdb.short_definition;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.BDB,
              headword: allLocalResults.bdb.headword || cleaned,
              definitions: [{ text: localDef }],
              _isLocal: true
            };
          }
        }
        return null;
      })(),

      jastrow: (() => {
        const valid = strictHeadwordFilter(bySource.jastrow);
        if (valid.length > 0) {
          // Prioritize Jastrow entries that align with BDB definitions
          const prioritizedJastrow = prioritizeJastrowEntries(valid, bySource.bdb);
          return {
            source: SCHOLARLY_SOURCES.JASTROW,
            headword: prioritizedJastrow[0]?.headword || cleaned,
            definitions: prioritizedJastrow.flatMap(entry => extractDefinitions(entry, true)),
            language: 'Aramaic'
          };
        }
        // FALLBACK: Use local Jastrow if API results were filtered out
        if (allLocalResults?.jastrow) {
          const localDef = extractJastrowMeaning(allLocalResults.jastrow.content) ||
                           allLocalResults.jastrow.short_definition;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.JASTROW,
              headword: allLocalResults.jastrow.headword || cleaned,
              definitions: [{ text: localDef }],
              language: 'Aramaic',
              _isLocal: true
            };
          }
        }
        // Also try Aramaic variant
        if (allLocalResults?.jastrowAlt) {
          const altDef = extractJastrowMeaning(allLocalResults.jastrowAlt.content) ||
                         allLocalResults.jastrowAlt.short_definition;
          if (altDef) {
            return {
              source: SCHOLARLY_SOURCES.JASTROW,
              headword: allLocalResults.jastrowAlt.headword || cleaned,
              definitions: [{ text: altDef }],
              language: 'Aramaic',
              _isLocal: true,
              _isAramaicVariant: true
            };
          }
        }
        return null;
      })(),

      strong: (() => {
        const valid = strictHeadwordFilter(bySource.strong);
        if (valid.length > 0) {
          return {
            source: SCHOLARLY_SOURCES.STRONG,
            strongNumber: valid[0]?.strong_number || null,
            headword: valid[0]?.headword || cleaned,
            definitions: valid.flatMap(extractDefinitions)
          };
        }
        // FALLBACK: Use local Strong's if API results were filtered out
        if (allLocalResults?.strongs) {
          const localDef = allLocalResults.strongs.short_definition ||
                           allLocalResults.strongs.content;
          if (localDef) {
            return {
              source: SCHOLARLY_SOURCES.STRONG,
              strongNumber: allLocalResults.strongs.strong_number || null,
              headword: allLocalResults.strongs.headword || cleaned,
              definitions: [{ text: localDef }],
              _isLocal: true
            };
          }
        }
        return null;
      })(),

      // Klein - Show entry with clear headword indication for scholarly transparency
      klein: (() => {
        // First try strict match
        const valid = strictHeadwordFilter(bySource.klein);
        if (valid.length > 0) {
          // SEMANTIC DISAMBIGUATION: When multiple Klein entries pass (e.g., בְּרָא and בָּרָא both → ברא)
          // Use BDB/Jastrow definitions + known roots to prefer the one with matching meaning
          let bestEntry = valid[0];
          let bestScore = -1; // Start negative so first entry with ANY match wins

          // Collect reference keywords from BDB + Jastrow + cognate patterns
          const refKeywords = new Set();

          // From BDB
          for (const bdbEntry of (bySource.bdb || [])) {
            const defs = extractDefinitions(bdbEntry);
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  if (word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'its', 'are', 'was', 'has', 'had'].includes(word)) {
                    refKeywords.add(word);
                  }
                }
              }
            }
          }

          // From Jastrow
          for (const jEntry of (bySource.jastrow || [])) {
            const defs = extractDefinitions(jEntry, true);
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  if (word.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'its', 'are', 'was', 'has', 'had'].includes(word)) {
                    refKeywords.add(word);
                  }
                }
              }
            }
          }

          // From COGNATE_PATTERNS (our curated Hebrew root meanings)
          const cognateData = COGNATE_PATTERNS[cleaned];
          if (cognateData?.meaning) {
            const words = cognateData.meaning.toLowerCase().split(/[^a-z]+/);
            for (const word of words) {
              if (word.length >= 3) {
                refKeywords.add(word);
              }
            }
          }

          // Score Klein entries by keyword match with reference sources
          for (const entry of valid) {
            const defs = extractDefinitions(entry);
            let score = 0;
            for (const def of defs) {
              if (def.text) {
                const words = def.text.toLowerCase().split(/[^a-z]+/);
                for (const word of words) {
                  // Exact keyword match
                  if (refKeywords.has(word)) {
                    score += 15;
                  }
                  // Partial/stem match (e.g., "create" matches "creation")
                  for (const kw of refKeywords) {
                    if (word.length >= 4 && kw.length >= 4) {
                      if (word.startsWith(kw.slice(0, 4)) || kw.startsWith(word.slice(0, 4))) {
                        score += 5;
                      }
                    }
                  }
                }
              }
            }
            if (score > bestScore) {
              bestScore = score;
              bestEntry = entry;
            }
          }

          return {
            source: SCHOLARLY_SOURCES.KLEIN,
            headword: bestEntry?.headword || cleaned,
            definitions: [bestEntry].flatMap(extractDefinitions),
            etymology: bestEntry?.etymology || null,
            isExactMatch: true
          };
        }
        // If no strict match but Klein has entries from strict filter, show them
        if (bySource.klein.length > 0) {
          const entry = bySource.klein[0];
          const entryHead = cleanWord(entry.headword || entry.word || entry.term || '');
          return {
            source: SCHOLARLY_SOURCES.KLEIN,
            headword: entryHead || cleaned,
            definitions: bySource.klein.flatMap(extractDefinitions),
            etymology: entry.etymology || null,
            isExactMatch: false,
            searchedWord: cleaned
          };
        }
        // SCHOLARLY FEATURE: If no strict match, show related word entries from Klein
        // This helps scholars see what Klein HAS even if it's a different but related word
        // (e.g., searching ברא shows Klein's entry for בר with clear indication)
        if (bySource.kleinRelated?.length > 0) {
          const entry = bySource.kleinRelated[0];
          const entryHead = cleanWord(entry.headword || entry.word || entry.term || '');
          // Only show if there's a reasonable relationship (at least 50% LCS match)
          const lcs = (a, b) => {
            const m = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
            for (let i = 1; i <= a.length; i++) {
              for (let j = 1; j <= b.length; j++) {
                m[j][i] = a[i-1] === b[j-1] ? m[j-1][i-1] + 1 : Math.max(m[j][i-1], m[j-1][i]);
              }
            }
            return m[b.length][a.length];
          };
          const maxLen = Math.max(cleaned.length, entryHead.length);
          const lcsScore = lcs(cleaned, entryHead) / maxLen;

          // Show if at least 50% character overlap (looser than strict filter)
          if (lcsScore >= 0.5 && entryHead !== cleaned) {
            return {
              source: SCHOLARLY_SOURCES.KLEIN,
              headword: entryHead,
              definitions: [bySource.kleinRelated[0]].flatMap(extractDefinitions),
              etymology: entry.etymology || null,
              isExactMatch: false,
              searchedWord: cleaned // So UI can show "שורש קרוב: בר" (searched: ברא)
            };
          }
        }
        return null;
      })(),

      steinsaltz: (() => {
        const valid = strictHeadwordFilter(bySource.steinsaltz || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.STEINSALTZ,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(entry => extractDefinitions(entry, true)),
          language: 'Aramaic'
        };
      })(),

      sefaria: (() => {
        const valid = strictHeadwordFilter(bySource.sefaria || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.SEFARIA,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
      halot: (() => {
        const valid = strictHeadwordFilter(bySource.halot || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.HALOT,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // Gesenius - Classical Hebrew Grammar & Lexicon
      gesenius: (() => {
        const valid = strictHeadwordFilter(bySource.gesenius || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.GESENIUS,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // TWOT - Theological Wordbook of the Old Testament
      twot: (() => {
        const valid = strictHeadwordFilter(bySource.twot || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.TWOT,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions)
        };
      })(),

      // DJBA - Sokoloff, Dictionary of Jewish Babylonian Aramaic
      djba: (() => {
        const valid = strictHeadwordFilter(bySource.djba || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.DJBA,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions),
          language: 'Aramaic',
          dialect: 'Jewish Babylonian Aramaic'
        };
      })(),

      // DJPA - Sokoloff, Dictionary of Jewish Palestinian Aramaic
      djpa: (() => {
        const valid = strictHeadwordFilter(bySource.djpa || []);
        if (valid.length === 0) return null;
        return {
          source: SCHOLARLY_SOURCES.DJPA,
          headword: valid[0]?.headword || cleaned,
          definitions: valid.flatMap(extractDefinitions),
          language: 'Aramaic',
          dialect: 'Jewish Palestinian Aramaic'
        };
      })(),

      // Bolls.life BDB API (additional online source)
      bolls: bollsResult ? {
        source: SCHOLARLY_SOURCES.BOLLS,
        headword: cleaned,
        definitions: [
          ...(bollsResult.definition ? [{ text: bollsResult.definition }] : []),
          ...(bollsResult.definitions || []).map(d => ({ text: d }))
        ].filter(d => d.text),
        strongNumber: bollsResult.strongNumber || null,
        partOfSpeech: bollsResult.partOfSpeech || null
      } : null,

      // STEP Bible - Scripture Tools for Every Person (Strong's definitions)
      step: stepBibleResult ? {
        source: SCHOLARLY_SOURCES.STEP,
        headword: cleaned,
        definitions: stepBibleResult.definition ? [{ text: stepBibleResult.definition }] : [],
        strongNumber: stepBibleResult.strongNumber || strongNumber || null,
        transliteration: stepBibleResult.transliteration || null
      } : null,

      // CAL - Comprehensive Aramaic Lexicon (premier Aramaic dictionary for Talmud/Targum)
      cal: calResult ? {
        source: SCHOLARLY_SOURCES.CAL,
        headword: calResult.headword || cleaned,
        definitions: calResult.definitions || [],
        dialect: calResult.dialect || null,
        partOfSpeech: calResult.partOfSpeech || null,
        etymology: calResult.etymology || null,
        language: 'Aramaic',
        url: calResult.url || null
      } : null,

      // Include other sources (miscellaneous lexicons)
      other: bySource.other?.length > 0 ? bySource.other.map(entry => ({
        lexicon: entry.parent_lexicon || 'Unknown',
        headword: entry.headword || cleaned,
        definitions: extractDefinitions(entry)
      })) : null
    },

    // Cognate analysis
    cognates: getCognateInfo(cleaned),

    // Grammar info
    grammar: getGrammarInfo(cleaned, bySource),

    // Summary for display (pass original word for Talmudic abbreviation detection)
    primaryDefinition: getPrimaryDefinition(bySource, bollsResult, {
      step: stepBibleResult,
      cal: calResult
    }, word),

    // Detected language - be more precise about Aramaic detection
    // Only CAL is a strong Aramaic indicator; Jastrow covers BOTH Hebrew and Aramaic
    // BDB is specifically Biblical Hebrew, so if BDB has results, prefer Hebrew
    language: calResult ? 'Aramaic' :
              bySource.bdb.length > 0 || bySource.strong.length > 0 ? 'Hebrew' :
              bySource.jastrow.length > 0 && bySource.jastrow[0]?.language === 'Aramaic' ? 'Aramaic' :
              'Hebrew',

    // Raw data for debugging (can be removed in production)
    _rawEntryCount: sefariaData?.length || 0,

    // Flag if halachic override was applied
    _halachicOverride: !!halachicOverride
  };

  // Record telemetry for this lookup
  const durationMs = performance.now() - startTime;
  const primarySource = result.primarySource ||
    (result.sources?.bdb ? 'bdb' :
     result.sources?.jastrow ? 'jastrow' :
     result.sources?.strong ? 'strongs' : 'sefaria');

  recordLookup({
    word: cleaned,
    success: !!result.primaryDefinition,
    fromCache: false,
    durationMs,
    source: primarySource
  });

  // Record individual dictionary lookups for detailed tracking
  if (bySource.bdb.length > 0 || allLocalResults?.bdb) {
    recordDictionaryLookup('bdb', true);
  }
  if (bySource.jastrow.length > 0 || allLocalResults?.jastrow) {
    recordDictionaryLookup('jastrow', true);
  }
  if (bySource.strong.length > 0 || allLocalResults?.strongs) {
    recordDictionaryLookup('strongs', true);
  }
  if (calResult) {
    recordDictionaryLookup('cal', true);
  }
  if (sefariaData && sefariaData.length > 0) {
    recordDictionaryLookup('sefaria', true);
  }

  scholarlyCache.set(cacheKey, result);
  return result;
};

/**
 * Get cognate information for a root
 */
const getCognateInfo = (word) => {
  const root = extractRoot(word);
  const pattern = COGNATE_PATTERNS[root];

  if (pattern) {
    return {
      root: root,
      cognates: pattern.cognates || [],
      arabicCognate: pattern.arabic || null,
      semanticField: pattern.meaning || null
    };
  }

  return null;
};

/**
 * Get grammar information - Enhanced binyan detection
 */
const getGrammarInfo = (word, bySource) => {
  const morphology = bySource.bdb?.[0]?.content?.morphology ||
                     bySource.strong?.[0]?.content?.morphology ||
                     bySource.other?.[0]?.content?.morphology;

  const info = {
    morphology: morphology || null,
    partOfSpeech: null,
    binyan: null,
    stem: null,
    gender: null,
    number: null,
    state: null,
    person: null,
    tense: null
  };

  // Detect binyan from word form patterns
  const cleaned = cleanWord(word);
  if (cleaned) {
    // Hitpa'el: התפעל pattern
    if (cleaned.startsWith('הת') && cleaned.length >= 5) {
      info.binyan = 'Hitpael';
      info.partOfSpeech = 'verb';
    }
    // Hif'il: הפעיל pattern
    else if (cleaned.startsWith('ה') && cleaned.length >= 4) {
      // Check for hif'il markers (often has י in middle)
      if (cleaned.length === 5 && cleaned[2] === 'י') {
        info.binyan = 'Hiphil';
        info.partOfSpeech = 'verb';
      }
    }
    // Nif'al: נפעל pattern
    else if (cleaned.startsWith('נ') && cleaned.length >= 4) {
      info.binyan = 'Niphal';
      info.partOfSpeech = 'verb';
    }
    // Pi'el/Pu'al: doubled middle letter
    else if (cleaned.length === 4 && cleaned[1] === cleaned[2]) {
      info.binyan = 'Piel';
      info.partOfSpeech = 'verb';
    }
  }

  // Parse morphology string if available
  if (morphology) {
    const morphLower = morphology.toLowerCase();

    // Part of speech
    if (morphLower.includes('verb')) info.partOfSpeech = 'verb';
    else if (morphLower.includes('noun')) info.partOfSpeech = 'noun';
    else if (morphLower.includes('adjective') || morphLower.includes('adj.')) info.partOfSpeech = 'adjective';
    else if (morphLower.includes('preposition') || morphLower.includes('prep.')) info.partOfSpeech = 'preposition';
    else if (morphLower.includes('adverb') || morphLower.includes('adv.')) info.partOfSpeech = 'adverb';
    else if (morphLower.includes('pronoun') || morphLower.includes('pron.')) info.partOfSpeech = 'pronoun';
    else if (morphLower.includes('particle')) info.partOfSpeech = 'particle';
    else if (morphLower.includes('conjunction') || morphLower.includes('conj.')) info.partOfSpeech = 'conjunction';
    else if (morphLower.includes('interjection')) info.partOfSpeech = 'interjection';
    else if (morphLower.includes('proper noun') || morphLower.includes('proper name')) info.partOfSpeech = 'proper noun';

    // Binyan detection from morphology text
    if (morphLower.includes('qal') || morphLower.includes('pa\'al')) info.binyan = 'Qal';
    else if (morphLower.includes('niphal') || morphLower.includes('nif\'al')) info.binyan = 'Niphal';
    else if (morphLower.includes('piel') || morphLower.includes('pi\'el')) info.binyan = 'Piel';
    else if (morphLower.includes('pual') || morphLower.includes('pu\'al')) info.binyan = 'Pual';
    else if (morphLower.includes('hiphil') || morphLower.includes('hif\'il') || morphLower.includes('hiph.')) info.binyan = 'Hiphil';
    else if (morphLower.includes('hophal') || morphLower.includes('hof\'al') || morphLower.includes('hoph.')) info.binyan = 'Hophal';
    else if (morphLower.includes('hitpael') || morphLower.includes('hitpa\'el') || morphLower.includes('hithp.')) info.binyan = 'Hitpael';
    // Aramaic stems
    else if (morphLower.includes('peal') || morphLower.includes('pe\'al')) info.binyan = 'Peal';
    else if (morphLower.includes('pael') || morphLower.includes('pa\'el')) info.binyan = 'Pael';
    else if (morphLower.includes('aphel') || morphLower.includes('af\'el')) info.binyan = 'Aphel';
    else if (morphLower.includes('ithpeel') || morphLower.includes('ithpe\'el')) info.binyan = 'Ithpeel';
    else if (morphLower.includes('ithpaal') || morphLower.includes('ithpa\'al')) info.binyan = 'Ithpaal';

    // Tense
    if (morphLower.includes('perfect') || morphLower.includes('perf.')) info.tense = 'Perfect';
    else if (morphLower.includes('imperfect') || morphLower.includes('impf.')) info.tense = 'Imperfect';
    else if (morphLower.includes('imperative') || morphLower.includes('imper.')) info.tense = 'Imperative';
    else if (morphLower.includes('infinitive') || morphLower.includes('inf.')) info.tense = 'Infinitive';
    else if (morphLower.includes('participle') || morphLower.includes('part.')) info.tense = 'Participle';
    else if (morphLower.includes('jussive')) info.tense = 'Jussive';
    else if (morphLower.includes('cohortative')) info.tense = 'Cohortative';

    // Gender
    if (morphLower.includes('masculine') || morphLower.includes('masc.') || morphLower.includes(' m.') || morphLower.includes(' m ')) {
      info.gender = 'masculine';
    } else if (morphLower.includes('feminine') || morphLower.includes('fem.') || morphLower.includes(' f.') || morphLower.includes(' f ')) {
      info.gender = 'feminine';
    }

    // Number
    if (morphLower.includes('plural') || morphLower.includes('plur.') || morphLower.includes(' pl.')) info.number = 'plural';
    else if (morphLower.includes('singular') || morphLower.includes('sing.') || morphLower.includes(' sg.')) info.number = 'singular';
    else if (morphLower.includes('dual')) info.number = 'dual';

    // State (construct vs absolute)
    if (morphLower.includes('construct') || morphLower.includes('const.') || morphLower.includes('cstr.')) info.state = 'construct';
    else if (morphLower.includes('absolute') || morphLower.includes('abs.')) info.state = 'absolute';

    // Person
    if (morphLower.includes('1st') || morphLower.includes('first')) info.person = '1st';
    else if (morphLower.includes('2nd') || morphLower.includes('second')) info.person = '2nd';
    else if (morphLower.includes('3rd') || morphLower.includes('third')) info.person = '3rd';
  }

  // Enhance with grammar analysis service (root extraction, prefix analysis)
  try {
    const grammarAnalysis = analyzeGrammar(word);
    if (grammarAnalysis) {
      // Add root information
      if (grammarAnalysis.root && !info.root) {
        info.root = grammarAnalysis.root;
        info.rootInfo = grammarAnalysis.rootInfo || null;
      }
      // Add prefix breakdown
      if (grammarAnalysis.prefixes && grammarAnalysis.prefixes.length > 0) {
        info.prefixes = grammarAnalysis.prefixes;
        info.prefixBreakdown = grammarAnalysis.prefixes
          .map(p => `${p.letter} (${p.meaning})`)
          .join(' + ');
      }
      // Fill in missing part of speech
      if (!info.partOfSpeech && grammarAnalysis.partOfSpeech?.name) {
        info.partOfSpeech = grammarAnalysis.partOfSpeech.name.toLowerCase();
      }
      // Add binyan from analysis if not already detected
      if (!info.binyan && grammarAnalysis.binyan?.name) {
        info.binyan = grammarAnalysis.binyan.name;
      }
      // Add tense from analysis if not already detected
      if (!info.tense && grammarAnalysis.tense?.name) {
        info.tense = grammarAnalysis.tense.name;
      }
    }
  } catch (e) { /* silent */ }

  // Return null if no useful info found
  if (!info.partOfSpeech && !info.binyan && !info.morphology && !info.root && !info.prefixes) return null;

  // Add full binyan info from BINYAN_INFO
  if (info.binyan) {
    // Map English binyan names to Hebrew keys
    const binyanMap = {
      'Qal': 'קל',
      'Niphal': 'נפעל',
      'Piel': 'פיעל',
      'Pual': 'פועל',
      'Hiphil': 'הפעיל',
      'Hophal': 'הופעל',
      'Hitpael': 'התפעל'
    };
    const hebrewKey = binyanMap[info.binyan];
    if (hebrewKey && BINYAN_INFO[hebrewKey]) {
      info.binyanInfo = {
        hebrew: hebrewKey,
        ...BINYAN_INFO[hebrewKey]
      };
    }
  }

  // Build form description (e.g., "Qal perfect 3ms")
  const formParts = [];
  if (info.binyan) formParts.push(info.binyan);
  if (info.tense) formParts.push(info.tense.toLowerCase());
  if (info.person) formParts.push(info.person.replace('st', '').replace('nd', '').replace('rd', ''));
  if (info.gender) formParts.push(info.gender === 'masculine' ? 'm' : 'f');
  if (info.number) formParts.push(info.number === 'singular' ? 's' : info.number === 'plural' ? 'p' : 'd');
  info.formDescription = formParts.length > 1 ? formParts.join(' ') : null;

  return info;
};

/**
 * Check if a definition appears to be a proper name (Biblical person/place)
 * These should be deprioritized when common noun definitions exist
 */
const isProperNameDefinition = (defText) => {
  if (!defText) return false;
  const text = defText.toLowerCase();
  // Patterns indicating proper names: "X = Y", "meaning of name", genealogies
  return (
    /^\s*\w+\s*=\s*["']/.test(text) ||  // "Mattenai = "gift of..."
    /gift of (god|jehovah|the lord)/i.test(text) ||
    /son of|father of|brother of/i.test(text) ||
    /proper name|proper noun/i.test(text) ||
    /a (levite|priest|king|prophet|judge)/i.test(text)
  );
};

/**
 * Check if word is a Talmudic/Rabbinic abbreviation
 * These often end with ׳ (geresh) or " (gershayim)
 */
const isTalmudicAbbreviation = (word) => {
  if (!word) return false;
  // Common Talmudic abbreviation markers
  return /[׳"'״]$/.test(word) || // Ends with geresh/gershayim/apostrophe
         /^(מתני|גמ|ר|רב|דר|תנ|ברי|וכו|עכ״ל|ע״ש|וגו)/i.test(word); // Common abbrev prefixes
};

/**
 * Get primary definition for quick display
 * @param {object} bySource - Dictionary entries organized by source
 * @param {object} bollsResult - Optional Bolls.life API result
 * @param {object} additionalResults - Optional additional API results (wiktionary, morfix, pealim)
 * @param {string} originalWord - Original word being looked up (for abbreviation detection)
 */
const getPrimaryDefinition = (bySource, bollsResult = null, additionalResults = {}, originalWord = '') => {
  // Check if this is a Talmudic abbreviation - prioritize Jastrow
  const isTalmudic = isTalmudicAbbreviation(originalWord);

  // For Talmudic abbreviations, check Jastrow FIRST
  if (isTalmudic && bySource.jastrow?.length > 0) {
    const defs = extractDefinitions(bySource.jastrow[0], true);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Check BDB - but skip if it's a proper name and we have Jastrow alternative
  if (bySource.bdb?.length > 0) {
    const defs = extractDefinitions(bySource.bdb[0]);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      const defText = fullDef?.text || defs[0].text;
      // Skip proper name definitions if Jastrow has a common noun definition
      if (isProperNameDefinition(defText) && bySource.jastrow?.length > 0) {
        const jastrowDefs = extractDefinitions(bySource.jastrow[0], true);
        if (jastrowDefs.length > 0 && !isProperNameDefinition(jastrowDefs[0]?.text)) {
          // Use Jastrow instead
          const jFullDef = jastrowDefs.find(d => !d.isShort);
          return jFullDef?.text || jastrowDefs[0].text;
        }
      }
      return defText;
    }
  }

  // Then Strong's - same proper name check
  if (bySource.strong?.length > 0) {
    const defs = extractDefinitions(bySource.strong[0]);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      const defText = fullDef?.text || defs[0].text;
      // Skip proper name definitions if Jastrow has a common noun definition
      if (isProperNameDefinition(defText) && bySource.jastrow?.length > 0) {
        const jastrowDefs = extractDefinitions(bySource.jastrow[0], true);
        if (jastrowDefs.length > 0 && !isProperNameDefinition(jastrowDefs[0]?.text)) {
          const jFullDef = jastrowDefs.find(d => !d.isShort);
          return jFullDef?.text || jastrowDefs[0].text;
        }
      }
      return defText;
    }
  }

  // Then Jastrow for Aramaic/Rabbinic (use isJastrow=true for proper cleaning)
  if (bySource.jastrow?.length > 0) {
    const defs = extractDefinitions(bySource.jastrow[0], true);
    if (defs.length > 0) {
      const fullDef = defs.find(d => !d.isShort);
      return fullDef?.text || defs[0].text;
    }
  }

  // Then CAL (Comprehensive Aramaic Lexicon) - premier Aramaic dictionary
  if (additionalResults.cal?.definitions?.length > 0) {
    return additionalResults.cal.definitions[0]?.text || additionalResults.cal.definitions[0];
  }

  // Then Bolls.life (additional online BDB source)
  if (bollsResult?.definition) {
    return bollsResult.definition;
  }

  // Then STEP Bible (Strong's definitions)
  if (additionalResults.step?.definition) {
    return additionalResults.step.definition;
  }

  // Then Klein for etymology
  if (bySource.klein?.length > 0) {
    const defs = extractDefinitions(bySource.klein[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then HALOT (modern scholarly)
  if (bySource.halot?.length > 0) {
    const defs = extractDefinitions(bySource.halot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then Gesenius (classical Hebrew grammar)
  if (bySource.gesenius?.length > 0) {
    const defs = extractDefinitions(bySource.gesenius[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Then TWOT (theological analysis)
  if (bySource.twot?.length > 0) {
    const defs = extractDefinitions(bySource.twot[0]);
    if (defs.length > 0) return defs[0].text;
  }

  // Finally any other source
  if (bySource.other?.length > 0) {
    const defs = extractDefinitions(bySource.other[0]);
    if (defs.length > 0) return defs[0].text;
  }

  return null;
};

// =============================================================================
// ADDITIONAL SCHOLARLY FUNCTIONS
// =============================================================================

/**
 * Get etymology and cognate analysis
 */
export const getEtymology = async (word) => {
  const root = extractRoot(cleanWord(word));
  const pattern = COGNATE_PATTERNS[root];

  return {
    root: root,
    pattern: pattern || null,
    cognateLanguages: COGNATE_LANGUAGES,
    analysis: pattern ? {
      arabicCognate: pattern.arabic,
      semanticCore: pattern.meaning,
      relatedWords: pattern.cognates
    } : null
  };
};

/**
 * Get Hebrew grammar reference (Gesenius-style)
 */
export const getGrammarReference = (binyan) => {
  return BINYAN_INFO[binyan] || null;
};

/**
 * Get all binyanim info
 */
export const getAllBinyanim = () => BINYAN_INFO;

/**
 * Get verb tense info
 */
export const getVerbTenses = () => VERB_TENSES;

/**
 * Get biblical usage context for a word
 * Returns frequency, first occurrence, and usage notes
 * @param {string} word - Hebrew word
 * @returns {Promise<object>} Usage context with frequency, first occurrence, notes
 */
export const getBiblicalUsageContext = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    // Search for first occurrence in Tanakh
    const response = await fetchWithFallback(
      `${SEFARIA_BASE}/search-wrapper?q=${encodeURIComponent(cleaned)}&type=text&size=5&filters[]=Tanakh`,
      { timeout: 8000 }
    );

    if (!response) return null;

    const total = response.total || 0;
    const hits = response.hits || [];

    // Get first occurrence
    let firstOccurrence = null;
    if (hits.length > 0) {
      // Sort by book order (Genesis first)
      const bookOrder = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
        'Joshua', 'Judges', 'Samuel', 'Kings', 'Isaiah', 'Jeremiah', 'Ezekiel',
        'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
        'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Psalms', 'Proverbs', 'Job',
        'Song of Songs', 'Ruth', 'Lamentations', 'Ecclesiastes', 'Esther',
        'Daniel', 'Ezra', 'Nehemiah', 'Chronicles'];

      const sorted = [...hits].sort((a, b) => {
        const bookA = (a.categories?.[1] || '').split(' ')[0];
        const bookB = (b.categories?.[1] || '').split(' ')[0];
        const orderA = bookOrder.indexOf(bookA);
        const orderB = bookOrder.indexOf(bookB);
        return (orderA === -1 ? 100 : orderA) - (orderB === -1 ? 100 : orderB);
      });

      const first = sorted[0];
      firstOccurrence = {
        ref: first.ref,
        heRef: first.heRef,
        book: first.categories?.[1] || '',
        text: (first.text || '').replace(/<[^>]*>/g, '').slice(0, 150)
      };
    }

    // Determine frequency category
    let frequencyCategory = null;
    let frequencyNote = null;
    if (total === 0) {
      frequencyCategory = 'not_found';
      frequencyNote = 'Not found in Tanakh';
    } else if (total === 1) {
      frequencyCategory = 'hapax';
      frequencyNote = 'Hapax legomenon (occurs only once)';
    } else if (total < 5) {
      frequencyCategory = 'rare';
      frequencyNote = `Rare word (${total} occurrences)`;
    } else if (total < 20) {
      frequencyCategory = 'uncommon';
      frequencyNote = `Uncommon (${total} occurrences)`;
    } else if (total < 100) {
      frequencyCategory = 'common';
      frequencyNote = `Common (${total} occurrences)`;
    } else {
      frequencyCategory = 'very_common';
      frequencyNote = `Very common (${total}+ occurrences)`;
    }

    // Get usage context from COGNATE_PATTERNS if available
    const root = extractRoot(cleaned);
    const cognateData = COGNATE_PATTERNS[root];
    let usageContext = null;
    if (cognateData?.meaning) {
      usageContext = cognateData.meaning;
    }

    return {
      word: cleaned,
      root: root,
      frequency: {
        total,
        category: frequencyCategory,
        note: frequencyNote
      },
      firstOccurrence,
      usageContext,
      // Mark special theological terms
      isTheologicalTerm: cognateData?.cognates?.some(c =>
        c.toLowerCase().includes('unique') || c.toLowerCase().includes('theological')
      ) || false
    };
  } catch (error) {
    log.warn('Biblical usage context lookup failed:', error);
    return null;
  }
};

/**
 * Search for word in biblical concordance
 */
export const searchConcordance = async (word, limit = 20) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return { results: [], total: 0 };

  try {
    const response = await fetch(
      `${SEFARIA_BASE}/search-wrapper?q=${encodeURIComponent(cleaned)}&type=text&size=${limit}&filters[]=Tanakh`
    );

    if (!response.ok) return { results: [], total: 0 };

    const data = await response.json();

    return {
      word: cleaned,
      total: data.total || 0,
      results: (data.hits || []).map(hit => ({
        ref: hit.ref,
        heRef: hit.heRef,
        text: hit.text?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
        book: hit.categories?.[1] || ''
      }))
    };
  } catch (error) {
    log.error('Concordance search failed:', error);
    return { results: [], total: 0 };
  }
};

/**
 * Get word frequency in Tanakh
 */
export const getWordFrequency = async (word) => {
  const concordance = await searchConcordance(word, 1);
  return {
    word: cleanWord(word),
    occurrences: concordance.total,
    isCommon: concordance.total > 50,
    isRare: concordance.total < 5
  };
};

/**
 * Format scholarly citation
 */
export const formatCitation = (source, entry) => {
  const sourceInfo = SCHOLARLY_SOURCES[source.toUpperCase()];
  if (!sourceInfo) return null;

  return {
    short: `${sourceInfo.abbreviation}`,
    full: `${sourceInfo.fullName} (${sourceInfo.year})`,
    academic: `${sourceInfo.abbreviation}, s.v. "${entry}"`,
    chicago: `"${entry}," in ${sourceInfo.fullName} (${sourceInfo.year})`
  };
};

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Lookup multiple words with scholarly data
 */
export const batchScholarlyLookup = async (words) => {
  const results = new Map();
  const uniqueWords = [...new Set(words.map(cleanWord).filter(w => w.length >= 2))];

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    const promises = batch.map(async (word) => {
      const data = await scholarlyLookup(word);
      return { word, data };
    });

    const batchResults = await Promise.all(promises);
    for (const { word, data } of batchResults) {
      if (data) results.set(word, data);
    }

    // Rate limiting
    if (i + batchSize < uniqueWords.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

// =============================================================================
// SIMPLE LOOKUP FUNCTIONS (for backward compatibility with sefariaLexiconService)
// =============================================================================

/**
 * Simple direct lookup - returns basic translation data
 * Compatible with sefariaLexiconService.lookupWordSefaria
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<object|null>} - Basic lookup result
 */
export const lookupWordSefaria = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const data = await fetchSefariaLexicon(cleaned);
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Parse the first matching entry
    const entry = data[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract definitions from content.senses
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          definitions.push(cleanDefinitionText(sense.definition));
          if (!shortDefinition) {
            shortDefinition = cleanDefinitionText(sense.definition);
          }
        }
      }
    }

    // Fallback: use short_definition if available
    if (!shortDefinition && entry.short_definition) {
      shortDefinition = cleanDefinitionText(entry.short_definition);
    }

    // Determine language
    let language = 'Hebrew';
    if (entry.parent_lexicon?.toLowerCase().includes('jastrow') ||
        entry.parent_lexicon?.toLowerCase().includes('aramaic')) {
      language = 'Aramaic';
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language,
      strongNumber: entry.strong_number || null,
      sources: entry.parent_lexicon ? [entry.parent_lexicon] : []
    };
  } catch {
    // Silent fail - expected for many words
    return null;
  }
};

/**
 * Simple Jastrow-specific lookup
 * Compatible with sefariaLexiconService.lookupJastrow
 * @param {string} word - Aramaic word
 * @returns {Promise<object|null>} - Jastrow entry
 */
export const lookupJastrow = async (word) => {
  const cleaned = cleanWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Try local dictionary first (fast, offline-capable)
  try {
    const localEntry = await lookupLocalJastrow(word);
    if (localEntry) {
      const cleanedDef = extractJastrowMeaning(localEntry.definition) ||
                         cleanDefinitionText(localEntry.definition);
      return {
        word: cleaned,
        headword: localEntry.lemma || cleaned,
        definitions: cleanedDef ? [cleanedDef] : [],
        shortDefinition: cleanedDef,
        language: localEntry.isAramaic ? 'Aramaic' : 'Hebrew',
        source: 'Jastrow (local)',
        ref: localEntry.ref
      };
    }
  } catch (e) {
    // Continue to API fallback
  }

  // Fall back to Sefaria API
  try {
    const data = await fetchWithFallback(
      `${SEFARIA_BASE}/words/${encodeURIComponent(cleaned)}?lookup_ref=Jastrow`,
      { timeout: 8000 }
    );
    if (!data || !Array.isArray(data) || data.length === 0) return null;

    // Filter for Jastrow entries
    const jastrowEntries = data.filter(e =>
      e.parent_lexicon?.toLowerCase().includes('jastrow')
    );

    if (jastrowEntries.length === 0) return null;

    const entry = jastrowEntries[0];
    const definitions = [];
    let shortDefinition = null;

    // Extract and clean definitions
    if (entry.content?.senses) {
      for (const sense of entry.content.senses) {
        if (sense.definition) {
          const cleanedDef = extractJastrowMeaning(sense.definition);
          if (cleanedDef) {
            definitions.push(cleanedDef);
            if (!shortDefinition) shortDefinition = cleanedDef;
          }
        }
      }
    }

    if (!shortDefinition && entry.short_definition) {
      shortDefinition = extractJastrowMeaning(entry.short_definition) ||
                        cleanDefinitionText(entry.short_definition);
    }

    return {
      word: cleaned,
      headword: entry.headword || cleaned,
      definitions,
      shortDefinition,
      language: 'Aramaic',
      source: 'Jastrow'
    };
  } catch {
    // Silent fail - expected for many words
    return null;
  }
};

/**
 * Get simple translation string
 * Compatible with sefariaLexiconService.getSimpleTranslation
 * @param {string} word - Hebrew/Aramaic word
 * @returns {Promise<string|null>} - Simple translation
 */
export const getSimpleTranslation = async (word) => {
  const result = await lookupWordSefaria(word);
  return result?.shortDefinition || result?.definitions?.[0] || null;
};

/**
 * Simple CAL-specific lookup for Aramaic words
 * Direct access to Comprehensive Aramaic Lexicon
 * @param {string} word - Aramaic word to look up
 * @returns {Promise<object|null>} - CAL entry
 */
export const lookupCAL = async (word) => {
  return fetchCALDefinition(word);
};

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Clear the scholarly cache - useful for debugging or forcing fresh lookups
 * Can be called from browser console: window.clearScholarlyCache()
 */
export const clearScholarlyCache = () => {
  scholarlyCache.clear();
  log.info('Cache cleared. Fresh lookups will be made.');
};

/**
 * Preload local Jastrow dictionary for instant Aramaic lookups
 * Call at app startup to avoid delay on first Aramaic word hover
 * @returns {Promise<boolean>} - True if loaded successfully
 */
export const preloadJastrow = async () => {
  try {
    const data = await loadLocalJastrow();
    return !!data;
  } catch (e) {
    log.warn('Jastrow preload failed:', e.message);
    return false;
  }
};

// Expose to window for debugging (development only)
if (typeof window !== 'undefined') {
  window.clearScholarlyCache = clearScholarlyCache;
  window.SCHOLARLY_CACHE_VERSION = CACHE_VERSION;
}

const scholarlyLexiconService = {
  // Main lookup
  scholarlyLookup,
  batchScholarlyLookup,

  // LOCAL DICTIONARIES (Offline-first - Priority 1)
  preloadDictionaries,      // Call at app startup for instant lookups
  getDictionaryStats,       // Check what's loaded
  lookupLocalDictionaries,  // Unified local lookup (Jastrow + BDB + Strong's)

  // Simple lookups (backward compatible with sefariaLexiconService)
  lookupWordSefaria,
  lookupJastrow,
  lookupCAL,
  getSimpleTranslation,

  // Etymology & cognates
  getEtymology,

  // Grammar
  getGrammarReference,
  getAllBinyanim,
  getVerbTenses,

  // Concordance
  searchConcordance,
  getWordFrequency,

  // Citations
  formatCitation,

  // Utils
  cleanWord,
  extractRoot,

  // Cache management
  clearScholarlyCache,

  // Preloading (legacy - use preloadDictionaries instead)
  preloadJastrow
};

export default scholarlyLexiconService;
