/**
 * TzuratHaDafTab - Enhanced Traditional Talmud Page Layout
 *
 * Designed for serious Talmud study (Kollel/Yeshiva methodology):
 * - 3-column view: Rashi | Gemara | Tosafot
 * - AI-powered Sugya analysis (מבנה הסוגיא)
 * - Key terms extraction with definitions (מילים מפתח)
 * - Cross-references and mareh mekomot (מראה מקומות)
 * - Study questions for chavruta (שאלות לעיון)
 * - Word-level interactivity with dictionary lookup
 * - Vocabulary tracking for mastery
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getRashiOnTalmud } from '../../services/commentary/rashiService';
import { getTosafotOnTalmud } from '../../services/commentary/tosafotService';
import { analyzeWord, getGrammarSummary } from '../../services/analysis/grammarAnalysisService';
import { analyzeCommentary, ANALYSIS_MODES, hasApiKey } from '../../services/groqService';
import { lookupBDBByWord } from '../../data/bdbComplete';
import { lookupJastrowLocal } from '../../data/jastrowAramaic';
import { useVocabulary } from '../../hooks';
import { stripCantillation, stripVowels, removeMaqaf, hasHebrewLetters } from '../../utils/hebrewUtils';

// =============================================================================
// Talmudic Discourse Pattern Detection (Local - No API)
// =============================================================================
const SUGYA_PATTERNS = {
  // Questions and challenges
  KUSHYA: { pattern: /(?:ק(?:שיא|ושיא)|מתיבי|איתיבי|ורמינהו)/g, label: 'קושיא', type: 'question', color: '#ef4444' },
  TEIKU: { pattern: /תיקו|תיקום/g, label: 'תיקו', type: 'unresolved', color: '#f59e0b' },

  // Answers and resolutions
  TIRETZ: { pattern: /(?:ת(?:י)?רוץ|מתרץ|שאני|הכא)/g, label: 'תירוץ', type: 'answer', color: '#22c55e' },

  // Sources and proofs
  TANYA: { pattern: /תנ(?:יא|ן)|ת"ר|תנו רבנן/g, label: 'ברייתא', type: 'source', color: '#3b82f6' },
  MISHNA: { pattern: /מתני(?:תין)?|סתם משנה/g, label: 'משנה', type: 'source', color: '#8b5cf6' },
  MEMRA: { pattern: /אמר ר(?:ב|בי)|א"ר/g, label: 'מימרא', type: 'statement', color: '#06b6d4' },

  // Dialectical markers
  MACHLOKES: { pattern: /פליגי|חולקים|מחלוקת/g, label: 'מחלוקת', type: 'dispute', color: '#ec4899' },
  SVARA: { pattern: /סברא|מ(?:נא|נין) ה(?:ני|אי) מילי/g, label: 'סברא', type: 'reasoning', color: '#14b8a6' },
  MASKANA: { pattern: /(?:ש)?מע מינה|הלכה|למעשה/g, label: 'מסקנא', type: 'conclusion', color: '#10b981' },
};

/**
 * Analyze sugya structure locally (no API needed)
 * Limited to prevent memory issues with very long texts
 */
const MAX_PATTERNS = 100; // Prevent unbounded array growth

const analyzeSugyaStructure = (text) => {
  if (!text) return { patterns: [], summary: null };

  const patterns = [];
  const textLower = text;

  // Stop early if we've found enough patterns
  outer: for (const [key, config] of Object.entries(SUGYA_PATTERNS)) {
    let match;
    const regex = new RegExp(config.pattern.source, 'g');
    while ((match = regex.exec(textLower)) !== null) {
      patterns.push({
        type: key,
        label: config.label,
        category: config.type,
        color: config.color,
        position: match.index,
        text: match[0]
      });
      // Limit total patterns to prevent memory issues
      if (patterns.length >= MAX_PATTERNS) break outer;
    }
  }

  // Sort by position
  patterns.sort((a, b) => a.position - b.position);

  return {
    patterns,
    hasKushya: patterns.some(p => p.category === 'question'),
    hasTiretz: patterns.some(p => p.category === 'answer'),
    hasMachlokes: patterns.some(p => p.category === 'dispute'),
    hasMaskana: patterns.some(p => p.category === 'conclusion'),
    sources: patterns.filter(p => p.category === 'source'),
    flow: patterns.slice(0, 20).map(p => p.label).join(' → ') // Limit flow string
  };
};

/**
 * Extract key Aramaic/Hebrew terms from text
 */
const extractKeyTerms = (text) => {
  if (!text) return [];

  // Common important Talmudic terms
  const IMPORTANT_TERMS = [
    { term: 'הלכה', meaning: 'Law/Legal ruling' },
    { term: 'ברייתא', meaning: 'External Tannaitic teaching' },
    { term: 'משנה', meaning: 'Mishnaic teaching' },
    { term: 'גמרא', meaning: 'Talmudic discussion' },
    { term: 'תנא', meaning: 'Tannaitic sage' },
    { term: 'אמורא', meaning: 'Amoraic sage' },
    { term: 'סברא', meaning: 'Logical reasoning' },
    { term: 'קושיא', meaning: 'Difficulty/Question' },
    { term: 'תירוץ', meaning: 'Answer/Resolution' },
    { term: 'ראיה', meaning: 'Proof' },
    { term: 'מחלוקת', meaning: 'Dispute' },
    { term: 'שמע מינה', meaning: 'We derive from this' },
    { term: 'פשיטא', meaning: 'Obviously' },
    { term: 'מאי', meaning: 'What is' },
    { term: 'היכי', meaning: 'How' },
    { term: 'אלא', meaning: 'Rather/But' },
    { term: 'לימא', meaning: 'Should we say' },
    { term: 'תיקו', meaning: 'Unresolved question' }
  ];

  const found = [];
  IMPORTANT_TERMS.forEach(item => {
    if (text.includes(item.term)) {
      found.push(item);
    }
  });

  return found;
};

/**
 * Extract Mareh Mekomot (source references) from text
 * Looks for patterns like: מסכת X דף Y, רמב"ם הלכות X פרק Y, etc.
 */
const extractMarehMekomot = (text, rashiText, tosafotText) => {
  if (!text && !rashiText && !tosafotText) return [];

  const combinedText = [text, rashiText, tosafotText].filter(Boolean).join(' ');
  const references = [];

  // Talmud references (מסכת X דף Y)
  const talmudPattern = /(?:מס(?:כת)?|ב?גמ(?:רא)?)\s*(\S+)\s*(?:דף\s*)?(\d+[אב]?)/g;
  let match;
  while ((match = talmudPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'talmud',
      label: 'תלמוד',
      masechet: match[1],
      daf: match[2],
      text: match[0],
      icon: '📜'
    });
  }

  // Torah references (בראשית, שמות, etc.)
  const torahBooks = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים'];
  torahBooks.forEach(book => {
    const bookPattern = new RegExp(`${book}\\s+(\\S+)\\s*(\\d+)?`, 'g');
    while ((match = bookPattern.exec(combinedText)) !== null) {
      references.push({
        type: 'torah',
        label: 'תורה',
        book,
        parsha: match[1],
        verse: match[2],
        text: match[0],
        icon: '📖'
      });
    }
  });

  // Rambam references (רמב"ם הלכות X)
  const rambamPattern = /רמב"ם\s+(?:הל(?:כות)?\s*)?(\S+)/g;
  while ((match = rambamPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'rambam',
      label: 'רמב"ם',
      halacha: match[1],
      text: match[0],
      icon: '⚖️'
    });
  }

  // Shulchan Aruch references
  const saPattern = /שו"ע|שולחן ערוך\s*(\S+)/g;
  while ((match = saPattern.exec(combinedText)) !== null) {
    references.push({
      type: 'shulchan_aruch',
      label: 'שו"ע',
      section: match[1] || '',
      text: match[0],
      icon: '📚'
    });
  }

  // Remove duplicates
  const uniqueRefs = references.filter((ref, index, self) =>
    index === self.findIndex(r => r.text === ref.text)
  );

  return uniqueRefs;
};

/**
 * Generate Chazara (Review) Summary
 */
const generateChazaraSummary = (text, sugyaStructure, keyTerms) => {
  if (!text) return null;

  const summary = {
    mainPoints: [],
    keyTermsToRemember: keyTerms.slice(0, 5),
    flowSummary: sugyaStructure.flow || '',
    reviewQuestions: []
  };

  // Generate main points based on structure
  if (sugyaStructure.hasKushya) {
    summary.mainPoints.push('יש קושיא בסוגיא שצריך להבין');
  }
  if (sugyaStructure.hasTiretz) {
    summary.mainPoints.push('יש תירוץ שמיישב את הקושיא');
  }
  if (sugyaStructure.hasMachlokes) {
    summary.mainPoints.push('יש מחלוקת בין התנאים/אמוראים');
  }
  if (sugyaStructure.hasMaskana) {
    summary.mainPoints.push('יש מסקנא ברורה בסוגיא');
  }

  // Generate review questions
  if (sugyaStructure.hasKushya) {
    summary.reviewQuestions.push('מה הקושיא בסוגיא?');
  }
  if (sugyaStructure.hasTiretz) {
    summary.reviewQuestions.push('מה התירוץ?');
  }
  if (sugyaStructure.hasMachlokes) {
    summary.reviewQuestions.push('מה צדדי המחלוקת?');
  }
  if (sugyaStructure.sources.length > 0) {
    summary.reviewQuestions.push('מה המקורות שהסוגיא מביאה?');
  }

  return summary;
};

// =============================================================================
// StudyPanel Component - Kollel-Style Learning Tools
// =============================================================================
const StudyPanel = React.memo(({ text, reference, rashiText, tosafotText, isOpen, onClose }) => {
  const [activeStudyTab, setActiveStudyTab] = useState('structure');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [studyQuestions, setStudyQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Local analysis (instant, no API)
  const sugyaStructure = useMemo(() => analyzeSugyaStructure(text), [text]);
  const keyTerms = useMemo(() => extractKeyTerms(text), [text]);

  // Mareh Mekomot (Source References)
  const marehMekomot = useMemo(() => extractMarehMekomot(text, rashiText, tosafotText), [text, rashiText, tosafotText]);

  // Chazara (Review) Summary
  const chazaraSummary = useMemo(() => generateChazaraSummary(text, sugyaStructure, keyTerms), [text, sugyaStructure, keyTerms]);

  // Parse Talmud reference for RAG context (e.g., "Berakhot 2a" → tractate, daf)
  const parsedRef = useMemo(() => {
    if (!reference) return { book: null, chapter: null };

    // Handle formats: "Berakhot 2a", "Shabbat 31b", "Bava Metzia 59a"
    const match = reference.match(/^([A-Za-z\s]+)\s*(\d+[ab]?)/i);
    if (match) {
      return {
        book: match[1].trim(),
        chapter: match[2] // daf like "2a"
      };
    }
    return { book: null, chapter: null };
  }, [reference]);

  // Fetch AI analysis (Iyun mode)
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
          // RAG context for Talmud
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

  // Fetch study questions (Chavruta mode)
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
          // RAG context for Talmud
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

/**
 * Clean Hebrew word for dictionary lookup
 * Removes cantillation (טעמים), nikud (ניקוד), punctuation, and HTML
 */
const cleanHebrewWord = (word) => {
  if (!word) return '';

  // Remove HTML tags first, then use hebrewUtils for diacritics
  const noHtml = word.replace(/<[^>]*>/g, '');
  return removeMaqaf(stripVowels(stripCantillation(noHtml)))
    // Remove common punctuation
    .replace(/[.,;:!?׃׀־–—\-()[\]{}״"'`]/g, '')
    // Trim whitespace
    .trim();
};

// Parse daf number for navigation (e.g., "2a" -> { num: 2, side: 'a' })
const parseDaf = (daf) => {
  if (!daf) return null;
  const match = daf.match(/^(\d+)([ab])?$/);
  if (!match) return null;
  return { num: parseInt(match[1], 10), side: match[2] || 'a' };
};

// Get next daf (e.g., "2a" -> "2b", "2b" -> "3a")
const getNextDaf = (daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return null;
  if (parsed.side === 'a') return `${parsed.num}b`;
  return `${parsed.num + 1}a`;
};

// Get previous daf (e.g., "2b" -> "2a", "3a" -> "2b")
const getPrevDaf = (daf) => {
  const parsed = parseDaf(daf);
  if (!parsed) return null;
  if (parsed.side === 'b') return `${parsed.num}a`;
  if (parsed.num <= 2) return null; // First daf is usually 2a
  return `${parsed.num - 1}b`;
};

/**
 * Quick lookup for inline preview (uses local data only - fast)
 */
const getQuickDefinition = (word) => {
  if (!word) return null;

  // Try BDB first (Biblical Hebrew)
  const bdb = lookupBDBByWord(word);
  if (bdb?.definition) {
    return { source: 'BDB', definition: bdb.definition, pos: bdb.pos };
  }

  // Try Jastrow (Aramaic/Talmudic)
  const jastrow = lookupJastrowLocal(word);
  if (jastrow?.definition) {
    return { source: 'Jastrow', definition: jastrow.definition };
  }

  return null;
};

/**
 * WordPreviewPopup - Inline popup showing quick definition
 */
const WordPreviewPopup = React.memo(({ word, position, onClose, onFullLookup, onSaveWord, isSaved }) => {
  const popupRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [definition, setDefinition] = useState(null);
  const [grammar, setGrammar] = useState(null);

  // Keep onClose ref updated without re-adding listeners
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!word) return;

    // Get quick definition from local data
    const def = getQuickDefinition(word);
    setDefinition(def);

    // Get grammar analysis
    const analysis = analyzeWord(word);
    if (analysis) {
      setGrammar(getGrammarSummary(analysis));
    }
  }, [word]);

  // Combined event listeners - stable handlers using ref
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onCloseRef.current();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []); // Empty deps - listeners added once, use ref for current callback

  if (!word) return null;

  return (
    <div
      ref={popupRef}
      className="word-preview-popup"
      style={{
        top: position?.y || 0,
        left: position?.x || 0
      }}
    >
      <div className="popup-header">
        <span className="popup-word" dir="rtl">{word}</span>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>

      {grammar && (
        <div className="popup-grammar">
          <span className="grammar-tag">{grammar}</span>
        </div>
      )}

      {definition ? (
        <div className="popup-definition">
          <span className="def-source">{definition.source}</span>
          {definition.pos && <span className="def-pos">{definition.pos}</span>}
          <p className="def-text">{definition.definition.substring(0, 120)}{definition.definition.length > 120 ? '...' : ''}</p>
        </div>
      ) : (
        <div className="popup-no-def">
          <span>Click "Full Lookup" for detailed search</span>
        </div>
      )}

      <div className="popup-actions">
        <button
          className="popup-btn primary"
          onClick={() => onFullLookup(word)}
        >
          🔍 Full Lookup
        </button>
        <button
          className="popup-btn"
          onClick={() => onSaveWord(word)}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : '💾 Save'}
        </button>
        <button
          className="popup-btn"
          onClick={() => {
            navigator.clipboard.writeText(word);
            onClose();
          }}
        >
          📋 Copy
        </button>
      </div>
    </div>
  );
});

// Interactive word component for the daf
const InteractiveWord = React.memo(({ word, onWordClick, onWordHover, onShowPreview }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [grammarInfo, setGrammarInfo] = useState(null);
  const wordRef = useRef(null);

  // Clean word for analysis and lookup
  const cleanedWord = useMemo(() => cleanHebrewWord(word), [word]);
  const isValidWord = useMemo(() => hasHebrewLetters(cleanedWord), [cleanedWord]);

  const handleMouseEnter = useCallback(() => {
    if (!isValidWord) return;
    setIsHovered(true);
    // Analyze grammar on hover using cleaned word
    const analysis = analyzeWord(cleanedWord);
    if (analysis) {
      setGrammarInfo(getGrammarSummary(analysis));
    }
    onWordHover?.(cleanedWord, analysis);
  }, [cleanedWord, isValidWord, onWordHover]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setGrammarInfo(null);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isValidWord || !cleanedWord) return;

    // Visual click feedback
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 200);

    // Get position for popup
    const rect = wordRef.current?.getBoundingClientRect();
    const position = rect ? {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5
    } : null;

    // Show preview popup instead of immediately switching tabs
    onShowPreview?.(cleanedWord, position);
  }, [cleanedWord, isValidWord, onShowPreview]);

  // Double-click for immediate full lookup
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isValidWord || !cleanedWord) return;
    onWordClick?.(cleanedWord);
  }, [cleanedWord, isValidWord, onWordClick]);

  // Don't make non-Hebrew content interactive
  if (!isValidWord) {
    return <span className="non-interactive-word">{word}</span>;
  }

  return (
    <span
      ref={wordRef}
      className={`interactive-word ${isHovered ? 'hovered' : ''} ${isClicked ? 'clicked' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={grammarInfo || `לחץ לתצוגה מקדימה • לחץ פעמיים לחיפוש מלא`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleClick(e);
        if (e.key === ' ') handleDoubleClick(e);
      }}
    >
      {word}
    </span>
  );
});

// Render text with interactive words
const InteractiveText = React.memo(({ text, onWordClick, onWordHover, onShowPreview }) => {
  const words = useMemo(() => {
    if (!text) return [];
    // Split by spaces but keep punctuation attached
    return text.split(/(\s+)/).filter(Boolean);
  }, [text]);

  return (
    <>
      {words.map((segment, idx) => {
        // If it's whitespace, just render it
        if (/^\s+$/.test(segment)) {
          return <span key={idx}>{segment}</span>;
        }
        // Otherwise it's a word
        return (
          <InteractiveWord
            key={idx}
            word={segment}
            onWordClick={onWordClick}
            onWordHover={onWordHover}
            onShowPreview={onShowPreview}
          />
        );
      })}
    </>
  );
});

const TzuratHaDafTab = React.memo(({ text, reference, rashiText, tosafotText, onNavigate, onWordLookup }) => {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null); // Error state for user feedback
  const [rashiData, setRashiData] = useState(rashiText || '');
  const [tosafotData, setTosafotData] = useState(tosafotText || '');
  const [hoveredSection, setHoveredSection] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [recentWords, setRecentWords] = useState([]);
  const { addWord, hasWord } = useVocabulary();

  // Popup state
  const [popupWord, setPopupWord] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);

  // Study Panel state (Kollel-style learning tools)
  const [studyPanelOpen, setStudyPanelOpen] = useState(false);

  // Show word preview popup
  const handleShowPreview = useCallback((word, position) => {
    setPopupWord(word);
    setPopupPosition(position);
    setSelectedWord(word);

    // Track recent words (last 5)
    setRecentWords(prev => {
      const filtered = prev.filter(w => w !== word);
      return [word, ...filtered].slice(0, 5);
    });
  }, []);

  // Close popup
  const handleClosePopup = useCallback(() => {
    setPopupWord(null);
    setPopupPosition(null);
  }, []);

  // Handle full lookup (from popup or double-click)
  const handleWordClick = useCallback((cleanedWord) => {
    if (!cleanedWord) return;
    setSelectedWord(cleanedWord);
    handleClosePopup();
    // Trigger lookup - this will switch to Words tab and auto-lookup
    onWordLookup?.(cleanedWord);
  }, [onWordLookup, handleClosePopup]);

  // Handle save word
  const handleSaveWord = useCallback((word) => {
    if (word && !hasWord(word)) {
      addWord(word, '', '');
    }
  }, [addWord, hasWord]);

  // Handle word hover for grammar preview
  const handleWordHover = useCallback(() => {
    // Grammar info shown in tooltip via InteractiveWord
  }, []);

  // Parse reference for tractate and daf
  const parsedRef = useMemo(() => {
    if (!reference) return { masechet: '', dafNumber: '' };
    const parts = reference.split(/[._]/);
    return {
      masechet: parts[0] || '',
      dafNumber: parts[1] || ''
    };
  }, [reference]);

  // Navigation helpers
  const nextDaf = useMemo(() => getNextDaf(parsedRef.dafNumber), [parsedRef.dafNumber]);
  const prevDaf = useMemo(() => getPrevDaf(parsedRef.dafNumber), [parsedRef.dafNumber]);

  const handlePrevDaf = useCallback(() => {
    if (prevDaf && onNavigate) {
      onNavigate(`${parsedRef.masechet}.${prevDaf}`);
    }
  }, [prevDaf, parsedRef.masechet, onNavigate]);

  const handleNextDaf = useCallback(() => {
    if (nextDaf && onNavigate) {
      onNavigate(`${parsedRef.masechet}.${nextDaf}`);
    }
  }, [nextDaf, parsedRef.masechet, onNavigate]);

  // Fetch commentaries if not provided
  useEffect(() => {
    if (!reference || rashiText || tosafotText) return;

    const fetchCommentaries = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const [rashi, tosafot] = await Promise.all([
          getRashiOnTalmud(parsedRef.masechet, parsedRef.dafNumber).catch(() => null),
          getTosafotOnTalmud(parsedRef.masechet, parsedRef.dafNumber).catch(() => null)
        ]);

        // Filter out null/undefined items before joining
        if (rashi?.he) {
          const heText = Array.isArray(rashi.he)
            ? rashi.he.filter(Boolean).join(' ')
            : rashi.he;
          setRashiData(heText);
        }
        if (tosafot?.he) {
          const heText = Array.isArray(tosafot.he)
            ? tosafot.he.filter(Boolean).join(' ')
            : tosafot.he;
          setTosafotData(heText);
        }

        // Show warning if both failed
        if (!rashi?.he && !tosafot?.he) {
          setFetchError('Commentary not available for this daf');
        }
      } catch (error) {
        console.error('Failed to fetch commentaries:', error);
        setFetchError('Failed to load commentaries');
      } finally {
        setLoading(false);
      }
    };

    fetchCommentaries();
  }, [reference, rashiText, tosafotText, parsedRef]);

  if (!text) {
    return (
      <div className="tab-empty">
        <span className="empty-icon">📜</span>
        <span className="empty-text">No text available</span>
      </div>
    );
  }

  return (
    <div className="tzurat-hadaf-tab">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {fetchError && !loading && (
        <div className="fetch-error-banner" style={{
          padding: '8px 12px',
          margin: '8px',
          background: '#fef3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          color: '#856404',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{fetchError}</span>
          <button
            onClick={() => setFetchError(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Traditional Page Layout */}
      <div className="tzurat-hadaf-container">
        {/* Header with Navigation */}
        <div className="tzurat-hadaf-header">
          {onNavigate && prevDaf && (
            <button
              className="daf-nav-btn prev"
              onClick={handlePrevDaf}
              title={`Previous: ${prevDaf}`}
            >
              ←
            </button>
          )}

          <div className="header-center">
            <span className="masechet-name">{parsedRef.masechet}</span>
            {parsedRef.dafNumber && (
              <span className="daf-number">דף {parsedRef.dafNumber}</span>
            )}
          </div>

          {onNavigate && nextDaf && (
            <button
              className="daf-nav-btn next"
              onClick={handleNextDaf}
              title={`Next: ${nextDaf}`}
            >
              →
            </button>
          )}
        </div>

        {/* Enhanced word bar with recent words */}
        <div className="tzurat-word-toolbar">
          {/* Recent words */}
          {recentWords.length > 0 && (
            <div className="recent-words">
              <span className="recent-label">Recent:</span>
              {recentWords.map((word, idx) => (
                <button
                  key={idx}
                  className={`recent-word-chip ${word === selectedWord ? 'active' : ''}`}
                  onClick={() => handleShowPreview(word, null)}
                  dir="rtl"
                >
                  {word}
                </button>
              ))}
            </div>
          )}

          {/* Selected word actions */}
          {selectedWord && (
            <div className="selected-word-actions">
              <span className="selected-word" dir="rtl">{selectedWord}</span>
              <button
                className="action-btn lookup"
                onClick={() => handleWordClick(selectedWord)}
                title="Full dictionary lookup"
              >
                🔍 Lookup
              </button>
              <button
                className="action-btn save"
                onClick={() => handleSaveWord(selectedWord)}
                disabled={hasWord(selectedWord)}
                title={hasWord(selectedWord) ? 'Already saved' : 'Save to vocabulary'}
              >
                {hasWord(selectedWord) ? '✓' : '💾'}
              </button>
              <button
                className="action-btn copy"
                onClick={() => navigator.clipboard.writeText(selectedWord)}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          )}

          {/* Hint when no word selected */}
          {!selectedWord && recentWords.length === 0 && (
            <div className="toolbar-hint">
              <span>👆 Click any word for quick preview • Double-click for full lookup</span>
            </div>
          )}

          {/* Study Tools Button */}
          <button
            className={`study-tools-btn ${studyPanelOpen ? 'active' : ''}`}
            onClick={() => setStudyPanelOpen(!studyPanelOpen)}
            title="כלי לימוד - Study Tools"
          >
            📚 {studyPanelOpen ? 'סגור לימוד' : 'כלי לימוד'}
          </button>
        </div>

        {/* Three-Column Layout */}
        <div className="tzurat-hadaf-columns">
          {/* Rashi Column (Right in RTL) */}
          <div
            className={`tzurat-column rashi-column ${hoveredSection === 'rashi' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('rashi')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="commentator-name">רש״י</span>
              <span className="column-badge">פירוש</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {rashiData ? (
                <InteractiveText
                  text={rashiData}
                  onWordClick={handleWordClick}
                  onWordHover={handleWordHover}
                  onShowPreview={handleShowPreview}
                />
              ) : (
                <em className="no-commentary">אין רש״י</em>
              )}
            </div>
          </div>

          {/* Main Gemara Column (Center) */}
          <div
            className={`tzurat-column main-column ${hoveredSection === 'gemara' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('gemara')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="section-label">גמרא</span>
              <span className="column-badge main">תלמוד</span>
            </div>
            <div className="column-content main-text" dir="rtl" lang="he">
              <InteractiveText
                text={text}
                onWordClick={handleWordClick}
                onWordHover={handleWordHover}
                onShowPreview={handleShowPreview}
              />
            </div>
          </div>

          {/* Tosafot Column (Left in RTL) */}
          <div
            className={`tzurat-column tosafot-column ${hoveredSection === 'tosafot' ? 'hovered' : ''}`}
            onMouseEnter={() => setHoveredSection('tosafot')}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div className="column-header">
              <span className="commentator-name">תוספות</span>
              <span className="column-badge">חידושים</span>
            </div>
            <div className="column-content" dir="rtl" lang="he">
              {tosafotData ? (
                <InteractiveText
                  text={tosafotData}
                  onWordClick={handleWordClick}
                  onWordHover={handleWordHover}
                  onShowPreview={handleShowPreview}
                />
              ) : (
                <em className="no-commentary">אין תוספות</em>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Word Preview Popup */}
      {popupWord && (
        <WordPreviewPopup
          word={popupWord}
          position={popupPosition}
          onClose={handleClosePopup}
          onFullLookup={handleWordClick}
          onSaveWord={handleSaveWord}
          isSaved={hasWord(popupWord)}
        />
      )}

      {/* Study Panel - Kollel/Yeshiva Learning Tools */}
      <StudyPanel
        text={text}
        reference={reference}
        rashiText={rashiData}
        tosafotText={tosafotData}
        isOpen={studyPanelOpen}
        onClose={() => setStudyPanelOpen(false)}
      />
    </div>
  );
});

export default TzuratHaDafTab;
