import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../../utils/hebrewUtils';
export const V29CrossReferencePanel = memo(({ text }) => {
  const [expanded, setExpanded] = useState(false);

  const crossRefs = useMemo(() => {
    if (!text) return [];
    const cleanText = stripNikud(text);
    const refs = [];

    if (/יציאות\s+השבת|שתים\s+שהן\s+ארבע/.test(cleanText)) {
      refs.push({ source: 'שבועות ב.', type: 'parallel', reason: '"שבועות שתים שהן ארבע" - מבנה זהה', icon: '🔗' });
      refs.push({ source: 'שבת עג.', type: 'related', reason: 'ל"ט אבות מלאכה - הוצאה', icon: '📖' });
      refs.push({ source: 'שבת צו:', type: 'continuation', reason: 'פרטי דיני הוצאה', icon: '➡️' });
      refs.push({ source: 'רמב"ם שבת יב-יג', type: 'halakha', reason: 'הלכות הוצאה', icon: '⚖️' });
    }
    if (/תנן\s+התם/.test(cleanText)) {
      refs.push({ source: 'משנה מקבילה', type: 'citation', reason: 'הגמרא מצטטת משנה ממקום אחר', icon: '📜' });
    }
    return refs;
  }, [text]);

  if (crossRefs.length === 0) return null;

  return (
    <div className="v29-crossref-panel" dir="rtl">
      <div className="crossref-header" onClick={() => setExpanded(!expanded)}>
        <span className="header-icon">🔗</span>
        <span className="header-title">מקורות מקבילים</span>
        <span className="header-count">{crossRefs.length}</span>
        <span className="expand-icon">{expanded ? '▼' : '◀'}</span>
      </div>
      {expanded && (
        <div className="crossref-list">
          {crossRefs.map((ref, i) => (
            <div key={i} className={`crossref-item ${ref.type}`}>
              <span className="ref-icon">{ref.icon}</span>
              <div className="ref-content">
                <span className="ref-source">{ref.source}</span>
                <span className="ref-reason">{ref.reason}</span>
              </div>
              <span className={`ref-type-badge ${ref.type}`}>
                {ref.type === 'parallel' ? 'מקביל' : ref.type === 'related' ? 'קשור' : ref.type === 'continuation' ? 'המשך' : ref.type === 'halakha' ? 'הלכה' : 'ציטוט'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

V29CrossReferencePanel.displayName = 'V29CrossReferencePanel';

// =============================================================================
// HALAKHIC CONCEPTS MAP - Visual map of concepts and relationships
// =============================================================================
