/**
 * UnifiedSugyaAnalysis - PRO SCHOLAR V29
 * Comprehensive Talmudic Sugya Analysis Component
 *
 * A powerful, scholarly interface for deep Talmud study that integrates:
 * - Discourse pattern detection and visualization
 * - Q&A flow extraction with tree/linear views
 * - Mishna structure analysis with one-line summaries
 * - Rabbi/sage detection with biographical info
 * - Mermaid diagram generation
 * - Cross-references and parallel sugyot
 * - Study modes (Iyun/Bekius/Chazara) with specialized panels
 * - Personal notes and mastery tracking
 * - DATA SOURCE TRACKING: Clear indication of what daf/amud is being analyzed
 * - DAF COMPLETION: Shows when page ends and what content is covered
 * - RESOLUTION TRACKING: Summary of Mishna -> Gemara questions -> Answers
 * - V26: Abbreviations panel, Chazara self-test questions, Bekius quick summary
 * - V27: Speaker Timeline, Halachic Conclusion Card, Cross-References,
 *        Study Mastery Tracker, Sugya Insights Card
 * - V28: Mishna Case Flow visualization (שתים שהן ארבע diagrams)
 * - V29: RICH DEEP ANALYSIS - MishnaDeepAnalysis, GemaraDeepAnalysis,
 *        RabbisDetailPanel, SourceQualityIndicator with scholarly summaries,
 *        interactive case grids, and comprehensive principle explanations
 *
 * @module UnifiedSugyaAnalysis
 * @version 29.0.0
 */

import React, { useState, useMemo, useCallback, useEffect, memo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import './UnifiedSugyaAnalysis.css';
import './ProScholarV27.css';
import './ProScholarV29.css';
import './MishnaCaseFlow.css';

// =============================================================================
// SHARED CONSTANTS & HOOKS (Single Source of Truth - PRO SCHOLAR V31)
// =============================================================================
import {
  HEBREW_TYPE_LABELS,
  STUDY_MODES,
  VIEW_MODES,
  STORAGE_KEYS,
  CHAZARA_QUESTION_TEMPLATES,
  ABBR_TYPE_ICONS,
  CROSS_REF_CATEGORIES
} from '../../../constants/talmudStudy';
import {
  useCopyToClipboard,
  useStudyNotes,
  useMasteryLevel
} from '../../../hooks/useTalmudStudy';

// PRO SCHOLAR V29: Rich Analysis Components
import {
  MishnaDeepAnalysis,
  GemaraDeepAnalysis,
  RabbisDetailPanel,
  SourceQualityIndicator,
  SugyaMermaidDiagram,
  V29CrossReferencePanel,
  CrossReferencesPanel as V30CrossReferencesPanel,
  HalakhicConceptsMap,
  StudyProgressTracker
} from './ProScholarV29RichAnalysis';

// PRO SCHOLAR V28: Mishna Case Flow Visualization
import MishnaCaseFlow from './MishnaCaseFlow';

// PRO SCHOLAR V31: Consolidated Mishna Analysis (replaces 3 previous versions)
import MishnaAnalysisPro from './MishnaAnalysisPro';

// PRO SCHOLAR V31: Consolidated Gemara Q&A Analysis (replaces 3 previous versions)
import GemaraQAAnalysisPro from './GemaraQAAnalysisPro';

// PRO SCHOLAR V31: Rashi & Tosafot Analysis Panel
import RashiTosafotAnalysisPro from './RashiTosafotAnalysisPro';

// PRO SCHOLAR V27 Components
import {
  SpeakerTimeline,
  HalachicConclusionCard,
  CrossReferencePanel,
  StudyMasteryTracker,
  SugyaInsightsCard
} from './ProScholarV27Components';

// Core services
import {
  detectStructuralMarkers,
  analyzeMishnaStructure,
  generateMishnaSummary,
  extractGemaraQA,
  generateQAFlowDiagram,
  analyzeDiscourseStructure,
  TALMUDIC_PATTERNS
} from '../../../services/discoursePatternService';

import { detectRabbis } from '../../../services/namedEntityService';
import { DIAGRAM_TYPES, validateMermaidSyntax } from '../../../services/talmudDiagramService';
import { findAbbreviations, expandAllAbbreviations } from '../../../services/talmudicAbbreviationsService';
import { safeGet, safeSet } from '../../../utils/safeLocalStorage';

// Lazy-loaded components for performance
const MermaidDiagram = lazy(() => import('../../commentary/CommentarySummary/MermaidDiagram'));

// Reserved: RabbiInfoPanel for sage biographical tooltips
// Used by RabbisDetailPanel when clicking on sage names
const RabbiInfoPanel = lazy(() => import('../RabbiInfoPanel'));

// =============================================================================
// NOTE: Hooks & Constants moved to shared files (PRO SCHOLAR V31)
// useCopyToClipboard, useStudyNotes, useMasteryLevel -> ../../../hooks/useTalmudStudy.js
// ABBR_TYPE_ICONS, HEBREW_TYPE_LABELS, STUDY_MODES, etc. -> ../../../constants/talmudStudy.js
// =============================================================================

// =============================================================================
// LOADING FALLBACK
// =============================================================================

const LoadingFallback = () => (
  <div className="usa-loading-skeleton">
    <div className="skeleton-bar" style={{ width: '70%' }} />
    <div className="skeleton-bar" style={{ width: '85%' }} />
    <div className="skeleton-bar" style={{ width: '60%' }} />
  </div>
);

// =============================================================================
// PRO SCHOLAR V25: DATA SOURCE BANNER
// Shows exactly what daf/amud is being analyzed with content indicators
// =============================================================================

const DataSourceBanner = memo(({ reference, textLength, hasMishna, hasGemara, dafProgress }) => {
  // Parse reference to extract tractate and daf
  const parsed = useMemo(() => {
    if (!reference) return { tractate: null, daf: null, amud: null };

    // Parse formats like "Shabbat 2a", "שבת ב א", "Shabbat.2a"
    const match = reference.match(/^([A-Za-z\u0590-\u05FF]+)[.\s]+(\d+)([ab]|[אב])?/);
    if (match) {
      const amud = match[3] === 'a' || match[3] === 'א' ? 'א' : match[3] === 'b' || match[3] === 'ב' ? 'ב' : 'א';
      return {
        tractate: match[1],
        daf: match[2],
        amud
      };
    }
    return { tractate: reference, daf: null, amud: null };
  }, [reference]);

  // Content coverage indicator
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
// PRO SCHOLAR V25: MISHNA SUMMARY CARD
// One-line summary of what the Mishna teaches + key elements
// =============================================================================

const MishnaSummaryCard = memo(({ mishnaAnalysis, text }) => {
  const { summary = {}, elements = [] } = mishnaAnalysis || {};

  // PRO SCHOLAR V26: Use enhanced generateMishnaSummary for meaningful one-liners
  const enhancedSummary = useMemo(() => {
    if (!text) return null;
    return generateMishnaSummary(text, mishnaAnalysis);
  }, [text, mishnaAnalysis]);

  // Generate one-line summary based on structure
  const oneLiner = useMemo(() => {
    // PRO V26: Prefer enhanced summary if available
    if (enhancedSummary?.oneLiner) {
      return enhancedSummary.oneLiner;
    }
    if (!summary || Object.keys(summary).length === 0) return '';
    const parts = [];

    if (summary.hasEnumeration) {
      const enumCount = summary.breakdown?.enumeration || 0;
      if (enumCount > 0) parts.push(`${enumCount} מניינים`);
    }
    if (summary.hasCaseStructure) {
      parts.push('מקרים מעשיים');
    }
    if (summary.hasRulings) {
      const rulingCount = summary.breakdown?.ruling || 0;
      if (rulingCount > 0) parts.push(`${rulingCount} פסקי דין`);
    }
    if (summary.hasDisputes) {
      parts.push('מחלוקת');
    }
    if (summary.hasConditions) {
      parts.push('תנאים');
    }

    return parts.length > 0 ? parts.join(' • ') : 'מבנה משנה מזוהה';
  }, [summary, enhancedSummary]);

  // PRO V26: Use enhanced rulings if available, fallback to elements
  const legalOutcomes = useMemo(() => {
    // First try enhanced rulings
    if (enhancedSummary?.rulings && enhancedSummary.rulings.length > 0) {
      return enhancedSummary.rulings.slice(0, 6).map(r => r.text);
    }
    // Fallback to elements
    if (!elements || elements.length === 0) return [];
    return elements
      .filter(el => el.type === 'ruling')
      .slice(0, 4)
      .map(el => el.text);
  }, [elements, enhancedSummary]);

  // Early return after hooks
  if (!mishnaAnalysis || !elements || elements.length === 0) {
    return null;
  }

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

      {/* PRO V26: Enhanced one-liner with halachic explanation */}
      <div className="mishna-one-liner">
        {oneLiner}
      </div>

      {/* PRO V26: Details explanation if available */}
      {enhancedSummary?.details && enhancedSummary.isKnown && (
        <div className="mishna-details">
          💡 {enhancedSummary.details}
        </div>
      )}

      {/* Structure badges */}
      <div className="mishna-structure-badges">
        {summary.hasEnumeration && <span className="struct-badge enumeration">🔢 ספירה</span>}
        {summary.hasCaseStructure && <span className="struct-badge case">📋 מקרים</span>}
        {summary.hasConditions && <span className="struct-badge condition">🔀 תנאים</span>}
        {summary.hasRulings && <span className="struct-badge ruling">⚖️ פסקים</span>}
        {summary.hasDisputes && <span className="struct-badge dispute">⚔️ מחלוקת</span>}
        {summary.hasExceptions && <span className="struct-badge exception">⚡ יוצאים</span>}
      </div>

      {/* PRO V26: Key legal outcomes with liable/exempt indicators */}
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
// NOTE: GemaraResolutionTracker (V25) REMOVED - Superseded by GemaraDialecticPanel (V28)
// GemaraDialecticPanel includes all features: progress tracking, resolution stats,
// Q&A flow, plus enhanced dialectic pattern detection
// =============================================================================

// =============================================================================
// PRO SCHOLAR V28: ENHANCED GEMARA DIALECTIC PANEL
// Shows שקלא וטריא flow even without explicit 'גמרא' markers
// Detects dialectic patterns: questions, objections, proofs, resolutions
// =============================================================================

const GemaraDialecticPanel = memo(({ patterns, qaFlow, text }) => {
  // Extract dialectic patterns (questions, objections, proofs, resolutions, sage statements, legal rulings)
  const dialecticPatterns = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];

    // V28: Include all dialectic-related pattern types for comprehensive detection
    const dialecticTypes = [
      'question', 'objection', 'proof', 'resolution', 'alternative',
      'baraita', 'sage_statement', 'legal_ruling', 'scripture'
    ];
    return patterns
      .filter(p => dialecticTypes.includes(p.type))
      .sort((a, b) => a.position - b.position);
  }, [patterns]);

  // Build argumentative flow units
  const argumentFlow = useMemo(() => {
    if (dialecticPatterns.length === 0 && (!qaFlow?.flow || qaFlow.flow.length === 0)) {
      return [];
    }

    // If we have structured Q&A flow, use it
    if (qaFlow?.flow && qaFlow.flow.length > 0) {
      return qaFlow.flow.map((unit, i) => ({
        id: i,
        type: 'qa-unit',
        question: unit.question,
        challenges: unit.challenges || [],
        proofs: unit.proofs || [],
        resolution: unit.resolution,
        isResolved: !!unit.resolution
      }));
    }

    // Otherwise build from patterns - V28 enhanced logic
    const units = [];
    let currentUnit = null;

    // V28: Map pattern types to display info
    const typeIcons = {
      question: '❓',
      objection: '⚡',
      sage_statement: '👤',
      legal_ruling: '⚖️',
      baraita: '📋',
      proof: '📖',
      scripture: '📖',
      resolution: '🎯',
      alternative: '🔀'
    };

    const typeLabels = {
      question: 'שאלה',
      objection: 'קושיא',
      sage_statement: 'דברי חכם',
      legal_ruling: 'פסק',
      baraita: 'ברייתא',
      proof: 'ראיה',
      scripture: 'פסוק',
      resolution: 'מסקנא',
      alternative: 'לישנא אחרינא'
    };

    dialecticPatterns.forEach(p => {
      // These types start new discussion units
      if (p.type === 'question' || p.type === 'objection' || p.type === 'sage_statement') {
        // New unit
        if (currentUnit) {
          units.push(currentUnit);
        }
        currentUnit = {
          id: units.length,
          type: p.type,
          icon: typeIcons[p.type] || '📝',
          label: typeLabels[p.type] || p.type,
          marker: p.marker,
          text: p.context || p.marker,
          position: p.position,
          responses: [],
          isResolved: false
        };
      } else if (currentUnit) {
        // Add to current unit
        if (p.type === 'resolution' || p.type === 'legal_ruling') {
          currentUnit.resolution = {
            marker: p.marker,
            text: p.context || p.marker,
            type: p.type
          };
          currentUnit.isResolved = true;
        } else if (p.type === 'proof' || p.type === 'scripture' || p.type === 'baraita') {
          currentUnit.responses.push({
            type: p.type,
            icon: typeIcons[p.type] || '📖',
            marker: p.marker
          });
        } else if (p.type === 'alternative') {
          currentUnit.responses.push({
            type: 'alternative',
            icon: '🔀',
            marker: p.marker
          });
        }
      } else {
        // No current unit - create one for standalone patterns
        if (p.type === 'legal_ruling' || p.type === 'baraita') {
          units.push({
            id: units.length,
            type: p.type,
            icon: typeIcons[p.type],
            label: typeLabels[p.type],
            marker: p.marker,
            text: p.context || p.marker,
            position: p.position,
            responses: [],
            isResolved: p.type === 'legal_ruling' // Legal rulings are self-resolving
          });
        }
      }
    });

    if (currentUnit) {
      units.push(currentUnit);
    }

    return units;
  }, [dialecticPatterns, qaFlow]);

  // Statistics - V28: Enhanced to include all pattern types
  const stats = useMemo(() => {
    const total = argumentFlow.length;
    const resolved = argumentFlow.filter(u => u.isResolved).length;
    const questions = argumentFlow.filter(u => u.type === 'question' || u.type === 'qa-unit').length;
    const objections = argumentFlow.filter(u => u.type === 'objection').length;
    const sageStatements = argumentFlow.filter(u => u.type === 'sage_statement').length;
    const legalRulings = argumentFlow.filter(u => u.type === 'legal_ruling').length;

    return {
      total,
      resolved,
      unresolved: total - resolved,
      questions,
      objections,
      sageStatements,
      legalRulings,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
    };
  }, [argumentFlow]);

  // Don't render if no dialectic content at all
  // V28: Also show if we have any dialectic patterns, even if flow is empty
  if (argumentFlow.length === 0 && dialecticPatterns.length === 0) {
    return null;
  }

  // V28: If we have patterns but no flow units, show a summary of patterns
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

      {/* Progress bar */}
      <div className="dialectic-progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${stats.resolutionRate}%` }}
          />
        </div>
        <span className="progress-label">
          {stats.resolutionRate}% מהשאלות נפתרו
        </span>
      </div>

      {/* Argument flow timeline */}
      <div className="dialectic-flow">
        {argumentFlow.map((unit, i) => (
          <div
            key={unit.id}
            className={`flow-unit ${unit.type} ${unit.isResolved ? 'resolved' : 'open'}`}
          >
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

              {/* Show challenges */}
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

              {/* Show proofs/responses */}
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

              {/* Resolution */}
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

      {/* Summary */}
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
// PRO SCHOLAR V25: CONTENT STRUCTURE OVERVIEW
// Visual summary showing Mishna -> Gemara -> Resolution flow
// =============================================================================

const ContentStructureOverview = memo(({ patterns, hasMishna, hasGemara, qaResolved, qaTotal }) => {
  // Determine structure phases
  const phases = useMemo(() => {
    const result = [];

    if (hasMishna) {
      result.push({
        type: 'mishna',
        icon: '📘',
        label: 'משנה',
        description: 'דין או הלכה עיקרית',
        status: 'complete'
      });
    }

    if (hasGemara) {
      result.push({
        type: 'gemara-start',
        icon: '📜',
        label: 'גמרא',
        description: 'דיון והסבר',
        status: 'complete'
      });

      if (qaTotal > 0) {
        result.push({
          type: 'shakla-tarya',
          icon: '❓',
          label: 'שקו״ט',
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
// =============================================================================
// PRO SCHOLAR V30: CONSOLIDATED CHAZARA PANEL
// Interactive review with progress bar AND persistence
// Merged from TalmudToolsTab.ChazaraQuestions (persistence) + ChazaraPanel (UI)
// =============================================================================

const CHAZARA_ASSESSMENT_KEY = 'talmud_chazara_assessment';

const ChazaraPanel = memo(({ hasMishna: propHasMishna, hasGemara: propHasGemara, sagesCount: propSagesCount, qaFlow, patterns, sugyaKey, text, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // PRO SCHOLAR V30: Compute values from patterns if not provided (self-sufficient)
  const pats = patterns || [];
  const hasMishna = propHasMishna ?? pats.some(p => p.type === 'mishna');
  const hasGemara = propHasGemara ?? pats.some(p => p.type === 'gemara');
  const sagesCount = propSagesCount ?? pats.filter(p => p.type === 'sage' || p.type === 'attribution').length;

  // Persist assessment to localStorage
  const [answeredCorrectly, setAnsweredCorrectly] = useState(() => {
    if (!sugyaKey) return [];
    const all = safeGet(CHAZARA_ASSESSMENT_KEY, {});
    return all[sugyaKey]?.answeredCorrectly || [];
  });

  // Save assessment when it changes
  useEffect(() => {
    if (!sugyaKey || answeredCorrectly.length === 0) return;
    const all = safeGet(CHAZARA_ASSESSMENT_KEY, {});
    all[sugyaKey] = {
      answeredCorrectly,
      lastUpdated: new Date().toISOString()
    };
    // Limit to 50 entries
    const keys = Object.keys(all);
    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
    }
    safeSet(CHAZARA_ASSESSMENT_KEY, all);
  }, [answeredCorrectly, sugyaKey]);

  // Generate questions based on content (enhanced with pattern detection)
  const questions = useMemo(() => {
    const qs = [];

    // Calculate from patterns (use patterns directly, not pats, to satisfy linter)
    const localPats = patterns || [];
    const questionPatterns = localPats.filter(p => ['question', 'objection'].includes(p.type));
    const resolutionPatterns = localPats.filter(p => ['resolution', 'proof'].includes(p.type));

    if (hasMishna) {
      CHAZARA_QUESTION_TEMPLATES.mishna.forEach((q, i) => {
        qs.push({ id: `mishna-${i}`, text: q, category: 'mishna', icon: '📘' });
      });
    }

    if (hasGemara) {
      // Dynamic questions based on actual patterns found
      if (questionPatterns.length > 0) {
        qs.push({
          id: 'questions_count',
          text: `מה השאלות/קושיות בסוגיא? (נמצאו ${questionPatterns.length})`,
          category: 'gemara',
          icon: '❓'
        });
      }

      if (resolutionPatterns.length > 0) {
        qs.push({
          id: 'resolutions',
          text: 'איך הגמרא מתרצת את הקושיות?',
          category: 'gemara',
          icon: '✅'
        });
      }

      // Add template questions
      CHAZARA_QUESTION_TEMPLATES.gemara.forEach((q, i) => {
        qs.push({ id: `gemara-${i}`, text: q, category: 'gemara', icon: '📜' });
      });
    }

    if (sagesCount > 0) {
      CHAZARA_QUESTION_TEMPLATES.sages.forEach((q, i) => {
        qs.push({ id: `sages-${i}`, text: q, category: 'sages', icon: '👤' });
      });
    }

    // Add deep thinking questions
    qs.push({
      id: 'svara',
      text: 'מה הסברא מאחורי הדין? למה דווקא כך?',
      category: 'chavruta',
      icon: '💡'
    });

    qs.push({
      id: 'nafka_mina',
      text: 'מה הנפקא מינה למעשה? איפה זה משנה?',
      category: 'chavruta',
      icon: '🎯'
    });

    return qs;
  }, [hasMishna, hasGemara, sagesCount, patterns]);

  const progress = questions.length > 0
    ? Math.round((answeredCorrectly.length / questions.length) * 100)
    : 0;

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

        <div className="question-text">
          {currentQ.text}
        </div>

        {!showAnswer ? (
          <div className="question-actions">
            <button
              className="action-btn show-answer"
              onClick={() => setShowAnswer(true)}
              type="button"
            >
              הצג תשובה 👁️
            </button>
          </div>
        ) : (
          <div className="answer-actions">
            <p className="answer-prompt">האם ענית נכון?</p>
            <div className="answer-buttons">
              <button
                className="action-btn correct"
                onClick={() => handleAnswer(true)}
                type="button"
              >
                ✅ כן, ידעתי
              </button>
              <button
                className="action-btn incorrect"
                onClick={() => handleAnswer(false)}
                type="button"
              >
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
          <button className="reset-btn" onClick={handleReset} type="button">
            🔄 התחל מחדש
          </button>
        </div>
      )}
    </div>
  );
});

ChazaraPanel.displayName = 'ChazaraPanel';

// =============================================================================
// PRO SCHOLAR V26: QUICK SUMMARY GENERATOR
// One-click summary of the entire sugya
// =============================================================================

const QuickSummaryCard = memo(({ reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages }) => {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    const parts = [];

    // Title
    parts.push(`📖 סיכום: ${reference || 'סוגיא'}`);
    parts.push('');

    // Mishna summary
    if (hasMishna && mishnaAnalysis?.summary) {
      parts.push('📘 **משנה:**');
      if (mishnaAnalysis.summary.hasEnumeration) parts.push('  • מונה מספר מקרים');
      if (mishnaAnalysis.summary.hasRulings) parts.push(`  • ${mishnaAnalysis.summary.breakdown?.ruling || 0} פסקי הלכה`);
      if (mishnaAnalysis.summary.hasConditions) parts.push('  • תנאים מיוחדים');
      if (mishnaAnalysis.summary.hasDisputes) parts.push('  • מחלוקת');
      parts.push('');
    }

    // Gemara summary
    if (hasGemara && qaFlow?.summary) {
      parts.push('📜 **גמרא:**');
      const total = (qaFlow.summary.resolved || 0) + (qaFlow.summary.unresolved || 0);
      parts.push(`  • ${total} יחידות שקו״ט`);
      parts.push(`  • ${qaFlow.summary.resolved || 0} נפתרו`);
      if (qaFlow.summary.unresolved > 0) {
        parts.push(`  • ${qaFlow.summary.unresolved} פתוחות (ממשיך?)`);
      }
      parts.push('');
    }

    // Sages
    if (sages && sages.length > 0) {
      parts.push('👤 **חכמים:**');
      const sageNames = sages.slice(0, 5).map(s => s.name || s.match).join(', ');
      parts.push(`  • ${sageNames}${sages.length > 5 ? ` +${sages.length - 5}` : ''}`);
    }

    return parts.join('\n');
  }, [reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages]);

  // Plain text version for export
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
        await navigator.share({
          title: `סיכום: ${reference || 'סוגיא'}`,
          text: plainSummary
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={`usa-quick-summary ${expanded ? 'expanded' : ''}`} dir="rtl">
      <button
        className="summary-toggle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span className="toggle-icon">{expanded ? '▼' : '◀'}</span>
        <span className="toggle-text">📋 סיכום מהיר</span>
      </button>

      {expanded && (
        <div className="summary-content">
          <pre className="summary-text">{summary}</pre>
          <div className="summary-actions">
            <button
              className={`summary-action-btn copy ${copyStatus === 'copied' ? 'success' : ''}`}
              onClick={handleCopy}
              type="button"
            >
              {copyStatus === 'copied' ? '✓ הועתק!' : '📋 העתק'}
            </button>
            <button className="summary-action-btn download" onClick={handleDownload} type="button">
              📥 הורד
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button className="summary-action-btn share" onClick={handleShare} type="button">
                📤 שתף
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

QuickSummaryCard.displayName = 'QuickSummaryCard';

// =============================================================================
// PRO SCHOLAR V26: COLLAPSIBLE SECTION WRAPPER
// Reusable component for collapsible content
// =============================================================================

const CollapsibleSectionWrapper = memo(({ title, icon, badge, defaultOpen = true, children, accentColor }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`usa-collapsible-section ${isOpen ? 'open' : 'collapsed'}`}
      style={{ '--accent-color': accentColor || '#6366f1' }}
    >
      <button
        className="collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
      >
        <span className="header-icon">{icon}</span>
        <span className="header-title">{title}</span>
        {badge && <span className="header-badge">{badge}</span>}
        <span className="header-chevron">{isOpen ? '▼' : '◀'}</span>
      </button>
      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  );
});

CollapsibleSectionWrapper.displayName = 'CollapsibleSectionWrapper';

// =============================================================================
// PRO SCHOLAR V26: CROSS-REFERENCES PANEL
// Shows related sugyot, parallel sources, and scripture connections
// Essential for understanding the broader context of any sugya
// NOTE: CROSS_REF_CATEGORIES imported from ../../../constants/talmudStudy.js
// =============================================================================

const CrossReferencesPanel = memo(({ reference, patterns, text, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Extract cross-references from patterns and text
  const extractedRefs = useMemo(() => {
    const refs = {
      parallel_sugya: [],
      parallel_mishna: [],
      tosefta: [],
      scripture: [],
      yerushalmi: []
    };

    if (!text) return refs;

    // Find scripture citations in the text
    const scriptureMatches = text.match(/דכתיב|שנאמר|מנלן|כדכתיב/g);
    if (scriptureMatches) {
      scriptureMatches.forEach((m, i) => {
        const idx = text.indexOf(m);
        const context = text.slice(idx, Math.min(text.length, idx + 60));
        refs.scripture.push({
          marker: m,
          context: context.trim(),
          type: 'scripture'
        });
      });
    }

    // Find parallel Mishna references
    const mishnaMatches = text.match(/תנן\s*התם|הא\s*תנן|כדתנן|דתניא/g);
    if (mishnaMatches) {
      mishnaMatches.forEach((m, i) => {
        const idx = text.indexOf(m);
        const context = text.slice(idx, Math.min(text.length, idx + 80));
        refs.parallel_mishna.push({
          marker: m,
          context: context.trim(),
          type: 'parallel_mishna'
        });
      });
    }

    // Find Tosefta references
    const toseftaMatches = text.match(/תוספתא|ת״ר|תני\s+רבי/g);
    if (toseftaMatches) {
      toseftaMatches.forEach(m => {
        refs.tosefta.push({ marker: m, type: 'tosefta' });
      });
    }

    // Find Yerushalmi references
    const yerushalmiMatches = text.match(/ירושלמי|תלמודא\s*דמערבא/g);
    if (yerushalmiMatches) {
      yerushalmiMatches.forEach(m => {
        refs.yerushalmi.push({ marker: m, type: 'yerushalmi' });
      });
    }

    // Detect references to other tractates
    const tractatePattern = /(מסכת|במס'|ב)(שבת|עירובין|פסחים|יומא|סוכה|ביצה|ראש השנה|תענית|מגילה|מועד קטן|חגיגה|יבמות|כתובות|נדרים|נזיר|סוטה|גיטין|קידושין|בבא קמא|בבא מציעא|בבא בתרא|סנהדרין|מכות|שבועות|עבודה זרה|הוריות|זבחים|מנחות|חולין|בכורות|ערכין|תמורה|כריתות|מעילה|נדה)/g;
    const tractateMatches = text.match(tractatePattern);
    if (tractateMatches) {
      tractateMatches.forEach(ref => {
        refs.parallel_sugya.push({ tractate: ref, type: 'parallel_sugya' });
      });
    }

    return refs;
  }, [text]);

  // Count total references
  const totalRefs = useMemo(() => {
    return Object.values(extractedRefs).reduce((sum, arr) => sum + arr.length, 0);
  }, [extractedRefs]);

  // Filter by category
  const filteredRefs = useMemo(() => {
    if (activeCategory === 'all') {
      return Object.entries(extractedRefs)
        .filter(([_, refs]) => refs.length > 0)
        .flatMap(([cat, refs]) => refs.map(r => ({ ...r, category: cat })));
    }
    return extractedRefs[activeCategory]?.map(r => ({ ...r, category: activeCategory })) || [];
  }, [extractedRefs, activeCategory]);

  const handleRefClick = useCallback((ref) => {
    if (onNavigate && ref.tractate) {
      onNavigate(ref.tractate);
    }
  }, [onNavigate]);

  if (totalRefs === 0) return null;

  return (
    <div className="usa-cross-refs-panel" dir="rtl">
      <button
        className="cross-refs-header"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <span className="cross-refs-icon">🔗</span>
        <span className="cross-refs-title">הפניות ומקורות מקבילים</span>
        <span className="cross-refs-count">{totalRefs}</span>
        <span className="cross-refs-chevron">{isExpanded ? '▼' : '◀'}</span>
      </button>

      {isExpanded && (
        <div className="cross-refs-content">
          {/* Category filter tabs */}
          <div className="cross-refs-tabs">
            <button
              className={`ref-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
              type="button"
            >
              הכל ({totalRefs})
            </button>
            {Object.entries(CROSS_REF_CATEGORIES).map(([key, cat]) => {
              const count = extractedRefs[key]?.length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  className={`ref-tab ${activeCategory === key ? 'active' : ''}`}
                  onClick={() => setActiveCategory(key)}
                  style={{ '--tab-color': cat.color }}
                  type="button"
                >
                  {cat.icon} {count}
                </button>
              );
            })}
          </div>

          {/* References list */}
          <div className="cross-refs-list">
            {filteredRefs.map((ref, i) => {
              const catConfig = CROSS_REF_CATEGORIES[ref.category] || {};
              return (
                <div
                  key={i}
                  className={`cross-ref-item cat-${ref.category}`}
                  style={{ '--ref-color': catConfig.color }}
                  onClick={() => handleRefClick(ref)}
                >
                  <span className="ref-icon">{catConfig.icon}</span>
                  <div className="ref-content">
                    <span className="ref-marker">
                      {ref.tractate || ref.marker}
                    </span>
                    {ref.context && (
                      <span className="ref-context">{ref.context.substring(0, 60)}...</span>
                    )}
                  </div>
                  {ref.tractate && <span className="ref-action">↗️</span>}
                </div>
              );
            })}
          </div>

          <div className="cross-refs-tip">
            💡 לחץ על הפניה למסכת אחרת לנווט אליה
          </div>
        </div>
      )}
    </div>
  );
});

CrossReferencesPanel.displayName = 'CrossReferencesPanel';

// =============================================================================
// PRO SCHOLAR V26: SUGYA NAVIGATOR
// Visual timeline showing the flow and structure of the sugya
// =============================================================================

const SugyaNavigator = memo(({ patterns, onJumpTo }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);

  // Build navigation phases from patterns
  const phases = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];

    const result = [];
    let currentPhase = null;

    patterns.forEach((p) => {
      if (['mishna', 'gemara', 'baraita'].includes(p.type)) {
        if (currentPhase) result.push(currentPhase);
        currentPhase = {
          type: p.type,
          label: p.type === 'mishna' ? 'משנה' : p.type === 'gemara' ? 'גמרא' : 'ברייתא',
          icon: p.type === 'mishna' ? '📘' : p.type === 'gemara' ? '📜' : '📋',
          startPosition: p.position,
          items: [p],
          color: p.type === 'mishna' ? '#3B82F6' : p.type === 'gemara' ? '#8B5CF6' : '#10B981'
        };
      } else if (currentPhase) {
        currentPhase.items.push(p);
      }
    });

    if (currentPhase) result.push(currentPhase);
    return result;
  }, [patterns]);

  // Calculate phase statistics
  const phaseStats = useMemo(() => {
    return phases.map(phase => ({
      ...phase,
      questions: phase.items.filter(i => ['question', 'objection'].includes(i.type)).length,
      answers: phase.items.filter(i => ['resolution', 'proof'].includes(i.type)).length
    }));
  }, [phases]);

  const handlePhaseClick = useCallback((phase, index) => {
    setSelectedPhase(index);
    if (onJumpTo && phase.startPosition !== undefined) {
      onJumpTo(phase.startPosition);
    }
  }, [onJumpTo]);

  if (phases.length === 0) return null;

  return (
    <div className="usa-sugya-navigator" dir="rtl">
      <div className="navigator-header">
        <span className="navigator-icon">🗺️</span>
        <span className="navigator-title">מפת הסוגיא</span>
      </div>

      <div className="navigator-timeline">
        {phaseStats.map((phase, i) => (
          <div
            key={i}
            className={`navigator-phase ${selectedPhase === i ? 'selected' : ''}`}
            style={{ '--phase-color': phase.color }}
            onClick={() => handlePhaseClick(phase, i)}
          >
            <div className="phase-marker">
              <span className="phase-icon">{phase.icon}</span>
              <span className="phase-label">{phase.label}</span>
            </div>
            <div className="phase-stats">
              {phase.questions > 0 && <span className="phase-stat">❓{phase.questions}</span>}
              {phase.answers > 0 && <span className="phase-stat">✅{phase.answers}</span>}
            </div>
            {i < phaseStats.length - 1 && (
              <div className="phase-connector">→</div>
            )}
          </div>
        ))}
      </div>

      {selectedPhase !== null && phaseStats[selectedPhase] && (
        <div className="navigator-details">
          <div className="details-header">
            {phaseStats[selectedPhase].icon} {phaseStats[selectedPhase].label}
          </div>
          <div className="details-items">
            {phaseStats[selectedPhase].items.slice(0, 4).map((item, i) => (
              <div key={i} className="detail-item">
                <span className="item-type">{item.type}</span>
                <span className="item-text">{item.marker?.substring(0, 25)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

SugyaNavigator.displayName = 'SugyaNavigator';

// =============================================================================
// STUDY MODE SELECTOR
// =============================================================================

const StudyModeSelector = memo(({ currentMode, onModeChange }) => (
  <div className="usa-study-modes">
    {Object.values(STUDY_MODES).map(mode => (
      <button
        key={mode.key}
        className={`usa-mode-btn ${currentMode === mode.key ? 'active' : ''}`}
        style={{ '--mode-color': mode.color }}
        onClick={() => onModeChange(mode.key)}
        title={mode.description}
        type="button"
      >
        <span className="mode-icon">{mode.icon}</span>
        <span className="mode-label">{mode.hebrew}</span>
      </button>
    ))}
  </div>
));

StudyModeSelector.displayName = 'StudyModeSelector';

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

// =============================================================================
// VIEW MODE TABS
// =============================================================================

const ViewModeTabs = memo(({ currentView, onViewChange, diagramAvailable }) => (
  <div className="usa-view-tabs">
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.FLOW ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.FLOW)}
      type="button"
    >
      <span className="tab-icon">📊</span>
      <span className="tab-label">זרימה</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.TREE ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.TREE)}
      type="button"
    >
      <span className="tab-icon">🌳</span>
      <span className="tab-label">עץ</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.DIAGRAM ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.DIAGRAM)}
      disabled={!diagramAvailable}
      type="button"
    >
      <span className="tab-icon">🗺️</span>
      <span className="tab-label">דיאגרמה</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.SUMMARY ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.SUMMARY)}
      type="button"
    >
      <span className="tab-icon">📝</span>
      <span className="tab-label">סיכום</span>
    </button>
  </div>
));

ViewModeTabs.displayName = 'ViewModeTabs';

// =============================================================================
// FLOW NODE COMPONENT
// =============================================================================

const FlowNode = memo(({ pattern, index, isSelected, onClick, studyMode }) => {
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Iyun mode shows more detail
  const showExtended = studyMode === 'iyun';

  return (
    <div
      className={`usa-flow-node ${isSelected ? 'selected' : ''} type-${pattern.type}`}
      style={{ '--node-color': config.color || '#6b7280' }}
      onClick={() => onClick(pattern)}
      role="button"
      tabIndex={0}
      dir="rtl"
    >
      <div className="node-marker-row">
        <span className="node-index">{index + 1}</span>
        <span className="node-icon">{config.icon || '📌'}</span>
        <span className="node-type">{hebrewLabel}</span>
      </div>
      <div className="node-text">
        {pattern.marker}
      </div>
      {showExtended && pattern.context && (
        <div className="node-context">
          ...{pattern.context}...
        </div>
      )}
    </div>
  );
});

FlowNode.displayName = 'FlowNode';

// =============================================================================
// FLOW CONNECTOR
// =============================================================================

const FlowConnector = memo(({ fromType, toType }) => {
  const getRelation = () => {
    if (['question', 'objection'].includes(fromType) && ['resolution', 'proof'].includes(toType)) {
      return 'answer';
    }
    if (toType === 'objection') return 'challenge';
    if (toType === 'proof') return 'support';
    return 'flow';
  };

  const relation = getRelation();

  return (
    <div className={`usa-flow-connector ${relation}`}>
      <div className="connector-line" />
      <span className="connector-arrow">↓</span>
    </div>
  );
});

FlowConnector.displayName = 'FlowConnector';

// =============================================================================
// FLOW VIEW
// =============================================================================

const FlowView = memo(({ patterns, selectedPattern, onPatternSelect, studyMode }) => {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">📊</span>
        <span className="empty-text">לא נמצאו סימני מבנה בטקסט</span>
      </div>
    );
  }

  return (
    <div className="usa-flow-view">
      {patterns.map((pattern, index) => (
        <React.Fragment key={`${pattern.type}-${pattern.position}`}>
          <FlowNode
            pattern={pattern}
            index={index}
            isSelected={selectedPattern?.position === pattern.position}
            onClick={onPatternSelect}
            studyMode={studyMode}
          />
          {index < patterns.length - 1 && (
            <FlowConnector
              fromType={pattern.type}
              toType={patterns[index + 1].type}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

FlowView.displayName = 'FlowView';

// =============================================================================
// TREE NODE COMPONENT
// =============================================================================

const TreeNode = memo(({ node, depth, isExpanded, onToggle, onSelect, selectedId }) => {
  const config = TALMUDIC_PATTERNS[node.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[node.type] || node.type;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isQuestion = ['question', 'objection'].includes(node.type);
  const isResolved = isQuestion && hasChildren;

  return (
    <div className={`usa-tree-branch depth-${Math.min(depth, 4)}`} style={{ '--branch-color': config.color }}>
      <div
        className={`usa-tree-node ${isSelected ? 'selected' : ''} ${isResolved ? 'resolved' : ''}`}
        onClick={() => onSelect(node)}
        role="button"
        tabIndex={0}
      >
        {hasChildren && (
          <button
            className={`tree-toggle ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            type="button"
          >
            {isExpanded ? '▼' : '◀'}
          </button>
        )}
        <span className="tree-icon">{config.icon || '📌'}</span>
        <span className="tree-label">{hebrewLabel}</span>
        <span className="tree-marker">{node.marker?.substring(0, 40)}{node.marker?.length > 40 ? '...' : ''}</span>
        {isQuestion && (
          <span className={`tree-status ${isResolved ? 'resolved' : 'open'}`}>
            {isResolved ? '✓' : '?'}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="usa-tree-children">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.id || idx}
              node={child}
              depth={depth + 1}
              isExpanded={true}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

// =============================================================================
// TREE VIEW
// =============================================================================

const TreeView = memo(({ patterns, selectedPattern, onPatternSelect }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Build tree structure
  const tree = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];

    const nodes = [];
    let i = 0;

    while (i < patterns.length) {
      const p = patterns[i];
      const node = {
        ...p,
        id: `${p.type}-${p.position}`,
        children: []
      };

      // Structural elements are top-level
      if (['mishna', 'gemara', 'baraita'].includes(p.type)) {
        nodes.push(node);
        i++;
        continue;
      }

      // Questions/objections collect their answers
      if (['question', 'objection'].includes(p.type)) {
        let j = i + 1;
        while (j < patterns.length) {
          const next = patterns[j];
          if (['question', 'objection', 'mishna', 'gemara', 'baraita'].includes(next.type)) break;
          if (['resolution', 'proof', 'alternative'].includes(next.type)) {
            node.children.push({ ...next, id: `${next.type}-${next.position}` });
          }
          j++;
        }
        nodes.push(node);
        i = j;
        continue;
      }

      nodes.push(node);
      i++;
    }

    return nodes;
  }, [patterns]);

  // Initialize expanded state
  useEffect(() => {
    const expandable = new Set();
    tree.forEach(n => {
      if (n.children?.length > 0) expandable.add(n.id);
    });
    setExpandedNodes(expandable);
  }, [tree]);

  const handleToggle = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node) => {
    onPatternSelect(node);
  }, [onPatternSelect]);

  if (tree.length === 0) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">🌳</span>
        <span className="empty-text">לא נמצא מבנה לתצוגת עץ</span>
      </div>
    );
  }

  // Calculate stats
  const questionNodes = tree.filter(n => ['question', 'objection'].includes(n.type));
  const resolved = questionNodes.filter(n => n.children?.length > 0).length;

  return (
    <div className="usa-tree-view" dir="rtl">
      <div className="usa-tree-summary">
        <span className="summary-item">
          <span className="s-icon">🌳</span>
          <span className="s-value">{tree.length}</span>
          <span className="s-label">צמתים</span>
        </span>
        <span className="summary-item resolved">
          <span className="s-icon">✅</span>
          <span className="s-value">{resolved}</span>
          <span className="s-label">נפתרו</span>
        </span>
        {questionNodes.length - resolved > 0 && (
          <span className="summary-item open">
            <span className="s-icon">❓</span>
            <span className="s-value">{questionNodes.length - resolved}</span>
            <span className="s-label">פתוחות</span>
          </span>
        )}
      </div>

      <div className="usa-tree-container">
        {tree.map((node, idx) => (
          <TreeNode
            key={node.id || idx}
            node={node}
            depth={0}
            isExpanded={expandedNodes.has(node.id)}
            onToggle={handleToggle}
            onSelect={handleSelect}
            selectedId={selectedPattern?.id}
          />
        ))}
      </div>
    </div>
  );
});

TreeView.displayName = 'TreeView';

// =============================================================================
// DIAGRAM VIEW
// =============================================================================

const DiagramView = memo(({ mermaidCode, diagramType, onDiagramTypeChange }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mermaidCode) {
      const validation = validateMermaidSyntax(mermaidCode);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
      } else {
        setError(null);
      }
    }
  }, [mermaidCode]);

  if (!mermaidCode) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">🗺️</span>
        <span className="empty-text">אין מספיק נתונים ליצירת דיאגרמה</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usa-error-state">
        <span className="error-icon">⚠️</span>
        <span className="error-text">שגיאה בדיאגרמה: {error}</span>
      </div>
    );
  }

  return (
    <div className="usa-diagram-view">
      <div className="usa-diagram-types">
        {Object.entries(DIAGRAM_TYPES).slice(0, 4).map(([key, value]) => (
          <button
            key={key}
            className={`diagram-type-btn ${diagramType === value ? 'active' : ''}`}
            onClick={() => onDiagramTypeChange(value)}
            type="button"
          >
            {key === 'SUGYA_FLOW' ? '📊 זרימה' :
             key === 'SPEAKER_NETWORK' ? '👥 רשת' :
             key === 'HALACHIC_CHAIN' ? '⚖️ שרשרת' :
             key === 'MACHLOKET' ? '⚔️ מחלוקת' : key}
          </button>
        ))}
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <div className="usa-diagram-container">
          <MermaidDiagram code={mermaidCode} />
        </div>
      </Suspense>
    </div>
  );
});

DiagramView.displayName = 'DiagramView';

// =============================================================================
// SUMMARY VIEW
// =============================================================================

const SummaryView = memo(({ patterns, qaFlow, mishnaAnalysis, rabbis, studyMode }) => {
  const summary = useMemo(() => {
    const questions = patterns.filter(p => ['question', 'objection'].includes(p.type));
    const answers = patterns.filter(p => ['resolution', 'proof'].includes(p.type));
    const sources = patterns.filter(p => ['baraita', 'scripture', 'source_citation'].includes(p.type));

    return {
      structure: {
        hasMishna: patterns.some(p => p.type === 'mishna'),
        hasGemara: patterns.some(p => p.type === 'gemara'),
        hasBaraita: patterns.some(p => p.type === 'baraita')
      },
      dialectic: {
        questions: questions.length,
        answers: answers.length,
        resolved: Math.min(questions.length, answers.length)
      },
      sources: sources.length,
      rabbiCount: rabbis?.length || 0
    };
  }, [patterns, rabbis]);

  return (
    <div className="usa-summary-view" dir="rtl">
      {/* Structure Overview */}
      <div className="usa-summary-section">
        <h4 className="section-title">
          <span className="title-icon">📚</span>
          מבנה הסוגיא
        </h4>
        <div className="summary-content">
          <p>
            {summary.structure.hasMishna && summary.structure.hasGemara
              ? 'סוגיא שלמה הכוללת משנה וגמרא'
              : summary.structure.hasMishna
              ? 'משנה בלבד'
              : 'דיון גמרא'}
            {summary.structure.hasBaraita && ' עם ציטוט ברייתות'}
          </p>
        </div>
      </div>

      {/* Dialectic Summary */}
      <div className="usa-summary-section">
        <h4 className="section-title">
          <span className="title-icon">🔄</span>
          שקלא וטריא
        </h4>
        <div className="summary-content">
          <div className="dialectic-stats">
            <div className="d-stat">
              <span className="d-icon">❓</span>
              <span className="d-value">{summary.dialectic.questions}</span>
              <span className="d-label">שאלות/קושיות</span>
            </div>
            <div className="d-stat">
              <span className="d-icon">✅</span>
              <span className="d-value">{summary.dialectic.answers}</span>
              <span className="d-label">תירוצים/ראיות</span>
            </div>
            <div className="d-stat">
              <span className="d-icon">📖</span>
              <span className="d-value">{summary.sources}</span>
              <span className="d-label">מקורות</span>
            </div>
          </div>
        </div>
      </div>

      {/* Q&A Flow Summary */}
      {qaFlow && qaFlow.flow && qaFlow.flow.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">💬</span>
            מהלך הדיון
          </h4>
          <div className="qa-flow-summary">
            {qaFlow.flow.map((unit, i) => (
              <div key={i} className="qa-unit-summary">
                <div className="qa-question">
                  <span className="qa-icon">❓</span>
                  <span className="qa-text">{unit.question?.marker?.substring(0, 60) || 'שאלה'}</span>
                </div>
                {unit.resolution && (
                  <div className="qa-resolution">
                    <span className="qa-icon">✅</span>
                    <span className="qa-text">{unit.resolution.marker?.substring(0, 60) || 'תירוץ'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mishna Structure (for Iyun mode) */}
      {studyMode === 'iyun' && mishnaAnalysis && mishnaAnalysis.elements?.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">📘</span>
            מבנה המשנה
          </h4>
          <div className="mishna-elements">
            {mishnaAnalysis.summary?.hasEnumeration && (
              <span className="mishna-badge">🔢 ספירה</span>
            )}
            {mishnaAnalysis.summary?.hasConditions && (
              <span className="mishna-badge">🔀 תנאים</span>
            )}
            {mishnaAnalysis.summary?.hasRulings && (
              <span className="mishna-badge">⚖️ פסקים</span>
            )}
            {mishnaAnalysis.summary?.hasDisputes && (
              <span className="mishna-badge">⚔️ מחלוקות</span>
            )}
          </div>
        </div>
      )}

      {/* Sages */}
      {rabbis && rabbis.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">👤</span>
            חכמים מוזכרים ({rabbis.length})
          </h4>
          <div className="rabbis-list">
            {rabbis.slice(0, 8).map((rabbi, i) => (
              <span key={i} className="rabbi-badge">
                {rabbi.name || rabbi.match}
              </span>
            ))}
            {rabbis.length > 8 && (
              <span className="rabbi-more">+{rabbis.length - 8}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SummaryView.displayName = 'SummaryView';

// =============================================================================
// PATTERN DETAIL PANEL
// =============================================================================

const PatternDetailPanel = memo(({ pattern, text, onClose }) => {
  if (!pattern) return null;

  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Get context
  const contextRadius = 100;
  const contextStart = Math.max(0, pattern.position - contextRadius);
  const contextEnd = Math.min(text?.length || 0, (pattern.endPosition || pattern.position + 20) + contextRadius);
  const contextBefore = text?.slice(contextStart, pattern.position) || '';
  const contextAfter = text?.slice(pattern.endPosition || pattern.position + 20, contextEnd) || '';

  const explanations = {
    mishna: 'זהו תחילת המשנה - הטקסט העיקרי שהגמרא דנה בו.',
    gemara: 'זהו תחילת הגמרא - דיון האמוראים והסברת המשנה.',
    question: 'כאן עולה שאלה לבירור או לחקירה.',
    objection: 'קושיא על הנאמר קודם.',
    proof: 'הבאת ראיה לחיזוק הדברים.',
    resolution: 'תירוץ לשאלה או לקושיא.',
    alternative: 'גרסה או פירוש חלופי.',
    baraita: 'מקור תנאי מחוץ למשנה.',
    scripture: 'הבאת פסוק כמקור או ראיה.'
  };

  return (
    <div className="usa-detail-panel" style={{ '--accent-color': config.color }} dir="rtl">
      <div className="detail-header">
        <div className="detail-title">
          <span className="detail-icon">{config.icon}</span>
          <span className="detail-hebrew">{hebrewLabel}</span>
          <span className="detail-english">{config.label}</span>
        </div>
        <button className="detail-close" onClick={onClose} type="button">×</button>
      </div>

      <div className="detail-body">
        <div className="detail-marker">{pattern.marker}</div>

        <div className="detail-section">
          <div className="section-label">הסבר</div>
          <p className="section-text">{explanations[pattern.type] || 'סימן מבני בסוגיא'}</p>
        </div>

        <div className="detail-section">
          <div className="section-label">הקשר בגמרא</div>
          <div className="context-display">
            <span className="ctx-before">{contextStart > 0 ? '...' : ''}{contextBefore}</span>
            <mark className="ctx-marker">{pattern.marker}</mark>
            <span className="ctx-after">{contextAfter}{contextEnd < (text?.length || 0) ? '...' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PatternDetailPanel.displayName = 'PatternDetailPanel';

// =============================================================================
// PRO SCHOLAR V30: CONSOLIDATED NOTES PANEL
// Powerful study notes with mastery tracking and insights
// Merged from TalmudToolsTab.StudyNotesPanel (best features)
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
      id: Date.now(),
      text: newInsight,
      timestamp: new Date().toISOString()
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

      {/* Main notes textarea */}
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

      {/* Quick insights */}
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
                <button
                  className="insight-remove"
                  onClick={() => removeInsight(insight.id)}
                  type="button"
                >×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mastery level */}
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
// PRO SCHOLAR V30: CONSOLIDATED ABBREVIATIONS PANEL
// Powerful abbreviations component with search, grouping, copy, expanded text
// Merged from TalmudToolsTab.AbbreviationsSection (best features)
// =============================================================================

const AbbreviationsPanel = memo(({ text, abbreviations: passedAbbreviations }) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['name']));
  const [selectedAbbr, setSelectedAbbr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpanded, setShowExpanded] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  // Support both text prop (auto-detect) and abbreviations prop (pre-computed)
  const abbreviations = useMemo(() => {
    if (passedAbbreviations && passedAbbreviations.length > 0) {
      // Use passed abbreviations, dedupe them
      const seen = new Set();
      return passedAbbreviations.filter(abbr => {
        const key = abbr.abbreviation || abbr.abbrev;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (!text) return [];
    const found = findAbbreviations(text);
    const seen = new Set();
    return found.filter(abbr => {
      if (seen.has(abbr.abbreviation)) return false;
      seen.add(abbr.abbreviation);
      return true;
    });
  }, [text, passedAbbreviations]);

  const filteredAbbreviations = useMemo(() => {
    if (!searchQuery.trim()) return abbreviations;
    const q = searchQuery.toLowerCase();
    return abbreviations.filter(abbr =>
      (abbr.abbreviation || abbr.abbrev || '').includes(searchQuery) ||
      (abbr.expansion || abbr.full || '').includes(searchQuery) ||
      (abbr.english || '').toLowerCase().includes(q)
    );
  }, [abbreviations, searchQuery]);

  const expandedText = useMemo(() => {
    if (!text || !showExpanded) return '';
    return expandAllAbbreviations(text, { showOriginal: true });
  }, [text, showExpanded]);

  const toggleGroup = useCallback((type) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleCopyAbbr = useCallback((abbr) => {
    const short = abbr.abbreviation || abbr.abbrev;
    const full = abbr.expansion || abbr.full;
    copy(`${short} = ${full}`);
  }, [copy]);

  // Group by type - memoized
  const sortedGroups = useMemo(() => {
    const grouped = filteredAbbreviations.reduce((acc, abbr) => {
      const type = abbr.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(abbr);
      return acc;
    }, {});
    return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  }, [filteredAbbreviations]);

  if (abbreviations.length === 0) {
    return (
      <div className="usa-abbr-panel empty-state" dir="rtl">
        <div className="empty-icon">א״ב</div>
        <div className="empty-title">לא נמצאו ראשי תיבות</div>
        <p className="empty-text">ראשי תיבות נפוצים יזוהו אוטומטית.</p>
        <div className="empty-examples">
          <div className="example-title">דוגמאות:</div>
          <div className="example-list">
            <span>ר״ש = רבי שמעון</span>
            <span>ת״ר = תנו רבנן</span>
            <span>ש״מ = שמע מינה</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="usa-abbr-panel enhanced" dir="rtl">
      {/* Header */}
      <div className="abbr-header-bar">
        <div className="header-title">
          <span className="title-icon">א״ב</span>
          <span className="title-text">ראשי תיבות</span>
          <span className="title-count">{filteredAbbreviations.length}</span>
        </div>

        {text && (
          <div className="header-actions">
            <button
              className={`header-btn ${showExpanded ? 'active' : ''}`}
              onClick={() => setShowExpanded(!showExpanded)}
              title={showExpanded ? 'הסתר פירוש' : 'הצג טקסט מפורש'}
              type="button"
            >
              {showExpanded ? '📝' : '📖'}
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="abbr-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="חפש ראשי תיבות..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          dir="rtl"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')} type="button">×</button>
        )}
      </div>

      {/* Expanded text view */}
      {showExpanded && expandedText && (
        <div className="expanded-text-box">
          <div className="box-header">טקסט עם פירוש ראשי תיבות:</div>
          <div className="box-content" dir="rtl">{expandedText}</div>
        </div>
      )}

      {/* No search results */}
      {filteredAbbreviations.length === 0 && searchQuery && (
        <div className="no-results">
          <span>לא נמצאו תוצאות עבור "{searchQuery}"</span>
        </div>
      )}

      {/* Grouped abbreviations */}
      <div className="abbr-groups">
        {sortedGroups.map(([type, items]) => (
          <div key={type} className={`abbr-group ${expandedGroups.has(type) ? 'expanded' : ''}`}>
            <button className="group-header" onClick={() => toggleGroup(type)} type="button" dir="rtl">
              <span className="group-icon">{ABBR_TYPE_ICONS[type] || '📌'}</span>
              <span className="group-name">{type}</span>
              <span className="group-count">{items.length}</span>
              <span className="group-chevron">{expandedGroups.has(type) ? '▼' : '◀'}</span>
            </button>

            {expandedGroups.has(type) && (
              <div className="group-items">
                {items.map((abbr, i) => {
                  const short = abbr.abbreviation || abbr.abbrev;
                  const full = abbr.expansion || abbr.full;
                  return (
                    <div
                      key={i}
                      className={`abbr-item ${selectedAbbr === abbr ? 'selected' : ''}`}
                      onClick={() => setSelectedAbbr(selectedAbbr === abbr ? null : abbr)}
                      dir="rtl"
                    >
                      <span className="abbr-short">{short}</span>
                      <span className="abbr-arrow">←</span>
                      <span className="abbr-full">{full}</span>
                      {abbr.english && <span className="abbr-english">{abbr.english}</span>}
                      <button
                        className="copy-btn"
                        onClick={(e) => { e.stopPropagation(); handleCopyAbbr(abbr); }}
                        title="העתק"
                        type="button"
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected detail */}
      {selectedAbbr && (
        <div className="abbr-detail">
          <div className="detail-main" dir="rtl">
            <span className="detail-short">{selectedAbbr.abbreviation || selectedAbbr.abbrev}</span>
            <span className="detail-eq">=</span>
            <span className="detail-full">{selectedAbbr.expansion || selectedAbbr.full}</span>
          </div>
          {selectedAbbr.english && <div className="detail-english">{selectedAbbr.english}</div>}
          <button className="detail-close" onClick={() => setSelectedAbbr(null)} type="button">×</button>
        </div>
      )}
    </div>
  );
});

AbbreviationsPanel.displayName = 'AbbreviationsPanel';

// =============================================================================
// PRO SCHOLAR V26: CHAZARA QUESTIONS PANEL
// Self-test questions based on sugya content
// =============================================================================

const ChazaraQuestionsPanel = memo(({ hasMishna, hasGemara, rabbis, qaFlow }) => {
  const [revealedAnswers, setRevealedAnswers] = useState(new Set());

  // Generate questions based on content
  const questions = useMemo(() => {
    const result = [];

    if (hasMishna) {
      result.push({
        id: 'mishna-1',
        question: CHAZARA_QUESTION_TEMPLATES.mishna[0],
        hint: 'התבונן במשנה וחפש את הדין העיקרי',
        category: 'mishna'
      });
    }

    if (hasGemara && qaFlow?.flow?.length > 0) {
      result.push({
        id: 'gemara-1',
        question: CHAZARA_QUESTION_TEMPLATES.gemara[0],
        hint: 'חפש את מילות השאלה: מאי, מנלן, מהו',
        category: 'gemara'
      });

      if (qaFlow.summary?.resolved > 0) {
        result.push({
          id: 'gemara-2',
          question: CHAZARA_QUESTION_TEMPLATES.gemara[2],
          hint: 'חפש: לא קשיא, הכי קאמר, תירוץ',
          category: 'gemara'
        });
      }
    }

    if (rabbis && rabbis.length > 0) {
      result.push({
        id: 'sages-1',
        question: `מי הם ${Math.min(rabbis.length, 3)} החכמים המוזכרים בסוגיא?`,
        hint: `יש ${rabbis.length} חכמים בסוגיא`,
        category: 'sages',
        answer: rabbis.slice(0, 3).map(r => r.name || r.match).join(', ')
      });
    }

    return result;
  }, [hasMishna, hasGemara, qaFlow, rabbis]);

  const toggleAnswer = useCallback((id) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  if (questions.length === 0) return null;

  return (
    <div className="usa-chazara-panel" dir="rtl">
      <div className="chazara-header">
        <span className="chazara-icon">🔄</span>
        <span className="chazara-title">בחן את עצמך</span>
        <span className="chazara-count">{questions.length} שאלות</span>
      </div>

      <div className="chazara-questions">
        {questions.map((q, i) => (
          <div key={q.id} className={`chazara-question cat-${q.category}`}>
            <div className="q-number">{i + 1}</div>
            <div className="q-content">
              <div className="q-text">{q.question}</div>
              <button
                className="q-hint-btn"
                onClick={() => toggleAnswer(q.id)}
                type="button"
              >
                {revealedAnswers.has(q.id) ? '🙈 הסתר' : '💡 רמז'}
              </button>
              {revealedAnswers.has(q.id) && (
                <div className="q-hint">
                  {q.answer || q.hint}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chazara-tip">
        💡 נסה לענות בעצמך לפני שתלחץ על הרמז!
      </div>
    </div>
  );
});

ChazaraQuestionsPanel.displayName = 'ChazaraQuestionsPanel';

// =============================================================================
// PRO SCHOLAR V30: CONSOLIDATED BEKIUS SUMMARY
// Quick overview with persistent checklist
// Merged from TalmudToolsTab.BekiusSummary (best features)
// =============================================================================

const BEKIUS_STORAGE_KEY = 'talmud_bekius_checklist';

const BekiusQuickSummary = memo(({ hasMishna, hasGemara, qaFlow, mishnaAnalysis, patterns, sugyaKey, text }) => {
  // Persist checklist state
  const [checklist, setChecklist] = useState(() => {
    const all = safeGet(BEKIUS_STORAGE_KEY, {});
    return all[sugyaKey] || {};
  });

  // Save checklist when it changes
  useEffect(() => {
    if (!sugyaKey || Object.keys(checklist).length === 0) return;
    const all = safeGet(BEKIUS_STORAGE_KEY, {});
    all[sugyaKey] = checklist;
    // Limit to 50 entries
    const keys = Object.keys(all);
    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
    }
    safeSet(BEKIUS_STORAGE_KEY, all);
  }, [checklist, sugyaKey]);

  const toggleCheck = useCallback((id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Calculate summary from patterns if not passed directly
  const summary = useMemo(() => {
    const pats = patterns || [];
    const hasMishnaLocal = hasMishna ?? pats.some(p => p.type === 'mishna');
    const hasGemaraLocal = hasGemara ?? pats.some(p => p.type === 'gemara');
    const questionCount = pats.filter(p => ['question', 'objection'].includes(p.type)).length;
    const legalRulings = pats.filter(p => p.type === 'legal_ruling');

    return {
      hasMishna: hasMishnaLocal,
      hasGemara: hasGemaraLocal,
      questionCount,
      hasHalacha: legalRulings.length > 0,
      complexity: questionCount < 2 ? 'פשוטה' : questionCount < 5 ? 'בינונית' : 'מורכבת'
    };
  }, [patterns, hasMishna, hasGemara]);

  // Generate quick bullet points
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

      {/* Summary cards */}
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

      {/* Quick bullets */}
      <div className="bekius-bullets">
        {bullets.map((b, i) => (
          <div key={i} className="bekius-bullet">
            <span className="bullet-icon">{b.icon}</span>
            <span className="bullet-text">{b.text}</span>
          </div>
        ))}
      </div>

      {/* Persistent checklist */}
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

      <div className="bekius-tip">
        💡 לפרטים נוספים, עבור למצב עיון
      </div>
    </div>
  );
});

BekiusQuickSummary.displayName = 'BekiusQuickSummary';

// =============================================================================
// MAIN COMPONENT: UnifiedSugyaAnalysis
// =============================================================================

const UnifiedSugyaAnalysis = ({
  text,
  reference,
  initialStudyMode = 'iyun',
  showNotes = true,
  showDiagram = true,
  onPatternClick,
  className = ''
}) => {
  // State
  const [studyMode, setStudyMode] = useState(initialStudyMode);
  const [viewMode, setViewMode] = useState(VIEW_MODES.FLOW);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [diagramType, setDiagramType] = useState(DIAGRAM_TYPES.SUGYA_FLOW);

  // Analyze text
  const analysis = useMemo(() => {
    if (!text) return null;

    const patterns = detectStructuralMarkers(text);
    const discourseAnalysis = analyzeDiscourseStructure(text);
    const rabbis = detectRabbis(text);
    const qaFlow = extractGemaraQA(text);
    const mishnaAnalysis = analyzeMishnaStructure(text);
    const abbreviations = findAbbreviations(text);

    // Generate stats
    const stats = {};
    patterns.forEach(p => {
      stats[p.type] = (stats[p.type] || 0) + 1;
    });

    return {
      patterns,
      discourseAnalysis,
      rabbis,
      qaFlow,
      mishnaAnalysis,
      abbreviations,
      stats,
      complexity: discourseAnalysis?.complexityLevel || 'moderate',
      structure: discourseAnalysis?.structure || 'gemara-only'
    };
  }, [text]);

  // Generate diagram
  const mermaidCode = useMemo(() => {
    if (!showDiagram || !analysis?.patterns?.length) return null;

    try {
      return generateQAFlowDiagram(text);
    } catch (err) {
      console.warn('Diagram generation failed:', err);
      return null;
    }
  }, [text, showDiagram, analysis?.patterns?.length]);

  // Handlers
  const handlePatternSelect = useCallback((pattern) => {
    setSelectedPattern(prev => prev?.position === pattern.position ? null : pattern);
    if (onPatternClick) onPatternClick(pattern);
  }, [onPatternClick]);

  const handleStudyModeChange = useCallback((mode) => {
    setStudyMode(mode);
    // Save preference
    const prefs = safeGet(STORAGE_KEYS.viewPrefs, {});
    prefs.studyMode = mode;
    safeSet(STORAGE_KEYS.viewPrefs, prefs);
  }, []);

  const handleViewChange = useCallback((view) => {
    setViewMode(view);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPattern(null);
  }, []);

  // PRO SCHOLAR V26: Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        // Study mode shortcuts: 1, 2, 3
        case '1':
          handleStudyModeChange('iyun');
          break;
        case '2':
          handleStudyModeChange('bekius');
          break;
        case '3':
          handleStudyModeChange('chazara');
          break;

        // View mode shortcuts: f, t, d, s
        case 'f':
        case 'F':
          handleViewChange(VIEW_MODES.FLOW);
          break;
        case 't':
        case 'T':
          handleViewChange(VIEW_MODES.TREE);
          break;
        case 'd':
        case 'D':
          if (mermaidCode) handleViewChange(VIEW_MODES.DIAGRAM);
          break;
        case 's':
        case 'S':
          handleViewChange(VIEW_MODES.SUMMARY);
          break;

        // Close detail panel
        case 'Escape':
          if (selectedPattern) handleCloseDetail();
          break;

        // Navigate patterns with arrow keys
        case 'ArrowDown':
        case 'ArrowLeft': // RTL - left is next
          if (analysis?.patterns?.length > 0) {
            e.preventDefault();
            const currentIdx = selectedPattern
              ? analysis.patterns.findIndex(p => p.position === selectedPattern.position)
              : -1;
            const nextIdx = Math.min(currentIdx + 1, analysis.patterns.length - 1);
            setSelectedPattern(analysis.patterns[nextIdx]);
          }
          break;
        case 'ArrowUp':
        case 'ArrowRight': // RTL - right is previous
          if (analysis?.patterns?.length > 0 && selectedPattern) {
            e.preventDefault();
            const currentIdx = analysis.patterns.findIndex(p => p.position === selectedPattern.position);
            const prevIdx = Math.max(currentIdx - 1, 0);
            setSelectedPattern(analysis.patterns[prevIdx]);
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStudyModeChange, handleViewChange, handleCloseDetail, selectedPattern, analysis?.patterns, mermaidCode]);

  // Suya key for notes storage
  const sugyaKey = useMemo(() => {
    return reference || `sugya-${text?.substring(0, 50).replace(/\s+/g, '_') || 'unknown'}`;
  }, [reference, text]);

  // PRO SCHOLAR V25: Compute additional analysis values
  const hasMishna = analysis?.stats?.mishna > 0;
  const hasGemara = analysis?.stats?.gemara > 0;
  const qaResolved = analysis?.qaFlow?.summary?.resolved || 0;
  const qaTotal = qaResolved + (analysis?.qaFlow?.summary?.unresolved || 0);

  // Empty state
  if (!text) {
    return (
      <div className={`usa-container ${className}`}>
        <div className="usa-empty-state large">
          <span className="empty-icon">📜</span>
          <span className="empty-title">ניתוח סוגיא מאוחד</span>
          <span className="empty-text">בחר טקסט מהגמרא לניתוח</span>
        </div>
      </div>
    );
  }

  if (!analysis || !analysis.patterns || analysis.patterns.length === 0) {
    return (
      <div className={`usa-container ${className}`}>
        <div className="usa-empty-state">
          <span className="empty-icon">🔍</span>
          <span className="empty-text">לא נמצאו סימני מבנה תלמודי בטקסט</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`usa-container ${className}`} dir="rtl">
      {/* PRO SCHOLAR V25: Data Source Banner - Shows what daf we're analyzing */}
      <DataSourceBanner
        reference={reference}
        textLength={text?.length || 0}
        hasMishna={hasMishna}
        hasGemara={hasGemara}
        dafProgress={null}
      />

      {/* Study Mode Selector */}
      <StudyModeSelector
        currentMode={studyMode}
        onModeChange={handleStudyModeChange}
      />

      {/* PRO SCHOLAR V25: Content Structure Overview - Visual flow */}
      <ContentStructureOverview
        patterns={analysis.patterns}
        hasMishna={hasMishna}
        hasGemara={hasGemara}
        qaResolved={qaResolved}
        qaTotal={qaTotal}
      />

      {/* Header with Stats */}
      <SugyaHeader
        reference={reference}
        stats={analysis.stats}
        complexity={analysis.complexity}
        structure={analysis.structure}
      />

      {/* PRO SCHOLAR V25: Mishna Summary Card */}
      {hasMishna && analysis.mishnaAnalysis && (
        <MishnaSummaryCard
          mishnaAnalysis={analysis.mishnaAnalysis}
          text={text}
        />
      )}

      {/* PRO SCHOLAR V29: Unified Gemara Dialectic Panel
          Consolidated שקלא וטריא - combines resolution tracking with dialectic flow */}
      <GemaraDialecticPanel
        patterns={analysis.patterns}
        qaFlow={analysis.qaFlow}
        text={text}
      />

      {/* View Mode Tabs */}
      <ViewModeTabs
        currentView={viewMode}
        onViewChange={handleViewChange}
        diagramAvailable={!!mermaidCode}
      />

      {/* Main Content Area */}
      <div className="usa-content">
        {/* Left: Pattern List/Tree/Diagram */}
        <div className="usa-main-view">
          {viewMode === VIEW_MODES.FLOW && (
            <FlowView
              patterns={analysis.patterns}
              selectedPattern={selectedPattern}
              onPatternSelect={handlePatternSelect}
              studyMode={studyMode}
            />
          )}

          {viewMode === VIEW_MODES.TREE && (
            <TreeView
              patterns={analysis.patterns}
              selectedPattern={selectedPattern}
              onPatternSelect={handlePatternSelect}
            />
          )}

          {viewMode === VIEW_MODES.DIAGRAM && (
            <DiagramView
              mermaidCode={mermaidCode}
              diagramType={diagramType}
              onDiagramTypeChange={setDiagramType}
            />
          )}

          {viewMode === VIEW_MODES.SUMMARY && (
            <SummaryView
              patterns={analysis.patterns}
              qaFlow={analysis.qaFlow}
              mishnaAnalysis={analysis.mishnaAnalysis}
              rabbis={analysis.rabbis}
              studyMode={studyMode}
            />
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedPattern && (
          <PatternDetailPanel
            pattern={selectedPattern}
            text={text}
            onClose={handleCloseDetail}
          />
        )}
      </div>

      {/* Notes Panel */}
      {showNotes && (
        <NotesPanel
          sugyaKey={sugyaKey}
          initialNotes={safeGet(STORAGE_KEYS.notes, {})[sugyaKey] || ''}
        />
      )}

      {/* PRO SCHOLAR V27: Study Mastery Tracker - Track learning progress */}
      <StudyMasteryTracker sugyaKey={sugyaKey} />

      {/* PRO SCHOLAR V29: Rich Deep Analysis (shown in Iyun mode) */}
      {studyMode === 'iyun' && (
        <>
          {/* V29: Study Progress Tracker */}
          <StudyProgressTracker analysis={analysis} />

          {/* V29: Source Quality Indicator */}
          <SourceQualityIndicator analysis={analysis} />

          {/* V29: Mishna Deep Analysis - Comprehensive breakdown */}
          <MishnaDeepAnalysis
            mishnaAnalysis={analysis.mishnaAnalysis}
            text={text}
          />

          {/* V28: Mishna Case Flow - Visual case diagram (Shabbat 2a style) */}
          <MishnaCaseFlow
            text={text}
            mishnaAnalysis={analysis.mishnaAnalysis}
          />

          {/* V29: Gemara Deep Analysis */}
          <GemaraDeepAnalysis
            patterns={analysis.patterns}
            qaFlow={analysis.qaFlow}
            rabbis={analysis.rabbis}
            text={text}
          />

          {/* V29: Rabbis Detail Panel */}
          <RabbisDetailPanel rabbis={analysis.rabbis} />

          {/* V29: Halakhic Concepts Map */}
          <HalakhicConceptsMap text={text} />

          {/* V29: Sugya Flow Diagram */}
          <SugyaMermaidDiagram text={text} patterns={analysis.patterns} />

          {/* V29: Enhanced Cross-Reference Panel */}
          <V29CrossReferencePanel text={text} />

          {/* V30: Enhanced Cross-References with categorization */}
          <V30CrossReferencesPanel text={text} />

          {/* Speaker Timeline - Visual flow of Rabbis */}
          {analysis.rabbis?.length > 0 && (
            <SpeakerTimeline
              rabbis={analysis.rabbis}
              text={text}
            />
          )}

          {/* Sugya Insights Card - AI-style insights */}
          <SugyaInsightsCard
            patterns={analysis.patterns}
            qaFlow={analysis.qaFlow}
            mishnaAnalysis={analysis.mishnaAnalysis}
            rabbis={analysis.rabbis}
          />

          {/* Halachic Conclusion Card - Practical outcomes */}
          <HalachicConclusionCard patterns={analysis.patterns} />

          {/* Cross-Reference Panel - Related sources */}
          <CrossReferencePanel patterns={analysis.patterns} />
        </>
      )}

      {/* PRO SCHOLAR V26: Abbreviations Panel - Show in all modes */}
      {analysis?.abbreviations?.length > 0 && (
        <AbbreviationsPanel abbreviations={analysis.abbreviations} />
      )}

      {/* PRO SCHOLAR V26: Cross-References Panel - Shows related sugyot */}
      <CrossReferencesPanel
        reference={reference}
        patterns={analysis.patterns}
        text={text}
      />

      {/* PRO SCHOLAR V26: Sugya Navigator - Visual map of sugya structure */}
      <SugyaNavigator
        patterns={analysis.patterns}
      />

      {/* PRO SCHOLAR V26: Study Mode Specific Panels */}
      {studyMode === 'bekius' && (
        <BekiusQuickSummary
          hasMishna={hasMishna}
          hasGemara={hasGemara}
          qaFlow={analysis.qaFlow}
          mishnaAnalysis={analysis.mishnaAnalysis}
          patterns={analysis.patterns}
        />
      )}

      {studyMode === 'chazara' && (
        <ChazaraQuestionsPanel
          hasMishna={hasMishna}
          hasGemara={hasGemara}
          rabbis={analysis.rabbis}
          qaFlow={analysis.qaFlow}
        />
      )}

      {/* Legend */}
      <div className="usa-legend">
        <span className="legend-title">מקרא:</span>
        <div className="legend-items">
          {Object.entries(TALMUDIC_PATTERNS).slice(0, 7).map(([key, config]) => (
            <span key={key} className="legend-item" style={{ '--item-color': config.color }}>
              <span className="legend-icon">{config.icon}</span>
              <span className="legend-label">{HEBREW_TYPE_LABELS[key] || config.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* PRO SCHOLAR V26: Keyboard Shortcuts Help */}
      <div className="usa-keyboard-help">
        <span className="keyboard-help-title">⌨️ קיצורי מקשים:</span>
        <div className="keyboard-help-items">
          <span className="keyboard-item">
            <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> מצב לימוד
          </span>
          <span className="keyboard-item">
            <kbd>F</kbd> זרימה
          </span>
          <span className="keyboard-item">
            <kbd>T</kbd> עץ
          </span>
          <span className="keyboard-item">
            <kbd>S</kbd> סיכום
          </span>
          <span className="keyboard-item">
            <kbd>↑</kbd><kbd>↓</kbd> ניווט
          </span>
          <span className="keyboard-item">
            <kbd>Esc</kbd> סגור
          </span>
        </div>
      </div>
    </div>
  );
};

UnifiedSugyaAnalysis.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  initialStudyMode: PropTypes.oneOf(['iyun', 'bekius', 'chazara']),
  showNotes: PropTypes.bool,
  showDiagram: PropTypes.bool,
  onPatternClick: PropTypes.func,
  className: PropTypes.string
};

UnifiedSugyaAnalysis.displayName = 'UnifiedSugyaAnalysis';

export default memo(UnifiedSugyaAnalysis);

// Named exports for individual components
export {
  // ===========================================
  // PRO SCHOLAR V30: CONSOLIDATED COMPONENTS
  // These are the best versions with merged features
  // ===========================================

  // Consolidated Panels (with all features merged)
  AbbreviationsPanel,    // V30: Now has search, grouping, copy, expanded text
  NotesPanel,            // V30: Now has mastery levels, insights list
  ChazaraPanel,          // V30: Now has progress bar, persistence, dynamic questions
  BekiusQuickSummary,    // V30: Now has persistent checklist, summary cards

  // Utility Hooks (for use in other components)
  useCopyToClipboard,
  useStudyNotes,
  useMasteryLevel,

  // ===========================================
  // CORE COMPONENTS (unchanged)
  // ===========================================
  StudyModeSelector,
  SugyaHeader,
  ViewModeTabs,
  FlowView,
  TreeView,
  DiagramView,
  SummaryView,
  PatternDetailPanel,

  // PRO SCHOLAR V25 components
  DataSourceBanner,
  MishnaSummaryCard,
  ContentStructureOverview,

  // PRO SCHOLAR V28 components
  GemaraDialecticPanel,

  // PRO SCHOLAR V31: Consolidated Mishna Analysis
  // Replaces: MishnaAnalysisPanel, MishnaBreakdown, MishnaDeepAnalysis
  MishnaAnalysisPro,

  // PRO SCHOLAR V31: Consolidated Gemara Q&A Analysis
  // Replaces: GemaraQAPanel, QAFlowTree, GemaraDeepAnalysis
  GemaraQAAnalysisPro,

  // PRO SCHOLAR V31: Rashi & Tosafot Analysis Panel
  // Fetches and displays Rishonim commentaries with three view modes
  RashiTosafotAnalysisPro,

  // PRO SCHOLAR V26 components
  QuickSummaryCard,
  CollapsibleSectionWrapper,
  CrossReferencesPanel,
  SugyaNavigator,

  // ===========================================
  // RESERVED (lazy-loaded for future integration)
  // ===========================================
  RabbiInfoPanel,  // Sage biographical tooltips - use with RabbisDetailPanel

  // ===========================================
  // DEPRECATED (kept for backward compatibility)
  // Use the consolidated versions above instead
  // ===========================================
  // NOTE: GemaraResolutionTracker REMOVED (V31) - Use GemaraDialecticPanel instead
  ChazaraQuestionsPanel,    // DEPRECATED: Use ChazaraPanel instead

  // ===========================================
  // CONSTANTS
  // ===========================================
  STUDY_MODES,
  VIEW_MODES,
  HEBREW_TYPE_LABELS,
  CHAZARA_QUESTION_TEMPLATES,
  CROSS_REF_CATEGORIES,
  ABBR_TYPE_ICONS
};
