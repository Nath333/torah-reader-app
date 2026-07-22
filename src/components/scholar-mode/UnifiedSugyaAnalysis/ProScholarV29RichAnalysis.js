/**
 * PRO SCHOLAR V29: Rich Analysis Components
 * Deep scholarly analysis with detailed summaries for Mishna & Gemara
 * Enhanced visualizations and source integration
 */

import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';
// ShabbatCasesGrid is the only sibling-panel component used in JSX inside this
// file; the rest are pure re-exports below. Pure re-export doesn't create a
// local binding, so we need this import for the JSX site at line ~246.
import { ShabbatCasesGrid } from './ProScholarV29RichAnalysis.panels';

// =============================================================================
// MISHNA DEEP ANALYSIS CARD
// Comprehensive breakdown of Mishna structure, cases, and legal principles
// =============================================================================

const MishnaDeepAnalysis = memo(({ mishnaAnalysis, text }) => {
  const [activeSection, setActiveSection] = useState('summary');

  // Extract comprehensive Mishna data
  const analysis = useMemo(() => {
    if (!text) return null;

    // Strip nikud for reliable matching
    const cleanText = stripNikud(text);

    // Detect the main topic
    const topicMatch = cleanText.match(/מתני[׳']?\s*(.{10,50})/);
    const topic = topicMatch ? topicMatch[1].trim() : '';

    // Parse the Shabbat carrying cases specifically (handle with/without nikud)
    const isShabbatCarrying = /יציאות\s*ה?שבת|שתים\s+שהן\s+ארבע/.test(cleanText);

    // Extract all cases with their rulings
    const caseAnalysis = [];

    if (isShabbatCarrying) {
      // Shabbat 2a has exactly 8 cases: 2 poor liable, 2 homeowner liable, 4 both exempt
      // The Mishna describes: "שתים שהן ארבע בפנים ושתים שהן ארבע בחוץ"
      // Count by looking for specific ruling patterns in the text

      // More flexible matching for "העני חייב" variations
      const poorLiablePatterns = [
        /העני\s*חי+ב/gi,
        /חי+ב\s*ו?בעל\s*ה?בית\s*פטור/gi  // "חייב ובעל הבית פטור"
      ];

      // More flexible matching for "בעל הבית חייב" variations
      const homeownerLiablePatterns = [
        /בעל\s*ה?בית\s*חי+ב/gi,
        /חי+ב\s*ו?ה?עני\s*פטור/gi  // "חייב והעני פטור"
      ];

      // Count "שניהם פטורין" occurrences
      const exemptMatches = cleanText.match(/שניהם\s*פטורי?[םן]?/gi);

      // Count חייב occurrences that indicate rulings (for validation)
      const chayavMatches = cleanText.match(/חי+ב/g);
      const totalChayavCount = chayavMatches?.length || 0;

      // Calculate counts - for Shabbat 2a, use knowledge of 8 total cases
      // totalChayavCount helps validate the detection accuracy
      let poorCount = 0;
      let homeownerCount = 0;
      poorLiablePatterns.forEach(p => {
        const m = cleanText.match(p);
        if (m) poorCount += m.length;
      });
      homeownerLiablePatterns.forEach(p => {
        const m = cleanText.match(p);
        if (m) homeownerCount += m.length;
      });

      const exemptCount = exemptMatches?.length || 0;

      // Validation: totalChayavCount should roughly match poorCount + homeownerCount
      // for Shabbat 2a, expect ~4 חייב occurrences (2 poor + 2 homeowner liable cases)
      const detectionValid = totalChayavCount >= 2 && totalChayavCount <= 6;

      // If detection failed but we know it's Shabbat 2a, use the known structure
      // The Mishna explicitly states "שתים שהן ארבע" - 2 that are 4, meaning 8 cases total
      if (!detectionValid || poorCount + homeownerCount + exemptCount < 4) {
        // Use canonical counts for Shabbat 2a
        poorCount = Math.max(poorCount, 2);
        homeownerCount = Math.max(homeownerCount, 2);
        // exemptCount should be 4 if we see at least 2 "שניהם פטורין"
        if (exemptCount >= 1) {
          caseAnalysis.push(
            { category: 'עני חייב', count: 2, icon: '🔴', color: '#ef4444' },
            { category: 'בעה"ב חייב', count: 2, icon: '🔵', color: '#3b82f6' },
            { category: 'שניהם פטורין', count: 4, icon: '⚪', color: '#6b7280' }
          );
        } else {
          caseAnalysis.push(
            { category: 'עני חייב', count: poorCount || 2, icon: '🔴', color: '#ef4444' },
            { category: 'בעה"ב חייב', count: homeownerCount || 2, icon: '🔵', color: '#3b82f6' },
            { category: 'שניהם פטורין', count: 4, icon: '⚪', color: '#6b7280' }
          );
        }
      } else {
        caseAnalysis.push(
          { category: 'עני חייב', count: poorCount || 2, icon: '🔴', color: '#ef4444' },
          { category: 'בעה"ב חייב', count: homeownerCount || 2, icon: '🔵', color: '#3b82f6' },
          { category: 'שניהם פטורין', count: exemptCount || 4, icon: '⚪', color: '#6b7280' }
        );
      }
    }

    // Extract legal principles (כללים)
    const principles = [];

    // The carrying principle is always true for Shabbat 2a
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

    // Extract definitions - always show for Shabbat carrying
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
      totalCases: caseAnalysis.reduce((sum, c) => sum + c.count, 0),
      structure: mishnaAnalysis?.elements || []
    };
  }, [text, mishnaAnalysis]);

  if (!analysis) {
    return (
      <div className="v29-empty-state">
        <span className="empty-icon">📜</span>
        <span className="empty-text">לא זוהה תוכן משנה</span>
      </div>
    );
  }

  const sections = [
    { id: 'summary', label: 'סיכום', icon: '📋' },
    { id: 'cases', label: 'מקרים', icon: '⚖️' },
    { id: 'principles', label: 'כללים', icon: '💡' },
    { id: 'definitions', label: 'מושגים', icon: '📖' }
  ];

  return (
    <div className="v29-mishna-deep" dir="rtl">
      <div className="v29-card-header">
        <span className="header-icon">📜</span>
        <span className="header-title">ניתוח מעמיק - משנה</span>
        <span className="header-badge">{analysis.totalCases} מקרים</span>
      </div>

      {/* Section Tabs */}
      <div className="v29-section-tabs">
        {sections.map(sec => (
          <button
            key={sec.id}
            className={`section-tab ${activeSection === sec.id ? 'active' : ''}`}
            onClick={() => setActiveSection(sec.id)}
            type="button"
          >
            <span className="tab-icon">{sec.icon}</span>
            <span className="tab-label">{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Summary Section */}
      {activeSection === 'summary' && (
        <div className="v29-section summary-section">
          <div className="summary-box">
            <p className="summary-text">{analysis.summary}</p>
          </div>

          {analysis.isShabbatCarrying && (
            <div className="topic-highlight">
              <span className="topic-icon">🚶</span>
              <div className="topic-content">
                <span className="topic-title">יציאות השבת - שתים שהן ארבע</span>
                <span className="topic-subtitle">מלאכת הוצאה מרשות לרשות</span>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="quick-stats">
            {analysis.caseAnalysis.map((stat, i) => (
              <div key={i} className="stat-item" style={{ '--stat-color': stat.color }}>
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-count">{stat.count}</span>
                <span className="stat-label">{stat.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cases Section */}
      {activeSection === 'cases' && (
        <div className="v29-section cases-section">
          {analysis.isShabbatCarrying ? (
            <ShabbatCasesGrid text={text} />
          ) : (
            <div className="generic-cases">
              {analysis.structure.filter(e => e.type === 'ruling' || e.type === 'case').map((item, i) => (
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
        <div className="v29-section principles-section">
          {analysis.principles.length > 0 ? (
            analysis.principles.map((p, i) => (
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
        <div className="v29-section definitions-section">
          {analysis.definitions.length > 0 ? (
            <div className="definitions-grid">
              {analysis.definitions.map((d, i) => (
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
  );
});

MishnaDeepAnalysis.displayName = 'MishnaDeepAnalysis';

// Re-export secondary components (extracted to .panels.js for maintainability)
export {
  GemaraDeepAnalysis,
  RabbisDetailPanel,
  SourceQualityIndicator,
  ShabbatCasesGrid,
  SugyaMermaidDiagram,
  V29CrossReferencePanel,
  CrossReferencesPanel,
  HalakhicConceptsMap,
  StudyProgressTracker
} from './ProScholarV29RichAnalysis.panels';

export { MishnaDeepAnalysis };
export default MishnaDeepAnalysis;
