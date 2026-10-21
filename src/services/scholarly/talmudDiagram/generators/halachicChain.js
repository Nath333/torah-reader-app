// =============================================================================
// DIAGRAM TYPE: HALACHIC CHAIN - Source to ruling
// (extrait de talmudDiagramService.js — recette docs/DECOUPE-MONOLITHES.md)
// =============================================================================

import {
  DIAGRAM_TYPES
} from '../../talmudDiagramData';

// =============================================================================
// DIAGRAM TYPE: HALACHIC CHAIN - Source to ruling
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

  // Simplified halachic chain structure
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

  // Connect the chain
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
