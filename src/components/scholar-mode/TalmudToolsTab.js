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
 * 📝 STUDY AIDS:
 * - Personal notes and highlights
 * - Review questions with answers
 * - Summary builder for each sugya
 * - Track mastery progress
 */
import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { findAbbreviations, expandAllAbbreviations } from '../../services/talmudicAbbreviationsService';
import { detectStructuralMarkers, TALMUDIC_PATTERNS } from '../../services/discoursePatternService';

// PRO SCHOLAR V6: Lazy-loaded advanced components for bundle optimization
const CitationHighlighter = lazy(() => import('../study/CitationHighlighter'));
// PRO SCHOLAR V6: Sage biographies and historical context panels
const RabbiInfoPanel = lazy(() => import('./RabbiInfoPanel'));
const RealiaPanel = lazy(() => import('./RealiaPanel'));

// Loading fallback for lazy components
const LazyLoadFallback = () => (
  <div className="lazy-load-skeleton">
    <div className="skeleton-bar" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '70%', height: '16px' }} />
  </div>
);

// =============================================================================
// Constants - Hebrew Labels for Scholarly Interface
// =============================================================================

const HEBREW_TYPE_LABELS = {
  mishna: 'משנה',
  gemara: 'גמרא',
  question: 'שאלה',
  objection: 'קושיא',
  proof: 'ראיה',
  resolution: 'תירוץ',
  alternative: 'איכא דאמרי',
  baraita: 'ברייתא',
  scripture: 'פסוק',
  source_citation: 'מקור',
  legal_ruling: 'הלכה'
};

const TYPE_CATEGORIES = {
  structure: { label: 'מבנה', types: ['mishna', 'gemara', 'baraita'] },
  dialectic: { label: 'שקלא וטריא', types: ['question', 'objection', 'proof', 'resolution'] },
  sources: { label: 'מקורות', types: ['scripture', 'source_citation'] },
  halacha: { label: 'הלכה', types: ['legal_ruling', 'alternative'] }
};

// =============================================================================
// Study Modes - Three approaches to learning
// =============================================================================

const STUDY_MODES = {
  iyun: {
    key: 'iyun',
    hebrew: 'עיון',
    english: 'Deep Analysis',
    icon: '🔬',
    description: 'לימוד מעמיק - הבנת הסברא והשקלא וטריא',
    color: '#7C3AED'
  },
  bekius: {
    key: 'bekius',
    hebrew: 'בקיאות',
    english: 'Overview',
    icon: '📖',
    description: 'סקירה כללית - מה עיקר ההלכה והנושא',
    color: '#3B82F6'
  },
  chazara: {
    key: 'chazara',
    hebrew: 'חזרה',
    english: 'Review',
    icon: '🔄',
    description: 'חזרה ובחינה עצמית - האם הבנתי?',
    color: '#10B981'
  }
};

// =============================================================================
// Local Storage Keys for Study Progress
// =============================================================================

const STORAGE_KEYS = {
  notes: 'talmud_study_notes',
  progress: 'talmud_study_progress',
  mastery: 'talmud_mastery_level'
};

// =============================================================================
// Masechta Names - Hebrew names for tractates
// =============================================================================

const MASECHTA_HEBREW = {
  'Berakhot': 'ברכות',
  'Shabbat': 'שבת',
  'Eruvin': 'עירובין',
  'Pesachim': 'פסחים',
  'Shekalim': 'שקלים',
  'Yoma': 'יומא',
  'Sukkah': 'סוכה',
  'Beitzah': 'ביצה',
  'Rosh Hashanah': 'ראש השנה',
  'Taanit': 'תענית',
  'Megillah': 'מגילה',
  'Moed Katan': 'מועד קטן',
  'Chagigah': 'חגיגה',
  'Yevamot': 'יבמות',
  'Ketubot': 'כתובות',
  'Nedarim': 'נדרים',
  'Nazir': 'נזיר',
  'Sotah': 'סוטה',
  'Gittin': 'גיטין',
  'Kiddushin': 'קידושין',
  'Bava Kamma': 'בבא קמא',
  'Bava Metzia': 'בבא מציעא',
  'Bava Batra': 'בבא בתרא',
  'Sanhedrin': 'סנהדרין',
  'Makkot': 'מכות',
  'Shevuot': 'שבועות',
  'Avodah Zarah': 'עבודה זרה',
  'Horayot': 'הוריות',
  'Zevachim': 'זבחים',
  'Menachot': 'מנחות',
  'Chullin': 'חולין',
  'Bekhorot': 'בכורות',
  'Arakhin': 'ערכין',
  'Temurah': 'תמורה',
  'Keritot': 'כריתות',
  'Meilah': 'מעילה',
  'Tamid': 'תמיד',
  'Niddah': 'נדה'
};

// Helper to parse daf reference
function parseDafReference(reference) {
  if (!reference) return null;

  // Match patterns like "Berakhot 2a", "Bava Metzia 15b", etc.
  const match = reference.match(/^(.+?)\s+(\d+)([ab])$/i);
  if (!match) return null;

  const [, masechta, daf, amud] = match;
  const hebrewMasechta = MASECHTA_HEBREW[masechta] || masechta;
  const hebrewAmud = amud.toLowerCase() === 'a' ? 'ע״א' : 'ע״ב';
  const hebrewDaf = `${daf}${amud === 'a' ? '.' : ':'}`;

  return {
    masechta,
    hebrewMasechta,
    daf: parseInt(daf),
    amud: amud.toLowerCase(),
    hebrewAmud,
    hebrewDaf,
    fullHebrew: `${hebrewMasechta} ${hebrewDaf}`,
    sefariaUrl: `https://www.sefaria.org/${masechta.replace(/\s+/g, '_')}.${daf}${amud}`
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (err) {
      return false;
    }
  }, []);
  return { copied, copy };
}

// Hook for managing study notes in localStorage with size limits
const MAX_NOTES_ENTRIES = 100;
const MAX_NOTE_TEXT_LENGTH = 5000;
const MAX_INSIGHTS_PER_SUGYA = 20;

function useStudyNotes(sugyaKey) {
  const [notes, setNotes] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.notes);
      const all = stored ? JSON.parse(stored) : {};
      return all[sugyaKey] || { text: '', insights: [], questions: [] };
    } catch {
      return { text: '', insights: [], questions: [] };
    }
  });

  const saveNotes = useCallback((newNotes) => {
    const sanitized = {
      text: (newNotes.text || '').slice(0, MAX_NOTE_TEXT_LENGTH),
      insights: (newNotes.insights || []).slice(-MAX_INSIGHTS_PER_SUGYA),
      questions: newNotes.questions || []
    };
    setNotes(sanitized);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.notes);
      const all = stored ? JSON.parse(stored) : {};
      all[sugyaKey] = sanitized;
      const keys = Object.keys(all);
      if (keys.length > MAX_NOTES_ENTRIES) {
        keys.slice(0, keys.length - MAX_NOTES_ENTRIES).forEach(k => delete all[k]);
      }
      localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save notes:', e);
    }
  }, [sugyaKey]);

  return [notes, saveNotes];
}

// Hook for tracking mastery level
function useMasteryLevel(sugyaKey) {
  const [level, setLevel] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.mastery);
      const all = stored ? JSON.parse(stored) : {};
      return all[sugyaKey] || 0;
    } catch {
      return 0;
    }
  });

  const updateLevel = useCallback((newLevel) => {
    setLevel(newLevel);
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.mastery);
      const all = stored ? JSON.parse(stored) : {};
      all[sugyaKey] = newLevel;
      localStorage.setItem(STORAGE_KEYS.mastery, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save mastery:', e);
    }
  }, [sugyaKey]);

  return [level, updateLevel];
}

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
// Sugya Summary Component - Quick overview of the sugya structure
// =============================================================================

const SugyaSummary = React.memo(function SugyaSummary({ stats }) {
  // Determine sugya type and complexity
  const hasMishna = stats.mishna > 0;
  const hasGemara = stats.gemara > 0;
  const hasBaraita = stats.baraita > 0;

  const questionCount = (stats.question || 0) + (stats.objection || 0);
  const answerCount = (stats.resolution || 0) + (stats.proof || 0);

  const sugyaType = hasMishna && hasGemara ? 'סוגיא שלמה'
    : hasMishna ? 'משנה בלבד'
    : hasGemara ? 'גמרא'
    : 'קטע';

  const complexity = questionCount < 2 ? 'פשוטה'
    : questionCount < 5 ? 'בינונית'
    : 'מורכבת';

  const complexityClass = questionCount < 2 ? 'simple'
    : questionCount < 5 ? 'moderate'
    : 'complex';

  return (
    <div className="sugya-summary">
      <div className="summary-header">
        <div className="summary-title">
          <span className="title-icon">📜</span>
          <span className="title-text">מהלך הסוגיא</span>
        </div>
        <div className="summary-badges">
          <span className="badge sugya-type">{sugyaType}</span>
          <span className={`badge complexity ${complexityClass}`}>{complexity}</span>
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-group">
          <div className="stat-item" title="מבנה">
            <span className="stat-emoji">📘</span>
            <span className="stat-value">{(stats.mishna || 0) + (stats.gemara || 0)}</span>
            <span className="stat-label">מבנה</span>
          </div>
          {hasBaraita && (
            <div className="stat-item" title="ברייתות">
              <span className="stat-emoji">📜</span>
              <span className="stat-value">{stats.baraita || 0}</span>
              <span className="stat-label">ברייתות</span>
            </div>
          )}
        </div>

        <div className="stat-divider">⟷</div>

        <div className="stat-group dialectic">
          <div className="stat-item question" title="שאלות וקושיות">
            <span className="stat-emoji">❓</span>
            <span className="stat-value">{questionCount}</span>
            <span className="stat-label">קושיות</span>
          </div>
          <div className="stat-item answer" title="תירוצים וראיות">
            <span className="stat-emoji">✅</span>
            <span className="stat-value">{answerCount}</span>
            <span className="stat-label">תירוצים</span>
          </div>
        </div>

        {(stats.scripture || 0) > 0 && (
          <>
            <div className="stat-divider">⟷</div>
            <div className="stat-group">
              <div className="stat-item" title="פסוקים">
                <span className="stat-emoji">📖</span>
                <span className="stat-value">{stats.scripture || 0}</span>
                <span className="stat-label">פסוקים</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick navigation hint */}
      <div className="summary-hint">
        <span className="hint-icon">💡</span>
        <span className="hint-text">לחץ על סימן כדי לראות פירוט והקשר</span>
      </div>
    </div>
  );
});

// =============================================================================
// Flow Node Component - Single pattern in the sugya flow
// =============================================================================

const FlowNode = React.memo(function FlowNode({
  pattern,
  index,
  isSelected,
  onClick,
  relationToNext,
  isPartOfChain
}) {
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Determine node style based on category
  const category = Object.entries(TYPE_CATEGORIES).find(([, cat]) =>
    cat.types.includes(pattern.type)
  )?.[0] || 'other';

  return (
    <div className={`flow-node-wrapper ${isPartOfChain ? 'in-chain' : ''}`}>
      <button
        className={`sugya-flow-node ${isSelected ? 'selected' : ''} category-${category}`}
        onClick={() => onClick(pattern)}
        style={{ '--node-color': config.color || '#6b7280' }}
        type="button"
        dir="rtl"
      >
        <div className="node-index">{index + 1}</div>
        <div className="node-icon">{config.icon || '📌'}</div>
        <div className="node-content">
          <div className="node-hebrew-label">{hebrewLabel}</div>
          <div className="node-marker">{pattern.marker}</div>
        </div>
        {isSelected && <div className="node-selected-mark">◀</div>}
      </button>

      {/* Connector to next node */}
      {relationToNext && (
        <div className={`flow-connector type-${relationToNext}`}>
          <div className="connector-line" />
          <div className="connector-label">
            {relationToNext === 'answer' ? 'תירוץ' :
             relationToNext === 'challenge' ? 'קושיא' :
             relationToNext === 'proof' ? 'ראיה' : '↓'}
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Pattern Detail Card - Shows detailed info about selected pattern
// =============================================================================

const PatternDetailCard = React.memo(function PatternDetailCard({
  pattern,
  text,
  onClose
}) {
  const { copied, copy } = useCopyToClipboard();
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;

  // Get context with more surrounding text
  const contextRadius = 80;
  const contextStart = Math.max(0, pattern.position - contextRadius);
  const contextEnd = Math.min(text?.length || 0, pattern.endPosition + contextRadius);
  const contextBefore = text?.slice(contextStart, pattern.position) || '';
  const contextAfter = text?.slice(pattern.endPosition, contextEnd) || '';

  const handleCopy = () => {
    copy(`${pattern.marker}\n${hebrewLabel} (${config.label})\n\nהקשר: ...${contextBefore}${pattern.marker}${contextAfter}...`);
  };

  return (
    <div className="pattern-detail-card" style={{ '--accent-color': config.color }}>
      <div className="card-header">
        <div className="header-main">
          <span className="header-icon">{config.icon}</span>
          <div className="header-titles">
            <span className="header-hebrew">{hebrewLabel}</span>
            <span className="header-english">{config.label}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`action-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="העתק"
            type="button"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button className="close-btn" onClick={onClose} type="button">×</button>
        </div>
      </div>

      <div className="card-body">
        {/* The marker itself */}
        <div className="marker-display" dir="rtl">
          <span className="marker-text">{pattern.marker}</span>
        </div>

        {/* Explanation */}
        <div className="explanation-section">
          <div className="section-title">הסבר</div>
          <p className="explanation-text">{getDetailedExplanation(pattern.type)}</p>
        </div>

        {/* Context in text */}
        <div className="context-section" dir="rtl">
          <div className="section-title">הקשר בגמרא</div>
          <div className="context-text">
            <span className="context-before">{contextStart > 0 ? '...' : ''}{contextBefore}</span>
            <mark className="context-marker">{pattern.marker}</mark>
            <span className="context-after">{contextAfter}{contextEnd < text?.length ? '...' : ''}</span>
          </div>
        </div>

        {/* Study guidance */}
        <div className="study-section">
          <div className="section-title">
            <span className="title-icon">📚</span>
            <span>נקודה ללימוד</span>
          </div>
          <p className="study-tip">{getStudyGuidance(pattern.type)}</p>
        </div>
      </div>
    </div>
  );
});

// Detailed explanations in Hebrew style
function getDetailedExplanation(type) {
  const explanations = {
    mishna: 'זהו תחילת המשנה - הטקסט העיקרי שהגמרא דנה בו. המשנה מכילה את ההלכה או ההוראה מתקופת התנאים.',
    gemara: 'זהו תחילת הגמרא - דיון האמוראים והסברת המשנה. הגמרא מבארת, מקשה ומרחיבה את דברי המשנה.',
    question: 'כאן עולה שאלה לבירור או לחקירה. השאלה באה להבהיר נקודה או לחקור את גדרי הדין.',
    objection: 'קושיא על הנאמר קודם. יכולה להיות קושיא מסברא (מתקיף) או ממקור סותר (מתיבי, ורמינהו).',
    proof: 'הבאת ראיה לחיזוק הדברים. "תא שמע" מביא ראיה ממקור תנאי, "שמע מינה" מסיק מסקנה.',
    resolution: 'תירוץ לשאלה או לקושיא. "לא קשיא" מתרץ סתירה, "הכי קאמר" מבהיר את הכוונה.',
    alternative: 'גרסה או פירוש חלופי. "איכא דאמרי" מביא מסורת אחרת, "לישנא אחרינא" גרסה שונה.',
    baraita: 'מקור תנאי מחוץ למשנה (ברייתא/תוספתא). "תנו רבנן" או "תניא" פותחים ציטוט ברייתא.',
    scripture: 'הבאת פסוק מהתורה או מהנביאים כמקור או ראיה. "שנאמר" או "דכתיב" מציינים ציטוט.'
  };
  return explanations[type] || `סימן מבני בסוגיא מסוג: ${type}`;
}

function getStudyGuidance(type) {
  const guidance = {
    mishna: 'קרא את המשנה בעיון תחילה. הבן את ההלכה הבסיסית לפני שתצלול לדיון הגמרא.',
    gemara: 'הגמרא בדרך כלל מתחילה בבירור הנחות סמויות או עמימויות במשנה.',
    question: 'שים לב מה בדיוק נשאל. התשובה לעתים מגלה עקרונות עמוקים יותר.',
    objection: 'קושיות מחדדות את ההבנה. שקול מה היה בעייתי אילו הקושיא הייתה עומדת.',
    proof: 'בדוק האם הראיה חותכת או שניתנת לדחייה. איכות הראיה משפיעה על המסקנה.',
    resolution: 'התירוץ לעתים מכניס חילוקים והגבלות חשובות על הכלל.',
    alternative: 'גרסאות חלופיות עשויות לשקף מסורות שונות. שתיהן עשויות להיות רלוונטיות להלכה.',
    baraita: 'ברייתות מספקות הקשר נוסף ולעתים מכילות פרטים חשובים שאינם במשנה.',
    scripture: 'ציטוטי פסוקים מגלים את מקור התורה להלכות ולעקרונות.'
  };
  return guidance[type] || 'התבונן כיצד אלמנט זה קשור למבנה הכללי של הסוגיא.';
}

// =============================================================================
// Sugya Flow Section - Main flow visualization
// =============================================================================

// =============================================================================
// Tree View Component - Shows Q&A as branching tree with collapsible branches
// =============================================================================

const TreeBranch = React.memo(function TreeBranch({
  node,
  depth = 0,
  onSelect,
  selectedId,
  expandedNodes,
  onToggleExpand
}) {
  const config = TALMUDIC_PATTERNS[node.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[node.type] || node.type;
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  // Determine node status for visual indicator
  const isQuestion = ['question', 'objection'].includes(node.type);
  const isResolved = isQuestion && hasChildren;

  const handleNodeClick = (e) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  };

  return (
    <div
      className={`tree-branch depth-${Math.min(depth, 3)} ${isResolved ? 'resolved' : ''} ${isQuestion && !hasChildren ? 'open-question' : ''}`}
      style={{ '--branch-color': config.color }}
    >
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} type-${node.type}`}
        onClick={handleNodeClick}
      >
        {/* Expand/collapse toggle for nodes with children */}
        {hasChildren && (
          <button
            className={`tree-expand-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={handleExpandClick}
            title={isExpanded ? 'צמצם' : 'הרחב'}
            type="button"
          >
            {isExpanded ? '▼' : '◀'}
          </button>
        )}

        <span className="tree-icon">{config.icon || '📌'}</span>
        <span className="tree-label">{hebrewLabel}</span>
        <span className="tree-marker">{node.marker?.substring(0, 35)}{node.marker?.length > 35 ? '...' : ''}</span>

        {/* Status badge for questions */}
        {isQuestion && (
          <span className={`tree-status-badge ${isResolved ? 'resolved' : 'open'}`}>
            {isResolved ? '✓' : '?'}
          </span>
        )}

        {/* Children count badge */}
        {hasChildren && (
          <span className="tree-children-count">{node.children.length}</span>
        )}
      </div>

      {/* Collapsible children */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {node.children.map((child, idx) => (
            <TreeBranch
              key={child.id || idx}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const SugyaTreeView = React.memo(function SugyaTreeView({ patterns, onSelect, selectedPattern }) {
  // State for expanded nodes - start with all expanded
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Build tree structure: group questions with their answers
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

      // If it's a structural element (mishna, gemara, baraita), it's a top-level node
      if (['mishna', 'gemara', 'baraita'].includes(p.type)) {
        nodes.push(node);
        i++;
        continue;
      }

      // If it's a question/objection, find subsequent answers
      if (['question', 'objection'].includes(p.type)) {
        // Look ahead for resolutions/proofs
        let j = i + 1;
        while (j < patterns.length) {
          const next = patterns[j];
          // Stop if we hit another question or structural element
          if (['question', 'objection', 'mishna', 'gemara', 'baraita'].includes(next.type)) {
            break;
          }
          // Add resolutions/proofs as children
          if (['resolution', 'proof', 'alternative'].includes(next.type)) {
            node.children.push({
              ...next,
              id: `${next.type}-${next.position}`
            });
          }
          j++;
        }
        nodes.push(node);
        i = j;
        continue;
      }

      // Other patterns become top-level nodes
      nodes.push(node);
      i++;
    }

    return nodes;
  }, [patterns]);

  // Initialize expanded state with all nodes that have children
  useEffect(() => {
    if (!isInitialized && tree.length > 0) {
      const allExpandable = new Set();
      tree.forEach(node => {
        if (node.children && node.children.length > 0) {
          allExpandable.add(node.id);
        }
      });
      setExpandedNodes(allExpandable);
      setIsInitialized(true);
    }
  }, [tree, isInitialized]);

  // Group nodes by type for summary - must be before any conditional return
  const stats = useMemo(() => {
    const questionNodes = tree.filter(n => ['question', 'objection'].includes(n.type));
    const withAnswers = questionNodes.filter(n => n.children.length > 0);
    return {
      total: tree.length,
      questions: questionNodes.length,
      resolved: withAnswers.length,
      unresolved: questionNodes.length - withAnswers.length
    };
  }, [tree]);

  // Toggle a single node's expanded state
  const handleToggleExpand = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand all nodes with children
  const expandAll = useCallback(() => {
    const allExpandable = new Set();
    tree.forEach(node => {
      if (node.children && node.children.length > 0) {
        allExpandable.add(node.id);
      }
    });
    setExpandedNodes(allExpandable);
  }, [tree]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Count expandable nodes
  const expandableCount = useMemo(() => {
    return tree.filter(n => n.children && n.children.length > 0).length;
  }, [tree]);

  const allExpanded = expandedNodes.size === expandableCount && expandableCount > 0;

  if (tree.length === 0) {
    return (
      <div className="tree-empty">
        <span className="empty-icon">🌳</span>
        <span className="empty-text">לא נמצא מבנה לתצוגת עץ</span>
      </div>
    );
  }

  return (
    <div className="sugya-tree-view">
      {/* Tree header with summary and controls */}
      <div className="tree-header">
        {/* Summary stats */}
        <div className="tree-summary">
          <div className="summary-item">
            <span className="s-icon">🌳</span>
            <span className="s-value">{stats.total}</span>
            <span className="s-label">צמתים</span>
          </div>
          <div className="summary-item resolved">
            <span className="s-icon">✅</span>
            <span className="s-value">{stats.resolved}</span>
            <span className="s-label">נפתרו</span>
          </div>
          {stats.unresolved > 0 && (
            <div className="summary-item unresolved">
              <span className="s-icon">❓</span>
              <span className="s-value">{stats.unresolved}</span>
              <span className="s-label">פתוחות</span>
            </div>
          )}
        </div>

        {/* Expand/collapse controls */}
        {expandableCount > 0 && (
          <div className="tree-controls">
            <button
              className="tree-control-btn"
              onClick={allExpanded ? collapseAll : expandAll}
              title={allExpanded ? 'צמצם הכל' : 'הרחב הכל'}
              type="button"
            >
              <span className="btn-icon">{allExpanded ? '▼' : '▶'}</span>
              <span className="btn-text">{allExpanded ? 'צמצם' : 'הרחב'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tree visualization */}
      <div className="tree-container" dir="rtl">
        {tree.map((node, idx) => (
          <TreeBranch
            key={node.id || idx}
            node={node}
            depth={0}
            onSelect={onSelect}
            selectedId={selectedPattern ? `${selectedPattern.type}-${selectedPattern.position}` : null}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>
    </div>
  );
});

const SugyaFlowSection = React.memo(function SugyaFlowSection({ text }) {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'flow' | 'list' | 'text'
  const [showOnlyDialectic, setShowOnlyDialectic] = useState(false);
  const scrollRef = useRef(null);

  // Detect patterns
  const patterns = useMemo(() => {
    if (!text) return [];
    return detectStructuralMarkers(text);
  }, [text]);

  // Filter to show only shakla v'tarya if enabled
  const displayedPatterns = useMemo(() => {
    if (!showOnlyDialectic) return patterns;
    const dialecticTypes = TYPE_CATEGORIES.dialectic.types;
    return patterns.filter(p => dialecticTypes.includes(p.type));
  }, [patterns, showOnlyDialectic]);

  // Calculate stats
  const stats = useMemo(() => {
    const grouped = {};
    patterns.forEach(p => {
      grouped[p.type] = (grouped[p.type] || 0) + 1;
    });
    return grouped;
  }, [patterns]);

  // Determine relationships between patterns (for connectors)
  const getRelationToNext = useCallback((current, next) => {
    if (!next) return null;
    if (['question', 'objection'].includes(current.type) && ['resolution', 'proof'].includes(next.type)) {
      return 'answer';
    }
    if (current.type === 'proof' && next.type === 'resolution') {
      return 'proof';
    }
    return null;
  }, []);

  const handlePatternClick = useCallback((pattern) => {
    setSelectedPattern(prev =>
      prev?.position === pattern.position ? null : pattern
    );
  }, []);

  // Scroll to selected pattern
  useEffect(() => {
    if (selectedPattern && scrollRef.current) {
      const element = scrollRef.current.querySelector(`[data-position="${selectedPattern.position}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPattern]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📜</div>
        <div className="empty-title">אין טקסט לניתוח</div>
        <p className="empty-text">
          נווט לדף בתלמוד כדי לראות את מהלך הסוגיא.
          <br />כלי זה מסייע בהבנת מבנה הדיון התלמודי.
        </p>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📜</div>
        <div className="empty-title">לא נמצאו סימני מבנה</div>
        <p className="empty-text">
          טקסט זה אינו מכיל סימני מבנה תלמודיים מוכרים.
        </p>
        <div className="empty-examples">
          <div className="example-title">סימנים נפוצים:</div>
          <div className="example-list">
            <span>מתני׳</span>
            <span>גמ׳</span>
            <span>תא שמע</span>
            <span>מתקיף</span>
            <span>איבעיא להו</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sugya-flow-section">
      {/* Summary */}
      <SugyaSummary stats={stats} />

      {/* Controls */}
      <div className="flow-controls">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => setViewMode('tree')}
            type="button"
            title="תצוגת עץ - קושיות ותירוצים"
          >
            <span className="btn-icon">🌳</span>
            <span className="btn-label">עץ</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'flow' ? 'active' : ''}`}
            onClick={() => setViewMode('flow')}
            type="button"
            title="תצוגת מהלך - ציר זמן"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">מהלך</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            type="button"
            title="תצוגת רשימה - טבלה"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-label">רשימה</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'text' ? 'active' : ''}`}
            onClick={() => setViewMode('text')}
            type="button"
            title="תצוגת טקסט - עם הדגשות"
          >
            <span className="btn-icon">📝</span>
            <span className="btn-label">טקסט</span>
          </button>
        </div>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={showOnlyDialectic}
            onChange={(e) => setShowOnlyDialectic(e.target.checked)}
          />
          <span className="toggle-label">שקלא וטריא בלבד</span>
        </label>
      </div>

      {/* Tree View - NEW: Shows Q&A as branching tree */}
      {viewMode === 'tree' && (
        <div className="tree-view-container">
          <SugyaTreeView
            patterns={displayedPatterns}
            onSelect={handlePatternClick}
            selectedPattern={selectedPattern}
          />

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Flow View */}
      {viewMode === 'flow' && (
        <div className="flow-view" ref={scrollRef}>
          <div className="flow-timeline">
            {displayedPatterns.map((pattern, index) => (
              <FlowNode
                key={`${pattern.type}-${pattern.position}`}
                pattern={pattern}
                index={index}
                isSelected={selectedPattern?.position === pattern.position}
                onClick={handlePatternClick}
                relationToNext={getRelationToNext(pattern, displayedPatterns[index + 1])}
                isPartOfChain={
                  ['question', 'objection'].includes(pattern.type) ||
                  ['resolution', 'proof'].includes(pattern.type)
                }
                data-position={pattern.position}
              />
            ))}
          </div>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="list-view">
          <table className="patterns-table" dir="rtl">
            <thead>
              <tr>
                <th>#</th>
                <th>סוג</th>
                <th>סימן</th>
                <th>הסבר</th>
              </tr>
            </thead>
            <tbody>
              {displayedPatterns.map((p, i) => {
                const config = TALMUDIC_PATTERNS[p.type];
                const isSelected = selectedPattern?.position === p.position;
                return (
                  <tr
                    key={i}
                    onClick={() => handlePatternClick(p)}
                    className={isSelected ? 'selected' : ''}
                  >
                    <td className="col-num">{i + 1}</td>
                    <td className="col-type">
                      <span className="type-badge" style={{ '--type-color': config?.color }}>
                        {config?.icon} {HEBREW_TYPE_LABELS[p.type] || p.type}
                      </span>
                    </td>
                    <td className="col-marker">{p.marker}</td>
                    <td className="col-label">{config?.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Text View with highlights */}
      {viewMode === 'text' && (
        <div className="text-view">
          <div className="highlighted-text" dir="rtl">
            <HighlightedSugyaText
              text={text}
              patterns={displayedPatterns}
              onPatternClick={handlePatternClick}
              selectedPattern={selectedPattern}
            />
          </div>

          {selectedPattern && (
            <PatternDetailCard
              pattern={selectedPattern}
              text={text}
              onClose={() => setSelectedPattern(null)}
            />
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flow-legend" dir="rtl">
        <div className="legend-title">מקרא:</div>
        <div className="legend-grid">
          {Object.entries(TYPE_CATEGORIES).map(([catKey, cat]) => (
            <div key={catKey} className="legend-category">
              <span className="category-label">{cat.label}</span>
              <div className="category-items">
                {cat.types.map(type => {
                  const config = TALMUDIC_PATTERNS[type];
                  if (!config) return null;
                  return (
                    <span key={type} className="legend-item" style={{ '--item-color': config.color }}>
                      <span className="item-icon">{config.icon}</span>
                      <span className="item-label">{HEBREW_TYPE_LABELS[type]}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// Highlighted text component
const HighlightedSugyaText = React.memo(function HighlightedSugyaText({
  text,
  patterns,
  onPatternClick,
  selectedPattern
}) {
  const segments = useMemo(() => {
    if (!patterns.length) return [{ type: 'text', content: text }];

    const result = [];
    let lastEnd = 0;
    const sorted = [...patterns].sort((a, b) => a.position - b.position);

    sorted.forEach(p => {
      if (p.position > lastEnd) {
        result.push({ type: 'text', content: text.slice(lastEnd, p.position) });
      }
      result.push({ type: 'pattern', pattern: p, content: text.slice(p.position, p.endPosition) });
      lastEnd = p.endPosition;
    });

    if (lastEnd < text.length) {
      result.push({ type: 'text', content: text.slice(lastEnd) });
    }

    return result;
  }, [text, patterns]);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.content}</span>;
        }
        const config = TALMUDIC_PATTERNS[seg.pattern.type];
        const isSelected = selectedPattern?.position === seg.pattern.position;
        return (
          <mark
            key={i}
            className={`sugya-highlight ${isSelected ? 'selected' : ''}`}
            style={{
              '--highlight-color': config?.color,
              backgroundColor: `${config?.color}${isSelected ? '40' : '15'}`,
              borderBottom: `2px solid ${config?.color}`
            }}
            onClick={() => onPatternClick(seg.pattern)}
            title={`${config?.icon} ${HEBREW_TYPE_LABELS[seg.pattern.type]}`}
          >
            {seg.content}
          </mark>
        );
      })}
    </>
  );
});

// =============================================================================
// Abbreviations Section - ראשי תיבות
// =============================================================================

const TYPE_ICONS = {
  name: '👤', source: '📜', proof: '✓', structure: '📑',
  attribution: '💬', question: '❓', school: '🏛️', teaching: '📚',
  ruling: '⚡', tractate: '📕', term: '🏷️', other: '📌'
};

const AbbreviationsSection = React.memo(function AbbreviationsSection({ text }) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['name']));
  const [selectedAbbr, setSelectedAbbr] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpanded, setShowExpanded] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const abbreviations = useMemo(() => {
    if (!text) return [];
    const found = findAbbreviations(text);
    const seen = new Set();
    return found.filter(abbr => {
      if (seen.has(abbr.abbreviation)) return false;
      seen.add(abbr.abbreviation);
      return true;
    });
  }, [text]);

  const filteredAbbreviations = useMemo(() => {
    if (!searchQuery.trim()) return abbreviations;
    const q = searchQuery.toLowerCase();
    return abbreviations.filter(abbr =>
      abbr.abbreviation.includes(searchQuery) ||
      abbr.expansion.includes(searchQuery) ||
      abbr.english.toLowerCase().includes(q)
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
    copy(`${abbr.abbreviation} = ${abbr.expansion}`);
  }, [copy]);

  // Group by type - memoized, must be before conditional return
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
      <div className="empty-state scholarly">
        <div className="empty-icon">א״ב</div>
        <div className="empty-title">לא נמצאו ראשי תיבות</div>
        <p className="empty-text">
          ראשי תיבות נפוצים יזוהו אוטומטית.
        </p>
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
    <div className="abbreviations-section scholarly">
      {/* Header */}
      <div className="abbr-header">
        <div className="header-title">
          <span className="title-icon">א״ב</span>
          <span className="title-text">ראשי תיבות</span>
          <span className="title-count">{filteredAbbreviations.length}</span>
        </div>

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
      {showExpanded && (
        <div className="expanded-text-box">
          <div className="box-header">טקסט עם פירוש ראשי תיבות:</div>
          <div className="box-content" dir="rtl">{expandedText}</div>
        </div>
      )}

      {/* No results */}
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
              <span className="group-icon">{TYPE_ICONS[type] || '📌'}</span>
              <span className="group-name">{type}</span>
              <span className="group-count">{items.length}</span>
              <span className="group-chevron">{expandedGroups.has(type) ? '▼' : '◀'}</span>
            </button>

            {expandedGroups.has(type) && (
              <div className="group-items">
                {items.map((abbr, i) => (
                  <div
                    key={i}
                    className={`abbr-item ${selectedAbbr === abbr ? 'selected' : ''}`}
                    onClick={() => setSelectedAbbr(selectedAbbr === abbr ? null : abbr)}
                    dir="rtl"
                  >
                    <span className="abbr-short">{abbr.abbreviation}</span>
                    <span className="abbr-arrow">←</span>
                    <span className="abbr-full">{abbr.expansion}</span>
                    <span className="abbr-english">{abbr.english}</span>
                    <button
                      className="copy-btn"
                      onClick={(e) => { e.stopPropagation(); handleCopyAbbr(abbr); }}
                      title="העתק"
                      type="button"
                    >
                      {copied ? '✓' : '📋'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected detail */}
      {selectedAbbr && (
        <div className="abbr-detail">
          <div className="detail-main" dir="rtl">
            <span className="detail-short">{selectedAbbr.abbreviation}</span>
            <span className="detail-eq">=</span>
            <span className="detail-full">{selectedAbbr.expansion}</span>
          </div>
          <div className="detail-english">{selectedAbbr.english}</div>
          <button className="detail-close" onClick={() => setSelectedAbbr(null)} type="button">×</button>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Study Mode Selector Component
// =============================================================================

const StudyModeSelector = React.memo(function StudyModeSelector({ currentMode, onModeChange }) {
  return (
    <div className="study-mode-selector" dir="rtl">
      <div className="mode-label">מצב לימוד:</div>
      <div className="mode-buttons">
        {Object.values(STUDY_MODES).map(mode => (
          <button
            key={mode.key}
            className={`mode-btn ${currentMode === mode.key ? 'active' : ''}`}
            onClick={() => onModeChange(mode.key)}
            style={{ '--mode-color': mode.color }}
            title={mode.description}
            type="button"
          >
            <span className="mode-icon">{mode.icon}</span>
            <span className="mode-text">{mode.hebrew}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// Chazara (Review) Questions Component - Auto-generated review questions
// =============================================================================

const CHAZARA_STORAGE_KEY = 'talmud_chazara_assessment';

const ChazaraQuestions = React.memo(function ChazaraQuestions({ patterns, text, sugyaKey }) {
  const [showAnswers, setShowAnswers] = useState({});

  // Persist self-assessment to localStorage
  const [selfAssessment, setSelfAssessment] = useState(() => {
    try {
      const stored = localStorage.getItem(CHAZARA_STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : {};
      return all[sugyaKey] || {};
    } catch {
      return {};
    }
  });

  // Save assessment when it changes
  useEffect(() => {
    if (!sugyaKey || Object.keys(selfAssessment).length === 0) return;
    try {
      const stored = localStorage.getItem(CHAZARA_STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : {};
      all[sugyaKey] = selfAssessment;
      // Limit storage to last 50 sugyot
      const keys = Object.keys(all);
      if (keys.length > 50) {
        keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
      }
      localStorage.setItem(CHAZARA_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save chazara assessment:', e);
    }
  }, [selfAssessment, sugyaKey]);

  // Generate review questions based on sugya structure
  const questions = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];

    const qs = [];
    const questionPatterns = patterns.filter(p => ['question', 'objection'].includes(p.type));
    const resolutionPatterns = patterns.filter(p => ['resolution', 'proof'].includes(p.type));
    const hasMishna = patterns.some(p => p.type === 'mishna');
    const hasGemara = patterns.some(p => p.type === 'gemara');

    // Question about main topic
    if (hasMishna) {
      qs.push({
        id: 'main_topic',
        question: 'מה הנושא העיקרי של המשנה?',
        hint: 'זהה את ההלכה או הדין שהמשנה דנה בו',
        type: 'comprehension',
        icon: '📚'
      });
    }

    // Question about shakla v'tarya
    if (questionPatterns.length > 0) {
      qs.push({
        id: 'questions_count',
        question: `מה השאלות/קושיות שעולות בסוגיא? (נמצאו ${questionPatterns.length})`,
        hint: 'שים לב לסימנים: מתקיף, איבעיא להו, ורמינהו',
        type: 'analysis',
        icon: '❓'
      });
    }

    // Question about resolution
    if (resolutionPatterns.length > 0) {
      qs.push({
        id: 'resolutions',
        question: 'איך הגמרא מתרצת את הקושיות?',
        hint: 'חפש: לא קשיא, הכי קאמר, אמר לך',
        type: 'analysis',
        icon: '✅'
      });
    }

    // Question about practical halacha
    if (hasGemara) {
      qs.push({
        id: 'halacha',
        question: 'מה המסקנה ההלכתית של הסוגיא?',
        hint: 'האם יש פסק מפורש? האם המחלוקת נשארת?',
        type: 'application',
        icon: '⚖️'
      });
    }

    // Chavruta discussion questions
    qs.push({
      id: 'svara',
      question: 'מה הסברא מאחורי הדין? למה דווקא כך?',
      hint: 'נסה להבין את ההגיון הפנימי, לא רק את התוצאה',
      type: 'chavruta',
      icon: '💡'
    });

    qs.push({
      id: 'nafka_mina',
      question: 'מה הנפקא מינה למעשה? איפה זה משנה?',
      hint: 'חפש מקרים פרקטיים שבהם יש הבדל',
      type: 'application',
      icon: '🎯'
    });

    return qs;
  }, [patterns]);

  const toggleAnswer = useCallback((id) => {
    setShowAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const markAssessment = useCallback((id, level) => {
    setSelfAssessment(prev => ({ ...prev, [id]: level }));
  }, []);

  if (questions.length === 0) {
    return (
      <div className="chazara-empty">
        <span className="empty-icon">📝</span>
        <span className="empty-text">אין שאלות חזרה - נווט לסוגיא כדי לקבל שאלות</span>
      </div>
    );
  }

  return (
    <div className="chazara-questions" dir="rtl">
      <div className="chazara-header">
        <span className="header-icon">🔄</span>
        <span className="header-title">שאלות לחזרה</span>
        <span className="header-count">{questions.length}</span>
      </div>

      <div className="questions-list">
        {questions.map((q, idx) => (
          <div key={q.id} className={`question-card type-${q.type}`}>
            <div className="question-header">
              <span className="q-num">{idx + 1}</span>
              <span className="q-icon">{q.icon}</span>
              <span className="q-type">{
                q.type === 'comprehension' ? 'הבנה' :
                q.type === 'analysis' ? 'ניתוח' :
                q.type === 'application' ? 'יישום' :
                'דיון'
              }</span>
            </div>

            <div className="question-body">
              <p className="question-text">{q.question}</p>

              <button
                className={`hint-toggle ${showAnswers[q.id] ? 'showing' : ''}`}
                onClick={() => toggleAnswer(q.id)}
                type="button"
              >
                {showAnswers[q.id] ? 'הסתר רמז' : 'הצג רמז'}
              </button>

              {showAnswers[q.id] && (
                <div className="hint-box">
                  <span className="hint-icon">💡</span>
                  <span className="hint-text">{q.hint}</span>
                </div>
              )}
            </div>

            <div className="self-assessment">
              <span className="assess-label">הבנתי?</span>
              <div className="assess-buttons">
                {[
                  { level: 1, icon: '❌', label: 'לא' },
                  { level: 2, icon: '🤔', label: 'חלקית' },
                  { level: 3, icon: '✅', label: 'כן' }
                ].map(a => (
                  <button
                    key={a.level}
                    className={`assess-btn ${selfAssessment[q.id] === a.level ? 'selected' : ''}`}
                    onClick={() => markAssessment(q.id, a.level)}
                    title={a.label}
                    type="button"
                  >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mastery summary */}
      <div className="mastery-summary">
        <span className="mastery-label">רמת שליטה:</span>
        <div className="mastery-bar">
          <div
            className="mastery-fill"
            style={{
              width: `${(Object.values(selfAssessment).filter(v => v === 3).length / questions.length) * 100}%`
            }}
          />
        </div>
        <span className="mastery-count">
          {Object.values(selfAssessment).filter(v => v === 3).length}/{questions.length}
        </span>
      </div>
    </div>
  );
});

// =============================================================================
// Study Notes Component - Personal notes and insights
// =============================================================================

const StudyNotesPanel = React.memo(function StudyNotesPanel({ sugyaKey, text }) {
  const [notes, saveNotes] = useStudyNotes(sugyaKey || 'default');
  const [masteryLevel, updateMastery] = useMasteryLevel(sugyaKey || 'default');
  const [newInsight, setNewInsight] = useState('');

  const handleNotesChange = useCallback((e) => {
    saveNotes({ ...notes, text: e.target.value });
  }, [notes, saveNotes]);

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

  return (
    <div className="study-notes-panel" dir="rtl">
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
          value={notes.text}
          onChange={handleNotesChange}
          dir="rtl"
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
          {[
            { level: 0, label: 'טרם למדתי', icon: '📖' },
            { level: 1, label: 'עברתי פעם', icon: '👀' },
            { level: 2, label: 'מבין בסיסי', icon: '🤔' },
            { level: 3, label: 'מבין היטב', icon: '💪' },
            { level: 4, label: 'שולט לגמרי', icon: '🎓' }
          ].map(m => (
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

// =============================================================================
// Bekius Summary - Quick overview for breadth learning
// =============================================================================

const BEKIUS_STORAGE_KEY = 'talmud_bekius_checklist';

const BekiusSummary = React.memo(function BekiusSummary({ patterns, text, sugyaKey }) {
  // Persist checklist state
  const [checklist, setChecklist] = useState(() => {
    try {
      const stored = localStorage.getItem(BEKIUS_STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : {};
      return all[sugyaKey] || {};
    } catch {
      return {};
    }
  });

  // Save checklist when it changes
  useEffect(() => {
    if (!sugyaKey || Object.keys(checklist).length === 0) return;
    try {
      const stored = localStorage.getItem(BEKIUS_STORAGE_KEY);
      const all = stored ? JSON.parse(stored) : {};
      all[sugyaKey] = checklist;
      // Limit to 50 entries
      const keys = Object.keys(all);
      if (keys.length > 50) {
        keys.slice(0, keys.length - 50).forEach(k => delete all[k]);
      }
      localStorage.setItem(BEKIUS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save bekius checklist:', e);
    }
  }, [checklist, sugyaKey]);

  const toggleCheck = useCallback((id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Extract key information for quick overview
  const summary = useMemo(() => {
    if (!patterns || patterns.length === 0) return null;

    const hasMishna = patterns.some(p => p.type === 'mishna');
    const hasGemara = patterns.some(p => p.type === 'gemara');
    const questionCount = patterns.filter(p => ['question', 'objection'].includes(p.type)).length;
    const legalRulings = patterns.filter(p => p.type === 'legal_ruling');

    return {
      hasMishna,
      hasGemara,
      questionCount,
      hasHalacha: legalRulings.length > 0,
      complexity: questionCount < 2 ? 'פשוטה' : questionCount < 5 ? 'בינונית' : 'מורכבת'
    };
  }, [patterns]);

  if (!summary) {
    return (
      <div className="bekius-empty">
        <span className="empty-icon">📖</span>
        <span className="empty-text">נווט לסוגיא כדי לקבל סיכום</span>
      </div>
    );
  }

  return (
    <div className="bekius-summary" dir="rtl">
      <div className="bekius-header">
        <span className="header-icon">📖</span>
        <span className="header-title">סיכום מהיר (בקיאות)</span>
      </div>

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
    </div>
  );
});

// =============================================================================
// Realia Browser - Detects and displays measures/currency from text
// =============================================================================

const RealiaBrowser = React.memo(function RealiaBrowser({ text }) {
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Import detectRealiaInText from RealiaPanel
  const detectedTerms = useMemo(() => {
    if (!text) return [];
    // Common Talmudic measures to search for
    const commonTerms = [
      'אמה', 'טפח', 'זרת', 'מיל', 'פרסה', 'ריס',
      'סאה', 'קב', 'לוג', 'רביעית', 'כור', 'איפה',
      'ככר', 'מנה', 'שקל', 'דינר', 'פרוטה', 'זוז', 'מעה',
      'ליטרא', 'סלע'
    ];
    const found = [];
    for (const term of commonTerms) {
      if (text.includes(term)) {
        found.push(term);
      }
    }
    return [...new Set(found)];
  }, [text]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">📏</div>
        <div className="empty-title">מידות ומטבעות</div>
        <p className="empty-text">נווט לטקסט תלמודי לזיהוי מידות, משקלות ומטבעות.</p>
      </div>
    );
  }

  return (
    <div className="realia-browser" dir="rtl">
      <div className="browser-header">
        <span className="header-icon">📏</span>
        <span className="header-title">מידות ומטבעות</span>
        {detectedTerms.length > 0 && (
          <span className="header-count">נמצאו {detectedTerms.length}</span>
        )}
      </div>

      {/* Search input */}
      <div className="browser-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש מידה או מטבע..."
          className="search-input"
          dir="rtl"
        />
      </div>

      {/* Detected terms from text */}
      {detectedTerms.length > 0 && (
        <div className="detected-section">
          <div className="section-title">נמצא בטקסט:</div>
          <div className="term-chips">
            {detectedTerms.map((term, i) => (
              <button
                key={i}
                className={`term-chip ${selectedTerm === term ? 'active' : ''}`}
                onClick={() => setSelectedTerm(selectedTerm === term ? null : term)}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected term panel */}
      {selectedTerm && (
        <Suspense fallback={<LazyLoadFallback />}>
          <RealiaPanel
            term={selectedTerm}
            onClose={() => setSelectedTerm(null)}
            onTermClick={(term) => setSelectedTerm(term)}
            compact={false}
          />
        </Suspense>
      )}

      {/* Quick reference if no selection */}
      {!selectedTerm && (
        <div className="quick-reference">
          <div className="ref-section">
            <div className="ref-title">💰 מטבעות</div>
            <div className="ref-list">
              {['פרוטה', 'מעה', 'איסר', 'דינר', 'שקל', 'מנה', 'ככר'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">📏 אורך</div>
            <div className="ref-list">
              {['אצבע', 'טפח', 'זרת', 'אמה', 'מיל', 'פרסה'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">🫗 נפח</div>
            <div className="ref-list">
              {['רביעית', 'לוג', 'קב', 'סאה', 'כור'].map(term => (
                <button key={term} className="ref-btn" onClick={() => setSelectedTerm(term)}>{term}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Rabbi Browser - Detects and displays sage biographies from text
// =============================================================================

const RabbiBrowser = React.memo(function RabbiBrowser({ text }) {
  const [selectedRabbi, setSelectedRabbi] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Detect rabbi names in text
  const detectedRabbis = useMemo(() => {
    if (!text) return [];
    // Common rabbi name patterns
    const patterns = [
      /רבי\s+[\u0590-\u05FF]+/g,
      /רב\s+[\u0590-\u05FF]+/g,
      /ר׳\s+[\u0590-\u05FF]+/g,
      /רבן\s+[\u0590-\u05FF]+/g,
      /אביי/g, /רבא/g, /רבינא/g, /רב אשי/g,
      /הלל/g, /שמאי/g, /עקיבא/g
    ];
    const found = new Set();
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => found.add(m.trim()));
      }
    }
    return [...found].slice(0, 10); // Limit to first 10
  }, [text]);

  if (!text) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">👤</div>
        <div className="empty-title">חכמי התלמוד</div>
        <p className="empty-text">נווט לטקסט תלמודי לזיהוי שמות חכמים ותולדותיהם.</p>
      </div>
    );
  }

  return (
    <div className="rabbi-browser" dir="rtl">
      <div className="browser-header">
        <span className="header-icon">👤</span>
        <span className="header-title">חכמי התלמוד</span>
        {detectedRabbis.length > 0 && (
          <span className="header-count">נמצאו {detectedRabbis.length}</span>
        )}
      </div>

      {/* Search input */}
      <div className="browser-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              setSelectedRabbi(searchQuery.trim());
            }
          }}
          placeholder="חפש חכם..."
          className="search-input"
          dir="rtl"
        />
        <button
          className="search-btn"
          onClick={() => searchQuery.trim() && setSelectedRabbi(searchQuery.trim())}
        >
          🔍
        </button>
      </div>

      {/* Detected rabbis from text */}
      {detectedRabbis.length > 0 && (
        <div className="detected-section">
          <div className="section-title">נמצא בטקסט:</div>
          <div className="rabbi-chips">
            {detectedRabbis.map((rabbi, i) => (
              <button
                key={i}
                className={`rabbi-chip ${selectedRabbi === rabbi ? 'active' : ''}`}
                onClick={() => setSelectedRabbi(selectedRabbi === rabbi ? null : rabbi)}
              >
                {rabbi}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected rabbi panel */}
      {selectedRabbi && (
        <Suspense fallback={<LazyLoadFallback />}>
          <RabbiInfoPanel
            rabbiName={selectedRabbi}
            onClose={() => setSelectedRabbi(null)}
            onNavigate={(name) => setSelectedRabbi(name)}
            compact={false}
          />
        </Suspense>
      )}

      {/* Quick reference if no selection */}
      {!selectedRabbi && detectedRabbis.length === 0 && (
        <div className="quick-reference">
          <div className="ref-section">
            <div className="ref-title">📜 תנאים</div>
            <div className="ref-list">
              {['הלל', 'שמאי', 'רבי עקיבא', 'רבי מאיר', 'רבי יהודה'].map(name => (
                <button key={name} className="ref-btn" onClick={() => setSelectedRabbi(name)}>{name}</button>
              ))}
            </div>
          </div>
          <div className="ref-section">
            <div className="ref-title">📖 אמוראים</div>
            <div className="ref-list">
              {['אביי', 'רבא', 'רב', 'שמואל', 'רבינא', 'רב אשי'].map(name => (
                <button key={name} className="ref-btn" onClick={() => setSelectedRabbi(name)}>{name}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Main TalmudToolsTab Component
// =============================================================================

const TalmudToolsTab = React.memo(function TalmudToolsTab({ text, reference }) {
  const [activeView, setActiveView] = useState('flow');
  const [studyMode, setStudyMode] = useState('iyun');

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

      {/* Study Mode Selector - Top banner */}
      <StudyModeSelector currentMode={studyMode} onModeChange={setStudyMode} />

      {/* Mode description */}
      <div className="mode-description">
        <span className="mode-current-icon">{STUDY_MODES[studyMode].icon}</span>
        <span className="mode-current-text">{STUDY_MODES[studyMode].description}</span>
      </div>

      {/* Content based on study mode */}
      {studyMode === 'iyun' && (
        <>
          {/* Iyun Mode - Deep Analysis */}
          <div className="tab-toggle">
            <button
              className={`tab-btn ${activeView === 'flow' ? 'active' : ''}`}
              onClick={() => setActiveView('flow')}
              type="button"
            >
              <span className="tab-icon">📊</span>
              <span className="tab-label">מהלך הסוגיא</span>
              {patternsCount > 0 && <span className="tab-badge">{patternsCount}</span>}
            </button>
            <button
              className={`tab-btn ${activeView === 'citations' ? 'active' : ''}`}
              onClick={() => setActiveView('citations')}
              type="button"
            >
              <span className="tab-icon">📖</span>
              <span className="tab-label">מקורות</span>
            </button>
            <button
              className={`tab-btn ${activeView === 'abbr' ? 'active' : ''}`}
              onClick={() => setActiveView('abbr')}
              type="button"
            >
              <span className="tab-icon">א״ב</span>
              <span className="tab-label">ראשי תיבות</span>
              {abbreviationsCount > 0 && <span className="tab-badge">{abbreviationsCount}</span>}
            </button>
            <button
              className={`tab-btn ${activeView === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveView('notes')}
              type="button"
            >
              <span className="tab-icon">📝</span>
              <span className="tab-label">הערות</span>
            </button>
            <button
              className={`tab-btn ${activeView === 'realia' ? 'active' : ''}`}
              onClick={() => setActiveView('realia')}
              type="button"
            >
              <span className="tab-icon">📏</span>
              <span className="tab-label">מידות</span>
            </button>
            <button
              className={`tab-btn ${activeView === 'rabbis' ? 'active' : ''}`}
              onClick={() => setActiveView('rabbis')}
              type="button"
            >
              <span className="tab-icon">👤</span>
              <span className="tab-label">חכמים</span>
            </button>
          </div>

          <div className="tab-content">
            {activeView === 'flow' && <SugyaFlowSection text={text} />}
            {activeView === 'citations' && (
              <Suspense fallback={<LazyLoadFallback />}>
                <CitationHighlighter text={text} reference={reference} />
              </Suspense>
            )}
            {activeView === 'abbr' && <AbbreviationsSection text={text} />}
            {activeView === 'notes' && <StudyNotesPanel sugyaKey={sugyaKey} text={text} />}
            {activeView === 'realia' && (
              <Suspense fallback={<LazyLoadFallback />}>
                <RealiaBrowser text={text} />
              </Suspense>
            )}
            {activeView === 'rabbis' && (
              <Suspense fallback={<LazyLoadFallback />}>
                <RabbiBrowser text={text} />
              </Suspense>
            )}
          </div>
        </>
      )}

      {studyMode === 'bekius' && (
        <>
          {/* Bekius Mode - Quick Overview */}
          <BekiusSummary patterns={patterns} text={text} sugyaKey={sugyaKey} />

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
              <AbbreviationsSection text={text} />
            </div>
          )}
        </>
      )}

      {studyMode === 'chazara' && (
        <>
          {/* Chazara Mode - Review & Self-Test */}
          <ChazaraQuestions patterns={patterns} text={text} sugyaKey={sugyaKey} />

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
              <StudyNotesPanel sugyaKey={sugyaKey} text={text} />
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

export default TalmudToolsTab;
