/**
 * SugyaFlowAnalysis - Multi-view sugya structure visualization
 *
 * Extracted from TalmudToolsTab.js (PRO SCHOLAR V31)
 * Provides 4 view modes for visualizing Talmudic argumentation:
 * - Tree view: Hierarchical Q&A with collapsible branches
 * - Flow view: Linear argumentation timeline
 * - List view: Compact tabular pattern listing
 * - Text view: Highlighted source text with pattern markers
 *
 * Includes dialectic-only filter (שקלא וטריא) and pattern stats.
 *
 * @module SugyaFlowAnalysis
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { detectStructuralMarkers, TALMUDIC_PATTERNS } from '../../../services/scholarly/discoursePatternService';
import { HEBREW_TYPE_LABELS, TYPE_CATEGORIES } from '../../../constants/talmudStudy';
import { useCopyToClipboard } from '../../../hooks/useTalmudStudy';
import SugyaTreeView from './SugyaTreeAnalysis';

// =============================================================================
// Sugya Summary - Quick overview of the sugya structure
// =============================================================================

const SugyaSummary = React.memo(function SugyaSummary({ stats }) {
  const hasMishna = stats.mishna > 0;
  const hasGemara = stats.gemara > 0;
  const hasBaraita = stats.baraita > 0;

  const questionCount = (stats.question || 0) + (stats.objection || 0);
  const answerCount = (stats.resolution || 0) + (stats.proof || 0);

  const sugyaType = hasMishna && hasGemara ? 'סוגיא שלמה'
    : hasMishna ? 'משנה בלבד'
    : hasGemara ? 'גמרא'
    : 'קטע';

  const complexity = questionCount < 2 ? 'פשוטה'
    : questionCount < 5 ? 'בינונית'
    : 'מורכבת';

  const complexityClass = questionCount < 2 ? 'simple'
    : questionCount < 5 ? 'moderate'
    : 'complex';

  return (
    <div className="sugya-summary">
      <div className="summary-header">
        <div className="summary-title">
          <span className="title-icon">📜</span>
          <span className="title-text">מהלך הסוגיא</span>
        </div>
        <div className="summary-badges">
          <span className="badge sugya-type">{sugyaType}</span>
          <span className={`badge complexity ${complexityClass}`}>{complexity}</span>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-group">
          <div className="stat-item" title="מבנה">
            <span className="stat-emoji">📘</span>
            <span className="stat-value">{(stats.mishna || 0) + (stats.gemara || 0)}</span>
            <span className="stat-label">מבנה</span>
          </div>
          {hasBaraita && (
            <div className="stat-item" title="ברייתות">
              <span className="stat-emoji">📜</span>
              <span className="stat-value">{stats.baraita || 0}</span>
              <span className="stat-label">ברייתות</span>
            </div>
          )}
        </div>

        <div className="stat-divider">⟷</div>

        <div className="stat-group dialectic">
          <div className="stat-item question" title="שאלות וקושיות">
            <span className="stat-emoji">❓</span>
            <span className="stat-value">{questionCount}</span>
            <span className="stat-label">קושיות</span>
          </div>
          <div className="stat-item answer" title="תירוצים וראיות">
            <span className="stat-emoji">✅</span>
            <span className="stat-value">{answerCount}</span>
            <span className="stat-label">תירוצים</span>
          </div>
        </div>

        {(stats.scripture || 0) > 0 && (
          <>
            <div className="stat-divider">⟷</div>
            <div className="stat-group">
              <div className="stat-item" title="פסוקים">
                <span className="stat-emoji">📖</span>
                <span className="stat-value">{stats.scripture || 0}</span>
                <span className="stat-label">פסוקים</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick navigation hint */}
      <div className="summary-hint">
        <span className="hint-icon">💡</span>
        <span className="hint-text">לחץ על סימן כדי לראות פירוט והקשר</span>
      </div>
    </div>
  );
});

// =============================================================================
// FlowNode - Single pattern node in the linear flow view
// =============================================================================

const FlowNode = React.memo(function FlowNode({
  pattern,
  index,
  isSelected,
  onClick,
  relationToNext,
  isPartOfChain
}) {
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Determine node style based on category
  const category = Object.entries(TYPE_CATEGORIES).find(([, cat]) =>
    cat.types.includes(pattern.type)
  )?.[0] || 'other';

  return (
    <div className={`flow-node-wrapper ${isPartOfChain ? 'in-chain' : ''}`}>
      <button
        className={`sugya-flow-node ${isSelected ? 'selected' : ''} category-${category}`}
        onClick={() => onClick(pattern)}
        style={{ '--node-color': config.color || '#6b7280' }}
        type="button"
        dir="rtl"
      >
        <div className="node-index">{index + 1}</div>
        <div className="node-icon">{config.icon || '📌'}</div>
        <div className="node-content">
          <div className="node-hebrew-label">{hebrewLabel}</div>
          <div className="node-marker">{pattern.marker}</div>
          {pattern.context && (
            <div className="node-context-preview">{pattern.context}</div>
          )}
        </div>
        {isSelected && <div className="node-selected-mark">◀</div>}
      </button>

      {/* Connector to next node */}
      {relationToNext && (
        <div className={`flow-connector type-${relationToNext}`}>
          <div className="connector-line" />
          <div className="connector-label">
            {relationToNext === 'answer' ? 'תירוץ' :
             relationToNext === 'challenge' ? 'קושיא' :
             relationToNext === 'proof' ? 'ראיה' : '↓'}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PatternDetailCard - Detailed info about a selected pattern
// =============================================================================

// Detailed explanations in Hebrew style
function getDetailedExplanation(type) {
  const explanations = {
    mishna: 'זהו תחילת המשנה - הטקסט העיקרי שהגמרא דנה בו. המשנה מכילה את ההלכה או ההוראה מתקופת התנאים.',
    gemara: 'זהו תחילת הגמרא - דיון האמוראים והסברת המשנה. הגמרא מבארת, מקשה ומרחיבה את דברי המשנה.',
    question: 'כאן עולה שאלה לבירור או לחקירה. השאלה באה להבהיר נקודה או לחקור את גדרי הדין.',
    objection: 'קושיא על הנאמר קודם. יכולה להיות קושיא מסברא (מתקיף) או ממקור סותר (מתיבי, ורמינהו).',
    proof: 'הבאת ראיה לחיזוק הדברים. "תא שמע" מביא ראיה ממקור תנאי, "שמע מינה" מסיק מסקנה.',
    resolution: 'תירוץ לשאלה או לקושיא. "לא קשיא" מתרץ סתירה, "הכי קאמר" מבהיר את הכוונה.',
    alternative: 'גרסה או פירוש חלופי. "איכא דאמרי" מביא מסורת אחרת, "לישנא אחרינא" גרסה שונה.',
    baraita: 'מקור תנאי מחוץ למשנה (ברייתא/תוספתא). "תנו רבנן" או "תניא" פותחים ציטוט ברייתא.',
    scripture: 'הבאת פסוק מהתורה או מהנביאים כמקור או ראיה. "שנאמר" או "דכתיב" מציינים ציטוט.'
  };
  return explanations[type] || `סימן מבני בסוגיא מסוג: ${type}`;
}

function getStudyGuidance(type) {
  const guidance = {
    mishna: 'קרא את המשנה בעיון תחילה. הבן את ההלכה הבסיסית לפני שתצלול לדיון הגמרא.',
    gemara: 'הגמרא בדרך כלל מתחילה בבירור הנחות סמויות או עמימויות במשנה.',
    question: 'שים לב מה בדיוק נשאל. התשובה לעתים מגלה עקרונות עמוקים יותר.',
    objection: 'קושיות מחדדות את ההבנה. שקול מה היה בעייתי אילו הקושיא הייתה עומדת.',
    proof: 'בדוק האם הראיה חותכת או שניתנת לדחייה. איכות הראיה משפיעה על המסקנה.',
    resolution: 'התירוץ לעתים מכניס חילוקים והגבלות חשובות על הכלל.',
    alternative: 'גרסאות חלופיות עשויות לשקף מסורות שונות. שתיהן עשויות להיות רלוונטיות להלכה.',
    baraita: 'ברייתות מספקות הקשר נוסף ולעתים מכילות פרטים חשובים שאינם במשנה.',
    scripture: 'ציטוטי פסוקים מגלים את מקור התורה להלכות ולעקרונות.'
  };
  return guidance[type] || 'התבונן כיצד אלמנט זה קשור למבנה הכללי של הסוגיא.';
}

const PatternDetailCard = React.memo(function PatternDetailCard({
  pattern,
  text,
  onClose
}) {
  const { copied, copy } = useCopyToClipboard();
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Get context with more surrounding text
  const contextRadius = 80;
  const contextStart = Math.max(0, pattern.position - contextRadius);
  const contextEnd = Math.min(text?.length || 0, pattern.endPosition + contextRadius);
  const contextBefore = text?.slice(contextStart, pattern.position) || '';
  const contextAfter = text?.slice(pattern.endPosition, contextEnd) || '';

  const handleCopy = () => {
    copy(`${pattern.marker}\n${hebrewLabel} (${config.label})\n\nהקשר: ...${contextBefore}${pattern.marker}${contextAfter}...`);
  };

  return (
    <div className="pattern-detail-card" style={{ '--accent-color': config.color }}>
      <div className="card-header">
        <div className="header-main">
          <span className="header-icon">{config.icon}</span>
          <div className="header-titles">
            <span className="header-hebrew">{hebrewLabel}</span>
            <span className="header-english">{config.label}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="העתק"
            type="button"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button className="close-btn" onClick={onClose} type="button">×</button>
        </div>
      </div>

      <div className="card-body">
        {/* The marker itself */}
        <div className="marker-display" dir="rtl">
          <span className="marker-text">{pattern.marker}</span>
        </div>

        {/* Explanation */}
        <div className="explanation-section">
          <div className="section-title">הסבר</div>
          <p className="explanation-text">{getDetailedExplanation(pattern.type)}</p>
        </div>

        {/* Context in text */}
        <div className="context-section" dir="rtl">
          <div className="section-title">הקשר בגמרא</div>
          <div className="context-text">
            <span className="context-before">{contextStart > 0 ? '...' : ''}{contextBefore}</span>
            <mark className="context-marker">{pattern.marker}</mark>
            <span className="context-after">{contextAfter}{contextEnd < text?.length ? '...' : ''}</span>
          </div>
        </div>

        {/* Study guidance */}
        <div className="study-section">
          <div className="section-title">
            <span className="title-icon">📚</span>
            <span>נקודה ללימוד</span>
          </div>
          <p className="study-tip">{getStudyGuidance(pattern.type)}</p>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// HighlightedSugyaText - Text view with pattern highlighting
// =============================================================================

const HighlightedSugyaText = React.memo(function HighlightedSugyaText({
  text,
  patterns,
  onPatternClick,
  selectedPattern
}) {
  const segments = useMemo(() => {
    if (!patterns.length) return [{ type: 'text', content: text }];

    const result = [];
    let lastEnd = 0;
    const sorted = [...patterns].sort((a, b) => a.position - b.position);

    sorted.forEach(p => {
      if (p.position > lastEnd) {
        result.push({ type: 'text', content: text.slice(lastEnd, p.position) });
      }
      result.push({ type: 'pattern', pattern: p, content: text.slice(p.position, p.endPosition) });
      lastEnd = p.endPosition;
    });

    if (lastEnd < text.length) {
      result.push({ type: 'text', content: text.slice(lastEnd) });
    }

    return result;
  }, [text, patterns]);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.content}</span>;
        }
        const config = TALMUDIC_PATTERNS[seg.pattern.type];
        const isSelected = selectedPattern?.position === seg.pattern.position;
        return (
          <mark
            key={i}
            className={`sugya-highlight ${isSelected ? 'selected' : ''}`}
            style={{
              '--highlight-color': config?.color,
              backgroundColor: `${config?.color}${isSelected ? '40' : '15'}`,
              borderBottom: `2px solid ${config?.color}`
            }}
            onClick={() => onPatternClick(seg.pattern)}
            title={`${config?.icon} ${HEBREW_TYPE_LABELS[seg.pattern.type]}`}
          >
            {seg.content}
          </mark>
        );
      })}
    </>
  );
});

// =============================================================================
// SugyaFlowSection - Main flow visualization with multiple view modes
// =============================================================================

const SugyaFlowSection = React.memo(function SugyaFlowSection({ text }) {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'flow' | 'list' | 'text'
  const [showOnlyDialectic, setShowOnlyDialectic] = useState(false);
  const scrollRef = useRef(null);

  // Detect patterns
  const patterns = useMemo(() => {
    if (!text) return [];
    return detectStructuralMarkers(text);
  }, [text]);

  // Filter to show only shakla v'tarya if enabled
  const displayedPatterns = useMemo(() => {
    if (!showOnlyDialectic) return patterns;
    const dialecticTypes = TYPE_CATEGORIES.dialectic.types;
    return patterns.filter(p => dialecticTypes.includes(p.type));
  }, [patterns, showOnlyDialectic]);

  // Calculate stats
  const stats = useMemo(() => {
    const grouped = {};
    patterns.forEach(p => {
      grouped[p.type] = (grouped[p.type] || 0) + 1;
    });
    return grouped;
  }, [patterns]);

  // Determine relationships between patterns (for connectors)
  const getRelationToNext = useCallback((current, next) => {
    if (!next) return null;
    if (['question', 'objection'].includes(current.type) && ['resolution', 'proof'].includes(next.type)) {
      return 'answer';
    }
    if (current.type === 'proof' && next.type === 'resolution') {
      return 'proof';
    }
    return null;
  }, []);

  const handlePatternClick = useCallback((pattern) => {
    setSelectedPattern(prev =>
      prev?.position === pattern.position ? null : pattern
    );
  }, []);

  // Scroll to selected pattern
  useEffect(() => {
    if (selectedPattern && scrollRef.current) {
      const element = scrollRef.current.querySelector(`[data-position="${selectedPattern.position}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPattern]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📜</div>
        <div className="empty-title">אין טקסט לניתוח</div>
        <p className="empty-text">
          נווט לדף בתלמוד כדי לראות את מהלך הסוגיא.
          <br />כלי זה מסייע בהבנת מבנה הדיון התלמודי.
        </p>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📜</div>
        <div className="empty-title">לא נמצאו סימני מבנה</div>
        <p className="empty-text">
          טקסט זה אינו מכיל סימני מבנה תלמודיים מוכרים.
        </p>
        <div className="empty-examples">
          <div className="example-title">סימנים נפוצים:</div>
          <div className="example-list">
            <span>מתני׳</span>
            <span>גמ׳</span>
            <span>תא שמע</span>
            <span>מתקיף</span>
            <span>איבעיא להו</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sugya-flow-section">
      {/* Summary */}
      <SugyaSummary stats={stats} />

      {/* Controls */}
      <div className="flow-controls">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
            type="button"
            title="תצוגת עץ - קושיות ותירוצים"
          >
            <span className="btn-icon">🌳</span>
            <span className="btn-label">עץ</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'flow' ? 'active' : ''}`}
            onClick={() => setViewMode('flow')}
            type="button"
            title="תצוגת מהלך - ציר זמן"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">מהלך</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            type="button"
            title="תצוגת רשימה - טבלה"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-label">רשימה</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'text' ? 'active' : ''}`}
            onClick={() => setViewMode('text')}
            type="button"
            title="תצוגת טקסט - עם הדגשות"
          >
            <span className="btn-icon">📝</span>
            <span className="btn-label">טקסט</span>
          </button>
        </div>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showOnlyDialectic}
            onChange={(e) => setShowOnlyDialectic(e.target.checked)}
          />
          <span className="toggle-label">שקלא וטריא בלבד</span>
        </label>
      </div>

      {/* Tree View */}
      {viewMode === 'tree' && (
        <div className="tree-view-container">
          <SugyaTreeView
            patterns={displayedPatterns}
            onSelect={handlePatternClick}
            selectedPattern={selectedPattern}
          />

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Flow View */}
      {viewMode === 'flow' && (
        <div className="flow-view" ref={scrollRef}>
          <div className="flow-timeline">
            {displayedPatterns.map((pattern, index) => (
              <FlowNode
                key={`${pattern.type}-${pattern.position}`}
                pattern={pattern}
                index={index}
                isSelected={selectedPattern?.position === pattern.position}
                onClick={handlePatternClick}
                relationToNext={getRelationToNext(pattern, displayedPatterns[index + 1])}
                isPartOfChain={
                  ['question', 'objection'].includes(pattern.type) ||
                  ['resolution', 'proof'].includes(pattern.type)
                }
                data-position={pattern.position}
              />
            ))}
          </div>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="list-view">
          <table className="patterns-table" dir="rtl">
            <thead>
              <tr>
                <th>#</th>
                <th>סוג</th>
                <th>סימן</th>
                <th>הסבר</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatterns.map((p, i) => {
                const config = TALMUDIC_PATTERNS[p.type];
                const isSelected = selectedPattern?.position === p.position;
                return (
                  <tr
                    key={i}
                    onClick={() => handlePatternClick(p)}
                    className={isSelected ? 'selected' : ''}
                  >
                    <td className="col-num">{i + 1}</td>
                    <td className="col-type">
                      <span className="type-badge" style={{ '--type-color': config?.color }}>
                        {config?.icon} {HEBREW_TYPE_LABELS[p.type] || p.type}
                      </span>
                    </td>
                    <td className="col-marker">{p.marker}</td>
                    <td className="col-label">{config?.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Text View with highlights */}
      {viewMode === 'text' && (
        <div className="text-view">
          <div className="highlighted-text" dir="rtl">
            <HighlightedSugyaText
              text={text}
              patterns={displayedPatterns}
              onPatternClick={handlePatternClick}
              selectedPattern={selectedPattern}
            />
          </div>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flow-legend" dir="rtl">
        <div className="legend-title">מקרא:</div>
        <div className="legend-grid">
          {Object.entries(TYPE_CATEGORIES).map(([catKey, cat]) => (
            <div key={catKey} className="legend-category">
              <span className="category-label">{cat.label}</span>
              <div className="category-items">
                {cat.types.map(type => {
                  const config = TALMUDIC_PATTERNS[type];
                  if (!config) return null;
                  return (
                    <span key={type} className="legend-item" style={{ '--item-color': config.color }}>
                      <span className="item-icon">{config.icon}</span>
                      <span className="item-label">{HEBREW_TYPE_LABELS[type]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default SugyaFlowSection;
export { SugyaSummary, FlowNode, PatternDetailCard, HighlightedSugyaText };
