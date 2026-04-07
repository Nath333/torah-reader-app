/**
 * SugyaStudyPanels - Study mode specific panels
 * Extracted from UnifiedSugyaAnalysis/index.js
 *
 * Components: ChazaraPanel, BekiusQuickSummary, NotesPanel, QuickSummaryCard
 */

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { CHAZARA_QUESTION_TEMPLATES } from '../../../constants/talmudStudy';
import { useCopyToClipboard, useStudyNotes, useMasteryLevel } from '../../../hooks/useTalmudStudy';
import { safeGet, safeSet } from '../../../utils/safeLocalStorage';

// =============================================================================
// CHAZARA PANEL - Interactive review with progress & persistence
// =============================================================================

const CHAZARA_ASSESSMENT_KEY = 'talmud_chazara_assessment';

const ChazaraPanel = memo(({ hasMishna: propHasMishna, hasGemara: propHasGemara, sagesCount: propSagesCount, qaFlow, patterns, sugyaKey, text, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const pats = patterns || [];
  const hasMishna = propHasMishna ?? pats.some(p => p.type === 'mishna');
  const hasGemara = propHasGemara ?? pats.some(p => p.type === 'gemara');
  const sagesCount = propSagesCount ?? pats.filter(p => p.type === 'sage' || p.type === 'attribution').length;

  const [answeredCorrectly, setAnsweredCorrectly] = useState(() => {
    if (!sugyaKey) return [];
    const all = safeGet(CHAZARA_ASSESSMENT_KEY, {});
    return all[sugyaKey]?.answeredCorrectly || [];
  });

  useEffect(() => {
    if (!sugyaKey || answeredCorrectly.length === 0) return;
    const all = safeGet(CHAZARA_ASSESSMENT_KEY, {});
    all[sugyaKey] = { answeredCorrectly, lastUpdated: new Date().toISOString() };
    const keys = Object.keys(all);
    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
    }
    safeSet(CHAZARA_ASSESSMENT_KEY, all);
  }, [answeredCorrectly, sugyaKey]);

  const questions = useMemo(() => {
    const qs = [];
    const localPats = patterns || [];
    const questionPatterns = localPats.filter(p => ['question', 'objection'].includes(p.type));
    const resolutionPatterns = localPats.filter(p => ['resolution', 'proof'].includes(p.type));

    if (hasMishna) {
      CHAZARA_QUESTION_TEMPLATES.mishna.forEach((q, i) => {
        qs.push({ id: `mishna-${i}`, text: q, category: 'mishna', icon: '📘' });
      });
    }

    if (hasGemara) {
      if (questionPatterns.length > 0) {
        qs.push({
          id: 'questions_count',
          text: `מה השאלות/קושיות בסוגיא? (נמצאו ${questionPatterns.length})`,
          category: 'gemara', icon: '❓'
        });
      }
      if (resolutionPatterns.length > 0) {
        qs.push({ id: 'resolutions', text: 'איך הגמרא מתרצת את הקושיות?', category: 'gemara', icon: '✅' });
      }
      CHAZARA_QUESTION_TEMPLATES.gemara.forEach((q, i) => {
        qs.push({ id: `gemara-${i}`, text: q, category: 'gemara', icon: '📜' });
      });
    }

    if (sagesCount > 0) {
      CHAZARA_QUESTION_TEMPLATES.sages.forEach((q, i) => {
        qs.push({ id: `sages-${i}`, text: q, category: 'sages', icon: '👤' });
      });
    }

    qs.push({ id: 'svara', text: 'מה הסברא מאחורי הדין? למה דווקא כך?', category: 'chavruta', icon: '💡' });
    qs.push({ id: 'nafka_mina', text: 'מה הנפקא מינה למעשה? איפה זה משנה?', category: 'chavruta', icon: '🎯' });

    return qs;
  }, [hasMishna, hasGemara, sagesCount, patterns]);

  const progress = questions.length > 0 ? Math.round((answeredCorrectly.length / questions.length) * 100) : 0;

  const handleAnswer = (correct) => {
    if (correct) {
      setAnsweredCorrectly(prev => [...prev, questions[currentQuestion].id]);
    }
    setShowAnswer(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (onComplete) {
      onComplete(answeredCorrectly.length + (correct ? 1 : 0), questions.length);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setShowAnswer(false);
    setAnsweredCorrectly([]);
  };

  if (questions.length === 0) {
    return (
      <div className="usa-chazara-panel empty" dir="rtl">
        <span className="chazara-empty">אין שאלות חזרה זמינות לסוגיא זו</span>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="usa-chazara-panel" dir="rtl">
      <div className="chazara-header">
        <span className="chazara-icon">🔄</span>
        <span className="chazara-title">בחינה עצמית - חזרה</span>
        <div className="chazara-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{answeredCorrectly.length}/{questions.length}</span>
        </div>
      </div>

      <div className="chazara-question-card">
        <div className="question-meta">
          <span className="question-number">שאלה {currentQuestion + 1} מתוך {questions.length}</span>
          <span className={`question-category ${currentQ.category}`}>
            {currentQ.icon} {currentQ.category === 'mishna' ? 'משנה' :
              currentQ.category === 'gemara' ? 'גמרא' : 'חכמים'}
          </span>
        </div>
        <div className="question-text">{currentQ.text}</div>
        {!showAnswer ? (
          <div className="question-actions">
            <button className="action-btn show-answer" onClick={() => setShowAnswer(true)} type="button">
              הצג תשובה 👁️
            </button>
          </div>
        ) : (
          <div className="answer-actions">
            <p className="answer-prompt">האם ענית נכון?</p>
            <div className="answer-buttons">
              <button className="action-btn correct" onClick={() => handleAnswer(true)} type="button">
                ✅ כן, ידעתי
              </button>
              <button className="action-btn incorrect" onClick={() => handleAnswer(false)} type="button">
                ❌ לא ידעתי
              </button>
            </div>
          </div>
        )}
      </div>

      {currentQuestion === questions.length - 1 && answeredCorrectly.length > 0 && (
        <div className="chazara-summary">
          <span className="summary-score">
            ציון: {Math.round((answeredCorrectly.length / questions.length) * 100)}%
          </span>
          <button className="reset-btn" onClick={handleReset} type="button">🔄 התחל מחדש</button>
        </div>
      )}
    </div>
  );
});

ChazaraPanel.displayName = 'ChazaraPanel';

// =============================================================================
// QUICK SUMMARY CARD
// =============================================================================

const QuickSummaryCard = memo(({ reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages }) => {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    const parts = [];
    parts.push(`📖 סיכום: ${reference || 'סוגיא'}`);
    parts.push('');

    if (hasMishna && mishnaAnalysis?.summary) {
      parts.push('📘 **משנה:**');
      if (mishnaAnalysis.summary.hasEnumeration) parts.push('  • מונה מספר מקרים');
      if (mishnaAnalysis.summary.hasRulings) parts.push(`  • ${mishnaAnalysis.summary.breakdown?.ruling || 0} פסקי הלכה`);
      if (mishnaAnalysis.summary.hasConditions) parts.push('  • תנאים מיוחדים');
      if (mishnaAnalysis.summary.hasDisputes) parts.push('  • מחלוקת');
      parts.push('');
    }

    if (hasGemara && qaFlow?.summary) {
      parts.push('📜 **גמרא:**');
      const total = (qaFlow.summary.resolved || 0) + (qaFlow.summary.unresolved || 0);
      parts.push(`  • ${total} יחידות שקו״ט`);
      parts.push(`  • ${qaFlow.summary.resolved || 0} נפתרו`);
      if (qaFlow.summary.unresolved > 0) parts.push(`  • ${qaFlow.summary.unresolved} פתוחות (ממשיך?)`);
      parts.push('');
    }

    if (sages && sages.length > 0) {
      parts.push('👤 **חכמים:**');
      const sageNames = sages.slice(0, 5).map(s => s.name || s.match).join(', ');
      parts.push(`  • ${sageNames}${sages.length > 5 ? ` +${sages.length - 5}` : ''}`);
    }

    return parts.join('\n');
  }, [reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages]);

  const plainSummary = useMemo(() => summary.replace(/\*\*/g, ''), [summary]);
  const [copyStatus, setCopyStatus] = useState(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainSummary);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([plainSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `סיכום-${reference?.replace(/\s+/g, '-') || 'סוגיא'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `סיכום: ${reference || 'סוגיא'}`, text: plainSummary });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={`usa-quick-summary ${expanded ? 'expanded' : ''}`} dir="rtl">
      <button className="summary-toggle" onClick={() => setExpanded(!expanded)} type="button">
        <span className="toggle-icon">{expanded ? '▼' : '◀'}</span>
        <span className="toggle-text">📋 סיכום מהיר</span>
      </button>
      {expanded && (
        <div className="summary-content">
          <pre className="summary-text">{summary}</pre>
          <div className="summary-actions">
            <button
              className={`summary-action-btn copy ${copyStatus === 'copied' ? 'success' : ''}`}
              onClick={handleCopy} type="button"
            >
              {copyStatus === 'copied' ? '✓ הועתק!' : '📋 העתק'}
            </button>
            <button className="summary-action-btn download" onClick={handleDownload} type="button">📥 הורד</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="summary-action-btn share" onClick={handleShare} type="button">📤 שתף</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

QuickSummaryCard.displayName = 'QuickSummaryCard';

// =============================================================================
// NOTES PANEL - Study notes with mastery tracking and insights
// =============================================================================

const NotesPanel = memo(({ sugyaKey, text, initialNotes, onNotesChange }) => {
  const [notes, saveNotes] = useStudyNotes(sugyaKey || 'default');
  const [masteryLevel, updateMastery] = useMasteryLevel(sugyaKey || 'default');
  const [newInsight, setNewInsight] = useState('');

  const handleNotesChange = useCallback((e) => {
    saveNotes({ ...notes, text: e.target.value });
    if (onNotesChange) onNotesChange(e.target.value);
  }, [notes, saveNotes, onNotesChange]);

  const addInsight = useCallback(() => {
    if (!newInsight.trim()) return;
    const insights = [...(notes.insights || []), {
      id: Date.now(), text: newInsight, timestamp: new Date().toISOString()
    }];
    saveNotes({ ...notes, insights });
    setNewInsight('');
  }, [notes, newInsight, saveNotes]);

  const removeInsight = useCallback((id) => {
    const insights = (notes.insights || []).filter(i => i.id !== id);
    saveNotes({ ...notes, insights });
  }, [notes, saveNotes]);

  const MASTERY_LEVELS = [
    { level: 0, label: 'טרם למדתי', icon: '📖' },
    { level: 1, label: 'עברתי פעם', icon: '👀' },
    { level: 2, label: 'מבין בסיסי', icon: '🤔' },
    { level: 3, label: 'מבין היטב', icon: '💪' },
    { level: 4, label: 'שולט לגמרי', icon: '🎓' }
  ];

  return (
    <div className="usa-notes-panel enhanced" dir="rtl">
      <div className="notes-header">
        <span className="header-icon">📝</span>
        <span className="header-title">הערות לימוד</span>
      </div>
      <div className="notes-section">
        <label className="section-label">סיכום ורשימות:</label>
        <textarea
          className="notes-textarea"
          placeholder="רשום כאן את הסיכום שלך, נקודות חשובות, שאלות..."
          value={notes.text || ''}
          onChange={handleNotesChange}
          dir="rtl"
          rows={4}
        />
      </div>
      <div className="insights-section">
        <label className="section-label">תובנות מהירות:</label>
        <div className="insight-input">
          <input
            type="text"
            placeholder="הוסף תובנה..."
            value={newInsight}
            onChange={(e) => setNewInsight(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addInsight()}
            dir="rtl"
          />
          <button onClick={addInsight} type="button">+</button>
        </div>
        {notes.insights && notes.insights.length > 0 && (
          <ul className="insights-list">
            {notes.insights.map(insight => (
              <li key={insight.id} className="insight-item">
                <span className="insight-bullet">💎</span>
                <span className="insight-text">{insight.text}</span>
                <button className="insight-remove" onClick={() => removeInsight(insight.id)} type="button">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mastery-section">
        <label className="section-label">רמת שליטה בסוגיא:</label>
        <div className="mastery-levels">
          {MASTERY_LEVELS.map(m => (
            <button
              key={m.level}
              className={`mastery-btn ${masteryLevel === m.level ? 'active' : ''}`}
              onClick={() => updateMastery(m.level)}
              title={m.label}
              type="button"
            >
              <span className="level-icon">{m.icon}</span>
              <span className="level-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

NotesPanel.displayName = 'NotesPanel';

// =============================================================================
// BEKIUS QUICK SUMMARY - Quick overview with persistent checklist
// =============================================================================

const BEKIUS_STORAGE_KEY = 'talmud_bekius_checklist';

const BekiusQuickSummary = memo(({ hasMishna, hasGemara, qaFlow, mishnaAnalysis, patterns, sugyaKey, text }) => {
  const [checklist, setChecklist] = useState(() => {
    const all = safeGet(BEKIUS_STORAGE_KEY, {});
    return all[sugyaKey] || {};
  });

  useEffect(() => {
    if (!sugyaKey || Object.keys(checklist).length === 0) return;
    const all = safeGet(BEKIUS_STORAGE_KEY, {});
    all[sugyaKey] = checklist;
    const keys = Object.keys(all);
    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
    }
    safeSet(BEKIUS_STORAGE_KEY, all);
  }, [checklist, sugyaKey]);

  const toggleCheck = useCallback((id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const summary = useMemo(() => {
    const pats = patterns || [];
    const hasMishnaLocal = hasMishna ?? pats.some(p => p.type === 'mishna');
    const hasGemaraLocal = hasGemara ?? pats.some(p => p.type === 'gemara');
    const questionCount = pats.filter(p => ['question', 'objection'].includes(p.type)).length;
    const legalRulings = pats.filter(p => p.type === 'legal_ruling');
    return {
      hasMishna: hasMishnaLocal, hasGemara: hasGemaraLocal, questionCount,
      hasHalacha: legalRulings.length > 0,
      complexity: questionCount < 2 ? 'פשוטה' : questionCount < 5 ? 'בינונית' : 'מורכבת'
    };
  }, [patterns, hasMishna, hasGemara]);

  const bullets = useMemo(() => {
    const result = [];
    if (summary.hasMishna) {
      if (mishnaAnalysis?.summary?.hasEnumeration) {
        const count = mishnaAnalysis.summary.breakdown?.enumeration || 0;
        result.push({ icon: '🔢', text: `משנה עם ${count} מניינים/מקרים` });
      } else {
        result.push({ icon: '📘', text: 'משנה - דין עיקרי' });
      }
    }
    if (summary.hasGemara) {
      const totalQ = (qaFlow?.summary?.questionsAsked || 0) + (qaFlow?.summary?.sourceCitations || 0);
      const resolved = qaFlow?.summary?.resolved || 0;
      if (totalQ > 0) {
        result.push({ icon: '❓', text: `${totalQ} שאלות/מקורות בגמרא` });
        if (resolved === totalQ) {
          result.push({ icon: '✅', text: 'כל השאלות נפתרו' });
        } else if (resolved > 0) {
          result.push({ icon: '⏳', text: `${resolved}/${totalQ} נפתרו` });
        }
      } else {
        result.push({ icon: '📜', text: 'גמרא - דיון והסבר' });
      }
    }
    return result;
  }, [summary, qaFlow, mishnaAnalysis]);

  if (!summary.hasMishna && !summary.hasGemara && (!patterns || patterns.length === 0)) {
    return (
      <div className="usa-bekius-summary empty" dir="rtl">
        <span className="empty-icon">📖</span>
        <span className="empty-text">נווט לסוגיא כדי לקבל סיכום</span>
      </div>
    );
  }

  return (
    <div className="usa-bekius-summary enhanced" dir="rtl">
      <div className="bekius-header">
        <span className="bekius-icon">📖</span>
        <span className="bekius-title">סיכום מהיר (בקיאות)</span>
      </div>

      <div className="summary-cards">
        <div className="summary-card type-structure">
          <span className="card-icon">📜</span>
          <span className="card-label">מבנה</span>
          <span className="card-value">
            {summary.hasMishna ? 'משנה + גמרא' : summary.hasGemara ? 'גמרא' : 'קטע'}
          </span>
        </div>
        <div className="summary-card type-complexity">
          <span className="card-icon">📊</span>
          <span className="card-label">רמת מורכבות</span>
          <span className="card-value">{summary.complexity}</span>
        </div>
        <div className="summary-card type-dialectic">
          <span className="card-icon">⚡</span>
          <span className="card-label">שקלא וטריא</span>
          <span className="card-value">{summary.questionCount} קושיות</span>
        </div>
        <div className="summary-card type-halacha">
          <span className="card-icon">⚖️</span>
          <span className="card-label">הלכה</span>
          <span className="card-value">{summary.hasHalacha ? 'יש פסק' : 'אין פסק מפורש'}</span>
        </div>
      </div>

      <div className="bekius-bullets">
        {bullets.map((b, i) => (
          <div key={i} className="bekius-bullet">
            <span className="bullet-icon">{b.icon}</span>
            <span className="bullet-text">{b.text}</span>
          </div>
        ))}
      </div>

      {sugyaKey && (
        <div className="bekius-checklist">
          <div className="checklist-title">צ'קליסט לימוד בקיאות:</div>
          <label className="checklist-item">
            <input type="checkbox" checked={!!checklist.read} onChange={() => toggleCheck('read')} />
            <span>קראתי את הסוגיא מתחילה ועד סוף</span>
          </label>
          <label className="checklist-item">
            <input type="checkbox" checked={!!checklist.understood} onChange={() => toggleCheck('understood')} />
            <span>הבנתי את הנושא העיקרי</span>
          </label>
          <label className="checklist-item">
            <input type="checkbox" checked={!!checklist.dialectic} onChange={() => toggleCheck('dialectic')} />
            <span>יודע כמה קושיות יש ואיך מתרצים</span>
          </label>
          <label className="checklist-item">
            <input type="checkbox" checked={!!checklist.halacha} onChange={() => toggleCheck('halacha')} />
            <span>יודע מה ההלכה לפי הסוגיא</span>
          </label>
        </div>
      )}

      <div className="bekius-tip">💡 לפרטים נוספים, עבור למצב עיון</div>
    </div>
  );
});

BekiusQuickSummary.displayName = 'BekiusQuickSummary';

export {
  ChazaraPanel,
  BekiusQuickSummary,
  NotesPanel,
  QuickSummaryCard
};
