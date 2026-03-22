/**
 * RealiaPanel - Displays real-world measures, currency, objects
 *
 * Shows:
 * - Hebrew term with English translation
 * - Category (currency, length, volume, weight)
 * - Historical description
 * - Modern equivalents
 * - Usage context
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { MEASURES } from '../../data/realia';
import './RealiaPanel.css';

// Category configurations
const CATEGORY_CONFIG = {
  currency: {
    icon: '💰',
    color: '#f59e0b',
    label: 'Currency'
  },
  length: {
    icon: '📏',
    color: '#3b82f6',
    label: 'Length'
  },
  volume: {
    icon: '🫗',
    color: '#10b981',
    label: 'Volume'
  },
  weight: {
    icon: '⚖️',
    color: '#8b5cf6',
    label: 'Weight'
  },
  time: {
    icon: '⏱️',
    color: '#ec4899',
    label: 'Time'
  },
  area: {
    icon: '📐',
    color: '#06b6d4',
    label: 'Area'
  },
  object: {
    icon: '🏺',
    color: '#84cc16',
    label: 'Object'
  }
};

/**
 * Find realia term by Hebrew or English name
 */
export const findRealia = (term) => {
  if (!term) return null;

  // Direct Hebrew lookup
  if (MEASURES[term]) {
    return { key: term, ...MEASURES[term] };
  }

  // Search by English name
  const normalized = term.toLowerCase().replace(/['"]/g, '');
  for (const [key, data] of Object.entries(MEASURES)) {
    if (data.english?.toLowerCase() === normalized) {
      return { key, ...data };
    }
    if (data.english?.toLowerCase().includes(normalized)) {
      return { key, ...data };
    }
  }

  // Partial Hebrew match
  for (const [key, data] of Object.entries(MEASURES)) {
    if (key.includes(term) || term.includes(key)) {
      return { key, ...data };
    }
  }

  return null;
};

/**
 * Get all realia terms for a category
 */
export const getRealiaByCategory = (category) => {
  return Object.entries(MEASURES)
    .filter(([, data]) => data.category === category)
    .map(([key, data]) => ({ key, ...data }));
};

/**
 * Detect all realia terms in text
 */
export const detectRealiaInText = (text) => {
  if (!text) return [];

  const found = [];
  for (const [key, data] of Object.entries(MEASURES)) {
    // Check if Hebrew term appears in text
    if (text.includes(key)) {
      found.push({ key, ...data, match: key });
    }
    // Check if English term appears (case-insensitive)
    const englishLower = data.english?.toLowerCase();
    if (englishLower && text.toLowerCase().includes(englishLower)) {
      found.push({ key, ...data, match: data.english });
    }
  }

  // Remove duplicates by key
  return [...new Map(found.map(item => [item.key, item])).values()];
};

/**
 * ConversionChip - Shows related conversions
 */
const ConversionChip = ({ text, onClick }) => (
  <button
    className="conversion-chip"
    onClick={() => onClick?.(text)}
    title={`Look up ${text}`}
  >
    {text}
  </button>
);

/**
 * Main RealiaPanel Component
 */
const RealiaPanel = ({
  term,
  onClose,
  onTermClick,
  compact = false,
  className = ''
}) => {
  const realia = useMemo(() => findRealia(term), [term]);

  if (!realia) {
    return (
      <div className={`realia-panel not-found ${className}`}>
        <div className="panel-header">
          <span className="header-title">📏 Measure/Currency</span>
          {onClose && <button className="close-btn" onClick={onClose}>×</button>}
        </div>
        <div className="not-found-content">
          <span className="not-found-icon">🔍</span>
          <p>No information found for "{term}"</p>
        </div>
      </div>
    );
  }

  const config = CATEGORY_CONFIG[realia.category] || CATEGORY_CONFIG.object;

  // Parse equivalents for clickable chips (with type safety)
  const equivalentsList = (typeof realia.equivalents === 'string')
    ? realia.equivalents.split(/[,=]/).map(s => s.trim()).filter(s => s)
    : Array.isArray(realia.equivalents) ? realia.equivalents : [];

  return (
    <div className={`realia-panel ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="panel-header" style={{ borderColor: config.color }}>
        <div className="header-left">
          <span className="header-icon">{config.icon}</span>
          <span className="header-title">{config.label}</span>
        </div>
        {onClose && <button className="close-btn" onClick={onClose}>×</button>}
      </div>

      {/* Main Display */}
      <div className="realia-main">
        <h3 className="realia-hebrew" dir="rtl">{realia.key}</h3>
        <h4 className="realia-english">{realia.english}</h4>
      </div>

      {/* Category Badge */}
      <div className="category-section">
        <span className="category-badge" style={{ backgroundColor: config.color }}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Description */}
      {realia.description && (
        <div className="info-section">
          <h5><span className="section-icon">📖</span> Description</h5>
          <p className="description-text">{realia.description}</p>
        </div>
      )}

      {/* Modern Equivalent - Highlighted */}
      {realia.modern && (
        <div className="modern-section">
          <h5><span className="section-icon">📊</span> Modern Equivalent</h5>
          <div className="modern-value">
            {realia.modern}
          </div>
        </div>
      )}

      {/* Equivalents/Conversions */}
      {equivalentsList.length > 0 && (
        <div className="equivalents-section">
          <h5><span className="section-icon">🔄</span> Conversions</h5>
          <div className="equivalents-list">
            {equivalentsList.map((eq, i) => (
              <ConversionChip key={i} text={eq} onClick={onTermClick} />
            ))}
          </div>
        </div>
      )}

      {/* Context */}
      {realia.context && (
        <div className="context-section">
          <h5><span className="section-icon">📜</span> Usage Context</h5>
          <p className="context-text">{realia.context}</p>
        </div>
      )}

      {/* External Link */}
      <div className="links-section">
        <a
          href={`https://www.sefaria.org/topics/${encodeURIComponent(realia.english || realia.key)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
        >
          📚 Learn more on Sefaria
        </a>
      </div>
    </div>
  );
};

RealiaPanel.propTypes = {
  term: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  onTermClick: PropTypes.func,
  compact: PropTypes.bool,
  className: PropTypes.string
};

// Export helpers
export { MEASURES, CATEGORY_CONFIG };
export default RealiaPanel;
