/**
 * WordGlossary - Displays word-by-word definitions for Hebrew/Aramaic text
 *
 * Shows each word with its scholarly definition from Jastrow, BDB, etc.
 * Used when no full English translation is available from Sefaria.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { scholarlyLookup } from '../../services/scholarlyLexiconService';
import { splitIntoWords, cleanHebrewWord } from '../../services/hebrewDictionary';
import { cleanHtml } from '../../utils/sanitize';
import {
  TALMUDIC_ABBREVIATIONS,
  RASHI_VOCABULARY,
  lookupHalachicWithPrefix
} from '../../utils/commentaryUtils';
import './WordGlossary.css';

/**
 * Look up a single word using shared constants from commentaryUtils
 * Priority: Abbreviations → Halachic → Rashi vocab → API
 */
const lookupWord = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Check abbreviations first (shared constants)
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

  // Check Rashi/Talmudic vocabulary
  if (RASHI_VOCABULARY[cleaned]) {
    return {
      word: cleaned,
      definition: RASHI_VOCABULARY[cleaned],
      source: 'Talmudic'
    };
  }

  // Fall back to scholarly API lookup
  try {
    const result = await scholarlyLookup(cleaned);
    if (result?.primaryDefinition) {
      return {
        word: cleaned,
        definition: result.primaryDefinition,
        source: result.primarySource || 'Sefaria',
        root: result.root
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
    <div className="word-glossary slide-down">
      <div className="glossary-header">
        <span className="glossary-title">Word Definitions</span>
        <button className="glossary-close" onClick={onClose} title="Close glossary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="glossary-content">
        {loading && (
          <div className="glossary-loading">
            <span className="loading-spinner">&#x21BB;</span>
            <span>Loading definitions...</span>
          </div>
        )}

        {error && (
          <div className="glossary-error">{error}</div>
        )}

        {!loading && !error && definitions.length === 0 && (
          <div className="glossary-empty">
            No definitions found. Try clicking individual words.
          </div>
        )}

        {!loading && definitions.length > 0 && (
          <div className="glossary-list">
            {definitions.map((def, idx) => (
              <div key={`${def.word}-${idx}`} className="glossary-item">
                <span className="glossary-word" dir="rtl">{def.word}</span>
                {def.isAbbreviation && def.expansion && (
                  <span className="glossary-expansion" dir="rtl">({def.expansion})</span>
                )}
                <span className="glossary-arrow">→</span>
                <span className="glossary-definition">{def.definition}</span>
                <span className={`glossary-source ${def.source?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {def.source}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="glossary-footer">
          <span className="glossary-hint">
            Sources: Jastrow, BDB, Strong's via Sefaria
          </span>
        </div>
      </div>
    </div>
  );
});

export default WordGlossary;
