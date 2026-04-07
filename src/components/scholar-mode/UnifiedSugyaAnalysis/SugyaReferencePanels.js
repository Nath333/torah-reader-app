/**
 * SugyaReferencePanels - Cross-reference, navigation, and abbreviation panels
 * Extracted from UnifiedSugyaAnalysis/index.js
 *
 * Components: CrossReferencesPanel, SugyaNavigator, AbbreviationsPanel
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { CROSS_REF_CATEGORIES, ABBR_TYPE_ICONS } from '../../../constants/talmudStudy';
import { useCopyToClipboard } from '../../../hooks/useTalmudStudy';
import { findAbbreviations, expandAllAbbreviations } from '../../../services/textual/talmudicAbbreviationsService';

// =============================================================================
// CROSS-REFERENCES PANEL
// Shows related sugyot, parallel sources, and scripture connections
// =============================================================================

const CrossReferencesPanel = memo(({ reference, patterns, text, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const extractedRefs = useMemo(() => {
    const refs = {
      parallel_sugya: [], parallel_mishna: [], tosefta: [], scripture: [], yerushalmi: []
    };
    if (!text) return refs;

    const scriptureMatches = text.match(/דכתיב|שנאמר|מנלן|כדכתיב/g);
    if (scriptureMatches) {
      scriptureMatches.forEach((m) => {
        const idx = text.indexOf(m);
        const context = text.slice(idx, Math.min(text.length, idx + 60));
        refs.scripture.push({ marker: m, context: context.trim(), type: 'scripture' });
      });
    }

    const mishnaMatches = text.match(/תנן\s*התם|הא\s*תנן|כדתנן|דתניא/g);
    if (mishnaMatches) {
      mishnaMatches.forEach((m) => {
        const idx = text.indexOf(m);
        const context = text.slice(idx, Math.min(text.length, idx + 80));
        refs.parallel_mishna.push({ marker: m, context: context.trim(), type: 'parallel_mishna' });
      });
    }

    const toseftaMatches = text.match(/תוספתא|ת״ר|תני\s+רבי/g);
    if (toseftaMatches) {
      toseftaMatches.forEach(m => refs.tosefta.push({ marker: m, type: 'tosefta' }));
    }

    const yerushalmiMatches = text.match(/ירושלמי|תלמודא\s*דמערבא/g);
    if (yerushalmiMatches) {
      yerushalmiMatches.forEach(m => refs.yerushalmi.push({ marker: m, type: 'yerushalmi' }));
    }

    const tractatePattern = /(מסכת|במס'|ב)(שבת|עירובין|פסחים|יומא|סוכה|ביצה|ראש השנה|תענית|מגילה|מועד קטן|חגיגה|יבמות|כתובות|נדרים|נזיר|סוטה|גיטין|קידושין|בבא קמא|בבא מציעא|בבא בתרא|סנהדרין|מכות|שבועות|עבודה זרה|הוריות|זבחים|מנחות|חולין|בכורות|ערכין|תמורה|כריתות|מעילה|נדה)/g;
    const tractateMatches = text.match(tractatePattern);
    if (tractateMatches) {
      tractateMatches.forEach(ref => refs.parallel_sugya.push({ tractate: ref, type: 'parallel_sugya' }));
    }

    return refs;
  }, [text]);

  const totalRefs = useMemo(() => {
    return Object.values(extractedRefs).reduce((sum, arr) => sum + arr.length, 0);
  }, [extractedRefs]);

  const filteredRefs = useMemo(() => {
    if (activeCategory === 'all') {
      return Object.entries(extractedRefs)
        .filter(([_, refs]) => refs.length > 0)
        .flatMap(([cat, refs]) => refs.map(r => ({ ...r, category: cat })));
    }
    return extractedRefs[activeCategory]?.map(r => ({ ...r, category: activeCategory })) || [];
  }, [extractedRefs, activeCategory]);

  const handleRefClick = useCallback((ref) => {
    if (onNavigate && ref.tractate) onNavigate(ref.tractate);
  }, [onNavigate]);

  if (totalRefs === 0) return null;

  return (
    <div className="usa-cross-refs-panel" dir="rtl">
      <button className="cross-refs-header" onClick={() => setIsExpanded(!isExpanded)} type="button">
        <span className="cross-refs-icon">🔗</span>
        <span className="cross-refs-title">הפניות ומקורות מקבילים</span>
        <span className="cross-refs-count">{totalRefs}</span>
        <span className="cross-refs-chevron">{isExpanded ? '▼' : '◀'}</span>
      </button>

      {isExpanded && (
        <div className="cross-refs-content">
          <div className="cross-refs-tabs">
            <button
              className={`ref-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')} type="button"
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
                    <span className="ref-marker">{ref.tractate || ref.marker}</span>
                    {ref.context && (
                      <span className="ref-context">{ref.context.substring(0, 60)}...</span>
                    )}
                  </div>
                  {ref.tractate && <span className="ref-action">↗️</span>}
                </div>
              );
            })}
          </div>

          <div className="cross-refs-tip">💡 לחץ על הפניה למסכת אחרת לנווט אליה</div>
        </div>
      )}
    </div>
  );
});

CrossReferencesPanel.displayName = 'CrossReferencesPanel';

// =============================================================================
// SUGYA NAVIGATOR - Visual timeline of sugya structure
// =============================================================================

const SugyaNavigator = memo(({ patterns, onJumpTo }) => {
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
// ABBREVIATIONS PANEL - Search, grouping, copy, expanded text
// =============================================================================

const AbbreviationsPanel = memo(({ text, abbreviations: passedAbbreviations }) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['name']));
  const [selectedAbbr, setSelectedAbbr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpanded, setShowExpanded] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const abbreviations = useMemo(() => {
    if (passedAbbreviations && passedAbbreviations.length > 0) {
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

      {showExpanded && expandedText && (
        <div className="expanded-text-box">
          <div className="box-header">טקסט עם פירוש ראשי תיבות:</div>
          <div className="box-content" dir="rtl">{expandedText}</div>
        </div>
      )}

      {filteredAbbreviations.length === 0 && searchQuery && (
        <div className="no-results">
          <span>לא נמצאו תוצאות עבור "{searchQuery}"</span>
        </div>
      )}

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
                        title="העתק" type="button"
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

export {
  CrossReferencesPanel,
  SugyaNavigator,
  AbbreviationsPanel
};
