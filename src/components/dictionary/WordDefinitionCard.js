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
// PRO SCHOLAR V5: Prefix/suffix utilities from centralized helpers
import {
  getPrefixMeaning,
  getSuffixMeaning,
  isLikelyNoun,
  isVerbSenseDefinition
} from '../../utils/wordLookupHelpers';
// 2026 Smart Features - Source Credibility for trust indicators
import {
  getSourceCredibility,
  getCredibilityBadge
} from '../../services/sourceCredibilityService';
// PRO SCHOLAR V3: Context-aware confidence scoring (available for future use)
// import { computeConfidence, getSourceTier, getContextFromReference } from '../../services/preClassificationService';
import SourceDefinitionItem from './SourceDefinitionItem';
import VerbConjugationDisplay from './morphology/VerbConjugationDisplay';
import ProScholarPanel from './panels/ProScholarPanel';
import RootFamilyTree from './panels/RootFamilyTree';
import HistoricalLayerPanel from './panels/HistoricalLayerPanel';
import CognateLanguagesPanel from './panels/CognateLanguagesPanel';
import TextAttestationsPanel from './panels/TextAttestationsPanel';
import RootMeaningPanel from './panels/RootMeaningPanel';
import V6AnalysisBadge from './panels/V6AnalysisBadge';
// PRO SCHOLAR V5: Loading skeleton for better UX
import LoadingSkeleton from '../shared/LoadingSkeleton';

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
  lookupError = null,
  isAramaic,
  isRashiScript = false,
  showFrench: showFrenchProp,
  isInVocabulary,
  onSave,
  onClose,
  onWordLookup // PRO SCHOLAR V6: Callback for looking up related words (root family, conjugations)
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
  // PRO SCHOLAR V12: Prefer extractedRoot (from smart lookup) over dictionary root
  const root = translationData?.extractedRoot || translationData?.root;
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

        // Get credibility data for this source
        const credibility = getSourceCredibility(src.name);
        const badge = credibility ? getCredibilityBadge(credibility.authorityScore) : null;

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
          recommended: src.recommended === true,
          // 2026: Source credibility info
          credibility,
          credibilityBadge: badge
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
            {/* PRO SCHOLAR V6: Compact analysis badge showing confidence & root */}
            {showMorphology && word && (
              <V6AnalysisBadge
                word={word}
                size="small"
                showRoot={true}
                showBinyan={false}
                showWeakType={true}
                onClick={onWordLookup ? (w, analysis) => onWordLookup?.(analysis?.root || w) : undefined}
              />
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
            <button
              className={`wdc-act-fr ${showFrenchLocal ? 'active' : ''}`}
              onClick={() => setShowFrenchLocal(!showFrenchLocal)}
              title="Toggle French translation"
              aria-label={showFrenchLocal ? 'Hide French translation' : 'Show French translation'}
              aria-pressed={showFrenchLocal}
            >
              FR
            </button>
          )}
          <button
            className={`wdc-act ${copied ? 'done' : ''}`}
            onClick={handleCopy}
            title="Copy definition"
            aria-label={copied ? 'Copied!' : 'Copy definition to clipboard'}
          >
            <span aria-hidden="true">{copied ? '✓' : '⎘'}</span>
          </button>
          {onSave && (
            <button
              className={`wdc-act ${isWordSaved ? 'done' : ''}`}
              onClick={handleSave}
              disabled={isWordSaved}
              title={isWordSaved ? 'Word saved' : 'Save to vocabulary'}
              aria-label={isWordSaved ? 'Word saved to vocabulary' : 'Save word to vocabulary'}
            >
              <span aria-hidden="true">{isWordSaved ? '✓' : '★'}</span>
            </button>
          )}
          <button className="wdc-close" onClick={onClose} aria-label="Close definition card">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {/* Root + Headword row - PRO SCHOLAR: Shows root with confidence */}
      {(root || (headword && headword !== word) || translationData?.morphologyInfo) && (
        <div className="wdc-meta-row">
          {/* Root with confidence indicator */}
          {root && (
            <span className="wdc-meta-item wdc-root-item">
              <span className="wdc-meta-label">שורש</span>
              <span className="wdc-meta-val wdc-root-val" dir="rtl">{root}</span>
              {/* PRO SCHOLAR V12: Show confidence badge - prefer rootData.confidence, fallback to morphologyInfo */}
              {(translationData?.rootData?.confidence || translationData?.morphologyInfo?.confidence) && (
                <span
                  className={`wdc-confidence-badge ${
                    (translationData?.rootData?.confidence || translationData?.morphologyInfo?.confidence) >= 85 ? 'high' :
                    (translationData?.rootData?.confidence || translationData?.morphologyInfo?.confidence) >= 70 ? 'medium' : 'low'
                  }`}
                  title={`Root extraction confidence: ${translationData?.rootData?.confidence || translationData?.morphologyInfo?.confidence}%${
                    translationData?.rootData?.source ? ` (${translationData.rootData.source})` :
                    translationData?.morphologyInfo?.wasComputed ? ' (computed algorithmically)' : ''
                  }`}
                >
                  {translationData?.rootData?.confidence || translationData?.morphologyInfo?.confidence}%
                </span>
              )}
              {/* PRO SCHOLAR V12: Show root source badge */}
              {translationData?.rootData?.source && (
                <span
                  className={`wdc-source-badge ${
                    translationData.rootData.source.includes('Jastrow') || translationData.rootData.source.includes('BDB') ? 'academic' :
                    translationData.rootData.source.includes('Strong') ? 'reference' : 'computed'
                  }`}
                  title={`Root verified by: ${translationData.rootData.source}`}
                >
                  {translationData.rootData.source.replace(' (Local)', '').replace('Local', '').split(' ')[0]}
                </span>
              )}
              {/* PRO SCHOLAR: Show weak verb type badge */}
              {translationData?.morphologyInfo?.weakType && (
                <span
                  className="wdc-weak-badge"
                  title={`Weak verb type: ${translationData.morphologyInfo.weakType}`}
                >
                  {translationData.morphologyInfo.weakType.split(' ')[0]}
                </span>
              )}
            </span>
          )}
          {/* Headword (dictionary form) */}
          {headword && headword !== word && headword !== root && (
            <span className="wdc-meta-item"><span className="wdc-meta-label">צורה</span><span className="wdc-meta-val" dir="rtl">{headword}</span></span>
          )}
          {/* Pattern indicator for Aramaic verbs */}
          {translationData?.morphologyInfo?.pattern && (
            <span className="wdc-meta-item wdc-pattern-item">
              <span className="wdc-meta-label">בניין</span>
              <span className="wdc-meta-val wdc-pattern-val">{translationData.morphologyInfo.pattern}</span>
            </span>
          )}
          <button
            className={`wdc-fr-toggle ${showFrenchLocal ? 'active' : ''}`}
            onClick={() => setShowFrenchLocal(!showFrenchLocal)}
            aria-label={showFrenchLocal ? 'Hide French translation' : 'Show French translation'}
            aria-pressed={showFrenchLocal}
            title="Toggle French translation"
          >
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

      {/* PRO SCHOLAR V7: Enhanced Derivation Chain - Shows full scholarly workflow with confidence */}
      {showMorphology && translationData?.derivationChain && (
        <div className="wdc-derivation-chain">
          <div className="derivation-header">
            <span className="derivation-icon">📚</span>
            <span className="derivation-title">Morphological Analysis</span>
            {/* Source indicator */}
            <span className={`derivation-source-badge ${
              translationData.derivationChain.rootSource?.includes('Local') ||
              translationData.derivationChain.rootSource?.includes('ROOT_MEANINGS') ? 'local' :
              translationData.derivationChain.rootSource?.includes('Jastrow') ||
              translationData.derivationChain.rootSource?.includes('BDB') ? 'dictionary' : 'analysis'
            }`}>
              {translationData.derivationChain.rootSource?.includes('Local') ||
               translationData.derivationChain.rootSource?.includes('ROOT_MEANINGS') ? '📍 Local' :
               translationData.derivationChain.rootSource?.includes('Jastrow') ? '📖 Jastrow' :
               translationData.derivationChain.rootSource?.includes('BDB') ? '📖 BDB' :
               translationData.derivationChain.rootSource?.includes('Strong') ? '📖 Strong\'s' : '🔬 Analysis'}
            </span>
            {/* Confidence indicator */}
            {translationData.confidence && (
              <span className={`derivation-confidence ${
                translationData.confidence >= 85 ? 'high' :
                translationData.confidence >= 70 ? 'medium' : 'low'
              }`} title="Root extraction confidence">
                {translationData.confidence}%
              </span>
            )}
          </div>
          <div className="derivation-steps">
            {/* Step 1: Original word */}
            <div className="derivation-step">
              <span className="step-num">①</span>
              <span className="step-label">Surface Form:</span>
              <span className="step-value word" dir="rtl">{translationData.derivationChain.originalWord}</span>
            </div>
            {/* Step 2: Root extraction - only show if we have a root */}
            {translationData.derivationChain.extractedRoot && (
              <div className="derivation-step">
                <span className="step-num">②</span>
                <span className="step-label">שורש (Root):</span>
                <span className="step-value root" dir="rtl">{translationData.derivationChain.extractedRoot}</span>
                {translationData.derivationChain.rootSource &&
                 translationData.derivationChain.rootSource !== 'ROOT_MEANINGS' && (
                  <span className="step-source-tag">{translationData.derivationChain.rootSource.replace(' (Local)', '').replace('Local', '')}</span>
                )}
                {/* PRO SCHOLAR V8: Weak verb type indicator */}
                {translationData.derivationChain.weakVerbType && (
                  <span className="step-weak-badge" title={translationData.derivationChain.weakVerbNote || `Weak verb: ${translationData.derivationChain.weakVerbType}`}>
                    {translationData.derivationChain.weakVerbType}
                  </span>
                )}
              </div>
            )}
            {/* PRO SCHOLAR V8: Weak verb reconstruction note */}
            {translationData.derivationChain.weakVerbNote && (
              <div className="derivation-step weak-note">
                <span className="step-num">↳</span>
                <span className="step-label weak-label">{translationData.derivationChain.weakVerbNote}</span>
              </div>
            )}
            {/* Step 3: Root meaning - only show if we have meaning */}
            {translationData.derivationChain.rootMeaning && (
              <div className="derivation-step">
                <span className="step-num">③</span>
                <span className="step-label">Base Meaning:</span>
                <span className="step-value meaning">{translationData.derivationChain.rootMeaning}</span>
              </div>
            )}
            {/* Step 4: Pattern transformation - only show if we have pattern */}
            {translationData.derivationChain.pattern && (
              <div className="derivation-step">
                <span className="step-num">{translationData.derivationChain.rootMeaning ? '④' : '③'}</span>
                <span className="step-label">בניין (Pattern):</span>
                <span className="step-value pattern">{translationData.derivationChain.pattern}</span>
                {translationData.derivationChain.patternEffect && (
                  <span className="step-effect">→ {translationData.derivationChain.patternEffect}</span>
                )}
              </div>
            )}
            {/* Step 5: Conjugation - only show if we have conjugation */}
            {translationData.derivationChain.conjugation && (
              <div className="derivation-step">
                <span className="step-num">{translationData.derivationChain.rootMeaning ? '⑤' : '④'}</span>
                <span className="step-label">Conjugation:</span>
                <span className="step-value conj">{translationData.derivationChain.conjugation}</span>
              </div>
            )}
            {/* Final: Translation - only show if we have a result */}
            {translationData.derivationChain.finalTranslation && (
              <div className="derivation-step final">
                <span className="step-num">✓</span>
                <span className="step-label">Translation:</span>
                <span className="step-value translation">{translationData.derivationChain.finalTranslation}</span>
              </div>
            )}
          </div>
          {/* Source attribution */}
          <div className="derivation-footer">
            <span className="derivation-method">
              {translationData._multiHypothesis ? '🔬 Multi-hypothesis analysis' :
               translationData._hebrewVerbAnalysis ? '📐 Binyan pattern analysis' :
               translationData._functionWord ? '📋 Common vocabulary' :
               translationData.offline ? '💾 Offline dictionary' : '🌐 API lookup'}
            </span>
            {/* PRO SCHOLAR V8: Confidence indicator */}
            {translationData.derivationChain.confidence && (
              <span className={`derivation-confidence ${
                translationData.derivationChain.confidence >= 90 ? 'high' :
                translationData.derivationChain.confidence >= 75 ? 'good' :
                translationData.derivationChain.confidence >= 60 ? 'moderate' : 'low'
              }`}>
                {translationData.derivationChain.confidence}%
              </span>
            )}
            {/* PRO SCHOLAR V8: Consensus sources */}
            {translationData.derivationChain.consensusSources?.length > 0 && (
              <span className="derivation-consensus" title={`Validated by: ${translationData.derivationChain.consensusSources.join(', ')}`}>
                ✓ {translationData.derivationChain.consensusSources.length} sources
              </span>
            )}
          </div>
          {/* PRO SCHOLAR V8: Uncertainty warning */}
          {translationData.uncertain && (
            <div className={`derivation-uncertainty ${translationData.uncertaintyLevel || 'moderate'}`}>
              <span className="uncertainty-icon">⚠️</span>
              <span className="uncertainty-text">{translationData.uncertaintyWarning || 'Root extraction has some uncertainty'}</span>
            </div>
          )}
        </div>
      )}

      {/* PRO SCHOLAR V4: Multiple Root Hypotheses - Shows ALL possible roots with scholarly sources */}
      {showMorphology && translationData?.allHypotheses && translationData.allHypotheses.length > 1 && (
        <div className="wdc-multi-hypotheses">
          <details className="hypotheses-details">
            <summary className="hypotheses-summary">
              <span className="hypotheses-icon">🔬</span>
              <span className="hypotheses-title">Alternative Roots ({translationData.allHypotheses.length})</span>
            </summary>
            <div className="hypotheses-list">
              {translationData.allHypotheses.map((hyp, idx) => (
                <div
                  key={`${hyp.root}-${idx}`}
                  className={`hypothesis-item ${idx === 0 ? 'primary' : ''}`}
                >
                  <div className="hyp-root-line">
                    <span className="hyp-rank">{idx + 1}</span>
                    <span className="hyp-root" dir="rtl">{hyp.root}</span>
                    <span className={`hyp-confidence ${
                      hyp.confidence >= 85 ? 'high' :
                      hyp.confidence >= 70 ? 'medium' : 'low'
                    }`}>
                      {hyp.confidence}%
                    </span>
                    {hyp.weakVerb && (
                      <span className="hyp-weak-badge" title={`Weak verb: ${hyp.weakVerb}`}>
                        {hyp.weakVerb}
                      </span>
                    )}
                  </div>
                  <div className="hyp-meaning-line">
                    <span className="hyp-definition">"{hyp.definition}"</span>
                    {hyp.source && (
                      <span className={`hyp-source tier-${hyp.tier || 'bronze'}`}>
                        {hyp.source}
                      </span>
                    )}
                  </div>
                  {hyp.hypothesis?.morphology && (
                    <div className="hyp-morph-line">
                      <span className="hyp-morph">{hyp.hypothesis.morphology}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* PRO SCHOLAR: Verb Breakdown - Simpler view for verbs without full derivation */}
      {showMorphology && translationData?.verbBreakdown && !translationData?.derivationChain && (
        <div className="wdc-verb-breakdown">
          <div className="verb-breakdown-header">
            <span className="verb-icon">📐</span>
            <span className="verb-title">Verb Analysis</span>
            {translationData.verbBreakdown.weakType && (
              <span className="verb-weak-badge" title={`Weak verb: ${translationData.verbBreakdown.weakType}`}>
                {translationData.verbBreakdown.weakType}
              </span>
            )}
          </div>
          <div className="verb-breakdown-grid">
            <div className="verb-row">
              <span className="verb-label">שורש</span>
              <span className="verb-value root" dir="rtl">{translationData.verbBreakdown.root}</span>
            </div>
            <div className="verb-row">
              <span className="verb-label">בניין</span>
              <span className="verb-value pattern">{translationData.verbBreakdown.pattern}</span>
              {translationData.verbBreakdown.patternMeaning && (
                <span className="verb-meaning">({translationData.verbBreakdown.patternMeaning})</span>
              )}
            </div>
            {translationData.verbBreakdown.conjugation && (
              <div className="verb-row">
                <span className="verb-label">גוף</span>
                <span className="verb-value conj">{translationData.verbBreakdown.conjugation}</span>
              </div>
            )}
            <div className="verb-row translation-row">
              <span className="verb-label">→</span>
              <span className="verb-value computed-translation">"{translationData.verbBreakdown.translation}"</span>
            </div>
          </div>
        </div>
      )}

      {/* PRO SCHOLAR: Transparency - Show how translation was derived */}
      {translationData?.lookupPath && (
        <div className="wdc-transparency">
          <span className="transparency-label">מקור:</span>
          <span className="transparency-path">{translationData.lookupPath}</span>
          {translationData.isLowConfidenceMatch && (
            <span className="transparency-warning" title="Low confidence match - headword doesn't exactly match query">⚠️</span>
          )}
        </div>
      )}

      {/* PRO SCHOLAR: Rejected Dictionary Result - Show alternatives considered */}
      {translationData?.rejectedDictionaryResult && (
        <div className="wdc-rejected-alternative">
          <details className="rejected-details">
            <summary className="rejected-summary">
              <span className="rejected-icon">ℹ️</span>
              <span className="rejected-text">Dictionary suggestion rejected</span>
            </summary>
            <div className="rejected-content">
              <div className="rejected-row">
                <span className="rejected-label">Suggested:</span>
                <span className="rejected-value" dir="rtl">{translationData.rejectedDictionaryResult.headword}</span>
                <span className="rejected-def">= "{translationData.rejectedDictionaryResult.definition}"</span>
              </div>
              <div className="rejected-row">
                <span className="rejected-label">Reason:</span>
                <span className="rejected-reason">{translationData.rejectedDictionaryResult.reason}</span>
              </div>
              <div className="rejected-row">
                <span className="rejected-label">Source:</span>
                <span className="rejected-source">{translationData.rejectedDictionaryResult.source}</span>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Loading - PRO SCHOLAR V5: Enhanced skeleton loading */}
      {isLoading && !translation && (
        <LoadingSkeleton type="word-card" />
      )}

      {/* PRO SCHOLAR V5: Error feedback for failed lookups */}
      {lookupError && !isLoading && (
        <div className="wdc-lookup-error" role="alert">
          <span className="wdc-error-icon" aria-hidden="true">⚠️</span>
          <span className="wdc-error-text">{lookupError}</span>
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

      {/* PRO SCHOLAR V6: Advanced linguistic analysis */}
      {translation && showMorphology && (
        <ProScholarPanel
          word={word}
          root={root}
          translationData={translationData}
          isAramaic={isAramaic}
          contextType={translationData?.contextType || 'unknown'}
          onWordClick={onWordLookup ? (clickedWord) => {
            if (clickedWord && clickedWord !== word) {
              onWordLookup(clickedWord, { source: 'pro-scholar-panel' });
            }
          } : undefined}
          compact={false}
          showTelemetry={process.env.NODE_ENV === 'development'}
        />
      )}

      {/* PRO SCHOLAR V6: Root Family Tree - expandable section for root exploration */}
      {root && showMorphology && (
        <details className="wdc-root-family-details">
          <summary className="wdc-root-family-summary">
            <span className="summary-icon">🌳</span>
            <span className="summary-text">Root Family</span>
            <span className="summary-root" dir="rtl">{root}</span>
          </summary>
          <RootFamilyTree
            root={root}
            language={effectiveIsAramaic ? 'Aramaic' : 'Hebrew'}
            highlightWord={word}
            onWordClick={(clickedWord) => {
              // PRO SCHOLAR V6: Trigger actual word lookup for root family member
              if (onWordLookup && clickedWord && clickedWord !== word) {
                onWordLookup(clickedWord, { source: 'root-family', root });
              }
            }}
            compact={true}
          />
        </details>
      )}

      {/* PRO SCHOLAR V20: Root Meaning Panel - Shows shoresh translation */}
      {root && showMorphology && (
        <details className="wdc-root-meaning-details">
          <summary className="wdc-root-meaning-summary">
            <span className="summary-icon">📖</span>
            <span className="summary-text">Root Meaning (שורש)</span>
          </summary>
          <RootMeaningPanel
            root={root}
            word={word}
            compact={true}
          />
        </details>
      )}

      {/* PRO SCHOLAR V6: Historical Layer Panel - Shows word's historical period */}
      {root && showMorphology && (
        <details className="wdc-historical-details">
          <summary className="wdc-historical-summary">
            <span className="summary-icon">📜</span>
            <span className="summary-text">Historical Layer</span>
          </summary>
          <HistoricalLayerPanel
            word={word}
            root={root}
            isAramaic={effectiveIsAramaic}
            compact={true}
          />
        </details>
      )}

      {/* PRO SCHOLAR V6: Cognate Languages Panel - Shows Semitic cognates */}
      {root && showMorphology && (
        <details className="wdc-cognate-details">
          <summary className="wdc-cognate-summary">
            <span className="summary-icon">🌍</span>
            <span className="summary-text">Semitic Cognates</span>
          </summary>
          <CognateLanguagesPanel
            root={root}
            word={word}
            compact={true}
          />
        </details>
      )}

      {/* PRO SCHOLAR V20: Text Attestations Panel - Shows where word appears */}
      {word && showMorphology && (
        <details className="wdc-attestations-details">
          <summary className="wdc-attestations-summary">
            <span className="summary-icon">📚</span>
            <span className="summary-text">Found in Texts</span>
          </summary>
          <TextAttestationsPanel
            word={word}
            compact={true}
          />
        </details>
      )}

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
  /** Error message from failed API lookup */
  lookupError: PropTypes.string,
  isAramaic: PropTypes.bool,
  isRashiScript: PropTypes.bool,
  showFrench: PropTypes.bool,
  isInVocabulary: PropTypes.bool,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  /** PRO SCHOLAR V6: Callback for looking up related words (root family clicks, etc.) */
  onWordLookup: PropTypes.func
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
