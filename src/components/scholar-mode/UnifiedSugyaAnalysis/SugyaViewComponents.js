/**
 * SugyaViewComponents - Extracted view mode components for UnifiedSugyaAnalysis
 * FlowView, TreeView, DiagramView, SummaryView
 */

import React, { useState, useMemo, useEffect, useCallback, memo, lazy, Suspense } from 'react';
import { HEBREW_TYPE_LABELS } from '../../../constants/talmudStudy';
import { TALMUDIC_PATTERNS } from '../../../services/scholarly/discoursePatternService';
import { DIAGRAM_TYPES, validateMermaidSyntax } from '../../../services/scholarly/talmudDiagramService';

const MermaidDiagram = lazy(() => import('../../commentary/CommentarySummary/MermaidDiagram'));

const LoadingFallback = () => (
  <div className="usa-loading-skeleton">
    <div className="skeleton-bar" style={{ width: '70%' }} />
    <div className="skeleton-bar" style={{ width: '85%' }} />
    <div className="skeleton-bar" style={{ width: '60%' }} />
  </div>
);

// =============================================================================
// FLOW NODE
// =============================================================================

const FlowNode = memo(({ pattern, index, isSelected, onClick, studyMode }) => {
  const config = TALMUDIC_PATTERNS[pattern.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[pattern.type] || pattern.type;
  const showExtended = studyMode === 'iyun';

  return (
    <div
      className={`usa-flow-node ${isSelected ? 'selected' : ''} type-${pattern.type}`}
      style={{ '--node-color': config.color || '#6b7280' }}
      onClick={() => onClick(pattern)}
      role="button"
      tabIndex={0}
      dir="rtl"
    >
      <div className="node-marker-row">
        <span className="node-index">{index + 1}</span>
        <span className="node-icon">{config.icon || '📌'}</span>
        <span className="node-type">{hebrewLabel}</span>
      </div>
      <div className="node-text">{pattern.marker}</div>
      {showExtended && pattern.context && (
        <div className="node-context">...{pattern.context}...</div>
      )}
    </div>
  );
});

FlowNode.displayName = 'FlowNode';

// =============================================================================
// FLOW CONNECTOR
// =============================================================================

const FlowConnector = memo(({ fromType, toType }) => {
  const getRelation = () => {
    if (['question', 'objection'].includes(fromType) && ['resolution', 'proof'].includes(toType)) return 'answer';
    if (toType === 'objection') return 'challenge';
    if (toType === 'proof') return 'support';
    return 'flow';
  };

  return (
    <div className={`usa-flow-connector ${getRelation()}`}>
      <div className="connector-line" />
      <span className="connector-arrow">↓</span>
    </div>
  );
});

FlowConnector.displayName = 'FlowConnector';

// =============================================================================
// FLOW VIEW
// =============================================================================

export const FlowView = memo(({ patterns, selectedPattern, onPatternSelect, studyMode }) => {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">📊</span>
        <span className="empty-text">לא נמצאו סימני מבנה בטקסט</span>
      </div>
    );
  }

  return (
    <div className="usa-flow-view">
      {patterns.map((pattern, index) => (
        <React.Fragment key={`${pattern.type}-${pattern.position}`}>
          <FlowNode
            pattern={pattern}
            index={index}
            isSelected={selectedPattern?.position === pattern.position}
            onClick={onPatternSelect}
            studyMode={studyMode}
          />
          {index < patterns.length - 1 && (
            <FlowConnector fromType={pattern.type} toType={patterns[index + 1].type} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

FlowView.displayName = 'FlowView';

// =============================================================================
// TREE NODE
// =============================================================================

const TreeNode = memo(({ node, depth, isExpanded, onToggle, onSelect, selectedId }) => {
  const config = TALMUDIC_PATTERNS[node.type] || {};
  const hebrewLabel = HEBREW_TYPE_LABELS[node.type] || node.type;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isQuestion = ['question', 'objection'].includes(node.type);
  const isResolved = isQuestion && hasChildren;

  return (
    <div className={`usa-tree-branch depth-${Math.min(depth, 4)}`} style={{ '--branch-color': config.color }}>
      <div
        className={`usa-tree-node ${isSelected ? 'selected' : ''} ${isResolved ? 'resolved' : ''}`}
        onClick={() => onSelect(node)}
        role="button"
        tabIndex={0}
      >
        {hasChildren && (
          <button
            className={`tree-toggle ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            type="button"
          >
            {isExpanded ? '▼' : '◀'}
          </button>
        )}
        <span className="tree-icon">{config.icon || '📌'}</span>
        <span className="tree-label">{hebrewLabel}</span>
        <span className="tree-marker">{node.marker?.substring(0, 40)}{node.marker?.length > 40 ? '...' : ''}</span>
        {isQuestion && (
          <span className={`tree-status ${isResolved ? 'resolved' : 'open'}`}>
            {isResolved ? '✓' : '?'}
          </span>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="usa-tree-children">
          {node.children.map((child, idx) => (
            <TreeNode
              key={child.id || idx}
              node={child}
              depth={depth + 1}
              isExpanded={true}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TreeNode.displayName = 'TreeNode';

// =============================================================================
// TREE VIEW
// =============================================================================

export const TreeView = memo(({ patterns, selectedPattern, onPatternSelect }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const tree = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];
    const nodes = [];
    let i = 0;
    while (i < patterns.length) {
      const p = patterns[i];
      const node = { ...p, id: `${p.type}-${p.position}`, children: [] };

      if (['mishna', 'gemara', 'baraita'].includes(p.type)) {
        nodes.push(node);
        i++;
        continue;
      }

      if (['question', 'objection'].includes(p.type)) {
        let j = i + 1;
        while (j < patterns.length) {
          const next = patterns[j];
          if (['question', 'objection', 'mishna', 'gemara', 'baraita'].includes(next.type)) break;
          if (['resolution', 'proof', 'alternative'].includes(next.type)) {
            node.children.push({ ...next, id: `${next.type}-${next.position}` });
          }
          j++;
        }
        nodes.push(node);
        i = j;
        continue;
      }

      nodes.push(node);
      i++;
    }
    return nodes;
  }, [patterns]);

  useEffect(() => {
    const expandable = new Set();
    tree.forEach(n => { if (n.children?.length > 0) expandable.add(n.id); });
    setExpandedNodes(expandable);
  }, [tree]);

  const handleToggle = useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  }, []);

  const handleSelect = useCallback((node) => {
    onPatternSelect(node);
  }, [onPatternSelect]);

  if (tree.length === 0) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">🌳</span>
        <span className="empty-text">לא נמצא מבנה לתצוגת עץ</span>
      </div>
    );
  }

  const questionNodes = tree.filter(n => ['question', 'objection'].includes(n.type));
  const resolved = questionNodes.filter(n => n.children?.length > 0).length;

  return (
    <div className="usa-tree-view" dir="rtl">
      <div className="usa-tree-summary">
        <span className="summary-item">
          <span className="s-icon">🌳</span>
          <span className="s-value">{tree.length}</span>
          <span className="s-label">צמתים</span>
        </span>
        <span className="summary-item resolved">
          <span className="s-icon">✅</span>
          <span className="s-value">{resolved}</span>
          <span className="s-label">נפתרו</span>
        </span>
        {questionNodes.length - resolved > 0 && (
          <span className="summary-item open">
            <span className="s-icon">❓</span>
            <span className="s-value">{questionNodes.length - resolved}</span>
            <span className="s-label">פתוחות</span>
          </span>
        )}
      </div>
      <div className="usa-tree-container">
        {tree.map((node, idx) => (
          <TreeNode
            key={node.id || idx}
            node={node}
            depth={0}
            isExpanded={expandedNodes.has(node.id)}
            onToggle={handleToggle}
            onSelect={handleSelect}
            selectedId={selectedPattern?.id}
          />
        ))}
      </div>
    </div>
  );
});

TreeView.displayName = 'TreeView';

// =============================================================================
// DIAGRAM VIEW
// =============================================================================

export const DiagramView = memo(({ mermaidCode, diagramType, onDiagramTypeChange }) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mermaidCode) {
      const validation = validateMermaidSyntax(mermaidCode);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
      } else {
        setError(null);
      }
    }
  }, [mermaidCode]);

  if (!mermaidCode) {
    return (
      <div className="usa-empty-state">
        <span className="empty-icon">🗺️</span>
        <span className="empty-text">אין מספיק נתונים ליצירת דיאגרמה</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usa-error-state">
        <span className="error-icon">⚠️</span>
        <span className="error-text">שגיאה בדיאגרמה: {error}</span>
      </div>
    );
  }

  return (
    <div className="usa-diagram-view">
      <div className="usa-diagram-types">
        {Object.entries(DIAGRAM_TYPES).slice(0, 4).map(([key, value]) => (
          <button
            key={key}
            className={`diagram-type-btn ${diagramType === value ? 'active' : ''}`}
            onClick={() => onDiagramTypeChange(value)}
            type="button"
          >
            {key === 'SUGYA_FLOW' ? '📊 זרימה' :
             key === 'SPEAKER_NETWORK' ? '👥 רשת' :
             key === 'HALACHIC_CHAIN' ? '⚖️ שרשרת' :
             key === 'MACHLOKET' ? '⚔️ מחלוקת' : key}
          </button>
        ))}
      </div>
      <Suspense fallback={<LoadingFallback />}>
        <div className="usa-diagram-container">
          <MermaidDiagram code={mermaidCode} />
        </div>
      </Suspense>
    </div>
  );
});

DiagramView.displayName = 'DiagramView';

// =============================================================================
// SUMMARY VIEW
// =============================================================================

export const SummaryView = memo(({ patterns, qaFlow, mishnaAnalysis, rabbis, studyMode }) => {
  const summary = useMemo(() => {
    const questions = patterns.filter(p => ['question', 'objection'].includes(p.type));
    const answers = patterns.filter(p => ['resolution', 'proof'].includes(p.type));
    const sources = patterns.filter(p => ['baraita', 'scripture', 'source_citation'].includes(p.type));
    return {
      structure: {
        hasMishna: patterns.some(p => p.type === 'mishna'),
        hasGemara: patterns.some(p => p.type === 'gemara'),
        hasBaraita: patterns.some(p => p.type === 'baraita')
      },
      dialectic: {
        questions: questions.length,
        answers: answers.length,
        resolved: Math.min(questions.length, answers.length)
      },
      sources: sources.length,
      rabbiCount: rabbis?.length || 0
    };
  }, [patterns, rabbis]);

  return (
    <div className="usa-summary-view" dir="rtl">
      <div className="usa-summary-section">
        <h4 className="section-title">
          <span className="title-icon">📚</span>
          מבנה הסוגיא
        </h4>
        <div className="summary-content">
          <p>
            {summary.structure.hasMishna && summary.structure.hasGemara
              ? 'סוגיא שלמה הכוללת משנה וגמרא'
              : summary.structure.hasMishna ? 'משנה בלבד' : 'דיון גמרא'}
            {summary.structure.hasBaraita && ' עם ציטוט ברייתות'}
          </p>
        </div>
      </div>

      <div className="usa-summary-section">
        <h4 className="section-title">
          <span className="title-icon">🔄</span>
          שקלא וטריא
        </h4>
        <div className="summary-content">
          <div className="dialectic-stats">
            <div className="d-stat">
              <span className="d-icon">❓</span>
              <span className="d-value">{summary.dialectic.questions}</span>
              <span className="d-label">שאלות/קושיות</span>
            </div>
            <div className="d-stat">
              <span className="d-icon">✅</span>
              <span className="d-value">{summary.dialectic.answers}</span>
              <span className="d-label">תירוצים/ראיות</span>
            </div>
            <div className="d-stat">
              <span className="d-icon">📖</span>
              <span className="d-value">{summary.sources}</span>
              <span className="d-label">מקורות</span>
            </div>
          </div>
        </div>
      </div>

      {qaFlow && qaFlow.flow && qaFlow.flow.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">💬</span>
            מהלך הדיון
          </h4>
          <div className="qa-flow-summary">
            {qaFlow.flow.map((unit, i) => (
              <div key={i} className="qa-unit-summary">
                <div className="qa-question">
                  <span className="qa-icon">❓</span>
                  <span className="qa-text">{unit.question?.marker?.substring(0, 60) || 'שאלה'}</span>
                </div>
                {unit.resolution && (
                  <div className="qa-resolution">
                    <span className="qa-icon">✅</span>
                    <span className="qa-text">{unit.resolution.marker?.substring(0, 60) || 'תירוץ'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {studyMode === 'iyun' && mishnaAnalysis && mishnaAnalysis.elements?.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">📘</span>
            מבנה המשנה
          </h4>
          <div className="mishna-elements">
            {mishnaAnalysis.summary?.hasEnumeration && <span className="mishna-badge">🔢 ספירה</span>}
            {mishnaAnalysis.summary?.hasConditions && <span className="mishna-badge">🔀 תנאים</span>}
            {mishnaAnalysis.summary?.hasRulings && <span className="mishna-badge">⚖️ פסקים</span>}
            {mishnaAnalysis.summary?.hasDisputes && <span className="mishna-badge">⚔️ מחלוקות</span>}
          </div>
        </div>
      )}

      {rabbis && rabbis.length > 0 && (
        <div className="usa-summary-section">
          <h4 className="section-title">
            <span className="title-icon">👤</span>
            חכמים מוזכרים ({rabbis.length})
          </h4>
          <div className="rabbis-list">
            {rabbis.slice(0, 8).map((rabbi, i) => (
              <span key={i} className="rabbi-badge">{rabbi.name || rabbi.match}</span>
            ))}
            {rabbis.length > 8 && <span className="rabbi-more">+{rabbis.length - 8}</span>}
          </div>
        </div>
      )}
    </div>
  );
});

SummaryView.displayName = 'SummaryView';
