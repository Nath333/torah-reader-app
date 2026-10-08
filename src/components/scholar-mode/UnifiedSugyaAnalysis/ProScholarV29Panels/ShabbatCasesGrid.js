import React, { memo, useState } from 'react';

export const ShabbatCasesGrid = memo(({ text }) => {
  const [hoveredCase, setHoveredCase] = useState(null);

  const cases = [
    // עני חייב cases
    {
      id: 1,
      scenario: 'עני פשט יד פנימה ונתן',
      actor: 'עני',
      action: 'נתן לבעה"ב',
      result: 'עני חייב',
      reason: 'עשה עקירה (בחוץ) והנחה (בפנים)',
      category: 'liable-poor',
      icon: '🤲➡️'
    },
    {
      id: 2,
      scenario: 'עני פשט יד פנימה ונטל',
      actor: 'עני',
      action: 'נטל מבעה"ב',
      result: 'עני חייב',
      reason: 'עשה עקירה (בפנים) והנחה (בחוץ)',
      category: 'liable-poor',
      icon: '✋⬅️'
    },
    // בעה"ב חייב cases
    {
      id: 3,
      scenario: 'בעה"ב פשט יד החוצה ונתן',
      actor: 'בעה"ב',
      action: 'נתן לעני',
      result: 'בעה"ב חייב',
      reason: 'עשה עקירה (בפנים) והנחה (בחוץ)',
      category: 'liable-homeowner',
      icon: '🤲⬅️'
    },
    {
      id: 4,
      scenario: 'בעה"ב פשט יד החוצה ונטל',
      actor: 'בעה"ב',
      action: 'נטל מעני',
      result: 'בעה"ב חייב',
      reason: 'עשה עקירה (בחוץ) והנחה (בפנים)',
      category: 'liable-homeowner',
      icon: '✋➡️'
    },
    // שניהם פטורין cases
    {
      id: 5,
      scenario: 'עני פשט יד, בעה"ב נטל',
      actor: 'עני פשט',
      action: 'בעה"ב נטל',
      result: 'שניהם פטורין',
      reason: 'עני עשה עקירה, בעה"ב עשה הנחה',
      category: 'exempt',
      icon: '🤝'
    },
    {
      id: 6,
      scenario: 'עני פשט יד, בעה"ב נתן',
      actor: 'עני פשט',
      action: 'בעה"ב נתן',
      result: 'שניהם פטורין',
      reason: 'בעה"ב עשה עקירה, עני עשה הנחה',
      category: 'exempt',
      icon: '🤝'
    },
    {
      id: 7,
      scenario: 'בעה"ב פשט יד, עני נטל',
      actor: 'בעה"ב פשט',
      action: 'עני נטל',
      result: 'שניהם פטורין',
      reason: 'בעה"ב עשה עקירה, עני עשה הנחה',
      category: 'exempt',
      icon: '🤝'
    },
    {
      id: 8,
      scenario: 'בעה"ב פשט יד, עני נתן',
      actor: 'בעה"ב פשט',
      action: 'עני נתן',
      result: 'שניהם פטורין',
      reason: 'עני עשה עקירה, בעה"ב עשה הנחה',
      category: 'exempt',
      icon: '🤝'
    }
  ];

  return (
    <div className="shabbat-cases-grid">
      {/* Domain Visual */}
      <div className="domain-visual-header">
        <div className="domain-box outside">
          <span className="domain-icon">🏘️</span>
          <span className="domain-name">רשות הרבים</span>
          <span className="person-icon">👤 עני</span>
        </div>
        <div className="domain-separator">
          <div className="separator-line" />
          <span className="separator-label">מחיצה</span>
        </div>
        <div className="domain-box inside">
          <span className="domain-icon">🏠</span>
          <span className="domain-name">רשות היחיד</span>
          <span className="person-icon">🧑‍💼 בעה"ב</span>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="cases-grid">
        {cases.map(c => (
          <div
            key={c.id}
            className={`case-card ${c.category} ${hoveredCase === c.id ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredCase(c.id)}
            onMouseLeave={() => setHoveredCase(null)}
          >
            <div className="case-header">
              <span className="case-number">{c.id}</span>
              <span className="case-icon">{c.icon}</span>
            </div>
            <div className="case-body">
              <span className="case-scenario">{c.scenario}</span>
            </div>
            <div className="case-footer">
              <span className={`case-result ${c.category}`}>{c.result}</span>
            </div>

            {/* Tooltip on hover */}
            {hoveredCase === c.id && (
              <div className="case-tooltip">
                <span className="tooltip-reason">{c.reason}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="cases-legend">
        <div className="legend-item liable-poor">
          <span className="legend-dot" />
          <span>עני חייב (2)</span>
        </div>
        <div className="legend-item liable-homeowner">
          <span className="legend-dot" />
          <span>בעה"ב חייב (2)</span>
        </div>
        <div className="legend-item exempt">
          <span className="legend-dot" />
          <span>שניהם פטורין (4)</span>
        </div>
      </div>
    </div>
  );
});

ShabbatCasesGrid.displayName = 'ShabbatCasesGrid';

// =============================================================================
// GEMARA DEEP ANALYSIS CARD
// Comprehensive breakdown of Gemara structure and argumentation
// =============================================================================
