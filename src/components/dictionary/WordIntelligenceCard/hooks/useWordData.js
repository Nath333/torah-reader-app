/**
 * useWordData Hook
 * Handles all data fetching logic for word analysis
 *
 * Extracts and centralizes the dictionary lookup, pattern analysis,
 * morphology, semantics, and related data fetching.
 */

import { useState, useEffect, useRef } from 'react';

// =============================================================================
// SAFE IMPORTS - All services are optional
// =============================================================================

// Word lookup services
let lookupWord, quickLookup;
try {
  const orchestrator = require('../../../../services/wordLookupOrchestrator');
  lookupWord = orchestrator.lookupWord;
  quickLookup = orchestrator.quickLookup;
} catch (e) {
  lookupWord = async () => null;
  quickLookup = () => null;
}

// Frequency service
let getWordFrequency;
try {
  getWordFrequency = require('../../../../services/wordFrequencyService').getWordFrequency;
} catch (e) {
  getWordFrequency = () => null;
}

// Semantic field service
let getWordSemantics, getSynonyms, getAntonyms;
try {
  const semanticService = require('../../../../services/semanticFieldService');
  getWordSemantics = semanticService.getWordSemantics;
  getSynonyms = semanticService.getSynonyms;
  getAntonyms = semanticService.getAntonyms;
} catch (e) {
  getWordSemantics = () => null;
  getSynonyms = () => [];
  getAntonyms = () => [];
}

// Root database
let ROOT_MEANINGS, getRootInfo, isPeNunVerb;
try {
  const rootDb = require('../../../../data/rootDatabase');
  ROOT_MEANINGS = rootDb.ROOT_MEANINGS || {};
  getRootInfo = rootDb.getRootInfo || ((r) => ROOT_MEANINGS[r]);
  isPeNunVerb = rootDb.isPeNunVerb || (() => false);
} catch (e) {
  ROOT_MEANINGS = {};
  getRootInfo = () => null;
  isPeNunVerb = () => false;
}

// Morphology functions
let extractAramaicRoot, computeVerbTranslation;
try {
  const morphology = require('../../../../constants/morphology');
  extractAramaicRoot = morphology.extractAramaicRoot;
  computeVerbTranslation = morphology.computeVerbTranslation;
} catch (e) {
  extractAramaicRoot = () => null;
  computeVerbTranslation = () => null;
}

// Verb grammar analysis
let analyzeVerbGrammar;
try {
  analyzeVerbGrammar = require('../../../../utils/morphology/verbGrammar').analyzeVerbGrammar;
} catch (e) {
  analyzeVerbGrammar = () => null;
}

// Confidence calculation
let calculateConfidence;
try {
  calculateConfidence = require('../../../../utils/morphology/confidence').calculateConfidence;
} catch (e) {
  calculateConfidence = () => null;
}

// Utilities
let cleanDefinition;
try {
  cleanDefinition = require('../../../../utils/definitionCleaner').cleanDefinition;
} catch (e) {
  cleanDefinition = (d) => d;
}

let cleanHebrewWord;
try {
  cleanHebrewWord = require('../../../../utils/hebrewUtils').cleanHebrewWord;
} catch (e) {
  cleanHebrewWord = (w) => w;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for fetching and managing word data
 * @param {string} word - Hebrew/Aramaic word to analyze
 * @returns {Object} { isLoading, error, data }
 */
export function useWordData(word) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // AbortController ref for cleanup
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!word) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const cleanedWord = cleanHebrewWord(word);
        let lookupPath = '';
        let sourceCategory = 'dictionary';

        // ─────────────────────────────────────────────────────────────────────
        // STEP 1: Dictionary-First Lookup
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // STEP 2: Pattern Fallback
        // ─────────────────────────────────────────────────────────────────────
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

          // Check for Pe-Nun weak verb
          try {
            if (isPeNunVerb?.(rootAnalysis.root)) {
              rootAnalysis.weakType = 'Pe-Nun (פ״נ)';
              rootAnalysis.reconstructed = true;
            }
          } catch (e) {
            // isPeNunVerb check is optional
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 3: Verb Grammar Analysis
        // ─────────────────────────────────────────────────────────────────────
        let verbGrammar = null;
        try {
          verbGrammar = analyzeVerbGrammar?.(cleanedWord, lookupResult);
        } catch (e) {
          // Verb grammar is optional
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 4: Calculate Confidence
        // ─────────────────────────────────────────────────────────────────────
        let confidence = null;
        try {
          confidence = calculateConfidence?.(lookupResult);
        } catch (e) {
          // Confidence is optional
        }

        // ─────────────────────────────────────────────────────────────────────
        // STEP 5: Get Additional Data
        // ─────────────────────────────────────────────────────────────────────
        const frequencyData = getWordFrequency?.(cleanedWord);
        const semanticsData = getWordSemantics?.(cleanedWord);
        const synonyms = getSynonyms?.(cleanedWord) || [];
        const antonyms = getAntonyms?.(cleanedWord) || [];

        // Get root data from ROOT_MEANINGS
        const rootKey = rootAnalysis?.root || lookupResult?.root || semanticsData?.root;
        let rootData = null;
        if (rootKey) {
          try {
            rootData = getRootInfo?.(rootKey) || ROOT_MEANINGS[rootKey];
          } catch (e) {
            rootData = ROOT_MEANINGS[rootKey];
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Build Definitions Array
        // ─────────────────────────────────────────────────────────────────────
        const definitions = [];

        // Add definitions from lookup sources
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

        // Add primary definition if no sources
        if (lookupResult?.english && definitions.length === 0) {
          definitions.push({
            definition: lookupResult.english,
            source: lookupResult.source || 'Dictionary'
          });
        }

        // Add computed translation if no dictionary hit
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

        // ─────────────────────────────────────────────────────────────────────
        // Set Final Data
        // ─────────────────────────────────────────────────────────────────────
        if (!abortController.signal.aborted) {
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
        }

      } catch (err) {
        // Don't set error if request was aborted
        if (abortController.signal.aborted) return;
        console.error('[useWordData] Error:', err);
        setError('Failed to load word data');
      } finally {
        // Only update loading state if not aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup: abort request on unmount or word change
    return () => {
      abortController.abort();
    };
  }, [word]);

  return { isLoading, error, data };
}

export default useWordData;
