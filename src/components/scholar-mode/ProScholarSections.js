/**
 * ProScholarSections.js - Memoized render sections for ProScholarSummary
 *
 * Extracted from ProScholarSummary.js JSX render blocks.
 * Each section is a React.memo component for performance.
 */
import React from 'react';
import { sanitizeHtmlContent } from '../../utils/safeHtml';

// ═══════════════════════════════════════════════════════════════════════
// SUGYA LOAD SECTION - Smart loading button and hints
// ═══════════════════════════════════════════════════════════════════════
export const SugyaLoadSection = React.memo(function SugyaLoadSection({
  sugyaLoading, sugyaError, loadFullSugya
}) {
  return (
    <div className="sugya-load-section v22">
      <button
        className={`load-sugya-btn smart ${sugyaLoading ? 'loading' : ''}`}
        onClick={() => loadFullSugya(true)}
        disabled={sugyaLoading}
      >
        {sugyaLoading ? (
          <>
            <span className="loading-spinner"></span>
            <span>טוען סוגיה עד התירוץ...</span>
          </>
        ) : (
          <>
            <span className="btn-icon">🎯</span>
            <span>טען סוגיה מלאה עד התירוץ</span>
          </>
        )}
      </button>
      <div className="sugya-load-hint">
        <span className="hint-icon">💡</span>
        <span>טוען את כל הגמרא עד שמגיעה לתירוץ או משנה הבאה</span>
      </div>
      {sugyaError && (
        <div className="sugya-error">{sugyaError}</div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// FULL SUGYA DISPLAY - Expanded sugya with pages, status, and content
// ═══════════════════════════════════════════════════════════════════════
export const FullSugyaDisplay = React.memo(function FullSugyaDisplay({
  sugyaData, setSugyaExpanded, setFullText
}) {
  return (
    <div className="section full-sugya-section v22">
      <div className="section-header">
        <span className="section-icon">📚</span>
        <span className="section-title">סוגיה מלאה: {sugyaData.heRef}</span>
        <span className="page-count">{sugyaData.pageCount} דפים</span>
        {/* V22: Status badge */}
        {sugyaData.status && (
          <span className={`sugya-status-badge ${sugyaData.status}`}>
            {sugyaData.status === 'resolved' ? '✓ נמצא תירוץ' :
             sugyaData.status === 'next_mishna' ? '📜 עד המשנה הבאה' :
             sugyaData.status === 'max_pages' ? '⚠️ מקסימום דפים' :
             '⏳ חלקי'}
          </span>
        )}
        <button
          className="collapse-btn"
          onClick={() => setSugyaExpanded(false)}
        >
          צמצם
        </button>
      </div>

      {/* V22: Resolution indicator */}
      {sugyaData.foundResolution && (
        <div className="resolution-indicator">
          <span className="resolution-icon">🎯</span>
          <span className="resolution-text">הגמרא הגיעה לתירוץ/מסקנה</span>
        </div>
      )}

      {/* Page markers and content */}
      <div className="sugya-content">
        {sugyaData.pageMarkers?.map((marker, idx) => (
          <div key={marker.daf} className="sugya-page">
            <div className="page-marker">
              <span className="marker-daf">{sugyaData.tractate} {marker.daf}</span>
              <span className="marker-count">{marker.segmentCount} קטעים</span>
            </div>
            <div className="page-text">
              {sugyaData.segments
                .filter(seg => seg.daf === marker.daf)
                .map((seg, i) => (
                  <div key={i} className="segment-row">
                    <span className="segment-hebrew" dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(seg.hebrew) }} />
                    {seg.english && (
                      <span className="segment-english">{seg.english}</span>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Sugya Stats */}
      <div className="sugya-stats">
        <span className="sugya-stat">סה"כ: {sugyaData.segments?.length || 0} קטעים</span>
        <span className="sugya-stat">{sugyaData.fullHebrewText?.length || 0} תווים</span>
        <span className="sugya-stat">{sugyaData.pageCount} דפים</span>
      </div>

      {/* V22: Analyze loaded sugya button */}
      <button
        className="analyze-sugya-btn"
        onClick={() => {
          // Update fullText with the loaded sugya text to trigger re-analysis
          if (sugyaData.fullHebrewText) {
            setFullText(sugyaData.fullHebrewText);
          }
        }}
      >
        <span className="btn-icon">🔬</span>
        <span>נתח את הסוגיה המלאה</span>
      </button>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// STATS BAR - Word/sentence/sage/verse/term counts
// ═══════════════════════════════════════════════════════════════════════
export const StatsBar = React.memo(function StatsBar({ analysis }) {
  return (
    <div className="stats-bar-pro">
      <div className="stat-group">
        <div className="stat-item-pro">
          <span className="stat-label">מילים</span>
          <span className="stat-value-pro">{analysis.stats.words}</span>
        </div>
        <div className="stat-item-pro">
          <span className="stat-label">משפטים</span>
          <span className="stat-value-pro">{analysis.stats.sentences}</span>
        </div>
        {analysis.sages.length > 0 && (
          <div className="stat-item-pro">
            <span className="stat-label">חכמים</span>
            <span className="stat-value-pro">{analysis.sages.length}</span>
          </div>
        )}
        {analysis.pesukim.length > 0 && (
          <div className="stat-item-pro">
            <span className="stat-label">פסוקים</span>
            <span className="stat-value-pro">{analysis.pesukim.length}</span>
          </div>
        )}
        {analysis.keyTerms?.length > 0 && (
          <div className="stat-item-pro">
            <span className="stat-label">מונחים</span>
            <span className="stat-value-pro">{analysis.keyTerms.length}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// FULL TEXT SECTIONS - Mishna and Gemara full text display
// ═══════════════════════════════════════════════════════════════════════
export const MishnaFullText = React.memo(function MishnaFullText({ mishna }) {
  if (!mishna?.fullContent) return null;
  return (
    <div className="section mishna-full-text">
      <div className="section-header">
        <span className="section-icon">📜</span>
        <span className="section-title">משנה - טקסט מלא</span>
        <span className="char-count">{mishna.fullContent.length} תווים</span>
      </div>
      <div className="full-text-content mishna">
        {mishna.fullContent}
      </div>
    </div>
  );
});

export const GemaraFullText = React.memo(function GemaraFullText({ gemaraFullText, sugyaData }) {
  if (!gemaraFullText) return null;
  return (
    <div className="section gemara-full-text">
      <div className="section-header">
        <span className="section-icon">📖</span>
        <span className="section-title">גמרא - טקסט מלא</span>
        <span className="char-count">{gemaraFullText.length} תווים</span>
      </div>
      <div className="full-text-content gemara">
        {gemaraFullText}
      </div>
      {gemaraFullText.length < 100 && !sugyaData && (
        <div className="short-content-hint">
          <span className="hint-icon">💡</span>
          <span className="hint-text">הגמרא קצרה - לחץ על "טען סוגיה מלאה" למעלה לקבלת ניתוח מקיף יותר</span>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SUGYA SUMMARY SECTION - Main question and resolution
// ═══════════════════════════════════════════════════════════════════════
export const SugyaSummarySection = React.memo(function SugyaSummarySection({ analysis }) {
  if (!(analysis.sugyaSummary || analysis.mainQuestion || analysis.mainResolution)) return null;
  return (
    <div className="section sugya-summary-section">
      <div className="section-header">
        <span className="section-icon">📋</span>
        <span className="section-title">סיכום הסוגיא</span>
      </div>

      {/* Auto-generated summary sentence */}
      {analysis.sugyaSummary && (
        <div className="sugya-summary-text">
          <p>{analysis.sugyaSummary}</p>
        </div>
      )}

      {/* Main Question and Resolution Cards */}
      <div className="qa-cards">
        {analysis.mainQuestion && (
          <div className="qa-card question-card">
            <div className="qa-card-header">
              <span className="qa-icon">❓</span>
              <span className="qa-label">שאלה מרכזית</span>
            </div>
            <div className="qa-card-content">
              {analysis.mainQuestion.text}
            </div>
          </div>
        )}

        {analysis.mainResolution && (
          <div className={`qa-card resolution-card ${analysis.mainResolution.type}`}>
            <div className="qa-card-header">
              <span className="qa-icon">
                {analysis.mainResolution.type === 'unresolved' ? '🟡' :
                 analysis.mainResolution.type === 'difficulty' ? '❌' : '✓'}
              </span>
              <span className="qa-label">
                {analysis.mainResolution.type === 'unresolved' ? 'תיקו' :
                 analysis.mainResolution.type === 'difficulty' ? 'קשיא' : 'תירוץ/מסקנה'}
              </span>
            </div>
            <div className="qa-card-content">
              {analysis.mainResolution.text}
            </div>
          </div>
        )}
      </div>

      {/* Halachic takeaway if found */}
      {analysis.halachicTakeaway?.rule && (
        <div className="halacha-takeaway">
          <span className="halacha-icon">⚖️</span>
          <span className="halacha-text">{analysis.halachicTakeaway.rule}</span>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// KEY TERMS SECTION
// ═══════════════════════════════════════════════════════════════════════
export const KeyTermsSection = React.memo(function KeyTermsSection({ keyTerms }) {
  if (!keyTerms?.length) return null;
  return (
    <div className="section key-terms-section">
      <div className="section-header">
        <span className="section-icon">🔤</span>
        <span className="section-title">מונחים מרכזיים</span>
      </div>
      <div className="key-terms-grid">
        {keyTerms.map((item, i) => (
          <div key={i} className="key-term-item">
            <span className="term-word">{item.term}</span>
            <span className="term-count">×{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: MISHNA STRUCTURED ANALYSIS
// ═══════════════════════════════════════════════════════════════════════
export const MishnaStructuredSection = React.memo(function MishnaStructuredSection({ mishna }) {
  if (!mishna?.content) return null;
  return (
    <div className="section mishna-structured">
      <div className="section-header">
        <span className="section-num">1</span>
        <span className="section-icon">🔍</span>
        <span className="section-title">ניתוח מובנה של המשנה</span>
        {mishna.structureType && (
          <span className={`structure-badge ${mishna.structureType}`}>
            {mishna.structureType === 'enumeration' ? 'מנייה' :
             mishna.structureType === 'explanation' ? 'הסבר' :
             mishna.structureType === 'conditional' ? 'תנאי' :
             mishna.structureType === 'ruling' ? 'פסק' :
             mishna.structureType === 'dispute' ? 'מחלוקת' : ''}
          </span>
        )}
      </div>

      <div className="mishna-grid">
        {/* Topic - Full width */}
        {mishna.topic && (
          <div className="mishna-field topic full-width">
            <span className="field-label">נושא המשנה</span>
            <span className="field-value large">{mishna.topic}</span>
          </div>
        )}

        {/* Numbers/Enumeration if detected */}
        {mishna.numbers?.length > 0 && (
          <div className="mishna-field numbers">
            <span className="field-label">מניין</span>
            <div className="numbers-list">
              {mishna.numbers.map((n, i) => (
                <span key={i} className="number-badge">{n}</span>
              ))}
            </div>
          </div>
        )}

        {/* Cases if enumeration type */}
        {mishna.cases?.length > 0 && (
          <div className="mishna-field cases full-width">
            <span className="field-label">מקרים במשנה</span>
            <div className="cases-list">
              {mishna.cases.map((c, i) => (
                <div key={i} className="case-item">
                  <span className="case-num">{i + 1}</span>
                  <span className="case-text">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case Details */}
        {(mishna.caseDetails?.who?.length > 0 || mishna.caseDetails?.conditions?.length > 0) && (
          <div className="mishna-field case-details">
            <span className="field-label">פרטי המקרה</span>
            <div className="case-content">
              {mishna.caseDetails.who.length > 0 && (
                <div className="case-who">
                  <span className="case-label">מי:</span>
                  {mishna.caseDetails.who.map((w, i) => (
                    <span key={i} className="case-chip who">{w}</span>
                  ))}
                </div>
              )}
              {mishna.caseDetails.conditions.length > 0 && (
                <div className="case-conditions">
                  <span className="case-label">תנאים:</span>
                  {mishna.caseDetails.conditions.map((c, i) => (
                    <span key={i} className="case-chip condition">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ruling */}
        {mishna.ruling?.decision && (
          <div className="mishna-field ruling">
            <span className="field-label">פסק</span>
            <div className="ruling-content">
              <span className={`ruling-badge ${mishna.ruling.isDispute ? 'dispute' : 'unanimous'}`}>
                {mishna.ruling.author}
              </span>
              <span className="ruling-text">{mishna.ruling.decision}</span>
            </div>
          </div>
        )}

        {/* Key Principle */}
        {mishna.keyPrinciple && (
          <div className="mishna-field principle">
            <span className="field-label">עיקרון</span>
            <span className="field-value highlight">{mishna.keyPrinciple}</span>
          </div>
        )}

        {/* One-Line Summary */}
        {mishna.oneLine && (
          <div className="mishna-field one-line">
            <span className="field-label">בקצרה</span>
            <span className="field-value summary">{mishna.oneLine}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: QUESTIONS THE GEMARA ASKS
// ═══════════════════════════════════════════════════════════════════════
export const GemaraQuestionsSection = React.memo(function GemaraQuestionsSection({ gemaraQuestions }) {
  if (!gemaraQuestions?.length) return null;
  return (
    <div className="section gemara-questions">
      <div className="section-header">
        <span className="section-num">2</span>
        <span className="section-icon">🔍</span>
        <span className="section-title">שאלות הגמרא על המשנה</span>
        <span className="count-badge">{gemaraQuestions.length}</span>
      </div>

      {/* PRO SCHOLAR V23: Enhanced questions display with full context */}
      <div className="questions-list v23">
        {gemaraQuestions.map((q, i) => (
          <div key={i} className={`question-item ${q.type}`}>
            <div className="question-header">
              <span className="question-num">{i + 1}</span>
              <span className={`question-type-badge ${q.type}`}>{q.label}</span>
            </div>
            <div className="question-content">
              {/* Show fullContext if available, otherwise fall back to context or label */}
              <span className="question-text">
                {q.fullContext || q.context || q.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2.5: HALACHIC SCENARIOS (from Mishna)
// ═══════════════════════════════════════════════════════════════════════
export const HalachicScenariosSection = React.memo(function HalachicScenariosSection({ halachicScenarios }) {
  if (!halachicScenarios?.length) return null;
  return (
    <div className="section halachic-scenarios">
      <div className="section-header">
        <span className="section-icon">⚖️</span>
        <span className="section-title">תרחישים ודינים</span>
        <span className="count-badge">{halachicScenarios.length} מקרים</span>
      </div>

      <div className="scenarios-grid">
        {halachicScenarios.map((scenario, i) => (
          <div key={i} className={`scenario-card ruling-${scenario.ruling?.toLowerCase() || 'neutral'}`}>
            <div className="scenario-header">
              <span className="scenario-num">{i + 1}</span>
              <span className="scenario-actor">{scenario.actor}</span>
            </div>
            <div className="scenario-action">
              {scenario.action && <span className="action-text">{scenario.action}</span>}
            </div>
            <div className="scenario-ruling">
              <span className={`ruling-badge ${scenario.ruling?.toLowerCase() || ''}`}>
                {scenario.ruling === 'חייב' ? '🔴 חייב' :
                 scenario.ruling === 'פטור' ? '🟢 פטור' :
                 scenario.ruling === 'מותר' ? '✅ מותר' :
                 scenario.ruling === 'אסור' ? '🚫 אסור' :
                 scenario.ruling || '⚪ לא ידוע'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Show contrasting summary if there are both חייב and פטור */}
      {halachicScenarios.some(s => s.ruling === 'חייב') &&
       halachicScenarios.some(s => s.ruling === 'פטור') && (
        <div className="scenarios-summary">
          <div className="summary-item chiyuv">
            <span className="summary-icon">🔴</span>
            <span className="summary-count">
              {halachicScenarios.filter(s => s.ruling === 'חייב').length}
            </span>
            <span className="summary-label">חייב</span>
          </div>
          <div className="summary-divider">⟷</div>
          <div className="summary-item ptur">
            <span className="summary-icon">🟢</span>
            <span className="summary-count">
              {halachicScenarios.filter(s => s.ruling === 'פטור').length}
            </span>
            <span className="summary-label">פטור</span>
          </div>
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: SUGYA STEPS FLOW - Step-by-step Gemara discourse
// ═══════════════════════════════════════════════════════════════════════
export const SugyaStepsSection = React.memo(function SugyaStepsSection({ sugyaSteps }) {
  if (!sugyaSteps?.length) return null;
  return (
    <div className="section sugya-steps enhanced v22">
      <div className="section-header">
        <span className="section-num">3</span>
        <span className="section-icon">🔄</span>
        <span className="section-title">מהלך הסוגיא</span>
        <span className="count-badge">{sugyaSteps.length} שלבים</span>
      </div>

      {/* PRO SCHOLAR V22: Flow type summary badges */}
      <div className="flow-summary-badges">
        {(() => {
          const typeCounts = sugyaSteps.reduce((acc, s) => {
            acc[s.type] = (acc[s.type] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(typeCounts).map(([type, count]) => (
            <span key={type} className={`flow-badge ${type}`}>
              {type === 'question' ? '❓' : type === 'proof' ? '📖' : type === 'objection' ? '⚡' :
               type === 'resolution' ? '✓' : type === 'conclusion' ? '⚖️' : type === 'statement' ? '💬' :
               type === 'reason' ? '💡' : type === 'logical' ? '🔗' : type === 'example' ? '📝' :
               type === 'tradition' ? '📜' : type === 'chain' ? '🔗' : type === 'distinction' ? '⚡' :
               type === 'support' ? '✅' : type === 'alternative' ? '🔄' : '•'} {count}
            </span>
          ));
        })()}
      </div>

      <div className="steps-flow-enhanced v22">
        {/* PRO SCHOLAR V22: Start marker */}
        <div className="flow-marker start">
          <span className="marker-dot"></span>
          <span className="marker-label">התחלה</span>
        </div>

        {sugyaSteps.map((step, i) => {
          const prevStep = i > 0 ? sugyaSteps[i - 1] : null;
          const isTransition = prevStep && prevStep.type !== step.type;
          const isQuestion = step.type === 'question' || step.type === 'inquiry';
          const isObjection = step.type === 'objection';
          const isResolution = step.type === 'resolution' || step.type === 'answer';
          const isConclusion = step.type === 'conclusion';

          return (
            <div key={i} className={`step-card-v22 ${step.type} ${isTransition ? 'transition' : ''}`}>
              {/* Connection line with type indicator */}
              <div className="step-connector-v22">
                <div className={`connector-line-v22 ${isObjection ? 'challenge' : isResolution ? 'resolve' : ''}`}>
                  {isObjection && <span className="connector-icon">↯</span>}
                  {isResolution && <span className="connector-icon">↻</span>}
                  {isConclusion && <span className="connector-icon">⬇</span>}
                </div>
              </div>

              {/* Step node */}
              <div className={`step-node-v22 ${step.type}`}>
                <span className="node-num">{step.step}</span>
                <span className="node-icon">{step.icon}</span>
              </div>

              {/* Step content card */}
              <div className={`step-content-v22 ${step.type}`}>
                <div className="step-header-v22">
                  <span className={`step-type-badge ${step.type}`}>
                    {step.type === 'question' ? 'שאלה' : step.type === 'inquiry' ? 'בירור' :
                     step.type === 'proof' ? 'מקור' : step.type === 'answer' ? 'תשובה' :
                     step.type === 'objection' ? 'קושיא' : step.type === 'resolution' ? 'תירוץ' :
                     step.type === 'conclusion' ? 'מסקנה' : step.type === 'statement' ? 'אמירה' :
                     step.type === 'reason' ? 'טעם' : step.type === 'logical' ? 'היגיון' :
                     step.type === 'example' ? 'דוגמא' : step.type === 'tradition' ? 'מסורת' :
                     step.type === 'chain' ? 'שלשלת' : step.type === 'distinction' ? 'חילוק' :
                     step.type === 'support' ? 'סיוע' : step.type === 'alternative' ? 'אפשרות' : step.type}
                  </span>
                  <span className="step-label-v22">{step.label}</span>
                </div>
                {step.content && (
                  <div className="step-text-v22">
                    <span className="quote-mark">״</span>
                    <span className="step-content">{step.content}</span>
                    <span className="quote-mark">״</span>
                  </div>
                )}
                {/* Visual indicator for flow type */}
                {isQuestion && <div className="step-flow-indicator question-indicator">?</div>}
                {isObjection && <div className="step-flow-indicator objection-indicator">!</div>}
                {isResolution && <div className="step-flow-indicator resolution-indicator">✓</div>}
              </div>
            </div>
          );
        })}

        {/* PRO SCHOLAR V22: End marker */}
        <div className="flow-marker end">
          <span className="marker-dot"></span>
          <span className="marker-label">סיום</span>
        </div>
      </div>

      {/* PRO SCHOLAR V22: Enhanced visual legend */}
      <div className="steps-legend v22">
        <div className="legend-title">מפתח סימנים</div>
        <div className="legend-grid">
          <div className="legend-item question"><span className="legend-icon">❓</span><span className="legend-text">שאלה / בירור</span></div>
          <div className="legend-item proof"><span className="legend-icon">📖</span><span className="legend-text">מקור / ראיה</span></div>
          <div className="legend-item objection"><span className="legend-icon">⚡</span><span className="legend-text">קושיא / סתירה</span></div>
          <div className="legend-item resolution"><span className="legend-icon">✓</span><span className="legend-text">תירוץ / יישוב</span></div>
          <div className="legend-item conclusion"><span className="legend-icon">⚖️</span><span className="legend-text">מסקנה / פסק</span></div>
          <div className="legend-item statement"><span className="legend-icon">💬</span><span className="legend-text">אמירת חכם</span></div>
          <div className="legend-item reason"><span className="legend-icon">💡</span><span className="legend-text">טעם / הסבר</span></div>
          <div className="legend-item logical"><span className="legend-icon">🔗</span><span className="legend-text">היגיון לוגי</span></div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: OPINIONS - Debates and multiple views
// ═══════════════════════════════════════════════════════════════════════
export const OpinionsSection = React.memo(function OpinionsSection({ opinions, mainDifference }) {
  if (!opinions?.length) return null;
  return (
    <div className="section opinions-section v22">
      <div className="section-header">
        <span className="section-num">4</span>
        <span className="section-icon">⚖️</span>
        <span className="section-title">דעות ומחלוקות</span>
        <span className="count-badge">{opinions.length} שיטות</span>
      </div>

      {/* PRO SCHOLAR V22: Visual debate diagram when 2 opinions */}
      {opinions.length === 2 && (
        <div className="debate-diagram">
          <div className={`debate-side left ${opinions[0].type || 'amora'}`}>
            <div className="debate-avatar">
              {opinions[0].type === 'tanna' ? '📜' :
               opinions[0].type === 'school' ? '🏛️' :
               opinions[0].type === 'dispute' ? '⚔️' : '👤'}
            </div>
            <div className="debate-name">{opinions[0].name}</div>
            <div className="debate-type-badge">
              {opinions[0].type === 'tanna' ? 'תנא' :
               opinions[0].type === 'amora' ? 'אמורא' :
               opinions[0].type === 'school' ? 'בית מדרש' :
               opinions[0].type === 'dispute' ? 'מחלוקת' : 'חכם'}
            </div>
            <div className="debate-position">{opinions[0].position}</div>
          </div>
          <div className="debate-vs">
            <span className="vs-icon">⚔️</span>
            <span className="vs-text">מחלוקת</span>
          </div>
          <div className={`debate-side right ${opinions[1].type || 'amora'}`}>
            <div className="debate-avatar">
              {opinions[1].type === 'tanna' ? '📜' :
               opinions[1].type === 'school' ? '🏛️' :
               opinions[1].type === 'dispute' ? '⚔️' : '👤'}
            </div>
            <div className="debate-name">{opinions[1].name}</div>
            <div className="debate-type-badge">
              {opinions[1].type === 'tanna' ? 'תנא' :
               opinions[1].type === 'amora' ? 'אמורא' :
               opinions[1].type === 'school' ? 'בית מדרש' :
               opinions[1].type === 'dispute' ? 'מחלוקת' : 'חכם'}
            </div>
            <div className="debate-position">{opinions[1].position}</div>
          </div>
        </div>
      )}

      {/* PRO SCHOLAR V22: Grid for 3+ opinions */}
      {opinions.length !== 2 && (
        <div className="opinions-grid v22">
          {opinions.map((op, i) => (
            <div key={i} className={`opinion-card-v22 ${op.type || 'amora'}`}>
              <div className="opinion-header-v22">
                <span className="opinion-avatar">
                  {op.type === 'tanna' ? '📜' :
                   op.type === 'school' ? '🏛️' :
                   op.type === 'dispute' ? '⚔️' : '👤'}
                </span>
                <div className="opinion-info">
                  <span className="opinion-name-v22">{op.name}</span>
                  <span className={`opinion-type-badge ${op.type || 'amora'}`}>
                    {op.type === 'tanna' ? 'תנא' :
                     op.type === 'amora' ? 'אמורא' :
                     op.type === 'school' ? 'בית מדרש' :
                     op.type === 'opinion' ? 'סובר' :
                     op.type === 'dispute' ? 'מחלוקת' : 'חכם'}
                  </span>
                </div>
              </div>
              <div className="opinion-position-v22">
                <span className="position-quote">״</span>
                {op.position}
                <span className="position-quote">״</span>
              </div>
              {op.reason && (
                <div className="opinion-reason">
                  <span className="reason-label">טעם:</span>
                  <span className="reason-text">{op.reason}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PRO SCHOLAR V22: Enhanced main difference display */}
      {mainDifference && (
        <div className="main-difference-v22">
          <div className="diff-header">
            <span className="diff-icon">🎯</span>
            <span className="diff-label">עיקר המחלוקת</span>
          </div>
          <div className="diff-content">
            <span className="diff-text">{mainDifference}</span>
          </div>
        </div>
      )}

      {/* PRO SCHOLAR V22: Opinion type legend */}
      <div className="opinion-legend">
        <span className="legend-item tanna"><span>📜</span> תנא</span>
        <span className="legend-item amora"><span>👤</span> אמורא</span>
        <span className="legend-item school"><span>🏛️</span> בית מדרש</span>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: CORE LOGIC - Principles, middot, pesukim
// ═══════════════════════════════════════════════════════════════════════
export const CoreLogicSection = React.memo(function CoreLogicSection({ coreLogic, middot, pesukim }) {
  if (!(coreLogic?.principle || middot?.length > 0)) return null;
  return (
    <div className="section core-logic">
      <div className="section-header">
        <span className="section-num">5</span>
        <span className="section-icon">🧠</span>
        <span className="section-title">היגיון הסוגיא</span>
      </div>

      <div className="logic-content">
        {coreLogic?.principle && (
          <div className="logic-principle">
            <span className="principle-badge">{coreLogic.principle}</span>
          </div>
        )}

        {middot?.length > 0 && (
          <div className="middot-used">
            <span className="middot-label">מידות דרש:</span>
            {middot.map((m, i) => (
              <span key={i} className="midda-chip">
                <span className="midda-name">{m.name}</span>
              </span>
            ))}
          </div>
        )}

        {pesukim?.length > 0 && (
          <div className="pesukim-cited">
            <span className="pesukim-label">פסוקים שנדרשו:</span>
            {pesukim.map((p, i) => (
              <div key={i} className="pasuk-item">
                <span className="pasuk-icon">📖</span>
                <span className="pasuk-text">{p.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: CONNECTION BACK TO MISHNA
// ═══════════════════════════════════════════════════════════════════════
export const MishnaConnectionSection = React.memo(function MishnaConnectionSection({ mishnaConnection }) {
  if (!mishnaConnection?.type) return null;
  return (
    <div className="section mishna-connection">
      <div className="section-header">
        <span className="section-num">6</span>
        <span className="section-icon">🔗</span>
        <span className="section-title">חזרה למשנה</span>
      </div>

      <div className="connection-content">
        <span className={`connection-type ${mishnaConnection.type}`}>
          {mishnaConnection.type === 'explains' ? 'מפרשת' :
           mishnaConnection.type === 'limits' ? 'מצמצמת' :
           mishnaConnection.type === 'expands' ? 'מרחיבה' :
           mishnaConnection.type === 'reinterprets' ? 'מפרשת מחדש' : ''}
        </span>
        {mishnaConnection.description && (
          <span className="connection-desc">{mishnaConnection.description}</span>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: HALACHIC TAKEAWAY
// ═══════════════════════════════════════════════════════════════════════
export const HalachicTakeawaySection = React.memo(function HalachicTakeawaySection({ halachicTakeaway }) {
  if (!halachicTakeaway?.rule) return null;
  return (
    <div className="section halachic-takeaway">
      <div className="section-header">
        <span className="section-num">7</span>
        <span className="section-icon">📌</span>
        <span className="section-title">מסקנה הלכתית</span>
      </div>

      <div className="takeaway-content">
        <div className="takeaway-rule">
          <span className="rule-icon">⚖️</span>
          <span className="rule-text">{halachicTakeaway.rule}</span>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════
// SUPPLEMENTARY: Sages, Cross Refs, Key Terms, Review Questions, One-Line
// ═══════════════════════════════════════════════════════════════════════
export const SagesSection = React.memo(function SagesSection({ sages }) {
  if (!sages?.length) return null;
  return (
    <div className="section sages-section supplementary">
      <div className="section-header">
        <span className="section-icon">👤</span>
        <span className="section-title">חכמים שהוזכרו</span>
      </div>
      <div className="sages-chips">
        {sages.map((sage, i) => (
          <span key={i} className={`sage-chip ${sage.type}`}>
            {sage.type === 'tanna' ? '📜' : sage.type === 'amora' ? '📖' : '🏛️'} {sage.name}
          </span>
        ))}
      </div>
    </div>
  );
});

export const CrossRefsSection = React.memo(function CrossRefsSection({ crossRefs }) {
  if (!crossRefs?.length) return null;
  return (
    <div className="section crossref-section supplementary">
      <div className="section-header">
        <span className="section-icon">🔗</span>
        <span className="section-title">מקורות מקבילים</span>
      </div>
      {crossRefs.map((ref, i) => (
        <div key={i} className="crossref-item">
          <span className="crossref-source">{ref.source}:</span>
          <span className="crossref-text">{ref.text}</span>
        </div>
      ))}
    </div>
  );
});

export const SupplementaryTermsSection = React.memo(function SupplementaryTermsSection({ keyTerms }) {
  if (!keyTerms?.length) return null;
  return (
    <div className="section terms-section supplementary">
      <div className="section-header">
        <span className="section-icon">🔑</span>
        <span className="section-title">מילות מפתח</span>
      </div>
      <div className="terms-grid">
        {keyTerms.map((t, i) => (
          <span key={i} className={`term-chip ${t.category || ''}`}>
            {t.term} <span className="term-count">×{t.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
});

export const ReviewQuestionsSection = React.memo(function ReviewQuestionsSection({ analysis }) {
  return (
    <div className="section review-questions supplementary">
      <div className="section-header">
        <span className="section-icon">📝</span>
        <span className="section-title">שאלות חזרה</span>
      </div>
      <div className="questions-list chazara">
        {/* Question 1: Topic */}
        {analysis.mishna?.topic && (
          <div className="review-question">
            <span className="q-num">1</span>
            <span className="q-text">מה נושא המשנה/הסוגיא?</span>
            <details className="q-answer">
              <summary>לחץ לתשובה</summary>
              <p>{analysis.mishna.topic}</p>
            </details>
          </div>
        )}

        {/* Question 2: Opinions */}
        {analysis.opinions?.length > 1 && (
          <div className="review-question">
            <span className="q-num">2</span>
            <span className="q-text">מה המחלוקת בסוגיא ומי הצדדים?</span>
            <details className="q-answer">
              <summary>לחץ לתשובה</summary>
              <p>
                {analysis.opinions.map(o => o.name).join(' ו')}
                {analysis.mainDifference && ` - ${analysis.mainDifference}`}
              </p>
            </details>
          </div>
        )}

        {/* Question 3: Halacha */}
        {analysis.halachicTakeaway?.rule && (
          <div className="review-question">
            <span className="q-num">3</span>
            <span className="q-text">מה ההלכה למעשה?</span>
            <details className="q-answer">
              <summary>לחץ לתשובה</summary>
              <p>{analysis.halachicTakeaway.rule}</p>
            </details>
          </div>
        )}

        {/* Question 4: Sages */}
        {analysis.sages?.length > 0 && (
          <div className="review-question">
            <span className="q-num">4</span>
            <span className="q-text">אילו חכמים מוזכרים בסוגיא?</span>
            <details className="q-answer">
              <summary>לחץ לתשובה</summary>
              <p>{analysis.sages.map(s => s.name).join(', ')}</p>
            </details>
          </div>
        )}

        {/* Question 5: Key Terms */}
        {analysis.keyTerms?.length >= 3 && (
          <div className="review-question">
            <span className="q-num">5</span>
            <span className="q-text">מהם המושגים המרכזיים בסוגיא?</span>
            <details className="q-answer">
              <summary>לחץ לתשובה</summary>
              <p>{analysis.keyTerms.slice(0, 5).map(t => t.term).join(', ')}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  );
});

export const OneLineSummarySection = React.memo(function OneLineSummarySection({ analysis }) {
  if (!(analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule)) return null;
  return (
    <div className="section one-line-summary">
      <div className="section-header">
        <span className="section-icon">💡</span>
        <span className="section-title">סיכום במשפט אחד</span>
      </div>
      <div className="one-line-content">
        <p className="one-line-text">
          {analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule ||
           `${analysis.mishna?.topic || 'הסוגיא'} - ${analysis.sages?.[0]?.name || 'חכמים'} דנים ב${analysis.keyTerms?.[0]?.term || 'נושא זה'}`}
        </p>
      </div>
    </div>
  );
});
