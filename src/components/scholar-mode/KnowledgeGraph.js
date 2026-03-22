/**
 * KnowledgeGraph - Visual concept web for Torah connections
 *
 * Displays interconnected concepts from Torah study:
 * - Word roots and their connections
 * - Thematic relationships
 * - Cross-references
 * - Commentary networks
 */
import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import './KnowledgeGraph.css';

// Node type configurations
const NODE_TYPES = {
  concept: { icon: '💡', color: '#d4af37', label: 'Concept' },
  verse: { icon: '📜', color: '#3b82f6', label: 'Verse' },
  root: { icon: '🌳', color: '#10b981', label: 'Root' },
  person: { icon: '👤', color: '#8b5cf6', label: 'Person' },
  place: { icon: '📍', color: '#f59e0b', label: 'Place' },
  theme: { icon: '🎯', color: '#ec4899', label: 'Theme' },
  halacha: { icon: '⚖️', color: '#06b6d4', label: 'Halacha' },
  commentary: { icon: '📖', color: '#84cc16', label: 'Commentary' }
};

// Relationship types
const RELATIONSHIP_TYPES = {
  related: { label: 'Related to', style: 'solid' },
  derives: { label: 'Derives from', style: 'dashed' },
  contrasts: { label: 'Contrasts with', style: 'dotted' },
  leads_to: { label: 'Leads to', style: 'solid' },
  references: { label: 'References', style: 'dashed' }
};

// Graph Node Component
const GraphNode = ({ node, isSelected, isCenter, onClick, style }) => {
  const config = NODE_TYPES[node.type] || NODE_TYPES.concept;

  return (
    <div
      className={`graph-node ${isSelected ? 'selected' : ''} ${isCenter ? 'center' : ''}`}
      style={{
        ...style,
        '--node-color': config.color
      }}
      onClick={() => onClick(node)}
      title={`${config.label}: ${node.label}`}
    >
      <span className="node-icon">{config.icon}</span>
      <span className="node-label">{node.label}</span>
      {node.hebrewLabel && (
        <span className="node-hebrew" dir="rtl">{node.hebrewLabel}</span>
      )}
      {node.count && (
        <span className="node-count">{node.count}×</span>
      )}
    </div>
  );
};

// Connection Line Component (simplified - no SVG for now)
// eslint-disable-next-line no-unused-vars
const ConnectionLine = ({ from, to, type }) => {
  const relConfig = RELATIONSHIP_TYPES[type] || RELATIONSHIP_TYPES.related;

  return (
    <div className={`connection-label ${relConfig.style}`}>
      <span className="connection-text">{relConfig.label}</span>
    </div>
  );
};

// Node Details Panel
const NodeDetails = ({ node, onClose, onNavigate }) => {
  if (!node) return null;

  const config = NODE_TYPES[node.type] || NODE_TYPES.concept;

  return (
    <div className="node-details-panel">
      <div className="details-header">
        <div className="details-title">
          <span className="details-icon">{config.icon}</span>
          <span className="details-label">{node.label}</span>
        </div>
        <button className="details-close" onClick={onClose}>×</button>
      </div>

      {node.hebrewLabel && (
        <div className="details-hebrew" dir="rtl">{node.hebrewLabel}</div>
      )}

      {node.description && (
        <p className="details-description">{node.description}</p>
      )}

      {node.references && node.references.length > 0 && (
        <div className="details-references">
          <h5>References</h5>
          <ul>
            {node.references.map((ref, idx) => (
              <li key={idx} onClick={() => onNavigate?.(ref)}>
                <span className="ref-text">{ref}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.connections && node.connections.length > 0 && (
        <div className="details-connections">
          <h5>Connected To</h5>
          <div className="connection-chips">
            {node.connections.map((conn, idx) => (
              <span key={idx} className="connection-chip">
                {conn.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.occurrences && (
        <div className="details-occurrences">
          <h5>Occurrences</h5>
          <span className="occurrence-count">{node.occurrences} times in Tanakh</span>
        </div>
      )}
    </div>
  );
};

// Legend Component
const GraphLegend = ({ visibleTypes, onToggleType }) => {
  return (
    <div className="graph-legend">
      {Object.entries(NODE_TYPES).map(([type, config]) => (
        <button
          key={type}
          className={`legend-item ${visibleTypes.includes(type) ? 'active' : ''}`}
          onClick={() => onToggleType(type)}
          style={{ '--type-color': config.color }}
        >
          <span className="legend-icon">{config.icon}</span>
          <span className="legend-label">{config.label}</span>
        </button>
      ))}
    </div>
  );
};

// Main Knowledge Graph Component
const KnowledgeGraph = ({
  nodes = [],
  connections = [],
  centerNode = null,
  onNodeClick,
  onNavigate,
  title = 'Concept Web'
}) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [visibleTypes, setVisibleTypes] = useState(Object.keys(NODE_TYPES));
  const [viewMode, setViewMode] = useState('radial'); // 'radial', 'list', 'tree'

  // Filter nodes by visible types
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => visibleTypes.includes(n.type));
  }, [nodes, visibleTypes]);

  // Handle node selection
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    onNodeClick?.(node);
  }, [onNodeClick]);

  // Toggle node type visibility
  const handleToggleType = useCallback((type) => {
    setVisibleTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  // Calculate node positions for radial layout
  const positionedNodes = useMemo(() => {
    if (viewMode !== 'radial' || filteredNodes.length === 0) return filteredNodes;

    const center = centerNode || filteredNodes[0];
    const radius = 150;
    const angleStep = (2 * Math.PI) / (filteredNodes.length - 1 || 1);

    return filteredNodes.map((node, idx) => {
      if (node.id === center?.id) {
        return { ...node, x: 0, y: 0, isCenter: true };
      }
      const angle = angleStep * (idx - 1);
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        isCenter: false
      };
    });
  }, [filteredNodes, centerNode, viewMode]);

  if (nodes.length === 0) {
    return (
      <div className="knowledge-graph-empty">
        <span className="empty-icon">🕸️</span>
        <p>No connections to display</p>
        <p className="empty-hint">Analyze text to discover concept relationships</p>
      </div>
    );
  }

  return (
    <div className="knowledge-graph">
      {/* Header */}
      <div className="graph-header">
        <div className="header-title">
          <span className="header-icon">🕸️</span>
          <h3>{title}</h3>
        </div>
        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'radial' ? 'active' : ''}`}
            onClick={() => setViewMode('radial')}
            title="Radial view"
          >
            ⭕
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            📋
          </button>
        </div>
      </div>

      {/* Legend */}
      <GraphLegend
        visibleTypes={visibleTypes}
        onToggleType={handleToggleType}
      />

      {/* Graph Area */}
      <div className="graph-container">
        {viewMode === 'radial' ? (
          <div className="radial-layout">
            {positionedNodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                isCenter={node.isCenter}
                onClick={handleNodeClick}
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`
                }}
              />
            ))}
          </div>
        ) : (
          <div className="list-layout">
            {filteredNodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                isCenter={node === centerNode}
                onClick={handleNodeClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <NodeDetails
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNavigate={onNavigate}
        />
      )}

      {/* Stats */}
      <div className="graph-stats">
        <span className="stat">{filteredNodes.length} concepts</span>
        <span className="stat">{connections.length} connections</span>
      </div>
    </div>
  );
};

KnowledgeGraph.propTypes = {
  nodes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    type: PropTypes.string,
    hebrewLabel: PropTypes.string,
    description: PropTypes.string,
    references: PropTypes.arrayOf(PropTypes.string),
    connections: PropTypes.array,
    occurrences: PropTypes.number
  })),
  connections: PropTypes.arrayOf(PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    type: PropTypes.string
  })),
  centerNode: PropTypes.object,
  onNodeClick: PropTypes.func,
  onNavigate: PropTypes.func,
  title: PropTypes.string
};

export default KnowledgeGraph;
