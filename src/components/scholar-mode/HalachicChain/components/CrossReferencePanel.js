/**
 * CrossReferencePanel Component
 * 
 * Shows related sugyot, parallel discussions, and cross-references.
 * Helps users understand the broader context of the current sugya.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { groupReferencesByType, filterReferencesByBook } from '../utils/crossReferenceExtractor';
import './CrossReferencePanel.css';

const CrossReferencePanel = ({ references, currentBook }) => {
  const [filterType, setFilterType] = useState('all');
  const [expandedRef, setExpandedRef] = useState(null);

  if (!references || references.length === 0) {
    return (
      <div className="cross-reference-empty">
        <span className="empty-icon">🔗</span>
        <span className="empty-text">No cross-references available</span>
      </div>
    );
  }

  // Group by type
  const grouped = groupReferencesByType(references);
  
  // Filter
  const filteredRefs = filterType === 'all' 
    ? references 
    : references.filter(ref => ref.connectionType === filterType);

  const typeLabels = {
    all: 'All References',
    commentary: 'Commentaries',
    parallel: 'Parallel Sugyot',
    reference: 'References',
    quotation: 'Quotations',
    tractate_mention: 'Other Tractates'
  };

  return (
    <div className="cross-reference-panel">
      <div className="panel-header">
        <h3 className="panel-title">Cross References</h3>
        <span className="panel-count">{references.length} found</span>
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

  return (
    <div 
      className={`reference-card ${isExpanded ? 'expanded' : ''} ${isSameBook ? 'same-book' : ''}`}
      style={{ '--ref-color': color }}
    >
      <div className="reference-header" onClick={onToggle}>
        <div className="reference-type-badge" style={{ backgroundColor: color }}>
          {getTypeIcon(reference.connectionType)}
        </div>
        
        <div className="reference-info">
          <span className="reference-book">{reference.book}</span>
          {reference.ref && (
            <span className="reference-ref">{reference.ref}</span>
          )}
        </div>

        {isSameBook && <span className="same-book-badge">Current</span>}

        <button className="expand-btn">
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="reference-details">
          {reference.hebrewRef && (
            <div className="detail-row">
              <span className="detail-label">Hebrew:</span>
              <span className="detail-value hebrew">{reference.hebrewRef}</span>
            </div>
          )}
          
          {reference.snippet && (
            <div className="detail-row">
              <span className="detail-label">Excerpt:</span>
              <span className="detail-value snippet">{reference.snippet}</span>
            </div>
          )}

          {reference.topic && (
            <div className="detail-row">
              <span className="detail-label">Topic:</span>
              <span className="detail-value topic">{reference.topic}</span>
            </div>
          )}

          <div className="reference-actions">
            <button className="action-btn view-btn">
              View Source
            </button>
            <button className="action-btn compare-btn">
              Compare
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get icon for reference type
 */
const getTypeIcon = (type) => {
  const icons = {
    commentary: '💬',
    parallel: '⇄',
    reference: '→',
    quotation: '"',
    tractate_mention: '📚'
  };
  return icons[type] || '•';
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
