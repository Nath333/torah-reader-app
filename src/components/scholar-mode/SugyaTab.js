/**
 * SugyaTab - Complete Talmud Study Tab
 *
 * Merges TalmudToolsTab features + HalachicChain into the Scholar Mode Sugya tab.
 *
 * Features:
 * - 3 Study Modes: Iyun (deep), Bekius (breadth), Chazara (review)
 * - Daf Header with Sefaria link
 * - Iyun: Full analysis (UnifiedSugya, Mishna, Gemara Q&A, Rashi/Tosafot, Flow, Diagram)
 * - Iyun Tools: Notes, Abbreviations, Realia, Rabbi browser
 * - Bekius: Quick summary + abbreviations
 * - Chazara: Self-test + notes
 * - Halachic Chain visualization (decision chain)
 * - Content type detection (Mishnah vs Gemara)
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import HalachicChain from './HalachicChain';
import { isMishnaText, isGemaraText } from './HalachicChain/utils';
import { findAbbreviations } from '../../services/textual/talmudicAbbreviationsService';
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
import { detectStructuralMarkers, extractGemaraQA } from '../../services/scholarly/discoursePatternService';
import { LazyLoadFallback } from './TalmudSharedUI';
import SugyaFlowSection from './UnifiedSugyaAnalysis/SugyaFlowAnalysis';
import IyunDeepAnalysisPanel from './UnifiedSugyaAnalysis/IyunAnalysisPanel';
import DafDiagramSection from './UnifiedSugyaAnalysis/DafDiagramSection';
import { RealiaBrowser, RabbiBrowser } from './TalmudBrowsers';
import './SugyaTab.css';

const UnifiedSugyaAnalysisPro = lazy(() => import('./UnifiedSugyaAnalysis'));

// =============================================================================
// Daf Header - Shows current amud with Sefaria link
// =============================================================================

const DafHeader = React.memo(function DafHeader({ reference, patterns, text }) {
  const dafInfo = useMemo(() => parseDafReference(reference), [reference]);

  const amudSummary = useMemo(() => {
    if (!patterns || patterns.length === 0) return null;

    const hasMishna = patterns.some(p => p.type === 'mishna');
    const hasGemara = patterns.some(p => p.type === 'gemara');
    const questionCount = patterns.filter(p => ['question', 'objection'].includes(p.type)).length;
    const resolutionCount = patterns.filter(p => ['resolution', 'proof'].includes(p.type)).length;
    const hasLegalRuling = patterns.some(p => p.type === 'legal_ruling');
    const hasBaraita = patterns.some(p => p.type === 'baraita');
    const hasScripture = patterns.some(p => p.type === 'scripture');

    const parts = [];
    if (hasMishna) parts.push('מתחיל במשנה');
    if (hasGemara && questionCount > 0) {
      parts.push(`${questionCount} קושי${questionCount > 1 ? 'ות' : 'א'}`);
      if (resolutionCount > 0) parts.push(`${resolutionCount} תירוצ${resolutionCount > 1 ? 'ים' : ''}`);
    }
    if (hasBaraita) parts.push('מביא ברייתא');
    if (hasScripture) parts.push('דרשת פסוקים');
    if (hasLegalRuling) parts.push('מסקנה להלכה');
    return parts.length > 0 ? parts.join(' • ') : 'דיון בגמרא';
  }, [patterns]);

  const topicHint = useMemo(() => {
    if (!text) return null;
    const mishnaMatch = text.match(/מתני[׳']?\s*[.:]\s*(.{10,50})/);
    if (mishnaMatch) {
      const topic = mishnaMatch[1].replace(/\s+/g, ' ').trim();
      return topic.length > 40 ? topic.substring(0, 40) + '...' : topic;
    }
    return null;
  }, [text]);

  if (!dafInfo) return null;

  return (
    <div className="daf-header" dir="rtl">
      <div className="daf-main">
        <div className="daf-icon">📜</div>
        <div className="daf-info">
          <div className="daf-reference">
            <span className="masechta">{dafInfo.hebrewMasechta}</span>
            <span className="daf-num">{dafInfo.hebrewDaf}</span>
            <span className="amud">{dafInfo.hebrewAmud}</span>
          </div>
          {amudSummary && <div className="amud-summary">{amudSummary}</div>}
        </div>
      </div>
      {topicHint && (
        <div className="topic-hint">
          <span className="hint-label">נושא:</span>
          <span className="hint-text">{topicHint}</span>
        </div>
      )}
      <a href={dafInfo.sefariaUrl} target="_blank" rel="noopener noreferrer" className="sefaria-link" title="פתח בספריא">
        <span className="link-icon">🔗</span>
        <span className="link-text">ספריא</span>
      </a>
    </div>
  );
});

// =============================================================================
// Study Mode Selector
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
// Halachic Chain Options
// =============================================================================

const HALACHIC_CHAIN_OPTIONS = {
  includeMishnah: true,
  includeGemara: true,
  includeRishonim: true,
  includePsak: true,
  fetchCrossReferences: true
};

// =============================================================================
// Content type detection
// =============================================================================

const detectContentType = (text) => {
  if (!text) return 'unknown';
  if (isMishnaText(text)) return 'mishna';
  if (isGemaraText(text)) return 'gemara';
  return 'mixed';
};

const getContentTypeLabel = (type) => {
  const labels = {
    mishna: '📜 Mishnah',
    gemara: '📚 Gemara',
    mixed: '📖 Mixed',
    unknown: '❓ Unknown'
  };
  return labels[type] || labels.unknown;
};

// =============================================================================
// Main SugyaTab Component
// =============================================================================

const SugyaTab = ({ text, reference, textType = 'talmud', onError }) => {
  const [studyMode, setStudyMode] = useState('iyun');
  const [activeView, setActiveView] = useState('analysis');
  const [focusedOpinion, setFocusedOpinion] = useState(null);
  const [showHalachicChain, setShowHalachicChain] = useState(false);

  const contentType = detectContentType(text);
  const normalizedType = (textType || 'talmud').toLowerCase();
  const textLabel = TEXT_TYPE_LABELS[normalizedType] || TEXT_TYPE_LABELS.talmud;

  const currentBook = reference?.split('.')[0] || '';

  const sugyaKey = useMemo(() => {
    if (reference) return reference.replace(/\s+/g, '_');
    return text ? `sugya_${text.substring(0, 50).replace(/\s+/g, '_')}` : 'default';
  }, [reference, text]);

  const patterns = useMemo(() => {
    if (!text) return [];
    return detectStructuralMarkers(text);
  }, [text]);

  const qaFlow = useMemo(() => {
    if (!text) return { flow: [], summary: {} };
    return extractGemaraQA(text);
  }, [text]);

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

  const handleOpinionFocus = useCallback((opinion) => {
    setFocusedOpinion(opinion);
  }, []);

  return (
    <div className="sugya-tab scholarly" dir="rtl">
      {/* Daf Header */}
      <DafHeader reference={reference} patterns={patterns} text={text} />

      {/* Content Type + Study Mode */}
      <div className="sugya-header-compact">
        <div className="content-indicator-inline">
          <span className={`indicator-badge ${contentType}`}>
            {getContentTypeLabel(contentType)}
          </span>
          <div className={`text-type-badge ${normalizedType}`}>
            <span>{textLabel.icon}</span>
            <span>{textLabel.hebrew}</span>
          </div>
        </div>
        <StudyModeSelector currentMode={studyMode} onModeChange={setStudyMode} />
      </div>

      {/* ============================================ */}
      {/* IYUN MODE - Deep Analysis                    */}
      {/* ============================================ */}
      {studyMode === 'iyun' && (
        <>
          {/* Analysis / Tools toggle */}
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
            <button
              className={`view-btn ${activeView === 'halacha' ? 'active' : ''}`}
              onClick={() => setActiveView('halacha')}
              type="button"
            >
              <span>⚖️</span>
              <span>שרשרת</span>
            </button>
          </div>

          <div className="tab-content">
            {/* ANALYSIS VIEW */}
            {activeView === 'analysis' && (
              <>
                <IyunDeepAnalysisPanel text={text} qaFlow={qaFlow} patterns={patterns} />

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

                <MishnaAnalysisPro text={text} />
                <GemaraQAAnalysisPro text={text} />
                <SugyaFlowSection text={text} />
                <RashiTosafotAnalysisPro reference={reference} text={text} />
                <DafDiagramSection reference={reference} text={text} />
              </>
            )}

            {/* TOOLS VIEW */}
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

            {/* HALACHIC CHAIN VIEW */}
            {activeView === 'halacha' && (
              <div className="sugya-halacha-view">
                <HalachicChain
                  text={text}
                  reference={reference}
                  currentBook={currentBook}
                  options={HALACHIC_CHAIN_OPTIONS}
                  onOpinionFocus={handleOpinionFocus}
                  onError={onError}
                />

                {focusedOpinion && (
                  <div className="opinion-detail-panel">
                    <div className="detail-header">
                      <h4>{focusedOpinion.authority}</h4>
                      <button className="close-detail" onClick={() => setFocusedOpinion(null)}>×</button>
                    </div>
                    <div className="detail-content">
                      {focusedOpinion.ruling && (
                        <div className="detail-section">
                          <label>Ruling:</label>
                          <p>{focusedOpinion.ruling}</p>
                        </div>
                      )}
                      {focusedOpinion.reasoning && (
                        <div className="detail-section">
                          <label>Reasoning:</label>
                          <p>{focusedOpinion.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================ */}
      {/* BEKIUS MODE - Quick Overview                 */}
      {/* ============================================ */}
      {studyMode === 'bekius' && (
        <>
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

      {/* ============================================ */}
      {/* CHAZARA MODE - Review & Self-Test            */}
      {/* ============================================ */}
      {studyMode === 'chazara' && (
        <>
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

      {/* Study tips footer */}
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
};

SugyaTab.propTypes = {
  text: PropTypes.string.isRequired,
  reference: PropTypes.string.isRequired,
  textType: PropTypes.string,
  onError: PropTypes.func
};

export default SugyaTab;
