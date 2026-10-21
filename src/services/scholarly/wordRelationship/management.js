// =============================================================================
// Gestion — statistiques du graphe, progression d'apprentissage, export /
// import / remise à zéro.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { SEMANTIC_FIELDS, WORD_RELATIONSHIPS_DB } from './data';
import { wordGraph, persistWordGraph, initializeWordGraph } from './graphState';

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get word graph statistics
 */
export function getWordGraphStats() {
  const nodes = Array.from(wordGraph.nodes.values());

  // Count by relationship type
  const relationshipCounts = {};
  wordGraph.edges.forEach(edge => {
    relationshipCounts[edge.type] = (relationshipCounts[edge.type] || 0) + 1;
  });

  // Find most connected words
  const mostConnected = nodes
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10)
    .map(n => ({ word: n.word, connections: n.connections }));

  // Learning progress by semantic field
  const fieldProgress = {};
  Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
    const learned = field.words.filter(w => wordGraph.userLearned.has(w)).length;
    fieldProgress[field.id] = {
      label: field.label,
      learned,
      total: field.words.length,
      percentage: Math.round((learned / field.words.length) * 100),
    };
  });

  return {
    totalWords: nodes.length,
    totalRelationships: wordGraph.edges.length,
    learnedWords: wordGraph.userLearned.size,
    relationshipCounts,
    mostConnected,
    fieldProgress,
    lastUpdated: wordGraph.metadata.lastUpdated,
  };
}

/**
 * Get learning progress summary
 */
export function getLearningProgress() {
  const learned = Array.from(wordGraph.userLearned);

  // Group learned words by root
  const byRoot = {};
  learned.forEach(word => {
    const node = wordGraph.nodes.get(word);
    const root = node?.data?.root || 'unknown';
    if (!byRoot[root]) {
      byRoot[root] = [];
    }
    byRoot[root].push(word);
  });

  // Count complete root families
  let completeRoots = 0;
  Object.entries(WORD_RELATIONSHIPS_DB.rootFamilies).forEach(([rootKey, family]) => {
    const learnedInFamily = family.words.filter(w => wordGraph.userLearned.has(w.word)).length;
    if (learnedInFamily === family.words.length) {
      completeRoots++;
    }
  });

  return {
    totalLearned: learned.length,
    byRoot,
    completeRootFamilies: completeRoots,
    totalRootFamilies: Object.keys(WORD_RELATIONSHIPS_DB.rootFamilies).length,
  };
}

// =============================================================================
// EXPORT & IMPORT
// =============================================================================

/**
 * Export word graph data
 */
export function exportWordGraph() {
  return {
    nodes: Array.from(wordGraph.nodes.entries()),
    edges: wordGraph.edges,
    userLearned: Array.from(wordGraph.userLearned),
    metadata: wordGraph.metadata,
  };
}

/**
 * Import word graph data
 */
export function importWordGraph(data) {
  if (data.nodes) {
    data.nodes.forEach(([word, node]) => {
      wordGraph.nodes.set(word, node);
    });
  }
  if (data.edges) {
    data.edges.forEach(edge => {
      const exists = wordGraph.edges.find(e => e.id === edge.id);
      if (!exists) {
        wordGraph.edges.push(edge);
      }
    });
  }
  if (data.userLearned) {
    data.userLearned.forEach(word => wordGraph.userLearned.add(word));
  }
  wordGraph.metadata.lastUpdated = Date.now();
  persistWordGraph();
}

/**
 * Clear user learning data (keep built-in relationships)
 */
export function clearLearningProgress() {
  wordGraph.userLearned.clear();
  persistWordGraph();
}

// Initialize on module load
initializeWordGraph();

