/**
 * TextAttestationsPanel - PRO SCHOLAR V20 Text References Display
 *
 * Shows WHERE a word appears in Jewish texts:
 * - Babylonian Talmud (Bavli)
 * - Jerusalem Talmud (Yerushalmi)
 * - Mishnah
 * - Tosefta
 * - Midrash (Rabbah, Sifra, Sifrei, etc.)
 * - Targum
 * - Tanakh
 *
 * Data source: Sefaria Lexicon Cache (2,493 words → ~16,000 text references)
 *
 * @module TextAttestationsPanel
 */

import React, { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  usePanelData,
  useSetToggle,
  buildPanelClassName,
  renderPanelLoading,
  renderPanelError
} from '../../hooks/usePanelData';
import './TextAttestationsPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

let getTextAttestationsAsync;
try {
  const dictionaryLoader = require('../../services/dictionaryLoader');
  getTextAttestationsAsync = dictionaryLoader.getTextAttestationsAsync;
} catch (e) {
  console.debug('[TextAttestationsPanel] dictionaryLoader not available:', e.message);
  getTextAttestationsAsync = async () => null;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CATEGORY_CONFIG = {
  bavli: {
    name: 'Talmud Bavli',
    icon: '📜',
    description: 'Babylonian Talmud',
    color: '#2563eb',
    priority: 1
  },
  yerushalmi: {
    name: 'Talmud Yerushalmi',
    icon: '📖',
    description: 'Jerusalem Talmud',
    color: '#7c3aed',
    priority: 2
  },
  mishnah: {
    name: 'Mishnah',
    icon: '📚',
    description: 'Oral Law compilation',
    color: '#059669',
    priority: 3
  },
  tosefta: {
    name: 'Tosefta',
    icon: '📑',
    description: 'Tannaitic supplement',
    color: '#0d9488',
    priority: 4
  },
  midrash: {
    name: 'Midrash',
    icon: '💬',
    description: 'Homiletical texts',
    color: '#d97706',
    priority: 5
  },
  targum: {
    name: 'Targum',
    icon: '🔄',
    description: 'Aramaic translations',
    color: '#dc2626',
    priority: 6
  },
  tanakh: {
    name: 'Tanakh',
    icon: '✡️',
    description: 'Hebrew Bible',
    color: '#ca8a04',
    priority: 7
  },
  other: {
    name: 'Other',
    icon: '📋',
    description: 'Other sources',
    color: '#6b7280',
    priority: 8
  }
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/**
 * Single text reference chip (clickable)
 */
const RefChip = memo(function RefChip({ textRef, category, onSelect }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(textRef);
    }
  }, [textRef, onSelect]);

  return (
    <button
      className="tap-ref-chip"
      onClick={handleClick}
      title={`View ${textRef} on Sefaria`}
      style={{ '--chip-color': config.color }}
    >
      <span className="tap-ref-text">{textRef}</span>
    </button>
  );
});

RefChip.propTypes = {
  textRef: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  onSelect: PropTypes.func
};

/**
 * Category section with refs
 */
const CategorySection = memo(function CategorySection({
  category,
  refs,
  expanded,
  onToggle,
  onSelectRef,
  maxVisible = 5
}) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const hasMore = refs.length > maxVisible;
  const visibleRefs = expanded ? refs : refs.slice(0, maxVisible);

  if (refs.length === 0) return null;

  return (
    <div className="tap-category" style={{ '--category-color': config.color }}>
      <div className="tap-category-header" onClick={onToggle}>
        <span className="tap-category-icon">{config.icon}</span>
        <span className="tap-category-name">{config.name}</span>
        <span className="tap-category-count">{refs.length}</span>
        {hasMore && (
          <span className="tap-expand-indicator">
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      <div className="tap-refs-list">
        {visibleRefs.map((textRef, idx) => (
          <RefChip
            key={`${textRef}-${idx}`}
            textRef={textRef}
            category={category}
            onSelect={onSelectRef}
          />
        ))}
        {!expanded && hasMore && (
          <button className="tap-show-more" onClick={onToggle}>
            +{refs.length - maxVisible} more
          </button>
        )}
      </div>
    </div>
  );
});

CategorySection.propTypes = {
  category: PropTypes.string.isRequired,
  refs: PropTypes.arrayOf(PropTypes.string).isRequired,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func,
  onSelectRef: PropTypes.func,
  maxVisible: PropTypes.number
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * TextAttestationsPanel - Shows where a word appears in Jewish texts
 *
 * @param {Object} props
 * @param {string} props.word - Hebrew/Aramaic word to look up
 * @param {Function} [props.onSelectRef] - Callback when user clicks a reference
 * @param {boolean} [props.compact=false] - Use compact layout
 * @param {boolean} [props.dark=false] - Use dark mode
 * @param {string} [props.className=''] - Additional CSS classes
 */
function TextAttestationsPanel({
  word,
  onSelectRef,
  compact = false,
  dark = false,
  className = ''
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const toggleCategory = useSetToggle(setExpandedCategories);

  // Use shared hook for data loading
  const { data: attestations, loading, error } = usePanelData(
    getTextAttestationsAsync,
    word,
    { panelName: 'TextAttestationsPanel' }
  );

  // Handle reference selection
  const handleSelectRef = useCallback((ref) => {
    if (onSelectRef) {
      onSelectRef(ref);
    } else {
      // Default: open in Sefaria
      const sefariaUrl = `https://www.sefaria.org/${encodeURIComponent(ref.replace(/ /g, '_'))}`;
      window.open(sefariaUrl, '_blank', 'noopener,noreferrer');
    }
  }, [onSelectRef]);

  // Build panel className
  const panelClassName = buildPanelClassName('text-attestations-panel', { compact, dark, className });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return renderPanelLoading(panelClassName, 'tap', 'Loading text references...');
  }

  if (error) {
    return renderPanelError(panelClassName, 'tap', 'Could not load references');
  }

  if (!attestations || attestations.totalRefs === 0) {
    return null;
  }

  // Sort categories by priority
  const sortedCategories = Object.entries(attestations.categories)
    .filter(([_, refs]) => refs.length > 0)
    .sort((a, b) => {
      const priorityA = CATEGORY_CONFIG[a[0]]?.priority || 99;
      const priorityB = CATEGORY_CONFIG[b[0]]?.priority || 99;
      return priorityA - priorityB;
    });

  return (
    <div className={panelClassName}>
      {/* Header */}
      <div className="tap-header">
        <div className="tap-title">
          <span className="tap-icon">📚</span>
          <span className="tap-title-text">Found in Texts</span>
        </div>
        <span className="tap-total-badge" title={`${attestations.totalRefs} text references`}>
          {attestations.totalRefs} refs
        </span>
      </div>

      {/* Categories */}
      <div className="tap-categories">
        {sortedCategories.map(([category, refs]) => (
          <CategorySection
            key={category}
            category={category}
            refs={refs}
            expanded={expandedCategories.has(category)}
            onToggle={() => toggleCategory(category)}
            onSelectRef={handleSelectRef}
            maxVisible={compact ? 3 : 5}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="tap-footer">
        <span className="tap-source">Data: Sefaria Lexicon</span>
      </div>
    </div>
  );
}

TextAttestationsPanel.propTypes = {
  word: PropTypes.string,
  onSelectRef: PropTypes.func,
  compact: PropTypes.bool,
  dark: PropTypes.bool,
  className: PropTypes.string
};

export default memo(TextAttestationsPanel);
