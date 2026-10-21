// =============================================================================
// ÉTAT du graphe de mots — wordGraph (mutable), persistance localStorage,
// initialisation, population, mutations (nœuds, relations, apprentissage).
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// NB : wordGraph est un `let` exporté — les réassignations restent locales à
// CE module ; les importeurs voient la valeur à jour (live bindings ESM).
// =============================================================================

import { WORD_RELATIONSHIP_TYPES, SEMANTIC_FIELDS, WORD_RELATIONSHIPS_DB } from './data';

// =============================================================================
// WORD GRAPH DATA STRUCTURE
// =============================================================================

export let wordGraph = {
  nodes: new Map(),      // word -> { word, data, connections }
  edges: [],             // { source, target, type, weight }
  userLearned: new Set(), // words user has learned
  metadata: {
    created: Date.now(),
    lastUpdated: Date.now(),
  },
};

const STORAGE_KEY = 'word-relationship-graph';

import { createPersistedStore } from '../../../utils/persistedStore';
const wordGraphPersist = createPersistedStore(STORAGE_KEY, wordGraph, {
  name: 'word graph',
  deserialize: (raw) => {
    const data = JSON.parse(raw);
    return {
      nodes: new Map(data.nodes || []),
      edges: data.edges || [],
      userLearned: new Set(data.userLearned || []),
      metadata: data.metadata || { created: Date.now(), lastUpdated: Date.now() },
    };
  },
  serialize: (g) => ({
    nodes: Array.from(g.nodes.entries()),
    edges: g.edges,
    userLearned: Array.from(g.userLearned),
    metadata: g.metadata,
  }),
});

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the word graph from storage
 */
export function initializeWordGraph() {
  wordGraph = wordGraphPersist.load();

  // Pre-populate with known relationships
  populateBuiltInRelationships();

  return wordGraph;
}

/**
 * Persist word graph to storage
 */
export function persistWordGraph() {
  wordGraph = wordGraphPersist.save(wordGraph);
}

/**
 * Populate graph with built-in relationships
 */
function populateBuiltInRelationships() {
  // Add root family relationships
  Object.entries(WORD_RELATIONSHIPS_DB.rootFamilies).forEach(([rootKey, family]) => {
    family.words.forEach(wordData => {
      addWordNode(wordData.word, {
        meaning: wordData.meaning,
        pos: wordData.pos,
        root: family.root,
        rootMeaning: family.meaning,
      });

      // Connect all words in the family to each other
      family.words.forEach(otherWord => {
        if (wordData.word !== otherWord.word) {
          addWordRelationship(
            wordData.word,
            otherWord.word,
            WORD_RELATIONSHIP_TYPES.ROOT_FAMILY,
            { root: family.root }
          );
        }
      });
    });
  });

  // Add synonyms
  Object.entries(WORD_RELATIONSHIPS_DB.synonyms).forEach(([word, synonyms]) => {
    addWordNode(word, {});
    synonyms.forEach(syn => {
      addWordNode(syn, {});
      addWordRelationship(word, syn, WORD_RELATIONSHIP_TYPES.SYNONYM);
    });
  });

  // Add antonyms
  Object.entries(WORD_RELATIONSHIPS_DB.antonyms).forEach(([word, antonyms]) => {
    addWordNode(word, {});
    antonyms.forEach(ant => {
      addWordNode(ant, {});
      addWordRelationship(word, ant, WORD_RELATIONSHIP_TYPES.ANTONYM);
    });
  });

  // Add biblical pairs
  Object.entries(WORD_RELATIONSHIPS_DB.biblicalPairs).forEach(([word, pairs]) => {
    addWordNode(word, {});
    pairs.forEach(pair => {
      addWordNode(pair, {});
      addWordRelationship(word, pair, WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR);
    });
  });

  // Add Aramaic cognates
  Object.entries(WORD_RELATIONSHIPS_DB.aramaicCognates).forEach(([hebrew, data]) => {
    addWordNode(hebrew, { language: 'hebrew' });
    addWordNode(data.aramaic, { language: 'aramaic', meaning: data.meaning });
    addWordRelationship(hebrew, data.aramaic, WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE);
  });

  // Add semantic field memberships
  Object.entries(SEMANTIC_FIELDS).forEach(([fieldKey, field]) => {
    field.words.forEach(word => {
      const node = wordGraph.nodes.get(word) || { word, data: {} };
      node.data.semanticFields = node.data.semanticFields || [];
      if (!node.data.semanticFields.includes(field.id)) {
        node.data.semanticFields.push(field.id);
      }
      wordGraph.nodes.set(word, node);
    });
  });
}

// =============================================================================
// NODE OPERATIONS
// =============================================================================

/**
 * Add a word node to the graph
 */
export function addWordNode(word, data = {}) {
  if (!wordGraph.nodes.has(word)) {
    wordGraph.nodes.set(word, {
      word,
      data: {
        ...data,
        addedAt: Date.now(),
      },
      connections: 0,
    });
    wordGraph.metadata.lastUpdated = Date.now();
  }
  return wordGraph.nodes.get(word);
}

/**
 * Add a relationship between two words
 */
export function addWordRelationship(word1, word2, type, metadata = {}) {
  // Ensure nodes exist
  addWordNode(word1, {});
  addWordNode(word2, {});

  // Check for existing edge
  const edgeId = `${word1}-${type}-${word2}`;
  const reverseId = `${word2}-${type}-${word1}`;

  const existing = wordGraph.edges.find(e => e.id === edgeId || e.id === reverseId);
  if (existing) {
    existing.weight = (existing.weight || 1) + 1;
    return existing;
  }

  const edge = {
    id: edgeId,
    source: word1,
    target: word2,
    type,
    weight: 1,
    metadata: {
      ...metadata,
      addedAt: Date.now(),
    },
  };

  wordGraph.edges.push(edge);

  // Update connection counts
  const node1 = wordGraph.nodes.get(word1);
  const node2 = wordGraph.nodes.get(word2);
  if (node1) node1.connections++;
  if (node2) node2.connections++;

  wordGraph.metadata.lastUpdated = Date.now();
  return edge;
}

/**
 * Mark a word as learned by the user
 */
export function markWordLearned(word) {
  wordGraph.userLearned.add(word);
  persistWordGraph();
}

/**
 * Check if a word is learned
 */
export function isWordLearned(word) {
  return wordGraph.userLearned.has(word);
}

