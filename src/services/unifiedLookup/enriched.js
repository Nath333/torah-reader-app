// Extrait de unifiedLookupService.js (recette docs/DECOUPE-MONOLITHES.md).
// Étage ENRICHED : lookups V3/finaux (enrichissement complet, parallèle,
// comparaison de sources). Cycle paresseux vers la façade (appels runtime).
import {
  lookupWord,
  quickLookup,
  getSemanticField,
  enrichWithSemantics,
  getRootFamilyExpansion,
  getMorphology,
  lookupAllLocalDictionaries,
  getFrenchTranslation,
  warmCache,
  isCached,
  analyzeDialectalPeriod,
  getHapaxInfo,
  isLikelyHapax
} from '../unifiedLookupService';
// Dépendances directes (mêmes sources que la façade — évite d'alourdir le cycle)
import { rankDefinitions, detectContextType, detectDomain } from '../contextualDefinitionService';
import { generateSourceComparison, getSourceTier } from '../scholarSourceAggregator';
import { getRootFamily as _getRootFamily } from '../analysis/rootExtraction';
import {
  getWordRelationships as _getWordRelationships,
  findSemanticFields,
  WORD_RELATIONSHIPS_DB
} from '../scholarly/wordRelationshipService';
import { cleanHebrewWord } from '../dictionaries/hebrewDictionary';
import { isLikelyAramaic } from '../dictionaries/babylonianDictionary';
import { getComprehensiveEtymology } from '../dictionaries/etymologyEnrichmentService';
import {
  generateAcademicCitations,
  generateAllCitations,
  getCrossReferences,
  getComparativeSemiticData,
  getHistoricalUsageTimeline
} from './databases';
import { generateScholarlyUncertainty } from './export';
import { calculateConfidence } from './scoring';

export const lookupFullyEnrichedV3 = async (word, options = {}) => {
  const { contextMode = null, reference = null, surroundingText = '', userLevel = 'scholar', includeOnline = false, includeContextRanking = true, includeRelationships = true, includeMorphology = true, includeRootFamily = true, includeCitations = true, includeSemantics = true, includeUncertainty = true, includeDialectalAnalysis = true, includeHapaxInfo = true, includeComparativeSemitic = true, includeHistoricalTimeline = true, includeCrossReferences = true, includeEtymology = true, citationFormat = 'SBL' } = options;
  const result = await lookupFullyEnriched(word, { contextMode, reference, surroundingText, userLevel, includeOnline, includeContextRanking, includeRelationships, includeMorphology, includeRootFamily, includeCitations, includeSemantics, includeUncertainty });
  if (includeDialectalAnalysis) result.dialectalAnalysis = analyzeDialectalPeriod(word, result);
  if (includeHapaxInfo) { const hapax = getHapaxInfo(word); if (hapax) { result.hapaxInfo = hapax; result.isHapax = true; } else if (isLikelyHapax(result)) { result.hapaxInfo = { isHapax: true, word: result.cleanedWord, scholarlyNote: 'Likely hapax based on dictionary descriptions' }; result.isHapax = true; } }
  if (includeComparativeSemitic) { const cognates = getComparativeSemiticData(word); if (cognates) { result.comparativeSemitic = cognates; result.hasComparativeData = true; } }
  // PRO SCHOLAR V12: Comprehensive etymology from ALL scholarly databases (78,000+ entries)
  // Sources: Sefaria (2,493), Root Pro (18,898), BDB (2,591), Jastrow (16,794), Wiktionary (168+)
  if (includeEtymology) {
    const etymology = await getComprehensiveEtymology(word);
    if (etymology) {
      result.etymology = {
        protoSemitic: etymology.protoSemitic,
        cognates: etymology.cognates,
        relatedRoots: etymology.relatedRoots,
        references: etymology.references,
        confidence: etymology.confidence,
        root: etymology.root,
        dialects: etymology.dialects,
        crossReferences: etymology.crossReferences,
        loanwords: etymology.loanwords,
        qualityScore: etymology.qualityScore,
        qualityLevel: etymology.qualityLevel,
        sources: etymology.sources,
        // PRO SCHOLAR V12: Additional data from comprehensive lookup
        sefariaData: etymology.sefariaData,
        rootProData: etymology.rootProData,
        bdbEtymology: etymology.bdbEtymology,
        jastrowEtymology: etymology.jastrowEtymology,
        wiktionaryData: etymology.wiktionaryData,
        sourceCount: etymology.sources?.length || 0
      };
      result.hasEtymology = true;
      result.etymologySourceCount = etymology.sources?.length || 0;
    }
  }
  if (includeHistoricalTimeline) { const timeline = getHistoricalUsageTimeline(word); if (timeline) { result.historicalTimeline = timeline; result.hasSemanticEvolution = true; } }
  if (includeCrossReferences) { const crossRefs = getCrossReferences(word); if (crossRefs) { result.crossReferences = crossRefs; result.hasCrossReferences = true; } }
  if (includeCitations && citationFormat === 'SBL') result.academicCitations = generateAcademicCitations(result.sources || [], 'SBL');
  result.isFullyEnriched = true;
  result.enrichmentLevel = 'pro_scholar_v12';
  result.enrichmentFeatures = { dialectalAnalysis: !!result.dialectalAnalysis, hapaxInfo: !!result.hapaxInfo, comparativeSemitic: !!result.comparativeSemitic, etymology: !!result.etymology, historicalTimeline: !!result.historicalTimeline, crossReferences: !!result.crossReferences };
  return result;
};

// =============================================================================
// CONTEXTUAL DEFINITION RANKING
// =============================================================================

/**
 * Rank definitions from multiple sources by contextual relevance
 * Uses scholarly context to determine which definition is most appropriate
 *
 * @param {Array} sources - Array of source objects with definitions
 * @param {Object} context - Context for ranking
 * @param {string} context.reference - Book/chapter reference (e.g., "Genesis 1:1")
 * @param {string} context.surroundingText - Text around the word
 * @param {string} context.userLevel - 'beginner', 'intermediate', 'advanced', 'scholar'
 * @returns {Array} Sources ranked by contextual relevance
 */
export const rankDefinitionsByContext = (sources, context = {}) => {
  if (!sources || sources.length === 0) return [];

  const {
    reference = '',
    surroundingText = '',
    userLevel = 'intermediate',
    preferredSources = []
  } = context;

  // Convert sources to definition format for ranking
  const definitions = sources.map(src => ({
    source: src.name,
    text: src.definition || src.fullDefinition,
    headword: src.headword,
    tier: src.tier,
    examples: src.examples,
    original: src
  }));

  // Rank using contextualDefinitionService
  const ranked = rankDefinitions(definitions, {
    reference,
    surroundingText,
    userLevel,
    preferredSources
  });

  // Map back to source format with rankings
  return ranked.map(r => ({
    ...r.original,
    contextScore: r.score,
    contextRank: r.rank,
    isBestForContext: r.isBest,
    contextConfidence: r.confidence,
    scoreBreakdown: r.breakdown
  }));
};

/**
 * Get the best definition for a word based on context
 * Combines scholarly tier with contextual relevance
 *
 * @param {string} word - Word to look up
 * @param {Object} context - Context for selection
 * @returns {Object} Result with context-ranked definitions
 */
export const lookupWithContextRanking = (word, context = {}) => {
  const result = quickLookup(word, context);

  if (!result.sources || result.sources.length === 0) {
    return result;
  }

  // Rank definitions by context
  const rankedSources = rankDefinitionsByContext(result.sources, context);

  // Get the best definition considering both tier and context
  const bestSource = rankedSources[0];

  return {
    ...result,
    sources: rankedSources,
    contextBestDefinition: bestSource?.definition || result.english,
    contextBestSource: bestSource?.name || result.source,
    hasContextRanking: true,
    contextType: detectContextType(context.reference || ''),
    detectedDomains: detectDomain(context.surroundingText || '')
  };
};

// =============================================================================
// WORD RELATIONSHIP INTEGRATION
// =============================================================================

/**
 * Get comprehensive word relationships
 * Includes synonyms, antonyms, biblical pairs, root family, and cognates
 *
 * @param {string} word - Hebrew word to analyze
 * @param {Object} options - Options
 * @param {boolean} options.includeRootFamily - Include root family (default: true)
 * @param {boolean} options.includeCognates - Include Aramaic cognates (default: true)
 * @param {boolean} options.includeBiblicalPairs - Include biblical pairs (default: true)
 * @returns {Object} Word relationship data
 */
export const getWordRelationships = (word, options = {}) => {
  const {
    includeRootFamily = true,
    includeCognates = true,
    includeBiblicalPairs = true
  } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned) return null;

  // Get relationships from wordRelationshipService
  const relationships = _getWordRelationships(cleaned);

  // Build comprehensive result
  const result = {
    word: cleaned,
    synonyms: relationships.synonyms || [],
    antonyms: relationships.antonyms || [],
    collocations: relationships.collocations || [],
    semanticFields: findSemanticFields(cleaned) || []
  };

  if (includeRootFamily) {
    const rootFamily = _getRootFamily(cleaned);
    if (rootFamily) {
      result.rootFamily = rootFamily;
      result.hasRootFamily = true;
    }
  }

  if (includeCognates) {
    const cognate = WORD_RELATIONSHIPS_DB.aramaicCognates[cleaned];
    if (cognate) {
      result.aramaicCognate = cognate;
    }
  }

  if (includeBiblicalPairs) {
    const biblicalPairs = WORD_RELATIONSHIPS_DB.biblicalPairs[cleaned];
    if (biblicalPairs) {
      result.biblicalPairs = biblicalPairs;
    }
  }

  // Calculate relationship richness score
  result.relationshipCount =
    (result.synonyms?.length || 0) +
    (result.antonyms?.length || 0) +
    (result.collocations?.length || 0) +
    (result.rootFamily?.words?.length || 0) +
    (result.biblicalPairs?.length || 0) +
    (result.aramaicCognate ? 1 : 0);

  return result;
};

/**
 * Lookup with full word relationship data
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup + relationship options
 * @returns {Object} Result with relationships
 */
export const lookupWithRelationships = (word, options = {}) => {
  const {
    includeRootFamily = true,
    includeCognates = true,
    includeBiblicalPairs = true,
    ...lookupOptions
  } = options;

  const result = quickLookup(word, lookupOptions);

  // Add relationship data
  const relationships = getWordRelationships(word, {
    includeRootFamily,
    includeCognates,
    includeBiblicalPairs
  });

  if (relationships) {
    result.relationships = relationships;
    result.hasRelationships = relationships.relationshipCount > 0;
  }

  return result;
};

// =============================================================================
// SCHOLARLY UNCERTAINTY MARKERS
// =============================================================================

/**
 * Scholarly uncertainty levels
 */
export const lookupFullyEnriched = async (word, options = {}) => {
  const {
    // Lookup options
    contextMode = null,
    reference = null,
    surroundingText = '',
    userLevel = 'intermediate',
    includeOnline = false,
    // Enrichment toggles
    includeContextRanking = true,
    includeRelationships = true,
    includeMorphology = true,
    includeRootFamily = true,
    includeCitations = true,
    includeSemantics = true,
    includeUncertainty = true
  } = options;

  // Get base enriched result
  const result = await lookupWordEnriched(word, {
    contextMode,
    reference,
    includeOnline,
    includeMorphology,
    includeRootFamily,
    includeCitations
  });

  // Add contextual ranking
  if (includeContextRanking && result.sources?.length > 0) {
    const rankedSources = rankDefinitionsByContext(result.sources, {
      reference,
      surroundingText,
      userLevel
    });
    result.sources = rankedSources;
    result.contextType = detectContextType(reference || '');
    result.detectedDomains = detectDomain(surroundingText);
  }

  // Add word relationships
  if (includeRelationships) {
    result.relationships = getWordRelationships(word, {
      includeRootFamily: true,
      includeCognates: true,
      includeBiblicalPairs: true
    });
  }

  // Add semantic field data
  if (includeSemantics) {
    const semantics = getSemanticField(word, {
      includeSynonyms: true,
      includeAntonyms: true,
      includeRelated: true,
      relatedLimit: 10
    });
    if (semantics) {
      result.semantics = semantics;
    }
  }

  // Add scholarly uncertainty markers
  if (includeUncertainty) {
    result.uncertainty = generateScholarlyUncertainty(result);
  }

  // Mark as fully enriched
  result.isFullyEnriched = true;
  result.enrichmentLevel = 'full';

  return result;
};

// =============================================================================
// ENHANCED LOOKUP WITH ALL FEATURES
// =============================================================================

/**
 * Full lookup with all enrichments
 * Includes confidence scoring, citations, morphology, and root family
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Promise<Object>} Fully enriched lookup result
 */
export const lookupWordEnriched = async (word, options = {}) => {
  const {
    includeMorphology = true,
    includeRootFamily = false,
    includeCitations = true,
    ...lookupOptions
  } = options;

  // Get base lookup result
  const result = await lookupWord(word, lookupOptions);

  // Add confidence scoring if not already present
  if (!result.confidence) {
    result.confidence = calculateConfidence(result);
  }

  // Add citations if requested and not already present
  if (includeCitations && !result.citations) {
    result.citations = generateAllCitations(result.sources || []);
  }

  // Add morphological analysis if requested
  if (includeMorphology) {
    result.morphology = getMorphology(word);
  }

  // Add root family if requested
  if (includeRootFamily) {
    result.rootFamily = await getRootFamilyExpansion(word, {
      contextMode: lookupOptions.contextMode,
      maxRelated: 5
    });
  }

  return result;
};

// =============================================================================
// COMPATIBILITY LAYER: Aliases for combinedTranslationService migration
// =============================================================================

/**
 * Parallel lookup across all local dictionaries
 * API-compatible replacement for combinedTranslationService.lookupParallel
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Lookup options
 * @returns {Object} Aggregated result with all sources + consensus
 */
export const lookupParallel = (word, options = {}) => {
  const { contextMode = null } = options;

  const cleaned = cleanHebrewWord(word);
  if (!cleaned || cleaned.length < 2) {
    return {
      word,
      cleanedWord: cleaned,
      allSources: [],
      primary: null,
      alternatives: [],
      consensus: null,
      sourceCount: 0,
      error: 'Word too short'
    };
  }

  // Use the unified local dictionary lookup
  const aggregated = lookupAllLocalDictionaries(cleaned, contextMode);
  const isAramaicWord = isLikelyAramaic(cleaned);

  return {
    word,
    cleanedWord: cleaned,
    isAramaic: isAramaicWord,
    language: isAramaicWord ? 'Aramaic' : 'Hebrew',
    allSources: aggregated.allSources || [],
    primary: aggregated.primary,
    english: aggregated.primary?.definition || null,
    source: aggregated.primary?.name || 'none',
    alternatives: aggregated.alternatives || [],
    consensus: aggregated.consensus,
    hasAcademicSource: aggregated.allSources?.some(s =>
      getSourceTier(s.name).level <= 2
    ) || false,
    hasTier1Source: aggregated.allSources?.some(s =>
      getSourceTier(s.name).level === 1
    ) || false,
    sourceCount: aggregated.allSources?.length || 0,
    offline: true
  };
};

/**
 * Get scholarly comparison between sources for a word
 * API-compatible replacement for combinedTranslationService.getSourceComparison
 *
 * @param {string} word - Word to compare
 * @returns {Object} Detailed source comparison
 */
export const getSourceComparison = (word) => {
  const result = lookupParallel(word);

  if (result.sourceCount < 2) {
    return {
      word,
      hasComparison: false,
      reason: result.sourceCount === 1 ? 'Single source only' : 'No sources found'
    };
  }

  return generateSourceComparison(result.allSources);
};
