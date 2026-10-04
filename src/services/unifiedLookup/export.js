// =============================================================================
// EXPORTS SCIENTIFIQUES
// Niveaux d'incertitude + exports JSON-LD / Markdown / Flashcard.
// Fonctions pures opérant sur les résultats de lookup.
// =============================================================================

import { getSourceTier } from '../scholarSourceAggregator';
export const UNCERTAINTY_LEVELS = {
  CERTAIN: {
    level: 'certain',
    label: 'Scholarly Certainty',
    icon: '●',
    description: 'All sources agree on core meaning'
  },
  PROBABLE: {
    level: 'probable',
    label: 'Highly Probable',
    icon: '◐',
    description: 'Most sources agree, minor variations'
  },
  DISPUTED: {
    level: 'disputed',
    label: 'Scholarly Dispute',
    icon: '◑',
    description: 'Sources present different interpretations'
  },
  UNCERTAIN: {
    level: 'uncertain',
    label: 'Uncertain Etymology',
    icon: '○',
    description: 'Limited evidence, possible meanings'
  },
  HAPAX: {
    level: 'hapax',
    label: 'Hapax Legomenon',
    icon: '◇',
    description: 'Word appears only once in corpus'
  }
};

/**
 * Generate scholarly uncertainty markers for a lookup result
 * Analyzes source agreement and flags areas of scholarly debate
 *
 * @param {Object} result - Lookup result with sources
 * @returns {Object} Uncertainty analysis
 */
export const generateScholarlyUncertainty = (result) => {
  if (!result || !result.sources || result.sources.length === 0) {
    return {
      level: UNCERTAINTY_LEVELS.UNCERTAIN,
      markers: [{
        type: 'no_sources',
        message: 'No dictionary sources found for this word',
        severity: 'warning'
      }],
      confidence: 0
    };
  }

  const markers = [];
  let uncertaintyLevel = UNCERTAINTY_LEVELS.CERTAIN;

  // Check for divergent opinions in consensus
  if (result.consensus?.divergentOpinions?.length > 0) {
    markers.push({
      type: 'divergent_opinions',
      message: `${result.consensus.divergentOpinions.length} alternative interpretation(s) exist`,
      alternatives: result.consensus.divergentOpinions.map(d => ({
        definition: d.definition,
        sources: d.sources
      })),
      severity: 'info'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.DISPUTED;
  }

  // Check for tier mismatch (tier 1 disagrees with tier 2/3)
  const tier1Sources = result.sources.filter(s => getSourceTier(s.name).level === 1);
  const tier2Sources = result.sources.filter(s => getSourceTier(s.name).level === 2);

  if (tier1Sources.length > 0 && tier2Sources.length > 0) {
    const tier1Defs = tier1Sources.map(s => s.definition?.toLowerCase().substring(0, 30));
    const tier2Defs = tier2Sources.map(s => s.definition?.toLowerCase().substring(0, 30));

    const hasOverlap = tier1Defs.some(d1 =>
      tier2Defs.some(d2 => d1 && d2 && (d1.includes(d2.substring(0, 10)) || d2.includes(d1.substring(0, 10))))
    );

    if (!hasOverlap && tier1Defs.length > 0 && tier2Defs.length > 0) {
      markers.push({
        type: 'tier_disagreement',
        message: 'Academic and scholarly sources may differ',
        tier1: tier1Sources.map(s => s.name),
        tier2: tier2Sources.map(s => s.name),
        severity: 'info'
      });
      if (uncertaintyLevel.level !== 'disputed') {
        uncertaintyLevel = UNCERTAINTY_LEVELS.PROBABLE;
      }
    }
  }

  // Check for etymology uncertainty (if Klein provides uncertain etymology)
  const kleinSource = result.sources.find(s => s.name === 'Klein');
  if (kleinSource?.etymology?.includes('uncertain') || kleinSource?.etymology?.includes('perhaps')) {
    markers.push({
      type: 'uncertain_etymology',
      message: 'Etymology is uncertain or debated',
      etymology: kleinSource.etymology,
      severity: 'info'
    });
    if (uncertaintyLevel.level === 'certain') {
      uncertaintyLevel = UNCERTAINTY_LEVELS.PROBABLE;
    }
  }

  // Check for single source (low confidence)
  if (result.sources.length === 1) {
    markers.push({
      type: 'single_source',
      message: 'Only one dictionary source found',
      source: result.sources[0].name,
      severity: 'warning'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.UNCERTAIN;
  }

  // Check for hapax legomenon marker
  if (result.morphology?.frequency === 'hapax' || result.sources.some(s =>
    s.definition?.toLowerCase().includes('hapax') ||
    s.fullDefinition?.toLowerCase().includes('only once')
  )) {
    markers.push({
      type: 'hapax_legomenon',
      message: 'This word appears only once in the biblical corpus',
      severity: 'info'
    });
    uncertaintyLevel = UNCERTAINTY_LEVELS.HAPAX;
  }

  // Calculate overall confidence from consensus
  const confidence = result.consensus?.weightedScore || 0;

  return {
    level: uncertaintyLevel,
    markers,
    confidence,
    sourcesAgree: markers.filter(m => m.type === 'divergent_opinions').length === 0,
    hasScholarlyDebate: markers.some(m =>
      m.type === 'divergent_opinions' || m.type === 'tier_disagreement'
    ),
    markerCount: markers.length
  };
};

// =============================================================================
// SCHOLARLY EXPORT CAPABILITIES
// =============================================================================

/**
 * Export lookup result to JSON-LD format for scholarly interchange
 * Follows schema.org vocabulary with extensions for lexicography
 *
 * @param {Object} result - Lookup result to export
 * @returns {Object} JSON-LD formatted data
 */
export const exportToJsonLD = (result) => {
  if (!result) return null;

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'lexeme': 'https://www.w3.org/ns/lemon/ontolex#Lexeme',
      'sense': 'https://www.w3.org/ns/lemon/ontolex#LexicalSense',
      'hebrewWord': 'http://www.lexinfo.net/ontology/2.0/lexinfo#',
      'biblicalHebrew': 'http://example.org/biblical-hebrew#'
    },
    '@type': 'lexeme',
    '@id': `urn:hebrew:${result.cleanedWord}`,
    'name': result.word,
    'inLanguage': result.isAramaic ? 'arc' : 'hbo',
    'writtenForm': result.cleanedWord,
    'lexicalEntry': {
      '@type': 'sense',
      'definition': result.english,
      'source': result.source
    },
    'root': result.rootData?.root || result.root || null,
    'morphology': result.morphology ? {
      'pattern': result.morphology.pattern,
      'binyan': result.morphology.binyan,
      'prefixes': result.morphology.prefixes,
      'suffixes': result.morphology.suffixes
    } : null,
    'scholarly': {
      'consensus': result.consensus?.level?.label || null,
      'confidenceScore': result.confidence?.score || 0,
      'sourceCount': result.sources?.length || 0,
      'academicSources': result.sources?.filter(s =>
        getSourceTier(s.name).level <= 2
      ).map(s => s.name) || []
    },
    'citations': result.citations?.map(c => ({
      'source': c.source,
      'citation': c.citation?.full
    })) || [],
    'dateRetrieved': new Date().toISOString()
  };
};

/**
 * Export lookup result to Markdown format for documentation
 *
 * @param {Object} result - Lookup result to export
 * @param {Object} options - Export options
 * @returns {string} Markdown formatted text
 */
export const exportToMarkdown = (result, options = {}) => {
  if (!result) return '';

  const {
    includeAllSources = true,
    includeMorphology = true,
    includeCitations = true,
    includeUncertainty = true
  } = options;

  const lines = [];

  // Header
  lines.push(`# ${result.word}`);
  lines.push('');

  // Basic info
  lines.push(`**Cleaned Form:** ${result.cleanedWord}`);
  lines.push(`**Language:** ${result.language || (result.isAramaic ? 'Aramaic' : 'Hebrew')}`);
  lines.push('');

  // Primary definition
  lines.push('## Primary Definition');
  lines.push(`> ${result.english || 'No definition found'}`);
  lines.push(`*Source: ${result.source}*`);
  lines.push('');

  // Root information
  if (result.rootData?.root || result.root) {
    lines.push('## Root');
    lines.push(`**Root:** ${result.rootData?.root || result.root}`);
    if (result.rootData?.binyan) {
      lines.push(`**Binyan:** ${result.rootData.binyan}`);
    }
    lines.push('');
  }

  // Morphology
  if (includeMorphology && result.morphology) {
    lines.push('## Morphological Analysis');
    if (result.morphology.pattern) lines.push(`- **Pattern:** ${result.morphology.pattern}`);
    if (result.morphology.binyan) lines.push(`- **Binyan:** ${result.morphology.binyan}`);
    if (result.morphology.prefixes?.length) lines.push(`- **Prefixes:** ${result.morphology.prefixes.join(', ')}`);
    if (result.morphology.suffixes?.length) lines.push(`- **Suffixes:** ${result.morphology.suffixes.join(', ')}`);
    if (result.morphology.description) lines.push(`- **Description:** ${result.morphology.description}`);
    lines.push('');
  }

  // All sources
  if (includeAllSources && result.sources?.length > 0) {
    lines.push('## Dictionary Sources');
    lines.push('');
    lines.push('| Source | Tier | Definition |');
    lines.push('|--------|------|------------|');
    for (const src of result.sources) {
      const tier = getSourceTier(src.name);
      const defPreview = (src.definition || '').substring(0, 60) + ((src.definition?.length || 0) > 60 ? '...' : '');
      lines.push(`| ${src.name} | ${tier.name} | ${defPreview} |`);
    }
    lines.push('');
  }

  // Consensus
  if (result.consensus) {
    lines.push('## Scholarly Consensus');
    lines.push(`**Level:** ${result.consensus.level?.label || 'Unknown'}`);
    lines.push(`**Agreement:** ${result.consensus.agreementCount}/${result.consensus.totalSources} sources agree`);
    lines.push(`**Score:** ${result.consensus.weightedScore}/100`);
    lines.push('');
  }

  // Uncertainty markers
  if (includeUncertainty) {
    const uncertainty = generateScholarlyUncertainty(result);
    if (uncertainty.markers.length > 0) {
      lines.push('## Scholarly Notes');
      for (const marker of uncertainty.markers) {
        lines.push(`- ${marker.icon || '•'} ${marker.message}`);
      }
      lines.push('');
    }
  }

  // Citations
  if (includeCitations && result.citations?.length > 0) {
    lines.push('## Bibliography');
    for (const cit of result.citations) {
      lines.push(`- ${cit.citation?.full || cit.source}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated by Torah Reader Pro Scholar - ${new Date().toISOString()}*`);

  return lines.join('\n');
};

/**
 * Export lookup result for flashcard/SRS systems
 *
 * @param {Object} result - Lookup result
 * @returns {Object} Flashcard-ready data
 */
export const exportToFlashcard = (result) => {
  if (!result) return null;

  return {
    front: result.cleanedWord,
    back: result.english || 'Unknown',
    pronunciation: null, // Could be added from pronunciation service
    root: result.rootData?.root || result.root || null,
    source: result.source,
    confidence: result.confidence?.level || 'unknown',
    language: result.isAramaic ? 'Aramaic' : 'Hebrew',
    tags: [
      result.isAramaic ? 'aramaic' : 'hebrew',
      result.source?.toLowerCase().replace(/[^a-z]/g, ''),
      result.consensus?.level?.level
    ].filter(Boolean),
    metadata: {
      sourceCount: result.sources?.length || 0,
      hasRoot: !!(result.rootData?.root || result.root),
      hasMorphology: !!result.morphology
    }
  };
};

// =============================================================================
// FULLY ENRICHED LOOKUP
// =============================================================================

/**
 * Full lookup with ALL enrichments
 * This is the most comprehensive lookup function combining:
 * - Dictionary sources with consensus scoring
 * - Contextual definition ranking
 * - Word relationships (synonyms, antonyms, cognates)
 * - Morphological analysis
 * - Root family expansion
 * - Scholarly uncertainty markers
 * - Citations
 * - Semantic field data
 *
 * @param {string} word - Word to look up
 * @param {Object} options - Full enrichment options
 * @returns {Promise<Object>} Fully enriched lookup result
 */
