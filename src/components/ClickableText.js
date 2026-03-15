/**
 * ClickableText - Unified Interactive Hebrew/Aramaic Text Component
 *
 * A professional, optimized component for displaying Hebrew and Aramaic text
 * with word-by-word translation support via Sefaria API, Jastrow, and local dictionaries.
 *
 * Features:
 * - Multi-source scholarly lookups (Jastrow, BDB, Strong's, Sefaria)
 * - Hebrew and Aramaic support with language-specific styling
 * - Vocabulary saving integration
 * - French translation support (Hebrew)
 * - Enlarged first letter for Torah study display
 * - Responsive tooltips with source attribution
 *
 * @example
 * // Hebrew with French translations
 * <ClickableText text={hebrewText} language="hebrew" showFrench />
 *
 * // Aramaic Targum text
 * <ClickableText text={aramaicText} language="aramaic" />
 *
 * // With vocabulary saving
 * <ClickableText text={text} onSaveWord={handleSave} hasWord={checkWord} />
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './ClickableText.css';
import { splitIntoWords, hasTranslation as hasLocalTranslation, cleanHebrewWord } from '../services/hebrewDictionary';
import { lookupWordAsync as lookupHebrewAsync, lookupWordSync as lookupHebrewSync } from '../services/combinedTranslationService';
import { scholarlyLookup, lookupJastrow, lookupWordSefaria } from '../services/scholarlyLexiconService';
import { lookupAramaicWord } from '../services/babylonianDictionary';
import { cleanHtml } from '../utils/sanitize';
import { translateEnglishToFrench, quickTranslate } from '../services/englishToFrenchService';
import { getSourceStyle } from '../constants/dictionarySources';

// =============================================================================
// Lookup Functions
// =============================================================================

/**
 * Scholarly Hebrew lookup - uses multiple sources (BDB, Strong's, Jastrow, Klein, Sefaria)
 * Professional scholarly lookup for Torah study applications
 */
const lookupHebrewScholarlyAsync = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { english: null, french: null, source: 'none', sources: [] };
  }

  const result = {
    word,
    cleanedWord: cleaned,
    english: null,
    french: null,
    fullDefinition: null,
    source: 'none',
    sources: [],
    language: 'Hebrew',
    headword: null,
    root: null,
    morphology: null,
    matchedForm: null
  };

  try {
    // Use scholarly lookup for rich multi-source data from Sefaria
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      result.english = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.matchedForm = scholarlyResult.matchedForm;
      result.language = scholarlyResult.language || 'Hebrew';

      // Get headword from first available source
      result.headword = scholarlyResult.sources?.bdb?.headword ||
                        scholarlyResult.sources?.strong?.headword ||
                        scholarlyResult.sources?.jastrow?.headword ||
                        cleaned;

      // Default source to 'sefaria' when we have a definition
      // Will be overridden if specific source is identified
      result.source = 'sefaria';

      // Collect all available scholarly sources with full definitions

      // BDB - Brown-Driver-Briggs (standard Biblical Hebrew lexicon)
      if (scholarlyResult.sources?.bdb) {
        const bdbDefs = scholarlyResult.sources.bdb.definitions || [];
        const def = bdbDefs.find(d => !d.isShort)?.text || bdbDefs[0]?.text || scholarlyResult.primaryDefinition;
        if (def) {
          result.sources.push({
            name: 'BDB',
            fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
            definition: def,
            year: 1906,
            morphology: scholarlyResult.sources.bdb.morphology
          });
          result.source = 'bdb';
        }
      }

      // Strong's Concordance
      if (scholarlyResult.sources?.strong) {
        const strongDefs = scholarlyResult.sources.strong.definitions || [];
        const def = strongDefs.find(d => !d.isShort)?.text || strongDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: "Strong's",
            fullName: "Strong's Concordance",
            definition: def,
            strongNumber: scholarlyResult.sources.strong.strongNumber
          });
          if (result.source === 'sefaria') result.source = 'strong';
        }
      }

      // Jastrow (Aramaic/Rabbinic Hebrew)
      if (scholarlyResult.sources?.jastrow) {
        const jastrowDefs = scholarlyResult.sources.jastrow.definitions || [];
        const def = jastrowDefs.find(d => !d.isShort)?.text || jastrowDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Jastrow',
            fullName: "Jastrow's Dictionary of Targumim, Talmud",
            definition: def,
            year: 1903
          });
          // If Jastrow found, likely Aramaic or Rabbinic Hebrew
          if (result.source === 'sefaria') {
            result.source = 'jastrow';
            result.language = 'Aramaic';
          }
        }
      }

      // Klein's Etymological Dictionary
      if (scholarlyResult.sources?.klein) {
        const kleinDefs = scholarlyResult.sources.klein.definitions || [];
        const def = kleinDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Klein',
            fullName: "Klein's Etymological Dictionary",
            definition: def,
            year: 1987
          });
        }
      }

      // Steinsaltz (Koren) - Modern Talmud translation
      if (scholarlyResult.sources?.steinsaltz) {
        const steinsaltzDefs = scholarlyResult.sources.steinsaltz.definitions || [];
        const def = steinsaltzDefs.find(d => !d.isShort)?.text || steinsaltzDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Steinsaltz',
            fullName: 'Steinsaltz Talmud Translation',
            definition: def,
            year: 1989
          });
          if (result.source === 'sefaria') {
            result.source = 'steinsaltz';
            result.language = 'Aramaic';
          }
        }
      }

      // Sefaria's own lexicon
      if (scholarlyResult.sources?.sefaria) {
        const sefariaDefs = scholarlyResult.sources.sefaria.definitions || [];
        const def = sefariaDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Sefaria',
            fullName: 'Sefaria.org Lexicon',
            definition: def
          });
        }
      }

      // Bolls.life BDB API (additional online source)
      if (scholarlyResult.sources?.bolls) {
        const bollsDefs = scholarlyResult.sources.bolls.definitions || [];
        const def = bollsDefs.find(d => !d.isShort)?.text || bollsDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Bolls.life',
            fullName: 'Bolls.life Bible Dictionary (BDB/Thayer)',
            definition: def,
            year: 2020,
            strongNumber: scholarlyResult.sources.bolls.strongNumber
          });
        }
      }

      // HALOT - Hebrew and Aramaic Lexicon of the Old Testament
      if (scholarlyResult.sources?.halot) {
        const halotDefs = scholarlyResult.sources.halot.definitions || [];
        const def = halotDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'HALOT',
            fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
            definition: def,
            year: 2000
          });
        }
      }

      // Gesenius - Hebrew Grammar and Lexicon
      if (scholarlyResult.sources?.gesenius) {
        const geseniusDefs = scholarlyResult.sources.gesenius.definitions || [];
        const def = geseniusDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'Gesenius',
            fullName: "Gesenius' Hebrew Grammar & Lexicon",
            definition: def,
            year: 1910
          });
        }
      }

      // TWOT - Theological Wordbook of the Old Testament
      if (scholarlyResult.sources?.twot) {
        const twotDefs = scholarlyResult.sources.twot.definitions || [];
        const def = twotDefs[0]?.text;
        if (def) {
          result.sources.push({
            name: 'TWOT',
            fullName: 'Theological Wordbook of the Old Testament',
            definition: def,
            year: 1980
          });
        }
      }

      // Other sources (additional lexicons from Sefaria)
      if (scholarlyResult.sources?.other?.length > 0) {
        for (const other of scholarlyResult.sources.other.slice(0, 3)) {
          if (other.definitions?.length > 0) {
            // Parse lexicon name for better display
            const lexiconName = other.lexicon || '';
            let displayName = 'Lexicon';
            let fullName = lexiconName;

            // Identify specific lexicons
            if (lexiconName.toLowerCase().includes('halot')) {
              displayName = 'HALOT';
              fullName = 'Hebrew and Aramaic Lexicon of the Old Testament';
            } else if (lexiconName.toLowerCase().includes('gesenius')) {
              displayName = 'Gesenius';
              fullName = "Gesenius' Hebrew Grammar";
            } else if (lexiconName.toLowerCase().includes('twot') || lexiconName.toLowerCase().includes('theological wordbook')) {
              displayName = 'TWOT';
              fullName = 'Theological Wordbook of the Old Testament';
            } else if (lexiconName.toLowerCase().includes('even') || lexiconName.toLowerCase().includes('shoshan')) {
              displayName = 'Even-Shoshan';
              fullName = 'Even-Shoshan Hebrew Dictionary';
            } else {
              displayName = lexiconName.split(' ')[0] || 'Lexicon';
            }

            // Only add if not already in sources
            if (!result.sources.find(s => s.name === displayName)) {
              result.sources.push({
                name: displayName,
                fullName: fullName,
                definition: other.definitions[0]?.text
              });
            }
          }
        }
      }

      // If we still have no specific sources but have a definition, add Sefaria as source
      if (result.sources.length === 0 && result.english) {
        result.sources.push({
          name: 'Sefaria',
          fullName: 'Sefaria Lexicon',
          definition: result.english
        });
      }

      // Grammar/morphology
      if (scholarlyResult.grammar) {
        result.morphology = scholarlyResult.grammar;
      }

      // Cognate analysis for etymology
      if (scholarlyResult.cognates) {
        result.cognates = scholarlyResult.cognates;
      }

      // Return if we found English
      if (result.english) {
        // Get French translation directly from English (more efficient than re-doing Hebrew lookup)
        if (!result.french) {
          try {
            const frenchTranslation = await translateEnglishToFrench(result.english);
            if (frenchTranslation) {
              result.french = frenchTranslation;
            }
          } catch (e) {
            // French translation failed, continue without it
          }
        }
        return result;
      }
    }

    // Fallback to combined lookup for French support and additional data
    const combinedResult = await lookupHebrewAsync(cleaned);
    if (combinedResult?.english) {
      // Merge sources if combinedResult has more
      const existingSources = result.sources.map(s => s.name);
      if (combinedResult.sources) {
        for (const src of combinedResult.sources) {
          if (!existingSources.includes(src.name)) {
            result.sources.push(src);
          }
        }
      }

      return {
        ...result,
        english: result.english || combinedResult.english,
        french: combinedResult.french,
        source: result.source !== 'none' ? result.source : (combinedResult.source || 'sefaria'),
        sources: result.sources.length > 0 ? result.sources : combinedResult.sources || [{ name: 'Sefaria', definition: combinedResult.english }],
        language: combinedResult.language || result.language
      };
    }
  } catch (error) {
    console.warn('Scholarly Hebrew lookup failed:', error.message);
  }

  // Final fallback to sync lookup
  const localResult = lookupHebrewSync(cleaned);
  if (localResult?.english) {
    return {
      ...result,
      english: localResult.english,
      french: localResult.french,
      source: 'local',
      sources: [{ name: 'Dictionary', definition: localResult.english }]
    };
  }

  return result;
};

/**
 * Scholarly Aramaic lookup - uses multiple sources (Jastrow, BDB, Sefaria)
 */
const lookupAramaicAsync = async (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const result = {
    word,
    cleanedWord: cleaned,
    translation: null,
    fullDefinition: null,
    source: 'none',
    sources: [],
    language: 'Aramaic',
    headword: null,
    root: null,
    morphology: null
  };

  try {
    // Try scholarly lookup first for rich multi-source data
    const scholarlyResult = await scholarlyLookup(cleaned);

    if (scholarlyResult?.primaryDefinition) {
      result.translation = scholarlyResult.primaryDefinition;
      result.root = scholarlyResult.root;
      result.headword = scholarlyResult.sources?.jastrow?.headword ||
                        scholarlyResult.sources?.bdb?.headword ||
                        cleaned;

      // Collect all available sources
      if (scholarlyResult.sources?.jastrow?.definitions?.length > 0) {
        result.sources.push({
          name: 'Jastrow',
          fullName: "Jastrow's Dictionary of Targumim, Talmud",
          definition: scholarlyResult.sources.jastrow.definitions[0]?.text || scholarlyResult.primaryDefinition,
          year: 1903
        });
        result.source = 'jastrow';
      }

      if (scholarlyResult.sources?.bdb?.definitions?.length > 0) {
        result.sources.push({
          name: 'BDB',
          fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
          definition: scholarlyResult.sources.bdb.definitions[0]?.text,
          year: 1906
        });
        if (!result.source || result.source === 'none') result.source = 'bdb';
      }

      if (scholarlyResult.sources?.strong?.definitions?.length > 0) {
        result.sources.push({
          name: "Strong's",
          fullName: "Strong's Concordance",
          definition: scholarlyResult.sources.strong.definitions[0]?.text,
          strongNumber: scholarlyResult.sources.strong.strongNumber
        });
      }

      // Steinsaltz for Aramaic
      if (scholarlyResult.sources?.steinsaltz?.definitions?.length > 0) {
        result.sources.push({
          name: 'Steinsaltz',
          fullName: 'Steinsaltz Talmud Translation',
          definition: scholarlyResult.sources.steinsaltz.definitions[0]?.text,
          year: 1989
        });
      }

      // Klein's Etymology
      if (scholarlyResult.sources?.klein?.definitions?.length > 0) {
        result.sources.push({
          name: 'Klein',
          fullName: "Klein's Etymological Dictionary",
          definition: scholarlyResult.sources.klein.definitions[0]?.text,
          year: 1987
        });
      }

      // HALOT
      if (scholarlyResult.sources?.halot?.definitions?.length > 0) {
        result.sources.push({
          name: 'HALOT',
          fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
          definition: scholarlyResult.sources.halot.definitions[0]?.text,
          year: 2000
        });
      }

      // Sefaria
      if (scholarlyResult.sources?.sefaria?.definitions?.length > 0) {
        result.sources.push({
          name: 'Sefaria',
          fullName: 'Sefaria.org Lexicon',
          definition: scholarlyResult.sources.sefaria.definitions[0]?.text
        });
      }

      if (scholarlyResult.grammar) {
        result.morphology = scholarlyResult.grammar;
      }

      if (scholarlyResult.cognates) {
        result.cognates = scholarlyResult.cognates;
      }

      result.language = scholarlyResult.language || 'Aramaic';
      if (result.translation) return result;
    }

    // Fallback to direct Jastrow lookup
    const jastrowResult = await lookupJastrow(cleaned);
    if (jastrowResult?.shortDefinition) {
      return {
        ...result,
        translation: jastrowResult.shortDefinition,
        fullDefinition: jastrowResult.definitions?.[0] || jastrowResult.shortDefinition,
        source: 'jastrow',
        sources: [{ name: 'Jastrow', fullName: "Jastrow's Dictionary", definition: jastrowResult.shortDefinition }],
        headword: jastrowResult.headword
      };
    }

    // Fallback to Sefaria general lookup
    const sefariaResult = await lookupWordSefaria(cleaned);
    if (sefariaResult?.shortDefinition) {
      return {
        ...result,
        translation: sefariaResult.shortDefinition,
        fullDefinition: sefariaResult.definitions?.[0] || sefariaResult.shortDefinition,
        source: sefariaResult.language === 'Aramaic' ? 'jastrow' : 'sefaria',
        sources: [{ name: 'Sefaria', definition: sefariaResult.shortDefinition }],
        headword: sefariaResult.headword,
        language: sefariaResult.language || 'Aramaic'
      };
    }
  } catch (error) {
    console.warn('Scholarly Aramaic lookup failed:', error.message);
  }

  // Final fallback to local Babylonian dictionary
  const localResult = lookupAramaicWord(cleaned);
  if (localResult) {
    return {
      ...result,
      translation: localResult,
      source: 'babylonian',
      sources: [{ name: 'Dictionary', definition: localResult }]
    };
  }

  return result;
};

/**
 * Synchronous Aramaic lookup from local dictionary
 */
const lookupAramaicSync = (word) => {
  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return { translation: null, source: 'none' };
  }

  const localResult = lookupAramaicWord(cleaned);
  return {
    word,
    cleanedWord: cleaned,
    translation: localResult || null,
    source: localResult ? 'babylonian' : 'none',
    sources: localResult ? [{ name: 'Dictionary', definition: localResult }] : [],
    language: 'Aramaic'
  };
};

// =============================================================================
// Helper Functions
// =============================================================================

// Stable empty array to prevent useMemo dependency issues
const EMPTY_SOURCES = [];

/**
 * Clean and format a definition for display
 * Removes HTML, trims scholarly notes, makes it readable
 */
const cleanDefinition = (text) => {
  if (!text || typeof text !== 'string') return '';

  // Remove HTML tags
  let cleaned = cleanHtml(text);

  // Remove scholarly notation patterns
  cleaned = cleaned
    .replace(/\(a hapax legomenon[^)]*\)/gi, '') // Remove hapax notes
    .replace(/\(occurring[^)]*\)/gi, '')         // Remove occurrence notes
    .replace(/\(in the c\. st\.[^)]*\)/gi, '')   // Remove grammatical notes
    .replace(/\s*,\s*,/g, ',')                   // Clean up double commas
    .replace(/\s+/g, ' ')                        // Normalize whitespace
    .trim();

  // If too long, truncate intelligently
  if (cleaned.length > 120) {
    // Try to cut at a comma or semicolon
    const cutPoint = cleaned.substring(0, 120).lastIndexOf(',');
    if (cutPoint > 60) {
      cleaned = cleaned.substring(0, cutPoint) + '...';
    } else {
      cleaned = cleaned.substring(0, 117) + '...';
    }
  }

  return cleaned;
};

// =============================================================================
// Word Definition Card - Shows below text like EN/FR translation cards
// =============================================================================

/**
 * Single Source Definition Item with French translation
 */
const SourceDefinitionItem = React.memo(function SourceDefinitionItem({ def, showFrench, frenchTranslation }) {
  const [french, setFrench] = useState(frenchTranslation || null);
  const [loadingFr, setLoadingFr] = useState(false);

  // Fetch French translation for this definition
  useEffect(() => {
    if (!showFrench || french || !def.text) return;

    // Try cached first
    const cached = quickTranslate(def.text);
    if (cached) {
      setFrench(cached);
      return;
    }

    // Fetch from API
    setLoadingFr(true);
    translateEnglishToFrench(def.text).then(result => {
      if (result) setFrench(result);
      setLoadingFr(false);
    }).catch(() => setLoadingFr(false));
  }, [showFrench, def.text, french]);

  return (
    <div className="word-def-source-item" title={def.fullName || def.source}>
      <span className="source-badge" style={getSourceStyle(def.source)}>
        {def.source}
        {def.year && <span className="source-year">({def.year})</span>}
      </span>
      <p className="source-text">{def.text}</p>
      {showFrench && (
        <div className="source-french">
          {loadingFr ? (
            <span className="french-loading">Translating...</span>
          ) : french ? (
            <span className="french-text">{french}</span>
          ) : null}
        </div>
      )}
    </div>
  );
});

/**
 * WordDefinitionCard - Card displayed below text (like EN/FR translation cards)
 * Shows ALL dictionary sources (BDB, Jastrow, Strong's, etc.) with French for each
 */
const WordDefinitionCard = React.memo(function WordDefinitionCard({
  word,
  translationData,
  isLoading,
  isAramaic,
  showFrench,
  isInVocabulary,
  onSave,
  onClose
}) {
  const translation = translationData?.english || translationData?.translation;
  const french = translationData?.french;
  const root = translationData?.root;
  const headword = translationData?.headword;
  const morphology = translationData?.morphology;

  // Memoize sources with stable empty array fallback
  const sources = translationData?.sources || EMPTY_SOURCES;

  // Get Strong's number if available
  const strongNumber = sources.find(s => s.strongNumber)?.strongNumber ||
                       translationData?.strongNumber;

  // Detect language
  const detectedLanguage = translationData?.language;
  const effectiveIsAramaic = detectedLanguage
    ? detectedLanguage.toLowerCase() === 'aramaic'
    : isAramaic;

  // Collect all unique definitions from sources
  const allDefinitions = useMemo(() => {
    const defs = [];
    const seenDefs = new Set();

    if (sources?.length > 0) {
      for (const src of sources) {
        if (src.definition) {
          const cleanedText = cleanDefinition(src.definition);
          if (!cleanedText) continue;
          const normalized = cleanedText.toLowerCase().slice(0, 40);
          if (!seenDefs.has(normalized)) {
            seenDefs.add(normalized);
            defs.push({
              text: cleanedText,
              source: src.name,
              year: src.year,
              fullName: src.fullName
            });
          }
        }
      }
    }

    // Fallback to primary definition if no sources
    if (defs.length === 0 && translation) {
      defs.push({
        text: cleanDefinition(translation),
        source: 'Dictionary',
        year: null
      });
    }

    return defs;
  }, [sources, translation]);

  return (
    <div className={`word-definition-card ${effectiveIsAramaic ? 'aramaic' : 'hebrew'}`}>
      {/* Card Header */}
      <div className="word-def-header">
        <div className="word-def-header-left">
          <span className="word-def-word" dir="rtl">{word}</span>
          <span className={`word-def-lang-badge ${effectiveIsAramaic ? 'aramaic' : 'hebrew'}`}>
            {effectiveIsAramaic ? 'ארמית' : 'עברית'}
          </span>
          {strongNumber && (
            <span className="word-def-strong">H{strongNumber}</span>
          )}
        </div>
        <button className="word-def-close" onClick={onClose} title="Close">×</button>
      </div>

      {/* Root/Headword Info */}
      {(root || (headword && headword !== word)) && (
        <div className="word-def-root-info">
          {root && (
            <span className="word-def-root">
              <span className="root-label">שורש</span>
              <span className="root-value">{root}</span>
            </span>
          )}
          {headword && headword !== word && headword !== root && (
            <span className="word-def-headword">
              <span className="headword-label">צורה</span>
              <span className="headword-value">{headword}</span>
            </span>
          )}
        </div>
      )}

      {/* Morphology Tags */}
      {morphology && (morphology.partOfSpeech || morphology.binyan) && (
        <div className="word-def-morphology">
          {morphology.partOfSpeech && (
            <span className="morph-tag pos">{morphology.partOfSpeech}</span>
          )}
          {morphology.binyan && (
            <span className="morph-tag binyan">{morphology.binyan}</span>
          )}
          {morphology.tense && (
            <span className="morph-tag">{morphology.tense}</span>
          )}
          {morphology.gender && (
            <span className="morph-tag">{morphology.gender === 'masculine' ? '♂' : morphology.gender === 'feminine' ? '♀' : morphology.gender}</span>
          )}
          {morphology.number && (
            <span className="morph-tag">{morphology.number}</span>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && !translation && (
        <div className="word-def-loading">
          <div className="word-def-spinner"></div>
          <span>Looking up dictionaries...</span>
        </div>
      )}

      {/* English Definitions - ALL SOURCES with French for each */}
      {allDefinitions.length > 0 && (
        <div className="word-def-block english">
          <div className="word-def-block-header">
            <span className="word-def-flag">🇬🇧</span>
            <span className="word-def-code">EN</span>
            {showFrench && <span className="word-def-flag">🇫🇷</span>}
            <span className="word-def-source">{allDefinitions.length} source{allDefinitions.length > 1 ? 's' : ''}</span>
          </div>
          <div className="word-def-sources-list">
            {allDefinitions.map((def, idx) => (
              <SourceDefinitionItem
                key={`${def.source}-${idx}`}
                def={def}
                showFrench={showFrench}
                frenchTranslation={idx === 0 ? french : null}
              />
            ))}
          </div>
        </div>
      )}

      {/* No translation */}
      {!translation && !isLoading && (
        <div className="word-def-empty">No translation found</div>
      )}

      {/* Footer with save action */}
      {translation && (
        <div className="word-def-footer">
          {isInVocabulary ? (
            <span className="word-def-saved">✓ Saved</span>
          ) : onSave && (
            <button className="word-def-save-btn" onClick={() => onSave()} type="button">+ Save Word</button>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * ClickableText - Unified interactive text with word-by-word translation
 * When clicking a word, shows definition card BELOW the text (like EN/FR cards)
 */
const ClickableText = ({
  text,
  language = 'hebrew',
  className = '',
  direction = 'rtl',
  onSaveWord,
  hasWord,
  showFrench = false,
  enlargeFirstLetter = false
}) => {
  const isAramaic = language === 'aramaic';
  const words = useMemo(() => splitIntoWords(text), [text]);

  // Selected word state - managed at parent level to show card below text
  const [selectedWord, setSelectedWord] = useState(null);
  const [translationData, setTranslationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lookup functions
  const syncLookup = isAramaic ? lookupAramaicSync : lookupHebrewSync;
  const asyncLookup = isAramaic ? lookupAramaicAsync : lookupHebrewScholarlyAsync;

  // Handle word click - lookup and show card below
  const handleWordClick = useCallback(async (word) => {
    // Toggle off if same word clicked
    if (selectedWord === word) {
      setSelectedWord(null);
      setTranslationData(null);
      return;
    }

    setSelectedWord(word);
    setIsLoading(true);

    // Immediate local result
    const localResult = syncLookup(word);
    setTranslationData(localResult);

    // Async API lookup
    try {
      const apiResult = await asyncLookup(word);
      if (apiResult.translation || apiResult.english) {
        setTranslationData(apiResult);
      }
    } catch (error) {
      console.warn('API lookup failed:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWord, syncLookup, asyncLookup]);

  const handleClose = useCallback(() => {
    setSelectedWord(null);
    setTranslationData(null);
  }, []);

  const handleSave = useCallback(() => {
    if (translationData && selectedWord) {
      const english = translationData.english || translationData.translation;
      const french = translationData.french || '';
      onSaveWord?.(selectedWord, english, french);
    }
  }, [selectedWord, translationData, onSaveWord]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedWord) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, handleClose]);

  if (!text) return null;

  // Render enlarged first letter (Hebrew only)
  const renderEnlargedFirstWord = (word) => {
    const firstLetter = word.charAt(0);
    const rest = word.slice(1);
    return (
      <>
        <span className="enlarged-letter">{firstLetter}</span>
        {rest}
      </>
    );
  };

  const containerClass = [
    'clickable-text',
    isAramaic ? 'aramaic' : 'hebrew',
    enlargeFirstLetter && !isAramaic && 'with-enlarged-first',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass} dir={direction} lang={isAramaic ? 'arc' : 'he'}>
      {/* Text with clickable words */}
      <div className="text-words">
        {words.map((word, index) => (
          <React.Fragment key={index}>
            <span
              className={[
                'clickable-word',
                isAramaic ? 'aramaic' : 'hebrew',
                !isAramaic && hasLocalTranslation(word) && 'has-translation',
                selectedWord === word && 'active',
                hasWord?.(word) && 'in-vocabulary'
              ].filter(Boolean).join(' ')}
              onClick={() => handleWordClick(word)}
            >
              {enlargeFirstLetter && index === 0 && !isAramaic
                ? renderEnlargedFirstWord(word)
                : word
              }
            </span>
            {index < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>

      {/* Definition card appears BELOW the text - like EN/FR translation cards */}
      {selectedWord && (
        <WordDefinitionCard
          word={selectedWord}
          translationData={translationData}
          isLoading={isLoading}
          isAramaic={isAramaic}
          showFrench={showFrench}
          isInVocabulary={hasWord?.(selectedWord)}
          onSave={onSaveWord ? handleSave : null}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

// =============================================================================
// Backwards Compatible Exports
// =============================================================================

/**
 * ClickableHebrewText - Backwards compatible wrapper
 * @deprecated Use <ClickableText language="hebrew" /> instead
 */
export const ClickableHebrewText = (props) => (
  <ClickableText {...props} language="hebrew" />
);

/**
 * ClickableAramaicText - Backwards compatible wrapper
 * @deprecated Use <ClickableText language="aramaic" /> instead
 */
export const ClickableAramaicText = (props) => (
  <ClickableText {...props} language="aramaic" />
);

export default React.memo(ClickableText);
export { lookupAramaicAsync, lookupAramaicSync };
