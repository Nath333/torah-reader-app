// =============================================================================
// Scholarly Source Indicator Component
// Shows which dictionary sources found a word with visual indicators
// =============================================================================

import React from 'react';
import './ScholarlySourceIndicator.css';

// Source metadata with colors and descriptions
const SOURCE_META = {
  'BDB': {
    fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
    year: 1906,
    color: '#2196f3',
    icon: 'B',
    type: 'biblical',
    description: 'Standard academic Hebrew lexicon'
  },
  "Strong's": {
    fullName: "Strong's Exhaustive Concordance",
    year: 1890,
    color: '#4caf50',
    icon: 'S',
    type: 'concordance',
    description: 'Biblical concordance with numbering system'
  },
  'Jastrow': {
    fullName: "Jastrow's Dictionary of Targumim & Talmud",
    year: 1903,
    color: '#ff9800',
    icon: 'J',
    type: 'rabbinic',
    description: 'Aramaic and Rabbinic Hebrew'
  },
  'Klein': {
    fullName: "Klein's Etymological Dictionary",
    year: 1987,
    color: '#9c27b0',
    icon: 'K',
    type: 'etymology',
    description: 'Hebrew word origins and cognates'
  },
  'BDB Aramaic': {
    fullName: 'BDB Aramaic Section',
    year: 1906,
    color: '#00bcd4',
    icon: 'A',
    type: 'aramaic',
    description: 'Biblical Aramaic vocabulary'
  },
  'Steinsaltz': {
    fullName: 'Steinsaltz Talmud Dictionary',
    year: 1989,
    color: '#795548',
    icon: 'St',
    type: 'talmudic',
    description: 'Modern Talmudic explanations'
  },
  'HALOT': {
    fullName: 'Hebrew & Aramaic Lexicon of OT',
    year: 2000,
    color: '#607d8b',
    icon: 'H',
    type: 'academic',
    description: 'Modern scholarly lexicon'
  },
  'Sefaria': {
    fullName: 'Sefaria Lexicon',
    year: 2023,
    color: '#3f51b5',
    icon: 'Sf',
    type: 'digital',
    description: 'Digital library integration'
  },
  'Bolls.life': {
    fullName: 'Bolls.life Bible Dictionary',
    year: 2020,
    color: '#e91e63',
    icon: 'Bl',
    type: 'digital',
    description: 'Online BDB integration'
  }
};

// All known sources for showing "not found" status
const ALL_SOURCES = ['BDB', "Strong's", 'Jastrow', 'Klein'];

/**
 * Display scholarly source indicators for a word lookup result
 */
const ScholarlySourceIndicator = ({
  sources = [],
  showMissing = true,
  compact = false,
  showDefinitions = false
}) => {
  // Build a map of found sources
  const foundSources = new Map();
  sources.forEach(src => {
    const name = src.name || src.fullName?.split(' ')[0] || 'Unknown';
    foundSources.set(name, src);
  });

  // Determine which sources to show
  const sourcesToShow = showMissing
    ? ALL_SOURCES
    : Array.from(foundSources.keys());

  if (compact) {
    // Compact badge row
    return (
      <div className="source-indicator-compact">
        {sourcesToShow.map(sourceName => {
          const found = foundSources.has(sourceName);
          const meta = SOURCE_META[sourceName] || { color: '#999', icon: sourceName[0] };
          const sourceData = foundSources.get(sourceName);

          return (
            <span
              key={sourceName}
              className={`source-badge ${found ? 'source-found' : 'source-missing'}`}
              style={{ '--source-color': meta.color }}
              title={found
                ? `${meta.fullName || sourceName}: "${sourceData?.definition?.substring(0, 50)}..."`
                : `${meta.fullName || sourceName}: Not found`
              }
            >
              {meta.icon}
            </span>
          );
        })}
      </div>
    );
  }

  // Full list view
  return (
    <div className="source-indicator-list">
      <div className="source-indicator-header">
        <span className="source-indicator-title">Sources</span>
        <span className="source-indicator-count">
          {foundSources.size}/{sourcesToShow.length} found
        </span>
      </div>

      <div className="source-indicator-items">
        {sourcesToShow.map(sourceName => {
          const found = foundSources.has(sourceName);
          const meta = SOURCE_META[sourceName] || { color: '#999', icon: sourceName[0] };
          const sourceData = foundSources.get(sourceName);

          return (
            <div
              key={sourceName}
              className={`source-item ${found ? 'source-found' : 'source-missing'}`}
            >
              <span
                className="source-status-icon"
                style={{ '--source-color': meta.color }}
              >
                {found ? '✓' : '✗'}
              </span>

              <span className="source-name">
                <strong>{sourceName}</strong>
                {meta.year && <span className="source-year">({meta.year})</span>}
              </span>

              {found && sourceData?.strongNumber && (
                <span className="source-strong-num">{sourceData.strongNumber}</span>
              )}

              {showDefinitions && found && sourceData?.definition && (
                <span className="source-definition">
                  "{sourceData.definition.substring(0, 60)}
                  {sourceData.definition.length > 60 ? '...' : ''}"
                </span>
              )}

              {!found && (
                <span className="source-not-found-reason">
                  {meta.type === 'rabbinic' ? '(Biblical word)' :
                   meta.type === 'biblical' ? '(Aramaic word?)' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Show additional sources not in the main list */}
      {sources.filter(s => !ALL_SOURCES.includes(s.name)).length > 0 && (
        <div className="source-additional">
          <span className="source-additional-label">Also found in:</span>
          {sources.filter(s => !ALL_SOURCES.includes(s.name)).map((src, i) => (
            <span key={i} className="source-additional-item">
              {src.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Simple inline source badge
 */
export const SourceBadge = ({ source, found = true }) => {
  const meta = SOURCE_META[source] || { color: '#999', icon: source?.[0] || '?' };

  return (
    <span
      className={`source-badge-inline ${found ? 'found' : 'missing'}`}
      style={{ '--source-color': meta.color }}
      title={meta.fullName || source}
    >
      {meta.icon}
    </span>
  );
};

export default ScholarlySourceIndicator;
