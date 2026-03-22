// =============================================================================
// SOURCE COMPARISON VIEW - PRO SCHOLAR V6
// Side-by-side multi-dictionary display for scholarly analysis
// =============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './SourceComparisonView.css';

// =============================================================================
// DICTIONARY SOURCE DEFINITIONS
// =============================================================================

const DICTIONARY_SOURCES = {
  JASTROW: {
    id: 'jastrow',
    name: 'Jastrow',
    fullName: 'A Dictionary of the Targumim, Talmud Babli & Yerushalmi',
    author: 'Marcus Jastrow',
    year: '1903',
    icon: '📕',
    color: '#DC2626',
    specialty: 'Rabbinic Hebrew & Aramaic',
    tier: 'primary'
  },
  BDB: {
    id: 'bdb',
    name: 'BDB',
    fullName: 'Brown-Driver-Briggs Hebrew and English Lexicon',
    author: 'Brown, Driver & Briggs',
    year: '1906',
    icon: '📗',
    color: '#16A34A',
    specialty: 'Biblical Hebrew',
    tier: 'primary'
  },
  STRONGS: {
    id: 'strongs',
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    author: 'James Strong',
    year: '1890',
    icon: '📘',
    color: '#2563EB',
    specialty: 'Concordance & Etymology',
    tier: 'secondary'
  },
  KLEIN: {
    id: 'klein',
    name: 'Klein',
    fullName: 'A Comprehensive Etymological Dictionary of the Hebrew Language',
    author: 'Ernest Klein',
    year: '1987',
    icon: '📙',
    color: '#D97706',
    specialty: 'Etymology & Cognates',
    tier: 'secondary'
  },
  HALOT: {
    id: 'halot',
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    author: 'Koehler & Baumgartner',
    year: '1994',
    icon: '📓',
    color: '#7C3AED',
    specialty: 'Modern Critical',
    tier: 'primary'
  }
};

const SOURCE_ORDER = ['JASTROW', 'BDB', 'STRONGS', 'KLEIN', 'HALOT'];

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Source Tab - Selection button for dictionary source
 */
const SourceTab = ({ sourceKey, isActive, hasData, onClick }) => {
  const source = DICTIONARY_SOURCES[sourceKey];
  if (!source) return null;

  return (
    <button
      className={`source-tab ${isActive ? 'active' : ''} ${hasData ? 'has-data' : 'no-data'}`}
      style={{ '--source-color': source.color }}
      onClick={() => onClick?.(sourceKey)}
      disabled={!hasData}
      title={hasData ? source.fullName : `${source.name}: No data available`}
    >
      <span className="tab-icon">{source.icon}</span>
      <span className="tab-name">{source.name}</span>
      {hasData && <span className="tab-indicator" />}
    </button>
  );
};

/**
 * Source Header - Shows dictionary metadata
 */
const SourceHeader = ({ sourceKey }) => {
  const source = DICTIONARY_SOURCES[sourceKey];
  if (!source) return null;

  return (
    <div className="source-header" style={{ '--source-color': source.color }}>
      <div className="header-main">
        <span className="source-icon">{source.icon}</span>
        <div className="source-info">
          <span className="source-name">{source.name}</span>
          <span className="source-specialty">{source.specialty}</span>
        </div>
      </div>
      <div className="header-meta">
        <span className="source-author">{source.author}</span>
        <span className="source-year">{source.year}</span>
      </div>
    </div>
  );
};

/**
 * Definition Entry - Single definition from a source
 */
const DefinitionEntry = ({ entry, sourceKey }) => {
  const source = DICTIONARY_SOURCES[sourceKey];

  return (
    <div className="definition-entry" style={{ '--source-color': source?.color || '#6B7280' }}>
      {entry.headword && (
        <div className="entry-headword">
          <span className="headword-text">{entry.headword}</span>
          {entry.transliteration && (
            <span className="headword-translit">{entry.transliteration}</span>
          )}
        </div>
      )}

      {entry.pos && (
        <span className="entry-pos">{entry.pos}</span>
      )}

      {entry.definitions?.length > 0 && (
        <ol className="entry-definitions">
          {entry.definitions.map((def, i) => (
            <li key={i} className="definition-item">
              {typeof def === 'string' ? def : def.gloss || def.definition || def.meaning}
            </li>
          ))}
        </ol>
      )}

      {entry.etymology && (
        <div className="entry-etymology">
          <span className="etymology-label">Etym:</span>
          <span className="etymology-text">{entry.etymology}</span>
        </div>
      )}

      {entry.cognates?.length > 0 && (
        <div className="entry-cognates">
          <span className="cognates-label">Cognates:</span>
          {entry.cognates.map((cog, i) => (
            <span key={i} className="cognate-item">
              {cog.language}: {cog.word}
            </span>
          ))}
        </div>
      )}

      {entry.references?.length > 0 && (
        <div className="entry-references">
          <span className="references-label">Refs:</span>
          <span className="references-list">
            {entry.references.slice(0, 3).join('; ')}
            {entry.references.length > 3 && ` (+${entry.references.length - 3})`}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Source Panel - Full view for one dictionary source
 */
const SourcePanel = ({ sourceKey, entries = [], isExpanded, onToggle }) => {
  const source = DICTIONARY_SOURCES[sourceKey];
  if (!source || entries.length === 0) return null;

  return (
    <div
      className={`source-panel ${isExpanded ? 'expanded' : ''}`}
      style={{ '--source-color': source.color }}
    >
      <SourceHeader sourceKey={sourceKey} />

      <div className="panel-content">
        {entries.map((entry, i) => (
          <DefinitionEntry key={i} entry={entry} sourceKey={sourceKey} />
        ))}
      </div>
    </div>
  );
};

/**
 * Comparison Grid - Side-by-side view of multiple sources
 */
const ComparisonGrid = ({ sourceData, activeSources }) => {
  const displaySources = activeSources.filter(s => sourceData[s]?.length > 0);

  if (displaySources.length === 0) {
    return (
      <div className="comparison-empty">
        <span className="empty-icon">📚</span>
        <span className="empty-text">No definitions found in selected sources</span>
      </div>
    );
  }

  return (
    <div
      className="comparison-grid"
      style={{ '--column-count': displaySources.length }}
    >
      {displaySources.map(sourceKey => (
        <SourcePanel
          key={sourceKey}
          sourceKey={sourceKey}
          entries={sourceData[sourceKey]}
          isExpanded={true}
        />
      ))}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SourceComparisonView - Multi-dictionary comparison interface
 */
const SourceComparisonView = ({
  word = '',
  root = '',
  sourceData = {},
  defaultSources = ['JASTROW', 'BDB'],
  layout = 'tabs', // 'tabs' | 'grid' | 'single'
  onSourceChange,
  onEntryClick,
  compact = false,
  className = ''
}) => {
  const [activeSource, setActiveSource] = useState(defaultSources[0] || 'JASTROW');
  const [activeSources, setActiveSources] = useState(defaultSources);
  const [currentLayout, setCurrentLayout] = useState(layout);

  // Which sources have data
  const availableSources = useMemo(() => {
    return SOURCE_ORDER.filter(key => {
      const data = sourceData[key] || sourceData[key.toLowerCase()];
      return data && data.length > 0;
    });
  }, [sourceData]);

  // Normalize source data keys
  const normalizedData = useMemo(() => {
    const result = {};
    SOURCE_ORDER.forEach(key => {
      result[key] = sourceData[key] || sourceData[key.toLowerCase()] || [];
    });
    return result;
  }, [sourceData]);

  const handleSourceClick = useCallback((sourceKey) => {
    if (currentLayout === 'grid') {
      // Toggle source in grid view
      setActiveSources(prev => {
        if (prev.includes(sourceKey)) {
          return prev.filter(s => s !== sourceKey);
        }
        return [...prev, sourceKey];
      });
    } else {
      // Switch active source in tabs/single view
      setActiveSource(sourceKey);
    }
    onSourceChange?.(sourceKey);
  }, [currentLayout, onSourceChange]);

  const toggleLayout = useCallback(() => {
    setCurrentLayout(prev => {
      if (prev === 'tabs') return 'grid';
      if (prev === 'grid') return 'single';
      return 'tabs';
    });
  }, []);

  if (availableSources.length === 0) {
    return (
      <div className={`source-comparison-view empty ${className}`}>
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <span className="empty-text">No dictionary entries found</span>
          <span className="empty-word">{word || root}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`source-comparison-view ${compact ? 'compact' : ''} ${className}`}>
      <div className="comparison-header">
        <div className="header-title">
          <span className="title-icon">📖</span>
          <span className="title-text">Dictionary Comparison</span>
          {word && <span className="title-word">{word}</span>}
        </div>

        <div className="header-controls">
          <button
            className="layout-toggle"
            onClick={toggleLayout}
            title={`Switch to ${currentLayout === 'tabs' ? 'grid' : currentLayout === 'grid' ? 'single' : 'tabs'} view`}
          >
            {currentLayout === 'tabs' ? '📑' : currentLayout === 'grid' ? '▦' : '📄'}
          </button>
          <span className="source-count">
            {availableSources.length} source{availableSources.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="source-tabs">
        {SOURCE_ORDER.map(key => (
          <SourceTab
            key={key}
            sourceKey={key}
            isActive={
              currentLayout === 'grid'
                ? activeSources.includes(key)
                : activeSource === key
            }
            hasData={availableSources.includes(key)}
            onClick={handleSourceClick}
          />
        ))}
      </div>

      {/* Content Area */}
      <div className="comparison-content">
        {currentLayout === 'grid' ? (
          <ComparisonGrid
            sourceData={normalizedData}
            activeSources={activeSources.filter(s => availableSources.includes(s))}
          />
        ) : (
          <SourcePanel
            sourceKey={activeSource}
            entries={normalizedData[activeSource]}
            isExpanded={true}
          />
        )}
      </div>
    </div>
  );
};

SourceComparisonView.propTypes = {
  word: PropTypes.string,
  root: PropTypes.string,
  sourceData: PropTypes.object,
  defaultSources: PropTypes.arrayOf(PropTypes.string),
  layout: PropTypes.oneOf(['tabs', 'grid', 'single']),
  onSourceChange: PropTypes.func,
  onEntryClick: PropTypes.func,
  compact: PropTypes.bool,
  className: PropTypes.string
};

// Export sub-components and constants
export {
  SourceTab,
  SourceHeader,
  DefinitionEntry,
  SourcePanel,
  ComparisonGrid,
  DICTIONARY_SOURCES,
  SOURCE_ORDER
};

export default React.memo(SourceComparisonView);
