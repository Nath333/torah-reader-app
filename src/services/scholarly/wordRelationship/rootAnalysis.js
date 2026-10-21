// =============================================================================
// Analyse de racines apparentées — RELATED_ROOTS_DB curated + analyse
// complète multi-sources.
// (extrait de wordRelationshipService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { WORD_RELATIONSHIPS_DB } from './data';

// =============================================================================
// ENHANCED ROOT FAMILY WITH DEFINITIONS
// =============================================================================

/**
 * Related roots database - roots that share letters or semantic fields
 * These are roots that scholars often compare and contrast
 */
const RELATED_ROOTS_DB = {
  // Motion roots
  'יצא': {
    related: [
      { root: 'בוא', meaning: 'to come, enter', relation: 'antonym', note: 'יצא/בוא = go out/come in' },
      { root: 'הלך', meaning: 'to walk, go', relation: 'semantic', note: 'movement verbs' },
      { root: 'עלה', meaning: 'to go up', relation: 'semantic', note: 'movement verbs' },
      { root: 'ירד', meaning: 'to go down', relation: 'semantic', note: 'movement verbs' },
    ]
  },
  'בוא': {
    related: [
      { root: 'יצא', meaning: 'to go out', relation: 'antonym', note: 'בוא/יצא = come/go' },
      { root: 'שוב', meaning: 'to return', relation: 'semantic', note: 'movement verbs' },
    ]
  },
  // Speaking roots
  'אמר': {
    related: [
      { root: 'דבר', meaning: 'to speak', relation: 'synonym', note: 'speech verbs' },
      { root: 'ענה', meaning: 'to answer', relation: 'semantic', note: 'speech verbs' },
      { root: 'קרא', meaning: 'to call, read', relation: 'semantic', note: 'speech verbs' },
    ]
  },
  'דבר': {
    related: [
      { root: 'אמר', meaning: 'to say', relation: 'synonym', note: 'אמר = direct quote, דבר = speak about' },
      { root: 'שמע', meaning: 'to hear', relation: 'semantic', note: 'speech/hearing pair' },
    ]
  },
  // Knowledge roots
  'ידע': {
    related: [
      { root: 'בין', meaning: 'to understand', relation: 'semantic', note: 'cognition verbs' },
      { root: 'שמע', meaning: 'to hear, obey', relation: 'semantic', note: 'perception → knowledge' },
      { root: 'ראה', meaning: 'to see', relation: 'semantic', note: 'perception → knowledge' },
    ]
  },
  // Holiness/purity roots
  'קדש': {
    related: [
      { root: 'טהר', meaning: 'to be pure', relation: 'semantic', note: 'purity/holiness' },
      { root: 'חלל', meaning: 'to profane', relation: 'antonym', note: 'קדש/חלל = holy/profane' },
      { root: 'טמא', meaning: 'to be impure', relation: 'antonym', note: 'purity opposition' },
    ]
  },
  // Blessing/curse roots
  'ברך': {
    related: [
      { root: 'קלל', meaning: 'to curse', relation: 'antonym', note: 'ברך/קלל = bless/curse' },
      { root: 'הלל', meaning: 'to praise', relation: 'semantic', note: 'positive speech' },
    ]
  },
  // Life/death roots
  'חיה': {
    related: [
      { root: 'מות', meaning: 'to die', relation: 'antonym', note: 'חיים/מות = life/death' },
      { root: 'נפש', meaning: 'soul, life', relation: 'semantic', note: 'life concepts' },
    ]
  },
  // Service/work roots
  'עבד': {
    related: [
      { root: 'שרת', meaning: 'to minister', relation: 'semantic', note: 'service verbs' },
      { root: 'עשה', meaning: 'to do, make', relation: 'semantic', note: 'work verbs' },
    ]
  },
  // Judgment roots
  'שפט': {
    related: [
      { root: 'דין', meaning: 'to judge', relation: 'synonym', note: 'שפט/דין = judge' },
      { root: 'צדק', meaning: 'to be righteous', relation: 'semantic', note: 'justice concepts' },
    ]
  },
  // Love/emotion roots
  'אהב': {
    related: [
      { root: 'שנא', meaning: 'to hate', relation: 'antonym', note: 'אהב/שנא = love/hate' },
      { root: 'חשק', meaning: 'to desire', relation: 'semantic', note: 'emotion verbs' },
    ]
  },
  // Poor/rich roots
  'עני': {
    related: [
      { root: 'ענה', meaning: 'to answer, afflict', relation: 'phonetic', note: 'same letters ע-נ-י/ה' },
      { root: 'רוש', meaning: 'to be poor', relation: 'synonym', note: 'poverty terms' },
      { root: 'דל', meaning: 'weak, poor', relation: 'synonym', note: 'poverty terms' },
      { root: 'אבה', meaning: 'to be willing', relation: 'semantic', note: 'humility/willingness' },
    ]
  },
  'ענה': {
    related: [
      { root: 'עני', meaning: 'poor, afflicted', relation: 'phonetic', note: 'same letters ע-נ-ה/י' },
      { root: 'שמע', meaning: 'to hear', relation: 'semantic', note: 'ענה = respond to hearing' },
    ]
  },
};

/**
 * Get related roots with their meanings
 * Finds roots that share letters, meanings, or are scholarly compared
 * @param {string} root - 3-letter Hebrew root
 * @returns {Object} Related roots with definitions
 */
export function getRelatedRoots(root) {
  if (!root) return { root, related: [] };

  const stripped = root.replace(/[-\s]/g, ''); // Remove dashes/spaces
  const normalized = stripped.length === 3 ? stripped : stripped.slice(0, 3);

  // Check database first
  const dbEntry = RELATED_ROOTS_DB[normalized];
  if (dbEntry) {
    return {
      root: normalized,
      related: dbEntry.related,
      hasData: true,
      source: 'curated'
    };
  }

  // Fallback: find roots with shared letters (2 of 3 letters in common)
  const foundRelated = [];
  const rootLetters = [...normalized];

  Object.keys(WORD_RELATIONSHIPS_DB.rootFamilies).forEach(otherRoot => {
    if (otherRoot === normalized) return;

    const otherLetters = [...otherRoot.replace(/[-\s]/g, '')];
    const sharedCount = rootLetters.filter(l => otherLetters.includes(l)).length;

    if (sharedCount >= 2) {
      const family = WORD_RELATIONSHIPS_DB.rootFamilies[otherRoot];
      foundRelated.push({
        root: otherRoot,
        meaning: family?.meaning || '',
        relation: 'phonetic',
        note: `Shares ${sharedCount} letters`,
        sharedLetters: sharedCount
      });
    }
  });

  // Sort by number of shared letters
  foundRelated.sort((a, b) => (b.sharedLetters || 0) - (a.sharedLetters || 0));

  return {
    root: normalized,
    related: foundRelated.slice(0, 5), // Top 5
    hasData: foundRelated.length > 0,
    source: 'computed'
  };
}

/**
 * Get comprehensive root analysis with synonyms, antonyms, and related roots
 * @param {string} root - 3-letter Hebrew root
 * @returns {Object} Comprehensive root analysis
 */
export function getComprehensiveRootAnalysis(root) {
  if (!root) return null;

  const stripped = root.replace(/[-\s]/g, '');
  const family = WORD_RELATIONSHIPS_DB.rootFamilies[stripped];
  const relatedRoots = getRelatedRoots(stripped);

  // Enhance related roots with synonym/antonym context
  const enhancedRelatedRoots = (relatedRoots.related || []).map(rel => {
    const synDef = WORD_RELATIONSHIPS_DB.synonyms[rel.root];
    const antDef = WORD_RELATIONSHIPS_DB.antonyms[rel.root];
    const sources = [];
    if (synDef?.length > 0) sources.push({ type: 'synonym', words: synDef });
    if (antDef?.length > 0) sources.push({ type: 'antonym', words: antDef });

    const definition = rel.meaning || null;
    return {
      ...rel,
      definition,
      sources,
      hasDefinition: !!definition || sources.length > 0
    };
  });

  // Walk family words, collecting synonym/antonym connections and parallel roots
  const synonymConnections = [];
  const antonymConnections = [];
  const parallelRoots = [];
  const parallelSeen = new Set();

  const addParallel = (word, relation, sourceWord, sourceMeaning) => {
    if (parallelSeen.has(word)) return;
    parallelSeen.add(word);
    parallelRoots.push({ word, relation, sourceWord, sourceMeaning });
  };

  const collectRelation = (relationKey, relation, connections) => {
    if (!family?.words) return;
    family.words.forEach(wordObj => {
      const related = WORD_RELATIONSHIPS_DB[relationKey][wordObj.word];
      if (!related) return;
      connections.push({
        word: wordObj.word,
        meaning: wordObj.meaning,
        [relationKey]: related,
      });
      related.forEach(w => addParallel(w, relation, wordObj.word, wordObj.meaning));
    });
  };

  collectRelation('synonyms', 'synonym', synonymConnections);
  collectRelation('antonyms', 'antonym', antonymConnections);

  return {
    root: stripped,
    rootMeaning: family?.meaning || null,
    family: family?.words || [],
    relatedRoots: enhancedRelatedRoots,
    synonymConnections,
    antonymConnections,
    parallelRoots,
    hasData: !!(family || relatedRoots.hasData || parallelRoots.length > 0),
    stats: {
      familySize: family?.words?.length || 0,
      relatedRootsCount: enhancedRelatedRoots.length,
      synonymsCount: synonymConnections.length,
      antonymsCount: antonymConnections.length,
      parallelRootsCount: parallelRoots.length,
    },
  };
}

