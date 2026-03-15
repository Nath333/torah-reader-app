/**
 * EntitiesTab - Named entity recognition display
 */
import React, { useState, useMemo } from 'react';
import RabbiTooltip from './RabbiTooltip';

// Stable empty array to prevent useMemo dependency issues
const EMPTY_ITEMS = [];

const EntitiesTab = React.memo(({ entities, statistics }) => {
  const [activeType, setActiveType] = useState('rabbis');
  const [searchQuery, setSearchQuery] = useState('');

  const hasEntities = entities && (entities.rabbis?.length || entities.biblicalFigures?.length ||
      entities.places?.length || entities.citations?.length);

  const types = useMemo(() => {
    if (!hasEntities) return [];
    return [
      { id: 'rabbis', label: 'Rabbis', items: entities.rabbis || [], icon: '👤' },
      { id: 'biblicalFigures', label: 'Biblical', items: entities.biblicalFigures || [], icon: '📖' },
      { id: 'places', label: 'Places', items: entities.places || [], icon: '📍' },
      { id: 'citations', label: 'Citations', items: entities.citations || [], icon: '✒️' }
    ].filter(t => t.items.length > 0);
  }, [hasEntities, entities]);

  // Deduplicate and filter items
  const activeItems = types.find(t => t.id === activeType)?.items || EMPTY_ITEMS;
  const filteredItems = useMemo(() => {
    const seen = new Set();
    const query = searchQuery.toLowerCase().trim();

    return activeItems.filter(item => {
      // Deduplication
      const key = item.english || item.hebrew || item.citedText;
      if (seen.has(key)) return false;
      seen.add(key);

      // Search filter
      if (!query) return true;

      const searchable = [
        item.english,
        item.hebrew,
        item.citedText,
        item.name,
        item.period,
        item.fullMatch
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(query);
    });
  }, [activeItems, searchQuery]);

  if (!hasEntities) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">👤</span>
        <span className="empty-text">No named entities detected</span>
      </div>
    );
  }

  return (
    <div className="entities-tab">
      {/* Statistics Summary */}
      {statistics && (
        <div className="entities-stats">
          <span className="stat-item">
            <strong>{statistics.totalEntities}</strong> entities found
          </span>
          {statistics.rabbis?.unique > 0 && (
            <span className="stat-item">
              <strong>{statistics.rabbis.unique}</strong> unique rabbis
            </span>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="entity-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entities..."
          className="entity-search-input"
        />
        {searchQuery && (
          <button
            className="entity-search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Type Tabs */}
      <div className="entity-type-tabs">
        {types.map(type => (
          <button
            key={type.id}
            className={`entity-type-tab ${activeType === type.id ? 'active' : ''}`}
            onClick={() => setActiveType(type.id)}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
            <span className="type-count">{type.items.length}</span>
          </button>
        ))}
      </div>

      {/* Entity List */}
      <div className="entities-list">
        {filteredItems.length === 0 && searchQuery ? (
          <div className="no-results">
            No matches for "{searchQuery}"
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isRabbi = activeType === 'rabbis' && item.hebrew;
            const entityContent = (
              <div key={index} className={`entity-item ${isRabbi ? 'entity-rabbi' : ''}`}>
                <span className="entity-hebrew" dir="rtl">
                  {item.hebrew || item.citedText || item.fullMatch}
                </span>
                <span className="entity-english">
                  {item.english || item.name || ''}
                </span>
                {item.period && (
                  <span className={`entity-period period-${item.period}`}>
                    {item.period === 'tanna' ? 'Tanna' : item.period === 'amora' ? 'Amora' : item.period}
                  </span>
                )}
                {item.generation && (
                  <span className="entity-generation">Gen. {item.generation}</span>
                )}
                {item.category && (
                  <span className="entity-category">{item.category}</span>
                )}
                {isRabbi && <span className="entity-info-hint">ℹ️</span>}
              </div>
            );

            return isRabbi ? (
              <RabbiTooltip key={index} rabbiName={item.hebrew}>
                {entityContent}
              </RabbiTooltip>
            ) : entityContent;
          })
        )}
      </div>
    </div>
  );
});

export default EntitiesTab;
