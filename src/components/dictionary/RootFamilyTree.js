/**
 * RootFamilyTree - PRO SCHOLAR V6 Root Family Visualization
 *
 * Displays all words derived from the same Hebrew/Aramaic root in a tree-like structure.
 * Features:
 * - Visual tree layout showing root relationships
 * - Binyan categorization for verbs
 * - Noun pattern (mishkal) categorization
 * - Frequency indicators
 * - Click-to-lookup functionality
 * - Collapsible categories
 *
 * @module RootFamilyTree
 */

import React, { useState, memo, useMemo, useCallback } from 'react';
// Note: useEffect available if needed for async loading
import PropTypes from 'prop-types';
import { useRootFamily, normalizeRootFamily } from '../../hooks/useProScholarV6';
import { stripVowels } from '../../utils/hebrewUtils';
import './RootFamilyTree.css';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Word category configuration */
const WORD_CATEGORIES = {
  verb: {
    name: 'Verbs',
    hebrew: 'פעלים',
    icon: '▶️',
    color: '#3b82f6',
    subcategories: {
      qal: { name: 'Qal', hebrew: 'קַל' },
      nifal: { name: "Nif'al", hebrew: 'נִפְעַל' },
      piel: { name: "Pi'el", hebrew: 'פִּעֵל' },
      pual: { name: "Pu'al", hebrew: 'פֻּעַל' },
      hifil: { name: "Hif'il", hebrew: 'הִפְעִיל' },
      hufal: { name: "Huf'al", hebrew: 'הֻפְעַל' },
      hitpael: { name: "Hitpa'el", hebrew: 'הִתְפַּעֵל' },
      // Aramaic
      peal: { name: "Pe'al", hebrew: 'פְּעַל' },
      pael: { name: "Pa'el", hebrew: 'פַּעֵל' },
      afel: { name: "Af'el", hebrew: 'אַפְעֵל' },
      itpeel: { name: "Itpe'el", hebrew: 'אִתְפְּעֵל' }
    }
  },
  noun: {
    name: 'Nouns',
    hebrew: 'שמות',
    icon: '📦',
    color: '#16a34a',
    subcategories: {
      maqtal: { name: 'מַקְטָל', description: 'Place/Instrument' },
      qatil: { name: 'קָטִיל', description: 'Result/State' },
      qotel: { name: 'קוֹטֵל', description: 'Agent/Actor' },
      qatlan: { name: 'קַטְלָן', description: 'Habitual Actor' },
      taqtil: { name: 'תַּקְטִיל', description: 'Abstract' }
    }
  },
  adjective: {
    name: 'Adjectives',
    hebrew: 'תארים',
    icon: '🏷️',
    color: '#f59e0b'
  },
  adverb: {
    name: 'Adverbs',
    hebrew: 'תארי פועל',
    icon: '⏱️',
    color: '#8b5cf6'
  },
  other: {
    name: 'Other Forms',
    hebrew: 'צורות אחרות',
    icon: '📝',
    color: '#6b7280'
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Single word item in the family tree
 */
const WordItem = memo(function WordItem({ word, onClick, isHighlighted }) {
  const handleClick = useCallback(() => {
    onClick?.(word.word || word.form || word);
  }, [word, onClick]);

  const displayWord = word.word || word.form || word;
  const meaning = word.meaning || word.translation || '';
  const binyan = word.binyan || word.pattern || '';
  const frequency = word.frequency || word.count || 0;

  return (
    <button
      className={`family-word-item ${isHighlighted ? 'highlighted' : ''}`}
      onClick={handleClick}
      dir="rtl"
    >
      <span className="word-text">{displayWord}</span>
      {meaning && <span className="word-meaning">{meaning}</span>}
      {binyan && <span className="word-binyan">{binyan}</span>}
      {frequency > 0 && (
        <span className="word-frequency" title={`Appears ${frequency} times`}>
          {frequency}×
        </span>
      )}
    </button>
  );
});

/**
 * Category section with collapsible content
 */
const CategorySection = memo(function CategorySection({
  category,
  config,
  words,
  onClick,
  highlightedWord,
  defaultExpanded = true
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Group by subcategory if available (hook must be before any returns)
  const groupedWords = useMemo(() => {
    if (!words || words.length === 0) return {};
    if (!config.subcategories) {
      return { all: words };
    }

    const groups = {};
    words.forEach(word => {
      const subcatKey = (word.binyan || word.pattern || 'other').toLowerCase();
      if (!groups[subcatKey]) {
        groups[subcatKey] = [];
      }
      groups[subcatKey].push(word);
    });
    return groups;
  }, [words, config.subcategories]);

  // Early return after hooks
  if (!words || words.length === 0) return null;

  return (
    <div className="family-category" style={{ '--category-color': config.color }}>
      <button
        className="category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="category-icon">{config.icon}</span>
        <span className="category-name">{config.name}</span>
        <span className="category-hebrew">{config.hebrew}</span>
        <span className="category-count">{words.length}</span>
        <span className={`category-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="category-content">
          {Object.entries(groupedWords).map(([subcatKey, subcatWords]) => {
            const subcatConfig = config.subcategories?.[subcatKey];

            if (subcatConfig && subcatWords.length > 0) {
              return (
                <div key={subcatKey} className="subcategory">
                  <div className="subcategory-header">
                    <span className="subcategory-name">{subcatConfig.name}</span>
                    {subcatConfig.hebrew && (
                      <span className="subcategory-hebrew" dir="rtl">{subcatConfig.hebrew}</span>
                    )}
                    {subcatConfig.description && (
                      <span className="subcategory-desc">{subcatConfig.description}</span>
                    )}
                  </div>
                  <div className="subcategory-words">
                    {subcatWords.map((word, i) => (
                      <WordItem
                        key={i}
                        word={word}
                        onClick={onClick}
                        isHighlighted={highlightedWord === (word.word || word.form || word)}
                      />
                    ))}
                  </div>
                </div>
              );
            }

            // No subcategory - render directly
            return (
              <div key={subcatKey} className="category-words">
                {subcatWords.map((word, i) => (
                  <WordItem
                    key={i}
                    word={word}
                    onClick={onClick}
                    isHighlighted={highlightedWord === (word.word || word.form || word)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/**
 * Tree visualization connecting root to derived words
 */
const TreeVisualization = memo(function TreeVisualization({ root, categorizedWords }) {
  const totalWords = Object.values(categorizedWords).reduce(
    (sum, words) => sum + (words?.length || 0),
    0
  );

  return (
    <div className="tree-visualization">
      <div className="tree-root">
        <span className="root-label">Root</span>
        <span className="root-text" dir="rtl">{root}</span>
        <span className="root-count">{totalWords} derived forms</span>
      </div>
      <div className="tree-branches">
        {Object.entries(categorizedWords).map(([category, words]) => {
          if (!words || words.length === 0) return null;
          const config = WORD_CATEGORIES[category];
          return (
            <div
              key={category}
              className="tree-branch"
              style={{ '--branch-color': config?.color || '#6b7280' }}
            >
              <div className="branch-line" />
              <div className="branch-label">
                <span className="branch-icon">{config?.icon || '📝'}</span>
                <span className="branch-count">{words.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * RootFamilyTree - Visualizes all words derived from a Hebrew/Aramaic root
 *
 * @param {Object} props
 * @param {string} props.root - The 3-letter Hebrew root
 * @param {string} [props.language='Hebrew'] - Language context
 * @param {string} [props.highlightWord] - Word to highlight in the tree
 * @param {Function} [props.onWordClick] - Callback when clicking a word
 * @param {boolean} [props.showVisualization=true] - Show tree visualization
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {string} [props.className=''] - Additional CSS classes
 */
function RootFamilyTree({
  root,
  language = 'Hebrew',
  highlightWord,
  onWordClick,
  showVisualization = true,
  compact = false,
  className = ''
}) {
  // PRO SCHOLAR V12: Smart root extraction for derived words like יציאות → יצא
  const cleanedRoot = useMemo(() => {
    if (!root) return null;
    // Remove nikud first
    const stripped = stripVowels(root);
    // If already 3 letters, return as-is
    if (stripped.length === 3) return stripped;

    // Try action noun pattern: יציאות → יצא
    if (stripped.endsWith('ות') && stripped.length >= 5) {
      const stem = stripped.slice(0, -2);
      if (stem.length === 4 && stem[2] === 'י') {
        return stem[0] + stem[1] + stem[3];
      }
    }
    // Try feminine singular: יציאה → יצא
    if (stripped.endsWith('ה') && stripped.length >= 4) {
      const stem = stripped.slice(0, -1);
      if (stem.length === 4 && stem[2] === 'י') {
        return stem[0] + stem[1] + stem[3];
      }
    }
    // Fall back to original
    return stripped;
  }, [root]);

  // Fetch root family from V6 service using cleaned root
  const { family: rawFamily, isLoading } = useRootFamily(cleanedRoot);

  // Normalize family to array (handles object responses like { words: [...] })
  // Uses shared utility from useProScholarV6 to avoid code duplication
  const family = useMemo(() => normalizeRootFamily(rawFamily), [rawFamily]);

  // Categorize words
  const categorizedWords = useMemo(() => {
    if (!family || family.length === 0) {
      return {};
    }

    const categories = {
      verb: [],
      noun: [],
      adjective: [],
      adverb: [],
      other: []
    };

    family.forEach(item => {
      const word = typeof item === 'string' ? { word: item } : item;
      const type = (word.type || word.category || 'other').toLowerCase();

      if (type.includes('verb') || word.binyan) {
        categories.verb.push(word);
      } else if (type.includes('noun') || word.mishkal) {
        categories.noun.push(word);
      } else if (type.includes('adj')) {
        categories.adjective.push(word);
      } else if (type.includes('adv')) {
        categories.adverb.push(word);
      } else {
        categories.other.push(word);
      }
    });

    return categories;
  }, [family]);

  // Panel class names
  const panelClassName = useMemo(
    () => `root-family-tree ${compact ? 'compact' : ''} ${className}`.trim(),
    [compact, className]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (!root) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className={`${panelClassName} loading`}>
        <div className="family-loading">
          <div className="family-spinner" />
          <span>Loading root family for {root}...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!family || family.length === 0) {
    return (
      <div className={`${panelClassName} empty`}>
        <div className="family-empty">
          <span className="empty-icon">🌱</span>
          <span className="empty-text">No derived forms found for {root}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={panelClassName}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="family-header">
        <span className="family-icon">🌳</span>
        <span className="family-title">Root Family</span>
        <span className="family-root" dir="rtl">{root}</span>
        <span className="family-count">{family.length} forms</span>
        {language && (
          <span className="family-language">{language}</span>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TREE VISUALIZATION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showVisualization && !compact && (
        <TreeVisualization root={root} categorizedWords={categorizedWords} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIZED WORD LISTS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="family-categories">
        {Object.entries(WORD_CATEGORIES).map(([category, config]) => (
          <CategorySection
            key={category}
            category={category}
            config={config}
            words={categorizedWords[category]}
            onClick={onWordClick}
            highlightedWord={highlightWord}
            defaultExpanded={!compact && categorizedWords[category]?.length > 0}
          />
        ))}
      </div>
    </div>
  );
}

RootFamilyTree.propTypes = {
  root: PropTypes.string.isRequired,
  language: PropTypes.string,
  highlightWord: PropTypes.string,
  onWordClick: PropTypes.func,
  showVisualization: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string
};

RootFamilyTree.defaultProps = {
  language: 'Hebrew',
  highlightWord: null,
  onWordClick: null,
  showVisualization: true,
  compact: false,
  className: ''
};

export default memo(RootFamilyTree);
