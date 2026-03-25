/**
 * PRO SCHOLAR V28: Mishna Case Flow Visualization
 * Visual diagram showing case structures like "שתים שהן ארבע"
 * Specifically designed for cases like Shabbat 2a (carrying on Shabbat)
 */

import React, { memo, useMemo, useState } from 'react';

// =============================================================================
// CASE TYPE DETECTION
// =============================================================================

const CASE_PATTERNS = {
  shabbatCarrying: {
    detect: /יציאות\s+השבת|שתים\s+שהן\s+ארבע/,
    type: 'שבת - הוצאה',
    parties: ['עני', 'בעל הבית'],
    domains: ['רשות הרבים', 'רשות היחיד'],
    actions: ['פשט ידו', 'נטל', 'נתן', 'הכניס', 'הוציא']
  },
  purityCases: {
    detect: /טהור|טמא|מטמא/,
    type: 'טומאה וטהרה',
    states: ['טהור', 'טמא']
  },
  liabilityExempt: {
    detect: /חייב|פטור/,
    type: 'חיוב ופטור',
    outcomes: ['חייב', 'פטור']
  }
};

// =============================================================================
// SHABBAT CARRYING CASE DIAGRAM
// Visual representation of the 8 cases (שתים שהן ארבע בפנים ובחוץ)
// =============================================================================

const ShabbatCarryingDiagram = memo(({ text }) => {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // The 8 cases from Shabbat 2a
  const cases = useMemo(() => [
    // Cases where POOR MAN is liable (עני חייב)
    {
      id: 1,
      actor: 'עני',
      action: 'פשט ידו לפנים',
      secondAction: 'נתן לבעה״ב',
      result: 'עני חייב',
      homeowner: 'פטור',
      liable: 'עני',
      icon: '🤲',
      direction: 'in',
      description: 'עני פשט ידו פנימה ונתן לבעל הבית'
    },
    {
      id: 2,
      actor: 'עני',
      action: 'פשט ידו לפנים',
      secondAction: 'נטל מבעה״ב',
      result: 'עני חייב',
      homeowner: 'פטור',
      liable: 'עני',
      icon: '✋',
      direction: 'in',
      description: 'עני פשט ידו פנימה ונטל מבעל הבית'
    },
    // Cases where HOMEOWNER is liable (בעה״ב חייב)
    {
      id: 3,
      actor: 'בעל הבית',
      action: 'פשט ידו לחוץ',
      secondAction: 'נתן לעני',
      result: 'בעה״ב חייב',
      homeowner: 'חייב',
      liable: 'בעל הבית',
      icon: '🤲',
      direction: 'out',
      description: 'בעל הבית פשט ידו החוצה ונתן לעני'
    },
    {
      id: 4,
      actor: 'בעל הבית',
      action: 'פשט ידו לחוץ',
      secondAction: 'נטל מעני',
      result: 'בעה״ב חייב',
      homeowner: 'חייב',
      liable: 'בעל הבית',
      icon: '✋',
      direction: 'out',
      description: 'בעל הבית פשט ידו החוצה ונטל מהעני'
    },
    // Cases where BOTH are exempt (שניהם פטורים) - Round 1
    {
      id: 5,
      actor: 'עני',
      action: 'פשט ידו לפנים',
      secondAction: 'בעה״ב נטל',
      result: 'שניהם פטורים',
      homeowner: 'פטור',
      liable: null,
      icon: '🤝',
      direction: 'in',
      description: 'עני פשט ידו פנימה ובעל הבית נטל ממנו'
    },
    {
      id: 6,
      actor: 'עני',
      action: 'פשט ידו לפנים',
      secondAction: 'בעה״ב נתן',
      result: 'שניהם פטורים',
      homeowner: 'פטור',
      liable: null,
      icon: '🤝',
      direction: 'in',
      description: 'עני פשט ידו פנימה ובעל הבית נתן לתוכה'
    },
    // Cases where BOTH are exempt (שניהם פטורים) - Round 2
    {
      id: 7,
      actor: 'בעל הבית',
      action: 'פשט ידו לחוץ',
      secondAction: 'עני נטל',
      result: 'שניהם פטורים',
      homeowner: 'פטור',
      liable: null,
      icon: '🤝',
      direction: 'out',
      description: 'בעל הבית פשט ידו החוצה ועני נטל ממנו'
    },
    {
      id: 8,
      actor: 'בעל הבית',
      action: 'פשט ידו לחוץ',
      secondAction: 'עני נתן',
      result: 'שניהם פטורים',
      homeowner: 'פטור',
      liable: null,
      icon: '🤝',
      direction: 'out',
      description: 'בעל הבית פשט ידו החוצה ועני נתן לתוכה'
    }
  ], []);

  // Group by outcome
  const groupedCases = useMemo(() => ({
    povertyLiable: cases.filter(c => c.liable === 'עני'),
    homeownerLiable: cases.filter(c => c.liable === 'בעל הבית'),
    bothExempt: cases.filter(c => c.liable === null)
  }), [cases]);

  const displayCases = showAll ? cases : cases.slice(0, 4);

  return (
    <div className="mishna-case-flow shabbat-carrying" dir="rtl">
      <div className="case-flow-header">
        <span className="flow-icon">🚶</span>
        <span className="flow-title">יציאות השבת - שתים שהן ארבע</span>
        <button
          className="expand-btn"
          onClick={() => setShowAll(!showAll)}
          type="button"
        >
          {showAll ? '▼ צמצם' : `◀ הצג כל ${cases.length}`}
        </button>
      </div>

      {/* Visual Domain Representation */}
      <div className="domain-visual">
        <div className="domain outside">
          <span className="domain-label">רשות הרבים</span>
          <span className="domain-emoji">🏘️</span>
          <div className="person poor">
            <span className="person-emoji">👤</span>
            <span className="person-label">עני</span>
          </div>
        </div>
        <div className="domain-divider">
          <div className="divider-line" />
          <span className="divider-label">מחיצה</span>
        </div>
        <div className="domain inside">
          <span className="domain-label">רשות היחיד</span>
          <span className="domain-emoji">🏠</span>
          <div className="person homeowner">
            <span className="person-emoji">👨‍🏠</span>
            <span className="person-label">בעל הבית</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="case-summary">
        <div className="summary-stat liable-poor">
          <span className="stat-icon">🔴</span>
          <span className="stat-count">{groupedCases.povertyLiable.length}</span>
          <span className="stat-label">עני חייב</span>
        </div>
        <div className="summary-stat liable-homeowner">
          <span className="stat-icon">🔵</span>
          <span className="stat-count">{groupedCases.homeownerLiable.length}</span>
          <span className="stat-label">בעה״ב חייב</span>
        </div>
        <div className="summary-stat both-exempt">
          <span className="stat-icon">⚪</span>
          <span className="stat-count">{groupedCases.bothExempt.length}</span>
          <span className="stat-label">שניהם פטורים</span>
        </div>
      </div>

      {/* Case Cards */}
      <div className="case-cards">
        {displayCases.map((caseItem) => (
          <div
            key={caseItem.id}
            className={`case-card ${caseItem.liable ? `liable-${caseItem.liable === 'עני' ? 'poor' : 'homeowner'}` : 'exempt'} ${selectedCase === caseItem.id ? 'selected' : ''}`}
            onClick={() => setSelectedCase(selectedCase === caseItem.id ? null : caseItem.id)}
          >
            <div className="card-header">
              <span className="case-number">{caseItem.id}</span>
              <span className="case-icon">{caseItem.icon}</span>
              <span className="case-direction">{caseItem.direction === 'in' ? '➡️' : '⬅️'}</span>
            </div>

            <div className="card-body">
              <div className="action-flow">
                <div className="action-step">
                  <span className="step-actor">{caseItem.actor}</span>
                  <span className="step-action">{caseItem.action}</span>
                </div>
                <span className="flow-arrow">↓</span>
                <div className="action-step">
                  <span className="step-action secondary">{caseItem.secondAction}</span>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <span className={`result-badge ${caseItem.liable ? 'liable' : 'exempt'}`}>
                {caseItem.result}
              </span>
            </div>

            {/* Expanded detail */}
            {selectedCase === caseItem.id && (
              <div className="card-detail">
                <p className="detail-text">{caseItem.description}</p>
                <div className="detail-reason">
                  <span className="reason-label">סיבה:</span>
                  <span className="reason-text">
                    {caseItem.liable
                      ? `${caseItem.liable} עשה עקירה והנחה`
                      : 'המעשה נחלק בין שניהם'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Principle Explanation */}
      <div className="principle-box">
        <span className="principle-icon">💡</span>
        <div className="principle-content">
          <span className="principle-title">הכלל:</span>
          <p className="principle-text">
            חייב רק מי שעשה את כל המלאכה (עקירה והנחה).
            כאשר המעשה מתחלק בין שניים - שניהם פטורים.
          </p>
        </div>
      </div>
    </div>
  );
});

ShabbatCarryingDiagram.displayName = 'ShabbatCarryingDiagram';

// =============================================================================
// GENERIC LIABILITY/EXEMPTION CASE DIAGRAM
// For other Mishna case structures
// =============================================================================

const GenericCaseDiagram = memo(({ cases, title }) => {
  const [expanded, setExpanded] = useState(false);

  if (!cases || cases.length === 0) return null;

  return (
    <div className="mishna-case-flow generic" dir="rtl">
      <div className="case-flow-header">
        <span className="flow-icon">⚖️</span>
        <span className="flow-title">{title || 'מקרים'}</span>
        <button
          className="expand-btn"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? '▼ צמצם' : `◀ ${cases.length} מקרים`}
        </button>
      </div>

      {expanded && (
        <div className="generic-case-list">
          {cases.map((c, i) => (
            <div key={i} className="generic-case-item">
              <span className="case-number">{i + 1}</span>
              <span className="case-text">{c.text || c}</span>
              {c.outcome && (
                <span className={`case-outcome ${c.outcome.includes('חייב') ? 'liable' : 'exempt'}`}>
                  {c.outcome}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

GenericCaseDiagram.displayName = 'GenericCaseDiagram';

// =============================================================================
// MAIN COMPONENT: MishnaCaseFlow
// Detects case type and renders appropriate visualization
// =============================================================================

const MishnaCaseFlow = memo(({ text, mishnaAnalysis }) => {
  // Detect which type of case structure we're dealing with
  const caseType = useMemo(() => {
    if (!text) return null;

    // Check for Shabbat carrying cases
    if (CASE_PATTERNS.shabbatCarrying.detect.test(text)) {
      return 'shabbatCarrying';
    }

    // Check for general liability cases
    if (CASE_PATTERNS.liabilityExempt.detect.test(text)) {
      return 'liabilityExempt';
    }

    return null;
  }, [text]);

  // Don't render if no case structure detected
  if (!caseType && !mishnaAnalysis?.summary?.hasCaseStructure) {
    return null;
  }

  return (
    <div className="mishna-case-flow-container">
      {caseType === 'shabbatCarrying' && (
        <ShabbatCarryingDiagram text={text} />
      )}

      {caseType === 'liabilityExempt' && !caseType.includes('shabbat') && (
        <GenericCaseDiagram
          cases={mishnaAnalysis?.elements?.filter(e => e.type === 'ruling') || []}
          title="מקרי חיוב ופטור"
        />
      )}
    </div>
  );
});

MishnaCaseFlow.displayName = 'MishnaCaseFlow';

export { ShabbatCarryingDiagram, GenericCaseDiagram };
export default MishnaCaseFlow;
