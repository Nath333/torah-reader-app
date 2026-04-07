/**
 * TalmudToolsTab - Kollel/Yeshiva-Style Talmud Study Tools
 *
 * Designed for serious Torah study with practical learning tools:
 *
 * 📚 STUDY MODES:
 * 1. עיון (Iyun) - Deep analysis: shakla v'tarya, svara, nekudot hamachlokes
 * 2. בקיאות (Bekius) - Breadth/overview: main halacha, quick summary
 * 3. חזרה (Chazara) - Review mode: test questions, key points, self-assessment
 *
 * 🔍 LEARNING TOOLS:
 * - Sugya Map: Visual structure of the argumentation
 * - Key Concepts: Main ideas and principles (yesodos)
 * - Chavruta Questions: Discussion points for partner study
 * - Practical Halacha: Connection to psak and maaseh
 * - Abbreviations: ראשי תיבות expansion
 *
 * =============================================================================
 * ARCHITECTURE (PRO SCHOLAR V31)
 * =============================================================================
 *
 * SOURCE OF TRUTH: UnifiedSugyaAnalysis/ folder
 * - Study Panels: AbbreviationsPanel, NotesPanel, ChazaraPanel, BekiusQuickSummary
 * - Analysis: MishnaAnalysisPro, GemaraQAAnalysisPro, RashiTosafotAnalysisPro (V31)
 * - View Modes: FlowView, TreeView, DiagramView, SummaryView
 * - Helpers: CollapsibleSectionWrapper, CrossReferencesPanel, SugyaNavigator
 *
 * THIS FILE: Consumer + Unique PRO Components
 * - Imports from UnifiedSugyaAnalysis (consolidated components)
 * - Unique Components (kept for PRO features):
 *     - IyunDeepAnalysisPanel   <- ACTIVE (sevara/logic extraction)
 *     - SugyaFlowSection        <- ACTIVE (multi-view structure: tree/flow/list/text)
 *     - StatBadge               <- UI component (reserved)
 *     - CollapsibleSection      <- UI component (reserved)
 *
 * REMOVED (V31): MishnaAnalysisPanel, MishnaBreakdown -> MishnaAnalysisPro
 * REMOVED (V31): GemaraQAPanel, QAFlowTree -> GemaraQAAnalysisPro
 * =============================================================================
 */
import React, { useState, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { findAbbreviations } from '../../services/talmudicAbbreviationsService';
import { sanitizeHtmlContent } from '../../utils/safeHtml';
import {
  TEXT_TYPE_LABELS,
  STUDY_MODES,
  parseDafReference
} from '../../constants/talmudStudy';
import {
  AbbreviationsPanel,
  NotesPanel,
  ChazaraPanel,
  BekiusQuickSummary,
  MishnaAnalysisPro,
  GemaraQAAnalysisPro,
  RashiTosafotAnalysisPro
} from './UnifiedSugyaAnalysis';
import { detectStructuralMarkers, extractGemaraQA } from '../../services/discoursePatternService';
import { StatBadge, CollapsibleSection, LazyLoadFallback } from './TalmudSharedUI';
import useAnalysisHistory from '../../hooks/useAnalysisHistory';

// Extracted components (V33)
import SugyaFlowSection from './UnifiedSugyaAnalysis/SugyaFlowAnalysis';
import IyunDeepAnalysisPanel from './UnifiedSugyaAnalysis/IyunAnalysisPanel';
import DafDiagramSection from './UnifiedSugyaAnalysis/DafDiagramSection';
import { RealiaBrowser, RabbiBrowser } from './TalmudBrowsers';

const UnifiedSugyaAnalysisPro = lazy(() => import('./UnifiedSugyaAnalysis'));

// =============================================================================
// Daf Header Component - Shows current amud with Sefaria link
// =============================================================================

const DafHeader = React.memo(function DafHeader({ reference, patterns, text }) {
  const dafInfo = useMemo(() => parseDafReference(reference), [reference]);

  // Generate amud summary based on detected patterns
  const amudSummary = useMemo(() => {
    if (!patterns || patterns.length === 0) return null;

    const hasMishna = patterns.some(p => p.type === 'mishna');
    const hasGemara = patterns.some(p => p.type === 'gemara');
    const questionCount = patterns.filter(p => ['question', 'objection'].includes(p.type)).length;
    const resolutionCount = patterns.filter(p => ['resolution', 'proof'].includes(p.type)).length;
    const hasLegalRuling = patterns.some(p => p.type === 'legal_ruling');
    const hasBaraita = patterns.some(p => p.type === 'baraita');
    const hasScripture = patterns.some(p => p.type === 'scripture');

    // Build summary parts
    const parts = [];

    if (hasMishna) {
      parts.push('מתחיל במשנה');
    }

    if (hasGemara && questionCount > 0) {
      parts.push(`${questionCount} קושי${questionCount > 1 ? 'ות' : 'א'}`);
      if (resolutionCount > 0) {
        parts.push(`${resolutionCount} תירוצ${resolutionCount > 1 ? 'ים' : ''}`);
      }
    }

    if (hasBaraita) {
      parts.push('מביא ברייתא');
    }

    if (hasScripture) {
      parts.push('דרשת פסוקים');
    }

    if (hasLegalRuling) {
      parts.push('מסקנה להלכה');
    }

    return parts.length > 0 ? parts.join(' • ') : 'דיון בגמרא';
  }, [patterns]);

  // Extract first words of mishna/gemara for topic hint
  const topicHint = useMemo(() => {
    if (!text) return null;

    // Try to find mishna marker and extract topic
    const mishnaMatch = text.match(/מתני[׳']?\s*[.:]\s*(.{10,50})/);
    if (mishnaMatch) {
      const topic = mishnaMatch[1].replace(/\s+/g, ' ').trim();
      return topic.length > 40 ? topic.substring(0, 40) + '...' : topic;
    }

    return null;
  }, [text]);

  if (!dafInfo) {
    return null; // Don't show header if we can't parse the reference
  }

  return (
    <div className="daf-header" dir="rtl">
      {/* Main daf info */}
      <div className="daf-main">
        <div className="daf-icon">📜</div>
        <div className="daf-info">
          <div className="daf-reference">
            <span className="masechta">{dafInfo.hebrewMasechta}</span>
            <span className="daf-num">{dafInfo.hebrewDaf}</span>
            <span className="amud">{dafInfo.hebrewAmud}</span>
          </div>
          {amudSummary && (
            <div className="amud-summary">{amudSummary}</div>
          )}
        </div>
      </div>

      {/* Topic hint if available */}
      {topicHint && (
        <div className="topic-hint">
          <span className="hint-label">נושא:</span>
          <span className="hint-text">{topicHint}</span>
        </div>
      )}

      {/* Sefaria link */}
      <a
        href={dafInfo.sefariaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sefaria-link"
        title="פתח בספריא"
      >
        <span className="link-icon">🔗</span>
        <span className="link-text">ספריא</span>
      </a>
    </div>
  );
});

// =============================================================================
// EXTRACTED (V33): SugyaFlow, SugyaTree, Iyun -> UnifiedSugyaAnalysis/
// ProScholarSummary -> ProScholarSummary.js
// RealiaBrowser, RabbiBrowser -> TalmudBrowsers.js
// DafDiagramSection -> UnifiedSugyaAnalysis/DafDiagramSection.js
// =============================================================================

// =============================================================================
// Study Mode Selector Component
// =============================================================================

const StudyModeSelector = React.memo(function StudyModeSelector({ currentMode, onModeChange }) {
  return (
    <div className="study-mode-selector-compact" dir="rtl">
      <div className="mode-row">
        {Object.values(STUDY_MODES).map(mode => (
          <button
            key={mode.key}
            className={`mode-pill ${currentMode === mode.key ? 'active' : ''}`}
            onClick={() => onModeChange(mode.key)}
            style={{ '--mode-color': mode.color }}
            title={mode.description}
            type="button"
          >
            <span className="pill-icon">{mode.icon}</span>
            <span className="pill-text">{mode.hebrew}</span>
          </button>
        ))}
      </div>
      <div className="mode-description-line">
        {STUDY_MODES[currentMode]?.description}
      </div>
    </div>
  );
});
// =============================================================================
// Main TalmudToolsTab Component
// =============================================================================
// NOTE: This tab is DETERMINISTIC (no AI) - uses pattern-based analysis
// For AI-enhanced learning, use the Learn (לימוד) tab instead
// TEXT_TYPE_LABELS imported from ../../constants/talmudStudy.js (DRY)
// =============================================================================

const TalmudToolsTab = React.memo(function TalmudToolsTab({ text, reference, textType = 'talmud' }) {
  // PRO SCHOLAR V14: 2-tab structure - default to analysis
  const [activeView, setActiveView] = useState('analysis');
  const [studyMode, setStudyMode] = useState('iyun');

  // Get text type label with normalized type
  const normalizedType = (textType || 'talmud').toLowerCase();
  const textLabel = TEXT_TYPE_LABELS[normalizedType] || TEXT_TYPE_LABELS.talmud;

  // Generate a key for storing notes based on reference
  const sugyaKey = useMemo(() => {
    if (reference) return reference.replace(/\s+/g, '_');
    return text ? `sugya_${text.substring(0, 50).replace(/\s+/g, '_')}` : 'default';
  }, [reference, text]);

  // Detect patterns for all modes
  const patterns = useMemo(() => {
    if (!text) return [];
    return detectStructuralMarkers(text);
  }, [text]);

  // PRO SCHOLAR V29: Extract Q&A flow for deep analysis panels
  const qaFlow = useMemo(() => {
    if (!text) return { flow: [], summary: {} };
    return extractGemaraQA(text);
  }, [text]);

  // Counts for badges
  const patternsCount = patterns.length;

  const abbreviationsCount = useMemo(() => {
    if (!text) return 0;
    const found = findAbbreviations(text);
    const seen = new Set();
    return found.filter(abbr => {
      if (seen.has(abbr.abbreviation)) return false;
      seen.add(abbr.abbreviation);
      return true;
    }).length;
  }, [text]);

  return (
    <div className="talmud-tools-tab scholarly" dir="rtl">
      {/* Daf Header - Amud reference with Sefaria link */}
      <DafHeader reference={reference} patterns={patterns} text={text} />

      {/* Compact header with mode selector */}
      <div className="talmud-header-compact">
        <StudyModeSelector currentMode={studyMode} onModeChange={setStudyMode} />
        <div className={`text-type-badge ${normalizedType}`}>
          <span>{textLabel.icon}</span>
          <span>{textLabel.hebrew}</span>
        </div>
      </div>

      {/* Content based on study mode */}
      {studyMode === 'iyun' && (
        <>
          {/* Compact Analysis/Tools Toggle */}
          <div className="iyun-view-toggle">
            <button
              className={`view-btn ${activeView === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveView('analysis')}
              type="button"
            >
              <span>📖</span>
              <span>ניתוח</span>
              {patternsCount > 0 && <span className="count">{patternsCount}</span>}
            </button>
            <button
              className={`view-btn ${activeView === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveView('tools')}
              type="button"
            >
              <span>🔧</span>
              <span>כלים</span>
            </button>
          </div>

          <div className="tab-content">
            {/* ניתוח - Unified Analysis (משנה+שקו״ט+מהלך+חכמים+תרשים) */}
            {/* NOTE: This is DETERMINISTIC analysis only - no AI */}
            {activeView === 'analysis' && (
              <>
                {/* PRO SCHOLAR V29: Iyun Deep Analysis - סברות, הבחנות, הנחות */}
                <IyunDeepAnalysisPanel
                  text={text}
                  qaFlow={qaFlow}
                  patterns={patterns}
                />

                {/* PRO SCHOLAR V27: Full-featured Sugya Analysis with all scholarly tools */}
                <Suspense fallback={<LazyLoadFallback />}>
                  <UnifiedSugyaAnalysisPro
                    text={text}
                    reference={reference}
                    sugyaKey={sugyaKey}
                    showCitations={true}
                    showNotes={false}
                    compact={false}
                  />
                </Suspense>

                {/* PRO SCHOLAR V31: Consolidated Mishna Analysis (quick/grouped/deep views) */}
                <MishnaAnalysisPro text={text} />

                {/* PRO SCHOLAR V31: Consolidated Gemara Q&A Analysis (quick/tree/deep views) */}
                <GemaraQAAnalysisPro text={text} />

                {/* PRO SCHOLAR V31: Sugya Structure Visualization (tree/flow/list/text views) */}
                <SugyaFlowSection text={text} />

                {/* PRO SCHOLAR V31: Rashi & Tosafot Commentary Panel (quick/split/deep views) */}
                <RashiTosafotAnalysisPro reference={reference} text={text} />

                {/* PRO SCHOLAR V29: Visual Daf Diagram */}
                <DafDiagramSection reference={reference} text={text} />
              </>
            )}

            {/* כלים - Tools (הערות+ר״ת+מידות) */}
            {activeView === 'tools' && (
              <div className="tools-panel-compact">
                <div className="tool-section-compact">
                  <div className="tool-header-compact">
                    <span>📝</span>
                    <span>הערות</span>
                  </div>
                  <NotesPanel sugyaKey={sugyaKey} text={text} />
                </div>

                <div className="tool-section-compact">
                  <div className="tool-header-compact">
                    <span>א״ב</span>
                    <span>ר״ת</span>
                    {abbreviationsCount > 0 && <span className="tool-count">{abbreviationsCount}</span>}
                  </div>
                  <AbbreviationsPanel text={text} />
                </div>

                <div className="tool-section-compact">
                  <div className="tool-header-compact">
                    <span>📏</span>
                    <span>מידות</span>
                  </div>
                  <Suspense fallback={<LazyLoadFallback />}>
                    <RealiaBrowser text={text} />
                  </Suspense>
                </div>

                <div className="tool-section-compact">
                  <div className="tool-header-compact">
                    <span>👤</span>
                    <span>חכמים</span>
                  </div>
                  <RabbiBrowser text={text} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {studyMode === 'bekius' && (
        <>
          {/* Bekius Mode - Quick Overview */}
          <BekiusQuickSummary patterns={patterns} text={text} sugyaKey={sugyaKey} />

          <div className="bekius-tools">
            <div className="tools-header">
              <span className="tools-icon">🔧</span>
              <span className="tools-title">כלי עזר</span>
            </div>
            <div className="tools-grid">
              <button
                className={`tool-btn ${activeView === 'abbr' ? 'active' : ''}`}
                onClick={() => setActiveView(activeView === 'abbr' ? 'none' : 'abbr')}
                type="button"
              >
                <span className="btn-icon">א״ב</span>
                <span className="btn-label">ראשי תיבות ({abbreviationsCount})</span>
              </button>
            </div>
          </div>

          {activeView === 'abbr' && (
            <div className="tab-content">
              <AbbreviationsPanel text={text} />
            </div>
          )}
        </>
      )}

      {studyMode === 'chazara' && (
        <>
          {/* Chazara Mode - Review & Self-Test */}
          <ChazaraPanel patterns={patterns} text={text} sugyaKey={sugyaKey} />

          <div className="chazara-tools">
            <div className="tools-divider" />
            <button
              className={`expand-btn ${activeView === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveView(activeView === 'notes' ? 'none' : 'notes')}
              type="button"
            >
              <span className="btn-icon">📝</span>
              <span className="btn-label">עיין בהערות שלך</span>
              <span className="btn-arrow">{activeView === 'notes' ? '▲' : '▼'}</span>
            </button>
          </div>

          {activeView === 'notes' && (
            <div className="tab-content">
              <NotesPanel sugyaKey={sugyaKey} text={text} />
            </div>
          )}
        </>
      )}

      {/* Quick study tips based on current mode */}
      <div className="study-tip-footer">
        <span className="tip-icon">💡</span>
        <span className="tip-text">
          {studyMode === 'iyun' && 'עיון: התמקד בהבנת כל שלב בשקלא וטריא. למה הגמרא שואלת? מה הסברא?'}
          {studyMode === 'bekius' && 'בקיאות: קרא את הסוגיא בשטף, הבן את התמונה הכללית לפני הפרטים'}
          {studyMode === 'chazara' && 'חזרה: נסה לענות בעצמך לפני שתסתכל ברמז. חזרה על חזרה!'}
        </span>
      </div>
    </div>
  );
});

TalmudToolsTab.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string
};

// Export reserved UI components for use in other scholar-mode files
export { StatBadge, CollapsibleSection };
export default TalmudToolsTab;
