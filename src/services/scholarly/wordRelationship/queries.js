// =============================================================================
// Requêtes sur le graphe — relations d'un mot, famille de racine, champ
// sémantique, chemin d'apprentissage.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { WORD_RELATIONSHIP_TYPES, SEMANTIC_FIELDS } from './data';
import { wordGraph, isWordLearned } from './graphState';

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all relationships for a word
 */
export function getWordRelationships(word) {
  const relationships = {
    word,
    node: wordGraph.nodes.get(word),
    rootFamily: [],
    synonyms: [],
    antonyms: [],
    semanticField: [],
    collocations: [],
    biblicalPairs: [],
    aramaicCognates: [],
    all: [],
  };

  wordGraph.edges.forEach(edge => {
    if (edge.source === word || edge.target === word) {
      const related = edge.source === word ? edge.target : edge.source;
      const relData = {
        word: related,
        node: wordGraph.nodes.get(related),
        type: edge.type,
        weight: edge.weight,
        learned: wordGraph.userLearned.has(related),
      };

      relationships.all.push(relData);

      switch (edge.type) {
        case WORD_RELATIONSHIP_TYPES.ROOT_FAMILY:
          relationships.rootFamily.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.SYNONYM:
          relationships.synonyms.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.ANTONYM:
          relationships.antonyms.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.SEMANTIC_FIELD:
          relationships.semanticField.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.COLLOCATION:
          relationships.collocations.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.BIBLICAL_PAIR:
          relationships.biblicalPairs.push(relData);
          break;
        case WORD_RELATIONSHIP_TYPES.ARAMAIC_COGNATE:
          relationships.aramaicCognates.push(relData);
          break;
        default:
          break;
      }
    }
  });

  return relationships;
}

/**
 * Get words in the same root family
 */
export function getRootFamily(word) {
  const node = wordGraph.nodes.get(word);
  const root = node?.data?.root;

  if (!root) {
    // Try to find from relationships
    const relationships = getWordRelationships(word);
    return relationships.rootFamily;
  }

  // Get all words with the same root
  const family = [];
  wordGraph.nodes.forEach((n, w) => {
    if (n.data?.root === root) {
      family.push({
        word: w,
        meaning: n.data?.meaning,
        pos: n.data?.pos,
        learned: wordGraph.userLearned.has(w),
      });
    }
  });

  return {
    root,
    rootMeaning: node?.data?.rootMeaning,
    words: family,
    learnedCount: family.filter(w => w.learned).length,
  };
}

/**
 * Get words in the same semantic field
 */
export function getSemanticFieldWords(fieldId) {
  const field = SEMANTIC_FIELDS[fieldId.toUpperCase()];
  if (!field) return null;

  const words = field.words.map(word => ({
    word,
    node: wordGraph.nodes.get(word),
    learned: wordGraph.userLearned.has(word),
  }));

  return {
    ...field,
    words,
    learnedCount: words.filter(w => w.learned).length,
    totalCount: words.length,
  };
}

/**
 * Find semantic fields containing a word
 */
export function findSemanticFields(word) {
  const fields = [];

  Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
    if (field.words.includes(word)) {
      fields.push({
        id: field.id,
        label: field.label,
        hebrewLabel: field.hebrewLabel,
        wordCount: field.words.length,
      });
    }
  });

  return fields;
}

/**
 * Get learning suggestions based on what user knows
 */
export function getLearningPath(startWord) {
  const suggestions = [];
  const relationships = getWordRelationships(startWord);

  // Priority 1: Unlearned root family members
  relationships.rootFamily
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Same root family',
        priority: 1,
        type: 'root_family',
      });
    });

  // Priority 2: Unlearned antonyms (contrast learning)
  relationships.antonyms
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Learn the opposite',
        priority: 2,
        type: 'antonym',
      });
    });

  // Priority 3: Unlearned synonyms
  relationships.synonyms
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Similar meaning',
        priority: 3,
        type: 'synonym',
      });
    });

  // Priority 4: Aramaic cognates
  relationships.aramaicCognates
    .filter(r => !r.learned)
    .forEach(r => {
      suggestions.push({
        word: r.word,
        reason: 'Aramaic cognate',
        priority: 4,
        type: 'cognate',
      });
    });

  return suggestions.sort((a, b) => a.priority - b.priority);
}

