/**
 * AlternativeRootsSection Component
 * Shows scholarly alternative root suggestions when etymology is uncertain
 */

import React, { useState, useMemo, memo } from 'react';

// Root extraction service
import { getAllAlternativeRoots } from '../../../services/analysis/rootExtraction';

/**
 * Alternative Roots Display
 * Shows scholarly alternative root suggestions when etymology is uncertain
 * @param {Object} props
 * @param {string} props.word - Hebrew word
 * @param {Function} [props.onRootClick] - Callback when clicking alternative root
 */
const AlternativeRootsSection = memo(function AlternativeRootsSection({ word, onRootClick }) {
  const [expanded, setExpanded] = useState(false);

  const altRoots = useMemo(() => {
    try {
      return getAllAlternativeRoots?.(word);
    } catch {
      return null;
    }
  }, [word]);

  if (!altRoots?.hasMultiple) return null;

  const typeLabels = {
    comparison: { label: 'Compare', icon: '↔️', color: '#6366f1' },
    uncertain: { label: 'Perhaps', icon: '❓', color: '#f59e0b' },
    cognate: { label: 'Cognate', icon: '🔗', color: '#10b981' },
    related: { label: 'Related', icon: '≈', color: '#8b5cf6' },
    denominative: { label: 'Denom.', icon: '📝', color: '#0891b2' },
    derivation: { label: 'From', icon: '←', color: '#059669' },
    root_symbol: { label: 'Root', icon: '√', color: '#2563eb' },
    cross_reference: { label: 'See', icon: '→', color: '#64748b' }
  };

  return (
    <div className="wic-alternative-roots">
      <button
        className="alt-roots-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="alt-roots-icon">🌿</span>
        <span className="alt-roots-title">Alternative Roots</span>
        <span className="alt-roots-count">{altRoots.alternatives.length}</span>
        <span className={`alt-roots-arrow ${expanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {altRoots.scholarlyNote && (
        <div className="alt-roots-note">
          <span className="note-icon">📚</span>
          <span className="note-text">{altRoots.scholarlyNote}</span>
        </div>
      )}

      {expanded && (
        <div className="alt-roots-content">
          {altRoots.alternatives.map((alt, i) => {
            const typeInfo = typeLabels[alt.type] || { label: alt.type, icon: '•', color: '#6b7280' };
            return (
              <div key={i} className="alt-root-item">
                <div className="alt-root-header">
                  <button
                    className="alt-root-word"
                    onClick={() => onRootClick?.(alt.root)}
                    dir="rtl"
                    style={{ borderColor: typeInfo.color }}
                  >
                    {alt.root}
                  </button>
                  <span
                    className="alt-root-type"
                    style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                  >
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                  <span className="alt-root-confidence">{alt.confidence}%</span>
                </div>
                {alt.context && (
                  <div className="alt-root-context">
                    <span className="context-source">{alt.source}:</span>
                    <span className="context-text">{alt.context}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default AlternativeRootsSection;
