/**
 * GemaraQAAnalysisPro - PRO SCHOLAR V31 Consolidated Gemara Q&A Analysis
 *
 * CONSOLIDATES 3 PREVIOUS VERSIONS:
 * - GemaraQAPanel (basic stats + diagram toggle)
 * - QAFlowTree (enhanced mini-stats + tree visualization)
 * - GemaraDeepAnalysis (tabs: flow/questions/sources/summary + sugya analysis)
 *
 * Features:
 * - Quick View: Compact stats bar with diagram toggle
 * - Tree View: Enhanced Q&A flow with visual connectors
 * - Deep View: Tabs for flow, questions, sources, summary
 * - Mermaid diagram support for visual representation
 * - Rabbi/sage info integration
 * - Responsive design with RTL support
 */

import React, { memo, useMemo, useState, lazy, Suspense } from 'react';
import { extractGemaraQA, generateQAFlowDiagram } from '../../../services/discoursePatternService';
import { stripAllDiacritics as stripNikud } from '../../../utils/hebrewUtils';
import './GemaraQAAnalysisPro.css';

// Lazy-loaded Mermaid diagram
const MermaidDiagram = lazy(() => import('../../commentary/CommentarySummary/MermaidDiagram'));

// Loading fallback
const LoadingFallback = () => (
  <div className="gemara-loading">
    <div className="loading-bar" />
  </div>
);

// =============================================================================
// GEMARA Q&A ANALYSIS PRO - Consolidated Component
// =============================================================================

const GemaraQAAnalysisPro = memo(({ text, patterns = [], rabbis = [], compact = false, initialView = 'quick' }) => {
  const [viewMode, setViewMode] = useState(initialView); // 'quick' | 'tree' | 'deep'
  const [activeTab, setActiveTab] = useState('flow');
  const [showDiagram, setShowDiagram] = useState(false);

  // Extract Q&A flow using service
  const qaFlow = useMemo(() => extractGemaraQA(text), [text]);

  // Generate Mermaid diagram code
  const diagramCode = useMemo(() => generateQAFlowDiagram(text), [text]);

  // Deep analysis data
  const deepAnalysis = useMemo(() => {
    if (!text) return null;

    const cleanText = stripNikud(text);

    // Gemara detection patterns
    const gemaraPatterns = [
      /תנן\s+התם/, /מאי\s+טעמא/, /מנלן/, /פשיטא/, /היכי\s+דמי/,
      /מיתיבי/, /והתניא/, /והאמר/, /לא\s+קשיא/, /הכי\s+קאמר/,
      /תנו\s+רבנן/, /תניא/, /תא\s+שמע/, /אמר\s+רב/,
      /דכתיב/, /שנאמר/, /שמע\s+מינה/, /הלכתא/
    ];

    const hasGemara = gemaraPatterns.some(p => p.test(cleanText)) ||
                      qaFlow?.flow?.length > 0 ||
                      cleanText.length > 200;

    // Extract questions
    const questions = [];
    const questionPatterns = [
      { regex: /מאי\s+[א-ת]{2,30}/g, type: 'מאי (מהו?)' },
      { regex: /מנא\s+הני\s+מילי/g, type: 'מנה"מ (מניין?)' },
      { regex: /מאי\s+שנא/g, type: 'מ"ש (מה שונה?)' },
      { regex: /היכי\s+דמי/g, type: 'היכי דמי (כיצד?)' },
      { regex: /מנלן/g, type: 'מנלן (מניין לנו?)' },
      { regex: /פשיטא/g, type: 'פשיטא (פשוט!)' }
    ];

    questionPatterns.forEach(({ regex, type }) => {
      const matches = cleanText.match(regex);
      if (matches) {
        matches.forEach(m => questions.push({ text: m, type }));
      }
    });

    // Extract sources/answers
    const sources = [];
    if (/תניא|תנו\s*רבנן/.test(cleanText)) {
      sources.push({ type: 'ברייתא', icon: '📋', count: (cleanText.match(/תניא|תנו\s*רבנן/g) || []).length });
    }
    if (/דכתיב|שנאמר/.test(cleanText)) {
      sources.push({ type: 'פסוקים', icon: '📖', count: (cleanText.match(/דכתיב|שנאמר/g) || []).length });
    }
    if (/תא\s+שמע/.test(cleanText)) {
      sources.push({ type: 'ראיות', icon: '📜', count: (cleanText.match(/תא\s+שמע/g) || []).length });
    }

    // Build sugya flow
    const sugyaFlow = [];
    if (/מתני|יציאות\s+השבת/.test(cleanText)) {
      sugyaFlow.push({ type: 'mishna', source: 'המשנה', icon: '📘', text: 'המשנה הפותחת' });
    }
    if (/תנן\s+התם/.test(cleanText)) {
      sugyaFlow.push({ type: 'citation', source: 'משנה מקבילה', icon: '📜', text: 'מקור מקביל' });
    }
    if (/תניא|תנו\s*רבנן/.test(cleanText)) {
      sugyaFlow.push({ type: 'baraita', source: 'ברייתא', icon: '📋', text: 'מקור תנאי' });
    }
    if (/אמר\s+רב|איתמר/.test(cleanText)) {
      sugyaFlow.push({ type: 'amora', source: 'אמורא', icon: '💬', text: 'מימרא' });
    }
    if (/מיתיבי|והתניא|קשיא/.test(cleanText)) {
      sugyaFlow.push({ type: 'challenge', source: 'קושיא', icon: '⚡', text: 'הקשו מברייתא' });
    }
    if (/לא\s+קשיא|הכי\s+קאמר/.test(cleanText)) {
      sugyaFlow.push({ type: 'resolution', source: 'תירוץ', icon: '✅', text: 'יישוב הקושיא' });
    }
    if (/דכתיב|שנאמר/.test(cleanText)) {
      sugyaFlow.push({ type: 'scripture', source: 'ראיה מפסוק', icon: '📖', text: 'הוכחה מהכתוב' });
    }
    if (/שמע\s+מינה|הלכתא/.test(cleanText)) {
      sugyaFlow.push({ type: 'conclusion', source: 'מסקנה', icon: '🎯', text: 'מסקנת הסוגיא' });
    }

    // Generate summary
    const summaryParts = [];
    if (sugyaFlow.length > 0) {
      summaryParts.push(`הסוגיא כוללת ${sugyaFlow.length} שלבים`);
    }
    if (questions.length > 0) {
      summaryParts.push(`${questions.length} שאלות`);
    }
    if (rabbis?.length > 0) {
      const names = rabbis.slice(0, 2).map(r => r.name || r.match).join(', ');
      summaryParts.push(`חכמים: ${names}`);
    }
    const summary = summaryParts.join('. ') || 'הגמרא דנה בלשון המשנה.';

    return {
      hasGemara,
      questions,
      sources,
      sugyaFlow,
      summary
    };
  }, [text, qaFlow, rabbis]);

  // Calculate stats from qaFlow
  const stats = useMemo(() => {
    const s = qaFlow?.summary || {};
    return {
      total: s.totalUnits || qaFlow?.flow?.length || 0,
      questions: s.questionsAsked || 0,
      challenges: s.challengesRaised || 0,
      proofs: s.proofsOffered || 0,
      sources: s.sourceCitations || 0,
      resolved: s.resolved || 0,
      unresolved: s.unresolved || 0
    };
  }, [qaFlow]);

  // Empty state
  if (!qaFlow?.flow?.length && !deepAnalysis?.hasGemara) {
    return (
      <div className="gemara-pro-empty" dir="rtl">
        <span className="empty-icon">🎯</span>
        <span>לא זוהו שאלות ותשובות בטקסט</span>
      </div>
    );
  }

  const deepTabs = [
    { id: 'flow', label: 'מהלך', icon: '🔄' },
    { id: 'questions', label: 'שאלות', icon: '❓' },
    { id: 'sources', label: 'מקורות', icon: '📚' },
    { id: 'summary', label: 'סיכום', icon: '📋' }
  ];

  return (
    <div className={`gemara-pro ${compact ? 'compact' : ''}`} dir="rtl">
      {/* Header with view mode toggle */}
      <div className="gemara-pro-header">
        <div className="header-title">
          <span className="header-icon">📚</span>
          <span>ניתוח גמרא</span>
          <span className="header-badge">{stats.questions} שאלות</span>
        </div>

        {!compact && (
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'quick' ? 'active' : ''}`}
              onClick={() => setViewMode('quick')}
            >
              מהיר
            </button>
            <button
              className={`mode-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
            >
              עץ
            </button>
            <button
              className={`mode-btn ${viewMode === 'deep' ? 'active' : ''}`}
              onClick={() => setViewMode('deep')}
            >
              מעמיק
            </button>
          </div>
        )}
      </div>

      {/* Stats bar (always shown) */}
      <div className="gemara-stats-bar">
        {stats.total > 0 && <span className="stat total">📊 {stats.total} שלבים</span>}
        {stats.questions > 0 && <span className="stat questions">❓ {stats.questions} שאלות</span>}
        {stats.challenges > 0 && <span className="stat challenges">⚡ {stats.challenges} קושיות</span>}
        {stats.proofs > 0 && <span className="stat proofs">📖 {stats.proofs} ראיות</span>}
        {stats.sources > 0 && <span className="stat sources">📜 {stats.sources} מקורות</span>}
        {stats.resolved > 0 && <span className="stat resolved">✅ {stats.resolved} נפתרו</span>}
        {stats.unresolved > 0 && <span className="stat unresolved">⏳ {stats.unresolved} פתוח</span>}
      </div>

      {/* QUICK VIEW: Basic list with diagram toggle */}
      {viewMode === 'quick' && (
        <div className="gemara-quick-view">
          {/* Diagram toggle */}
          {diagramCode && (
            <button className="diagram-toggle" onClick={() => setShowDiagram(!showDiagram)}>
              {showDiagram ? '📋 רשימה' : '🗺️ תרשים'}
            </button>
          )}

          {/* Diagram */}
          {showDiagram && diagramCode && (
            <Suspense fallback={<LoadingFallback />}>
              <div className="diagram-container">
                <MermaidDiagram code={diagramCode} />
              </div>
            </Suspense>
          )}

          {/* Q&A list */}
          {!showDiagram && (
            <div className="qa-list">
              {qaFlow.flow.slice(0, compact ? 3 : 10).map((unit, i) => (
                <div key={i} className="qa-unit-simple">
                  <div className="qa-question">
                    <span className="qa-icon">❓</span>
                    <span className="qa-text">{unit.question?.marker || `שאלה ${i + 1}`}</span>
                  </div>
                  {unit.resolution ? (
                    <div className="qa-resolution">
                      <span className="qa-icon">🎯</span>
                      <span className="qa-text">{unit.resolution.marker}</span>
                    </div>
                  ) : (
                    <div className="qa-pending">
                      <span className="qa-icon">⏳</span>
                      <span className="qa-text">טרם נפתר</span>
                    </div>
                  )}
                </div>
              ))}
              {qaFlow.flow.length > (compact ? 3 : 10) && (
                <button className="show-more" onClick={() => setViewMode('tree')}>
                  + עוד {qaFlow.flow.length - (compact ? 3 : 10)} שלבים
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TREE VIEW: Enhanced tree with connectors */}
      {viewMode === 'tree' && (
        <div className="gemara-tree-view">
          {/* Diagram toggle */}
          {diagramCode && (
            <button className="diagram-toggle" onClick={() => setShowDiagram(!showDiagram)}>
              {showDiagram ? '📋 רשימה' : '🗺️ תרשים'}
            </button>
          )}

          {showDiagram ? (
            <Suspense fallback={<LoadingFallback />}>
              <div className="diagram-container">
                <MermaidDiagram code={diagramCode} />
              </div>
            </Suspense>
          ) : (
            <div className="qa-tree">
              {qaFlow.flow.map((unit, i) => (
                <div key={i} className={`qa-unit-tree type-${unit.type || 'qa_unit'}`}>
                  <div className="qa-thread">
                    {/* Question node */}
                    <div className={`qa-node ${unit.type === 'source_unit' ? 'source' : 'question'}`}>
                      <span className="node-icon">
                        {unit.type === 'source_unit' ? '📜' : unit.type === 'challenge_unit' ? '⚡' : '❓'}
                      </span>
                      <span className="node-text">{unit.question?.marker || `שלב ${i + 1}`}</span>
                    </div>

                    {/* Sources */}
                    {unit.sources?.length > 0 && (
                      <div className="qa-branch sources">
                        {unit.sources.map((s, j) => (
                          <div key={j} className="qa-node source-child">
                            <span className="connector">┝</span>
                            <span className="node-icon">📜</span>
                            <span className="node-text">{s.marker}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Challenges */}
                    {unit.challenges?.length > 0 && (
                      <div className="qa-branch challenges">
                        {unit.challenges.map((c, j) => (
                          <div key={j} className="qa-node challenge">
                            <span className="connector">┝</span>
                            <span className="node-icon">⚡</span>
                            <span className="node-text">{c.marker}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proofs */}
                    {unit.proofs?.length > 0 && (
                      <div className="qa-branch proofs">
                        {unit.proofs.map((p, j) => (
                          <div key={j} className="qa-node proof">
                            <span className="connector">┝</span>
                            <span className="node-icon">📖</span>
                            <span className="node-text">{p.marker}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resolution */}
                    {unit.resolution ? (
                      <div className="qa-node resolution">
                        <span className="connector">└</span>
                        <span className="node-icon">🎯</span>
                        <span className="node-text">{unit.resolution.marker}</span>
                      </div>
                    ) : (
                      <div className="qa-node pending">
                        <span className="connector">└</span>
                        <span className="node-icon">⏳</span>
                        <span className="node-text">טרם נפתר</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DEEP VIEW: Tabs for flow, questions, sources, summary */}
      {viewMode === 'deep' && deepAnalysis && (
        <div className="gemara-deep-view">
          {/* Tabs */}
          <div className="deep-tabs">
            {deepTabs.map(tab => (
              <button
                key={tab.id}
                className={`deep-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Flow Tab */}
          {activeTab === 'flow' && (
            <div className="deep-section flow-section">
              {deepAnalysis.sugyaFlow.length > 0 ? (
                <div className="sugya-flow">
                  {deepAnalysis.sugyaFlow.map((item, i) => (
                    <div key={i} className={`flow-item ${item.type}`}>
                      <span className="flow-icon">{item.icon}</span>
                      <div className="flow-content">
                        <span className="flow-source">{item.source}</span>
                        <span className="flow-text">{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">מהלך הסוגיא בבנייה...</div>
              )}
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="deep-section questions-section">
              {deepAnalysis.questions.length > 0 ? (
                <div className="questions-list">
                  {deepAnalysis.questions.map((q, i) => (
                    <div key={i} className="question-item">
                      <span className="q-num">{i + 1}</span>
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
            <div className="deep-section sources-section">
              {deepAnalysis.sources.length > 0 ? (
                <div className="sources-grid">
                  {deepAnalysis.sources.map((s, i) => (
                    <div key={i} className="source-card">
                      <span className="source-icon">{s.icon}</span>
                      <span className="source-type">{s.type}</span>
                      <span className="source-count">{s.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">לא זוהו מקורות</div>
              )}
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="deep-section summary-section">
              <div className="summary-box">
                <p className="summary-text">{deepAnalysis.summary}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

GemaraQAAnalysisPro.displayName = 'GemaraQAAnalysisPro';

export default GemaraQAAnalysisPro;
