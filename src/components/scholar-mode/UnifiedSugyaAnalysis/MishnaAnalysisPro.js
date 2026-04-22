/**
 * MishnaAnalysisPro - PRO SCHOLAR V31 Consolidated Mishna Analysis
 *
 * CONSOLIDATES 3 PREVIOUS VERSIONS:
 * - MishnaAnalysisPanel (simple badges + flat list)
 * - MishnaBreakdown (grouped by type + one-liner summary)
 * - MishnaDeepAnalysis (tabs with cases/principles/definitions)
 *
 * Features:
 * - Quick View: Badges + one-liner summary
 * - Grouped View: Elements organized by type (enumeration, ruling, dispute, etc.)
 * - Deep Analysis: Tabs for summary, cases, principles, definitions
 * - Shabbat 2a special handling with interactive case grid
 * - Responsive design with RTL support
 */

import React, { memo, useMemo, useState } from 'react';
import { analyzeMishnaStructure } from '../../../services/scholarly/discoursePatternService';
import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';
import './MishnaAnalysisPro.css';

// =============================================================================
// MISHNA ANALYSIS PRO - Consolidated Component
// =============================================================================

const MishnaAnalysisPro = memo(({ text, compact = false, initialView = 'quick' }) => {
  const [viewMode, setViewMode] = useState(initialView); // 'quick' | 'grouped' | 'deep'
  const [activeSection, setActiveSection] = useState('summary');
  const [hoveredCase, setHoveredCase] = useState(null);

  // Run Mishna structure analysis
  const mishnaAnalysis = useMemo(() => analyzeMishnaStructure(text), [text]);

  // Deep analysis data (principles, definitions, etc.)
  const deepAnalysis = useMemo(() => {
    if (!text) return null;

    const cleanText = stripNikud(text);

    // Detect topic
    const topicMatch = cleanText.match(/מתני[׳']?\s*(.{10,50})/);
    const topic = topicMatch ? topicMatch[1].trim() : '';

    // Detect Shabbat carrying cases
    const isShabbatCarrying = /יציאות\s*ה?שבת|שתים\s+שהן\s+ארבע/.test(cleanText);

    // Extract case analysis for Shabbat
    const caseAnalysis = [];
    if (isShabbatCarrying) {
      caseAnalysis.push(
        { category: 'עני חייב', count: 2, icon: '🔴', color: '#ef4444' },
        { category: 'בעה"ב חייב', count: 2, icon: '🔵', color: '#3b82f6' },
        { category: 'שניהם פטורין', count: 4, icon: '⚪', color: '#6b7280' }
      );
    }

    // Extract legal principles
    const principles = [];
    if (isShabbatCarrying || /עקירה.*הנחה|הנחה.*עקירה/.test(cleanText)) {
      principles.push({
        text: 'מלאכת הוצאה טעונה עקירה והנחה',
        explanation: 'חייב רק מי שעשה את כל המלאכה - גם עקירה וגם הנחה'
      });
    }
    if (isShabbatCarrying || /שניהם\s+פטור/.test(cleanText)) {
      principles.push({
        text: 'זה עקר וזה הניח - שניהם פטורין',
        explanation: 'כשהמלאכה מתחלקת בין שניים, אין חיוב על אף אחד'
      });
    }
    if (/פשט.*יד|נתן.*לתוך|נטל.*מתוך/.test(cleanText)) {
      principles.push({
        text: 'הושטת יד מרשות לרשות',
        explanation: 'החיוב תלוי במי שפושט את ידו ובאיזו רשות הוא עומד'
      });
    }

    // Extract definitions
    const definitions = [];
    if (isShabbatCarrying || /רשות\s*ה?רבים|רשות\s*ה?יחיד|בחוץ|בפנים/.test(cleanText)) {
      definitions.push(
        { term: 'רשות הרבים', meaning: 'מקום ציבורי - רחוב, שוק (בחוץ)', icon: '🏘️' },
        { term: 'רשות היחיד', meaning: 'מקום פרטי - בית, חצר מוקפת (בפנים)', icon: '🏠' }
      );
    }
    if (isShabbatCarrying || /עני|בעל\s*ה?בית/.test(cleanText)) {
      definitions.push(
        { term: 'עני', meaning: 'העומד ברשות הרבים (בחוץ)', icon: '👤' },
        { term: 'בעל הבית', meaning: 'העומד ברשות היחיד (בפנים)', icon: '🏠' }
      );
    }
    if (isShabbatCarrying) {
      definitions.push(
        { term: 'הוצאה', meaning: 'העברה מרשות היחיד לרשות הרבים', icon: '➡️' },
        { term: 'הכנסה', meaning: 'העברה מרשות הרבים לרשות היחיד', icon: '⬅️' },
        { term: 'עקירה', meaning: 'הרמת החפץ מרשות אחת', icon: '⬆️' },
        { term: 'הנחה', meaning: 'הנחת החפץ ברשות השנייה', icon: '⬇️' }
      );
    }

    // Generate scholarly summary
    let summary = '';
    if (isShabbatCarrying) {
      summary = `משנה זו פותחת את מסכת שבת בדיני הוצאה מרשות לרשות. המשנה מונה שמונה מקרים של העברת חפץ בין עני (ברה"ר) לבעל הבית (ברה"י), ומבארת מתי כל אחד חייב או פטור. העיקרון המנחה: חייב רק מי שעשה עקירה והנחה.`;
    } else if (cleanText.length > 50) {
      summary = 'ניתוח המשנה מציג את הדינים והכללים העיקריים.';
    }

    return {
      topic,
      isShabbatCarrying,
      caseAnalysis,
      principles,
      definitions,
      summary,
      totalCases: caseAnalysis.reduce((sum, c) => sum + c.count, 0)
    };
  }, [text]);

  // Group elements by type (from MishnaBreakdown)
  const grouped = useMemo(() => {
    const groups = {
      enumeration: [],
      condition: [],
      exception: [],
      ruling: [],
      dispute: [],
      case_structure: [],
      other: []
    };
    mishnaAnalysis.elements.forEach(el => {
      const type = el.type || 'other';
      if (groups[type]) groups[type].push(el);
      else groups.other.push(el);
    });
    return groups;
  }, [mishnaAnalysis.elements]);

  // Generate one-liner summary (from MishnaBreakdown)
  const oneLiner = useMemo(() => {
    const parts = [];
    const { summary } = mishnaAnalysis;
    if (summary.hasEnumeration) parts.push(`${grouped.enumeration.length} מניינים`);
    if (summary.hasRulings) parts.push(`${grouped.ruling.length} פסקים`);
    if (summary.hasDisputes) parts.push('מחלוקת');
    if (summary.hasConditions) parts.push('תנאים');
    return parts.join(' • ');
  }, [mishnaAnalysis.summary, grouped]);

  // Shabbat cases data for interactive grid
  const shabbatCases = useMemo(() => [
    { id: 1, scenario: 'עני פשט יד פנימה ונתן', result: 'עני חייב', reason: 'עשה עקירה והנחה', category: 'liable-poor', icon: '🤲➡️' },
    { id: 2, scenario: 'עני פשט יד פנימה ונטל', result: 'עני חייב', reason: 'עשה עקירה והנחה', category: 'liable-poor', icon: '✋⬅️' },
    { id: 3, scenario: 'בעה"ב פשט יד החוצה ונתן', result: 'בעה"ב חייב', reason: 'עשה עקירה והנחה', category: 'liable-homeowner', icon: '🤲⬅️' },
    { id: 4, scenario: 'בעה"ב פשט יד החוצה ונטל', result: 'בעה"ב חייב', reason: 'עשה עקירה והנחה', category: 'liable-homeowner', icon: '✋➡️' },
    { id: 5, scenario: 'עני פשט יד, בעה"ב נטל', result: 'שניהם פטורין', reason: 'עני עשה עקירה, בעה"ב עשה הנחה', category: 'exempt', icon: '🤝' },
    { id: 6, scenario: 'עני פשט יד, בעה"ב נתן', result: 'שניהם פטורין', reason: 'בעה"ב עשה עקירה, עני עשה הנחה', category: 'exempt', icon: '🤝' },
    { id: 7, scenario: 'בעה"ב פשט יד, עני נטל', result: 'שניהם פטורין', reason: 'בעה"ב עשה עקירה, עני עשה הנחה', category: 'exempt', icon: '🤝' },
    { id: 8, scenario: 'בעה"ב פשט יד, עני נתן', result: 'שניהם פטורין', reason: 'עני עשה עקירה, בעה"ב עשה הנחה', category: 'exempt', icon: '🤝' }
  ], []);

  // Empty state
  if (!mishnaAnalysis.elements.length && !deepAnalysis?.isShabbatCarrying) {
    return (
      <div className="mishna-pro-empty" dir="rtl">
        <span className="empty-icon">📜</span>
        <span>אין משנה מזוהה בטקסט זה</span>
      </div>
    );
  }

  const deepSections = [
    { id: 'summary', label: 'סיכום', icon: '📋' },
    { id: 'cases', label: 'מקרים', icon: '⚖️' },
    { id: 'principles', label: 'כללים', icon: '💡' },
    { id: 'definitions', label: 'מושגים', icon: '📖' }
  ];

  const groupLabels = {
    enumeration: { label: '🔢 מניינים', color: '#3b82f6' },
    ruling: { label: '⚖️ פסקים', color: '#10b981' },
    dispute: { label: '⚔️ מחלוקות', color: '#f59e0b' },
    condition: { label: '🔀 תנאים', color: '#8b5cf6' },
    exception: { label: '⚡ יוצאים', color: '#ef4444' },
    case_structure: { label: '📋 מקרים', color: '#06b6d4' },
    other: { label: '📝 נוספים', color: '#6b7280' }
  };

  return (
    <div className={`mishna-pro ${compact ? 'compact' : ''}`} dir="rtl">
      {/* Header with view mode toggle */}
      <div className="mishna-pro-header">
        <div className="header-title">
          <span className="header-icon">📜</span>
          <span>ניתוח משנה</span>
          {deepAnalysis?.totalCases > 0 && (
            <span className="header-badge">{deepAnalysis.totalCases} מקרים</span>
          )}
        </div>

        {!compact && (
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'quick' ? 'active' : ''}`}
              onClick={() => setViewMode('quick')}
              title="תצוגה מהירה"
            >
              מהיר
            </button>
            <button
              className={`mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('grouped')}
              title="מקובץ לפי סוג"
            >
              מקובץ
            </button>
            <button
              className={`mode-btn ${viewMode === 'deep' ? 'active' : ''}`}
              onClick={() => setViewMode('deep')}
              title="ניתוח מעמיק"
            >
              מעמיק
            </button>
          </div>
        )}
      </div>

      {/* One-liner summary (always shown) */}
      {oneLiner && (
        <div className="mishna-one-liner">
          <span className="one-liner-icon">📋</span>
          <span className="one-liner-text">{oneLiner}</span>
        </div>
      )}

      {/* QUICK VIEW: Badges + flat list */}
      {viewMode === 'quick' && (
        <div className="mishna-quick-view">
          {/* Summary badges */}
          <div className="mishna-badges">
            {mishnaAnalysis.summary.hasEnumeration && (
              <span className="badge enumeration">
                🔢 ספירה ({mishnaAnalysis.summary.breakdown?.enumeration || grouped.enumeration.length})
              </span>
            )}
            {mishnaAnalysis.summary.hasConditions && (
              <span className="badge condition">
                🔀 תנאים ({mishnaAnalysis.summary.breakdown?.condition || grouped.condition.length})
              </span>
            )}
            {mishnaAnalysis.summary.hasExceptions && (
              <span className="badge exception">
                ⚡ יוצאים ({mishnaAnalysis.summary.breakdown?.exception || grouped.exception.length})
              </span>
            )}
            {mishnaAnalysis.summary.hasRulings && (
              <span className="badge ruling">
                ⚖️ פסקים ({mishnaAnalysis.summary.breakdown?.ruling || grouped.ruling.length})
              </span>
            )}
            {mishnaAnalysis.summary.hasDisputes && (
              <span className="badge dispute">
                ⚔️ מחלוקות ({mishnaAnalysis.summary.breakdown?.dispute || grouped.dispute.length})
              </span>
            )}
          </div>

          {/* Flat elements list */}
          <div className="mishna-elements-flat">
            {mishnaAnalysis.elements.slice(0, compact ? 5 : 10).map((el, i) => (
              <div key={i} className={`element-item type-${el.type}`} style={{ borderLeftColor: el.color }}>
                <span className="el-icon">{el.icon}</span>
                <span className="el-text">{el.text}</span>
              </div>
            ))}
            {mishnaAnalysis.elements.length > (compact ? 5 : 10) && (
              <button className="show-more-btn" onClick={() => setViewMode('grouped')}>
                + עוד {mishnaAnalysis.elements.length - (compact ? 5 : 10)} פריטים
              </button>
            )}
          </div>
        </div>
      )}

      {/* GROUPED VIEW: Elements organized by type */}
      {viewMode === 'grouped' && (
        <div className="mishna-grouped-view">
          {Object.entries(grouped).map(([type, elements]) => {
            if (elements.length === 0) return null;
            const { label, color } = groupLabels[type] || groupLabels.other;
            return (
              <div key={type} className="element-group" style={{ '--group-color': color }}>
                <div className="group-header">
                  <span className="group-label">{label}</span>
                  <span className="group-count">{elements.length}</span>
                </div>
                <div className="group-elements">
                  {elements.map((el, i) => (
                    <div key={i} className="grouped-element">
                      <span className="el-marker">{el.icon || '•'}</span>
                      <span className="el-text">{el.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEEP VIEW: Full scholarly analysis with tabs */}
      {viewMode === 'deep' && deepAnalysis && (
        <div className="mishna-deep-view">
          {/* Section Tabs */}
          <div className="deep-tabs">
            {deepSections.map(sec => (
              <button
                key={sec.id}
                className={`deep-tab ${activeSection === sec.id ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <span className="tab-icon">{sec.icon}</span>
                <span className="tab-label">{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Summary Section */}
          {activeSection === 'summary' && (
            <div className="deep-section summary-section">
              <p className="summary-text">{deepAnalysis.summary}</p>

              {deepAnalysis.isShabbatCarrying && (
                <div className="topic-highlight">
                  <span className="topic-icon">🚶</span>
                  <div className="topic-content">
                    <span className="topic-title">יציאות השבת - שתים שהן ארבע</span>
                    <span className="topic-subtitle">מלאכת הוצאה מרשות לרשות</span>
                  </div>
                </div>
              )}

              {/* Quick case stats */}
              {deepAnalysis.caseAnalysis.length > 0 && (
                <div className="case-stats">
                  {deepAnalysis.caseAnalysis.map((stat, i) => (
                    <div key={i} className="stat-item" style={{ '--stat-color': stat.color }}>
                      <span className="stat-icon">{stat.icon}</span>
                      <span className="stat-count">{stat.count}</span>
                      <span className="stat-label">{stat.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cases Section with Interactive Grid */}
          {activeSection === 'cases' && (
            <div className="deep-section cases-section">
              {deepAnalysis.isShabbatCarrying ? (
                <>
                  {/* Domain Visual */}
                  <div className="domain-visual">
                    <div className="domain-box outside">
                      <span className="domain-icon">🏘️</span>
                      <span className="domain-name">רשות הרבים</span>
                      <span className="person-label">👤 עני</span>
                    </div>
                    <div className="domain-separator">
                      <div className="separator-line" />
                      <span className="separator-text">מחיצה</span>
                    </div>
                    <div className="domain-box inside">
                      <span className="domain-icon">🏠</span>
                      <span className="domain-name">רשות היחיד</span>
                      <span className="person-label">🧑‍💼 בעה"ב</span>
                    </div>
                  </div>

                  {/* Interactive Cases Grid */}
                  <div className="cases-grid">
                    {shabbatCases.map(c => (
                      <div
                        key={c.id}
                        className={`case-card ${c.category} ${hoveredCase === c.id ? 'hovered' : ''}`}
                        onMouseEnter={() => setHoveredCase(c.id)}
                        onMouseLeave={() => setHoveredCase(null)}
                      >
                        <div className="case-header">
                          <span className="case-num">{c.id}</span>
                          <span className="case-icon">{c.icon}</span>
                        </div>
                        <div className="case-body">
                          <span className="case-scenario">{c.scenario}</span>
                        </div>
                        <div className="case-footer">
                          <span className={`case-result ${c.category}`}>{c.result}</span>
                        </div>
                        {hoveredCase === c.id && (
                          <div className="case-tooltip">
                            <span>{c.reason}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="cases-legend">
                    <div className="legend-item liable-poor"><span className="legend-dot" /><span>עני חייב (2)</span></div>
                    <div className="legend-item liable-homeowner"><span className="legend-dot" /><span>בעה"ב חייב (2)</span></div>
                    <div className="legend-item exempt"><span className="legend-dot" /><span>שניהם פטורין (4)</span></div>
                  </div>
                </>
              ) : (
                <div className="generic-cases">
                  {mishnaAnalysis.elements.filter(e => e.type === 'ruling' || e.type === 'case_structure').map((item, i) => (
                    <div key={i} className="case-item">
                      <span className="case-num">{i + 1}</span>
                      <span className="case-text">{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Principles Section */}
          {activeSection === 'principles' && (
            <div className="deep-section principles-section">
              {deepAnalysis.principles.length > 0 ? (
                deepAnalysis.principles.map((p, i) => (
                  <div key={i} className="principle-card">
                    <div className="principle-header">
                      <span className="principle-icon">💡</span>
                      <span className="principle-text">{p.text}</span>
                    </div>
                    <p className="principle-explanation">{p.explanation}</p>
                  </div>
                ))
              ) : (
                <div className="no-data">לא זוהו כללים הלכתיים</div>
              )}
            </div>
          )}

          {/* Definitions Section */}
          {activeSection === 'definitions' && (
            <div className="deep-section definitions-section">
              {deepAnalysis.definitions.length > 0 ? (
                <div className="definitions-grid">
                  {deepAnalysis.definitions.map((d, i) => (
                    <div key={i} className="definition-card">
                      <span className="def-icon">{d.icon}</span>
                      <div className="def-content">
                        <span className="def-term">{d.term}</span>
                        <span className="def-meaning">{d.meaning}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">לא זוהו מושגים</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MishnaAnalysisPro.displayName = 'MishnaAnalysisPro';

export default MishnaAnalysisPro;
