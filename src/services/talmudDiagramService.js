/**
 * Talmud Diagram Service - Deterministic Mermaid Generation (No AI)
 *
 * Generates visual diagrams for any Talmud page using structured data:
 * - Commentator networks (who comments, their relationships)
 * - Cross-references (verses cited, parallel sugyot)
 * - Word relationships (roots, cognates)
 *
 * All data comes from Sefaria API and built-in knowledge bases.
 */

import { getRelatedTexts, getCrossReferences, getTalmudDaf, isTalmudBook } from './sefariaApi';
import {
  RABBINIC_NETWORK,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES,
  addNode,
  addEdge,
  getSubgraph,
  clearGraph
} from './knowledgeGraphService';

// =============================================================================
// TALMUD COMMENTATORS (Available on Sefaria)
// =============================================================================

export const TALMUD_COMMENTATORS = [
  'Rashi',
  'Tosafot',
  'Rashbam',
  'Ritva',
  'Rashba',
  'Ran',
  'Rosh',
  'Maharsha',
  'Maharal',
  'Meiri',
  'Rabbeinu Chananel',
  'Rabbeinu Gershom'
];

// =============================================================================
// DIAGRAM GENERATION
// =============================================================================

/**
 * Generate a Mermaid diagram for a Talmud daf showing:
 * - Central daf node
 * - Available commentators with their relationships
 * - Cross-references to verses and parallel passages
 *
 * @param {string} tractate - Tractate name (e.g., 'Shabbat', 'Berakhot')
 * @param {string} daf - Daf reference (e.g., '2a', '73b')
 * @param {Object} options - Diagram options
 * @returns {Promise<{mermaid: string, stats: Object, explanation: string}>}
 */
export async function generateDafDiagram(tractate, daf, options = {}) {
  const {
    includeCommentators = true,
    includeCrossRefs = true,
    includeVerses = true,
    maxCrossRefs = 10,
    direction = 'TB'  // TB (top-bottom) or LR (left-right)
  } = options;

  // Clear previous graph data for fresh diagram
  clearGraph();

  const dafRef = `${tractate}.${daf}`;
  const stats = {
    commentators: 0,
    crossRefs: 0,
    verses: 0,
    parallels: 0
  };

  // Add central daf node
  addNode(dafRef, ENTITY_TYPES.VERSE, {
    label: `${tractate} ${daf}`,
    type: 'talmud_daf'
  });

  // Fetch related texts from Sefaria
  let relatedTexts = { commentary: [], parallels: [], connections: [] };
  try {
    relatedTexts = await getRelatedTexts(dafRef);
  } catch (err) {
    console.warn('Failed to fetch related texts:', err.message);
  }

  // Process commentators
  if (includeCommentators) {
    const foundCommentators = new Set();

    // Check which commentators appear in the related texts
    (relatedTexts?.commentary || []).forEach(comm => {
      const source = extractCommentatorName(comm.ref || comm.category || '');
      if (source && RABBINIC_NETWORK[source]) {
        foundCommentators.add(source);
      }
    });

    // Add commentator nodes and relationships
    foundCommentators.forEach(commentator => {
      const rabbiData = RABBINIC_NETWORK[commentator];

      addNode(commentator, ENTITY_TYPES.RABBI, {
        label: `${rabbiData?.icon || '📜'} ${commentator}`,
        period: rabbiData?.period,
        style: rabbiData?.style
      });

      // Connect to daf
      addEdge(commentator, dafRef, RELATIONSHIP_TYPES.EXPLAINS);
      stats.commentators++;

      // Add inter-commentator relationships
      if (rabbiData?.teachers) {
        rabbiData.teachers.forEach(teacher => {
          if (foundCommentators.has(teacher)) {
            addEdge(commentator, teacher, RELATIONSHIP_TYPES.STUDENT_OF);
          }
        });
      }

      if (rabbiData?.disagreesWith) {
        rabbiData.disagreesWith.forEach(other => {
          if (foundCommentators.has(other)) {
            addEdge(commentator, other, RELATIONSHIP_TYPES.DISAGREES);
          }
        });
      }
    });
  }

  // Process cross-references
  if (includeCrossRefs || includeVerses) {
    let crossRefs = [];
    try {
      crossRefs = await getCrossReferences(tractate, daf);
    } catch (err) {
      console.warn('Failed to fetch cross-references:', err.message);
    }

    let refCount = 0;
    crossRefs.forEach(ref => {
      if (refCount >= maxCrossRefs) return;

      const category = (ref.category || '').toLowerCase();
      const isVerse = category.includes('tanakh') || category.includes('torah') ||
                      category.includes('prophets') || category.includes('writings');
      const isParallel = category.includes('talmud') || category.includes('bavli');

      if (isVerse && includeVerses) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: shortenRef(ref.ref),
          type: 'biblical_verse'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.CITES);
        stats.verses++;
        refCount++;
      } else if (isParallel && includeCrossRefs) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: shortenRef(ref.ref),
          type: 'talmud_parallel'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.PARALLEL);
        stats.parallels++;
        refCount++;
      }
    });
    stats.crossRefs = refCount;
  }

  // Generate Mermaid diagram
  const subgraph = getSubgraph(dafRef, 2);
  const mermaid = generateTalmudMermaid(subgraph, dafRef, direction);

  // Generate explanation
  const explanation = generateExplanation(tractate, daf, stats);

  return {
    mermaid,
    stats,
    explanation,
    dafRef
  };
}

/**
 * Generate Mermaid syntax optimized for Talmud visualization
 */
function generateTalmudMermaid(subgraph, centerRef, direction = 'TB') {
  const lines = [`graph ${direction}`];

  // Style definitions
  lines.push('  %% Node styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px,font-weight:bold');
  lines.push('  classDef rabbi fill:#dbeafe,stroke:#2563eb,stroke-width:2px');
  lines.push('  classDef verse fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef parallel fill:#fae8ff,stroke:#c026d3');
  lines.push('  classDef rishonim fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef acharonim fill:#e0e7ff,stroke:#4f46e5');

  // Process nodes
  const nodeIds = new Map();

  subgraph.nodes.forEach((node, index) => {
    const safeId = `n${index}`;
    nodeIds.set(node.id, safeId);

    const label = (node.data?.label || node.label || node.id)
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    // Determine node shape and class
    let shape, className;

    if (node.id === centerRef) {
      shape = `${safeId}[["${label}"]]`;
      className = 'daf';
    } else if (node.type === ENTITY_TYPES.RABBI) {
      shape = `${safeId}{{"${label}"}}`;
      const period = node.data?.period || '';
      className = period.includes('Rishon') ? 'rishonim' :
                  period.includes('Acharon') ? 'acharonim' : 'rabbi';
    } else if (node.data?.type === 'biblical_verse') {
      shape = `${safeId}(["${label}"])`;
      className = 'verse';
    } else if (node.data?.type === 'talmud_parallel') {
      shape = `${safeId}[/"${label}"/]`;
      className = 'parallel';
    } else {
      shape = `${safeId}["${label}"]`;
      className = 'verse';
    }

    lines.push(`  ${shape}`);
    lines.push(`  class ${safeId} ${className}`);
  });

  // Process edges
  const edgeLabels = {
    [RELATIONSHIP_TYPES.EXPLAINS]: 'comments',
    [RELATIONSHIP_TYPES.CITES]: 'cites',
    [RELATIONSHIP_TYPES.PARALLEL]: 'parallel',
    [RELATIONSHIP_TYPES.STUDENT_OF]: 'student of',
    [RELATIONSHIP_TYPES.DISAGREES]: 'disagrees',
    [RELATIONSHIP_TYPES.TEACHER_OF]: 'teacher of'
  };

  const edgeStyles = {
    [RELATIONSHIP_TYPES.EXPLAINS]: '-->',
    [RELATIONSHIP_TYPES.CITES]: '-.->',
    [RELATIONSHIP_TYPES.PARALLEL]: '<-->',
    [RELATIONSHIP_TYPES.STUDENT_OF]: '-->',
    [RELATIONSHIP_TYPES.DISAGREES]: '-.-x',
    [RELATIONSHIP_TYPES.TEACHER_OF]: '-->'
  };

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      const style = edgeStyles[edge.relationship] || '-->';
      const label = edgeLabels[edge.relationship] || '';

      if (label) {
        lines.push(`  ${sourceId} ${style}|${label}| ${targetId}`);
      } else {
        lines.push(`  ${sourceId} ${style} ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}

/**
 * Extract commentator name from a Sefaria reference
 */
function extractCommentatorName(ref) {
  const patterns = [
    /^(Rashi|Tosafot|Rashbam|Ritva|Rashba|Ran|Rosh|Maharsha|Maharal|Meiri)/i,
    /^Rabbeinu\s+(Chananel|Gershom)/i
  ];

  for (const pattern of patterns) {
    const match = ref.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Check against known names
  for (const name of TALMUD_COMMENTATORS) {
    if (ref.toLowerCase().includes(name.toLowerCase())) {
      return name;
    }
  }

  return null;
}

/**
 * Shorten a reference for display
 */
function shortenRef(ref) {
  if (!ref) return '';

  // Shorten book names
  const shortcuts = {
    'Genesis': 'Gen',
    'Exodus': 'Ex',
    'Leviticus': 'Lev',
    'Numbers': 'Num',
    'Deuteronomy': 'Deut',
    'Shabbat': 'Shab',
    'Berakhot': 'Ber',
    'Sanhedrin': 'San',
    'Bava Kamma': 'BK',
    'Bava Metzia': 'BM',
    'Bava Batra': 'BB'
  };

  let short = ref;
  Object.entries(shortcuts).forEach(([full, abbr]) => {
    short = short.replace(full, abbr);
  });

  // Limit length
  if (short.length > 20) {
    short = short.substring(0, 17) + '...';
  }

  return short;
}

/**
 * Generate human-readable explanation of the diagram
 */
function generateExplanation(tractate, daf, stats) {
  const parts = [`Diagram of ${tractate} ${daf}`];

  if (stats.commentators > 0) {
    parts.push(`${stats.commentators} commentator${stats.commentators > 1 ? 's' : ''}`);
  }
  if (stats.verses > 0) {
    parts.push(`${stats.verses} biblical citation${stats.verses > 1 ? 's' : ''}`);
  }
  if (stats.parallels > 0) {
    parts.push(`${stats.parallels} parallel passage${stats.parallels > 1 ? 's' : ''}`);
  }

  return parts.join(' • ');
}

// =============================================================================
// BATCH GENERATION (For generating diagrams for multiple dapim)
// =============================================================================

/**
 * Generate diagrams for a range of dapim
 * @param {string} tractate - Tractate name
 * @param {string} startDaf - Starting daf (e.g., '2a')
 * @param {string} endDaf - Ending daf (e.g., '5b')
 * @returns {AsyncGenerator<{daf: string, result: Object}>}
 */
export async function* generateDafDiagramsRange(tractate, startDaf, endDaf, options = {}) {
  const dafim = generateDafRange(startDaf, endDaf);

  for (const daf of dafim) {
    try {
      const result = await generateDafDiagram(tractate, daf, options);
      yield { daf, result, success: true };
    } catch (error) {
      yield { daf, error: error.message, success: false };
    }

    // Small delay to avoid overwhelming Sefaria API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

/**
 * Generate list of dapim in a range
 */
function generateDafRange(start, end) {
  const dafim = [];

  const parseRef = (ref) => {
    const match = ref.match(/(\d+)([ab])/);
    return match ? { num: parseInt(match[1]), side: match[2] } : null;
  };

  const startParsed = parseRef(start);
  const endParsed = parseRef(end);

  if (!startParsed || !endParsed) return [start];

  let current = { ...startParsed };

  while (current.num < endParsed.num ||
         (current.num === endParsed.num &&
          (current.side === 'a' || current.side === endParsed.side))) {
    dafim.push(`${current.num}${current.side}`);

    if (current.side === 'a') {
      current.side = 'b';
    } else {
      current.num++;
      current.side = 'a';
    }

    // Safety limit
    if (dafim.length > 500) break;
  }

  return dafim;
}

// =============================================================================
// COMMENTATOR NETWORK DIAGRAM (Shows relationships between mefarshim)
// =============================================================================

/**
 * Generate a diagram showing only commentator relationships
 * (No daf-specific data, just the rabbinic network)
 */
export function generateCommentatorNetworkDiagram(commentators = null) {
  clearGraph();

  const selectedCommentators = commentators || Object.keys(RABBINIC_NETWORK);

  // Add all commentator nodes
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

  // Add relationships
  selectedCommentators.forEach(name => {
    const data = RABBINIC_NETWORK[name];
    if (!data) return;

    // Teacher relationships
    data.teachers?.forEach(teacher => {
      if (selectedCommentators.includes(teacher)) {
        addEdge(name, teacher, RELATIONSHIP_TYPES.STUDENT_OF);
      }
    });

    // Disagreement relationships
    data.disagreesWith?.forEach(other => {
      if (selectedCommentators.includes(other)) {
        addEdge(name, other, RELATIONSHIP_TYPES.DISAGREES);
      }
    });
  });

  const subgraph = {
    nodes: Array.from(selectedCommentators)
      .map(name => ({ id: name, type: ENTITY_TYPES.RABBI, data: RABBINIC_NETWORK[name] }))
      .filter(n => n.data),
    edges: []
  };

  // Collect edges
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

/**
 * Generate Mermaid for commentator network
 */
function generateCommentatorMermaid(subgraph) {
  const lines = ['graph TB'];

  // Styles by period
  lines.push('  classDef tannaim fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef rishonim fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef acharonim fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef default fill:#f3f4f6,stroke:#6b7280');

  const nodeIds = new Map();

  // Group by period for subgraphs
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

  // Add subgraphs by period
  Object.entries(byPeriod).forEach(([period, nodes]) => {
    if (nodes.length === 0) return;

    lines.push(`  subgraph ${period}`);
    nodes.forEach(({ safeId, label }) => {
      lines.push(`    ${safeId}{{"${label}"}}`);
    });
    lines.push('  end');
  });

  // Apply classes
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

  // Add edges
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

// =============================================================================
// EXPORTS
// =============================================================================

const talmudDiagramService = {
  generateDafDiagram,
  generateDafDiagramsRange,
  generateCommentatorNetworkDiagram,
  TALMUD_COMMENTATORS
};

export default talmudDiagramService;
