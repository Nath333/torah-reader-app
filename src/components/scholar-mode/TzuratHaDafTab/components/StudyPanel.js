/**
 * StudyPanel - Kollel-style learning tools (sugya structure, key terms,
 * mareh mekomot, chazara summary, AI-powered iyun + chavruta questions).
 * Six internal tabs; all share state so kept as a single file.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { analyzeCommentary, ANALYSIS_MODES, hasApiKey } from '../../../../services/groqService';
import {
  analyzeSugyaStructure,
  extractKeyTerms,
  extractMarehMekomot,
  generateChazaraSummary
} from '../helpers/sugyaAnalysis';

const StudyPanel = React.memo(({ text, reference, rashiText, tosafotText, isOpen, onClose }) => {
  const [activeStudyTab, setActiveStudyTab] = useState('structure');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [studyQuestions, setStudyQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Local analysis (instant, no API)
  const sugyaStructure = useMemo(() => analyzeSugyaStructure(text), [text]);
  const keyTerms = useMemo(() => extractKeyTerms(text), [text]);

  const marehMekomot = useMemo(() => extractMarehMekomot(text, rashiText, tosafotText), [text, rashiText, tosafotText]);

  const chazaraSummary = useMemo(() => generateChazaraSummary(text, sugyaStructure, keyTerms), [text, sugyaStructure, keyTerms]);

  // Parse Talmud reference for RAG context (e.g., "Berakhot 2a" → tractate, daf)
  const parsedRef = useMemo(() => {
    if (!reference) return { book: null, chapter: null };

    const match = reference.match(/^([A-Za-z\s]+)\s*(\d+[ab]?)/i);
    if (match) {
      return {
        book: match[1].trim(),
        chapter: match[2]
      };
    }
    return { book: null, chapter: null };
  }, [reference]);

  const fetchAIAnalysis = useCallback(async () => {
    if (!text || !hasApiKey()) return;

    setAiLoading(true);
    try {
      const result = await analyzeCommentary(
        text,
        reference || 'Talmud',
        '',
        ANALYSIS_MODES.IYUN,
        {
          rashiText,
          tosafotText,
          isTalmud: true,
          book: parsedRef.book,
          chapter: parsedRef.chapter,
          useRAG: true
        }
      );
      setAiAnalysis(result);
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setAiLoading(false);
    }
  }, [text, reference, rashiText, tosafotText, parsedRef]);

  const fetchStudyQuestions = useCallback(async () => {
    if (!text || !hasApiKey()) return;

    setQuestionsLoading(true);
    try {
      const result = await analyzeCommentary(
        text,
        reference || 'Talmud',
        '',
        ANALYSIS_MODES.CHAVRUTA,
        {
          rashiText,
          isTalmud: true,
          book: parsedRef.book,
          chapter: parsedRef.chapter,
          useRAG: true
        }
      );
      setStudyQuestions(result);
    } catch (error) {
      console.error('Questions fetch failed:', error);
    } finally {
      setQuestionsLoading(false);
    }
  }, [text, reference, rashiText, parsedRef]);

  if (!isOpen) return null;

  return (
    <div className="study-panel">
      <div className="study-panel-header">
        <h3>📚 כלי לימוד</h3>
        <span className="study-ref">{reference}</span>
        <button className="study-close" onClick={onClose}>×</button>
      </div>

      {/* Study Tabs */}
      <div className="study-tabs">
        <button
          className={`study-tab ${activeStudyTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveStudyTab('structure')}
        >
          🏗️ מבנה
        </button>
        <button
          className={`study-tab ${activeStudyTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveStudyTab('terms')}
        >
          📖 מילים
        </button>
        <button
          className={`study-tab ${activeStudyTab === 'mekomot' ? 'active' : ''}`}
          onClick={() => setActiveStudyTab('mekomot')}
        >
          📍 מקורות
        </button>
        <button
          className={`study-tab ${activeStudyTab === 'iyun' ? 'active' : ''}`}
          onClick={() => setActiveStudyTab('iyun')}
        >
          🔍 עיון
        </button>
        <button
          className={`study-tab ${activeStudyTab === 'chazara' ? 'active' : ''}`}
          onClick={() => setActiveStudyTab('chazara')}
        >
          🔄 חזרה
        </button>
      </div>

      {/* Tab Content */}
      <div className="study-content">
        {/* Structure Tab - Sugya Flow */}
        {activeStudyTab === 'structure' && (
          <div className="study-structure">
            <h4>מבנה הסוגיא</h4>

            {sugyaStructure.patterns.length > 0 ? (
              <>
                {/* Visual Flow */}
                <div className="sugya-flow">
                  {sugyaStructure.patterns.slice(0, 8).map((p, i) => (
                    <span
                      key={i}
                      className="flow-item"
                      style={{ backgroundColor: p.color + '20', borderColor: p.color }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>

                {/* Structure Summary */}
                <div className="structure-summary">
                  {sugyaStructure.hasKushya && (
                    <div className="structure-item question">
                      <span className="icon">❓</span>
                      <span>יש קושיא בסוגיא</span>
                    </div>
                  )}
                  {sugyaStructure.hasTiretz && (
                    <div className="structure-item answer">
                      <span className="icon">✅</span>
                      <span>יש תירוץ</span>
                    </div>
                  )}
                  {sugyaStructure.hasMachlokes && (
                    <div className="structure-item dispute">
                      <span className="icon">⚖️</span>
                      <span>יש מחלוקת</span>
                    </div>
                  )}
                  {sugyaStructure.hasMaskana && (
                    <div className="structure-item conclusion">
                      <span className="icon">🎯</span>
                      <span>יש מסקנא</span>
                    </div>
                  )}
                  {sugyaStructure.sources.length > 0 && (
                    <div className="structure-item sources">
                      <span className="icon">📜</span>
                      <span>{sugyaStructure.sources.length} מקורות</span>
                    </div>
                  )}
                </div>

                {/* Detailed Patterns */}
                <div className="pattern-list">
                  {sugyaStructure.patterns.map((p, i) => (
                    <div key={i} className="pattern-item" style={{ borderLeftColor: p.color }}>
                      <span className="pattern-label" style={{ color: p.color }}>{p.label}</span>
                      <span className="pattern-text" dir="rtl">{p.text}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-patterns">
                <p>לא נמצאו תבניות ידועות</p>
                <p className="hint">נסה ללמוד את הסוגיא עם פירוש רש״י</p>
              </div>
            )}
          </div>
        )}

        {/* Terms Tab - Key Vocabulary */}
        {activeStudyTab === 'terms' && (
          <div className="study-terms">
            <h4>מילים מפתח בסוגיא</h4>

            {keyTerms.length > 0 ? (
              <div className="terms-grid">
                {keyTerms.map((term, i) => (
                  <div key={i} className="term-card">
                    <span className="term-hebrew" dir="rtl">{term.term}</span>
                    <span className="term-meaning">{term.meaning}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-terms">לא נמצאו מונחים מיוחדים</p>
            )}

            <div className="terms-tip">
              <span className="tip-icon">💡</span>
              <span>לחץ על כל מילה בטקסט לחיפוש במילון</span>
            </div>
          </div>
        )}

        {/* Iyun Tab - Deep Analysis (AI) */}
        {activeStudyTab === 'iyun' && (
          <div className="study-iyun">
            <h4>עיון מעמיק</h4>

            {!hasApiKey() ? (
              <div className="no-api-key">
                <span className="icon">🔑</span>
                <p>נדרש מפתח API לניתוח AI</p>
                <p className="hint">הגדר מפתח Groq בהגדרות</p>
              </div>
            ) : aiAnalysis ? (
              <div className="iyun-content">
                <div className="iyun-text" dir="rtl">
                  {aiAnalysis.analysis || aiAnalysis}
                </div>
              </div>
            ) : (
              <div className="iyun-prompt">
                <p>קבל ניתוח AI מעמיק של הסוגיא</p>
                <button
                  className="iyun-btn"
                  onClick={fetchAIAnalysis}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <>
                      <span className="spinner"></span>
                      מנתח...
                    </>
                  ) : (
                    <>🔍 נתח סוגיא</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mekomot Tab - Source References */}
        {activeStudyTab === 'mekomot' && (
          <div className="study-mekomot">
            <h4>מראה מקומות</h4>

            {marehMekomot.length > 0 ? (
              <div className="mekomot-list">
                {marehMekomot.map((ref, i) => (
                  <div key={i} className={`mekomos-item ${ref.type}`}>
                    <span className="mekomos-icon">{ref.icon}</span>
                    <div className="mekomos-content">
                      <span className="mekomos-label">{ref.label}</span>
                      <span className="mekomos-text" dir="rtl">{ref.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-mekomot">
                <span className="icon">📍</span>
                <p>לא נמצאו מראה מקומות בסוגיא</p>
                <p className="hint">בדוק בפירוש רש״י ותוספות למקורות נוספים</p>
              </div>
            )}

            <div className="mekomot-categories">
              <h5>קטגוריות מקורות</h5>
              <div className="category-legend">
                <span className="category-item talmud">📜 תלמוד</span>
                <span className="category-item torah">📖 תורה</span>
                <span className="category-item rambam">⚖️ רמב"ם</span>
                <span className="category-item shulchan">📚 שו"ע</span>
              </div>
            </div>
          </div>
        )}

        {/* Chazara Tab - Review Mode */}
        {activeStudyTab === 'chazara' && (
          <div className="study-chazara">
            <h4>חזרה וסיכום</h4>

            {chazaraSummary ? (
              <>
                {/* Flow Summary */}
                {chazaraSummary.flowSummary && (
                  <div className="chazara-section flow">
                    <h5>🔄 מהלך הסוגיא</h5>
                    <p className="flow-text" dir="rtl">{chazaraSummary.flowSummary}</p>
                  </div>
                )}

                {/* Main Points */}
                {chazaraSummary.mainPoints.length > 0 && (
                  <div className="chazara-section points">
                    <h5>📌 נקודות עיקריות</h5>
                    <ul className="points-list">
                      {chazaraSummary.mainPoints.map((point, i) => (
                        <li key={i} dir="rtl">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Terms to Remember */}
                {chazaraSummary.keyTermsToRemember.length > 0 && (
                  <div className="chazara-section terms">
                    <h5>📝 מונחים לזכור</h5>
                    <div className="chazara-terms">
                      {chazaraSummary.keyTermsToRemember.map((term, i) => (
                        <span key={i} className="chazara-term">
                          <strong dir="rtl">{term.term}</strong>
                          <span className="term-def">{term.meaning}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Questions */}
                {chazaraSummary.reviewQuestions.length > 0 && (
                  <div className="chazara-section questions">
                    <h5>❓ שאלות לבדיקה עצמית</h5>
                    <ol className="review-questions">
                      {chazaraSummary.reviewQuestions.map((q, i) => (
                        <li key={i} dir="rtl">{q}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <div className="no-chazara">
                <span className="icon">🔄</span>
                <p>אין מספיק מידע לסיכום</p>
                <p className="hint">למד את הסוגיא ונסה שוב</p>
              </div>
            )}
          </div>
        )}

        {/* Questions Tab - Chavruta Discussion (AI-powered) */}
        {activeStudyTab === 'questions' && (
          <div className="study-questions">
            <h4>שאלות לעיון (חברותא)</h4>

            {!hasApiKey() ? (
              <div className="no-api-key">
                <span className="icon">🔑</span>
                <p>נדרש מפתח API לשאלות AI</p>
              </div>
            ) : studyQuestions ? (
              <div className="questions-content">
                <div className="questions-text" dir="rtl">
                  {studyQuestions.analysis || studyQuestions}
                </div>
              </div>
            ) : (
              <div className="questions-prompt">
                <p>קבל שאלות לדיון עם חברותא</p>
                <button
                  className="questions-btn"
                  onClick={fetchStudyQuestions}
                  disabled={questionsLoading}
                >
                  {questionsLoading ? (
                    <>
                      <span className="spinner"></span>
                      מייצר שאלות...
                    </>
                  ) : (
                    <>❓ צור שאלות</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default StudyPanel;
