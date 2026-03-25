/**
 * WordGlossary - Displays word-by-word definitions for Hebrew/Aramaic text
 *
 * Shows each word with its scholarly definition from Jastrow, BDB, etc.
 * Used when no full English translation is available from Sefaria.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { scholarlyLookup } from '../../services/scholarlyLexiconService';
import { splitIntoWords, cleanHebrewWord } from '../../services/hebrewDictionary';
import { cleanHtml } from '../../utils/sanitize';
import {
  TALMUDIC_ABBREVIATIONS,
  RASHI_VOCABULARY,
  lookupHalachicWithPrefix
} from '../../utils/commentaryUtils';
// PRO SCHOLAR V6.2: Use comprehensive pre-classification for proper nouns & particles
import { preClassify } from '../../services/preClassificationService';
// PRO SCHOLAR V7: Scholarly source classification
import {
  isAcademicLexicon,
  isLocalSource,
  getSourceInfo
} from '../../constants/dictionarySources';
// PRO SCHOLAR V7: Morphological hints for missing words
import { getMorphologicalHint } from '../../services/unifiedLookupService';
// PRO SCHOLAR: Proto-Semitic reconstructions from Wiktionary (used by comprehensive lookup)
// PRO SCHOLAR V12: Full etymology data from ALL databases (78,000+ entries)
// Sources: Sefaria, Root Pro, BDB, Jastrow, Wiktionary, CAL, DJBA
import {
  getEnrichedEtymologySync,
  preloadEnrichedData,
  getComprehensiveEtymology
} from '../../services/etymologyEnrichmentService';
import './WordGlossary.css';

// =============================================================================
// PRO SCHOLAR V13: Compound Talmudic Phrases
// These multi-word expressions should be recognized as units, not split
// =============================================================================
const TALMUDIC_COMPOUND_PHRASES = {
  // Core teaching of Shabbat 2a
  'שתים שהן ארבע': {
    definition: 'two [acts] that are [actually] four',
    note: 'Opening principle of Shabbat - 2 basic acts of carrying expand to 4 distinct cases',
    source: 'Talmudic Phrase'
  },
  'שתיים שהן ארבע': {
    definition: 'two [acts] that are [actually] four',
    note: 'Opening principle of Shabbat - with full spelling',
    source: 'Talmudic Phrase'
  },
  'ארבע שהן שמונה': {
    definition: 'four [acts] that are [actually] eight',
    note: 'Extended principle - 4 basic acts expand to 8 with inside/outside variants',
    source: 'Talmudic Phrase'
  },
  // Domain terminology
  'רשות היחיד': {
    definition: 'private domain',
    note: 'Halachic domain where carrying is permitted',
    source: 'Halachic Term'
  },
  'רשות הרבים': {
    definition: 'public domain',
    note: 'Halachic domain where carrying on Shabbat is prohibited',
    source: 'Halachic Term'
  },
  'מקום פטור': {
    definition: 'exempt place',
    note: 'Area less than 4x4 tefachim, neither private nor public',
    source: 'Halachic Term'
  },
  // Actors in Shabbat 2a
  'בעל הבית': {
    definition: 'the homeowner',
    note: 'One of the two actors in the opening Mishna',
    source: 'Talmudic Term'
  },
  // Actions
  'עקירה והנחה': {
    definition: 'lifting and placing',
    note: 'The two components of transferring on Shabbat',
    source: 'Halachic Term'
  },
  // Hermeneutical principles
  'קל וחומר': {
    definition: 'a fortiori argument',
    note: 'Logical inference from minor to major case',
    source: 'Hermeneutic'
  },
  'גזירה שוה': {
    definition: 'verbal analogy',
    note: 'Deriving laws through shared terminology',
    source: 'Hermeneutic'
  },
  // Source markers
  'מן התורה': {
    definition: 'from the Torah (biblical)',
    note: 'Indicates a biblical-level obligation',
    source: 'Source Marker'
  },
  'תנו רבנן': {
    definition: 'our Rabbis taught',
    note: 'Introduction to a Baraita (Tannaitic teaching)',
    source: 'Source Marker'
  },
  // Discourse markers
  'שמע מינה': {
    definition: 'derive from this',
    note: 'Introduces a logical inference',
    source: 'Discourse Marker'
  },
  'מאי טעמא': {
    definition: 'what is the reason?',
    note: 'Asks for the underlying rationale',
    source: 'Discourse Marker'
  },
  // Rulings
  'יצא ידי חובתו': {
    definition: 'fulfilled his obligation',
    note: 'Standard formula for valid performance',
    source: 'Halachic Ruling'
  },
};

// PRO SCHOLAR V12: Preload etymology data on module load
preloadEnrichedData().catch(() => {});

/**
 * Look up a single word using shared constants from commentaryUtils
 * Priority: PreClassification → Abbreviations → Halachic → Rashi vocab → API
 */
const lookupWord = async (word, contextType = 'talmudic') => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // PRO SCHOLAR V6.2: Use preClassificationService FIRST
  // This catches proper nouns (משה=Moses), particles, and abbreviations comprehensively
  try {
    const preClassResult = preClassify(word, { textType: contextType });
    if (preClassResult && preClassResult.skipDictionary) {
      const definition = preClassResult.english || preClassResult.meaning || preClassResult.expansion;
      if (definition) {
        return {
          word: cleaned,
          definition: definition,
          source: preClassResult.source || preClassResult.type || 'Pre-classified',
          expansion: preClassResult.expansion,
          isAbbreviation: preClassResult.type === 'abbreviation',
          isProperNoun: preClassResult.type === 'proper_name',
          root: preClassResult.root,
          note: preClassResult.note
        };
      }
    }
  } catch (err) {
    // Silent fail - continue to other lookups
  }

  // Check abbreviations (shared constants - fallback)
  if (TALMUDIC_ABBREVIATIONS[word]) {
    return {
      word: cleaned,
      definition: TALMUDIC_ABBREVIATIONS[word],
      source: 'Abbreviation',
      expansion: TALMUDIC_ABBREVIATIONS[word],
      isAbbreviation: true
    };
  }

  // Check halachic overrides WITH PREFIX STRIPPING
  // This handles השבת → "the Shabbat", לשבת → "to/for Shabbat", etc.
  // PRO SCHOLAR V12: Also fetch comprehensive etymology for halachic words
  const halachicResult = lookupHalachicWithPrefix(cleaned);
  if (halachicResult) {
    const fullDef = halachicResult.prefix
      ? `${halachicResult.prefix} ${halachicResult.definition}`
      : halachicResult.definition;

    // PRO SCHOLAR V12: Fetch etymology data for halachic words too
    let comprehensiveEtymology = null;
    try {
      comprehensiveEtymology = await getComprehensiveEtymology(cleaned);
      console.log('[WordGlossary] PRO SCHOLAR for halachic word "' + cleaned + '":', JSON.stringify({
        extractedRoot: comprehensiveEtymology?.extractedRoot,
        root: comprehensiveEtymology?.root,
        sources: comprehensiveEtymology?.sources,
        usedRootFallback: comprehensiveEtymology?.usedRootFallback
      }));
    } catch (e) {
      console.error('[WordGlossary] PRO SCHOLAR FAILED for halachic word "' + cleaned + '":', e.message);
    }

    const ety = comprehensiveEtymology || {};
    const effectiveRoot = ety.extractedRoot || ety.root || halachicResult.root || cleaned;

    // PRO SCHOLAR V12: Build sources array with Halachic as primary + any PRO SCHOLAR sources
    const halachicSource = {
      name: halachicResult.source || 'Halachic',
      fullName: 'Halachic Vocabulary',
      definition: fullDef,
      year: null,
      searchedWord: cleaned,
      tier: 'bronze' // PRO SCHOLAR V12: Supplementary curated source
    };
    // Combine: Halachic first, then PRO SCHOLAR sources (if any)
    const combinedSources = [halachicSource, ...(ety.sources || [])];

    return {
      word: cleaned,
      definition: fullDef,
      source: halachicResult.source || 'Halachic',
      root: effectiveRoot,
      // PRO SCHOLAR V12: Set matchType so UI shows root badge when different from word
      matchType: effectiveRoot && effectiveRoot !== cleaned ? 'ROOT_DERIVED' : 'EXACT',
      // PRO SCHOLAR V12: Add etymology data
      protoSemitic: ety.etymology?.protoSemitic || null,
      cognates: ety.etymology?.cognates || null,
      hasEtymology: ety.hasEtymology || (combinedSources.length > 1),
      sources: combinedSources,  // PRO SCHOLAR V12: Full source objects
      allSources: combinedSources,
      sourceCount: combinedSources.length,
      qualityScore: ety.qualityScore || 0,
      extractedRoot: ety.extractedRoot || null,
      usedRootFallback: ety.usedRootFallback || false,
      alternativeRoots: ety.alternativeRoots || [],
      _halachicOverride: true
    };
  }

  // Check Rashi/Talmudic vocabulary (local curated)
  // PRO SCHOLAR V12: Still fetch comprehensive etymology for local matches to get roots/cognates
  if (RASHI_VOCABULARY[cleaned]) {
    let comprehensiveEtymology = null;
    try {
      comprehensiveEtymology = await getComprehensiveEtymology(cleaned);
      // PRO SCHOLAR V12: Debug logging for etymology lookup
      console.log('[WordGlossary] PRO SCHOLAR etymology for "' + cleaned + '":', JSON.stringify({
        extractedRoot: comprehensiveEtymology?.extractedRoot,
        root: comprehensiveEtymology?.root,
        sources: comprehensiveEtymology?.sources,
        usedRootFallback: comprehensiveEtymology?.usedRootFallback,
        hasEtymology: comprehensiveEtymology?.hasEtymology,
        alternativeRoots: comprehensiveEtymology?.alternativeRoots
      }));
    } catch (e) {
      console.error('[WordGlossary] PRO SCHOLAR etymology FAILED for "' + cleaned + '":', e.message);
    }

    const ety = comprehensiveEtymology || {};
    // PRO SCHOLAR V12: Use extractedRoot (from smart root extraction) if available
    const effectiveRoot = ety.extractedRoot || ety.root || cleaned;
    console.log('[WordGlossary] Effective root for "' + cleaned + '":', effectiveRoot);

    // PRO SCHOLAR V12: Build sources array with Rabbinic as primary + any PRO SCHOLAR sources
    const rabbinicSource = {
      name: 'Rabbinic',
      fullName: 'Rabbinic Vocabulary',
      definition: RASHI_VOCABULARY[cleaned],
      year: null,
      searchedWord: cleaned,
      tier: 'bronze' // PRO SCHOLAR V12: Supplementary curated source
    };
    // Combine: Rabbinic first, then PRO SCHOLAR sources (if any)
    const combinedSources = [rabbinicSource, ...(ety.sources || [])];

    return {
      word: cleaned,
      definition: RASHI_VOCABULARY[cleaned],
      source: 'rabbinic-vocab',
      sourceName: 'Rabbinic',
      isLocal: true,
      // PRO SCHOLAR V12: Set matchType so UI shows root badge when different from word
      matchType: effectiveRoot && effectiveRoot !== cleaned ? 'ROOT_DERIVED' : 'EXACT',
      // PRO SCHOLAR V12: Add etymology data even for local vocab
      root: effectiveRoot,
      protoSemitic: ety.etymology?.protoSemitic || null,
      cognates: ety.etymology?.cognates || null,
      hasEtymology: ety.hasEtymology || (combinedSources.length > 1),
      sources: combinedSources,  // PRO SCHOLAR V12: Full source objects
      allSources: combinedSources,
      sourceCount: combinedSources.length,
      qualityScore: ety.qualityScore || 0,
      extractedRoot: ety.extractedRoot || null,
      usedRootFallback: ety.usedRootFallback || false,
      alternativeRoots: ety.alternativeRoots || [] // PRO SCHOLAR V12: Multiple hypotheses
    };
  }

  // Fall back to scholarly API lookup (academic lexicons)
  // PRO SCHOLAR V12: Fetch comprehensive etymology from ALL databases in parallel
  try {
    const [result, comprehensiveEtymology] = await Promise.all([
      scholarlyLookup(cleaned),
      getComprehensiveEtymology(cleaned).catch(() => null)
    ]);

    if (result?.primaryDefinition) {
      const matchType = result._matchType || (result.root && result.root !== cleaned ? 'ROOT_DERIVED' : 'EXACT');

      // PRO SCHOLAR V12: Get sync enriched data as fallback
      const enrichedData = getEnrichedEtymologySync(cleaned);

      // PRO SCHOLAR V12: Merge comprehensive etymology (78,000+ entries)
      const ety = comprehensiveEtymology || {};

      // PRO SCHOLAR V12: Use extractedRoot if smart lookup found root via fallback
      const effectiveRoot = ety.extractedRoot || ety.root || result.root;

      return {
        word: cleaned,
        definition: result.primaryDefinition,
        source: result.primarySource || 'Sefaria',
        sourceName: getSourceInfo(result.primarySource)?.name || result.primarySource,
        root: effectiveRoot,
        isLocal: isLocalSource(result.primarySource),
        isLexicon: isAcademicLexicon(result.primarySource),
        matchType,
        // PRO SCHOLAR V12: Proto-Semitic from comprehensive lookup (all sources)
        protoSemitic: ety.etymology?.protoSemitic || ety.protoSemitic || enrichedData?.protoSemitic || null,
        cognates: ety.etymology?.cognates || ety.cognates || enrichedData?.cognates || null,
        hasEtymology: !!(ety.etymology?.protoSemitic || ety.protoSemitic || enrichedData?.protoSemitic || ety.sources?.length > 0),
        // PRO SCHOLAR V12: Academic enrichment from all databases
        isAramaic: ety.isAramaic || enrichedData?.isAramaic || false,
        dialects: ety.dialects || enrichedData?.dialects || [],
        talmudUsage: ety.talmudUsage || enrichedData?.talmudUsage || null,
        calTransliteration: ety.calTransliteration || enrichedData?.calTransliteration || null,
        semanticField: ety.semanticField || enrichedData?.semanticField || null,
        definitions: ety.definitions || enrichedData?.definitions || [],
        sources: ety.sources || enrichedData?.sources || [],  // WordDefinitionCard expects 'sources'
        allSources: ety.sources || enrichedData?.sources || [],
        // PRO SCHOLAR V12: Multi-database enrichment details
        qualityScore: ety.qualityScore || 0,
        sourceCount: ety.sources?.length || 0,
        hasSefariaData: !!ety.sefariaData,
        hasJastrowEty: !!ety.jastrowEtymology,
        hasBDBEty: !!ety.bdbEtymology,
        // PRO SCHOLAR V12: Smart lookup metadata
        extractedRoot: ety.extractedRoot || null,
        usedRootFallback: ety.usedRootFallback || false,
        alternativeRoots: ety.alternativeRoots || [] // Multiple root hypotheses
      };
    }
  } catch (err) {
    // Silent fail - word not found in dictionaries
  }

  return null;
};

/**
 * WordGlossary Component
 * PRO SCHOLAR V12: Enhanced with progress tracking, batch optimization, and uncertainty badges
 */
const WordGlossary = React.memo(({ text, onClose }) => {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // PRO SCHOLAR V12: Progress tracking
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cancelled, setCancelled] = useState(false);

  // PRO SCHOLAR V13: Extract compound phrases from text
  const compoundPhrases = useMemo(() => {
    const cleanText = cleanHtml(text);
    const found = [];
    const phraseKeys = Object.keys(TALMUDIC_COMPOUND_PHRASES).sort((a, b) => b.length - a.length);

    for (const phrase of phraseKeys) {
      if (cleanText.includes(phrase)) {
        found.push({
          word: phrase,
          ...TALMUDIC_COMPOUND_PHRASES[phrase],
          isCompoundPhrase: true,
          matchType: 'PHRASE'
        });
      }
    }
    return found;
  }, [text]);

  // Extract unique words from text
  const words = useMemo(() => {
    const cleanText = cleanHtml(text);
    const allWords = splitIntoWords(cleanText);
    // Filter out punctuation and very short words, keep unique
    const seen = new Set();
    return allWords.filter(w => {
      const cleaned = cleanHebrewWord(w);
      if (!cleaned || cleaned.length < 2 || seen.has(cleaned)) return false;
      seen.add(cleaned);
      return true;
    });
  }, [text]);

  // PRO SCHOLAR V12: Optimized batch lookup with progress tracking
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setCancelled(false);
    setProgress({ current: 0, total: words.length });

    const lookupAllWords = async () => {
      try {
        // PRO SCHOLAR V13: Start with compound phrases
        const results = [...compoundPhrases];
        const BATCH_SIZE = 10; // Process in parallel batches
        const wordMap = new Map(); // Deduplication cache

        // PRO SCHOLAR V12: Process words in parallel batches for speed
        for (let batchStart = 0; batchStart < words.length; batchStart += BATCH_SIZE) {
          if (!isMounted || cancelled) break;

          const batch = words.slice(batchStart, batchStart + BATCH_SIZE);

          // Process batch in parallel
          const batchPromises = batch.map(async (word) => {
            const cleaned = cleanHebrewWord(word);

            // Check deduplication cache
            if (wordMap.has(cleaned)) {
              return wordMap.get(cleaned);
            }

            const result = await lookupWord(word);

            if (result) {
              wordMap.set(cleaned, result);
              return result;
            } else if (cleaned && cleaned.length >= 2) {
              // Word not found - add with morphological hint
              const hint = getMorphologicalHint(cleaned);
              const notFoundResult = {
                word: cleaned,
                definition: null,
                notFound: true,
                hint: hint?.breakdown || null,
                possibleRoot: hint?.possibleRoot || null,
                prefixes: hint?.prefixes || null,
                suffixes: hint?.suffixes || null,
                source: 'not-found'
              };
              wordMap.set(cleaned, notFoundResult);
              return notFoundResult;
            }
            return null;
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(Boolean));

          // Update progress
          if (isMounted) {
            setProgress({
              current: Math.min(batchStart + BATCH_SIZE, words.length),
              total: words.length
            });
          }

          // Small delay between batches to prevent overwhelming
          if (batchStart + BATCH_SIZE < words.length) {
            await new Promise(r => setTimeout(r, 20));
          }
        }

        if (isMounted && !cancelled) {
          setDefinitions(results);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load definitions');
          setLoading(false);
        }
      }
    };

    lookupAllWords();

    return () => { isMounted = false; };
  }, [words, cancelled, compoundPhrases]);

  return (
    <div className="word-glossary slide-down" role="region" aria-label="Word definitions glossary">
      <div className="glossary-header">
        <span className="glossary-title" id="glossary-title">Word Definitions</span>
        <button
          className="glossary-close"
          onClick={onClose}
          aria-label="Close glossary"
          title="Close glossary"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="glossary-content" aria-labelledby="glossary-title">
        {loading && (
          <div className="glossary-loading" role="status" aria-live="polite">
            <div className="loading-header">
              <span className="loading-spinner" aria-hidden="true">↻</span>
              <span>Loading definitions ({progress.current}/{progress.total})</span>
            </div>
            {/* PRO SCHOLAR V12: Progress bar */}
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <button
              className="loading-cancel-btn"
              onClick={() => setCancelled(true)}
              title="Show partial results"
            >
              Show {progress.current} results now
            </button>
          </div>
        )}

        {error && (
          <div className="glossary-error" role="alert">{error}</div>
        )}

        {!loading && !error && definitions.length === 0 && (
          <div className="glossary-empty" role="status">
            No definitions found. Try clicking individual words.
          </div>
        )}

        {!loading && definitions.length > 0 && (
          <ul className="glossary-list" aria-label="Word definitions">
            {definitions.map((def, idx) => {
              // PRO SCHOLAR V12: Enhanced not-found feedback with actionable suggestions
              if (def.notFound) {
                const hasMorphology = def.hint || def.possibleRoot || def.prefixes?.length > 0;
                return (
                  <li
                    key={`${def.word}-${idx}`}
                    className="glossary-item not-found"
                  >
                    <span className="glossary-word not-found-word" dir="rtl" lang="he">{def.word}</span>
                    <span className="glossary-arrow" aria-hidden="true">→</span>
                    <div className="glossary-not-found-content">
                      {hasMorphology ? (
                        <div className="morphology-breakdown">
                          {def.prefixes?.length > 0 && (
                            <span className="morph-prefix" title="Detected prefix">
                              <span className="morph-label">Prefix:</span> {def.prefixes.join(' + ')}
                            </span>
                          )}
                          {def.possibleRoot && (
                            <span className="morph-root" title="Possible root">
                              <span className="morph-label">Root:</span>
                              <span dir="rtl" lang="he">√{def.possibleRoot}</span>
                            </span>
                          )}
                          {def.hint && (
                            <span className="morph-hint">
                              <span className="morph-label">Analysis:</span> {def.hint}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="not-found-suggestions">
                          <span className="hint-unknown">Not in dictionary</span>
                          <div className="suggestion-tips">
                            <span className="tip">Try: remove diacritics • check spelling • search root only</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="glossary-source not-found-badge" title="Word not found - showing morphological analysis">
                      {hasMorphology ? '🔍' : '❓'}
                    </span>
                  </li>
                );
              }

              // PRO SCHOLAR V7: Get scholarly source info
              const sourceInfo = getSourceInfo(def.source);
              const sourceIcon = def.isLexicon ? '📚' : def.isLocal ? '📝' : '📖';
              const sourceLabel = def.sourceName || sourceInfo?.name || def.source;
              const matchLabel = def.matchType === 'ROOT_DERIVED' ? ' √' : '';

              // PRO SCHOLAR V12: Format dialects for display
              const dialectDisplay = def.dialects?.length > 0 ? def.dialects.slice(0, 2).join(', ') : null;
              const hasScholarly = def.dialects?.length > 0 || def.talmudUsage || def.definitions?.length > 1;

              return (
                <li
                  key={`${def.word}-${idx}`}
                  className={`glossary-item ${def.isCompoundPhrase ? 'compound-phrase' : ''} ${def.isProperNoun ? 'proper-noun' : ''} ${def.isAbbreviation ? 'abbreviation' : ''} ${def.isLexicon ? 'source-lexicon' : ''} ${def.isLocal ? 'source-local' : ''} ${def.hasEtymology ? 'has-etymology' : ''} ${def.isAramaic ? 'aramaic' : ''} ${hasScholarly ? 'has-scholarly' : ''}`}
                >
                  <span className="glossary-word" dir="rtl" lang="he">{def.word}</span>
                  {/* PRO SCHOLAR V13: Compound phrase badge */}
                  {def.isCompoundPhrase && (
                    <span className="glossary-phrase-badge" title={def.note || 'Talmudic phrase'}>📚</span>
                  )}
                  {/* PRO SCHOLAR V12: Aramaic indicator with dialect */}
                  {def.isAramaic && (
                    <span className="glossary-aramaic-badge" title={dialectDisplay || 'Aramaic'}>
                      ארמ
                    </span>
                  )}
                  {def.isAbbreviation && def.expansion && (
                    <span className="glossary-expansion" dir="rtl" lang="he">({def.expansion})</span>
                  )}
                  {def.isProperNoun && (
                    <span className="glossary-proper-noun-badge" title={def.note || 'Proper noun'}>👤</span>
                  )}
                  {/* PRO SCHOLAR V7: Show root if derived */}
                  {def.root && def.matchType === 'ROOT_DERIVED' && (
                    <span className="glossary-root" dir="rtl" title={`Root: ${def.root}`}>
                      (√{def.root})
                    </span>
                  )}
                  {/* PRO SCHOLAR V12: CAL transliteration for Aramaic */}
                  {def.calTransliteration && (
                    <span className="glossary-cal" title="CAL transliteration">
                      [{def.calTransliteration}]
                    </span>
                  )}
                  <span className="glossary-arrow" aria-hidden="true">→</span>
                  <span className="glossary-definition">{def.definition}</span>
                  {/* PRO SCHOLAR V12: Dialects display */}
                  {dialectDisplay && (
                    <span className="glossary-dialects" title={`Dialects: ${def.dialects.join(', ')}`}>
                      ({dialectDisplay})
                    </span>
                  )}
                  {/* PRO SCHOLAR: Proto-Semitic reconstruction */}
                  {def.protoSemitic && (
                    <span
                      className="glossary-proto-semitic"
                      title={`Proto-Semitic reconstruction${def.cognates ? ` • Cognates: ${Object.keys(def.cognates).join(', ')}` : ''}`}
                    >
                      <span className="proto-label">PS</span>
                      <span className="proto-form">*{def.protoSemitic.replace(/^\*/, '')}</span>
                    </span>
                  )}
                  {/* PRO SCHOLAR V12: Multiple sources indicator with database details */}
                  {def.sourceCount > 1 && (
                    <span
                      className="glossary-multi-source"
                      title={`${def.sourceCount} sources: ${def.allSources?.join(', ') || 'Multiple databases'}${def.hasSefariaData ? ' • Sefaria' : ''}${def.hasJastrowEty ? ' • Jastrow' : ''}${def.hasBDBEty ? ' • BDB' : ''}`}
                    >
                      +{def.sourceCount - 1}
                    </span>
                  )}
                  {/* Fallback for allSources array */}
                  {!def.sourceCount && def.allSources?.length > 1 && (
                    <span className="glossary-multi-source" title={`Sources: ${def.allSources.join(', ')}`}>
                      +{def.allSources.length - 1}
                    </span>
                  )}
                  {/* PRO SCHOLAR V7: Scholarly source badge */}
                  <span
                    className={`glossary-source ${def.isLexicon ? 'lexicon' : def.isLocal ? 'local' : ''}`}
                    title={`${sourceInfo?.fullName || def.source}${def.isLocal ? ' [local vocabulary]' : ' [academic lexicon]'}`}
                  >
                    {sourceIcon} {sourceLabel}{matchLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="glossary-footer">
          <span className="glossary-hint">
            <span className="hint-lexicon">📚 Academic Lexicon</span>
            <span className="hint-local">📝 Curated [local]</span>
            <span className="hint-proto">PS Proto-Semitic</span>
          </span>
        </div>
      </div>
    </div>
  );
});

WordGlossary.displayName = 'WordGlossary';

WordGlossary.propTypes = {
  /** Hebrew/Aramaic text to generate glossary from */
  text: PropTypes.string.isRequired,
  /** Callback to close the glossary */
  onClose: PropTypes.func.isRequired
};

export default WordGlossary;
