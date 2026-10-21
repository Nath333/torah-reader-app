// =============================================================================
// DIAGRAM TYPE: CONCEPT MAP - Key terms with semantic relationships
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getTalmudDaf } from '../../../sefariaApi';
import { getWordRelationships, SEMANTIC_FIELDS } from '../../wordRelationshipService';
import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';
import { safeExecute, stripNikud } from '../textUtils';
import {
  extractKeyTerms
} from '../extractors';

// =============================================================================
// DIAGRAM TYPE: CONCEPT MAP - Key terms with semantic relationships
// =============================================================================

export async function generateConceptMapDiagram(tractate, daf, options = {}) {
  const { direction = 'LR', maxConcepts = 15 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'conceptMap:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions
  lines.push('  %% Concept Map Styles');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef concept fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef root fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef synonym fill:#fce7f3,stroke:#db2777');
  lines.push('  classDef antonym fill:#fee2e2,stroke:#dc2626');
  lines.push('  classDef field fill:#e0e7ff,stroke:#6366f1');

  // Central daf node
  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf central`);

  if (!dafContent?.segments) {
    lines.push(`  note["Load daf content to see concepts"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { concepts: 0 },
      explanation: `Concept map for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.CONCEPT_MAP
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');

  // Extract key Hebrew terms from the text
  const keyTerms = extractKeyTerms(fullText, maxConcepts);
  const nodeIds = new Map();
  let nodeCount = 0;

  // Add key terms as nodes
  keyTerms.forEach((term, index) => {
    const nodeId = `t${index}`;
    nodeIds.set(term.word, nodeId);

    lines.push(`  ${nodeId}["${term.word}"]`);
    lines.push(`  class ${nodeId} concept`);
    lines.push(`  daf --> ${nodeId}`);
    nodeCount++;
  });

  // Try to find relationships between terms using wordRelationshipService
  keyTerms.forEach(term => {
    try {
      const relationships = getWordRelationships(term.word);

      // Add root family connections
      relationships.rootFamily?.slice(0, 3).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `r${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(["${rel.word}"])`);
          lines.push(`  class ${nodeId} root`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.->|שורש| ${targetId}`);
        }
      });

      // Add synonym connections
      relationships.synonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `s${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(("${rel.word}"))`);
          lines.push(`  class ${nodeId} synonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} <-->|נרדף| ${targetId}`);
        }
      });

      // Add antonym connections
      relationships.antonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `a${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}{{"${rel.word}"}}`);
          lines.push(`  class ${nodeId} antonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.-x|היפך| ${targetId}`);
        }
      });
    } catch (err) {
      // Word not in relationship database, skip
    }
  });

  // Add semantic field context
  const detectedFields = new Set();
  keyTerms.forEach(term => {
    Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
      if (field.words.some(w => term.word.includes(w) || w.includes(term.word))) {
        detectedFields.add(key);
      }
    });
  });

  if (detectedFields.size > 0) {
    lines.push(`  %% Semantic Fields`);
    let fieldIdx = 0;
    detectedFields.forEach(fieldKey => {
      const field = SEMANTIC_FIELDS[fieldKey];
      if (field) {
        const fieldNodeId = `f${fieldIdx++}`;
        lines.push(`  ${fieldNodeId}[/"📚 ${field.hebrewLabel}"/]`);
        lines.push(`  class ${fieldNodeId} field`);
        lines.push(`  daf -.-> ${fieldNodeId}`);
      }
    });
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      concepts: keyTerms.length,
      relationships: nodeCount - keyTerms.length,
      semanticFields: detectedFields.size
    },
    explanation: `${keyTerms.length} key terms with relationships`,
    type: DIAGRAM_TYPES.CONCEPT_MAP,
    keyTerms
  };
}


// Données de détection déplacées dans ./talmudDiagramData.js.
