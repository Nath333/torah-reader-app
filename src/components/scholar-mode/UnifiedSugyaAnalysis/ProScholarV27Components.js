/**
 * PRO SCHOLAR V27 - Advanced Components
 * New scholarly features for deep Talmud study
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { RABBI_DATABASE } from '../../../services/namedEntityService';
import { safeGet, safeSet } from '../../../utils/safeLocalStorage';

const STORAGE_KEYS = {
  mastery: 'unified_sugya_mastery'
};

// =============================================================================
// SPEAKER TIMELINE - Visual flow of Rabbis/speakers in the sugya
// =============================================================================

export const SpeakerTimeline = memo(({ rabbis, text }) => {
  const timeline = useMemo(() => {
    if (!rabbis || rabbis.length === 0) return [];
    const sorted = [...rabbis].sort((a, b) => (a.position || 0) - (b.position || 0));
    return sorted.map((rabbi, index) => {
      const name = rabbi.name || rabbi.match;
      let role = 'statement';
      const ctxAfter = text?.substring(rabbi.position || 0, (rabbi.position || 0) + 50) || '';
      if (/מתקיף|קשיא/.test(ctxAfter)) role = 'objection';
      if (/מתרץ|תירץ/.test(ctxAfter)) role = 'resolution';
      const rabbiInfo = RABBI_DATABASE[name];
      return {
        name,
        position: rabbi.position || index * 100,
        period: rabbi.period || rabbiInfo?.period || 'unknown',
        role,
        generation: rabbiInfo?.generation
      };
    });
  }, [rabbis, text]);

  const periodColors = { tanna: '#10B981', amora: '#3B82F6', unknown: '#6B7280' };
  const roleIcons = { statement: '💬', objection: '⚡', resolution: '🎯' };

  if (timeline.length === 0) return null;

  const tannaim = timeline.filter(t => t.period === 'tanna').length;
  const amoraim = timeline.filter(t => t.period === 'amora').length;

  return (
    <div className="usa-speaker-timeline" dir="rtl">
      <div className="timeline-header">
        <span className="timeline-icon">👥</span>
        <span className="timeline-title">מהלך הדוברים בסוגיא</span>
        <span className="timeline-count">{timeline.length} חכמים</span>
      </div>

      {/* Period summary */}
      <div className="timeline-period-summary">
        {tannaim > 0 && (
          <span className="period-badge tanna" style={{ '--period-color': periodColors.tanna }}>
            📜 {tannaim} תנאים
          </span>
        )}
        {amoraim > 0 && (
          <span className="period-badge amora" style={{ '--period-color': periodColors.amora }}>
            📚 {amoraim} אמוראים
          </span>
        )}
      </div>

      {/* Timeline flow */}
      <div className="timeline-flow">
        {timeline.map((speaker, i) => (
          <div
            key={`${speaker.name}-${i}`}
            className={`timeline-node period-${speaker.period} role-${speaker.role}`}
            style={{ '--node-color': periodColors[speaker.period] }}
          >
            <div className="node-marker">
              <span className="node-number">{i + 1}</span>
            </div>
            <div className="node-content">
              <span className="node-role-icon">{roleIcons[speaker.role]}</span>
              <span className="node-name">{speaker.name}</span>
              {speaker.generation && (
                <span className="node-generation">דור {speaker.generation}</span>
              )}
            </div>
            {i < timeline.length - 1 && (
              <div className="timeline-connector">
                <span className="connector-arrow">↓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Interaction summary */}
      <div className="timeline-interactions">
        <span className="interaction-label">אינטראקציות:</span>
        <div className="interaction-stats">
          <span className="int-stat">💬 {timeline.filter(t => t.role === 'statement').length} אמירות</span>
          <span className="int-stat">⚡ {timeline.filter(t => t.role === 'objection').length} קושיות</span>
          <span className="int-stat">🎯 {timeline.filter(t => t.role === 'resolution').length} תירוצים</span>
        </div>
      </div>
    </div>
  );
});

SpeakerTimeline.displayName = 'SpeakerTimeline';

// =============================================================================
// HALACHIC CONCLUSION CARD - Summarizes practical halachic outcome
// =============================================================================

export const HalachicConclusionCard = memo(({ patterns }) => {
  const conclusions = useMemo(() => {
    const result = { rulings: [], disputes: [], finalPsak: null, tendency: null };
    if (!patterns) return result;

    // Find rulings
    const rulingPatterns = patterns.filter(p =>
      p.type === 'legal_ruling' ||
      p.type === 'halachic_conclusion' ||
      /מותר|אסור|חייב|פטור|כשר|פסול/.test(p.marker)
    );
    result.rulings = rulingPatterns.slice(0, 6).map(r => ({
      text: r.marker,
      type: /חייב|אסור|פסול/.test(r.marker) ? 'strict' :
            /פטור|מותר|כשר/.test(r.marker) ? 'lenient' : 'neutral'
    }));

    // Find disputes
    const disputePatterns = patterns.filter(p =>
      p.type === 'dispute' || /מחלוקת|בית הלל|בית שמאי/.test(p.marker)
    );
    result.disputes = disputePatterns.slice(0, 3);

    // Detect final psak
    const psakIndicators = patterns.filter(p =>
      /הלכה כ|והלכתא|קיימא לן|נקטינן/.test(p.marker)
    );
    if (psakIndicators.length > 0) {
      result.finalPsak = psakIndicators[psakIndicators.length - 1].marker;
    }

    // Calculate tendency
    if (result.rulings.length > 0) {
      const strict = result.rulings.filter(r => r.type === 'strict').length;
      const lenient = result.rulings.filter(r => r.type === 'lenient').length;
      result.tendency = strict > lenient ? 'מחמיר' : lenient > strict ? 'מקיל' : 'תלוי בנסיבות';
    }

    return result;
  }, [patterns]);

  const hasContent = conclusions.rulings.length > 0 || conclusions.disputes.length > 0 || conclusions.finalPsak;
  if (!hasContent) return null;

  return (
    <div className="usa-halachic-card" dir="rtl">
      <div className="halachic-header">
        <span className="halachic-icon">⚖️</span>
        <span className="halachic-title">מסקנות הלכתיות</span>
        {conclusions.tendency && (
          <span className={`halachic-tendency ${conclusions.tendency === 'מחמיר' ? 'strict' : 'lenient'}`}>
            {conclusions.tendency}
          </span>
        )}
      </div>

      {/* Rulings */}
      {conclusions.rulings.length > 0 && (
        <div className="halachic-section rulings">
          <div className="section-label">פסקי דין בסוגיא:</div>
          <div className="rulings-list">
            {conclusions.rulings.map((ruling, i) => (
              <div key={i} className={`ruling-item ${ruling.type}`}>
                <span className="ruling-icon">
                  {ruling.type === 'strict' ? '🔴' : ruling.type === 'lenient' ? '🟢' : '🟡'}
                </span>
                <span className="ruling-text">{ruling.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputes */}
      {conclusions.disputes.length > 0 && (
        <div className="halachic-section disputes">
          <div className="section-label">מחלוקות:</div>
          <div className="disputes-list">
            {conclusions.disputes.map((d, i) => (
              <div key={i} className="dispute-item">
                <span className="dispute-icon">⚔️</span>
                <span className="dispute-text">{d.marker}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Psak */}
      {conclusions.finalPsak && (
        <div className="halachic-section final-psak">
          <div className="section-label">פסק סופי:</div>
          <div className="psak-box">
            <span className="psak-icon">✅</span>
            <span className="psak-text">{conclusions.finalPsak}</span>
          </div>
        </div>
      )}

      <div className="halachic-disclaimer">
        ⚠️ ניתוח זה לצורכי לימוד בלבד. לפסיקה למעשה יש להתייעץ עם רב מוסמך.
      </div>
    </div>
  );
});

HalachicConclusionCard.displayName = 'HalachicConclusionCard';

// =============================================================================
// CROSS-REFERENCE PANEL - Shows related sources and parallels
// =============================================================================

export const CrossReferencePanel = memo(({ patterns }) => {
  const references = useMemo(() => {
    const result = { biblical: [], mishnaic: [], baraita: [], talmudic: [] };
    if (!patterns) return result;

    // Biblical references
    result.biblical = patterns.filter(p =>
      p.type === 'scripture' || /שנאמר|דכתיב|כתיב/.test(p.marker)
    ).slice(0, 5).map(s => ({ marker: s.marker, position: s.position }));

    // Mishnaic references
    result.mishnaic = patterns.filter(p =>
      p.type === 'mishna' || /תנן|מתני|דתנן/.test(p.marker)
    ).slice(0, 5).map(m => ({ marker: m.marker, position: m.position }));

    // Baraita citations
    result.baraita = patterns.filter(p =>
      p.type === 'baraita' || p.type === 'tannaitic_source' || /תניא|דתניא|תנא/.test(p.marker)
    ).slice(0, 5).map(b => ({ marker: b.marker, position: b.position }));

    // Parallel Talmudic
    result.talmudic = patterns.filter(p =>
      /תנן התם|התם אמרינן|דאמרינן/.test(p.marker)
    ).slice(0, 3).map(t => ({ marker: t.marker, position: t.position }));

    return result;
  }, [patterns]);

  const totalRefs = references.biblical.length + references.mishnaic.length +
                    references.baraita.length + references.talmudic.length;

  if (totalRefs === 0) return null;

  return (
    <div className="usa-crossref-panel" dir="rtl">
      <div className="crossref-header">
        <span className="crossref-icon">🔗</span>
        <span className="crossref-title">מקורות ומקבילות</span>
        <span className="crossref-count">{totalRefs} מקורות</span>
      </div>

      <div className="crossref-sections">
        {references.biblical.length > 0 && (
          <div className="crossref-section biblical">
            <div className="section-header">
              <span className="section-icon">📖</span>
              <span className="section-title">פסוקים ({references.biblical.length})</span>
            </div>
            <div className="ref-list">
              {references.biblical.map((ref, i) => (
                <div key={i} className="ref-item">
                  <span className="ref-text">{ref.marker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {references.mishnaic.length > 0 && (
          <div className="crossref-section mishnaic">
            <div className="section-header">
              <span className="section-icon">📘</span>
              <span className="section-title">משנה ({references.mishnaic.length})</span>
            </div>
            <div className="ref-list">
              {references.mishnaic.map((ref, i) => (
                <div key={i} className="ref-item">
                  <span className="ref-text">{ref.marker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {references.baraita.length > 0 && (
          <div className="crossref-section baraita">
            <div className="section-header">
              <span className="section-icon">📋</span>
              <span className="section-title">ברייתות ({references.baraita.length})</span>
            </div>
            <div className="ref-list">
              {references.baraita.map((ref, i) => (
                <div key={i} className="ref-item">
                  <span className="ref-text">{ref.marker}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {references.talmudic.length > 0 && (
          <div className="crossref-section talmudic">
            <div className="section-header">
              <span className="section-icon">📚</span>
              <span className="section-title">מקבילות ({references.talmudic.length})</span>
            </div>
            <div className="ref-list">
              {references.talmudic.map((ref, i) => (
                <div key={i} className="ref-item parallel">
                  <span className="ref-text">{ref.marker}</span>
                  <span className="ref-link">🔍</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

CrossReferencePanel.displayName = 'CrossReferencePanel';

// =============================================================================
// STUDY MASTERY TRACKER - Track learning progress over time
// =============================================================================

export const StudyMasteryTracker = memo(({ sugyaKey }) => {
  const [mastery, setMastery] = useState(() => {
    const saved = safeGet(STORAGE_KEYS.mastery, {});
    return saved[sugyaKey] || {
      level: 0,
      lastStudied: null,
      timesReviewed: 0
    };
  });
  const [showDetails, setShowDetails] = useState(false);

  const MASTERY_LEVELS = [
    { level: 0, label: 'לא נלמד', icon: '⬜', color: '#9CA3AF' },
    { level: 1, label: 'היכרות ראשונית', icon: '🟨', color: '#F59E0B' },
    { level: 2, label: 'הבנה בסיסית', icon: '🟩', color: '#10B981' },
    { level: 3, label: 'הבנה טובה', icon: '🟦', color: '#3B82F6' },
    { level: 4, label: 'שליטה מלאה', icon: '🟪', color: '#8B5CF6' },
    { level: 5, label: 'בקיאות', icon: '👑', color: '#F59E0B' }
  ];

  const currentLevel = MASTERY_LEVELS[mastery.level] || MASTERY_LEVELS[0];

  const updateMastery = useCallback((newLevel) => {
    const updated = {
      ...mastery,
      level: newLevel,
      lastStudied: new Date().toISOString(),
      timesReviewed: mastery.timesReviewed + 1
    };
    setMastery(updated);
    const allMastery = safeGet(STORAGE_KEYS.mastery, {});
    allMastery[sugyaKey] = updated;
    safeSet(STORAGE_KEYS.mastery, allMastery);
  }, [mastery, sugyaKey]);

  const daysSinceStudy = useMemo(() => {
    if (!mastery.lastStudied) return null;
    const lastDate = new Date(mastery.lastStudied);
    const today = new Date();
    return Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  }, [mastery.lastStudied]);

  return (
    <div className="usa-mastery-tracker" dir="rtl">
      <div className="mastery-header">
        <button
          className="mastery-toggle"
          onClick={() => setShowDetails(!showDetails)}
          type="button"
        >
          <span className="mastery-icon">{currentLevel.icon}</span>
          <span className="mastery-label">{currentLevel.label}</span>
          <span className="mastery-chevron">{showDetails ? '▼' : '◀'}</span>
        </button>

        {daysSinceStudy !== null && (
          <span className={`days-badge ${daysSinceStudy > 7 ? 'stale' : 'recent'}`}>
            {daysSinceStudy === 0 ? 'היום' :
             daysSinceStudy === 1 ? 'אתמול' :
             `לפני ${daysSinceStudy} ימים`}
          </span>
        )}
      </div>

      {showDetails && (
        <div className="mastery-details">
          <div className="level-selector">
            <span className="selector-label">רמת שליטה:</span>
            <div className="level-buttons">
              {MASTERY_LEVELS.map((level) => (
                <button
                  key={level.level}
                  className={`level-btn ${mastery.level === level.level ? 'active' : ''}`}
                  style={{ '--level-color': level.color }}
                  onClick={() => updateMastery(level.level)}
                  title={level.label}
                  type="button"
                >
                  {level.icon}
                </button>
              ))}
            </div>
          </div>

          <div className="mastery-stats">
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <span className="stat-value">{mastery.timesReviewed}</span>
              <span className="stat-label">חזרות</span>
            </div>
          </div>

          <div className="mastery-tips">
            {mastery.level < 2 && (
              <div className="tip-item">💡 קרא את הסוגיא פעם נוספת והתמקד בשאלות המרכזיות</div>
            )}
            {mastery.level >= 2 && mastery.level < 4 && (
              <div className="tip-item">💡 נסה לסכם את הסוגיא במילים שלך בלי להסתכל</div>
            )}
            {mastery.level >= 4 && (
              <div className="tip-item">🎉 כל הכבוד! נסה ללמד את הסוגיא למישהו אחר</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

StudyMasteryTracker.displayName = 'StudyMasteryTracker';

// =============================================================================
// SUGYA INSIGHTS CARD - AI-style insights about the sugya
// =============================================================================

export const SugyaInsightsCard = memo(({ patterns, qaFlow, mishnaAnalysis, rabbis }) => {
  const insights = useMemo(() => {
    const result = [];

    // Methodology insight
    const questionCount = (qaFlow?.summary?.questionsAsked || 0) + (qaFlow?.summary?.sourceCitations || 0);
    const resolvedCount = qaFlow?.summary?.resolved || 0;

    if (questionCount > 3) {
      result.push({
        type: 'methodology',
        icon: '🔬',
        title: 'שיטת הדיון',
        text: `סוגיא עמוקה עם ${questionCount} יחידות דיון. ${resolvedCount === questionCount ? 'כל השאלות נפתרו.' : 'חלק מהדיון נמשך.'}`
      });
    }

    // Sage interaction insight
    if (rabbis && rabbis.length >= 3) {
      result.push({
        type: 'sages',
        icon: '👥',
        title: 'ריבוי חכמים',
        text: `${rabbis.length} חכמים משתתפים בדיון - מהווה סוגיא מקיפה ורב-קולית.`
      });
    }

    // Structure insight
    if (mishnaAnalysis?.summary) {
      const { hasEnumeration, hasDisputes, hasConditions } = mishnaAnalysis.summary;
      if (hasEnumeration && hasConditions) {
        result.push({
          type: 'structure',
          icon: '🏗️',
          title: 'מבנה המשנה',
          text: 'משנה מובנית עם מניינים ותנאים - קלה יותר לזכירה בשיטת הלוקוסים.'
        });
      }
      if (hasDisputes) {
        result.push({
          type: 'dispute',
          icon: '⚔️',
          title: 'מחלוקת',
          text: 'סוגיא הכוללת מחלוקת - חשוב להבין את שני הצדדים לפני שממשיכים.'
        });
      }
    }

    // Source-heavy sugya
    const sourceCount = patterns?.filter(p =>
      ['scripture', 'baraita', 'tannaitic_source', 'source_citation'].includes(p.type)
    ).length || 0;

    if (sourceCount >= 3) {
      result.push({
        type: 'sources',
        icon: '📚',
        title: 'עושר מקורות',
        text: `סוגיא עשירה במקורות (${sourceCount}) - דורשת התמצאות בספרות התנאית.`
      });
    }

    return result;
  }, [patterns, qaFlow, mishnaAnalysis, rabbis]);

  if (insights.length === 0) return null;

  return (
    <div className="usa-insights-card" dir="rtl">
      <div className="insights-header">
        <span className="insights-icon">💡</span>
        <span className="insights-title">תובנות על הסוגיא</span>
      </div>

      <div className="insights-list">
        {insights.map((insight, i) => (
          <div key={i} className={`insight-item type-${insight.type}`}>
            <div className="insight-header">
              <span className="insight-icon">{insight.icon}</span>
              <span className="insight-title">{insight.title}</span>
            </div>
            <p className="insight-text">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

SugyaInsightsCard.displayName = 'SugyaInsightsCard';

export default {
  SpeakerTimeline,
  HalachicConclusionCard,
  CrossReferencePanel,
  StudyMasteryTracker,
  SugyaInsightsCard
};
