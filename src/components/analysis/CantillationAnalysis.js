/**
 * CantillationAnalysis.js - Taamei HaMikra visualization component
 *
 * Displays cantillation marks analysis including:
 * - Hierarchical structure visualization
 * - Clause boundaries
 * - Musical tradition info (Ashkenazi/Sephardi)
 * - Mark identification and explanation
 */

import React, { useState, useMemo } from 'react';
import {
  extractCantillation,
  analyzeVerseStructure,
  getSyntacticParsing
} from '../../services/textual/cantillationService';
import './CantillationAnalysis.css';

const CantillationAnalysis = ({ verseText, verseRef }) => {
  const [tradition, setTradition] = useState('ashkenazi');
  const [activeMarkIndex, setActiveMarkIndex] = useState(null);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'clauses' | 'marks'

  // Extract and analyze cantillation
  const marks = useMemo(() => extractCantillation(verseText || ''), [verseText]);
  const structure = useMemo(() => analyzeVerseStructure(verseText || ''), [verseText]);
  const parsing = useMemo(() => getSyntacticParsing(verseText || ''), [verseText]);

  // Get unique disjunctive marks for hierarchy display
  const hierarchyLevels = useMemo(() => {
    return [
      { level: 0, name: 'End', marks: structure.hierarchy?.level0 || [], color: '#1e3a5f' },
      { level: 1, name: 'Primary', marks: structure.hierarchy?.level1 || [], color: '#dc2626' },
      { level: 2, name: 'Secondary', marks: structure.hierarchy?.level2 || [], color: '#f59e0b' },
      { level: 3, name: 'Tertiary', marks: structure.hierarchy?.level3 || [], color: '#10b981' },
      { level: 4, name: 'Quaternary', marks: structure.hierarchy?.level4 || [], color: '#3b82f6' },
      { level: 5, name: 'Minor', marks: structure.hierarchy?.level5 || [], color: '#8b5cf6' }
    ];
  }, [structure]);

  // Get mark type color
  const getMarkColor = (mark) => {
    if (mark.type === 'conjunctive') return '#3b82f6';
    switch (mark.rank) {
      case 0: return '#1e3a5f';
      case 1: return '#dc2626';
      case 2: return '#f59e0b';
      case 3: return '#10b981';
      case 4: return '#6366f1';
      case 5: return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (!verseText) {
    return (
      <div className="cantillation-analysis empty">
        <p>Select a verse to analyze cantillation marks</p>
      </div>
    );
  }

  return (
    <div className="cantillation-analysis">
      {/* Header */}
      <div className="cant-header">
        <div className="cant-header-title">
          <span className="cant-icon">🎵</span>
          <h4>Cantillation Analysis</h4>
          {verseRef && <span className="cant-ref">{verseRef}</span>}
        </div>

        <div className="cant-controls">
          {/* Tradition Selector */}
          <div className="cant-tradition-toggle">
            <button
              className={`tradition-btn ${tradition === 'ashkenazi' ? 'active' : ''}`}
              onClick={() => setTradition('ashkenazi')}
            >
              Ashkenazi
            </button>
            <button
              className={`tradition-btn ${tradition === 'sephardi' ? 'active' : ''}`}
              onClick={() => setTradition('sephardi')}
            >
              Sephardi
            </button>
          </div>

          {/* View Mode */}
          <div className="cant-view-toggle">
            <button
              className={`view-btn ${viewMode === 'hierarchy' ? 'active' : ''}`}
              onClick={() => setViewMode('hierarchy')}
              title="Hierarchy View"
            >
              📊
            </button>
            <button
              className={`view-btn ${viewMode === 'clauses' ? 'active' : ''}`}
              onClick={() => setViewMode('clauses')}
              title="Clause View"
            >
              📝
            </button>
            <button
              className={`view-btn ${viewMode === 'marks' ? 'active' : ''}`}
              onClick={() => setViewMode('marks')}
              title="All Marks"
            >
              🔤
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="cant-stats">
        <div className="cant-stat">
          <span className="stat-value">{marks.length}</span>
          <span className="stat-label">Total Marks</span>
        </div>
        <div className="cant-stat">
          <span className="stat-value">{structure.disjunctiveCount}</span>
          <span className="stat-label">Disjunctive</span>
        </div>
        <div className="cant-stat">
          <span className="stat-value">{structure.conjunctiveCount}</span>
          <span className="stat-label">Conjunctive</span>
        </div>
        <div className="cant-stat">
          <span className="stat-value">{parsing.clauses?.length || 0}</span>
          <span className="stat-label">Clauses</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="cant-content">
        {/* Hierarchy View */}
        {viewMode === 'hierarchy' && (
          <div className="cant-hierarchy-view">
            <div className="hierarchy-verse">
              <div className="verse-hebrew" dir="rtl">
                {verseText}
              </div>
            </div>

            <div className="hierarchy-structure">
              <div className="hierarchy-title">Structural Hierarchy</div>
              <div className="hierarchy-tree">
                {hierarchyLevels.map((level, idx) => (
                  level.marks.length > 0 && (
                    <div key={idx} className="hierarchy-level" style={{ '--level-color': level.color }}>
                      <div className="level-bar" style={{
                        width: `${100 - (idx * 12)}%`,
                        background: level.color
                      }} />
                      <div className="level-label">{level.name}</div>
                      <div className="level-marks">
                        {level.marks.map((mark, midx) => (
                          <span
                            key={midx}
                            className="level-mark"
                            onClick={() => setActiveMarkIndex(marks.indexOf(mark))}
                          >
                            {mark.hebrewName} ({mark.word})
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Primary Division */}
            {structure.primaryBreak && (
              <div className="hierarchy-division">
                <div className="division-title">Primary Division (אתנחתא)</div>
                <div className="division-parts">
                  <div className="division-half first">
                    <span className="half-label">First Half</span>
                    <span className="half-count">{structure.firstHalf?.length || 0} marks</span>
                  </div>
                  <div className="division-marker">
                    <span className="marker-symbol">֑</span>
                  </div>
                  <div className="division-half second">
                    <span className="half-label">Second Half</span>
                    <span className="half-count">{structure.secondHalf?.length || 0} marks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clause View */}
        {viewMode === 'clauses' && (
          <div className="cant-clause-view">
            {parsing.interpretation?.map((clause, idx) => (
              <div key={idx} className="clause-item">
                <div className="clause-number">{clause.clauseNumber}</div>
                <div className="clause-content">
                  <div className="clause-text" dir="rtl">{clause.text}</div>
                  <div className="clause-pause">
                    {clause.markName && (
                      <span className="pause-mark">{clause.markName}</span>
                    )}
                    <span className="pause-desc">{clause.pause}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Marks View */}
        {viewMode === 'marks' && (
          <div className="cant-marks-view">
            <div className="marks-grid">
              {marks.map((mark, idx) => (
                <div
                  key={idx}
                  className={`mark-card ${activeMarkIndex === idx ? 'active' : ''} ${mark.type}`}
                  onClick={() => setActiveMarkIndex(idx)}
                  style={{ '--mark-color': getMarkColor(mark) }}
                >
                  <div className="mark-symbol">{mark.symbol}</div>
                  <div className="mark-name">{mark.name}</div>
                  <div className="mark-hebrew">{mark.hebrewName}</div>
                  <div className="mark-word" dir="rtl">{mark.word}</div>
                  <div className="mark-type-badge">{mark.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Mark Detail */}
        {activeMarkIndex !== null && marks[activeMarkIndex] && (
          <div className="cant-mark-detail">
            <button
              className="detail-close"
              onClick={() => setActiveMarkIndex(null)}
            >
              ×
            </button>

            <div className="detail-header">
              <span className="detail-symbol">{marks[activeMarkIndex].symbol}</span>
              <div className="detail-names">
                <span className="detail-name">{marks[activeMarkIndex].name}</span>
                <span className="detail-hebrew">{marks[activeMarkIndex].hebrewName}</span>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className={`detail-value type-${marks[activeMarkIndex].type}`}>
                  {marks[activeMarkIndex].type}
                </span>
              </div>

              {marks[activeMarkIndex].rank !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Hierarchy Level:</span>
                  <span className="detail-value">{marks[activeMarkIndex].rank}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Meaning:</span>
                <span className="detail-value">{marks[activeMarkIndex].meaning}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Musical:</span>
                <span className="detail-value">{marks[activeMarkIndex].musical}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">{tradition === 'ashkenazi' ? 'Ashkenazi' : 'Sephardi'} Melody:</span>
                <span className="detail-value">
                  {tradition === 'ashkenazi' ? marks[activeMarkIndex].ashkenazi : marks[activeMarkIndex].sephardi}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">On Word:</span>
                <span className="detail-value hebrew" dir="rtl">{marks[activeMarkIndex].word}</span>
              </div>

              {marks[activeMarkIndex].rare && (
                <div className="detail-row rare-notice">
                  <span className="rare-badge">RARE</span>
                  {marks[activeMarkIndex].occurrences && (
                    <span className="rare-count">
                      Only {marks[activeMarkIndex].occurrences} occurrences in Torah
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="cant-legend">
        <div className="legend-title">Legend</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot disjunctive" />
            <span className="legend-label">Disjunctive (pause)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot conjunctive" />
            <span className="legend-label">Conjunctive (connects)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CantillationAnalysis;
