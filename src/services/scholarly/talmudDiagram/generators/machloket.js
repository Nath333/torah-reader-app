// =============================================================================
// DIAGRAM TYPE: MACHLOKET - Dispute Visualization
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import { getTalmudDaf } from '../../../sefariaApi';
import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';
import { safeExecute } from '../textUtils';
import {
  extractSpeakersFromText,
  extractDisputes,
  findRabbiData
} from '../extractors';

// =============================================================================
// DIAGRAM TYPE: MACHLOKET - Dispute Visualization
// =============================================================================

export async function generateMachloketDiagram(tractate, daf, options = {}) {
  const { direction = 'TB' } = options;

  const dafContent = await safeExecute(
    () => getTalmudDaf(tractate, daf),
    null,
    'machloket:getTalmudDaf'
  );

  const lines = [`graph ${direction}`];

  // Style definitions for disputes
  lines.push('  %% Machloket Diagram Styles');
  lines.push('  classDef daf fill:#fef3c7,stroke:#d97706,stroke-width:3px');
  lines.push('  classDef tanna fill:#fecaca,stroke:#dc2626,stroke-width:2px');
  lines.push('  classDef amora fill:#bbf7d0,stroke:#16a34a,stroke-width:2px');
  lines.push('  classDef opinion fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef halacha fill:#c4b5fd,stroke:#7c3aed,stroke-width:2px');
  lines.push('  classDef question fill:#fed7aa,stroke:#ea580c');
  lines.push('  classDef topic fill:#e5e7eb,stroke:#6b7280,stroke-dasharray:5 5');

  // Central daf node
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

  // Extract disputes from text
  const disputes = extractDisputes(fullText);
  const speakers = extractSpeakersFromText({ hebrew: [fullText] });

  const nodeIds = new Map();
  let nodeCount = 0;
  let disputeCount = 0;

  // Group speakers by type
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

  // Add speaker nodes
  speakersByName.forEach((speakerInfo, name) => {
    const nodeId = `sp${nodeCount++}`;
    nodeIds.set(name, nodeId);

    const rabbiData = findRabbiData(name);
    const period = rabbiData?.period || 'unknown';
    const gen = rabbiData?.generation || '?';

    // Shape based on speaker type
    const hasDispute = speakerInfo.types.has('dispute') || speakerInfo.types.has('opinion');
    const hasQuestion = speakerInfo.types.has('question') || speakerInfo.types.has('objection');

    if (hasDispute) {
      lines.push(`  ${nodeId}{{{"${name} (דור ${gen})"}}}`)
    } else if (hasQuestion) {
      lines.push(`  ${nodeId}>"${name}"]`);
    } else {
      lines.push(`  ${nodeId}{{"${name}"}}`);
    }

    // Style based on period
    if (period === 'tanna') {
      lines.push(`  class ${nodeId} tanna`);
    } else if (period === 'amora') {
      lines.push(`  class ${nodeId} amora`);
    }

    lines.push(`  ${nodeId} --> daf`);
  });

  // Create dispute visualization
  if (disputes.length > 0) {
    lines.push(`  %% Disputes`);

    disputes.forEach((dispute, idx) => {
      disputeCount++;
      const disputeNodeId = `d${idx}`;

      // Create a dispute node
      lines.push(`  ${disputeNodeId}(["⚔️ מחלוקת ${idx + 1}"])`);
      lines.push(`  class ${disputeNodeId} topic`);

      // Connect disputants to the dispute
      dispute.speakers.forEach(speaker => {
        const speakerId = nodeIds.get(speaker);
        if (speakerId) {
          lines.push(`  ${speakerId} -.-x ${disputeNodeId}`);
        }
      });
    });
  }

  // PRO SCHOLAR - Comprehensive famous chavruta/dispute pairs
  const famousDisputes = [
    // Major Amoraic pairs (Babylon)
    { pair: ['אביי', 'רבא'], label: 'אביי ורבא', era: 'amora4' },
    { pair: ['רבה', 'רב יוסף'], label: 'רבה ורב יוסף', era: 'amora3' },
    { pair: ['רב חסדא', 'רב ששת'], label: 'רב חסדא ורב ששת', era: 'amora3' },
    { pair: ['רב נחמן', 'רב ששת'], label: 'רב נחמן ורב ששת', era: 'amora3' },
    { pair: ['רבינא', 'רב אשי'], label: 'רבינא ורב אשי', era: 'amora6' },
    // Founding Amoraic pairs
    { pair: ['רב', 'שמואל'], label: 'רב ושמואל', era: 'amora1' },
    { pair: ['רבי יוחנן', 'ריש לקיש'], label: 'ר״י ור״ל', era: 'amora2' },
    // Tannaitic pairs
    { pair: ['בית הלל', 'בית שמאי'], label: 'ב״ה וב״ש', era: 'tanna1' },
    { pair: ['רבי עקיבא', 'רבי ישמעאל'], label: 'ר״ע ור״י', era: 'tanna3' },
    { pair: ['רבי מאיר', 'רבי יהודה'], label: 'ר״מ ור״י', era: 'tanna4' },
    { pair: ['רבי שמעון', 'רבי יהודה'], label: 'ר״ש ור״י', era: 'tanna4' },
    { pair: ['רבי אליעזר', 'רבי יהושע'], label: 'ר״א ור״י', era: 'tanna2' },
    // Eretz Yisrael Amoraim
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

  // Add legend
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
