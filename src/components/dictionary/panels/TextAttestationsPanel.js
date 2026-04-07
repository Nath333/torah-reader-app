/**
 * TextAttestationsPanel Text References Display
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
} from '../../../hooks/usePanelData';
import './TextAttestationsPanel.css';

// =============================================================================
// SAFE IMPORTS
// =============================================================================

let getTextAttestationsAsync;
try {
  const dictionaryLoader = require('../../../services/dictionaries/dictionaryLoader');
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
    if (!ref || typeof ref !== 'string') return;

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

// Show dictionary sources even when no text refs
  const hasDictSources = attestations?.dictionarySources?.length > 0;
  const hasTextRefs = attestations?.hasTextRefs;

// Enhanced empty state with scholarly guidance
  if (!attestations || (!hasTextRefs && !hasDictSources)) {
    // Check if this was an explicit "not found" response
    if (attestations?.lookupMethod === 'not-found') {
      const searchWord = word || '';
      const sefariaSearchUrl = `https://www.sefaria.org/search?q=${encodeURIComponent(searchWord)}`;

      return (
        <div className={panelClassName}>
          <div className="tap-header">
            <div className="tap-title">
              <span className="tap-icon">📚</span>
              <span className="tap-title-text">Found in Texts</span>
            </div>
          </div>
          <div className="tap-empty">
            <span className="tap-empty-icon">📭</span>
            <span className="tap-empty-text">No indexed citations found</span>
            <span className="tap-empty-hint">Not all words have indexed Sefaria lexicon entries</span>

            {/* Scholarly suggestions */}
            <div className="tap-empty-suggestions">
              <span className="tap-suggestion-title">📖 Scholarly Notes</span>
              <div className="tap-suggestion-item">
                <span className="tap-suggestion-icon">•</span>
                <span>Common words may lack dedicated lexicon entries</span>
              </div>
              <div className="tap-suggestion-item">
                <span className="tap-suggestion-icon">•</span>
                <span>Try looking up the 3-letter root (shoresh) instead</span>
              </div>
              <div className="tap-suggestion-item">
                <span className="tap-suggestion-icon">•</span>
                <span>Check Jastrow or BDB in the Dictionary panel</span>
              </div>
            </div>

            {/* Sefaria search link */}
            <a
              href={sefariaSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-sefaria-link"
            >
              🔍 Search on Sefaria
            </a>
          </div>
        </div>
      );
    }
    return null;
  }

  // Sort categories by priority
  const sortedCategories = Object.entries(attestations.categories || {})
    .filter(([_, refs]) => refs.length > 0)
    .sort((a, b) => {
      const priorityA = CATEGORY_CONFIG[a[0]]?.priority || 99;
      const priorityB = CATEGORY_CONFIG[b[0]]?.priority || 99;
      return priorityA - priorityB;
    });

// Determine lookup source for display
  const lookupMethod = attestations?.lookupMethod || 'unknown';
  const isLocalFallback = lookupMethod === 'local-dictionaries';

  return (
    <div className={panelClassName}>
      {/* Header */}
      <div className="tap-header">
        <div className="tap-title">
          <span className="tap-icon">{hasTextRefs ? '📚' : '📖'}</span>
          <span className="tap-title-text">
            {hasTextRefs ? 'Found in Texts' : 'Dictionary Sources'}
          </span>
          {/* Show badge for local dictionaries fallback */}
          {isLocalFallback && (
            <span className="tap-local-badge" title="Found in local dictionaries">
              // Local
            </span>
          )}
          {/* Show badge for live Sefaria API */}
          {lookupMethod === 'sefaria-api-live' && (
            <span className="tap-live-badge" title="Fetched from Sefaria API">
              // Live
            </span>
          )}
          {/* Show when root fallback was used */}
          {attestations.usedRoot && (
            <span className="tap-root-badge" title={`Found via root: ${attestations.usedRoot}`}>
              via <span dir="rtl">{attestations.usedRoot}</span>
            </span>
          )}
        </div>
        {hasTextRefs ? (
          <span className="tap-total-badge" title={`${attestations.totalRefs} text references`}>
            {attestations.totalRefs} refs
          </span>
        ) : (
          <span className="tap-total-badge tap-dict-badge" title={`${attestations.dictionarySources?.length || 0} dictionary sources`}>
            {attestations.dictionarySources?.length || 0} sources
          </span>
        )}
      </div>

      {/* Enhanced Dictionary Sources with tiers and Strong's numbers */}
      {hasDictSources && (
        <div className="tap-dict-sources">
          <div className="tap-dict-header">
            <span className="tap-dict-icon">📖</span>
            <span className="tap-dict-title">Dictionary Sources:</span>
            {attestations.dictionarySources.some(s => s.tier === 'academic') && (
              <span className="tap-academic-indicator" title="Includes academic sources">🎓</span>
            )}
          </div>
          <div className="tap-dict-list">
            {attestations.dictionarySources.map((src, idx) => (
              <div
                key={idx}
                className={`tap-dict-item tap-tier-${src.tier || 'standard'}`}
                title={src.fullName || src.name}
              >
                {/* Tier badge */}
                {src.tierIcon && (
                  <span className="tap-dict-tier-icon" title={`${src.tier} source`}>
                    {src.tierIcon}
                  </span>
                )}
                <span className="tap-dict-name">{src.name}</span>
                {src.pos && <span className="tap-dict-pos">{src.pos}</span>}
                {/* Show Strong's number when available */}
                {src.strongNumber && (
                  <span className="tap-strong-number" title="Strong's Concordance Number">
                    {src.strongNumber}
                  </span>
                )}
                {src.definition && (
                  <span className="tap-dict-def">
                    {/* Show longer definitions (100 chars) */}
                    {src.definition.length > 100
                      ? src.definition.slice(0, 97) + '...'
                      : src.definition}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Categories (when we have text refs) */}
      {hasTextRefs && sortedCategories.length > 0 && (
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
      )}

      {/* Dynamic footer with correct data source */}
      <div className="tap-footer">
        <span className="tap-source">
          {isLocalFallback
            ? `Data: ${attestations.dictionarySources?.length || 0} Local Dictionaries`
            : hasTextRefs
              ? `Data: Sefaria Lexicon (${attestations.totalRefs} refs)`
              : 'Data: Scholarly Lexicons'
          }
        </span>
        {attestations.dictionarySources?.some(s => s.tier === 'academic') && (
          <span className="tap-source-academic">🎓 Academic Sources</span>
        )}
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
