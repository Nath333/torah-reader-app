/**
 * SugyaAnalysisComponents - Extracted analysis panel components
 * GemaraDialecticPanel, AbbreviationsPanel, CrossReferencesPanel, PatternDetailPanel
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  HEBREW_TYPE_LABELS,
  ABBR_TYPE_ICONS,
  CROSS_REF_CATEGORIES
} from '../../../constants/talmudStudy';
import { useCopyToClipboard } from '../../../hooks/useTalmudStudy';
import { TALMUDIC_PATTERNS } from '../../../services/scholarly/discoursePatternService';
import { findAbbreviations, expandAllAbbreviations } from '../../../services/textual/talmudicAbbreviationsService';

// =============================================================================
// GEMARA DIALECTIC PANEL
// =============================================================================

export const GemaraDialecticPanel = memo(({ patterns, qaFlow, text }) => {
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
        id: i,
        type: 'qa-unit',
        question: unit.question,
        challenges: unit.challenges || [],
        proofs: unit.proofs || [],
        resolution: unit.resolution,
        isResolved: !!unit.resolution
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
          id: units.length, type: p.type,
          icon: typeIcons[p.type] || '📝', label: typeLabels[p.type] || p.type,
          marker: p.marker, text: p.context || p.marker,
          position: p.position, responses: [], isResolved: false
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
            id: units.length, type: p.type,
            icon: typeIcons[p.type], label: typeLabels[p.type],
            marker: p.marker, text: p.context || p.marker,
            position: p.position, responses: [],
            isResolved: p.type === 'legal_ruling'
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
// PATTERN DETAIL PANEL
// =============================================================================

export const PatternDetailPanel = memo(({ pattern, text, onClose }) => {
  if (!pattern) return null;

  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

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
// CROSS REFERENCES PANEL
// =============================================================================

export const CrossReferencesPanel = memo(({ reference, patterns, text, onNavigate }) => {
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
      toseftaMatches.forEach(m => { refs.tosefta.push({ marker: m, type: 'tosefta' }); });
    }

    const yerushalmiMatches = text.match(/ירושלמי|תלמודא\s*דמערבא/g);
    if (yerushalmiMatches) {
      yerushalmiMatches.forEach(m => { refs.yerushalmi.push({ marker: m, type: 'yerushalmi' }); });
    }

    const tractatePattern = /(מסכת|במס'|ב)(שבת|עירובין|פסחים|יומא|סוכה|ביצה|ראש השנה|תענית|מגילה|מועד קטן|חגיגה|יבמות|כתובות|נדרים|נזיר|סוטה|גיטין|קידושין|בבא קמא|בבא מציעא|בבא בתרא|סנהדרין|מכות|שבועות|עבודה זרה|הוריות|זבחים|מנחות|חולין|בכורות|ערכין|תמורה|כריתות|מעילה|נדה)/g;
    const tractateMatches = text.match(tractatePattern);
    if (tractateMatches) {
      tractateMatches.forEach(ref => { refs.parallel_sugya.push({ tractate: ref, type: 'parallel_sugya' }); });
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
// ABBREVIATIONS PANEL
// =============================================================================

export const AbbreviationsPanel = memo(({ text, abbreviations: passedAbbreviations }) => {
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
          type="text" placeholder="חפש ראשי תיבות..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input" dir="rtl"
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
