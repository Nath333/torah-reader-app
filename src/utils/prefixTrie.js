/**
 * PRO SCHOLAR V4: Trie-Based Hebrew Prefix Matcher
 *
 * Provides O(m) prefix matching where m = prefix length, instead of O(n*m)
 * where n = number of prefix patterns. For Hebrew morphology with 60+ patterns,
 * this provides significant speedup for word lookup.
 *
 * Usage:
 *   import { prefixTrie, findLongestPrefix, stripPrefix } from './prefixTrie';
 *   const { prefix, remainder } = stripPrefix('וכשהמלך');
 *   // prefix = 'וכשה', remainder = 'מלך'
 */

import { HEBREW_PREFIXES_ORDERED, STOP_WORDS } from '../constants/morphology';

/**
 * Trie node structure
 */
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfPrefix = false;
    this.prefixValue = null; // The full prefix string
    this.metadata = null;    // Optional metadata (meaning, type, etc.)
  }
}

/**
 * Hebrew Prefix Trie for fast prefix matching
 */
class HebrewPrefixTrie {
  constructor() {
    this.root = new TrieNode();
    this.built = false;
  }

  /**
   * Insert a prefix into the trie
   * @param {string} prefix - Hebrew prefix pattern
   * @param {object} metadata - Optional metadata
   */
  insert(prefix, metadata = null) {
    let node = this.root;

    // Hebrew is RTL, but we process left-to-right in string
    for (const char of prefix) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
    }

    node.isEndOfPrefix = true;
    node.prefixValue = prefix;
    node.metadata = metadata;
  }

  /**
   * Find the longest matching prefix in a word
   * @param {string} word - Hebrew word to analyze
   * @returns {object|null} - { prefix, metadata, remainder } or null
   */
  findLongestMatch(word) {
    if (!word || word.length === 0) return null;

    let node = this.root;
    let lastMatch = null;
    let matchLength = 0;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];

      if (!node.children.has(char)) {
        break;
      }

      node = node.children.get(char);

      if (node.isEndOfPrefix) {
        lastMatch = {
          prefix: node.prefixValue,
          metadata: node.metadata,
          length: i + 1
        };
        matchLength = i + 1;
      }
    }

    if (lastMatch) {
      return {
        prefix: lastMatch.prefix,
        metadata: lastMatch.metadata,
        remainder: word.slice(matchLength)
      };
    }

    return null;
  }

  /**
   * Find all matching prefixes (shortest to longest)
   * @param {string} word - Hebrew word to analyze
   * @returns {Array} - Array of { prefix, metadata }
   */
  findAllMatches(word) {
    if (!word || word.length === 0) return [];

    const matches = [];
    let node = this.root;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];

      if (!node.children.has(char)) {
        break;
      }

      node = node.children.get(char);

      if (node.isEndOfPrefix) {
        matches.push({
          prefix: node.prefixValue,
          metadata: node.metadata,
          remainder: word.slice(i + 1)
        });
      }
    }

    return matches;
  }

  /**
   * Check if a word starts with any known prefix
   * @param {string} word - Hebrew word
   * @returns {boolean}
   */
  hasPrefix(word) {
    return this.findLongestMatch(word) !== null;
  }

  /**
   * Build the trie from the morphology constants
   */
  build() {
    if (this.built) return this;

    // Insert all prefixes from morphology.js
    for (const prefix of HEBREW_PREFIXES_ORDERED) {
      this.insert(prefix);
    }

    this.built = true;
    return this;
  }

  /**
   * Get trie statistics
   */
  getStats() {
    let nodeCount = 0;
    let prefixCount = 0;
    let maxDepth = 0;

    const traverse = (node, depth) => {
      nodeCount++;
      if (node.isEndOfPrefix) prefixCount++;
      maxDepth = Math.max(maxDepth, depth);

      for (const child of node.children.values()) {
        traverse(child, depth + 1);
      }
    };

    traverse(this.root, 0);

    return { nodeCount, prefixCount, maxDepth };
  }
}

// Singleton instance
const prefixTrie = new HebrewPrefixTrie().build();

/**
 * Find the longest matching prefix in a Hebrew word
 * @param {string} word - Hebrew word
 * @returns {object|null} - { prefix, remainder } or null
 */
export function findLongestPrefix(word) {
  return prefixTrie.findLongestMatch(word);
}

/**
 * Strip prefix from word, respecting stop words
 * @param {string} word - Hebrew word
 * @param {Set} stopWords - Words to not strip (default: STOP_WORDS)
 * @returns {object} - { prefix, stem, wasStripped }
 */
export function stripPrefix(word, stopWords = STOP_WORDS) {
  // Check stop words first
  if (stopWords.has(word)) {
    return { prefix: '', stem: word, wasStripped: false };
  }

  const match = prefixTrie.findLongestMatch(word);

  if (match && match.remainder.length >= 2) {
    // Don't strip if remainder is too short
    return {
      prefix: match.prefix,
      stem: match.remainder,
      wasStripped: true
    };
  }

  return { prefix: '', stem: word, wasStripped: false };
}

/**
 * Get all possible prefix interpretations of a word
 * Useful for morphological analysis showing multiple possibilities
 * @param {string} word - Hebrew word
 * @returns {Array} - Array of { prefix, stem }
 */
export function getAllPrefixVariants(word) {
  const matches = prefixTrie.findAllMatches(word);

  // Add the word itself as no-prefix variant
  const variants = [{ prefix: '', stem: word }];

  // Add all valid prefix strippings (stem must be >= 2 chars)
  for (const match of matches) {
    if (match.remainder.length >= 2) {
      variants.push({
        prefix: match.prefix,
        stem: match.remainder
      });
    }
  }

  return variants;
}

/**
 * Get trie statistics for debugging
 */
export function getTrieStats() {
  return prefixTrie.getStats();
}

// Export the trie instance for advanced usage
export { prefixTrie, HebrewPrefixTrie };

const PrefixTrieModule = {
  findLongestPrefix,
  stripPrefix,
  getAllPrefixVariants,
  getTrieStats,
  prefixTrie
};

export default PrefixTrieModule;
