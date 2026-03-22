/**
 * SugyaFlowVisualization - Visual representation of Talmudic discourse structure
 *
 * Displays the argumentative flow of a sugya (Talmudic discussion unit):
 * - Mishna statements
 * - Gemara discussions
 * - Questions and challenges
 * - Proofs and resolutions
 * - Rabbi attributions
 *
 * Inspired by Ury Diagrams and Daf Map methodologies
 */

import React, { useState, useCallback } from 'react';
import './SugyaFlowVisualization.css';

// =============================================================================
// FLOW NODE COMPONENT
// =============================================================================

const FlowNode = React.memo(({ node, isExpanded, onToggle, index }) => {
  const hasMultipleItems = node.items && node.items.length > 1;

  return (
    <div
      className={`flow-node flow-node-${node.type}`}
      style={{ '--node-color': node.color }}
      onClick={() => hasMultipleItems && onToggle(index)}
    >
      <div className="flow-node-header">
        <span className="flow-node-icon">{node.icon}</span>
        <span className="flow-node-label">{node.label}</span>
        {hasMultipleItems && (
          <span className="flow-node-count">({node.items.length})</span>
        )}
      </div>

      {/* Markers list - shown when expanded or single item */}
      {(isExpanded || !hasMultipleItems) && node.items && (
        <div className="flow-node-items">
          {node.items.map((item, i) => (
            <span key={i} className="flow-node-marker" dir="rtl" lang="he">
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Expand indicator */}
      {hasMultipleItems && (
        <span className="flow-node-expand">
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
    </div>
  );
});

// =============================================================================
// FLOW CONNECTOR
// =============================================================================

const FlowConnector = React.memo(({ fromType, toType }) => {
  // Different connector styles based on transition type
  const getConnectorStyle = () => {
    // Question leading to proof
    if (fromType === 'question' && toType === 'proof') {
      return 'connector-answer';
    }
    // Objection leading to resolution
    if (fromType === 'objection' && toType === 'resolution') {
      return 'connector-resolve';
    }
    // Challenge
    if (toType === 'objection') {
      return 'connector-challenge';
    }
    return 'connector-default';
  };

  return (
    <div className={`flow-connector ${getConnectorStyle()}`}>
      <div className="connector-line"></div>
      <div className="connector-arrow">↓</div>
    </div>
  );
});

// =============================================================================
// STATISTICS PANEL
// =============================================================================

const StatisticsPanel = React.memo(({ statistics, complexity }) => {
  return (
    <div className="flow-statistics">
      <div className="stat-header">
        <span className="stat-title">Sugya Analysis</span>
        <span className={`complexity-badge complexity-${complexity}`}>
          {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
        </span>
      </div>

      <div className="stat-grid">
        {statistics.questions > 0 && (
          <div className="stat-item">
            <span className="stat-icon">❓</span>
            <span className="stat-value">{statistics.questions}</span>
            <span className="stat-label">Questions</span>
          </div>
        )}

        {statistics.objections > 0 && (
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <span className="stat-value">{statistics.objections}</span>
            <span className="stat-label">Challenges</span>
          </div>
        )}

        {statistics.proofs > 0 && (
          <div className="stat-item">
            <span className="stat-icon">✅</span>
            <span className="stat-value">{statistics.proofs}</span>
            <span className="stat-label">Proofs</span>
          </div>
        )}

        {statistics.resolutions > 0 && (
          <div className="stat-item">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">{statistics.resolutions}</span>
            <span className="stat-label">Resolutions</span>
          </div>
        )}

        {statistics.rabbiMentions > 0 && (
          <div className="stat-item">
            <span className="stat-icon">👤</span>
            <span className="stat-value">{statistics.rabbiMentions}</span>
            <span className="stat-label">Rabbis</span>
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// LEGEND
// =============================================================================

const FlowLegend = React.memo(({ compact = false }) => {
  const legendItems = [
    { icon: '📘', label: 'Mishna', color: '#3B82F6' },
    { icon: '📜', label: 'Gemara', color: '#8B4513' },
    { icon: '❓', label: 'Question', color: '#F59E0B' },
    { icon: '⚡', label: 'Challenge', color: '#EF4444' },
    { icon: '✅', label: 'Proof', color: '#10B981' },
    { icon: '🎯', label: 'Resolution', color: '#7C3AED' },
    { icon: '📖', label: 'Scripture', color: '#14B8A6' }
  ];

  if (compact) {
    return (
      <div className="flow-legend compact">
        {legendItems.map(item => (
          <span key={item.label} className="legend-item-compact" title={item.label}>
            {item.icon}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flow-legend">
      <div className="legend-title">Legend</div>
      <div className="legend-items">
        {legendItems.map(item => (
          <div key={item.label} className="legend-item">
            <span className="legend-icon">{item.icon}</span>
            <span className="legend-label">{item.label}</span>
            <span
              className="legend-color"
              style={{ backgroundColor: item.color }}
            ></span>
          </div>
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * SugyaFlowVisualization
 *
 * @param {Object} props
 * @param {Object} props.flowData - Output from getFlowDiagram()
 * @param {string} props.variant - 'full', 'compact', or 'mini'
 * @param {boolean} props.showLegend - Show legend
 * @param {boolean} props.showStats - Show statistics panel
 * @param {Function} props.onNodeClick - Callback when node is clicked
 */
const SugyaFlowVisualization = ({
  flowData,
  variant = 'full',
  showLegend = true,
  showStats = true,
  onNodeClick
}) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const handleToggle = useCallback((index) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Handle empty or invalid data
  if (!flowData || !flowData.nodes || flowData.nodes.length === 0) {
    return (
      <div className="sugya-flow-empty">
        <div className="empty-icon">📊</div>
        <div className="empty-text">No discourse patterns detected</div>
        <div className="empty-hint">
          This text may not contain Talmudic structural markers
        </div>
      </div>
    );
  }

  const { nodes, structure, complexity, statistics } = flowData;

  // Structure indicator
  const structureLabel = {
    'sugya': 'Full Sugya (Mishna + Gemara)',
    'gemara-only': 'Gemara Discussion',
    'mishna-only': 'Mishna Text'
  }[structure] || 'Text Analysis';

  return (
    <div className={`sugya-flow-visualization variant-${variant}`}>
      {/* Header */}
      <div className="flow-header">
        <h3 className="flow-title">Discourse Flow</h3>
        <span className="structure-label">{structureLabel}</span>
      </div>

      {/* Statistics */}
      {showStats && variant !== 'mini' && statistics && (
        <StatisticsPanel statistics={statistics} complexity={complexity} />
      )}

      {/* Flow Diagram */}
      <div className="flow-diagram">
        {nodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <FlowNode
              node={node}
              index={index}
              isExpanded={expandedNodes.has(index)}
              onToggle={handleToggle}
            />

            {/* Connector to next node */}
            {index < nodes.length - 1 && (
              <FlowConnector
                fromType={node.type}
                toType={nodes[index + 1].type}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      {showLegend && (
        <FlowLegend compact={variant === 'compact' || variant === 'mini'} />
      )}
    </div>
  );
};

// =============================================================================
// INLINE FLOW INDICATOR
// For displaying within text
// =============================================================================

export const InlineFlowIndicator = React.memo(({ pattern }) => {
  return (
    <span
      className={`inline-flow-indicator ${pattern.cssClass}`}
      style={{
        '--indicator-color': pattern.color
      }}
      title={pattern.description}
    >
      <span className="indicator-icon">{pattern.icon}</span>
      <span className="indicator-label">{pattern.label}</span>
    </span>
  );
});

// =============================================================================
// MINI FLOW BAR
// Compact visualization for headers/sidebars
// =============================================================================

export const MiniFlowBar = React.memo(({ flowData }) => {
  if (!flowData || !flowData.nodes || flowData.nodes.length === 0) {
    return null;
  }

  return (
    <div className="mini-flow-bar">
      {flowData.nodes.slice(0, 8).map((node, index) => (
        <span
          key={index}
          className="mini-flow-item"
          style={{ backgroundColor: node.color }}
          title={`${node.icon} ${node.label}`}
        >
          {node.icon}
        </span>
      ))}
      {flowData.nodes.length > 8 && (
        <span className="mini-flow-more">+{flowData.nodes.length - 8}</span>
      )}
    </div>
  );
});

export default SugyaFlowVisualization;
