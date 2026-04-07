// =============================================================================
// LOOKUP EXPORT SERVICE
// Export capabilities extracted from unifiedLookupService for modularity
// Provides JSON-LD, Markdown, and Flashcard export formats
// =============================================================================

import { getSourceTier } from './scholarSourceAggregator';
import { generateScholarlyUncertainty } from './unifiedLookupService';

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
        lines.push(`- ${marker.icon || '\u2022'} ${marker.message}`);
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
