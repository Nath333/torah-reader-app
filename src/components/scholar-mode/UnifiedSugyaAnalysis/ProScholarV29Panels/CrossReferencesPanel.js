import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../../utils/hebrewUtils';

export const CrossReferencesPanel = memo(({ text }) => {
  const [expanded, setExpanded] = useState(false);

  // Extract cross-references
  const crossRefs = useMemo(() => {
    if (!text) return { all: [], byType: {} };

    const cleanText = stripNikud(text);
    const refs = {
      mishna: [],
      baraita: [],
      scripture: [],
      tractate: [],
      amora: []
    };

    // Parallel Mishna
    const mishnaPattern = /תנן\s+התם\s*([\u0590-\u05FF\s]{3,40})/g;
    let match;
    while ((match = mishnaPattern.exec(cleanText)) !== null) {
      refs.mishna.push({
        marker: 'תנן התם',
        content: match[1]?.trim().substring(0, 35),
        icon: '📘',
        type: 'mishna_parallel'
      });
    }

    // Baraita sources
    const baraitaPatterns = [
      /תנו\s+רבנן\s*([\u0590-\u05FF\s]{3,40})/g,
      /תניא\s*([\u0590-\u05FF\s]{3,40})/g,
      /דתניא\s*([\u0590-\u05FF\s]{3,40})/g
    ];
    baraitaPatterns.forEach(pattern => {
      while ((match = pattern.exec(cleanText)) !== null) {
        refs.baraita.push({
          marker: match[0].split(/\s/)[0],
          content: match[1]?.trim().substring(0, 35),
          icon: '📋',
          type: 'baraita'
        });
      }
    });

    // Scripture citations
    const scripturePatterns = [
      /דכתיב\s*([\u0590-\u05FF\s]{3,50})/g,
      /שנאמר\s*([\u0590-\u05FF\s]{3,50})/g,
      /כדכתיב\s*([\u0590-\u05FF\s]{3,50})/g
    ];
    scripturePatterns.forEach(pattern => {
      while ((match = pattern.exec(cleanText)) !== null) {
        refs.scripture.push({
          marker: match[0].split(/\s/)[0],
          content: match[1]?.trim().substring(0, 40),
          icon: '📖',
          type: 'scripture'
        });
      }
    });

    // Other tractate references
    const tractatePattern = /(?:כדאמרינן|כדאיתא)\s+(?:ב)?(שבת|עירובין|פסחים|ברכות|יומא|סוכה|ביצה|מגילה|יבמות|כתובות|גיטין|קידושין|בבא\s*קמא|בבא\s*מציעא|בבא\s*בתרא|סנהדרין|מכות|חולין|נדה)/gi;
    while ((match = tractatePattern.exec(cleanText)) !== null) {
      refs.tractate.push({
        marker: 'כדאמרינן',
        content: match[1],
        icon: '📚',
        type: 'tractate'
      });
    }

    // Amoraic statements with names
    const amoraPattern = /אמר\s+(רב[יא]?\s*[\u0590-\u05FF]{2,12})/g;
    while ((match = amoraPattern.exec(cleanText)) !== null) {
      if (!refs.amora.some(a => a.content === match[1])) {
        refs.amora.push({
          marker: 'אמר',
          content: match[1]?.trim(),
          icon: '👤',
          type: 'amora'
        });
      }
    }

    const all = [
      ...refs.mishna,
      ...refs.baraita,
      ...refs.scripture,
      ...refs.tractate,
      ...refs.amora
    ];

    return { all, byType: refs };
  }, [text]);

  const totalRefs = crossRefs.all.length;

  if (totalRefs === 0) {
    return null;
  }

  const typeLabels = {
    mishna: { label: 'משניות מקבילות', icon: '📘' },
    baraita: { label: 'ברייתות', icon: '📋' },
    scripture: { label: 'פסוקים', icon: '📖' },
    tractate: { label: 'מסכתות אחרות', icon: '📚' },
    amora: { label: 'אמוראים', icon: '👤' }
  };

  return (
    <div className="v30-cross-refs-panel" dir="rtl">
      <div
        className="v30-card-header crossrefs"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <span className="header-icon">🔗</span>
        <span className="header-title">הפניות ומקורות</span>
        <span className="header-badge">{totalRefs}</span>
        <span className="expand-arrow">{expanded ? '▼' : '◀'}</span>
      </div>

      {expanded && (
        <div className="crossrefs-content">
          {Object.entries(crossRefs.byType).map(([type, items]) => {
            if (items.length === 0) return null;
            const typeInfo = typeLabels[type];

            return (
              <div key={type} className="crossref-category">
                <div className="category-header">
                  <span className="cat-icon">{typeInfo.icon}</span>
                  <span className="cat-label">{typeInfo.label}</span>
                  <span className="cat-count">{items.length}</span>
                </div>
                <div className="category-items">
                  {items.slice(0, 5).map((item, i) => (
                    <div key={i} className="crossref-item">
                      <span className="item-marker">{item.marker}</span>
                      <span className="item-content">{item.content}</span>
                    </div>
                  ))}
                  {items.length > 5 && (
                    <div className="more-items">+{items.length - 5} נוספים</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

CrossReferencesPanel.displayName = 'CrossReferencesPanel';

// =============================================================================
// SUGYA MERMAID DIAGRAM - Visual flowchart of sugya structure
// =============================================================================
