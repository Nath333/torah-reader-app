// =============================================================================
// DIAGRAM TYPE: TIMELINE - Chronological view
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
// DIAGRAM TYPE: TIMELINE - Chronological view
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

  // Extract and organize speakers by period
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

  // Build timeline
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
