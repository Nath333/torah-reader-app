/**
 * TalmudToolsTab - Kollel/Yeshiva-Style Talmud Study Tools
 *
 * Study modes: Iyun (deep), Bekius (breadth), Chazara (review).
 * Consumes shared panels from UnifiedSugyaAnalysis/ and adds:
 *   DafHeader, StudyModeSelector, OpinionDetailPanel,
 *   plus Iyun-specific sections (IyunDeepAnalysisPanel, SugyaFlowSection,
 *   DafDiagramSection, HalachicChain).
 */
import React, { useState, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
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
import { CollapsibleSection, LazyLoadFallback } from './TalmudSharedUI';

import SugyaFlowSection from './UnifiedSugyaAnalysis/SugyaFlowAnalysis';
import IyunDeepAnalysisPanel from './UnifiedSugyaAnalysis/IyunAnalysisPanel';
import DafDiagramSection from './UnifiedSugyaAnalysis/DafDiagramSection';
import { RealiaBrowser, RabbiBrowser } from './TalmudBrowsers';
import HalachicChain from './HalachicChain';

const UnifiedSugyaAnalysisPro = lazy(() => import('./UnifiedSugyaAnalysis'));

// =============================================================================
// Constants
// =============================================================================

const STUDY_TIPS = {
  iyun: 'עיון: התמקד בהבנת כל שלב בשקלא וטריא. למה הגמרא שואלת? מה הסברא?',
  bekius: 'בקיאות: קרא את הסוגיא בשטף, הבן את התמונה הכללית לפני הפרטים',
  chazara: 'חזרה: נסה לענות בעצמך לפני שתסתכל ברמז. חזרה על חזרה!'
};

// =============================================================================
// DafHeader — current amud reference with Sefaria link
// =============================================================================

const summarizeAmud = (patterns) => {
  if (!patterns?.length) return null;
  const has = (type) => patterns.some(p => p.type === type);
  const count = (types) => patterns.filter(p => types.includes(p.type)).length;

  const parts = [];
  if (has('mishna')) parts.push('מתחיל במשנה');
  const questions = count(['question', 'objection']);
  if (has('gemara') && questions > 0) {
    parts.push(`${questions} קושי${questions > 1 ? 'ות' : 'א'}`);
    const resolutions = count(['resolution', 'proof']);
    if (resolutions > 0) parts.push(`${resolutions} תירוצ${resolutions > 1 ? 'ים' : ''}`);
  }
  if (has('baraita')) parts.push('מביא ברייתא');
  if (has('scripture')) parts.push('דרשת פסוקים');
  if (has('legal_ruling')) parts.push('מסקנה להלכה');
  return parts.length > 0 ? parts.join(' • ') : 'דיון בגמרא';
};

const extractTopicHint = (text) => {
  if (!text) return null;
  const match = text.match(/מתני[׳']?\s*[.:]\s*(.{10,50})/);
  if (!match) return null;
  const topic = match[1].replace(/\s+/g, ' ').trim();
  return topic.length > 40 ? topic.substring(0, 40) + '...' : topic;
};

const DafHeader = React.memo(function DafHeader({ reference, patterns, text }) {
  const dafInfo = useMemo(() => parseDafReference(reference), [reference]);
  const amudSummary = useMemo(() => summarizeAmud(patterns), [patterns]);
  const topicHint = useMemo(() => extractTopicHint(text), [text]);

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
// StudyModeSelector — compact iyun/bekius/chazara pill row
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
// OpinionDetailPanel — detail view for a focused HalachicChain opinion
// =============================================================================

const OPINION_PANEL_STYLE = { marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' };
const OPINION_HEADER_STYLE = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' };
const OPINION_CLOSE_STYLE = { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' };
const OPINION_LABEL_STYLE = { fontWeight: 'bold', color: '#555' };

const OpinionDetailPanel = React.memo(function OpinionDetailPanel({ opinion, onClose }) {
  if (!opinion) return null;
  return (
    <div className="opinion-detail-panel" style={OPINION_PANEL_STYLE}>
      <div className="detail-header" style={OPINION_HEADER_STYLE}>
        <h4 style={{ margin: 0, color: '#333' }}>{opinion.authority}</h4>
        <button className="close-detail" onClick={onClose} style={OPINION_CLOSE_STYLE} type="button">×</button>
      </div>
      <div className="detail-content">
        {opinion.ruling && (
          <div className="detail-section" style={{ marginBottom: '8px' }}>
            <label style={OPINION_LABEL_STYLE}>Ruling:</label>
            <p style={{ margin: '4px 0', color: '#333' }}>{opinion.ruling}</p>
          </div>
        )}
        {opinion.reasoning && (
          <div className="detail-section">
            <label style={OPINION_LABEL_STYLE}>Reasoning:</label>
            <p style={{ margin: '4px 0', color: '#333' }}>{opinion.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// ToolSection — compact labeled container used by the Iyun tools panel
// =============================================================================

const ToolSection = ({ icon, label, count, children }) => (
  <div className="tool-section-compact">
    <div className="tool-header-compact">
      <span>{icon}</span>
      <span>{label}</span>
      {count > 0 && <span className="tool-count">{count}</span>}
    </div>
    {children}
  </div>
);

// =============================================================================
// Iyun mode — deterministic pattern-based analysis + tools
// =============================================================================

const IyunMode = ({
  text, reference, sugyaKey,
  patterns, qaFlow, patternsCount, abbreviationsCount,
  activeView, setActiveView,
  focusedOpinion, setFocusedOpinion
}) => (
  <>
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

          <CollapsibleSection
            title="שושלת הוראה - Halachic Chain"
            icon="⚖️"
            badge={0}
            defaultOpen={false}
          >
            <HalachicChain
              text={text}
              reference={reference}
              onOpinionFocus={setFocusedOpinion}
            />
            <OpinionDetailPanel opinion={focusedOpinion} onClose={() => setFocusedOpinion(null)} />
          </CollapsibleSection>
        </>
      )}

      {activeView === 'tools' && (
        <div className="tools-panel-compact">
          <ToolSection icon="📝" label="הערות">
            <NotesPanel sugyaKey={sugyaKey} text={text} />
          </ToolSection>
          <ToolSection icon="א״ב" label="ר״ת" count={abbreviationsCount}>
            <AbbreviationsPanel text={text} />
          </ToolSection>
          <ToolSection icon="📏" label="מידות">
            <Suspense fallback={<LazyLoadFallback />}>
              <RealiaBrowser text={text} />
            </Suspense>
          </ToolSection>
          <ToolSection icon="👤" label="חכמים">
            <RabbiBrowser text={text} />
          </ToolSection>
        </div>
      )}
    </div>
  </>
);

// =============================================================================
// Bekius mode — quick summary + abbreviations toggle
// =============================================================================

const BekiusMode = ({ text, patterns, sugyaKey, abbreviationsCount, activeView, setActiveView }) => (
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
);

// =============================================================================
// Chazara mode — self-test + notes toggle
// =============================================================================

const ChazaraMode = ({ text, patterns, sugyaKey, activeView, setActiveView }) => (
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
);

// =============================================================================
// Main component — deterministic (no AI). For AI, use Learn (לימוד) tab.
// =============================================================================

const TalmudToolsTab = React.memo(function TalmudToolsTab({ text, reference, textType = 'talmud' }) {
  const [activeView, setActiveView] = useState('analysis');
  const [studyMode, setStudyMode] = useState('iyun');
  const [focusedOpinion, setFocusedOpinion] = useState(null);

  const normalizedType = (textType || 'talmud').toLowerCase();
  const textLabel = TEXT_TYPE_LABELS[normalizedType] || TEXT_TYPE_LABELS.talmud;

  const sugyaKey = useMemo(() => {
    if (reference) return reference.replace(/\s+/g, '_');
    return text ? `sugya_${text.substring(0, 50).replace(/\s+/g, '_')}` : 'default';
  }, [reference, text]);

  const patterns = useMemo(() => (text ? detectStructuralMarkers(text) : []), [text]);
  const qaFlow = useMemo(() => (text ? extractGemaraQA(text) : { flow: [], summary: {} }), [text]);

  const abbreviationsCount = useMemo(() => {
    if (!text) return 0;
    const seen = new Set();
    return findAbbreviations(text).filter(abbr => {
      if (seen.has(abbr.abbreviation)) return false;
      seen.add(abbr.abbreviation);
      return true;
    }).length;
  }, [text]);

  const modeProps = { text, patterns, sugyaKey, abbreviationsCount, activeView, setActiveView };

  return (
    <div className="talmud-tools-tab scholarly" dir="rtl">
      <DafHeader reference={reference} patterns={patterns} text={text} />

      <div className="talmud-header-compact">
        <StudyModeSelector currentMode={studyMode} onModeChange={setStudyMode} />
        <div className={`text-type-badge ${normalizedType}`}>
          <span>{textLabel.icon}</span>
          <span>{textLabel.hebrew}</span>
        </div>
      </div>

      {studyMode === 'iyun' && (
        <IyunMode
          {...modeProps}
          reference={reference}
          qaFlow={qaFlow}
          patternsCount={patterns.length}
          focusedOpinion={focusedOpinion}
          setFocusedOpinion={setFocusedOpinion}
        />
      )}
      {studyMode === 'bekius' && <BekiusMode {...modeProps} />}
      {studyMode === 'chazara' && <ChazaraMode {...modeProps} />}

      <div className="study-tip-footer">
        <span className="tip-icon">💡</span>
        <span className="tip-text">{STUDY_TIPS[studyMode]}</span>
      </div>
    </div>
  );
});

TalmudToolsTab.propTypes = {
  text: PropTypes.string,
  reference: PropTypes.string,
  textType: PropTypes.string
};

export default TalmudToolsTab;
