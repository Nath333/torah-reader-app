/**
 * RabbinicReferences.js - Torah to Rabbinic Literature Cross-References
 *
 * Displays cross-references between Torah verses and:
 * - Talmud Bavli/Yerushalmi
 * - Midrash Rabbah/Tanchuma
 * - Halakhic Midrashim (Mechilta, Sifra, Sifrei)
 * - Zohar and Kabbalistic sources
 * - Rashi's Talmudic sources
 */

import React, { useState, useMemo } from 'react';
import {
  getReferencesForVerse,
  getRelatedVerses,
  getSefariaUrl,
  REFERENCE_CATEGORIES,
  TOPIC_CATEGORIES
} from '../../services/rabbinicReferencesService';
import './RabbinicReferences.css';

const RabbinicReferences = ({ book, chapter, verse, onVerseClick }) => {
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterTopic, setFilterTopic] = useState(null);
  const [expandedRef, setExpandedRef] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'category' | 'topic'

  const reference = useMemo(() => `${book}.${chapter}.${verse}`, [book, chapter, verse]);

  // Get references for this verse
  const refData = useMemo(() => getReferencesForVerse(reference), [reference]);

  // Get related verses
  const relatedVerses = useMemo(() => getRelatedVerses(reference), [reference]);

  // Filter references based on active filters
  const filteredRefs = useMemo(() => {
    let refs = refData.references || [];

    if (filterCategory) {
      refs = refs.filter(r => r.category === filterCategory);
    }
    if (filterTopic) {
      refs = refs.filter(r => r.topic === filterTopic);
    }

    return refs;
  }, [refData.references, filterCategory, filterTopic]);

  // Get reference card color
  const getCategoryColor = (category) => {
    const colors = {
      TALMUD_BAVLI: '#3b82f6',
      TALMUD_YERUSHALMI: '#06b6d4',
      MIDRASH_RABBAH: '#f59e0b',
      MIDRASH_TANCHUMA: '#eab308',
      MECHILTA: '#10b981',
      SIFRA: '#14b8a6',
      SIFREI: '#0d9488',
      ZOHAR: '#8b5cf6',
      RASHI_SOURCE: '#ec4899'
    };
    return colors[category] || '#6b7280';
  };

  // Get topic badge color
  const getTopicColor = (topic) => {
    const colors = {
      HALAKHA: '#dc2626',
      AGGADAH: '#f97316',
      MUSSAR: '#a855f7',
      KABBALAH: '#6366f1',
      HISTORY: '#84cc16',
      PHILOSOPHY: '#0ea5e9'
    };
    return colors[topic] || '#6b7280';
  };

  if (!refData.hasReferences) {
    return (
      <div className="rabbinic-references empty">
        <div className="empty-icon">📚</div>
        <p>No rabbinic references found for {book} {chapter}:{verse}</p>
        <p className="empty-note">
          This verse may not have documented cross-references in our database.
          Try selecting a different verse.
        </p>
      </div>
    );
  }

  return (
    <div className="rabbinic-references">
      {/* Header */}
      <div className="rr-header">
        <div className="rr-header-title">
          <span className="rr-icon">📚</span>
          <h4>Rabbinic References</h4>
          <span className="rr-count">{refData.count} sources</span>
        </div>

        <div className="rr-view-toggle">
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            📋
          </button>
          <button
            className={`view-btn ${viewMode === 'category' ? 'active' : ''}`}
            onClick={() => setViewMode('category')}
            title="By category"
          >
            📚
          </button>
          <button
            className={`view-btn ${viewMode === 'topic' ? 'active' : ''}`}
            onClick={() => setViewMode('topic')}
            title="By topic"
          >
            🏷️
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rr-filters">
        <div className="filter-section">
          <span className="filter-label">Source:</span>
          <div className="filter-chips">
            <button
              className={`filter-chip ${!filterCategory ? 'active' : ''}`}
              onClick={() => setFilterCategory(null)}
            >
              All
            </button>
            {refData.categories?.map(cat => (
              <button
                key={cat}
                className={`filter-chip ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
                style={{ '--chip-color': getCategoryColor(cat) }}
              >
                {REFERENCE_CATEGORIES[cat]?.icon} {REFERENCE_CATEGORIES[cat]?.name}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-label">Topic:</span>
          <div className="filter-chips">
            <button
              className={`filter-chip ${!filterTopic ? 'active' : ''}`}
              onClick={() => setFilterTopic(null)}
            >
              All
            </button>
            {refData.topics?.map(topic => (
              <button
                key={topic}
                className={`filter-chip ${filterTopic === topic ? 'active' : ''}`}
                onClick={() => setFilterTopic(topic)}
                style={{ '--chip-color': getTopicColor(topic) }}
              >
                {TOPIC_CATEGORIES[topic]?.icon} {TOPIC_CATEGORIES[topic]?.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reference List */}
      <div className="rr-content">
        {viewMode === 'list' && (
          <div className="rr-list">
            {filteredRefs.map((ref, idx) => (
              <ReferenceCard
                key={idx}
                ref={ref}
                index={idx}
                isExpanded={expandedRef === idx}
                onToggle={() => setExpandedRef(expandedRef === idx ? null : idx)}
                getCategoryColor={getCategoryColor}
                getTopicColor={getTopicColor}
              />
            ))}
          </div>
        )}

        {viewMode === 'category' && (
          <div className="rr-grouped">
            {Object.entries(refData.byCategory).map(([cat, refs]) => (
              <div key={cat} className="rr-group">
                <div
                  className="group-header"
                  style={{ borderLeftColor: getCategoryColor(cat) }}
                >
                  <span className="group-icon">{REFERENCE_CATEGORIES[cat]?.icon}</span>
                  <span className="group-name">{REFERENCE_CATEGORIES[cat]?.name}</span>
                  <span className="group-count">{refs.length}</span>
                </div>
                <div className="group-items">
                  {refs
                    .filter(r => !filterTopic || r.topic === filterTopic)
                    .map((ref, idx) => (
                      <ReferenceCard
                        key={idx}
                        ref={ref}
                        index={`${cat}-${idx}`}
                        isExpanded={expandedRef === `${cat}-${idx}`}
                        onToggle={() => setExpandedRef(expandedRef === `${cat}-${idx}` ? null : `${cat}-${idx}`)}
                        getCategoryColor={getCategoryColor}
                        getTopicColor={getTopicColor}
                        compact
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'topic' && (
          <div className="rr-grouped">
            {Object.entries(refData.byTopic).map(([topic, refs]) => (
              <div key={topic} className="rr-group">
                <div
                  className="group-header"
                  style={{ borderLeftColor: getTopicColor(topic) }}
                >
                  <span className="group-icon">{TOPIC_CATEGORIES[topic]?.icon}</span>
                  <span className="group-name">{TOPIC_CATEGORIES[topic]?.name}</span>
                  <span className="group-count">{refs.length}</span>
                </div>
                <div className="group-items">
                  {refs
                    .filter(r => !filterCategory || r.category === filterCategory)
                    .map((ref, idx) => (
                      <ReferenceCard
                        key={idx}
                        ref={ref}
                        index={`${topic}-${idx}`}
                        isExpanded={expandedRef === `${topic}-${idx}`}
                        onToggle={() => setExpandedRef(expandedRef === `${topic}-${idx}` ? null : `${topic}-${idx}`)}
                        getCategoryColor={getCategoryColor}
                        getTopicColor={getTopicColor}
                        compact
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Verses */}
      {relatedVerses.length > 0 && (
        <div className="rr-related">
          <div className="related-header">
            <span className="related-icon">🔗</span>
            <span className="related-title">Related Verses</span>
          </div>
          <div className="related-verses">
            {relatedVerses.slice(0, 5).map((v, idx) => (
              <button
                key={idx}
                className="related-verse-btn"
                onClick={() => onVerseClick?.(v)}
                title={`View ${v}`}
              >
                {v}
              </button>
            ))}
            {relatedVerses.length > 5 && (
              <span className="related-more">+{relatedVerses.length - 5} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Reference Card Component
const ReferenceCard = ({
  ref,
  index,
  isExpanded,
  onToggle,
  getCategoryColor,
  getTopicColor,
  compact = false
}) => {
  const categoryInfo = REFERENCE_CATEGORIES[ref.category];
  const topicInfo = TOPIC_CATEGORIES[ref.topic];

  return (
    <div
      className={`ref-card ${isExpanded ? 'expanded' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--card-color': getCategoryColor(ref.category) }}
      onClick={onToggle}
    >
      <div className="ref-card-header">
        <div className="ref-source">
          {!compact && <span className="ref-source-icon">{categoryInfo?.icon}</span>}
          <span className="ref-source-name">{ref.reference}</span>
        </div>
        <div className="ref-badges">
          <span
            className="ref-topic-badge"
            style={{ '--badge-color': getTopicColor(ref.topic) }}
          >
            {topicInfo?.icon} {topicInfo?.name}
          </span>
          {ref.relevance === 'high' && (
            <span className="ref-relevance-badge">Key Source</span>
          )}
        </div>
      </div>

      <div className="ref-card-summary">
        {ref.summary}
      </div>

      {isExpanded && (
        <div className="ref-card-expanded">
          {ref.quote && (
            <div className="ref-quote">
              <div className="ref-quote-hebrew" dir="rtl">{ref.quote}</div>
              {ref.translation && (
                <div className="ref-quote-translation">{ref.translation}</div>
              )}
            </div>
          )}

          <div className="ref-actions">
            <a
              href={getSefariaUrl(ref.reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="ref-action-btn sefaria"
              onClick={(e) => e.stopPropagation()}
            >
              📖 View on Sefaria
            </a>
          </div>
        </div>
      )}

      <div className="ref-card-expand-indicator">
        {isExpanded ? '▲' : '▼'}
      </div>
    </div>
  );
};

export default RabbinicReferences;
