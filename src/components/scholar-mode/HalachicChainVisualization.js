/**
 * HalachicChainVisualization - Visual display of halachic transmission chain
 *
 * Shows the path from Torah source to contemporary practice:
 * Torah → Talmud → Rishonim → Shulchan Aruch → Modern Poskim
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import './HalachicChainVisualization.css';

// Chain level configuration
const CHAIN_LEVELS = [
  { id: 'torah', label: 'תורה', sublabel: 'Torah Source', icon: '📜', color: '#d4af37' },
  { id: 'talmud', label: 'תלמוד', sublabel: 'Talmud', icon: '📚', color: '#8b5cf6' },
  { id: 'rishonim', label: 'ראשונים', sublabel: 'Rishonim', icon: '📖', color: '#3b82f6' },
  { id: 'shulchan', label: 'שו״ע', sublabel: 'Shulchan Aruch', icon: '⚖️', color: '#10b981' },
  { id: 'contemporary', label: 'אחרונים', sublabel: 'Modern Poskim', icon: '👤', color: '#f59e0b' }
];

// Chain Node Component
const ChainNode = ({ level, data, isActive }) => {
  if (!data) return null;

  const config = CHAIN_LEVELS.find(l => l.id === level) || {};

  return (
    <div
      className={`chain-node ${isActive ? 'active' : ''}`}
      style={{ '--node-color': config.color }}
    >
      <div className="node-icon">{config.icon}</div>
      <div className="node-content">
        <div className="node-header">
          <span className="node-label">{config.label}</span>
          <span className="node-sublabel">{config.sublabel}</span>
        </div>
        <div className="node-data">
          {typeof data === 'string' ? (
            <p className="node-text">{data}</p>
          ) : (
            <>
              {data.location && (
                <div className="node-location">
                  <span className="location-icon">📍</span>
                  <span className="location-text">{data.location}</span>
                </div>
              )}
              {data.derivation && (
                <div className="node-derivation">
                  <span className="derivation-label">Derivation:</span>
                  <span className="derivation-text">{data.derivation}</span>
                </div>
              )}
              {data.ruling && (
                <div className="node-ruling">
                  <span className="ruling-label">Ruling:</span>
                  <span className="ruling-text">{data.ruling}</span>
                </div>
              )}
              {data.rema && (
                <div className="node-rema">
                  <span className="rema-label">רמ״א (Ashkenaz):</span>
                  <span className="rema-text">{data.rema}</span>
                </div>
              )}
              {data.disputes && (
                <div className="node-disputes">
                  <span className="disputes-label">Disputes:</span>
                  <span className="disputes-text">{data.disputes}</span>
                </div>
              )}
              {data.mishnaBrurah && (
                <div className="node-mb">
                  <span className="mb-label">משנה ברורה:</span>
                  <span className="mb-text">{data.mishnaBrurah}</span>
                </div>
              )}
              {data.modernPoskim && (
                <div className="node-modern">
                  <span className="modern-label">Modern:</span>
                  <span className="modern-text">{data.modernPoskim}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Rishonim List Component
const RishonimList = ({ rishonim }) => {
  if (!rishonim || rishonim.length === 0) return null;

  return (
    <div className="rishonim-list">
      {rishonim.map((rishon, idx) => (
        <div key={idx} className="rishon-item">
          <span className="rishon-name">{rishon.authority}</span>
          {rishon.location && (
            <span className="rishon-location">{rishon.location}</span>
          )}
          <p className="rishon-ruling">{rishon.ruling}</p>
        </div>
      ))}
    </div>
  );
};

// Practical Application Section
const PracticalApplicationSection = ({ application }) => {
  if (!application) return null;

  return (
    <div className="practical-section">
      <div className="practical-header">
        <span className="practical-icon">✅</span>
        <span className="practical-title">הלכה למעשה - Practical Application</span>
      </div>
      <div className="practical-grid">
        {application.whoIsObligated && (
          <div className="practical-item">
            <span className="item-label">Who:</span>
            <span className="item-text">{application.whoIsObligated}</span>
          </div>
        )}
        {application.when && (
          <div className="practical-item">
            <span className="item-label">When:</span>
            <span className="item-text">{application.when}</span>
          </div>
        )}
        {application.how && (
          <div className="practical-item how">
            <span className="item-label">How:</span>
            <span className="item-text">{application.how}</span>
          </div>
        )}
        {application.exceptions && (
          <div className="practical-item exceptions">
            <span className="item-label">Exceptions:</span>
            <span className="item-text">{application.exceptions}</span>
          </div>
        )}
        {application.commonMistakes && (
          <div className="practical-item mistakes">
            <span className="item-label">Avoid:</span>
            <span className="item-text">{application.commonMistakes}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
const HalachicChainVisualization = ({ halachaData, compact = false }) => {
  // Parse the halacha data
  const parsedData = useMemo(() => {
    if (!halachaData) return null;

    const chain = halachaData.chainOfTransmission || {};

    return {
      summary: halachaData.summary,
      torah: chain.torahSource,
      talmud: chain.talmudic,
      rishonim: chain.rishonim,
      shulchan: chain.shulchanAruch,
      contemporary: chain.contemporary,
      practical: halachaData.practicalApplication,
      machloket: halachaData.machloket,
      lessonBeyondLaw: halachaData.lessonBeyondLaw
    };
  }, [halachaData]);

  if (!parsedData) {
    return (
      <div className="halachic-empty">
        <span className="empty-icon">⚖️</span>
        <p>No halachic data available</p>
      </div>
    );
  }

  return (
    <div className={`halachic-chain-visualization ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="chain-header">
        <span className="header-icon">⚖️</span>
        <h3 className="header-title">שלשלת ההלכה - Chain of Transmission</h3>
      </div>

      {/* Summary */}
      {parsedData.summary && (
        <div className="chain-summary">
          <p>{parsedData.summary}</p>
        </div>
      )}

      {/* Visual Chain */}
      <div className="chain-visual">
        <div className="chain-line"></div>
        <div className="chain-nodes">
          <ChainNode level="torah" data={parsedData.torah} isActive />

          {parsedData.talmud && (
            <>
              <div className="chain-connector">↓</div>
              <ChainNode level="talmud" data={parsedData.talmud} isActive />
            </>
          )}

          {parsedData.rishonim && parsedData.rishonim.length > 0 && (
            <>
              <div className="chain-connector">↓</div>
              <div className="chain-node rishonim-node">
                <div className="node-icon">📖</div>
                <div className="node-content">
                  <div className="node-header">
                    <span className="node-label">ראשונים</span>
                    <span className="node-sublabel">Rishonim</span>
                  </div>
                  <RishonimList rishonim={parsedData.rishonim} />
                </div>
              </div>
            </>
          )}

          {parsedData.shulchan && (
            <>
              <div className="chain-connector">↓</div>
              <ChainNode level="shulchan" data={parsedData.shulchan} isActive />
            </>
          )}

          {parsedData.contemporary && (
            <>
              <div className="chain-connector">↓</div>
              <ChainNode level="contemporary" data={parsedData.contemporary} isActive />
            </>
          )}
        </div>
      </div>

      {/* Practical Application */}
      <PracticalApplicationSection application={parsedData.practical} />

      {/* Machloket (Disputes) */}
      {parsedData.machloket && (
        <div className="machloket-section">
          <div className="machloket-header">
            <span className="machloket-icon">⚔️</span>
            <span className="machloket-title">Disputed Aspects</span>
          </div>
          {parsedData.machloket.topic && (
            <p className="machloket-topic">{parsedData.machloket.topic}</p>
          )}
          {parsedData.machloket.positions && (
            <div className="machloket-positions">
              {parsedData.machloket.positions.map((pos, idx) => (
                <div key={idx} className="machloket-position">
                  <span className="pos-authority">{pos.authority}:</span>
                  <span className="pos-view">{pos.view}</span>
                </div>
              ))}
            </div>
          )}
          {parsedData.machloket.commonPractice && (
            <p className="machloket-practice">
              <strong>Common Practice:</strong> {parsedData.machloket.commonPractice}
            </p>
          )}
        </div>
      )}

      {/* Spiritual Lesson */}
      {parsedData.lessonBeyondLaw && (
        <div className="spiritual-lesson">
          <div className="spiritual-header">
            <span className="spiritual-icon">✨</span>
            <span className="spiritual-title">Beyond the Law</span>
          </div>
          <p className="spiritual-text">{parsedData.lessonBeyondLaw}</p>
        </div>
      )}
    </div>
  );
};

HalachicChainVisualization.propTypes = {
  halachaData: PropTypes.object,
  compact: PropTypes.bool
};

export default HalachicChainVisualization;
