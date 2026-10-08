import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../../utils/hebrewUtils';

export const SugyaMermaidDiagram = memo(({ text, patterns }) => {
  const [viewMode, setViewMode] = useState('flow');

  const diagramData = useMemo(() => {
    if (!text) return null;
    const cleanText = stripNikud(text);
    const nodes = [];
    const questions = [];

    if (/מתני[׳']|יציאות\s+השבת/.test(cleanText)) {
      nodes.push({ id: 'mishna', label: '📜 משנה', type: 'mishna' });
    }
    if (/גמ[׳']|תנן\s+התם|אמר\s+רב/.test(cleanText)) {
      nodes.push({ id: 'gemara', label: '📚 גמרא', type: 'gemara' });
    }
    if (/מאי\s+טעמ/.test(cleanText)) questions.push({ id: 'q1', text: 'מאי טעמא?' });
    if (/תנן\s+התם/.test(cleanText)) questions.push({ id: 'q2', text: 'תנן התם' });
    if (/מנא\s+הני/.test(cleanText)) questions.push({ id: 'q3', text: 'מנה"מ?' });

    questions.forEach(q => nodes.push({ id: q.id, label: `❓ ${q.text}`, type: 'question' }));

    if (/דכתיב|שנאמר/.test(cleanText)) {
      nodes.push({ id: 'pasuk', label: '📖 פסוק', type: 'proof' });
    }
    if (/תניא|תנו\s+רבנן/.test(cleanText)) {
      nodes.push({ id: 'braita', label: '📋 ברייתא', type: 'source' });
    }
    if (/לא\s+קשיא|הכי\s+קאמר|אלא/.test(cleanText)) {
      nodes.push({ id: 'resolution', label: '✅ תירוץ', type: 'resolution' });
    }

    return { nodes, questions };
  }, [text, patterns]);

  if (!diagramData || diagramData.nodes.length === 0) return null;

  return (
    <div className="v29-mermaid-diagram" dir="rtl">
      <div className="v29-card-header diagram">
        <span className="header-icon">📊</span>
        <span className="header-title">תרשים מהלך הסוגיא</span>
        <div className="view-toggle">
          <button className={`toggle-btn ${viewMode === 'flow' ? 'active' : ''}`} onClick={() => setViewMode('flow')} type="button">זרימה</button>
          <button className={`toggle-btn ${viewMode === 'structure' ? 'active' : ''}`} onClick={() => setViewMode('structure')} type="button">מבנה</button>
        </div>
      </div>

      {viewMode === 'flow' && (
        <div className="flow-diagram">
          <div className="flow-track">
            {diagramData.nodes.map((node, i) => (
              <div key={node.id} className={`flow-node ${node.type}`}>
                <div className="node-content"><span className="node-label">{node.label}</span></div>
                {i < diagramData.nodes.length - 1 && <div className="flow-connector"><div className="connector-line" /><span className="connector-label">↓</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'structure' && (
        <div className="structure-diagram">
          <div className="structure-tree">
            <div className="tree-level level-0"><div className="tree-node mishna"><span>📜</span> משנה</div></div>
            <div className="tree-branch" />
            <div className="tree-level level-1"><div className="tree-node gemara"><span>📚</span> גמרא</div></div>
            <div className="tree-branch split" />
            <div className="tree-level level-2">
              {diagramData.questions.map(q => <div key={q.id} className="tree-node question"><span>❓</span> {q.text}</div>)}
            </div>
          </div>
        </div>
      )}

      <div className="diagram-legend">
        <div className="legend-item"><span className="dot mishna" /> משנה</div>
        <div className="legend-item"><span className="dot gemara" /> גמרא</div>
        <div className="legend-item"><span className="dot question" /> שאלה</div>
        <div className="legend-item"><span className="dot resolution" /> תירוץ</div>
      </div>
    </div>
  );
});

SugyaMermaidDiagram.displayName = 'SugyaMermaidDiagram';

// =============================================================================
// CROSS-REFERENCE PANEL - Related texts and parallel sugyot
// =============================================================================

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

export const StudyProgressTracker = memo(({ analysis }) => {
  const progress = useMemo(() => {
    const items = [
      { name: 'הבנת המשנה', status: analysis?.mishnaAnalysis ? 'complete' : 'pending', icon: '📜' },
      { name: 'שאלות הגמרא', status: analysis?.patterns?.some(p => p.type === 'question') ? 'complete' : 'pending', icon: '❓' },
      { name: 'מקורות וראיות', status: analysis?.patterns?.some(p => p.type === 'proof' || p.type === 'citation') ? 'complete' : 'pending', icon: '📚' },
      { name: 'מסקנה/תירוץ', status: analysis?.patterns?.some(p => p.type === 'resolution') ? 'complete' : 'pending', icon: '✅' },
      { name: 'הלכה למעשה', status: 'pending', icon: '⚖️' }
    ];
    const completed = items.filter(i => i.status === 'complete').length;
    return { items, completed, percentage: Math.round((completed / items.length) * 100) };
  }, [analysis]);

  return (
    <div className="v29-progress-tracker" dir="rtl">
      <div className="progress-header">
        <span className="progress-icon">📈</span>
        <span className="progress-title">התקדמות בלימוד</span>
        <span className="progress-percent">{progress.percentage}%</span>
      </div>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div>
      <div className="progress-items">
        {progress.items.map((item, i) => (
          <div key={i} className={`progress-item ${item.status}`}>
            <span className="item-icon">{item.icon}</span>
            <span className="item-name">{item.name}</span>
            <span className="item-status">{item.status === 'complete' ? '✓' : '○'}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

StudyProgressTracker.displayName = 'StudyProgressTracker';

// =============================================================================
// EXPORTS
// =============================================================================
