/**
 * PRO SCHOLAR V6: Advanced Linguistic Analysis Engine
 * =====================================================
 *
 * Building on V5's direct dictionary validation, V6 adds:
 *
 * 1. BINYAN CONFIDENCE SCORING - Scholarly verb pattern analysis
 * 2. ARAMAIC DIALECT DETECTION - Babylonian vs Palestinian markers
 * 3. CITATION PATTERN RECOGNITION - Rabbinic formula detection
 * 4. ROOT FAMILY EXPANSION - Related words from same shoresh
 * 5. SEMANTIC FIELD CLUSTERING - Conceptual groupings
 * 6. CONTEXTUAL CONFIDENCE BOOSTING - Use surrounding text
 * 7. CROSS-REFERENCE DETECTION - Scripture/Mishnah citations
 *
 * @module proScholarV6
 * @version 6.0.0
 */

import { createLogger } from '../../utils/debug';
import { stripVowels } from '../../utils/hebrewUtils';
import { ARAMAIC_PARTICLES } from './preClassificationService';
import { lookupJastrowSync, lookupBDBSync } from '../dictionaries/dictionaryLoader';

// eslint-disable-next-line no-unused-vars
const log = createLogger('ProScholarV6');

export const PRO_SCHOLAR_V6_VERSION = '6.0.0';

import { stripVowels } from '../../utils/hebrewUtils';
import { ARAMAIC_PARTICLES } from './preClassificationService';
import {
  BINYAN_ANALYSIS, analyzeBinyan
} from './linguistic/binyan';
import {
  DIALECT_MARKERS, detectAramaicDialect,
  CITATION_PATTERNS, detectCitationPatterns,
  ROOT_TRANSFORMATIONS, expandRootFamily,
  SEMANTIC_FIELDS, identifySemanticField,
  applyContextualBoost,
  BIBLICAL_BOOKS, detectCrossReferences
} from './linguistic/context';
import {
  HISTORICAL_LAYERS, HISTORICAL_EVOLUTION, LOANWORD_DATABASE, detectHistoricalLayer,
  GRAMMATICAL_ANOMALIES, checkGrammaticalAnomaly
} from './linguistic/historical';
import {
  COGNATE_LANGUAGES, ROOT_COGNATES, getCognates
} from './linguistic/cognates';

// Ré-exports : l'original exposait tous ces noms (consommateurs : unifiedLookupService,
// scholarlyApiService, composants scholar-mode)
export {
  BINYAN_ANALYSIS, analyzeBinyan,
  DIALECT_MARKERS, detectAramaicDialect,
  CITATION_PATTERNS, detectCitationPatterns,
  expandRootFamily,
  SEMANTIC_FIELDS, identifySemanticField,
  applyContextualBoost,
  BIBLICAL_BOOKS, detectCrossReferences,
  HISTORICAL_LAYERS, HISTORICAL_EVOLUTION, LOANWORD_DATABASE, detectHistoricalLayer,
  GRAMMATICAL_ANOMALIES, checkGrammaticalAnomaly,
  COGNATE_LANGUAGES, ROOT_COGNATES, getCognates
};

// Combine all V6 features into one comprehensive lookup
// =============================================================================

/**
 * PRO SCHOLAR V6: Enhanced word analysis
 * Combines all advanced features into comprehensive analysis
 *
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - { context, reference, textType, expandFamily }
 * @returns {Object} - Comprehensive analysis result
 */
export function analyzeWordV6(word, options = {}) {
  const {
    context = {},
    reference = null,
    textType = 'unknown',
    expandFamily = false,
    detectDialect = true
  } = options;

  const cleaned = stripVowels(word);
  const result = {
    word,
    cleanedWord: cleaned,
    version: 'ProScholarV6',
    timestamp: Date.now()
  };

  // 1. Check Aramaic particles first (instant lookup)
  const particle = ARAMAIC_PARTICLES[cleaned];
  if (particle) {
    result.type = 'aramaic_particle';
    result.english = particle.meaning;
    result.root = particle.root;
    result.source = 'Aramaic Particles';
    result.confidence = particle.confidence || 95;
    result.isInstantMatch = true;
  }

  // 2. Binyan analysis (for verbs)
  result.binyanAnalysis = analyzeBinyan(cleaned, {
    language: textType === 'talmudic' ? 'aramaic' : 'hebrew'
  });

  // 3. Aramaic dialect detection
  if (detectDialect && (textType === 'talmudic' || textType === 'aramaic')) {
    result.dialectAnalysis = detectAramaicDialect(cleaned);
  }

  // 4. Semantic field identification
  result.semanticField = identifySemanticField(cleaned);

  // 5. Root family expansion (if requested)
  if (expandFamily && cleaned.length >= 2 && cleaned.length <= 4) {
    result.rootFamily = expandRootFamily(cleaned);
  }

  // 6. Apply contextual boosting
  if (context.previousWord || context.nextWord || reference) {
    const boosted = applyContextualBoost(result, {
      ...context,
      reference,
      textType
    });
    result.confidence = boosted.confidence;
    result.boostReasons = boosted.boostReasons;
  }

  return result;
}

// =============================================================================
// 9. HISTORICAL LAYERS - Track word evolution through periods
// =============================================================================

/**
 * Historical period definitions for Hebrew/Aramaic vocabulary
 */

  return null;
}

// =============================================================================
// 12. ENHANCED analyzeWordV6 - Include new features
// =============================================================================

/**
 * PRO SCHOLAR V6.1: Enhanced word analysis with historical and cognate data
 * @param {string} word - Hebrew/Aramaic word
 * @param {Object} options - Analysis options
 * @returns {Object} - Comprehensive scholarly analysis
 */
export function analyzeWordV6Enhanced(word, options = {}) {
  // Get base V6 analysis
  const baseAnalysis = analyzeWordV6(word, options);

  // Add historical layer detection
  const historicalAnalysis = detectHistoricalLayer(word, {
    checkEvolution: options.includeHistory !== false
  });

  // Check for grammatical anomalies
  const anomaly = checkGrammaticalAnomaly(word);

  // Get cognate information (if root is known)
  const effectiveRoot = baseAnalysis.root || options.root;
  const cognateInfo = effectiveRoot ? getCognates(effectiveRoot) : null;

  return {
    ...baseAnalysis,
    version: '6.1.0',

    // Historical analysis
    historicalLayer: historicalAnalysis.primaryLayer,
    historicalEvolution: historicalAnalysis.evolution,
    loanwordOrigin: historicalAnalysis.loanwordOrigin,

    // Grammatical notes
    grammaticalAnomaly: anomaly,

    // Cognate languages
    cognates: cognateInfo,

    // Flag for enhanced analysis
    enhanced: true
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

const ProScholarV6 = {
  VERSION: '6.2.0', // PRO SCHOLAR V6.2 with expanded databases

  // Binyan analysis
  BINYAN_ANALYSIS,
  analyzeBinyan,

  // Dialect detection
  DIALECT_MARKERS,
  detectAramaicDialect,

  // Citation patterns
  CITATION_PATTERNS,
  detectCitationPatterns,

  // Root family
  expandRootFamily,

  // Semantic fields
  SEMANTIC_FIELDS,
  identifySemanticField,

  // Contextual analysis
  applyContextualBoost,

  // Cross-references
  BIBLICAL_BOOKS,
  detectCrossReferences,

  // ★ PRO SCHOLAR V6.1+: Scholarly features
  // Historical layers
  HISTORICAL_LAYERS,
  HISTORICAL_EVOLUTION,
  detectHistoricalLayer,

  // ★ PRO SCHOLAR V6.2: Loanword detection
  LOANWORD_DATABASE,

  // Grammatical anomalies (expanded V6.2)
  GRAMMATICAL_ANOMALIES,
  checkGrammaticalAnomaly,

  // Cognate languages (expanded V6.2)
  COGNATE_LANGUAGES,
  ROOT_COGNATES,
  getCognates,

  // Unified analysis
  analyzeWordV6,
  analyzeWordV6Enhanced  // V6.1+ enhanced version
};

export default ProScholarV6;

