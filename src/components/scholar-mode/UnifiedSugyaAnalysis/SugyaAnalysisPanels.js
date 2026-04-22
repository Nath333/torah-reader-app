/**
 * SugyaAnalysisPanels - Analysis display components
 * Extracted from UnifiedSugyaAnalysis/index.js
 *
 * Components: DataSourceBanner, MishnaSummaryCard, ContentStructureOverview,
 *             GemaraDialecticPanel, SugyaHeader
 */

import React, { useMemo, memo } from 'react';
import { generateMishnaSummary, TALMUDIC_PATTERNS } from '../../../services/scholarly/discoursePatternService';

// =============================================================================
// DATA SOURCE BANNER
// =============================================================================

const DataSourceBanner = memo(({ reference, textLength, hasMishna, hasGemara, dafProgress }) => {
  const parsed = useMemo(() => {
    if (!reference) return { tractate: null, daf: null, amud: null };
    const match = reference.match(/^([A-Za-z\u0590-\u05FF]+)[.\s]+(\d+)([ab]|[אב])?/);
    if (match) {
      const amud = match[3] === 'a' || match[3] === 'א' ? 'א' : match[3] === 'b' || match[3] === 'ב' ? 'ב' : 'א';
      return { tractate: match[1], daf: match[2], amud };
    }
    return { tractate: reference, daf: null, amud: null };
  }, [reference]);

  const coverage = useMemo(() => {
    if (hasMishna && hasGemara) return { icon: '📚', label: 'משנה + גמרא', class: 'full' };
    if (hasMishna) return { icon: '📘', label: 'משנה בלבד', class: 'mishna-only' };
    if (hasGemara) return { icon: '📜', label: 'גמרא בלבד', class: 'gemara-only' };
    return { icon: '📄', label: 'קטע', class: 'partial' };
  }, [hasMishna, hasGemara]);

  return (
    <div className="usa-data-source-banner" dir="rtl">
      <div className="source-main">
        <span className="source-icon">📖</span>
        <div className="source-info">
          <span className="source-tractate">{parsed.tractate || reference || 'לא נבחר מקור'}</span>
          {parsed.daf && (
            <span className="source-daf">
              דף {parsed.daf} עמוד {parsed.amud}
            </span>
          )}
        </div>
      </div>
      <div className="source-indicators">
        <span className={`coverage-badge ${coverage.class}`}>
          {coverage.icon} {coverage.label}
        </span>
        {textLength > 0 && (
          <span className="text-length-badge" title="אורך הטקסט">
            {textLength > 1000 ? '📏 ארוך' : textLength > 500 ? '📏 בינוני' : '📏 קצר'}
          </span>
        )}
        {dafProgress && (
          <span className={`daf-progress-badge ${dafProgress.complete ? 'complete' : 'partial'}`}>
            {dafProgress.complete ? '✅ דף שלם' : `${dafProgress.percent}% מהדף`}
          </span>
        )}
      </div>
    </div>
  );
});

DataSourceBanner.displayName = 'DataSourceBanner';

// =============================================================================
// MISHNA SUMMARY CARD
// =============================================================================

const MishnaSummaryCard = memo(({ mishnaAnalysis, text }) => {
  const { summary = {}, elements = [] } = mishnaAnalysis || {};

  const enhancedSummary = useMemo(() => {
    if (!text) return null;
    return generateMishnaSummary(text, mishnaAnalysis);
  }, [text, mishnaAnalysis]);

  const oneLiner = useMemo(() => {
    if (enhancedSummary?.oneLiner) return enhancedSummary.oneLiner;
    if (!summary || Object.keys(summary).length === 0) return '';
    const parts = [];
    if (summary.hasEnumeration) {
      const enumCount = summary.breakdown?.enumeration || 0;
      if (enumCount > 0) parts.push(`${enumCount} מניינים`);
    }
    if (summary.hasCaseStructure) parts.push('מקרים מעשיים');
    if (summary.hasRulings) {
      const rulingCount = summary.breakdown?.ruling || 0;
      if (rulingCount > 0) parts.push(`${rulingCount} פסקי דין`);
    }
    if (summary.hasDisputes) parts.push('מחלוקת');
    if (summary.hasConditions) parts.push('תנאים');
    return parts.length > 0 ? parts.join(' • ') : 'מבנה משנה מזוהה';
  }, [summary, enhancedSummary]);

  const legalOutcomes = useMemo(() => {
    if (enhancedSummary?.rulings && enhancedSummary.rulings.length > 0) {
      return enhancedSummary.rulings.slice(0, 6).map(r => r.text);
    }
    if (!elements || elements.length === 0) return [];
    return elements.filter(el => el.type === 'ruling').slice(0, 4).map(el => el.text);
  }, [elements, enhancedSummary]);

  if (!mishnaAnalysis || !elements || elements.length === 0) return null;

  return (
    <div className="usa-mishna-summary-card" dir="rtl">
      <div className="mishna-header">
        <span className="mishna-icon">📘</span>
        <span className="mishna-title">תמצית המשנה</span>
        <span className="mishna-badge">{elements.length} סימנים</span>
        {enhancedSummary?.topic && (
          <span className="mishna-topic-badge">{enhancedSummary.topic}</span>
        )}
      </div>
      <div className="mishna-one-liner">{oneLiner}</div>
      {enhancedSummary?.details && enhancedSummary.isKnown && (
        <div className="mishna-details">💡 {enhancedSummary.details}</div>
      )}
      <div className="mishna-structure-badges">
        {summary.hasEnumeration && <span className="struct-badge enumeration">🔢 ספירה</span>}
        {summary.hasCaseStructure && <span className="struct-badge case">📋 מקרים</span>}
        {summary.hasConditions && <span className="struct-badge condition">🔀 תנאים</span>}
        {summary.hasRulings && <span className="struct-badge ruling">⚖️ פסקים</span>}
        {summary.hasDisputes && <span className="struct-badge dispute">⚔️ מחלוקת</span>}
        {summary.hasExceptions && <span className="struct-badge exception">⚡ יוצאים</span>}
      </div>
      {legalOutcomes.length > 0 && (
        <div className="mishna-outcomes">
          <div className="outcomes-label">פסקי דין עיקריים:</div>
          <div className="outcomes-list">
            {legalOutcomes.map((outcome, i) => {
              const isLiable = outcome.includes('חייב');
              const isExempt = outcome.includes('פטור');
              return (
                <div key={i} className={`outcome-item ${isLiable ? 'liable' : ''} ${isExempt ? 'exempt' : ''}`}>
                  <span className="outcome-marker">{isLiable ? '🔴' : isExempt ? '🟢' : '⚖️'}</span>
                  <span className="outcome-text">{outcome}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

MishnaSummaryCard.displayName = 'MishnaSummaryCard';

// =============================================================================
// CONTENT STRUCTURE OVERVIEW
// =============================================================================

const ContentStructureOverview = memo(({ patterns, hasMishna, hasGemara, qaResolved, qaTotal }) => {
  const phases = useMemo(() => {
    const result = [];
    if (hasMishna) {
      result.push({ type: 'mishna', icon: '📘', label: 'משנה', description: 'דין או הלכה עיקרית', status: 'complete' });
    }
    if (hasGemara) {
      result.push({ type: 'gemara-start', icon: '📜', label: 'גמרא', description: 'דיון והסבר', status: 'complete' });
      if (qaTotal > 0) {
        result.push({
          type: 'shakla-tarya', icon: '❓', label: 'שקו״ט',
          description: `${qaTotal} שאלות`,
          status: qaResolved === qaTotal ? 'complete' : 'partial'
        });
        result.push({
          type: 'resolution',
          icon: qaResolved === qaTotal ? '✅' : '⏳',
          label: qaResolved === qaTotal ? 'תירוץ' : 'בתהליך',
          description: `${qaResolved}/${qaTotal} נפתרו`,
          status: qaResolved === qaTotal ? 'complete' : 'pending'
        });
      }
    }
    return result;
  }, [hasMishna, hasGemara, qaResolved, qaTotal]);

  if (phases.length === 0) return null;

  return (
    <div className="usa-structure-overview" dir="rtl">
      <div className="overview-title">
        <span className="title-icon">🗺️</span>
        <span>מבנה הסוגיא</span>
      </div>
      <div className="overview-phases">
        {phases.map((phase, i) => (
          <div key={phase.type} className={`phase-item ${phase.status}`}>
            <div className="phase-icon">{phase.icon}</div>
            <div className="phase-content">
              <div className="phase-label">{phase.label}</div>
              <div className="phase-desc">{phase.description}</div>
            </div>
            {i < phases.length - 1 && <div className="phase-arrow">→</div>}
          </div>
        ))}
      </div>
    </div>
  );
});

ContentStructureOverview.displayName = 'ContentStructureOverview';

// =============================================================================
// GEMARA DIALECTIC PANEL
// Shows שקלא וטריא flow with dialectic pattern detection
// =============================================================================

const GemaraDialecticPanel = memo(({ patterns, qaFlow, text }) => {
  const dialecticPatterns = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];
    const dialecticTypes = [
      'question', 'objection', 'proof', 'resolution', 'alternative',
      'baraita', 'sage_statement', 'legal_ruling', 'scripture'
    ];
    return patterns
      .filter(p => dialecticTypes.includes(p.type))
      .sort((a, b) => a.position - b.position);
  }, [patterns]);

  const argumentFlow = useMemo(() => {
    if (dialecticPatterns.length === 0 && (!qaFlow?.flow || qaFlow.flow.length === 0)) return [];

    if (qaFlow?.flow && qaFlow.flow.length > 0) {
      return qaFlow.flow.map((unit, i) => ({
        id: i, type: 'qa-unit', question: unit.question,
        challenges: unit.challenges || [], proofs: unit.proofs || [],
        resolution: unit.resolution, isResolved: !!unit.resolution
      }));
    }

    const units = [];
    let currentUnit = null;
    const typeIcons = {
      question: '❓', objection: '⚡', sage_statement: '👤', legal_ruling: '⚖️',
      baraita: '📋', proof: '📖', scripture: '📖', resolution: '🎯', alternative: '🔀'
    };
    const typeLabels = {
      question: 'שאלה', objection: 'קושיא', sage_statement: 'דברי חכם', legal_ruling: 'פסק',
      baraita: 'ברייתא', proof: 'ראיה', scripture: 'פסוק', resolution: 'מסקנא', alternative: 'לישנא אחרינא'
    };

    dialecticPatterns.forEach(p => {
      if (p.type === 'question' || p.type === 'objection' || p.type === 'sage_statement') {
        if (currentUnit) units.push(currentUnit);
        currentUnit = {
          id: units.length, type: p.type, icon: typeIcons[p.type] || '📝',
          label: typeLabels[p.type] || p.type, marker: p.marker,
          text: p.context || p.marker, position: p.position,
          responses: [], isResolved: false
        };
      } else if (currentUnit) {
        if (p.type === 'resolution' || p.type === 'legal_ruling') {
          currentUnit.resolution = { marker: p.marker, text: p.context || p.marker, type: p.type };
          currentUnit.isResolved = true;
        } else if (p.type === 'proof' || p.type === 'scripture' || p.type === 'baraita') {
          currentUnit.responses.push({ type: p.type, icon: typeIcons[p.type] || '📖', marker: p.marker });
        } else if (p.type === 'alternative') {
          currentUnit.responses.push({ type: 'alternative', icon: '🔀', marker: p.marker });
        }
      } else {
        if (p.type === 'legal_ruling' || p.type === 'baraita') {
          units.push({
            id: units.length, type: p.type, icon: typeIcons[p.type],
            label: typeLabels[p.type], marker: p.marker,
            text: p.context || p.marker, position: p.position,
            responses: [], isResolved: p.type === 'legal_ruling'
          });
        }
      }
    });

    if (currentUnit) units.push(currentUnit);
    return units;
  }, [dialecticPatterns, qaFlow]);

  const stats = useMemo(() => {
    const total = argumentFlow.length;
    const resolved = argumentFlow.filter(u => u.isResolved).length;
    return {
      total, resolved, unresolved: total - resolved,
      questions: argumentFlow.filter(u => u.type === 'question' || u.type === 'qa-unit').length,
      objections: argumentFlow.filter(u => u.type === 'objection').length,
      sageStatements: argumentFlow.filter(u => u.type === 'sage_statement').length,
      legalRulings: argumentFlow.filter(u => u.type === 'legal_ruling').length,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }, [argumentFlow]);

  if (argumentFlow.length === 0 && dialecticPatterns.length === 0) return null;

  if (argumentFlow.length === 0 && dialecticPatterns.length > 0) {
    return (
      <div className="usa-gemara-dialectic-panel compact" dir="rtl">
        <div className="dialectic-header">
          <div className="dialectic-title">
            <span className="title-icon">⚔️</span>
            <span className="title-text">שקלא וטריא</span>
            <span className="title-subtitle">{dialecticPatterns.length} סימנים</span>
          </div>
        </div>
        <div className="dialectic-patterns-summary">
          {dialecticPatterns.slice(0, 5).map((p, i) => (
            <div key={i} className={`pattern-chip ${p.type}`}>
              <span className="pattern-icon">{TALMUDIC_PATTERNS[p.type]?.icon || '📝'}</span>
              <span className="pattern-text">{p.marker?.substring(0, 30)}</span>
            </div>
          ))}
          {dialecticPatterns.length > 5 && (
            <span className="more-patterns">+{dialecticPatterns.length - 5} עוד</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="usa-gemara-dialectic-panel" dir="rtl">
      <div className="dialectic-header">
        <div className="dialectic-title">
          <span className="title-icon">⚔️</span>
          <span className="title-text">שקלא וטריא</span>
          <span className="title-subtitle">מהלך הסוגיא</span>
        </div>
        <div className="dialectic-stats">
          {stats.questions > 0 && (
            <div className="stat-item questions">
              <span className="stat-icon">❓</span>
              <span className="stat-value">{stats.questions}</span>
              <span className="stat-label">שאלות</span>
            </div>
          )}
          {stats.objections > 0 && (
            <div className="stat-item objections">
              <span className="stat-icon">⚡</span>
              <span className="stat-value">{stats.objections}</span>
              <span className="stat-label">קושיות</span>
            </div>
          )}
          {stats.sageStatements > 0 && (
            <div className="stat-item sage-statements">
              <span className="stat-icon">👤</span>
              <span className="stat-value">{stats.sageStatements}</span>
              <span className="stat-label">דברי חכמים</span>
            </div>
          )}
          {stats.legalRulings > 0 && (
            <div className="stat-item legal-rulings">
              <span className="stat-icon">⚖️</span>
              <span className="stat-value">{stats.legalRulings}</span>
              <span className="stat-label">פסקים</span>
            </div>
          )}
          <div className="stat-item resolved">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{stats.resolved}/{stats.total}</span>
            <span className="stat-label">נפתרו</span>
          </div>
        </div>
      </div>

      <div className="dialectic-progress">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${stats.resolutionRate}%` }} />
        </div>
        <span className="progress-label">{stats.resolutionRate}% מהשאלות נפתרו</span>
      </div>

      <div className="dialectic-flow">
        {argumentFlow.map((unit, i) => (
          <div key={unit.id} className={`flow-unit ${unit.type} ${unit.isResolved ? 'resolved' : 'open'}`}>
            <div className="unit-connector">
              <div className="connector-line" />
              <div className={`connector-dot ${unit.isResolved ? 'resolved' : 'open'}`} />
            </div>
            <div className="unit-content">
              <div className="unit-header">
                <span className="unit-number">{i + 1}</span>
                <span className="unit-type-icon">
                  {unit.type === 'question' || unit.type === 'qa-unit' ? '❓' : '⚡'}
                </span>
                <span className="unit-type-label">
                  {unit.type === 'question' || unit.type === 'qa-unit' ? 'שאלה' : 'קושיא'}
                </span>
              </div>
              <div className="unit-question-text">
                {unit.question?.marker || unit.marker || `נושא ${i + 1}`}
              </div>
              {unit.challenges && unit.challenges.length > 0 && (
                <div className="unit-challenges">
                  {unit.challenges.map((c, j) => (
                    <div key={j} className="challenge-item">
                      <span className="challenge-icon">⚡</span>
                      <span className="challenge-text">{c.marker?.substring(0, 50)}</span>
                    </div>
                  ))}
                </div>
              )}
              {unit.responses && unit.responses.length > 0 && (
                <div className="unit-responses">
                  {unit.responses.map((r, j) => (
                    <div key={j} className="response-item">
                      <span className="response-icon">{r.icon}</span>
                      <span className="response-text">{r.marker?.substring(0, 40)}</span>
                    </div>
                  ))}
                </div>
              )}
              {unit.isResolved ? (
                <div className="unit-resolution">
                  <span className="resolution-icon">🎯</span>
                  <span className="resolution-label">תירוץ:</span>
                  <span className="resolution-text">
                    {unit.resolution?.marker?.substring(0, 60) || 'התירוץ נמצא'}
                  </span>
                </div>
              ) : (
                <div className="unit-pending">
                  <span className="pending-icon">⏳</span>
                  <span className="pending-text">ממתין לתירוץ...</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="dialectic-summary">
        {stats.unresolved === 0 ? (
          <div className="summary-complete">
            <span className="summary-icon">✅</span>
            <span className="summary-text">כל השאלות נפתרו - הסוגיא מסכמת</span>
          </div>
        ) : (
          <div className="summary-partial">
            <span className="summary-icon">📍</span>
            <span className="summary-text">
              {stats.unresolved} שאל{stats.unresolved > 1 ? 'ות נשארו פתוחות' : 'ה נשארה פתוחה'} -
              ייתכן שהתירוץ ממשיך בדף הבא
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

GemaraDialecticPanel.displayName = 'GemaraDialecticPanel';

// =============================================================================
// SUGYA HEADER WITH STATS
// =============================================================================

const SugyaHeader = memo(({ reference, stats, complexity, structure }) => {
  const sugyaType = useMemo(() => {
    if (stats.mishna > 0 && stats.gemara > 0) return { label: 'סוגיא שלמה', icon: '📚' };
    if (stats.mishna > 0) return { label: 'משנה', icon: '📘' };
    if (stats.gemara > 0) return { label: 'גמרא', icon: '📜' };
    return { label: 'קטע', icon: '📄' };
  }, [stats]);

  const complexityInfo = useMemo(() => {
    const questionCount = (stats.question || 0) + (stats.objection || 0);
    if (questionCount < 2) return { label: 'פשוטה', class: 'simple', color: '#10B981' };
    if (questionCount < 5) return { label: 'בינונית', class: 'moderate', color: '#F59E0B' };
    return { label: 'מורכבת', class: 'complex', color: '#EF4444' };
  }, [stats]);

  return (
    <div className="usa-header" dir="rtl">
      <div className="usa-header-main">
        <div className="usa-title">
          <span className="usa-icon">{sugyaType.icon}</span>
          <span className="usa-ref">{reference || 'ניתוח סוגיא'}</span>
        </div>
        <div className="usa-badges">
          <span className="usa-badge type">{sugyaType.label}</span>
          <span className="usa-badge complexity" style={{ '--badge-color': complexityInfo.color }}>
            {complexityInfo.label}
          </span>
        </div>
      </div>
      <div className="usa-stats-row">
        {stats.mishna > 0 && (
          <div className="usa-stat" title="משנה">
            <span className="stat-icon">📘</span>
            <span className="stat-value">{stats.mishna}</span>
          </div>
        )}
        {stats.gemara > 0 && (
          <div className="usa-stat" title="גמרא">
            <span className="stat-icon">📜</span>
            <span className="stat-value">{stats.gemara}</span>
          </div>
        )}
        {stats.baraita > 0 && (
          <div className="usa-stat" title="ברייתות">
            <span className="stat-icon">📋</span>
            <span className="stat-value">{stats.baraita}</span>
          </div>
        )}
        <div className="usa-stat-divider" />
        {(stats.question || 0) + (stats.objection || 0) > 0 && (
          <div className="usa-stat question" title="שאלות וקושיות">
            <span className="stat-icon">❓</span>
            <span className="stat-value">{(stats.question || 0) + (stats.objection || 0)}</span>
          </div>
        )}
        {(stats.resolution || 0) + (stats.proof || 0) > 0 && (
          <div className="usa-stat answer" title="תירוצים וראיות">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{(stats.resolution || 0) + (stats.proof || 0)}</span>
          </div>
        )}
        {stats.scripture > 0 && (
          <div className="usa-stat" title="פסוקים">
            <span className="stat-icon">📖</span>
            <span className="stat-value">{stats.scripture}</span>
          </div>
        )}
      </div>
    </div>
  );
});

SugyaHeader.displayName = 'SugyaHeader';

export {
  DataSourceBanner,
  MishnaSummaryCard,
  ContentStructureOverview,
  GemaraDialecticPanel,
  SugyaHeader
};
