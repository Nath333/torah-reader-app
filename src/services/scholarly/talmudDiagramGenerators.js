/**
 * Talmud Diagram Generators
 * Extracted from talmudDiagramService.js.
 *
 * Per-type Mermaid generators (8 types): overview, sugya flow, speaker
 * network, timeline, halachic chain, concept map, machloket, summary.
 * Plus the shared generateOverviewMermaid helper.
 */

import { getRelatedTexts, getCrossReferences, getTalmudDaf } from '../sefariaApi';
import { createLogger } from '../../utils/debug';
import {
  RABBINIC_NETWORK,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES,
  addNode,
  addEdge,
  getSubgraph,
  clearGraph
} from './knowledgeGraphService';
import { DISCOURSE_PATTERNS } from './discoursePatternService';
import { detectEntities } from './namedEntityService';
import { getWordRelationships, SEMANTIC_FIELDS } from './wordRelationshipService';

import { DIAGRAM_TYPES, ENHANCED_DISCOURSE_MARKERS } from './talmudDiagramConstants';
import { cleanForMermaid, safeExecute } from './talmudDiagramUtils';
import { summarizeText } from './talmudicSummarizer';
import {
  analyzeStructure,
  detectDiscoursePatterns,
  extractActorsDynamic,
  extractCommentatorName,
  extractCompoundTerms,
  extractContrastingPairs,
  extractDisputes,
  extractDomainsDynamic,
  extractFullDiscourse,
  extractHalachicCasesDynamic,
  extractKeyTerms,
  extractSpeakersFromText,
  findRabbiData,
  generateExplanation,
  shortenRef
} from './talmudDiscourseExtractors';

const log = createLogger('TalmudDiagram');

// =============================================================================
// DIAGRAM TYPE: OVERVIEW
// =============================================================================

export async function generateOverviewDiagram(tractate, daf, options = {}) {
  const {
    includeCommentators = true,
    includeCrossRefs = true,
    includeVerses = true,
    includeSpeakers = true,
    maxCrossRefs = 10,
    direction = 'TB'
  } = options;

  clearGraph();

  const dafRef = `${tractate}.${daf}`;
  const stats = {
    commentators: 0,
    crossRefs: 0,
    verses: 0,
    parallels: 0,
    speakers: 0
  };

  addNode(dafRef, ENTITY_TYPES.VERSE, {
    label: `📖 ${tractate} ${daf}`,
    type: 'talmud_daf'
  });

  const [relatedTexts, dafContent] = await Promise.all([
    safeExecute(
      () => getRelatedTexts(dafRef),
      { commentary: [], parallels: [], connections: [] },
      'getRelatedTexts'
    ),
    safeExecute(
      () => getTalmudDaf(tractate, daf),
      null,
      'getTalmudDaf'
    )
  ]);

  if (includeCommentators) {
    const foundCommentators = new Set();

    (relatedTexts?.commentary || []).forEach(comm => {
      const source = extractCommentatorName(comm.ref || comm.category || '');
      if (source && RABBINIC_NETWORK[source]) {
        foundCommentators.add(source);
      }
    });

    foundCommentators.forEach(commentator => {
      const rabbiData = RABBINIC_NETWORK[commentator];

      addNode(commentator, ENTITY_TYPES.RABBI, {
        label: `${rabbiData?.icon || '📜'} ${commentator}`,
        period: rabbiData?.period,
        style: rabbiData?.style,
        nodeType: 'commentator'
      });

      addEdge(commentator, dafRef, RELATIONSHIP_TYPES.EXPLAINS);
      stats.commentators++;

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

  if (includeSpeakers && dafContent) {
    const speakers = extractSpeakersFromText(dafContent);
    speakers.slice(0, options.maxSpeakers || 10).forEach(speaker => {
      const rabbiData = findRabbiData(speaker);
      if (rabbiData) {
        addNode(speaker, ENTITY_TYPES.RABBI, {
          label: `💬 ${rabbiData.name}`,
          period: rabbiData.period,
          generation: rabbiData.generation,
          nodeType: 'speaker'
        });
        addEdge(speaker, dafRef, 'speaks_on');
        stats.speakers++;
      }
    });
  }

  if (includeCrossRefs || includeVerses) {
    const crossRefs = await safeExecute(
      () => getCrossReferences(tractate, daf),
      [],
      'getCrossReferences'
    );

    let refCount = 0;
    crossRefs.forEach(ref => {
      if (refCount >= maxCrossRefs) return;

      const category = (ref.category || '').toLowerCase();
      const isVerse = category.includes('tanakh') || category.includes('torah') ||
                      category.includes('prophets') || category.includes('writings');
      const isParallel = category.includes('talmud') || category.includes('bavli');

      if (isVerse && includeVerses) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: `📜 ${shortenRef(ref.ref)}`,
          type: 'biblical_verse'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.CITES);
        stats.verses++;
        refCount++;
      } else if (isParallel && includeCrossRefs) {
        addNode(ref.ref, ENTITY_TYPES.VERSE, {
          label: `🔗 ${shortenRef(ref.ref)}`,
          type: 'talmud_parallel'
        });
        addEdge(dafRef, ref.ref, RELATIONSHIP_TYPES.PARALLEL);
        stats.parallels++;
        refCount++;
      }
    });
    stats.crossRefs = refCount;
  }

  const subgraph = getSubgraph(dafRef, 2);
  const mermaid = generateOverviewMermaid(subgraph, dafRef, direction);
  const explanation = generateExplanation(tractate, daf, stats, 'Overview');

  return { mermaid, stats, explanation, dafRef, type: DIAGRAM_TYPES.OVERVIEW };
}

// =============================================================================
// DIAGRAM TYPE: SUGYA FLOW
// =============================================================================

export async function generateSugyaFlowDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'sugyaFlow:getTalmudDaf'
  );

  if (!dafContent?.segments) {
    return {
      mermaid: `graph ${direction}\n  A["📖 ${tractate} ${daf}"]\n  B["טען דף כדי לראות מהלך"]`,
      stats: { patterns: 0, questions: 0, objections: 0, resolutions: 0 },
      explanation: `מהלך הסוגיא: ${tractate} ${daf} (אין תוכן)`,
      type: DIAGRAM_TYPES.SUGYA_FLOW
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const detectedPatterns = [];

  ENHANCED_DISCOURSE_MARKERS.forEach(({ pattern, type, label, icon, category }) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      detectedPatterns.push({
        type,
        label,
        icon,
        category,
        position: match.index,
        text: match[0]
      });
    }
  });

  const servicePatterns = detectDiscoursePatterns(fullText);
  servicePatterns.forEach(p => {
    const patternInfo = DISCOURSE_PATTERNS[p.type] || {};
    detectedPatterns.push({
      type: p.type,
      label: patternInfo.label || p.type,
      icon: patternInfo.icon || '📝',
      category: patternInfo.type || 'other',
      position: p.position || 0,
      text: p.marker
    });
  });

  detectedPatterns.sort((a, b) => a.position - b.position);

  const uniquePatterns = [];
  let lastPosition = -100;
  detectedPatterns.forEach(p => {
    if (p.position - lastPosition > 10) {
      uniquePatterns.push(p);
      lastPosition = p.position;
    }
  });

  const lines = [`graph ${direction}`];

  lines.push('  %% PRO SCHOLAR V13 Discourse Styles');
  lines.push('  classDef source fill:#3B82F6,stroke:#1E40AF,color:#fff,stroke-width:2px');
  lines.push('  classDef question fill:#F59E0B,stroke:#B45309,color:#000,stroke-width:2px');
  lines.push('  classDef objection fill:#DC2626,stroke:#991B1B,color:#fff,stroke-width:2px');
  lines.push('  classDef proof fill:#10B981,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef resolution fill:#7C3AED,stroke:#5B21B6,color:#fff,stroke-width:2px');
  lines.push('  classDef conclusion fill:#0891B2,stroke:#0E7490,color:#fff,stroke-width:2px');
  lines.push('  classDef other fill:#6B7280,stroke:#4B5563,color:#fff');

  const stats = {
    patterns: uniquePatterns.length,
    questions: 0,
    objections: 0,
    proofs: 0,
    resolutions: 0,
    conclusions: 0
  };

  let prevNodeId = null;
  uniquePatterns.forEach((pattern, index) => {
    const nodeId = `p${index}`;
    const stepNum = index + 1;

    lines.push(`  ${nodeId}["${stepNum}. ${pattern.icon} ${pattern.label}"]`);
    lines.push(`  class ${nodeId} ${pattern.category}`);

    if (pattern.category === 'question') stats.questions++;
    else if (pattern.category === 'objection') stats.objections++;
    else if (pattern.category === 'proof') stats.proofs++;
    else if (pattern.category === 'resolution') stats.resolutions++;
    else if (pattern.category === 'conclusion') stats.conclusions++;

    if (prevNodeId) {
      if (pattern.category === 'objection') {
        lines.push(`  ${prevNodeId} -.->|קושיא| ${nodeId}`);
      } else if (pattern.category === 'resolution') {
        lines.push(`  ${prevNodeId} ==>|תירוץ| ${nodeId}`);
      } else if (pattern.category === 'conclusion') {
        lines.push(`  ${prevNodeId} -->|מסקנה| ${nodeId}`);
      } else {
        lines.push(`  ${prevNodeId} --> ${nodeId}`);
      }
    }
    prevNodeId = nodeId;
  });

  if (uniquePatterns.length === 0) {
    lines.push(`  start["📖 ${tractate} ${daf}"]`);
    lines.push(`  class start source`);

    const { analyzeMishnaStructure, generateMishnaSummary } = await import('./discoursePatternService');
    const mishnaAnalysis = analyzeMishnaStructure(fullText);
    const mishnaSummary = generateMishnaSummary(fullText, mishnaAnalysis);

    if (mishnaAnalysis.elements.length > 0 || mishnaSummary.rulings?.length > 0) {
      let nodeIndex = 0;

      if (mishnaSummary.topic) {
        lines.push(`  topic["📚 ${mishnaSummary.topic}"]`);
        lines.push(`  class topic source`);
        lines.push(`  start --> topic`);
        nodeIndex++;
      }

      if (mishnaSummary.rulings && mishnaSummary.rulings.length > 0) {
        const uniqueRulings = [...new Set(mishnaSummary.rulings.map(r => r.text))].slice(0, 6);
        uniqueRulings.forEach((ruling, i) => {
          const cleanRuling = ruling.replace(/["[\]{}]/g, '').substring(0, 30);
          const isLiable = ruling.includes('חייב');
          const icon = isLiable ? '🔴' : '🟢';
          const styleClass = isLiable ? 'objection' : 'resolution';
          lines.push(`  r${i}["${icon} ${cleanRuling}"]`);
          lines.push(`  class r${i} ${styleClass}`);
          if (nodeIndex === 0) {
            lines.push(`  start --> r${i}`);
          } else if (i === 0 && mishnaSummary.topic) {
            lines.push(`  topic --> r${i}`);
          } else if (i > 0) {
            lines.push(`  r${i-1} --> r${i}`);
          }
        });
      }

      if (mishnaAnalysis.summary.breakdown) {
        const breakdown = mishnaAnalysis.summary.breakdown;
        const summaryParts = [];
        if (breakdown.enumeration) summaryParts.push(`${breakdown.enumeration} מניינים`);
        if (breakdown.condition) summaryParts.push(`${breakdown.condition} תנאים`);
        if (breakdown.ruling) summaryParts.push(`${breakdown.ruling} פסקים`);
        if (summaryParts.length > 0) {
          lines.push(`  summary["📊 ${summaryParts.join(' • ')}"]`);
          lines.push(`  class summary conclusion`);
        }
      }

      stats.patterns = mishnaAnalysis.elements.length;
    } else {
      lines.push(`  note["🔍 טען את הטקסט המלא לניתוח"]`);
      lines.push(`  start --> note`);
    }
  }

  const explanationParts = [`${uniquePatterns.length} שלבים`];
  if (stats.questions > 0) explanationParts.push(`${stats.questions} שאלות`);
  if (stats.objections > 0) explanationParts.push(`${stats.objections} קושיות`);
  if (stats.resolutions > 0) explanationParts.push(`${stats.resolutions} תירוצים`);

  return {
    mermaid: lines.join('\n'),
    stats,
    explanation: `מהלך הסוגיא: ${explanationParts.join(' • ')}`,
    type: DIAGRAM_TYPES.SUGYA_FLOW,
    patterns: uniquePatterns
  };
}

// =============================================================================
// DIAGRAM TYPE: SPEAKER NETWORK
// =============================================================================

export async function generateSpeakerNetworkDiagram(tractate, daf, options = {}) {
  const { direction = 'TB', maxSpeakers = 20 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'speakerNetwork:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  lines.push('  %% Speaker Styles by Period');
  lines.push('  classDef tanna1 fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef tanna2 fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef tanna3 fill:#fef08a,stroke:#ca8a04');
  lines.push('  classDef amora1 fill:#bbf7d0,stroke:#16a34a');
  lines.push('  classDef amora2 fill:#a5f3fc,stroke:#0891b2');
  lines.push('  classDef amora3 fill:#c4b5fd,stroke:#7c3aed');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');

  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf central`);

  if (!dafContent?.segments) {
    lines.push(`  note["טען דף כדי לראות חכמים"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { speakers: 0, tannaim: 0, amoraim: 0 },
      explanation: `חכמי הסוגיא: ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SPEAKER_NETWORK
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const speakerData = extractSpeakersFromText({ hebrew: [fullText] });

  const uniqueNames = [...new Set(speakerData.map(s => s.name))].slice(0, maxSpeakers);

  const speakerNodes = new Map();

  uniqueNames.forEach((speakerName, index) => {
    const rabbiData = findRabbiData(speakerName);
    const effectiveData = rabbiData || {
      name: speakerName,
      period: 'unknown',
      generation: null,
      matchType: 'unmatched'
    };

    const nodeId = `s${index}`;
    speakerNodes.set(speakerName, { nodeId, data: effectiveData });

    const name = effectiveData.name || speakerName;
    const gen = effectiveData.generation || '?';
    const period = effectiveData.period || '';

    lines.push(`  ${nodeId}{{"${name} (G${gen})"}}`);

    if (period === 'tanna') {
      if (gen <= 2) lines.push(`  class ${nodeId} tanna1`);
      else if (gen <= 3) lines.push(`  class ${nodeId} tanna2`);
      else lines.push(`  class ${nodeId} tanna3`);
    } else if (period === 'amora') {
      if (gen <= 2) lines.push(`  class ${nodeId} amora1`);
      else if (gen <= 4) lines.push(`  class ${nodeId} amora2`);
      else lines.push(`  class ${nodeId} amora3`);
    }

    lines.push(`  ${nodeId} -->|speaks| daf`);
  });

  speakerNodes.forEach(({ nodeId, data }, speaker) => {
    if (data.teachers) {
      data.teachers.forEach(teacher => {
        const teacherNode = speakerNodes.get(teacher);
        if (teacherNode) {
          lines.push(`  ${nodeId} -.->|תלמיד| ${teacherNode.nodeId}`);
        }
      });
    }
    if (data.disputesWith) {
      data.disputesWith.forEach(other => {
        const otherNode = speakerNodes.get(other);
        if (otherNode) {
          lines.push(`  ${nodeId} -.-x|מחלוקת| ${otherNode.nodeId}`);
        }
      });
    }
  });

  const tannaCount = Array.from(speakerNodes.values()).filter(s => s.data.period === 'tanna').length;
  const amoraCount = Array.from(speakerNodes.values()).filter(s => s.data.period === 'amora').length;

  const explanationParts = [`${speakerNodes.size} חכמים`];
  if (tannaCount > 0) explanationParts.push(`${tannaCount} תנאים`);
  if (amoraCount > 0) explanationParts.push(`${amoraCount} אמוראים`);

  return {
    mermaid: lines.join('\n'),
    stats: { speakers: speakerNodes.size, tannaim: tannaCount, amoraim: amoraCount },
    explanation: `חכמי הסוגיא: ${explanationParts.join(' • ')}`,
    type: DIAGRAM_TYPES.SPEAKER_NETWORK,
    speakers: Array.from(speakerNodes.keys())
  };
}

// =============================================================================
// DIAGRAM TYPE: TIMELINE
// =============================================================================

export async function generateTimelineDiagram(tractate, daf, options = {}) {
  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'timeline:getTalmudDaf'
  );

  const lines = ['timeline'];
  lines.push(`  title Sages of ${tractate} ${daf}`);

  if (!dafContent?.segments) {
    lines.push('  section No Data');
    lines.push('    Load daf content');
    return {
      mermaid: lines.join('\n'),
      stats: { speakers: 0 },
      explanation: `Timeline for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.TIMELINE
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const speakers = extractSpeakersFromText({ hebrew: [fullText] });
  const uniqueSpeakers = [...new Set(speakers)];

  const byPeriod = {
    'Zugot (100 BCE - 10 CE)': [],
    'Tannaim Gen 1-2 (10-120 CE)': [],
    'Tannaim Gen 3-4 (120-200 CE)': [],
    'Amoraim Gen 1-2 (220-290 CE)': [],
    'Amoraim Gen 3-4 (290-350 CE)': [],
    'Amoraim Gen 5+ (350-500 CE)': []
  };

  uniqueSpeakers.forEach(speaker => {
    const data = findRabbiData(speaker);
    if (!data) return;

    const period = data.period || '';
    const gen = data.generation || 0;

    if (period === 'tanna') {
      if (gen <= 2) byPeriod['Tannaim Gen 1-2 (10-120 CE)'].push(data.name);
      else byPeriod['Tannaim Gen 3-4 (120-200 CE)'].push(data.name);
    } else if (period === 'amora') {
      if (gen <= 2) byPeriod['Amoraim Gen 1-2 (220-290 CE)'].push(data.name);
      else if (gen <= 4) byPeriod['Amoraim Gen 3-4 (290-350 CE)'].push(data.name);
      else byPeriod['Amoraim Gen 5+ (350-500 CE)'].push(data.name);
    }
  });

  Object.entries(byPeriod).forEach(([period, sages]) => {
    if (sages.length > 0) {
      lines.push(`  section ${period}`);
      sages.forEach(sage => {
        lines.push(`    ${sage}`);
      });
    }
  });

  const totalSpeakers = Object.values(byPeriod).flat().length;

  return {
    mermaid: lines.join('\n'),
    stats: { speakers: totalSpeakers },
    explanation: `Timeline: ${totalSpeakers} sages across periods`,
    type: DIAGRAM_TYPES.TIMELINE
  };
}

// =============================================================================
// DIAGRAM TYPE: HALACHIC CHAIN
// =============================================================================

export async function generateHalachicChainDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const lines = [`graph ${direction}`];

  lines.push('  %% Halachic Chain Styles');
  lines.push('  classDef torah fill:#3B82F6,stroke:#1E40AF,color:#fff');
  lines.push('  classDef mishna fill:#8B5CF6,stroke:#6D28D9,color:#fff');
  lines.push('  classDef gemara fill:#F59E0B,stroke:#D97706');
  lines.push('  classDef rishonim fill:#10B981,stroke:#059669,color:#fff');
  lines.push('  classDef halacha fill:#DC2626,stroke:#B91C1C,color:#fff');

  lines.push(`  torah["📜 Torah Source"]`);
  lines.push(`  class torah torah`);

  lines.push(`  mishna["📘 Mishna - ${tractate}"]`);
  lines.push(`  class mishna mishna`);

  lines.push(`  gemara["📖 Gemara - ${daf}"]`);
  lines.push(`  class gemara gemara`);

  lines.push(`  rishonim["📚 Rishonim\\n(Rashi, Tosafot, Rambam)"]`);
  lines.push(`  class rishonim rishonim`);

  lines.push(`  halacha["⚖️ Practical Halacha\\n(Shulchan Aruch)"]`);
  lines.push(`  class halacha halacha`);

  lines.push('  torah -->|"דרש"| mishna');
  lines.push('  mishna -->|"פירוש"| gemara');
  lines.push('  gemara -->|"ביאור"| rishonim');
  lines.push('  rishonim -->|"פסק"| halacha');

  return {
    mermaid: lines.join('\n'),
    stats: { levels: 5 },
    explanation: `Halachic chain from Torah to practice`,
    type: DIAGRAM_TYPES.HALACHIC_CHAIN
  };
}

// =============================================================================
// DIAGRAM TYPE: CONCEPT MAP
// =============================================================================

export async function generateConceptMapDiagram(tractate, daf, options = {}) {
  const { direction = 'LR', maxConcepts = 15 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'conceptMap:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  lines.push('  %% Concept Map Styles');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef concept fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef root fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef synonym fill:#fce7f3,stroke:#db2777');
  lines.push('  classDef antonym fill:#fee2e2,stroke:#dc2626');
  lines.push('  classDef field fill:#e0e7ff,stroke:#6366f1');

  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf central`);

  if (!dafContent?.segments) {
    lines.push(`  note["Load daf content to see concepts"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { concepts: 0 },
      explanation: `Concept map for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.CONCEPT_MAP
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');

  const keyTerms = extractKeyTerms(fullText, maxConcepts);
  const nodeIds = new Map();
  let nodeCount = 0;

  keyTerms.forEach((term, index) => {
    const nodeId = `t${index}`;
    nodeIds.set(term.word, nodeId);

    lines.push(`  ${nodeId}["${term.word}"]`);
    lines.push(`  class ${nodeId} concept`);
    lines.push(`  daf --> ${nodeId}`);
    nodeCount++;
  });

  keyTerms.forEach(term => {
    try {
      const relationships = getWordRelationships(term.word);

      relationships.rootFamily?.slice(0, 3).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `r${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(["${rel.word}"])`);
          lines.push(`  class ${nodeId} root`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.->|שורש| ${targetId}`);
        }
      });

      relationships.synonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `s${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}(("${rel.word}"))`);
          lines.push(`  class ${nodeId} synonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} <-->|נרדף| ${targetId}`);
        }
      });

      relationships.antonyms?.slice(0, 2).forEach(rel => {
        if (!nodeIds.has(rel.word)) {
          const nodeId = `a${nodeCount++}`;
          nodeIds.set(rel.word, nodeId);
          lines.push(`  ${nodeId}{{"${rel.word}"}}`);
          lines.push(`  class ${nodeId} antonym`);
        }
        const sourceId = nodeIds.get(term.word);
        const targetId = nodeIds.get(rel.word);
        if (sourceId && targetId) {
          lines.push(`  ${sourceId} -.-x|היפך| ${targetId}`);
        }
      });
    } catch (err) {
      // Word not in relationship database, skip
    }
  });

  const detectedFields = new Set();
  keyTerms.forEach(term => {
    Object.entries(SEMANTIC_FIELDS).forEach(([key, field]) => {
      if (field.words.some(w => term.word.includes(w) || w.includes(term.word))) {
        detectedFields.add(key);
      }
    });
  });

  if (detectedFields.size > 0) {
    lines.push(`  %% Semantic Fields`);
    let fieldIdx = 0;
    detectedFields.forEach(fieldKey => {
      const field = SEMANTIC_FIELDS[fieldKey];
      if (field) {
        const fieldNodeId = `f${fieldIdx++}`;
        lines.push(`  ${fieldNodeId}[/"📚 ${field.hebrewLabel}"/]`);
        lines.push(`  class ${fieldNodeId} field`);
        lines.push(`  daf -.-> ${fieldNodeId}`);
      }
    });
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      concepts: keyTerms.length,
      relationships: nodeCount - keyTerms.length,
      semanticFields: detectedFields.size
    },
    explanation: `${keyTerms.length} key terms with relationships`,
    type: DIAGRAM_TYPES.CONCEPT_MAP,
    keyTerms
  };
}

// =============================================================================
// DIAGRAM TYPE: MACHLOKET
// =============================================================================

export async function generateMachloketDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'machloket:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  lines.push('  %% Machloket Diagram Styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef tanna fill:#fecaca,stroke:#dc2626,stroke-width:2px');
  lines.push('  classDef amora fill:#bbf7d0,stroke:#16a34a,stroke-width:2px');
  lines.push('  classDef opinion fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef halacha fill:#c4b5fd,stroke:#7c3aed,stroke-width:2px');
  lines.push('  classDef question fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef topic fill:#e5e7eb,stroke:#6b7280,stroke-dasharray:5 5');

  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf daf`);

  if (!dafContent?.segments) {
    lines.push(`  note["Load daf to see disputes"]`);
    lines.push(`  daf --> note`);
    return {
      mermaid: lines.join('\n'),
      stats: { disputes: 0, speakers: 0 },
      explanation: `Machloket diagram for ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.MACHLOKET
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');

  const disputes = extractDisputes(fullText);
  const speakers = extractSpeakersFromText({ hebrew: [fullText] });

  const nodeIds = new Map();
  let nodeCount = 0;
  let disputeCount = 0;

  const speakersByName = new Map();
  speakers.forEach(speaker => {
    if (!speakersByName.has(speaker.name)) {
      speakersByName.set(speaker.name, {
        name: speaker.name,
        types: new Set(),
        positions: []
      });
    }
    speakersByName.get(speaker.name).types.add(speaker.type);
    speakersByName.get(speaker.name).positions.push(speaker.position);
  });

  speakersByName.forEach((speakerInfo, name) => {
    const nodeId = `sp${nodeCount++}`;
    nodeIds.set(name, nodeId);

    const rabbiData = findRabbiData(name);
    const period = rabbiData?.period || 'unknown';
    const gen = rabbiData?.generation || '?';

    const hasDispute = speakerInfo.types.has('dispute') || speakerInfo.types.has('opinion');
    const hasQuestion = speakerInfo.types.has('question') || speakerInfo.types.has('objection');

    if (hasDispute) {
      lines.push(`  ${nodeId}{{{"${name} (דור ${gen})"}}}`)
    } else if (hasQuestion) {
      lines.push(`  ${nodeId}>"${name}"]`);
    } else {
      lines.push(`  ${nodeId}{{"${name}"}}`);
    }

    if (period === 'tanna') {
      lines.push(`  class ${nodeId} tanna`);
    } else if (period === 'amora') {
      lines.push(`  class ${nodeId} amora`);
    }

    lines.push(`  ${nodeId} --> daf`);
  });

  if (disputes.length > 0) {
    lines.push(`  %% Disputes`);

    disputes.forEach((dispute, idx) => {
      disputeCount++;
      const disputeNodeId = `d${idx}`;

      lines.push(`  ${disputeNodeId}(["⚔️ מחלוקת ${idx + 1}"])`);
      lines.push(`  class ${disputeNodeId} topic`);

      dispute.speakers.forEach(speaker => {
        const speakerId = nodeIds.get(speaker);
        if (speakerId) {
          lines.push(`  ${speakerId} -.-x ${disputeNodeId}`);
        }
      });
    });
  }

  const famousDisputes = [
    { pair: ['אביי', 'רבא'], label: 'אביי ורבא', era: 'amora4' },
    { pair: ['רבה', 'רב יוסף'], label: 'רבה ורב יוסף', era: 'amora3' },
    { pair: ['רב חסדא', 'רב ששת'], label: 'רב חסדא ורב ששת', era: 'amora3' },
    { pair: ['רב נחמן', 'רב ששת'], label: 'רב נחמן ורב ששת', era: 'amora3' },
    { pair: ['רבינא', 'רב אשי'], label: 'רבינא ורב אשי', era: 'amora6' },
    { pair: ['רב', 'שמואל'], label: 'רב ושמואל', era: 'amora1' },
    { pair: ['רבי יוחנן', 'ריש לקיש'], label: 'ר״י ור״ל', era: 'amora2' },
    { pair: ['בית הלל', 'בית שמאי'], label: 'ב״ה וב״ש', era: 'tanna1' },
    { pair: ['רבי עקיבא', 'רבי ישמעאל'], label: 'ר״ע ור״י', era: 'tanna3' },
    { pair: ['רבי מאיר', 'רבי יהודה'], label: 'ר״מ ור״י', era: 'tanna4' },
    { pair: ['רבי שמעון', 'רבי יהודה'], label: 'ר״ש ור״י', era: 'tanna4' },
    { pair: ['רבי אליעזר', 'רבי יהושע'], label: 'ר״א ור״י', era: 'tanna2' },
    { pair: ['רבי אמי', 'רבי אסי'], label: 'ר״א ור״א', era: 'amora3' },
    { pair: ['רבי זירא', 'רבי ירמיה'], label: 'ר״ז ור״י', era: 'amora3' }
  ];

  const foundPairs = [];
  famousDisputes.forEach(({ pair, label, era }) => {
    const [a, b] = pair;
    if (nodeIds.has(a) && nodeIds.has(b)) {
      foundPairs.push({ pair, label, era });
      const aId = nodeIds.get(a);
      const bId = nodeIds.get(b);
      lines.push(`  ${aId} <-.-x|"${label}"| ${bId}`);
    }
  });

  lines.push(`  %% Legend`);
  lines.push(`  subgraph מקרא[" "]`);
  lines.push(`    direction LR`);
  lines.push(`    leg1[תנא]:::tanna`);
  lines.push(`    leg2[אמורא]:::amora`);
  lines.push(`    leg3(["מחלוקת"]):::topic`);
  lines.push(`  end`);

  return {
    mermaid: lines.join('\n'),
    stats: {
      disputes: disputeCount,
      speakers: speakersByName.size,
      famousPairs: foundPairs.length
    },
    explanation: `${disputeCount} disputes between ${speakersByName.size} sages`,
    type: DIAGRAM_TYPES.MACHLOKET,
    disputes,
    famousPairs: foundPairs
  };
}

// =============================================================================
// DIAGRAM TYPE: SUMMARY (the big one — dynamic content-based, no hardcoding)
// =============================================================================

export async function generateSummaryDiagram(tractate, daf, options = {}) {
  const { direction = 'TB', preloadedText = null } = options;

  let dafContent = null;
  let fetchError = null;

  if (preloadedText && typeof preloadedText === 'string' && preloadedText.trim().length > 0) {
    log.debug(`[Summary:${tractate}.${daf}] Using preloaded text (${preloadedText.length} chars)`);
    dafContent = {
      ref: `${tractate}.${daf}`,
      segments: [{ index: 1, hebrew: preloadedText }]
    };
  } else {
    try {
      dafContent = await getTalmudDaf(tractate, daf);
      log.debug(`[Summary:${tractate}.${daf}] Fetched ${dafContent?.segments?.length || 0} segments`);
    } catch (err) {
      fetchError = err;
      console.warn(`[Summary:${tractate}.${daf}] Primary API failed:`, err.message);

      try {
        const fallbackUrl = process.env.NODE_ENV === 'development'
          ? `/sefaria-api/texts/${tractate}.${daf}?context=0`
          : `https://www.sefaria.org/api/texts/${tractate}.${daf}?context=0`;

        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          const hebrewTexts = Array.isArray(data.he)
            ? data.he.flat().filter(Boolean)
            : [data.he].filter(Boolean);

          if (hebrewTexts.length > 0) {
            dafContent = {
              ref: data.ref || `${tractate}.${daf}`,
              segments: hebrewTexts.map((text, i) => ({
                index: i + 1,
                hebrew: typeof text === 'string' ? text : ''
              }))
            };
            log.debug(`[Summary:${tractate}.${daf}] Fallback API succeeded: ${hebrewTexts.length} segments`);
          }
        }
      } catch (fallbackErr) {
        console.warn(`[Summary:${tractate}.${daf}] Fallback API also failed:`, fallbackErr.message);
      }
    }
  }

  const lines = [`graph ${direction}`];

  lines.push('  %% Scholarly Summary Styles');
  lines.push('  classDef daf fill:#1e40af,stroke:#1e3a8a,color:#fff,stroke-width:4px,font-weight:bold');
  lines.push('  classDef klal fill:#7c3aed,stroke:#6d28d9,color:#fff,stroke-width:3px');
  lines.push('  classDef mishna fill:#059669,stroke:#047857,color:#fff,stroke-width:2px');
  lines.push('  classDef gemara fill:#f59e0b,stroke:#d97706,color:#000');
  lines.push('  classDef case fill:#0ea5e9,stroke:#0284c7,color:#fff');
  lines.push('  classDef chiyuv fill:#dc2626,stroke:#b91c1c,color:#fff,stroke-width:2px');
  lines.push('  classDef ptur fill:#16a34a,stroke:#15803d,color:#fff,stroke-width:2px');
  lines.push('  classDef safek fill:#eab308,stroke:#ca8a04,color:#000');
  lines.push('  classDef subject fill:#8b5cf6,stroke:#7c3aed,color:#fff');
  lines.push('  classDef question fill:#f97316,stroke:#ea580c,color:#fff');
  lines.push('  classDef proof fill:#84cc16,stroke:#65a30d,color:#000');
  lines.push('  classDef objection fill:#ef4444,stroke:#dc2626,color:#fff');
  lines.push('  classDef resolution fill:#22c55e,stroke:#16a34a,color:#fff');
  lines.push('  classDef conclusion fill:#a855f7,stroke:#9333ea,color:#fff,stroke-width:2px');
  lines.push('  classDef rabbi fill:#ec4899,stroke:#db2777,color:#fff');
  lines.push('  classDef domain fill:#06b6d4,stroke:#0891b2,color:#fff');
  lines.push('  classDef actor fill:#f472b6,stroke:#ec4899,color:#fff');
  lines.push('  classDef stats fill:#64748b,stroke:#475569,color:#fff');
  lines.push('  classDef errorNode fill:#fca5a5,stroke:#ef4444,color:#7f1d1d,stroke-width:2px');

  lines.push(`  daf[["📖 ${tractate} ${daf}"]]`);
  lines.push(`  class daf daf`);

  if (!dafContent?.segments || dafContent.segments.length === 0) {
    const errorMsg = fetchError
      ? cleanForMermaid(fetchError.message, 35)
      : 'חיבור לסוגרים נכשל';

    const tractateInfo = {
      'Shabbat': { topic: 'הלכות שבת', perakim: 24, firstMishna: 'יציאות השבת' },
      'Berakhot': { topic: 'הלכות ברכות', perakim: 9, firstMishna: 'מאימתי קורין' },
      'Pesachim': { topic: 'הלכות פסח', perakim: 10, firstMishna: 'אור לארבעה עשר' },
      'Bava Kamma': { topic: 'נזיקין', perakim: 10, firstMishna: 'ארבע אבות נזיקין' },
      'Sanhedrin': { topic: 'דיני נפשות', perakim: 11, firstMishna: 'דיני ממונות בשלשה' }
    }[tractate];

    lines.push(`  subgraph error["⚠️ שגיאה בטעינה"]`);
    lines.push(`    direction TB`);
    lines.push(`    errMsg["${errorMsg}"]`);
    lines.push(`    class errMsg errorNode`);
    if (tractateInfo) {
      lines.push(`    info["📚 ${tractateInfo.topic}\\n${tractateInfo.perakim} פרקים"]`);
      lines.push(`    class info case`);
    }
    lines.push(`    hint["💡 נסה לרענן או\\nבחר דף אחר"]`);
    lines.push(`    class hint stats`);
    lines.push(`  end`);
    lines.push(`  daf --> error`);

    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, error: fetchError?.message || 'connection_failed' },
      explanation: `שגיאה בטעינת ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  const fullText = dafContent.segments.map(s => s.hebrew || '').join(' ');
  let nodeCount = 0;

  if (process.env.NODE_ENV === 'development') {
    log.debug(`[summary] ${tractate} ${daf} - Text length: ${fullText.length} chars`);
  }

  if (!fullText || fullText.trim().length < 50) {
    lines.push(`  empty["⚠️ לא נמצא תוכן עברי בדף זה"]`);
    lines.push(`  daf --> empty`);
    return {
      mermaid: lines.join('\n'),
      stats: { elements: 0, textLength: fullText?.length || 0 },
      explanation: `לא נמצא תוכן - ${tractate} ${daf}`,
      type: DIAGRAM_TYPES.SUMMARY
    };
  }

  const entities = detectEntities(fullText);
  const compoundTerms = extractCompoundTerms(fullText);
  const enumerations = extractEnumerations(fullText);
  const contrastingPairs = extractContrastingPairs(fullText);
  const structure = analyzeStructure(fullText);
  const halachicCases = extractHalachicCasesDynamic(fullText);
  const discourse = extractFullDiscourse(fullText);
  const domains = extractDomainsDynamic(fullText);
  const actors = extractActorsDynamic(fullText);

  const nodeIds = {};

  if (enumerations.length > 0) {
    lines.push(`  %% כלל`);
    const klalId = `klal${nodeCount++}`;
    nodeIds.klal = klalId;
    lines.push(`  ${klalId}{{{"📐 ${cleanForMermaid(enumerations[0].text, 28)}"}}}`);
    lines.push(`  class ${klalId} klal`);
    lines.push(`  daf --> ${klalId}`);
  }

  if (structure.mishna) {
    lines.push(`  %% משנה`);
    const mishnaId = `m${nodeCount++}`;
    nodeIds.mishna = mishnaId;
    lines.push(`  ${mishnaId}["📜 מתני׳:\\n${cleanForMermaid(structure.mishna, 45)}"]`);
    lines.push(`  class ${mishnaId} mishna`);
    if (nodeIds.klal) {
      lines.push(`  ${nodeIds.klal} --> ${mishnaId}`);
    } else {
      lines.push(`  daf --> ${mishnaId}`);
    }
  }

  if (compoundTerms.length > 0 || domains.length > 0 || actors.length > 0) {
    lines.push(`  %% מושגים`);
    lines.push(`  subgraph concepts["מושגי יסוד"]`);
    lines.push(`    direction LR`);

    compoundTerms.slice(0, 3).forEach((term) => {
      const cleanTerm = cleanForMermaid(term.term, 20);
      if (cleanTerm.length < 4) return;
      const termId = `t${nodeCount++}`;
      lines.push(`    ${termId}["${cleanTerm}"]`);
      lines.push(`    class ${termId} subject`);
    });

    domains.slice(0, 2).forEach((dom) => {
      const cleanDom = cleanForMermaid(dom, 15);
      if (cleanDom.length < 3) return;
      const domId = `d${nodeCount++}`;
      lines.push(`    ${domId}["📍 ${cleanDom}"]`);
      lines.push(`    class ${domId} domain`);
    });

    actors.slice(0, 2).forEach((act) => {
      const cleanAct = cleanForMermaid(act, 15);
      if (cleanAct.length < 3) return;
      const actId = `a${nodeCount++}`;
      lines.push(`    ${actId}["👤 ${cleanAct}"]`);
      lines.push(`    class ${actId} actor`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> concepts`);
  }

  if (contrastingPairs.length > 0) {
    lines.push(`  %% Contrasting Pairs`);
    lines.push(`  subgraph pairs["זוגות מנוגדים"]`);
    lines.push(`    direction TB`);
    contrastingPairs.slice(0, 3).forEach((pair) => {
      const cleanA = cleanForMermaid(pair.a, 15);
      const cleanB = cleanForMermaid(pair.b, 15);
      if (cleanA.length < 3 || cleanB.length < 3) return;

      const pairId1 = `cp${nodeCount++}`;
      const pairId2 = `cp${nodeCount++}`;
      lines.push(`    ${pairId1}["${cleanA}"]`);
      lines.push(`    ${pairId2}["${cleanB}"]`);
      lines.push(`    ${pairId1} --- ${pairId2}`);
      if (pair.type === 'ruling') {
        lines.push(`    class ${pairId1} chiyuv`);
        lines.push(`    class ${pairId2} ptur`);
      } else {
        lines.push(`    class ${pairId1} case`);
        lines.push(`    class ${pairId2} case`);
      }
    });
    lines.push(`  end`);
    lines.push(`  daf --> pairs`);
  }

  if (halachicCases.length > 0) {
    lines.push(`  %% Halachic Cases`);
    lines.push(`  subgraph cases["מקרים ודינים"]`);
    lines.push(`    direction TB`);

    halachicCases.slice(0, 8).forEach((c) => {
      const actor = cleanForMermaid(c.actor, 12);
      if (actor.length < 2) return;

      const caseId = `case${nodeCount++}`;
      const icon = c.ruling === 'חייב' ? '🔴' :
                   c.ruling === 'פטור' ? '🟢' :
                   c.ruling === 'ספק' ? '🟡' :
                   c.ruling === 'מותר' ? '✅' :
                   c.ruling === 'אסור' ? '🚫' : '⚪';

      const action = c.action ? `\\n${cleanForMermaid(c.action, 15)}` : '';
      const ruling = c.ruling ? `\\n${c.ruling}` : '';

      lines.push(`    ${caseId}["${icon} ${actor}${action}${ruling}"]`);

      if (c.ruling === 'חייב') lines.push(`    class ${caseId} chiyuv`);
      else if (c.ruling === 'פטור') lines.push(`    class ${caseId} ptur`);
      else if (c.ruling === 'ספק' || c.ruling === 'תיקו') lines.push(`    class ${caseId} safek`);
      else lines.push(`    class ${caseId} case`);
    });

    lines.push(`  end`);
    lines.push(`  daf --> cases`);
  }

  const hasDiscourse = structure.gemara || discourse.questions.length > 0 ||
                       discourse.proofs.length > 0 || discourse.objections.length > 0;

  if (hasDiscourse) {
    lines.push(`  %% שקלא וטריא`);
    lines.push(`  subgraph shakla["שקלא וטריא"]`);
    lines.push(`    direction TB`);

    if (structure.gemara) {
      const gId = `g${nodeCount++}`;
      nodeIds.gemara = gId;
      lines.push(`    ${gId}>"📚 גמ׳: ${cleanForMermaid(structure.gemara, 30)}"]`);
      lines.push(`    class ${gId} gemara`);
    }

    discourse.questions.slice(0, 2).forEach((q) => {
      const qId = `q${nodeCount++}`;
      lines.push(`    ${qId}>"❓ ${cleanForMermaid(q.text, 25)}"]`);
      lines.push(`    class ${qId} question`);
    });

    discourse.proofs.slice(0, 1).forEach((p) => {
      const pId = `prf${nodeCount++}`;
      lines.push(`    ${pId}["📖 ${cleanForMermaid(p.text, 22)}"]`);
      lines.push(`    class ${pId} proof`);
    });

    discourse.objections.slice(0, 1).forEach((o) => {
      const oId = `obj${nodeCount++}`;
      lines.push(`    ${oId}>"⚡ ${cleanForMermaid(o.text, 22)}"]`);
      lines.push(`    class ${oId} objection`);
    });

    discourse.resolutions.slice(0, 1).forEach((r) => {
      const rId = `res${nodeCount++}`;
      lines.push(`    ${rId}["✓ ${cleanForMermaid(r.text, 22)}"]`);
      lines.push(`    class ${rId} resolution`);
    });

    lines.push(`  end`);
    if (nodeIds.mishna) {
      lines.push(`  ${nodeIds.mishna} -.-> shakla`);
    } else {
      lines.push(`  daf --> shakla`);
    }
  }

  if (discourse.conclusions.length > 0) {
    lines.push(`  %% מסקנות`);
    discourse.conclusions.slice(0, 2).forEach((c) => {
      const cId = `conc${nodeCount++}`;
      lines.push(`  ${cId}[["⭐ ${cleanForMermaid(c.text, 30)}"]]`);
      lines.push(`  class ${cId} conclusion`);
      lines.push(`  daf --> ${cId}`);
    });
  }

  const uniqueRabbis = [...new Set(entities.rabbis.map(r => r.hebrew))].slice(0, 4);
  if (uniqueRabbis.length > 0) {
    lines.push(`  %% חכמים`);
    lines.push(`  subgraph sages["חכמים"]`);
    lines.push(`    direction LR`);
    uniqueRabbis.forEach((rabbi) => {
      const rId = `r${nodeCount++}`;
      lines.push(`    ${rId}(("${rabbi}"))`);
      lines.push(`    class ${rId} rabbi`);
    });
    lines.push(`  end`);
    lines.push(`  sages -.-> daf`);
  }

  const tfidfSummary = summarizeText(fullText);
  const topTerms = tfidfSummary.keyTerms.slice(0, 6);

  if (topTerms.length > 0) {
    lines.push(`  %% מילות מפתח (TF-IDF)`);
    lines.push(`  subgraph tfidf["📊 מילות מפתח"]`);
    lines.push(`    direction LR`);
    topTerms.forEach((t) => {
      const cleanTerm = cleanForMermaid(t.term, 15);
      if (cleanTerm.length < 3) return;

      const tId = `tf${nodeCount++}`;
      const categoryIcon = t.category === 'halachic' ? '⚖️' :
                          t.category === 'sources' ? '📜' :
                          t.category === 'states' ? '🔄' : '🔹';
      lines.push(`    ${tId}["${categoryIcon} ${cleanTerm}\\n(${t.count}×)"]`);
      if (t.score > 3) lines.push(`    class ${tId} conclusion`);
      else if (t.score > 2) lines.push(`    class ${tId} subject`);
      else lines.push(`    class ${tId} case`);
    });
    lines.push(`  end`);
    lines.push(`  tfidf -.-> daf`);
  }

  if (nodeCount === 0) {
    lines.push(`  %% Fallback: Basic Text Analysis`);

    const stopwords = new Set(['את', 'של', 'על', 'אם', 'כי', 'לא', 'הוא', 'היא', 'הם', 'זה', 'זו', 'מה', 'אשר', 'כל', 'בו', 'לו', 'בה', 'עד', 'גם', 'או', 'יש', 'אין', 'רק', 'אך', 'אלא', 'כמו']);
    const wordCounts = new Map();
    const words = fullText.split(/\s+/).filter(w => w.length >= 3);
    words.forEach(word => {
      const clean = word.replace(/[^֐-׿]/g, '');
      if (clean.length >= 3 && !stopwords.has(clean)) {
        wordCounts.set(clean, (wordCounts.get(clean) || 0) + 1);
      }
    });

    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (topWords.length > 0) {
      lines.push(`  subgraph words["📝 מילים מרכזיות"]`);
      lines.push(`    direction LR`);
      topWords.forEach(([word, count], idx) => {
        const wId = `w${idx}`;
        lines.push(`    ${wId}["${word} (${count}×)"]`);
        lines.push(`    class ${wId} case`);
        nodeCount++;
      });
      lines.push(`  end`);
      lines.push(`  daf --> words`);
    }
  }

  const chiyuvCount = halachicCases.filter(c => c.ruling === 'חייב').length;
  const pturCount = halachicCases.filter(c => c.ruling === 'פטור').length;

  const statsId = `st${nodeCount++}`;
  const statsParts = [
    chiyuvCount > 0 ? `🔴${chiyuvCount}` : '',
    pturCount > 0 ? `🟢${pturCount}` : '',
    discourse.questions.length > 0 ? `❓${discourse.questions.length}` : '',
    uniqueRabbis.length > 0 ? `👤${uniqueRabbis.length}` : '',
    `📝${tfidfSummary.statistics.uniqueTerms || fullText.split(/\s+/).length}`,
  ].filter(Boolean).join(' ');
  lines.push(`  ${statsId}[/"${statsParts}"/]`);
  lines.push(`  class ${statsId} stats`);
  lines.push(`  daf -.-> ${statsId}`);

  const explanationParts = [];
  if (enumerations.length > 0) {
    explanationParts.push(cleanForMermaid(enumerations[0].text, 20));
  }
  if (compoundTerms.length > 0) {
    const cleanedTerms = compoundTerms.slice(0, 2)
      .map(t => cleanForMermaid(t.term, 15))
      .filter(t => t.length >= 4);
    if (cleanedTerms.length > 0) {
      explanationParts.push(cleanedTerms.join(', '));
    }
  }
  if (halachicCases.length > 0 && (chiyuvCount > 0 || pturCount > 0)) {
    explanationParts.push(`${chiyuvCount} חייב, ${pturCount} פטור`);
  }
  if (uniqueRabbis.length > 0) {
    explanationParts.push(`${uniqueRabbis.length} חכמים`);
  }

  return {
    mermaid: lines.join('\n'),
    stats: {
      compoundTerms: compoundTerms.length,
      enumerations: enumerations.length,
      contrastingPairs: contrastingPairs.length,
      halachicCases: halachicCases.length,
      chiyuvCases: chiyuvCount,
      pturCases: pturCount,
      domains: domains.length,
      actors: actors.length,
      rabbis: uniqueRabbis.length,
      questions: discourse.questions.length,
      proofs: discourse.proofs.length,
      objections: discourse.objections.length,
      resolutions: discourse.resolutions.length,
      conclusions: discourse.conclusions.length,
      elements: nodeCount,
      tfidf: tfidfSummary.statistics
    },
    explanation: explanationParts.join(' • ') || `סיכום ${tractate} ${daf}`,
    type: DIAGRAM_TYPES.SUMMARY,
    extracted: {
      compoundTerms, enumerations, contrastingPairs, halachicCases,
      discourse, domains, actors, entities, structure,
      tfidfKeyTerms: tfidfSummary.keyTerms,
      tfidfKeySegments: tfidfSummary.keySegments,
      tfidfStructure: tfidfSummary.structure
    }
  };
}

// =============================================================================
// SHARED MERMAID BUILDER - generateOverviewMermaid
// =============================================================================

export function generateOverviewMermaid(subgraph, centerRef, direction = 'TB') {
  const lines = [`graph ${direction}`];

  lines.push('  %% Node styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px,font-weight:bold');
  lines.push('  classDef rabbi fill:#dbeafe,stroke:#2563eb,stroke-width:2px');
  lines.push('  classDef verse fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef parallel fill:#fae8ff,stroke:#c026d3');
  lines.push('  classDef speaker fill:#fed7aa,stroke:#ea580c');

  const nodeIds = new Map();

  subgraph.nodes.forEach((node, index) => {
    const safeId = `n${index}`;
    nodeIds.set(node.id, safeId);

    const label = (node.data?.label || node.label || node.id)
      .replace(/"/g, "'")
      .replace(/\[/g, '(')
      .replace(/\]/g, ')');

    let shape, className;

    if (node.id === centerRef) {
      shape = `${safeId}[["${label}"]]`;
      className = 'daf';
    } else if (node.data?.nodeType === 'speaker') {
      shape = `${safeId}(("${label}"))`;
      className = 'speaker';
    } else if (node.type === ENTITY_TYPES.RABBI || node.data?.nodeType === 'commentator') {
      shape = `${safeId}{{"${label}"}}`;
      className = 'rabbi';
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

  const edgeLabels = {
    [RELATIONSHIP_TYPES.EXPLAINS]: 'מפרש',
    [RELATIONSHIP_TYPES.CITES]: 'מצטט',
    [RELATIONSHIP_TYPES.PARALLEL]: 'מקביל',
    [RELATIONSHIP_TYPES.STUDENT_OF]: 'תלמיד',
    [RELATIONSHIP_TYPES.DISAGREES]: 'חולק',
    'speaks_on': 'אומר'
  };

  lines.push('  %% Relationships');
  subgraph.edges.forEach(edge => {
    const sourceId = nodeIds.get(edge.source);
    const targetId = nodeIds.get(edge.target);

    if (sourceId && targetId) {
      const label = edgeLabels[edge.relationship] || '';
      const style = edge.relationship === RELATIONSHIP_TYPES.DISAGREES ? '-.-x' :
                    edge.relationship === RELATIONSHIP_TYPES.PARALLEL ? '<-->' : '-->';

      if (label) {
        lines.push(`  ${sourceId} ${style}|${label}| ${targetId}`);
      } else {
        lines.push(`  ${sourceId} ${style} ${targetId}`);
      }
    }
  });

  return lines.join('\n');
}
