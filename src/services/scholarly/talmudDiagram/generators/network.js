// =============================================================================
// COMMENTATOR NETWORK DIAGRAM
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { RABBINIC_NETWORK, RELATIONSHIP_TYPES, ENTITY_TYPES, addNode, addEdge, clearGraph } from '../../knowledgeGraphService';

// =============================================================================
// COMMENTATOR NETWORK DIAGRAM
// =============================================================================

export function generateCommentatorNetworkDiagram(commentators = null) {
  clearGraph();

  const selectedCommentators = commentators || Object.keys(RABBINIC_NETWORK);

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    addNode(name, ENTITY_TYPES.RABBI, {
      label: `${data.icon || '📜'} ${name}`,
      period: data.period,
      dates: data.dates,
      style: data.style
    });
  });

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    data.teachers?.forEach(teacher => {
      if (selectedCommentators.includes(teacher)) {
        addEdge(name, teacher, RELATIONSHIP_TYPES.STUDENT_OF);
      }
    });

    data.disagreesWith?.forEach(other => {
      if (selectedCommentators.includes(other)) {
        addEdge(name, other, RELATIONSHIP_TYPES.DISAGREES);
      }
    });
  });

  const subgraph = {
    nodes: selectedCommentators
      .map(name => ({ id: name, type: ENTITY_TYPES.RABBI, data: RABBINIC_NETWORK[name] }))
      .filter(n => n.data),
    edges: []
  };

  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    data.teachers?.forEach(teacher => {
      if (selectedCommentators.includes(teacher)) {
        subgraph.edges.push({
          source: name,
          target: teacher,
          relationship: RELATIONSHIP_TYPES.STUDENT_OF
        });
      }
    });

    data.disagreesWith?.forEach(other => {
      if (selectedCommentators.includes(other)) {
        subgraph.edges.push({
          source: name,
          target: other,
          relationship: RELATIONSHIP_TYPES.DISAGREES
        });
      }
    });
  });

  return generateCommentatorMermaid(subgraph);
}

function generateCommentatorMermaid(subgraph) {
  const lines = ['graph TB'];

  lines.push('  classDef tannaim fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef rishonim fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef acharonim fill:#dbeafe,stroke:#2563eb');

  const nodeIds = new Map();
  const byPeriod = { Tannaim: [], Rishonim: [], Acharonim: [], Other: [] };

  subgraph.nodes.forEach((node, index) => {
    const safeId = `r${index}`;
    nodeIds.set(node.id, safeId);

    const data = node.data || {};
    const label = `${data.icon || '📜'} ${node.id}`;
    const period = data.period || 'Other';

    if (byPeriod[period]) {
      byPeriod[period].push({ safeId, label, period });
    } else {
      byPeriod.Other.push({ safeId, label, period: 'Other' });
    }
  });

  Object.entries(byPeriod).forEach(([period, nodes]) => {
    if (nodes.length === 0) return;

    lines.push(`  subgraph ${period}`);
    nodes.forEach(({ safeId, label }) => {
      lines.push(`    ${safeId}{{"${label}"}}`);
    });
    lines.push('  end');
  });

  subgraph.nodes.forEach((node, index) => {
    const safeId = `r${index}`;
    const period = (node.data?.period || '').toLowerCase();

    if (period.includes('tanna')) {
      lines.push(`  class ${safeId} tannaim`);
    } else if (period.includes('rishon')) {
      lines.push(`  class ${safeId} rishonim`);
    } else if (period.includes('acharon')) {
      lines.push(`  class ${safeId} acharonim`);
    }
  });

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      if (edge.relationship === RELATIONSHIP_TYPES.STUDENT_OF) {
        lines.push(`  ${sourceId} -->|student| ${targetId}`);
      } else if (edge.relationship === RELATIONSHIP_TYPES.DISAGREES) {
        lines.push(`  ${sourceId} -.-x|disagrees| ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}

