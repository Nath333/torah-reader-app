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
import './WordGlossary.css';

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
  const halachicResult = lookupHalachicWithPrefix(cleaned);
  if (halachicResult) {
    const fullDef = halachicResult.prefix
      ? `${halachicResult.prefix} ${halachicResult.definition}`
      : halachicResult.definition;
    return {
      word: cleaned,
      definition: fullDef,
      source: halachicResult.source || 'Halachic',
      root: halachicResult.root
    };
  }

  // Check Rashi/Talmudic vocabulary (local curated)
  if (RASHI_VOCABULARY[cleaned]) {
    return {
      word: cleaned,
      definition: RASHI_VOCABULARY[cleaned],
      source: 'rabbinic-vocab',
      sourceName: 'Rabbinic',
      isLocal: true,
      matchType: 'EXACT'
    };
  }

  // Fall back to scholarly API lookup (academic lexicons)
  try {
    const result = await scholarlyLookup(cleaned);
    if (result?.primaryDefinition) {
      const matchType = result._matchType || (result.root && result.root !== cleaned ? 'ROOT_DERIVED' : 'EXACT');
      return {
        word: cleaned,
        definition: result.primaryDefinition,
        source: result.primarySource || 'Sefaria',
        sourceName: getSourceInfo(result.primarySource)?.name || result.primarySource,
        root: result.root,
        isLocal: isLocalSource(result.primarySource),
        isLexicon: isAcademicLexicon(result.primarySource),
        matchType
      };
    }
  } catch (err) {
    // Silent fail - word not found in dictionaries
  }

  return null;
};

/**
 * WordGlossary Component
 */
const WordGlossary = React.memo(({ text, onClose }) => {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Look up all words
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const lookupAllWords = async () => {
      try {
        const results = [];

        // Process words in batches to avoid overwhelming the API
        for (let i = 0; i < words.length; i++) {
          if (!isMounted) break;

          const word = words[i];
          const result = await lookupWord(word);

          if (result) {
            results.push(result);
          }

          // Small delay between lookups
          if (i < words.length - 1) {
            await new Promise(r => setTimeout(r, 50));
          }
        }

        if (isMounted) {
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
  }, [words]);

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
            <span className="loading-spinner" aria-hidden="true">↻</span>
            <span>Loading definitions...</span>
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
              // PRO SCHOLAR V7: Get scholarly source info
              const sourceInfo = getSourceInfo(def.source);
              const sourceIcon = def.isLexicon ? '📚' : def.isLocal ? '📝' : '📖';
              const sourceLabel = def.sourceName || sourceInfo?.name || def.source;
              const matchLabel = def.matchType === 'ROOT_DERIVED' ? ' √' : '';

              return (
                <li
                  key={`${def.word}-${idx}`}
                  className={`glossary-item ${def.isProperNoun ? 'proper-noun' : ''} ${def.isAbbreviation ? 'abbreviation' : ''} ${def.isLexicon ? 'source-lexicon' : ''} ${def.isLocal ? 'source-local' : ''}`}
                >
                  <span className="glossary-word" dir="rtl" lang="he">{def.word}</span>
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
