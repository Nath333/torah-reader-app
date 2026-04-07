/**
 * QuickToolsPanel - Deterministic quick tools for the Learn (AI) tab
 *
 * Bridges the gap: shows the same pattern-detected data that TalmudToolsTab uses,
 * but embedded as a collapsible reference panel alongside AI results.
 * NO AI calls — purely deterministic.
 *
 * Shows:
 * - Structural markers detected (mishna, gemara, question, proof...)
 * - Abbreviations found with expansions
 * - Rabbis/sages detected with period info
 * - Q&A flow summary
 */
import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';

// =============================================================================
// Sub-panels
// =============================================================================

const StructurePanel = memo(function StructurePanel({ markers }) {
  if (!markers || markers.length === 0) return null;

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>🏗️</span>
        <span>מבנה ({markers.length})</span>
      </div>
      <div className="qt-marker-list">
        {markers.slice(0, 15).map((m, i) => (
          <div key={i} className="qt-marker-item" title={m.context}>
            <span className="qt-marker-icon" style={{ color: m.color }}>{m.icon}</span>
            <span className="qt-marker-label">{m.hebrewLabel || m.label}</span>
            <span className="qt-marker-text">{m.marker}</span>
          </div>
        ))}
        {markers.length > 15 && (
          <span className="qt-more">+{markers.length - 15} more</span>
        )}
      </div>
    </div>
  );
});

const QAFlowPanel = memo(function QAFlowPanel({ qaFlow }) {
  if (!qaFlow?.summary) return null;
  const s = qaFlow.summary;

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>⚖️</span>
        <span>שקלא וטריא</span>
      </div>
      <div className="qt-stats-grid">
        {s.questionsAsked > 0 && (
          <div className="qt-stat">
            <span className="qt-stat-value">{s.questionsAsked}</span>
            <span className="qt-stat-label">שאלות</span>
          </div>
        )}
        {s.resolved > 0 && (
          <div className="qt-stat qt-stat-good">
            <span className="qt-stat-value">{s.resolved}</span>
            <span className="qt-stat-label">נפתרו</span>
          </div>
        )}
        {s.unresolved > 0 && (
          <div className="qt-stat qt-stat-warn">
            <span className="qt-stat-value">{s.unresolved}</span>
            <span className="qt-stat-label">פתוחות</span>
          </div>
        )}
        {s.challengesRaised > 0 && (
          <div className="qt-stat">
            <span className="qt-stat-value">{s.challengesRaised}</span>
            <span className="qt-stat-label">קושיות</span>
          </div>
        )}
        {s.proofsOffered > 0 && (
          <div className="qt-stat">
            <span className="qt-stat-value">{s.proofsOffered}</span>
            <span className="qt-stat-label">ראיות</span>
          </div>
        )}
      </div>
      {/* Show detected questions */}
      {qaFlow.flow?.length > 0 && (
        <div className="qt-questions-list">
          {qaFlow.flow.filter(u => u.question).slice(0, 6).map((unit, i) => (
            <div key={i} className="qt-question-item">
              <span className="qt-q-marker">❓</span>
              <span className="qt-q-text">{unit.question.marker || unit.question.label}</span>
              {unit.resolution && <span className="qt-q-resolved">✅</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const AbbreviationsPanel = memo(function AbbreviationsPanel({ abbreviations }) {
  if (!abbreviations || abbreviations.length === 0) return null;

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>📝</span>
        <span>ראשי תיבות ({abbreviations.length})</span>
      </div>
      <div className="qt-abbrev-list">
        {abbreviations.slice(0, 10).map((a, i) => (
          <div key={i} className="qt-abbrev-item">
            <span className="qt-abbrev-short">{a.abbreviation}</span>
            <span className="qt-abbrev-arrow">=</span>
            <span className="qt-abbrev-full">{a.expansion}</span>
          </div>
        ))}
        {abbreviations.length > 10 && (
          <span className="qt-more">+{abbreviations.length - 10} more</span>
        )}
      </div>
    </div>
  );
});

const RabbisPanel = memo(function RabbisPanel({ rabbis }) {
  if (!rabbis || rabbis.length === 0) return null;

  // Deduplicate by name
  const seen = new Set();
  const unique = rabbis.filter(r => {
    const name = r.hebrew || r.name;
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>👤</span>
        <span>חכמים ({unique.length})</span>
      </div>
      <div className="qt-rabbi-list">
        {unique.slice(0, 10).map((r, i) => (
          <div key={i} className="qt-rabbi-item">
            <span className="qt-rabbi-name">{r.hebrew || r.name}</span>
            {r.period && (
              <span className={`qt-rabbi-period qt-period-${r.period}`}>
                {r.period === 'tanna' ? 'תנא' : r.period === 'amora' ? 'אמורא' : r.period}
              </span>
            )}
            {r.generation && (
              <span className="qt-rabbi-gen">דור {r.generation}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

const SvarotPanel = memo(function SvarotPanel({ svarot }) {
  if (!svarot || svarot.length === 0) return null;

  // Deduplicate by label
  const seen = new Set();
  const unique = svarot.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>🧠</span>
        <span>סברות ומידות ({unique.length})</span>
      </div>
      <div className="qt-marker-list">
        {unique.slice(0, 8).map((s, i) => (
          <div key={i} className="qt-marker-item" title={s.description || s.type}>
            <span className="qt-marker-icon">{s.icon}</span>
            <span className="qt-marker-text">{s.label}</span>
            {s.description && <span className="qt-marker-label">{s.description}</span>}
          </div>
        ))}
      </div>
    </div>
  );
});

const HalachicConclusionsPanel = memo(function HalachicConclusionsPanel({ conclusions }) {
  if (!conclusions || conclusions.length === 0) return null;

  return (
    <div className="qt-section">
      <div className="qt-section-title">
        <span>⚖️</span>
        <span>מסקנות הלכתיות ({conclusions.length})</span>
      </div>
      <div className="qt-conclusions-list">
        {conclusions.slice(0, 6).map((c, i) => (
          <div key={i} className="qt-conclusion-item">
            <span className="qt-conclusion-icon">{c.icon}</span>
            <span className="qt-conclusion-text">{c.extracted || c.fullText}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Main QuickToolsPanel
// =============================================================================

const QuickToolsPanel = ({
  markers, qaFlow, abbreviations, rabbis,
  svarot, halachicConclusions, stats
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show if there's data to display
  const hasData = (stats?.markerCount > 0) || (stats?.abbreviationCount > 0) ||
                  (stats?.rabbiCount > 0) || (stats?.questionCount > 0) ||
                  (stats?.svaraCount > 0) || (stats?.conclusionCount > 0);

  if (!hasData) return null;

  const totalFindings = (stats?.markerCount || 0) + (stats?.abbreviationCount || 0) +
                        (stats?.rabbiCount || 0) + (stats?.svaraCount || 0) +
                        (stats?.conclusionCount || 0);

  return (
    <div className="quick-tools-panel">
      <button
        className={`qt-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className="qt-toggle-icon">🔍</span>
        <span className="qt-toggle-text">
          כלי ניתוח מהיר
        </span>
        <span className="qt-toggle-count">{totalFindings} findings</span>
        <span className="qt-toggle-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="qt-content">
          <div className="qt-hint">
            ניתוח מבוסס-דפוסים (ללא AI) — נתונים אלו מזינים את ה-AI לתוצאות מדויקות יותר
          </div>
          <StructurePanel markers={markers} />
          <QAFlowPanel qaFlow={qaFlow} />
          <SvarotPanel svarot={svarot} />
          <HalachicConclusionsPanel conclusions={halachicConclusions} />
          <AbbreviationsPanel abbreviations={abbreviations} />
          <RabbisPanel rabbis={rabbis} />
        </div>
      )}
    </div>
  );
};

QuickToolsPanel.propTypes = {
  markers: PropTypes.array,
  qaFlow: PropTypes.object,
  abbreviations: PropTypes.array,
  rabbis: PropTypes.array,
  svarot: PropTypes.array,
  halachicConclusions: PropTypes.array,
  stats: PropTypes.object
};

export default memo(QuickToolsPanel);
