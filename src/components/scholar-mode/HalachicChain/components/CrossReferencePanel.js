/**
 * CrossReferencePanel Component
 *
 * Shows related sugyot, parallel discussions, and cross-references.
 * Helps users understand the broader context of the current sugya.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { groupReferencesByType } from '../utils/crossReferenceExtractor';
import './CrossReferencePanel.css';

const CrossReferencePanel = ({ references, currentBook }) => {
  const [filterType, setFilterType] = useState('all');
  const [expandedRef, setExpandedRef] = useState(null);

  if (!references || references.length === 0) {
    return (
      <div className="cross-reference-empty" dir="rtl">
        <span className="empty-text">אין מקורות צולבים זמינים</span>
      </div>
    );
  }

  const grouped = groupReferencesByType(references);

  const filteredRefs = filterType === 'all'
    ? references
    : references.filter(ref => ref.connectionType === filterType);

  const typeLabels = {
    all: 'כל המקורות',
    commentary: 'פירושים',
    parallel: 'סוגיות מקבילות',
    reference: 'מקורות',
    quotation: 'ציטוטים',
    tractate_mention: 'מסכתות אחרות'
  };

  return (
    <div className="cross-reference-panel" dir="rtl">
      <div className="panel-header">
        <h3 className="panel-title">מקורות צולבים</h3>
        <span className="panel-count">{references.length} נמצאו</span>
      </div>

      <div className="filter-tabs">
        {Object.entries(typeLabels).map(([type, label]) => (
          <button
            key={type}
            className={`filter-tab ${filterType === type ? 'active' : ''}`}
            onClick={() => setFilterType(type)}
          >
            {label}
            {type !== 'all' && grouped[type] && (
              <span className="tab-count">{grouped[type].length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="references-list">
        {filteredRefs.map((ref, index) => (
          <ReferenceCard
            key={index}
            reference={ref}
            isExpanded={expandedRef === index}
            onToggle={() => setExpandedRef(expandedRef === index ? null : index)}
            isSameBook={ref.book === currentBook}
          />
        ))}
      </div>
    </div>
  );
};

const TYPE_LABELS_HE = {
  commentary: 'פירוש',
  parallel: 'מקביל',
  reference: 'מקור',
  quotation: 'ציטוט',
  tractate_mention: 'מסכת'
};

/**
 * Reference card component
 */
const ReferenceCard = ({ reference, isExpanded, onToggle, isSameBook }) => {
  const typeColors = {
    commentary: '#8b5cf6',
    parallel: '#10b981',
    reference: '#3b82f6',
    quotation: '#f59e0b',
    tractate_mention: '#6b7280'
  };

  const color = typeColors[reference.connectionType] || '#6b7280';
  const typeLabel = TYPE_LABELS_HE[reference.connectionType] || 'מקור';

  return (
    <div
      className={`reference-card ${isExpanded ? 'expanded' : ''} ${isSameBook ? 'same-book' : ''}`}
      style={{ '--ref-color': color }}
    >
      <div className="reference-header" onClick={onToggle}>
        <div className="reference-type-badge" style={{ backgroundColor: color }}>
          {typeLabel}
        </div>

        <div className="reference-info">
          <span className="reference-book">{reference.book}</span>
          {reference.ref && (
            <span className="reference-ref">{reference.ref}</span>
          )}
        </div>

        {isSameBook && <span className="same-book-badge">נוכחי</span>}

        <button className="expand-btn" aria-label={isExpanded ? 'סגור' : 'פתח'}>
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="reference-details">
          {reference.hebrewRef && (
            <div className="detail-row">
              <span className="detail-label">עברית:</span>
              <span className="detail-value hebrew">{reference.hebrewRef}</span>
            </div>
          )}

          {reference.snippet && (
            <div className="detail-row">
              <span className="detail-label">קטע:</span>
              <span className="detail-value snippet">{reference.snippet}</span>
            </div>
          )}

          {reference.topic && (
            <div className="detail-row">
              <span className="detail-label">נושא:</span>
              <span className="detail-value topic">{reference.topic}</span>
            </div>
          )}

          {reference.ref && (
            <div className="reference-actions">
              <a
                className="action-btn view-btn"
                href={`https://www.sefaria.org/${encodeURIComponent(reference.ref)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                צפה במקור
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CrossReferencePanel.propTypes = {
  references: PropTypes.arrayOf(PropTypes.shape({
    ref: PropTypes.string,
    hebrewRef: PropTypes.string,
    book: PropTypes.string,
    snippet: PropTypes.string,
    topic: PropTypes.string,
    connectionType: PropTypes.string
  })),
  currentBook: PropTypes.string
};

export default CrossReferencePanel;
