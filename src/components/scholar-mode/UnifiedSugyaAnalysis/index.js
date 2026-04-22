/**
 * UnifiedSugyaAnalysis - PRO SCHOLAR V29
 * Comprehensive Talmudic Sugya Analysis Component
 *
 * Thin orchestrator: all sub-components extracted to dedicated modules.
 *
 * @module UnifiedSugyaAnalysis
 * @version 29.0.0
 */

import React, { useState, useMemo, useCallback, useEffect, memo, lazy } from 'react';
import PropTypes from 'prop-types';
import './UnifiedSugyaAnalysis.css';
import './ProScholarV27.css';
import './ProScholarV29.css';
import './MishnaCaseFlow.css';

// Shared constants & hooks
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

// Extracted sub-components
import {
  DataSourceBanner,
  MishnaSummaryCard,
  ContentStructureOverview,
  QuickSummaryCard,
  CollapsibleSectionWrapper,
  SugyaNavigator,
  StudyModeSelector,
  SugyaHeader,
  ViewModeTabs
} from './SugyaUIComponents';

import {
  FlowView,
  TreeView,
  DiagramView,
  SummaryView
} from './SugyaViewComponents';

import {
  GemaraDialecticPanel,
  PatternDetailPanel,
  CrossReferencesPanel,
  AbbreviationsPanel
} from './SugyaAnalysisComponents';

import {
  ChazaraPanel,
  BekiusQuickSummary,
  NotesPanel
} from './SugyaStudyModePanels';

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

// PRO SCHOLAR V31: Consolidated Mishna Analysis
import MishnaAnalysisPro from './MishnaAnalysisPro';

// PRO SCHOLAR V31: Consolidated Gemara Q&A Analysis
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
  extractGemaraQA,
  generateQAFlowDiagram,
  analyzeDiscourseStructure,
  TALMUDIC_PATTERNS
} from '../../../services/scholarly/discoursePatternService';

import { detectRabbis } from '../../../services/scholarly/namedEntityService';
import { DIAGRAM_TYPES } from '../../../services/scholarly/talmudDiagramService';
import { findAbbreviations } from '../../../services/textual/talmudicAbbreviationsService';
import { safeGet, safeSet } from '../../../utils/safeLocalStorage';

// Lazy-loaded components
const RabbiInfoPanel = lazy(() => import('../RabbiInfoPanel'));

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

    const stats = {};
    patterns.forEach(p => {
      stats[p.type] = (stats[p.type] || 0) + 1;
    });

    return {
      patterns, discourseAnalysis, rabbis, qaFlow, mishnaAnalysis, abbreviations, stats,
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case '1': handleStudyModeChange('iyun'); break;
        case '2': handleStudyModeChange('bekius'); break;
        case '3': handleStudyModeChange('chazara'); break;
        case 'f': case 'F': handleViewChange(VIEW_MODES.FLOW); break;
        case 't': case 'T': handleViewChange(VIEW_MODES.TREE); break;
        case 'd': case 'D': if (mermaidCode) handleViewChange(VIEW_MODES.DIAGRAM); break;
        case 's': case 'S': handleViewChange(VIEW_MODES.SUMMARY); break;
        case 'Escape': if (selectedPattern) handleCloseDetail(); break;
        case 'ArrowDown':
        case 'ArrowLeft':
          if (analysis?.patterns?.length > 0) {
            e.preventDefault();
            const currentIdx = selectedPattern
              ? analysis.patterns.findIndex(p => p.position === selectedPattern.position) : -1;
            const nextIdx = Math.min(currentIdx + 1, analysis.patterns.length - 1);
            setSelectedPattern(analysis.patterns[nextIdx]);
          }
          break;
        case 'ArrowUp':
        case 'ArrowRight':
          if (analysis?.patterns?.length > 0 && selectedPattern) {
            e.preventDefault();
            const currentIdx = analysis.patterns.findIndex(p => p.position === selectedPattern.position);
            const prevIdx = Math.max(currentIdx - 1, 0);
            setSelectedPattern(analysis.patterns[prevIdx]);
          }
          break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStudyModeChange, handleViewChange, handleCloseDetail, selectedPattern, analysis?.patterns, mermaidCode]);

  // Sugya key for notes storage
  const sugyaKey = useMemo(() => {
    return reference || `sugya-${text?.substring(0, 50).replace(/\s+/g, '_') || 'unknown'}`;
  }, [reference, text]);

  // Computed analysis values
  const hasMishna = analysis?.stats?.mishna > 0;
  const hasGemara = analysis?.stats?.gemara > 0;
  const qaResolved = analysis?.qaFlow?.summary?.resolved || 0;
  const qaTotal = qaResolved + (analysis?.qaFlow?.summary?.unresolved || 0);

  // Empty states
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
      <DataSourceBanner
        reference={reference}
        textLength={text?.length || 0}
        hasMishna={hasMishna}
        hasGemara={hasGemara}
        dafProgress={null}
      />

      <StudyModeSelector currentMode={studyMode} onModeChange={handleStudyModeChange} />

      <ContentStructureOverview
        patterns={analysis.patterns}
        hasMishna={hasMishna}
        hasGemara={hasGemara}
        qaResolved={qaResolved}
        qaTotal={qaTotal}
      />

      <SugyaHeader
        reference={reference}
        stats={analysis.stats}
        complexity={analysis.complexity}
        structure={analysis.structure}
      />

      {hasMishna && analysis.mishnaAnalysis && (
        <MishnaSummaryCard mishnaAnalysis={analysis.mishnaAnalysis} text={text} />
      )}

      <GemaraDialecticPanel
        patterns={analysis.patterns}
        qaFlow={analysis.qaFlow}
        text={text}
      />

      <ViewModeTabs
        currentView={viewMode}
        onViewChange={handleViewChange}
        diagramAvailable={!!mermaidCode}
      />

      {/* Main Content Area */}
      <div className="usa-content">
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

        {selectedPattern && (
          <PatternDetailPanel pattern={selectedPattern} text={text} onClose={handleCloseDetail} />
        )}
      </div>

      {showNotes && (
        <NotesPanel
          sugyaKey={sugyaKey}
          initialNotes={safeGet(STORAGE_KEYS.notes, {})[sugyaKey] || ''}
        />
      )}

      <StudyMasteryTracker sugyaKey={sugyaKey} />

      {/* Iyun mode: deep analysis panels */}
      {studyMode === 'iyun' && (
        <>
          <StudyProgressTracker analysis={analysis} />
          <SourceQualityIndicator analysis={analysis} />
          <MishnaDeepAnalysis mishnaAnalysis={analysis.mishnaAnalysis} text={text} />
          <MishnaCaseFlow text={text} mishnaAnalysis={analysis.mishnaAnalysis} />
          <GemaraDeepAnalysis patterns={analysis.patterns} qaFlow={analysis.qaFlow} rabbis={analysis.rabbis} text={text} />
          <RabbisDetailPanel rabbis={analysis.rabbis} />
          <HalakhicConceptsMap text={text} />
          <SugyaMermaidDiagram text={text} patterns={analysis.patterns} />
          <V29CrossReferencePanel text={text} />
          <V30CrossReferencesPanel text={text} />
          {analysis.rabbis?.length > 0 && <SpeakerTimeline rabbis={analysis.rabbis} text={text} />}
          <SugyaInsightsCard patterns={analysis.patterns} qaFlow={analysis.qaFlow} mishnaAnalysis={analysis.mishnaAnalysis} rabbis={analysis.rabbis} />
          <HalachicConclusionCard patterns={analysis.patterns} />
          <CrossReferencePanel patterns={analysis.patterns} />
        </>
      )}

      {analysis?.abbreviations?.length > 0 && (
        <AbbreviationsPanel abbreviations={analysis.abbreviations} />
      )}

      <CrossReferencesPanel reference={reference} patterns={analysis.patterns} text={text} />

      <SugyaNavigator patterns={analysis.patterns} />

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
        <ChazaraPanel patterns={analysis.patterns} text={text} sugyaKey={reference} />
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

      {/* Keyboard Shortcuts Help */}
      <div className="usa-keyboard-help">
        <span className="keyboard-help-title">⌨️ קיצורי מקשים:</span>
        <div className="keyboard-help-items">
          <span className="keyboard-item"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> מצב לימוד</span>
          <span className="keyboard-item"><kbd>F</kbd> זרימה</span>
          <span className="keyboard-item"><kbd>T</kbd> עץ</span>
          <span className="keyboard-item"><kbd>S</kbd> סיכום</span>
          <span className="keyboard-item"><kbd>↑</kbd><kbd>↓</kbd> ניווט</span>
          <span className="keyboard-item"><kbd>Esc</kbd> סגור</span>
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
  // Consolidated Panels
  AbbreviationsPanel,
  NotesPanel,
  ChazaraPanel,
  BekiusQuickSummary,

  // Utility Hooks
  useCopyToClipboard,
  useStudyNotes,
  useMasteryLevel,

  // Core Components
  StudyModeSelector,
  SugyaHeader,
  ViewModeTabs,
  FlowView,
  TreeView,
  DiagramView,
  SummaryView,
  PatternDetailPanel,

  // V25 components
  DataSourceBanner,
  MishnaSummaryCard,
  ContentStructureOverview,

  // V28 components
  GemaraDialecticPanel,

  // V31: Consolidated Analysis
  MishnaAnalysisPro,
  GemaraQAAnalysisPro,
  RashiTosafotAnalysisPro,

  // V26 components
  QuickSummaryCard,
  CollapsibleSectionWrapper,
  CrossReferencesPanel,
  SugyaNavigator,

  // Lazy-loaded
  RabbiInfoPanel,

  // Constants
  STUDY_MODES,
  VIEW_MODES,
  HEBREW_TYPE_LABELS,
  CHAZARA_QUESTION_TEMPLATES,
  CROSS_REF_CATEGORIES,
  ABBR_TYPE_ICONS
};
