/**
 * ProScholarV29RichAnalysis secondary components
 *
 * Extracted from ProScholarV29RichAnalysis.js. The main MishnaDeepAnalysis
 * component remains in the primary file.
 */
import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';

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

export const GemaraDeepAnalysis = memo(({ patterns, qaFlow, rabbis, text }) => {
  const [activeTab, setActiveTab] = useState('flow');

  // PRO SCHOLAR V30: Analyze Gemara structure with enhanced detection
  const analysis = useMemo(() => {
    if (!text) return null;

    const cleanText = stripNikud(text);

    // PRO SCHOLAR V30: More comprehensive Gemara detection
    // 1. Explicit Gemara marker (with nikud variations)
    const hasExplicitGemaraMarker = /גמ[׳']|גְּמָ׳|גמרא/.test(text) || /גמ/.test(cleanText);

    // 2. V30: Extensive Gemara discourse patterns
    const gemaraPatternsList = [
      // Opening/questions
      /תנן\s+התם/, /מאי\s+טעמא/, /מנלן/, /מנא\s+הני\s+מילי/,
      /פשיטא/, /היכי\s+דמי/, /מאי\s+שנא/, /למאי\s+נפקא\s+מינה/,
      /איבעיא\s+לה/, /בעי\s+רב/, /מהו/,
      // Challenges
      /מיתיבי/, /והתניא/, /והאמר/, /ורמינהו/, /והא\s+תנן/,
      // Resolutions
      /לא\s+קשיא/, /הכי\s+קאמר/, /הכא\s+במאי\s+עסקינן/,
      /תרי\s+תנאי/, /אמר\s+לך/,
      // Source citations
      /תנו\s+רבנן/, /תניא/, /דתניא/, /תנא/, /דתנן/,
      /תא\s+שמע/, /איתמר/, /אמר\s+רב/, /אמר\s+מר/,
      // Proof
      /דכתיב/, /שנאמר/, /מדכתיב/,
      // Conclusions
      /שמע\s+מינה/, /אלמא/, /הלכתא/, /ש״מ/,
      // Legal terms
      /חייב/, /פטור/, /מותר/, /אסור/
    ];

    const hasGemaraDiscoursePatterns = gemaraPatternsList.some(p => p.test(cleanText));

    // 3. Check patterns array for gemara-related markers
    const hasGemaraPatterns = patterns?.some(p =>
      p.type === 'gemara' || p.type === 'question' || p.type === 'objection' ||
      p.type === 'resolution' || p.type === 'proof' || p.type === 'baraita' ||
      p.type === 'legal_ruling' || p.type === 'sage_statement' || p.type === 'source_citation'
    );

    // 4. Check qaFlow for any content
    const hasQAFlowContent = qaFlow?.flow?.length > 0 || (Array.isArray(qaFlow) && qaFlow.length > 0);

    // 5. V30: Check if text has typical Gemara length (more than just Mishna)
    const hasSubstantialContent = cleanText.length > 200;

    const hasGemara = hasExplicitGemaraMarker || hasGemaraDiscoursePatterns || hasGemaraPatterns || hasQAFlowContent || hasSubstantialContent;

    // Find Gemara text - look for explicit marker or first discourse pattern
    let gemaraStart = text.indexOf('גמ');
    if (gemaraStart === -1 && hasGemaraDiscoursePatterns) {
      // Find first discourse pattern position
      const discourseMatch = stripNikud(text).match(/תנן\s+התם|אמר\s+רב|תנו\s+רבנן|תניא/);
      if (discourseMatch) {
        gemaraStart = stripNikud(text).indexOf(discourseMatch[0]);
      }
    }
    const gemaraText = gemaraStart > -1 ? text.slice(gemaraStart) : text;

    // Strip nikud from gemara for pattern matching
    const cleanGemara = stripNikud(gemaraText);

    // Extract Q&A pairs - use cleaned text
    const questions = [];
    const questionPatterns = [
      { regex: /מאי\s+[א-ת]{2,30}/g, type: 'מאי (מהו?)' },
      { regex: /מנא\s+הני\s+מילי/g, type: 'מנה"מ (מניין?)' },
      { regex: /מאי\s+שנא/g, type: 'מ"ש (מה שונה?)' },
      { regex: /למאי\s+נפקא\s+מינה/g, type: 'נפק"מ (מה היוצא?)' },
      { regex: /תנן\s+התם/g, type: 'תנן התם (למדנו שם)' },
      { regex: /היכי\s+דמי/g, type: 'היכי דמי (כיצד?)' },
      { regex: /מנלן/g, type: 'מנלן (מניין לנו?)' },
      { regex: /פשיטא/g, type: 'פשיטא (פשוט!)' }
    ];

    questionPatterns.forEach(({ regex, type }) => {
      const matches = cleanGemara.match(regex);
      if (matches) {
        matches.forEach(m => questions.push({ text: m, type }));
      }
    });

    // Extract answers/resolutions - use cleaned text
    const answers = [];
    const answerPatterns = [
      { regex: /אמר\s+רב[יא]?/g, type: 'תירוץ אמורא' },
      { regex: /תניא?/g, type: 'ברייתא' },
      { regex: /דכתיב/g, type: 'ראיה מפסוק' },
      { regex: /שנאמר/g, type: 'ראיה מפסוק' },
      { regex: /תא\s+שמע/g, type: 'ראיה' }
    ];

    answerPatterns.forEach(({ regex, type }) => {
      const matches = cleanGemara.match(regex);
      if (matches) {
        matches.forEach(m => answers.push({ text: m, type }));
      }
    });

    // PRO SCHOLAR V30: Build sugya flow dynamically
    const sugyaFlow = [];
    const cleanGemaraText = stripNikud(gemaraText);

    // 1. Add mishna reference if present
    if (/מתני|יציאות\s+השבת|שתים\s+שהן\s+ארבע/.test(cleanText)) {
      const mishnaContent = cleanText.match(/מתני[׳']?\s*(.{20,60})/)?.[1]?.slice(0, 40) || 'תוכן המשנה';
      sugyaFlow.push({
        type: 'mishna',
        source: 'המשנה',
        text: mishnaContent,
        icon: '📘',
        explanation: 'המשנה הפותחת שעליה דנה הגמרא'
      });
    }

    // 2. Check for parallel citations (תנן התם)
    if (/תנן\s+התם/.test(cleanGemaraText)) {
      const parallelMatch = cleanGemaraText.match(/תנן\s+התם\s*(.{10,40})/);
      sugyaFlow.push({
        type: 'citation',
        source: 'משנה מקבילה',
        text: parallelMatch ? parallelMatch[1].slice(0, 30) : 'מקור מקביל',
        icon: '📜',
        explanation: 'הגמרא מביאה משנה מקבילה לצורך השוואה או ראיה'
      });
    }

    // 3. Check for Baraita (תניא, תנו רבנן)
    if (/תניא|תנו\s*רבנן/.test(cleanGemaraText)) {
      sugyaFlow.push({
        type: 'baraita',
        source: 'ברייתא',
        text: 'מקור תנאי חיצוני למשנה',
        icon: '📋',
        explanation: 'ברייתא - מקור תנאי שלא נכלל במשנה'
      });
    }

    // 4. Check for Amoraic statements (אמר רב, אמר מר)
    if (/אמר\s+רב|אמר\s+מר|איתמר/.test(cleanGemaraText)) {
      const amoraMatch = cleanGemaraText.match(/אמר\s+(רב[יא]?\s*\S+)/);
      sugyaFlow.push({
        type: 'amora',
        source: amoraMatch ? amoraMatch[1] : 'אמורא',
        text: 'מימרא - אמירה של אמורא',
        icon: '💬',
        explanation: 'דברי האמורא על המשנה'
      });
    }

    // 5. Check for challenges (מיתיבי, והתניא, קשיא)
    if (/מיתיבי|והתניא|והאמר|קשיא|ורמינהו/.test(cleanGemaraText)) {
      sugyaFlow.push({
        type: 'challenge',
        source: 'קושיא',
        text: 'הקשו מברייתא או ממשנה אחרת',
        icon: '⚡',
        explanation: 'הגמרא מקשה סתירה ממקור אחר'
      });
    }

    // 6. Check for resolutions (לא קשיא, הכא במאי עסקינן)
    if (/לא\s+קשיא|הכא\s+במאי\s+עסקינן|הכי\s+קאמר/.test(cleanGemaraText)) {
      sugyaFlow.push({
        type: 'resolution',
        source: 'תירוץ',
        text: 'יישוב הקושיא',
        icon: '✅',
        explanation: 'הגמרא מיישבת את הקושיא'
      });
    }

    // 7. Check for biblical proofs (דכתיב, שנאמר)
    if (/דכתיב|שנאמר|מדכתיב/.test(cleanGemaraText)) {
      sugyaFlow.push({
        type: 'scripture',
        source: 'ראיה מפסוק',
        text: 'הוכחה מן הכתוב',
        icon: '📖',
        explanation: 'הגמרא מביאה ראיה מפסוק'
      });
    }

    // 8. Check for conclusions (שמע מינה, הלכתא)
    if (/שמע\s+מינה|הלכתא|אלמא/.test(cleanGemaraText)) {
      sugyaFlow.push({
        type: 'conclusion',
        source: 'מסקנה',
        text: 'מסקנת הסוגיא',
        icon: '🎯',
        explanation: 'המסקנה ההלכתית או הלוגית'
      });
    }

    // PRO SCHOLAR V30: Generate dynamic summary
    let summary = '';
    if (hasGemara) {
      const summaryParts = [];

      // Describe opening
      if (/מתני/.test(cleanText)) {
        summaryParts.push('הסוגיא פותחת במשנה');
      }
      if (/גמ/.test(cleanText)) {
        summaryParts.push('ודנה בפירושה');
      }

      // Describe discourse elements
      if (/תנן\s+התם/.test(cleanGemaraText)) {
        summaryParts.push('מביאה מקבילות ממשניות אחרות');
      }
      if (/תניא|תנו\s*רבנן/.test(cleanGemaraText)) {
        summaryParts.push('מביאה ברייתא');
      }
      if (questions.length > 0) {
        summaryParts.push(`נשאלות ${questions.length} שאלות`);
      }
      if (/לא\s+קשיא|תירוץ/.test(cleanGemaraText)) {
        summaryParts.push('ומתרצת');
      }
      if (rabbis?.length > 0) {
        const rabbiNames = rabbis.slice(0, 3).map(r => r.name || r.match).join(', ');
        summaryParts.push(`בהשתתפות: ${rabbiNames}`);
      }

      summary = summaryParts.join('. ') || 'הגמרא דנה בלשון המשנה ובמשמעותה.';
      if (!summary.endsWith('.')) summary += '.';
    } else {
      summary = 'ניתוח הגמרא בתהליך...';
    }

    return {
      hasGemara,
      gemaraText,
      questions,
      answers,
      sugyaFlow,
      summary,
      patterns: patterns || [],
      qaFlow: qaFlow || []
    };
  }, [text, patterns, qaFlow, rabbis]);

  if (!analysis?.hasGemara) {
    return (
      <div className="v29-empty-state">
        <span className="empty-icon">📚</span>
        <span className="empty-text">לא זוהה תוכן גמרא</span>
      </div>
    );
  }

  const tabs = [
    { id: 'flow', label: 'מהלך', icon: '🔄' },
    { id: 'questions', label: 'שאלות', icon: '❓' },
    { id: 'sources', label: 'מקורות', icon: '📚' },
    { id: 'summary', label: 'סיכום', icon: '📋' }
  ];

  return (
    <div className="v29-gemara-deep" dir="rtl">
      <div className="v29-card-header gemara">
        <span className="header-icon">📚</span>
        <span className="header-title">ניתוח מעמיק - גמרא</span>
        <span className="header-badge">{analysis.questions.length} שאלות</span>
      </div>

      {/* Tabs */}
      <div className="v29-section-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`section-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Flow Tab */}
      {activeTab === 'flow' && (
        <div className="v29-section flow-section">
          <div className="sugya-flow-visual">
            {analysis.sugyaFlow.map((item, i) => (
              <div key={i} className={`flow-item ${item.type}`}>
                <span className="flow-icon">{item.icon}</span>
                <div className="flow-content">
                  <span className="flow-source">{item.source}</span>
                  <span className="flow-text">{item.text}</span>
                  <span className="flow-explanation">{item.explanation}</span>
                </div>
              </div>
            ))}

            {analysis.sugyaFlow.length === 0 && (
              <div className="flow-placeholder">
                <span className="placeholder-icon">🔄</span>
                <span className="placeholder-text">מהלך הסוגיא בבנייה...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="v29-section questions-section">
          {analysis.questions.length > 0 ? (
            <div className="questions-list">
              {analysis.questions.map((q, i) => (
                <div key={i} className="question-item">
                  <span className="q-number">{i + 1}</span>
                  <div className="q-content">
                    <span className="q-type">{q.type}</span>
                    <span className="q-text">{q.text}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">לא זוהו שאלות מפורשות</div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <div className="v29-section sources-section">
          <div className="sources-categories">
            <div className="source-category">
              <span className="cat-icon">📜</span>
              <span className="cat-title">משנה</span>
              <span className="cat-count">1</span>
            </div>
            {analysis.answers.filter(a => a.type === 'ברייתא').length > 0 && (
              <div className="source-category">
                <span className="cat-icon">📋</span>
                <span className="cat-title">ברייתא</span>
                <span className="cat-count">{analysis.answers.filter(a => a.type === 'ברייתא').length}</span>
              </div>
            )}
            {analysis.answers.filter(a => a.type === 'ראיה מפסוק').length > 0 && (
              <div className="source-category">
                <span className="cat-icon">📖</span>
                <span className="cat-title">פסוקים</span>
                <span className="cat-count">{analysis.answers.filter(a => a.type === 'ראיה מפסוק').length}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="v29-section summary-section">
          <div className="summary-box gemara">
            <p className="summary-text">{analysis.summary || 'סיכום בבנייה...'}</p>
          </div>
        </div>
      )}
    </div>
  );
});

GemaraDeepAnalysis.displayName = 'GemaraDeepAnalysis';

// =============================================================================
// RABBIS DETAIL PANEL
// Rich information about mentioned sages
// =============================================================================

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

export const SourceQualityIndicator = memo(({ analysis, text }) => {
  const quality = useMemo(() => {
    let score = 0;
    const factors = [];

    // V29: Enhanced quality scoring with smarter detection

    // Check Mishna analysis (up to 30 points)
    const mishnaElements = analysis?.mishnaAnalysis?.elements?.length || 0;
    if (mishnaElements > 0) {
      const mishnaScore = Math.min(30, 15 + mishnaElements);
      score += mishnaScore;
      factors.push({ name: 'משנה', status: 'good', detail: `${mishnaElements} רכיבים` });
    } else {
      factors.push({ name: 'משנה', status: 'missing', detail: 'לא זוהה' });
    }

    // Check patterns (up to 25 points)
    const patternCount = analysis?.patterns?.length || 0;
    if (patternCount > 0) {
      const patternScore = Math.min(25, 10 + patternCount * 2);
      score += patternScore;
      factors.push({ name: 'דפוסים', status: 'good', detail: `${patternCount} זוהו` });
    } else {
      factors.push({ name: 'דפוסים', status: 'partial', detail: 'חלקי' });
    }

    // Check rabbis - don't penalize for סתם משנה (anonymous Mishna)
    const rabbiCount = analysis?.rabbis?.length || 0;
    const isAnonymousMishna = !rabbiCount && (analysis?.patterns?.some(p => p.type === 'mishna'));
    if (rabbiCount > 0) {
      score += 20;
      factors.push({ name: 'חכמים', status: 'good', detail: `${rabbiCount} זוהו` });
    } else if (isAnonymousMishna) {
      // סתם משנה is valid - give partial credit
      score += 10;
      factors.push({ name: 'חכמים', status: 'partial', detail: 'סתם משנה' });
    } else {
      factors.push({ name: 'חכמים', status: 'missing', detail: 'לא זוהו' });
    }

    // Check Q&A flow - handle both object and array formats
    const qaFlowLength = analysis?.qaFlow?.flow?.length || analysis?.qaFlow?.length || 0;
    const hasQuestions = analysis?.patterns?.some(p => p.type === 'question' || p.type === 'objection');
    if (qaFlowLength > 0) {
      score += 25;
      factors.push({ name: 'שקו"ט', status: 'good', detail: `${qaFlowLength} יחידות` });
    } else if (hasQuestions) {
      score += 15;
      factors.push({ name: 'שקו"ט', status: 'partial', detail: 'זוהו שאלות' });
    } else {
      factors.push({ name: 'שקו"ט', status: 'partial', detail: 'חלקי' });
    }

    // Bonus points for rich content
    const hasLegalRulings = analysis?.patterns?.some(p => p.type === 'legal_ruling');
    if (hasLegalRulings) {
      score = Math.min(100, score + 5);
    }

    return { score: Math.min(100, score), factors };
  }, [analysis]);

  const getQualityLabel = (score) => {
    if (score >= 75) return { text: 'מצוין', color: '#10b981' };
    if (score >= 50) return { text: 'טוב', color: '#3b82f6' };
    if (score >= 25) return { text: 'בסיסי', color: '#f59e0b' };
    return { text: 'חלקי', color: '#ef4444' };
  };

  const qualityLabel = getQualityLabel(quality.score);

  return (
    <div className="v29-quality-indicator" dir="rtl">
      <div className="quality-header">
        <span className="quality-icon">📊</span>
        <span className="quality-title">איכות הניתוח</span>
        <span className="quality-score" style={{ color: qualityLabel.color }}>
          {qualityLabel.text} ({quality.score}%)
        </span>
      </div>

      <div className="quality-bar">
        <div className="bar-fill" style={{ width: `${quality.score}%`, background: qualityLabel.color }} />
      </div>

      <div className="quality-factors">
        {quality.factors.map((f, i) => (
          <div key={i} className={`factor-item ${f.status}`}>
            <span className="factor-status">
              {f.status === 'good' ? '✓' : f.status === 'partial' ? '◐' : '○'}
            </span>
            <span className="factor-name">{f.name}</span>
            <span className="factor-detail">{f.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

SourceQualityIndicator.displayName = 'SourceQualityIndicator';

// =============================================================================
// PRO SCHOLAR V30: CROSS-REFERENCES PANEL
// Displays cross-references to other Talmudic sources
// =============================================================================

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

