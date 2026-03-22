/**
 * InterlinearText - Displays Hebrew text with English translations underneath each word
 *
 * Shows:
 *   מתני'        יציאות         השבת
 *   [Mishnah]  [transfers]   [Shabbat]
 *
 * Features:
 * - Word-by-word translation from Jastrow/BDB/CAL
 * - Root (שורש) display on hover
 * - Vocabulary mastery integration
 * - Click to see full definition
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { scholarlyLookup } from '../../services/scholarlyLexiconService';
import { splitIntoWords, cleanHebrewWord } from '../../services/hebrewDictionary';
import { cleanHtml } from '../../utils/sanitize';
import {
  TALMUDIC_ABBREVIATIONS,
  RASHI_VOCABULARY,
  lookupHalachicWithPrefix
} from '../../utils/commentaryUtils';
import { useVocabulary } from '../../hooks/useVocabulary';
import './InterlinearText.css';

// Translation cache to avoid repeated lookups
const translationCache = new Map();

/**
 * Look up a single word - returns { meaning, root, source }
 * Uses shared constants from commentaryUtils for consistency
 */
const lookupWordTranslation = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) return null;

  // Check cache first
  if (translationCache.has(cleaned)) {
    return translationCache.get(cleaned);
  }

  // Check abbreviations (shared constants)
  // New format: some abbreviations now have English in brackets like [Mishnah]
  if (TALMUDIC_ABBREVIATIONS[word]) {
    const expansion = TALMUDIC_ABBREVIATIONS[word];
    // Strip brackets if present (e.g., "[Mishnah]" → "Mishnah")
    const meaning = expansion.startsWith('[') && expansion.endsWith(']')
      ? expansion.slice(1, -1)
      : expansion;
    const result = { meaning, root: null, source: 'Abbreviation' };
    translationCache.set(cleaned, result);
    return result;
  }

  // Check halachic overrides WITH PREFIX STRIPPING
  // This handles השבת → "the Shabbat", לשבת → "to/for Shabbat", etc.
  const halachicResult = lookupHalachicWithPrefix(cleaned);
  if (halachicResult) {
    const fullMeaning = halachicResult.prefix
      ? `${halachicResult.prefix} ${halachicResult.definition}`
      : halachicResult.definition;
    const result = {
      meaning: fullMeaning,
      root: halachicResult.root,
      source: halachicResult.source || 'Halachic'
    };
    translationCache.set(cleaned, result);
    return result;
  }

  // Check Rashi vocabulary (shared constants)
  if (RASHI_VOCABULARY[cleaned]) {
    const result = { meaning: RASHI_VOCABULARY[cleaned], root: null, source: 'Talmudic' };
    translationCache.set(cleaned, result);
    return result;
  }

  // API lookup for words not in local dictionaries
  try {
    const result = await scholarlyLookup(cleaned);
    if (result?.primaryDefinition) {
      const translation = {
        meaning: result.primaryDefinition.split(',')[0].split(';')[0].trim().substring(0, 20),
        root: result.root || null,
        fullDefinition: result.primaryDefinition,
        source: result.primarySource || 'Sefaria'
      };
      translationCache.set(cleaned, translation);
      return translation;
    }
  } catch (err) {
    // Silent fail - word not found
  }

  return null;
};

/**
 * Single interlinear word component
 */
const InterlinearWord = React.memo(({
  word,
  translation,
  isKnown,
  onToggleKnown,
  onShowDetails
}) => {
  const cleaned = cleanHebrewWord(word);

  return (
    <div
      className={`interlinear-word ${isKnown ? 'known' : ''}`}
      onClick={() => onShowDetails(word, translation)}
    >
      <span className="il-hebrew" dir="rtl">{word}</span>
      <span className={`il-english ${!translation ? 'no-trans' : ''}`}>
        {translation?.meaning || '·'}
      </span>
      {translation?.root && (
        <span className="il-root" title={`Root: ${translation.root}`}>
          {translation.root}
        </span>
      )}
      <button
        className={`il-known-btn ${isKnown ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleKnown(cleaned);
        }}
        title={isKnown ? 'Mark as unknown' : 'Mark as known'}
      >
        {isKnown ? '✓' : '○'}
      </button>
    </div>
  );
});

/**
 * Word details popup
 */
const WordDetails = React.memo(({ word, translation, onClose }) => {
  if (!word) return null;

  return (
    <div className="word-details-popup">
      <div className="wd-header">
        <span className="wd-word" dir="rtl">{word}</span>
        <button className="wd-close" onClick={onClose}>×</button>
      </div>
      <div className="wd-content">
        {translation?.fullDefinition && (
          <div className="wd-definition">{translation.fullDefinition}</div>
        )}
        {translation?.root && (
          <div className="wd-root">
            <span className="wd-label">Root:</span>
            <span className="wd-value" dir="rtl">{translation.root}</span>
          </div>
        )}
        {translation?.source && (
          <div className="wd-source">
            <span className="wd-label">Source:</span>
            <span className="wd-value">{translation.source}</span>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Main InterlinearText component
 */
const InterlinearText = React.memo(({ text, className = '' }) => {
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedTranslation, setSelectedTranslation] = useState(null);

  // Vocabulary hook for mastery tracking
  const { isKnown, toggleKnown } = useVocabulary();

  // Extract words from text
  const words = useMemo(() => {
    const cleanText = cleanHtml(text);
    return splitIntoWords(cleanText).filter(w => {
      const cleaned = cleanHebrewWord(w);
      return cleaned && cleaned.length >= 1;
    });
  }, [text]);

  // Look up all words
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const lookupAll = async () => {
      const results = {};

      for (let i = 0; i < words.length; i++) {
        if (!isMounted) break;

        const word = words[i];
        const cleaned = cleanHebrewWord(word);

        if (cleaned && cleaned.length >= 2) {
          const trans = await lookupWordTranslation(word);
          if (trans) {
            results[cleaned] = trans;
          }
        }

        // Small delay to avoid overwhelming API
        if (i < words.length - 1 && i % 5 === 4) {
          await new Promise(r => setTimeout(r, 30));
        }
      }

      if (isMounted) {
        setTranslations(results);
        setLoading(false);
      }
    };

    lookupAll();
    return () => { isMounted = false; };
  }, [words]);

  // Handle word click for details
  const handleShowDetails = useCallback((word, translation) => {
    setSelectedWord(word);
    setSelectedTranslation(translation);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedWord(null);
    setSelectedTranslation(null);
  }, []);

  // Count stats
  const totalWords = words.length;
  const translatedCount = Object.keys(translations).length;
  const knownInText = words.filter(w => isKnown(cleanHebrewWord(w))).length;

  return (
    <div className={`interlinear-text ${className}`}>
      {/* Stats bar */}
      <div className="il-stats">
        <span className="il-stat">
          {translatedCount}/{totalWords} words
        </span>
        <span className="il-stat known">
          {knownInText} known
        </span>
        {loading && <span className="il-loading">Loading...</span>}
      </div>

      {/* Interlinear display */}
      <div className="il-words" dir="rtl">
        {words.map((word, idx) => {
          const cleaned = cleanHebrewWord(word);
          const translation = translations[cleaned];
          const wordIsKnown = isKnown(cleaned);

          return (
            <InterlinearWord
              key={`${word}-${idx}`}
              word={word}
              translation={translation}
              isKnown={wordIsKnown}
              onToggleKnown={toggleKnown}
              onShowDetails={handleShowDetails}
            />
          );
        })}
      </div>

      {/* Word details popup */}
      {selectedWord && (
        <WordDetails
          word={selectedWord}
          translation={selectedTranslation}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
});

export default InterlinearText;
