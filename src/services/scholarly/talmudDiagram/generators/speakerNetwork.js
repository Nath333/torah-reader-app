// =============================================================================
// DIAGRAM TYPE: SPEAKER NETWORK - Who said what - PRO SCHOLAR V13
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getTalmudDaf } from '../../../sefariaApi';
import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';
import { safeExecute } from '../textUtils';
import {
  extractSpeakersFromText,
  findRabbiData
} from '../extractors';

// =============================================================================
// DIAGRAM TYPE: SPEAKER NETWORK - Who said what - PRO SCHOLAR V13
// =============================================================================

export async function generateSpeakerNetworkDiagram(tractate, daf, options = {}) {
  // PRO SCHOLAR V13: Changed default direction to TB (top-bottom) for better timeline view
  const { direction = 'TB', maxSpeakers = 20 } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'speakerNetwork:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions by generation/period
  lines.push('  %% Speaker Styles by Period');
  lines.push('  classDef tanna1 fill:#fecaca,stroke:#dc2626');
  lines.push('  classDef tanna2 fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef tanna3 fill:#fef08a,stroke:#ca8a04');
  lines.push('  classDef amora1 fill:#bbf7d0,stroke:#16a34a');
  lines.push('  classDef amora2 fill:#a5f3fc,stroke:#0891b2');
  lines.push('  classDef amora3 fill:#c4b5fd,stroke:#7c3aed');
  lines.push('  classDef central fill:#fef3c7,stroke:#d97706,stroke-width:3px');

  // Central daf node
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

  // Extract speakers - PRO SCHOLAR V13 fix: properly extract unique speaker names
  const fullText = dafContent.segments.map(s => s.hebrew).join(' ');
  const speakerData = extractSpeakersFromText({ hebrew: [fullText] });

  // Get unique speaker names (speakers is array of objects with .name property)
  const uniqueNames = [...new Set(speakerData.map(s => s.name))].slice(0, maxSpeakers);

  const speakerNodes = new Map();

  // PRO SCHOLAR V13: Process unique speaker names
  uniqueNames.forEach((speakerName, index) => {
    const rabbiData = findRabbiData(speakerName);
    // Even if no database match, still show the speaker
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

    // Apply style based on period and generation
    if (period === 'tanna') {
      if (gen <= 2) lines.push(`  class ${nodeId} tanna1`);
      else if (gen <= 3) lines.push(`  class ${nodeId} tanna2`);
      else lines.push(`  class ${nodeId} tanna3`);
    } else if (period === 'amora') {
      if (gen <= 2) lines.push(`  class ${nodeId} amora1`);
      else if (gen <= 4) lines.push(`  class ${nodeId} amora2`);
      else lines.push(`  class ${nodeId} amora3`);
    }

    // Connect to daf
    lines.push(`  ${nodeId} -->|speaks| daf`);
  });

  // Add teacher-student relationships between speakers on this daf
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

  // PRO SCHOLAR V13: Enhanced stats and Hebrew explanation
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
