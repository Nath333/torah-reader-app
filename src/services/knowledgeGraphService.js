/**
 * Knowledge Graph Service - Visual Connection Intelligence
 *
 * Features:
 * - Build relationship graphs between texts, rabbis, concepts
 * - Generate Mermaid diagrams for visualization
 * - Track citation chains and influence networks
 * - Discover hidden connections across sources
 */

// Relationship types
export const RELATIONSHIP_TYPES = {
  QUOTES: 'quotes',
  DISAGREES: 'disagrees',
  ELABORATES: 'elaborates',
  CITES: 'cites',
  PARALLEL: 'parallel',
  DERIVES: 'derives',
  EXPLAINS: 'explains',
  CONTRASTS: 'contrasts',
  SUPPORTS: 'supports',
  STUDENT_OF: 'student_of',
  TEACHER_OF: 'teacher_of',
  CONTEMPORARY: 'contemporary'
};

// Entity types
export const ENTITY_TYPES = {
  VERSE: 'verse',
  COMMENTARY: 'commentary',
  RABBI: 'rabbi',
  CONCEPT: 'concept',
  BOOK: 'book',
  PERIOD: 'period',
  HALACHA: 'halacha'
};

// Known rabbinic relationships (comprehensive knowledge base)
export const RABBINIC_NETWORK = {
  // RISHONIM - Early Authorities (1038-1500)
  'Rashi': {
    period: 'Rishonim',
    dates: '1040-1105',
    hebrewName: 'רש"י',
    fullName: 'Rabbi Shlomo Yitzchaki',
    location: 'Troyes, France',
    teachers: ['Yaakov ben Yakar', 'Rabbeinu Gershom'],
    students: ['Rashbam', 'Rivam', 'Tosafot'],
    style: 'Peshat with Midrash',
    approach: 'Concise explanations of plain meaning',
    works: ['Torah Commentary', 'Talmud Commentary'],
    icon: '📜'
  },
  'Rashbam': {
    period: 'Rishonim',
    dates: '1085-1158',
    hebrewName: 'רשב"ם',
    fullName: 'Rabbi Shmuel ben Meir',
    location: 'France',
    teachers: ['Rashi'],
    students: [],
    style: 'Pure Peshat',
    approach: 'Strict literal interpretation',
    disagreesWith: ['Rashi'],
    works: ['Torah Commentary', 'Talmud Commentary'],
    icon: '📖'
  },
  'Ramban': {
    period: 'Rishonim',
    dates: '1194-1270',
    hebrewName: 'רמב"ן',
    fullName: 'Rabbi Moshe ben Nachman (Nachmanides)',
    location: 'Girona, Spain → Israel',
    teachers: ['Rabbeinu Yonah'],
    students: ['Rashba', 'Ritva'],
    style: 'Kabbalah integrated with Peshat',
    approach: 'Mystical insights within plain meaning',
    disagreesWith: ['Rashi', 'Ibn Ezra', 'Rambam'],
    agreesWith: ['Onkelos'],
    works: ['Torah Commentary', 'Milchamot Hashem', 'Torat HaAdam'],
    icon: '✨'
  },
  'Ibn Ezra': {
    period: 'Rishonim',
    dates: '1089-1167',
    hebrewName: 'אבן עזרא',
    fullName: 'Rabbi Avraham ibn Ezra',
    location: 'Spain (wanderer)',
    teachers: [],
    students: [],
    style: 'Grammatical/Scientific/Rationalist',
    approach: 'Hebrew grammar and rational analysis',
    disagreesWith: ['Rashi'],
    works: ['Torah Commentary', 'Sefer HaYashar', 'Yesod Mora'],
    icon: '🔬'
  },
  'Rambam': {
    period: 'Rishonim',
    dates: '1138-1204',
    hebrewName: 'רמב"ם',
    fullName: 'Rabbi Moshe ben Maimon (Maimonides)',
    location: 'Cordoba, Spain → Egypt',
    teachers: ['Ibn Migash', 'Maimon (father)'],
    students: ['Avraham ben HaRambam'],
    style: 'Philosophical/Halachic/Rationalist',
    approach: 'Systematic legal codification, Aristotelian philosophy',
    disagreesWith: ['Ravad'],
    works: ['Mishneh Torah', 'Guide for the Perplexed', 'Commentary on Mishnah'],
    icon: '⚖️'
  },
  'Ravad': {
    period: 'Rishonim',
    dates: '1125-1198',
    hebrewName: 'ראב"ד',
    fullName: 'Rabbi Avraham ben David of Posquières',
    location: 'Provence, France',
    teachers: [],
    students: [],
    style: 'Critical/Kabbalistic',
    approach: 'Sharp critiques and alternative rulings',
    disagreesWith: ['Rambam'],
    works: ['Hasagot on Rambam', 'Baalei HaNefesh'],
    icon: '⚔️'
  },
  'Sforno': {
    period: 'Rishonim',
    dates: '1475-1550',
    hebrewName: 'ספורנו',
    fullName: 'Rabbi Ovadia Sforno',
    location: 'Bologna, Italy',
    teachers: [],
    students: [],
    style: 'Philosophical/Ethical',
    approach: 'Humanistic and ethical insights',
    works: ['Torah Commentary', 'Or Amim'],
    icon: '💡'
  },
  'Radak': {
    period: 'Rishonim',
    dates: '1160-1235',
    hebrewName: 'רד"ק',
    fullName: 'Rabbi David Kimchi',
    location: 'Narbonne, Provence',
    teachers: ['Yosef Kimchi (father)'],
    students: [],
    style: 'Grammatical/Peshat',
    approach: 'Grammar-based plain meaning',
    works: ['Torah & Prophets Commentary', 'Sefer HaShorashim'],
    icon: '📚'
  },
  'Rashba': {
    period: 'Rishonim',
    dates: '1235-1310',
    hebrewName: 'רשב"א',
    fullName: 'Rabbi Shlomo ben Aderet',
    location: 'Barcelona, Spain',
    teachers: ['Ramban', 'Rabbeinu Yonah'],
    students: ['Ritva'],
    style: 'Talmudic analysis',
    approach: 'Comprehensive Talmud commentary',
    works: ['Talmud Commentary', 'Responsa'],
    icon: '📜'
  },
  'Ritva': {
    period: 'Rishonim',
    dates: '1250-1330',
    hebrewName: 'ריטב"א',
    fullName: 'Rabbi Yom Tov ben Avraham Asevilli',
    location: 'Seville, Spain',
    teachers: ['Rashba', 'Ramban'],
    students: [],
    style: 'Talmudic analysis',
    approach: 'Clear Talmud explanations',
    works: ['Talmud Commentary'],
    icon: '📜'
  },
  'Tosafot': {
    period: 'Rishonim',
    dates: '1100-1300',
    hebrewName: 'תוספות',
    fullName: 'Tosafists (School of Rashi\'s students)',
    location: 'France/Germany',
    teachers: ['Rashi'],
    students: [],
    style: 'Dialectical analysis',
    approach: 'Critical questions and reconciliations',
    disagreesWith: ['Rashi'],
    works: ['Tosafot on Talmud'],
    icon: '❓'
  },
  'Rabbeinu Tam': {
    period: 'Rishonim',
    dates: '1100-1171',
    hebrewName: 'רבינו תם',
    fullName: 'Rabbi Yaakov ben Meir',
    location: 'France',
    teachers: ['Rashi'],
    students: [],
    style: 'Dialectical/Halachic',
    approach: 'Leading Tosafist, novel interpretations',
    disagreesWith: ['Rashi'],
    works: ['Sefer HaYashar', 'Tosafot'],
    icon: '👑'
  },
  'Rosh': {
    period: 'Rishonim',
    dates: '1250-1327',
    hebrewName: 'הרא"ש',
    fullName: 'Rabbi Asher ben Yechiel',
    location: 'Germany → Toledo, Spain',
    teachers: ['Maharam of Rothenburg'],
    students: ['Tur'],
    style: 'Halachic/Talmudic',
    approach: 'Practical halachic rulings',
    works: ['Piskei HaRosh', 'Tosafot HaRosh'],
    icon: '⚖️'
  },
  'Tur': {
    period: 'Rishonim',
    dates: '1269-1343',
    hebrewName: 'טור',
    fullName: 'Rabbi Yaakov ben Asher',
    location: 'Toledo, Spain',
    teachers: ['Rosh (father)'],
    students: [],
    style: 'Halachic codification',
    approach: 'Four-part code organizing all halacha',
    works: ['Arba\'ah Turim'],
    icon: '📋'
  },
  // TRANSLATIONS
  'Onkelos': {
    period: 'Tannaim',
    dates: '~35-120 CE',
    hebrewName: 'אונקלוס',
    fullName: 'Onkelos the Convert',
    location: 'Israel',
    teachers: ['Rabbi Eliezer', 'Rabbi Yehoshua'],
    students: [],
    style: 'Aramaic Translation',
    approach: 'Authoritative Aramaic rendering, avoids anthropomorphism',
    works: ['Targum Onkelos'],
    icon: '🔄'
  },
  'Targum Yonatan': {
    period: 'Tannaim',
    dates: '~1st century CE',
    hebrewName: 'תרגום יונתן',
    fullName: 'Targum Yonatan ben Uziel',
    location: 'Israel',
    teachers: ['Hillel'],
    students: [],
    style: 'Aramaic Translation with Midrash',
    approach: 'Expanded translation with aggadic material',
    works: ['Targum Yonatan'],
    icon: '🔄'
  },
  // ACHARONIM - Later Authorities (1500+)
  'Or HaChaim': {
    period: 'Acharonim',
    dates: '1696-1743',
    hebrewName: 'אור החיים',
    fullName: 'Rabbi Chaim ben Moshe ibn Attar',
    location: 'Morocco → Jerusalem',
    teachers: [],
    students: [],
    style: 'Kabbalistic/Chassidic',
    approach: 'Multiple interpretations, mystical insights',
    works: ['Or HaChaim HaKadosh'],
    icon: '🌟'
  },
  'Malbim': {
    period: 'Acharonim',
    dates: '1809-1879',
    hebrewName: 'מלבי"ם',
    fullName: 'Rabbi Meir Leibush ben Yechiel Michel Wisser',
    location: 'Russia/Romania',
    teachers: [],
    students: [],
    style: 'Literary/Grammatical',
    approach: 'Precise word analysis, no synonyms in Torah',
    works: ['HaTorah VeHaMitzvah'],
    icon: '🔍'
  },
  'Kli Yakar': {
    period: 'Acharonim',
    dates: '1550-1619',
    hebrewName: 'כלי יקר',
    fullName: 'Rabbi Shlomo Ephraim Luntschitz',
    location: 'Poland/Prague',
    teachers: [],
    students: [],
    style: 'Homiletical/Ethical',
    approach: 'Moral and ethical lessons',
    works: ['Kli Yakar'],
    icon: '💎'
  },
  'Maharal': {
    period: 'Acharonim',
    dates: '1520-1609',
    hebrewName: 'מהר"ל',
    fullName: 'Rabbi Yehuda Loew ben Bezalel',
    location: 'Prague',
    teachers: [],
    students: [],
    style: 'Philosophical/Mystical',
    approach: 'Deep philosophical insights into aggada',
    works: ['Gur Aryeh', 'Netivot Olam', 'Gevurot Hashem'],
    icon: '🦁'
  },
  'Maharsha': {
    period: 'Acharonim',
    dates: '1555-1631',
    hebrewName: 'מהרש"א',
    fullName: 'Rabbi Shmuel Eidels',
    location: 'Poland',
    teachers: [],
    students: [],
    style: 'Talmudic analysis',
    approach: 'Novellae on Talmud and Aggada',
    works: ['Chiddushei Aggadot', 'Chiddushei Halachot'],
    icon: '📖'
  },
  'Baal HaTurim': {
    period: 'Rishonim',
    dates: '1269-1343',
    hebrewName: 'בעל הטורים',
    fullName: 'Rabbi Yaakov ben Asher',
    location: 'Spain',
    teachers: ['Rosh (father)'],
    students: [],
    style: 'Gematria/Remez',
    approach: 'Numerical hints and word connections',
    works: ['Baal HaTurim on Torah'],
    icon: '🔢'
  },
  'Chizkuni': {
    period: 'Rishonim',
    dates: '~1250',
    hebrewName: 'חזקוני',
    fullName: 'Rabbi Chizkiya ben Manoach',
    location: 'France',
    teachers: [],
    students: [],
    style: 'Compilation/Peshat',
    approach: 'Synthesizes earlier commentators',
    works: ['Chizkuni on Torah'],
    icon: '📚'
  },
  'Bechor Shor': {
    period: 'Rishonim',
    dates: '~1140-1200',
    hebrewName: 'בכור שור',
    fullName: 'Rabbi Yosef Bechor Shor',
    location: 'France',
    teachers: ['Rabbeinu Tam'],
    students: [],
    style: 'Peshat/Rationalist',
    approach: 'Strict peshat, naturalistic explanations',
    works: ['Commentary on Torah'],
    icon: '🎯'
  },
  'Sefat Emet': {
    period: 'Acharonim',
    dates: '1847-1905',
    hebrewName: 'שפת אמת',
    fullName: 'Rabbi Yehuda Aryeh Leib Alter',
    location: 'Góra Kalwaria, Poland',
    teachers: ['Chiddushei HaRim'],
    students: [],
    style: 'Chassidic/Mystical',
    approach: 'Deep Chassidic insights',
    works: ['Sefat Emet on Torah'],
    icon: '✡️'
  },
  'Netziv': {
    period: 'Acharonim',
    dates: '1816-1893',
    hebrewName: 'נצי"ב',
    fullName: 'Rabbi Naftali Tzvi Yehuda Berlin',
    location: 'Volozhin, Lithuania',
    teachers: [],
    students: [],
    style: 'Literary/Analytical',
    approach: 'Literary analysis, connects to halacha',
    works: ['Ha\'amek Davar', 'Ha\'amek She\'ela'],
    icon: '📝'
  }
};

// In-memory graph storage
let knowledgeGraph = {
  nodes: new Map(),
  edges: [],
  metadata: {
    created: Date.now(),
    lastUpdated: Date.now()
  }
};

/**
 * Add a node to the knowledge graph
 */
export function addNode(id, type, data) {
  const node = {
    id,
    type,
    label: data.label || id,
    data: {
      ...data,
      addedAt: Date.now()
    }
  };

  knowledgeGraph.nodes.set(id, node);
  knowledgeGraph.metadata.lastUpdated = Date.now();

  return node;
}

/**
 * Add an edge (relationship) to the knowledge graph
 */
export function addEdge(sourceId, targetId, relationship, metadata = {}) {
  const edge = {
    id: `${sourceId}-${relationship}-${targetId}`,
    source: sourceId,
    target: targetId,
    relationship,
    metadata: {
      ...metadata,
      addedAt: Date.now()
    }
  };

  // Avoid duplicates
  const existing = knowledgeGraph.edges.find(e => e.id === edge.id);
  if (!existing) {
    knowledgeGraph.edges.push(edge);
    knowledgeGraph.metadata.lastUpdated = Date.now();
  }

  return edge;
}

/**
 * Build a knowledge graph from verse analysis data
 */
export function buildGraphFromAnalysis(verseRef, analysisData) {
  // Add the verse as central node
  addNode(verseRef, ENTITY_TYPES.VERSE, {
    label: verseRef,
    hebrew: analysisData.hebrew,
    english: analysisData.english
  });

  // Add commentaries
  if (analysisData.commentaries) {
    analysisData.commentaries.forEach(comm => {
      const rabbiId = comm.source || comm.name;

      // Add rabbi node
      addNode(rabbiId, ENTITY_TYPES.RABBI, {
        label: rabbiId,
        ...RABBINIC_NETWORK[rabbiId]
      });

      // Connect rabbi to verse
      addEdge(rabbiId, verseRef, RELATIONSHIP_TYPES.EXPLAINS, {
        excerpt: comm.text?.substring(0, 100)
      });
    });
  }

  // Add cross-references
  if (analysisData.crossRefs) {
    analysisData.crossRefs.forEach(ref => {
      addNode(ref.ref, ENTITY_TYPES.VERSE, {
        label: ref.ref
      });

      addEdge(verseRef, ref.ref, RELATIONSHIP_TYPES.PARALLEL, {
        reason: ref.reason
      });
    });
  }

  // Add concepts
  if (analysisData.concepts) {
    analysisData.concepts.forEach(concept => {
      addNode(concept, ENTITY_TYPES.CONCEPT, {
        label: concept
      });

      addEdge(verseRef, concept, RELATIONSHIP_TYPES.DERIVES);
    });
  }

  return getSubgraph(verseRef, 2);
}

/**
 * Build relationships between commentators
 */
export function buildCommentatorNetwork(commentators) {
  const relationships = [];

  commentators.forEach(source => {
    const sourceData = RABBINIC_NETWORK[source];
    if (!sourceData) return;

    // Add source node
    addNode(source, ENTITY_TYPES.RABBI, {
      label: source,
      ...sourceData
    });

    // Add teacher relationships
    sourceData.teachers?.forEach(teacher => {
      addNode(teacher, ENTITY_TYPES.RABBI, {
        label: teacher,
        ...RABBINIC_NETWORK[teacher]
      });
      relationships.push(addEdge(source, teacher, RELATIONSHIP_TYPES.STUDENT_OF));
    });

    // Add student relationships
    sourceData.students?.forEach(student => {
      addNode(student, ENTITY_TYPES.RABBI, {
        label: student,
        ...RABBINIC_NETWORK[student]
      });
      relationships.push(addEdge(source, student, RELATIONSHIP_TYPES.TEACHER_OF));
    });

    // Add disagreement relationships
    sourceData.disagreesWith?.forEach(other => {
      addNode(other, ENTITY_TYPES.RABBI, {
        label: other,
        ...RABBINIC_NETWORK[other]
      });
      relationships.push(addEdge(source, other, RELATIONSHIP_TYPES.DISAGREES));
    });
  });

  return relationships;
}

/**
 * Get subgraph centered on a node
 */
export function getSubgraph(centerId, depth = 1) {
  const visited = new Set();
  const nodesToInclude = new Set([centerId]);
  const edgesToInclude = [];

  function traverse(nodeId, currentDepth) {
    if (currentDepth > depth || visited.has(nodeId)) return;
    visited.add(nodeId);

    knowledgeGraph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        nodesToInclude.add(edge.target);
        edgesToInclude.push(edge);
        traverse(edge.target, currentDepth + 1);
      }
      if (edge.target === nodeId) {
        nodesToInclude.add(edge.source);
        edgesToInclude.push(edge);
        traverse(edge.source, currentDepth + 1);
      }
    });
  }

  traverse(centerId, 0);

  return {
    nodes: Array.from(nodesToInclude).map(id => knowledgeGraph.nodes.get(id)).filter(Boolean),
    edges: edgesToInclude
  };
}

/**
 * Generate Mermaid diagram from graph
 */
export function generateMermaidDiagram(subgraph, options = {}) {
  const { direction = 'TB' } = options;

  const lines = [`graph ${direction}`];

  // Style definitions
  lines.push('  classDef verse fill:#e1f5fe,stroke:#01579b');
  lines.push('  classDef rabbi fill:#fff3e0,stroke:#e65100');
  lines.push('  classDef concept fill:#f3e5f5,stroke:#7b1fa2');
  lines.push('  classDef halacha fill:#e8f5e9,stroke:#2e7d32');

  // Node definitions
  subgraph.nodes.forEach(node => {
    const safeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
    const safeLabel = node.label.replace(/"/g, "'");

    let shape = `${safeId}["${safeLabel}"]`;
    if (node.type === ENTITY_TYPES.VERSE) {
      shape = `${safeId}[/"${safeLabel}"/]`;
    } else if (node.type === ENTITY_TYPES.CONCEPT) {
      shape = `${safeId}(("${safeLabel}"))`;
    } else if (node.type === ENTITY_TYPES.RABBI) {
      shape = `${safeId}{"${safeLabel}"}`;
    }

    lines.push(`  ${shape}`);
    lines.push(`  class ${safeId} ${node.type}`);
  });

  // Edge definitions
  const edgeArrows = {
    [RELATIONSHIP_TYPES.QUOTES]: '-->|quotes|',
    [RELATIONSHIP_TYPES.DISAGREES]: '-.->|disagrees|',
    [RELATIONSHIP_TYPES.ELABORATES]: '-->|elaborates|',
    [RELATIONSHIP_TYPES.CITES]: '-->|cites|',
    [RELATIONSHIP_TYPES.PARALLEL]: '<-->|parallel|',
    [RELATIONSHIP_TYPES.DERIVES]: '-->|derives|',
    [RELATIONSHIP_TYPES.EXPLAINS]: '-->|explains|',
    [RELATIONSHIP_TYPES.CONTRASTS]: '-.->|contrasts|',
    [RELATIONSHIP_TYPES.SUPPORTS]: '-->|supports|',
    [RELATIONSHIP_TYPES.STUDENT_OF]: '-->|student of|',
    [RELATIONSHIP_TYPES.TEACHER_OF]: '-->|teacher of|'
  };

  subgraph.edges.forEach(edge => {
    const sourceId = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const targetId = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    const arrow = edgeArrows[edge.relationship] || '-->';

    lines.push(`  ${sourceId} ${arrow} ${targetId}`);
  });

  return lines.join('\n');
}

/**
 * Generate simple ASCII visualization
 */
export function generateAsciiGraph(subgraph) {
  const lines = [];
  const centerNode = subgraph.nodes[0];

  if (!centerNode) return 'No graph data';

  lines.push(`╔${'═'.repeat(centerNode.label.length + 2)}╗`);
  lines.push(`║ ${centerNode.label} ║`);
  lines.push(`╚${'═'.repeat(centerNode.label.length + 2)}╝`);
  lines.push('     │');

  // Group edges by relationship
  const byRelationship = {};
  subgraph.edges.forEach(edge => {
    if (!byRelationship[edge.relationship]) {
      byRelationship[edge.relationship] = [];
    }
    byRelationship[edge.relationship].push(edge);
  });

  Object.entries(byRelationship).forEach(([rel, edges]) => {
    lines.push(`     ├── ${rel}`);
    edges.forEach((edge, i) => {
      const isLast = i === edges.length - 1;
      const target = edge.source === centerNode.id ? edge.target : edge.source;
      lines.push(`     │   ${isLast ? '└' : '├'}── ${target}`);
    });
  });

  return lines.join('\n');
}

/**
 * Find path between two nodes
 */
export function findPath(sourceId, targetId, maxDepth = 5) {
  const visited = new Set();
  const queue = [[sourceId]];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === targetId) {
      // eslint-disable-next-line no-loop-func
      return path.map(nodeId => knowledgeGraph.nodes.get(nodeId));
    }

    if (path.length >= maxDepth || visited.has(current)) continue;
    visited.add(current);

    // eslint-disable-next-line no-loop-func
    knowledgeGraph.edges.forEach(edge => {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push([...path, edge.target]);
      }
      if (edge.target === current && !visited.has(edge.source)) {
        queue.push([...path, edge.source]);
      }
    });
  }

  return null; // No path found
}

/**
 * Get node connections summary
 */
export function getNodeConnections(nodeId) {
  const incoming = knowledgeGraph.edges.filter(e => e.target === nodeId);
  const outgoing = knowledgeGraph.edges.filter(e => e.source === nodeId);

  return {
    nodeId,
    node: knowledgeGraph.nodes.get(nodeId),
    incoming: incoming.map(e => ({
      from: knowledgeGraph.nodes.get(e.source),
      relationship: e.relationship
    })),
    outgoing: outgoing.map(e => ({
      to: knowledgeGraph.nodes.get(e.target),
      relationship: e.relationship
    })),
    totalConnections: incoming.length + outgoing.length
  };
}

/**
 * Get graph statistics
 */
export function getGraphStats() {
  const nodes = Array.from(knowledgeGraph.nodes.values());
  const nodesByType = {};

  nodes.forEach(node => {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  });

  const relationshipCounts = {};
  knowledgeGraph.edges.forEach(edge => {
    relationshipCounts[edge.relationship] = (relationshipCounts[edge.relationship] || 0) + 1;
  });

  return {
    totalNodes: nodes.length,
    totalEdges: knowledgeGraph.edges.length,
    nodesByType,
    relationshipCounts,
    lastUpdated: knowledgeGraph.metadata.lastUpdated
  };
}

/**
 * Clear the knowledge graph
 */
export function clearGraph() {
  knowledgeGraph = {
    nodes: new Map(),
    edges: [],
    metadata: {
      created: Date.now(),
      lastUpdated: Date.now()
    }
  };
}

/**
 * Export graph data
 */
export function exportGraph() {
  return {
    nodes: Array.from(knowledgeGraph.nodes.entries()),
    edges: knowledgeGraph.edges,
    metadata: knowledgeGraph.metadata
  };
}

/**
 * Import graph data
 */
export function importGraph(data) {
  if (data.nodes) {
    data.nodes.forEach(([id, node]) => {
      knowledgeGraph.nodes.set(id, node);
    });
  }
  if (data.edges) {
    knowledgeGraph.edges = [...knowledgeGraph.edges, ...data.edges];
  }
  knowledgeGraph.metadata.lastUpdated = Date.now();
}

const knowledgeGraphService = {
  RELATIONSHIP_TYPES,
  ENTITY_TYPES,
  RABBINIC_NETWORK,
  addNode,
  addEdge,
  buildGraphFromAnalysis,
  buildCommentatorNetwork,
  getSubgraph,
  generateMermaidDiagram,
  generateAsciiGraph,
  findPath,
  getNodeConnections,
  getGraphStats,
  clearGraph,
  exportGraph,
  importGraph
};

export default knowledgeGraphService;
