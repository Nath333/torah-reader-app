import React, { memo, useMemo, useState } from 'react';

export const RabbisDetailPanel = memo(({ rabbis }) => {
  const [expandedRabbi, setExpandedRabbi] = useState(null);

  // Enrich rabbi data
  const enrichedRabbis = useMemo(() => {
    if (!rabbis || rabbis.length === 0) return [];

    const rabbiInfo = {
      'רב': {
        fullName: 'רב (אבא אריכא)',
        period: 'אמורא - דור ראשון',
        location: 'בבל',
        teacher: 'רבי יהודה הנשיא',
        known: 'מייסד ישיבת סורא',
        icon: '👨‍🏫'
      },
      'שמואל': {
        fullName: 'שמואל (מר שמואל)',
        period: 'אמורא - דור ראשון',
        location: 'נהרדעא, בבל',
        teacher: 'לוי בר סיסי',
        known: 'מומחה בדיני ממונות ורפואה',
        icon: '⚖️'
      },
      'רבי יוחנן': {
        fullName: 'רבי יוחנן בר נפחא',
        period: 'אמורא - דור שני',
        location: 'טבריה, א"י',
        teacher: 'רבי יהודה הנשיא',
        known: 'ראש ישיבת טבריה',
        icon: '🏛️'
      }
    };

    return rabbis.map(r => ({
      ...r,
      ...(rabbiInfo[r.name] || {}),
      displayName: r.name
    }));
  }, [rabbis]);

  if (!enrichedRabbis.length) {
    return (
      <div className="v29-rabbis-panel anonymous" dir="rtl">
        <div className="v29-card-header rabbis">
          <span className="header-icon">📜</span>
          <span className="header-title">סתם משנה</span>
        </div>
        <div className="anonymous-info">
          <p className="info-text">
            <span className="info-icon">💡</span>
            משנה זו נשנתה ללא ציון שם חכם מסוים ("סתם משנה").
          </p>
          <p className="info-detail">
            לפי כלל ההלכה: "סתם משנה - רבי מאיר", כלומר סתם משנה מייצגת
            לרוב את דעת רבי מאיר או דעה שנתקבלה להלכה.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="v29-rabbis-panel" dir="rtl">
      <div className="v29-card-header rabbis">
        <span className="header-icon">👥</span>
        <span className="header-title">חכמים בסוגיא</span>
        <span className="header-badge">{enrichedRabbis.length}</span>
      </div>

      <div className="rabbis-list">
        {enrichedRabbis.map((rabbi, i) => (
          <div
            key={i}
            className={`rabbi-card ${expandedRabbi === i ? 'expanded' : ''}`}
            onClick={() => setExpandedRabbi(expandedRabbi === i ? null : i)}
          >
            <div className="rabbi-header">
              <span className="rabbi-icon">{rabbi.icon || '👤'}</span>
              <span className="rabbi-name">{rabbi.displayName}</span>
              <span className="rabbi-period">{rabbi.period || (rabbi.type === 'amora' ? 'אמורא' : 'תנא')}</span>
              <span className="expand-icon">{expandedRabbi === i ? '▼' : '◀'}</span>
            </div>

            {expandedRabbi === i && rabbi.fullName && (
              <div className="rabbi-details">
                {rabbi.fullName && (
                  <div className="detail-row">
                    <span className="detail-label">שם מלא:</span>
                    <span className="detail-value">{rabbi.fullName}</span>
                  </div>
                )}
                {rabbi.location && (
                  <div className="detail-row">
                    <span className="detail-label">מקום:</span>
                    <span className="detail-value">{rabbi.location}</span>
                  </div>
                )}
                {rabbi.teacher && (
                  <div className="detail-row">
                    <span className="detail-label">רבו:</span>
                    <span className="detail-value">{rabbi.teacher}</span>
                  </div>
                )}
                {rabbi.known && (
                  <div className="detail-row">
                    <span className="detail-label">ידוע ב:</span>
                    <span className="detail-value">{rabbi.known}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

RabbisDetailPanel.displayName = 'RabbisDetailPanel';

// =============================================================================
// SOURCE QUALITY INDICATOR
// Shows data source reliability and coverage
// =============================================================================
