import React, { memo, useMemo, useState } from 'react';
import { stripAllDiacritics as stripNikud } from '../../../../utils/hebrewUtils';

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
