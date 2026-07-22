/**
 * WordIntelligenceCard - PRO SCHOLAR v4
 *
 * A unified component that displays comprehensive Hebrew/Aramaic word analysis.
 * Sub-components have been extracted to WordIntelligenceCard/components/
 *
 * @module WordIntelligenceCard
 */

import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import './WordIntelligenceCard.css';

// FamilyTree component
import FamilyTree from './FamilyTree';

// PRO SCHOLAR v3 Features
import { LearningInsightsPanel, CrossRefsMini } from './ProScholarFeatures';
import ScholarlySourcePanel from './ScholarlySourcePanel';

// PRO SCHOLAR rich panels (surfaced for modal parity with WordDefinitionCard)
import CognateLanguagesPanel from './panels/CognateLanguagesPanel';
import HistoricalLayerPanel from './panels/HistoricalLayerPanel';
import TextAttestationsPanel from './panels/TextAttestationsPanel';
import RelatedRootsPanel from './panels/RelatedRootsPanel';
import CrossReferencesPanel from './panels/CrossReferencesPanel';

// Shared primitive
import DefinitionsList from './primitives/DefinitionsList';
import { FEATURES } from '../../services/featureFlags';

// Extracted sub-components
import {
  LookupPathDisplay,
  ConfidenceDisplay,
  SemanticFieldBadgeV6,
  DialectIndicatorV6,
  DomainBadge,
  MorphologySection,
  WeakVerbReconstruction,
  VerbGrammarSection,
  CantillationDisplay,
  ConstructChainDisplay,
  FrequencyBar,
  EtymologySection,
  AlternativeRootsSection,
  RelatedWordsSection,
  KnowledgeGraphMini,
  CrossReferencesSection,
  ManuscriptVariantsIndicator,
  AudioPronunciation,
  QuickExport,
  SRSSection
} from './WordIntelligenceCard/index';

// =============================================================================
// SERVICE IMPORTS
// =============================================================================

import {
  lookupWord,
  quickLookup
} from '../../services/unifiedLookupService';

import { getWordFrequency } from '../../services/wordFrequencyService';
import {
  getWordSemantics,
  getSynonyms,
  getAntonyms
} from '../../services/scholarly/semanticFieldService';

import { getCard } from '../../services/srsService';

import {
  ROOT_MEANINGS,
  getRootInfo,
  isPeNunVerb
} from '../../data/rootDatabase';

import {
  extractAramaicRoot,
  computeVerbTranslation
} from '../../constants/morphology';

import { analyzeVerbGrammar } from '../../utils/morphology/verbGrammar';
import { calculateConfidence } from '../../utils/morphology/confidence';
import { cleanDefinition } from '../../utils/definitionCleaner';
import { cleanHebrewWord } from '../../utils/hebrewUtils';

// =============================================================================
// HELPERS
// =============================================================================

const getCardId = (word) => `vocab-${cleanHebrewWord(word)}`;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function WordIntelligenceCard({
  word,
  onClose,
  onWordClick,
  showSRS = true,
  showEtymology = true,
  showRelated = true,
  showLookupPath = true,
  showCantillation = true,
  showConstruct = true,
  showVariants = true,
  showFamilyTree = true,
  verseRef = '',
  compact = false,
  className = ''
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const abortControllerRef = useRef(null);

  const cardClassName = useMemo(
    () => `word-intelligence-card ${compact ? 'compact' : ''} ${className}`.trim(),
    [compact, className]
  );

  // Fetch all word data
  useEffect(() => {
    if (!word) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cleanedWord = cleanHebrewWord(word);
        let lookupPath = '';
        let sourceCategory = 'dictionary';

        // STEP 1: Dictionary-First Lookup
        let lookupResult = null;
        try {
          lookupResult = await lookupWord(cleanedWord, {
            includeFrequency: true,
            includeGrammar: true,
            includeSemantics: true
          });
          lookupPath = lookupResult?.english ? 'dictionary-hit' : 'dictionary-miss';
        } catch (e) {
          lookupResult = quickLookup?.(cleanedWord);
          lookupPath = lookupResult ? 'cache-hit' : 'dictionary-miss';
          sourceCategory = lookupResult ? 'cache' : 'algorithm';
        }

        // STEP 2: Pattern Fallback
        let rootAnalysis = null;
        let computedTranslation = null;

        try {
          rootAnalysis = extractAramaicRoot?.(cleanedWord);
        } catch (e) {
          // Pattern analysis is optional
        }

        if (rootAnalysis?.root) {
          try {
            computedTranslation = computeVerbTranslation?.(rootAnalysis);
          } catch (e) {
            // Computed translation is optional
          }

          if (!lookupResult?.english && computedTranslation) {
            lookupPath += ' → pattern-analysis';
            sourceCategory = 'algorithm';
          }

          try {
            if (isPeNunVerb?.(rootAnalysis.root)) {
              rootAnalysis.weakType = 'Pe-Nun (פ״נ)';
              rootAnalysis.reconstructed = true;
            }
          } catch (e) {
            // isPeNunVerb check is optional
          }
        }

        // STEP 3: Verb Grammar Analysis
        let verbGrammar = null;
        try {
          verbGrammar = analyzeVerbGrammar?.(cleanedWord, lookupResult);
        } catch (e) {
          // Verb grammar is optional
        }

        // STEP 4: Calculate Confidence
        let confidence = null;
        try {
          confidence = calculateConfidence?.(lookupResult);
        } catch (e) {
          // Confidence is optional
        }

        // STEP 5: Get Additional Data
        const frequencyData = getWordFrequency?.(cleanedWord);
        const semanticsData = getWordSemantics?.(cleanedWord);
        const synonyms = getSynonyms?.(cleanedWord) || [];
        const antonyms = getAntonyms?.(cleanedWord) || [];

        const rootKey = rootAnalysis?.root || lookupResult?.root || semanticsData?.root;
        let rootData = null;
        if (rootKey) {
          try {
            rootData = getRootInfo?.(rootKey) || ROOT_MEANINGS[rootKey];
          } catch (e) {
            rootData = ROOT_MEANINGS[rootKey];
          }
        }

        // Build Definitions Array
        const definitions = [];

        if (lookupResult?.sources) {
          lookupResult.sources.forEach(src => {
            if (src.definition) {
              const cleaned = cleanDefinition?.(src.definition, {
                maxLength: 200,
                removeReferences: true,
                removeHebrew: true
              }) || src.definition;

              if (cleaned) {
                definitions.push({
                  definition: cleaned,
                  source: src.name || 'Dictionary',
                  year: src.year,
                  isAcademic: src.isAcademic
                });
              }
            }
          });
        }

        if (lookupResult?.english && definitions.length === 0) {
          definitions.push({
            definition: lookupResult.english,
            source: lookupResult.source || 'Dictionary'
          });
        }

        if (computedTranslation && definitions.length === 0) {
          definitions.push({
            definition: computedTranslation,
            source: 'Pattern Analysis',
            isComputed: true
          });
        }

        // Deduplicate definitions
        const seenDefs = new Set();
        const uniqueDefs = definitions.filter(d => {
          const key = d.definition.toLowerCase().slice(0, 40);
          if (seenDefs.has(key)) return false;
          seenDefs.add(key);
          return true;
        });

        // Set Final Data
        setData({
          word: cleanedWord,
          definitions: uniqueDefs,
          frequency: frequencyData,
          semantics: semanticsData,
          rootAnalysis,
          rootData,
          verbGrammar,
          computedTranslation,
          confidence,
          synonyms,
          antonyms,
          lookupPath,
          sourceCategory,
          primaryDefinition: uniqueDefs[0]?.definition || computedTranslation,
          root: rootKey,
          domain: semanticsData?.primaryDomain,
          language: lookupResult?.language || (rootAnalysis ? 'Aramaic' : 'Hebrew')
        });

      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error('[WordIntelligenceCard] Error:', err);
        setError('Failed to load word data');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [word]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!word) return null;

  if (isLoading) {
    return (
      <div className={`word-intelligence-card loading ${className}`}>
        <div className="wic-loading">
          <div className="wic-spinner" />
          <span>Analyzing {word}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`word-intelligence-card error ${className}`}>
        <div className="wic-error">
          <span className="error-icon">!</span>
          <span className="error-text">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    definitions,
    frequency,
    rootAnalysis,
    rootData,
    verbGrammar,
    computedTranslation,
    confidence,
    synonyms,
    antonyms,
    lookupPath,
    sourceCategory,
    primaryDefinition,
    root,
    domain,
    language
  } = data;

  return (
    <div className={cardClassName}>
      {/* HEADER */}
      <div className="wic-header">
        <div className="wic-word-section">
          <span className="wic-word" dir="rtl">{word}</span>
          <div className="wic-meta">
            {root && <span className="wic-root" dir="rtl">שׁוֹרֶשׁ: {root}</span>}
            {language && (
              <span className={`wic-lang ${language.toLowerCase()}`}>
                {language}
              </span>
            )}
          </div>
        </div>
        <div className="wic-header-right">
          <ConfidenceDisplay confidence={confidence} showFactors />
          {onClose && (
            <button className="wic-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
      </div>

      {/* LOOKUP PATH */}
      {showLookupPath && lookupPath && (
        <LookupPathDisplay lookupPath={lookupPath} sourceCategory={sourceCategory} />
      )}

      {/* V6 BADGES ROW */}
      <div className="wic-v6-badges-row">
        <SemanticFieldBadgeV6 root={root} />
        <DialectIndicatorV6 word={word} />
      </div>

      {/* DOMAIN BADGE (Legacy) */}
      {domain && !root && (
        <div className="wic-domain-row">
          <DomainBadge domain={domain} />
        </div>
      )}

      {/* DEFINITIONS */}
      <DefinitionsList definitions={definitions} showToggle />

      {/* SCHOLARLY SOURCE PANEL */}
      {!compact && definitions.length > 1 && (
        <ScholarlySourcePanel
          word={word}
          allSources={definitions.map(d => ({
            name: d.source || d.name || 'Unknown',
            definition: d.text || d.definition,
            tier: d.tier || d.reliability,
            language: d.language,
            sourceType: d.sourceType
          }))}
          primary={definitions[0] ? {
            name: definitions[0].source || definitions[0].name,
            definition: definitions[0].text || definitions[0].definition,
            tier: definitions[0].tier || definitions[0].reliability
          } : null}
          alternatives={definitions.slice(1).map(d => ({
            name: d.source || d.name || 'Unknown',
            definition: d.text || d.definition,
            tier: d.tier || d.reliability
          }))}
          showConsensus={definitions.length >= 2}
        />
      )}

      {/* MORPHOLOGY */}
      {rootAnalysis && (
        <MorphologySection
          word={word}
          rootAnalysis={rootAnalysis}
          computedTranslation={computedTranslation}
        />
      )}

      {/* WEAK VERB */}
      {rootAnalysis?.weakType && (
        <WeakVerbReconstruction rootAnalysis={rootAnalysis} />
      )}

      {/* VERB GRAMMAR */}
      {(verbGrammar || rootAnalysis?.pattern) && (
        <VerbGrammarSection grammar={verbGrammar} rootAnalysis={rootAnalysis} />
      )}

      {/* CANTILLATION */}
      {showCantillation && FEATURES.CANTILLATION && !compact && (
        <CantillationDisplay word={word} />
      )}

      {/* CONSTRUCT CHAIN */}
      {showConstruct && !compact && (
        <ConstructChainDisplay word={word} onWordClick={onWordClick} />
      )}

      {/* FREQUENCY */}
      {!compact && <FrequencyBar frequency={frequency} />}

      {/* ETYMOLOGY */}
      {showEtymology && !compact && (
        <EtymologySection rootData={rootData} root={root} />
      )}

      {/* ALTERNATIVE ROOTS */}
      {showEtymology && !compact && (
        <AlternativeRootsSection word={word} onRootClick={onWordClick} />
      )}

      {/* FAMILY TREE */}
      {showFamilyTree && FEATURES.FAMILY_TREE && !compact && root && (
        <FamilyTree
          root={root}
          language={language}
          onFormClick={onWordClick}
          compact={false}
        />
      )}

      {/* RELATED WORDS */}
      {showRelated && !compact && (
        <RelatedWordsSection
          semantics={{ synonyms, antonyms }}
          onWordClick={onWordClick}
        />
      )}

      {/* KNOWLEDGE GRAPH */}
      {!compact && (synonyms?.length > 0 || antonyms?.length > 0) && (
        <KnowledgeGraphMini
          word={word}
          root={root}
          synonyms={synonyms}
          antonyms={antonyms}
          onShowFullGraph={onWordClick}
        />
      )}

      {/* CROSS-REFERENCES */}
      {!compact && (
        <CrossReferencesSection
          word={word}
          root={root}
          onReferenceClick={onWordClick}
        />
      )}

      {/* MANUSCRIPT VARIANTS */}
      {showVariants && !compact && verseRef && (
        <ManuscriptVariantsIndicator verseRef={verseRef} />
      )}

      {/* CROSS-REFS MINI */}
      {!compact && root && (
        <CrossRefsMini
          crossRefs={{
            sameRoot: data?.relatedForms?.slice(0, 3) || [],
            semanticField: data?.semanticField?.related?.slice(0, 2) || [],
            relatedConcepts: []
          }}
          onSelect={onWordClick}
        />
      )}

      {/* PRO SCHOLAR: Cognate languages (Akkadian, Arabic, Aramaic, Phoenician, ...) */}
      {!compact && (root || word) && (
        <CognateLanguagesPanel root={root} word={word} compact />
      )}

      {/* PRO SCHOLAR: Historical usage layer (Biblical → Mishnaic → Medieval → Modern) */}
      {!compact && (root || word) && (
        <HistoricalLayerPanel root={root} word={word} compact />
      )}

      {/* PRO SCHOLAR V20: Text attestations — where word appears in corpus */}
      {!compact && word && (
        <TextAttestationsPanel word={word} compact />
      )}

      {/* PRO SCHOLAR V13: Related roots (semantic / phonetic / scholarly) */}
      {!compact && (root || word) && (
        <RelatedRootsPanel root={root} word={word} compact />
      )}

      {/* PRO SCHOLAR V14: Cross-references parsed from BDB/Jastrow/Klein/Gesenius/Strong's */}
      {!compact && definitions.length > 0 && (() => {
        const dictionaryData = {};
        for (const d of definitions) {
          const key = (d.source || d.name || '').toLowerCase().replace(/[^a-z]/g, '');
          const definition = d.text || d.definition;
          if (key && definition) dictionaryData[key] = { definition };
        }
        if (Object.keys(dictionaryData).length === 0) return null;
        return <CrossReferencesPanel dictionaryData={dictionaryData} compact />;
      })()}

      {/* LEARNING INSIGHTS */}
      {!compact && (
        <LearningInsightsPanel
          difficulty={data?.difficulty}
          studyTime={data?.studyTime}
          srsCard={getCard?.(getCardId(word))}
        />
      )}

      {/* SRS */}
      {showSRS && (
        <SRSSection
          word={word}
          definition={primaryDefinition}
          root={root}
        />
      )}

      {/* FOOTER */}
      <div className="wic-footer">
        <div className="wic-actions">
          <AudioPronunciation word={word} />

          {onWordClick && root && (
            <button
              className="wic-action"
              onClick={() => onWordClick(root)}
              title="Find all forms of this root"
            >
              <span className="action-icon">🔍</span>
              <span className="action-text">Root forms</span>
            </button>
          )}

          <QuickExport data={data} />
        </div>
        <div className="wic-source-info">
          <span className="source-count">
            {definitions.length} source{definitions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(WordIntelligenceCard);
