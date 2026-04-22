/**
 * SugyaUIComponents - Extracted UI building blocks for UnifiedSugyaAnalysis
 * DataSourceBanner, MishnaSummaryCard, ContentStructureOverview,
 * QuickSummaryCard, CollapsibleSectionWrapper, SugyaNavigator,
 * StudyModeSelector, SugyaHeader, ViewModeTabs
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  HEBREW_TYPE_LABELS,
  STUDY_MODES,
  VIEW_MODES
} from '../../../constants/talmudStudy';
import { generateMishnaSummary } from '../../../services/scholarly/discoursePatternService';

// =============================================================================
// DATA SOURCE BANNER
// =============================================================================

export const DataSourceBanner = memo(({ reference, textLength, hasMishna, hasGemara, dafProgress }) => {
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

export const MishnaSummaryCard = memo(({ mishnaAnalysis, text }) => {
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

export const ContentStructureOverview = memo(({ patterns, hasMishna, hasGemara, qaResolved, qaTotal }) => {
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
// QUICK SUMMARY CARD
// =============================================================================

export const QuickSummaryCard = memo(({ reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages }) => {
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => {
    const parts = [];
    parts.push(`📖 סיכום: ${reference || 'סוגיא'}`);
    parts.push('');
    if (hasMishna && mishnaAnalysis?.summary) {
      parts.push('📘 **משנה:**');
      if (mishnaAnalysis.summary.hasEnumeration) parts.push('  • מונה מספר מקרים');
      if (mishnaAnalysis.summary.hasRulings) parts.push(`  • ${mishnaAnalysis.summary.breakdown?.ruling || 0} פסקי הלכה`);
      if (mishnaAnalysis.summary.hasConditions) parts.push('  • תנאים מיוחדים');
      if (mishnaAnalysis.summary.hasDisputes) parts.push('  • מחלוקת');
      parts.push('');
    }
    if (hasGemara && qaFlow?.summary) {
      parts.push('📜 **גמרא:**');
      const total = (qaFlow.summary.resolved || 0) + (qaFlow.summary.unresolved || 0);
      parts.push(`  • ${total} יחידות שקו״ט`);
      parts.push(`  • ${qaFlow.summary.resolved || 0} נפתרו`);
      if (qaFlow.summary.unresolved > 0) parts.push(`  • ${qaFlow.summary.unresolved} פתוחות (ממשיך?)`);
      parts.push('');
    }
    if (sages && sages.length > 0) {
      parts.push('👤 **חכמים:**');
      const sageNames = sages.slice(0, 5).map(s => s.name || s.match).join(', ');
      parts.push(`  • ${sageNames}${sages.length > 5 ? ` +${sages.length - 5}` : ''}`);
    }
    return parts.join('\n');
  }, [reference, hasMishna, hasGemara, mishnaAnalysis, qaFlow, sages]);

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
        await navigator.share({ title: `סיכום: ${reference || 'סוגיא'}`, text: plainSummary });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share failed:', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={`usa-quick-summary ${expanded ? 'expanded' : ''}`} dir="rtl">
      <button className="summary-toggle" onClick={() => setExpanded(!expanded)} type="button">
        <span className="toggle-icon">{expanded ? '▼' : '◀'}</span>
        <span className="toggle-text">📋 סיכום מהיר</span>
      </button>
      {expanded && (
        <div className="summary-content">
          <div className="summary-text" dir="rtl">
            {summary.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} className="summary-spacer" />;
              const isBullet = line.trim().startsWith('•');
              // Parse **bold** markers into React elements (no dangerouslySetInnerHTML)
              const parts = line.split(/\*\*(.+?)\*\*/g);
              return (
                <div key={i} className={`summary-line ${isBullet ? 'bullet' : ''}`}>
                  {parts.map((part, j) => j % 2 === 1
                    ? <strong key={j}>{part}</strong>
                    : <span key={j}>{part}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="summary-actions">
            <button
              className={`summary-action-btn copy ${copyStatus === 'copied' ? 'success' : ''}`}
              onClick={handleCopy} type="button"
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
// COLLAPSIBLE SECTION WRAPPER
// =============================================================================

export const CollapsibleSectionWrapper = memo(({ title, icon, badge, defaultOpen = true, children, accentColor }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`usa-collapsible-section ${isOpen ? 'open' : 'collapsed'}`}
      style={{ '--accent-color': accentColor || '#6366f1' }}
    >
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)} type="button" aria-expanded={isOpen}>
        <span className="header-icon">{icon}</span>
        <span className="header-title">{title}</span>
        {badge && <span className="header-badge">{badge}</span>}
        <span className="header-chevron">{isOpen ? '▼' : '◀'}</span>
      </button>
      {isOpen && <div className="collapsible-content">{children}</div>}
    </div>
  );
});

CollapsibleSectionWrapper.displayName = 'CollapsibleSectionWrapper';

// =============================================================================
// SUGYA NAVIGATOR
// =============================================================================

export const SugyaNavigator = memo(({ patterns, onJumpTo }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);

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

  const phaseStats = useMemo(() => {
    return phases.map(phase => ({
      ...phase,
      questions: phase.items.filter(i => ['question', 'objection'].includes(i.type)).length,
      answers: phase.items.filter(i => ['resolution', 'proof'].includes(i.type)).length
    }));
  }, [phases]);

  const handlePhaseClick = useCallback((phase, index) => {
    setSelectedPhase(index);
    if (onJumpTo && phase.startPosition !== undefined) onJumpTo(phase.startPosition);
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
            {i < phaseStats.length - 1 && <div className="phase-connector">→</div>}
          </div>
        ))}
      </div>
      {selectedPhase !== null && phaseStats[selectedPhase] && (
        <div className="navigator-details">
          <div className="details-header">
            {phaseStats[selectedPhase].icon} {phaseStats[selectedPhase].label}
            <span className="details-count">({phaseStats[selectedPhase].items.length})</span>
          </div>
          <div className="details-items">
            {phaseStats[selectedPhase].items.slice(0, 6).map((item, i) => (
              <div
                key={i}
                className={`detail-item detail-type-${item.type}`}
                onClick={() => onJumpTo && item.position !== undefined && onJumpTo(item.position)}
                role={onJumpTo ? 'button' : undefined}
                tabIndex={onJumpTo ? 0 : undefined}
                onKeyDown={onJumpTo ? (e) => {
                  if (e.key === 'Enter' && item.position !== undefined) onJumpTo(item.position);
                } : undefined}
              >
                <span className="item-type">{HEBREW_TYPE_LABELS[item.type] || item.type}</span>
                <span className="item-text">{item.marker?.substring(0, 40)}</span>
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

export const StudyModeSelector = memo(({ currentMode, onModeChange }) => (
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
// SUGYA HEADER
// =============================================================================

export const SugyaHeader = memo(({ reference, stats, complexity, structure }) => {
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

export const ViewModeTabs = memo(({ currentView, onViewChange, diagramAvailable }) => (
  <div className="usa-view-tabs">
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.FLOW ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.FLOW)} type="button"
    >
      <span className="tab-icon">📊</span>
      <span className="tab-label">זרימה</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.TREE ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.TREE)} type="button"
    >
      <span className="tab-icon">🌳</span>
      <span className="tab-label">עץ</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.DIAGRAM ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.DIAGRAM)}
      disabled={!diagramAvailable} type="button"
    >
      <span className="tab-icon">🗺️</span>
      <span className="tab-label">דיאגרמה</span>
    </button>
    <button
      className={`usa-view-tab ${currentView === VIEW_MODES.SUMMARY ? 'active' : ''}`}
      onClick={() => onViewChange(VIEW_MODES.SUMMARY)} type="button"
    >
      <span className="tab-icon">📝</span>
      <span className="tab-label">סיכום</span>
    </button>
  </div>
));

ViewModeTabs.displayName = 'ViewModeTabs';
