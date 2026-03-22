/**
 * WordDefinitionCard - Comprehensive word definition display
 * Extracted from ClickableText.js for reusability
 *
 * Features:
 * - Multi-source dictionary display (BDB, Jastrow, Strong's, Klein)
 * - French translation support
 * - Morphological analysis display
 * - Verb conjugation display
 * - Cognates and etymology
 * - Vocabulary saving integration
 */

import React, { useState, useCallback, useEffect, useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { cleanDefinition } from '../../utils/definitionCleaner';
import { DICTIONARY_SOURCES, RELIABILITY_TIERS } from '../../constants/dictionarySources';
import { hebrewToCalTransliteration as hebrewToCAL } from '../../services/calDictionaryService';
import { analyzeVerb } from '../../services/grammarAnalysisService';
import SettingsContext from '../../context/SettingsContext';
import { SourceBadge } from '../shared/SourceBadge';
import {
  getPrefixMeaning,
  getSuffixMeaning,
  isLikelyNoun,
  isVerbSenseDefinition
} from '../../services/wordLookupService';
import SourceDefinitionItem from './SourceDefinitionItem';
import VerbConjugationDisplay from './VerbConjugationDisplay';

// Stable empty array to prevent useMemo dependency issues
const EMPTY_SOURCES = [];

/**
 * WordDefinitionCard - Card displayed below text (like EN/FR translation cards)
 * Shows ALL dictionary sources (BDB, Jastrow, Strong's, etc.) with French for each
 */
const WordDefinitionCard = React.memo(function WordDefinitionCard({
  word,
  translationData,
  isLoading,
  isAramaic,
  isRashiScript = false,
  showFrench: showFrenchProp,
  isInVocabulary,
  onSave,
  onClose
}) {
  // Get settings for controlling feature display
  const settings = useContext(SettingsContext);
  const showMorphology = settings?.showMorphology ?? true;
  const showStrongsNumber = settings?.showStrongsNumber ?? true;
  const showSourceBadges = settings?.showSourceBadges ?? true;

  // Local French toggle state (user can control)
  const [showFrenchLocal, setShowFrenchLocal] = useState(showFrenchProp || false);

  const translation = translationData?.english || translationData?.translation;
  const french = translationData?.french;
  const root = translationData?.root;
  const headword = translationData?.headword;
  const morphology = translationData?.morphology;
  const cognates = translationData?.cognates;
  const transliteration = translationData?.transliteration;
  const usageContext = translationData?.usageContext;

  // Morphological analysis
  const matchedForm = translationData?.matchedForm;
  const strippedPrefix = translationData?.strippedPrefix;
  const strippedSuffix = translationData?.strippedSuffix;

  // Memoize sources with stable empty array fallback
  const sources = translationData?.sources || EMPTY_SOURCES;

  // Get Strong's number if available
  const strongNumber = sources.find(s => s.strongNumber)?.strongNumber ||
                       translationData?.strongNumber;

  // Perform verb analysis for grammar display
  // SKIP for: (1) halachic override words, (2) likely nouns, (3) known POS that isn't verb
  const isHalachicOverride = translationData?._halachicOverride || translationData?.source === 'Halachic' || translationData?.source === 'halachic';

  const verbAnalysis = useMemo(() => {
    if (!word) return null;
    // SKIP verb analysis for halachic overrides (שבת, תורה, משנה are NOUNS)
    if (isHalachicOverride) return null;
    // SKIP if word is likely a noun (has definite article or plural suffix)
    const wordClean = translationData?.cleanedWord || word;
    if (isLikelyNoun(wordClean)) return null;
    // Only analyze if POS is verb OR unknown (but not noun/particle/etc.)
    if (morphology?.partOfSpeech === 'verb' || !morphology?.partOfSpeech) {
      try {
        const analysis = analyzeVerb(word);
        // Only show if we have reasonable confidence
        if (analysis && analysis.binyan && analysis.binyanConfidence !== 'low') {
          return analysis;
        }
      } catch (e) {
        // Silently fail grammar analysis
      }
    }
    return null;
  }, [word, morphology?.partOfSpeech, isHalachicOverride, translationData?.cleanedWord]);

  // Detect language - halachic overrides are ALWAYS Hebrew (שבת, תורה, משנה, etc.)
  const detectedLanguage = translationData?.language;
  const effectiveIsAramaic = isHalachicOverride
    ? false  // Halachic overrides are Hebrew, not Aramaic
    : (detectedLanguage
        ? detectedLanguage.toLowerCase() === 'aramaic'
        : isAramaic);

  // Rashi script font style
  const rashiStyle = { fontFamily: "'Noto Rashi Hebrew', 'Frank Ruhl Libre', serif" };

  // Check if definition is a proper name (Biblical person/place) - should be deprioritized
  const isProperNameDef = useCallback((text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return (
      /^\s*\w+\s*=\s*["']/.test(lower) ||  // "Mattenai = "gift of..."
      /gift of (god|jehovah|the lord)/i.test(lower) ||
      /son of|father of|brother of/i.test(lower) ||
      /proper name|proper noun/i.test(lower) ||
      /a (levite|priest|king|prophet|judge)/i.test(lower)
    );
  }, []);

  // Check if word is likely a noun using grammar service
  const cleanedWord = translationData?.cleanedWord || word;
  const wordIsLikelyNoun = useMemo(() => isLikelyNoun(cleanedWord), [cleanedWord]);

  // Check if word is a Talmudic abbreviation (ends with ׳ or " or ')
  const isTalmudicAbbrev = word && /[׳"'״]$/.test(word);

  // Collect unique definitions from sources - ONE entry per source
  const allDefinitions = useMemo(() => {
    const defs = [];
    const seenSources = new Set();

    if (sources?.length > 0) {
      for (const src of sources) {
        if (!src.definition) continue;

        // Only ONE entry per source
        if (seenSources.has(src.name)) continue;
        seenSources.add(src.name);

        const cleanedText = cleanDefinition(src.definition);
        if (!cleanedText) continue;

        const isProperName = isProperNameDef(cleanedText);
        const isVerbSense = isVerbSenseDefinition(cleanedText);

        defs.push({
          text: cleanedText,
          source: src.name,
          year: src.year,
          fullName: src.fullName,
          headword: src.headword,
          searchedWord: src.searchedWord,
          isDifferentWord: src.headword && src.searchedWord && src.headword !== src.searchedWord,
          isRelatedWord: src.isRelatedWord === true,
          allSourceSenses: src.allSenses?.length > 1 ? src.allSenses : null,
          isProperName,
          isVerbSense,
          recommended: src.recommended === true
        });
      }
    }

    // Fallback to primary definition if no sources
    if (defs.length === 0 && translation) {
      defs.push({
        text: cleanDefinition(translation),
        source: 'Dictionary',
        year: null,
        allSourceSenses: null,
        isProperName: false,
        isVerbSense: isVerbSenseDefinition(translation)
      });
    }

    // Reorder by reliability
    if (defs.length > 1) {
      const getReliabilityLevel = (sourceName) => {
        const key = sourceName?.toLowerCase().replace(/[^a-z]/g, '');
        const source = DICTIONARY_SOURCES[key];
        if (!source) return 99;
        const tier = RELIABILITY_TIERS[source.reliability];
        return tier?.level || 99;
      };

      defs.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (b.recommended && !a.recommended) return 1;

        if (isTalmudicAbbrev) {
          if (a.source === 'Jastrow' && b.source !== 'Jastrow') return -1;
          if (b.source === 'Jastrow' && a.source !== 'Jastrow') return 1;
        }

        if (wordIsLikelyNoun) {
          if (a.isVerbSense && !b.isVerbSense) return 1;
          if (b.isVerbSense && !a.isVerbSense) return -1;
        }

        if (a.isProperName && !b.isProperName) return 1;
        if (b.isProperName && !a.isProperName) return -1;

        return getReliabilityLevel(a.source) - getReliabilityLevel(b.source);
      });
    }

    return defs;
  }, [sources, translation, isTalmudicAbbrev, wordIsLikelyNoun, isProperNameDef]);

  // Copy feedback state
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(word);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    if (onSave && !isInVocabulary) {
      onSave({
        word,
        translation: translation || allDefinitions[0]?.text,
        root,
        morphology,
        strongNumber,
        source: allDefinitions[0]?.source
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isWordSaved = isInVocabulary || saved;

  return (
    <div className={`word-definition-card wdc-pro ${effectiveIsAramaic ? 'aramaic' : 'hebrew'} ${isRashiScript ? 'rashi-source' : ''}`}>
      {/* Compact Header */}
      <div className="wdc-header-pro">
        <div className="wdc-word-section">
          <span className="wdc-word-main" dir="rtl" style={isRashiScript ? rashiStyle : undefined}>{word}</span>
          {transliteration && <span className="wdc-translit">({transliteration})</span>}
          <div className="wdc-badges-inline">
            {isRashiScript && <span className="wdc-badge rashi">רש״י</span>}
            {effectiveIsAramaic && !isRashiScript && <span className="wdc-badge aramaic">ארמית</span>}
            {morphology?.partOfSpeech === 'verb' && morphology?.binyan && (
              <span className="wdc-badge binyan" title={morphology.binyanInfo?.meaning}>
                {morphology.binyanInfo?.hebrew || morphology.binyan}
              </span>
            )}
            {showStrongsNumber && strongNumber && (
              <a href={`https://www.blueletterbible.org/lexicon/h${strongNumber}/kjv/wlc/0-1/`}
                 target="_blank" rel="noopener noreferrer" className="wdc-badge strong" title="Blue Letter Bible">
                H{strongNumber}
              </a>
            )}
          </div>
          {showSourceBadges && translationData?.source && translationData.source !== 'none' && (
            <div className="wdc-source-badge">
              <SourceBadge
                source={
                  translationData.source === 'bdb' ? 'BDB' :
                  translationData.source === 'jastrow' ? 'Jastrow' :
                  translationData.source === 'strong' ? 'Strong' :
                  translationData.source === 'sefaria' ? 'Sefaria' :
                  translationData.source === 'local' ? 'Dictionary' :
                  translationData.source === 'babylonian' ? 'Dictionary' :
                  translationData.source === 'cache' ? 'Dictionary' :
                  translationData.source.charAt(0).toUpperCase() + translationData.source.slice(1)
                }
                accuracy={translationData.offline ? 'partial' : 'high'}
              />
            </div>
          )}
        </div>
        <div className="wdc-actions-mini">
          {!(root || (headword && headword !== word)) && (
            <button className={`wdc-act-fr ${showFrenchLocal ? 'active' : ''}`} onClick={() => setShowFrenchLocal(!showFrenchLocal)} title="Toggle French">
              FR
            </button>
          )}
          <button className={`wdc-act ${copied ? 'done' : ''}`} onClick={handleCopy} title="Copy">
            {copied ? '✓' : '⎘'}
          </button>
          {onSave && (
            <button className={`wdc-act ${isWordSaved ? 'done' : ''}`} onClick={handleSave} disabled={isWordSaved} title="Save">
              {isWordSaved ? '✓' : '★'}
            </button>
          )}
          <button className="wdc-close" onClick={onClose} aria-label="Close">×</button>
        </div>
      </div>

      {/* Root + Headword row */}
      {(root || (headword && headword !== word)) && (
        <div className="wdc-meta-row">
          {root && <span className="wdc-meta-item"><span className="wdc-meta-label">שורש</span><span className="wdc-meta-val" dir="rtl">{root}</span></span>}
          {headword && headword !== word && headword !== root && (
            <span className="wdc-meta-item"><span className="wdc-meta-label">צורה</span><span className="wdc-meta-val" dir="rtl">{headword}</span></span>
          )}
          <button className={`wdc-fr-toggle ${showFrenchLocal ? 'active' : ''}`} onClick={() => setShowFrenchLocal(!showFrenchLocal)}>
            FR
          </button>
        </div>
      )}

      {/* Morphological Analysis */}
      {showMorphology && (strippedPrefix || strippedSuffix || (matchedForm && matchedForm !== word)) && (
        <div className="word-def-morphology-strip">
          <div className="morph-strip-header">
            <span className="morph-icon">🔍</span>
            <span className="morph-title">Analysis</span>
          </div>
          <div className="morph-strip-content">
            <div className="morph-breakdown" dir="rtl">
              {strippedPrefix && (
                <span className="morph-prefix" title={`Prefix: ${strippedPrefix}`}>
                  <span className="prefix-text">{strippedPrefix}</span>
                  <span className="prefix-label">+</span>
                </span>
              )}
              <span className="morph-stem" title="Dictionary form">
                {matchedForm || word}
              </span>
              {strippedSuffix && (
                <span className="morph-suffix" title={`Suffix: ${strippedSuffix}`}>
                  <span className="suffix-label">+</span>
                  <span className="suffix-text">{strippedSuffix}</span>
                </span>
              )}
            </div>
            <div className="morph-explanation">
              {strippedPrefix && (
                <span className="morph-note prefix">
                  <strong>{strippedPrefix}</strong> = {getPrefixMeaning(strippedPrefix)}
                </span>
              )}
              {strippedSuffix && (
                <span className="morph-note suffix">
                  <strong>{strippedSuffix}</strong> = {getSuffixMeaning(strippedSuffix)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verb Analysis */}
      {showMorphology && verbAnalysis && (
        <VerbConjugationDisplay verbAnalysis={verbAnalysis} />
      )}

      {/* Enhanced Morphology */}
      {showMorphology && morphology && (morphology.partOfSpeech || morphology.binyan) && !verbAnalysis && (
        <div className="word-def-morphology-enhanced">
          {morphology.binyan && (
            <div className="morph-binyan-section">
              <div className="morph-row">
                <span className="morph-label">בנין:</span>
                <span className="morph-value binyan-name">
                  {morphology.binyanInfo?.hebrew && (
                    <span className="binyan-hebrew" dir="rtl">{morphology.binyanInfo.hebrew}</span>
                  )}
                  <span className="binyan-latin">{morphology.binyan}</span>
                </span>
              </div>
              {morphology.binyanInfo?.meaning && (
                <div className="morph-row binyan-meaning">
                  <span className="morph-value-small">{morphology.binyanInfo.meaning}</span>
                </div>
              )}
            </div>
          )}

          {morphology.formDescription && (
            <div className="morph-row">
              <span className="morph-label">Form:</span>
              <span className="morph-value">{morphology.formDescription}</span>
            </div>
          )}

          {!morphology.binyan && morphology.partOfSpeech && (
            <div className="morph-row">
              <span className="morph-label">Type:</span>
              <span className="morph-value">{morphology.partOfSpeech}</span>
            </div>
          )}

          <div className="morph-tags-row">
            {morphology.tense && !morphology.formDescription && (
              <span className="morph-tag">{morphology.tense}</span>
            )}
            {morphology.gender && (
              <span className="morph-tag">{morphology.gender === 'masculine' ? '♂ masc' : morphology.gender === 'feminine' ? '♀ fem' : morphology.gender}</span>
            )}
            {morphology.number && (
              <span className="morph-tag">{morphology.number}</span>
            )}
            {morphology.state && (
              <span className="morph-tag">{morphology.state}</span>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && !translation && (
        <div className="word-def-loading">
          <div className="word-def-spinner"></div>
          <div className="word-def-loading-sources">
            <span className="loading-text">Searching dictionaries...</span>
            <div className="loading-source-indicators">
              <span className="source-dot bdb" title="BDB">●</span>
              <span className="source-dot jastrow" title="Jastrow">●</span>
              <span className="source-dot strong" title="Strong's">●</span>
              <span className="source-dot klein" title="Klein">●</span>
            </div>
          </div>
        </div>
      )}

      {/* Definitions - LIMITED TO 3 */}
      {allDefinitions.length > 0 && (
        <div className="word-def-block english wdc-defs">
          <div className="wdc-sources-header">
            <span className="wdc-sources-label">📚 Dictionaries</span>
            <span className="wdc-sources-count">
              {allDefinitions.length <= 3
                ? `${allDefinitions.length} ${allDefinitions.length === 1 ? 'source' : 'sources'}`
                : `3 of ${allDefinitions.length} sources`}
            </span>
          </div>
          <div className="word-def-sources-list">
            {allDefinitions.slice(0, 3).map((def, idx) => (
              <SourceDefinitionItem
                key={`${def.source}-${idx}`}
                def={def}
                showFrench={showFrenchLocal}
                frenchTranslation={idx === 0 ? french : null}
                allSenses={def.allSourceSenses}
              />
            ))}
          </div>
        </div>
      )}

      {/* First Occurrence */}
      {usageContext?.firstOccurrence && (
        <div className="word-def-first-occurrence">
          <span className="first-label">First:</span>
          <a
            href={`https://www.sefaria.org/${encodeURIComponent(usageContext.firstOccurrence.ref)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="first-ref"
            dir="rtl"
          >
            {usageContext.firstOccurrence.heRef || usageContext.firstOccurrence.ref}
          </a>
          {usageContext.isTheologicalTerm && <span className="theo-badge" title="Theological significance">✡</span>}
        </div>
      )}

      {/* Cognates/Etymology */}
      {cognates && (cognates.semanticField || cognates.cognates?.length > 0) ? (() => {
        const aramaicCognates = [];
        const otherCognates = [];

        if (cognates?.cognates) {
          for (const cog of cognates.cognates) {
            const aramaicMatch = cog.match(/Aramaic\s+([\u0590-\u05FF]+)/i);
            if (aramaicMatch) {
              aramaicCognates.push({ word: aramaicMatch[1], full: cog });
            } else {
              otherCognates.push(cog);
            }
          }
        }

        return (
          <div className="word-def-cognates">
            {aramaicCognates.length > 0 && (
              <div className="aramaic-cognates-section">
                <div className="aramaic-cognates-header">
                  <span className="aramaic-icon">📜</span>
                  <span>ארמית קרוב</span>
                </div>
                <div className="aramaic-cognate-list">
                  {aramaicCognates.map((aram, i) => (
                    <div key={i} className="aramaic-cognate-item-wrapper">
                      <span className="aramaic-cognate-item" dir="rtl" title={aram.full}>
                        {aram.word}
                      </span>
                      <span className="aramaic-dict-links">
                        <a
                          href={`https://www.sefaria.org/lexicon/${encodeURIComponent(aram.word)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aramaic-dict-link jastrow"
                          title="Look up in Jastrow"
                        >
                          J
                        </a>
                        <a
                          href={`https://cal.huc.edu/oneentry.php?lemma=${encodeURIComponent(hebrewToCAL(aram.word))}&cits=all`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aramaic-dict-link cal"
                          title={`Look up in CAL: ${hebrewToCAL(aram.word)}`}
                        >
                          C
                        </a>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(cognates?.semanticField || otherCognates.length > 0) && (
              <>
                <div className="cognates-header">Etymology</div>
                {cognates?.semanticField && (
                  <span className="semantic-field">"{cognates.semanticField}"</span>
                )}
                {otherCognates.length > 0 && (
                  <div className="cognate-list">
                    {otherCognates.map((cog, i) => (
                      <span key={i} className="cognate-item">{cog}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })() : null}

      {/* No translation */}
      {!translation && !isLoading && (
        <div className="word-def-empty">No translation found</div>
      )}

      {/* Footer */}
      {translation && (
        <div className="word-def-footer">
          {isInVocabulary ? (
            <span className="word-def-saved">✓ Saved</span>
          ) : onSave && (
            <button className="word-def-save-btn" onClick={() => onSave()} type="button">+ Save</button>
          )}
        </div>
      )}
    </div>
  );
});

WordDefinitionCard.propTypes = {
  word: PropTypes.string.isRequired,
  translationData: PropTypes.shape({
    english: PropTypes.string,
    translation: PropTypes.string,
    french: PropTypes.string,
    root: PropTypes.string,
    headword: PropTypes.string,
    morphology: PropTypes.object,
    cognates: PropTypes.object,
    transliteration: PropTypes.string,
    usageContext: PropTypes.object,
    matchedForm: PropTypes.string,
    strippedPrefix: PropTypes.string,
    strippedSuffix: PropTypes.string,
    sources: PropTypes.array,
    strongNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    cleanedWord: PropTypes.string,
    language: PropTypes.string,
    source: PropTypes.string,
    offline: PropTypes.bool,
    _halachicOverride: PropTypes.bool
  }),
  isLoading: PropTypes.bool,
  isAramaic: PropTypes.bool,
  isRashiScript: PropTypes.bool,
  showFrench: PropTypes.bool,
  isInVocabulary: PropTypes.bool,
  onSave: PropTypes.func,
  onClose: PropTypes.func
};

WordDefinitionCard.defaultProps = {
  translationData: null,
  isLoading: false,
  isAramaic: false,
  isRashiScript: false,
  showFrench: false,
  isInVocabulary: false,
  onSave: null,
  onClose: null
};

export default WordDefinitionCard;
