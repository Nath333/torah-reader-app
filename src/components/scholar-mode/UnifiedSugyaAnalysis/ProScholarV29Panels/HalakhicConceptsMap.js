import React, { memo, useMemo } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../../utils/hebrewUtils';
export const HalakhicConceptsMap = memo(({ text }) => {
  const concepts = useMemo(() => {
    if (!text) return [];
    const cleanText = stripNikud(text);
    const found = [];

    if (/הוצאה|מוציא/.test(cleanText)) found.push({ name: 'הוצאה', category: 'מלאכה', definition: 'העברה מרשות לרשות', icon: '➡️', related: ['עקירה', 'הנחה'] });
    if (/עקירה/.test(cleanText)) found.push({ name: 'עקירה', category: 'פעולה', definition: 'הרמת החפץ ממקומו', icon: '⬆️', related: ['הנחה', 'הוצאה'] });
    if (/הנחה/.test(cleanText)) found.push({ name: 'הנחה', category: 'פעולה', definition: 'הנחת החפץ במקום חדש', icon: '⬇️', related: ['עקירה', 'הוצאה'] });
    if (/רשות\s*ה?רבים/.test(cleanText)) found.push({ name: 'רשות הרבים', category: 'רשות', definition: 'רחבה 16 אמה, פתוחה', icon: '🏘️', related: ['רשות היחיד'] });
    if (/רשות\s*ה?יחיד/.test(cleanText)) found.push({ name: 'רשות היחיד', category: 'רשות', definition: 'מוקף מחיצות 10 טפחים', icon: '🏠', related: ['רשות הרבים'] });
    if (/חייב|פטור/.test(cleanText)) found.push({ name: 'חיוב/פטור', category: 'דין', definition: 'תוצאת המעשה הלכתית', icon: '⚖️', related: ['מזיד', 'שוגג'] });
    return found;
  }, [text]);

  if (concepts.length === 0) return null;

  const grouped = concepts.reduce((acc, c) => { if (!acc[c.category]) acc[c.category] = []; acc[c.category].push(c); return acc; }, {});

  return (
    <div className="v29-concepts-map" dir="rtl">
      <div className="v29-card-header concepts">
        <span className="header-icon">🗺️</span>
        <span className="header-title">מפת מושגים הלכתיים</span>
      </div>
      <div className="concepts-grid">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="concept-category">
            <div className="category-header"><span className="category-name">{category}</span></div>
            <div className="category-items">
              {items.map((item, i) => (
                <div key={i} className="concept-card">
                  <div className="concept-header"><span className="concept-icon">{item.icon}</span><span className="concept-name">{item.name}</span></div>
                  <p className="concept-definition">{item.definition}</p>
                  <div className="concept-related">{item.related.map((r, j) => <span key={j} className="related-tag">{r}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

HalakhicConceptsMap.displayName = 'HalakhicConceptsMap';

// =============================================================================
// STUDY PROGRESS TRACKER
// =============================================================================
