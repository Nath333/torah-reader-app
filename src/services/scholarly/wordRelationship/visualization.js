// =============================================================================
// Visualisation — graphe de mots (structure), diagramme Mermaid, ASCII.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { WORD_RELATIONSHIP_TYPES } from './data';
import { wordGraph } from './graphState';
import { getWordRelationships } from './queries';

// =============================================================================
// VISUALIZATION
// =============================================================================

/**
 * Generate a visual graph for a word and its relationships
 */
export function generateWordGraph(centerWord, options = {}) {
  const { maxDepth = 1, maxNodes = 20 } = options;

  const nodes = new Set([centerWord]);
  const edges = [];
  const visited = new Set();

  function expand(word, depth) {
    if (depth > maxDepth || visited.has(word) || nodes.size >= maxNodes) return;
    visited.add(word);

    wordGraph.edges.forEach(edge => {
      if (edge.source === word || edge.target === word) {
        const related = edge.source === word ? edge.target : edge.source;
        if (nodes.size < maxNodes) {
          nodes.add(related);
          edges.push({
            source: edge.source,
            target: edge.target,
            type: edge.type,
            weight: edge.weight,
          });
          expand(related, depth + 1);
        }
      }
    });
  }

  expand(centerWord, 0);

  return {
    nodes: Array.from(nodes).map(word => ({
      id: word,
      label: word,
      ...wordGraph.nodes.get(word)?.data,
      learned: wordGraph.userLearned.has(word),
      isCenter: word === centerWord,
    })),
    edges,
    stats: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
    },
  };
}

/**
 * Generate Mermaid diagram for word relationships
 */
export function generateWordMermaid(centerWord, options = {}) {
  const graph = generateWordGraph(centerWord, options);
  const lines = ['graph LR'];

  // Style classes
  lines.push('  classDef center fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef learned fill:#d1fae5,stroke:#059669');
  lines.push('  classDef unlearned fill:#fee2e2,stroke:#dc2626');
  lines.push('  classDef hebrew font-family:David,serif');

  // Node definitions
  graph.nodes.forEach(node => {
    const safeId = node.id.replace(/[^א-תa-zA-Z0-9]/g, '_');
    lines.push(`  ${safeId}["${node.id}"]`);

    if (node.isCenter) {
      lines.push(`  class ${safeId} center`);
    } else if (node.learned) {
      lines.push(`  class ${safeId} learned`);
    } else {
      lines.push(`  class ${safeId} unlearned`);
    }
  });

  // Edge definitions
  const edgeStyles = {
    [WORD_RELATIONSHIP_TYPES.ROOT_FAMILY]: '-->|root|',
    [WORD_RELATIONSHIP_TYPES.SYNONYM]: '-->|syn|',
    [WORD_RELATIONSHIP_TYPES.ANTONYM]: '-.->|ant|',
    [WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR]: '<-->|pair|',
    [WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE]: '-->|aram|',
    [WORD_RELATIONSHIP_TYPES.COLLOCATION]: '-->|with|',
  };

  graph.edges.forEach(edge => {
    const sourceId = edge.source.replace(/[^א-תa-zA-Z0-9]/g, '_');
    const targetId = edge.target.replace(/[^א-תa-zA-Z0-9]/g, '_');
    const style = edgeStyles[edge.type] || '-->';
    lines.push(`  ${sourceId} ${style} ${targetId}`);
  });

  return lines.join('\n');
}

/**
 * Generate ASCII representation of word relationships
 */
export function generateWordAscii(word) {
  const relationships = getWordRelationships(word);
  const lines = [];

  lines.push(`╔${'═'.repeat(word.length + 10)}╗`);
  lines.push(`║    ${word}    ║`);
  lines.push(`╚${'═'.repeat(word.length + 10)}╝`);
  lines.push('');

  if (relationships.rootFamily.length > 0) {
    lines.push('  🌳 Root Family:');
    relationships.rootFamily.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.synonyms.length > 0) {
    lines.push('  ≈ Synonyms:');
    relationships.synonyms.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.antonyms.length > 0) {
    lines.push('  ↔ Antonyms:');
    relationships.antonyms.forEach(r => {
      const status = r.learned ? '✓' : '○';
      lines.push(`     ${status} ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.biblicalPairs.length > 0) {
    lines.push('  ⚖ Biblical Pairs:');
    relationships.biblicalPairs.forEach(r => {
      lines.push(`     ${word} + ${r.word}`);
    });
    lines.push('');
  }

  if (relationships.aramaicCognates.length > 0) {
    lines.push('  🔄 Aramaic Cognates:');
    relationships.aramaicCognates.forEach(r => {
      lines.push(`     ${r.word}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

