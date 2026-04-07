/**
 * SugyaTreeAnalysis - Tree visualization of Talmudic sugya structure
 *
 * Extracted from TalmudToolsTab.js (PRO SCHOLAR V31)
 * Shows Q&A as branching tree with collapsible branches.
 * Questions group with their answers (resolutions/proofs) as children.
 *
 * @module SugyaTreeAnalysis
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TALMUDIC_PATTERNS } from '../../../services/scholarly/discoursePatternService';
import { HEBREW_TYPE_LABELS } from '../../../constants/talmudStudy';

// =============================================================================
// TreeBranch - Single node in the sugya tree
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

// =============================================================================
// SugyaTreeView - Full tree visualization with summary and controls
// =============================================================================

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

export default SugyaTreeView;
export { TreeBranch };
