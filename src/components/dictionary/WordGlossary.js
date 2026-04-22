/**
 * WordGlossary - Displays word-by-word definitions for Hebrew/Aramaic text
 *
 * Shows each word with its scholarly definition from Jastrow, BDB, etc.
 * Used when no full English translation is available from Sefaria.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { splitIntoWords, cleanHebrewWord } from '../../services/dictionaries/hebrewDictionary';
import { cleanHtml } from '../../utils/sanitize';
import {
  isAcademicLexicon,
  isLocalSource,
  getSourceInfo
} from '../../constants/dictionarySources';
// Unified lookup: single entry point for all word lookups (replaces 5 separate services)
import {
  lookupWord as unifiedLookupWord,
  getMorphologicalHint
} from '../../services/unifiedLookupService';
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

/**
 * Look up a single word via the unified lookup pipeline.
 * The unified service handles: pre-classification, halachic vocab, function words,
 * academic dictionaries (BDB, Jastrow, Klein, CAL), Aramaic analysis, root extraction,
 * Proto-Semitic reconstruction — all in one pass with caching & deduplication.
 *
 * This adapter maps the unified result shape to what the glossary UI expects.
 */
const lookupWord = async (word, contextType = 'talmudic') => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const result = await unifiedLookupWord(word, {
      contextMode: contextType,
      includeOnline: false
    });

    // No result or no definition found
    const definition = result?.english || result?.sources?.[0]?.definition;
    if (!definition) return null;

    // Determine match type from root data
    const effectiveRoot = result.extractedRoot || result.root || null;
    const matchType = effectiveRoot && effectiveRoot !== cleaned
      ? 'ROOT_DERIVED' : 'EXACT';

    // Map source objects to display names for tooltip (.join works on strings)
    const sources = result.sources || [];
    const sourceNames = sources.map(s => s.name).filter(Boolean);

    // Tier lookup helper (tier can be number or {level} object from different pipeline stages)
    const getTier = (s) => typeof s.tier === 'object' ? s.tier?.level : s.tier;

    // Best tier across all sources (1=academic, 2=scholarly, 3+=curated)
    const bestTier = sources.reduce((best, s) => {
      const t = getTier(s);
      return t && t < best ? t : best;
    }, 99);

    // Primary source's tier (the one shown in the main badge).
    // Pipeline uses first-come-first-served primary, so primaryTier may be worse than bestTier
    // — when that happens, we show a secondary medal to surface the better sources.
    const primarySource = result.source;
    const primarySourceObj = sources.find(s => s.name === primarySource);
    const primaryTier = primarySourceObj ? getTier(primarySourceObj) : null;

    // Sources at the best tier, excluding the primary — used in medal tooltip
    const bestTierSources = bestTier < 99
      ? sources.filter(s => getTier(s) === bestTier && s.name !== primarySource).map(s => s.name)
      : [];

    return {
      word: cleaned,
      definition,
      source: primarySource || 'Unknown',
      sourceName: getSourceInfo(primarySource)?.name || primarySource,
      isLocal: isLocalSource(primarySource),
      isLexicon: isAcademicLexicon(primarySource),
      matchType,
      root: effectiveRoot,
      // Tier: best aggregated tier + primary's tier + names of best-tier sources
      bestTier: bestTier < 99 ? bestTier : null,
      primaryTier,
      bestTierSources,
      // Proto-Semitic
      protoSemitic: result.protoSemitic?.form || null,
      cognates: result.protoSemitic?.cognates || null,
      hasEtymology: !!result.protoSemitic?.form || (sources.length > 1),
      // Language
      isAramaic: result.isAramaic || false,
      // Sources (with proper tier from aggregation)
      sources,
      allSources: sourceNames,
      sourceCount: sources.length,
      // Classification
      isProperNoun: result.isProperNoun || false,
      isAbbreviation: result.isAbbreviation || false,
      expansion: result.isAbbreviation ? (result.fullEnglish || result.english) : null,
      note: result.fullEnglish || null,
      // Quality (from proper confidence scoring)
      qualityScore: result.confidence?.score || 0,
      extractedRoot: result.extractedRoot || null,
      alternativeRoots: result.morphology?.alternativeRoots || []
    };
  } catch (err) {
    // Silent fail - word not found
    return null;
  }
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

              // Tier medal: shown when a better-tier source also matched this word.
              // The pipeline uses first-come-first-served for the primary badge, so
              // a Jastrow/BDB match can be hidden behind a "Rabbinic" primary. This
              // medal surfaces that a higher-tier source confirms the same word.
              const showTierMedal = def.bestTier && def.primaryTier && def.bestTier < def.primaryTier;
              const tierMedalIcon = def.bestTier === 1 ? '🥇' : def.bestTier === 2 ? '🥈' : '🥉';
              const tierMedalLabel = def.bestTier === 1 ? 'Academic' : def.bestTier === 2 ? 'Scholarly' : 'Curated';

              return (
                <li
                  key={`${def.word}-${idx}`}
                  className={`glossary-item ${def.isCompoundPhrase ? 'compound-phrase' : ''} ${def.isProperNoun ? 'proper-noun' : ''} ${def.isAbbreviation ? 'abbreviation' : ''} ${def.isLexicon ? 'source-lexicon' : ''} ${def.isLocal ? 'source-local' : ''} ${def.hasEtymology ? 'has-etymology' : ''} ${def.isAramaic ? 'aramaic' : ''}`}
                >
                  <span className="glossary-word" dir="rtl" lang="he">{def.word}</span>
                  {/* PRO SCHOLAR V13: Compound phrase badge */}
                  {def.isCompoundPhrase && (
                    <span className="glossary-phrase-badge" title={def.note || 'Talmudic phrase'}>📚</span>
                  )}
                  {/* Aramaic indicator */}
                  {def.isAramaic && (
                    <span className="glossary-aramaic-badge" title="Aramaic">
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
                  <span className="glossary-arrow" aria-hidden="true">→</span>
                  <span className="glossary-definition">{def.definition}</span>
                  {/* Proto-Semitic reconstruction */}
                  {def.protoSemitic && (
                    <span
                      className="glossary-proto-semitic"
                      title={`Proto-Semitic reconstruction${def.cognates ? ` • Cognates: ${Object.keys(def.cognates).join(', ')}` : ''}`}
                    >
                      <span className="proto-label">PS</span>
                      <span className="proto-form">*{def.protoSemitic.replace(/^\*/, '')}</span>
                    </span>
                  )}
                  {/* Multiple sources indicator */}
                  {def.sourceCount > 1 && (
                    <span
                      className="glossary-multi-source"
                      title={`${def.sourceCount} sources: ${def.allSources?.join(', ') || 'Multiple databases'}`}
                    >
                      +{def.sourceCount - 1}
                    </span>
                  )}
                  {/* Tier medal: a better-tier source also confirms this word */}
                  {showTierMedal && (
                    <span
                      className={`glossary-tier-medal tier-${def.bestTier}`}
                      title={`${tierMedalLabel} source${def.bestTierSources.length > 1 ? 's' : ''} also confirm${def.bestTierSources.length > 1 ? '' : 's'}: ${def.bestTierSources.join(', ')}`}
                    >
                      {tierMedalIcon}
                    </span>
                  )}
                  {/* PRO SCHOLAR V7: Primary source badge (first-matched stage) */}
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
