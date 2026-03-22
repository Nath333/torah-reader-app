/**
 * SourceChainView - Commentary Relationship Visualization
 *
 * Shows the chain of tradition (mesorah) for commentators:
 * - Chronological ordering
 * - Who quotes/responds to whom
 * - Rishonim vs Acharonim distinction
 * - Teacher-student relationships
 *
 * Essential for understanding how interpretations developed.
 */

import React, { useMemo, useState } from 'react';
import { COMMENTATORS as REGISTRY } from '../../constants/commentatorRegistry';
import './SourceChainView.css';

// Transform registry format to component format
const COMMENTATORS = Object.fromEntries(
  Object.entries(REGISTRY).map(([key, c]) => [key, {
    name: c.name,
    hebrewName: c.hebrew,
    fullName: c.full,
    years: c.dates,
    location: c.location,
    era: c.era === 'rishonim' ? 'rishon' : c.era === 'acharonim' ? 'acharon' : c.era,
    focus: c.method,
    teachers: c.teachers || [],
    students: c.students || [],
    responds_to: c.respondsTo || [],
    known_for: c.method
  }])
);

// =============================================================================
// Helper Functions
// =============================================================================

const getEraLabel = (era) => ({
  rishon: { name: 'Rishon', hebrew: 'ראשון', color: '#6c5ce7' },
  acharon: { name: 'Acharon', hebrew: 'אחרון', color: '#00b894' }
}[era] || { name: 'Unknown', hebrew: '', color: '#95a5a6' });

const parseYear = (years) => {
  const match = years.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

// =============================================================================
// Component
// =============================================================================

const SourceChainView = ({
  commentaries = [], // Array of commentary keys present on current verse
  onSelectCommentator,
  showAll = false,
  viewMode = 'timeline' // 'timeline', 'network', 'list'
}) => {
  const [selectedCommentator, setSelectedCommentator] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Get relevant commentators
  const relevantCommentators = useMemo(() => {
    const keys = showAll
      ? Object.keys(COMMENTATORS)
      : commentaries.map(c => {
          // Normalize commentary names to keys
          const name = typeof c === 'string' ? c : c.name || c.source;
          return Object.keys(COMMENTATORS).find(
            k => COMMENTATORS[k].name.toLowerCase() === name?.toLowerCase() ||
                 COMMENTATORS[k].hebrewName === name
          );
        }).filter(Boolean);

    return keys.map(k => ({ key: k, ...COMMENTATORS[k] }))
               .sort((a, b) => parseYear(a.years) - parseYear(b.years));
  }, [commentaries, showAll]);

  // Build relationship map
  const relationships = useMemo(() => {
    const rels = [];
    for (const comm of relevantCommentators) {
      // Teacher relationships
      for (const teacher of comm.teachers || []) {
        if (relevantCommentators.find(c => c.key === teacher)) {
          rels.push({
            from: teacher,
            to: comm.key,
            type: 'student'
          });
        }
      }
      // Response relationships
      for (const target of comm.responds_to || []) {
        if (relevantCommentators.find(c => c.key === target)) {
          rels.push({
            from: comm.key,
            to: target,
            type: 'responds'
          });
        }
      }
    }
    return rels;
  }, [relevantCommentators]);

  const handleSelect = (comm) => {
    setSelectedCommentator(comm);
    if (onSelectCommentator) {
      onSelectCommentator(comm);
    }
  };

  // =============================================================================
  // Timeline View
  // =============================================================================

  const renderTimeline = () => (
    <div className="source-timeline">
      <div className="era-labels">
        <div className="era-section rishonim">
          <span className="era-label">ראשונים</span>
          <span className="era-years">1000-1500</span>
        </div>
        <div className="era-section acharonim">
          <span className="era-label">אחרונים</span>
          <span className="era-years">1500+</span>
        </div>
      </div>

      <div className="timeline-track">
        {relevantCommentators.map((comm, idx) => {
          const era = getEraLabel(comm.era);
          const hasRelationships = relationships.some(
            r => r.from === comm.key || r.to === comm.key
          );

          return (
            <div
              key={comm.key}
              className={`timeline-node ${selectedCommentator?.key === comm.key ? 'selected' : ''}`}
              style={{
                '--node-color': era.color,
                '--node-index': idx
              }}
              onClick={() => handleSelect(comm)}
            >
              <div className="node-marker" />
              <div className="node-content">
                <span className="hebrew-name">{comm.hebrewName}</span>
                <span className="years">{comm.years}</span>
              </div>
              {hasRelationships && (
                <div className="relationship-indicator">●</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Relationship Lines (simplified) */}
      {relationships.length > 0 && (
        <div className="relationships-summary">
          <span className="rel-label">Connections:</span>
          {relationships.slice(0, 3).map((rel, i) => (
            <span key={i} className={`rel-badge ${rel.type}`}>
              {COMMENTATORS[rel.from]?.hebrewName} → {COMMENTATORS[rel.to]?.hebrewName}
            </span>
          ))}
          {relationships.length > 3 && (
            <span className="more-rels">+{relationships.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );

  // =============================================================================
  // List View
  // =============================================================================

  const renderList = () => (
    <div className="source-list">
      {['rishon', 'acharon'].map(era => {
        const eraComms = relevantCommentators.filter(c => c.era === era);
        if (eraComms.length === 0) return null;

        const eraInfo = getEraLabel(era);

        return (
          <div key={era} className="era-group">
            <div className="era-header" style={{ borderColor: eraInfo.color }}>
              <span className="era-name">{eraInfo.hebrew}</span>
              <span className="era-english">{eraInfo.name}</span>
            </div>
            <div className="commentators">
              {eraComms.map(comm => (
                <div
                  key={comm.key}
                  className={`commentator-card ${selectedCommentator?.key === comm.key ? 'selected' : ''}`}
                  onClick={() => handleSelect(comm)}
                >
                  <div className="card-header">
                    <span className="hebrew-name">{comm.hebrewName}</span>
                    <span className="latin-name">{comm.name}</span>
                  </div>
                  <div className="card-meta">
                    <span className="years">{comm.years}</span>
                    <span className="location">{comm.location}</span>
                  </div>
                  <div className="card-focus">{comm.focus}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // =============================================================================
  // Detail Panel
  // =============================================================================

  const renderDetailPanel = () => {
    if (!selectedCommentator) return null;

    const comm = selectedCommentator;
    const era = getEraLabel(comm.era);
    const teacherNames = (comm.teachers || [])
      .map(k => COMMENTATORS[k]?.hebrewName)
      .filter(Boolean);
    const studentNames = (comm.students || [])
      .map(k => COMMENTATORS[k]?.hebrewName)
      .filter(Boolean);
    const respondsToNames = (comm.responds_to || [])
      .map(k => COMMENTATORS[k]?.hebrewName)
      .filter(Boolean);

    return (
      <div className="detail-panel" style={{ '--accent-color': era.color }}>
        <div className="detail-header">
          <div className="detail-title">
            <span className="hebrew-name">{comm.hebrewName}</span>
            <span className="full-name">{comm.fullName}</span>
          </div>
          <button
            className="close-btn"
            onClick={() => setSelectedCommentator(null)}
          >
            ✕
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-row">
            <span className="label">Era:</span>
            <span className="value era-badge" style={{ background: era.color }}>
              {era.hebrew} ({era.name})
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Years:</span>
            <span className="value">{comm.years}</span>
          </div>

          <div className="detail-row">
            <span className="label">Location:</span>
            <span className="value">{comm.location}</span>
          </div>

          <div className="detail-row">
            <span className="label">Focus:</span>
            <span className="value">{comm.focus}</span>
          </div>

          <div className="detail-row">
            <span className="label">Known For:</span>
            <span className="value">{comm.known_for}</span>
          </div>

          {teacherNames.length > 0 && (
            <div className="detail-row">
              <span className="label">Teachers:</span>
              <span className="value">{teacherNames.join(', ')}</span>
            </div>
          )}

          {studentNames.length > 0 && (
            <div className="detail-row">
              <span className="label">Students:</span>
              <span className="value">{studentNames.join(', ')}</span>
            </div>
          )}

          {respondsToNames.length > 0 && (
            <div className="detail-row">
              <span className="label">Responds to:</span>
              <span className="value">{respondsToNames.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // =============================================================================
  // Main Render
  // =============================================================================

  if (relevantCommentators.length === 0) {
    return (
      <div className="source-chain-empty">
        <p>No commentators available for this section.</p>
      </div>
    );
  }

  return (
    <div className="source-chain-view">
      <div className="chain-header">
        <h3>שרשרת המסורה - Chain of Tradition</h3>
        <span className="commentator-count">
          {relevantCommentators.length} commentators
        </span>
      </div>

      <div className="view-content">
        {viewMode === 'timeline' && renderTimeline()}
        {viewMode === 'list' && renderList()}
      </div>

      {renderDetailPanel()}
    </div>
  );
};

export default SourceChainView;
export { COMMENTATORS };
