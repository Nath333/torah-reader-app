// =============================================================================
// DIAGRAM TYPE: OVERVIEW (Original functionality + enhancements)
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getRelatedTexts, getCrossReferences, getTalmudDaf } from '../../../sefariaApi';
import { RABBINIC_NETWORK, RELATIONSHIP_TYPES, ENTITY_TYPES, addNode, addEdge, getSubgraph, clearGraph } from '../../knowledgeGraphService';
import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';
import { safeExecute } from '../textUtils';
import {
  extractSpeakersFromText,
  findRabbiData,
  extractCommentatorName,
  shortenRef,
  generateExplanation,
  generateOverviewMermaid
} from '../extractors';

// =============================================================================
// DIAGRAM TYPE: OVERVIEW (Original functionality + enhancements)
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

  // Add central daf node
  addNode(dafRef, ENTITY_TYPES.VERSE, {
    label: `📖 ${tractate} ${daf}`,
    type: 'talmud_daf'
  });

  // Fetch related texts from Sefaria using safeExecute
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

  // Process commentators
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

  // Extract speakers from daf content
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

  // Process cross-references
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
