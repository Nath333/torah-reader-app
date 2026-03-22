/**
 * RabbiInfoPanel - Displays sage biography when name is clicked
 *
 * Shows:
 * - Name (Hebrew + English)
 * - Era and dates
 * - Teachers and students (clickable for navigation)
 * - Key teaching
 * - Methodology
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RABBIS } from '../../data/rabbiBiographies';
import './RabbiInfoPanel.css';

// Era colors for visual distinction
const ERA_COLORS = {
  'Zugot': '#d97706',
  'Tanna': '#059669',
  'Amora': '#2563eb',
  'Savora': '#7c3aed',
  'Gaon': '#db2777',
  'Rishon': '#0891b2',
  'Acharon': '#4f46e5'
};

// Era icons
const ERA_ICONS = {
  'Zugot': '👥',
  'Tanna': '📜',
  'Amora': '📖',
  'Savora': '🔍',
  'Gaon': '👑',
  'Rishon': '✒️',
  'Acharon': '📚'
};

/**
 * Find rabbi by various name formats
 */
const findRabbi = (name) => {
  if (!name) return null;

  // Direct lookup
  if (RABBIS[name]) return { key: name, ...RABBIS[name] };

  // Search by English name
  for (const [key, data] of Object.entries(RABBIS)) {
    if (data.english?.toLowerCase() === name.toLowerCase()) {
      return { key, ...data };
    }
    if (data.fullName?.toLowerCase().includes(name.toLowerCase())) {
      return { key, ...data };
    }
  }

  // Search by partial Hebrew name
  const cleanName = name.replace(/['"״׳]/g, '');
  for (const [key, data] of Object.entries(RABBIS)) {
    if (key.includes(cleanName) || cleanName.includes(key.replace(/['"״׳]/g, ''))) {
      return { key, ...data };
    }
  }

  return null;
};

/**
 * PersonChip - Clickable chip for teacher/student names
 */
const PersonChip = ({ name, onClick, type = 'teacher' }) => {
  const rabbi = findRabbi(name);
  const hasData = !!rabbi;

  return (
    <button
      className={`person-chip ${type} ${hasData ? 'has-data' : ''}`}
      onClick={() => hasData && onClick(rabbi.key)}
      disabled={!hasData}
      title={hasData ? `View ${name}'s biography` : name}
    >
      <span className="person-icon">{type === 'teacher' ? '📚' : '🎓'}</span>
      <span className="person-name">{name}</span>
      {hasData && <span className="person-arrow">→</span>}
    </button>
  );
};

/**
 * Main RabbiInfoPanel Component
 */
const RabbiInfoPanel = ({
  rabbiName,
  onClose,
  onNavigate,
  compact = false,
  className = ''
}) => {
  const [historyStack, setHistoryStack] = useState([]);
  const [currentName, setCurrentName] = useState(rabbiName);

  // Sync currentName when rabbiName prop changes
  useEffect(() => {
    setCurrentName(rabbiName);
    setHistoryStack([]); // Reset history when rabbi changes externally
  }, [rabbiName]);

  const rabbi = useMemo(() => findRabbi(currentName), [currentName]);

  const handleNavigate = useCallback((name) => {
    setHistoryStack(prev => [...prev, currentName]);
    setCurrentName(name);
    onNavigate?.(name);
  }, [currentName, onNavigate]);

  const handleBack = useCallback(() => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack(stack => stack.slice(0, -1));
      setCurrentName(prev);
    }
  }, [historyStack]);

  if (!rabbi) {
    return (
      <div className={`rabbi-info-panel not-found ${className}`}>
        <div className="panel-header">
          <span className="header-title">Scholar Info</span>
          {onClose && <button className="close-btn" onClick={onClose}>×</button>}
        </div>
        <div className="not-found-content">
          <span className="not-found-icon">📚</span>
          <p>No biography found for "{currentName}"</p>
          <p className="not-found-hint">Try searching with Hebrew or full name</p>
        </div>
      </div>
    );
  }

  const eraColor = ERA_COLORS[rabbi.era] || '#6b7280';
  const eraIcon = ERA_ICONS[rabbi.era] || '📖';

  return (
    <div className={`rabbi-info-panel ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="panel-header" style={{ borderColor: eraColor }}>
        <div className="header-left">
          {historyStack.length > 0 && (
            <button className="back-btn" onClick={handleBack} title="Back">
              ←
            </button>
          )}
          <span className="header-icon">{eraIcon}</span>
          <span className="header-title">Scholar Biography</span>
        </div>
        {onClose && <button className="close-btn" onClick={onClose}>×</button>}
      </div>

      {/* Main Info */}
      <div className="rabbi-main">
        <h3 className="rabbi-name" dir="rtl">{rabbi.key}</h3>
        <h4 className="rabbi-english">{rabbi.english}</h4>
        {rabbi.fullName && rabbi.fullName !== rabbi.english && (
          <p className="rabbi-fullname">{rabbi.fullName}</p>
        )}
      </div>

      {/* Era Badge */}
      <div className="era-section">
        <span className="era-badge" style={{ backgroundColor: eraColor }}>
          {eraIcon} {rabbi.era}
        </span>
        {rabbi.generation && (
          <span className="generation-badge">{rabbi.generation}</span>
        )}
        {rabbi.dates && (
          <span className="dates-badge">📅 {rabbi.dates}</span>
        )}
      </div>

      {/* Location */}
      {rabbi.location && (
        <div className="info-row">
          <span className="row-icon">📍</span>
          <span className="row-label">Location:</span>
          <span className="row-value">{rabbi.location}</span>
        </div>
      )}

      {/* Teachers */}
      {rabbi.teachers && rabbi.teachers.length > 0 && (
        <div className="relationship-section">
          <h5><span className="section-icon">📚</span> Teachers</h5>
          <div className="persons-list">
            {rabbi.teachers.map((teacher, i) => (
              <PersonChip
                key={i}
                name={teacher}
                type="teacher"
                onClick={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Students */}
      {rabbi.students && rabbi.students.length > 0 && (
        <div className="relationship-section">
          <h5><span className="section-icon">🎓</span> Students</h5>
          <div className="persons-list">
            {rabbi.students.map((student, i) => (
              <PersonChip
                key={i}
                name={student}
                type="student"
                onClick={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Key Teaching */}
      {rabbi.keyTeaching && (
        <div className="teaching-section">
          <h5><span className="section-icon">💬</span> Key Teaching</h5>
          <blockquote className="key-teaching">
            "{rabbi.keyTeaching}"
          </blockquote>
        </div>
      )}

      {/* Methodology */}
      {rabbi.methodology && (
        <div className="methodology-section">
          <h5><span className="section-icon">🔍</span> Approach</h5>
          <p className="methodology-text">{rabbi.methodology}</p>
        </div>
      )}

      {/* Works (if available) */}
      {rabbi.works && rabbi.works.length > 0 && (
        <div className="works-section">
          <h5><span className="section-icon">📖</span> Major Works</h5>
          <ul className="works-list">
            {rabbi.works.map((work, i) => (
              <li key={i}>{work}</li>
            ))}
          </ul>
        </div>
      )}

      {/* External Links */}
      <div className="links-section">
        <a
          href={`https://www.sefaria.org/topics/${encodeURIComponent(rabbi.english || rabbi.key)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link"
        >
          📚 View on Sefaria
        </a>
      </div>
    </div>
  );
};

RabbiInfoPanel.propTypes = {
  rabbiName: PropTypes.string.isRequired,
  onClose: PropTypes.func,
  onNavigate: PropTypes.func,
  compact: PropTypes.bool,
  className: PropTypes.string
};

// Export helper function for use elsewhere
export { findRabbi, RABBIS };
export default RabbiInfoPanel;
