/**
 * LexiconPanel - Enhanced Multi-Source Scholarly Dictionary Panel
 *
 * Professional Torah study component displaying Hebrew/Aramaic word definitions
 * from multiple scholarly sources with source filtering and comparison.
 *
 * Sources: BDB, Jastrow, Strong's, Klein, HALOT, Gesenius, TWOT, Steinsaltz,
 *          STEP Bible, Bolls.life, Sefaria, and more.
 */

import React, { useState, useMemo, useCallback } from 'react';
import './LexiconPanel.css';

// =============================================================================
// Source Configuration
// =============================================================================

const SOURCE_CONFIG = {
  bdb: {
    name: 'BDB',
    fullName: 'Brown-Driver-Briggs Hebrew Lexicon',
    color: '#dc2626',
    year: 1906,
    type: 'biblical',
    priority: 1
  },
  strong: {
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    color: '#d97706',
    year: 1890,
    type: 'concordance',
    priority: 2
  },
  jastrow: {
    name: 'Jastrow',
    fullName: "Jastrow's Dictionary of Targumim, Talmud",
    color: '#059669',
    year: 1903,
    type: 'rabbinic',
    priority: 3
  },
  halot: {
    name: 'HALOT',
    fullName: 'Hebrew and Aramaic Lexicon of the Old Testament',
    color: '#0d9488',
    year: 2000,
    type: 'biblical',
    priority: 4
  },
  klein: {
    name: 'Klein',
    fullName: "Klein's Etymological Dictionary",
    color: '#7c3aed',
    year: 1987,
    type: 'etymology',
    priority: 5
  },
  gesenius: {
    name: 'Gesenius',
    fullName: "Gesenius' Hebrew Grammar & Lexicon",
    color: '#be185d',
    year: 1910,
    type: 'grammar',
    priority: 6
  },
  twot: {
    name: 'TWOT',
    fullName: 'Theological Wordbook of the Old Testament',
    color: '#ea580c',
    year: 1980,
    type: 'theological',
    priority: 7
  },
  steinsaltz: {
    name: 'Steinsaltz',
    fullName: 'Steinsaltz Talmud Translation',
    color: '#0891b2',
    year: 1989,
    type: 'translation',
    priority: 8
  },
  step: {
    name: 'STEP Bible',
    fullName: 'Scripture Tools for Every Person',
    color: '#8b5cf6',
    year: 2021,
    type: 'digital',
    priority: 9
  },
  bolls: {
    name: 'Bolls.life',
    fullName: 'Bolls.life Bible Dictionary',
    color: '#6366f1',
    year: 2020,
    type: 'digital',
    priority: 10
  },
  sefaria: {
    name: 'Sefaria',
    fullName: 'Sefaria.org Digital Library',
    color: '#4f46e5',
    year: 2011,
    type: 'digital',
    priority: 11
  },
  wiktionary: {
    name: 'Wiktionary',
    fullName: 'English Wiktionary',
    color: '#3b82f6',
    year: 2024,
    type: 'digital',
    priority: 12
  },
  morfix: {
    name: 'Morfix',
    fullName: 'Morfix Hebrew-English Dictionary',
    color: '#10b981',
    year: 2024,
    type: 'digital',
    priority: 13
  },
  pealim: {
    name: 'Pealim',
    fullName: 'Pealim Hebrew Verb Conjugator',
    color: '#f97316',
    year: 2024,
    type: 'verb',
    priority: 14
  }
};

const getSourceConfig = (sourceKey) => {
  const key = sourceKey?.toLowerCase?.() || sourceKey;
  return SOURCE_CONFIG[key] || {
    name: sourceKey,
    fullName: sourceKey,
    color: '#6b7280',
    priority: 99
  };
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Source Filter Chips - Allow filtering by source
 */
const SourceFilter = React.memo(({ sources, activeFilter, onFilterChange }) => {
  if (!sources || sources.length <= 1) return null;

  return (
    <div className="lexicon-source-filter">
      <button
        className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onFilterChange('all')}
      >
        All ({sources.length})
      </button>
      {sources.slice(0, 6).map((src) => {
        const config = getSourceConfig(src.name);
        return (
          <button
            key={src.name}
            className={`filter-chip ${activeFilter === src.name ? 'active' : ''}`}
            style={{
              '--chip-color': config.color,
              borderColor: activeFilter === src.name ? config.color : 'transparent'
            }}
            onClick={() => onFilterChange(src.name)}
            title={config.fullName}
          >
            {config.name}
          </button>
        );
      })}
      {sources.length > 6 && (
        <span className="filter-more">+{sources.length - 6}</span>
      )}
    </div>
  );
});

/**
 * Source Badge with year
 */
const SourceBadge = React.memo(({ source, showYear = true }) => {
  const config = getSourceConfig(source);

  return (
    <span
      className="lexicon-source-badge"
      style={{ backgroundColor: config.color }}
      title={config.fullName}
    >
      {config.name}
      {showYear && config.year && (
        <span className="badge-year">({config.year})</span>
      )}
    </span>
  );
});

/**
 * Strong's Number Display
 */
const StrongNumber = React.memo(({ number }) => {
  if (!number) return null;

  const normalized = number.toString().toUpperCase().startsWith('H')
    ? number
    : `H${number}`;

  return (
    <a
      href={`https://www.blueletterbible.org/lexicon/${normalized.toLowerCase()}/kjv/wlc/0-1/`}
      target="_blank"
      rel="noopener noreferrer"
      className="strong-number-link"
      title="View in Blue Letter Bible"
    >
      {normalized}
    </a>
  );
});

/**
 * Morphology/Grammar Display
 */
const GrammarDisplay = React.memo(({ grammar }) => {
  if (!grammar) return null;

  const tags = [];
  if (grammar.partOfSpeech) tags.push({ label: grammar.partOfSpeech, type: 'pos' });
  if (grammar.binyan) tags.push({ label: grammar.binyan, type: 'binyan' });
  if (grammar.tense) tags.push({ label: grammar.tense, type: 'tense' });
  if (grammar.person) tags.push({ label: grammar.person, type: 'person' });
  if (grammar.gender) tags.push({ label: grammar.gender === 'masculine' ? '♂' : grammar.gender === 'feminine' ? '♀' : grammar.gender, type: 'gender' });
  if (grammar.number) tags.push({ label: grammar.number, type: 'number' });
  if (grammar.state) tags.push({ label: grammar.state, type: 'state' });

  if (tags.length === 0) return null;

  return (
    <div className="lexicon-grammar">
      {tags.map((tag, idx) => (
        <span key={idx} className={`grammar-tag ${tag.type}`}>
          {tag.label}
        </span>
      ))}
    </div>
  );
});

/**
 * Root and Etymology Display
 */
const RootDisplay = React.memo(({ root, headword, word, cognates }) => {
  const hasContent = root || (headword && headword !== word) || cognates?.length > 0;
  if (!hasContent) return null;

  return (
    <div className="lexicon-root-info">
      {root && (
        <div className="root-item">
          <span className="root-label">שורש (Root):</span>
          <span className="root-value hebrew">{root}</span>
        </div>
      )}
      {headword && headword !== word && headword !== root && (
        <div className="root-item">
          <span className="root-label">Lemma:</span>
          <span className="root-value hebrew">{headword}</span>
        </div>
      )}
      {cognates && cognates.length > 0 && (
        <div className="root-item cognates">
          <span className="root-label">Cognates:</span>
          <span className="root-value">{cognates.slice(0, 3).join(', ')}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Single Definition Entry
 */
const DefinitionEntry = React.memo(({ source, definition, strongNumber, showFrench, frenchTranslation }) => {
  return (
    <div className="lexicon-definition-entry">
      <div className="def-header">
        <SourceBadge source={source} showYear={true} />
        {strongNumber && <StrongNumber number={strongNumber} />}
      </div>
      <div className="def-content">
        <span className="def-lang-indicator">🇬🇧</span>
        <span className="def-text">{definition}</span>
      </div>
      {showFrench && frenchTranslation && (
        <div className="def-french">
          <span className="def-lang-indicator">🇫🇷</span>
          <span className="def-text">{frenchTranslation}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Definitions List - Shows all definitions from sources
 */
const DefinitionsList = React.memo(({ sources, activeFilter, showFrench, frenchTranslation }) => {
  // Filter and sort sources
  const filteredSources = useMemo(() => {
    let filtered = sources || [];

    // Apply filter
    if (activeFilter && activeFilter !== 'all') {
      filtered = filtered.filter(s => s.name === activeFilter);
    }

    // Sort by priority
    return filtered.sort((a, b) => {
      const configA = getSourceConfig(a.name);
      const configB = getSourceConfig(b.name);
      return (configA.priority || 99) - (configB.priority || 99);
    });
  }, [sources, activeFilter]);

  if (filteredSources.length === 0) {
    return <div className="no-definitions">No definitions available</div>;
  }

  return (
    <div className="lexicon-definitions-list">
      {filteredSources.map((src, idx) => (
        <DefinitionEntry
          key={`${src.name}-${idx}`}
          source={src.name}
          definition={src.definition}
          strongNumber={src.strongNumber}
          showFrench={showFrench && idx === 0}
          frenchTranslation={frenchTranslation}
        />
      ))}
    </div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

/**
 * LexiconPanel - Enhanced scholarly dictionary panel
 *
 * @param {Object} props
 * @param {string} props.word - The Hebrew/Aramaic word
 * @param {Object} props.data - Translation data from scholarly lookup
 * @param {boolean} props.isLoading - Loading state
 * @param {boolean} props.showFrench - Show French translations
 * @param {string} props.variant - 'tooltip' | 'panel' | 'compact'
 * @param {Function} props.onSave - Save word to vocabulary
 * @param {boolean} props.isSaved - Word is already saved
 * @param {Function} props.onClose - Close panel callback
 */
const LexiconPanel = ({
  word,
  data,
  isLoading = false,
  showFrench = false,
  variant = 'panel',
  onSave,
  isSaved = false,
  onClose
}) => {
  const [activeFilter, setActiveFilter] = useState('all');

  // Extract data - memoize sources to avoid dependency issues
  const translation = data?.english || data?.translation || data?.primaryDefinition;
  const french = data?.french;
  const sources = useMemo(() => data?.sources || [], [data?.sources]);
  const root = data?.root;
  const headword = data?.headword;
  const grammar = data?.morphology || data?.grammar;
  const cognates = data?.cognates?.cognates || data?.cognates;
  const language = data?.language || 'Hebrew';

  // Get Strong's number from any source
  const strongNumber = useMemo(() => {
    return sources.find(s => s.strongNumber)?.strongNumber || data?.strongNumber;
  }, [sources, data?.strongNumber]);

  // Handle filter change
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave && translation) {
      onSave(word, translation, french);
    }
  }, [onSave, word, translation, french]);

  // Determine variant class
  const panelClass = `lexicon-panel lexicon-${variant} ${language.toLowerCase() === 'aramaic' ? 'aramaic' : 'hebrew'}`;

  return (
    <div className={panelClass}>
      {/* Header */}
      <div className="lexicon-header">
        <div className="lexicon-word-section">
          <span className="lexicon-word">{word}</span>
          <span className={`lexicon-lang-badge ${language.toLowerCase()}`}>
            {language === 'Aramaic' ? 'ארמית' : 'עברית'}
          </span>
          {strongNumber && <StrongNumber number={strongNumber} />}
        </div>
        {onClose && (
          <button className="lexicon-close" onClick={onClose} aria-label="Close">×</button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && !translation && (
        <div className="lexicon-loading">
          <span className="loading-spinner"></span>
          <span>Searching scholarly sources...</span>
        </div>
      )}

      {/* Content */}
      {translation && (
        <>
          {/* Root/Etymology Section */}
          <RootDisplay
            root={root}
            headword={headword}
            word={word}
            cognates={cognates}
          />

          {/* Grammar Section */}
          <GrammarDisplay grammar={grammar} />

          {/* Primary Translation (quick view) */}
          {variant === 'compact' && (
            <div className="lexicon-quick-translation">
              <span className="quick-def">{translation}</span>
              {showFrench && french && (
                <span className="quick-french">🇫🇷 {french}</span>
              )}
            </div>
          )}

          {/* Source Filter */}
          {variant !== 'compact' && (
            <SourceFilter
              sources={sources}
              activeFilter={activeFilter}
              onFilterChange={handleFilterChange}
            />
          )}

          {/* Definitions from all sources */}
          {variant !== 'compact' && (
            <DefinitionsList
              sources={sources}
              activeFilter={activeFilter}
              showFrench={showFrench}
              frenchTranslation={french}
            />
          )}

          {/* Source count badge (compact view) */}
          {variant === 'compact' && sources.length > 0 && (
            <div className="lexicon-source-count">
              {sources.slice(0, 4).map((src, idx) => (
                <SourceBadge key={idx} source={src.name} showYear={false} />
              ))}
              {sources.length > 4 && (
                <span className="source-more">+{sources.length - 4}</span>
              )}
            </div>
          )}
        </>
      )}

      {/* No Translation */}
      {!translation && !isLoading && (
        <div className="lexicon-no-result">
          <span>No translation found for "{word}"</span>
        </div>
      )}

      {/* Footer Actions */}
      {translation && (onSave || isSaved) && (
        <div className="lexicon-footer">
          {isSaved ? (
            <span className="lexicon-saved-badge">✓ Saved to Vocabulary</span>
          ) : (
            <button className="lexicon-save-btn" onClick={handleSave}>
              + Save to Vocabulary
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(LexiconPanel);
