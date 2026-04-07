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
import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { findAbbreviations } from '../../services/talmudicAbbreviationsService';
import { sanitizeHtmlContent } from '../../utils/safeHtml';

// =============================================================================
// SHARED CONSTANTS & HOOKS (Single Source of Truth - PRO SCHOLAR V31)
// =============================================================================
import {
  HEBREW_TYPE_LABELS,
  TEXT_TYPE_LABELS,  // DRY: shared text type labels
  STUDY_MODES,
  TYPE_CATEGORIES,
  IYUN_ANALYSIS_PATTERNS,
  parseDafReference,
  parseReference,
  stripNikud as stripNikudLocal,
  stripHtmlTags
} from '../../constants/talmudStudy';
import { useCopyToClipboard } from '../../hooks/useTalmudStudy';

// =============================================================================
// IMPORTED FROM UnifiedSugyaAnalysis (Source of Truth)
// =============================================================================
import {
  AbbreviationsPanel,   // ראשי תיבות expansion with search and grouping
  NotesPanel,           // Personal insights with mastery level tracking
  ChazaraPanel,         // Review mode with self-test questions
  BekiusQuickSummary,   // Quick overview checklist for breadth learning
  MishnaAnalysisPro,    // PRO V31: Consolidated Mishna analysis (3 views: quick/grouped/deep)
  GemaraQAAnalysisPro,  // PRO V31: Consolidated Gemara Q&A (3 views: quick/tree/deep)
  RashiTosafotAnalysisPro // PRO V31: Rashi & Tosafot panel (3 views: quick/split/deep)
} from './UnifiedSugyaAnalysis';
import {
  detectStructuralMarkers,
  TALMUDIC_PATTERNS,
  extractGemaraQA  // Used by IyunDeepAnalysisPanel
} from '../../services/discoursePatternService';
// PRO SCHOLAR V14: Enhanced sage detection with RABBI_DATABASE
import { detectRabbis, RABBI_DATABASE } from '../../services/namedEntityService';
// PRO SCHOLAR V12: Deterministic Talmud diagram generation (no AI)
import { generateDafDiagram, DIAGRAM_TYPES } from '../../services/talmudDiagramService';
// PRO SCHOLAR V22: Smart Sugya loading until resolution
import { getFullSugya, getFullSugyaUntilResolution, getTalmudDaf } from '../../services/sefariaApi';

// PRO SCHOLAR V12: Mermaid diagram visualization
const MermaidDiagram = lazy(() => import('../commentary/CommentarySummary/MermaidDiagram'));
// PRO SCHOLAR V6: Sage biographies and historical context panels
const RabbiInfoPanel = lazy(() => import('./RabbiInfoPanel'));
const RealiaPanel = lazy(() => import('./RealiaPanel'));

// PRO SCHOLAR V27: Import the powerful UnifiedSugyaAnalysis module
// This replaces the internal simplified version with full scholarly analysis
const UnifiedSugyaAnalysisPro = lazy(() => import('./UnifiedSugyaAnalysis'));

// Loading fallback for lazy components
const LazyLoadFallback = () => (
  <div className="lazy-load-skeleton">
    <div className="skeleton-bar" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
    <div className="skeleton-bar" style={{ width: '70%', height: '16px' }} />
  </div>
);

// =============================================================================
// NOTE: Constants moved to ../../constants/talmudStudy.js (PRO SCHOLAR V31)
// HEBREW_TYPE_LABELS, TYPE_CATEGORIES, STUDY_MODES imported from shared file
// =============================================================================

// =============================================================================
// NOTE: MASECHTA_HEBREW, parseDafReference, useCopyToClipboard moved to shared files
// (PRO SCHOLAR V31) - imported from ../../constants/talmudStudy.js and ../../hooks/useTalmudStudy.js
// =============================================================================

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
          {/* PRO SCHOLAR V23: Show context after marker */}
          {pattern.context && (
            <div className="node-context-preview">{pattern.context}</div>
          )}
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

// =============================================================================
// PRO RESERVED COMPONENTS
// Advanced visualization components kept for future scholar features.
// Not currently rendered but fully functional - ready for activation.
// =============================================================================

/**
 * @active SugyaFlowSection
 * Full-page sugya structure visualization with multiple view modes.
 * - Tree view: Hierarchical pattern display
 * - Flow view: Linear argumentation flow
 * - List view: Compact pattern listing
 * - Text view: Highlighted source text
 * Includes dialectic-only filter (שקלא וטריא) and pattern stats.
 * @param {string} text - Talmud text to analyze
 */
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

// NOTE: GemaraQAPanel REMOVED - replaced by GemaraQAAnalysisPro (V31)
// NOTE: MishnaAnalysisPanel REMOVED - replaced by MishnaAnalysisPro (V31)

// =============================================================================
// PRO SCHOLAR V25: UNIFIED SUGYA ANALYSIS - Enhanced Scholarly Interface
// Complete Gemara learning: Mishna summary -> Q&A flow -> Resolution
// =============================================================================

/**
 * @reserved StatBadge
 * Compact clickable badge showing count with emoji icon.
 * Used in stats bars to display pattern counts (questions, proofs, etc).
 * Auto-hides when value is 0 (except for progress type).
 * @param {string} icon - Emoji icon to display
 * @param {number} value - Count to show
 * @param {string} label - Tooltip text
 * @param {string} type - Badge style type
 * @param {boolean} active - Highlight state
 */
const StatBadge = React.memo(function StatBadge({ icon, value, label, type, active, onClick }) {
  if (value === 0 && type !== 'progress') return null;
  return (
    <button
      className={`stat-badge stat-${type} ${active ? 'active' : ''}`}
      title={label}
      onClick={onClick}
      type="button"
    >
      <span className="stat-icon">{icon}</span>
      <span className="stat-value">{value}</span>
    </button>
  );
});

/**
 * @reserved CollapsibleSection
 * Expandable accordion section with header, icon, and content area.
 * Shows summary preview when collapsed, full content when expanded.
 * Supports custom accent colors and optional count badge.
 * @param {string} id - Section identifier
 * @param {string} icon - Header icon
 * @param {string} title - Section title
 * @param {number} count - Optional count badge
 * @param {boolean} isOpen - Expanded state
 * @param {function} onToggle - Toggle callback
 * @param {string} summary - Preview text when collapsed
 */
const CollapsibleSection = React.memo(function CollapsibleSection({
  id, icon, title, count, isOpen, onToggle, children, badge, accentColor, summary
}) {
  return (
    <div
      className={`sugya-section pro-v25 ${isOpen ? 'open' : 'collapsed'}`}
      style={{ '--section-accent': accentColor || '#6366f1' }}
    >
      <button
        className="section-header pro"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        type="button"
      >
        <div className="header-left">
          <span className="section-chevron">{isOpen ? '▼' : '◀'}</span>
          <span className="section-icon">{icon}</span>
          <span className="section-title">{title}</span>
        </div>
        <div className="header-right">
          {summary && !isOpen && <span className="section-summary">{summary}</span>}
          {badge && <span className="section-badge">{badge}</span>}
          {count > 0 && <span className="section-count">{count}</span>}
        </div>
      </button>
      <div className={`section-content ${isOpen ? 'expanded' : ''}`}>
        {children}
      </div>
    </div>
  );
});

// NOTE: MishnaBreakdown REMOVED - replaced by MishnaAnalysisPro (V31)
// NOTE: QAFlowTree REMOVED - replaced by GemaraQAAnalysisPro (V31)

// =============================================================================
// PRO SCHOLAR V27: IYUN DEEP ANALYSIS PANEL
// Extracts sevara (logical reasoning), key questions, and learning prompts
// NOTE: IYUN_ANALYSIS_PATTERNS and IYUN_PROMPTS imported from ../../constants/talmudStudy.js
// =============================================================================

// =============================================================================
// ACTIVE COMPONENTS - Currently rendered in study mode UI
// =============================================================================

/**
 * @active IyunDeepAnalysisPanel
 * Deep analysis panel for עיון (iyun) study mode.
 * Extracts and displays:
 * - סברא (sevara): Logical reasoning patterns
 * - חילוקים (distinctions): Key differentiations
 * - הנחות (assumptions): Underlying premises
 * - נקודות מפתח (key points): Critical concepts
 * Includes thinking prompts for chavruta discussion.
 * @param {string} text - Talmud text to analyze
 * @param {Object} qaFlow - Q&A flow data (optional)
 * @param {Array} patterns - Detected discourse patterns
 */
const IyunDeepAnalysisPanel = React.memo(function IyunDeepAnalysisPanel({ text, qaFlow, patterns }) {
  const [expandedSection, setExpandedSection] = useState('sevara');

  // Extract sevara and logical elements
  const analysis = useMemo(() => {
    if (!text) return { sevara: [], distinctions: [], assumptions: [], keyPoints: [] };

    const result = {
      sevara: [],
      distinctions: [],
      assumptions: [],
      keyPoints: []
    };

    // Find sevara patterns
    IYUN_ANALYSIS_PATTERNS.sevara.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const idx = text.indexOf(m);
          const context = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + 80));
          result.sevara.push({ marker: m, label, type, context: context.trim() });
        });
      }
    });

    // Find distinctions
    IYUN_ANALYSIS_PATTERNS.distinction.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const idx = text.indexOf(m);
          const context = text.slice(Math.max(0, idx - 15), Math.min(text.length, idx + 60));
          result.distinctions.push({ marker: m, label, type, context: context.trim() });
        });
      }
    });

    // Find assumptions
    IYUN_ANALYSIS_PATTERNS.assumption.forEach(({ pattern, label, type }) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => {
          result.assumptions.push({ marker: m, label, type });
        });
      }
    });

    // Extract key points from Q&A flow
    if (qaFlow?.flow) {
      qaFlow.flow.forEach((unit, i) => {
        if (unit.question) {
          result.keyPoints.push({
            type: 'question',
            text: unit.question.marker?.substring(0, 60),
            resolved: !!unit.resolution
          });
        }
      });
    }

    return result;
  }, [text, qaFlow]);

  const totalInsights = analysis.sevara.length + analysis.distinctions.length + analysis.assumptions.length;

  if (totalInsights === 0 && analysis.keyPoints.length === 0) {
    return null;
  }

  return (
    <div className="iyun-deep-panel-compact" dir="rtl">
      <div className="iyun-header-compact">
        <span>🔬</span>
        <span>עיון מעמיק</span>
        <span className="insights-count">{totalInsights}</span>
      </div>

      {/* Analysis sections */}
      <div className="iyun-sections">
        {/* Sevara - Logical Reasoning */}
        {analysis.sevara.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'sevara' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'sevara' ? null : 'sevara')}
              type="button"
            >
              <span className="section-icon">💡</span>
              <span className="section-title">סברות וטעמים</span>
              <span className="section-count">{analysis.sevara.length}</span>
              <span className="section-chevron">{expandedSection === 'sevara' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'sevara' && (
              <div className="section-content">
                {analysis.sevara.map((item, i) => (
                  <div key={i} className="insight-item sevara">
                    <span className="insight-label">{item.label}</span>
                    <span className="insight-context">{item.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Distinctions - הבחנות */}
        {analysis.distinctions.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'distinctions' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'distinctions' ? null : 'distinctions')}
              type="button"
            >
              <span className="section-icon">⚖️</span>
              <span className="section-title">הבחנות ותירוצים</span>
              <span className="section-count">{analysis.distinctions.length}</span>
              <span className="section-chevron">{expandedSection === 'distinctions' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'distinctions' && (
              <div className="section-content">
                {analysis.distinctions.map((item, i) => (
                  <div key={i} className="insight-item distinction">
                    <span className="insight-label">{item.label}</span>
                    <span className="insight-context">{item.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Key Q&A Points */}
        {analysis.keyPoints.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'keypoints' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'keypoints' ? null : 'keypoints')}
              type="button"
            >
              <span className="section-icon">❓</span>
              <span className="section-title">שאלות מפתח</span>
              <span className="section-count">{analysis.keyPoints.length}</span>
              <span className="section-chevron">{expandedSection === 'keypoints' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'keypoints' && (
              <div className="section-content">
                {analysis.keyPoints.map((point, i) => (
                  <div key={i} className={`insight-item keypoint ${point.resolved ? 'resolved' : 'open'}`}>
                    <span className="keypoint-status">{point.resolved ? '✅' : '❓'}</span>
                    <span className="keypoint-text">{point.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assumptions */}
        {analysis.assumptions.length > 0 && (
          <div className={`iyun-section ${expandedSection === 'assumptions' ? 'expanded' : ''}`}>
            <button
              className="section-header"
              onClick={() => setExpandedSection(expandedSection === 'assumptions' ? null : 'assumptions')}
              type="button"
            >
              <span className="section-icon">🎯</span>
              <span className="section-title">הנחות וחידושים</span>
              <span className="section-count">{analysis.assumptions.length}</span>
              <span className="section-chevron">{expandedSection === 'assumptions' ? '▼' : '◀'}</span>
            </button>
            {expandedSection === 'assumptions' && (
              <div className="section-content">
                {analysis.assumptions.map((item, i) => (
                  <div key={i} className="insight-item assumption">
                    <span className="insight-marker">{item.marker}</span>
                    <span className="insight-label">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

  // PRO SCHOLAR V14: Enhanced rabbi detection using namedEntityService
  const detectedRabbis = useMemo(() => {
    if (!text) return [];

    // Strip nikud for better matching (use imported stripNikudLocal from talmudStudy)
    const cleanText = stripNikudLocal(text);

    // Use the proper detectRabbis function from namedEntityService
    const detected = detectRabbis(cleanText);

    // Also do fallback pattern matching for names not in database
    const fallbackPatterns = [
      // Multi-word rabbi names: רבי X בן/בר Y
      /(?:רבי|רב|ר'|ר׳|רבן)\s+[\u0590-\u05FF]+(?:\s+(?:בן|בר|ב"ר|ב״ר)\s+[\u0590-\u05FF]+)?/g,
      // Famous Amoraim without title
      /\b(?:אביי|רבא|רבינא|אמימר|מר זוטרא|רבה|רב אשי|רב פפא|רב הונא|רב נחמן|רב יהודה|רב חסדא|רב ששת|שמואל)\b/g,
      // Schools
      /בית (?:הלל|שמאי)/g,
      // Tannaim
      /\b(?:הלל|שמאי|עקיבא|ישמעאל|טרפון|מאיר|יהודה|יוסי|שמעון)\b/g
    ];

    const foundNames = new Map(); // Use Map to dedupe and keep metadata

    // Add results from detectRabbis (has full metadata)
    detected.forEach(r => {
      const key = r.hebrew || r.english;
      if (key && !foundNames.has(key)) {
        foundNames.set(key, {
          name: key,
          english: r.english,
          period: r.period,
          generation: r.generation,
          location: r.location,
          note: r.note
        });
      }
    });

    // Add fallback pattern matches
    for (const pattern of fallbackPatterns) {
      const matches = cleanText.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const trimmed = m.trim();
          if (trimmed && !foundNames.has(trimmed)) {
            // Check if this name is in RABBI_DATABASE for metadata
            const allRabbis = { ...RABBI_DATABASE.tannaim, ...RABBI_DATABASE.amoraim };
            const dbEntry = allRabbis[trimmed];
            foundNames.set(trimmed, {
              name: trimmed,
              english: dbEntry?.name || null,
              period: dbEntry?.period || null,
              generation: dbEntry?.generation || null,
              location: dbEntry?.location || null,
              note: dbEntry?.note || null
            });
          }
        });
      }
    }

    // Convert to array and sort by period (Tannaim first, then Amoraim)
    return [...foundNames.values()]
      .sort((a, b) => {
        const periodOrder = { tanna: 0, amora: 1 };
        const aOrder = periodOrder[a.period] ?? 2;
        const bOrder = periodOrder[b.period] ?? 2;
        return aOrder - bOrder;
      })
      .slice(0, 15); // Limit to 15 sages
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
          <div className="section-title">נמצא בטקסט ({detectedRabbis.length}):</div>
          <div className="rabbi-chips">
            {detectedRabbis.map((rabbi, i) => {
              const rabbiName = typeof rabbi === 'string' ? rabbi : rabbi.name;
              const isSelected = selectedRabbi &&
                (typeof selectedRabbi === 'string' ? selectedRabbi === rabbiName : selectedRabbi.name === rabbiName);
              const period = typeof rabbi === 'object' ? rabbi.period : null;
              return (
                <button
                  key={rabbiName || i}
                  className={`rabbi-chip ${isSelected ? 'active' : ''} ${period ? `period-${period}` : ''}`}
                  onClick={() => setSelectedRabbi(isSelected ? null : rabbi)}
                  title={typeof rabbi === 'object' && rabbi.english ? rabbi.english : ''}
                >
                  {rabbiName}
                  {period && <span className="period-badge">{period === 'tanna' ? 'ת' : 'א'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected rabbi panel */}
      {selectedRabbi && (
        <Suspense fallback={<LazyLoadFallback />}>
          <RabbiInfoPanel
            rabbiName={typeof selectedRabbi === 'string' ? selectedRabbi : selectedRabbi.name}
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
// PRO SCHOLAR V19: Complete Mishna + Gemara Summary with Full Sugya Loading
// Works dynamically for ANY Gemara page - Loads extended content
// NOTE: stripNikudLocal, stripHtmlTags, parseReference imported from ../../constants/talmudStudy.js
// =============================================================================

const ProScholarSummary = React.memo(function ProScholarSummary({ text, reference }) {
  // State for full sugya loading
  const [sugyaData, setSugyaData] = useState(null);
  const [sugyaLoading, setSugyaLoading] = useState(false);
  const [sugyaError, setSugyaError] = useState(null);
  const [sugyaExpanded, setSugyaExpanded] = useState(false);

  // PRO SCHOLAR V23: Auto-fetch FULL SUGYA (multiple pages) when Gemara content is incomplete
  const [fullText, setFullText] = useState(text);
  const [fetchingFullText, setFetchingFullText] = useState(false);

  // Parse reference for sugya loading
  const parsedRef = useMemo(() => parseReference(reference), [reference]);

  // PRO SCHOLAR V23: Auto-fetch FULL SUGYA (multiple pages) when Gemara is incomplete
  useEffect(() => {
    if (!parsedRef || !text) return;

    // Check if text likely has incomplete Gemara (look for short Gemara section)
    const cleanText = stripNikudLocal(text.replace(/<[^>]+>/g, ''));
    const hasGemaraMarker = /גמ[׳']|גמרא|תנן\s+התם|אמר\s+רב/.test(cleanText);

    // If we have Gemara markers but text is short (< 3000 chars), likely incomplete
    // A single page is ~1200 chars, but full Gemara discussions span 4-8+ pages
    if (hasGemaraMarker && cleanText.length < 3000) {
      console.log('[ProScholar V23] Detected incomplete Gemara, fetching FULL SUGYA (4 pages)...');
      setFetchingFullText(true);

      // PRO SCHOLAR V23: Use getFullSugya to fetch 4 consecutive pages (2 full leaves)
      // This ensures we get the complete Gemara discussion, not just the first page
      getFullSugya(parsedRef.tractate, parsedRef.daf, 4)
        .then(result => {
          // getFullSugya returns fullHebrewText (combined string) and hebrew (array)
          const combined = result.fullHebrewText || result.hebrew?.join(' ') || '';
          if (combined.length > cleanText.length) {
            console.log(`[ProScholar V23] Fetched full sugya: ${combined.length} chars from ${result.pageCount || 4} pages (was ${cleanText.length})`);
            setFullText(combined);
          } else {
            console.log('[ProScholar V23] No additional content from sugya fetch');
            setFullText(text);
          }
          setFetchingFullText(false);
        })
        .catch(err => {
          console.error('[ProScholar V23] Failed to fetch full sugya:', err);
          setFetchingFullText(false);
          setFullText(text); // Fallback to original text on error
        });
    } else {
      setFullText(text);
    }
  }, [parsedRef, text]);

  // PRO SCHOLAR V22: Smart sugya loading until Gemara resolves the Mishna
  const loadFullSugya = useCallback(async (useSmartLoading = true) => {
    if (!parsedRef) {
      setSugyaError('לא ניתן לזהות מסכת ודף');
      return;
    }

    setSugyaLoading(true);
    setSugyaError(null);

    try {
      // Use smart loading by default - loads until resolution or next Mishna
      const data = useSmartLoading
        ? await getFullSugyaUntilResolution(parsedRef.tractate, parsedRef.daf, 8) // Up to 8 pages
        : await getFullSugya(parsedRef.tractate, parsedRef.daf, 4); // Legacy: fixed 4 pages

      setSugyaData(data);
      setSugyaExpanded(true);

      // Log loading status
      if (data.status) {
        const statusMessages = {
          'resolved': 'נמצא תירוץ/מסקנה',
          'next_mishna': 'נמצאה משנה הבאה',
          'max_pages': 'הגיע למקסימום דפים',
          'incomplete': 'טעינה חלקית'
        };
        console.log(`[ProScholar V22] Loaded sugya: ${data.ref} | Status: ${statusMessages[data.status] || data.status} | ${data.segments?.length || 0} segments`);
      }
    } catch (err) {
      console.error('[ProScholar V22] Failed to load sugya:', err);
      setSugyaError(err.message || 'שגיאה בטעינת הסוגיה');
    } finally {
      setSugyaLoading(false);
    }
  }, [parsedRef]);
  // COMPREHENSIVE text analysis - follows scholarly template
  // PRO SCHOLAR V22: Uses fullText state which may be auto-fetched from Sefaria
  const analysis = useMemo(() => {
    const textToAnalyze = fullText || text;
    if (!textToAnalyze || textToAnalyze.length < 30) return null;

    // Clean text: strip HTML tags AND nikud
    const rawCleanText = stripHtmlTags(textToAnalyze);
    const cleanText = stripNikudLocal(rawCleanText);

    // =========================================================================
    // FULL TEXT (cleaned for display) - COMPLETE, NO TRUNCATION
    // =========================================================================
    const displayFullText = rawCleanText; // Complete text for display

    // PRO SCHOLAR V21: Enhanced Gemara detection - check for explicit markers AND discourse patterns
    // Many Gemara sections don't have "גמ'" marker but start with Aramaic discourse
    const hasExplicitGemaraMarker = /גמ[׳']|גמרא/.test(cleanText);
    const hasGemaraDiscoursePatterns = /תנן\s+התם|אמר\s+רב|אמר\s+ר[׳']|תנו\s+רבנן|תניא|מאי\s+[א-ת]|פשיטא|איבעיא|מנא\s+הני|מנלן|היכי\s+דמי|תא\s+שמע|מיתיבי|והתניא|אמר\s+אביי|אמר\s+רבא|למימרא|אלא\s+מעתה/.test(cleanText);
    const hasGemaraMarker = hasExplicitGemaraMarker || hasGemaraDiscoursePatterns;
    const isMishnaOnly = !hasGemaraMarker;

    // =========================================================================
    // SECTION 1: MISHNA STRUCTURED SUMMARY
    // =========================================================================
    const mishna = {
      content: null,
      fullContent: null,        // Full mishna text for display
      topic: null,              // What is being discussed
      caseDetails: {
        who: [],                // Actors involved
        what: null,             // The action/situation
        conditions: []          // Conditions/circumstances
      },
      ruling: {
        decision: null,         // Final ruling
        author: null,           // Who says it (Tanna/anonymous/dispute)
        isDispute: false
      },
      keyPrinciple: null,       // Main extracted principle
      oneLine: null,            // One-line summary
      structureType: null,      // enumeration, conditional, etc.
      cases: [],                // Multiple cases/scenarios in the Mishna
      numbers: []               // Numbers mentioned (שתים, ארבע, etc.)
    };

    // =========================================================================
    // SECTION 2: GEMARA QUESTIONS ON MISHNA
    // =========================================================================
    const gemaraQuestions = [];  // List of all questions

    // =========================================================================
    // SECTION 3: GEMARA STEP-BY-STEP FLOW
    // =========================================================================
    const sugyaSteps = [];       // Array of {type, content, explanation}

    // =========================================================================
    // SECTION 4: OPINIONS (If Multiple)
    // =========================================================================
    const opinions = [];         // Array of {name, position, reason}
    let mainDifference = null;   // What exactly they argue about

    // =========================================================================
    // SECTION 5: CORE LOGIC
    // =========================================================================
    let coreLogic = {
      principle: null,
      distinction: null,
      reasoning: null
    };

    // =========================================================================
    // SECTION 6: CONNECTION BACK TO MISHNA
    // =========================================================================
    let mishnaConnection = {
      type: null,               // explains, limits, expands, reinterprets
      description: null
    };

    // =========================================================================
    // SECTION 7: HALACHIC TAKEAWAY
    // =========================================================================
    let halachicTakeaway = {
      rule: null,
      whenApplies: null,
      whenNot: null
    };

    // =========================================================================
    // ADDITIONAL DATA
    // =========================================================================
    const result = {
      mishna,
      gemaraQuestions,
      sugyaSteps,
      opinions,
      mainDifference,
      coreLogic,
      mishnaConnection,
      halachicTakeaway,
      // PRO SCHOLAR V20: Halachic scenarios from Mishna
      halachicScenarios: [],
      // NEW: Full text and mode detection
      fullText: displayFullText,
      isMishnaOnly,
      hasGemaraMarker,
      // Legacy fields for compatibility
      gemaraContent: null,
      sages: [],
      pesukim: [],
      middot: [],
      crossRefs: [],
      keyTerms: [],
      halachicCategories: [],
      stats: { words: 0, sentences: 0, chars: 0 }
    };

    // Character count
    result.stats.chars = cleanText.length;

    // === STATS ===
    const sentences = cleanText.split(/[.!?]/);
    result.stats.sentences = sentences.filter(s => s.trim().length > 5).length;
    result.stats.words = cleanText.split(/\s+/).filter(w => w.length > 1).length;

    // =========================================================================
    // EXTRACT MISHNA CONTENT - PRO SCHOLAR V20: Enhanced patterns for all sugyot
    // =========================================================================
    const mishnaPatterns = [
      // Standard mishna marker with gemara following
      /מתני[׳']?\s*[:.]\s*([^]*?)(?=גמ[׳']|גמרא)/i,
      // Mishna marker without punctuation
      /מתני[׳']?\s+([^]*?)(?=גמ[׳']|גמרא)/i,
      // "משנה" spelled out
      /משנה\s*[:.]\s*([^]*?)(?=גמ[׳']|גמרא)/i,
      // Text before gemara marker (fallback)
      /^([^]*?)(?=גמ[׳']|גמרא)/i,
      // הדרן pattern (end of chapter marker)
      /^([^]*?)(?=הדרן\s+עלך)/i
    ];

    let mishnaText = '';
    for (const pattern of mishnaPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]?.trim().length > 15) {
        mishnaText = match[1].trim();
        // Remove leading "מתני׳:" if captured
        mishnaText = mishnaText.replace(/^מתני[׳']?\s*[:.]\s*/i, '');
        mishna.content = mishnaText;
        mishna.fullContent = mishnaText;
        break;
      }
    }

    // If no Gemara marker found, check for other structural markers
    if (!mishnaText && isMishnaOnly && cleanText.length > 15) {
      // Check for baraita-only text (תניא, תנו רבנן)
      const baraitaMatch = cleanText.match(/^(תניא|תנו\s+רבנן|תנא)\s*[:.]\s*([^]*)/i);
      if (baraitaMatch) {
        mishnaText = baraitaMatch[2]?.trim() || cleanText;
        mishna.structureType = 'baraita';
      } else {
        mishnaText = cleanText;
      }
      mishna.content = mishnaText;
      mishna.fullContent = mishnaText;
    }

    if (mishnaText) {
      // === TOPIC ===
      const firstSentence = mishnaText.split(/[.!?]/)[0];
      if (firstSentence) {
        mishna.topic = firstSentence.trim().slice(0, 120); // More chars for topic
      }

      // === EXTRACT NUMBERS (שתים, שלש, ארבע, etc.) - PRO SCHOLAR V20 ===
      const numberPatterns = [
        /(?:שתים|שנים)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /(?:שלש|שלשה)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /(?:ארבע|ארבעה)\s+(?:שהן|שהם|דברים|מיני|אבות)/gi,
        /(?:חמש|חמשה)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /(?:שש|ששה)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /(?:שבע|שבעה)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /(?:שמונה)\s+(?:שהן|שהם|דברים|מיני)/gi,
        /עשרה?\s+(?:דברים|מיני)/gi,
        /שלשים\s+ותשע/gi, // 39 melachot
        /(?:הראשון|השני|השלישי|הרביעי|החמישי)/gi // Ordinals
      ];
      const allNumberMatches = [];
      numberPatterns.forEach(p => {
        const matches = mishnaText.match(p);
        if (matches) allNumberMatches.push(...matches);
      });
      if (allNumberMatches.length > 0) {
        mishna.numbers = [...new Set(allNumberMatches.map(n => n.trim()))];
      }

      // === EXTRACT CASES/SCENARIOS - PRO SCHOLAR V20 ===
      // Multiple patterns for different enumeration styles
      const casePatterns = [
        /([א-ת]{2,})\s+(?:שהן|שהם)\s+([א-ת]+)/gi,  // X שהן Y
        /(?:ואלו|אלו)\s+הן[:\s]+([^.]+)/gi,  // אלו הן: ...
        /(?:אחד|שני|שלישי|רביעי)[:\s]+([^,;.]{5,40})/gi,  // אחד: ...
        /הראשון[:\s]+([^,;.]{5,40})/gi,  // הראשון: ...
      ];
      casePatterns.forEach(pattern => {
        const matches = [...mishnaText.matchAll(pattern)];
        matches.forEach(m => {
          if (mishna.cases.length < 8) {
            const caseText = m[1] && m[2] ? `${m[1]} שהן ${m[2]}` : m[1]?.trim();
            if (caseText && caseText.length > 3) {
              mishna.cases.push(caseText);
            }
          }
        });
      });

      // === STRUCTURE TYPE - PRO SCHOLAR V20: More comprehensive detection ===
      // Skip if already set (e.g., baraita)
      if (!mishna.structureType) {
        if (/שתים\s+שהן|שלש\s+שהן|ארבע\s+שהן|שלשה\s+דברים|ארבעה\s+אבות|ארבע\s+מיתות/.test(mishnaText)) {
          mishna.structureType = 'enumeration';
        } else if (/ואלו\s+הן|אלו\s+הם/.test(mishnaText)) {
          mishna.structureType = 'enumeration';
        } else if (/כיצד[?]?\s/.test(mishnaText)) {
          mishna.structureType = 'explanation';
        } else if (/במה\s+דברים\s+אמורים|אימתי/.test(mishnaText)) {
          mishna.structureType = 'conditional';
        } else if (/אם\s+[^,]{3,}/.test(mishnaText)) {
          mishna.structureType = 'conditional';
        } else if (/רבי\s+[א-ת]+\s+אומר|בית\s+שמאי|בית\s+הלל|נחלקו/.test(mishnaText)) {
          mishna.structureType = 'dispute';
        } else if (/זה\s+הכלל|כלל\s+גדול/.test(mishnaText)) {
          mishna.structureType = 'principle';
        } else if (/חייב|פטור|מותר|אסור|כשר|פסול|טמא|טהור/.test(mishnaText)) {
          mishna.structureType = 'ruling';
        } else if (/מי\s+ש|האומר|המקדש|הנותן|הלוקח/.test(mishnaText)) {
          mishna.structureType = 'case-law';
        }
      }

      // === CASE DETAILS: WHO - PRO SCHOLAR V20: Comprehensive actor extraction ===
      const actorPatterns = [
        // Definite article actors with verbs
        /ה([א-ת]{2,10})\s+(?:עומד|יושב|פושט|נותן|נוטל|הולך|בא|עושה|לוקח|מוכר|שואל|משאיל)/gi,
        // Compound actors (בעל הבית, etc.)
        /(בעל\s+הבית|בעה"ב|בעל\s+המעשר|בעל\s+הקרקע)/gi,
        // Role-based actors
        /(העני|העשיר|הנותן|המקבל|המוציא|המכניס|השואל|המשאיל|הלוקח|המוכר|הגוזל|הנגזל|השוכר|המשכיר)/gi,
        // Person-type actors
        /(כהן|לוי|ישראל|גר|עבד|שפחה|אשה|איש|קטן|גדול|זקן)/gi,
        // Specific actors in halachic contexts
        /(המוצא|האומר|המקדש|המגרש|החולץ|היבמה|היבם)/gi
      ];
      const seenActors = new Set();
      actorPatterns.forEach(p => {
        const matches = [...mishnaText.matchAll(p)];
        matches.forEach(m => {
          const actor = (m[1] || m[0]).trim().slice(0, 25);
          if (actor.length > 2 && !seenActors.has(actor) && mishna.caseDetails.who.length < 6) {
            seenActors.add(actor);
            mishna.caseDetails.who.push(actor);
          }
        });
      });

      // === CASE DETAILS: CONDITIONS - PRO SCHOLAR V20 ===
      const conditionPatterns = [
        /כיצד[?]?\s*([^.]{10,100})/gi,
        /אימתי[?]?\s*([^.]{10,80})/gi,
        /במה\s+דברים\s+אמורים[?]?\s*([^.]{10,80})/gi,
        /בזמן\s+ש([^.]{10,60})/gi,
        /אם\s+היה\s+([^.]{10,60})/gi,
        /(?:בין|בין\s+ש)([^.]{10,50})\s+(?:בין|ובין)/gi
      ];
      conditionPatterns.forEach(pattern => {
        const matches = [...mishnaText.matchAll(pattern)];
        matches.forEach(m => {
          if (m[1] && mishna.caseDetails.conditions.length < 5) {
            mishna.caseDetails.conditions.push(m[1].trim().slice(0, 80));
          }
        });
      });

      // === RULING - PRO SCHOLAR V20: Comprehensive ruling extraction ===
      const rulingPatterns = [
        // Obligation/Exemption
        /([^.]*(?:חייב|פטור|חייבים|פטורים|חייבת|פטורה)[^.]*)/i,
        // Permission/Prohibition
        /([^.]*(?:מותר|אסור|מותרים|אסורים|מותרת|אסורה)[^.]*)/i,
        // Validity
        /([^.]*(?:כשר|פסול|כשרים|פסולים|כשרה|פסולה)[^.]*)/i,
        // Purity
        /([^.]*(?:טמא|טהור|טמאים|טהורים|טמאה|טהורה)[^.]*)/i,
        // Fulfillment
        /([^.]*(?:יצא|לא\s+יצא|יוצא|אינו\s+יוצא)[^.]*)/i,
        // Acquisition
        /([^.]*(?:קנה|לא\s+קנה|קונה|אינו\s+קונה)[^.]*)/i
      ];

      for (const pattern of rulingPatterns) {
        const rulingMatch = mishnaText.match(pattern);
        if (rulingMatch && rulingMatch[1]?.trim().length > 10) {
          mishna.ruling.decision = rulingMatch[1].trim().slice(0, 120);
          break;
        }
      }

      // Check if dispute - PRO SCHOLAR V20: More comprehensive
      if (/רבי\s+[א-ת]+\s+אומר|בית\s+שמאי|בית\s+הלל|פליגי|נחלקו|חולקין|דברי\s+רבי/.test(mishnaText)) {
        mishna.ruling.isDispute = true;
        // Try to identify the disputing parties
        const disputeMatch = mishnaText.match(/(רבי\s+[א-ת]+|בית\s+(?:שמאי|הלל))\s+(?:אומר|אומרים)/);
        if (disputeMatch) {
          mishna.ruling.author = `מחלוקת (${disputeMatch[1]})`;
        } else {
          mishna.ruling.author = 'מחלוקת';
        }
      } else if (/סתם\s+משנה|חכמים\s+אומרים/.test(mishnaText)) {
        mishna.ruling.author = 'סתם משנה';
      } else {
        mishna.ruling.author = 'סתם משנה';
      }

      // === KEY PRINCIPLE - PRO SCHOLAR V20: More patterns ===
      const principlePatterns = [
        /זה\s+הכלל[:\s]+([^.]+)/i,
        /כלל\s+גדול[:\s]+([^.]+)/i,
        /כלל\s+אמרו[:\s]+([^.]+)/i,
        /הרי\s+זה[:\s]+([^.]+)/i,
        /העיקר[:\s]+([^.]+)/i,
        /מכאן\s+אמרו[:\s]+([^.]+)/i
      ];
      for (const pp of principlePatterns) {
        const pm = mishnaText.match(pp);
        if (pm && pm[1]?.trim().length > 5) {
          mishna.keyPrinciple = pm[1].trim().slice(0, 120);
          break;
        }
      }

      // === ONE-LINE SUMMARY (auto-generated) - PRO SCHOLAR V20: Smarter summary ===
      if (mishna.topic) {
        let summary = mishna.topic.slice(0, 50);

        // Add ruling word if found
        const rulingWord = mishna.ruling?.decision?.match(/חייב|פטור|מותר|אסור|כשר|פסול|טמא|טהור|יצא|קנה/)?.[0];
        if (rulingWord) {
          summary += ` - ${rulingWord}`;
        }

        // Add structure indicator
        if (mishna.structureType === 'enumeration' && mishna.numbers?.length > 0) {
          summary = `${mishna.numbers[0]} - ${summary}`;
        } else if (mishna.structureType === 'dispute') {
          summary += ' (מחלוקת)';
        }

        mishna.oneLine = summary;
      }

      // =========================================================================
      // PRO SCHOLAR V20: EXTRACT HALACHIC SCENARIOS FROM MISHNA
      // Detects patterns like "פשט X... חייב/פטור" for visual case display
      // =========================================================================
      const scenarioPatterns = [
        // Pattern: "פשט העני... — העני חייב ובעל הבית פטור"
        {
          regex: /פשט\s+(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(?:את\s+)?(?:ידו\s+)?(?:ל[א-ת]+\s+)?(?:ו?נתן|ו?נטל|ו?הוציא|ו?הכניס)[^—]*[-–—]\s*([^.]+)/gi,
          parseMatch: (m) => {
            const fullRuling = m[2]?.trim() || '';
            // Extract multiple rulings if present (e.g., "העני חייב ובעל הבית פטור")
            const rulings = [];

            // Check for compound rulings
            const compoundMatch = fullRuling.match(/(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/g);
            if (compoundMatch) {
              compoundMatch.forEach(r => {
                const parts = r.match(/(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s+(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/);
                if (parts) {
                  let ruling = parts[2];
                  if (ruling.includes('פטור')) ruling = 'פטור';
                  if (ruling.includes('חייב')) ruling = 'חייב';
                  rulings.push({
                    actor: parts[1].trim(),
                    action: m[1]?.trim().replace(/^ה/, ''),
                    ruling
                  });
                }
              });
            }

            // Check for "שניהם פטורין"
            if (fullRuling.includes('שניהם')) {
              let ruling = fullRuling.includes('פטור') ? 'פטור' : fullRuling.includes('חייב') ? 'חייב' : null;
              if (ruling) {
                rulings.push({ actor: 'שניהם', action: m[1]?.trim(), ruling });
              }
            }

            return rulings;
          }
        },
        // Simpler pattern: "X - חייב/פטור"
        {
          regex: /(ה?[א-ת]+(?:\s+ה?[א-ת]+)?)\s*[-–—]\s*(חייב|פטור|פטורי[ןם]|חייבי[ןם]|מותר|אסור)/gi,
          parseMatch: (m) => {
            let ruling = m[2];
            if (ruling.includes('פטור')) ruling = 'פטור';
            if (ruling.includes('חייב')) ruling = 'חייב';
            return [{ actor: m[1].trim(), action: null, ruling }];
          }
        }
      ];

      const seenScenarios = new Set();
      scenarioPatterns.forEach(({ regex, parseMatch }) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(mishnaText)) !== null) {
          const scenarios = parseMatch(match);
          scenarios.forEach(scenario => {
            const key = `${scenario.actor}-${scenario.ruling}`;
            if (!seenScenarios.has(key) && scenario.actor && scenario.ruling) {
              seenScenarios.add(key);
              result.halachicScenarios.push(scenario);
            }
          });
        }
      });
    }

    // =========================================================================
    // EXTRACT GEMARA CONTENT - PRO SCHOLAR V22: Complete Gemara extraction
    // =========================================================================

    let gemaraText = '';

    // STRATEGY 1: Look for explicit "גמ'" marker
    const explicitGemaraPatterns = [
      /גמ[׳']?\s*[:.]\s*([^]*)/i,
      /גמרא\s*[:.]\s*([^]*)/i,
      /גמ[׳']\s+([^]*)/i
    ];

    for (const pattern of explicitGemaraPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1]?.trim().length > 15) {
        gemaraText = match[1].trim();
        break;
      }
    }

    // STRATEGY 2: Find Gemara by looking for Mishna end + discourse markers
    if (!gemaraText && mishnaText && cleanText.length > mishnaText.length + 20) {
      // Find where the Mishna ends in the text
      const mishnaEndIndex = cleanText.indexOf(mishnaText) + mishnaText.length;
      const afterMishna = cleanText.slice(mishnaEndIndex).trim();

      if (afterMishna.length > 20) {
        gemaraText = afterMishna;
      }
    }

    // STRATEGY 3: Find Gemara by first discourse marker when no clear Mishna
    if (!gemaraText && hasGemaraDiscoursePatterns) {
      // Comprehensive list of Gemara-starting patterns
      const gemaraStartPatterns = [
        { pattern: /תנן\s+התם/, priority: 1 },
        { pattern: /אמר\s+רב\s+[א-ת]+/, priority: 2 },
        { pattern: /אמר\s+ר[׳']\s+[א-ת]+/, priority: 2 },
        { pattern: /א"ר\s+[א-ת]+/, priority: 2 },
        { pattern: /תנו\s+רבנן/, priority: 1 },
        { pattern: /תניא/, priority: 1 },
        { pattern: /מאי\s+[א-ת]{2,}/, priority: 3 },
        { pattern: /פשיטא/, priority: 3 },
        { pattern: /איבעיא\s+להו/, priority: 2 },
        { pattern: /מנא\s+הני\s+מילי/, priority: 2 },
        { pattern: /היכי\s+דמי/, priority: 3 },
        { pattern: /תא\s+שמע/, priority: 2 },
        { pattern: /אמר\s+אביי/, priority: 2 },
        { pattern: /אמר\s+רבא/, priority: 2 },
        { pattern: /אמר\s+רב\s+הונא/, priority: 2 },
        { pattern: /אמר\s+רב\s+יהודה/, priority: 2 }
      ];

      let bestMatch = null;
      let bestIndex = cleanText.length;
      let bestPriority = 99;

      for (const { pattern, priority } of gemaraStartPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          const idx = cleanText.indexOf(match[0]);
          // Prefer earlier matches with better priority
          if (idx !== -1 && (idx < bestIndex || (idx === bestIndex && priority < bestPriority))) {
            bestIndex = idx;
            bestMatch = match[0];
            bestPriority = priority;
          }
        }
      }

      // If we found a Gemara marker and it's after potential Mishna content
      if (bestMatch && bestIndex > 50 && bestIndex < cleanText.length - 20) {
        gemaraText = cleanText.slice(bestIndex).trim();
        console.log('[ProScholar V22] Found Gemara at position', bestIndex, 'marker:', bestMatch);
      }
    }

    // STRATEGY 4: If text is long enough and has no clear Mishna, treat it all as Gemara
    if (!gemaraText && !mishnaText && cleanText.length > 100 && hasGemaraDiscoursePatterns) {
      gemaraText = cleanText;
      console.log('[ProScholar V22] Treating full text as Gemara, length:', cleanText.length);
    }

    // Store the Gemara content
    if (gemaraText) {
      result.gemaraContent = gemaraText;
      result.gemaraFullText = gemaraText;
      console.log('[ProScholar V22] Gemara extracted:', gemaraText.length, 'chars');
    }

    if (gemaraText) {
      // =========================================================================
      // GEMARA QUESTIONS ON MISHNA - PRO SCHOLAR V20: Comprehensive patterns
      // =========================================================================
      const questionPatterns = [
        // Definition questions
        { regex: /מאי\s+([^\s.?]{2,20})/gi, type: 'definition', label: 'מהו' },
        { regex: /מאי\s+טעמא/gi, type: 'reason', label: 'מה הטעם' },
        { regex: /מאי\s+שנא/gi, type: 'distinction', label: 'מה ההבדל' },
        { regex: /מאי\s+קמ"ל/gi, type: 'novelty', label: 'מה קמ"ל' },
        { regex: /מאי\s+איריא/gi, type: 'specification', label: 'למה דווקא' },
        // Source questions
        { regex: /מנא\s+הני\s+מילי/gi, type: 'source', label: 'מנין לנו' },
        { regex: /מנלן/gi, type: 'source', label: 'מנלן' },
        { regex: /מנא\s+אמינא/gi, type: 'source', label: 'מנין אומר' },
        // Necessity questions
        { regex: /פשיטא/gi, type: 'obvious', label: 'פשיטא - מובן מאליו?' },
        { regex: /למה\s+לי/gi, type: 'necessity', label: 'למה צריך' },
        { regex: /למה\s+לן/gi, type: 'necessity', label: 'למה לנו' },
        { regex: /תרתי\s+למה\s+לי/gi, type: 'redundancy', label: 'שניים למה לי' },
        // Case clarification
        { regex: /היכי\s+דמי/gi, type: 'case', label: 'באיזה מקרה' },
        { regex: /במאי\s+עסקינן/gi, type: 'case', label: 'במה עסקינן' },
        { regex: /היכא\s+דמי/gi, type: 'case', label: 'היכא דמי' },
        // Inquiry questions (בעיות)
        { regex: /איבעיא\s+להו/gi, type: 'inquiry', label: 'איבעיא להו' },
        { regex: /בעי\s+([^\s:]{2,15})/gi, type: 'inquiry', label: 'בעי' },
        { regex: /מיבעיא\s+ליה/gi, type: 'inquiry', label: 'מיבעיא' },
        // Contradiction questions
        { regex: /והא\s+תנן/gi, type: 'contradiction', label: 'סתירה ממשנה' },
        { regex: /והתנן/gi, type: 'contradiction', label: 'והתנן' },
        { regex: /ורמינהו/gi, type: 'contradiction', label: 'סתירה' },
        { regex: /מיתיבי/gi, type: 'objection', label: 'קושיא מברייתא' },
        { regex: /והתניא/gi, type: 'contradiction', label: 'והתניא' },
        // Challenges
        { regex: /מתקיף\s+לה/gi, type: 'challenge', label: 'מתקיף לה' },
        { regex: /איתיביה/gi, type: 'challenge', label: 'איתיביה' },
        { regex: /ומי\s+אמר/gi, type: 'challenge', label: 'ומי אמר' },
        // Other
        { regex: /אטו/gi, type: 'rhetorical', label: 'וכי?' }
      ];

      // PRO SCHOLAR V23: Enhanced question extraction with full context
      questionPatterns.forEach(qp => {
        const matches = [...gemaraText.matchAll(qp.regex)];
        matches.forEach(m => {
          if (gemaraQuestions.length < 15) { // Increased limit to 15
            // Extract the position of the match
            const matchStart = m.index || 0;
            // Get text AFTER the match for context (up to 100 chars or until sentence end)
            const afterMatch = gemaraText.slice(matchStart, matchStart + 120);
            // Find natural break points (sentence end or new question marker)
            const breakMatch = afterMatch.match(/[.!?:]/);
            let fullContext = breakMatch
              ? afterMatch.slice(0, breakMatch.index + 1).trim()
              : afterMatch.slice(0, 80).trim();

            // Clean up HTML tags
            fullContext = fullContext.replace(/<[^>]+>/g, '');

            // Use capture group if available, otherwise use full context
            const context = m[1] ? m[1].trim() : '';

            gemaraQuestions.push({
              type: qp.type,
              label: qp.label,
              context: context.slice(0, 60), // Increased from 35 to 60
              fullContext: fullContext // PRO SCHOLAR V23: Full context for display
            });
          }
        });
      });

      // =========================================================================
      // SUGYA STEP-BY-STEP FLOW - PRO SCHOLAR V20: Comprehensive discourse patterns
      // =========================================================================
      const stepPatterns = [
        // QUESTIONS & INQUIRIES
        { regex: /מאי\s+[^\s.?]+/i, type: 'question', icon: '❓', label: 'שאלה' },
        { regex: /מנא\s+הני\s+מילי/i, type: 'question', icon: '❓', label: 'מקור' },
        { regex: /מנלן/i, type: 'question', icon: '❓', label: 'מנלן' },
        { regex: /פשיטא/i, type: 'question', icon: '❓', label: 'פשיטא' },
        { regex: /איבעיא\s+להו/i, type: 'inquiry', icon: '🤔', label: 'בעיא' },
        { regex: /בעי\s+[^\s:]+/i, type: 'inquiry', icon: '🤔', label: 'בעי' },
        { regex: /היכי\s+דמי/i, type: 'question', icon: '❓', label: 'היכי דמי' },
        { regex: /למה\s+לי/i, type: 'question', icon: '❓', label: 'למה לי' },
        // SOURCES & PROOFS (תא שמע)
        { regex: /תא\s+שמע/i, type: 'proof', icon: '📖', label: 'תא שמע' },
        { regex: /אמר\s+קרא/i, type: 'answer', icon: '📖', label: 'תשובה מפסוק' },
        { regex: /שנאמר/i, type: 'answer', icon: '📖', label: 'ראיה מפסוק' },
        { regex: /דכתיב/i, type: 'answer', icon: '📖', label: 'דכתיב' },
        { regex: /תנן\s+התם/i, type: 'proof', icon: '📜', label: 'תנן התם' },
        { regex: /תניא/i, type: 'proof', icon: '📜', label: 'ברייתא' },
        { regex: /תנו\s+רבנן/i, type: 'proof', icon: '📜', label: 'תנו רבנן' },
        // OBJECTIONS & CHALLENGES
        { regex: /מיתיבי/i, type: 'objection', icon: '⚡', label: 'קושיא' },
        { regex: /ורמינהו/i, type: 'objection', icon: '⚡', label: 'סתירה' },
        { regex: /והא\s+תנן/i, type: 'objection', icon: '⚡', label: 'והא תנן' },
        { regex: /והתניא/i, type: 'objection', icon: '⚡', label: 'והתניא' },
        { regex: /מתקיף\s+לה/i, type: 'objection', icon: '⚡', label: 'מתקיף' },
        { regex: /איתיביה/i, type: 'objection', icon: '⚡', label: 'איתיביה' },
        { regex: /לימא\s+מתני/i, type: 'objection', icon: '⚡', label: 'לימא מתני׳' },
        // RESOLUTIONS & ANSWERS
        { regex: /לא\s+קשיא/i, type: 'resolution', icon: '✓', label: 'לא קשיא' },
        { regex: /הכי\s+קאמר/i, type: 'resolution', icon: '✓', label: 'הכי קאמר' },
        { regex: /הכא\s+במאי\s+עסקינן/i, type: 'resolution', icon: '✓', label: 'במאי עסקינן' },
        { regex: /שאני/i, type: 'resolution', icon: '✓', label: 'שאני' },
        { regex: /התם/i, type: 'resolution', icon: '✓', label: 'התם' },
        { regex: /אלא/i, type: 'resolution', icon: '✓', label: 'אלא' },
        // CONCLUSIONS
        { regex: /הלכה\s+כ/i, type: 'conclusion', icon: '⚖️', label: 'פסק הלכה' },
        { regex: /שמע\s+מינה/i, type: 'conclusion', icon: '✓', label: 'שמע מינה' },
        { regex: /תיקו/i, type: 'conclusion', icon: '🟡', label: 'תיקו' },
        { regex: /קשיא$/i, type: 'conclusion', icon: '❌', label: 'קשיא' },
        { regex: /הלכתא/i, type: 'conclusion', icon: '⚖️', label: 'הלכתא' },
        // STATEMENTS
        { regex: /אמר\s+רב\s+[^\s:]+/i, type: 'statement', icon: '💬', label: 'אמר רב' },
        { regex: /אמר\s+רבי\s+[^\s:]+/i, type: 'statement', icon: '💬', label: 'אמר רבי' },
        // ALTERNATIVE VIEWS
        { regex: /איכא\s+דאמרי/i, type: 'alternative', icon: '🔄', label: 'איכא דאמרי' },
        { regex: /לישנא\s+אחרינא/i, type: 'alternative', icon: '🔄', label: 'לישנא אחרינא' },
        // PRO SCHOLAR V21: Additional discourse patterns
        // LOGICAL PROGRESSION
        { regex: /אי\s+הכי/i, type: 'logical', icon: '🔗', label: 'אי הכי' },
        { regex: /אלא\s+מעתה/i, type: 'logical', icon: '🔗', label: 'אלא מעתה' },
        { regex: /ולטעמיך/i, type: 'logical', icon: '🔗', label: 'ולטעמיך' },
        { regex: /לעולם/i, type: 'resolution', icon: '✓', label: 'לעולם' },
        // REASON/EXPLANATION
        { regex: /מאי\s+טעמא/i, type: 'question', icon: '❓', label: 'מאי טעמא' },
        { regex: /טעמא\s+מאי/i, type: 'question', icon: '❓', label: 'טעמא מאי' },
        { regex: /משום\s+ד/i, type: 'reason', icon: '💡', label: 'משום ד' },
        { regex: /היינו\s+טעמא/i, type: 'reason', icon: '💡', label: 'היינו טעמא' },
        // EXAMPLES & APPLICATIONS
        { regex: /כגון/i, type: 'example', icon: '📝', label: 'כגון' },
        { regex: /כיצד/i, type: 'example', icon: '📝', label: 'כיצד' },
        { regex: /הא\s+כיצד/i, type: 'example', icon: '📝', label: 'הא כיצד' },
        // QUOTES & TRADITIONS
        { regex: /תנא/i, type: 'tradition', icon: '📜', label: 'תנא' },
        { regex: /כי\s+אמר/i, type: 'tradition', icon: '📜', label: 'כי אמר' },
        { regex: /הכי\s+נמי\s+מסתברא/i, type: 'support', icon: '✅', label: 'הכי נמי מסתברא' },
        // DISTINCTIONS
        { regex: /הני\s+מילי/i, type: 'distinction', icon: '⚡', label: 'הני מילי' },
        { regex: /אבל/i, type: 'distinction', icon: '⚡', label: 'אבל' },
        // TRANSMISSION CHAIN
        { regex: /אמר\s+[^\s]+\s+אמר/i, type: 'chain', icon: '🔗', label: 'שלשלת מסירה' }
      ];

      // PRO SCHOLAR V23: Track ALL steps with positions for proper ordering
      // Use matchAll to find ALL instances, not just the first
      const stepsWithPositions = [];
      stepPatterns.forEach(sp => {
        // Create a global version of the regex to find all matches
        const globalRegex = new RegExp(sp.regex.source, 'gi');
        let match;
        while ((match = globalRegex.exec(gemaraText)) !== null) {
          // PRO SCHOLAR V23: Capture more context immediately at match time
          const startPos = match.index;
          const endPos = Math.min(startPos + 150, gemaraText.length);
          let contextText = gemaraText.slice(startPos, endPos).trim();
          // Clean HTML
          contextText = contextText.replace(/<[^>]+>/g, '');

          stepsWithPositions.push({
            ...sp,
            content: contextText.slice(0, 100), // PRO SCHOLAR V23: Increased from 50 to 100
            position: match.index
          });
        }
      });

      // PRO SCHOLAR V23: Sort by position and capture more distinct steps
      stepsWithPositions.sort((a, b) => a.position - b.position);
      const seenPositions = new Set();
      let stepNum = 1;

      // PRO SCHOLAR V23: Grouping distance 20, increased step limit to 25
      stepsWithPositions.forEach(step => {
        const posKey = Math.floor(step.position / 20); // Group nearby positions
        if (!seenPositions.has(posKey) && sugyaSteps.length < 25) {
          seenPositions.add(posKey);

          // PRO SCHOLAR V23: Extract meaningful content (up to 120 chars)
          const startPos = step.position;
          const endPos = Math.min(startPos + 150, gemaraText.length);
          let fullContent = gemaraText.slice(startPos, endPos).trim();

          // Clean up the content - remove HTML
          fullContent = fullContent.replace(/<[^>]+>/g, '');

          // Find natural break points but ensure at least 30 chars
          const minChars = 30;
          const breakPoints = /[.!?:]/g;
          let breakIndex = -1;
          let breakMatch;
          while ((breakMatch = breakPoints.exec(fullContent)) !== null) {
            if (breakMatch.index >= minChars) {
              breakIndex = breakMatch.index;
              break;
            }
          }

          if (breakIndex > 0 && breakIndex < 100) {
            fullContent = fullContent.slice(0, breakIndex + 1);
          } else {
            // No break found, take up to 80 chars
            fullContent = fullContent.slice(0, 80);
          }

          sugyaSteps.push({
            step: stepNum++,
            type: step.type,
            icon: step.icon,
            label: step.label,
            content: fullContent || step.content
          });
        }
      });

      // =========================================================================
      // OPINIONS (Multiple Views) - PRO SCHOLAR V13: Enhanced rabbi argument extraction
      // =========================================================================
      const opinionPatterns = [
        // Standard אמר רב/רבי patterns
        { regex: /אמר\s+(רב\s+[א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /אמר\s+(רבי\s+[א-ת]+(?:\s+בן\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'tanna' },
        // Famous Amoraim direct statements
        { regex: /(אביי)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /(רבא)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /(רב\s+נחמן)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /(רב\s+הונא)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /(רב\s+יהודה)\s+אמר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        // Schools
        { regex: /בית\s+(שמאי)\s+אומרים[:\s]+([^.]{5,80})/gi, type: 'school' },
        { regex: /בית\s+(הלל)\s+אומרים[:\s]+([^.]{5,80})/gi, type: 'school' },
        // Abbreviated forms (א"ר)
        { regex: /א"ר\s+([א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
        { regex: /א״ר\s+([א-ת]+(?:\s+בר\s+[א-ת]+)?)[:\s]+([^.]{5,80})/gi, type: 'amora' },
        // X אומר patterns (opinion markers)
        { regex: /(רבי\s+[א-ת]+)\s+אומר[:\s]+([^.]{5,80})/gi, type: 'tanna' },
        { regex: /(רב\s+[א-ת]+)\s+אומר[:\s]+([^.]{5,80})/gi, type: 'amora' },
        // X סבר patterns (holds opinion)
        { regex: /(רבי?\s+[א-ת]+)\s+סבר[:\s]+([^.]{5,80})/gi, type: 'opinion' },
        // Dispute markers
        { regex: /מר\s+אמר[:\s]+([^.]{5,60}).*?ומר\s+אמר[:\s]+([^.]{5,60})/gi, type: 'dispute' }
      ];

      const seenOpinions = new Set();
      opinionPatterns.forEach(op => {
        const matches = [...gemaraText.matchAll(op.regex)];
        matches.forEach(m => {
          // Handle special "מר אמר...ומר אמר" pattern
          if (op.type === 'dispute' && m[1] && m[2]) {
            if (!seenOpinions.has('חד מרבנן') && opinions.length < 8) {
              seenOpinions.add('חד מרבנן');
              opinions.push({ name: 'חד אמר', position: m[1].trim().slice(0, 60), reason: null, type: 'dispute' });
            }
            if (!seenOpinions.has('אידך מרבנן') && opinions.length < 8) {
              seenOpinions.add('אידך מרבנן');
              opinions.push({ name: 'וחד אמר', position: m[2].trim().slice(0, 60), reason: null, type: 'dispute' });
            }
          } else {
            const name = m[1]?.trim();
            const position = m[2]?.trim().slice(0, 80);
            // PRO SCHOLAR V13: Increased limit from 4 to 8
            if (name && position && position.length > 5 && !seenOpinions.has(name) && opinions.length < 8) {
              seenOpinions.add(name);
              opinions.push({ name, position, reason: null, type: op.type });
            }
          }
        });
      });

      // PRO SCHOLAR V13: Check for main difference with more patterns
      if (opinions.length >= 2) {
        const diffPatterns = [
          /(?:פליגי|נחלקו)\s+ב([^.]+)/i,
          /במאי\s+(?:קא\s+)?מיפלגי[?]?\s*([^.]*)/i,
          /מאי\s+בינייהו[?]?\s*([^.]*)/i,
          /והא\s+פליגי\s+ב([^.]+)/i
        ];
        for (const pattern of diffPatterns) {
          const diffMatch = gemaraText.match(pattern);
          if (diffMatch && diffMatch[1]?.trim().length > 3) {
            result.mainDifference = diffMatch[1].trim().slice(0, 80);
            break;
          }
        }
      }

      // =========================================================================
      // CORE LOGIC
      // =========================================================================
      // Try to extract the deep principle
      const logicPatterns = [
        { regex: /מ?דאורייתא/gi, label: 'דאורייתא' },
        { regex: /מ?דרבנן/gi, label: 'דרבנן' },
        { regex: /גזירה\s+שמא/gi, label: 'גזירה' },
        { regex: /טעמא\s+ד/gi, label: 'טעם' }
      ];
      logicPatterns.forEach(lp => {
        if (gemaraText.match(lp.regex) && !coreLogic.principle) {
          coreLogic.principle = lp.label;
        }
      });

      // =========================================================================
      // CONNECTION BACK TO MISHNA
      // =========================================================================
      if (/הכי\s+קאמר|הכי\s+קתני/.test(gemaraText)) {
        mishnaConnection.type = 'reinterprets';
        mishnaConnection.description = 'הגמרא מפרשת מחדש את המשנה';
      } else if (/אוקימתא|אוקמה/.test(gemaraText)) {
        mishnaConnection.type = 'limits';
        mishnaConnection.description = 'הגמרא מצמצמת את המשנה למקרה מסוים';
      } else if (/לרבות|אף/.test(gemaraText)) {
        mishnaConnection.type = 'expands';
        mishnaConnection.description = 'הגמרא מרחיבה את דברי המשנה';
      } else if (gemaraQuestions.length > 0) {
        mishnaConnection.type = 'explains';
        mishnaConnection.description = 'הגמרא מבארת את המשנה';
      }

      // =========================================================================
      // HALACHIC TAKEAWAY - PRO SCHOLAR V22: Enhanced extraction
      // =========================================================================
      const halachaPatterns = [
        /הלכה\s+כ([א-ת\s]+)/i,
        /הלכתא\s+כ([א-ת\s]+)/i,
        /והלכתא\s*[:\s]+([^.]{10,60})/i,
        /פסק\s*[:\s]+([^.]{10,60})/i,
        /למעשה\s*[:\s]+([^.]{10,60})/i
      ];

      for (const pattern of halachaPatterns) {
        const match = gemaraText.match(pattern);
        if (match && match[1]) {
          halachicTakeaway.rule = match[0].trim().slice(0, 60);
          break;
        }
      }

      // =========================================================================
      // PRO SCHOLAR V22: MAIN QUESTION & RESOLUTION SUMMARY
      // Capture the primary question asked and how it's resolved
      // =========================================================================

      // Find the main question
      const mainQuestionPatterns = [
        { regex: /מאי\s+([^\s.?]+[^.?]{0,40})/i, type: 'what' },
        { regex: /מנא\s+הני\s+מילי([^.?]{0,50})/i, type: 'source' },
        { regex: /פשיטא([^.?]{0,40})/i, type: 'obvious' },
        { regex: /מאי\s+שנא([^.?]{0,40})/i, type: 'distinction' },
        { regex: /למה\s+לי([^.?]{0,40})/i, type: 'necessity' }
      ];

      for (const qp of mainQuestionPatterns) {
        const match = gemaraText.match(qp.regex);
        if (match) {
          result.mainQuestion = {
            type: qp.type,
            text: match[0].trim().slice(0, 60)
          };
          break;
        }
      }

      // Find the main resolution/answer
      const resolutionPatterns = [
        { regex: /לא\s+קשיא[:\s]*([^.]{0,60})/i, type: 'lav-kashya' },
        { regex: /הכי\s+קאמר[:\s]*([^.]{0,60})/i, type: 'interpretation' },
        { regex: /הכא\s+במאי\s+עסקינן[:\s]*([^.]{0,60})/i, type: 'limitation' },
        { regex: /שאני[:\s]*([^.]{0,50})/i, type: 'distinction' },
        { regex: /שמע\s+מינה[:\s]*([^.]{0,60})/i, type: 'conclusion' },
        { regex: /תיקו/i, type: 'unresolved' },
        { regex: /קשיא$/i, type: 'difficulty' }
      ];

      for (const rp of resolutionPatterns) {
        const match = gemaraText.match(rp.regex);
        if (match) {
          result.mainResolution = {
            type: rp.type,
            text: match[0].trim().slice(0, 80)
          };
          break;
        }
      }

      // =========================================================================
      // PRO SCHOLAR V22: SUGYA SUMMARY - Auto-generate a one-sentence summary
      // =========================================================================
      let sugyaSummary = '';

      // Build summary based on what we found
      if (mishna.topic) {
        sugyaSummary = `הסוגיא עוסקת ב${mishna.topic.slice(0, 40)}`;
      }

      if (result.mainQuestion) {
        const qTypes = {
          'what': 'שואלת מהו',
          'source': 'שואלת מנין',
          'obvious': 'שואלת פשיטא',
          'distinction': 'שואלת מה ההבדל',
          'necessity': 'שואלת למה צריך'
        };
        if (sugyaSummary) {
          sugyaSummary += `, והגמרא ${qTypes[result.mainQuestion.type] || 'שואלת'}`;
        }
      }

      if (result.mainResolution) {
        const rTypes = {
          'lav-kashya': 'ומתרצת לא קשיא',
          'interpretation': 'ומפרשת הכי קאמר',
          'limitation': 'ומעמידה במקרה מסוים',
          'distinction': 'ומחלקת',
          'conclusion': 'ומסיקה',
          'unresolved': 'ונשארת בתיקו',
          'difficulty': 'ונשארת בקושיא'
        };
        if (sugyaSummary) {
          sugyaSummary += ` ${rTypes[result.mainResolution.type] || ''}`;
        }
      }

      if (halachicTakeaway.rule) {
        sugyaSummary += `. ${halachicTakeaway.rule}`;
      }

      result.sugyaSummary = sugyaSummary || null;
    }

    // =========================================================================
    // SAGES EXTRACTION
    // =========================================================================
    const sagePatterns = [
      { regex: /אמר\s+(רב\s+[א-ת]+(?:\s+בר\s+[א-ת]+)?)/gi, type: 'amora' },
      { regex: /אמר\s+(רבי\s+[א-ת]+(?:\s+בן\s+[א-ת]+)?)/gi, type: 'tanna' },
      { regex: /א"ר\s+([א-ת]+)/gi, type: 'amora' },
      { regex: /(אביי|רבא|רב\s+אשי|רבינא|רב\s+פפא|רב\s+הונא|רב\s+נחמן|רב\s+יהודה|רב\s+חסדא|רב\s+ששת|רב\s+יוסף)/gi, type: 'amora' },
      { regex: /(ריש\s+לקיש|רבי\s+יוחנן|רבי\s+אלעזר|רבי\s+אמי|רבי\s+אסי|רבי\s+חייא|רבי\s+אבהו)/gi, type: 'amora' },
      { regex: /(רבי\s+עקיבא|רבי\s+ישמעאל|רבי\s+מאיר|רבי\s+יהודה|רבי\s+שמעון|רבי\s+יוסי|רבי\s+אליעזר)/gi, type: 'tanna' },
      { regex: /(רבן\s+גמליאל|רבן\s+שמעון|הלל|שמאי)/gi, type: 'tanna' },
      { regex: /בית\s+(שמאי|הלל)/gi, type: 'school' },
      { regex: /משמיה\s+ד([א-ת]+)/gi, type: 'source' }
    ];
    const seenSages = new Set();
    sagePatterns.forEach(p => {
      const matches = [...cleanText.matchAll(p.regex)];
      matches.forEach(m => {
        const name = m[1]?.trim();
        if (name && name.length > 2 && !seenSages.has(name) && result.sages.length < 15) {
          seenSages.add(name);
          result.sages.push({ name, type: p.type });
        }
      });
    });

    // =========================================================================
    // PESUKIM (Biblical Verses)
    // =========================================================================
    const pesukimPatterns = [
      /שנאמר[:\s]+["']?([^"'.]{5,80})["']?/gi,
      /דכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
      /כתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
      /כדכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi,
      /אמר\s+קרא[:\s]+["']?([^"'.]{5,80})["']?/gi,
      /מנלן[?]?\s+דכתיב[:\s]+["']?([^"'.]{5,80})["']?/gi
    ];
    pesukimPatterns.forEach(p => {
      const matches = [...cleanText.matchAll(p)];
      matches.forEach(m => {
        if (m[1] && result.pesukim.length < 8) {
          result.pesukim.push({ text: m[1].trim().slice(0, 70) });
        }
      });
    });

    // =========================================================================
    // MIDDOT (Hermeneutical Principles)
    // =========================================================================
    const middotPatterns = [
      { regex: /קל\s+וחומר/gi, name: 'קל וחומר', num: 1 },
      { regex: /גזרה\s+שוה/gi, name: 'גזירה שווה', num: 2 },
      { regex: /בנין\s+אב/gi, name: 'בנין אב', num: 3 },
      { regex: /כלל\s+ופרט/gi, name: 'כלל ופרט', num: 4 },
      { regex: /פרט\s+וכלל/gi, name: 'פרט וכלל', num: 5 },
      { regex: /היקש/gi, name: 'היקש' },
      { regex: /סמוכין/gi, name: 'סמוכין' },
      { regex: /ריבוי\s+ומיעוט/gi, name: 'ריבוי ומיעוט' },
      { regex: /אם\s+אינו\s+ענין/gi, name: 'אם אינו ענין' }
    ];
    const seenMiddot = new Set();
    middotPatterns.forEach(p => {
      if (cleanText.match(p.regex) && !seenMiddot.has(p.name)) {
        seenMiddot.add(p.name);
        result.middot.push({ name: p.name, num: p.num });
      }
    });

    // =========================================================================
    // CROSS REFERENCES
    // =========================================================================
    const crossRefPatterns = [
      { regex: /תנן\s+התם[:\s]+([^.]{10,80})/gi, source: 'משנה אחרת' },
      { regex: /מתניתין[:\s]+([^.]{10,80})/gi, source: 'משנתנו' },
      { regex: /תניא[:\s]+([^.]{10,80})/gi, source: 'ברייתא' },
      { regex: /תנו\s+רבנן[:\s]+([^.]{10,80})/gi, source: 'תנו רבנן' },
      { regex: /תנא[:\s]+([^.]{10,80})/gi, source: 'תנא' },
      { regex: /בתוספתא[:\s]+([^.]{10,60})/gi, source: 'תוספתא' },
      { regex: /בספרא[:\s]+([^.]{10,60})/gi, source: 'ספרא' },
      { regex: /בספרי[:\s]+([^.]{10,60})/gi, source: 'ספרי' }
    ];
    crossRefPatterns.forEach(p => {
      const matches = [...cleanText.matchAll(p.regex)];
      matches.forEach(m => {
        if (m[1] && result.crossRefs.length < 8) {
          result.crossRefs.push({ source: p.source, text: m[1].trim().slice(0, 70) });
        }
      });
    });

    // =========================================================================
    // KEY TERMS
    // =========================================================================
    const stopwords = new Set([
      'את', 'של', 'על', 'אם', 'כי', 'לא', 'הוא', 'היא', 'זה', 'זו', 'מה', 'כל', 'או', 'גם', 'עד', 'אלא',
      'אמר', 'אומר', 'אמרי', 'דאמר', 'והא', 'מאי', 'הכי', 'התם', 'הכא', 'דהא', 'והאי',
      'מן', 'אל', 'עם', 'בין', 'תחת', 'לפני', 'אחרי', 'למה', 'איך', 'מתי', 'היכן'
    ]);
    const halachicTerms = new Set(['חייב', 'פטור', 'מותר', 'אסור', 'כשר', 'פסול', 'טמא', 'טהור']);
    const wordFreq = new Map();
    cleanText.split(/\s+/).forEach(w => {
      const clean = w.replace(/[^\u0590-\u05FF]/g, '');
      if (clean.length >= 3 && !stopwords.has(clean)) {
        const current = wordFreq.get(clean) || { count: 0, category: null };
        current.count++;
        if (halachicTerms.has(clean)) current.category = 'halacha';
        wordFreq.set(clean, current);
      }
    });
    result.keyTerms = [...wordFreq.entries()]
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([term, data]) => ({ term, count: data.count, category: data.category }));

    return result;
  }, [fullText, text]); // PRO SCHOLAR V22: Re-analyze when fullText updates from fetch

  // PRO SCHOLAR V22: Show loading state while fetching full text
  if (fetchingFullText) {
    return (
      <div className="pro-summary-loading">
        <div className="loading-spinner" />
        <span>טוען טקסט מלא מסֵפַרְיָא...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="pro-summary-empty">
        <span className="empty-icon">📚</span>
        <span>נווט לדף בתלמוד לקבלת סיכום מפורט</span>
      </div>
    );
  }

  return (
    <div className="pro-scholar-summary v23" dir="rtl">
      {/* Header */}
      <div className="summary-header-pro">
        <span className="header-badge">PRO SCHOLAR V23</span>
        <span className="header-ref">{reference}</span>
        {analysis.isMishnaOnly && (
          <span className="mode-badge mishna-only">משנה בלבד</span>
        )}
        {!analysis.isMishnaOnly && analysis.hasGemaraMarker && (
          <span className="mode-badge full-page">משנה + גמרא</span>
        )}
      </div>

      {/* PRO SCHOLAR V22: Smart Sugya Loading Button */}
      {parsedRef && !sugyaData && (
        <div className="sugya-load-section v22">
          <button
            className={`load-sugya-btn smart ${sugyaLoading ? 'loading' : ''}`}
            onClick={() => loadFullSugya(true)}
            disabled={sugyaLoading}
          >
            {sugyaLoading ? (
              <>
                <span className="loading-spinner"></span>
                <span>טוען סוגיה עד התירוץ...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🎯</span>
                <span>טען סוגיה מלאה עד התירוץ</span>
              </>
            )}
          </button>
          <div className="sugya-load-hint">
            <span className="hint-icon">💡</span>
            <span>טוען את כל הגמרא עד שמגיעה לתירוץ או משנה הבאה</span>
          </div>
          {sugyaError && (
            <div className="sugya-error">{sugyaError}</div>
          )}
        </div>
      )}

      {/* PRO SCHOLAR V22: Full Sugya Display with Status */}
      {sugyaData && sugyaExpanded && (
        <div className="section full-sugya-section v22">
          <div className="section-header">
            <span className="section-icon">📚</span>
            <span className="section-title">סוגיה מלאה: {sugyaData.heRef}</span>
            <span className="page-count">{sugyaData.pageCount} דפים</span>
            {/* V22: Status badge */}
            {sugyaData.status && (
              <span className={`sugya-status-badge ${sugyaData.status}`}>
                {sugyaData.status === 'resolved' ? '✓ נמצא תירוץ' :
                 sugyaData.status === 'next_mishna' ? '📜 עד המשנה הבאה' :
                 sugyaData.status === 'max_pages' ? '⚠️ מקסימום דפים' :
                 '⏳ חלקי'}
              </span>
            )}
            <button
              className="collapse-btn"
              onClick={() => setSugyaExpanded(false)}
            >
              צמצם
            </button>
          </div>

          {/* V22: Resolution indicator */}
          {sugyaData.foundResolution && (
            <div className="resolution-indicator">
              <span className="resolution-icon">🎯</span>
              <span className="resolution-text">הגמרא הגיעה לתירוץ/מסקנה</span>
            </div>
          )}

          {/* Page markers and content */}
          <div className="sugya-content">
            {sugyaData.pageMarkers?.map((marker, idx) => (
              <div key={marker.daf} className="sugya-page">
                <div className="page-marker">
                  <span className="marker-daf">{sugyaData.tractate} {marker.daf}</span>
                  <span className="marker-count">{marker.segmentCount} קטעים</span>
                </div>
                <div className="page-text">
                  {sugyaData.segments
                    .filter(seg => seg.daf === marker.daf)
                    .map((seg, i) => (
                      <div key={i} className="segment-row">
                        <span className="segment-hebrew" dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(seg.hebrew) }} />
                        {seg.english && (
                          <span className="segment-english">{seg.english}</span>
                        )}
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Sugya Stats */}
          <div className="sugya-stats">
            <span className="sugya-stat">סה"כ: {sugyaData.segments?.length || 0} קטעים</span>
            <span className="sugya-stat">{sugyaData.fullHebrewText?.length || 0} תווים</span>
            <span className="sugya-stat">{sugyaData.pageCount} דפים</span>
          </div>

          {/* V22: Analyze loaded sugya button */}
          <button
            className="analyze-sugya-btn"
            onClick={() => {
              // Update fullText with the loaded sugya text to trigger re-analysis
              if (sugyaData.fullHebrewText) {
                setFullText(sugyaData.fullHebrewText);
                console.log('[ProScholar V22] Analyzing loaded sugya text:', sugyaData.fullHebrewText.length, 'chars');
              }
            }}
          >
            <span className="btn-icon">🔬</span>
            <span>נתח את הסוגיה המלאה</span>
          </button>
        </div>
      )}

      {/* Collapsed Sugya indicator */}
      {sugyaData && !sugyaExpanded && (
        <div className="sugya-collapsed">
          <button
            className="expand-sugya-btn"
            onClick={() => setSugyaExpanded(true)}
          >
            <span className="btn-icon">📚</span>
            <span>הצג סוגיה מלאה ({sugyaData.pageCount} דפים)</span>
          </button>
        </div>
      )}

      {/* Enhanced Stats Bar */}
      <div className="stats-bar-pro">
        <div className="stat-group">
          <div className="stat-item-pro">
            <span className="stat-label">מילים</span>
            <span className="stat-value-pro">{analysis.stats.words}</span>
          </div>
          <div className="stat-item-pro">
            <span className="stat-label">משפטים</span>
            <span className="stat-value-pro">{analysis.stats.sentences}</span>
          </div>
          {analysis.sages.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">חכמים</span>
              <span className="stat-value-pro">{analysis.sages.length}</span>
            </div>
          )}
          {analysis.pesukim.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">פסוקים</span>
              <span className="stat-value-pro">{analysis.pesukim.length}</span>
            </div>
          )}
          {analysis.keyTerms?.length > 0 && (
            <div className="stat-item-pro">
              <span className="stat-label">מונחים</span>
              <span className="stat-value-pro">{analysis.keyTerms.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL MISHNA TEXT - Complete Content
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishna?.fullContent && (
        <div className="section mishna-full-text">
          <div className="section-header">
            <span className="section-icon">📜</span>
            <span className="section-title">משנה - טקסט מלא</span>
            <span className="char-count">{analysis.mishna.fullContent.length} תווים</span>
          </div>
          <div className="full-text-content mishna">
            {analysis.mishna.fullContent}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FULL GEMARA TEXT - Complete Content
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.gemaraFullText && (
        <div className="section gemara-full-text">
          <div className="section-header">
            <span className="section-icon">📖</span>
            <span className="section-title">גמרא - טקסט מלא</span>
            <span className="char-count">{analysis.gemaraFullText.length} תווים</span>
          </div>
          <div className="full-text-content gemara">
            {analysis.gemaraFullText}
          </div>
          {analysis.gemaraFullText.length < 100 && !sugyaData && (
            <div className="short-content-hint">
              <span className="hint-icon">💡</span>
              <span className="hint-text">הגמרא קצרה - לחץ על "טען סוגיה מלאה" למעלה לקבלת ניתוח מקיף יותר</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V22: SUGYA SUMMARY - Main question and resolution
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.sugyaSummary || analysis.mainQuestion || analysis.mainResolution) && (
        <div className="section sugya-summary-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <span className="section-title">סיכום הסוגיא</span>
          </div>

          {/* Auto-generated summary sentence */}
          {analysis.sugyaSummary && (
            <div className="sugya-summary-text">
              <p>{analysis.sugyaSummary}</p>
            </div>
          )}

          {/* Main Question and Resolution Cards */}
          <div className="qa-cards">
            {analysis.mainQuestion && (
              <div className="qa-card question-card">
                <div className="qa-card-header">
                  <span className="qa-icon">❓</span>
                  <span className="qa-label">שאלה מרכזית</span>
                </div>
                <div className="qa-card-content">
                  {analysis.mainQuestion.text}
                </div>
              </div>
            )}

            {analysis.mainResolution && (
              <div className={`qa-card resolution-card ${analysis.mainResolution.type}`}>
                <div className="qa-card-header">
                  <span className="qa-icon">
                    {analysis.mainResolution.type === 'unresolved' ? '🟡' :
                     analysis.mainResolution.type === 'difficulty' ? '❌' : '✓'}
                  </span>
                  <span className="qa-label">
                    {analysis.mainResolution.type === 'unresolved' ? 'תיקו' :
                     analysis.mainResolution.type === 'difficulty' ? 'קשיא' : 'תירוץ/מסקנה'}
                  </span>
                </div>
                <div className="qa-card-content">
                  {analysis.mainResolution.text}
                </div>
              </div>
            )}
          </div>

          {/* Halachic takeaway if found */}
          {analysis.halachicTakeaway?.rule && (
            <div className="halacha-takeaway">
              <span className="halacha-icon">⚖️</span>
              <span className="halacha-text">{analysis.halachicTakeaway.rule}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          KEY TERMS ANALYSIS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.keyTerms?.length > 0 && (
        <div className="section key-terms-section">
          <div className="section-header">
            <span className="section-icon">🔤</span>
            <span className="section-title">מונחים מרכזיים</span>
          </div>
          <div className="key-terms-grid">
            {analysis.keyTerms.map((item, i) => (
              <div key={i} className="key-term-item">
                <span className="term-word">{item.term}</span>
                <span className="term-count">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: MISHNA STRUCTURED ANALYSIS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishna?.content && (
        <div className="section mishna-structured">
          <div className="section-header">
            <span className="section-num">1</span>
            <span className="section-icon">🔍</span>
            <span className="section-title">ניתוח מובנה של המשנה</span>
            {analysis.mishna.structureType && (
              <span className={`structure-badge ${analysis.mishna.structureType}`}>
                {analysis.mishna.structureType === 'enumeration' ? 'מנייה' :
                 analysis.mishna.structureType === 'explanation' ? 'הסבר' :
                 analysis.mishna.structureType === 'conditional' ? 'תנאי' :
                 analysis.mishna.structureType === 'ruling' ? 'פסק' :
                 analysis.mishna.structureType === 'dispute' ? 'מחלוקת' : ''}
              </span>
            )}
          </div>

          <div className="mishna-grid">
            {/* Topic - Full width */}
            {analysis.mishna.topic && (
              <div className="mishna-field topic full-width">
                <span className="field-label">נושא המשנה</span>
                <span className="field-value large">{analysis.mishna.topic}</span>
              </div>
            )}

            {/* Numbers/Enumeration if detected */}
            {analysis.mishna.numbers?.length > 0 && (
              <div className="mishna-field numbers">
                <span className="field-label">מניין</span>
                <div className="numbers-list">
                  {analysis.mishna.numbers.map((n, i) => (
                    <span key={i} className="number-badge">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Cases if enumeration type */}
            {analysis.mishna.cases?.length > 0 && (
              <div className="mishna-field cases full-width">
                <span className="field-label">מקרים במשנה</span>
                <div className="cases-list">
                  {analysis.mishna.cases.map((c, i) => (
                    <div key={i} className="case-item">
                      <span className="case-num">{i + 1}</span>
                      <span className="case-text">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Case Details */}
            {(analysis.mishna.caseDetails?.who?.length > 0 || analysis.mishna.caseDetails?.conditions?.length > 0) && (
              <div className="mishna-field case-details">
                <span className="field-label">פרטי המקרה</span>
                <div className="case-content">
                  {analysis.mishna.caseDetails.who.length > 0 && (
                    <div className="case-who">
                      <span className="case-label">מי:</span>
                      {analysis.mishna.caseDetails.who.map((w, i) => (
                        <span key={i} className="case-chip who">{w}</span>
                      ))}
                    </div>
                  )}
                  {analysis.mishna.caseDetails.conditions.length > 0 && (
                    <div className="case-conditions">
                      <span className="case-label">תנאים:</span>
                      {analysis.mishna.caseDetails.conditions.map((c, i) => (
                        <span key={i} className="case-chip condition">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ruling */}
            {analysis.mishna.ruling?.decision && (
              <div className="mishna-field ruling">
                <span className="field-label">פסק</span>
                <div className="ruling-content">
                  <span className={`ruling-badge ${analysis.mishna.ruling.isDispute ? 'dispute' : 'unanimous'}`}>
                    {analysis.mishna.ruling.author}
                  </span>
                  <span className="ruling-text">{analysis.mishna.ruling.decision}</span>
                </div>
              </div>
            )}

            {/* Key Principle */}
            {analysis.mishna.keyPrinciple && (
              <div className="mishna-field principle">
                <span className="field-label">עיקרון</span>
                <span className="field-value highlight">{analysis.mishna.keyPrinciple}</span>
              </div>
            )}

            {/* One-Line Summary */}
            {analysis.mishna.oneLine && (
              <div className="mishna-field one-line">
                <span className="field-label">בקצרה</span>
                <span className="field-value summary">{analysis.mishna.oneLine}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: QUESTIONS THE GEMARA ASKS
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.gemaraQuestions?.length > 0 && (
        <div className="section gemara-questions">
          <div className="section-header">
            <span className="section-num">2</span>
            <span className="section-icon">🔍</span>
            <span className="section-title">שאלות הגמרא על המשנה</span>
            <span className="count-badge">{analysis.gemaraQuestions.length}</span>
          </div>

          {/* PRO SCHOLAR V23: Enhanced questions display with full context */}
          <div className="questions-list v23">
            {analysis.gemaraQuestions.map((q, i) => (
              <div key={i} className={`question-item ${q.type}`}>
                <div className="question-header">
                  <span className="question-num">{i + 1}</span>
                  <span className={`question-type-badge ${q.type}`}>{q.label}</span>
                </div>
                <div className="question-content">
                  {/* Show fullContext if available, otherwise fall back to context or label */}
                  <span className="question-text">
                    {q.fullContext || q.context || q.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2.5: HALACHIC SCENARIOS (from Mishna)
          PRO SCHOLAR V20: Visual representation of case scenarios
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.halachicScenarios?.length > 0 && (
        <div className="section halachic-scenarios">
          <div className="section-header">
            <span className="section-icon">⚖️</span>
            <span className="section-title">תרחישים ודינים</span>
            <span className="count-badge">{analysis.halachicScenarios.length} מקרים</span>
          </div>

          <div className="scenarios-grid">
            {analysis.halachicScenarios.map((scenario, i) => (
              <div key={i} className={`scenario-card ruling-${scenario.ruling?.toLowerCase() || 'neutral'}`}>
                <div className="scenario-header">
                  <span className="scenario-num">{i + 1}</span>
                  <span className="scenario-actor">{scenario.actor}</span>
                </div>
                <div className="scenario-action">
                  {scenario.action && <span className="action-text">{scenario.action}</span>}
                </div>
                <div className="scenario-ruling">
                  <span className={`ruling-badge ${scenario.ruling?.toLowerCase() || ''}`}>
                    {scenario.ruling === 'חייב' ? '🔴 חייב' :
                     scenario.ruling === 'פטור' ? '🟢 פטור' :
                     scenario.ruling === 'מותר' ? '✅ מותר' :
                     scenario.ruling === 'אסור' ? '🚫 אסור' :
                     scenario.ruling || '⚪ לא ידוע'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Show contrasting summary if there are both חייב and פטור */}
          {analysis.halachicScenarios.some(s => s.ruling === 'חייב') &&
           analysis.halachicScenarios.some(s => s.ruling === 'פטור') && (
            <div className="scenarios-summary">
              <div className="summary-item chiyuv">
                <span className="summary-icon">🔴</span>
                <span className="summary-count">
                  {analysis.halachicScenarios.filter(s => s.ruling === 'חייב').length}
                </span>
                <span className="summary-label">חייב</span>
              </div>
              <div className="summary-divider">⟷</div>
              <div className="summary-item ptur">
                <span className="summary-icon">🟢</span>
                <span className="summary-count">
                  {analysis.halachicScenarios.filter(s => s.ruling === 'פטור').length}
                </span>
                <span className="summary-label">פטור</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: GEMARA STEP-BY-STEP FLOW - PRO SCHOLAR V22 Enhanced Diagram
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.sugyaSteps?.length > 0 && (
        <div className="section sugya-steps enhanced v22">
          <div className="section-header">
            <span className="section-num">3</span>
            <span className="section-icon">🔄</span>
            <span className="section-title">מהלך הסוגיא</span>
            <span className="count-badge">{analysis.sugyaSteps.length} שלבים</span>
          </div>

          {/* PRO SCHOLAR V22: Flow type summary badges */}
          <div className="flow-summary-badges">
            {(() => {
              const typeCounts = analysis.sugyaSteps.reduce((acc, s) => {
                acc[s.type] = (acc[s.type] || 0) + 1;
                return acc;
              }, {});
              return Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} className={`flow-badge ${type}`}>
                  {type === 'question' ? '❓' : type === 'proof' ? '📖' : type === 'objection' ? '⚡' :
                   type === 'resolution' ? '✓' : type === 'conclusion' ? '⚖️' : type === 'statement' ? '💬' :
                   type === 'reason' ? '💡' : type === 'logical' ? '🔗' : type === 'example' ? '📝' :
                   type === 'tradition' ? '📜' : type === 'chain' ? '🔗' : type === 'distinction' ? '⚡' :
                   type === 'support' ? '✅' : type === 'alternative' ? '🔄' : '•'} {count}
                </span>
              ));
            })()}
          </div>

          <div className="steps-flow-enhanced v22">
            {/* PRO SCHOLAR V22: Start marker */}
            <div className="flow-marker start">
              <span className="marker-dot"></span>
              <span className="marker-label">התחלה</span>
            </div>

            {analysis.sugyaSteps.map((step, i) => {
              const prevStep = i > 0 ? analysis.sugyaSteps[i - 1] : null;
              const isTransition = prevStep && prevStep.type !== step.type;
              const isQuestion = step.type === 'question' || step.type === 'inquiry';
              const isObjection = step.type === 'objection';
              const isResolution = step.type === 'resolution' || step.type === 'answer';
              const isConclusion = step.type === 'conclusion';

              return (
                <div key={i} className={`step-card-v22 ${step.type} ${isTransition ? 'transition' : ''}`}>
                  {/* Connection line with type indicator */}
                  <div className="step-connector-v22">
                    <div className={`connector-line-v22 ${isObjection ? 'challenge' : isResolution ? 'resolve' : ''}`}>
                      {isObjection && <span className="connector-icon">↯</span>}
                      {isResolution && <span className="connector-icon">↻</span>}
                      {isConclusion && <span className="connector-icon">⬇</span>}
                    </div>
                  </div>

                  {/* Step node */}
                  <div className={`step-node-v22 ${step.type}`}>
                    <span className="node-num">{step.step}</span>
                    <span className="node-icon">{step.icon}</span>
                  </div>

                  {/* Step content card */}
                  <div className={`step-content-v22 ${step.type}`}>
                    <div className="step-header-v22">
                      <span className={`step-type-badge ${step.type}`}>
                        {step.type === 'question' ? 'שאלה' : step.type === 'inquiry' ? 'בירור' :
                         step.type === 'proof' ? 'מקור' : step.type === 'answer' ? 'תשובה' :
                         step.type === 'objection' ? 'קושיא' : step.type === 'resolution' ? 'תירוץ' :
                         step.type === 'conclusion' ? 'מסקנה' : step.type === 'statement' ? 'אמירה' :
                         step.type === 'reason' ? 'טעם' : step.type === 'logical' ? 'היגיון' :
                         step.type === 'example' ? 'דוגמא' : step.type === 'tradition' ? 'מסורת' :
                         step.type === 'chain' ? 'שלשלת' : step.type === 'distinction' ? 'חילוק' :
                         step.type === 'support' ? 'סיוע' : step.type === 'alternative' ? 'אפשרות' : step.type}
                      </span>
                      <span className="step-label-v22">{step.label}</span>
                    </div>
                    {step.content && (
                      <div className="step-text-v22">
                        <span className="quote-mark">״</span>
                        <span className="step-content">{step.content}</span>
                        <span className="quote-mark">״</span>
                      </div>
                    )}
                    {/* Visual indicator for flow type */}
                    {isQuestion && <div className="step-flow-indicator question-indicator">?</div>}
                    {isObjection && <div className="step-flow-indicator objection-indicator">!</div>}
                    {isResolution && <div className="step-flow-indicator resolution-indicator">✓</div>}
                  </div>
                </div>
              );
            })}

            {/* PRO SCHOLAR V22: End marker */}
            <div className="flow-marker end">
              <span className="marker-dot"></span>
              <span className="marker-label">סיום</span>
            </div>
          </div>

          {/* PRO SCHOLAR V22: Enhanced visual legend */}
          <div className="steps-legend v22">
            <div className="legend-title">מפתח סימנים</div>
            <div className="legend-grid">
              <div className="legend-item question"><span className="legend-icon">❓</span><span className="legend-text">שאלה / בירור</span></div>
              <div className="legend-item proof"><span className="legend-icon">📖</span><span className="legend-text">מקור / ראיה</span></div>
              <div className="legend-item objection"><span className="legend-icon">⚡</span><span className="legend-text">קושיא / סתירה</span></div>
              <div className="legend-item resolution"><span className="legend-icon">✓</span><span className="legend-text">תירוץ / יישוב</span></div>
              <div className="legend-item conclusion"><span className="legend-icon">⚖️</span><span className="legend-text">מסקנה / פסק</span></div>
              <div className="legend-item statement"><span className="legend-icon">💬</span><span className="legend-text">אמירת חכם</span></div>
              <div className="legend-item reason"><span className="legend-icon">💡</span><span className="legend-text">טעם / הסבר</span></div>
              <div className="legend-item logical"><span className="legend-icon">🔗</span><span className="legend-text">היגיון לוגי</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: OPINIONS (if multiple) - PRO SCHOLAR V22 Enhanced
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.opinions?.length > 0 && (
        <div className="section opinions-section v22">
          <div className="section-header">
            <span className="section-num">4</span>
            <span className="section-icon">⚖️</span>
            <span className="section-title">דעות ומחלוקות</span>
            <span className="count-badge">{analysis.opinions.length} שיטות</span>
          </div>

          {/* PRO SCHOLAR V22: Visual debate diagram when 2 opinions */}
          {analysis.opinions.length === 2 && (
            <div className="debate-diagram">
              <div className={`debate-side left ${analysis.opinions[0].type || 'amora'}`}>
                <div className="debate-avatar">
                  {analysis.opinions[0].type === 'tanna' ? '📜' :
                   analysis.opinions[0].type === 'school' ? '🏛️' :
                   analysis.opinions[0].type === 'dispute' ? '⚔️' : '👤'}
                </div>
                <div className="debate-name">{analysis.opinions[0].name}</div>
                <div className="debate-type-badge">
                  {analysis.opinions[0].type === 'tanna' ? 'תנא' :
                   analysis.opinions[0].type === 'amora' ? 'אמורא' :
                   analysis.opinions[0].type === 'school' ? 'בית מדרש' :
                   analysis.opinions[0].type === 'dispute' ? 'מחלוקת' : 'חכם'}
                </div>
                <div className="debate-position">{analysis.opinions[0].position}</div>
              </div>
              <div className="debate-vs">
                <span className="vs-icon">⚔️</span>
                <span className="vs-text">מחלוקת</span>
              </div>
              <div className={`debate-side right ${analysis.opinions[1].type || 'amora'}`}>
                <div className="debate-avatar">
                  {analysis.opinions[1].type === 'tanna' ? '📜' :
                   analysis.opinions[1].type === 'school' ? '🏛️' :
                   analysis.opinions[1].type === 'dispute' ? '⚔️' : '👤'}
                </div>
                <div className="debate-name">{analysis.opinions[1].name}</div>
                <div className="debate-type-badge">
                  {analysis.opinions[1].type === 'tanna' ? 'תנא' :
                   analysis.opinions[1].type === 'amora' ? 'אמורא' :
                   analysis.opinions[1].type === 'school' ? 'בית מדרש' :
                   analysis.opinions[1].type === 'dispute' ? 'מחלוקת' : 'חכם'}
                </div>
                <div className="debate-position">{analysis.opinions[1].position}</div>
              </div>
            </div>
          )}

          {/* PRO SCHOLAR V22: Grid for 3+ opinions */}
          {analysis.opinions.length !== 2 && (
            <div className="opinions-grid v22">
              {analysis.opinions.map((op, i) => (
                <div key={i} className={`opinion-card-v22 ${op.type || 'amora'}`}>
                  <div className="opinion-header-v22">
                    <span className="opinion-avatar">
                      {op.type === 'tanna' ? '📜' :
                       op.type === 'school' ? '🏛️' :
                       op.type === 'dispute' ? '⚔️' : '👤'}
                    </span>
                    <div className="opinion-info">
                      <span className="opinion-name-v22">{op.name}</span>
                      <span className={`opinion-type-badge ${op.type || 'amora'}`}>
                        {op.type === 'tanna' ? 'תנא' :
                         op.type === 'amora' ? 'אמורא' :
                         op.type === 'school' ? 'בית מדרש' :
                         op.type === 'opinion' ? 'סובר' :
                         op.type === 'dispute' ? 'מחלוקת' : 'חכם'}
                      </span>
                    </div>
                  </div>
                  <div className="opinion-position-v22">
                    <span className="position-quote">״</span>
                    {op.position}
                    <span className="position-quote">״</span>
                  </div>
                  {op.reason && (
                    <div className="opinion-reason">
                      <span className="reason-label">טעם:</span>
                      <span className="reason-text">{op.reason}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PRO SCHOLAR V22: Enhanced main difference display */}
          {analysis.mainDifference && (
            <div className="main-difference-v22">
              <div className="diff-header">
                <span className="diff-icon">🎯</span>
                <span className="diff-label">עיקר המחלוקת</span>
              </div>
              <div className="diff-content">
                <span className="diff-text">{analysis.mainDifference}</span>
              </div>
            </div>
          )}

          {/* PRO SCHOLAR V22: Opinion type legend */}
          <div className="opinion-legend">
            <span className="legend-item tanna"><span>📜</span> תנא</span>
            <span className="legend-item amora"><span>👤</span> אמורא</span>
            <span className="legend-item school"><span>🏛️</span> בית מדרש</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: CORE LOGIC OF THE SUGYA
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.coreLogic?.principle || analysis.middot?.length > 0) && (
        <div className="section core-logic">
          <div className="section-header">
            <span className="section-num">5</span>
            <span className="section-icon">🧠</span>
            <span className="section-title">היגיון הסוגיא</span>
          </div>

          <div className="logic-content">
            {analysis.coreLogic?.principle && (
              <div className="logic-principle">
                <span className="principle-badge">{analysis.coreLogic.principle}</span>
              </div>
            )}

            {analysis.middot?.length > 0 && (
              <div className="middot-used">
                <span className="middot-label">מידות דרש:</span>
                {analysis.middot.map((m, i) => (
                  <span key={i} className="midda-chip">
                    <span className="midda-name">{m.name}</span>
                  </span>
                ))}
              </div>
            )}

            {analysis.pesukim?.length > 0 && (
              <div className="pesukim-cited">
                <span className="pesukim-label">פסוקים שנדרשו:</span>
                {analysis.pesukim.map((p, i) => (
                  <div key={i} className="pasuk-item">
                    <span className="pasuk-icon">📖</span>
                    <span className="pasuk-text">{p.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: CONNECTION BACK TO MISHNA
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.mishnaConnection?.type && (
        <div className="section mishna-connection">
          <div className="section-header">
            <span className="section-num">6</span>
            <span className="section-icon">🔗</span>
            <span className="section-title">חזרה למשנה</span>
          </div>

          <div className="connection-content">
            <span className={`connection-type ${analysis.mishnaConnection.type}`}>
              {analysis.mishnaConnection.type === 'explains' ? 'מפרשת' :
               analysis.mishnaConnection.type === 'limits' ? 'מצמצמת' :
               analysis.mishnaConnection.type === 'expands' ? 'מרחיבה' :
               analysis.mishnaConnection.type === 'reinterprets' ? 'מפרשת מחדש' : ''}
            </span>
            {analysis.mishnaConnection.description && (
              <span className="connection-desc">{analysis.mishnaConnection.description}</span>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7: FINAL HALACHIC TAKEAWAY
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.halachicTakeaway?.rule && (
        <div className="section halachic-takeaway">
          <div className="section-header">
            <span className="section-num">7</span>
            <span className="section-icon">📌</span>
            <span className="section-title">מסקנה הלכתית</span>
          </div>

          <div className="takeaway-content">
            <div className="takeaway-rule">
              <span className="rule-icon">⚖️</span>
              <span className="rule-text">{analysis.halachicTakeaway.rule}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SAGES MENTIONED (Supplementary)
          ═══════════════════════════════════════════════════════════════════════ */}
      {analysis.sages?.length > 0 && (
        <div className="section sages-section supplementary">
          <div className="section-header">
            <span className="section-icon">👤</span>
            <span className="section-title">חכמים שהוזכרו</span>
          </div>
          <div className="sages-chips">
            {analysis.sages.map((sage, i) => (
              <span key={i} className={`sage-chip ${sage.type}`}>
                {sage.type === 'tanna' ? '📜' : sage.type === 'amora' ? '📖' : '🏛️'} {sage.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cross References (Supplementary) */}
      {analysis.crossRefs?.length > 0 && (
        <div className="section crossref-section supplementary">
          <div className="section-header">
            <span className="section-icon">🔗</span>
            <span className="section-title">מקורות מקבילים</span>
          </div>
          {analysis.crossRefs.map((ref, i) => (
            <div key={i} className="crossref-item">
              <span className="crossref-source">{ref.source}:</span>
              <span className="crossref-text">{ref.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Key Terms (Supplementary) */}
      {analysis.keyTerms?.length > 0 && (
        <div className="section terms-section supplementary">
          <div className="section-header">
            <span className="section-icon">🔑</span>
            <span className="section-title">מילות מפתח</span>
          </div>
          <div className="terms-grid">
            {analysis.keyTerms.map((t, i) => (
              <span key={i} className={`term-chip ${t.category || ''}`}>
                {t.term} <span className="term-count">×{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V13: REVIEW QUESTIONS (Chazara)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="section review-questions supplementary">
        <div className="section-header">
          <span className="section-icon">📝</span>
          <span className="section-title">שאלות חזרה</span>
        </div>
        <div className="questions-list chazara">
          {/* Question 1: Topic */}
          {analysis.mishna?.topic && (
            <div className="review-question">
              <span className="q-num">1</span>
              <span className="q-text">מה נושא המשנה/הסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.mishna.topic}</p>
              </details>
            </div>
          )}

          {/* Question 2: Opinions */}
          {analysis.opinions?.length > 1 && (
            <div className="review-question">
              <span className="q-num">2</span>
              <span className="q-text">מה המחלוקת בסוגיא ומי הצדדים?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>
                  {analysis.opinions.map(o => o.name).join(' ו')}
                  {analysis.mainDifference && ` - ${analysis.mainDifference}`}
                </p>
              </details>
            </div>
          )}

          {/* Question 3: Halacha */}
          {analysis.halachicTakeaway?.rule && (
            <div className="review-question">
              <span className="q-num">3</span>
              <span className="q-text">מה ההלכה למעשה?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.halachicTakeaway.rule}</p>
              </details>
            </div>
          )}

          {/* Question 4: Sages */}
          {analysis.sages?.length > 0 && (
            <div className="review-question">
              <span className="q-num">4</span>
              <span className="q-text">אילו חכמים מוזכרים בסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.sages.map(s => s.name).join(', ')}</p>
              </details>
            </div>
          )}

          {/* Question 5: Key Terms */}
          {analysis.keyTerms?.length >= 3 && (
            <div className="review-question">
              <span className="q-num">5</span>
              <span className="q-text">מהם המושגים המרכזיים בסוגיא?</span>
              <details className="q-answer">
                <summary>לחץ לתשובה</summary>
                <p>{analysis.keyTerms.slice(0, 5).map(t => t.term).join(', ')}</p>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PRO SCHOLAR V13: ONE-LINE SUMMARY
          ═══════════════════════════════════════════════════════════════════════ */}
      {(analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule) && (
        <div className="section one-line-summary">
          <div className="section-header">
            <span className="section-icon">💡</span>
            <span className="section-title">סיכום במשפט אחד</span>
          </div>
          <div className="one-line-content">
            <p className="one-line-text">
              {analysis.mishna?.oneLine || analysis.halachicTakeaway?.rule ||
               `${analysis.mishna?.topic || 'הסוגיא'} - ${analysis.sages?.[0]?.name || 'חכמים'} דנים ב${analysis.keyTerms?.[0]?.term || 'נושא זה'}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// PRO SCHOLAR V12: Daf Diagram Section - Visual Mermaid Diagrams (No AI)
// =============================================================================

const DafDiagramSection = React.memo(function DafDiagramSection({ reference, text }) {
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagramType, setDiagramType] = useState(DIAGRAM_TYPES.SUMMARY);
  // PRO SCHOLAR V13: Full daf text state for complete analysis
  const [fullDafText, setFullDafText] = useState(null);
  const [loadingFullText, setLoadingFullText] = useState(false);

  // Parse tractate and daf from reference
  // Handles formats: "Shabbat 2a", "Shabbat.2a", "Bava_Metzia.59b"
  const dafInfo = useMemo(() => {
    if (!reference) return null;

    // Try multiple patterns
    // Pattern 1: "Shabbat 2a" (space separated)
    // Pattern 2: "Shabbat.2a" (dot separated)
    // Pattern 3: "Bava_Metzia.59b" (underscore in name, dot before daf)
    const patterns = [
      /^(.+?)\s+(\d+)([ab])$/i,       // Space: "Shabbat 2a"
      /^(.+?)\.(\d+)([ab])$/i,        // Dot: "Shabbat.2a"
      /^(.+?)[._](\d+)([ab])$/i       // Either: "Shabbat.2a" or "Shabbat_2a"
    ];

    for (const pattern of patterns) {
      const match = reference.match(pattern);
      if (match) {
        // Clean up tractate name (remove underscores, handle multi-word names)
        const tractate = match[1].replace(/_/g, ' ').trim();
        return { tractate, daf: `${match[2]}${match[3]}` };
      }
    }

    return null;
  }, [reference]);

  // PRO SCHOLAR V22: ALWAYS fetch full daf text from Sefaria for complete analysis
  // The text prop often contains only partial content (Mishna + small Gemara snippet)
  useEffect(() => {
    console.log('[DafDiagram V22] useEffect triggered:', { dafInfo, textLen: text?.length });

    if (!dafInfo) {
      console.log('[DafDiagram V22] No dafInfo available');
      setFullDafText(null);
      return;
    }

    let cancelled = false;
    setLoadingFullText(true);
    console.log(`[DafDiagram V22] Fetching ${dafInfo.tractate} ${dafInfo.daf}...`);

    // ALWAYS fetch the complete daf text from Sefaria
    // This ensures we have the full Gemara content for proper analysis
    getTalmudDaf(dafInfo.tractate, dafInfo.daf)
      .then(result => {
        console.log('[DafDiagram V22] API Response:', {
          ref: result?.ref,
          segments: result?.segments?.length,
          hebrewArr: result?.hebrew?.length,
          totalChars: result?.hebrew?.join?.(' ')?.length
        });

        if (!cancelled) {
          // Combine all Hebrew segments into one complete text
          const combinedText = result.hebrew?.join(' ') || '';
          if (combinedText.length > 0) {
            setFullDafText(combinedText);
            console.log(`[DafDiagram V22] SUCCESS: ${combinedText.length} chars, ${result.segments?.length} segments`);
          } else {
            // Fallback to provided text if fetch returns empty
            setFullDafText(text || '');
            console.warn(`[DafDiagram V22] API empty, fallback to text: ${text?.length || 0} chars`);
          }
          setLoadingFullText(false);
        }
      })
      .catch(err => {
        console.error('[DafDiagram V22] FETCH ERROR:', err.message, err);
        if (!cancelled) {
          // Use provided text as fallback
          setFullDafText(text || '');
          setLoadingFullText(false);
        }
      });

    return () => { cancelled = true; };
  }, [dafInfo, text]);

  // Generate diagram when reference or type changes
  useEffect(() => {
    if (!dafInfo) {
      setDiagram(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // PRO SCHOLAR V12: Generate diagram from tractate/daf reference
    generateDafDiagram(dafInfo.tractate, dafInfo.daf, {
      type: diagramType
    })
      .then(result => {
        if (!cancelled) {
          setDiagram(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [dafInfo, diagramType]);

  if (!reference) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">🗺️</div>
        <div className="empty-title">נווט לדף בתלמוד</div>
        <p className="empty-text">בחר מסכת ודף כדי לראות תרשים ויזואלי.</p>
      </div>
    );
  }

  if (!dafInfo) {
    return (
      <div className="empty-state scholarly">
        <div className="empty-icon">⚠️</div>
        <div className="empty-title">לא ניתן לנתח מקור זה</div>
        <p className="empty-text">
          התרשימים זמינים רק עבור דפי תלמוד בבלי.
          <br />
          <small style={{ opacity: 0.6 }}>
            (מקור: {reference || 'לא זוהה'})
          </small>
        </p>
      </div>
    );
  }

  return (
    <div className="daf-diagram-section">
      {/* Diagram Type Selector - Consolidated to 4 essential views */}
      <div className="diagram-type-selector">
        <div className="type-buttons compact">
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SUMMARY ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SUMMARY)}
            type="button"
            title="סיכום הסוגיא - מבנה, מסקנות והלכה"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-label">סיכום</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SUGYA_FLOW ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SUGYA_FLOW)}
            type="button"
            title="מהלך הסוגיא - קושיות ותירוצים"
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-label">מהלך</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.SPEAKER_NETWORK ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.SPEAKER_NETWORK)}
            type="button"
            title="חכמי הסוגיא - דורות ויחסים"
          >
            <span className="btn-icon">👥</span>
            <span className="btn-label">חכמים</span>
          </button>
          <button
            className={`type-btn ${diagramType === DIAGRAM_TYPES.OVERVIEW ? 'active' : ''}`}
            onClick={() => setDiagramType(DIAGRAM_TYPES.OVERVIEW)}
            type="button"
            title="מפרשים ומקורות"
          >
            <span className="btn-icon">📚</span>
            <span className="btn-label">מפרשים</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="diagram-loading">
          <div className="loading-spinner" />
          <span>טוען תרשים...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="diagram-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* PRO SCHOLAR V13: Loading state for full text fetch */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && loadingFullText && (
        <div className="diagram-loading">
          <div className="loading-spinner" />
          <span>טוען טקסט מלא של הדף...</span>
        </div>
      )}

      {/* PRO SCHOLAR Summary - Smart text-based analysis with full daf text */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && !loadingFullText && fullDafText && (
        <ProScholarSummary text={fullDafText} reference={reference} />
      )}

      {/* Mermaid Diagram Display - For non-summary types */}
      {diagramType !== DIAGRAM_TYPES.SUMMARY && !loading && !error && diagram && (
        <div className="diagram-container">
          <div className="diagram-header">
            <span className="diagram-title">{diagram.explanation}</span>
          </div>
          <Suspense fallback={<LazyLoadFallback />}>
            <MermaidDiagram
              chart={diagram.mermaid}
              id={`daf-diagram-${dafInfo.tractate}-${dafInfo.daf}-${diagramType}`}
              explanation={diagram.explanation}
            />
          </Suspense>
          {/* Stats */}
          {diagram.stats && (
            <div className="diagram-stats">
              {diagram.stats.commentators > 0 && (
                <span className="stat-item">📜 {diagram.stats.commentators} מפרשים</span>
              )}
              {diagram.stats.speakers > 0 && (
                <span className="stat-item">💬 {diagram.stats.speakers} חכמים</span>
              )}
              {diagram.stats.verses > 0 && (
                <span className="stat-item">📖 {diagram.stats.verses} פסוקים</span>
              )}
              {diagram.stats.parallels > 0 && (
                <span className="stat-item">🔗 {diagram.stats.parallels} מקבילות</span>
              )}
              {diagram.stats.patterns > 0 && (
                <span className="stat-item">📊 {diagram.stats.patterns} סימני מבנה</span>
              )}
              {diagram.stats.disputes > 0 && (
                <span className="stat-item">⚔️ {diagram.stats.disputes} מחלוקות</span>
              )}
              {diagram.stats.concepts > 0 && (
                <span className="stat-item">🧠 {diagram.stats.concepts} מושגים</span>
              )}
              {diagram.stats.relationships > 0 && (
                <span className="stat-item">🔗 {diagram.stats.relationships} קשרים</span>
              )}
              {diagram.stats.famousPairs > 0 && (
                <span className="stat-item">⭐ {diagram.stats.famousPairs} זוגות מפורסמים</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback for SUMMARY without text */}
      {diagramType === DIAGRAM_TYPES.SUMMARY && !loadingFullText && !fullDafText && (
        <div className="pro-summary-empty">
          <span className="empty-icon">📚</span>
          <span>נווט לדף בתלמוד לקבלת סיכום מפורט</span>
        </div>
      )}
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
