// =============================================================================
// CITATION HIGHLIGHTER - PRO SCHOLAR V6
// Detects and highlights Talmudic citation patterns in text
// =============================================================================

import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import './CitationHighlighter.css';

// PRO SCHOLAR V8: Citation pattern detection (renamed from unifiedRootService)
import { detectCitations } from '../../services/rootExtraction';

// =============================================================================
// CITATION TYPE CONFIGURATIONS
// =============================================================================

const CITATION_TYPES = {
  scripture: {
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: '📖',
    label: 'Scripture',
    description: 'Biblical verse citation'
  },
  mishnah: {
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: '📜',
    label: 'Mishnah',
    description: 'Mishnaic teaching'
  },
  baraita: {
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    icon: '📋',
    label: 'Baraita',
    description: 'External tannaitic teaching'
  },
  amoraic: {
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: '💬',
    label: 'Amoraic',
    description: 'Statement by an Amora'
  },
  logical: {
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    icon: '🔗',
    label: 'Logical',
    description: 'Logical inference formula'
  },
  default: {
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: '📌',
    label: 'Citation',
    description: 'Citation pattern'
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Citation Tooltip - Shows citation details on hover
 */
const CitationTooltip = ({ citation, position }) => {
  const typeInfo = CITATION_TYPES[citation.type] || CITATION_TYPES.default;

  return (
    <div
      className="citation-tooltip"
      style={{
        '--tooltip-color': typeInfo.color,
        left: position?.x || 0,
        top: position?.y || 0
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-icon">{typeInfo.icon}</span>
        <span className="tooltip-type">{typeInfo.label}</span>
      </div>
      <div className="tooltip-content">
        <div className="tooltip-meaning">{citation.meaning}</div>
        {citation.introduces && (
          <div className="tooltip-introduces">
            <span className="introduces-label">Introduces:</span>
            <span className="introduces-value">{citation.introduces}</span>
          </div>
        )}
        {citation.context && (
          <div className="tooltip-context">{citation.context}</div>
        )}
      </div>
    </div>
  );
};

/**
 * Highlighted Citation Span
 */
const HighlightedCitation = ({ text, citation, onClick, onHover }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const typeInfo = CITATION_TYPES[citation.type] || CITATION_TYPES.default;

  const handleMouseEnter = useCallback((e) => {
    const rect = e.target.getBoundingClientRect();
    setTooltipPos({ x: rect.left, y: rect.bottom + 5 });
    setShowTooltip(true);
    onHover?.(citation);
  }, [citation, onHover]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  return (
    <span className="citation-highlight-wrapper">
      <span
        className="citation-highlight"
        style={{
          '--citation-color': typeInfo.color,
          '--citation-bg': typeInfo.bgColor
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick?.(citation)}
        role="button"
        tabIndex={0}
        aria-label={`${typeInfo.label}: ${citation.meaning}`}
      >
        <span className="citation-icon">{typeInfo.icon}</span>
        <span className="citation-text">{text}</span>
      </span>
      {showTooltip && (
        <CitationTooltip citation={citation} position={tooltipPos} />
      )}
    </span>
  );
};

/**
 * Citation Legend - Shows all citation types found
 */
const CitationLegend = ({ citations, compact = false }) => {
  const uniqueTypes = useMemo(() => {
    const types = new Set(citations.map(c => c.type));
    return Array.from(types);
  }, [citations]);

  if (uniqueTypes.length === 0) return null;

  return (
    <div className={`citation-legend ${compact ? 'compact' : ''}`}>
      <span className="legend-title">Citation Types:</span>
      <div className="legend-items">
        {uniqueTypes.map(type => {
          const info = CITATION_TYPES[type] || CITATION_TYPES.default;
          const count = citations.filter(c => c.type === type).length;
          return (
            <span
              key={type}
              className="legend-item"
              style={{ '--legend-color': info.color }}
            >
              <span className="legend-icon">{info.icon}</span>
              <span className="legend-label">{info.label}</span>
              <span className="legend-count">({count})</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * CitationHighlighter - Highlights Talmudic citation patterns in text
 * Uses PRO SCHOLAR V6 citation detection
 */
const CitationHighlighter = ({
  text,
  onCitationClick,
  onCitationHover,
  showLegend = true,
  showIcons = true,
  interactive = true,
  className = '',
}) => {
  // Detect citations using V6
  const citations = useMemo(() => {
    if (!text) return [];
    try {
      return detectCitations(text) || [];
    } catch (e) {
      console.debug('[CitationHighlighter] Detection error:', e.message);
      return [];
    }
  }, [text]);

  // Build highlighted text with citation spans
  const highlightedContent = useMemo(() => {
    if (!text || citations.length === 0) {
      return <span className="plain-text">{text}</span>;
    }

    // Build segments
    const segments = [];
    let currentPos = 0;

    // Process citations in order
    const orderedCitations = [...citations].sort((a, b) => a.position - b.position);

    for (const citation of orderedCitations) {
      const start = citation.position;
      const matchText = citation.pattern || citation.raw || '';
      const end = start + matchText.length;

      // Add text before this citation
      if (start > currentPos) {
        segments.push({
          type: 'text',
          content: text.slice(currentPos, start),
          key: `text-${currentPos}`
        });
      }

      // Add citation
      segments.push({
        type: 'citation',
        content: matchText,
        citation: citation,
        key: `citation-${start}`
      });

      currentPos = end;
    }

    // Add remaining text
    if (currentPos < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(currentPos),
        key: `text-${currentPos}`
      });
    }

    return segments.map(segment => {
      if (segment.type === 'text') {
        return <span key={segment.key}>{segment.content}</span>;
      }
      return (
        <HighlightedCitation
          key={segment.key}
          text={segment.content}
          citation={segment.citation}
          onClick={interactive ? onCitationClick : undefined}
          onHover={interactive ? onCitationHover : undefined}
        />
      );
    });
  }, [text, citations, interactive, onCitationClick, onCitationHover]);

  if (!text) return null;

  return (
    <div className={`citation-highlighter ${className}`}>
      {showLegend && citations.length > 0 && (
        <CitationLegend citations={citations} compact />
      )}
      <div className="highlighted-text" dir="rtl">
        {highlightedContent}
      </div>
      {citations.length > 0 && (
        <div className="citation-count">
          {citations.length} citation{citations.length !== 1 ? 's' : ''} detected
        </div>
      )}
    </div>
  );
};

CitationHighlighter.propTypes = {
  text: PropTypes.string.isRequired,
  onCitationClick: PropTypes.func,
  onCitationHover: PropTypes.func,
  showLegend: PropTypes.bool,
  showIcons: PropTypes.bool,
  interactive: PropTypes.bool,
  className: PropTypes.string,
};

// Export components for standalone use
export { CitationLegend, HighlightedCitation, CitationTooltip, CITATION_TYPES };
export default React.memo(CitationHighlighter);
